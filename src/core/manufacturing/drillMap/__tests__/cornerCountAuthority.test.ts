/**
 * T1b — corner count/disable authority (ADR-061(c) handover):
 * generator resolve connectorCount (override-aware: connectorCountOverrides.main →
 * options.connectorCount → density) และ isCornerEnabled แล้ว synthesis ต้องใช้
 * authority เดียวกัน — ห้าม mixed-engine geometry, ห้าม handover mismatch log
 * (G1 finding: main=4 → missed=64 unusedSynth=32; corner disabled → unusedSynth ค้าง)
 */
import { describe, it, expect, vi } from 'vitest';
import type { Cabinet, CabinetPanel, StructuralConnectorConfig } from '../../../types/Cabinet';
import { generateMinifixDrillMap } from '../generateDrillMap';

const T = 18, W = 600, H = 720, D = 560;

function panel(o: { id: string; role: CabinetPanel['role']; w: number; h: number; position: [number, number, number] }): CabinetPanel {
  return { id: o.id, role: o.role, name: o.id, finishWidth: o.w, finishHeight: o.h, coreMaterialId: 'c',
    faces: { faceA: null, faceB: null }, edges: { top: null, bottom: null, left: null, right: null }, grainDirection: 'HORIZONTAL',
    computed: { realThickness: T, cutWidth: o.w, cutHeight: o.h, surfaceArea: 0, edgeLength: 0, cost: 0, co2: 0 },
    position: o.position, rotation: [0, 0, 0], visible: true, selected: false } as CabinetPanel;
}

/** ตู้ flush INSET จาก useCabinetStore จริง (แผ่นนอน = W-2T ไม่มี tuck 9mm) —
 *  fixture เดียวกับ cornerEngineFlip.test.ts describe('flush INSET (store geometry)') */
function flushInsetCab(topConnectors?: StructuralConnectorConfig): Cabinet {
  const hw = W - 2 * T, sx = W / 2 - T / 2; // hw=564, sx=291 (useCabinetStore:1716)
  return { id: 'x', name: 'x', type: 'BASE', dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: { topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: false, backPanelConstruction: 'inset', backPanelInset: 6, shelfCount: 0, dividerCount: 0,
      ...(topConnectors ? { topConnectors } : {}) },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [panel({ id: 't', role: 'TOP', w: hw, h: D, position: [0, H - T / 2, D / 2] }), panel({ id: 'b', role: 'BOTTOM', w: hw, h: D, position: [0, T / 2, D / 2] }),
      panel({ id: 'l', role: 'LEFT_SIDE', w: D, h: H, position: [-sx, H / 2, D / 2] }), panel({ id: 'r', role: 'RIGHT_SIDE', w: D, h: H, position: [sx, H / 2, D / 2] })] } as unknown as Cabinet;
}

const CORNER_LIST = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as const;
const CORNERS = new Set<string>(CORNER_LIST);

type Dm = ReturnType<typeof generateMinifixDrillMap>;

/** จุด corner joint ทั้งหมด (non-B-run — B-run = ระบบแยก นอก corner scope) */
function cornerPoints(dm: Dm) {
  return dm.panels.flatMap(p => p.points).filter(p =>
    p.cornerType && CORNERS.has(p.cornerType) && !p.pairId?.startsWith('pair-B-'));
}

function generateSpied(cab: Cabinet, options?: Parameters<typeof generateMinifixDrillMap>[3]) {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dm = generateMinifixDrillMap(cab, {}, {}, options);
  const mismatchLogs = err.mock.calls.filter(c => String(c[0]).includes('handover mismatch'));
  err.mockRestore();
  return { dm, mismatchLogs };
}

