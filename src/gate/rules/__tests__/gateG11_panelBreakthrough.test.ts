/**
 * gateG11_panelBreakthrough.test.ts
 *
 * G11.9 — PANEL BREAKTHROUGH (ADR-005 MON-BS-001 conformance test).
 *
 * ADR-005 (`docs/adr/ADR-005-boring-standard.en.md`) lists `panel breakthrough`
 * among the conformance tests MON-BS-001 requires. Before this suite no
 * breakthrough check existed anywhere in src/gate or src/core/manufacturing/
 * drillMap — only comments mentioned it.
 *
 * The adjudicable fact (no invented tolerance):
 *   a BLIND bore whose depth is >= the owner panel's own thickness cannot
 *   exist in that panel — it breaks through the far face.
 *
 * Scope and the deliberate UNKNOWNs are documented on ruleG11_PanelBreakthrough.
 * This is Layer 2: it catches impossible bores arriving from ANY path, not just
 * the back-panel emitter that Layer 1 (generateDrillMap) refuses at source.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  refusalsToG11Issues,
  ruleG11_PanelBreakthrough,
  runG11Rules,
  validateG11FromDrillMap,
} from '../gateG11_minifixSystem32';
import type { G11DrillPoint, G11Panel } from '../gateG11_types';
import type { DrillMap, DrillMapPanel, DrillMapPoint } from '../../../core/manufacturing/drillMap/types';
import { generateMinifixDrillMap } from '../../../core/manufacturing/drillMap/generateDrillMap';
import type { Cabinet, CabinetPanel } from '../../../core/types/Cabinet';
// The reachable mutation path (see the EDGE describe block below): a real UI
// button → applyFindingFix → applyGatePatches → setDrillMap, with NO geometric
// re-adjudication in between. G11 is the only remaining check.
import { useDrillMapStore } from '../../../core/store/useDrillMapStore';
import { applyGatePatches } from '../../ui/applyGatePatch';
import type { GatePatch } from '../../ui/gateTypes';

// ============================================
// FIXTURE BUILDERS
// ============================================

function point(o: Partial<G11DrillPoint> & { id: string; purpose: string }): G11DrillPoint {
  return {
    panelId: 'panel-back',
    position: [0, 0, 0],
    normal: [0, 0, -1],
    diameter: 10,
    depth: 17.5,
    ...o,
  };
}

function g11Panel(o: Partial<G11Panel> & { id: string; role: string }): G11Panel {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    finishWidth: 600,
    finishHeight: 720,
    computed: { realThickness: 18 },
    ...o,
  };
}

/** Minimal DrillMap carrying panel thickness the way the generator emits it. */
function drillMapWith(
  panelSpecs: Array<{ panelId: string; role: string; thickness: number; points: Partial<DrillMapPoint>[] }>,
): DrillMap {
  return {
    cabinetId: 'cab-breakthrough',
    version: '2.0',
    panels: panelSpecs.map((p) => ({
      panelId: p.panelId,
      role: p.role,
      dimensions: { width: 600, height: 720, thickness: p.thickness },
      worldPosition: [0, 0, 0] as [number, number, number],
      worldRotation: [0, 0, 0] as [number, number, number],
      points: p.points.map((pt, i) => ({
        id: `${p.panelId}-pt-${i}`,
        panelId: p.panelId,
        position: [0, 0, 0] as [number, number, number],
        normal: [0, 0, -1] as [number, number, number],
        diameter: 10,
        depth: 17.5,
        purpose: 'BOLT' as const,
        componentType: 'BOLT' as const,
        status: 'VALID' as const,
        ...pt,
      })),
    })),
  };
}

// ============================================
// G11.9 — BLOCKER on impossible blind bores
// ============================================

