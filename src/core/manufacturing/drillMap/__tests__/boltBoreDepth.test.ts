/**
 * boltBoreDepth.test.ts
 *
 * Regression tests for the sleeveLength vs boltBoreDepth disambiguation.
 *
 * Background:
 * - sleeveLength = 14.25mm (physical sleeve cylinder length for assembly/3D preview)
 *   B = ballHead/2 (3.25) + neck (6.5) + sleeve (14.25) = 24mm
 * - boltBoreDepth = 17.5mm (bolt hole drilling depth per Häfele S200)
 *
 * The bug: generateDrillMap.ts used `config.sleeveLength` for BOLT point depth.
 * When assembly config (sleeveLength=14.25) was passed, bolt holes were 2.75mm too shallow.
 * Fix: Use `config.boltBoreDepth ?? 17.5` — always falls back to Häfele constant.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_MINIFIX_S200_CONFIG } from '../minifixDefaults';
import {
  getMinifixDefaultConfig,
  getMinifixFullConfigForThickness,
} from '../../hardware/minifixDefaults';
import { generateMinifixDrillMap } from '../generateDrillMap';
import type { Cabinet, CabinetPanel } from '../../../types/Cabinet';

// ============================================
// CONSTANTS
// ============================================

/** Häfele S200 bolt drilling depth (manufacturing domain) */
const HAFELE_BOLT_BORE_DEPTH = 17.5;

/** Physical sleeve cylinder length (assembly domain) */
const ASSEMBLY_SLEEVE_LENGTH = 14.25;

// ============================================
// DrillMap defaults (manufacturing domain)
// ============================================

describe('DrillMap DEFAULT_MINIFIX_S200_CONFIG', () => {
  it('should have boltBoreDepth = 17.5mm', () => {
    expect(DEFAULT_MINIFIX_S200_CONFIG.boltBoreDepth).toBe(HAFELE_BOLT_BORE_DEPTH);
  });

  it('should have sleeveLength = 17.5mm (backward compat, drillMap domain)', () => {
    // In the drillMap defaults, sleeveLength was historically 17.5
    // (the manufacturing value). Kept for backward compat.
    expect(DEFAULT_MINIFIX_S200_CONFIG.sleeveLength).toBe(17.5);
  });

  it('should have camDepth = 13.5mm for default 18mm wood', () => {
    expect(DEFAULT_MINIFIX_S200_CONFIG.camDepth).toBe(13.5);
  });
});

// ============================================
// Hardware defaults (assembly domain)
// ============================================

describe('Hardware getMinifixDefaultConfig', () => {
  it('should include boltBoreDepth = 17.5mm for any wood thickness', () => {
    const config18 = getMinifixDefaultConfig(18);
    expect(config18.boltBoreDepth).toBe(HAFELE_BOLT_BORE_DEPTH);
  });

  it('should have sleeveLength = 14.25mm (assembly sleeve length)', () => {
    const config18 = getMinifixDefaultConfig(18);
    expect(config18.sleeveLength).toBe(ASSEMBLY_SLEEVE_LENGTH);
  });

  it('should return correct camDepth per wood thickness', () => {
    expect(getMinifixDefaultConfig(16).camDepth).toBe(12.5);
    expect(getMinifixDefaultConfig(18).camDepth).toBe(13.5);
    expect(getMinifixDefaultConfig(19).camDepth).toBe(14.0);
  });
});

describe('Hardware getMinifixFullConfigForThickness', () => {
  it('should include boltBoreDepth = 17.5mm', () => {
    const full = getMinifixFullConfigForThickness(18);
    expect(full.boltBoreDepth).toBe(HAFELE_BOLT_BORE_DEPTH);
  });

  it('should have sleeveLength = 14.25mm (assembly)', () => {
    const full = getMinifixFullConfigForThickness(18);
    expect(full.sleeveLength).toBe(ASSEMBLY_SLEEVE_LENGTH);
  });

  it('boltBoreDepth and sleeveLength should be different values', () => {
    const full = getMinifixFullConfigForThickness(18);
    expect(full.boltBoreDepth).not.toBe(full.sleeveLength);
    expect(full.boltBoreDepth).toBe(17.5);
    expect(full.sleeveLength).toBe(14.25);
  });
});

