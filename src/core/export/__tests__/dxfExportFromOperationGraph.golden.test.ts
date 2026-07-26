/**
 * dxfExportFromOperationGraph.golden.test.ts — T3 golden (fix/dxf-truth-chain)
 *
 * THE CORE RED → GREEN for the centerpiece wiring: the OperationGraph DXF
 * exporter must produce MANUFACTURABLE per-panel drawings by projecting the
 * packet's drill map through panelLocalProjection (T2 module), instead of
 * drawing circles at raw world op.position.x/y (S0-verified defect: TOP's
 * holes land outside its own outline, no mirroring, Z dropped).
 *
 * Fixture: REAL store-shaped flush INSET cabinet 600×720×560 (same family as
 * cornerEngineFlip.test.ts flush case / panelLocalProjection.test.ts), with
 * the DEFAULT-STRUCTURE panel set the app builds (useCabinetStore
 * DEFAULT_STRUCTURE: hasBackPanel=true inset, shelfCount=1):
 *   LEFT_SIDE/RIGHT_SIDE 560×720, TOP/BOTTOM 564×560 (T=18),
 *   BACK 578×698 (T=6, inset groove), SHELF 564×510.
 * The default drill map generator emits points ONLY for the 4 carcass panels
 * (no shelfConnectors config → no shelf points; inset back → no back points;
 * generateDrillMap.ts:2246-2247 skips point-less panels), so the packet-path
 * export produces sheets for exactly {LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM}.
 *
 * Owner rulings baked in:
 *   Q3=A dims stamp = "panel cut size (finish - edge band, no premill)"
 *   Q5=A machining-face view: RIGHT_SIDE and TOP mirrored IN-FILE
 *   Q6=A B-run retired → default cabinet projects with ZERO skips
 *
 * Hand-derived ground truth (proven by panelLocalProjection.test.ts against
 * the REAL generator): System-32 stations {37, 293, 517} from the front edge;
 * LEFT_SIDE rows y∈{9,711}; A-run corner dowels Ø8 D12 ladder {69,261,325,485};
 * RIGHT_SIDE = LEFT mirrored across the vertical centerline → bolt ladder
 * {43,267,523} (asymmetric probe: ≠ {37,293,517} under identity);
 * TOP: CAM Ø15 D13.5 x∈{24,540} y∈{37,293,517}, BOLT_ENTRY Ø7.5 edge bores
 * DRILL_H_7.5_Z9_D24 at x∈{0,564}, dowel edge bores DRILL_H_8_Z9_D18.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Cabinet, CabinetPanel } from '../../types/Cabinet';
import { generateMinifixDrillMap } from '../../manufacturing/drillMap/generateDrillMap';
import { buildFactoryPacket } from '../../../factory/packet/buildFactoryPacket';
import {
  exportDxfFromPacket,
  type DxfExportResult,
} from '../dxfExportFromOperationGraph';

// ══════════════════════════════════════════════════════════════════════════
// Fixture builders (store-shaped, cornerEngineFlip flush INSET frame:
// world z ∈ [0,560] with front = maxZ = 560, y ∈ [0,720])
// ══════════════════════════════════════════════════════════════════════════
const T = 18, W = 600, H = 720, D = 560;

function panel(o: {
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

/** Default-structure flush INSET cabinet: 4 carcass panels + inset BACK (6mm) + SHELF. */
function defaultCab(): Cabinet {
  const hw = W - 2 * T, sx = W / 2 - T / 2; // hw=564, sx=291 (useCabinetStore:1716)
  return {
    id: 'cab-golden', name: 'cab-golden', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    // Mirrors DEFAULT_STRUCTURE (Cabinet.ts:695): inset back, 1 shelf,
    // NO shelfConnectors config (store default — user has not enabled any).
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'inset', backPanelInset: 6, shelfCount: 1, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      panel({ id: 't', role: 'TOP', w: hw, h: D, position: [0, H - T / 2, D / 2] }),
      panel({ id: 'b', role: 'BOTTOM', w: hw, h: D, position: [0, T / 2, D / 2] }),
      panel({ id: 'l', role: 'LEFT_SIDE', w: D, h: H, position: [-sx, H / 2, D / 2] }),
      panel({ id: 'r', role: 'RIGHT_SIDE', w: D, h: H, position: [sx, H / 2, D / 2] }),
      // Store inset back: backW=(W−2T)+2·groove−clearance=578, backH=(H−2T)+2·groove−clearance=698,
      // z center = backVoid + backTotalT/2 = 20 + 3 = 23 in this frame; REAL thickness 6mm (not 18!)
      panel({ id: 'back', role: 'BACK', w: 578, h: 698, position: [0, H / 2, 23], thickness: 6 }),
      // Store shelf (no connectors configured → contributes no drill points)
      panel({ id: 'shelf', role: 'SHELF', w: hw, h: 510, position: [0, H / 2, 268] }),
    ],
  } as unknown as Cabinet;
}

