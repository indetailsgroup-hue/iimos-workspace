/**
 * panelLocalProjection.test.ts — WORLD → PANEL-LOCAL cut-drawing projection (T2, fix/dxf-truth-chain)
 *
 * Drives the projection module with a REAL drill map (generateMinifixDrillMap, no mocks)
 * on the flush INSET store-geometry fixture — same fixture family as
 * src/core/manufacturing/drillMap/__tests__/cornerEngineFlip.test.ts:
 * 600×720×560, T=18, horizontal panels W−2T=564 wide, panel z centered at D/2.
 *
 * Hand-derived ground truth (from generateDrillMap.ts INSET branch + panelBasis.ts,
 * parity with connector-os engine proven by cornerEngineFlip.test.ts):
 *
 *   Corner run along depth D=560 (>400) → 3 stations on the System-32 grid
 *   (connector-os engine is the default authority; placer.ts getSpreadGridPositions,
 *   ADR-061: grid = 37 + k·32 for k=0..15 within endOffset 40 → last 517; spread 3
 *   picks indices {0, 8, 15}) → sys32Z ∈ {37, 293, 517}. Verified empirically against
 *   generateMinifixDrillMap output on this fixture.
 *
 *   SIDE panels (LEFT_SIDE basis: origin [maxX, minY, maxZ], x=front→back(−Z),
 *   y=bottom→top(+Y), faceW=560, faceH=720 — panelBasis.ts:265-284):
 *     BOLT   Ø10 D17.5  local x ∈ {37,293,517}, y = jointAxisY (thickness center of
 *                        horizontal panel: TOP → (702+720)/2 = 711, BOTTOM → 9)
 *     THREAD Ø5  D11    same positions as BOLT
 *     DOWEL  Ø8  D12    z = (560−sys32Z) ∓ 32 filtered to [37,523]
 *                        → local x ∈ {69} ∪ {261,325} ∪ {485} (549 dropped by margin)
 *
 *   TOP panel (basis: origin [minX, minY, maxZ], x=left→right(+X), y=front→back(−Z),
 *   u=+Y, faceW=564, faceH=560 — panelBasis.ts:200-220). TOP drawing is MIRRORED
 *   in-file (machining face = bottom face, viewed from the drill side; G1 convention,
 *   precedent DXFGenerator.ts:423-427):
 *     CAM        Ø15  D13.5  basisX = 24 / 540 → drawX = 540 / 24, y ∈ {37,293,517}
 *     BOLT_ENTRY Ø7.5 D24    edge bores at basisX 0/564, zOffset = 711−702 = 9
 *     DOWEL      Ø8   D18    edge bores, y ∈ {69,261,325,485}, zOffset 9
 *     B-run DOWEL Ø8  D12    FACE bores at basisX ∈ {37,527}, basisY = 24
 *                            (worldZ = 560−24, generateDrillMap.ts:1194-1233)
 *
 *   B-run SIDE edge bores ([worldX, 720|0, 536], generateDrillMap.ts:1235-1249) sit
 *   37mm/527mm OFF the side panel body in flush INSET (side spans x∈[−300,−282]) →
 *   module must fail-closed report them, never draw them.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Cabinet, CabinetPanel } from '../../types/Cabinet';
import { generateMinifixDrillMap } from '../../manufacturing/drillMap/generateDrillMap';
import {
  projectDrillPointsToPanelLocal,
  type ProjectionPointInput,
  type ProjectionResult,
  type ProjectedBore,
} from '../panelLocalProjection';

// ── Fixture (mirrors cornerEngineFlip.test.ts flush INSET) ─────────────────────
const T = 18, W = 600, H = 720, D = 560;

function panel(o: { id: string; role: CabinetPanel['role']; w: number; h: number; position: [number, number, number] }): CabinetPanel {
  return {
    id: o.id, role: o.role, name: o.id, finishWidth: o.w, finishHeight: o.h, coreMaterialId: 'c',
    faces: { faceA: null, faceB: null }, edges: { top: null, bottom: null, left: null, right: null }, grainDirection: 'HORIZONTAL',
    computed: { realThickness: T, cutWidth: o.w, cutHeight: o.h, surfaceArea: 0, edgeLength: 0, cost: 0, co2: 0 },
    position: o.position, rotation: [0, 0, 0], visible: true, selected: false,
  } as CabinetPanel;
}

function flushCab(): Cabinet {
  const hw = W - 2 * T, sx = W / 2 - T / 2; // hw=564, sx=291
  return {
    id: 'x', name: 'x', type: 'BASE', dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: { topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: false, backPanelConstruction: 'inset', backPanelInset: 6, shelfCount: 0, dividerCount: 0 },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      panel({ id: 't', role: 'TOP', w: hw, h: D, position: [0, H - T / 2, D / 2] }),
      panel({ id: 'b', role: 'BOTTOM', w: hw, h: D, position: [0, T / 2, D / 2] }),
      panel({ id: 'l', role: 'LEFT_SIDE', w: D, h: H, position: [-sx, H / 2, D / 2] }),
      panel({ id: 'r', role: 'RIGHT_SIDE', w: D, h: H, position: [sx, H / 2, D / 2] }),
    ],
  } as unknown as Cabinet;
}

// ── Synthetic probes ────────────────────────────────────────────────────────────
// (a) Matching asymmetric FACE feature 100mm behind the FRONT edge on both side
//     panels (world z = 560−100 = 460). The generator's corner pattern is
//     depth-symmetric ({37,280,523} mirrors onto itself), so this pair is what
//     proves the RIGHT_SIDE mirror actually flips:
//       LEFT drawing (front edge at drawing x=0):    drawX = 560−460 = 100
//       RIGHT drawing (front edge at drawing x=560): drawX = 560−100 = 460
// (b) TOP mirror probes: FACE bore 50mm from the panel's world-left edge
//     (basisX = −232−(−282) = 50 → drawX = 564−50 = 514) and an EDGE bore entering
//     the world-LEFT edge (mirrored drawing → edge 'RIGHT' at drawX = 564).
// (c) Fail-closed probes: unknown panel, zero-length normal, oblique normal.
const SYN_POINTS: ProjectionPointInput[] = [
  { id: 'syn-left-asym', panelId: 'l', position: [-282, 350, 460], normal: [-1, 0, 0], diameter: 5, depth: 13 },
  { id: 'syn-right-asym', panelId: 'r', position: [282, 350, 460], normal: [1, 0, 0], diameter: 5, depth: 13 },
  { id: 'syn-top-face', panelId: 't', position: [-232, 702, 460], normal: [0, 1, 0], diameter: 6, depth: 5 },
  { id: 'syn-top-edge', panelId: 't', position: [-282, 711, 460], normal: [1, 0, 0], diameter: 6, depth: 20 },
  { id: 'syn-unknown-panel', panelId: 'ghost', position: [0, 0, 0], normal: [0, 1, 0], diameter: 5, depth: 10 },
  { id: 'syn-zero-normal', panelId: 'l', position: [-282, 100, 100], normal: [0, 0, 0], diameter: 5, depth: 10 },
  { id: 'syn-oblique', panelId: 'l', position: [-282, 100, 100], normal: [0.70710678, 0.70710678, 0], diameter: 5, depth: 10 },
];
const BAD_SYN_IDS = ['syn-unknown-panel', 'syn-zero-normal', 'syn-oblique'];

// ── One shared projection built from the REAL generator output ─────────────────
let cache: { result: ProjectionResult; totalInputPoints: number } | null = null;
function build(): { result: ProjectionResult; totalInputPoints: number } {
  if (cache) return cache;
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dm = generateMinifixDrillMap(flushCab());
  err.mockRestore();
  warn.mockRestore();

  const cab = flushCab();
  const panels = cab.panels.map(p => ({
    panelId: p.id,
    role: p.role,
    thickness: T,
    position: p.position,
    finishWidth: p.finishWidth,
    finishHeight: p.finishHeight,
  }));
  const realPoints: ProjectionPointInput[] = dm.panels.flatMap(dp =>
    dp.points.map(pt => ({
      id: pt.id,
      panelId: pt.panelId,
      position: pt.position,
      normal: pt.normal,
      diameter: pt.diameter,
      depth: pt.depth,
      purpose: pt.purpose,
    })),
  );
  const points = [...realPoints, ...SYN_POINTS];
  cache = { result: projectDrillPointsToPanelLocal({ panels, points }), totalInputPoints: points.length };
  return cache;
}

const byId = (id: string) => {
  const p = build().result.panels.find(pp => pp.panelId === id);
  expect(p, `panel projection '${id}' missing`).toBeDefined();
  return p!;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const num = (a: number, b: number) => a - b;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const ladder = (bores: ProjectedBore[]) => uniq(bores.map(b => r2(b.x))).sort(num);
const boreKey = (b: ProjectedBore, mirrorW?: number) =>
  [r2(mirrorW !== undefined ? mirrorW - b.x : b.x), r2(b.y), b.diameter, b.depth, b.boreType].join('|');

describe('panelLocalProjection — flush INSET real drill map', () => {
  it('A1: role→drawing frames match the legacy cut-drawing convention and every FACE bore lands inside its drawing', () => {
    // Legacy per-role drawing dims (cabinetToDxf.ts: sides drawn cutWidth×cutHeight =
    // depth×height, TOP/BOTTOM = width×depth; DXFGenerator.ts:296 outline w×h).
    const dims: Record<string, [number, number]> = {
      l: [D, H], r: [D, H],           // 560×720
      t: [W - 2 * T, D], b: [W - 2 * T, D], // 564×560
    };
    for (const [id, [dw, dh]] of Object.entries(dims)) {
      const p = byId(id);
      expect(p.drawWidth, `${id} drawWidth`).toBeCloseTo(dw, 6);
      expect(p.drawHeight, `${id} drawHeight`).toBeCloseTo(dh, 6);
      const faces = p.bores.filter(b => b.boreType === 'FACE');
      expect(faces.length, `${id} should have FACE bores`).toBeGreaterThan(0);
      for (const b of faces) {
        const tag = `${id} FACE ${b.sourceId} @(${b.x},${b.y})`;
        expect(b.x, tag).toBeGreaterThanOrEqual(-1e-6);
        expect(b.x, tag).toBeLessThanOrEqual(dw + 1e-6);
        expect(b.y, tag).toBeGreaterThanOrEqual(-1e-6);
        expect(b.y, tag).toBeLessThanOrEqual(dh + 1e-6);
        expect(Number.isFinite(b.x) && Number.isFinite(b.y), tag).toBe(true);
      }
    }
  });

  it('A2: LEFT_SIDE rows share one x-ladder at System-32 stations; RIGHT_SIDE equals LEFT_SIDE under x-mirror but NOT under identity', () => {
    const left = byId('l');
    const right = byId('r');

    // Real corner bores form two rows at the joint axes y = 711 (top) and y = 9 (bottom)
    const leftReal = left.bores.filter(b => b.boreType === 'FACE' && b.sourceId !== 'syn-left-asym');
    const topRow = leftReal.filter(b => near(b.y, 711));
    const botRow = leftReal.filter(b => near(b.y, 9));
    expect(topRow.length).toBeGreaterThan(0);
    expect(botRow.length).toBeGreaterThan(0);
    expect(topRow.length + botRow.length, 'all real LEFT_SIDE face bores sit on the two joint rows').toBe(leftReal.length);
    expect(ladder(topRow), 'identical ladder on both rows').toEqual(ladder(botRow));

    // Bolt columns at the System-32 grid stations: 37, 37+8·32=293, 37+15·32=517
    const boltXs = ladder(leftReal.filter(b => b.diameter === 10));
    expect(boltXs).toEqual([37, 293, 517]);

    // Mirror law: RIGHT bores == mirror_x(LEFT bores) as multisets (incl. synthetic pair)
    const mirroredLeft = left.bores.map(b => boreKey(b, left.drawWidth)).sort();
    const identityLeft = left.bores.map(b => boreKey(b)).sort();
    const rightKeys = right.bores.map(b => boreKey(b)).sort();
    expect(rightKeys, 'RIGHT_SIDE must equal LEFT_SIDE mirrored across the vertical centerline').toEqual(mirroredLeft);
    expect(rightKeys, 'RIGHT_SIDE must NOT equal LEFT_SIDE under identity (asymmetric probe must flip)').not.toEqual(identityLeft);

    // Explicit asymmetric probe positions (front-referenced feature 100mm behind front edge)
    const synL = left.bores.find(b => b.sourceId === 'syn-left-asym');
    const synR = right.bores.find(b => b.sourceId === 'syn-right-asym');
    expect(synL).toBeDefined();
    expect(synR).toBeDefined();
    expect(synL!.x).toBeCloseTo(100, 6); // front edge at drawing x=0 on LEFT
    expect(synL!.y).toBeCloseTo(350, 6);
    expect(synR!.x).toBeCloseTo(460, 6); // front edge at drawing x=drawW on RIGHT (mirrored in-file)
    expect(synR!.y).toBeCloseTo(350, 6);
  });

  it('A3: corner dowel FACE bores on sides carry depth 12 and match the hand-computed world Z/Y mapping', () => {
    const left = byId('l');
    const dowels = left.bores.filter(b => b.boreType === 'FACE' && b.diameter === 8);
    expect(dowels.length).toBeGreaterThan(0);
    for (const d of dowels) {
      expect(d.depth, `side dowel ${d.sourceId}`).toBe(12); // CORNER_DOWEL_SPEC.sideFaceDepth
      expect(d.layerHint, `side dowel ${d.sourceId}`).toBe('DRILL_V_8_D12');
    }
    // Spot check one TOP_LEFT dowel, hand-computed from fixture geometry:
    //   station sys32Z=37 → bolt world z = maxZ − 37 = 560 − 37 = 523
    //   dowel z = bolt z − 32 = 491 (the +32 mate at 555 is dropped by the 37mm edge margin,
    //   generateDrillMap.ts:1038-1042)
    //   world y = jointAxisY = (702+720)/2 = 711 (TOP panel thickness center)
    //   LEFT_SIDE drawing x = distance from FRONT edge = maxZ − z = 560 − 491 = 69
    //   LEFT_SIDE drawing y = world y = 711
    const spot = dowels.find(b => near(b.y, 711) && near(b.x, 69));
    expect(spot, 'TOP_LEFT dowel expected at drawing (69, 711)').toBeDefined();
    // Full dowel ladder from the three stations:
    //   station 37 → 69 ; station 293 → 261, 325 ; station 517 → 485 (549 dropped)
    expect(ladder(dowels)).toEqual([69, 261, 325, 485]);
  });

  it('A4: TOP panel — FACE bores (incl. Ø8×12 B-run dowels) inside the drawing; EDGE bores tagged with drawing-frame edge + zOffset', () => {
    const top = byId('t');
    const faces = top.bores.filter(b => b.boreType === 'FACE' && b.sourceId !== 'syn-top-face');

    // B-run dowel FACE bores: Ø8 depth 12 drilled up into the machining (bottom) face
    const brun = faces.filter(b => b.diameter === 8 && b.depth === 12);
    expect(brun.length).toBeGreaterThan(0);
    for (const b of brun) {
      expect(r2(b.y), `B-run ${b.sourceId} y = drillingDistanceB`).toBe(24);
      expect([37, 527], `B-run ${b.sourceId} x`).toContain(r2(b.x));
      expect(b.layerHint).toBe('DRILL_V_8_D12');
    }

    // CAM face bores Ø15×13.5: Distance B = 24 from each mate edge, stations {37,293,517}
    const cams = faces.filter(b => b.diameter === 15);
    expect(cams.length).toBe(6);
    expect(uniq(cams.map(b => r2(b.x))).sort(num)).toEqual([24, 540]);
    expect(uniq(cams.map(b => r2(b.y))).sort(num)).toEqual([37, 293, 517]);
    for (const c of cams) expect(c.layerHint).toBe('DRILL_V_15_D13.5');

    // EDGE bores: BOLT_ENTRY Ø7.5×24 and corner dowels Ø8×18 through left/right edges,
    // mid-thickness → zOffset = 9, legacy DRILL_H layer naming (Production.ts:237-239)
    const edges = top.bores.filter(b => b.boreType === 'EDGE' && b.sourceId !== 'syn-top-edge');
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      const tag = `TOP edge bore ${e.sourceId}`;
      expect([7.5, 8], tag).toContain(e.diameter);
      expect(e.axis, tag).toBe('X');
      expect(e.zOffset, tag).toBeCloseTo(9, 6);
      expect(['LEFT', 'RIGHT'], tag).toContain(e.edge!);
      expect(e.x, `${tag} boundary x`).toBeCloseTo(e.edge === 'LEFT' ? 0 : top.drawWidth, 6);
      expect(e.y, tag).toBeGreaterThan(0);
      expect(e.y, tag).toBeLessThan(top.drawHeight);
      expect(e.layerHint, tag).toBe(e.diameter === 8 ? 'DRILL_H_8_Z9_D18' : 'DRILL_H_7.5_Z9_D24');
    }

    // Mirror-sensitive probes: TOP is drawn from its machining (bottom) face → in-file x-mirror.
    const synFace = top.bores.find(b => b.sourceId === 'syn-top-face');
    expect(synFace).toBeDefined();
    expect(synFace!.boreType).toBe('FACE');
    expect(synFace!.x).toBeCloseTo(514, 6); // basisX 50 → 564−50
    expect(synFace!.y).toBeCloseTo(100, 6); // 560−460
    const synEdge = top.bores.find(b => b.sourceId === 'syn-top-edge');
    expect(synEdge).toBeDefined();
    expect(synEdge!.boreType).toBe('EDGE');
    expect(synEdge!.edge, 'world-LEFT edge lands on drawing RIGHT under the TOP mirror').toBe('RIGHT');
    expect(synEdge!.x).toBeCloseTo(564, 6);
    expect(synEdge!.y).toBeCloseTo(100, 6);
    expect(synEdge!.zOffset).toBeCloseTo(9, 6);
  });

  it('A5: fail-closed — unknown panel, zero normal, oblique normal, and off-panel B-run side bores are reported, never silently drawn', () => {
    const { result, totalInputPoints } = build();

    const reason = (id: string) => result.skipped.find(s => s.pointId === id)?.reason;
    expect(reason('syn-unknown-panel')).toBe('UNKNOWN_PANEL');
    expect(reason('syn-zero-normal')).toBe('ZERO_NORMAL');
    expect(reason('syn-oblique')).toBe('OBLIQUE_NORMAL');

    // Generator emits B-run SIDE edge bores whose entry is 37mm/527mm off the side
    // panel body in flush INSET (4 corners × 2 stations) — fail-closed, all reported.
    const offPanel = result.skipped.filter(s => s.reason === 'EDGE_ENTRY_OFF_PANEL');
    expect(offPanel.length).toBe(8);
    for (const s of offPanel) expect(['l', 'r']).toContain(s.panelId);

    // Conservation: every input point is either projected or reported — no silent drops.
    const totalBores = result.panels.reduce((n, p) => n + p.bores.length, 0);
    expect(totalBores + result.skipped.length).toBe(totalInputPoints);

    // Skipped probes never appear as bores
    for (const p of result.panels) {
      for (const b of p.bores) {
        expect(BAD_SYN_IDS, `skipped point ${b.sourceId} leaked into ${p.panelId}`).not.toContain(b.sourceId ?? '');
      }
    }
  });
});