// ============================================
// Config merge simulation (the actual bug path)
// ============================================

describe('Config merge: assembly config should NOT corrupt drill depth', () => {
  /**
   * Simulates what generateDrillMap does at line 768:
   *   const fullConfig = { ...DEFAULT_MINIFIX_CONFIG, ...config };
   * Then at line 463 (FIXED):
   *   depth: config.boltBoreDepth ?? 17.5
   */
  const DEFAULT_MINIFIX_CONFIG_DRILL = {
    sleeveLength: 17.5,
    boltBoreDepth: 17.5,
    camDepth: 13.5,
  };

  it('assembly config with sleeveLength=14.25 should NOT affect bolt bore depth', () => {
    // This is the bug scenario: UI/HardwareLibrary config passed to generateDrillMap
    const assemblyConfig = {
      sleeveLength: 14.25,
      boltBoreDepth: 17.5,  // Now explicitly set in all assembly configs
    };

    const merged = { ...DEFAULT_MINIFIX_CONFIG_DRILL, ...assemblyConfig };

    // The FIXED line: config.boltBoreDepth ?? 17.5
    const boltDepth = merged.boltBoreDepth ?? 17.5;
    expect(boltDepth).toBe(HAFELE_BOLT_BORE_DEPTH);
    // sleeveLength is overwritten (14.25) but NOT used for drilling
    expect(merged.sleeveLength).toBe(14.25);
  });

  it('old config WITHOUT boltBoreDepth should fall back to 17.5mm', () => {
    // Legacy config that only has sleeveLength
    const legacyConfig = {
      sleeveLength: 14.25,
      // NO boltBoreDepth field
    };

    const merged = { ...DEFAULT_MINIFIX_CONFIG_DRILL, ...legacyConfig };

    // Even though sleeveLength is wrong, boltBoreDepth from defaults survives
    // because spread only overrides keys that are present in the source
    const boltDepth = merged.boltBoreDepth ?? 17.5;
    expect(boltDepth).toBe(HAFELE_BOLT_BORE_DEPTH);
  });

  it('explicitly undefined boltBoreDepth should fall back to 17.5mm', () => {
    const configWithUndefined = {
      sleeveLength: 14.25,
      boltBoreDepth: undefined as number | undefined,
    };

    const merged = { ...DEFAULT_MINIFIX_CONFIG_DRILL, ...configWithUndefined };

    // undefined ?? 17.5 = 17.5
    const boltDepth = merged.boltBoreDepth ?? 17.5;
    expect(boltDepth).toBe(HAFELE_BOLT_BORE_DEPTH);
  });

  it('CAM depth should still vary by wood thickness after merge', () => {
    const config16mm = { camDepth: 12.5 };
    const merged16 = { ...DEFAULT_MINIFIX_CONFIG_DRILL, ...config16mm };
    expect(merged16.camDepth).toBe(12.5);

    const config19mm = { camDepth: 14.0 };
    const merged19 = { ...DEFAULT_MINIFIX_CONFIG_DRILL, ...config19mm };
    expect(merged19.camDepth).toBe(14.0);
  });
});

// ============================================
// Gate validation constants
// ============================================

describe('Gate G11 constants should distinguish sleeve vs bore', () => {
  // Import inline to avoid test coupling if gate types change
  it('BOLT_SLEEVE_DEPTH (drilling) should be 17.5mm', async () => {
    const { G11_CONSTANTS } = await import('../../../../gate/rules/gateG11_types');
    expect(G11_CONSTANTS.BOLT_SLEEVE_DEPTH).toBe(17.5);
  });

  it('BOLT_SLEEVE_LENGTH (assembly) should be 14.25mm', async () => {
    const { G11_CONSTANTS } = await import('../../../../gate/rules/gateG11_types');
    expect(G11_CONSTANTS.BOLT_SLEEVE_LENGTH).toBe(14.25);
  });

  it('BOLT_SLEEVE_DEPTH should NOT equal BOLT_SLEEVE_LENGTH', async () => {
    const { G11_CONSTANTS } = await import('../../../../gate/rules/gateG11_types');
    expect(G11_CONSTANTS.BOLT_SLEEVE_DEPTH).not.toBe(G11_CONSTANTS.BOLT_SLEEVE_LENGTH);
  });
});