/**
 * Overlay-back variant with a 6mm back — the F-07 case. The 17.5/11/12mm
 * back-owned recipe cannot exist in 6mm, so this cabinet must emit ZERO
 * operations for the back joint and record a refusal. Kept as a fixture
 * precisely because it is the shape that used to drill straight through.
 */
function overlayBackCab(): Cabinet {
  const hw = W - 2 * T, sx = W / 2 - T / 2;
  const sideW = D - 6;             // store: D − backDepthReduction(6mm overlay back)
  const carcassZ = D / 2 + 3;      // store carcassZ = backTotalT/2 shifted into this frame
  return {
    id: 'cab-golden-ovl', name: 'cab-golden-ovl', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'overlay', backPanelInset: 6, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      panel({ id: 't', role: 'TOP', w: hw, h: sideW, position: [0, H - T / 2, carcassZ] }),
      panel({ id: 'b', role: 'BOTTOM', w: hw, h: sideW, position: [0, T / 2, carcassZ] }),
      panel({ id: 'l', role: 'LEFT_SIDE', w: sideW, h: H, position: [-sx, H / 2, carcassZ] }),
      panel({ id: 'r', role: 'RIGHT_SIDE', w: sideW, h: H, position: [sx, H / 2, carcassZ] }),
      // Overlay back: full W×H, back face at z=0 → center z = backTotalT/2 = 3
      panel({ id: 'back', role: 'BACK', w: W, h: H, position: [0, H / 2, 3], thickness: 6 }),
    ],
  } as unknown as Cabinet;
}

/**
 * Same overlay construction, but with a back panel thick enough to accept the
 * fastener recipe (19mm > the 17.5mm BOLT bore, 1.5mm of wall left). This is
 * the fixture that still exercises per-panel REAL thickness reaching the DXF
 * annotation, now that the 6mm variant correctly emits nothing.
 *
 * 19mm is unusual for a back panel and is chosen for exactly that reason: it
 * is not the 18mm cabinet default, so a sheet that reads T=18mm proves the
 * exporter fell back to the default instead of reading the panel.
 */
function thickOverlayBackCab(): Cabinet {
  const BACK_T = 19;
  const hw = W - 2 * T, sx = W / 2 - T / 2;
  const sideW = D - BACK_T;          // store: D − backDepthReduction(overlay back)
  const carcassZ = D / 2 + BACK_T / 2;
  return {
    id: 'cab-golden-ovl-thick', name: 'cab-golden-ovl-thick', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'overlay', backPanelInset: BACK_T, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      panel({ id: 't', role: 'TOP', w: hw, h: sideW, position: [0, H - T / 2, carcassZ] }),
      panel({ id: 'b', role: 'BOTTOM', w: hw, h: sideW, position: [0, T / 2, carcassZ] }),
      panel({ id: 'l', role: 'LEFT_SIDE', w: sideW, h: H, position: [-sx, H / 2, carcassZ] }),
      panel({ id: 'r', role: 'RIGHT_SIDE', w: sideW, h: H, position: [sx, H / 2, carcassZ] }),
      // Overlay back: full W×H, back face at z=0 → center z = BACK_T/2
      panel({ id: 'back', role: 'BACK', w: W, h: H, position: [0, H / 2, BACK_T / 2], thickness: BACK_T }),
    ],
  } as unknown as Cabinet;
}

// ══════════════════════════════════════════════════════════════════════════
// Minimal DXF text parser (code/value pair walk over the ENTITIES section)
// ══════════════════════════════════════════════════════════════════════════
interface ParsedCircle { layer: string; x: number; y: number; r: number }
interface ParsedText { layer: string; text: string }
interface ParsedPolyline { layer: string; pts: Array<{ x: number; y: number }> }
interface ParsedDxf { circles: ParsedCircle[]; texts: ParsedText[]; polylines: ParsedPolyline[] }

