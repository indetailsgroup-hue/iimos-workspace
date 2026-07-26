/**
 * useExportGate - Gate Enforcement Hook for Export/Release
 *
 * Derives export permissions from Gate validation results.
 * Provides clear yes/no decisions for:
 * - canFreeze: Can transition DRAFT → FROZEN
 * - canRelease: Can transition FROZEN → RELEASED
 * - canExport: Can generate factory output (DXF, CNC, etc.)
 *
 * @version 1.0.0 - Phase B1: Gate Enforcement
 */

import { useCallback, useMemo } from 'react';
import { useGateStore, selectHasBlockers, isGateResultFresh } from './gateStore';
import { useDrillMapStore } from '../../core/store/useDrillMapStore';
import { openSafetyTab } from '../../designer/state/useIntentPanelStore';
import type { GateResult, GateFinding } from './gateTypes';

// ============================================
// TYPES
// ============================================

export interface ExportGateStatus {
  /** Can freeze spec (DRAFT → FROZEN) — requires a FRESH run with no blockers */
  canFreeze: boolean;

  /** Can release spec (FROZEN → RELEASED) — requires a FRESH run with no blockers */
  canRelease: boolean;

  /** Can export DXF/CNC output — requires a FRESH run with no blockers */
  canExport: boolean;

  /** Has gate been run at all */
  hasRun: boolean;

  /**
   * Did the run itself come back clean, ignoring freshness?
   *
   * Diagnostic only — never an authority. Lets a surface tell the user WHY it
   * is blocking: `passedWhenRun && !fresh` means "the cabinet changed, re-run
   * the gate", which is a different message from "fix your blockers".
   */
  passedWhenRun: boolean;

  /**
   * Is the stored verdict fresh for the CURRENT drill map?
   *
   * Freshness key = drill-map OBJECT IDENTITY: true only while the drillMap
   * object the verdict was validated against is still (===) the one held by
   * useDrillMapStore. Replacing or clearing the drill map flips this to
   * false while hasRun stays true. Fail-closed: false before any run.
   *
   * AUTHORITATIVE since T8a (owner ruling Q2 = O2+O3): canFreeze/canRelease/
   * canExport all require it. This is also what closes the vacuous PASS — the
   * three validators return PASS on a null drill map, but such a run records a
   * null validatedDrillMapRef, which is never fresh.
   */
  fresh: boolean;

  /** Is validation currently running */
  isRunning: boolean;

  /** Number of blockers */
  blockerCount: number;

  /** Number of warnings (non-blocking) */
  warningCount: number;

  /** Blockers list for display */
  blockers: GateFinding[];

  /**
   * Is there a drill map to validate at all? Without one, all three validators
   * short-circuit to PASS, so the verdict looks clean while covering nothing —
   * a surface needs this to tell "nothing to validate" from "stale verdict".
   */
  hasDrillMap: boolean;

  /** Full result for advanced use */
  result: GateResult | null;
}

export interface ExportGateActions {
  /** Open Safety tab and focus on first blocker */
  openFirstBlocker: () => void;

  /** Get reason why export is blocked */
  getBlockReason: () => string;
}

/**
 * Is there anything here for the validators to examine?
 *
 * NOT just "is it non-null". validateMinifixGate / validateG11FromDrillMap /
 * runConnectorOsAudit all short-circuit to PASS on an empty map, so a map with
 * `panels: []` produced a clean verdict that reported zero findings because it
 * looked at nothing — and, being a real object, it matched the validated
 * reference by identity and read as FRESH. generateMinifixDrillMap returns
 * exactly that object for a cabinet with no panels.
 *
 * "Zero findings" and "nothing was examined" must never be the same answer.
 * Cross-vendor gate, 2026-07-26.
 */
function isValidatableDrillMap(map: unknown): boolean {
    if (map === null || map === undefined) return false;
    const panels = (map as { panels?: unknown }).panels;
    return Array.isArray(panels) && panels.length > 0;
}

// ============================================
// WHY THE GATE IS REFUSING (single source)
// ============================================

/**
 * The one place that turns a gate status into a sentence for a human.
 *
 * Owner tenet — easy front, rigorous back: the gate may refuse as hard as it
 * likes, but the refusal must name the REAL cause and imply the next move.
 * Returns '' when the gate authorizes the action.
 *
 * Ordering matters. The no-drill-map case must be checked BEFORE freshness:
 * validateMinifixGate / validateG11FromDrillMap / runConnectorOsAudit all
 * short-circuit to PASS on a null map, so that run records zero blockers and
 * a null validated ref — clean and never fresh. Checked in the old order it
 * came out as "the cabinet changed since the last Safety Gate run", which was
 * both false and a dead end (re-running says the same thing forever). Seen
 * live in the app on 2026-07-26.
 */
