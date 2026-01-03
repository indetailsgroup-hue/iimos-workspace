/**
 * IIMOS Designer Workspace - Main App
 * 
 * SPEC-08 Compliant Architecture:
 * - Left Panel: Designer Intent (Catalog, Materials, Hardware, Versions)
 * - Viewport: R3F Canvas with Cabinet3D + View System
 * - Right Panel: Parametric Contract (Dimensions, Rules, Safety)
 * 
 * Features:
 * - View System (Front/Left/Perspective/Install/Factory/CNC)
 * - Panel Selection & Override
 * - Hardware System
 * - Gate & Export System
 * - Safety & Gate Page (Manufacturing OS Theme)
 */

import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { AppShell, SpecState, GateStatus } from './components/layout/AppShell';
import { DesignerIntentPanel } from './components/layout/DesignerIntentPanel';
import { ParametricContractPanel } from './components/layout/ParametricContractPanel';
import { Cabinet3D } from './components/canvas/Cabinet3D';
import { InfiniteGrid } from './components/canvas/InfiniteGrid';
import { CameraController, ViewType, VIEW_PRESETS } from './components/canvas/ViewportController';
import { PanelConfigModal } from './components/ui/PanelOverrideModal';
import { SafetyGatePage } from './components/pages/SafetyGatePage';
import { useCabinetStore } from './core/store/useCabinetStore';

// App modes
type AppMode = 'designer' | 'safety-gate';

// View Toolbar Component
function ViewToolbar({ 
  currentView, 
  onViewChange 
}: { 
  currentView: ViewType; 
  onViewChange: (view: ViewType) => void;
}) {
  const views: ViewType[] = ['Front', 'Left', 'Perspective', 'Install', 'Factory', 'CNC'];
  
  return (
    <div className="flex items-center gap-1">
      {views.map((view) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors rounded
            ${view === currentView 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          title={VIEW_PRESETS[view].description}
        >
          {view}
        </button>
      ))}
    </div>
  );
}

// R3F Viewport Component with View System
interface ViewportProps {
  currentView: ViewType;
}

function Viewport({ currentView }: ViewportProps) {
  return (
    <Canvas
      shadows
      camera={{ 
        position: VIEW_PRESETS[currentView].position, 
        fov: VIEW_PRESETS[currentView].fov, 
        near: 1, 
        far: 100000 
      }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a0a' }}
    >
      <Suspense fallback={null}>
        {/* Camera Controller */}
        <CameraController viewType={currentView} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[2000, 3000, 2000]} 
          intensity={1.2} 
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight 
          position={[-1500, 1000, -1000]} 
          intensity={0.3} 
        />
        
        {/* Environment for reflections */}
        <Environment preset="studio" />
        
        {/* Cabinet */}
        <Cabinet3D />
        
        {/* Infinite Grid */}
        <InfiniteGrid />
        
        {/* Controls */}
        <OrbitControls 
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={500}
          maxDistance={10000}
          target={VIEW_PRESETS[currentView].target}
        />
      </Suspense>
    </Canvas>
  );
}

export function App() {
  const [specState, setSpecState] = useState<SpecState>('DRAFT');
  const [currentView, setCurrentView] = useState<ViewType>('Perspective');
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('designer');
  
  const createCabinet = useCabinetStore((s) => s.createCabinet);
  const cabinet = useCabinetStore((s) => s.cabinet);
  const selectedPanelId = useCabinetStore((s) => s.selectedPanelId);
  
  // Initialize cabinet on first load
  useEffect(() => {
    if (!cabinet) {
      console.log('[App] Creating default cabinet...');
      createCabinet('BASE', 'Kitchen Base Cabinet');
    }
  }, [cabinet, createCabinet]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press 'E' to edit selected panel
      if (e.key === 'e' && selectedPanelId && appMode === 'designer') {
        setShowPanelModal(true);
      }
      // Press 'Escape' to close modal
      if (e.key === 'Escape') {
        setShowPanelModal(false);
      }
      // Press 'G' to toggle Safety & Gate page
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setAppMode(prev => prev === 'designer' ? 'safety-gate' : 'designer');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPanelId, appMode]);
  
  // If in Safety & Gate mode, show that page
  if (appMode === 'safety-gate') {
    return (
      <div>
        <SafetyGatePage />
        {/* Floating button to go back */}
        <button
          onClick={() => setAppMode('designer')}
          className="fixed bottom-6 right-6 px-4 py-2 bg-emerald-500 text-white rounded-lg shadow-lg hover:bg-emerald-600 transition-colors z-50"
        >
          ← Back to Designer (G)
        </button>
      </div>
    );
  }
  
  // Calculate gate status based on spec state and validation
  const gateStatus: GateStatus = specState === 'DRAFT' ? 'WARNING' : specState === 'FROZEN' ? 'OK' : 'OK';
  const gateErrors: string[] = [];
  const gateWarnings: string[] = specState === 'DRAFT' 
    ? ['Spec is in DRAFT state - cannot export CNC'] 
    : [];

  const handleExport = () => {
    console.log('Exporting to CNC...');
    // TODO: Implement export logic
  };
  
  // Viewport with view toolbar overlay
  const viewportWithToolbar = (
    <div className="relative w-full h-full">
      {/* View Toolbar - Top Center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg p-1">
          <ViewToolbar currentView={currentView} onViewChange={setCurrentView} />
        </div>
      </div>
      
      {/* Safety & Gate Button - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setAppMode('safety-gate')}
          className="px-4 py-2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white hover:border-emerald-500/50 transition-colors"
        >
          🛡️ Safety & Gate (G)
        </button>
      </div>
      
      {/* Selected Panel Info */}
      {selectedPanelId && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-2">
            <div className="text-xs text-zinc-400">Selected Panel</div>
            <div className="text-sm text-white">
              {cabinet?.panels.find(p => p.id === selectedPanelId)?.name || 'Unknown'}
            </div>
            <div className="text-xs text-emerald-400 mt-1">Press E to edit</div>
          </div>
        </div>
      )}
      
      {/* Viewport */}
      <Viewport currentView={currentView} />
    </div>
  );

  return (
    <>
      <AppShell
        project={{
          name: cabinet?.name || 'Kitchen Base Cabinet',
          version: '1.2',
          specState,
          gateStatus,
          gateErrors,
          gateWarnings,
        }}
        leftPanel={<DesignerIntentPanel />}
        viewport={viewportWithToolbar}
        rightPanel={<ParametricContractPanel />}
        onExport={handleExport}
        onSpecStateChange={setSpecState}
      />
      
      {/* Panel Config Modal */}
      <PanelConfigModal
        panelId={selectedPanelId}
        isOpen={showPanelModal}
        onClose={() => setShowPanelModal(false)}
      />
    </>
  );
}

export default App;