describe('G11.9 panel breakthrough: blind bore deeper than its owner panel', () => {
  it('BLOCKS a 17.5mm BOLT face bore owned by a 6mm BACK panel (F-07)', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'bolt-back-0', purpose: 'BOLT', depth: 17.5, connectedPanelRole: 'BACK' })],
      [g11Panel({ id: 'panel-back', role: 'BACK', computed: { realThickness: 6 } })],
    );

    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('BLOCKER');
    expect(issues[0].code).toBe('B_G11_PANEL_BREAKTHROUGH');
    expect(issues[0].context?.measured).toBe(17.5);
    expect(issues[0].context?.expected).toBe(6);
    expect(issues[0].panelIds).toEqual(['panel-back']);
  });

  it('BLOCKS the 11mm BOLT_THREAD pilot in the same 6mm BACK panel', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'thread-back-0', purpose: 'BOLT_THREAD', diameter: 5, depth: 11, connectedPanelRole: 'BACK' })],
      [g11Panel({ id: 'panel-back', role: 'BACK', computed: { realThickness: 6 } })],
    );

    expect(issues.map((i) => i.code)).toEqual(['B_G11_PANEL_BREAKTHROUGH']);
  });

  it('BLOCKS when depth EQUALS thickness (bore reaches the far face — not blind)', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'bolt-exact', purpose: 'BOLT', depth: 18, connectedPanelRole: 'BACK' })],
      [g11Panel({ id: 'panel-back', role: 'BACK', computed: { realThickness: 18 } })],
    );

    expect(issues.map((i) => i.code)).toEqual(['B_G11_PANEL_BREAKTHROUGH']);
  });

  it('catches a point arriving from ANY path — full DrillMap flattener, no panels[] argument', () => {
    const drillMap = drillMapWith([
      {
        panelId: 'panel-back',
        role: 'BACK',
        thickness: 6,
        points: [
          { purpose: 'BOLT', depth: 17.5, normal: [0, 0, -1], connectedPanelRole: 'BACK' },
          { purpose: 'DOWEL', componentType: 'DOWEL', diameter: 8, depth: 12, normal: [0, 0, -1], connectedPanelRole: 'BACK' },
        ],
      },
    ]);

    const result = validateG11FromDrillMap(drillMap);
    const breakthrough = result.issues.filter((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH');

    expect(breakthrough.length).toBe(2);
    expect(result.status).toBe('FAIL');
    expect(result.summary.blockers).toBeGreaterThanOrEqual(2);
  });

  it('is wired into the rule set the Safety Gate runs (runG11Rules)', () => {
    const result = runG11Rules(
      [point({ id: 'bolt-back-0', purpose: 'BOLT', depth: 17.5, connectedPanelRole: 'BACK' })],
      [g11Panel({ id: 'panel-back', role: 'BACK', computed: { realThickness: 6 } })],
    );

    expect(result.issues.some((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH')).toBe(true);
    expect(result.status).toBe('FAIL');
  });
});

// ============================================
// NOT OVER-BLOCKING — the normal Häfele S200 case
// ============================================

describe('G11.9 panel breakthrough: must not over-block legal geometry', () => {
  it('PASSES a 17.5mm bolt bore in an 18mm panel (0.5mm residual — normal S200 case)', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'bolt-side-0', purpose: 'BOLT', depth: 17.5, normal: [-1, 0, 0], panelId: 'panel-left', connectedPanelRole: 'LEFT_SIDE' })],
      [g11Panel({ id: 'panel-left', role: 'LEFT_SIDE', computed: { realThickness: 18 } })],
    );

    expect(issues).toEqual([]);
  });

  it('PASSES a 17.5mm bolt bore in an 18mm BACK panel (overlay back done right)', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'bolt-back-0', purpose: 'BOLT', depth: 17.5, connectedPanelRole: 'BACK' })],
      [g11Panel({ id: 'panel-back', role: 'BACK', computed: { realThickness: 18 } })],
    );

    expect(issues).toEqual([]);
  });

  it('PASSES a declared THROUGH hole (throughHole=true is intentional, not a breakthrough)', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'through-0', purpose: 'OTHER', depth: 18, throughHole: true, connectedPanelRole: 'BACK' })],
      [g11Panel({ id: 'panel-back', role: 'BACK', computed: { realThickness: 18 } })],
    );

    expect(issues).toEqual([]);
  });

  it('PASSES an EDGE bore deeper than the panel thickness (BOLT_ENTRY Ø7.5 D24 into an 18mm side edge)', () => {
    // REWRITTEN (edge half of G11.9). The assertion below is unchanged — this
    // bore IS legal — but the REASON changed, and the old reason was wrong to
    // keep. It used to read "an edge bore is out of scope by design", i.e. the
    // test pinned the gap: ANY edge depth passed, 24mm or 2400mm alike.
    //
    // The bore is legal because of geometry, not scope: the limiting dimension
    // of an edge bore is the owner panel's in-plane span ALONG THE BORE'S OWN
    // AXIS. Here the normal is ±Z and the LEFT_SIDE panel spans finishWidth =
    // 600mm in Z (panelBasis.ts:138-144 → boxD = finishWidth for side panels),
    // so 24mm of travel stays inside the part by a wide margin.
    const legal = ruleG11_PanelBreakthrough(
      [point({ id: 'entry-0', purpose: 'BOLT_ENTRY', diameter: 7.5, depth: 24, normal: [0, 0, 1], panelId: 'panel-left', connectedPanelRole: 'LEFT_SIDE' })],
      [g11Panel({ id: 'panel-left', role: 'LEFT_SIDE', computed: { realThickness: 18 } })],
    );
    expect(legal).toEqual([]);

    // ...and the proof that it passed for the RIGHT reason: the SAME bore, on
    // the SAME panel, driven the full 600mm Z span is adjudicated and blocked.
    // Under the old scope decision this also returned [].
    const overrun = ruleG11_PanelBreakthrough(
      [point({ id: 'entry-0', purpose: 'BOLT_ENTRY', diameter: 7.5, depth: 600, normal: [0, 0, 1], panelId: 'panel-left', connectedPanelRole: 'LEFT_SIDE' })],
      [g11Panel({ id: 'panel-left', role: 'LEFT_SIDE', computed: { realThickness: 18 } })],
    );
    expect(overrun.map((i) => i.code)).toEqual(['B_G11_PANEL_BREAKTHROUGH']);
    expect(overrun[0].context?.measured).toBe(600);
    expect(overrun[0].context?.expected).toBe(600);
    expect(overrun[0].context?.boreType).toBe('EDGE_BORE');
    expect(overrun[0].context?.axis).toBe('Z');
    expect(overrun[0].message).toMatch(/NOT reduced/);
  });

  it('PASSES an 18mm DOWEL edge bore into the top edge of a 720mm side panel', () => {
    // Y-axis edge bore, 18mm of travel down a 720mm-tall panel. The false-
    // blocker guard at the unit level: the edge rule must not confuse the
    // panel's THICKNESS with its span along the bore axis.
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'dowel-edge-0', purpose: 'DOWEL', diameter: 8, depth: 18, normal: [0, -1, 0], panelId: 'panel-left', connectedPanelRole: 'LEFT_SIDE' })],
      [g11Panel({ id: 'panel-left', role: 'LEFT_SIDE', computed: { realThickness: 18 } })],
    );

    expect(issues).toEqual([]);
  });

  it('PASSES a 13.5mm CAM housing in an 18mm panel', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'cam-0', purpose: 'CAM_LOCK', diameter: 15, depth: 13.5, normal: [-1, 0, 0], panelId: 'panel-left', connectedPanelRole: 'LEFT_SIDE' })],
      [g11Panel({ id: 'panel-left', role: 'LEFT_SIDE', computed: { realThickness: 18 } })],
    );

    expect(issues).toEqual([]);
  });
});