function parseDxf(content: string): ParsedDxf {
  const lines = content.split('\n').map((l) => l.replace(/\r$/, ''));
  const out: ParsedDxf = { circles: [], texts: [], polylines: [] };
  let inEntities = false;
  let cur: { type: string; data: Record<string, string>; pts: Array<{ x: number; y: number }> } | null = null;
  let pendingX: number | null = null;

  const flush = () => {
    if (!cur) return;
    if (cur.type === 'CIRCLE') {
      out.circles.push({
        layer: cur.data['8'] ?? '', x: parseFloat(cur.data['10'] ?? 'NaN'),
        y: parseFloat(cur.data['20'] ?? 'NaN'), r: parseFloat(cur.data['40'] ?? 'NaN'),
      });
    } else if (cur.type === 'TEXT') {
      out.texts.push({ layer: cur.data['8'] ?? '', text: cur.data['1'] ?? '' });
    } else if (cur.type === 'LWPOLYLINE') {
      out.polylines.push({ layer: cur.data['8'] ?? '', pts: cur.pts });
    }
    cur = null;
  };

  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i].trim();
    const value = lines[i + 1];
    if (code === '2' && value === 'ENTITIES') { inEntities = true; continue; }
    if (!inEntities) continue;
    if (code === '0') {
      flush();
      if (value === 'ENDSEC' || value === 'EOF') { inEntities = false; continue; }
      cur = { type: value, data: {}, pts: [] };
      continue;
    }
    if (!cur) continue;
    if (cur.type === 'LWPOLYLINE' && code === '10') { pendingX = parseFloat(value); continue; }
    if (cur.type === 'LWPOLYLINE' && code === '20' && pendingX !== null) {
      cur.pts.push({ x: pendingX, y: parseFloat(value) });
      pendingX = null;
      continue;
    }
    cur.data[code] = value;
  }
  flush();
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (a: number, b: number) => a - b;
const uniq = (xs: number[]) => [...new Set(xs)];
const TOL = 0.01;

/** Full-disc containment for FACE (DRILL_V) circles; boundary-center for EDGE (DRILL_H). */
function assertCircleManufacturable(c: ParsedCircle, w: number, h: number, tag: string): void {
  expect(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.r), `${tag} finite`).toBe(true);
  if (c.layer.startsWith('DRILL_V_')) {
    expect(c.x - c.r, `${tag} disc left inside outline`).toBeGreaterThanOrEqual(-TOL);
    expect(c.x + c.r, `${tag} disc right inside outline`).toBeLessThanOrEqual(w + TOL);
    expect(c.y - c.r, `${tag} disc bottom inside outline`).toBeGreaterThanOrEqual(-TOL);
    expect(c.y + c.r, `${tag} disc top inside outline`).toBeLessThanOrEqual(h + TOL);
  } else if (c.layer.startsWith('DRILL_H_')) {
    // Edge bore marker: center sits ON the outline boundary, within the panel span
    const onX = Math.abs(c.x) <= TOL || Math.abs(c.x - w) <= TOL;
    const onY = Math.abs(c.y) <= TOL || Math.abs(c.y - h) <= TOL;
    expect(onX || onY, `${tag} edge-bore center on outline boundary`).toBe(true);
    expect(c.x, `${tag} within span x`).toBeGreaterThanOrEqual(-TOL);
    expect(c.x, `${tag} within span x`).toBeLessThanOrEqual(w + TOL);
    expect(c.y, `${tag} within span y`).toBeGreaterThanOrEqual(-TOL);
    expect(c.y, `${tag} within span y`).toBeLessThanOrEqual(h + TOL);
  } else {
    // Any other circle layer must still stay inside the outline
    expect(c.x, `${tag} inside outline`).toBeGreaterThanOrEqual(-TOL);
    expect(c.x, `${tag} inside outline`).toBeLessThanOrEqual(w + TOL);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// One shared export per fixture (in-memory full path — NOT the download wrapper)
// ══════════════════════════════════════════════════════════════════════════
async function buildAndExport(cab: Cabinet): Promise<DxfExportResult> {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const dm = generateMinifixDrillMap(cab);
    const { packet } = await buildFactoryPacket(
      { jobId: 'job-golden', projectId: 'proj-golden', toolVersion: 'golden@t3' },
      { cabinets: [cab], drillMap: dm, gateResult: null },
    );
    const result = await exportDxfFromPacket(packet, {
      machineId: 'KDT',
      panelPlacements: cab.panels.map((p) => ({ panelId: p.id, position: p.position })),
    });
    if (!result.ok) throw new Error(`export failed: ${result.error} ${result.details?.join('; ') ?? ''}`);
    return result;
  } finally {
    err.mockRestore();
    warn.mockRestore();
  }
}

