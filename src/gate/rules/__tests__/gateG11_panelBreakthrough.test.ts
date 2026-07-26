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

import { describe, it, expect, vi } from 'vitest';
import {
  refusalsToG11Issues,
  ruleG11_PanelBreakthrough,
  runG11Rules,
  validateG11FromDrillMap,
} from '../gateG11_minifixSystem32';
import type { G11DrillPoint, G11Panel } from '../gateG11_types';
import type { DrillMap, DrillMapPoint } from '../../../core/manufacturing/drillMap/types';
import { generateMinifixDrillMap } from '../../../core/manufacturing/drillMap/generateDrillMap';
import type { Cabinet, CabinetPanel } from '../../../core/types/Cabinet';

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
    // The limiting dimension of an edge bore is the panel's in-plane span,
    // NOT its thickness — out of scope by design (see rule doc).
    const issues = ruleG11_PanelBreakthrough(
      [point({ id: 'entry-0', purpose: 'BOLT_ENTRY', diameter: 7.5, depth: 24, normal: [0, 0, 1], panelId: 'panel-left', connectedPanelRole: 'LEFT_SIDE' })],
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
