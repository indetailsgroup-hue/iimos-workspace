/**
 * @vitest-environment jsdom
 */

/**
 * ExportPanel.dxfExport.test.tsx — T4 (fix/dxf-truth-chain)
 *
 * Owner ruling Q1=A: the legacy quickDxfExport fallback (silent console.warn
 * degrade to non-manufacturable Cabinet-geometry sheets) is RETIRED from the
 * user-facing DXF flow. The panel must:
 *  1. pass panelPlacements (p.id + p.position for ALL cabinet panels) into
 *     the packet path,
 *  2. HARD-FAIL with a visible error when the OperationGraph path is
 *     unavailable (no legacy fallback), and
 *  3. surface a VISIBLE error and deliver NOTHING when
 *     result.skipped.length > 0 (fail-closed — no bore-less sheets).
 *
 * NOTE: freeze/gate logic in this component is T8's scope — these tests pin
 * only the DXF call sites + fallback behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

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
  const cabinet = {
    id: 'cab-a',
    name: 'Cabinet A',
    dimensions: { width: 600, height: 720, depth: 560, toeKickHeight: 100 },
    structure: {
      topJoint: 'INSET', bottomJoint: 'INSET', hasBackPanel: true,
      backPanelConstruction: 'inset', backPanelInset: 6, shelfCount: 1, dividerCount: 0,
    },
    materials: { defaultCore: 'core-pb-18', defaultSurface: 'surf-mel-white', defaultEdge: 'e' },
    panels: [panel('p1', [-291, 360, 280]), panel('p2', [291, 360, 280])],
    computed: {},
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
  return { cabinet, previewFixture, generatePreview: null as unknown };
});

vi.mock('../../../core/store/useCabinetStore', () => ({
  useCabinet: () => h.cabinet,
}));

vi.mock('../../../core/store/useSpecStore', () => ({
  useSpecStore: vi.fn((sel: (s: Record<string, unknown>) => unknown) =>
    sel({ freezeSpec: vi.fn(), releaseSpec: vi.fn(), unfreezeSpec: vi.fn() })),
  useSpecState: () => 'FROZEN',
  useMachineProfile: () => ({
    id: 'homag-centateq', name: 'HOMAG CENTATEQ', maxWidth: 3100, maxHeight: 1550,
    cncPresetId: 'HOMAG', supportedOperations: ['DRILL'],
  }),
  MACHINE_PROFILES: {
    'homag-centateq': {
      id: 'homag-centateq', name: 'HOMAG CENTATEQ', manufacturer: 'HOMAG',
      maxWidth: 3100, maxHeight: 1550, cncPresetId: 'HOMAG',
      dialect: 'woodWOP', supportedOperations: ['DRILL', 'BORE'],
    },
  },
}));

vi.mock('../../../core/export/exportPipeline', () => ({
  quickDxfExport: vi.fn().mockResolvedValue(undefined),
  quickDxfExportAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../core/export/dxfExportFromOperationGraph', () => ({
  exportDxfFromPacket: vi.fn(),
  downloadDxfZipFromPacket: vi.fn().mockResolvedValue(undefined),
  canExportDxfFromOperationGraph: vi.fn().mockReturnValue({ available: true }),
}));

vi.mock('../../../gate/ui', () => ({
  useExportGate: () => ({
    hasRun: true, canFreeze: true, blockerCount: 0, openFirstBlocker: vi.fn(),
  }),
  GateBlockerModal: () => null,
}));

// Safety-Gate authority on THIS surface. ExportPanel used to read the gate only
// to render a status line and delivered regardless — the second export door the
// gate-authority review lens found (2026-07-26). The real describeGateRefusal is
// imported, not stubbed, so these tests fail if the refusal wording drifts.
const gateState = vi.hoisted(() => ({
  value: {
    canFreeze: true, canRelease: true, canExport: true,
    hasRun: true, passedWhenRun: true, fresh: true, hasDrillMap: true,
    isRunning: false, blockerCount: 0, warningCount: 0, blockers: [], result: null,
  } as Record<string, unknown>,
}));
vi.mock('../../../gate/ui/useExportGate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../gate/ui/useExportGate')>();
  return { ...actual, getExportGateStatus: () => gateState.value };
});

vi.mock('../../../factory/packet', () => ({
  useFactoryPacket: () => ({
    isGenerating: false,
    isPreviewing: false,
    error: null,
    lastResult: null,
    lastPreview: null,
    generateAndDownload: vi.fn(),
    generatePreview: h.generatePreview,
    downloadPreview: vi.fn(),
    clearError: vi.fn(),
    clearPreview: vi.fn(),
  }),
  PacketPreviewModal: () => null,
}));

vi.mock('../../nesting/NestingPanel', () => ({
  NestingPanel: () => null,
}));

vi.mock('../../../core/store/useNestingStore', () => ({
  useNestingStore: () => ({ nestingSheets: null, setNestingSheets: vi.fn() }),
}));

import { ExportPanel } from '../ExportPanel';
import { quickDxfExport } from '../../../core/export/exportPipeline';
import {
  exportDxfFromPacket,
  downloadDxfZipFromPacket,
  canExportDxfFromOperationGraph,
} from '../../../core/export/dxfExportFromOperationGraph';

const mockExport = vi.mocked(exportDxfFromPacket);
const mockDownload = vi.mocked(downloadDxfZipFromPacket);
const mockAvailability = vi.mocked(canExportDxfFromOperationGraph);
const mockQuick = vi.mocked(quickDxfExport);

const OK_RESULT = {
  ok: true as const,
  panels: [{ panelId: 'p1', panelName: 'LEFT_SIDE', filename: 'LEFT_SIDE_HOMAG.dxf' }],
  totalOperations: 20,
  machineId: 'HOMAG',
  warnings: [],
  skipped: [],
  g10Status: { allPassed: true, passedCount: 1, totalCount: 1 },
};

describe('ExportPanel DXF export — packet path with fail-closed fallback (Q1=A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.generatePreview = vi.fn().mockResolvedValue(h.previewFixture);
    mockExport.mockResolvedValue(OK_RESULT as never);
    mockDownload.mockResolvedValue(undefined);
    mockAvailability.mockReturnValue({ available: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function clickGenerateDxf() {
    fireEvent.click(screen.getByRole('button', { name: /Generate DXF \(Engineering Preview\)/ }));
  }

  it('passes panelPlacements (ALL cabinet panels, p.id + p.position) into the packet path', async () => {
    render(<ExportPanel gateStatus="FROZEN" onGateChange={() => {}} />);
    clickGenerateDxf();

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));

    const [, options] = mockDownload.mock.calls[0];
    expect(options?.panelPlacements).toEqual([
      { panelId: 'p1', position: [-291, 360, 280] },
      { panelId: 'p2', position: [291, 360, 280] },
    ]);
    expect(options?.selectedPanelIds).toEqual(['p1', 'p2']);
    expect(options?.machineId).toBe('HOMAG');
    expect(mockQuick).not.toHaveBeenCalled();
  });

  it('surfaces a VISIBLE error and delivers NOTHING when result.skipped.length > 0 (fail-closed)', async () => {
    mockExport.mockResolvedValue({
      ...OK_RESULT,
      skipped: [{
        pointId: 'pt-1', panelId: 'p1', reason: 'UNKNOWN_PANEL',
        detail: 'no world placement for panel p1',
      }],
    } as never);

    render(<ExportPanel gateStatus="FROZEN" onGateChange={() => {}} />);
    clickGenerateDxf();

    // Visible failure banner (existing exportProgress error pattern)
    expect(await screen.findByText(/DXF BLOCKED: 1 drill point/)).toBeTruthy();
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockQuick).not.toHaveBeenCalled();
  });

  it('HARD-FAILS with a visible error when OperationGraph DXF is unavailable — the legacy quickDxfExport fallback is retired', async () => {
    mockAvailability.mockReturnValue({ available: false, reason: 'Packet has no drill map' });

    render(<ExportPanel gateStatus="FROZEN" onGateChange={() => {}} />);
    clickGenerateDxf();

    expect(await screen.findByText(/Export failed:.*Packet has no drill map/)).toBeTruthy();
    // Q1=A: NEVER degrade to the dev-preview Cabinet-geometry sheets
    expect(mockQuick).not.toHaveBeenCalled();
    expect(mockDownload).not.toHaveBeenCalled();
  });
});

describe('ExportPanel honours the Safety Gate before delivering (second export door)', () => {
  afterEach(() => {
    cleanup();
    gateState.value = { ...gateState.value, canExport: true, hasDrillMap: true, fresh: true, blockerCount: 0 };
  });

  it('REFUSES and delivers NOTHING when a non-waivable refusal stands', async () => {
    // The failure mode this pins: ExportPanel rendered "Safety Gate: N blocker(s)"
    // in its own status strip and then exported anyway, because the handler never
    // read the verdict it was displaying.
    gateState.value = {
      ...gateState.value,
      canExport: false, canFreeze: false, passedWhenRun: false, blockerCount: 2,
      blockers: [
        { key: 'B:1', code: 'B_G11_MANUFACTURABILITY_REFUSAL', message: 'refused', severity: 'BLOCKER', entityIds: [] },
        { key: 'B:2', code: 'B_G11_MANUFACTURABILITY_REFUSAL', message: 'refused', severity: 'BLOCKER', entityIds: [] },
      ],
    };
    mockExport.mockResolvedValue(OK_RESULT as never);

    render(<ExportPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Generate DXF \(Engineering Preview\)/ }));

    expect(await screen.findByText(/2 Safety Gate blockers must be resolved/i)).toBeTruthy();
    expect(mockExport, 'the exporter must not even be reached').not.toHaveBeenCalled();
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('names the MISSING DRILL MAP rather than blaming a change the user never made', async () => {
    gateState.value = {
      ...gateState.value,
      canExport: false, hasDrillMap: false, fresh: false,
    };

    render(<ExportPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Generate DXF \(Engineering Preview\)/ }));

    expect(await screen.findByText(/no drill map to validate yet/i)).toBeTruthy();
    expect(mockDownload).not.toHaveBeenCalled();
  });
});
