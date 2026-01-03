/**
 * ParametricContractPanel - Right Panel (FUNCTIONAL)
 * Tabs: Contract | Export
 */

import React, { useState } from 'react';
import { useCabinetStore, useCabinet } from '../../core/store/useCabinetStore';
import { ExportPanel } from '../ui/ExportPanel';

type TabId = 'contract' | 'export';
type GateStatus = 'DRAFT' | 'FROZEN' | 'RELEASED';

function Section({ title, children, status, defaultOpen = true }: { 
  title: string; children: React.ReactNode; status?: 'OK' | 'WARNING' | 'ERROR'; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const statusColors = { OK: 'bg-emerald-500', WARNING: 'bg-amber-500', ERROR: 'bg-red-500' };
  
  return (
    <div className="border-b border-zinc-800">
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-300">{title}</span>
          {status && <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />}
        </div>
        <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function DimensionInput({ label, value, unit, min, max, onChange }: { 
  label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={value} min={min} max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 px-2 py-1 text-right text-sm bg-zinc-800 border border-zinc-700 rounded focus:outline-none focus:border-emerald-500 text-white"
        />
        <span className="text-xs text-zinc-500 w-8">{unit}</span>
      </div>
    </div>
  );
}

function ToggleInput({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-xs text-zinc-400">{label}</label>
      <button onClick={onChange}
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function ContractContent() {
  const cabinet = useCabinet();
  const setDimension = useCabinetStore((s) => s.setDimension);
  const setShelfCount = useCabinetStore((s) => s.setShelfCount);
  const setDividerCount = useCabinetStore((s) => s.setDividerCount);
  const toggleBackPanel = useCabinetStore((s) => s.toggleBackPanel);
  const setJointType = useCabinetStore((s) => s.setJointType);
  const selectPanel = useCabinetStore((s) => s.selectPanel);
  const selectedPanelId = useCabinetStore((s) => s.selectedPanelId);
  const coreMaterials = useCabinetStore((s) => s.coreMaterials);
  const surfaceMaterials = useCabinetStore((s) => s.surfaceMaterials);
  const edgeMaterials = useCabinetStore((s) => s.edgeMaterials);
  
  // DEBUG: Log computed values
  console.log('[ContractContent] cabinet.computed:', cabinet?.computed);
  console.log('[ContractContent] panels surfaceArea:', cabinet?.panels?.map(p => ({ role: p.role, area: p.computed?.surfaceArea })));
  
  if (!cabinet) return <div className="p-4 text-zinc-500">Loading...</div>;
  
  const currentCore = coreMaterials[cabinet.materials.defaultCore];
  const currentSurface = surfaceMaterials[cabinet.materials.defaultSurface];
  const currentEdge = edgeMaterials[cabinet.materials.defaultEdge];
  const totalThickness = (currentCore?.thickness || 16) + ((currentSurface?.thickness || 0.3) * 2);

  return (
    <>
      <Section title="Cabinet Dimensions" status="OK">
        <DimensionInput label="Width (W)" value={cabinet.dimensions.width} unit="mm" min={300} max={1200} onChange={(v) => setDimension('width', v)} />
        <DimensionInput label="Height (H)" value={cabinet.dimensions.height} unit="mm" min={200} max={2400} onChange={(v) => setDimension('height', v)} />
        <DimensionInput label="Depth (D)" value={cabinet.dimensions.depth} unit="mm" min={200} max={800} onChange={(v) => setDimension('depth', v)} />
        <DimensionInput label="Toe Kick" value={cabinet.dimensions.toeKickHeight} unit="mm" min={0} max={200} onChange={(v) => setDimension('toeKickHeight', v)} />
      </Section>
      
      <Section title="Structure & Rules" status="OK">
        <DimensionInput label="Shelf Count" value={cabinet.structure.shelfCount} unit="pcs" min={0} max={10} onChange={setShelfCount} />
        <DimensionInput label="Divider Count" value={cabinet.structure.dividerCount} unit="pcs" min={0} max={5} onChange={setDividerCount} />
        <ToggleInput label="Back Panel" value={cabinet.structure.hasBackPanel} onChange={toggleBackPanel} />
        <div className="pt-2 border-t border-zinc-800 mt-2">
          <div className="flex items-center justify-between py-2">
            <label className="text-xs text-zinc-400">Top Joint</label>
            <select value={cabinet.structure.topJoint} onChange={(e) => setJointType('top', e.target.value as any)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white">
              <option value="OVERLAY">Overlay</option>
              <option value="INSET">Inset</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2">
            <label className="text-xs text-zinc-400">Bottom Joint</label>
            <select value={cabinet.structure.bottomJoint} onChange={(e) => setJointType('bottom', e.target.value as any)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white">
              <option value="OVERLAY">Overlay</option>
              <option value="INSET">Inset</option>
            </select>
          </div>
        </div>
      </Section>
      
      <Section title="Composite Material" status="OK">
        <div className="p-3 bg-zinc-800/50 rounded-lg mb-3">
          <div className="text-xs text-zinc-500 mb-2">Panel Stack</div>
          <div className="flex items-center gap-1 text-xs">
            <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded">CORE</span>
            <span className="text-zinc-600">+</span>
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">SURFACE</span>
            <span className="text-zinc-600">+</span>
            <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded">EDGE</span>
          </div>
        </div>
        <div className="text-xs text-zinc-400 space-y-1">
          <div className="flex justify-between"><span>Core</span><span className="text-zinc-300">{currentCore?.name || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Surface</span><span className="text-zinc-300">{currentSurface?.name || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Edge</span><span className="text-zinc-300">{currentEdge?.name || 'N/A'}</span></div>
          <div className="flex justify-between pt-1 border-t border-zinc-800">
            <span className="font-medium">Total Thickness</span>
            <span className="text-emerald-400 font-medium">{totalThickness.toFixed(1)}mm</span>
          </div>
        </div>
      </Section>
      
      <Section title="Computed Values" status="OK">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="text-zinc-500">Total Area</div>
            <div className="text-white font-medium">{(cabinet.computed?.totalSurfaceArea || 0).toFixed(2)} m²</div>
          </div>
          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="text-zinc-500">Est. Cost</div>
            <div className="text-emerald-400 font-medium">฿{(cabinet.computed?.totalCost || 0).toFixed(0)}</div>
          </div>
          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="text-zinc-500">Panel Count</div>
            <div className="text-white font-medium">{cabinet.panels?.length || 0}</div>
          </div>
          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="text-zinc-500">CO₂</div>
            <div className="text-amber-400 font-medium">{(cabinet.computed?.totalCO2 || 0).toFixed(1)} kg</div>
          </div>
        </div>
      </Section>
      
      <Section title="Panel List" status="OK" defaultOpen={false}>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {(cabinet.panels || []).map((panel) => (
            <div key={panel.id} onClick={() => selectPanel(panel.id)}
              className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors
                ${selectedPanelId === panel.id ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-zinc-800/30 hover:bg-zinc-700/50'}`}>
              <span className="text-zinc-300">{panel.name || panel.role}</span>
              <span className="text-zinc-500">{panel.finishWidth}×{panel.finishHeight}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

export function ParametricContractPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('contract');
  const [gateStatus, setGateStatus] = useState<GateStatus>('DRAFT');
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-zinc-800 shrink-0">
        <button onClick={() => setActiveTab('contract')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors
            ${activeTab === 'contract' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
          📐 Contract
        </button>
        <button onClick={() => setActiveTab('export')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors
            ${activeTab === 'export' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
          📤 Export
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contract' && <ContractContent />}
        {activeTab === 'export' && <ExportPanel gateStatus={gateStatus} onGateChange={setGateStatus} />}
      </div>
    </div>
  );
}

export default ParametricContractPanel;
