/**
 * Apply Gate Patch
 *
 * Safely applies JSON Patch operations from Gate findings.
 * Security: Only allows patches to /useDrillMapStore/drillMap/ paths.
 *
 * @version 1.0.0 - Phase A: Gate → UI Integration
 * @version 1.1.0 - Fail-loud + all-or-nothing (2026-07-26)
 *
 * ── WHO OWNS THE PATH PREFIX ────────────────────────────────────────────────
 * The PRODUCER owns it. `patchPathForPoint` (rules/connectors/drillMapIndex.ts
 * :151-161) emits a fully-qualified `/useDrillMapStore/drillMap/panels/...`
 * path, and that shape is pinned by drillMapIndex.spec.ts:241,
 * validateMinifixGate.spec.ts:412 and the validateMinifixGate snapshots.
 * A consumer must therefore pass the producer's path through UNCHANGED —
 * see `toGatePatch()` below, which is the only sanctioned conversion.
 *
 * Prepending the prefix a second time used to produce
 * `/useDrillMapStore/drillMap/useDrillMapStore/drillMap/panels/...`, which
 * passed the old prefix check, failed navigation, and was silently discarded
 * while `applyGatePatches` still returned true. That is now a hard refusal.
 */

import { useDrillMapStore } from '../../core/store/useDrillMapStore';
import type { GatePatch, GateFinding } from './gateTypes';
import type { DrillMap } from '../../core/manufacturing/drillMap/types';

// ============================================
// SECURITY CONSTANTS
// ============================================

/**
 * Allowed path prefix for patches.
 * All patches MUST start with this prefix.
 *
 * NOTE (deliberately NOT widened, and NOT narrowed here): this prefix check is
 * the whole of the current allowlist, so any property reachable under
 * drillMap/** is patchable — including `throughHole` and `panels/N/dimensions`.
 * A tighter allowlist (e.g. only `panels/N/points/M/{position,position/A,depth}`)
 * belongs at the gate layer, which a parallel task is hardening; changing it
 * here would silently move the security boundary in the same commit that makes
 * patches functional. See the report accompanying this change.
 */
const ALLOWED_PATH_PREFIX = '/useDrillMapStore/drillMap/';

// ============================================
// RESULT TYPES
// ============================================

/** Why a patch was refused. Never swallowed — always surfaced to the caller. */
export interface GatePatchFailure {
  /** The offending patch path (or '<none>' when there is no drill map at all). */
  path: string;
  /** Human-readable reason, safe to show in the UI. */
  reason: string;
}

export type ApplyGatePatchesResult =
  | { ok: true; applied: number }
  | { ok: false; failure: GatePatchFailure };

// ============================================
// PATH VALIDATION
// ============================================

/**
 * Validate that a patch path is safe to apply.
 *
 * @returns null when safe, otherwise the refusal reason.
 */
function pathRefusalReason(path: string): string | null {
  // Must start with allowed prefix
  if (!path.startsWith(ALLOWED_PATH_PREFIX)) {
    return `path must start with "${ALLOWED_PATH_PREFIX}"`;
  }

  // No path traversal
  if (path.includes('..')) {
    return 'path contains ".."';
  }

  // Double-prefix: the producer already qualifies its paths, so a second
  // prefix means a consumer prepended one. Refuse loudly instead of letting
  // navigation quietly fail (the original silent-no-op bug).
  if (path.indexOf(ALLOWED_PATH_PREFIX, 1) !== -1) {
    return `path carries "${ALLOWED_PATH_PREFIX}" more than once — the producer already qualifies patch paths, consumers must not prepend it`;
  }

  return null;
}

/**
 * Validate that a patch path is safe to apply.
 *
 * @param path - The JSON Patch path
 * @returns true if path is safe, false otherwise
 */
function isPathSafe(path: string): boolean {
  const reason = pathRefusalReason(path);
  if (reason) {
    console.error(`[ApplyPatch] SECURITY: Blocked path "${path}" - ${reason}`);
    return false;
  }
  return true;
}

// ============================================
// PRODUCER → GatePatch CONVERSION
// ============================================

/**
 * Convert a producer-emitted patch (e.g. `MinifixGateFinding.suggestedFix.patch`)
 * into a `GatePatch` for the UI.
 *
 * The path is passed through VERBATIM — this function never prepends the store
 * prefix. A path that does not already carry exactly one prefix is refused
 * (returns null) rather than repaired: a differently-rooted path such as
 * `/entities/bolt/geometry/ball_center/y` (validateMinifixConnector.ts:195,230)
 * does not address a DrillMap at all, so prefixing it would turn a no-op into a
 * wrong write.
 */
