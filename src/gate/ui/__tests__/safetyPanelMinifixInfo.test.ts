/**
 * SafetyPanel — the Minifix gate's INFO findings must reach the UI.
 *
 * WHAT WAS BROKEN
 * ---------------
 * `runGateValidation` (SafetyPanel.tsx) built `findings.info` from THREE
 * sources only: `shadowInfo`, the G11 rules, and the connector audit. Every
 * INFO finding produced by `validateMinifixGate` was dropped on the floor —
 * including `MONO_MINIFIX_BALL_AUTOCORRECTED_TO_POCKET`, which commit b361fb5e
 * had just made truthful and which is the ONLY bolt/cam alignment report a
 * production user can ever see (BALL_TO_POCKET pins ballCenter onto the pocket
 * centre, so MONO_MINIFIX_Y_MISMATCH / MONO_MINIFIX_NOT_COAXIAL both measure
 * exactly zero and can never fire), and
 * `MONO_MINIFIX_POINT_STATUS_PROPAGATED`.
 *
 * WHY THIS IS A PURE-FUNCTION TEST, NOT A COMPONENT TEST
 * -----------------------------------------------------
 * React component tests in this repo have a known-flaky environment. The
 * producer -> consumer conversion is therefore exercised the way commit
 * d38dbde2 exercised `minifixFindingToBlockerFinding`: through a pure function
 * in SafetyPanel.tsx (`buildGateResult`) that IS the conversion
 * `runGateValidation` performs — `runGateValidation` now does nothing but read
 * the two stores and hand the values to it.
 *
 * Fixtures are the generator-driven cabinet families already pinned in
 * src/gate/rules/connectors/__tests__/minifixBallToPocketDiagnostic.spec.ts and
 * src/gate/rules/__tests__/gateG11_boltCamAlignment.test.ts — real cabinets
 * through the real generator, not hand-authored drill points.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildGateResult } from '../SafetyPanel';
import { validateMinifixGate } from '../../rules/connectors/validateMinifixConnector';
import { validateG11FromDrillMap } from '../../rules/gateG11_minifixSystem32';
import { runConnectorOsAudit } from '../../rules/gateG11_connectorAudit';
import { generateMinifixDrillMap } from '../../../core/manufacturing/drillMap/generateDrillMap';
import type { DrillMap, DrillMapPoint } from '../../../core/manufacturing/drillMap/types';
import type { Cabinet, CabinetPanel } from '../../../core/types/Cabinet';
import {
  makeValidPairWithFields,
  onePanelWithThickness,
} from '../../rules/connectors/__tests__/helpers/drillMapFactory';

const DIAG_CODE = 'MONO_MINIFIX_BALL_AUTOCORRECTED_TO_POCKET';

// ============================================
// FIXTURES — real cabinets through the real generator
// (copied verbatim from minifixBallToPocketDiagnostic.spec.ts:49-191)
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

/** The exact call production makes (SafetyPanel: no options, CAD_STANDARD density). */
function buildFor(cabinet: Cabinet) {
  const drillMap = generateMapSilently(cabinet);
  const result = buildGateResult(drillMap, { cabinet, connectorDensity: 'CAD_STANDARD' });
  return { drillMap, result };
}

// ============================================
// 1. THE INFO FINDING REACHES THE UI WITH ITS NUMBERS
// ============================================