interface Ctx {
  result: DxfExportResult;
  byRole: Map<string, { content: string; parsed: ParsedDxf; panel: DxfExportResult['panels'][number] }>;
}
function toCtx(result: DxfExportResult): Ctx {
  const byRole = new Map<string, { content: string; parsed: ParsedDxf; panel: DxfExportResult['panels'][number] }>();
  for (const p of result.panels) {
    byRole.set(p.panelName, { content: p.content, parsed: parseDxf(p.content), panel: p });
  }
  return { result, byRole };
}

const DIMS: Record<string, [number, number]> = {
  LEFT_SIDE: [560, 720], RIGHT_SIDE: [560, 720], TOP: [564, 560], BOTTOM: [564, 560],
};

describe('DXF golden — default flush INSET cabinet 600×720×560 (packet → projected per-panel drawings)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = toCtx(await buildAndExport(defaultCab()));
  });

  it('G1: exports exactly the 4 carcass sheets (back/shelf carry no drill points on the default structure) with 80 operations', () => {
    const names = ctx.result.panels.map((p) => p.panelName).sort();
    expect(names).toEqual(['BOTTOM', 'LEFT_SIDE', 'RIGHT_SIDE', 'TOP']);
    expect(ctx.result.panels.map((p) => p.filename).sort()).toEqual([
      'BOTTOM_KDT.dxf', 'LEFT_SIDE_KDT.dxf', 'RIGHT_SIDE_KDT.dxf', 'TOP_KDT.dxf',
    ]);
    expect(ctx.result.totalOperations).toBe(80);
  });

  it('G2: zero skipped points — fail-closed channel exists and is empty (Q6=A B-run retired)', () => {
    expect(ctx.result.skipped, 'export result must surface the projection skipped[] channel').toBeDefined();
    expect(ctx.result.skipped).toEqual([]);
    for (const p of ctx.result.panels) {
      expect(p.skippedCount, `${p.panelName} skippedCount`).toBe(0);
    }
  });

  it('G3: every sheet draws the PANEL_OUTLINE_FINISH outline (Q7=A: no shop flow saws from this DXF) at its panel draw dims and EVERY circle is manufacturable inside it (world-coordinate defect gone)', () => {
    for (const [role, [w, h]] of Object.entries(DIMS)) {
      const sheet = ctx.byRole.get(role);
      expect(sheet, `sheet ${role}`).toBeDefined();
      // Q7=A rename: the outline is a FINISH reference frame, not a saw path.
      // The legacy CUT_OUT name (kept in the dev-preview cabinetToDxf tool,
      // where the outline IS cut dims) must not appear on packet-path sheets.
      const outlines = sheet!.parsed.polylines.filter((pl) => pl.layer === 'PANEL_OUTLINE_FINISH');
      expect(outlines.length, `${role} has exactly one PANEL_OUTLINE_FINISH outline`).toBe(1);
      expect(
        sheet!.parsed.polylines.filter((pl) => pl.layer === 'CUT_OUT'),
        `${role} must carry NO CUT_OUT layer (Q7=A)`,
      ).toEqual([]);
      expect(sheet!.content, `${role} layer table has no CUT_OUT`).not.toContain('CUT_OUT');
      const xs = outlines[0].pts.map((p) => p.x), ys = outlines[0].pts.map((p) => p.y);
      expect(Math.min(...xs), `${role} outline min x`).toBeCloseTo(0, 3);
      expect(Math.max(...xs), `${role} outline max x`).toBeCloseTo(w, 3);
      expect(Math.min(...ys), `${role} outline min y`).toBeCloseTo(0, 3);
      expect(Math.max(...ys), `${role} outline max y`).toBeCloseTo(h, 3);

      expect(sheet!.parsed.circles.length, `${role} has drill circles`).toBeGreaterThan(0);
      for (const c of sheet!.parsed.circles) {
        assertCircleManufacturable(c, w, h, `${role} circle @(${c.x},${c.y}) r=${c.r} [${c.layer}]`);
      }
    }
  });

  it('G4: LEFT_SIDE carries the System-32 columns, CAM/BOLT pattern and A-run corner dowel FACE bores (Ø8 D12) per drill map', () => {
    const { parsed } = ctx.byRole.get('LEFT_SIDE')!;
    const bolts = parsed.circles.filter((c) => c.layer === 'DRILL_V_10_D17.5');
    expect(uniq(bolts.map((c) => r2(c.x))).sort(num), 'System-32 bolt stations from FRONT edge').toEqual([37, 293, 517]);
    expect(uniq(bolts.map((c) => r2(c.y))).sort(num), 'joint rows at TOP/BOTTOM thickness centers').toEqual([9, 711]);
    expect(bolts.length).toBe(6);
    for (const c of bolts) expect(c.r).toBeCloseTo(5, 3);

    const threads = parsed.circles.filter((c) => c.layer === 'DRILL_V_5_D11');
    expect(uniq(threads.map((c) => r2(c.x))).sort(num)).toEqual([37, 293, 517]);
    expect(threads.length).toBe(6);

    const dowels = parsed.circles.filter((c) => c.layer === 'DRILL_V_8_D12');
    expect(uniq(dowels.map((c) => r2(c.x))).sort(num), 'A-run corner dowel ladder').toEqual([69, 261, 325, 485]);
    expect(uniq(dowels.map((c) => r2(c.y))).sort(num)).toEqual([9, 711]);
    expect(dowels.length).toBe(8);
    for (const c of dowels) expect(c.r).toBeCloseTo(4, 3);
  });

  it('G5: RIGHT_SIDE equals LEFT_SIDE mirrored across the vertical centerline — and NOT LEFT under identity (asymmetric probe)', () => {
    const left = ctx.byRole.get('LEFT_SIDE')!.parsed.circles;
    const right = ctx.byRole.get('RIGHT_SIDE')!.parsed.circles;
    const key = (c: ParsedCircle) => `${r2(c.x)}|${r2(c.y)}|${r2(c.r)}|${c.layer}`;
    const mirrorKey = (c: ParsedCircle) => `${r2(560 - c.x)}|${r2(c.y)}|${r2(c.r)}|${c.layer}`;

    expect(right.map(key).sort(), 'RIGHT = mirror_x(LEFT) as multisets').toEqual(left.map(mirrorKey).sort());
    expect(right.map(key).sort(), 'RIGHT must NOT equal LEFT under identity').not.toEqual(left.map(key).sort());

    // Explicit numeric probe: System-32 stations are front-referenced, so the
    // mirrored RIGHT drawing puts the bolt columns at 560−{37,293,517}:
    const rightBolts = right.filter((c) => c.layer === 'DRILL_V_10_D17.5');
    expect(uniq(rightBolts.map((c) => r2(c.x))).sort(num)).toEqual([43, 267, 523]);
    expect(ctx.byRole.get('RIGHT_SIDE')!.panel.projection?.mirroredInX, 'Q5: RIGHT_SIDE mirrored in-file').toBe(true);
    expect(ctx.byRole.get('LEFT_SIDE')!.panel.projection?.mirroredInX).toBe(false);
  });

  it('G6: TOP is the machining-face (mirrored) view per Q5 with CAM face bores and DRILL_H edge bores', () => {
    const sheet = ctx.byRole.get('TOP')!;
    const cams = sheet.parsed.circles.filter((c) => c.layer === 'DRILL_V_15_D13.5');
    expect(cams.length).toBe(6);
    expect(uniq(cams.map((c) => r2(c.x))).sort(num), 'Distance B=24 from both mate edges').toEqual([24, 540]);
    expect(uniq(cams.map((c) => r2(c.y))).sort(num), 'System-32 stations from FRONT edge').toEqual([37, 293, 517]);

    const boltEntries = sheet.parsed.circles.filter((c) => c.layer === 'DRILL_H_7.5_Z9_D24');
    expect(boltEntries.length).toBe(6);
    expect(uniq(boltEntries.map((c) => r2(c.x))).sort(num), 'edge bores on LEFT/RIGHT boundaries').toEqual([0, 564]);
    expect(uniq(boltEntries.map((c) => r2(c.y))).sort(num)).toEqual([37, 293, 517]);

    const edgeDowels = sheet.parsed.circles.filter((c) => c.layer === 'DRILL_H_8_Z9_D18');
    expect(edgeDowels.length).toBe(8);
    expect(uniq(edgeDowels.map((c) => r2(c.x))).sort(num)).toEqual([0, 564]);
    expect(uniq(edgeDowels.map((c) => r2(c.y))).sort(num)).toEqual([69, 261, 325, 485]);

    // No Ø8×12 FACE bores on TOP (Q6=A B-run retired)
    expect(sheet.parsed.circles.filter((c) => c.layer === 'DRILL_V_8_D12')).toHaveLength(0);

    // Q5 mirror surfaced both in result data and in-file for the operator
    expect(sheet.panel.projection?.mirroredInX, 'Q5: TOP mirrored in-file').toBe(true);
    expect(sheet.content).toContain('MIRRORED IN-FILE');
    expect(ctx.byRole.get('BOTTOM')!.panel.projection?.mirroredInX).toBe(false);
    expect(ctx.byRole.get('BOTTOM')!.content).not.toContain('MIRRORED IN-FILE');
  });

  it('G7: annotations carry panel identity, per-panel REAL thickness, material, and the Q3=A definition stamp', () => {
    for (const [role] of Object.entries(DIMS)) {
      const { content } = ctx.byRole.get(role)!;
      expect(content, `${role} definition stamp (Q3=A)`).toContain(
        'panel cut size (finish - edge band, no premill) — formula-reference §3, D-2 ruling 2026-07-26',
      );
      expect(content, `${role} role annotation`).toContain(role);
      expect(content, `${role} per-panel real thickness`).toContain('T=18mm');
      expect(content, `${role} material from its own cut-list row`).toContain('Material: c');
      expect(content, `${role} outline reference for bore coordinates`).toContain('OUTLINE');
      expect(content, `${role} machine metadata`).toContain('Machine: KDT');
    }
  });

  it('G8: G10 provenance gate passes on the projected content', () => {
    for (const p of ctx.result.panels) {
      expect(p.g10Result.ok, `${p.panelName} G10`).toBe(true);
      expect(p.provenance.source).toBe('OPERATION_GRAPH');
    }
  });
});