export function toGatePatch(raw: { op: string; path: string; value?: unknown }): GatePatch | null {
  const reason = pathRefusalReason(raw.path);
  if (reason) {
    console.error(`[ApplyPatch] Unusable producer patch path "${raw.path}" - ${reason}`);
    return null;
  }
  if (raw.op !== 'replace' && raw.op !== 'add' && raw.op !== 'remove') {
    console.error(`[ApplyPatch] Unsupported patch op "${raw.op}" for path "${raw.path}"`);
    return null;
  }
  return { op: raw.op, path: raw.path, value: raw.value };
}

/**
 * Convert a producer patch array for attachment to a `GateFinding`.
 *
 * All-or-nothing: if ANY entry is unusable the whole array is dropped
 * (returns undefined), so the UI shows no "Fix" button rather than a button
 * that would apply half of a fix.
 */
export function toGatePatches(
  raw: Array<{ op: string; path: string; value?: unknown }> | undefined,
): GatePatch[] | undefined {
  if (!raw || raw.length === 0) return undefined;
  const converted = raw.map(toGatePatch);
  if (converted.some(p => p === null)) {
    console.error('[ApplyPatch] Dropping suggested fix: at least one patch path is unusable');
    return undefined;
  }
  return converted as GatePatch[];
}

// ============================================
// APPLY SINGLE PATCH
// ============================================

type PatchOpResult = { ok: true } | { ok: false; reason: string };

function isNavigable(v: unknown): v is Record<string | number, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Apply a single patch operation to an object, IN PLACE.
 *
 * Every way the walk can go wrong is a refusal, not a shrug:
 * - empty path
 * - an intermediate segment that is null/undefined or not an object
 * - a final container that is null/undefined or not an object
 * - `replace`/`remove` against a key the container does not have
 *   (RFC 6902 semantics; also the cheapest way to catch a typo'd path before
 *   it invents a property on a manufacturing artifact)
 *
 * @param obj - Target object to patch (mutated on success)
 * @param relativePath - Path relative to obj (e.g., "/panels/0/points/1/position/1")
 * @param op - Operation type
 * @param value - Value for replace/add operations
 */
function applyPatchOperation<T extends object>(
  obj: T,
  relativePath: string,
  op: 'replace' | 'add' | 'remove',
  value?: unknown
): PatchOpResult {
  if (!relativePath.startsWith('/')) {
    return { ok: false, reason: 'relative path must start with "/"' };
  }

  // Parse path into segments (remove leading /)
  const segments = relativePath.slice(1).split('/');

  if (segments.length === 0 || segments.some(s => s.length === 0)) {
    return { ok: false, reason: 'path has an empty segment' };
  }

  // Navigate to parent
  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const key = /^\d+$/.test(seg) ? parseInt(seg, 10) : seg;

    if (!isNavigable(current)) {
      return { ok: false, reason: `path navigation failed before segment "${seg}" (not an object)` };
    }
    if (!(key in current)) {
      return { ok: false, reason: `path navigation failed at segment "${seg}" (no such key)` };
    }

    current = (current as Record<string | number, unknown>)[key];
  }

  if (!isNavigable(current)) {
    return { ok: false, reason: 'target container is null/undefined or not an object' };
  }

  // Get final key
  const finalSeg = segments[segments.length - 1];
  const finalKey = /^\d+$/.test(finalSeg) ? parseInt(finalSeg, 10) : finalSeg;
  const container = current as Record<string | number, unknown>;

  // Apply operation
  switch (op) {
    case 'replace':
      if (!(finalKey in container)) {
        return { ok: false, reason: `cannot replace "${finalSeg}" — the target has no such key` };
      }
      container[finalKey] = value;
      return { ok: true };

    case 'add':
      // NOTE: assignment semantics, unchanged from v1.0 — this is NOT an RFC
      // 6902 array insert. No producer emits 'add' today.
      container[finalKey] = value;
      return { ok: true };

    case 'remove':
      if (!(finalKey in container)) {
        return { ok: false, reason: `cannot remove "${finalSeg}" — the target has no such key` };
      }
      if (Array.isArray(container) && typeof finalKey === 'number') {
        container.splice(finalKey, 1);
      } else {
        delete container[finalKey];
      }
      return { ok: true };
  }
}

// ============================================
// APPLY GATE PATCHES
// ============================================

/**
 * Apply an array of Gate patches to the DrillMap store.
 *
 * ALL-OR-NOTHING. Every patch is applied to a private clone; the store is only
 * written once every patch has landed. A refusal anywhere leaves the store
 * holding the SAME object it held before (identity included), so a
 * half-patched drill map can never exist and the gate verdict's freshness is
 * not disturbed by a failed attempt.
 *
 * @param patches - Array of GatePatch operations
 * @returns ok:true with the count applied, or ok:false with the refusal reason
 */
