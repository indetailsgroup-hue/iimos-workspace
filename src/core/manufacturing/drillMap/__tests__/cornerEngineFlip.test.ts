/** ADR-061(c) FLIP — Connector OS เป็นเจ้าของ geometry corner joints */
import { describe, it, expect, vi } from 'vitest';
import type { Cabinet, CabinetPanel } from '../../../types/Cabinet';
import { generateMinifixDrillMap } from '../generateDrillMap';

const T=18,W=600,H=720,D=560;
function panel(o:{id:string;role:CabinetPanel['role'];w:number;h:number;position:[number,number,number]}):CabinetPanel{
  return{id:o.id,role:o.role,name:o.id,finishWidth:o.w,finishHeight:o.h,coreMaterialId:'c',
    faces:{faceA:null,faceB:null},edges:{top:null,bottom:null,left:null,right:null},grainDirection:'HORIZONTAL',
    computed:{realThickness:T,cutWidth:o.w,cutHeight:o.h,surfaceArea:0,edgeLength:0,cost:0,co2:0},
    position:o.position,rotation:[0,0,0],visible:true,selected:false} as CabinetPanel;
}
function cab(mode:'OVERLAY'|'INSET'):Cabinet{
  const hw=W-2*T+2*9,sx=hw/2-9+T/2;
  return{id:'x',name:'x',type:'BASE',dimensions:{width:W,height:H,depth:D,toeKickHeight:100},
    structure:{topJoint:mode,bottomJoint:mode,hasBackPanel:false,backPanelConstruction:'inset',backPanelInset:6,shelfCount:0,dividerCount:0},
    materials:{defaultCore:'c',defaultSurface:'s',defaultEdge:'e'},
    panels:[panel({id:'t',role:'TOP',w:hw,h:D,position:[0,H-T/2,D/2]}),panel({id:'b',role:'BOTTOM',w:hw,h:D,position:[0,T/2,D/2]}),
      panel({id:'l',role:'LEFT_SIDE',w:D,h:H,position:[-sx,H/2,D/2]}),panel({id:'r',role:'RIGHT_SIDE',w:D,h:H,position:[sx,H/2,D/2]})]} as unknown as Cabinet;
}
const strip = (dm: ReturnType<typeof generateMinifixDrillMap>) =>
  dm.panels.map(p => ({ id: p.panelId, pts: p.points.map(({ id, ...rest }) => rest) }));

const CORNER_LIST = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as const;
const CORNERS = new Set<string>(CORNER_LIST);

type Pt = ReturnType<typeof generateMinifixDrillMap>['panels'][number]['points'][number];

/** dowel มุมตู้ non-B-run แยกตาม class ของแผ่น host */
function cornerDowelsOf(dm: ReturnType<typeof generateMinifixDrillMap>) {
  const cornerDowels = dm.panels.flatMap(p => p.points).filter(p =>
    p.purpose === 'DOWEL' && p.cornerType && CORNERS.has(p.cornerType) &&
    !p.pairId?.startsWith('pair-B-')); // B-run = ระบบแยก depth กลับด้านโดยตั้งใจ
  return {
    sideDowels: cornerDowels.filter(p => p.connectedPanelRole === 'LEFT_SIDE' || p.connectedPanelRole === 'RIGHT_SIDE'),
    horizDowels: cornerDowels.filter(p => p.connectedPanelRole === 'TOP' || p.connectedPanelRole === 'BOTTOM'),
  };
}

/** ทุกมุมต้องมี dowel ทั้งฝั่ง SIDE และฝั่ง HORIZ อย่างน้อยมุมละ 1 (non-B-run) */
function expectPerCornerPresence(sideDowels: Pt[], horizDowels: Pt[]) {
  for (const c of CORNER_LIST) {
    expect(sideDowels.some(p => p.cornerType === c), `ไม่มี SIDE dowel ที่มุม ${c}`).toBe(true);
    expect(horizDowels.some(p => p.cornerType === c), `ไม่มี HORIZ dowel ที่มุม ${c}`).toBe(true);
  }
}

