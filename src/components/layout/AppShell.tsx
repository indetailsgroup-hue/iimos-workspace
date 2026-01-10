/**
 * AppShell - IIMOS Designer Workspace Main Layout
 * 
 * Based on IIMOS Designer Workspace Spec v1.0
 * 
 * Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │                    PROJECT HEADER                       │
 * │  [Logo] Project Name    Spec State   Gate Status  Export│
 * ├────────────┬─────────────────────────────┬──────────────┤
 * │            │                             │              │
 * │   LEFT     │        R3F VIEWPORT         │    RIGHT     │
 * │   PANEL    │                             │    PANEL     │
 * │            │                             │              │
 * │  Designer  │    True-Grain™ Workspace    │  Parametric  │
 * │   Intent   │                             │   Contract   │
 * │            │                             │              │
 * ├────────────┴─────────────────────────────┴──────────────┤
 * │                       FOOTER                            │
 * │  Machine Compatibility | Validation | Performance       │
 * └─────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';

// Spec State Types
export type SpecState = 'DRAFT' | 'FROZEN' | 'RELEASED';

// Gate Status Types
export type GateStatus = 'OK' | 'WARNING' | 'BLOCKED';

interface ProjectInfo {
  name: string;
  version: string;
  specState: SpecState;
  gateStatus: GateStatus;
  gateErrors: string[];
  gateWarnings: string[];
}

interface AppShellProps {
  project: ProjectInfo;
  leftPanel: React.ReactNode;
  viewport: React.ReactNode;
  rightPanel: React.ReactNode;
  onExport?: () => void;
  onSpecStateChange?: (state: SpecState) => void;
}

// Spec State Badge Component
function SpecStateBadge({ state, onChange }: { state: SpecState; onChange?: (s: SpecState) => void }) {
  const colors = {
    DRAFT: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:border-amber-400/50',
    FROZEN: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:border-blue-400/50',
    RELEASED: 'bg-green-500/10 text-green-400 border-green-500/30 hover:border-green-400/50',
  };
  
  const icons = {
    DRAFT: '📝',
    FROZEN: '❄️',
    RELEASED: '✅',
  };
  
  return (
    <div className="relative group">
      <button
        className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all duration-200 ${colors[state]}`}
        onClick={() => {
          if (!onChange) return;
          const states: SpecState[] = ['DRAFT', 'FROZEN', 'RELEASED'];
          const idx = states.indexOf(state);
          onChange(states[(idx + 1) % states.length]);
        }}
      >
        <span>{icons[state]}</span>
        <span>{state}</span>
      </button>
    </div>
  );
}

// Gate Status Badge Component
function GateStatusBadge({ status, errors, warnings }: { status: GateStatus; errors: string[]; warnings: string[] }) {
  const colors = {
    OK: 'bg-green-500/10 text-green-400 border-green-500/30 hover:border-green-400/50',
    WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:border-amber-400/50',
    BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/30 hover:border-red-400/50',
  };

  const icons = {
    OK: '✓',
    WARNING: '⚠',
    BLOCKED: '✕',
  };

  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative">
      <button
        className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all duration-200 ${colors[status]}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <span className="text-sm">{icons[status]}</span>
        <span>Gate: {status}</span>
      </button>

      {showDetails && (errors.length > 0 || warnings.length > 0) && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface-2 border border-[#333] rounded-xl shadow-2xl z-50 p-4">
          <h4 className="text-white font-medium text-sm mb-3">Gate Validation Report</h4>

          {errors.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="text-red-400 text-xs font-medium mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                Errors (Blocking)
              </div>
              {errors.map((err, i) => (
                <div key={i} className="text-gray-400 text-xs pl-4 py-0.5">• {err}</div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="text-amber-400 text-xs font-medium mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Warnings
              </div>
              {warnings.map((warn, i) => (
                <div key={i} className="text-gray-400 text-xs pl-4 py-0.5">• {warn}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export Button Component
function ExportButton({ enabled, onClick }: { enabled: boolean; onClick?: () => void }) {
  return (
    <button
      disabled={!enabled}
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200
        ${enabled
          ? 'bg-green-500 hover:bg-green-400 hover:shadow-glow-green text-black cursor-pointer'
          : 'bg-surface-4 text-gray-500 cursor-not-allowed border border-[#333]'
        }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <span>Export to CNC</span>
      {!enabled && <span className="text-[10px] opacity-60">(Gate Blocked)</span>}
    </button>
  );
}

// Main AppShell Component
export function AppShell({ 
  project, 
  leftPanel, 
  viewport, 
  rightPanel, 
  onExport,
  onSpecStateChange 
}: AppShellProps) {
  const canExport = project.gateStatus === 'OK' && project.specState !== 'DRAFT';
  
  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden">
      {/* PROJECT HEADER */}
      <header className="h-12 bg-surface-1 border-b border-[#333] flex items-center justify-between px-4 shrink-0">
        {/* Left: Logo + Project Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-surface-3 border border-[#333] rounded-lg flex items-center justify-center">
              <span className="text-green-400 font-bold text-sm">II</span>
            </div>
            <span className="text-white font-medium text-sm">IIMOS</span>
          </div>

          <div className="h-6 w-px bg-[#333]" />

          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{project.name}</span>
            <span className="text-xs font-mono text-gray-500 bg-surface-3 px-2 py-0.5 rounded border border-[#333]">v{project.version}</span>
          </div>
        </div>

        {/* Center: View Controls (placeholder) */}
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-[#333]">
          {['Front', 'Left', 'Perspective', 'Install', 'Factory', 'CNC'].map((view, i) => (
            <button
              key={view}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ${
                i === 2
                  ? 'bg-surface-4 text-white'
                  : 'text-gray-500 hover:text-white hover:bg-surface-3'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Right: Status + Export */}
        <div className="flex items-center gap-3">
          <SpecStateBadge state={project.specState} onChange={onSpecStateChange} />
          <GateStatusBadge
            status={project.gateStatus}
            errors={project.gateErrors}
            warnings={project.gateWarnings}
          />
          <div className="h-6 w-px bg-[#333]" />
          <ExportButton enabled={canExport} onClick={onExport} />
        </div>
      </header>
      
      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Designer Intent */}
        <aside className="w-80 bg-surface-1 border-r border-[#333] flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-[#333]">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Designer Intent</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {leftPanel}
          </div>
        </aside>

        {/* CENTER - R3F Viewport */}
        <main className="flex-1 relative overflow-hidden bg-black">
          {viewport}

          {/* Engine Info Badge */}
          <div className="absolute bottom-4 left-4 pointer-events-none">
            <div className="bg-surface-2/80 backdrop-blur-sm border border-[#333] rounded-lg px-3 py-2 space-y-1">
              <div className="text-green-400 text-xs font-mono font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                BIOPHILIC RENDER ENGINE
              </div>
              <div className="text-gray-500 text-[10px] font-mono">Scale: 1 Unit = 1mm</div>
              <div className="text-gray-500 text-[10px] font-mono">Mode: True-Grain™ + Real-Scale UV</div>
              <div className="text-gray-500 text-[10px] font-mono">Engine: R3F / PBR Manufacturing</div>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL - Parametric Contract */}
        <aside className="w-80 bg-surface-1 border-l border-[#333] flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-[#333]">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Parametric Contract</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel}
          </div>
        </aside>
      </div>
      
      {/* FOOTER */}
      <footer className="h-8 bg-surface-1 border-t border-[#333] flex items-center justify-between px-4 text-xs shrink-0">
        {/* Machine Compatibility */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Machine:</span>
            <span className="text-green-400 font-mono">Homag CENTATEQ P-110</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
          <div className="h-4 w-px bg-[#333]" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Nesting:</span>
            <span className="text-white">Ready</span>
          </div>
        </div>

        {/* Validation Token */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Validation:</span>
            <span className={`font-mono ${project.gateStatus === 'OK' ? 'text-green-400' : 'text-gray-400'}`}>
              {project.gateStatus === 'OK' ? '✓ PASSED' : '○ PENDING'}
            </span>
          </div>
          <div className="h-4 w-px bg-[#333]" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Panels:</span>
            <span className="text-white font-mono">6</span>
          </div>
          <div className="h-4 w-px bg-[#333]" />
          <div className="text-gray-600 font-mono">
            IIMOS Manufacturing OS v2.0
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;
