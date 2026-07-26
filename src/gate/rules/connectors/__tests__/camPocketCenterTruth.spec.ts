/**
 * Cam pocket centre — the generator's convention, at the source.
 *
 * ## The defect this file pins
 *
 * `buildConnectorPairFromDrillPoints` built `cam.geometry.pocketCenter` from
 * `camDepth / 2` (6.75mm for the 13.5mm default). The generator does not use
 * that convention anywhere: every corner-joint path emits
 *
 *     camPocketCenter = camPosition + camNormal × (owningPanelThickness / 2)
 *
 * and stores it verbatim on the BOLT point as `targetPocketCenter`:
 *   - OVERLAY    generateDrillMap.ts:988-996   (side panel thickness / 2)
 *   - INSET      generateDrillMap.ts:1286-1297 (horizontal panel thickness / 2)
 *   - SHELF      generateDrillMap.ts:1670-1680 (shelf panel thickness / 2)
 *   - BACK PANEL generateDrillMap.ts:1933-1943 (side panel thickness / 2)
 *
 * For 18mm stock that is 9mm — Häfele "dim A", `minifixDefaults.ts:55`
 * (`camHeight: 9 — dimA`). The pair solver's 6.75mm was a constant
 * 18/2 − 13.5/2 = 2.25mm short along the cam normal.
 *
 * The repo has patched around this THREE times without touching the source
 * (075ceacf, 60b0a0ff/T10c, b361fb5e/T-DIAG). This file asserts the source.
 *
 * ## Non-vacuity
 *
 * Every assertion here runs against drill maps produced by the real
 * `generateMinifixDrillMap`, and each test asserts a pair count first.
 */

import { describe, it, expect } from 'vitest';
import {
  findMinifixPairs,
  buildConnectorPairFromDrillPoints,
} from '../drillMapToMinifixPair';
import { validateMinifixGate } from '../validateMinifixConnector';
import {
  flattenDrillMapPoints,
  buildValidationContext,
  getPanelThicknessForPoint,
} from '../drillMapIndex';
import { makeCam, makeBolt, makeDrillMap } from './helpers/drillMapFactory';
import {
  makeGeneratedDrillMap,
  censusByCode,
  FIXTURE_THICKNESS,
  type ConstructionFamily,
} from './helpers/generatedCabinetFixtures';

const FAMILIES: ConstructionFamily[] = ['OVERLAY', 'INSET', 'BACK_PANEL'];

/** Pairs the gate itself would build — same construction as validateMinifixConnector.ts:966-982. */
function buildPairsForFamily(family: ConstructionFamily, solveMode?: 'FIXED_BALL_OFFSET') {
  const drillMap = makeGeneratedDrillMap(family);
  const ctx = buildValidationContext(drillMap)!;
  const drillPairs = findMinifixPairs(flattenDrillMapPoints(drillMap));

  return drillPairs.map(({ cam, bolt }) => ({
    cam,
    bolt,
    pair: buildConnectorPairFromDrillPoints({
      camPoint: cam,
      boltPoint: bolt,
      // Gate defaults — validateMinifixConnector.ts:911-914.
      camDepth: 13.5,
      boltBallOffset: 9.5,
      boltBallDiameter: 7.0,
      panelHThickness: getPanelThicknessForPoint(ctx, cam, 18),
      panelVThickness: getPanelThicknessForPoint(ctx, bolt, 18),
      solveMode,
    }),
  }));
}

function dist(a: { x: number; y: number; z: number }, b: readonly [number, number, number]) {
  return Math.hypot(a.x - b[0], a.y - b[1], a.z - b[2]);
}

// ============================================================
// (1) THE SOURCE MUST CARRY THE GENERATOR'S DECLARED TRUTH
// ============================================================

