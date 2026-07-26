/**
 * G11.5 Bolt Tip ↔ CAM Center — hardware-truth pocket model + perpendicular residual (T10c)
 *
 * @module gate/rules/__tests__/gateG11_boltCamAlignment.test
 *
 * ## Why this file exists (T10b adjudicated finding — GATE-BUG HIGH)
 * The gate's calculateCamPocketCenter offset the cam center by camDepth/2
 * (13.5/2 = 6.75mm) from the drill face. The PHYSICAL Minifix cam's bolt
 * channel sits at dimA = 9mm from the insertion face for 18mm wood
 * (minifixDefaults.ts:55 'camHeight: 9 — dimA'; the Ø15×13.5 housing is
 * asymmetric by design). The generator already targets dimA (= thickness/2)
 * in all four emitter families and emits boltPoint.targetPocketCenter
 * (generateDrillMap.ts:663/:964/:1347/:1610).
 *
 * Effect on current (pre-T10c) code:
 *   - Every OVERLAY and BACK cabinet: cam normal is ±X → the 2.25mm model
 *     error lands in deltaX → 18 false B_G11_BOLT_CAM_MISALIGNMENT blockers
 *     (12 corner pairs + 6 back pairs on the reference 600×720×560 cabinet).
 *   - INSET escapes ONLY because its cam normal is ±Y and the rule checked
 *     deltaX alone — the same 2.25mm error hid UNCHECKED in Y (a genuinely
 *     misaligned INSET pair with a perpendicular Y/Z offset passed silently).
 *
 * ## Post-T10c contract (pinned here)
 *   - Pocket center authority: bolt.targetPocketCenter when the generator
 *     emitted it; otherwise dimA-based fallback where dimA is resolved from
 *     the cam drilling depth via CAM_DRILLING_SPECS (hardware/minifixDefaults
 *     .ts:42-53) — NOT camDepth/2.
 *   - Misalignment measure: full perpendicular residual w.r.t. the bolt
 *     drilling axis (dominant axis of bolt.normal) — validates BOTH cam
 *     orientations. Tolerance unchanged (MATING_TOLERANCE = 0.1mm).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  runG11Rules,
  ruleG11_BoltCamAlignment,
  validateG11FromDrillMap,
  type G11DrillPoint,
} from '../gateG11_minifixSystem32';
import { generateMinifixDrillMap } from '../../../core/manufacturing/drillMap/generateDrillMap';
import type { Cabinet, CabinetPanel } from '../../../core/types/Cabinet';

// ============================================
// FIXTURES — real cabinets through the real generator
// (geometry families of gateG11_drillType_orientation.test.ts
//  and drillMapGolden.ArunInset.test.ts)
// ============================================

const THICKNESS = 18;
const WIDTH = 600;
const HEIGHT = 720;
const DEPTH = 560;

function basePanel(o: {
  id: string;
  role: CabinetPanel['role'];
  w: number;
  h: number;
  position: [number, number, number];
}): CabinetPanel {
  return {
    id: o.id,
    role: o.role,
    name: o.id,
    finishWidth: o.w,
    finishHeight: o.h,
    coreMaterialId: 'core-1',
    faces: { faceA: null, faceB: null },
    edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: {
      realThickness: THICKNESS,
      cutWidth: o.w,
      cutHeight: o.h,
      surfaceArea: 0,
      edgeLength: 0,
      cost: 0,
      co2: 0,
    },
    position: o.position,
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  } as CabinetPanel;
}

function baseCabinet(o: {
  id: string;
  panels: CabinetPanel[];
  topJoint: 'INSET' | 'OVERLAY';
  bottomJoint: 'INSET' | 'OVERLAY';
  backConstruction: 'overlay' | 'inset';
  hasBackPanel: boolean;
  backThickness: number;
}): Cabinet {
  return {
    id: o.id,
    name: o.id,
    type: 'BASE',
    dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH, toeKickHeight: 100 },
    structure: {
      topJoint: o.topJoint,
      bottomJoint: o.bottomJoint,
      hasBackPanel: o.hasBackPanel,
      backPanelConstruction: o.backConstruction,
      backPanelInset: o.backConstruction === 'inset' ? 6 : 0,
      shelfCount: 0,
      dividerCount: 0,
    },
    materials: {
      defaultCore: 'core-1',
      defaultSurface: 'surface-1',
      defaultEdge: 'edge-1',
      overrides: new Map(),
    },
    manufacturing: {
      glueThickness: 0.1,
      preMilling: 0.5,
      grooveDepth: 8,
      clearance: 2,
      shelfSetbackFront: 20,
      backPanelConstruction: o.backConstruction,
      backVoid: o.backConstruction === 'inset' ? 20 : 0,
      backThickness: o.backThickness,
      safetyGap: 2,
    },
    panels: o.panels,
    computed: {
      totalCost: 0,
      totalCO2: 0,
      panelCount: o.panels.length,
      totalSurfaceArea: 0,
      totalEdgeLength: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as Cabinet;
}

/**
 * Flush OVERLAY cabinet (TOP/BOTTOM cover the sides). Optionally with an
 * overlay BACK panel (inner face maxZ = 0 touching the sides' back edges),
 * which gates the BACK emitter family (generateDrillMap.ts:2130-2141).
 */
