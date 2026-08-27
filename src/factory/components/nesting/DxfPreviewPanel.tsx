/**
 * DxfPreviewPanel.tsx
 *
 * Renders a DXF-style preview inline as SVG before the user downloads the ZIP.
 * Shows the R12 DXF content visually: sheet boundary, panel outlines, kerf slots,
 * labels — matching what will be in the actual DXF file.
 *
 * @module factory/components/nesting/DxfPreviewPanel
 */

import React, { useMemo, useState } from 'react';
import type { NestingSheet } from '../../../core/export/monolith/monolithExportContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const SVG_W = 580;
const SVG_H = 320;
const MARGIN = 12;

const COLORS = {
  sheetBorder: '#475569',   // slate-600
  flatPanel: '#334155',     // slate-700
  curvedPanel: '#0d9488',   // teal-600
  kerfLine: '#3b82f6',      // blue-500
  label: '#94a3b8',         // slate-400
  kerfLabel: '#60a5fa',     // blue-400
  background: '#020617',    // slate-950
  tabActive: '#0d9488',
  tabInactive: '#1e293b',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DxfPreviewPanelProps {
  sheets: NestingSheet[];
  jobId?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SheetDxfPreviewProps {
  sheet: NestingSheet;
}

function SheetDxfPreview({ sheet }: SheetDxfPreviewProps) {
  const { sheetW, sheetH, placements } = sheet;

  const scaleX = (SVG_W - 2 * MARGIN) / Math.max(sheetW, 1);
  const scaleY = (SVG_H - 2 * MARGIN) / Math.max(sheetH, 1);
  const scale = Math.min(scaleX, scaleY);

  const toX = (wx: number) => MARGIN + wx * scale;
  const toY = (wy: number) => MARGIN + (sheetH - wy) * scale; // flip Y

  // Only show curved panels (DXF batch focuses on curved)
  const curvedPlacements = placements.filter(p => p.isCurved);
  const flatPlacements = placements.filter(p => !p.isCurved);

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      data-testid={`dxf-preview-${sheet.index1}`}
      style={{ borderRadius: 8, border: `1px solid ${COLORS.sheetBorder}` }}
    >
      {/* Background */}
      <rect width={SVG_W} height={SVG_H} fill={COLORS.background} />

      {/* Sheet boundary (DXF: SHEET_BOUNDARY layer) */}
      <rect
        x={toX(0)}
        y={toY(sheetH)}
        width={sheetW * scale}
        height={sheetH * scale}
        fill="none"
        stroke={COLORS.sheetBorder}
        strokeWidth={1.5}
        strokeDasharray="4 2"
      />

      {/* Flat panels (dimmed — not the focus of DXF batch) */}
      {flatPlacements.map((p, i) => {
        const w = (p.rotation === 90 || p.rotation === 270) ? p.cutH : p.cutW;
        const h = (p.rotation === 90 || p.rotation === 270) ? p.cutW : p.cutH;
        const rx = toX(p.x);
        const ry = toY(p.y + h);
        return (
          <rect
            key={`flat-${i}`}
            x={rx}
            y={ry}
            width={w * scale}
            height={h * scale}
            fill={COLORS.flatPanel}
            fillOpacity={0.3}
            stroke={COLORS.flatPanel}
            strokeWidth={0.5}
          />
        );
      })}

      {/* Curved panels (DXF: CURVED_PANEL layer) */}
      {curvedPlacements.map((p, i) => {
        const w = (p.rotation === 90 || p.rotation === 270) ? p.cutH : p.cutW;
        const h = (p.rotation === 90 || p.rotation === 270) ? p.cutW : p.cutH;
        const rx = toX(p.x);
        const ry = toY(p.y + h);
        const rw = w * scale;
        const rh = h * scale;

        // Kerf slot lines
        const kerfLines: React.ReactElement[] = [];
        if (p.kerfCount && p.kerfCount > 0) {
          const spacing = rw / (p.kerfCount + 1);
          for (let k = 1; k <= p.kerfCount; k++) {
            kerfLines.push(
              <line
                key={`kerf-${i}-${k}`}
                x1={rx + k * spacing}
                y1={ry + 2}
                x2={rx + k * spacing}
                y2={ry + rh - 2}
                stroke={COLORS.kerfLine}
                strokeWidth={0.5}
                strokeDasharray="2 1"
                opacity={0.6}
              />
            );
          }
        }

        return (
          <g key={`curved-${i}`} data-testid={`dxf-curved-${p.partId}`}>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={COLORS.curvedPanel}
              fillOpacity={0.15}
              stroke={COLORS.curvedPanel}
              strokeWidth={1.2}
            />
            {kerfLines}
            {/* Part ID */}
            <text
              x={rx + rw / 2}
              y={ry + rh / 2 - 4}
              textAnchor="middle"
              fontSize={9}
              fill={COLORS.label}
              fontFamily="monospace"
            >
              {p.partId}
            </text>
            {/* Kerf count */}
            {p.kerfCount && (
              <text
                x={rx + rw / 2}
                y={ry + rh / 2 + 8}
                textAnchor="middle"
                fontSize={8}
                fill={COLORS.kerfLabel}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {p.kerfCount}K
              </text>
            )}
          </g>
        );
      })}

      {/* Sheet info label */}
      <text x={MARGIN} y={SVG_H - 6} fontSize={8} fill={COLORS.label} fontFamily="monospace">
        {sheet.label ?? `NEST_${String(sheet.index1).padStart(2, '0')}`} | {sheet.materialId} |{' '}
        {sheetW}×{sheetH}mm | {curvedPlacements.length} curved / {placements.length} total
      </text>
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DxfPreviewPanel({ sheets, jobId }: DxfPreviewPanelProps) {
  // Filter sheets that have curved panels
  const curvedSheets = useMemo(
    () => sheets.filter(s => s.placements.some(p => p.isCurved)),
    [sheets]
  );

  const [activeIdx, setActiveIdx] = useState(0);

  if (curvedSheets.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 gap-2"
        data-testid="dxf-preview-empty"
      >
        <span className="text-2xl opacity-30">📐</span>
        <p className="text-xs text-slate-500">ไม่มี curved panels ในการ nesting</p>
      </div>
    );
  }

  const activeSheet = curvedSheets[Math.min(activeIdx, curvedSheets.length - 1)];

  return (
    <div data-testid="dxf-preview-panel">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-white">DXF Preview</span>
        {jobId && <span className="text-[10px] text-slate-500">— {jobId}</span>}
        <span className="text-[10px] text-slate-500 ml-auto">
          {curvedSheets.length} sheet(s) with curves
        </span>
      </div>

      {/* Sheet tabs */}
      {curvedSheets.length > 1 && (
        <div className="flex gap-1 mb-2 flex-wrap" data-testid="dxf-preview-tabs">
          {curvedSheets.map((sheet, idx) => (
            <button
              key={sheet.index1}
              onClick={() => setActiveIdx(idx)}
              data-testid={`dxf-tab-${sheet.index1}`}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                fontSize: 10,
                fontFamily: 'monospace',
                cursor: 'pointer',
                background: idx === activeIdx ? COLORS.tabActive : COLORS.tabInactive,
                color: idx === activeIdx ? '#fff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              {sheet.label ?? `#${sheet.index1}`}
            </button>
          ))}
        </div>
      )}

      {/* SVG Preview */}
      <SheetDxfPreview sheet={activeSheet} />

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-[9px] text-slate-500">
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.curvedPanel, borderRadius: 2, marginRight: 3, verticalAlign: 'middle' }} />
          Curved Panel
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.kerfLine, borderRadius: 2, marginRight: 3, verticalAlign: 'middle' }} />
          Kerf Slots
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, border: `1px dashed ${COLORS.sheetBorder}`, borderRadius: 2, marginRight: 3, verticalAlign: 'middle' }} />
          Sheet Boundary
        </span>
      </div>
    </div>
  );
}
