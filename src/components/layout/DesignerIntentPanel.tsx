/**
 * DesignerIntentPanel - Left Panel (FUNCTIONAL)
 * 
 * Connected to useCabinetStore for material selection
 * 
 * Contains:
 * - Component Catalog (placeholder)
 * - Material System - FUNCTIONAL
 * - Fitting / Hardware Browser - FUNCTIONAL
 * - Versions / Variants (placeholder)
 */

import React, { useState } from 'react';
import { useCabinetStore, useCabinet } from '../../core/store/useCabinetStore';
import { HardwarePanel } from '../ui/HardwarePanel';

// Tab types
type TabId = 'catalog' | 'materials' | 'hardware' | 'versions';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'catalog', label: 'Catalog', icon: '📦' },
  { id: 'materials', label: 'Materials', icon: '🎨' },
  { id: 'hardware', label: 'Hardware', icon: '🔩' },
  { id: 'versions', label: 'Versions', icon: '📋' },
];

// Section Component
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-zinc-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        <svg 
          className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Catalog Tab Content (placeholder - can be made functional later)
function CatalogContent() {
  const CATALOG_ITEMS = [
    { id: 'base-cabinet', name: 'Base Cabinet', icon: '🗄️', category: 'Cabinets' },
    { id: 'wall-cabinet', name: 'Wall Cabinet', icon: '📦', category: 'Cabinets' },
    { id: 'tall-cabinet', name: 'Tall Cabinet', icon: '🚪', category: 'Cabinets' },
    { id: 'drawer-unit', name: 'Drawer Unit', icon: '🗃️', category: 'Cabinets' },
    { id: 'corner-cabinet', name: 'Corner Cabinet', icon: '📐', category: 'Cabinets' },
    { id: 'shelf', name: 'Adjustable Shelf', icon: '➖', category: 'Components' },
    { id: 'divider', name: 'Vertical Divider', icon: '|', category: 'Components' },
    { id: 'drawer', name: 'Drawer Box', icon: '📥', category: 'Components' },
  ];
  
  const categories = [...new Set(CATALOG_ITEMS.map(item => item.category))];
  
  return (
    <div className="space-y-2">
      {categories.map(category => (
        <Section key={category} title={category}>
          <div className="grid grid-cols-2 gap-2">
            {CATALOG_ITEMS.filter(item => item.category === category).map(item => (
              <button
                key={item.id}
                className="p-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg text-left transition-colors group"
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs text-zinc-400 group-hover:text-white transition-colors">{item.name}</div>
              </button>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

// Materials Tab Content - FUNCTIONAL
function MaterialsContent() {
  const cabinet = useCabinet();
  const coreMaterials = useCabinetStore((s) => s.coreMaterials);
  const surfaceMaterials = useCabinetStore((s) => s.surfaceMaterials);
  const edgeMaterials = useCabinetStore((s) => s.edgeMaterials);
  const setDefaultCore = useCabinetStore((s) => s.setDefaultCore);
  const setDefaultSurface = useCabinetStore((s) => s.setDefaultSurface);
  const setDefaultEdge = useCabinetStore((s) => s.setDefaultEdge);
  
  if (!cabinet) return null;
  
  const currentCoreId = cabinet.materials.defaultCore;
  const currentSurfaceId = cabinet.materials.defaultSurface;
  const currentEdgeId = cabinet.materials.defaultEdge;
  
  return (
    <div className="space-y-2">
      {/* Core Structure - FUNCTIONAL */}
      <Section title="Core Structure">
        <div className="space-y-2">
          {Object.values(coreMaterials).map((mat) => (
            <div 
              key={mat.id}
              onClick={() => setDefaultCore(mat.id)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                ${currentCoreId === mat.id 
                  ? 'bg-emerald-500/20 border border-emerald-500/50' 
                  : 'bg-zinc-800/50 hover:bg-zinc-700/50'}`}
            >
              <div className="w-8 h-8 rounded bg-amber-900/50 border border-amber-700/30 flex items-center justify-center text-xs text-amber-400">
                {mat.thickness}
              </div>
              <div className="flex-1">
                <span className="text-xs text-zinc-300">{mat.name}</span>
                <div className="text-[10px] text-zinc-500">฿{mat.costPerSqm}/m²</div>
              </div>
              {currentCoreId === mat.id && (
                <span className="text-emerald-400 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      </Section>
      
      {/* Surface Finish - FUNCTIONAL */}
      <Section title="Surface Finish">
        <div className="space-y-2">
          {Object.values(surfaceMaterials).map((mat) => (
            <div 
              key={mat.id}
              onClick={() => setDefaultSurface(mat.id)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                ${currentSurfaceId === mat.id 
                  ? 'bg-emerald-500/20 border border-emerald-500/50' 
                  : 'bg-zinc-800/50 hover:bg-zinc-700/50'}`}
            >
              <div 
                className="w-8 h-8 rounded border border-zinc-600"
                style={{ backgroundColor: mat.color }}
              />
              <div className="flex-1">
                <span className="text-xs text-zinc-300">{mat.name}</span>
                <div className="text-[10px] text-zinc-500">{mat.type} • {mat.thickness}mm</div>
              </div>
              {currentSurfaceId === mat.id && (
                <span className="text-emerald-400 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      </Section>
      
      {/* Edge Banding - FUNCTIONAL */}
      <Section title="Edge Banding">
        <div className="space-y-2">
          {Object.values(edgeMaterials).map((mat) => (
            <div 
              key={mat.id}
              onClick={() => setDefaultEdge(mat.id)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                ${currentEdgeId === mat.id 
                  ? 'bg-emerald-500/20 border border-emerald-500/50' 
                  : 'bg-zinc-800/50 hover:bg-zinc-700/50'}`}
            >
              <div 
                className="w-6 h-6 rounded border border-zinc-500"
                style={{ backgroundColor: mat.color }}
              />
              <div className="flex-1">
                <span className="text-xs text-zinc-300">{mat.name}</span>
                <div className="text-[10px] text-zinc-500">{mat.thickness}mm</div>
              </div>
              {currentEdgeId === mat.id && (
                <span className="text-emerald-400 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Hardware Tab Content - FUNCTIONAL
function HardwareContent() {
  return <HardwarePanel />;
}

// Versions Tab Content (placeholder)
function VersionsContent() {
  return (
    <div className="space-y-4 p-2">
      <div className="text-xs text-zinc-500 mb-4">Version History</div>
      
      {[
        { version: 'v1.2', date: 'Today 14:30', status: 'Current', author: 'Designer' },
        { version: 'v1.1', date: 'Yesterday', status: 'Released', author: 'Designer' },
        { version: 'v1.0', date: '2 days ago', status: 'Released', author: 'Designer' },
      ].map((v) => (
        <div key={v.version} className="p-3 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">{v.version}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              v.status === 'Current' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {v.status}
            </span>
          </div>
          <div className="text-xs text-zinc-500">{v.date} • {v.author}</div>
        </div>
      ))}
      
      <button className="w-full p-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors">
        + Create New Version
      </button>
    </div>
  );
}

// Main Component
export function DesignerIntentPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('materials');
  
  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1
              ${activeTab === tab.id 
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-800/30' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden xl:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'catalog' && <CatalogContent />}
        {activeTab === 'materials' && <MaterialsContent />}
        {activeTab === 'hardware' && <HardwareContent />}
        {activeTab === 'versions' && <VersionsContent />}
      </div>
    </div>
  );
}

export default DesignerIntentPanel;