/**
 * F-07 [P0]. This block used to read:
 *
 *   "overlay-back variant pins per-panel REAL thickness (6mm back)"
 *   B1: BACK sheet exists ... "overlay construction emits real back connector points"
 *   B2: BACK face bores land inside the BACK outline
 *
 * Those two assertions PINNED THE DEFECT. The bores they demanded were
 * back-owned blind bores of 17.5mm (BOLT), 11mm (BOLT_THREAD) and 12mm (DOWEL)
 * driven into a 6mm panel — every one of them straight through and out the
 * other side. The fixture comment even said the quiet part out loud.
 *
 * The scrutinize review's ruling is that the correct outcome is zero
 * operations plus a blocker, never a shallower hole:
 *   "Reducing the depth would invent a nonfunctional fixing."
 *
 * So the 6mm case is now a refusal test, and the per-panel-thickness
 * propagation it was ALSO covering moved to a back panel that can physically
 * accept the recipe (below). Both properties stay covered; neither one is
 * covered by a cabinet that cannot be built.
 */
describe('DXF golden — F-07: a 6mm overlay back refuses the joint instead of drilling through it', () => {
  let ctx: Ctx;
  let drillMap: ReturnType<typeof generateMinifixDrillMap>;
  beforeAll(async () => {
    const cab = overlayBackCab();
    drillMap = generateMinifixDrillMap(cab);
    ctx = toCtx(await buildAndExport(cab));
  });

  it('B1: exports NO back-owned face bores — the 17.5/11/12mm recipe cannot exist in 6mm', () => {
    const back = ctx.byRole.get('BACK');
    const faceBores = back ? back.parsed.circles.filter((c) => c.layer.startsWith('DRILL_V_')) : [];
    expect(faceBores, 'a 6mm panel must receive no blind face bores').toEqual([]);

    // NOTE — open question, deliberately not asserted as correct behaviour:
    // today the BACK sheet vanishes from the export entirely (byRole has no
    // 'BACK') because the packet only carries panels that own operations. The
    // panel still has to be CUT. The gate blocks export while a refusal stands,
    // so this is not reachable through the app, but a direct caller of
    // exportDxfFromPacket would get a set with no back panel and no explanation.
    // Tracked as its own finding rather than frozen into a golden assertion.
  });

  it('B2: no bore anywhere in the map was shrunk to fit the 6mm panel', () => {
    // The forbidden "fix" is a depth reduction. If one had happened, a bore of
    // 0 < depth <= 6 would exist on the back panel.
    const backPoints = (drillMap.panels ?? [])
      .filter((p) => p.panelId === 'back' || p.role === 'BACK')
      .flatMap((p) => p.points ?? []);
    expect(backPoints.map((pt) => `${pt.purpose} D${pt.depth}`), 'zero operations, not shallow ones')
      .toEqual([]);
  });

  it('B3: records a STRUCTURED, non-waivable refusal naming the depth and the member', () => {
    const refusals = drillMap.manufacturabilityRefusals ?? [];
    expect(refusals.length, 'an empty panel must never read as "nothing needed"').toBeGreaterThan(0);

    const bolt = refusals.find((r) => r.purpose === 'BOLT');
    expect(bolt, 'the 17.5mm bolt bore must be named').toBeDefined();
    expect(bolt!.reasonCode).toBe('R_BLIND_BORE_EXCEEDS_MEMBER_THICKNESS');
    expect(bolt!.requiredDepthMm, 'the required depth is recorded AS-IS, not reduced').toBe(17.5);
    expect(bolt!.ownerThicknessMm).toBe(6);
    expect(bolt!.waivable).toBe(false);
  });

  it('B4: the side of the joint is withdrawn too — a cam with no bolt is not a fixing', () => {
    const sideBackJointBores = (drillMap.panels ?? [])
      .filter((p) => p.role === 'LEFT_SIDE' || p.role === 'RIGHT_SIDE')
      .flatMap((p) => p.points ?? [])
      .filter((pt) => typeof pt.cornerType === 'string' && pt.cornerType.startsWith('BACK_'));
    expect(sideBackJointBores.map((pt) => `${pt.purpose}@${pt.cornerType}`),
      'half a joint is worse than none: it looks assembled and holds nothing').toEqual([]);
  });
});

