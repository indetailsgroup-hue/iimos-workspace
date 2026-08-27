/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DxfPreviewPanel } from '../DxfPreviewPanel';
import type { NestingSheet } from '../../../../core/export/monolith/monolithExportContext';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SHEET_WITH_CURVES: NestingSheet = {
  index1: 1,
  label: 'NEST_01',
  materialId: 'PB_WHITE_18',
  sheetW: 1220,
  sheetH: 2440,
  sheetThickness: 18,
  placements: [
    { partId: 'SIDE_L', x: 10, y: 10, rotation: 0, cutW: 600, cutH: 800 },
    { partId: 'CURVE_A', x: 10, y: 820, rotation: 0, cutW: 500, cutH: 700, isCurved: true, kerfCount: 8 },
    { partId: 'CURVE_B', x: 520, y: 820, rotation: 0, cutW: 500, cutH: 700, isCurved: true, kerfCount: 5 },
  ],
  utilization: 72.0,
};

const SHEET_NO_CURVES: NestingSheet = {
  index1: 2,
  label: 'NEST_02',
  materialId: 'MDF_OAK_18',
  sheetW: 1220,
  sheetH: 2440,
  sheetThickness: 18,
  placements: [
    { partId: 'SHELF_01', x: 10, y: 10, rotation: 0, cutW: 800, cutH: 400 },
    { partId: 'SHELF_02', x: 10, y: 420, rotation: 0, cutW: 800, cutH: 400 },
  ],
  utilization: 55.0,
};

const SHEET_WITH_CURVES_2: NestingSheet = {
  index1: 3,
  label: 'NEST_03',
  materialId: 'PB_WHITE_18',
  sheetW: 1220,
  sheetH: 2440,
  sheetThickness: 18,
  placements: [
    { partId: 'DOOR_C1', x: 10, y: 10, rotation: 0, cutW: 400, cutH: 1200, isCurved: true, kerfCount: 12 },
  ],
  utilization: 30.0,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DxfPreviewPanel', () => {
  afterEach(() => cleanup());

  it('renders empty state when no sheets have curved panels', () => {
    render(<DxfPreviewPanel sheets={[SHEET_NO_CURVES]} />);
    expect(screen.getByTestId('dxf-preview-empty')).toBeTruthy();
    expect(screen.queryByTestId('dxf-preview-panel')).toBeNull();
  });

  it('renders empty state when sheets array is empty', () => {
    render(<DxfPreviewPanel sheets={[]} />);
    expect(screen.getByTestId('dxf-preview-empty')).toBeTruthy();
  });

  it('renders the preview panel when curved sheets exist', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES]} jobId="JOB-001" />);
    expect(screen.getByTestId('dxf-preview-panel')).toBeTruthy();
    expect(screen.getByTestId('dxf-preview-1')).toBeTruthy();
  });

  it('shows jobId in the header', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES]} jobId="JOB-TEST-42" />);
    expect(screen.getByText(/JOB-TEST-42/)).toBeTruthy();
  });

  it('renders only curved sheets (filters out non-curved)', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES, SHEET_NO_CURVES, SHEET_WITH_CURVES_2]} />);

    // Should show the first curved sheet by default
    expect(screen.getByTestId('dxf-preview-1')).toBeTruthy();
    // Should NOT show non-curved sheet as a preview
    expect(screen.queryByTestId('dxf-preview-2')).toBeNull();
  });

  it('renders curved panel elements with testids', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES]} />);
    expect(screen.getByTestId('dxf-curved-CURVE_A')).toBeTruthy();
    expect(screen.getByTestId('dxf-curved-CURVE_B')).toBeTruthy();
  });

  it('shows kerf count labels for curved panels', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES]} />);
    // CURVE_A has 8 kerfs, CURVE_B has 5
    expect(screen.getByText('8K')).toBeTruthy();
    expect(screen.getByText('5K')).toBeTruthy();
  });

  it('renders tab navigation for multiple curved sheets', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES, SHEET_NO_CURVES, SHEET_WITH_CURVES_2]} />);

    // 2 curved sheets → tabs should appear
    expect(screen.getByTestId('dxf-preview-tabs')).toBeTruthy();
    expect(screen.getByTestId('dxf-tab-1')).toBeTruthy();
    expect(screen.getByTestId('dxf-tab-3')).toBeTruthy();
    // No tab for non-curved sheet
    expect(screen.queryByTestId('dxf-tab-2')).toBeNull();
  });

  it('switches sheets on tab click', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES, SHEET_NO_CURVES, SHEET_WITH_CURVES_2]} />);

    // Initially shows first curved sheet
    expect(screen.getByTestId('dxf-preview-1')).toBeTruthy();
    expect(screen.queryByTestId('dxf-preview-3')).toBeNull();

    // Click tab for sheet 3
    fireEvent.click(screen.getByTestId('dxf-tab-3'));

    // Should now show sheet 3
    expect(screen.getByTestId('dxf-preview-3')).toBeTruthy();
    expect(screen.queryByTestId('dxf-preview-1')).toBeNull();
  });

  it('does not show tabs for a single curved sheet', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES]} />);
    expect(screen.queryByTestId('dxf-preview-tabs')).toBeNull();
  });

  it('displays sheet count in header', () => {
    render(<DxfPreviewPanel sheets={[SHEET_WITH_CURVES, SHEET_NO_CURVES, SHEET_WITH_CURVES_2]} />);
    expect(screen.getByText(/2 sheet\(s\) with curves/)).toBeTruthy();
  });
});
