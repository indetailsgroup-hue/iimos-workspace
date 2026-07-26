/**
 * applyGatePatch — the "Apply fix" button must actually apply, or loudly fail.
 *
 * Every one of these tests drives the REAL chain, no hand-built patch objects
 * where a production one exists:
 *
 *   validateMinifixGate            (producer, validateMinifixConnector.ts)
 *     -> enhanceFindingWithDeterministicPatch  (~:1006)
 *       -> patchPathForBoltY / patchPathForBoltPosition (drillMapIndex.ts:167/187)
 *   -> minifixFindingToBlockerFinding          (consumer, SafetyPanel.tsx)
 *   -> applyGatePatches                        (applier, applyGatePatch.ts)
 *   -> useDrillMapStore.setDrillMap            (store)
 *
 * The bug this suite pins: the applier reported success for a patch it never
 * applied, so every "Apply fix" button in the app was a silent no-op.
 *
 * The real useDrillMapStore is used (not a mock) — same convention as
 * gateG11_panelBreakthrough.test.ts, which drives applyGatePatches the same way.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useDrillMapStore } from '../../../core/store/useDrillMapStore';
import { useGateStore, isGateResultFresh } from '../gateStore';
import { getExportGateStatus } from '../useExportGate';
import { applyGatePatches, toGatePatches } from '../applyGatePatch';
import { minifixFindingToBlockerFinding } from '../SafetyPanel';
import { validateMinifixGate } from '../../rules/connectors/validateMinifixConnector';
import type { GatePatch, GateFinding, GateResult } from '../gateTypes';
import type { DrillMap, DrillMapPoint, Vec3Tuple } from '../../../core/manufacturing/drillMap/types';

// ============================================
// FIXTURES (same geometry family as
// connectors/__tests__/validateMinifixGate.spec.ts)
// ============================================

function makePoint(overrides: Partial<DrillMapPoint> & { id: string }): DrillMapPoint {
  return {
    id: overrides.id,
    panelId: overrides.panelId ?? 'test-panel-001',
    operationId: overrides.operationId ?? `op-${overrides.id}`,
    position: overrides.position ?? [0, 100, 0],
    normal: overrides.normal ?? [0, 1, 0],
    diameter: overrides.diameter ?? 15,
    depth: overrides.depth ?? 12.5,
    throughHole: overrides.throughHole ?? false,
    purpose: overrides.purpose ?? 'MINIFIX',
    face: overrides.face ?? 'TOP',
    status: overrides.status ?? 'VALID',
    componentType: overrides.componentType ?? 'HOUSING',
    pairedHoleId: overrides.pairedHoleId,
  };
}

function makeCam(o: { id?: string; y?: number; pairedHoleId?: string } = {}): DrillMapPoint {
  return makePoint({
    id: o.id ?? 'cam-1',
    componentType: 'HOUSING',
    purpose: 'MINIFIX',
    position: [0, o.y ?? 100, 0],
    normal: [0, -1, 0],
    pairedHoleId: o.pairedHoleId,
  });
}

function makeBolt(o: { id?: string; y?: number } = {}): DrillMapPoint {
  return makePoint({
    id: o.id ?? 'bolt-1',
    componentType: 'BOLT',
    purpose: 'MINIFIX',
    position: [10, o.y ?? 100, 0],
    normal: [-1, 0, 0],
    diameter: 10,
  });
}

function makeDrillMap(panels: Array<{ panelId: string; points: DrillMapPoint[] }>): DrillMap {
  return {
    version: 'drillmap.v1',
    jobId: 'test-job',
    createdAt: new Date().toISOString(),
    panels: panels.map((p) => ({
      panelId: p.panelId,
      cabinetId: 'cab-1',
      role: 'SHELF',
      worldPosition: [0, 0, 0] as Vec3Tuple,
      worldRotation: [0, 0, 0] as Vec3Tuple,
      dimensions: { width: 600, height: 400, thickness: 18 },
      points: p.points,
      grooves: [],
    })),
    summary: {
      totalDrills: panels.reduce((acc, p) => acc + p.points.length, 0),
      totalBores: 0,
      totalGrooves: 0,
      toolChanges: 0,
      estimatedTime: 0,
      byPurpose: {},
      byDiameter: {},
    },
    tools: [],
    warnings: [],
  } as unknown as DrillMap;
}

/**
 * Bolt at panels[1].points[0] sits 4mm below the cam pocket centre, so the
 * producer raises MONO_MINIFIX_Y_MISMATCH with a SET_BOLT_Y_FROM_CAM fix.
 */
function yMismatchDrillMap(): DrillMap {
  return makeDrillMap([
    { panelId: 'panel-A', points: [makePoint({ id: 'other-point' }), makeCam({ id: 'cam-1', pairedHoleId: 'bolt-1', y: 100 })] },
    { panelId: 'panel-B', points: [makeBolt({ id: 'bolt-1', y: 96 })] },
  ]);
}

