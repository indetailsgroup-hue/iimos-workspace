/**
 * GateToolbar - Spec State & Gate Control
 * 
 * Features:
 * - Display current spec state (DRAFT/FROZEN/RELEASED)
 * - Validation status indicator
 * - Freeze/Release/Unfreeze buttons
 * - Export dropdown with gate enforcement
 */

import React, { useState, useCallback } from 'react';
import {
  useSpecStore,
  useSpecState,
  useGateStatus,
  useValidation,
  useMachineProfile,
  SpecState
} from '../../core/store/useSpecStore';
import { useCabinetStore } from '../../core/store/useCabinetStore';
// T4 (Q1=A): quickDxfExport/quickDxfExportAll are RETIRED from user paths —
// they draw from Cabinet geometry (dev-preview, G10-quarantined) and produced
// the non-manufacturable Ø5-only sheets. User DXF goes through the packet path.
import {
  generateFactoryPacketFromStores,
  generateFactoryPacketPreviewFromStores,
} from '../../factory/packet';
import {
  exportDxfFromPacket,
  downloadDxfZipFromPacket,
} from '../../core/export/dxfExportFromOperationGraph';
// T8b: Safety-Gate authority for this toolbar's freeze/release/export actions.
import { getExportGateStatus } from '../../gate/ui/useExportGate';
import { runGateValidation } from '../../gate/ui/SafetyPanel';
import { buildCutListData } from '../../factory/packet/builders';
import { downloadCutListCsv } from '../../factory/packet/cutListCsv';

const STATE_COLORS: Record<SpecState, string> = {
  DRAFT: 'bg-amber-500',
  FROZEN: 'bg-blue-500',
  RELEASED: 'bg-emerald-500',
};

const STATE_TEXT_COLORS: Record<SpecState, string> = {
  DRAFT: 'text-amber-500',
  FROZEN: 'text-blue-500',
  RELEASED: 'text-emerald-500',
};