/**
 * The per-panel-thickness propagation B1/B2 were really testing, on a back
 * panel that can actually take the recipe. 19mm clears the deepest back-owned
 * blind bore (17.5mm BOLT) with 1.5mm of wall left, and is not the 18mm
 * cabinet default — so a sheet reading T=18mm here still proves the exporter
 * fell back to the cabinet default instead of reading the panel.
 */
describe('DXF golden — overlay-back variant pins per-panel REAL thickness (19mm back, NOT the 18mm cabinet default)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = toCtx(await buildAndExport(thickOverlayBackCab()));
  });

  it('B5: BACK sheet exists and its annotation carries the panel\'s own 19mm thickness', () => {
    const back = ctx.byRole.get('BACK');
    expect(back, 'a 19mm overlay back accepts the recipe, so it owns real operations').toBeDefined();
    expect(back!.content).toContain('T=19mm');
    expect(back!.content).not.toContain('T=18mm');
    // Carcass sheets still carry their own 18mm
    expect(ctx.byRole.get('LEFT_SIDE')!.content).toContain('T=18mm');
  });

  it('B6: BACK face bores land inside the BACK outline (600×720) — projected, not world coordinates', () => {
    const back = ctx.byRole.get('BACK')!;
    const faceBores = back.parsed.circles.filter((c) => c.layer.startsWith('DRILL_V_'));
    expect(faceBores.length).toBeGreaterThan(0);
    for (const c of faceBores) {
      assertCircleManufacturable(c, 600, 720, `BACK circle @(${c.x},${c.y}) [${c.layer}]`);
    }
    expect(ctx.result.skipped.filter((s) => s.panelId === 'back'),
      'no fail-closed skips on the back panel').toEqual([]);
  });
});