/**
 * The one finding the whole chain hangs off.
 *
 * `solveMode: 'FIXED_BALL_OFFSET'` is required to make the finding FIRE at all —
 * see the TRIPWIRE block at the bottom of this file: the default
 * BALL_TO_POCKET mode forces ball centre := pocket centre, so Y-mismatch and
 * coaxial can never trip. It changes only WHETHER the finding fires; the patch
 * itself is built by `enhanceFindingWithDeterministicPatch`
 * (validateMinifixConnector.ts:1006) from the drill-map index and is
 * solveMode-independent, so the path/value under test are the real ones.
 */
function productionYMismatchFinding(drillMap: DrillMap): GateFinding {
  const result = validateMinifixGate(drillMap, { solveMode: 'FIXED_BALL_OFFSET' });
  const raw = result.findings.find((f) => f.code === 'MONO_MINIFIX_Y_MISMATCH');
  expect(raw, 'fixture must actually trip MONO_MINIFIX_Y_MISMATCH').toBeDefined();
  expect(raw!.suggestedFix?.strategy).toBe('SET_BOLT_Y_FROM_CAM');
  return minifixFindingToBlockerFinding(raw!);
}

function passingResult(): GateResult {
  return {
    passed: true,
    runAt: new Date().toISOString(),
    policyVersion: 'test',
    findings: { blockers: [], warnings: [], info: [] },
  };
}

// ============================================
// TESTS
// ============================================