// ============================================
// FAIL-VISIBLE — un-adjudicable input is never silently passed
// ============================================

describe('G11.9 panel breakthrough: un-adjudicable input is surfaced, never silently passed', () => {
  it('reports NOT_EVALUATED when the owner panel declares no thickness', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'bolt-back-0', purpose: 'BOLT', depth: 17.5, connectedPanelRole: 'BACK' })],
      [], // no panel metadata at all
    );

    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe('I_G11_BREAKTHROUGH_NOT_EVALUATED');
    expect(issues[0].severity).toBe('INFO');
    expect(issues[0].context?.reason).toBe('OWNER_THICKNESS_UNDECLARED');
  });

  it('reports NOT_EVALUATED when the owner panel role cannot be resolved', () => {
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'orphan-0', purpose: 'OTHER', depth: 17.5, connectedPanelRole: undefined, cornerType: undefined, face: undefined })],
      [g11Panel({ id: 'panel-back', role: '', computed: { realThickness: 6 } })],
    );

    expect(issues.map((i) => i.code)).toEqual(['I_G11_BREAKTHROUGH_NOT_EVALUATED']);
    expect(issues[0].context?.reason).toBe('OWNER_ROLE_UNKNOWN');
  });

  it('NOT_EVALUATED does not fail the gate (INFO), but is counted', () => {
    const result = runG11Rules(
      [point({ id: 'bolt-back-0', purpose: 'BOLT', depth: 17.5, connectedPanelRole: 'BACK' })],
      [],
    );

    expect(result.summary.info).toBeGreaterThanOrEqual(1);
    expect(result.issues.some((i) => i.code === 'I_G11_BREAKTHROUGH_NOT_EVALUATED')).toBe(true);
  });
});

