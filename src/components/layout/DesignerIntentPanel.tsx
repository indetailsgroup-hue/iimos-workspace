/**
 * DesignerIntentPanel - Left Panel (FUNCTIONAL)
 * 
 * Connected to useCabinetStore for material selection
 * 
 * Contains:
 * - Component Catalog (placeholder)
 * - Material System - FUNCTIONAL with SortableList Animation
 * - Fitting / Hardware Browser - FUNCTIONAL
 * - Versions / Variants (placeholder)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup, Reorder, useDragControls } from 'motion/react';
import { useCabinetStore, useCabinet } from '../../core/store/useCabinetStore';
import { HardwarePanel } from '../ui/HardwarePanel';
import { DirectionAwareTabs } from '../ui/DirectionAwareTabs';

// Icons - Modern Line Style (inspired by @mrncst)
// Grip/Drag Handle - 6 dots
const GripVerticalIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
  </svg>
);

// Layers Icon - Stack
const LayersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4L4 8l8 4 8-4-8-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l8 4 8-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l8 4 8-4" />
  </svg>
);

// Surface/Texture Icon - Horizontal lines
const ScanLineIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

// Edge/Corner Icon
const BoxSelectIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" d="M4 7V4h3" />
    <path strokeLinecap="round" d="M20 7V4h-3" />
    <path strokeLinecap="round" d="M4 17v3h3" />
    <path strokeLinecap="round" d="M20 17v3h-3" />
  </svg>
);

// Settings Icon - Sliders Style (MAIN - like in reference image)
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    {/* Line 1 with circle */}
    <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
    <circle cx="8" cy="6" r="2" fill="none" />
    {/* Line 2 with circle */}
    <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
    <circle cx="16" cy="12" r="2" fill="none" />
    {/* Line 3 with circle */}
    <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
    <circle cx="10" cy="18" r="2" fill="none" />
  </svg>
);

// X/Close Icon
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Check Icon
const CheckIcon = () => (
  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Plus Icon
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

// Refresh/Reset Icon
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

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

// Section Component with Animation
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  
  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setContentHeight(contentRef.current.scrollHeight);
        const timer = setTimeout(() => setContentHeight('auto'), 300);
        return () => clearTimeout(timer);
      } else {
        setContentHeight(contentRef.current.scrollHeight);
        requestAnimationFrame(() => setContentHeight(0));
      }
    }
  }, [isOpen]);
  
  return (
    <div className="border-b border-zinc-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg 
            className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">{title}</span>
        </div>
      </button>
      <div 
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ height: contentHeight }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Catalog Tab Content (placeholder)
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

// ============================================
// NEW: Material Configurator with SortableList Style
// ============================================

interface MaterialItem {
  id: string;
  text: string;
  type: 'core' | 'surface' | 'edge';
  checked: boolean;
}

