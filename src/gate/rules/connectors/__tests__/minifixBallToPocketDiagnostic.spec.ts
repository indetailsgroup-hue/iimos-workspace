/**
 * BALL_TO_POCKET diagnostic — truthfulness contract.
 *
 * Production calls `validateMinifixGate(drillMap)` with no options
 * (src/gate/ui/SafetyPanel.tsx:201), so solveMode is BALL_TO_POCKET, which sets
 * `ballCenter = targetCamCenter` verbatim (drillMapToMinifixPair.ts:156-162).
 * `validateYMatch` and `validateCoaxial` therefore both measure exactly zero in
 * production and can never fire. The INFO diagnostic emitted at the end of the
 * pair loop in validateMinifixConnector.ts is the ONLY thing that reports on
 * bolt/cam alignment for a real user, and it had four defects:
 *
 *   D1 — it measured against `pair.cam.geometry.pocketCenter` (camDepth/2 =
 *        6.75mm) while commit 075ceacf established the generator's truth as
 *        panelThickness/2 (= 9.0mm, "Dim A"; minifixDefaults.ts:55 camHeight: 9)
 *        and migrated the sibling cross-checks to a local `genPocketCenter`.
 *        Residue: a constant 9.0 - 6.75 = 2.25mm — see the same 2.25mm story
 *        pinned in gateG11_boltCamAlignment.test.ts:15-21.
 *   D2 — it triggered on an inline 1.0mm with no source, hiding the 0.20mm band
 *        the system actually declares (MINIFIX_TOLERANCES.Y_MISMATCH_MM /
 *        COAXIAL_RADIAL_MM, minifixConstraintTypes.ts:193-194).
 *   D3 — it reported a single 3-D magnitude, conflating the Y deviation, the
 *        radial (perpendicular-to-axis) deviation and the axial component that
 *        no rule penalises.
 *   D4 — it shared the code MONO_MINIFIX_POCKET_CENTER_MISMATCH with
 *        validateTargetPocketCenter's WARNING.
 *
 * Cabinet fixtures below are the generator-driven families already pinned in
 * src/gate/rules/__tests__/gateG11_boltCamAlignment.test.ts:49-191.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateMinifixGate,
  minifixYDeviation,
  minifixRadialDeviation,
  minifixAxialDeviation,
} from '../validateMinifixConnector';
import { findMinifixPairs } from '../drillMapToMinifixPair';
import { MINIFIX_TOLERANCES } from '../minifixConstraintTypes';
import type { MinifixGateFinding, Vec3 } from '../minifixConstraintTypes';
import { generateMinifixDrillMap } from '../../../../core/manufacturing/drillMap/generateDrillMap';
import type { DrillMap, DrillMapPoint } from '../../../../core/manufacturing/drillMap/types';
import type { Cabinet, CabinetPanel } from '../../../../core/types/Cabinet';
import { makeCam, makeBolt, onePanel } from './helpers/drillMapFactory';

const DIAG_CODE = 'MONO_MINIFIX_BALL_AUTOCORRECTED_TO_POCKET';
const CROSSCHECK_CODE = 'MONO_MINIFIX_POCKET_CENTER_MISMATCH';

/** 9.0 - 6.75: the dimA (panelThickness/2) vs camDepth/2 model error. */
const CONVENTION_ARTEFACT_MM = 18 / 2 - 13.5 / 2;

// ============================================
// FIXTURES — real cabinets through the real generator
// (copied from gateG11_boltCamAlignment.test.ts:49-191)
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

