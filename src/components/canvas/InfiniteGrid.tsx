/**
 * InfiniteGrid - Biophilic Render Engine Grid
 * 
 * Features:
 * - Infinite grid with fade distance
 * - Configurable cell size and section size
 * - Click to open settings popup
 * - Dark theme matching the render engine style
 */

import { useState, useRef } from 'react';
import { Grid, Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

// Grid Settings Store
interface GridSettings {
  enabled: boolean;
  cellSize: number;      // mm
  sectionSize: number;   // mm (thick lines every N cells)
  fadeDistance: number;  // meters
}

const DEFAULT_GRID_SETTINGS: GridSettings = {
  enabled: true,
  cellSize: 100,
  sectionSize: 1000,
  fadeDistance: 78,
};

interface InfiniteGridProps {
  settings?: Partial<GridSettings>;
  onSettingsChange?: (settings: GridSettings) => void;
}

export function InfiniteGrid({ settings: propSettings, onSettingsChange }: InfiniteGridProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<GridSettings>({
    ...DEFAULT_GRID_SETTINGS,
    ...propSettings,
  });
  
  const handleSettingChange = (key: keyof GridSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };
  
  const handleGridClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setShowSettings(true);
  };
  
  if (!localSettings.enabled) return null;
  
  // Calculate section ratio (how many cells per section)
  const sectionRatio = Math.max(1, Math.round(localSettings.sectionSize / localSettings.cellSize));
  
  return (
    <group>
      {/* Clickable plane for settings */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]}
        onClick={handleGridClick}
      >
        <planeGeometry args={[100000, 100000]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      
      {/* drei Grid - stable, no flickering */}
      <Grid
        position={[0, 0, 0]}
        args={[100000, 100000]}
        cellSize={localSettings.cellSize}
        cellThickness={0.6}
        cellColor="#2a2a2a"
        sectionSize={localSettings.cellSize * sectionRatio}
        sectionThickness={1.2}
        sectionColor="#3a3a3a"
        fadeDistance={localSettings.fadeDistance * 1000}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid={true}
      />
      
      {/* Settings Popup */}
      {showSettings && (
        <Html
          position={[300, 200, 300]}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-700 p-4 min-w-[280px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm tracking-wide">GRID SETTINGS</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Infinite Grid Toggle */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-300 text-sm">Infinite Grid</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enabled}
                  onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            
            {/* Cell Size */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300 text-sm">Cell Size</span>
                <span className="text-zinc-400 text-sm">{localSettings.cellSize}mm</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={localSettings.cellSize}
                onChange={(e) => handleSettingChange('cellSize', Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            
            {/* Section Size */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300 text-sm">Section Size</span>
                <span className="text-zinc-400 text-sm">{localSettings.sectionSize}mm</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={localSettings.sectionSize}
                onChange={(e) => handleSettingChange('sectionSize', Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            
            {/* Fade Distance */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300 text-sm">Fade Distance</span>
                <span className="text-zinc-400 text-sm">{localSettings.fadeDistance}m</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="1"
                value={localSettings.fadeDistance}
                onChange={(e) => handleSettingChange('fadeDistance', Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default InfiniteGrid;
