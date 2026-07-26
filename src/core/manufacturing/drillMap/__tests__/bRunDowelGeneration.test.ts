/**
 * B-Run Dowel RETIREMENT pin — owner ruling Q6=A (2026-07-26)
 *
 * The B-run vertical dowel system is RETIRED. This file is no longer a
 * generation contract — it is a permanent pin that the generator emits
 * ZERO B-run points, on both joint families:
 *   - flush INSET  (the fixture family of the golden snapshot)
 *   - flush OVERLAY (store geometry, fixture from cornerEngineFlip.test.ts)
 *
 * Ruling rationale on record (docs/SPECS-RECONCILIATION-NOTES.md entry
 * "B-run vertical dowel retired (Q6=A, 2026-07-26)"):
 *   - Born broken: original emitter produced off-panel side bores and
 *     duplicate world positions.
 *   - Corrected geometry (Q4=A) collides with the Minifix bolt channels
 *     at all 4 corners (verified from golden coordinates).
 *   - Physically feasible only for OVERLAY tops; flush INSET = junk holes
 *     on the show rim; rabbeted INSET = zero web.
 *   - Never consumer-visible: render-hidden in 3D, excluded from corner
 *     engine parity, no shipped export consumed it.
 *   - A-run cam+bolt+dowel already secures the corners.
 *
 * Retained on purpose (harmless compat, G3 may sweep later):
 *   - pairKeyV2 '-B' vocabulary (historical keys must keep parsing)
 *   - validateBRunDowelPairing.ts validator source (historical data)
 *   - Cabinet3D brun render filters, ConnectorList suffix handling
 */

import { describe, test, expect, vi } from 'vitest';
import * as drillMapModule from '../generateDrillMap';
import { generateMinifixDrillMap } from '../generateDrillMap';
import { isRunAxis } from '../pairKeyV2';
import type { Cabinet, CabinetPanel } from '../../../types/Cabinet';
import type { DrillMapPoint } from '../types';

// ============================================
// FIXTURES
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