describe('cam.geometry.pocketCenter === the generator’s declared pocket centre', () => {
  it.each(FAMILIES)('%s: every generated pair matches bolt.targetPocketCenter exactly', (family) => {
    const built = buildPairsForFamily(family);

    // Non-vacuity: pairs must exist and must actually carry the declared field.
    expect(built.length, `${family} produced no cam/bolt pairs`).toBeGreaterThan(0);
    expect(
      built.every(({ bolt }) => Array.isArray(bolt.targetPocketCenter)),
      `${family}: generator did not declare targetPocketCenter on every bolt`,
    ).toBe(true);

    const deviations = built.map(({ bolt, pair }) =>
      dist(pair.cam.geometry.pocketCenter, bolt.targetPocketCenter as [number, number, number]),
    );

    expect(Math.max(...deviations)).toBeCloseTo(0, 9);
  });

  it.each(FAMILIES)(
    '%s: the pocket centre sits at dim A = panelThickness/2 from the cam surface, not camDepth/2',
    (family) => {
      const built = buildPairsForFamily(family);
      expect(built.length).toBeGreaterThan(0);

      // dim A for 18mm stock = 9mm (minifixDefaults.ts:55 `camHeight: 9 — dimA`;
      // CAM_DRILLING_SPECS[18].dimA = 9, hardware/minifixDefaults.ts:47).
      const dimA = FIXTURE_THICKNESS / 2;

      for (const { cam, pair } of built) {
        const offset = Math.hypot(
          pair.cam.geometry.pocketCenter.x - cam.position[0],
          pair.cam.geometry.pocketCenter.y - cam.position[1],
          pair.cam.geometry.pocketCenter.z - cam.position[2],
        );
        expect(offset).toBeCloseTo(dimA, 9);
      }
    },
  );
});

// ============================================================
// (2) THE 2.25mm RESIDUE MUST BE GONE WHERE IT IS OBSERVABLE
// ============================================================

describe('the 2.25mm residue is gone from where it was measurable', () => {
  it.each(FAMILIES)(
    '%s: FIXED_BALL_OFFSET no longer reports a constant 2.25mm coaxial residual',
    (family) => {
      const drillMap = makeGeneratedDrillMap(family);
      const result = validateMinifixGate(drillMap, { solveMode: 'FIXED_BALL_OFFSET' });

      const coax = result.findings.filter((f) => f.code === 'MONO_MINIFIX_NOT_COAXIAL');
      const radials = coax.map((f) => f.measured?.radial_offset_mm as number);

      // Before the fix this was exactly 18/2 − 13.5/2 = 2.25 on every pair of
      // every family. The ball centre is solved along the generator's own
      // boltDirection, which points AT the declared pocket centre — so once the
      // pair carries that same centre the perpendicular residual is zero and the
      // rule cannot fire.
      expect(radials.filter((r) => Math.abs(r - 2.25) < 1e-6)).toHaveLength(0);
      expect(coax).toHaveLength(0);
    },
  );

  it.each(FAMILIES)(
    '%s: the bolt axis declared by the generator now points exactly at the pair’s pocket centre',
    (family) => {
      const drillMap = makeGeneratedDrillMap(family);
      const result = validateMinifixGate(drillMap, { solveMode: 'FIXED_BALL_OFFSET' });

      expect(
        result.findings.filter((f) => f.code === 'MONO_MINIFIX_BOLT_AXIS_NOT_POINTING'),
      ).toHaveLength(0);
    },
  );
});

// ============================================================
// (3) BLAST RADIUS — full findings-by-code census, per family
// ============================================================
//
// Measured on b361fb5e BEFORE the change (see report). Production mode is what
// SafetyPanel runs: validateMinifixGate(drillMap) with no options, i.e.
// solveMode BALL_TO_POCKET.
//
// MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL is PRE-EXISTING on every family and is
// independent of pocketCenter (it compares bolt.params.drillDepth 17.5mm — the
// Häfele S200 bolt bore, minifixDefaults.ts:44 — against the owning panel's
// 18mm). It is pinned here, not fixed here.

const PRODUCTION_CENSUS_BEFORE: Record<ConstructionFamily, Record<string, number>> = {
  OVERLAY: {
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 12,
    'INFO:MONO_MINIFIX_BALL_AUTOCORRECTED_TO_POCKET': 12,
  },
  INSET: {
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 12,
  },
  BACK_PANEL: {
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 18,
  },
};