/** dowel ตัวเดียวเสียบทะลุ joint → ทิศเจาะสองฝั่งต้องสวนกัน (dot = -1) */
function expectOpposingMates(sideDowels: Pt[], horizDowels: Pt[]) {
  for (const s of sideDowels) {
    const base = s.pairId!.replace(/-dowel-side$/, '');
    const mate = horizDowels.find(h =>
      h.pairId === `${base}-dowel-horiz` && Math.abs(h.position[2] - s.position[2]) < 1e-6);
    expect(mate, `mate ของ ${s.pairId} z=${s.position[2]}`).toBeDefined();
    const dot = s.normal[0] * mate!.normal[0] + s.normal[1] * mate!.normal[1] + s.normal[2] * mate!.normal[2];
    expect(Math.abs(dot + 1), `normal dot ของคู่ ${base} z=${s.position[2]} (dot=${dot})`).toBeLessThan(1e-3);
  }
}

describe('flush INSET (store geometry)', () => {
  // ตู้จาก useCabinetStore จริง: แผ่นนอนกว้าง W-2T พอดี (ไม่มี tuck 9mm) —
  // รู FACE_BORE ฝั่ง SIDE กับรู EDGE_BORE ฝั่ง HORIZ ของ dowel คู่เดียวกัน
  // อยู่พิกัดโลกเดียวกันเป๊ะ → nearest-match เสมอกัน ต้องแยกด้วย panel class
  function flushCab(): Cabinet {
    const hw = W - 2 * T, sx = W / 2 - T / 2; // hw=564, sx=291 (useCabinetStore:1716)
    return{id:'x',name:'x',type:'BASE',dimensions:{width:W,height:H,depth:D,toeKickHeight:100},
      structure:{topJoint:'INSET',bottomJoint:'INSET',hasBackPanel:false,backPanelConstruction:'inset',backPanelInset:6,shelfCount:0,dividerCount:0},
      materials:{defaultCore:'c',defaultSurface:'s',defaultEdge:'e'},
      panels:[panel({id:'t',role:'TOP',w:hw,h:D,position:[0,H-T/2,D/2]}),panel({id:'b',role:'BOTTOM',w:hw,h:D,position:[0,T/2,D/2]}),
        panel({id:'l',role:'LEFT_SIDE',w:D,h:H,position:[-sx,H/2,D/2]}),panel({id:'r',role:'RIGHT_SIDE',w:D,h:H,position:[sx,H/2,D/2]})]} as unknown as Cabinet;
  }

  it('corner dowels: SIDE=12 (FACE_BORE), TOP/BOTTOM=18 (EDGE_BORE), normal สัมบูรณ์ ±X, ครบทุกมุม, ไม่มี mismatch log', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dm = generateMinifixDrillMap(flushCab()); // default = connector-os
    const mismatchLogs = err.mock.calls.filter(c => String(c[0]).includes('handover mismatch'));
    err.mockRestore();
    expect(mismatchLogs, 'ต้องไม่มี handover mismatch log ระหว่าง generate flush INSET').toEqual([]);

    const { sideDowels, horizDowels } = cornerDowelsOf(dm);
    expect(sideDowels.length).toBeGreaterThan(0);
    expect(horizDowels.length).toBeGreaterThan(0);
    expectPerCornerPresence(sideDowels, horizDowels);

    // INSET: ทั้งสอง class เจาะแกน X สัมบูรณ์ (อ่านจาก emitter จริง generateDrillMap
    // INSET dowel branch + worldSynthesis INSET dowels):
    //   SIDE FACE_BORE  = boltFacePointFromSideAABB_v4 → LEFT [-1,0,0] / RIGHT [+1,0,0]
    //   HORIZ EDGE_BORE = isLeft ? [+1,0,0] : [-1,0,0]  (เจาะเข้าขอบซ้าย/ขวาแผ่นนอน)
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

    expectOpposingMates(sideDowels, horizDowels);
  });
});

