/**
 * F-07 follow-up wave — holes found by the two-vendor adversarial gate
 * (GPT-5.6 Sol cross-vendor pass, 2026-07-26), each re-verified against the
 * real code before being written up here.
 *
 * The universal blind-bore sweep (generateDrillMap.ts:2483) withdraws a
 * violating bore's whole "pairId group" and skips bores it cannot classify.
 * Three doors were open:
 *
 *  1. ORPHAN DOWELS [REACHABLE]. The withdrawal matched pairId EXACTLY, but
 *     dowels are emitted under suffixed ids — `${pairId}-dowel-side`,
 *     `-dowel-horiz`, `-dowel-back`, `-dowel-shelf` (generateDrillMap.ts:904,
 *     929, 1241, 1289, 1589, 1616, 1853). So refusing a connector left its own
 *     dowels in the map: machining for a joint the system declined to build.
 *     Reachable on 16mm material, a supported thickness, where the 17.5mm bolt
 *     bore exceeds the side panel.
 *
 *  2. UNADJUDICABLE NORMALS [LATENT]. Face-vs-edge is decided by the dominant
 *     |normal| axis. A zero normal [0,0,0] or a diagonal one [1,0,1] has no
 *     dominant axis, and the strict `>` tie-break silently picked X — so a
 *     17.5mm bore into a 6mm BACK panel was skipped as "edge". The owner's
 *     rule is that data which cannot be adjudicated FAILS CLOSED, never open.
 *
 *  3. TRUSTED `throughHole` [LATENT]. `throughHole === true` skipped the check
 *     outright. No emitter in the repo sets that flag — it is read in exactly
 *     one place and written nowhere — so the door had no legitimate user, only
 *     a future or external map. A "through" hole 3x deeper than its panel is
 *     also a machine-crash risk, not just a wrong hole: the tool travels
 *     11.5mm past a 6mm panel into whatever is clamping it.
 *
 * No depth is reduced, relocated or relabelled by any fix here, and no
 * tolerance is invented: an undeclared overtravel is refused, not guessed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Cabinet, CabinetPanel } from '../../../types/Cabinet';
import { generateMinifixDrillMap, evaluateBlindBoreFeasibility } from '../generateDrillMap';

const W = 600, H = 720, D = 560;

function panel(o: {
  id: string; role: CabinetPanel['role']; w: number; h: number;
  position: [number, number, number]; thickness: number;
}): CabinetPanel {
  return {
    id: o.id, role: o.role, name: o.id, finishWidth: o.w, finishHeight: o.h, coreMaterialId: 'c',
    faces: { faceA: null, faceB: null }, edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: {
      realThickness: o.thickness, cutWidth: o.w, cutHeight: o.h,
      surfaceArea: 0, edgeLength: 0, cost: 0, co2: 0,
    },
    position: o.position, rotation: [0, 0, 0], visible: true, selected: false,
  } as CabinetPanel;
}

/**
 * Flush INSET carcass on THIN material. 16mm is a supported panel thickness,
 * and the stock 17.5mm Minifix bolt bore does not fit in it — so every corner
 * connector on this cabinet must be refused, dowels included.
 */
function thinCarcassCab(t: number): Cabinet {
  const hw = W - 2 * t, sx = W / 2 - t / 2;
  return {
    id: `cab-thin-${t}`, name: 'cab-thin', type: 'BASE',
    dimensions: { width: W, height: H, depth: D, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: false,
      backPanelInset: 6, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      panel({ id: 't', role: 'TOP', w: hw, h: D, position: [0, H - t / 2, D / 2], thickness: t }),
      panel({ id: 'b', role: 'BOTTOM', w: hw, h: D, position: [0, t / 2, D / 2], thickness: t }),
      panel({ id: 'l', role: 'LEFT_SIDE', w: D, h: H, position: [-sx, H / 2, D / 2], thickness: t }),
      panel({ id: 'r', role: 'RIGHT_SIDE', w: D, h: H, position: [sx, H / 2, D / 2], thickness: t }),
    ],
  } as unknown as Cabinet;
}

function quietGenerate(cab: Cabinet) {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    return generateMinifixDrillMap(cab);
  } finally {
    err.mockRestore();
    warn.mockRestore();
    log.mockRestore();
  }
}