export function GateToolbar() {
  const specState = useSpecState();
  const gateStatus = useGateStatus();
  const validation = useValidation();
  const machine = useMachineProfile();
  
  const freezeSpec = useSpecStore((s) => s.freezeSpec);
  const releaseSpec = useSpecStore((s) => s.releaseSpec);
  const unfreezeSpec = useSpecStore((s) => s.unfreezeSpec);
  const runValidation = useSpecStore((s) => s.runValidation);
  const canExport = useSpecStore((s) => s.canExport);
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Get cabinets for export
  const cabinets = useCabinetStore((s) => s.cabinets);
  const activeCabinet = useCabinetStore((s) => s.cabinet);

  /**
   * Why the gate is refusing, in the user's terms (T8b).
   * A stale-but-clean verdict is a different problem from a dirty one.
   */
  const gateRefusalReason = (gate: ReturnType<typeof getExportGateStatus>): string => {
    if (!gate.hasRun) return 'run the Safety Gate first';
    if (gate.blockerCount > 0) {
      return `${gate.blockerCount} Safety Gate blocker(s) must be resolved`;
    }
    if (!gate.fresh) return 'the cabinet changed since the last Safety Gate run';
    return 'Safety Gate did not pass';
  };

  const handleStateAction = async () => {
    if (specState === 'DRAFT') {
      // Owner ruling Q2 (O2+O3): freeze requires a FRESH Safety-Gate PASS.
      // Auto-run when stale so the user is not sent hunting for the Safety tab
      // — the friction is the gate's verdict, not the gate's location.
      if (!getExportGateStatus().fresh) {
        setExportError(null);
        await runGateValidation();
      }
      // Read imperatively: the hook value in this closure predates the run.
      const gate = getExportGateStatus();
      if (!gate.canFreeze) {
        setExportError(`Cannot freeze — ${gateRefusalReason(gate)}.`);
        return;
      }
      setExportError(null);
      freezeSpec();
    } else if (specState === 'FROZEN') {
      const gate = getExportGateStatus();
      if (!gate.canRelease) {
        setExportError(`Cannot release — ${gateRefusalReason(gate)}.`);
        return;
      }
      setExportError(null);
      releaseSpec();
    }
  };

  const handleExport = useCallback(async (format: 'CUT_LIST' | 'DXF' | 'CNC') => {
    if (!canExport(format)) {
      setExportError(`Cannot export ${format}. Check gate status.`);
      setShowExportMenu(false);
      return;
    }

    // Owner ruling Q2 (O2+O3): nothing leaves this toolbar without a FRESH
    // Safety-Gate PASS. Proven necessary 2026-07-25 — DXF exported from here
    // while the Safety Gate on screen read FAILED, because this surface never
    // consulted it.
    const gate = getExportGateStatus();
    if (!gate.canExport) {
      setExportError(`Cannot export ${format} — ${gateRefusalReason(gate)}.`);
      setShowExportMenu(false);
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setShowExportMenu(false);

    try {
      console.log(`[GateToolbar] Starting ${format} export...`);

      switch (format) {
        case 'CUT_LIST': {
          // S15-3: สร้าง CSV client-side จาก builder เดียวกับ factory packet
          // (เดิมยิง localhost:3001 ซึ่งไม่เคยมีเซิร์ฟเวอร์จริง)
          const jobName = activeCabinet?.name || 'cabinet';
          const cutListData = buildCutListData(cabinets.length > 0 ? cabinets : (activeCabinet ? [activeCabinet] : []));
          if (cutListData.rows.length === 0) {
            setExportError('No panels to export');
            break;
          }
          downloadCutListCsv(cutListData, jobName);
          console.log('[GateToolbar] Cut list export completed:', cutListData.summary);
          break;
        }

        case 'DXF': {
          // T4 (fix/dxf-truth-chain, Q1=A): user-facing DXF uses the PACKET
          // path (projected manufacturable per-panel sheets, T3). The legacy
          // quickDxfExport stays dev-only — it drew non-manufacturable sheets.
          const cabinetsForExport =
            cabinets.length > 0 ? cabinets : activeCabinet ? [activeCabinet] : [];
          if (cabinetsForExport.length === 0) {
            setExportError('No cabinet to export');
            break;
          }

          // SCOPE (S0: no silent narrowing): the store drill map — the
          // packet's bore source — is generated from the ACTIVE cabinet only
          // (Cabinet3D.tsx:1352 generateMinifixDrillMap(activeCabinetFromArray)),
          // so a multi-cabinet project gets sheets for the active cabinet
          // only. Surface that VISIBLY instead of narrowing in silence.
          if (cabinetsForExport.length > 1) {
            setExportError(
              `DXF scope: this ZIP contains the ACTIVE cabinet only — ` +
              `${cabinetsForExport.length - 1} other cabinet(s) are NOT included ` +
              `(drill map covers the active cabinet). Select each cabinet and export it separately.`
            );
          }

          const preview = await generateFactoryPacketPreviewFromStores();
          const packet = {
            manifest: preview.manifest,
            drillMap: preview.parsed.drillmap!,
            connectors: preview.parsed.connectorsMinifix!,
            cutList: preview.parsed.cutlist!,
            gateResult: preview.parsed.gateResult!,
          };

          // PLACEMENT CONTRACT (T3): the packet drill map has role+dims but
          // NO world position — supply CabinetPanel.position (panel CENTER)
          // for every store panel so the projection can build local frames.
          const panelPlacements = cabinetsForExport.flatMap((cab) =>
            (cab.panels ?? []).map((p) => ({
              panelId: p.id,
              position: p.position,
            }))
          );

          const cncMachineId = machine?.cncPresetId || 'GENERIC';
          const dxfOptions = {
            machineId: cncMachineId,
            panelPlacements,
            includeMetadata: true,
          };

          // Inspect the export result BEFORE delivering anything (fail-closed).
          // T8 seam: gate/freshness checks (frozen-spec hash vs live store,
          // canExport re-verification) slot in HERE, before the download call.
          const result = await exportDxfFromPacket(packet, dxfOptions);
          if (!result.ok) {
            setExportError(`DXF export failed: ${result.error}`);
            break;
          }
          if (result.skipped.length > 0) {
            // FAIL-CLOSED (S0): never silently deliver bore-less sheets.
            console.error('[GateToolbar] DXF blocked — undrawn drill points:', result.skipped);
            setExportError(
              `DXF BLOCKED: ${result.skipped.length} drill point(s) could not be drawn ` +
              `(${result.skipped[0].reason}). No files delivered — see console.`
            );
            break;
          }

          await downloadDxfZipFromPacket(packet, dxfOptions);
          console.log('[GateToolbar] DXF export completed (packet path):', {
            panels: result.panels.length,
            machineId: result.machineId,
          });
          break;
        }

        case 'CNC': {
          // CNC export requires RELEASED state - use full factory packet
          if (specState !== 'RELEASED') {
            setExportError('CNC export requires RELEASED spec state');
            break;
          }

          // Generate full factory packet (includes G-code, drill maps, etc.)
          const result = await generateFactoryPacketFromStores();
          console.log('[GateToolbar] CNC factory packet export completed:', {
            filename: result.filename,
            compressedSize: `${(result.compressedSize / 1024).toFixed(1)} KB`,
            uncompressedSize: `${(result.uncompressedSize / 1024).toFixed(1)} KB`,
          });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      console.error(`[GateToolbar] Export error:`, error);
      setExportError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, [canExport, activeCabinet, cabinets, machine, specState]);
  
  return (
    <div className="flex items-center gap-2">
      {/* Spec State Badge */}
      <div className={`px-3 py-1.5 rounded text-xs font-bold text-white ${STATE_COLORS[specState]}`}>
        {specState}
      </div>
      
      {/* Validation Status */}
      <button
        onClick={() => { runValidation(); setShowValidation(!showValidation); }}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
          ${validation?.ok 
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
            : validation?.failCount 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
          }`}
        title="Click to validate"
      >
        {validation ? (
          <>
            {validation.ok ? '✓' : '⚠'} {validation.passCount}P / {validation.warnCount}W / {validation.failCount}F
          </>
        ) : (
          'Validate'
        )}
      </button>
      
      {/* State Action Button */}
      {specState === 'DRAFT' && (
        <>
          <button
            onClick={handleStateAction}
            disabled={!gateStatus.canFreeze}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${gateStatus.canFreeze
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
            title={gateStatus.canFreeze ? 'Freeze spec for export' : gateStatus.blockers.join(', ')}
          >
            🔒 Freeze
          </button>
          {/* S15-3: บอกทางแก้แทนที่จะปล่อยปุ่มเงียบ — blockers เดิมซ่อนใน tooltip อย่างเดียว */}
          {!gateStatus.canFreeze && gateStatus.blockers.length > 0 && (
            <span
              className="px-2 py-1 rounded text-[11px] bg-amber-500/15 text-amber-400 whitespace-nowrap"
              title={gateStatus.blockers.join(', ')}
            >
              ⚠ {gateStatus.blockers[0] === 'Run validation first'
                ? 'กด Validate ก่อน'
                : gateStatus.blockers[0]}
            </span>
          )}
        </>
      )}
      
      {specState === 'FROZEN' && (
        <>
          <button
            onClick={unfreezeSpec}
            className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
            title="Unfreeze to edit"
          >
            🔓 Unfreeze
          </button>
          <button
            onClick={handleStateAction}
            disabled={!gateStatus.canRelease}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${gateStatus.canRelease 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
            title={gateStatus.canRelease ? 'Release for production' : gateStatus.blockers.join(', ')}
          >
            🚀 Release
          </button>
        </>
      )}
      
      {specState === 'RELEASED' && (
        <div className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
          ✓ Production Ready
        </div>
      )}
      
      {/* Export Button */}
      <div className="relative">
        <button
          onClick={() => !isExporting && setShowExportMenu(!showExportMenu)}
          disabled={!gateStatus.canExport || isExporting}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1
            ${isExporting
              ? 'bg-emerald-500/20 text-emerald-400'
              : gateStatus.canExport
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          title={isExporting ? 'Exporting...' : gateStatus.canExport ? 'Export options' : `Cannot export: ${gateStatus.blockers.join(', ')}`}
        >
          {isExporting ? (
            <>
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              📤 Export
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {showExportMenu && gateStatus.canExport && !isExporting && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
            <button
              onClick={() => handleExport('CUT_LIST')}
              disabled={!canExport('CUT_LIST')}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 Cut List (CSV)
            </button>
            <button
              onClick={() => handleExport('DXF')}
              disabled={!canExport('DXF')}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📐 DXF Files
            </button>
            <button
              onClick={() => handleExport('CNC')}
              disabled={!canExport('CNC')}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🏭 CNC Program
              {specState !== 'RELEASED' && (
                <span className="ml-2 text-xs text-amber-500">(RELEASED only)</span>
              )}
            </button>
          </div>
        )}

        {/* Export Error Tooltip */}
        {exportError && (
          <div className="absolute top-full right-0 mt-1 w-64 p-2 bg-red-900/90 border border-red-700 rounded-lg shadow-xl z-50 text-xs text-red-200">
            <div className="flex items-start gap-2">
              <span className="text-red-400">⚠</span>
              <span>{exportError}</span>
              <button
                onClick={() => setExportError(null)}
                className="ml-auto text-red-400 hover:text-red-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Machine Info */}
      <div className="px-2 py-1 text-xs text-zinc-500" title={`Max: ${machine.maxWidth}×${machine.maxHeight}mm`}>
        {machine.name}
      </div>
      
      {/* Validation Popup */}
      {showValidation && validation && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">Validation Results</h4>
            <button onClick={() => setShowValidation(false)} className="text-zinc-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {validation.rules.map((rule) => (
              <div 
                key={rule.id}
                className={`p-2 rounded text-xs
                  ${rule.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' :
                    rule.status === 'WARN' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  }`}
              >
                <div className="font-medium">{rule.status} - {rule.name}</div>
                <div className="text-zinc-400 mt-1">{rule.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Click outside to close menus */}
      {(showExportMenu || showValidation) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => { setShowExportMenu(false); setShowValidation(false); }}
        />
      )}
    </div>
  );
}

export default GateToolbar;