function createOverlayCabinet(withBack: boolean): Cabinet {
  const sideH = HEIGHT - 2 * THICKNESS; // 684
  const sx = WIDTH / 2 - THICKNESS / 2; // 291
  const panels = [
    basePanel({ id: 'panel-top', role: 'TOP', w: WIDTH, h: DEPTH, position: [0, HEIGHT - THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-bottom', role: 'BOTTOM', w: WIDTH, h: DEPTH, position: [0, THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-left', role: 'LEFT_SIDE', w: DEPTH, h: sideH, position: [-sx, HEIGHT / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-right', role: 'RIGHT_SIDE', w: DEPTH, h: sideH, position: [sx, HEIGHT / 2, DEPTH / 2] }),
    ...(withBack
      ? [basePanel({ id: 'panel-back', role: 'BACK', w: WIDTH, h: HEIGHT, position: [0, HEIGHT / 2, -THICKNESS / 2] })]
      : []),
  ];
  return baseCabinet({
    id: withBack ? 'overlay-with-back' : 'overlay-no-back',
    panels,
    topJoint: 'OVERLAY',
    bottomJoint: 'OVERLAY',
    backConstruction: withBack ? 'overlay' : 'inset',
    hasBackPanel: withBack,
    backThickness: withBack ? THICKNESS : 6,
  });
}

/**
 * Flush INSET cabinet (sides full height, horizontals between them) —
 * geometry copied from drillMapGolden.ArunInset.test.ts. Regression guard:
 * the perpendicular-residual check must NOT newly break the INSET family.
 */
function createInsetCabinet(): Cabinet {
  const horizW = WIDTH - 2 * THICKNESS + 2 * 9; // 582 (store-real flush INSET)
  const sx = horizW / 2 - 9 + THICKNESS / 2;    // 291
  const panels = [
    basePanel({ id: 'panel-top', role: 'TOP', w: horizW, h: DEPTH, position: [0, HEIGHT - THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-bottom', role: 'BOTTOM', w: horizW, h: DEPTH, position: [0, THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-left', role: 'LEFT_SIDE', w: DEPTH, h: HEIGHT, position: [-sx, HEIGHT / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-right', role: 'RIGHT_SIDE', w: DEPTH, h: HEIGHT, position: [sx, HEIGHT / 2, DEPTH / 2] }),
  ];
  return baseCabinet({
    id: 'inset-a-run',
    panels,
    topJoint: 'INSET',
    bottomJoint: 'INSET',
    backConstruction: 'inset',
    hasBackPanel: true,
    backThickness: 6,
  });
}

function generateMapSilently(cabinet: Cabinet) {
  // Silence DEV-only handover/geometry logs — this suite is about gate verdicts
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dm = generateMinifixDrillMap(cabinet);
  err.mockRestore();
  warn.mockRestore();
  return dm;
}

function g115BlockerMessages(result: ReturnType<typeof validateG11FromDrillMap>): string[] {
  return result.issues
    .filter(i => i.severity === 'BLOCKER' && i.code === 'B_G11_BOLT_CAM_MISALIGNMENT')
    .map(i => i.message);
}

// ============================================
// EMPIRICAL: real drill maps must be G11.5-clean AND fully G11-clean
// ============================================

describe('EMPIRICAL: G11.5 on generator-correct cabinets (all three construction families)', () => {
  it('OVERLAY cabinet (no back): zero G11.5 blockers, zero G11 blockers overall', () => {
    const drillMap = generateMapSilently(createOverlayCabinet(false));
    const allPoints = drillMap.panels.flatMap(p => p.points);

    // Non-vacuous guards: OVERLAY bolt/cam pairs exist and carry the
    // generator's pocket-center authority
    const bolts = allPoints.filter(p => p.purpose === 'BOLT');
    expect(bolts.length, 'OVERLAY BOLT points must be generated').toBeGreaterThan(0);
    expect(
      bolts.every(p => Array.isArray(p.targetPocketCenter)),
      'every generated BOLT carries targetPocketCenter (single authority)',
    ).toBe(true);

    const result = validateG11FromDrillMap(drillMap);

    expect(g115BlockerMessages(result)).toEqual([]);
    // T10b landed G11.2/G11.3; T10c lands G11.5 → the whole gate now tells
    // the truth for a generator-correct OVERLAY cabinet.
    expect(result.issues.filter(i => i.severity === 'BLOCKER')).toEqual([]);
    expect(result.summary.blockers).toBe(0);
    expect(result.status).toBe('PASS');
  });

  it('OVERLAY cabinet WITH overlay back: zero G11.5 blockers (was 18 × deltaX=2.25mm), zero G11 blockers overall', () => {
    const drillMap = generateMapSilently(createOverlayCabinet(true));
    const allPoints = drillMap.panels.flatMap(p => p.points);

    // Non-vacuous guards: both the OVERLAY corner family AND the BACK family ran
    const cornerBolts = allPoints.filter(
      p => p.purpose === 'BOLT' && (p.connectedPanelRole === 'TOP' || p.connectedPanelRole === 'BOTTOM'),
    );
    const backBolts = allPoints.filter(
      p => p.purpose === 'BOLT' && p.connectedPanelRole === 'BACK',
    );
    expect(cornerBolts.length, 'OVERLAY corner BOLT points must be generated').toBeGreaterThan(0);
    expect(backBolts.length, 'BACK-panel BOLT points must be generated').toBeGreaterThan(0);

    const result = validateG11FromDrillMap(drillMap);

    // Pre-T10c this array held 18 false blockers, every one with
    // "gap: 2.25mm" — the camDepth/2 (6.75) vs dimA (9) model error
    // expressed along the ±X cam normal of OVERLAY and BACK joints.
    expect(g115BlockerMessages(result)).toEqual([]);
    expect(result.issues.filter(i => i.severity === 'BLOCKER')).toEqual([]);
    expect(result.summary.blockers).toBe(0);
    expect(result.status).toBe('PASS');

    // The dimA FALLBACK must agree with the hardware truth on its own:
    // strip the generator's targetPocketCenter and re-run — still clean.
    const stripped: G11DrillPoint[] = allPoints.map(p => ({
      id: p.id,
      panelId: p.panelId,
      position: p.position,
      normal: p.normal,
      diameter: p.diameter,
      depth: p.depth,
      purpose: p.purpose,
      componentType: p.componentType,
      pairId: p.pairId,
      pairedHoleId: p.pairedHoleId,
      edgeDistance: p.edgeDistance,
      cornerType: p.cornerType,
      face: p.face,
      connectedPanelRole: p.connectedPanelRole,
      // targetPocketCenter deliberately omitted → dimA fallback path
    }));
    const fallbackIssues = ruleG11_BoltCamAlignment(stripped);
    expect(
      fallbackIssues.filter(i => i.code === 'B_G11_BOLT_CAM_MISALIGNMENT').map(i => i.message),
    ).toEqual([]);
  });

  it('INSET cabinet: zero G11.5 blockers, zero G11 blockers overall (perpendicular check must not newly break INSET)', () => {
    const drillMap = generateMapSilently(createInsetCabinet());
    const allPoints = drillMap.panels.flatMap(p => p.points);

    const bolts = allPoints.filter(p => p.purpose === 'BOLT');
    expect(bolts.length, 'INSET BOLT points must be generated').toBeGreaterThan(0);

    const result = validateG11FromDrillMap(drillMap);

    expect(g115BlockerMessages(result)).toEqual([]);
    expect(result.issues.filter(i => i.severity === 'BLOCKER')).toEqual([]);
    expect(result.summary.blockers).toBe(0);
    expect(result.status).toBe('PASS');
  });
});

// ============================================
// SYNTHETIC PINS — pocket model + perpendicular residual
// ============================================

function createPoint(overrides: Partial<G11DrillPoint> & {
  id: string;
  purpose: string;
}): G11DrillPoint {
  return {
    panelId: 'panel-1',
    position: [0, 0, 0],
    normal: [1, 0, 0],
    diameter: 10,
    depth: 17.5,
    ...overrides,
  };
}

/**
 * INSET-style pair (bolt axis X, cam normal ±Y).
 * Hardware truth (18mm wood, camDepth 13.5 → dimA 9):
 *   cam surface [42, 709, 37], normal [0,-1,0] → bolt channel at [42, 700, 37]
 *   bolt entry  [18, boltY, boltZ], normal [-1,0,0] → tip [42, boltY, boltZ]
 */
function insetPair(boltY: number, boltZ: number): G11DrillPoint[] {
  return [
    createPoint({
      id: 'cam-inset',
      purpose: 'CAM_LOCK',
      diameter: 15,
      depth: 13.5,
      position: [42, 709, 37],
      normal: [0, -1, 0],
      cornerType: 'TOP_LEFT',
      connectedPanelRole: 'TOP',
      pairedHoleId: 'bolt-inset',
    }),
    createPoint({
      id: 'bolt-inset',
      purpose: 'BOLT',
      position: [18, boltY, boltZ],
      normal: [-1, 0, 0],
      cornerType: 'TOP_LEFT',
      connectedPanelRole: 'LEFT_SIDE',
      pairedHoleId: 'cam-inset',
    }),
  ];
}

/**
 * OVERLAY-style pair (bolt axis Y, cam normal ±X) — TOP_RIGHT corner.
 * Hardware truth (18mm wood): right side inner face x=282, cam surface
 * [282, 678, 37], normal [+1,0,0] → bolt channel at [291, 678, 37]
 * (side thickness center). TOP panel inner face y=702; bolt entry
 * [boltX, 702, boltZ], normal [0,+1,0] → tip [boltX, 678, boltZ].
 */
function overlayPair(boltX: number, boltZ: number): G11DrillPoint[] {
  return [
    createPoint({
      id: 'cam-overlay',
      purpose: 'CAM_LOCK',
      diameter: 15,
      depth: 13.5,
      position: [282, 678, 37],
      normal: [1, 0, 0],
      cornerType: 'TOP_RIGHT',
      connectedPanelRole: 'RIGHT_SIDE',
      pairedHoleId: 'bolt-overlay',
    }),
    createPoint({
      id: 'bolt-overlay',
      purpose: 'BOLT',
      position: [boltX, 702, boltZ],
      normal: [0, 1, 0],
      cornerType: 'TOP_RIGHT',
      connectedPanelRole: 'TOP',
      pairedHoleId: 'cam-overlay',
    }),
  ];
}

describe('G11.5 pocket model: dimA from the hardware config, not camDepth/2', () => {
  it('passes an aligned OVERLAY pair (cam normal ±X) — was a 2.25mm false blocker', () => {
    // Old model: pocket = 282 + 6.75 = 288.75 → deltaX vs tip x=291 = 2.25 → BLOCKER
    // Hardware truth: pocket = 282 + dimA(13.5→9) = 291 → residual 0 → clean
    const issues = ruleG11_BoltCamAlignment(overlayPair(291, 37));
    expect(issues).toEqual([]);
  });

  it('passes an aligned INSET pair (cam normal ±Y) at the dimA-truth geometry', () => {
    const issues = ruleG11_BoltCamAlignment(insetPair(700, 37));
    expect(issues).toEqual([]);
  });

  it('resolves dimA from the cam drilling depth (16mm wood: camDepth 12.5 → dimA 8, not 9)', () => {
    // CAM_DRILLING_SPECS[16] = { drillingDepth: 12.5, dimA: 8 }
    // cam surface [42, 708, 37], depth 12.5 → channel at [42, 700, 37]
    const points = insetPair(700, 37);
    points[0].depth = 12.5;
    points[0].position = [42, 708, 37];
    expect(ruleG11_BoltCamAlignment(points)).toEqual([]);

    // Same geometry but bolt channel 1mm off in Y → must blocker at 1.00mm
    // (a hardcoded dimA=9 would misreport this as 0mm or 2mm)
    const off = ruleG11_BoltCamAlignment([
      points[0],
      { ...points[1], position: [18, 701, 37] },
    ]);
    expect(off.length).toBe(1);
    expect(off[0].code).toBe('B_G11_BOLT_CAM_MISALIGNMENT');
    expect(off[0].context?.measured).toBeCloseTo(1.0, 5);
  });
});

describe('G11.5 perpendicular residual: genuinely misaligned pairs still blocker in BOTH cam orientations', () => {
  it('INSET orientation (cam normal ±Y): bolt axis 2.25mm off in Y → BLOCKER (passed SILENTLY before the fix)', () => {
    // Pre-T10c the rule checked deltaX alone: this pair had deltaX = 0
    // (old wrong pocket 709 - 6.75 = 702.25 even matched the bad bolt tip!)
    // so a real 2.25mm perpendicular misalignment sailed through the gate.
    const issues = ruleG11_BoltCamAlignment(insetPair(702.25, 37));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_BOLT_CAM_MISALIGNMENT');
    expect(issues[0].context?.measured).toBeCloseTo(2.25, 5);
  });

  it('INSET orientation: bolt axis 2.5mm off in Z → BLOCKER (also silent before)', () => {
    const issues = ruleG11_BoltCamAlignment(insetPair(700, 39.5));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_BOLT_CAM_MISALIGNMENT');
    expect(issues[0].context?.measured).toBeCloseTo(2.5, 5);
  });

  it('OVERLAY orientation (cam normal ±X): bolt axis 2.5mm off in X → BLOCKER', () => {
    const issues = ruleG11_BoltCamAlignment(overlayPair(293.5, 37));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_BOLT_CAM_MISALIGNMENT');
    expect(issues[0].context?.measured).toBeCloseTo(2.5, 5);
  });

  it('OVERLAY orientation: bolt axis 2.5mm off in Z → BLOCKER', () => {
    const issues = ruleG11_BoltCamAlignment(overlayPair(291, 39.5));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_BOLT_CAM_MISALIGNMENT');
    expect(issues[0].context?.measured).toBeCloseTo(2.5, 5);
  });

  it('keeps the warning band: residual just inside tolerance → W_G11_BOLT_CAM_NEAR_TOLERANCE', () => {
    const issues = ruleG11_BoltCamAlignment(insetPair(700.09, 37));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('WARNING');
    expect(issues[0].code).toBe('W_G11_BOLT_CAM_NEAR_TOLERANCE');
  });
});

describe('G11.5 pocket-center authority: bolt.targetPocketCenter wins when present', () => {
  it('consumes the emitted targetPocketCenter instead of recomputing from the cam point', () => {
    // Cam surface deliberately implies a DIFFERENT pocket than the emitted
    // authority. If the rule recomputed from the cam, this would blocker;
    // consuming the generator's targetPocketCenter it is clean.
    const points = insetPair(700, 37);
    points[1].targetPocketCenter = [42, 700, 37]; // hardware truth from generator
    points[0].position = [42, 705, 37];           // stale/odd cam surface
    expect(ruleG11_BoltCamAlignment(points)).toEqual([]);
  });

  it('still blockers when the emitted targetPocketCenter is perpendicular-offset beyond tolerance', () => {
    const points = insetPair(700, 37);
    points[1].targetPocketCenter = [42, 702.25, 37];
    const issues = ruleG11_BoltCamAlignment(points);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_BOLT_CAM_MISALIGNMENT');
    expect(issues[0].context?.measured).toBeCloseTo(2.25, 5);
  });

  it('flattener carries targetPocketCenter through validateG11FromDrillMap', () => {
    // Pins the passthrough copy in validateG11FromDrillMap's flattener.
    // Geometry is chosen so the two authorities DISAGREE: the cam is moved to
    // y=705, so the dimA fallback would place the pocket at [42, 696, 37] —
    // 4mm off the bolt's X axis (blocker) — while the bolt carries the
    // generator's emitted truth [42, 700, 37] (perpendicular residual 0).
    // Clean only if the flattener actually copies targetPocketCenter through;
    // drop that copy and this test blockers. Must go through the wrapper —
    // calling runG11Rules directly bypasses the flattener and pins nothing.
    const points = insetPair(700, 37);
    points[1].targetPocketCenter = [42, 700, 37];
    points[0].position = [42, 705, 37];

    const drillMap = {
      panels: [{ id: 'panel-left', role: 'LEFT_SIDE', points }],
    } as unknown as Parameters<typeof validateG11FromDrillMap>[0];

    const result = validateG11FromDrillMap(drillMap);

    // Non-vacuous: the pair must actually have been seen by the rule.
    expect(result.summary.pointsValidated).toBeGreaterThan(0);
    expect(result.issues.filter(i => i.code === 'B_G11_BOLT_CAM_MISALIGNMENT')).toEqual([]);
  });
});