function cabinetShell(joint: 'INSET' | 'OVERLAY', panels: CabinetPanel[]): Cabinet {
  return {
    id: 'test-cabinet',
    name: 'Test Cabinet',
    type: 'BASE',
    dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH, toeKickHeight: 100 },
    structure: {
      topJoint: joint,
      bottomJoint: joint,
      hasBackPanel: false,
      backPanelConstruction: 'inset',
      backPanelInset: 6,
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
      backPanelConstruction: 'inset',
      backVoid: 20,
      backThickness: 6,
      safetyGap: 2,
    },
    panels,
    computed: {
      totalCost: 0,
      totalCO2: 0,
      panelCount: panels.length,
      totalSurfaceArea: 0,
      totalEdgeLength: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as Cabinet;
}

/** Rabbeted INSET 600×720×560 18mm — same geometry as the golden fixture */
function createInsetCabinet(): Cabinet {
  const hw = WIDTH - 2 * THICKNESS + 2 * 9; // 582
  const sx = hw / 2 - 9 + THICKNESS / 2; // 291
  return cabinetShell('INSET', [
    basePanel({ id: 'panel-top', role: 'TOP', w: hw, h: DEPTH, position: [0, HEIGHT - THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-bottom', role: 'BOTTOM', w: hw, h: DEPTH, position: [0, THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-left', role: 'LEFT_SIDE', w: DEPTH, h: HEIGHT, position: [-sx, HEIGHT / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-right', role: 'RIGHT_SIDE', w: DEPTH, h: HEIGHT, position: [sx, HEIGHT / 2, DEPTH / 2] }),
  ]);
}

/** Flush OVERLAY store geometry — fixture family of cornerEngineFlip.test.ts */
function createOverlayCabinet(): Cabinet {
  const hw = WIDTH; // 600: horizontals span full width
  const sideH = HEIGHT - 2 * THICKNESS; // 684
  const sx = WIDTH / 2 - THICKNESS / 2; // 291
  return cabinetShell('OVERLAY', [
    basePanel({ id: 'panel-top', role: 'TOP', w: hw, h: DEPTH, position: [0, HEIGHT - THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-bottom', role: 'BOTTOM', w: hw, h: DEPTH, position: [0, THICKNESS / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-left', role: 'LEFT_SIDE', w: DEPTH, h: sideH, position: [-sx, HEIGHT / 2, DEPTH / 2] }),
    basePanel({ id: 'panel-right', role: 'RIGHT_SIDE', w: DEPTH, h: sideH, position: [sx, HEIGHT / 2, DEPTH / 2] }),
  ]);
}

// ============================================
// B-RUN DETECTION (belt and suspenders)
// ============================================

/**
 * A point is B-run-tagged if ANY of its keys carries B-run vocabulary:
 *   - canonical pairKeyV2 axis parse (isRunAxis(key, 'B') → '-B-' tag)
 *   - legacy pairId namespace 'pair-B-'
 *   - the '-brun-' suffix used by the retired emitter on both key kinds
 */
function isBRunTagged(p: DrillMapPoint): boolean {
  const pairId = p.pairId ?? '';
  const keyV2 = p.pairKeyV2 ?? '';
  return (
    isRunAxis(keyV2, 'B') ||
    pairId.startsWith('pair-B-') ||
    pairId.includes('-B-') ||
    pairId.includes('-brun-') ||
    keyV2.includes('-brun-')
  );
}

function generateAllPoints(cabinet: Cabinet): DrillMapPoint[] {
  // Silence DEV-only handover/geometry logs — this pin is about emitted points
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dm = generateMinifixDrillMap(cabinet);
  err.mockRestore();
  warn.mockRestore();
  return dm.panels.flatMap(p => p.points);
}

// ============================================
// RETIREMENT PIN
// ============================================

describe('B-run vertical dowel retirement (owner ruling Q6=A 2026-07-26)', () => {
  test('module exports the retirement marker B_RUN_RETIRED = "Q6-A 2026-07-26"', () => {
    // Namespace access (not named import) so a missing export is a clean
    // assertion failure instead of a module-link error.
    expect(
      (drillMapModule as Record<string, unknown>).B_RUN_RETIRED,
      'generateDrillMap.ts must export const B_RUN_RETIRED documenting the ruling',
    ).toBe('Q6-A 2026-07-26');
  });

  test.each([
    ['flush INSET (golden fixture family)', createInsetCabinet],
    ['flush OVERLAY (store geometry)', createOverlayCabinet],
  ])('%s: generator emits ZERO B-run-tagged points', (_label, makeCabinet) => {
    const allPoints = generateAllPoints(makeCabinet());

    // Guard against a vacuous pass: the map must still be a real drill map
    // with A-run output (cam+bolt+dowel corners survive the retirement).
    expect(allPoints.length, 'drill map must not be empty').toBeGreaterThan(0);
    expect(
      allPoints.filter(p => p.purpose === 'DOWEL' && isRunAxis(p.pairKeyV2 ?? '', 'A')).length,
      'A-run dowels must still be generated',
    ).toBeGreaterThan(0);

    const bRun = allPoints.filter(isBRunTagged);
    expect(
      bRun.map(p => `${p.pairId} / ${p.pairKeyV2}`),
      'B-run is retired (Q6=A 2026-07-26) — no point may carry B-run keys',
    ).toEqual([]);
    expect(bRun).toHaveLength(0);
  });

  test('pairKeyV2 B vocabulary itself is retained for historical keys', () => {
    // The retirement removes the EMITTER, not the vocabulary: stored maps
    // with '-B-' keys must keep parsing (see pairKeyV2.ts PAIR_KEY_V2_RE).
    expect(isRunAxis('pair2-TOP_LEFT-B-37-dowel-brun-side', 'B')).toBe(true);
    expect(isRunAxis('pair2-TOP_LEFT-37-dowel-side', 'B')).toBe(false);
  });
});