// ============================================================================
// F-07 [P0] — thin overlay back must NOT receive impossible blind bores
// ============================================================================
/**
 * Review finding F-07 (2026-07-20 full-scrutinize):
 *   "Overlay-back connector generation can auto-enable and place back-owned
 *    17.5 mm and 11 mm blind bores even when the back is 6 mm. Reducing the
 *    depth would invent a nonfunctional fixing. The correct outcome is zero
 *    operations plus a blocker unless an exact compatible recipe exists."
 *
 * Owner rule: ห้ามลดความลึกให้ดูเหมือนผ่าน — no depth reduction, no relocation,
 * no relabeling. Unsupported construction emits NOTHING and refuses.
 *
 * The 17.5 mm constant asserted above stays as the Häfele S200 recipe value —
 * the fix is that the recipe is REFUSED on a 6 mm member, not rescaled.
 */

const F07_T = 18, F07_W = 600, F07_H = 720, F07_D = 560;

function f07Panel(o: {
  id: string; role: CabinetPanel['role']; w: number; h: number;
  position: [number, number, number]; thickness?: number;
}): CabinetPanel {
  const t = o.thickness ?? F07_T;
  return {
    id: o.id, role: o.role, name: o.id, finishWidth: o.w, finishHeight: o.h, coreMaterialId: 'c',
    faces: { faceA: null, faceB: null }, edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: { realThickness: t, cutWidth: o.w, cutHeight: o.h, surfaceArea: 0, edgeLength: 0, cost: 0, co2: 0 },
    position: o.position, rotation: [0, 0, 0], visible: true, selected: false,
  } as CabinetPanel;
}

/** Overlay-back cabinet whose BACK panel is `backThickness` mm thick. */
function overlayBackCabinet(backThickness: number): Cabinet {
  const hw = F07_W - 2 * F07_T;
  const sx = F07_W / 2 - F07_T / 2;
  const sideW = F07_D - backThickness;
  const carcassZ = F07_D / 2 + backThickness / 2;
  return {
    id: `cab-overlay-back-${backThickness}`, name: 'cab', type: 'BASE',
    dimensions: { width: F07_W, height: F07_H, depth: F07_D, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'overlay', backPanelInset: 6, shelfCount: 0, dividerCount: 0,
    },
    materials: { defaultCore: 'c', defaultSurface: 's', defaultEdge: 'e' },
    panels: [
      f07Panel({ id: 't', role: 'TOP', w: hw, h: sideW, position: [0, F07_H - F07_T / 2, carcassZ] }),
      f07Panel({ id: 'b', role: 'BOTTOM', w: hw, h: sideW, position: [0, F07_T / 2, carcassZ] }),
      f07Panel({ id: 'l', role: 'LEFT_SIDE', w: sideW, h: F07_H, position: [-sx, F07_H / 2, carcassZ] }),
      f07Panel({ id: 'r', role: 'RIGHT_SIDE', w: sideW, h: F07_H, position: [sx, F07_H / 2, carcassZ] }),
      f07Panel({
        id: 'back', role: 'BACK', w: F07_W, h: F07_H,
        position: [0, F07_H / 2, backThickness / 2], thickness: backThickness,
      }),
    ],
  } as unknown as Cabinet;
}