describe('applyGatePatches — the production patch shape', () => {
  beforeEach(() => {
    useDrillMapStore.setState({ drillMap: null });
    useGateStore.getState().reset();
  });

  it('(1) a patch built by the real producer and mapped by the real consumer actually changes the drill map', () => {
    const drillMap = yMismatchDrillMap();
    const finding = productionYMismatchFinding(drillMap);

    // Non-vacuous guard: the producer really did attach a fix.
    expect(finding.patch, 'producer must attach a deterministic patch').toBeDefined();
    expect(finding.patch!.length).toBeGreaterThan(0);

    const before = drillMap.panels[1].points[0].position[1];
    expect(before).toBe(96);

    useDrillMapStore.getState().setDrillMap(drillMap);
    expect(applyGatePatches(finding.patch!)).toBe(true);

    const after = useDrillMapStore.getState().drillMap!.panels[1].points[0].position[1];
    expect(after, 'the "Apply fix" button must not be a no-op').not.toBe(before);
    expect(after).toBe(finding.patch![0].value);
  });

  it('(1b) the consumer must not re-prefix a path the producer already prefixed', () => {
    const finding = productionYMismatchFinding(yMismatchDrillMap());
    const path = finding.patch![0].path;

    expect(path).toMatch(/^\/useDrillMapStore\/drillMap\/panels\/\d+\/points\/\d+\//);
    expect(
      path.indexOf('/useDrillMapStore/drillMap/', 1),
      `path carries the store prefix twice: ${path}`,
    ).toBe(-1);
  });
});

describe('applyGatePatches — failure must be impossible to miss', () => {
  beforeEach(() => {
    useDrillMapStore.setState({ drillMap: null });
    useGateStore.getState().reset();
  });

  it('(2) returns false and leaves the store untouched when the path cannot be navigated', () => {
    const drillMap = yMismatchDrillMap();
    useDrillMapStore.getState().setDrillMap(drillMap);
    const snapshot = JSON.stringify(useDrillMapStore.getState().drillMap);
    const ref = useDrillMapStore.getState().drillMap;

    const bad: GatePatch[] = [{
      op: 'replace',
      // panels[9] does not exist — navigation dies at "points"
      path: '/useDrillMapStore/drillMap/panels/9/points/0/position/1',
      value: 1,
    }];

    expect(applyGatePatches(bad)).toBe(false);
    expect(JSON.stringify(useDrillMapStore.getState().drillMap)).toBe(snapshot);
    expect(useDrillMapStore.getState().drillMap).toBe(ref);
  });

  it('(2b) returns false for a double-prefixed path instead of silently no-op-ing', () => {
    const drillMap = yMismatchDrillMap();
    useDrillMapStore.getState().setDrillMap(drillMap);
    const snapshot = JSON.stringify(useDrillMapStore.getState().drillMap);

    // This is the EXACT shape the UI produced before the fix.
    const doubled: GatePatch[] = [{
      op: 'replace',
      path: '/useDrillMapStore/drillMap/useDrillMapStore/drillMap/panels/1/points/0/position/1',
      value: 93.25,
    }];

    expect(applyGatePatches(doubled)).toBe(false);
    expect(JSON.stringify(useDrillMapStore.getState().drillMap)).toBe(snapshot);
  });

  it('(2c) returns false for a replace against a key that does not exist', () => {
    const drillMap = yMismatchDrillMap();
    useDrillMapStore.getState().setDrillMap(drillMap);
    const snapshot = JSON.stringify(useDrillMapStore.getState().drillMap);

    expect(applyGatePatches([{
      op: 'replace',
      path: '/useDrillMapStore/drillMap/panels/1/points/0/noSuchProperty',
      value: 1,
    }])).toBe(false);
    expect(JSON.stringify(useDrillMapStore.getState().drillMap)).toBe(snapshot);
  });

  it('(3) all-or-nothing: a good patch followed by a bad one leaves the store byte-identical', () => {
    const drillMap = yMismatchDrillMap();
    const finding = productionYMismatchFinding(drillMap);

    useDrillMapStore.getState().setDrillMap(drillMap);
    const snapshot = JSON.stringify(useDrillMapStore.getState().drillMap);
    const ref = useDrillMapStore.getState().drillMap;

    const patches: GatePatch[] = [
      finding.patch![0],                                    // valid, would land
      { op: 'replace', path: '/useDrillMapStore/drillMap/panels/9/points/0/depth', value: 1 },
    ];

    expect(applyGatePatches(patches)).toBe(false);
    expect(JSON.stringify(useDrillMapStore.getState().drillMap)).toBe(snapshot);
    expect(useDrillMapStore.getState().drillMap).toBe(ref);
  });
});

describe('applyGatePatches — verdict freshness after a real patch', () => {
  beforeEach(() => {
    useDrillMapStore.setState({ drillMap: null });
    useGateStore.getState().reset();
  });

  it('(4) a genuinely applied patch makes the stored verdict stale, so freeze/export refuse', () => {
    const drillMap = yMismatchDrillMap();
    const finding = productionYMismatchFinding(drillMap);

    useDrillMapStore.getState().setDrillMap(drillMap);
    const validated = useDrillMapStore.getState().drillMap!;

    // A clean verdict, recorded against the exact map in the store.
    useGateStore.getState().setResult(passingResult(), validated);
    expect(isGateResultFresh()).toBe(true);
    expect(getExportGateStatus().canExport).toBe(true);

    expect(applyGatePatches(finding.patch!)).toBe(true);

    expect(isGateResultFresh()).toBe(false);
    const status = getExportGateStatus();
    expect(status.fresh).toBe(false);
    expect(status.canExport).toBe(false);
    expect(status.canFreeze).toBe(false);
  });

  it('(4c) toGatePatches refuses a differently-rooted producer path instead of prefixing it', () => {
    // The raw shape validateMinifixConnector.ts:195/230 emits when the
    // deterministic enhancer cannot resolve an index entry. It does not address
    // a DrillMap, so it must be dropped, not "repaired" into a wrong write.
    expect(toGatePatches([
      { op: 'replace', path: '/entities/bolt/geometry/ball_center/y', value: 1 },
    ])).toBeUndefined();

    // A correctly-rooted producer path survives verbatim.
    const ok = toGatePatches([
      { op: 'replace', path: '/useDrillMapStore/drillMap/panels/1/points/0/position/1', value: 93.25 },
    ]);
    expect(ok).toEqual([
      { op: 'replace', path: '/useDrillMapStore/drillMap/panels/1/points/0/position/1', value: 93.25 },
    ]);
  });

  it('(4b) a REFUSED patch must not disturb freshness either', () => {
    const drillMap = yMismatchDrillMap();
    useDrillMapStore.getState().setDrillMap(drillMap);
    const validated = useDrillMapStore.getState().drillMap!;
    useGateStore.getState().setResult(passingResult(), validated);

    expect(applyGatePatches([{
      op: 'replace',
      path: '/useDrillMapStore/drillMap/panels/9/points/0/depth',
      value: 1,
    }])).toBe(false);

    expect(isGateResultFresh()).toBe(true);
  });
});

// ============================================
// TRIPWIRE — the OTHER reason no "Apply fix" button works today
// ============================================
//
// Fixing the applier does not by itself put a Fix button on screen. SafetyPanel
// calls `validateMinifixGate(drillMap)` with NO options, i.e. solveMode
// BALL_TO_POCKET, and that mode sets `ballCenter = targetCamCenter` verbatim
// (drillMapToMinifixPair.ts:156-163). So `validateYMatch` measures dy = 0 and
// `validateCoaxial` measures a radial offset of 0 — the ONLY two findings that
// carry a deterministic patch (validateMinifixConnector.ts:1006-1052,
// strategies SET_BOLT_Y_FROM_CAM and MOVE_BOLT_ALONG_PANEL) are unreachable
// through the production entry point. Every other producer that reaches the UI
// (g11ToFinding / auditToFinding in SafetyPanel, and the WARNING branch)
// attaches no patch at all.
//
// This test pins that as a FACT, not as approval. When it starts failing,
// somebody has made patches reachable from the UI — read the note above the
// ALLOWED_PATH_PREFIX constant in applyGatePatch.ts first, because at that
// moment the prefix check becomes the only thing bounding what a patch may
// rewrite in a manufacturing artifact.
describe('TRIPWIRE: no UI-reachable finding carries a patch today', () => {
  it('validateMinifixGate() as SafetyPanel calls it produces no applicable patch', () => {
    const drillMap = yMismatchDrillMap();

    // Exactly the production call: no options.
    const result = validateMinifixGate(drillMap);
    const findings = result.findings
      .filter((f) => f.severity === 'ERROR')
      .map(minifixFindingToBlockerFinding);

    const withFix = findings.filter((f) => f.patch && f.patch.length > 0);
    expect(
      withFix.map((f) => f.code),
      'a UI-reachable auto-fix now exists — see the note above this test',
    ).toEqual([]);
  });
});