const FIXED_CENSUS_BEFORE: Record<ConstructionFamily, Record<string, number>> = {
  OVERLAY: {
    'ERROR:MONO_MINIFIX_BOLT_AXIS_NOT_POINTING': 12,
    'ERROR:MONO_MINIFIX_NOT_COAXIAL': 12,
    'ERROR:MONO_MINIFIX_Y_MISMATCH': 12,
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 12,
  },
  INSET: {
    'ERROR:MONO_MINIFIX_BOLT_AXIS_NOT_POINTING': 12,
    'ERROR:MONO_MINIFIX_NOT_COAXIAL': 12,
    'ERROR:MONO_MINIFIX_Y_MISMATCH': 12,
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 12,
  },
  BACK_PANEL: {
    'ERROR:MONO_MINIFIX_BOLT_AXIS_NOT_POINTING': 18,
    'ERROR:MONO_MINIFIX_NOT_COAXIAL': 18,
    'ERROR:MONO_MINIFIX_Y_MISMATCH': 12,
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 18,
  },
};

// Measured AFTER. Every delta is a REMOVAL: 108 ERROR findings that fired on
// geometry the generator considers correct, purely because the pair solver
// disagreed with the generator about where the pocket is.
//   OVERLAY    −12 BOLT_AXIS_NOT_POINTING, −12 NOT_COAXIAL
//   INSET      −12 BOLT_AXIS_NOT_POINTING, −12 NOT_COAXIAL, −12 Y_MISMATCH
//   BACK_PANEL −18 BOLT_AXIS_NOT_POINTING, −18 NOT_COAXIAL, −12 Y_MISMATCH
// Nothing was added anywhere.
const FIXED_CENSUS_AFTER: Record<ConstructionFamily, Record<string, number>> = {
  OVERLAY: {
    // Survives: the ball offset (9.5mm) does not reach the pocket in OVERLAY
    // geometry. Independent of the pocket-centre convention — the OVERLAY cam
    // normal is ±X, so moving the pocket along it does not change its Y at all.
    'ERROR:MONO_MINIFIX_Y_MISMATCH': 12,
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 12,
  },
  INSET: {
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 12,
  },
  BACK_PANEL: {
    'ERROR:MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL': 18,
  },
};

describe('blast radius: no NEW blocking finding on generator-correct geometry', () => {
  it.each(FAMILIES)('%s: production-mode census is unchanged, code for code', (family) => {
    const drillMap = makeGeneratedDrillMap(family);
    const result = validateMinifixGate(drillMap);
    const pairs = findMinifixPairs(flattenDrillMapPoints(drillMap));

    expect(pairs.length, 'census would be vacuous with no pairs').toBeGreaterThan(0);
    expect(censusByCode(result.findings)).toEqual(PRODUCTION_CENSUS_BEFORE[family]);
  });

  it.each(FAMILIES)('%s: FIXED_BALL_OFFSET adds no code and increases no count', (family) => {
    const drillMap = makeGeneratedDrillMap(family);
    const after = censusByCode(
      validateMinifixGate(drillMap, { solveMode: 'FIXED_BALL_OFFSET' }).findings,
    );
    const before = FIXED_CENSUS_BEFORE[family];

    for (const [code, count] of Object.entries(after)) {
      expect(before[code], `NEW finding code appeared: ${code}`).toBeDefined();
      expect(count, `count grew for ${code}`).toBeLessThanOrEqual(before[code]);
    }

    // …and pin exactly what is left, so a future regression cannot hide inside
    // "no worse than before".
    expect(after).toEqual(FIXED_CENSUS_AFTER[family]);
  });
});

// ============================================================
// (4) THE DIAG-002 CROSS-CHECK MUST NOT BECOME TAUTOLOGICAL
// ============================================================
//
// validateMinifixConnector.ts:1001-1012 recomputes `genPocketCenter` locally and
// compares the generator's DECLARED targetPocketCenter against it. Now that the
// pair also carries the declared value, that local recomputation is the only
// remaining INDEPENDENT witness. If it were replaced by the pair's pocketCenter
// the rule would compare declared against declared and could never fire.