describe('F-07: 6mm overlay back panel refuses impossible blind bores', () => {
  it('emits ZERO back-owned connector operations (no 17.5mm / 11mm bore in a 6mm panel)', () => {
    const map = generateMinifixDrillMap(overlayBackCabinet(6));

    const backPanel = map.panels.find((p) => p.panelId === 'back');
    const backOps = (backPanel?.points ?? []).map(
      (pt) => `${pt.purpose} Ø${pt.diameter} D${pt.depth}`,
    );

    // joined form so the RED output shows every impossible bore verbatim
    expect(backOps.join('\n')).toBe('');
  });

  it('emits ZERO side-owned operations for the BACK joint (no half-joint)', () => {
    const map = generateMinifixDrillMap(overlayBackCabinet(6));

    const backJointOps = map.panels
      .flatMap((p) => p.points)
      .filter((pt) => pt.cornerType === 'BACK_LEFT' || pt.cornerType === 'BACK_RIGHT')
      .map((pt) => `${pt.panelId}:${pt.purpose} Ø${pt.diameter} D${pt.depth}`);

    expect(backJointOps).toEqual([]);
  });

  it('records a STRUCTURED, machine-readable refusal (not a console.warn)', () => {
    const map = generateMinifixDrillMap(overlayBackCabinet(6));

    const refusals = map.manufacturabilityRefusals ?? [];
    expect(refusals.length).toBeGreaterThan(0);

    const boltRefusal = refusals.find((r) => r.purpose === 'BOLT');
    expect(boltRefusal).toBeDefined();
    expect(boltRefusal!.reasonCode).toBe('R_BLIND_BORE_EXCEEDS_MEMBER_THICKNESS');
    expect(boltRefusal!.ownerPanelId).toBe('back');
    expect(boltRefusal!.ownerPanelRole).toBe('BACK');
    expect(boltRefusal!.requiredDepthMm).toBe(17.5);
    expect(boltRefusal!.ownerThicknessMm).toBe(6);
    expect(boltRefusal!.recipeSource).toBe('MinifixConfig.boltBoreDepth');
    expect(boltRefusal!.joint).toBe('BACK_OVERLAY');
    expect(boltRefusal!.waivable).toBe(false);

    // The 11mm bolt-thread pilot (the review's second impossible bore) and the
    // back-face dowel are refused by the same rule.
    const threadRefusal = refusals.find((r) => r.purpose === 'BOLT_THREAD');
    expect(threadRefusal).toBeDefined();
    expect(threadRefusal!.requiredDepthMm).toBe(11);
    expect(threadRefusal!.recipeSource).toBe('MinifixConfig.shaftLength');

    const dowelRefusal = refusals.find((r) => r.purpose === 'DOWEL');
    expect(dowelRefusal).toBeDefined();
    expect(dowelRefusal!.requiredDepthMm).toBe(12);
    expect(dowelRefusal!.recipeSource).toBe('MinifixConfig.dowelDepthSideFace');
  });

  it('does NOT reduce, relocate, or relabel any depth to make the joint pass', () => {
    const map = generateMinifixDrillMap(overlayBackCabinet(6));
    const allPoints = map.panels.flatMap((p) => p.points);

    // No point anywhere may be hosted by the 6mm back panel.
    expect(allPoints.filter((pt) => pt.panelId === 'back')).toEqual([]);
    // No depth was rescaled to squeeze into 6mm.
    expect(allPoints.filter((pt) => pt.depth <= 6 && pt.depth > 0)).toEqual([]);
  });
});

describe('F-07 positive control: 18mm overlay back keeps its Häfele S200 bores', () => {
  it('17.5mm bolt bore in an 18mm back panel is NOT refused (0.5mm margin is legal)', () => {
    const map = generateMinifixDrillMap(overlayBackCabinet(18));

    const backPanel = map.panels.find((p) => p.panelId === 'back');
    expect(backPanel, 'BACK panel must still receive connector points').toBeDefined();

    const boltDepths = backPanel!.points.filter((p) => p.purpose === 'BOLT').map((p) => p.depth);
    expect(boltDepths.length).toBeGreaterThan(0);
    expect(new Set(boltDepths)).toEqual(new Set([HAFELE_BOLT_BORE_DEPTH]));

    expect(map.manufacturabilityRefusals ?? []).toEqual([]);
  });
});