describe('connectorCountOverrides main=4 — flush INSET (store geometry)', () => {
  const OVERRIDE = { connectorCountOverrides: { main: 4 } };

  it('ไม่มี handover mismatch log และ sys32 ต่อมุม = 4 ตาม override', () => {
    const { dm, mismatchLogs } = generateSpied(flushInsetCab(), OVERRIDE);
    expect(mismatchLogs,
      'override main=4 ต้องไม่ทำให้ synthesis นับ connector คนละจำนวนกับ generator (fail-visible log)',
    ).toEqual([]);

    const bolts = cornerPoints(dm).filter(p => p.purpose === 'BOLT');
    for (const c of CORNER_LIST) {
      const zs = new Set(bolts.filter(p => p.cornerType === c).map(p => p.depthPosition));
      expect(zs.size, `จำนวน sys32 positions ที่มุม ${c} ต้องเท่า override`).toBe(4);
    }
  });

  it('geometry ทุกจุดมาจาก synthesis (no mixed-engine): BOLT 10×17.5 + dowel split 12/18 normal ±X สัมบูรณ์', () => {
    const { dm } = generateSpied(flushInsetCab(), OVERRIDE);
    const pts = cornerPoints(dm);

    // BOLT = synthesis authority: catalog sleeve Ø10×17.5 (worldSynthesis:selectConnector)
    const bolts = pts.filter(p => p.purpose === 'BOLT');
    expect(bolts.length).toBeGreaterThan(0);
    for (const p of bolts) {
      const tag = `BOLT ${p.pairId} corner=${p.cornerType} z=${p.depthPosition}`;
      expect(p.diameter, tag).toBe(10);
      expect(p.depth, tag).toBe(17.5);
    }

    // dowels: INSET flush → SIDE FACE_BORE 12 / HORIZ EDGE_BORE 18, normal แกน X สัมบูรณ์
    // (มาตรฐานเดียวกับ cornerEngineFlip flush INSET test — synthesis-class-consistent)
    const dowels = pts.filter(p => p.purpose === 'DOWEL');
    const sideDowels = dowels.filter(p => p.connectedPanelRole === 'LEFT_SIDE' || p.connectedPanelRole === 'RIGHT_SIDE');
    const horizDowels = dowels.filter(p => p.connectedPanelRole === 'TOP' || p.connectedPanelRole === 'BOTTOM');
    expect(sideDowels.length).toBeGreaterThan(0);
    expect(horizDowels.length).toBeGreaterThan(0);
    for (const p of sideDowels) {
      const tag = `SIDE dowel ${p.pairId} corner=${p.cornerType} z=${p.position[2]}`;
      expect(p.depth, tag).toBe(12);
      const isLeft = p.cornerType === 'TOP_LEFT' || p.cornerType === 'BOTTOM_LEFT';
      expect(p.normal, `${tag} normal`).toEqual(isLeft ? [-1, 0, 0] : [1, 0, 0]);
    }
    for (const p of horizDowels) {
      const tag = `HORIZ dowel ${p.pairId} corner=${p.cornerType} z=${p.position[2]}`;
      expect(p.depth, tag).toBe(18);
      const isLeft = p.cornerType === 'TOP_LEFT' || p.cornerType === 'BOTTOM_LEFT';
      expect(p.normal, `${tag} normal`).toEqual(isLeft ? [1, 0, 0] : [-1, 0, 0]);
    }
  });
});

describe('corner disabled ผ่าน topConnectors — flush INSET (store geometry)', () => {
  it('TOP_LEFT disabled: ไม่มีจุดที่มุมนั้น, มุมอื่นครบ, ไม่มี mismatch/unused-synth log', () => {
    const cab = flushInsetCab({
      connectionType: 'minifix',
      left: { enabled: false, includeDowels: false },   // ← PanelOverrideModal ปิดฝั่งซ้าย
      right: { enabled: true, includeDowels: true },
    });
    const { dm, mismatchLogs } = generateSpied(cab);
    expect(mismatchLogs,
      'มุมที่ปิดต้องไม่ทิ้ง synthesis bores ค้าง (unusedSynth > 0 → console.error ทุก regeneration)',
    ).toEqual([]);

    const pts = cornerPoints(dm);
    expect(pts.filter(p => p.cornerType === 'TOP_LEFT'),
      'มุมที่ disabled ต้องไม่มี corner drill point ใดๆ').toEqual([]);
    for (const c of ['TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as const) {
      expect(pts.some(p => p.cornerType === c && p.purpose === 'BOLT'), `มุม ${c} ต้องยังมี BOLT`).toBe(true);
    }
  });

  it('connectionType none ทั้งแผ่น TOP: สองมุมบนหาย, ไม่มี mismatch log', () => {
    const cab = flushInsetCab({
      connectionType: 'none',
      left: { enabled: true, includeDowels: true },
      right: { enabled: true, includeDowels: true },
    });
    const { dm, mismatchLogs } = generateSpied(cab);
    expect(mismatchLogs).toEqual([]);
    const pts = cornerPoints(dm);
    expect(pts.filter(p => p.cornerType === 'TOP_LEFT' || p.cornerType === 'TOP_RIGHT')).toEqual([]);
    expect(pts.some(p => p.cornerType === 'BOTTOM_LEFT')).toBe(true);
    expect(pts.some(p => p.cornerType === 'BOTTOM_RIGHT')).toBe(true);
  });
});