describe('MONO_MINIFIX_POCKET_CENTER_MISMATCH still has an independent witness', () => {
  it('genPocketCenter and the fixed source agree EXACTLY when nothing is declared', () => {
    // Equivalence proof for the tier-2 branch: both are
    // camPosition + camNormal × (camPanelThickness / 2), off the same inputs.
    const cam = makeCam({ id: 'cam-eq', y: 100, pairedHoleId: 'bolt-eq' });
    const bolt = makeBolt({ id: 'bolt-eq', y: 91, normal: [-1, 0, 0] }); // no targetPocketCenter
    const drillMap = makeDrillMap([
      { panelId: 'panel-A', points: [cam] },
      { panelId: 'panel-B', points: [bolt] },
    ]);
    const ctx = buildValidationContext(drillMap)!;
    const camPanelThickness = getPanelThicknessForPoint(ctx, cam, 18);

    const { pair } = {
      pair: buildConnectorPairFromDrillPoints({
        camPoint: cam,
        boltPoint: bolt,
        camDepth: 13.5,
        boltBallOffset: 9.5,
        boltBallDiameter: 7.0,
        panelHThickness: camPanelThickness,
        panelVThickness: getPanelThicknessForPoint(ctx, bolt, 18),
      }),
    };

    // Verbatim copy of validateMinifixConnector.ts:1001-1005.
    const genPocketCenter = {
      x: cam.position[0] + cam.normal[0] * (camPanelThickness / 2),
      y: cam.position[1] + cam.normal[1] * (camPanelThickness / 2),
      z: cam.position[2] + cam.normal[2] * (camPanelThickness / 2),
    };

    expect(pair.cam.geometry.pocketCenter).toEqual(genPocketCenter);
  });

  it('…but they DIVERGE on a contradictory declaration, which is why genPocketCenter stays', () => {
    // Tier 1 makes the pair carry the DECLARED value verbatim. genPocketCenter
    // keeps recomputing from geometry. Substituting one for the other would
    // make DIAG-001/DIAG-002 compare declared against declared — always zero.
    const cam = makeCam({ id: 'cam-div', y: 100, pairedHoleId: 'bolt-div' });
    const bolt = makeBolt({
      id: 'bolt-div',
      y: 91,
      normal: [-1, 0, 0],
      targetPocketCenter: [0, 86, 0], // 5mm from the geometric truth [0, 91, 0]
    });
    const drillMap = makeDrillMap([
      { panelId: 'panel-A', points: [cam] },
      { panelId: 'panel-B', points: [bolt] },
    ]);
    const ctx = buildValidationContext(drillMap)!;
    const camPanelThickness = getPanelThicknessForPoint(ctx, cam, 18);

    const pair = buildConnectorPairFromDrillPoints({
      camPoint: cam,
      boltPoint: bolt,
      camDepth: 13.5,
      boltBallOffset: 9.5,
      boltBallDiameter: 7.0,
      panelHThickness: camPanelThickness,
      panelVThickness: getPanelThicknessForPoint(ctx, bolt, 18),
    });

    expect(pair.cam.geometry.pocketCenter).toEqual({ x: 0, y: 86, z: 0 });
    expect(cam.position[1] + cam.normal[1] * (camPanelThickness / 2)).toBe(91);
  });

  it('fires when the generator declares a pocket centre that its own geometry contradicts', () => {
    const cam = makeCam({ id: 'cam-1', y: 100, pairedHoleId: 'bolt-1' }); // normal [0,-1,0]
    const bolt = makeBolt({
      id: 'bolt-1',
      y: 91,
      normal: [-1, 0, 0],
      // Truth for an 18mm panel is [0, 91, 0]. Declare it 5mm wrong.
      targetPocketCenter: [0, 86, 0],
    });
    const drillMap = makeDrillMap([
      { panelId: 'panel-A', points: [cam] },
      { panelId: 'panel-B', points: [bolt] },
    ]);

    const result = validateMinifixGate(drillMap);
    const mismatch = result.findings.filter(
      (f) => f.code === 'MONO_MINIFIX_POCKET_CENTER_MISMATCH',
    );

    expect(mismatch, 'the cross-check went tautological').toHaveLength(1);
    expect(mismatch[0].measured?.distance_mm).toBeCloseTo(5, 6);
  });
});
