/**
 * Gate Freshness Tests (T7 — verdict invalidation)
 *
 * The Safety-Gate verdict must stop counting as "fresh" the moment the drill
 * map it validated is replaced. Freshness key = drill-map OBJECT IDENTITY:
 * the drillMap object reference that was validated, compared with the CURRENT
 * useDrillMapStore.getState().drillMap by ===.
 *
 * Deliberately NOT drillMapVersion: setDrillMap replaces the drillMap object
 * without bumping the version (useDrillMapStore.ts:301-341), while unrelated
 * resets DO bump it — so version is the wrong freshness key in both directions.
 *
 * The drill map store is mocked (repo convention, see useSpecStore.test.ts /
 * runPreflight.test.ts) with faithful getState/setState identity semantics —
 * the real setDrillMap ends in `set({ drillMap })`, i.e. object replacement.
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

import { useGateStore, isGateResultFresh } from '../gateStore';
import { getExportGateStatus } from '../useExportGate';
import { useDrillMapStore } from '../../../core/store/useDrillMapStore';
import type { GateResult } from '../gateTypes';
import type { DrillMap } from '../../../core/manufacturing/drillMap/types';

// ============================================
// TEST FIXTURES
// ============================================

function makePassingResult(): GateResult {
  return {
    passed: true,
    runAt: new Date().toISOString(),
    policyVersion: '1.0.0',
    findings: {
      blockers: [],
      warnings: [],
      info: [],
    },
  };
}

function makeDrillMap(id: string): DrillMap {
  // Minimal structural stand-in — freshness is about object identity, not shape.
  return { cabinetId: id, panels: [] } as unknown as DrillMap;
}

// ============================================
// TESTS
// ============================================

describe('gate result freshness (drill-map object identity)', () => {
  beforeEach(() => {
    useGateStore.getState().reset();
    useDrillMapStore.setState({ drillMap: null });
  });

  it('(c) reports not-fresh before any gate run', () => {
    expect(isGateResultFresh()).toBe(false);

    const status = getExportGateStatus();
    expect(status.fresh).toBe(false);
    expect(status.hasRun).toBe(false);
  });

  it('(a) setResult(result, drillMap) stores the validated ref; fresh while the store still holds the same object', () => {
    const mapA = makeDrillMap('cab-a');
    useDrillMapStore.setState({ drillMap: mapA });

    useGateStore.getState().setResult(makePassingResult(), mapA);

    expect(useGateStore.getState().validatedDrillMapRef).toBe(mapA);
    expect(isGateResultFresh()).toBe(true);

    const status = getExportGateStatus();
    expect(status.fresh).toBe(true);
    expect(status.hasRun).toBe(true);
  });

  it('(a-compat) setResult(result) without the second param falls back to capturing the current drill map (SafetyPanel unchanged)', () => {
    const mapA = makeDrillMap('cab-a');
    useDrillMapStore.setState({ drillMap: mapA });

    // Exactly how SafetyPanel.tsx:263 calls it today — single argument.
    useGateStore.getState().setResult(makePassingResult());

    expect(useGateStore.getState().validatedDrillMapRef).toBe(mapA);
    expect(isGateResultFresh()).toBe(true);
    expect(getExportGateStatus().fresh).toBe(true);
  });

  it('(b) replacing the drill map object invalidates freshness while hasRun stays true', () => {
    const mapA = makeDrillMap('cab-a');
    useDrillMapStore.setState({ drillMap: mapA });
    useGateStore.getState().setResult(makePassingResult(), mapA);
    expect(isGateResultFresh()).toBe(true);

    // Simulate setDrillMap: even a structurally identical map is a NEW object
    // (useDrillMapStore.ts:301-341 always ends in `set({ drillMap })`).
    const replacement = JSON.parse(JSON.stringify(mapA)) as DrillMap;
    useDrillMapStore.setState({ drillMap: replacement });

    expect(isGateResultFresh()).toBe(false);

    const status = getExportGateStatus();
    expect(status.fresh).toBe(false);
    expect(status.hasRun).toBe(true);

    // Existing fields keep their semantics — wiring `fresh` into enforcement
    // is a later task; this task must not change canFreeze/canExport behavior.
    expect(status.canFreeze).toBe(true);
    expect(status.canExport).toBe(true);
  });

  it('(b2) clearing the drill map invalidates freshness while hasRun stays true', () => {
    const mapA = makeDrillMap('cab-a');
    useDrillMapStore.setState({ drillMap: mapA });
    useGateStore.getState().setResult(makePassingResult(), mapA);
    expect(isGateResultFresh()).toBe(true);

    useDrillMapStore.setState({ drillMap: null });

    expect(isGateResultFresh()).toBe(false);
    expect(getExportGateStatus().fresh).toBe(false);
    expect(getExportGateStatus().hasRun).toBe(true);
  });

  it('never reports fresh when the validated map was null (fail-closed), even if the current map is also null', () => {
    useDrillMapStore.setState({ drillMap: null });

    // Explicit null — a run against "no drill map" must not count as fresh.
    useGateStore.getState().setResult(makePassingResult(), null);
    expect(isGateResultFresh()).toBe(false);
    expect(getExportGateStatus().fresh).toBe(false);

    // Same via the fallback capture path.
    useGateStore.getState().reset();
    useGateStore.getState().setResult(makePassingResult());
    expect(isGateResultFresh()).toBe(false);
    expect(getExportGateStatus().fresh).toBe(false);
  });

  it('reset clears the validated ref', () => {
    const mapA = makeDrillMap('cab-a');
    useDrillMapStore.setState({ drillMap: mapA });
    useGateStore.getState().setResult(makePassingResult(), mapA);

    useGateStore.getState().reset();

    expect(useGateStore.getState().validatedDrillMapRef).toBeNull();
    expect(isGateResultFresh()).toBe(false);
  });
});

describe('gate result freshness vs persistence', () => {
  beforeEach(() => {
    useGateStore.getState().reset();
    useDrillMapStore.setState({ drillMap: null });
  });

  it('(d) gate store is NOT persisted — no persist API, so verdict + ref reset on reload', () => {
    // gateStore.ts uses plain create() without persist middleware. If someone
    // adds persist later, this test forces them to confront the freshness ref:
    // an object reference can never survive serialization.
    expect(
      (useGateStore as unknown as { persist?: unknown }).persist,
    ).toBeUndefined();
  });

  it('(d2) a serialized/rehydrated state can never report fresh — the ref does not survive a JSON round-trip', () => {
    const mapA = makeDrillMap('cab-a');
    useDrillMapStore.setState({ drillMap: mapA });
    useGateStore.getState().setResult(makePassingResult(), mapA);
    expect(isGateResultFresh()).toBe(true);

    // Simulate what any persist/rehydrate cycle would do to the state.
    const rehydrated = JSON.parse(
      JSON.stringify({
        lastResult: useGateStore.getState().lastResult,
        validatedDrillMapRef: useGateStore.getState().validatedDrillMapRef,
      }),
    );
    useGateStore.getState().reset();
    useGateStore.setState(rehydrated);

    // The drill map store still holds the ORIGINAL object, yet the rehydrated
    // ref is a different object — identity is broken, so fresh must be false.
    expect(useGateStore.getState().lastResult).not.toBeNull();
    expect(getExportGateStatus().hasRun).toBe(true);
    expect(isGateResultFresh()).toBe(false);
    expect(getExportGateStatus().fresh).toBe(false);
  });
});