describe('sweep withdraws the WHOLE joint, dowel sub-ids included (orphan-dowel hole)', () => {
  it('leaves no machining behind on 16mm material, where the 17.5mm bolt bore cannot fit', () => {
    const dm = quietGenerate(thinCarcassCab(16));

    const refusals = dm.manufacturabilityRefusals ?? [];
    expect(refusals.length, 'precondition: 17.5mm into 16mm must be refused').toBeGreaterThan(0);

    const survivors = (dm.panels ?? []).flatMap((p) =>
      (p.points ?? []).map((pt) => `${p.role}:${pt.purpose}:${pt.pairId ?? 'nopair'}`),
    );
    // A dowel whose parent connector was refused is machining for a joint the
    // system declined to build — the panel gets holes and no fixing.
    expect(survivors.filter((s) => s.includes('DOWEL')),
      'dowels ride on suffixed pairIds and must go with their parent connector').toEqual([]);
  });

  it('tells the user which Häfele article IS qualified for their 16mm panel', () => {
    // A correct refusal with no path forward is still a dead end, and 12/15/16mm
    // cores are offered in the material system. Häfele publishes a housing per
    // wood thickness from 12mm up (DGH-M 2021, HDE-en, 11/20 p.22 and p.24), so
    // the blocker can name the article instead of leaving the user stuck.
    const dm = quietGenerate(thinCarcassCab(16));
    const messages = (dm.manufacturabilityRefusals ?? []).map((r) => r.message).join(' | ');

    expect(messages, 'the qualified 16mm housing article').toContain('262.26.033');
    expect(messages, 'its bore depth, with the printed tolerance').toContain('12.5+0.5');
    expect(messages, 'and where that came from').toContain('DGH-M 2021');
    expect(messages, 'substituting it is the owner decision, not automatic')
      .toMatch(/owner decision/i);
    expect(messages, 'the refused depth is still stated as-is').toContain('17.5');
  });

  it('still emits the full joint on 18mm material — the refusal is not a blanket ban', () => {
    // Positive control. Without this, "no dowels" above could be satisfied by a
    // sweep that simply deletes everything.
    const dm = quietGenerate(thinCarcassCab(18));

    expect(dm.manufacturabilityRefusals ?? [], '17.5mm in 18mm leaves 0.5mm and is the normal case')
      .toEqual([]);
    const dowels = (dm.panels ?? []).flatMap((p) =>
      (p.points ?? []).filter((pt) => pt.purpose === 'DOWEL'),
    );
    expect(dowels.length, 'A-run corner dowels survive on standard material').toBeGreaterThan(0);
  });
});

describe('a bore that cannot be classified FAILS CLOSED (unadjudicable normals)', () => {
  const base = {
    ownerPanel: panel({
      id: 'back', role: 'BACK', w: W, h: H, position: [0, H / 2, 3], thickness: 6,
    }),
    purpose: 'BOLT' as never,
    diameterMm: 10,
    requiredDepthMm: 17.5,
    recipeSource: 'test',
    joint: 'PROBE',
  };

  it('refuses a ZERO normal instead of silently treating it as an edge bore', () => {
    const r = evaluateBlindBoreFeasibility({ ...base, boreAxisNormal: [0, 0, 0] });
    expect(r, 'a bore with no direction cannot be judged, so it must not pass').not.toBeNull();
    expect(r!.reasonCode).toBe('R_BORE_AXIS_UNDECLARED');
  });

  it('refuses a DIAGONAL normal — no dominant axis means no face/edge verdict', () => {
    const r = evaluateBlindBoreFeasibility({ ...base, boreAxisNormal: [1, 0, 1] });
    expect(r).not.toBeNull();
    expect(r!.reasonCode).toBe('R_BORE_AXIS_UNDECLARED');
  });

  it('accepts a clean axis-aligned normal (no new over-block)', () => {
    const ok = evaluateBlindBoreFeasibility({
      ...base,
      ownerPanel: panel({ id: 'l', role: 'LEFT_SIDE', w: D, h: H, position: [-291, H / 2, D / 2], thickness: 18 }),
      boreAxisNormal: [1, 0, 0],
    });
    expect(ok, '17.5mm into 18mm along a declared axis is the normal case').toBeNull();
  });
});

describe('a declared through hole is not a free pass', () => {
  let dm: ReturnType<typeof generateMinifixDrillMap>;
  beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('refuses a "through" bore that runs far past its own panel (undeclared overtravel)', () => {
    // 17.5mm through a 6mm panel means 11.5mm of tool travel beyond the part —
    // into the vacuum bed or clamp. There is no declared overtravel spec in the
    // repo, so this is refused rather than approximated.
    const r = evaluateBlindBoreFeasibility({
      ownerPanel: panel({ id: 'back', role: 'BACK', w: W, h: H, position: [0, H / 2, 3], thickness: 6 }),
      purpose: 'BOLT' as never,
      diameterMm: 10,
      requiredDepthMm: 17.5,
      recipeSource: 'test',
      joint: 'PROBE',
      boreAxisNormal: [0, 0, 1],
      throughHole: true,
    });
    expect(r).not.toBeNull();
    expect(r!.reasonCode).toBe('R_THROUGH_OVERTRAVEL_UNDECLARED');
  });

  it('no emitter in the repo sets throughHole, so nothing legitimate is blocked today', () => {
    dm = quietGenerate(thinCarcassCab(18));
    const flagged = (dm.panels ?? []).flatMap((p) => (p.points ?? []))
      .filter((pt) => (pt as { throughHole?: boolean }).throughHole === true);
    expect(flagged, 'if this ever fails, the rule above needs a declared overtravel spec')
      .toEqual([]);
  });
});
