/**
 * Cabinet3D - Renders parametric cabinet in 3D (Visual Layer)
 * 
 * ARCHITECTURE NOTE (North Star):
 * - This is the MAGIC/VISUAL layer - for display only
 * - CAM Truth comes from OperationGraph, NEVER from this visual mesh
 * - All dimensions in millimeters (mm)
 */

import { useRef, useMemo, useState, useEffect } from 'react';
import { Mesh, CanvasTexture, SRGBColorSpace, BoxGeometry, RepeatWrapping } from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
// NO ALIAS IMPORTS - Use relative paths only (North Star Rule #3)
import { useCabinetStore, useCabinet } from '../../core/store/useCabinetStore';
import { CabinetPanel } from '../../core/types/Cabinet';

// Custom hook to load texture from data URL
function useDataTexture(dataUrl: string | null) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  const { invalidate } = useThree();
  
  useEffect(() => {
    // Track current texture for cleanup
    let currentTexture: CanvasTexture | null = null;
    let cancelled = false;
    
    if (!dataUrl) {
      setTexture(null);
      return;
    }
    
    console.log('[useDataTexture] Loading texture from data URL...', dataUrl.substring(0, 50));
    
    // Create image and load data URL
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (cancelled) return;
      
      console.log('[useDataTexture] Image loaded:', img.width, 'x', img.height);
      
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Create texture from canvas
        const tex = new CanvasTexture(canvas);
        // IMPORTANT: Enable repeat wrapping for world-scale UV
        tex.wrapS = RepeatWrapping;
        tex.wrapT = RepeatWrapping;
        tex.colorSpace = SRGBColorSpace;
        tex.needsUpdate = true;
        
        currentTexture = tex;
        setTexture(tex);
        invalidate();
        
        console.log('[useDataTexture] ✅ Texture created with RepeatWrapping');
      }
    };
    
    img.onerror = (err) => {
      console.error('[useDataTexture] ❌ Failed to load texture image:', err);
      setTexture(null);
    };
    
    img.src = dataUrl;
    
    // Cleanup function
    return () => {
      cancelled = true;
      if (currentTexture) {
        console.log('[useDataTexture] Disposing texture');
        currentTexture.dispose();
      }
    };
  }, [dataUrl, invalidate]);
  
  return texture;
}

export function Cabinet3D() {
  const cabinet = useCabinet();
  const selectedPanelId = useCabinetStore((s) => s.selectedPanelId);
  const selectPanel = useCabinetStore((s) => s.selectPanel);
  const surfaceMaterials = useCabinetStore((s) => s.surfaceMaterials);
  const edgeMaterials = useCabinetStore((s) => s.edgeMaterials);
  
  if (!cabinet) return null;
  
  // Get default surface material
  const defaultSurface = surfaceMaterials[cabinet.materials.defaultSurface as keyof typeof surfaceMaterials];
  const baseColor = defaultSurface?.color || '#888888';
  const textureUrl = defaultSurface?.textureUrl || null;
  
  // Get default edge material
  const defaultEdge = edgeMaterials[cabinet.materials.defaultEdge as keyof typeof edgeMaterials];
  const edgeColor = defaultEdge?.color || '#FFFFFF';
  const edgeThickness = defaultEdge?.thickness || 1.0;
  const edgeTextureUrl = defaultEdge?.textureUrl || null;
  
  return (
    <group name="cabinet-3d">
      {/* Render panels with shared texture */}
      <PanelsWithTexture
        panels={cabinet.panels}
        baseColor={baseColor}
        textureUrl={textureUrl}
        edgeColor={edgeColor}
        edgeThickness={edgeThickness}
        edgeTextureUrl={edgeTextureUrl}
        selectedPanelId={selectedPanelId}
        onSelectPanel={selectPanel}
      />
      
      {/* Dimension labels */}
      <DimensionLabels cabinet={cabinet} />
    </group>
  );
}

// Separate component to load texture once for all panels
interface PanelsWithTextureProps {
  panels: CabinetPanel[];
  baseColor: string;
  textureUrl: string | null;
  edgeColor: string;
  edgeThickness: number;
  edgeTextureUrl: string | null;
  selectedPanelId: string | null;
  onSelectPanel: (id: string) => void;
}

