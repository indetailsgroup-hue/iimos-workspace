/**
 * DesignerIntentPanel - Updated with MaterialSelector
 * 
 * This file shows how to integrate MaterialSelector into the existing
 * DesignerIntentPanel component.
 */

import { useState } from 'react';
import { useCabinetStore, useCabinet } from '../../core/store/useCabinetStore';
import { HardwarePanel } from '../ui/HardwarePanel';
import { MaterialSelector } from '../ui/MaterialSelector';
import { 
  CoreStructureIcon, 
  SurfaceFinishIcon, 
  EdgeBandingIcon,
  MaterialStackIcon 
} from '../icons/MaterialIcons';
import { Plus, RefreshCw } from 'lucide-react';

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

// ============================================
// MATERIALS TAB - With MaterialSelector
// ============================================
function MaterialsContent() {
  const cabinet = useCabinet();
  const coreMaterialsRaw = useCabinetStore((s) => s.coreMaterials);
  const surfaceMaterials = useCabinetStore((s) => s.surfaceMaterials);
  const edgeMaterialsOnly = useCabinetStore((s) => s.edgeMaterials);

  // Add 'type' property to core materials to match Material interface
  const coreMaterials = Object.fromEntries(
    Object.entries(coreMaterialsRaw).map(([id, material]) => [
      id,
      {
        ...material,
        type: material.id.includes('pb') ? 'PARTICLEBOARD' :
              material.id.includes('mdf') ? 'MDF' :
              material.id.includes('ply') ? 'PLYWOOD' : 'CORE'
      }
    ])
  );

  // Edge Banding should combine Surface Finish materials + Edge-specific materials (PVC, ABS, Veneer, Wood, Aluminum)
  // Add 'type' property to edge-only materials to match Material interface
  const edgeMaterialsWithType = Object.fromEntries(
    Object.entries(edgeMaterialsOnly).map(([id, material]) => [
      id,
      {
        ...material,
        type: material.id.includes('pvc') ? 'PVC' :
              material.id.includes('abs') ? 'ABS' :
              material.id.includes('wood') ? 'WOOD' :
              material.id.includes('alu') ? 'ALUMINUM' :
              material.id.includes('hpl') ? 'HPL' : 'EDGE'
      }
    ])
  );
  const edgeMaterials = { ...surfaceMaterials, ...edgeMaterialsWithType };

  const setDefaultCore = useCabinetStore((s) => s.setDefaultCore);
  const setDefaultSurface = useCabinetStore((s) => s.setDefaultSurface);
  const setDefaultEdge = useCabinetStore((s) => s.setDefaultEdge);

  if (!cabinet) return null;

  const currentCoreId = cabinet.materials.defaultCore;
  const currentSurfaceId = cabinet.materials.defaultSurface;
  const currentEdgeId = cabinet.materials.defaultEdge;

  const currentCore = coreMaterials[currentCoreId as keyof typeof coreMaterials];
  const currentSurface = surfaceMaterials[currentSurfaceId as keyof typeof surfaceMaterials];
  
  return (
    <div className="p-3">
      {/* Header - Material Stack */}
      <div className="flex items-start justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
            <MaterialStackIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Material Stack</h3>
            <p className="text-xs text-gray-500">Configure panel composition</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-green-400 transition-all duration-200 border border-transparent hover:border-[#333]"
            title="Add material layer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-white transition-all duration-200 border border-transparent hover:border-[#333]"
            title="Reset to defaults"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-[1px] w-full bg-[#333] mb-4" />
      
      {/* Material Selectors */}
      <div className="flex flex-col gap-2">
        {/* Core Structure */}
        <MaterialSelector
          title="Core Structure"
          materials={coreMaterials}
          selectedId={currentCoreId}
          onSelect={(id) => {
            console.log('Selected core:', id);
            setDefaultCore(id);
          }}
          icon={<CoreStructureIcon className="w-4 h-4" />}
          color="orange"
          number={1}
        />

        {/* Surface Finish */}
        <MaterialSelector
          title="Surface Finish"
          materials={surfaceMaterials}
          selectedId={currentSurfaceId}
          onSelect={(id) => {
            console.log('Selected surface:', id);
            setDefaultSurface(id);
          }}
          icon={<SurfaceFinishIcon className="w-4 h-4" />}
          color="blue"
          number={2}
        />

        {/* Edge Banding */}
        <MaterialSelector
          title="Edge Banding"
          materials={edgeMaterials}
          selectedId={currentEdgeId}
          onSelect={(id) => {
            console.log('Selected edge:', id);
            setDefaultEdge(id);
          }}
          icon={<EdgeBandingIcon className="w-4 h-4" />}
          color="cyan"
          number={3}
        />
      </div>
      
      {/* Panel Stack Preview */}
      <div className="mt-4 p-3 bg-surface-2 rounded-xl border border-[#333]">
        <div className="text-xs text-gray-500 mb-2">Panel Stack Preview</div>
        <div className="flex items-center gap-1 text-xs">
          <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-mono">
            {currentCore?.thickness || 18}mm
          </span>
          <span className="text-gray-600">+</span>
          <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 font-mono">
            {currentSurface?.thickness || 0.8}mm×2
          </span>
          <span className="text-gray-600">=</span>
          <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20 font-medium font-mono">
            {((currentCore?.thickness || 18) + (currentSurface?.thickness || 0.8) * 2).toFixed(1)}mm
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// OTHER TABS (unchanged)
// ============================================

function CatalogContent() {
  return (
    <div className="p-4">
      <div className="text-gray-500 text-sm">Catalog content</div>
    </div>
  );
}

function HardwareContent() {
  return <HardwarePanel />;
}

function VersionsContent() {
  return (
    <div className="p-4">
      <div className="text-gray-500 text-sm">Versions content</div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function DesignerIntentPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('materials');

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Tab Bar */}
      <div className="flex border-b border-[#333] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2.5 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 relative
              ${activeTab === tab.id
                ? 'text-green-400 bg-surface-2'
                : 'text-gray-500 hover:text-white hover:bg-surface-2/50'
              }`}
          >
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400" />
            )}
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
