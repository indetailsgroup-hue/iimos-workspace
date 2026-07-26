/**
 * G11.3 Drill Type — orientation-aware validation (T10b)
 *
 * @module gate/rules/__tests__/gateG11_drillType_orientation.test
 *
 * Empirical + synthetic pins for the BACK-panel overlay joint family and the
 * BOLT_ENTRY latent trap.
 *
 * ## Why this file exists (T10 carry-forward)
 * The old G11.3 expectation was role-based (`getExpectedBoreType(panelRole)`)
 * and INSET-v4-only. The generator has FOUR joint families (verified in
 * generateDrillMap.ts, do not guess):
 *   - OVERLAY corner:  BOLT face ±Y on TOP/BOTTOM (:572) · CAM face ±X on SIDE (:631)
 *                      · BOLT_ENTRY edge ±Y on SIDE (:610)
 *   - INSET corner:    BOLT face ±X on SIDE (:815) · CAM face ±Y on HORIZ (:919)
 *                      · BOLT_ENTRY edge ±X on HORIZ (:855)
 *   - SHELF junction:  BOLT face ±X on SIDE (:1222) · CAM face on SHELF (:1310)
 *                      · BOLT_ENTRY edge ±X on SHELF (:1270)
 *   - BACK overlay:    BOLT face ±Z on BACK (:1517, normal [0,0,-1] from
 *                      panelBasis.ts:1014) · CAM face ±X on SIDE (:1575)
 *                      · BOLT_ENTRY edge ±Z on SIDE (:1555)
 *
 * The invariant that holds across ALL families is purpose-based, not role-based:
 *   - BOLT / CAM_LOCK / MINIFIX are always FACE bores into their host panel
 *     (drilled along the host panel's thickness axis)
 *   - BOLT_ENTRY is always an EDGE bore (bolt passage through the mating panel)
 *   - DOWEL pairs are one EDGE + one FACE (validated pairwise, per-point skip)
 *
 * Thickness axis per host role: SIDE→X, TOP/BOTTOM/SHELF→Y, BACK→Z.
 * The old code had no BACK case: a Z-dominant normal on a BACK panel was
 * classified EDGE_BORE (false blocker on every overlay-back cabinet), and a
 * Z-dominant normal on a SIDE panel was classified FACE_BORE (a bolt mistakenly
 * bored into the side back edge would PASS the gate).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ruleG11_DrillType,
  ruleG11_DowelDepth,
  validateG11FromDrillMap,
  type G11DrillPoint,
} from '../gateG11_minifixSystem32';
import { generateMinifixDrillMap } from '../../../core/manufacturing/drillMap/generateDrillMap';
import type { Cabinet, CabinetPanel } from '../../../core/types/Cabinet';

// ============================================
// FIXTURES — real cabinet with overlay back panel
// (geometry family of bRunDowelGeneration.test.ts)
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

/**
 * Flush OVERLAY cabinet WITH an overlay back panel.
 * Sides span z ∈ [0, 560]; back panel z ∈ [-18, 0] so its inner face
 * (maxZ = 0) touches the side panels' back edges (minZ = 0).
 */
