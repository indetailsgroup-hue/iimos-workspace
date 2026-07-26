/**
 * Gate Enforcement Tests (T8a — owner ruling Q2 = O2+O3, 2026-07-26)
 *
 * T7 added freshness plumbing but left it INFORMATIONAL: a verdict that was
 * validated against a drill map the user has since edited still reported
 * canFreeze/canExport === true. Owner ruling Q2 makes a FRESH Safety-Gate PASS
 * the precondition for freeze AND for export/upload, so this file pins the
 * authority at the selector layer (the UI surfaces consume it in T8b).
 *
 * Two holes are closed here:
 *   1. STALE VERDICT — the drill map object was replaced after the run
 *      (freshness key = object identity, see gateFreshness.test.ts).
 *   2. VACUOUS PASS — all three validators return PASS when handed a NULL
 *      drill map (validateMinifixGate / validateG11FromDrillMap /
 *      runConnectorOsAudit), so a run with no drill map produced a
 *      clean-looking verdict that enabled freeze and export. Requiring
 *      freshness closes it: a run validated against null records a null
 *      validatedDrillMapRef, which can never be fresh.
 *
 * The drill map store is mocked (repo convention) with faithful object-
 * replacement identity semantics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../core/store/useDrillMapStore', () => {
  let state: { drillMap: unknown } = { drillMap: null };
  const useDrillMapStore = Object.assign(
    (selector?: (s: unknown) => unknown) => (selector ? selector(state) : state),
    {
      getState: () => state,
      setState: (partial: Record<string, unknown>) => {
        state = { ...state, ...partial };
      },
    },
  );
  return { useDrillMapStore };
});

import { useGateStore } from '../gateStore';
import {
  describeGateRefusal,
  getExportGateStatus,
  isExportAllowed,
  isFreezeAllowed,
  isReleaseAllowed,
} from '../useExportGate';
import { useDrillMapStore } from '../../../core/store/useDrillMapStore';
import type { GateResult } from '../gateTypes';
import type { DrillMap } from '../../../core/manufacturing/drillMap/types';

// ============================================
// FIXTURES
// ============================================

function passingResult(): GateResult {
  return {
    passed: true,
    runAt: new Date(0).toISOString(),
    policyVersion: 'test',
    findings: { blockers: [], warnings: [], info: [] },
    metrics: { errors: 0, warnings: 0, pointsValidated: 96 },
  };
}

function failingResult(): GateResult {
  return {
    passed: false,
    runAt: new Date(0).toISOString(),
    policyVersion: 'test',
    findings: {
      blockers: [
        { key: 'B:1', code: 'B_TEST', message: 'blocked', severity: 'BLOCKER', entityIds: [] },
      ],
      warnings: [],
      info: [],
    },
  };
}

/** Distinct drill-map objects — identity is the whole point. */
function makeMap(tag: string): DrillMap {
  return { panels: [{ id: tag, points: [] }] } as unknown as DrillMap;
}

function setStoreMap(map: DrillMap | null): void {
  (useDrillMapStore as unknown as { setState: (p: Record<string, unknown>) => void }).setState({
    drillMap: map,
  });
}

