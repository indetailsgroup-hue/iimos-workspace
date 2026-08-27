/**
 * NestingSheetReport.tsx
 *
 * Printable SVG nesting-layout report for DAPH Decor factory floor.
 *
 * Features:
 *  – One SVG per NestingSheet, scaled to fit SVG_W × SVG_H viewport
 *  – Flat panels: dark slate fill (#334155)
 *  – Curved panels: teal fill (#0d9488) + diagonal hatch pattern + "{N}K" sub-label
 *  – Sheet header shows label, material, utilisation, and CURVED badge
 *  – Print button calls window.print(); @media print hides .no-print
 *  – Empty state when sheets=[]; Thai-language labels throughout
 *
 * @module NestingSheetReport
 */

import React from 'react';
import type { NestingSheet } from '../../../core/export/monolith/monolithExportContext';

// ============================================
// CONSTANTS
// ============================================

const SVG_W = 500;
const SVG_H = 270;
const MARGIN = 8;

// ============================================
// SUB-COMPONENTS
// ============================================

interface HatchPatternProps {
  id: string;
}
function HatchPattern({ id }: HatchPatternProps) {
  return (
    <defs>
      <pattern
        id={id}
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke="#0f766e" strokeWidth="1.5" />
      </pattern>
    </defs>
  );
}

// ─── Single sheet SVG ─────────────────────────────────────────────────────────

interface SheetSvgProps {
  sheet: NestingSheet;
}
function SheetSvg({ sheet }: SheetSvgProps) {
  const { sheetW, sheetH, placements } = sheet;

  const scaleX = (SVG_W - 2 * MARGIN) / Math.max(sheetW, 1);
  const scaleY = (SVG_H - 2 * MARGIN) / Math.max(sheetH, 1);
  const scale  = Math.min(scaleX, scaleY);

  const hatchId = `hatch-${sheet.index1}`;

  // World → SVG (Y-flip: sheet origin is bottom-left in world, top-left in SVG)
  const toSvgX = (wx: number) => MARGIN + wx * scale;
  const toSvgY = (wy: number) => MARGIN + (sheetH - wy) * scale;

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full border border-slate-700 rounded bg-slate-950"
      data-testid={`sheet-svg-${sheet.index1}`}
    >
      <HatchPattern id={hatchId} />

      {/* Sheet outline */}
      <rect
        x={MARGIN}
        y={MARGIN}
        width={sheetW * scale}
        height={sheetH * scale}
        fill="none"
        stroke="#475569"
        strokeWidth="1"
      />

      {/* Placements */}
      {placements.map((p, i) => {
        const { x, y, cutW, cutH, rotation, isCurved, kerfCount, partId } = p;

        // Apply rotation: swap width/height for 90°/270°
        const w = (rotation === 90 || rotation === 270) ? cutH : cutW;
        const h = (rotation === 90 || rotation === 270) ? cutW : cutH;

        const rx = toSvgX(x);
        const ry = toSvgY(y + h);   // SVG top-left = world bottom-left of part
        const rw = w * scale;
        const rh = h * scale;

        const cx = rx + rw / 2;
        const cy = ry + rh / 2;

        return (
          <g key={i} data-testid={`placement-${partId}`}>
            {/* Base fill */}
            <rect
              x={rx} y={ry} width={rw} height={rh}
              fill={isCurved ? '#0d9488' : '#334155'}
              stroke="#1e293b"
              strokeWidth="0.5"
            />
            {/* Curved hatch overlay */}
            {isCurved && (
              <rect
                x={rx} y={ry} width={rw} height={rh}
                fill={`url(#${hatchId})`}
                opacity={0.35}
              />
            )}
            {/* Part ID label */}
            <text
              x={cx} y={cy - (isCurved && rh > 16 ? 5 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(6, Math.min(10, rw / 6))}
              fill={isCurved ? '#ccfbf1' : '#94a3b8'}
            >
              {partId.length > 12 ? partId.slice(0, 11) + '…' : partId}
            </text>
            {/* Kerf count sub-label for curved panels */}
            {isCurved && kerfCount !== undefined && rh > 14 && (
              <text
                x={cx} y={cy + 7}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(5, Math.min(8, rw / 7))}
                fill="#5eead4"
                data-testid={`kerf-label-${partId}`}
              >
                {kerfCount}K
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Sheet header ─────────────────────────────────────────────────────────────

interface SheetHeaderProps {
  sheet: NestingSheet;
}
function SheetHeader({ sheet }: SheetHeaderProps) {
  const hasCurved = sheet.placements.some((p) => p.isCurved);
  const label = sheet.label ?? `NEST_${String(sheet.index1).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 mb-1.5 flex-wrap" data-testid={`sheet-header-${sheet.index1}`}>
      <span className="text-sm font-bold font-mono text-white" data-testid={`sheet-label-${sheet.index1}`}>
        {label}
      </span>
      <span className="text-[10px] text-slate-400">
        {sheet.materialId} — {sheet.sheetW}×{sheet.sheetH}×{sheet.sheetThickness}mm
      </span>
      <span className="text-[10px] text-slate-400 ml-auto">
        ใช้พื้นที่ {sheet.utilization.toFixed(1)}%
      </span>
      {hasCurved && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium"
          data-testid={`curved-badge-${sheet.index1}`}
        >
          CURVED
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export interface NestingSheetReportProps {
  sheets: NestingSheet[];
  jobId?: string;
}

export function NestingSheetReport({ sheets, jobId }: NestingSheetReportProps) {
  const handlePrint = () => window.print();

  // ── Empty state ────────────────────────────────────────────────
  if (sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center" data-testid="empty-state">
        <span className="text-3xl opacity-30">⬚</span>
        <p className="text-sm text-slate-400">ยังไม่มีข้อมูล Nesting Sheets</p>
        {jobId && (
          <p className="text-[11px] text-slate-600">Job: {jobId}</p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sheet-block { page-break-after: always; }
          body { background: #0f172a !important; }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-4 no-print">
        <span className="text-sm font-semibold text-white">
          Nesting Report
          {jobId && <span className="text-slate-400 font-normal ml-2">— {jobId}</span>}
        </span>
        <span className="text-[11px] text-slate-500 ml-1">
          {sheets.length} แผ่น
        </span>
        <button
          onClick={handlePrint}
          className="ml-auto px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-medium transition-colors"
          data-testid="print-button"
        >
          พิมพ์ / Print
        </button>
      </div>

      {/* ── Sheet blocks ── */}
      <div id="nesting-report-container" className="space-y-6">
        {sheets.map((sheet) => (
          <div key={sheet.index1} className="sheet-block">
            <SheetHeader sheet={sheet} />
            <SheetSvg sheet={sheet} />
          </div>
        ))}
      </div>
    </>
  );
}
