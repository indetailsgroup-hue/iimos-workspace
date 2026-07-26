/**
 * The DXF exporter must refuse while a manufacturability refusal stands.
 *
 * Found by BOTH review vendors independently (2026-07-26):
 *  - GPT-5.6 Sol: "Direct DXF exporter ignores an explicit failed gate and can
 *    export a 17.5mm BACK bore into a 6mm panel" — exportDxfFromPacket checks
 *    the packet SHAPE but never the verdict.
 *  - Claude lens (gate-authority): ExportPanel's handleExport (ExportPanel.tsx:837)
 *    runs with no Safety-Gate check at all, so a non-waivable refusal does not
 *    stop delivery. It reads exportGate only to render a status line.
 *
 * The UI gate on GateToolbar was never the whole guarantee: it is one door.
 * The exporter itself is where the invariant has to live, because it is the only
 * point every caller passes through — the second UI surface, a test harness, a
 * script, a future integration.
 *
 * This is the same principle as the packet carrying its own NOT_FOR_PRODUCTION
 * notice: the artifact and the function that produces it must be authoritative,
 * not the screen that happens to sit in front of them.
 */

import { describe, it, expect } from 'vitest';
import { exportDxfFromPacket } from '../dxfExportFromOperationGraph';
import type { FactoryPacket } from '../../../factory/packet/types';

/** Minimal packet whose drill map carries a refusal, as buildDrillMapData now emits. */
function packetWithRefusal(): FactoryPacket {
  return {
    manifest: { jobId: 'job-refused', projectId: 'p', toolVersion: 't', files: [] },
    drillMap: {
      version: 'drillmap.v1',
      panels: [
        {
          panelId: 'l', cabinetId: 'cab', role: 'LEFT_SIDE',
          dimensions: [560, 720, 16],
          points: [],
        },
      ],
      summary: { totalDrills: 0, totalBores: 0, byPurpose: {}, byDiameter: {} },
      tools: [],
      manufacturabilityRefusals: [
        {
          reasonCode: 'R_BORE_EXITS_PANEL',
          joint: 'TOP_LEFT',
          ownerPanelId: 'l',
          ownerPanelRole: 'LEFT_SIDE',
          purpose: 'BOLT',
          diameterMm: 10,
          requiredDepthMm: 17.5,
          ownerThicknessMm: 16,
          recipeSource: 'MinifixConfig.boltBoreDepth',
          waivable: false,
          message: 'BOLT Ø10 needs 17.5mm but LEFT_SIDE l extends 16mm along X.',
        },
      ],
    },
    connectors: { version: 'connectors.v1', minifix: [], pairs: [] },
    cutList: { version: 'cutlist.v1', rows: [], summary: {} },
    gateResult: null,
  } as unknown as FactoryPacket;
}

describe('exportDxfFromPacket is fail-closed on manufacturability refusals', () => {
  it('REFUSES and delivers nothing when the drill map carries a refusal', async () => {
    const result = await exportDxfFromPacket(packetWithRefusal(), { machineId: 'GENERIC' });

    expect(result.ok, 'a refused joint must not become a shop drawing').toBe(false);
  });

  it('names the reason, the member and the depth — not a generic failure', async () => {
    const result = await exportDxfFromPacket(packetWithRefusal(), { machineId: 'GENERIC' });
    if (result.ok) throw new Error('expected refusal');

    const text = `${result.error} ${(result.details ?? []).join(' ')}`;
    expect(text).toMatch(/R_BORE_EXITS_PANEL/);
    expect(text, 'the depth is stated as-is, never reduced').toMatch(/17\.5/);
    expect(text).toMatch(/16/);
    expect(text, 'a non-waivable refusal must say so').toMatch(/waiv/i);
  });

  it('does NOT refuse a packet with no refusals — the guard is not a blanket ban', async () => {
    const clean = packetWithRefusal() as unknown as {
      drillMap: { manufacturabilityRefusals?: unknown };
    };
    delete clean.drillMap.manufacturabilityRefusals;

    const result = await exportDxfFromPacket(clean as unknown as FactoryPacket, { machineId: 'GENERIC' });
    // It may still fail for unrelated reasons (this fixture has no operations),
    // but it must NOT fail with the refusal guard.
    if (!result.ok) {
      expect(`${result.error} ${(result.details ?? []).join(' ')}`).not.toMatch(/R_BORE_EXITS_PANEL/);
    }
  });
});