describe('flush OVERLAY (store geometry)', () => {
  // ตู้ OVERLAY จาก useCabinetStore จริง: แผ่นนอนกว้างเต็ม W (useCabinetStore:1716 ternary),
  // แผ่นข้างหด topReduction/bottomReduction = T (:1634-1644) → หน้าล่างของ TOP (topY - T/2,
  // :1724-1726) ทับขอบบนแผ่นข้างพอดี → รู EDGE_BORE ฝั่ง SIDE กับรู FACE_BORE ฝั่ง HORIZ
  // ของ dowel คู่เดียวกันอยู่พิกัดโลกเดียวกันเป๊ะ (degeneracy เดียวกับ flush INSET)
  function flushOverlayCab(): Cabinet {
    const hw = W, sideH = H - 2 * T, sx = W / 2 - T / 2; // hw=600, sideH=684, sx=291
    return{id:'x',name:'x',type:'BASE',dimensions:{width:W,height:H,depth:D,toeKickHeight:100},
      structure:{topJoint:'OVERLAY',bottomJoint:'OVERLAY',hasBackPanel:false,backPanelConstruction:'inset',backPanelInset:6,shelfCount:0,dividerCount:0},
      materials:{defaultCore:'c',defaultSurface:'s',defaultEdge:'e'},
      panels:[panel({id:'t',role:'TOP',w:hw,h:D,position:[0,H-T/2,D/2]}),panel({id:'b',role:'BOTTOM',w:hw,h:D,position:[0,T/2,D/2]}),
        panel({id:'l',role:'LEFT_SIDE',w:D,h:sideH,position:[-sx,H/2,D/2]}),panel({id:'r',role:'RIGHT_SIDE',w:D,h:sideH,position:[sx,H/2,D/2]})]} as unknown as Cabinet;
  }

  it('corner dowels: SIDE=18 (EDGE_BORE), TOP/BOTTOM=12 (FACE_BORE), normal สัมบูรณ์ ±Y, ครบทุกมุม, ไม่มี mismatch log', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dm = generateMinifixDrillMap(flushOverlayCab()); // default = connector-os
    const mismatchLogs = err.mock.calls.filter(c => String(c[0]).includes('handover mismatch'));
    err.mockRestore();
    expect(mismatchLogs, 'ต้องไม่มี handover mismatch log ระหว่าง generate flush OVERLAY').toEqual([]);

    const { sideDowels, horizDowels } = cornerDowelsOf(dm);
    expect(sideDowels.length).toBeGreaterThan(0);
    expect(horizDowels.length).toBeGreaterThan(0);
    expectPerCornerPresence(sideDowels, horizDowels);

    // OVERLAY: split กลับด้านจาก INSET — ทั้งสอง class เจาะแกน Y สัมบูรณ์
    // (อ่านจาก OVERLAY emitters + worldSynthesis:168-182):
    //   SIDE EDGE_BORE  (18mm) = boltEntryEdgePointFromSideAABB_overlay → TOP [0,-1,0] / BOTTOM [0,+1,0]
    //   HORIZ FACE_BORE (12mm) = boltFacePointFromHorizAABB_overlay     → TOP [0,+1,0] / BOTTOM [0,-1,0]
    for (const p of sideDowels) {
      const tag = `SIDE dowel ${p.pairId} corner=${p.cornerType} z=${p.position[2]}`;
      expect(p.depth, tag).toBe(18);
      const isTop = p.cornerType === 'TOP_LEFT' || p.cornerType === 'TOP_RIGHT';
      expect(p.normal, `${tag} normal`).toEqual(isTop ? [0, -1, 0] : [0, 1, 0]);
    }
    for (const p of horizDowels) {
      const tag = `HORIZ dowel ${p.pairId} corner=${p.cornerType} z=${p.position[2]}`;
      expect(p.depth, tag).toBe(12);
      const isTop = p.cornerType === 'TOP_LEFT' || p.cornerType === 'TOP_RIGHT';
      expect(p.normal, `${tag} normal`).toEqual(isTop ? [0, 1, 0] : [0, -1, 0]);
    }

    expectOpposingMates(sideDowels, horizDowels);
  });
});

describe('cornerEngine flip', () => {
  it.each(['OVERLAY','INSET'] as const)('%s: connector-os (default) === legacy ทุกจุด และไม่มี mismatch log', (mode) => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = generateMinifixDrillMap(cab(mode));                                  // default = connector-os
    const b = generateMinifixDrillMap(cab(mode), {}, {}, { cornerEngine: 'legacy' });
    expect(strip(a)).toEqual(strip(b));
    const mismatchLogs = err.mock.calls.filter(c => String(c[0]).includes('handover mismatch'));
    expect(mismatchLogs).toEqual([]);
    err.mockRestore();
  });

  it('AWI density: สอง engine ยังเท่ากัน', () => {
    const a = generateMinifixDrillMap(cab('INSET'), {}, {}, { connectorDensity: 'AWI_PREMIUM' });
    const b = generateMinifixDrillMap(cab('INSET'), {}, {}, { connectorDensity: 'AWI_PREMIUM', cornerEngine: 'legacy' });
    expect(strip(a)).toEqual(strip(b));
  });
});