// ============================================
// G11.9b — a REFUSED joint must not read as a clean pass
// ============================================

const T = 18, W = 600, H = 720, D = 560;

function cabPanel(o: {
  id: string; role: CabinetPanel['role']; w: number; h: number;
  position: [number, number, number]; thickness?: number;
}): CabinetPanel {
  const t = o.thickness ?? T;
  return {
    id: o.id, role: o.role, name: o.id, finishWidth: o.w, finishHeight: o.h, coreMaterialId: 'c',
    faces: { faceA: null, faceB: null }, edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: { realThickness: t, cutWidth: o.w, cutHeight: o.h, surfaceArea: 0, edgeLength: 0, cost: 0, co2: 0 },
    position: o.position, rotation: [0, 0, 0], visible: true, selected: false,
  } as CabinetPanel;
}

function overlayBackCabinet(backThickness: number): Cabinet {
  const hw = W - 2 * T;
  const sx = W / 2 - T / 2;
  const sideW = D - backThickness;
  const carcassZ = D / 2 + backThickness / 2;
  return {
    id: `cab-ovl-${backThickness}`, name: 'cab', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'overlay', backPanelInset: 6, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      cabPanel({ id: 't', role: 'TOP', w: hw, h: sideW, position: [0, H - T / 2, carcassZ] }),
      cabPanel({ id: 'b', role: 'BOTTOM', w: hw, h: sideW, position: [0, T / 2, carcassZ] }),
      cabPanel({ id: 'l', role: 'LEFT_SIDE', w: sideW, h: H, position: [-sx, H / 2, carcassZ] }),
      cabPanel({ id: 'r', role: 'RIGHT_SIDE', w: sideW, h: H, position: [sx, H / 2, carcassZ] }),
      cabPanel({
        id: 'back', role: 'BACK', w: W, h: H,
        position: [0, H / 2, backThickness / 2], thickness: backThickness,
      }),
    ],
  } as unknown as Cabinet;
}

function generateSilently(cabinet: Cabinet) {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dm = generateMinifixDrillMap(cabinet);
  err.mockRestore();
  warn.mockRestore();
  return dm;
}

