/**
 * Generated-cabinet fixtures for connector-gate blast-radius census.
 *
 * These build REAL cabinets and run the REAL drill-map generator
 * (generateMinifixDrillMap), so the drill points carry the generator's own
 * declared truth (boltDirection / targetPocketCenter) rather than
 * hand-authored test geometry.
 *
 * Cabinet geometry is copied from the committed A-run golden fixture
 * (src/core/manufacturing/drillMap/__tests__/drillMapGolden.ArunInset.test.ts),
 * parameterised over the construction family so the same cabinet can be
 * generated as INSET, OVERLAY, or with an OVERLAY back panel.
 */

import { generateMinifixDrillMap } from '../../../../../core/manufacturing/drillMap/generateDrillMap';
import type { Cabinet, CabinetPanel } from '../../../../../core/types/Cabinet';
import type { DrillMap } from '../../../../../core/manufacturing/drillMap/types';

// Reference cabinet — A-run 600×720×560, 18mm core.
// Definition site: drillMapGolden.ArunInset.test.ts:31-34.
export const FIXTURE_THICKNESS = 18;
const WIDTH = 600;
const HEIGHT = 720;
const DEPTH = 560;

export type ConstructionFamily = 'OVERLAY' | 'INSET' | 'BACK_PANEL';

function panel(
  id: string,
  role: CabinetPanel['role'],
  finishWidth: number,
  finishHeight: number,
  position: [number, number, number],
  thickness = FIXTURE_THICKNESS,
): CabinetPanel {
  return {
    id,
    role,
    name: id,
    finishWidth,
    finishHeight,
    coreMaterialId: 'core-1',
    faces: { faceA: null, faceB: null },
    edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: {
      realThickness: thickness,
      cutWidth: finishWidth,
      cutHeight: finishHeight,
      surfaceArea: 0,
      edgeLength: 0,
      cost: 0,
      co2: 0,
    },
    position,
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  } as unknown as CabinetPanel;
}

export function makeGeneratedCabinet(family: ConstructionFamily): Cabinet {
  const t = FIXTURE_THICKNESS;
  const horizontalPanelWidth = WIDTH - 2 * t + 2 * 9;
  const joint = family === 'OVERLAY' ? 'OVERLAY' : 'INSET';

  const panels: CabinetPanel[] = [
    panel('panel-top', 'TOP', horizontalPanelWidth, DEPTH, [0, HEIGHT - t / 2, DEPTH / 2]),
    panel('panel-bottom', 'BOTTOM', horizontalPanelWidth, DEPTH, [0, t / 2, DEPTH / 2]),
    panel('panel-left', 'LEFT_SIDE', DEPTH, HEIGHT, [-(horizontalPanelWidth / 2 - 9 + t / 2), HEIGHT / 2, DEPTH / 2]),
    panel('panel-right', 'RIGHT_SIDE', DEPTH, HEIGHT, [(horizontalPanelWidth / 2 - 9 + t / 2), HEIGHT / 2, DEPTH / 2]),
  ];

  if (family === 'BACK_PANEL') {
    panels.push(panel('panel-back', 'BACK', WIDTH, HEIGHT, [0, HEIGHT / 2, t / 2]));
  }

  return {
    id: `cabinet-${family}`,
    name: `Cabinet ${family}`,
    type: 'BASE',
    dimensions: { width: WIDTH, height: HEIGHT, depth: DEPTH, toeKickHeight: 100 },
    structure: {
      topJoint: joint,
      bottomJoint: joint,
      hasBackPanel: family === 'BACK_PANEL',
      backPanelConstruction: family === 'BACK_PANEL' ? 'overlay' : 'inset',
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
      backPanelConstruction: family === 'BACK_PANEL' ? 'overlay' : 'inset',
      backVoid: 20,
      backThickness: FIXTURE_THICKNESS,
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
    createdAt: 0,
    updatedAt: 0,
  } as unknown as Cabinet;
}

/** Generate a real DrillMap for a construction family. */
export function makeGeneratedDrillMap(family: ConstructionFamily): DrillMap {
  return generateMinifixDrillMap(makeGeneratedCabinet(family));
}

/** Findings-by-code census: `${severity}:${code}` → count. */
export function censusByCode(
  findings: Array<{ severity: string; code: string }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) {
    const key = `${f.severity}:${f.code}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