describe('T8a — a fresh Safety-Gate PASS is the authority for freeze and export', () => {
  beforeEach(() => {
    useGateStore.getState().reset();
    setStoreMap(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('ENABLES freeze/release/export for a PASS validated against the current map', () => {
    const map = makeMap('current');
    setStoreMap(map);
    useGateStore.getState().setResult(passingResult(), map);

    const s = getExportGateStatus();
    expect(s.fresh, 'precondition: verdict is fresh').toBe(true);
    expect(s.canFreeze).toBe(true);
    expect(s.canRelease).toBe(true);
    expect(s.canExport).toBe(true);
    expect(isFreezeAllowed()).toBe(true);
    expect(isReleaseAllowed()).toBe(true);
    expect(isExportAllowed()).toBe(true);
  });

  it('BLOCKS all three once the drill map object is replaced (stale verdict)', () => {
    const validated = makeMap('validated');
    setStoreMap(validated);
    useGateStore.getState().setResult(passingResult(), validated);

    // User edits the cabinet → the store replaces the drill map object.
    setStoreMap(makeMap('edited'));

    const s = getExportGateStatus();
    expect(s.hasRun, 'the verdict is still on record').toBe(true);
    expect(s.blockerCount, 'and it still reports zero blockers').toBe(0);
    expect(s.fresh).toBe(false);
    expect(s.canFreeze).toBe(false);
    expect(s.canRelease).toBe(false);
    expect(s.canExport).toBe(false);
    expect(isFreezeAllowed()).toBe(false);
    expect(isReleaseAllowed()).toBe(false);
    expect(isExportAllowed()).toBe(false);
  });

  it('BLOCKS the vacuous PASS: a run validated against a NULL drill map', () => {
    // All three validators short-circuit to PASS on a null map, so this verdict
    // looks clean while covering nothing.
    setStoreMap(null);
    useGateStore.getState().setResult(passingResult(), null);

    const s = getExportGateStatus();
    expect(s.hasRun).toBe(true);
    expect(s.blockerCount).toBe(0);
    expect(s.fresh, 'a null-map verdict can never be fresh').toBe(false);
    expect(s.canFreeze).toBe(false);
    expect(s.canRelease).toBe(false);
    expect(s.canExport).toBe(false);
  });

  it('BLOCKS when the drill map is cleared after a fresh PASS', () => {
    const map = makeMap('present');
    setStoreMap(map);
    useGateStore.getState().setResult(passingResult(), map);
    setStoreMap(null);

    const s = getExportGateStatus();
    expect(s.canFreeze).toBe(false);
    expect(s.canExport).toBe(false);
  });

  it('still BLOCKS on real blockers even when the verdict is fresh', () => {
    const map = makeMap('current');
    setStoreMap(map);
    useGateStore.getState().setResult(failingResult(), map);

    const s = getExportGateStatus();
    expect(s.fresh).toBe(true);
    expect(s.blockerCount).toBe(1);
    expect(s.canFreeze).toBe(false);
    expect(s.canExport).toBe(false);
  });

  it('BLOCKS while a re-validation is in flight (the verdict on record is the previous one)', () => {
    // G2 finding: canProceed ignored isRunning, so a user could export off the
    // OLD verdict during the very run that might contradict it.
    const map = makeMap('current');
    setStoreMap(map);
    useGateStore.getState().setResult(passingResult(), map);
    expect(getExportGateStatus().canExport).toBe(true);

    useGateStore.getState().setRunning(true);

    const s = getExportGateStatus();
    expect(s.isRunning).toBe(true);
    expect(s.passedWhenRun, 'the previous verdict is still clean').toBe(true);
    expect(s.canFreeze).toBe(false);
    expect(s.canRelease).toBe(false);
    expect(s.canExport).toBe(false);
  });

  it('BLOCKS before any run (fail-closed default)', () => {
    setStoreMap(makeMap('current'));

    const s = getExportGateStatus();
    expect(s.hasRun).toBe(false);
    expect(s.canFreeze).toBe(false);
    expect(s.canExport).toBe(false);
  });

  it('reports the pre-freshness verdict separately so UI can explain WHY it blocks', () => {
    // A stale-but-clean verdict must be distinguishable from a dirty one:
    // the surfaces tell the user "re-run the gate", not "fix your blockers".
    const validated = makeMap('validated');
    setStoreMap(validated);
    useGateStore.getState().setResult(passingResult(), validated);
    setStoreMap(makeMap('edited'));

    const stale = getExportGateStatus();
    expect(stale.passedWhenRun, 'the run itself was clean').toBe(true);
    expect(stale.canFreeze, 'but it no longer authorizes anything').toBe(false);

    useGateStore.getState().reset();
    setStoreMap(validated);
    useGateStore.getState().setResult(failingResult(), validated);
    const dirty = getExportGateStatus();
    expect(dirty.passedWhenRun).toBe(false);
  });
});

/**
 * The refusal has to name the RIGHT cause (owner tenet: easy front, rigorous
 * back — every "no" carries a path forward).
 *
 * Found live on 2026-07-26 in the running app: with no drill map generated,
 * clicking Freeze auto-ran the gate and answered
 *
 *   "Cannot freeze — the cabinet changed since the last Safety Gate run."
 *
 * Nothing had changed and nothing had ever been validated. All three
 * validators short-circuit to PASS on a null map, so the verdict is clean,
 * blockerCount is 0, and freshness is false — which fell into the stale
 * branch. The user is told to re-run a gate that will keep saying the same
 * thing forever: a dead end, and a false statement about their cabinet.
 *
 * Second problem this pins: the wording lived in TWO places (getBlockReason
 * here and gateRefusalReason in GateToolbar) which had already drifted apart.
 * One exported function is now the single source.
 */
describe('describeGateRefusal — the refusal names the real cause', () => {
  beforeEach(() => {
    useGateStore.getState().reset();
    setStoreMap(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('reports hasDrillMap so a surface can tell "nothing to validate" from "stale"', () => {
    expect(getExportGateStatus().hasDrillMap).toBe(false);
    setStoreMap(makeMap('present'));
    expect(getExportGateStatus().hasDrillMap).toBe(true);
  });

  it('names the MISSING DRILL MAP, not a change that never happened', () => {
    // Exactly the live sequence: no drill map, gate auto-run, verdict vacuously clean.
    setStoreMap(null);
    useGateStore.getState().setResult(passingResult(), null);

    const reason = describeGateRefusal(getExportGateStatus());
    expect(reason).toMatch(/drill map/i);
    expect(reason, 'must not blame a change the user never made').not.toMatch(/changed/i);
  });

  it('still says CHANGED when the cabinet genuinely changed', () => {
    const validated = makeMap('validated');
    setStoreMap(validated);
    useGateStore.getState().setResult(passingResult(), validated);
    setStoreMap(makeMap('edited'));

    expect(describeGateRefusal(getExportGateStatus())).toMatch(/changed/i);
  });

  it('prioritises real blockers over freshness wording', () => {
    const map = makeMap('current');
    setStoreMap(map);
    useGateStore.getState().setResult(failingResult(), map);

    expect(describeGateRefusal(getExportGateStatus())).toMatch(/blocker/i);
  });

  it('says nothing when the gate actually authorizes the action', () => {
    const map = makeMap('current');
    setStoreMap(map);
    useGateStore.getState().setResult(passingResult(), map);

    expect(describeGateRefusal(getExportGateStatus())).toBe('');
  });
});

/**
 * An EMPTY drill map is not a verdict either (cross-vendor gate, 2026-07-26).
 *
 * The null case was closed by freshness: a run validated against null records a
 * null ref, which can never match. GPT-5.6 Sol found the same hole one door
 * along — a NON-null map with `panels: []`. All three validators short-circuit
 * to PASS on it, the ref matches by identity so it reads FRESH, blockerCount is
 * 0, and freeze/release/export are all authorized off a verdict that examined
 * nothing. `generateMinifixDrillMap` returns exactly this object for a cabinet
 * with no panels.
 *
 * "Zero findings" and "nothing was looked at" must never be the same answer.
 */
describe('a drill map with no panels can never authorize anything', () => {
  beforeEach(() => {
    useGateStore.getState().reset();
    setStoreMap(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  /** Non-null, identity-stable, and completely empty. */
  const emptyMap = () => ({ panels: [] } as unknown as DrillMap);

  it('BLOCKS freeze/release/export on an empty map validated against itself', () => {
    const empty = emptyMap();
    setStoreMap(empty);
    useGateStore.getState().setResult(passingResult(), empty);

    const s = getExportGateStatus();
    expect(s.hasRun).toBe(true);
    expect(s.blockerCount, 'the validators had nothing to complain about').toBe(0);
    expect(s.hasDrillMap, 'an empty map is nothing to validate').toBe(false);
    expect(s.canFreeze).toBe(false);
    expect(s.canRelease).toBe(false);
    expect(s.canExport).toBe(false);
    expect(isFreezeAllowed()).toBe(false);
    expect(isExportAllowed()).toBe(false);
  });

  it('says so honestly instead of blaming a change', () => {
    const empty = emptyMap();
    setStoreMap(empty);
    useGateStore.getState().setResult(passingResult(), empty);

    const reason = describeGateRefusal(getExportGateStatus());
    expect(reason).toMatch(/drill map/i);
    expect(reason).not.toMatch(/changed/i);
  });

  it('still authorizes a map that actually has panels (no new over-block)', () => {
    const real = makeMap('has-panels');
    setStoreMap(real);
    useGateStore.getState().setResult(passingResult(), real);

    expect(getExportGateStatus().hasDrillMap).toBe(true);
    expect(getExportGateStatus().canFreeze).toBe(true);
  });
});