export function applyGatePatchesDetailed(patches: GatePatch[]): ApplyGatePatchesResult {
  if (patches.length === 0) {
    console.log('[ApplyPatch] No patches to apply');
    return { ok: true, applied: 0 };
  }

  // Validate all paths first
  for (const patch of patches) {
    const reason = pathRefusalReason(patch.path);
    if (reason) {
      console.error(`[ApplyPatch] SECURITY: Blocked path "${patch.path}" - ${reason}`);
      console.error('[ApplyPatch] Blocked: unsafe path detected — NOTHING was applied');
      return { ok: false, failure: { path: patch.path, reason } };
    }
  }

  // Get current drill map
  const drillMap = useDrillMapStore.getState().drillMap;
  if (!drillMap) {
    console.error('[ApplyPatch] No drill map available');
    return { ok: false, failure: { path: '<none>', reason: 'no drill map is loaded' } };
  }

  // Deep clone to avoid mutations during patch. The store is untouched until
  // every patch below has succeeded.
  const patched: DrillMap = JSON.parse(JSON.stringify(drillMap));

  // Apply each patch to the clone
  for (const patch of patches) {
    // Extract relative path (remove store prefix)
    const relativePath = patch.path.slice(ALLOWED_PATH_PREFIX.length - 1);

    let outcome: PatchOpResult;
    try {
      outcome = applyPatchOperation(patched, relativePath, patch.op, patch.value);
    } catch (err) {
      outcome = { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }

    if (!outcome.ok) {
      console.error(
        `[ApplyPatch] REFUSED ${patch.op} ${patch.path} — ${outcome.reason}. ` +
        'Nothing was applied (all-or-nothing).'
      );
      return { ok: false, failure: { path: patch.path, reason: outcome.reason } };
    }

    console.log(`[ApplyPatch] Staged: ${patch.op} ${patch.path}`);
  }

  // Every patch landed on the clone — now, and only now, publish it.
  useDrillMapStore.getState().setDrillMap(patched);
  console.log(`[ApplyPatch] Successfully applied ${patches.length} patches`);

  return { ok: true, applied: patches.length };
}

/**
 * Apply an array of Gate patches to the DrillMap store.
 * Returns success/failure status.
 *
 * @param patches - Array of GatePatch operations
 * @returns true if ALL patches applied successfully, false otherwise
 *          (false always means the store was left untouched)
 */
export function applyGatePatches(patches: GatePatch[]): boolean {
  return applyGatePatchesDetailed(patches).ok;
}

// ============================================
// APPLY FINDING FIX
// ============================================

/**
 * Apply the auto-fix patch from a Gate finding.
 * Convenience wrapper for UI buttons — returns the refusal reason so the UI
 * can show WHY a fix did not apply instead of reporting a phantom success.
 */
export function applyFindingFixDetailed(finding: GateFinding): ApplyGatePatchesResult {
  if (!finding.patch || finding.patch.length === 0) {
    console.log(`[ApplyPatch] No fix available for finding: ${finding.key}`);
    return { ok: false, failure: { path: '<none>', reason: 'this finding carries no auto-fix' } };
  }

  console.log(`[ApplyPatch] Applying fix for: ${finding.key}`);
  return applyGatePatchesDetailed(finding.patch);
}

/**
 * Apply the auto-fix patch from a Gate finding.
 *
 * @param finding - The GateFinding with patch data
 * @returns true if fix was applied, false otherwise
 */
export function applyFindingFix(finding: GateFinding): boolean {
  return applyFindingFixDetailed(finding).ok;
}

// ============================================
// PREVIEW PATCH (DRY RUN)
// ============================================

/**
 * Preview what a patch would do without applying it.
 * Returns the patched drill map for inspection, or null if ANY patch would be
 * refused (same all-or-nothing rule as applyGatePatches).
 *
 * @param patches - Array of GatePatch operations
 * @returns Preview of patched DrillMap or null if invalid
 */
export function previewGatePatches(patches: GatePatch[]): DrillMap | null {
  // Validate all paths
  for (const patch of patches) {
    if (!isPathSafe(patch.path)) {
      return null;
    }
  }

  const drillMap = useDrillMapStore.getState().drillMap;
  if (!drillMap) return null;

  // Deep clone
  const preview: DrillMap = JSON.parse(JSON.stringify(drillMap));

  // Apply patches to preview
  for (const patch of patches) {
    const relativePath = patch.path.slice(ALLOWED_PATH_PREFIX.length - 1);
    try {
      const outcome = applyPatchOperation(preview, relativePath, patch.op, patch.value);
      if (!outcome.ok) {
        console.error(`[ApplyPatch] Preview refused ${patch.op} ${patch.path} — ${outcome.reason}`);
        return null;
      }
    } catch {
      return null;
    }
  }

  return preview;
}