function PanelsWithTexture({ panels, baseColor, textureUrl, edgeColor, edgeThickness, edgeTextureUrl, selectedPanelId, onSelectPanel }: PanelsWithTextureProps) {
  const texture = useDataTexture(textureUrl);
  const edgeTexture = useDataTexture(edgeTextureUrl);
  
  return (
    <>
      {panels.map((panel) => (
        <Panel3DComponent
          key={panel.id}
          panel={panel}
          baseColor={baseColor}
          texture={texture}
          edgeColor={edgeColor}
          edgeThickness={edgeThickness}
          edgeTexture={edgeTexture}
          isSelected={selectedPanelId === panel.id}
          onSelect={() => onSelectPanel(panel.id)}
        />
      ))}
    </>
  );
}

interface Panel3DProps {
  panel: CabinetPanel;
  baseColor: string;
  texture: CanvasTexture | null;
  edgeColor: string;
  edgeThickness: number;
  edgeTexture: CanvasTexture | null;
  isSelected: boolean;
  onSelect: () => void;
}

function Panel3DComponent({ panel, baseColor, texture, edgeColor, edgeThickness, edgeTexture, isSelected, onSelect }: Panel3DProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [panelTexture, setPanelTexture] = useState<CanvasTexture | null>(null);
  const [edgeBandTexture, setEdgeBandTexture] = useState<CanvasTexture | null>(null);
  
  // World-scale texture: Texture represents real material size
  // Texture image: 1523 × 3070 px = 1523 × 3070 mm real-world
  const TEXTURE_WIDTH_MM = 1523;
  const TEXTURE_HEIGHT_MM = 3070;
  
  // Calculate geometry size based on panel role
  const [sizeX, sizeY, sizeZ] = useMemo(() => {
    const t = panel.computed.realThickness;
    
    switch (panel.role) {
      case 'LEFT_SIDE':
      case 'RIGHT_SIDE':
        return [t, panel.finishHeight, panel.finishWidth];
      case 'TOP':
      case 'BOTTOM':
        return [panel.finishWidth, t, panel.finishHeight];
      case 'BACK':
        return [panel.finishWidth, panel.finishHeight, t];
      case 'SHELF':
        return [panel.finishWidth, t, panel.finishHeight];
      case 'DIVIDER':
        return [t, panel.finishHeight, panel.finishWidth];
      default:
        return [panel.finishWidth, panel.finishHeight, t];
    }
  }, [panel]);
  
  // Edge band strips - thin colored strips at the OUTER EDGE of the panel
  // Panel size is ALREADY reduced by edge thickness
  // So edge band sits AT THE OUTER EDGE making: Panel + Edge = Full Dimension
  const edgeBandStrips = useMemo(() => {
    const t = panel.computed.realThickness;
    const et = Math.max(edgeThickness, 1); // Minimum 1mm for visibility
    const OFFSET = 0.2; // Tiny offset to prevent z-fighting
    
    const strips: Array<{
      position: [number, number, number];
      size: [number, number, number];
    }> = [];
    
    // Skip back panel - no edge banding
    if (panel.role === 'BACK') return strips;
    
    // Get edge assignments from panel
    const hasTop = panel.edges?.top != null && panel.edges.top !== '';
    const hasBottom = panel.edges?.bottom != null && panel.edges.bottom !== '';
    const hasLeft = panel.edges?.left != null && panel.edges.left !== '';
    const hasRight = panel.edges?.right != null && panel.edges.right !== '';
    
    // Panel finishWidth/Height is ALREADY reduced by edge thickness
    // Edge band sits at the OUTER edge of the panel
    
    switch (panel.role) {
      case 'LEFT_SIDE':
      case 'RIGHT_SIDE':
        // Side panels: sizeX=t, sizeY=height, sizeZ=depth (finishWidth)
        // hasTop = front edge, hasLeft = top edge, hasRight = bottom edge
        
        // Front edge - at Z = panel.finishWidth/2 + et/2 (OUTER edge)
        if (hasTop) strips.push({
          position: [0, 0, panel.finishWidth/2 + et/2],
          size: [t + OFFSET, panel.finishHeight + (hasLeft ? et : 0) + (hasRight ? et : 0), et],
        });
        // Top edge - at Y = panel.finishHeight/2 + et/2 (OUTER edge)
        if (hasLeft) strips.push({
          position: [0, panel.finishHeight/2 + et/2, hasTop ? 0 : 0],
          size: [t + OFFSET, et, panel.finishWidth + (hasTop ? et : 0)],
        });
        // Bottom edge - at Y = -panel.finishHeight/2 - et/2 (OUTER edge)
        if (hasRight) strips.push({
          position: [0, -panel.finishHeight/2 - et/2, hasTop ? 0 : 0],
          size: [t + OFFSET, et, panel.finishWidth + (hasTop ? et : 0)],
        });
        break;
        
      case 'TOP':
      case 'BOTTOM':
      case 'SHELF':
        // Horizontal panels: sizeX=width (finishWidth), sizeY=t, sizeZ=depth (finishHeight)
        // hasTop = front edge, hasLeft = left edge, hasRight = right edge
        
        // Front edge - at Z = panel.finishHeight/2 + et/2 (OUTER edge)
        if (hasTop) strips.push({
          position: [0, 0, panel.finishHeight/2 + et/2],
          size: [panel.finishWidth + (hasLeft ? et : 0) + (hasRight ? et : 0), t + OFFSET, et],
        });
        // Left edge - at X = -panel.finishWidth/2 - et/2 (OUTER edge)
        if (hasLeft) strips.push({
          position: [-panel.finishWidth/2 - et/2, 0, hasTop ? 0 : 0],
          size: [et, t + OFFSET, panel.finishHeight + (hasTop ? et : 0)],
        });
        // Right edge - at X = panel.finishWidth/2 + et/2 (OUTER edge)
        if (hasRight) strips.push({
          position: [panel.finishWidth/2 + et/2, 0, hasTop ? 0 : 0],
          size: [et, t + OFFSET, panel.finishHeight + (hasTop ? et : 0)],
        });
        break;
        
      case 'DIVIDER':
        // Divider: vertical panel, sizeX=t, sizeY=height, sizeZ=depth (finishWidth)
        // hasTop = front edge
        
        // Front edge - at Z = panel.finishWidth/2 + et/2 (OUTER edge)
        if (hasTop) strips.push({
          position: [0, 0, panel.finishWidth/2 + et/2],
          size: [t + OFFSET, panel.finishHeight, et],
        });
        break;
    }
    
    return strips;
  }, [panel, edgeThickness]);
  
  // Color based on state
  const displayColor = useMemo(() => {
    if (isSelected) return '#4488ff';
    if (hovered) return '#6699ff';
    switch (panel.role) {
      case 'BACK': return '#3a3a3a';
      default: return baseColor;
    }
  }, [isSelected, hovered, baseColor, panel.role]);
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };
  
  if (!panel.visible) return null;
  
  // Show texture only when not selected/hovered and not back panel
  const showTexture = texture && !isSelected && !hovered && panel.role !== 'BACK';
  
  // Create geometry
  const geometry = useMemo(() => {
    return new BoxGeometry(sizeX, sizeY, sizeZ);
  }, [sizeX, sizeY, sizeZ]);
  
  // Create NEW texture for this panel (not clone - clone shares source!)
  // Each panel needs completely independent texture with its own repeat
  useEffect(() => {
    if (!texture || !showTexture) {
      setPanelTexture(null);
      return;
    }
    
    // Get source canvas from original texture
    const sourceCanvas = texture.image as HTMLCanvasElement;
    if (!sourceCanvas) {
      setPanelTexture(null);
      return;
    }
    
    // Create NEW canvas and copy image data
    const newCanvas = document.createElement('canvas');
    newCanvas.width = sourceCanvas.width;
    newCanvas.height = sourceCanvas.height;
    const ctx = newCanvas.getContext('2d');
    
    if (!ctx) {
      setPanelTexture(null);
      return;
    }
    
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Create NEW texture from NEW canvas
    const newTex = new CanvasTexture(newCanvas);
    newTex.wrapS = RepeatWrapping;
    newTex.wrapT = RepeatWrapping;
    newTex.colorSpace = SRGBColorSpace;
    
    // Calculate repeat based on panel dimensions (World-Scale UV)
    // RepeatX = panel width / texture width
    // RepeatY = panel height / texture height
    const repeatX = panel.finishWidth / TEXTURE_WIDTH_MM;
    const repeatY = panel.finishHeight / TEXTURE_HEIGHT_MM;
    
    newTex.repeat.set(repeatX, repeatY);
    newTex.needsUpdate = true;
    
    setPanelTexture(newTex);
    
    // Cleanup
    return () => {
      newTex.dispose();
    };
  }, [texture, showTexture, panel.finishWidth, panel.finishHeight]);
  
  // Clone edge texture for this panel's edge bands
  useEffect(() => {
    if (!edgeTexture) {
      setEdgeBandTexture(null);
      return;
    }
    
    // Get source canvas from the edge texture
    const sourceCanvas = edgeTexture.image as HTMLCanvasElement;
    if (!sourceCanvas) {
      setEdgeBandTexture(null);
      return;
    }
    
    // Create NEW canvas and copy image data for edge band
    const newCanvas = document.createElement('canvas');
    newCanvas.width = sourceCanvas.width;
    newCanvas.height = sourceCanvas.height;
    const ctx = newCanvas.getContext('2d');
    
    if (!ctx) {
      setEdgeBandTexture(null);
      return;
    }
    
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Create NEW texture from NEW canvas
    const newTex = new CanvasTexture(newCanvas);
    newTex.wrapS = RepeatWrapping;
    newTex.wrapT = RepeatWrapping;
    newTex.colorSpace = SRGBColorSpace;
    
    // For edge band: texture wraps around the edge
    // Edge band is thin, so we use a small repeat
    const edgeRepeatX = Math.max(panel.finishWidth, panel.finishHeight) / TEXTURE_WIDTH_MM;
    const edgeRepeatY = edgeThickness / 50; // Small repeat for thin edge
    
    newTex.repeat.set(edgeRepeatX, edgeRepeatY);
    newTex.needsUpdate = true;
    
    setEdgeBandTexture(newTex);
    
    // Cleanup
    return () => {
      newTex.dispose();
    };
  }, [edgeTexture, panel.finishWidth, panel.finishHeight, edgeThickness]);
  
  return (
    <group position={panel.position} rotation={panel.rotation}>
      {/* Main panel mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        castShadow
        receiveShadow
        geometry={geometry}
      >
        <meshStandardMaterial
          map={panelTexture}
          color={panelTexture ? '#ffffff' : displayColor}
          roughness={0.5}
          metalness={0.1}
          emissive={isSelected ? '#2244aa' : hovered ? '#223366' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
        />
      </mesh>
      
      {/* Edge Band Strips - thin colored strips on edge faces, INSIDE panel bounds */}
      {edgeBandStrips.map((strip, idx) => (
        <mesh
          key={`edge-${idx}`}
          position={strip.position}
        >
          <boxGeometry args={strip.size} />
          <meshStandardMaterial
            map={edgeBandTexture}
            color={isSelected ? '#00aaff' : (edgeBandTexture ? '#ffffff' : edgeColor)}
            roughness={0.3}
            metalness={0.02}
          />
        </mesh>
      ))}
      
      {/* Selection outline */}
      {isSelected && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#00aaff" wireframe />
        </mesh>
      )}
      
      {(hovered || isSelected) && (
        <Html
          position={[0, sizeY/2 + 30, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-white/20">
            <div className="font-medium">{panel.name}</div>
            <div className="text-gray-400 text-[10px]">
              {panel.finishWidth} × {panel.finishHeight} mm
            </div>
            {isSelected && (
              <div className="text-emerald-400 text-[10px] border-t border-white/10 mt-1 pt-1">
                Cut: {panel.computed.cutWidth.toFixed(1)} × {panel.computed.cutHeight.toFixed(1)}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

interface DimensionLabelsProps {
  cabinet: { dimensions: { width: number; height: number; depth: number; toeKickHeight: number } };
}

function DimensionLabels({ cabinet }: DimensionLabelsProps) {
  const { width: W, height: H, depth: D, toeKickHeight: Leg } = cabinet.dimensions;
  const bodyH = H - Leg;
  
  return (
    <group name="dimension-labels">
      <Html position={[0, Leg + bodyH + 80, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">{W}</div>
      </Html>
      <Html position={[-W/2 - 80, Leg + bodyH/2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">{H}</div>
      </Html>
      <Html position={[W/2 + 80, Leg + bodyH/2, -D/2]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">{D}</div>
      </Html>
    </group>
  );
}