function createOverlayCabinet(withBack: boolean): Cabinet {
  const sideH = HEIGHT - 2 * THICKNESS;
  const sx = WIDTH / 2 - THICKNESS / 2;
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

function createInsetCabinet(): Cabinet {
  const horizW = WIDTH - 2 * THICKNESS + 2 * 9;
  const sx = horizW / 2 - 9 + THICKNESS / 2;
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

function generateMapSilently(cabinet: Cabinet): DrillMap {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dm = generateMinifixDrillMap(cabinet);
  err.mockRestore();
  warn.mockRestore();
  return dm;
}

function flatten(dm: DrillMap): DrillMapPoint[] {
  return dm.panels.flatMap(p => p.points);
}

function diagnostics(findings: MinifixGateFinding[]): MinifixGateFinding[] {
  return findings.filter(f => f.code === DIAG_CODE);
}

function tuple(t: readonly number[]): Vec3 {
  return { x: t[0], y: t[1], z: t[2] };
}

function offsetAlongNormal(p: DrillMapPoint, d: number): Vec3 {
  return {
    x: p.position[0] + p.normal[0] * d,
    y: p.position[1] + p.normal[1] * d,
    z: p.position[2] + p.normal[2] * d,
  };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ============================================
// D1 — the convention artefact must be gone on real cabinets
// ============================================

describe('D1: generator pocket-centre convention (panelThickness/2, not camDepth/2)', () => {
  for (const [family, build] of [
    ['INSET', createInsetCabinet],
    ['OVERLAY', () => createOverlayCabinet(false)],
    ['OVERLAY+back', () => createOverlayCabinet(true)],
  ] as const) {
    it(`${family}: no diagnostic carries the 2.25mm convention residue`, () => {
      const drillMap = generateMapSilently(build());
      const points = flatten(drillMap);

      // Non-vacuity 1: pairs actually existed and were examined.
      const pairs = findMinifixPairs(points);
      expect(pairs.length, `${family} must produce cam/bolt pairs`).toBeGreaterThan(0);

      const result = validateMinifixGate(drillMap);
      const diags = diagnostics(result.findings);
      const infos = result.findings.filter(f => f.severity === 'INFO');


      // Non-vacuity 2: on THIS cabinet the old camDepth/2 convention really did
      // fire on every pair, and the 2.25mm residue is a live quantity, not a
      // hypothetical. Because the cam normal is perpendicular to the bolt axis
      // in every generated joint family, that 2.25mm landed entirely in the
      // RADIAL component — a phantom coaxial error 11x the 0.20mm tolerance.
      const residues = pairs.map(({ cam, bolt }) => {
        const axis = tuple(bolt.boltDirection ?? bolt.normal);
        const A = tuple(bolt.position);
        const B: Vec3 = { x: A.x + axis.x * 9.5, y: A.y + axis.y * 9.5, z: A.z + axis.z * 9.5 };
        const cOld = offsetAlongNormal(cam, 13.5 / 2);
        const cGen = offsetAlongNormal(cam, THICKNESS / 2);
        return {
          axisY: Math.abs(axis.y),
          distAtoC: dist(A, cGen),
          oldGap: dist(B, cOld),
          oldRadial: minifixRadialDeviation(cOld, B, axis),
          conventionShift: dist(cOld, cGen),
          newY: minifixYDeviation(B, cGen),
          newRadial: minifixRadialDeviation(cGen, B, axis),
          newAxial: minifixAxialDeviation(B, cGen, axis),
        };
      });
      expect(
        residues.every(r => Math.abs(r.conventionShift - CONVENTION_ARTEFACT_MM) < 1e-9),
        `${family}: the two conventions must differ by exactly ${CONVENTION_ARTEFACT_MM}mm`,
      ).toBe(true);
      expect(
        residues.every(r => r.oldGap > 1.0),
        `${family}: every pair must have exceeded the old inline 1.0mm trigger`,
      ).toBe(true);
      expect(
        residues.every(r => Math.abs(r.oldRadial - CONVENTION_ARTEFACT_MM) < 1e-9),
        `${family}: the old convention injected exactly ${CONVENTION_ARTEFACT_MM}mm of phantom RADIAL error`,
      ).toBe(true);

      // THE FIX (D1). Under the generator's own convention the residual radial
      // deviation is exactly zero on every generated pair, because the generator
      // sets boltDirection = normalize(pocketCentre − boltOrigin): B lies ON the
      // axis through C by construction. The 2.25mm phantom is gone.
      expect(
        residues.every(r => r.newRadial < 1e-9),
        `${family}: radial deviation must be exactly zero under the generator convention`,
      ).toBe(true);
      for (const d of diags) {
        expect(d.measured?.radial_deviation_mm).toBeCloseTo(0, 9);
      }

      // The old INFO shared the cross-check's WARNING code — after the split
      // there must be no INFO left under that code.
      expect(
        result.findings.filter(f => f.code === CROSSCHECK_CODE && f.severity === 'INFO'),
        `${family}: the camDepth/2 artefact must no longer be reported under the cross-check code`,
      ).toEqual([]);

      // What REMAINS is not a convention artefact: it is purely the axial
      // shortfall of the ball-head offset, |9.5 − distance(A, C)|. That number
      // comes from ballHeadOffset = 9.5 (validateMinifixConnector.ts:867), which
      // has no cited source in this repo and contradicts ballHeadOffset: 0 in
      // minifixDefaults.ts:33. It is NOT gated: only its projection onto Y is,
      // via MINIFIX_TOLERANCES.Y_MISMATCH_MM — which is why the INSET family
      // (horizontal bolt axis, axis.y = 0) reports nothing while the OVERLAY
      // family (vertical bolt axis, axis.y = 1) reports the whole shortfall.
      expect(
        residues.every(r => Math.abs(Math.abs(r.newAxial) - Math.abs(9.5 - r.distAtoC)) < 1e-9),
        `${family}: the whole residual must be the ball-offset axial shortfall`,
      ).toBe(true);
      expect(
        residues.every(r => Math.abs(r.newY - r.axisY * Math.abs(r.newAxial)) < 1e-9),
        `${family}: the reported Y deviation must be the axial shortfall projected onto Y`,
      ).toBe(true);

      // The diagnostic fires exactly on the pairs whose declared tolerances are
      // exceeded — no more, no fewer.

      const expectedFiring = residues.filter(
        r => r.newY > MINIFIX_TOLERANCES.Y_MISMATCH_MM || r.newRadial > MINIFIX_TOLERANCES.COAXIAL_RADIAL_MM,
      ).length;
      expect(diags.length, `${family}: fires exactly on the out-of-tolerance pairs`).toBe(expectedFiring);
    });
  }
});

// ============================================
// D2 — the 0.20..1.00mm band the inline 1.0 was hiding
// ============================================

/**
 * cam at [0,100,0] normal [0,-1,0] on an 18mm panel → generator pocket centre
 * C = [0, 91, 0]. bolt drills along -X with an explicit boltDirection, so a
 * fixed-offset solve puts B = boltPos + boltDirection * 9.5.
 */
function offsetPair(ballTarget: Vec3, suffix: string) {
  const cam = makeCam({ id: `cam-${suffix}`, y: 100, pairedHoleId: `bolt-${suffix}` });
  const boltDirection: [number, number, number] = [-1, 0, 0];
  const bolt = makeBolt({
    id: `bolt-${suffix}`,
    position: [ballTarget.x + 9.5, ballTarget.y, ballTarget.z],
    normal: boltDirection,
    boltDirection,
  });
  bolt.depth = 12; // realistic bolt depth for an 18mm panel (leaves 6mm > 2mm min)
  return { cam, bolt };
}

describe('D2: deviations inside the declared 0.20mm band are reported', () => {
  it('a 0.5mm Y deviation is reported (the inline 1.0mm threshold hid it)', () => {
    // C = [0, 91, 0]; put B at [0, 91.5, 0] → Y deviation 0.5mm, 3-D gap 0.5mm.
    const { cam, bolt } = offsetPair({ x: 0, y: 91.5, z: 0 }, 'd2');
    const result = validateMinifixGate(onePanel([cam, bolt]));

    const diags = diagnostics(result.findings);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe('INFO');
    expect(diags[0].measured?.y_deviation_mm).toBeCloseTo(0.5, 9);
    // Deliberately inside the band the old inline threshold ignored.
    expect(diags[0].measured?.y_deviation_mm).toBeGreaterThan(MINIFIX_TOLERANCES.Y_MISMATCH_MM);
    expect(diags[0].measured?.y_deviation_mm).toBeLessThan(1.0);
    expect(diags[0].tolerance?.y_mismatch_mm).toBe(MINIFIX_TOLERANCES.Y_MISMATCH_MM);
    expect(diags[0].tolerance?.coaxial_radial_mm).toBe(MINIFIX_TOLERANCES.COAXIAL_RADIAL_MM);
  });

  it('a deviation under BOTH declared tolerances stays silent', () => {
    // 0.1mm in Y → below Y_MISMATCH_MM (0.20) and below COAXIAL_RADIAL_MM (0.20).
    const { cam, bolt } = offsetPair({ x: 0, y: 91.1, z: 0 }, 'd2q');
    const result = validateMinifixGate(onePanel([cam, bolt]));
    expect(diagnostics(result.findings)).toHaveLength(0);
  });
});

// ============================================
// D3 — components separated, computed the same way as the dead ERRORs
// ============================================

describe('D3: Y / radial / axial reported separately', () => {
  it('measured components equal the exported deviation helpers on the same input', () => {
    const { cam, bolt } = offsetPair({ x: 3, y: 91.5, z: 0 }, 'd3');
    const result = validateMinifixGate(onePanel([cam, bolt]));
    const diag = diagnostics(result.findings)[0];
    expect(diag, 'diagnostic must fire for this pair').toBeDefined();

    // Recompute B, C and the axis from the drill points, independent of the gate.
    const axis = tuple(bolt.boltDirection!);
    const A = tuple(bolt.position);
    const B: Vec3 = { x: A.x + axis.x * 9.5, y: A.y + axis.y * 9.5, z: A.z + axis.z * 9.5 };
    const C: Vec3 = {
      x: cam.position[0] + cam.normal[0] * (18 / 2),
      y: cam.position[1] + cam.normal[1] * (18 / 2),
      z: cam.position[2] + cam.normal[2] * (18 / 2),
    };

    expect(diag.measured?.y_deviation_mm).toBeCloseTo(minifixYDeviation(B, C), 9);
    expect(diag.measured?.radial_deviation_mm).toBeCloseTo(minifixRadialDeviation(C, B, axis), 9);
    expect(diag.measured?.axial_deviation_mm).toBeCloseTo(minifixAxialDeviation(B, C, axis), 9);
    // The legacy key must survive for downstream consumers.
    expect(diag.measured?.auto_correction_distance_mm).toBeGreaterThan(0);
  });

  it('components match what validateYMatch / validateCoaxial actually emit under FIXED_BALL_OFFSET', () => {
    const { cam, bolt } = offsetPair({ x: 3, y: 91.5, z: 0 }, 'd3b');
    const drillMap = onePanel([cam, bolt]);

    const diag = diagnostics(validateMinifixGate(drillMap).findings)[0];
    expect(diag).toBeDefined();

    // camDepth = 18 makes cam.geometry.pocketCenter land on dimA (18/2 = 9),
    // i.e. the same pocket centre the diagnostic uses, so the two ERROR rules
    // are measuring the identical B, C and axis.
    const fixed = validateMinifixGate(drillMap, { solveMode: 'FIXED_BALL_OFFSET', camDepth: 18 });
    const yErr = fixed.findings.find(f => f.code === 'MONO_MINIFIX_Y_MISMATCH');
    const coaxErr = fixed.findings.find(f => f.code === 'MONO_MINIFIX_NOT_COAXIAL');
    expect(yErr, 'FIXED_BALL_OFFSET must raise the Y ERROR').toBeDefined();
    expect(coaxErr, 'FIXED_BALL_OFFSET must raise the coaxial ERROR').toBeDefined();

    expect(diag.measured?.y_deviation_mm).toBeCloseTo(yErr!.measured!.delta_y_mm, 9);
    expect(diag.measured?.radial_deviation_mm).toBeCloseTo(coaxErr!.measured!.radial_offset_mm, 9);
  });
});

// ============================================
// D3b — the axial component gates nothing
// ============================================

describe('D3b: axial component is information only', () => {
  it('a purely axial deviation does NOT trip the Y/radial trigger', () => {
    // B on the bolt axis through C, 3mm short of it: Y dev = 0, radial = 0.
    const { cam, bolt } = offsetPair({ x: 3, y: 91, z: 0 }, 'ax');
    const result = validateMinifixGate(onePanel([cam, bolt]));
    expect(diagnostics(result.findings)).toHaveLength(0);
  });

  it('when the diagnostic does fire, the axial component is carried separately', () => {
    const { cam, bolt } = offsetPair({ x: 3, y: 91.5, z: 0 }, 'ax2');
    const diag = diagnostics(validateMinifixGate(onePanel([cam, bolt])).findings)[0];
    expect(diag).toBeDefined();
    // axis = [-1,0,0]; B - C = [3, 0.5, 0] → axial = -3.
    expect(diag.measured?.axial_deviation_mm).toBeCloseTo(-3, 9);
    expect(diag.measured?.y_deviation_mm).toBeCloseTo(0.5, 9);
    expect(diag.measured?.radial_deviation_mm).toBeCloseTo(0.5, 9);
    // No axial tolerance exists in the repo, so none is declared here.
    expect(diag.tolerance).not.toHaveProperty('axial_mm');
  });
});

// ============================================
// D4 — code collision
// ============================================

describe('D4: the two diagnostics no longer share a code', () => {
  it('MONO_MINIFIX_POCKET_CENTER_MISMATCH is now WARNING-only', () => {
    // Bolt declares a targetPocketCenter 5mm away from the computed one AND is
    // geometrically off, so both diagnostics have reason to fire.
    const { cam, bolt } = offsetPair({ x: 3, y: 91.5, z: 0 }, 'd4');
    bolt.targetPocketCenter = [0, 91 + 5, 0];

    const result = validateMinifixGate(onePanel([cam, bolt]));

    const crossChecks = result.findings.filter(f => f.code === CROSSCHECK_CODE);
    expect(crossChecks.length).toBeGreaterThan(0);
    expect(crossChecks.every(f => f.severity === 'WARNING')).toBe(true);

    const diags = diagnostics(result.findings);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags.every(f => f.severity === 'INFO')).toBe(true);

    // Filtering by either code alone now yields exactly one meaning.
    expect(new Set(result.findings.map(f => f.code))).toContain(DIAG_CODE);
    expect(result.findings.filter(f => f.code === CROSSCHECK_CODE && f.severity === 'INFO')).toEqual([]);
  });
});

// ============================================
// Message contract
// ============================================

describe('message states plainly what the diagnostic means', () => {
  it('names the auto-correction, the hypothetical fixed-offset solve, and that no ERROR can fire', () => {
    const { cam, bolt } = offsetPair({ x: 0, y: 91.5, z: 0 }, 'msg');
    const diag = diagnostics(validateMinifixGate(onePanel([cam, bolt])).findings)[0];
    expect(diag).toBeDefined();
    expect(diag.message).toMatch(/BALL_TO_POCKET/);
    expect(diag.message).toMatch(/FIXED_BALL_OFFSET/);
    expect(diag.message).toMatch(/no ERROR/i);
  });
});