describe('SafetyPanel — Minifix INFO findings reach findings.info', () => {
  it('surfaces MONO_MINIFIX_BALL_AUTOCORRECTED_TO_POCKET with its measured payload intact', () => {
    const { drillMap, result } = buildFor(createOverlayCabinet(true));

    // The producer really does emit it — otherwise this test proves nothing.
    const produced = validateMinifixGate(drillMap).findings.filter(f => f.code === DIAG_CODE);
    expect(produced.length).toBeGreaterThan(0);

    const surfaced = result.findings.info.filter(f => f.code === DIAG_CODE);
    expect(surfaced.length).toBe(produced.length);

    for (const f of surfaced) {
      expect(f.severity).toBe('INFO');
      // The value of this diagnostic is entirely in its numbers. A finding that
      // reaches the UI without them is noise, not a surfaced finding.
      expect(f.context).toBeDefined();
      expect(typeof f.context!.y_deviation_mm).toBe('number');
      expect(typeof f.context!.radial_deviation_mm).toBe('number');
      expect(typeof f.context!.axial_deviation_mm).toBe('number');
      expect(typeof f.context!.auto_correction_distance_mm).toBe('number');
      // ... and the declared tolerances it is measured against, folded into
      // context exactly the way minifixFindingToBlockerFinding folds them.
      expect(typeof f.context!.y_mismatch_mm).toBe('number');
      expect(typeof f.context!.coaxial_radial_mm).toBe('number');
      // The diagnostic carries no suggestedFix, so no "Fix" button may appear
      // on it: FindingCard renders one whenever `patch` is non-empty, and an
      // INFO that reports rather than refuses must not offer a fix.
      expect(f.patch).toBeUndefined();
    }

    // Byte-for-byte agreement with the producer, per finding.
    for (const p of produced) {
      const key = `${p.code}:${p.entityIds.join(',')}`;
      const ui = surfaced.find(f => f.key === key);
      expect(ui, `no UI finding for producer key ${key}`).toBeDefined();
      expect(ui!.message).toBe(p.message);
      expect(ui!.entityIds).toEqual(p.entityIds);
      expect(ui!.context).toEqual({ ...(p.measured ?? {}), ...(p.tolerance ?? {}) });
    }
  });

  it('surfaces every Minifix INFO finding, not just the alignment diagnostic', () => {
    const { drillMap, result } = buildFor(createOverlayCabinet(true));
    const producedInfoCodes = new Set(
      validateMinifixGate(drillMap).findings.filter(f => f.severity === 'INFO').map(f => f.code),
    );
    const surfacedCodes = new Set(result.findings.info.map(f => f.code));
    for (const code of producedInfoCodes) {
      expect(surfacedCodes.has(code), `Minifix INFO code ${code} never reaches the UI`).toBe(true);
    }
  });

  it('surfaces MONO_MINIFIX_POINT_STATUS_PROPAGATED (the generator cabinets never emit it)', () => {
    // The generator families above produce only the alignment diagnostic, so
    // the OTHER Minifix INFO code needs a point that already carries a status.
    const { cam, bolt } = makeValidPairWithFields('sp');
    bolt.status = 'WARNING';
    bolt.statusMessage = 'pre-existing status from an earlier stage';
    const drillMap = onePanelWithThickness([cam, bolt], 18);

    const produced = validateMinifixGate(drillMap).findings.filter(
      f => f.code === 'MONO_MINIFIX_POINT_STATUS_PROPAGATED',
    );
    expect(produced.length).toBeGreaterThan(0);

    const result = buildGateResult(drillMap, { cabinet: null, connectorDensity: 'CAD_STANDARD' });
    const surfaced = result.findings.info.filter(
      f => f.code === 'MONO_MINIFIX_POINT_STATUS_PROPAGATED',
    );
    expect(surfaced.length).toBe(produced.length);
    expect(surfaced[0].severity).toBe('INFO');
    expect(surfaced[0].entityIds).toEqual([bolt.id]);
    // measured survives the hop.
    expect(surfaced[0].context).toEqual({ ...(produced[0].measured ?? {}) });
  });
});

// ============================================
// 2. THE WIRING CHANGES NOTHING THAT BLOCKS
// ============================================

describe('SafetyPanel — surfacing INFO must not change the verdict', () => {
  it('leaves passed, the blocker set and metrics.errors/warnings byte-identical', () => {
    for (const cabinet of [createOverlayCabinet(true), createOverlayCabinet(false)]) {
      const { drillMap, result } = buildFor(cabinet);

      // Recompute the pre-change contract straight from the three producers.
      const minifix = validateMinifixGate(drillMap);
      const g11 = validateG11FromDrillMap(drillMap);
      const audit = runConnectorOsAudit(drillMap, 'STANDARD', 'CAD_STANDARD');

      expect(result.passed).toBe(
        minifix.status === 'PASS' && g11.status === 'PASS' && audit.status === 'PASS',
      );
      expect(result.metrics!.errors).toBe(
        minifix.summary.errors + g11.summary.blockers + audit.summary.blockers,
      );
      expect(result.metrics!.warnings).toBe(
        minifix.summary.warnings + g11.summary.warnings + audit.summary.warnings,
      );

      const expectedBlockers =
        minifix.findings.filter(f => f.severity === 'ERROR').length +
        g11.issues.filter(i => i.severity === 'BLOCKER').length +
        audit.issues.filter(i => i.severity === 'BLOCKER').length;
      expect(result.findings.blockers.length).toBe(expectedBlockers);

      const expectedWarnings =
        minifix.findings.filter(f => f.severity === 'WARNING').length +
        g11.issues.filter(i => i.severity === 'WARNING').length +
        audit.issues.filter(i => i.severity === 'WARNING').length;
      expect(result.findings.warnings.length).toBe(expectedWarnings);

      // No INFO ever leaks into a bucket that blocks or warns.
      for (const f of [...result.findings.blockers, ...result.findings.warnings]) {
        expect(f.severity).not.toBe('INFO');
      }
      for (const f of result.findings.info) {
        expect(f.severity).toBe('INFO');
      }
    }
  });

  it('pins the OVERLAY-with-back verdict to its pre-change values', () => {
    // Recorded from buildGateResult BEFORE the INFO wiring landed (see the
    // RED run in this task's report). Anything but info.length may not move.
    const { result } = buildFor(createOverlayCabinet(true));
    expect(result.passed).toBe(PRE_CHANGE.passed);
    expect(result.findings.blockers.length).toBe(PRE_CHANGE.blockers);
    expect(result.findings.warnings.length).toBe(PRE_CHANGE.warnings);
    expect(result.metrics!.errors).toBe(PRE_CHANGE.errors);
    expect(result.metrics!.warnings).toBe(PRE_CHANGE.warnings_metric);
    expect(result.findings.blockers.map(f => f.key).sort()).toEqual(PRE_CHANGE.blockerKeys);
  });
});

