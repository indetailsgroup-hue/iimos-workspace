/**
 * The packet must carry the generator's REFUSALS, not just its operations.
 *
 * F-07 made generateDrillMap refuse a fastener recipe that cannot physically
 * exist in the panel that would own it — a 17.5mm blind bore into a 6mm back
 * panel. The refused joint emits zero machining features on purpose, and the
 * reason is recorded on the DrillMap as `manufacturabilityRefusals`.
 *
 * `buildDrillMapData` (builders/buildDrillMap.ts:210) copies panels, summary
 * and tools — and drops the refusals. So `drillmap.json`, the shop-facing
 * artifact that gets hashed into the packet manifest, is byte-identical
 * between two very different cabinets:
 *
 *   (a) a cabinet whose back panel legitimately needs no machining, and
 *   (b) a cabinet whose back joint the system REFUSED to produce because
 *       building it as specified would drill straight through the panel.
 *
 * Reading (b) as (a) is the exact failure the refusal mechanism exists to
 * prevent — "an empty panel must never read as nothing needed" — and the
 * Safety Gate blocking the in-app export does not help a packet that was
 * already built, archived and hashed. The artifact has to declare its own
 * status, the same reason the DXF ZIP now carries NOT_FOR_PRODUCTION.txt.
 */

import { describe, it, expect } from 'vitest';
import { buildDrillMapData, buildDrillMapJson } from '../builders/buildDrillMap';
import type { DrillMap } from '../../../core/manufacturing/drillMap/types';

/** A map shaped like the one generateDrillMap returns for a refused 6mm back. */
function refusedMap(): DrillMap {
  return {
    panels: [
      // The back panel is present in the cabinet but owns NO operations —
      // exactly what makes the refusal invisible without a record.
      { panelId: 'back', cabinetId: 'cab', role: 'BACK',
        dimensions: { width: 600, height: 720, thickness: 6 }, points: [] },
    ],
    manufacturabilityRefusals: [
      {
        reasonCode: 'R_BLIND_BORE_EXCEEDS_MEMBER_THICKNESS',
        joint: 'BACK_OVERLAY',
        corner: 'BACK_LEFT',
        ownerPanelId: 'back',
        ownerPanelRole: 'BACK',
        purpose: 'BOLT',
        diameterMm: 10,
        requiredDepthMm: 17.5,
        ownerThicknessMm: 6,
        recipeSource: 'MinifixConfig.boltBoreDepth',
        waivable: false,
        message:
          'BOLT Ø10 needs a 17.5mm blind bore but BACK back is only 6mm thick — ' +
          'the bore would break through.',
      },
    ],
  } as unknown as DrillMap;
}

describe('factory packet carries manufacturability refusals (F-07)', () => {
  it('records the refusal in the packet drill map, not only on the in-memory DrillMap', () => {
    const data = buildDrillMapData(refusedMap());

    expect(
      data.manufacturabilityRefusals,
      'drillmap.json is the shop-facing artifact — the refusal has to survive into it',
    ).toBeDefined();
    expect(data.manufacturabilityRefusals!.length).toBe(1);

    const r = data.manufacturabilityRefusals![0];
    expect(r.reasonCode).toBe('R_BLIND_BORE_EXCEEDS_MEMBER_THICKNESS');
    expect(r.requiredDepthMm, 'depth recorded as-is, never reduced').toBe(17.5);
    expect(r.ownerThicknessMm).toBe(6);
    expect(r.waivable).toBe(false);
  });

  it('distinguishes a REFUSED cabinet from one that simply needs no machining', () => {
    // This is the whole point: without the field these two serialize identically.
    const refused = buildDrillMapJson(refusedMap());
    const nothingNeeded = buildDrillMapJson({
      panels: [{ panelId: 'back', cabinetId: 'cab', role: 'BACK',
                 dimensions: { width: 600, height: 720, thickness: 6 }, points: [] }],
    } as unknown as DrillMap);

    expect(refused).not.toBe(nothingNeeded);
    expect(refused).toContain('R_BLIND_BORE_EXCEEDS_MEMBER_THICKNESS');
  });

  it('omits the field entirely when nothing was refused — no noise on clean cabinets', () => {
    const clean = buildDrillMapData({
      panels: [{ panelId: 'l', cabinetId: 'cab', role: 'LEFT_SIDE',
                 dimensions: { width: 560, height: 720, thickness: 18 }, points: [] }],
    } as unknown as DrillMap);

    expect(clean.manufacturabilityRefusals).toBeUndefined();
  });

  it('stays deterministic — same input, byte-identical JSON', () => {
    expect(buildDrillMapJson(refusedMap())).toBe(buildDrillMapJson(refusedMap()));
  });

  it('handles a null drill map without inventing a refusal record', () => {
    expect(buildDrillMapData(null).manufacturabilityRefusals).toBeUndefined();
  });
});