export function describeGateRefusal(status: ExportGateStatus): string {
    if (status.isRunning) return 'the Safety Gate is still running';
    if (!status.hasDrillMap) {
        return 'there is no drill map to validate yet — generate the drill map for this cabinet first';
    }
    // Imperative, not descriptive. "has not been run yet" states a fact and
    // leaves the user to work out the move; the tenet is that every refusal
    // carries the next action. Consolidating the two surfaces' wording lost
    // this once already — GateToolbar.dxfExport.test.tsx pins it.
    if (!status.hasRun) return 'run the Safety Gate first';
    if (status.blockerCount === 1) {
        return `1 Safety Gate blocker must be resolved: ${status.blockers[0]?.message ?? 'unknown issue'}`;
    }
    if (status.blockerCount > 1) {
        return `${status.blockerCount} Safety Gate blockers must be resolved`;
    }
    if (!status.fresh) {
        return 'the cabinet changed since the last Safety Gate run — run the gate again';
    }
    return '';
}

// ============================================
// HOOK
// ============================================

export function useExportGate(): ExportGateStatus & ExportGateActions {
  const result = useGateStore((s) => s.lastResult);
  const isRunning = useGateStore((s) => s.isRunning);
  const hasBlockers = useGateStore(selectHasBlockers);
  const selectFinding = useGateStore((s) => s.selectFinding);
  // Freshness inputs — subscribe to BOTH stores so consumers re-render the
  // moment the drill map object is replaced (setDrillMap always replaces).
  const validatedRef = useGateStore((s) => s.validatedDrillMapRef);
  const currentDrillMap = useDrillMapStore((s) => s.drillMap);

  // Derived values
  const status = useMemo<ExportGateStatus>(() => {
    const hasRun = result !== null;
    const blockers = result?.findings.blockers ?? [];
    const warnings = result?.findings.warnings ?? [];

    // The run's own verdict, ignoring freshness (diagnostic).
    const passedWhenRun = hasRun && blockers.length === 0;

    // Fresh = verdict exists AND was validated against the exact object the
    // drill map store currently holds (identity, fail-closed on null).
    const fresh =
        hasRun &&
        validatedRef !== null &&
        validatedRef === currentDrillMap &&
        isValidatableDrillMap(currentDrillMap);

    // Authority (T8a, owner ruling Q2 = O2+O3): a clean verdict only counts
    // while it still describes the cabinet in front of the user — and never
    // while a re-validation is in flight, because the verdict on record is the
    // PREVIOUS one and the run underway may be about to contradict it (G2).
    const canProceed = passedWhenRun && fresh && !isRunning;

    return {
      canFreeze: canProceed,
      canRelease: canProceed,
      canExport: canProceed,
      hasRun,
      passedWhenRun,
      fresh,
      isRunning,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      hasDrillMap: isValidatableDrillMap(currentDrillMap),
      blockers,
      result,
    };
  }, [result, isRunning, validatedRef, currentDrillMap]);

  // Actions
  const openFirstBlocker = useCallback(() => {
    const firstBlocker = status.blockers[0];
    if (firstBlocker) {
      // Select the finding and open Safety tab
      selectFinding(firstBlocker.key, firstBlocker.entityIds);
      openSafetyTab();
      console.log('[ExportGate] Opened Safety tab, selected:', firstBlocker.key);
    } else {
      // No blockers, just open Safety tab
      openSafetyTab();
    }
  }, [status.blockers, selectFinding]);

  const getBlockReason = useCallback(
    (): string => describeGateRefusal(status),
    [status],
  );

  return {
    ...status,
    openFirstBlocker,
    getBlockReason,
  };
}

// ============================================
// NON-REACT ACCESS
// ============================================

/**
 * Get export gate status outside React (for imperative code)
 */
export function getExportGateStatus(): ExportGateStatus {
  const state = useGateStore.getState();
  const result = state.lastResult;
  const hasRun = result !== null;
  const blockers = result?.findings.blockers ?? [];
  const warnings = result?.findings.warnings ?? [];
  const passedWhenRun = hasRun && blockers.length === 0;
  // Same authority as the hook (T8a + G2): clean, fresh, and not mid-run.
  // Freshness alone is identity-only; an empty map is identity-stable and
  // therefore 'fresh' while covering nothing.
  const fresh = isGateResultFresh() && isValidatableDrillMap(useDrillMapStore.getState().drillMap);
  const canProceed = passedWhenRun && fresh && !state.isRunning;

  return {
    canFreeze: canProceed,
    canRelease: canProceed,
    canExport: canProceed,
    hasRun,
    passedWhenRun,
    fresh,
    isRunning: state.isRunning,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    hasDrillMap: isValidatableDrillMap(useDrillMapStore.getState().drillMap),
    blockers,
    result,
  };
}

/**
 * Check if export is allowed (simple boolean check)
 */
export function isExportAllowed(): boolean {
  const { canExport, hasRun } = getExportGateStatus();
  return hasRun && canExport;
}

/**
 * Check if freeze is allowed
 */
export function isFreezeAllowed(): boolean {
  const { canFreeze, hasRun } = getExportGateStatus();
  return hasRun && canFreeze;
}

/**
 * Check if release is allowed
 */
export function isReleaseAllowed(): boolean {
  const { canRelease, hasRun } = getExportGateStatus();
  return hasRun && canRelease;
}
