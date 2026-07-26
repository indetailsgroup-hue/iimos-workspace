/**
 * cabinetToDxf.cutDimLabel.test.ts — T4 label truth (fix/dxf-truth-chain)
 *
 * DEFECT: cabinetPanelToProduction stamps cutDim.t with the OPTION-LEVEL
 * coreThickness (default 18) while finishDim.t honestly uses the panel's own
 * computed.realThickness. A 25mm-core shelf therefore gets a cut label that
 * claims t=18 — the dev-preview DXF lies about the panel's core.
 *
 * FIX UNDER TEST: cutDim.t = the PANEL'S OWN core material thickness
 * (Truth Module getCoreThickness(panel.coreMaterialId)), falling back to the
 * option-level value only when the registry does not know the material.
 *
 * NOTE: cabinetToDxf stays a dev-preview tool (Q1=A) — this fixes its label
 * honesty only; it is NOT re-admitted to user-facing export paths.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { cabinetPanelToProduction } from '../cabinetToDxf';
import { initMaterialRegistries } from '../../materials/materialThickness';
import type { Cabinet, CabinetPanel } from '../../types/Cabinet';

beforeAll(() => {
  // Minimal Truth Module registry: one 25mm core, one 18mm core, one surface.
  initMaterialRegistries(
    {
      'core-pb-25': { id: 'core-pb-25', thickness: 25 },
      'core-pb-18': { id: 'core-pb-18', thickness: 18 },
    },
    {
      'surf-mel-white': { id: 'surf-mel-white', thickness: 0.8 },
    },
  );
});

function shelfPanel(coreMaterialId: string, realThickness: number): CabinetPanel {
  return {
    id: 'shelf-1',
    name: 'Shelf 1',
    role: 'SHELF',
    finishWidth: 564,
    finishHeight: 510,
    coreMaterialId,
    faces: { faceA: 'surf-mel-white', faceB: 'surf-mel-white' },
    edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: {
      realThickness,
      cutWidth: 564,
      cutHeight: 510,
      surfaceArea: 0,
      edgeLength: 0,
      cost: 0,
      co2: 0,
    },
    position: [0, 360, 268],
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  } as CabinetPanel;
}

function cab(panels: CabinetPanel[]): Cabinet {
  return {
    id: 'cab-label',
    name: 'Label Truth Cab',
    type: 'BASE',
    dimensions: { width: 600, height: 720, depth: 560, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: false,
      backPanelConstruction: 'inset', backPanelInset: 6, shelfCount: 1, dividerCount: 0,
    },
    materials: { defaultCore: 'core-pb-18', defaultSurface: 'surf-mel-white', defaultEdge: 'e' },
    panels,
  } as unknown as Cabinet;
}

describe('cabinetToDxf cutDim.t label truth (dev-preview tool, per-panel core)', () => {
  it('stamps cutDim.t with the PANEL\'S OWN core thickness (25mm core panel on an 18mm-default cabinet)', () => {
    const panel = shelfPanel('core-pb-25', 26.6); // real = 25 + 0.8 + 0.8
    const data = cabinetPanelToProduction(panel, cab([panel]), {});

    // finishDim.t was already honest (panel.computed.realThickness)
    expect(data.finishDim.t).toBe(26.6);
    // THE FIX: cut label must state the panel's own 25mm core — not the
    // option-level default 18.
    expect(data.cutDim.t).toBe(25);
  });

  it('falls back to the option-level coreThickness when the registry does not know the material', () => {
    const panel = shelfPanel('core-unknown-material', 18);
    const data = cabinetPanelToProduction(panel, cab([panel]), { coreThickness: 18 });
    expect(data.cutDim.t).toBe(18);
  });
});