describe('G11.9b: a joint the generator refused must not read as a clean pass', () => {
  it('END-TO-END — 6mm overlay back: zero back points AND a non-waivable BLOCKER', () => {
    const drillMap = generateSilently(overlayBackCabinet(6));

    // Layer 1 withheld every operation on the 6mm back panel...
    expect(drillMap.panels.find((p) => p.panelId === 'back')).toBeUndefined();

    // ...and Layer 2 refuses to call that a pass.
    const result = validateG11FromDrillMap(drillMap);
    const refusalBlockers = result.issues.filter(
      (i) => i.code === 'B_G11_MANUFACTURABILITY_REFUSAL',
    );

    expect(result.status).toBe('FAIL');
    expect(refusalBlockers.length).toBeGreaterThan(0);
    expect(refusalBlockers.every((i) => i.severity === 'BLOCKER')).toBe(true);
    expect(refusalBlockers.every((i) => i.context?.waivable === false)).toBe(true);
    expect(refusalBlockers.some((i) => i.context?.reason === 'R_BLIND_BORE_EXCEEDS_MEMBER_THICKNESS')).toBe(true);
    expect(refusalBlockers.some((i) => i.panelIds?.includes('back'))).toBe(true);
    // The message states the physical reason, and no reduced depth is offered.
    expect(refusalBlockers[0].message).toMatch(/only 6mm thick/);
    expect(refusalBlockers[0].message).toMatch(/Depth was NOT reduced/);
  });

  it('END-TO-END — 18mm overlay back: back points generated, no refusal blocker', () => {
    const drillMap = generateSilently(overlayBackCabinet(18));

    const back = drillMap.panels.find((p) => p.panelId === 'back');
    expect(back?.points.length ?? 0).toBeGreaterThan(0);

    const result = validateG11FromDrillMap(drillMap);
    expect(result.issues.filter((i) => i.code === 'B_G11_MANUFACTURABILITY_REFUSAL')).toEqual([]);
    expect(result.issues.filter((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH')).toEqual([]);
  });

  it('refusalsToG11Issues returns nothing for a map with no refusals', () => {
    expect(refusalsToG11Issues(null)).toEqual([]);
    expect(refusalsToG11Issues(drillMapWith([]))).toEqual([]);
  });
});

// ============================================
// G11.9 EDGE HALF — the reachable path, and the false-blocker guard
// ============================================
//
// WHY A PATCHED MAP AND NOT A HAND-BUILT POINT ARRAY
// The generator adjudicates every bore it emits (generateDrillMap.ts
// `evaluateBlindBoreFeasibility` + the universal sweep), so a generated map is
// clean by construction. The gap is downstream: src/gate/ui/applyGatePatch.ts
// `applyGatePatches` rewrites the drill map JSON by path and calls
// setDrillMap() with NOTHING but a path-prefix check — no geometric
// re-adjudication. After that mutation, G11 is the only remaining check, and
// until this slice the EDGE half of G11.9 was a `continue`.
//
// SCOPE OF THE CLAIM — this is NOT a live user-facing exploit today.
// An earlier draft of this comment said these tests reproduce "the exact
// mutation an Apply-fix button performs". That was wrong and the review
// disproved it by running it. No UI button can currently drive this: G11 issues
// become findings via `g11ToFinding` (SafetyPanel.tsx ~:180), which sets no
// `patch` at all; and every patch the UI CAN produce is a silent no-op because
// `patchPathForPoint` (connectors/drillMapIndex.ts:151-161) already returns a
// fully-prefixed path that SafetyPanel.tsx ~:237 prefixes a second time —
// navigation fails and applyGatePatches still returns true.
//
// What these tests therefore prove: any drill map that reaches G11 without
// having passed the generator's sweep is now adjudicated on BOTH axes. They
// exercise the real applyGatePatches + real store rather than a hand-built
// array so the mutation shape stays honest to what that code actually accepts.

/**
 * World axis a bore travels along (0=X, 1=Y, 2=Z).
 * Deliberately written out here instead of imported from the rule under test —
 * a guard that shares its arithmetic with the code it guards proves nothing.
 */
function boreAxis(normal: [number, number, number]): 0 | 1 | 2 {
  const a = normal.map(Math.abs);
  if (a[0] >= a[1] && a[0] >= a[2]) return 0;
  return a[1] >= a[2] ? 1 : 2;
}

/** Thickness axis per role — the box layout documented in panelBasis.ts:122-165. */
function thicknessAxis(role: string): 0 | 1 | 2 {
  if (role === 'LEFT_SIDE' || role === 'RIGHT_SIDE') return 0;
  if (role === 'TOP' || role === 'BOTTOM' || role === 'SHELF') return 1;
  return 2;
}

/** Owner panel extent along a world axis, from DrillMapPanel.dimensions alone. */
function panelExtent(panel: DrillMapPanel, axis: 0 | 1 | 2): number {
  const { width: W, height: H, thickness: T } = panel.dimensions;
  if (panel.role === 'TOP' || panel.role === 'BOTTOM' || panel.role === 'SHELF') {
    return [W, T, H][axis];
  }
  if (panel.role === 'LEFT_SIDE' || panel.role === 'RIGHT_SIDE') {
    return [T, H, W][axis];
  }
  return [W, H, T][axis];
}

/** First EDGE bore in the map (bore axis ≠ owner panel's thickness axis). */
function findEdgeBore(drillMap: DrillMap) {
  for (let pi = 0; pi < drillMap.panels.length; pi++) {
    const panel = drillMap.panels[pi];
    for (let qi = 0; qi < panel.points.length; qi++) {
      const pt = panel.points[qi];
      if (boreAxis(pt.normal) !== thicknessAxis(panel.role)) {
        return { pi, qi, panel, point: pt, axis: boreAxis(pt.normal) };
      }
    }
  }
  return null;
}

/** Flush OVERLAY carcass with an overlay back panel (geometry family of
 *  gateG11_drillType_orientation.test.ts createOverlayCabinetWithBackPanel). */
function overlayCornerCabinet(): Cabinet {
  const sideH = H - 2 * T;      // 684
  const sx = W / 2 - T / 2;     // 291
  return {
    id: 'cab-overlay-corner', name: 'cab', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: {
      topJoint: 'OVERLAY', bottomJoint: 'OVERLAY', hasBackPanel: true,
      backPanelConstruction: 'overlay', backPanelInset: 0, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      cabPanel({ id: 't', role: 'TOP', w: W, h: D, position: [0, H - T / 2, D / 2] }),
      cabPanel({ id: 'b', role: 'BOTTOM', w: W, h: D, position: [0, T / 2, D / 2] }),
      cabPanel({ id: 'l', role: 'LEFT_SIDE', w: D, h: sideH, position: [-sx, H / 2, D / 2] }),
      cabPanel({ id: 'r', role: 'RIGHT_SIDE', w: D, h: sideH, position: [sx, H / 2, D / 2] }),
      cabPanel({ id: 'back', role: 'BACK', w: W, h: H, position: [0, H / 2, -T / 2] }),
    ],
  } as unknown as Cabinet;
}

/** A-run INSET carcass, no back-panel joint family
 *  (geometry copied from drillMapGolden.ArunInset.test.ts createTestCabinet). */
function insetCornerCabinet(): Cabinet {
  const hw = W - 2 * T + 2 * 9;            // 582
  const sx = hw / 2 - 9 + T / 2;           // 291
  return {
    id: 'cab-inset-corner', name: 'cab', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'inset', backPanelInset: 6, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      cabPanel({ id: 't', role: 'TOP', w: hw, h: D, position: [0, H - T / 2, D / 2] }),
      cabPanel({ id: 'b', role: 'BOTTOM', w: hw, h: D, position: [0, T / 2, D / 2] }),
      cabPanel({ id: 'l', role: 'LEFT_SIDE', w: D, h: H, position: [-sx, H / 2, D / 2] }),
      cabPanel({ id: 'r', role: 'RIGHT_SIDE', w: D, h: H, position: [sx, H / 2, D / 2] }),
    ],
  } as unknown as Cabinet;
}

describe('G11.9 EDGE: a patched drill map reaches G11 as the only remaining check', () => {
  beforeEach(() => {
    useDrillMapStore.setState({ drillMap: null });
  });

  it('BLOCKS an edge bore whose patched depth reaches its owner panel in-plane span', () => {
    const drillMap = generateSilently(overlayBackCabinet(18));

    // Non-vacuous guard #1: the untouched, generator-adjudicated map is clean.
    expect(
      validateG11FromDrillMap(drillMap).issues.filter((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH'),
    ).toEqual([]);

    // Non-vacuous guard #2: an EDGE bore actually exists to corrupt.
    const found = findEdgeBore(drillMap);
    expect(found, 'the generator must emit at least one EDGE bore').not.toBeNull();
    const { pi, qi, panel, point: target, axis } = found!;

    const span = panelExtent(panel, axis);
    expect(span, 'the bore must be legal BEFORE the patch').toBeGreaterThan(target.depth);

    // The exact mutation an "Apply fix" button performs.
    useDrillMapStore.getState().setDrillMap(drillMap);
    const patch: GatePatch[] = [{
      op: 'replace',
      path: `/useDrillMapStore/drillMap/panels/${pi}/points/${qi}/depth`,
      value: span,
    }];
    expect(applyGatePatches(patch)).toBe(true);

    const patched = useDrillMapStore.getState().drillMap;
    expect(patched).not.toBeNull();
    expect(patched!.panels[pi].points[qi].depth).toBe(span);

    const result = validateG11FromDrillMap(patched);
    const blockers = result.issues.filter((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH');

    expect(blockers.map((i) => i.drillPointIds?.[0])).toContain(target.id);
    const mine = blockers.find((i) => i.drillPointIds?.[0] === target.id)!;
    expect(mine.severity).toBe('BLOCKER');
    expect(mine.context?.measured).toBe(span);
    expect(mine.context?.expected).toBe(span);
    expect(mine.context?.boreType).toBe('EDGE_BORE');
    expect(mine.context?.axis).toBe(['X', 'Y', 'Z'][axis]);
    expect(mine.context?.waivable).toBe(false);
    expect(mine.panelIds).toEqual([panel.panelId]);
    expect(mine.message).toMatch(/NOT reduced/);
    expect(result.status).toBe('FAIL');
  });

  it('does NOT block when the patched depth stays inside the span (boundary − 1mm)', () => {
    const drillMap = generateSilently(overlayBackCabinet(18));
    const found = findEdgeBore(drillMap);
    expect(found).not.toBeNull();
    const { pi, qi, panel, axis } = found!;
    const span = panelExtent(panel, axis);

    useDrillMapStore.getState().setDrillMap(drillMap);
    expect(applyGatePatches([{
      op: 'replace',
      path: `/useDrillMapStore/drillMap/panels/${pi}/points/${qi}/depth`,
      value: span - 1,
    }])).toBe(true);

    const result = validateG11FromDrillMap(useDrillMapStore.getState().drillMap);
    expect(result.issues.filter((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH')).toEqual([]);
  });
});

// ============================================
// FALSE-BLOCKER GUARD
// ============================================
//
// This repo has shipped G11 rules twice that false-blocked whole construction
// families (18 blockers, then 22). The edge half of G11.9 sees EVERY BOLT_ENTRY
// and every edge dowel in the catalogue, so it is exactly the shape of rule
// that does that. Every generated cabinet family must come out with zero
// breakthrough blockers AND zero NOT_EVALUATED — the second half matters: a
// rule that silently declines to adjudicate would also "pass" this guard.

const CONSTRUCTION_FAMILIES: Array<[string, () => Cabinet]> = [
  ['OVERLAY corners + overlay back', overlayCornerCabinet],
  ['INSET corners (A-run)', insetCornerCabinet],
  ['INSET corners + 18mm overlay back', () => overlayBackCabinet(18)],
];

describe('G11.9 EDGE: must not false-block any generated construction family', () => {
  for (const [name, build] of CONSTRUCTION_FAMILIES) {
    it(`${name}: zero G11 blockers, zero un-adjudicated bores`, () => {
      const drillMap = generateSilently(build());

      // Non-vacuous: this family really does emit edge bores.
      const edgeBores = drillMap.panels.flatMap((panel) =>
        panel.points.filter((pt) => boreAxis(pt.normal) !== thicknessAxis(panel.role)),
      );
      expect(edgeBores.length, `${name} must emit EDGE bores`).toBeGreaterThan(0);

      const result = validateG11FromDrillMap(drillMap);

      expect(
        result.issues.filter((i) => i.severity === 'BLOCKER').map((i) => i.code),
        `${name} must produce no G11 blockers`,
      ).toEqual([]);
      expect(
        result.issues.filter((i) => i.code === 'I_G11_BREAKTHROUGH_NOT_EVALUATED').map((i) => i.context?.reason),
        `${name}: every emitted bore must be adjudicated, not skipped`,
      ).toEqual([]);
    });
  }

  it('the legal Häfele edge geometries pass on a normal cabinet', () => {
    const drillMap = generateSilently(overlayCornerCabinet());
    const all = drillMap.panels.flatMap((p) => p.points);

    // BOLT_ENTRY Ø7.5 D24 edge bores and Ø8 D18 edge dowels are the two edge
    // families the catalogue emits — both must survive.
    expect(all.some((p) => p.purpose === 'BOLT_ENTRY')).toBe(true);
    expect(all.some((p) => p.purpose === 'DOWEL')).toBe(true);

    const result = validateG11FromDrillMap(drillMap);
    expect(result.issues.filter((i) => i.code === 'B_G11_PANEL_BREAKTHROUGH')).toEqual([]);
  });
});