function MaterialsContent() {
  const cabinet = useCabinet();
  const coreMaterials = useCabinetStore((s) => s.coreMaterials);
  const surfaceMaterials = useCabinetStore((s) => s.surfaceMaterials);
  const edgeMaterials = useCabinetStore((s) => s.edgeMaterials);
  const setDefaultCore = useCabinetStore((s) => s.setDefaultCore);
  const setDefaultSurface = useCabinetStore((s) => s.setDefaultSurface);
  const setDefaultEdge = useCabinetStore((s) => s.setDefaultEdge);
  
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [tabChangeRerender, setTabChangeRerender] = useState(1);
  
  // ALL HOOKS MUST BE BEFORE ANY EARLY RETURN!
  const handleCloseOnDrag = useCallback(() => {
    setOpenItemId(null);
  }, []);
  
  // Early return AFTER all hooks
  if (!cabinet) return null;
  
  // These can be after early return because they're not hooks
  const currentCoreId = cabinet.materials.defaultCore;
  const currentSurfaceId = cabinet.materials.defaultSurface;
  const currentEdgeId = cabinet.materials.defaultEdge;
  
  const currentCore = coreMaterials[currentCoreId];
  const currentSurface = surfaceMaterials[currentSurfaceId];
  const currentEdge = edgeMaterials[currentEdgeId];
  
  const materialItems: MaterialItem[] = [
    { id: 'core', text: currentCore?.name || 'Select Core', type: 'core', checked: !!currentCore },
    { id: 'surface', text: currentSurface?.name || 'Select Surface', type: 'surface', checked: !!currentSurface },
    { id: 'edge', text: currentEdge?.name || 'Select Edge', type: 'edge', checked: !!currentEdge },
  ];
  
  // Build tabs for each material type
  const getTabs = (type: 'core' | 'surface' | 'edge') => {
    if (type === 'core') {
      return [{
        id: 0,
        label: "Core Structure",
        icon: <LayersIcon />,
        content: (
          <div className="flex w-full flex-col py-2 gap-3">
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="space-y-1"
            >
              <label className="text-xs text-emerald-400/70 font-medium">Board Type (Grade E1)</label>
              <select 
                className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                value={currentCoreId}
                onChange={(e) => setDefaultCore(e.target.value)}
              >
                <optgroup label="Standard Boards">
                  {Object.values(coreMaterials).map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} ({mat.thickness}mm) - ฿{mat.costPerSqm}/m²
                    </option>
                  ))}
                </optgroup>
              </select>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-2"
            >
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Thickness</label>
                <div className="flex items-center h-[34px] rounded-md bg-zinc-800 border border-white/5 px-2 text-xs text-zinc-300">
                  {currentCore?.thickness || 18} mm
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Certifications</label>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded border border-green-800">E1</span>
                  <span className="text-[10px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800">V313</span>
                </div>
              </div>
            </motion.div>
          </div>
        ),
      }];
    }
    
    if (type === 'surface') {
      return [{
        id: 0,
        label: "Surface Finish",
        icon: <ScanLineIcon />,
        content: (
          <div className="flex flex-col py-2 gap-3">
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="space-y-1"
            >
              <label className="text-xs text-emerald-400/70 font-medium">Material / Brand</label>
              <select 
                className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                value={currentSurfaceId}
                onChange={(e) => setDefaultSurface(e.target.value)}
              >
                {Object.values(surfaceMaterials).map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name} ({mat.type}) - {mat.thickness}mm
                  </option>
                ))}
              </select>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-2"
            >
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Texture</label>
                <div className="flex items-center h-[34px] rounded-md bg-zinc-800 border border-white/5 px-2 text-xs text-zinc-300">
                  {currentSurface?.type || 'Matte'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Color</label>
                <div className="flex items-center gap-2 h-[34px]">
                  <div 
                    className="w-6 h-6 rounded border border-zinc-600"
                    style={{ backgroundColor: currentSurface?.color || '#666' }}
                  />
                  <span className="text-xs text-zinc-300">{currentSurface?.name?.split(' ')[0] || 'N/A'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        ),
      }];
    }
    
    // Edge
    return [{
      id: 0,
      label: "Edge Banding",
      icon: <BoxSelectIcon />,
      content: (
        <div className="flex flex-col py-2 gap-3">
          <div className="flex gap-2">
            <div className="w-2/3 space-y-1">
              <label className="text-xs text-emerald-400/70 font-medium">Material Spec</label>
              <select 
                value={currentEdgeId}
                onChange={(e) => setDefaultEdge(e.target.value)}
                className="w-full rounded-md bg-zinc-900 border border-white/10 px-2 py-2 text-xs text-white outline-none"
              >
                {Object.values(edgeMaterials).map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name} ({mat.thickness}mm)
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/3 space-y-1">
              <label className="text-xs text-zinc-400">Glue Sys.</label>
              <div className="flex items-center justify-center h-[34px] rounded-md bg-zinc-800 border border-white/5 text-xs text-zinc-300">
                PUR
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="rounded border border-dashed border-white/10 bg-white/5 p-2 flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Exposed</span>
              <span className="text-sm font-semibold text-emerald-400">1.0 mm</span>
            </div>
            <div className="rounded border border-dashed border-white/10 bg-white/5 p-2 flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Concealed</span>
              <span className="text-sm font-semibold text-zinc-400">0.4 mm</span>
            </div>
          </div>
        </div>
      ),
    }];
  };
  
  return (
    <div className="p-2">
      {/* Header - Agent Workflow Style */}
      <div className="flex items-start justify-between mb-4 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayersIcon />
            <h3 className="text-sm font-semibold text-white">Material Stack</h3>
          </div>
          <p className="text-[10px] text-emerald-400/70">Configure panel composition</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors">
            <PlusIcon />
          </button>
          <button className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
            <RefreshIcon />
          </button>
        </div>
      </div>
      
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-4" />
      
      {/* Sortable Material Items */}
      <div className="flex flex-col gap-2">
        {materialItems.map((item, index) => (
          <MaterialListItem
            key={item.id}
            item={item}
            index={index}
            isOpen={openItemId === item.id}
            onToggle={() => setOpenItemId(openItemId === item.id ? null : item.id)}
            tabs={getTabs(item.type)}
            tabChangeRerender={tabChangeRerender}
            onTabChange={() => setTabChangeRerender(tabChangeRerender + 1)}
            onClose={() => setOpenItemId(null)}
          />
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Panel Stack Preview</div>
        <div className="flex items-center gap-1 text-xs">
          <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded">{currentCore?.thickness || 18}mm</span>
          <span className="text-zinc-600">+</span>
          <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">{currentSurface?.thickness || 0.3}mm×2</span>
          <span className="text-zinc-600">=</span>
          <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded font-medium">
            {((currentCore?.thickness || 18) + (currentSurface?.thickness || 0.3) * 2).toFixed(1)}mm
          </span>
        </div>
      </div>
    </div>
  );
}

// Separate component to fix hooks issue
interface MaterialListItemProps {
  item: MaterialItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  tabs: any[];
  tabChangeRerender: number;
  onTabChange: () => void;
  onClose: () => void;
}

function MaterialListItem({ 
  item, 
  index, 
  isOpen, 
  onToggle, 
  tabs, 
  tabChangeRerender,
  onTabChange,
  onClose 
}: MaterialListItemProps) {
  const dragControls = useDragControls();
  
  const typeLabel = item.type === 'core' ? 'CORE' : item.type === 'surface' ? 'SURFACE' : 'EDGE';
  const typeNumber = item.type === 'core' ? '1' : item.type === 'surface' ? '2' : '3';
  const typeColor = item.type === 'core' ? 'bg-amber-900/30 text-amber-400 border-amber-800' 
    : item.type === 'surface' ? 'bg-blue-900/30 text-blue-400 border-blue-800' 
    : 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.05 }}
      className={`
        relative flex w-full flex-col overflow-hidden rounded-xl border transition-colors
        ${isOpen ? 'bg-zinc-800/50 border-emerald-500/30' : 'bg-zinc-900 border-white/5 hover:bg-zinc-800'}
      `}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox Circle with Number */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-zinc-600 text-zinc-500 text-xs">
          {typeNumber}
        </div>

        {/* Text Content */}
        <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
          {item.text}
        </span>
        
        {/* Settings Button - Sliders Icon */}
        <motion.button
          layout
          onClick={onToggle}
          className={`p-1 transition-colors ${isOpen ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}
        >
          {isOpen ? <XIcon /> : <SettingsIcon />}
        </motion.button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 bg-black/20 px-4 pb-4">
              <LayoutGroup id={item.id}>
                <motion.div className="flex w-full flex-col pt-3">
                  <DirectionAwareTabs
                    className="w-full"
                    rounded="rounded-sm"
                    tabs={tabs}
                    onChange={onTabChange}
                  />
                  
                  {/* Footer */}
                  <motion.div
                    key={`re-render-${tabChangeRerender}`}
                    className="mt-4 flex w-full items-center justify-between border-t border-white/5 pt-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                      <span className="text-xs text-zinc-400 font-mono uppercase">
                        Ready for CNC
                      </span>
                    </div>
                    <button
                      onClick={onClose}
                      className="h-7 px-3 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all font-medium text-xs"
                    >
                      CONFIRM
                    </button>
                  </motion.div>
                </motion.div>
              </LayoutGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
        <motion.div 
          key={v.version} 
          className="p-3 bg-zinc-800/50 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">{v.version}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              v.status === 'Current' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {v.status}
            </span>
          </div>
          <div className="text-xs text-zinc-500">{v.date} • {v.author}</div>
        </motion.div>
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
