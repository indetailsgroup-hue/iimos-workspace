/**
 * @vitest-environment jsdom
 */

/**
 * GateToolbar.dxfExport.test.tsx — T4 (fix/dxf-truth-chain)
 *
 * Owner ruling Q1=A: quickDxfExport/quickDxfExportAll are RETIRED from user
 * paths (dev-preview only — they produced the non-manufacturable Ø5-only
 * files). The toolbar's DXF menu item must go through the packet path:
 *   generateFactoryPacketPreviewFromStores → exportDxfFromPacket
 *   → downloadDxfZipFromPacket
 * passing panelPlacements built from the live store cabinet panels
 * (p.id + p.position), and it must surface a VISIBLE error when
 * result.skipped.length > 0 (fail-closed — never silently deliver bore-less
 * sheets) and a VISIBLE scope message for >1 cabinets (the store drill map is
 * generated from the ACTIVE cabinet only — Cabinet3D.tsx:1352 — so multi-
 * cabinet coverage must never narrow silently; S0 finding).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

// ─── Mutable store state (hoisted so vi.mock factories can close over it) ───
const h = vi.hoisted(() => {
  const panel = (id: string, position: [number, number, number]) => ({
    id,
    role: 'LEFT_SIDE',
    name: id,
    position,
    finishWidth: 560,
    finishHeight: 720,
    coreMaterialId: 'core-pb-18',
    faces: { faceA: null, faceB: null },
    edges: { top: null, bottom: null, left: null, right: null },
    grainDirection: 'HORIZONTAL',
    computed: { realThickness: 18, cutWidth: 560, cutHeight: 720, surfaceArea: 0, edgeLength: 0, cost: 0, co2: 0 },
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  });
  const cabinetA = {
    id: 'cab-a',
    name: 'Cabinet A',
    panels: [panel('p1', [-291, 360, 280]), panel('p2', [291, 360, 280])],
  };
  const cabinetB = {
    id: 'cab-b',
    name: 'Cabinet B',
    panels: [panel('p3', [0, 9, 280])],
  };
  const previewFixture = {
    jobId: 'job-1',
    createdAt: 0,
    manifest: {
      schema: 'monolith.factory.packet@1.0', version: '1.0.0', jobId: 'job-1',
      projectId: 'proj', createdAt: '', toolVersion: 't', files: [], contentHash: 'h',
    },
    files: [],
    parsed: {
      drillmap: {
        version: 'drillmap.v1',
        panels: [{ panelId: 'p1', cabinetId: 'cab-a', role: 'LEFT_SIDE', dimensions: [560, 720, 18], points: [] }],
        summary: { totalDrills: 0, totalBores: 0, byPurpose: {}, byDiameter: {} },
        tools: [],
      },
      connectorsMinifix: { version: 'connectors.v1', minifix: [], summary: { totalPairs: 0, validPairs: 0, warningPairs: 0, errorPairs: 0 } },
      cutlist: { version: 'cutlist.v1', rows: [], summary: { totalRows: 0, totalParts: 0, byMaterial: {} } },
      gateResult: {
        version: 'gate.v1', policyVersion: '1', passed: true, runAt: '',
        findings: { blockers: [], warnings: [], info: [] },
        summary: { blockerCount: 0, warningCount: 0, infoCount: 0 },
      },
    },
    contentHash: 'h',
    totalBytes: 0,
  };
  return {
    cabinetA,
    cabinetB,
    previewFixture,
    cabState: { cabinets: [cabinetA] as unknown[], cabinet: cabinetA as unknown },
  };
});

// ─── Spec store: FROZEN, export enabled ───
vi.mock('../../../core/store/useSpecStore', () => ({
  useSpecStore: vi.fn((sel: (s: Record<string, unknown>) => unknown) =>
    sel({
      freezeSpec: vi.fn(),
      releaseSpec: vi.fn(),
      unfreezeSpec: vi.fn(),
      runValidation: vi.fn(),
      canExport: () => true,
    })),
  useSpecState: () => 'FROZEN',
  useGateStatus: () => ({ canFreeze: false, canRelease: true, canExport: true, blockers: [] }),
  useValidation: () => null,
  useMachineProfile: () => ({
    id: 'kdt-nesting', name: 'KDT KN-2408', maxWidth: 2440, maxHeight: 1220, cncPresetId: 'KDT',
  }),
}));

// ─── Cabinet store ───
vi.mock('../../../core/store/useCabinetStore', () => ({
  useCabinetStore: vi.fn((sel: (s: Record<string, unknown>) => unknown) => sel(h.cabState)),
}));

// ─── Legacy dev-preview exporters (must NOT be reachable from the toolbar) ───
vi.mock('../../../core/export/exportPipeline', () => ({
  quickDxfExport: vi.fn().mockResolvedValue(undefined),
  quickDxfExportAll: vi.fn().mockResolvedValue(undefined),
}));

// ─── Factory packet module (implementations re-armed in beforeEach —
// vi.restoreAllMocks() in afterEach wipes factory-set implementations) ───
vi.mock('../../../factory/packet', () => ({
  generateFactoryPacketFromStores: vi.fn(),
  generateFactoryPacketPreviewFromStores: vi.fn(),
  buildCutListData: vi.fn(),
}));

vi.mock('../../../factory/packet/builders', () => ({
  buildCutListData: vi.fn().mockReturnValue({ rows: [], summary: {} }),
}));
vi.mock('../../../factory/packet/cutListCsv', () => ({
  downloadCutListCsv: vi.fn(),
}));

// ─── Packet DXF path (T3) ───
vi.mock('../../../core/export/dxfExportFromOperationGraph', () => ({
  exportDxfFromPacket: vi.fn(),
  downloadDxfZipFromPacket: vi.fn().mockResolvedValue(undefined),
  canExportDxfFromOperationGraph: vi.fn().mockReturnValue({ available: true }),
}));

import { GateToolbar } from '../GateToolbar';
import { quickDxfExport, quickDxfExportAll } from '../../../core/export/exportPipeline';
import {
  generateFactoryPacketPreviewFromStores,
} from '../../../factory/packet';
import {
  exportDxfFromPacket,
  downloadDxfZipFromPacket,
} from '../../../core/export/dxfExportFromOperationGraph';

const mockExport = vi.mocked(exportDxfFromPacket);
const mockDownload = vi.mocked(downloadDxfZipFromPacket);
const mockPreview = vi.mocked(generateFactoryPacketPreviewFromStores);
const mockQuick = vi.mocked(quickDxfExport);
const mockQuickAll = vi.mocked(quickDxfExportAll);

const OK_RESULT = {
  ok: true as const,
  panels: [{ panelId: 'p1', panelName: 'LEFT_SIDE', filename: 'LEFT_SIDE_KDT.dxf' }],
  totalOperations: 20,
  machineId: 'KDT',
  warnings: [],
  skipped: [],
  g10Status: { allPassed: true, passedCount: 1, totalCount: 1 },
};

async function clickDxfMenuItem() {
  fireEvent.click(screen.getByTitle('Export options'));
  fireEvent.click(await screen.findByRole('button', { name: /DXF Files/ }));
}

describe('GateToolbar DXF menu item — packet path (Q1=A: quickDxf retired from user paths)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.cabState.cabinets = [h.cabinetA];
    h.cabState.cabinet = h.cabinetA;
    mockPreview.mockResolvedValue(h.previewFixture as never);
    mockExport.mockResolvedValue(OK_RESULT as never);
    mockDownload.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('invokes the packet path with panelPlacements from the live store panels — quickDxfExport is NOT called', async () => {
    render(<GateToolbar />);
    await clickDxfMenuItem();

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));

    expect(mockPreview).toHaveBeenCalledTimes(1);
    expect(mockExport).toHaveBeenCalledTimes(1);

    // Packet forwarded from the preview
    const [packet, options] = mockExport.mock.calls[0];
    expect(packet.drillMap.version).toBe('drillmap.v1');
    expect(packet.manifest.jobId).toBe('job-1');

    // Placements: p.id + p.position for every store panel (T3 contract)
    expect(options?.panelPlacements).toEqual([
      { panelId: 'p1', position: [-291, 360, 280] },
      { panelId: 'p2', position: [291, 360, 280] },
    ]);

    // Download gets the same placements (fail-closed projection input)
    const [, dlOptions] = mockDownload.mock.calls[0];
    expect(dlOptions?.panelPlacements).toEqual(options?.panelPlacements);

    // Q1=A: the legacy dev-preview exporter must not be reachable from here
    expect(mockQuick).not.toHaveBeenCalled();
    expect(mockQuickAll).not.toHaveBeenCalled();
  });

  it('surfaces a VISIBLE error and does NOT download when result.skipped.length > 0 (fail-closed, no bore-less sheets)', async () => {
    mockExport.mockResolvedValue({
      ...OK_RESULT,
      skipped: [{
        pointId: 'pt-1', panelId: 'p1', reason: 'UNKNOWN_PANEL',
        detail: 'no world placement for panel p1',
      }],
    } as never);

    render(<GateToolbar />);
    await clickDxfMenuItem();

    // VISIBLE error (GateToolbar's exportError tooltip), not just a console line
    expect(await screen.findByText(/DXF BLOCKED: 1 drill point/)).toBeTruthy();
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockQuick).not.toHaveBeenCalled();
    expect(mockQuickAll).not.toHaveBeenCalled();
  });

  it('multi-cabinet: shows a VISIBLE scope message (drill map covers the ACTIVE cabinet only) — no silent narrowing, no quickDxfExportAll', async () => {
    h.cabState.cabinets = [h.cabinetA, h.cabinetB];

    render(<GateToolbar />);
    await clickDxfMenuItem();

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));

    // The narrowing is SURFACED (S0: never silent)
    expect(await screen.findByText(/ACTIVE cabinet only/)).toBeTruthy();

    // Placements still cover every store panel of every cabinet
    const [, options] = mockExport.mock.calls[0];
    expect(options?.panelPlacements).toEqual([
      { panelId: 'p1', position: [-291, 360, 280] },
      { panelId: 'p2', position: [291, 360, 280] },
      { panelId: 'p3', position: [0, 9, 280] },
    ]);

    expect(mockQuickAll).not.toHaveBeenCalled();
    expect(mockQuick).not.toHaveBeenCalled();
  });

  it('surfaces a VISIBLE error when the packet export fails (ok: false) — nothing downloaded', async () => {
    mockExport.mockResolvedValue({
      ok: false as const,
      error: 'Packet has no drill map - cannot generate operations',
    } as never);

    render(<GateToolbar />);
    await clickDxfMenuItem();

    expect(await screen.findByText(/DXF export failed: Packet has no drill map/)).toBeTruthy();
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockQuick).not.toHaveBeenCalled();
  });
});