function createOverlayCabinetWithBackPanel(): Cabinet {
  const sideH = HEIGHT - 2 * THICKNESS; // 684
  const sx = WIDTH / 2 - THICKNESS / 2; // 291
  const panels = [
    basePanel({ id: 'panel-top', role: 'TOP', w: WIDTH, h: DEPTH, position: [0, HEIGHT - THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-bottom', role: 'BOTTOM', w: WIDTH, h: DEPTH, position: [0, THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-left', role: 'LEFT_SIDE', w: DEPTH, h: sideH, position: [-sx, HEIGHT / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-right', role: 'RIGHT_SIDE', w: DEPTH, h: sideH, position: [sx, HEIGHT / 2, DEPTH / 2] }),
    // BACK panel AABB (panelBasis.ts:145-149): W=finishWidth(X), H=finishHeight(Y), D=thickness(Z)
    basePanel({ id: 'panel-back', role: 'BACK', w: WIDTH, h: HEIGHT, position: [0, HEIGHT / 2, -THICKNESS / 2] }),
  ];

  return {
    id: 'test-cabinet-back',
    name: 'Test Cabinet With Back',
    type: 'BASE',
    dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH, toeKickHeight: 100 },
    structure: {
      topJoint: 'OVERLAY',
      bottomJoint: 'OVERLAY',
      hasBackPanel: true,
      backPanelConstruction: 'overlay', // gates the BACK emitter (generateDrillMap.ts:2130-2141)
      backPanelInset: 0,
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
      backPanelConstruction: 'overlay',
      backVoid: 0,
      backThickness: THICKNESS,
      safetyGap: 2,
    },
    panels,
    computed: {
      totalCost: 0,
      totalCO2: 0,
      panelCount: panels.length,
      totalSurfaceArea: 0,
      totalEdgeLength: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as Cabinet;
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

function createPoint(overrides: Partial<G11DrillPoint> & {
  id: string;
  purpose: string;
}): G11DrillPoint {
  return {
    panelId: 'panel-1',
    position: [0, 0, 0],
    normal: [1, 0, 0],
    diameter: 8,
    depth: 18,
    ...overrides,
  };
}

// ============================================
// EMPIRICAL: real drill map, cabinet with back panel
// ============================================

describe('EMPIRICAL: overlay cabinet with back panel through the real generator', () => {
  it('G11 does not false-block the BACK-panel joint family (drill type + dowel depth)', () => {
    const cabinet = createOverlayCabinetWithBackPanel();
    const drillMap = generateMapSilently(cabinet);
    const allPoints = drillMap.panels.flatMap(p => p.points);

    // Non-vacuous guards: the BACK emitter actually ran
    const backBolts = allPoints.filter(
      p => p.purpose === 'BOLT' && p.connectedPanelRole === 'BACK',
    );
    expect(backBolts.length, 'BACK-panel BOLT points must be generated').toBeGreaterThan(0);
    expect(
      backBolts.every(p => Math.abs(p.normal[2]) === 1),
      'BACK BOLT drills along Z (face bore into back panel)',
    ).toBe(true);
    const backJointDowels = allPoints.filter(
      p => p.purpose === 'DOWEL' && p.cornerType?.startsWith('BACK_'),
    );
    expect(backJointDowels.length, 'BACK-joint dowels must be generated').toBeGreaterThan(0);

    const result = validateG11FromDrillMap(drillMap);

    // Scope: G11.3 drill-type and G11.2 dowel-depth verdicts on a
    // generator-correct map must be clean. (G11.5 bolt-cam is out of scope
    // for T10b — tracked separately.)
    const scopedCodes = new Set([
      'B_G11_DRILL_TYPE_SIDE_NOT_FACE',
      'B_G11_DRILL_TYPE_HORIZONTAL_NOT_FACE',
      'B_G11_DOWEL_DEPTH_SIDE_WRONG',
      'B_G11_DOWEL_DEPTH_HORIZONTAL_WRONG',
    ]);
    const falseBlockers = result.issues
      .filter(i => i.severity === 'BLOCKER' && scopedCodes.has(i.code))
      .map(i => `${i.code} :: ${i.message}`);

    expect(falseBlockers).toEqual([]);
  });
});

// ============================================
// SYNTHETIC PINS — G11.3 orientation-aware drill type
// ============================================

describe('G11.3 drill type: BACK-panel host (thickness axis = Z)', () => {
  it('passes BACK BOLT face bore [0,0,-1] (generator geometry, panelBasis.ts:1014)', () => {
    const issues = ruleG11_DrillType([
      createPoint({
        id: 'bolt-back',
        purpose: 'BOLT',
        position: [291, 400, 0],
        normal: [0, 0, -1],
        connectedPanelRole: 'BACK',
        cornerType: 'BACK_RIGHT',
      }),
    ]);
    expect(issues).toEqual([]);
  });

  it('blocks BACK BOLT bored along X (edge bore into back panel = wrong)', () => {
    const issues = ruleG11_DrillType([
      createPoint({
        id: 'bolt-back-bad',
        purpose: 'BOLT',
        position: [300, 400, -9],
        normal: [-1, 0, 0],
        connectedPanelRole: 'BACK',
      }),
    ]);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].context?.boreType).toBe('EDGE_BORE');
    expect(issues[0].context?.expectedBoreType).toBe('FACE_BORE');
  });
});

describe('G11.3 drill type: SIDE-panel Z-normal is an EDGE bore (back edge)', () => {
  it('blocks a BOLT bored into the SIDE panel back edge [0,0,1] (passed silently before)', () => {
    // Regression trap: old inferBoreTypeFromNormal called side ±Z "FACE_BORE",
    // so a bolt sleeve mistakenly bored into the side back edge PASSED the gate.
    const issues = ruleG11_DrillType([
      createPoint({
        id: 'bolt-side-backedge',
        purpose: 'BOLT',
        position: [291, 400, 0],
        normal: [0, 0, 1],
        connectedPanelRole: 'RIGHT_SIDE',
      }),
    ]);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_DRILL_TYPE_SIDE_NOT_FACE');
    expect(issues[0].context?.boreType).toBe('EDGE_BORE');
  });
});

describe('G11.3 drill type: BOLT_ENTRY is always an EDGE bore (latent-trap pin)', () => {
  it('passes OVERLAY BOLT_ENTRY: side top/bottom edge ±Y (generateDrillMap.ts:610)', () => {
    // Latent trap closed: the old role-based expectation said SIDE→FACE_BORE,
    // so adding BOLT_ENTRY to the purpose filter would have false-blocked every
    // OVERLAY cabinet. Orientation-aware: EDGE expected, EDGE actual → clean.
    const issues = ruleG11_DrillType([
      createPoint({
        id: 'entry-overlay',
        purpose: 'BOLT_ENTRY',
        position: [291, 684, 280],
        normal: [0, -1, 0],
        connectedPanelRole: 'RIGHT_SIDE',
        cornerType: 'TOP_RIGHT',
      }),
    ]);
    expect(issues).toEqual([]);
  });

  it('passes BACK-joint BOLT_ENTRY: side back edge ±Z (generateDrillMap.ts:1555)', () => {
    const issues = ruleG11_DrillType([
      createPoint({
        id: 'entry-back',
        purpose: 'BOLT_ENTRY',
        position: [291, 400, 0],
        normal: [0, 0, 1],
        connectedPanelRole: 'RIGHT_SIDE',
        cornerType: 'BACK_RIGHT',
      }),
    ]);
    expect(issues).toEqual([]);
  });

  it('blocks a BOLT_ENTRY face-bored into the side panel (±X) — was unguarded', () => {
    const issues = ruleG11_DrillType([
      createPoint({
        id: 'entry-bad',
        purpose: 'BOLT_ENTRY',
        position: [282, 400, 280],
        normal: [1, 0, 0],
        connectedPanelRole: 'RIGHT_SIDE',
      }),
    ]);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].context?.boreType).toBe('FACE_BORE');
    expect(issues[0].context?.expectedBoreType).toBe('EDGE_BORE');
  });
});

// ============================================
// SYNTHETIC PINS — G11.2 dowel depth on the BACK joint family
// ============================================

describe('G11.2 dowel depth: BACK-joint dowels (depth follows actual bore orientation)', () => {
  it('passes BACK-panel dowel: FACE bore [0,0,-1] depth 12 (generateDrillMap.ts:1671-1685)', () => {
    const issues = ruleG11_DowelDepth([
      createPoint({
        id: 'dowel-back-face',
        purpose: 'DOWEL',
        position: [291, 368, 0],
        normal: [0, 0, -1],
        depth: 12,
        connectedPanelRole: 'BACK',
      }),
    ]);
    expect(issues).toEqual([]);
  });

  it('passes SIDE back-edge dowel: EDGE bore [0,0,1] depth 18 (generateDrillMap.ts:1695-1709)', () => {
    const issues = ruleG11_DowelDepth([
      createPoint({
        id: 'dowel-side-backedge',
        purpose: 'DOWEL',
        position: [291, 368, 0],
        normal: [0, 0, 1],
        depth: 18,
        connectedPanelRole: 'RIGHT_SIDE',
      }),
    ]);
    expect(issues).toEqual([]);
  });

  it('still blocks SIDE back-edge dowel with FACE depth (12 ≠ 18)', () => {
    const issues = ruleG11_DowelDepth([
      createPoint({
        id: 'dowel-side-backedge-bad',
        purpose: 'DOWEL',
        position: [291, 368, 0],
        normal: [0, 0, 1],
        depth: 12,
        connectedPanelRole: 'RIGHT_SIDE',
      }),
    ]);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].context?.expected).toBe(18);
  });
});