// ============================================
// 3. DUPLICATES — one row per pair, deliberately NOT collapsed
// ============================================

describe('SafetyPanel — one diagnostic row per pair', () => {
  it('keeps each pair individually inspectable with a unique key', () => {
    const { drillMap, result } = buildFor(createOverlayCabinet(true));
    const produced = validateMinifixGate(drillMap).findings.filter(f => f.code === DIAG_CODE);
    const surfaced = result.findings.info.filter(f => f.code === DIAG_CODE);

    // Not collapsed: one row per emitted instance.
    expect(surfaced.length).toBe(produced.length);

    // Every key is unique, so React's list key never collides and no row is
    // silently swallowed by the renderer.
    const keys = surfaced.map(f => f.key);
    expect(new Set(keys).size).toBe(keys.length);

    // The messages ARE byte-identical across pairs — the thing that makes each
    // row worth keeping is the entityIds, which name a different bolt/cam pair
    // and drive the Focus action.
    const messages = new Set(surfaced.map(f => f.message));
    expect(messages.size).toBe(1);
    const entitySets = new Set(surfaced.map(f => f.entityIds.join(',')));
    expect(entitySets.size).toBe(surfaced.length);

    // Every entity named is a real drill point id in this map.
    const realIds = new Set(flatten(drillMap).map(p => p.id));
    for (const f of surfaced) {
      expect(f.entityIds.length).toBe(2);
      for (const id of f.entityIds) expect(realIds.has(id)).toBe(true);
    }
  });
});

// ============================================
// 4. VOLUME — INFO row count, before vs after
// ============================================

describe('SafetyPanel — INFO volume', () => {
  it('reports the INFO row count for a normal cabinet, before vs after', () => {
    const cases: Array<[string, Cabinet]> = [
      ['overlay-with-back', createOverlayCabinet(true)],
      ['overlay-no-back', createOverlayCabinet(false)],
      ['inset-a-run', createInsetCabinet()],
    ];
    for (const [name, cabinet] of cases) {
      const { drillMap, result } = buildFor(cabinet);
      const minifixInfo = validateMinifixGate(drillMap).findings.filter(f => f.severity === 'INFO');
      // Before the wiring, info held only shadow + G11 + audit entries.
      const nonMinifix = result.findings.info.filter(
        f => !minifixInfo.some(m => `${m.code}:${m.entityIds.join(',')}` === f.key),
      );
      // eslint-disable-next-line no-console
      console.log(
        `[INFO VOLUME] ${name}: before=${nonMinifix.length} after=${result.findings.info.length} ` +
          `(minifix INFO added = ${minifixInfo.length}, of which ${DIAG_CODE} = ` +
          `${minifixInfo.filter(f => f.code === DIAG_CODE).length})`,
      );
      expect(result.findings.info.length).toBe(nonMinifix.length + minifixInfo.length);
    }
  });
});

/**
 * Pre-change verdict for the OVERLAY-with-back generator cabinet, recorded
 * from `buildGateResult` BEFORE the Minifix-INFO wiring landed (RED run of
 * this task). These 18 MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL blockers are
 * pre-existing behaviour of this fixture, NOT something the wiring created —
 * they are pinned here precisely so that surfacing INFO cannot move them.
 * Only `findings.info.length` was allowed to change.
 */
const PRE_CHANGE = {
  passed: false,
  blockers: 18,
  warnings: 0,
  errors: 18,
  warnings_metric: 0,
  blockerKeys: [
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BACK_LEFT-0',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BACK_LEFT-1',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BACK_LEFT-2',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BACK_RIGHT-0',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BACK_RIGHT-1',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BACK_RIGHT-2',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BOTTOM_LEFT-0',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BOTTOM_LEFT-1',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BOTTOM_LEFT-2',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BOTTOM_RIGHT-0',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BOTTOM_RIGHT-1',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-BOTTOM_RIGHT-2',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-TOP_LEFT-0',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-TOP_LEFT-1',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-TOP_LEFT-2',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-TOP_RIGHT-0',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-TOP_RIGHT-1',
    'MONO_MINIFIX_BOLT_DEPTH_EXCEEDS_PANEL:bolt-TOP_RIGHT-2',
  ] as string[],
};
