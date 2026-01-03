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
    DRAFT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    FROZEN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    RELEASED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  
  const icons = {
    DRAFT: '📝',
    FROZEN: '❄️',
    RELEASED: '✅',
  };
  
  return (
    <div className="relative group">
      <button 
        className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center gap-2 ${colors[state]}`}
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
    OK: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WARNING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    BLOCKED: 'bg-red-500/20 text-red-400 border-red-500/30',
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
        className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center gap-2 ${colors[status]}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <span className="text-sm">{icons[status]}</span>
        <span>Gate: {status}</span>
      </button>
      
      {showDetails && (errors.length > 0 || warnings.length > 0) && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-4">
          <h4 className="text-white font-semibold text-sm mb-3">Gate Validation Report</h4>
          
          {errors.length > 0 && (
            <div className="mb-3">
              <div className="text-red-400 text-xs font-medium mb-1">❌ Errors (Blocking)</div>
              {errors.map((err, i) => (
                <div key={i} className="text-zinc-400 text-xs pl-4 py-0.5">• {err}</div>
              ))}
            </div>
          )}
          
          {warnings.length > 0 && (
            <div>
              <div className="text-amber-400 text-xs font-medium mb-1">⚠ Warnings</div>
              {warnings.map((warn, i) => (
                <div key={i} className="text-zinc-400 text-xs pl-4 py-0.5">• {warn}</div>
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
      className={`px-4 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all
        ${enabled 
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' 
          : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
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
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* PROJECT HEADER */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        {/* Left: Logo + Project Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">II</span>
            </div>
            <span className="text-emerald-400 font-semibold text-sm">IIMOS</span>
          </div>
          
          <div className="h-6 w-px bg-zinc-700" />
          
          <div>
            <span className="text-white font-medium">{project.name}</span>
            <span className="text-zinc-500 text-xs ml-2">v{project.version}</span>
          </div>
        </div>
        
        {/* Center: View Controls (placeholder) */}
        <div className="flex items-center gap-2">
          {['Front', 'Left', 'Perspective', 'Install', 'Factory', 'CNC'].map((view) => (
            <button 
              key={view}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
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
          <div className="h-6 w-px bg-zinc-700" />
          <ExportButton enabled={canExport} onClick={onExport} />
        </div>
      </header>
      
      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Designer Intent */}
        <aside className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Designer Intent</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {leftPanel}
          </div>
        </aside>
        
        {/* CENTER - R3F Viewport */}
        <main className="flex-1 relative overflow-hidden">
          {viewport}
          
          {/* Engine Info Badge */}
          <div className="absolute bottom-4 left-4 text-emerald-400 text-xs font-mono space-y-0.5 pointer-events-none">
            <div className="font-semibold">BIOPHILIC RENDER ENGINE</div>
            <div className="text-zinc-500">Scale: 1 Unit = 1mm</div>
            <div className="text-zinc-500">Mode: True-Grain™ + Real-Scale UV</div>
            <div className="text-zinc-500">Engine: R3F / PBR Manufacturing</div>
          </div>
        </main>
        
        {/* RIGHT PANEL - Parametric Contract */}
        <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Parametric Contract</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel}
          </div>
        </aside>
      </div>
      
      {/* FOOTER */}
      <footer className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 text-xs shrink-0">
        {/* Machine Compatibility */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Machine:</span>
            <span className="text-emerald-400">Homag CENTATEQ P-110</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Nesting:</span>
            <span className="text-zinc-300">Ready</span>
          </div>
        </div>
        
        {/* Validation Token */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Validation:</span>
            <span className="text-zinc-300 font-mono">
              {project.gateStatus === 'OK' ? '✓ PASSED' : '○ PENDING'}
            </span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Panels:</span>
            <span className="text-zinc-300">6</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="text-zinc-500">
            © IIMOS Manufacturing OS v1.0
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;
