/**
 * GateToolbar - Spec State & Gate Control
 * 
 * Features:
 * - Display current spec state (DRAFT/FROZEN/RELEASED)
 * - Validation status indicator
 * - Freeze/Release/Unfreeze buttons
 * - Export dropdown with gate enforcement
 */

import React, { useState } from 'react';
import { 
  useSpecStore, 
  useSpecState, 
  useGateStatus, 
  useValidation,
  useMachineProfile,
  SpecState 
} from '../../core/store/useSpecStore';

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
  
  const handleStateAction = () => {
    if (specState === 'DRAFT') {
      freezeSpec();
    } else if (specState === 'FROZEN') {
      releaseSpec();
    }
  };
  
  const handleExport = (format: 'CUT_LIST' | 'DXF' | 'CNC') => {
    if (canExport(format)) {
      console.log(`[Export] Exporting ${format}...`);
      // TODO: Implement actual export
      alert(`Exporting ${format}... (Not implemented yet)`);
    } else {
      alert(`Cannot export ${format}. Check gate status.`);
    }
    setShowExportMenu(false);
  };
  
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
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={!gateStatus.canExport}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1
            ${gateStatus.canExport 
              ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          title={gateStatus.canExport ? 'Export options' : `Cannot export: ${gateStatus.blockers.join(', ')}`}
        >
          📤 Export
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showExportMenu && gateStatus.canExport && (
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
