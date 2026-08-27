/**
 * @vitest-environment jsdom
 */

/**
 * NestingSheetReport.test.tsx
 *
 * Unit tests for the NestingSheetReport component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NestingSheetReport } from '../NestingSheetReport';
import type { NestingSheet } from '../../../../core/export/monolith/monolithExportContext';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FLAT_PLACEMENT = {
  partId:   'SIDE_001',
  x:        10,
  y:        10,
  rotation: 0 as const,
  cutW:     600,
  cutH:     800,
};

const CURVED_PLACEMENT = {
  partId:    'FRONT_CURVED',
  x:         650,
  y:         10,
  rotation:  0 as const,
  cutW:      450,
  cutH:      700,
  isCurved:  true,
  kerfCount: 8,
};

const SHEET_1: NestingSheet = {
  index1:         1,
  label:          'NEST_01',
  materialId:     'MAT_MDF',
  sheetW:         1220,
  sheetH:         2440,
  sheetThickness: 18,
  placements:     [FLAT_PLACEMENT],
  utilization:    62.5,
};

const SHEET_2: NestingSheet = {
  index1:         2,
  label:          'NEST_02',
  materialId:     'MAT_FLEX',
  sheetW:         1220,
  sheetH:         2440,
  sheetThickness: 12,
  placements:     [FLAT_PLACEMENT, CURVED_PLACEMENT],
  utilization:    75.3,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NestingSheetReport', () => {
  afterEach(() => cleanup());

  // ── Empty state ────────────────────────────────────────────────────────────

  it('shows empty state when sheets=[]', () => {
    render(<NestingSheetReport sheets={[]} />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('ยังไม่มีข้อมูล Nesting Sheets')).toBeTruthy();
  });

  it('shows jobId in empty state when provided', () => {
    render(<NestingSheetReport sheets={[]} jobId="JOB-001" />);
    expect(screen.getByText(/JOB-001/)).toBeTruthy();
  });

  // ── Sheet headers ──────────────────────────────────────────────────────────

  it('renders NEST_01 sheet header label', () => {
    render(<NestingSheetReport sheets={[SHEET_1, SHEET_2]} />);
    expect(screen.getByTestId('sheet-label-1')).toHaveTextContent('NEST_01');
  });

  it('renders NEST_02 sheet header label', () => {
    render(<NestingSheetReport sheets={[SHEET_1, SHEET_2]} />);
    expect(screen.getByTestId('sheet-label-2')).toHaveTextContent('NEST_02');
  });

  // ── CURVED badge ───────────────────────────────────────────────────────────

  it('SHEET_1 has no CURVED badge (no curved placements)', () => {
    render(<NestingSheetReport sheets={[SHEET_1, SHEET_2]} />);
    expect(screen.queryByTestId('curved-badge-1')).toBeNull();
  });

  it('SHEET_2 has exactly 1 CURVED badge', () => {
    render(<NestingSheetReport sheets={[SHEET_1, SHEET_2]} />);
    const badges = screen.getAllByTestId(/^curved-badge-/);
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('CURVED');
  });

  // ── Print button ───────────────────────────────────────────────────────────

  it('renders Print button', () => {
    render(<NestingSheetReport sheets={[SHEET_1]} />);
    expect(screen.getByTestId('print-button')).toBeTruthy();
  });

  it('calls window.print on Print button click', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<NestingSheetReport sheets={[SHEET_1]} />);
    fireEvent.click(screen.getByTestId('print-button'));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  // ── SVG sheets ─────────────────────────────────────────────────────────────

  it('renders SVG for each sheet', () => {
    render(<NestingSheetReport sheets={[SHEET_1, SHEET_2]} />);
    expect(screen.getByTestId('sheet-svg-1')).toBeTruthy();
    expect(screen.getByTestId('sheet-svg-2')).toBeTruthy();
  });

  it('renders placement element for FRONT_CURVED', () => {
    render(<NestingSheetReport sheets={[SHEET_2]} />);
    expect(screen.getByTestId('placement-FRONT_CURVED')).toBeTruthy();
  });

  // ── Auto-label when label is missing ──────────────────────────────────────

  it('auto-generates label NEST_03 when sheet.label is undefined', () => {
    const sheet3: NestingSheet = {
      index1: 3, materialId: 'MAT_MDF',
      sheetW: 1220, sheetH: 2440, sheetThickness: 18,
      placements: [], utilization: 0,
    };
    render(<NestingSheetReport sheets={[sheet3]} />);
    expect(screen.getByTestId('sheet-label-3')).toHaveTextContent('NEST_03');
  });
});
