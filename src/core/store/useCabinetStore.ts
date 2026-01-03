/**
 * Cabinet Store - Parametric Cabinet State Management
 * 
 * Based on MDP (Markov Decision Process) principles:
 * - State: Current cabinet configuration
 * - Action: User modifications (add shelf, change dimension, etc.)
 * - Transition: Recalculate all panels based on new state
 * 
 * Every action triggers a full recalculation to maintain consistency
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  Cabinet,
  CabinetPanel,
  CabinetDimensions,
  CabinetStructure,
  CabinetType,
  JointType,
  PanelRole,
  DEFAULT_DIMENSIONS,
  DEFAULT_STRUCTURE,
  DEFAULT_MANUFACTURING,
  calculateRealThickness,
  calculateCutSize,
  createId,
} from '../types/Cabinet';

// ============================================
// MATERIAL LIBRARY (Temporary - will move to separate store)
// ============================================

// Manufacturing defaults that match the document specifications
const MANUFACTURING_PARAMS = {
  glueThickness: 0.1,     // T_glue: 0.1 - 0.2 mm (default 0.1)
  preMilling: 0.5,        // P_mill: 0.5 - 1.0 mm per side (default 0.5)
  grooveDepth: 8,         // G_depth: 8 - 10 mm (default 8)
  clearance: 2,           // C: 1 - 2 mm (default 2)
  shelfSetbackFront: 20,  // F_setback: ~20 mm (หลบหน้าบาน)
  shelfSetbackBack: 10,   // B_setback: for LED/ventilation (เดิม - จะคำนวณใหม่)
  
  // === NEW: Back Panel Configuration (ตามเอกสาร Divider Depth) ===
  backPanelConstruction: 'inset' as 'inset' | 'overlay', // วิธีติดตั้งแผงหลัง
  backVoid: 20,           // Back_void: ระยะเว้นหลังตู้ (19-20 mm)
  backThickness: 6,       // Back_thk: ความหนาแผงหลัง (6 or 9 mm)
  safetyGap: 2,           // Gap_safety: ระยะเผื่อไม่ให้ชน (1-2 mm)
};

// ============================================
// MATERIAL CATALOGS (Inline - Single Source of Truth)
// ============================================

// === CORE MATERIALS ===
const CORE_MATERIALS_CATALOG = {
  'core-pb-16': {
    id: 'core-pb-16',
    name: 'Particle Board 16mm',
    thickness: 16,
    costPerSqm: 250,
    co2PerSqm: 8.2,
  },
  'core-pb-18': {
    id: 'core-pb-18',
    name: 'Particle Board 18mm',
    thickness: 18,
    costPerSqm: 280,
    co2PerSqm: 9.0,
  },
  'core-mdf-6': {
    id: 'core-mdf-6',
    name: 'MDF 6mm (Backing)',
    thickness: 6,
    costPerSqm: 180,
    co2PerSqm: 5.0,
  },
  'core-mdf-16': {
    id: 'core-mdf-16',
    name: 'MDF 16mm',
    thickness: 16,
    costPerSqm: 320,
    co2PerSqm: 9.5,
  },
  'core-mdf-18': {
    id: 'core-mdf-18',
    name: 'MDF 18mm',
    thickness: 18,
    costPerSqm: 360,
    co2PerSqm: 10.2,
  },
  'core-hmr-16': {
    id: 'core-hmr-16',
    name: 'HMR Green 16mm',
    thickness: 16,
    costPerSqm: 420,
    co2PerSqm: 9.8,
  },
  'core-hmr-18': {
    id: 'core-hmr-18',
    name: 'HMR Green 18mm',
    thickness: 18,
    costPerSqm: 450,
    co2PerSqm: 10.2,
  },
  'core-ply-18': {
    id: 'core-ply-18',
    name: 'Marine Plywood 18mm',
    thickness: 18,
    costPerSqm: 850,
    co2PerSqm: 12.5,
  },
};

// === SURFACE MATERIALS ===
const SURFACE_MATERIALS_CATALOG = {
  'surf-mel-white': {
    id: 'surf-mel-white',
    name: 'Melamine White',
    type: 'MELAMINE',
    thickness: 0.3,
    costPerSqm: 120,
    co2PerSqm: 0.5,
    color: '#F5F5F5',
    textureUrl: undefined as string | undefined,
  },
  'surf-mel-grey': {
    id: 'surf-mel-grey',
    name: 'Melamine Stone Grey',
    type: 'MELAMINE',
    thickness: 0.3,
    costPerSqm: 140,
    co2PerSqm: 0.5,
    color: '#6B6B6B',
    textureUrl: undefined as string | undefined,
  },
  'surf-mel-black': {
    id: 'surf-mel-black',
    name: 'Melamine Black',
    type: 'MELAMINE',
    thickness: 0.3,
    costPerSqm: 140,
    co2PerSqm: 0.5,
    color: '#1A1A1A',
    textureUrl: undefined as string | undefined,
  },
  'surf-hpl-oak': {
    id: 'surf-hpl-oak',
    name: 'HPL Natural Oak',
    type: 'HPL',
    thickness: 0.8,
    costPerSqm: 450,
    co2PerSqm: 1.2,
    color: '#C4A77D',
    textureUrl: '/textures/materials/9880503b9bc4fab08417c0ce7c618301.jpg',
  },
  'surf-hpl-walnut': {
    id: 'surf-hpl-walnut',
    name: 'HPL Natural Walnut',
    type: 'HPL',
    thickness: 0.8,
    costPerSqm: 520,
    co2PerSqm: 1.2,
    color: '#5D4037',
    textureUrl: '/textures/materials/6ca1ee6c8d4e09b967824c7580f4471b.jpg',
  },
  'surf-hpl-walnut-grey': {
    id: 'surf-hpl-walnut-grey',
    name: 'HPL Grey Walnut',
    type: 'HPL',
    thickness: 0.8,
    costPerSqm: 580,
    co2PerSqm: 1.2,
    color: '#9a8b7a',
    textureUrl: '/textures/materials/c524e72250b3ddd648c1f317165c7f79.jpg',
  },
  'surf-hpl-oak-grey': {
    id: 'surf-hpl-oak-grey',
    name: 'HPL Grey Wash Oak',
    type: 'HPL',
    thickness: 0.8,
    costPerSqm: 550,
    co2PerSqm: 1.2,
    color: '#7a7a72',
    textureUrl: '/textures/materials/428c5e7db15f9ac1df0adaa31089124a.jpg',
  },
  'surf-hpl-ash-silver': {
    id: 'surf-hpl-ash-silver',
    name: 'HPL Silver Ash',
    type: 'HPL',
    thickness: 0.8,
    costPerSqm: 520,
    co2PerSqm: 1.2,
    color: '#8a8a8a',
    textureUrl: '/textures/materials/ae7ac17779fa6e250256872104665661.jpg',
  },
  'surf-hpl-walnut-dark': {
    id: 'surf-hpl-walnut-dark',
    name: 'HPL Dark Walnut',
    type: 'HPL',
    thickness: 0.8,
    costPerSqm: 620,
    co2PerSqm: 1.2,
    color: '#5a4a3a',
    textureUrl: '/textures/materials/6ec338abc60c08cd95f6fc5c011f60d5.jpg',
  },
};

// === EDGE MATERIALS ===
const EDGE_MATERIALS_CATALOG = {
  // PVC Solid Colors
  'edge-pvc-white-04': {
    id: 'edge-pvc-white-04',
    name: 'PVC White 0.4mm',
    code: 'PVC-W-0.4',
    thickness: 0.4,
    height: 23,
    costPerMeter: 5,
    color: '#FFFFFF',
    textureUrl: undefined as string | undefined,
  },
  'edge-pvc-white-05': {
    id: 'edge-pvc-white-05',
    name: 'PVC White 0.5mm',
    code: 'PVC-W-0.5',
    thickness: 0.5,
    height: 23,
    costPerMeter: 6,
    color: '#FFFFFF',
    textureUrl: undefined as string | undefined,
  },
  'edge-pvc-white-10': {
    id: 'edge-pvc-white-10',
    name: 'PVC White 1.0mm',
    code: 'PVC-W-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 12,
    color: '#FFFFFF',
    textureUrl: undefined as string | undefined,
  },
  'edge-pvc-white-20': {
    id: 'edge-pvc-white-20',
    name: 'PVC White 2.0mm',
    code: 'PVC-W-2.0',
    thickness: 2.0,
    height: 23,
    costPerMeter: 22,
    color: '#FFFFFF',
    textureUrl: undefined as string | undefined,
  },
  'edge-pvc-grey-10': {
    id: 'edge-pvc-grey-10',
    name: 'PVC Grey 1.0mm',
    code: 'PVC-G-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 12,
    color: '#6B6B6B',
    textureUrl: undefined as string | undefined,
  },
  'edge-pvc-black-10': {
    id: 'edge-pvc-black-10',
    name: 'PVC Black 1.0mm',
    code: 'PVC-B-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 14,
    color: '#1A1A1A',
    textureUrl: undefined as string | undefined,
  },
  // ABS Wood Grain
  'edge-abs-oak-10': {
    id: 'edge-abs-oak-10',
    name: 'ABS Oak 1.0mm',
    code: 'ABS-OAK-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 22,
    color: '#C4A77D',
    textureUrl: '/textures/materials/9880503b9bc4fab08417c0ce7c618301.jpg',
  },
  'edge-abs-walnut-10': {
    id: 'edge-abs-walnut-10',
    name: 'ABS Walnut 1.0mm',
    code: 'ABS-WAL-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 24,
    color: '#5D4037',
    textureUrl: '/textures/materials/6ca1ee6c8d4e09b967824c7580f4471b.jpg',
  },
  'edge-abs-walnut-grey-10': {
    id: 'edge-abs-walnut-grey-10',
    name: 'ABS Grey Walnut 1.0mm',
    code: 'ABS-GW-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 26,
    color: '#9a8b7a',
    textureUrl: '/textures/materials/c524e72250b3ddd648c1f317165c7f79.jpg',
  },
  'edge-abs-oak-grey-10': {
    id: 'edge-abs-oak-grey-10',
    name: 'ABS Grey Wash Oak 1.0mm',
    code: 'ABS-GO-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 25,
    color: '#7a7a72',
    textureUrl: '/textures/materials/428c5e7db15f9ac1df0adaa31089124a.jpg',
  },
  'edge-abs-ash-silver-10': {
    id: 'edge-abs-ash-silver-10',
    name: 'ABS Silver Ash 1.0mm',
    code: 'ABS-SA-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 24,
    color: '#8a8a8a',
    textureUrl: '/textures/materials/ae7ac17779fa6e250256872104665661.jpg',
  },
  'edge-abs-walnut-dark-10': {
    id: 'edge-abs-walnut-dark-10',
    name: 'ABS Dark Walnut 1.0mm',
    code: 'ABS-DW-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 28,
    color: '#5a4a3a',
    textureUrl: '/textures/materials/6ec338abc60c08cd95f6fc5c011f60d5.jpg',
  },
  // HPL Edge
  'edge-hpl-oak-08': {
    id: 'edge-hpl-oak-08',
    name: 'HPL Oak Edge 0.8mm',
    code: 'HPL-OAK-0.8',
    thickness: 0.8,
    height: 23,
    costPerMeter: 35,
    color: '#C4A77D',
    textureUrl: '/textures/materials/9880503b9bc4fab08417c0ce7c618301.jpg',
  },
  'edge-hpl-walnut-08': {
    id: 'edge-hpl-walnut-08',
    name: 'HPL Walnut Edge 0.8mm',
    code: 'HPL-WAL-0.8',
    thickness: 0.8,
    height: 23,
    costPerMeter: 38,
    color: '#5D4037',
    textureUrl: '/textures/materials/6ca1ee6c8d4e09b967824c7580f4471b.jpg',
  },
  // Solid Wood Edge
  'edge-wood-oak-30': {
    id: 'edge-wood-oak-30',
    name: 'Solid Oak Edge 3.0mm',
    code: 'WOOD-OAK-3.0',
    thickness: 3.0,
    height: 23,
    costPerMeter: 85,
    color: '#C4A77D',
    textureUrl: '/textures/materials/9880503b9bc4fab08417c0ce7c618301.jpg',
  },
  'edge-wood-walnut-30': {
    id: 'edge-wood-walnut-30',
    name: 'Solid Walnut Edge 3.0mm',
    code: 'WOOD-WAL-3.0',
    thickness: 3.0,
    height: 23,
    costPerMeter: 95,
    color: '#5D4037',
    textureUrl: '/textures/materials/6ca1ee6c8d4e09b967824c7580f4471b.jpg',
  },
  // Aluminum Edge
  'edge-alu-silver-10': {
    id: 'edge-alu-silver-10',
    name: 'Aluminum Silver 1.0mm',
    code: 'ALU-SIL-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 45,
    color: '#C0C0C0',
    textureUrl: undefined as string | undefined,
  },
  'edge-alu-black-10': {
    id: 'edge-alu-black-10',
    name: 'Aluminum Black 1.0mm',
    code: 'ALU-BLK-1.0',
    thickness: 1.0,
    height: 23,
    costPerMeter: 48,
    color: '#1A1A1A',
    textureUrl: undefined as string | undefined,
  },
};

// Re-export for backward compatibility
const CORE_MATERIALS = CORE_MATERIALS_CATALOG;
const SURFACE_MATERIALS = SURFACE_MATERIALS_CATALOG;
const EDGE_MATERIALS = EDGE_MATERIALS_CATALOG;

// ============================================
// PANEL GENERATION LOGIC
// ============================================

/**
 * Generate all panels for a cabinet based on current configuration
 * This is the core "transition function" in MDP terms
 * 
 * MANUFACTURING LOGIC (from North Star Document):
 * 
 * 1. MATERIAL PHYSICS: T_total = T_core + T_surfA + T_surfB + (T_glue × 2)
 * 
 * 2. BACK PANEL LOGIC:
 *    - Inset: BackObstruction = GrooveOffset + T_back
 *    - Overlay: BackObstruction = T_back
 * 
 * 3. ANTI-COLLISION: Depth_internal = D_cabinet - BackObstruction - SafetyGap
 * 
 * 4. FINISH TO CUT: CutSize = FinishSize - (Edge1 + Edge2) + (PreMill × edged_sides)
 * 
 * PANEL SIZE RULE:
 * - Panel Finish Size does NOT include edge thickness
 * - Panel + Edge Band = Cabinet Dimension
 */
function generatePanels(
  dimensions: CabinetDimensions,
  structure: CabinetStructure,
  defaultCoreId: string,
  defaultSurfaceId: string,
  defaultEdgeId: string
): CabinetPanel[] {
  const panels: CabinetPanel[] = [];
  const { width: W, height: H, depth: D, toeKickHeight: Leg } = dimensions;
  
  // Get material properties
  const core = CORE_MATERIALS[defaultCoreId as keyof typeof CORE_MATERIALS] || CORE_MATERIALS['core-pb-16'];
  const surface = SURFACE_MATERIALS[defaultSurfaceId as keyof typeof SURFACE_MATERIALS] || SURFACE_MATERIALS['surf-mel-white'];
  const edge = EDGE_MATERIALS[defaultEdgeId as keyof typeof EDGE_MATERIALS] || EDGE_MATERIALS['edge-pvc-white-10'];
  const ET = edge.thickness; // Edge thickness
  
  // 1. MATERIAL PHYSICS: Calculate real thickness
  const T_real = calculateRealThickness(
    core.thickness, 
    surface.thickness, 
    surface.thickness, 
    MANUFACTURING_PARAMS.glueThickness
  );
  const T = T_real; // Use real thickness for position calculations
  
  // 2. BACK PANEL LOGIC: Calculate BackObstruction
  const backObstruction = (MANUFACTURING_PARAMS.backPanelConstruction === 'inset')
    ? MANUFACTURING_PARAMS.backVoid + MANUFACTURING_PARAMS.backThickness  // Groove: offset + thickness
    : MANUFACTURING_PARAMS.backThickness;  // Overlay: just thickness
  
  // 3. ANTI-COLLISION: Calculate internal depth
  const depthInternal = D - backObstruction - MANUFACTURING_PARAMS.safetyGap;
  
  // Helper to compute panel manufacturing data
  const computePanel = (finishW: number, finishH: number, edgeTop: number, edgeBottom: number, edgeLeft: number, edgeRight: number) => {
    // 4. FINISH TO CUT transformation
    const cutW = calculateCutSize(finishW, edgeLeft, edgeRight, MANUFACTURING_PARAMS.preMilling);
    const cutH = calculateCutSize(finishH, edgeTop, edgeBottom, MANUFACTURING_PARAMS.preMilling);
    const area = (finishW * finishH) / 1000000; // m²
    const edgeLen = ((edgeTop > 0 ? finishW : 0) + (edgeBottom > 0 ? finishW : 0) + 
                     (edgeLeft > 0 ? finishH : 0) + (edgeRight > 0 ? finishH : 0)) / 1000; // meters
    
    const cost = (area * core.costPerSqm) + (area * 2 * surface.costPerSqm) + (edgeLen * edge.costPerMeter);
    const co2 = (area * core.co2PerSqm) + (area * 2 * surface.co2PerSqm);
    
    return {
      realThickness: T_real,
      cutWidth: cutW,
      cutHeight: cutH,
      surfaceArea: area,
      edgeLength: edgeLen,
      cost,
      co2,
    };
  };
  
  // Helper to create edge assignment
  const makeEdges = (front: boolean, back: boolean, top: boolean, bottom: boolean) => ({
    top: front ? defaultEdgeId : null,    // "top" in edge config = front edge of panel
    bottom: back ? defaultEdgeId : null,  // "bottom" = back edge
    left: top ? defaultEdgeId : null,     // "left" = top edge
    right: bottom ? defaultEdgeId : null, // "right" = bottom edge
  });
  
  // Cabinet body height (excluding toe kick)
  const bodyH = H - Leg;
  
  // ========== LEFT SIDE & RIGHT SIDE ==========
  // Joint type determines construction:
  // - OVERLAY: Top/Bottom sit ON TOP of sides → Side is SHORTER
  // - INSET: Top/Bottom fit BETWEEN sides → Side is FULL HEIGHT
  
  // Width (depth direction): always subtract front edge only
  const sideW = D - ET;
  
  // Height calculation:
  // OVERLAY = Top/Bottom นั่งบนแผงข้าง → แผงข้างต้องสั้นลง (หัก T ของ Top/Bottom)
  // INSET = Top/Bottom เข้าไประหว่างแผงข้าง → แผงข้างสูงเต็ม
  
  // Calculate reductions for OVERLAY joints
  const topReduction = structure.topJoint === 'OVERLAY' ? T : 0;      // หักความหนา Top Panel
  const bottomReduction = structure.bottomJoint === 'OVERLAY' ? T : 0; // หักความหนา Bottom Panel
  
  // Side panel has edge at top/bottom only when it extends to that edge (INSET case)
  // For OVERLAY, the Top/Bottom covers the edge, so side has no edge there
  const hasTopEdge = structure.topJoint === 'INSET';     // INSET = side extends to top = needs edge
  const hasBottomEdge = structure.bottomJoint === 'INSET'; // INSET = side extends to bottom = needs edge
  
  // Calculate side height
  let sideH = bodyH - topReduction - bottomReduction;  // หักความหนา Top/Bottom ถ้า OVERLAY
  if (hasTopEdge) sideH -= ET;      // หัก edge บน (only for INSET)
  if (hasBottomEdge) sideH -= ET;   // หัก edge ล่าง (only for INSET)
  
  // Edge thicknesses for cut calculation
  const sideEdgeTop = hasTopEdge ? ET : 0;
  const sideEdgeBottom = hasBottomEdge ? ET : 0;
  
  // Y position: center of side panel
  // For OVERLAY: side starts above bottom panel, ends below top panel
  const sideYOffset = (bottomReduction - topReduction) / 2;
  const sideY = bodyH/2 + Leg + sideYOffset;
  
  panels.push({
    id: createId(),
    role: 'LEFT_SIDE',
    name: 'Left Side',
    finishWidth: sideW,
    finishHeight: sideH,
    coreMaterialId: defaultCoreId,
    faces: { faceA: defaultSurfaceId, faceB: null },
    edges: {
      top: defaultEdgeId,  // front edge (always)
      bottom: null,        // no back edge
      left: hasTopEdge ? defaultEdgeId : null,   // top edge (only INSET)
      right: hasBottomEdge ? defaultEdgeId : null, // bottom edge (only INSET)
    },
    grainDirection: 'VERTICAL',
    computed: computePanel(sideW, sideH, ET, 0, sideEdgeTop, sideEdgeBottom),
    position: [-W/2 + T/2, sideY, -ET/2],
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  });
  
  // ========== RIGHT SIDE ==========
  panels.push({
    id: createId(),
    role: 'RIGHT_SIDE',
    name: 'Right Side',
    finishWidth: sideW,
    finishHeight: sideH,
    coreMaterialId: defaultCoreId,
    faces: { faceA: defaultSurfaceId, faceB: null },
    edges: {
      top: defaultEdgeId,
      bottom: null,
      left: hasTopEdge ? defaultEdgeId : null,
      right: hasBottomEdge ? defaultEdgeId : null,
    },
    grainDirection: 'VERTICAL',
    computed: computePanel(sideW, sideH, ET, 0, sideEdgeTop, sideEdgeBottom),
    position: [W/2 - T/2, sideY, -ET/2],
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  });
  
  // ========== TOP PANEL ==========
  // For INSET joint: fits between sides
  // Edges: Front only
  const topBaseW = structure.topJoint === 'INSET' ? W - (2 * T) : W;
  const topW = topBaseW;      // No side edges on horizontal panels
  const topH = D - ET;        // Depth - front edge
  
  // Top Y position:
  // INSET: Top fits between sides, center at bodyH - T/2
  // OVERLAY: Top sits ON TOP of sides, center at bodyH - topReduction + T/2
  //          (sides end at bodyH - topReduction, top sits on that)
  const topY = structure.topJoint === 'INSET' 
    ? bodyH - T/2 + Leg                           // INSET: between sides
    : bodyH - topReduction + T/2 + Leg;           // OVERLAY: on top of sides
  
  panels.push({
    id: createId(),
    role: 'TOP',
    name: 'Top Panel',
    finishWidth: topW,
    finishHeight: topH,
    coreMaterialId: defaultCoreId,
    faces: { faceA: defaultSurfaceId, faceB: null },
    edges: makeEdges(true, false, false, false), // Only front edge
    grainDirection: 'HORIZONTAL',
    computed: computePanel(topW, topH, ET, 0, 0, 0),
    position: [0, topY, -ET/2],
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  });
  
  // ========== BOTTOM PANEL ==========
  const bottomBaseW = structure.bottomJoint === 'INSET' ? W - (2 * T) : W;
  const bottomW = bottomBaseW;
  const bottomH = D - ET;
  
  // Bottom Y position:
  // INSET: Bottom fits between sides, center at T/2
  // OVERLAY: Bottom sits under sides, center at bottomReduction - T/2
  //          (sides start at bottomReduction, bottom sits below that)
  const bottomY = structure.bottomJoint === 'INSET'
    ? T/2 + Leg                                   // INSET: between sides
    : bottomReduction - T/2 + Leg;                // OVERLAY: under sides
  
  panels.push({
    id: createId(),
    role: 'BOTTOM',
    name: 'Bottom Panel',
    finishWidth: bottomW,
    finishHeight: bottomH,
    coreMaterialId: defaultCoreId,
    faces: { faceA: defaultSurfaceId, faceB: null },
    edges: makeEdges(true, false, false, false),
    grainDirection: 'HORIZONTAL',
    computed: computePanel(bottomW, bottomH, ET, 0, 0, 0),
    position: [0, bottomY, -ET/2],
    rotation: [0, 0, 0],
    visible: true,
    selected: false,
  });
  
  // ========== BACK PANEL ==========
  if (structure.hasBackPanel) {
    const backCore = CORE_MATERIALS['core-mdf-6'];
    const backT = backCore.thickness;
    const groove = MANUFACTURING_PARAMS.grooveDepth;
    const clearance = MANUFACTURING_PARAMS.clearance;
    
    // Back panel fits into grooves
    const backW = (W - 2*T) + (2*groove) - clearance;
    const backH = (bodyH - 2*T) + (2*groove) - clearance;
    
    panels.push({
      id: createId(),
      role: 'BACK',
      name: 'Back Panel',
      finishWidth: backW,
      finishHeight: backH,
      coreMaterialId: 'core-mdf-6',
      faces: { faceA: defaultSurfaceId, faceB: null },
      edges: { top: null, bottom: null, left: null, right: null },
      grainDirection: 'HORIZONTAL',
      computed: {
        realThickness: backT,
        cutWidth: backW,
        cutHeight: backH,
        surfaceArea: (backW * backH) / 1000000,
        edgeLength: 0,
        cost: (backW * backH / 1000000) * backCore.costPerSqm,
        co2: (backW * backH / 1000000) * backCore.co2PerSqm,
      },
      position: [0, bodyH/2 + Leg, -D/2 + structure.backPanelInset],
      rotation: [0, 0, 0],
      visible: true,
      selected: false,
    });
  }
  
  // ========== SHELVES ==========
  // Use depthInternal calculated from Back Panel Logic
  // Shelf Depth = depthInternal - FrontSetback - ET(front edge)
  const shelfW = W - (2 * T) - MANUFACTURING_PARAMS.clearance;  // Side clearance for adjustability
  const shelfD = depthInternal - MANUFACTURING_PARAMS.shelfSetbackFront - ET;
  const usableHeight = bodyH - (2 * T);
  const shelfSpacing = usableHeight / (structure.shelfCount + 1);
  
  for (let i = 0; i < structure.shelfCount; i++) {
    const shelfY = Leg + T + shelfSpacing * (i + 1);
    // Shelf Z position: centered in usable depth area
    const shelfZ = (D/2 - MANUFACTURING_PARAMS.shelfSetbackFront - ET/2) - (shelfD/2);
    
    panels.push({
      id: createId(),
      role: 'SHELF',
      name: `Shelf ${i + 1}`,
      finishWidth: shelfW,
      finishHeight: shelfD,
      coreMaterialId: defaultCoreId,
      faces: { faceA: defaultSurfaceId, faceB: null },
      edges: makeEdges(true, false, false, false), // Only front edge
      grainDirection: 'HORIZONTAL',
      computed: computePanel(shelfW, shelfD, ET, 0, 0, 0),
      position: [0, shelfY, shelfZ],
      rotation: [0, 0, 0],
      visible: true,
      selected: false,
    });
  }
  
  // ========== DIVIDERS ==========
  // Divider Depth = depthInternal (no front setback for dividers)
  // Only front edge
  if (structure.dividerCount > 0) {
    const dividerSpacing = (W - 2*T) / (structure.dividerCount + 1);
    const dividerH = usableHeight;
    const dividerD = depthInternal - ET;  // Full internal depth minus front edge
    
    for (let i = 0; i < structure.dividerCount; i++) {
      const dividerX = -W/2 + T + dividerSpacing * (i + 1);
      // Divider Z: starts from front with edge, extends back
      const dividerZ = (D/2 - ET/2) - (dividerD/2);
      
      panels.push({
        id: createId(),
        role: 'DIVIDER',
        name: `Divider ${i + 1}`,
        finishWidth: dividerD,
        finishHeight: dividerH,
        coreMaterialId: defaultCoreId,
        faces: { faceA: defaultSurfaceId, faceB: null },
        edges: makeEdges(true, false, false, false), // Only front edge
        grainDirection: 'VERTICAL',
        computed: computePanel(dividerD, dividerH, ET, 0, 0, 0),
        position: [dividerX, bodyH/2 + Leg, dividerZ],
        rotation: [0, 0, 0],
        visible: true,
        selected: false,
      });
    }
  }
  
  return panels;
}

/**
 * Calculate cabinet totals from panels
 */
function calculateTotals(panels: CabinetPanel[]) {
  return {
    totalCost: panels.reduce((sum, p) => sum + p.computed.cost, 0),
    totalCO2: panels.reduce((sum, p) => sum + p.computed.co2, 0),
    panelCount: panels.length,
    totalSurfaceArea: panels.reduce((sum, p) => sum + p.computed.surfaceArea, 0),
    totalEdgeLength: panels.reduce((sum, p) => sum + p.computed.edgeLength, 0),
  };
}

// ============================================
// STORE DEFINITION
// ============================================

interface CabinetState {
  cabinet: Cabinet | null;
  selectedPanelId: string | null;
  
  // Materials library (temporary)
  coreMaterials: typeof CORE_MATERIALS;
  surfaceMaterials: typeof SURFACE_MATERIALS;
  edgeMaterials: typeof EDGE_MATERIALS;
}

interface CabinetActions {
  // Cabinet CRUD
  createCabinet: (type?: CabinetType, name?: string) => void;
  
  // Dimension actions
  setDimension: (key: keyof CabinetDimensions, value: number) => void;
  
  // Structure actions
  setJointType: (position: 'top' | 'bottom', type: JointType) => void;
  setShelfCount: (count: number) => void;
  setDividerCount: (count: number) => void;
  toggleBackPanel: () => void;
  
  // Material actions
  setDefaultCore: (materialId: string) => void;
  setDefaultSurface: (materialId: string) => void;
  setDefaultEdge: (materialId: string) => void;
  
  // Material CRUD - Core
  addCoreMaterial: (material: any) => void;
  updateCoreMaterial: (id: string, updates: any) => void;
  deleteCoreMaterial: (id: string) => void;
  
  // Material CRUD - Surface
  addSurfaceMaterial: (material: any) => void;
  updateSurfaceMaterial: (id: string, updates: any) => void;
  deleteSurfaceMaterial: (id: string) => void;
  
  // Material CRUD - Edge
  addEdgeMaterial: (material: any) => void;
  updateEdgeMaterial: (id: string, updates: any) => void;
  deleteEdgeMaterial: (id: string) => void;
  
  // Panel selection
  selectPanel: (panelId: string | null) => void;
  
  // Per-panel material actions
  updatePanelMaterial: (panelId: string, target: 'core' | 'faceA' | 'faceB', materialId: string) => void;
  updatePanelEdge: (panelId: string, side: 'top' | 'bottom' | 'left' | 'right', edgeId: string | null) => void;
  
  // Recalculation
  recalculate: () => void;
}

type CabinetStore = CabinetState & CabinetActions;

export const useCabinetStore = create<CabinetStore>()(
  immer((set, get) => ({
    // Initial state
    cabinet: null,
    selectedPanelId: null,
    coreMaterials: CORE_MATERIALS,
    surfaceMaterials: SURFACE_MATERIALS,
    edgeMaterials: EDGE_MATERIALS,
    
    // ========== CABINET CRUD ==========
    createCabinet: (type = 'BASE', name = 'Base Cabinet') => {
      const defaultCoreId = 'core-pb-16';
      const defaultSurfaceId = 'surf-mel-white';
      const defaultEdgeId = 'edge-pvc-white-10';
      
      const panels = generatePanels(
        DEFAULT_DIMENSIONS,
        DEFAULT_STRUCTURE,
        defaultCoreId,
        defaultSurfaceId,
        defaultEdgeId
      );
      
      const cabinet: Cabinet = {
        id: createId(),
        name,
        type,
        dimensions: { ...DEFAULT_DIMENSIONS },
        structure: { ...DEFAULT_STRUCTURE },
        materials: {
          defaultCore: defaultCoreId,
          defaultSurface: defaultSurfaceId,
          defaultEdge: defaultEdgeId,
          overrides: new Map(),
        },
        manufacturing: { ...DEFAULT_MANUFACTURING },
        panels,
        computed: calculateTotals(panels),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      set({ cabinet });
    },
    
    // ========== DIMENSION ACTIONS ==========
    setDimension: (key, value) => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.dimensions[key] = value;
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    // ========== STRUCTURE ACTIONS ==========
    setJointType: (position, type) => {
      set((state) => {
        if (!state.cabinet) return;
        if (position === 'top') {
          state.cabinet.structure.topJoint = type;
        } else {
          state.cabinet.structure.bottomJoint = type;
        }
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    setShelfCount: (count) => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.structure.shelfCount = Math.max(0, Math.min(10, count));
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    setDividerCount: (count) => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.structure.dividerCount = Math.max(0, Math.min(5, count));
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    toggleBackPanel: () => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.structure.hasBackPanel = !state.cabinet.structure.hasBackPanel;
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    // ========== MATERIAL ACTIONS ==========
    setDefaultCore: (materialId) => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.materials.defaultCore = materialId;
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    setDefaultSurface: (materialId) => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.materials.defaultSurface = materialId;
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    setDefaultEdge: (materialId) => {
      set((state) => {
        if (!state.cabinet) return;
        state.cabinet.materials.defaultEdge = materialId;
        state.cabinet.updatedAt = Date.now();
      });
      get().recalculate();
    },
    
    // ========== PANEL SELECTION ==========
    selectPanel: (panelId) => {
      set({ selectedPanelId: panelId });
    },
    
    // ========== MATERIAL CRUD - CORE ==========
    addCoreMaterial: (material) => {
      set((state) => {
        state.coreMaterials = {
          ...state.coreMaterials,
          [material.id]: material
        };
      });
    },
    
    updateCoreMaterial: (id, updates) => {
      set((state) => {
        if (state.coreMaterials[id]) {
          state.coreMaterials = {
            ...state.coreMaterials,
            [id]: { ...state.coreMaterials[id], ...updates }
          };
        }
      });
      get().recalculate();
    },
    
    deleteCoreMaterial: (id) => {
      set((state) => {
        const { [id]: removed, ...rest } = state.coreMaterials;
        state.coreMaterials = rest as typeof state.coreMaterials;
      });
    },
    
    // ========== MATERIAL CRUD - SURFACE ==========
    addSurfaceMaterial: (material) => {
      set((state) => {
        state.surfaceMaterials = {
          ...state.surfaceMaterials,
          [material.id]: material
        };
      });
    },
    
    updateSurfaceMaterial: (id, updates) => {
      set((state) => {
        if (state.surfaceMaterials[id]) {
          state.surfaceMaterials = {
            ...state.surfaceMaterials,
            [id]: { ...state.surfaceMaterials[id], ...updates }
          };
        }
      });
      get().recalculate();
    },
    
    deleteSurfaceMaterial: (id) => {
      set((state) => {
        const { [id]: removed, ...rest } = state.surfaceMaterials;
        state.surfaceMaterials = rest as typeof state.surfaceMaterials;
      });
    },
    
    // ========== MATERIAL CRUD - EDGE ==========
    addEdgeMaterial: (material) => {
      set((state) => {
        state.edgeMaterials = {
          ...state.edgeMaterials,
          [material.id]: material
        };
      });
    },
    
    updateEdgeMaterial: (id, updates) => {
      set((state) => {
        if (state.edgeMaterials[id]) {
          state.edgeMaterials = {
            ...state.edgeMaterials,
            [id]: { ...state.edgeMaterials[id], ...updates }
          };
        }
      });
      get().recalculate();
    },
    
    deleteEdgeMaterial: (id) => {
      set((state) => {
        const { [id]: removed, ...rest } = state.edgeMaterials;
        state.edgeMaterials = rest as typeof state.edgeMaterials;
      });
    },
    
    // ========== PER-PANEL MATERIAL ACTIONS ==========
    updatePanelMaterial: (panelId, target, materialId) => {
      set((state) => {
        if (!state.cabinet) return;
        
        const panel = state.cabinet.panels.find(p => p.id === panelId);
        if (!panel) return;
        
        if (target === 'core') {
          panel.coreMaterialId = materialId;
          // Recalculate panel thickness
          const core = state.coreMaterials[materialId as keyof typeof state.coreMaterials];
          const surface = state.surfaceMaterials[panel.faces?.faceA as keyof typeof state.surfaceMaterials];
          if (core) {
            const surfaceThickness = surface?.thickness || 0;
            panel.computed.realThickness = core.thickness + (surfaceThickness * 2) + 0.2; // 2 faces + glue
          }
        } else if (target === 'faceA') {
          if (!panel.faces) panel.faces = { faceA: null, faceB: null };
          panel.faces.faceA = materialId;
        } else if (target === 'faceB') {
          if (!panel.faces) panel.faces = { faceA: null, faceB: null };
          panel.faces.faceB = materialId;
        }
        
        // Recalculate cabinet totals
        state.cabinet.computed = calculateTotals(state.cabinet.panels);
      });
    },
    
    updatePanelEdge: (panelId, side, edgeId) => {
      set((state) => {
        if (!state.cabinet) return;
        
        const panel = state.cabinet.panels.find(p => p.id === panelId);
        if (!panel) return;
        
        if (!panel.edges) {
          panel.edges = { top: null, bottom: null, left: null, right: null };
        }
        
        panel.edges[side] = edgeId;
        
        // Recalculate cut size based on new edge thicknesses
        const getEdgeThickness = (id: string | null) => {
          if (!id) return 0;
          const edge = state.edgeMaterials[id as keyof typeof state.edgeMaterials];
          return edge?.thickness || 0;
        };
        
        const edgeT = getEdgeThickness(panel.edges.top);
        const edgeB = getEdgeThickness(panel.edges.bottom);
        const edgeL = getEdgeThickness(panel.edges.left);
        const edgeR = getEdgeThickness(panel.edges.right);
        
        // Cut size = Finish - edges + pre-milling
        const preMilling = 0.5;
        panel.computed.cutWidth = panel.finishWidth - edgeL - edgeR + (2 * preMilling);
        panel.computed.cutHeight = panel.finishHeight - edgeT - edgeB + (2 * preMilling);
        
        // Recalculate edge length
        panel.computed.edgeLength = 
          (edgeT > 0 ? panel.finishWidth : 0) +
          (edgeB > 0 ? panel.finishWidth : 0) +
          (edgeL > 0 ? panel.finishHeight : 0) +
          (edgeR > 0 ? panel.finishHeight : 0);
        
        // Recalculate cabinet totals
        state.cabinet.computed = calculateTotals(state.cabinet.panels);
      });
    },
    
    // ========== RECALCULATION ==========
    recalculate: () => {
      set((state) => {
        if (!state.cabinet) return;
        
        const newPanels = generatePanels(
          state.cabinet.dimensions,
          state.cabinet.structure,
          state.cabinet.materials.defaultCore,
          state.cabinet.materials.defaultSurface,
          state.cabinet.materials.defaultEdge
        );
        
        state.cabinet.panels = newPanels;
        state.cabinet.computed = calculateTotals(newPanels);
      });
    },
  }))
);

// Selector hooks
export const useCabinet = () => useCabinetStore((s) => s.cabinet);
export const useSelectedPanel = () => {
  const cabinet = useCabinetStore((s) => s.cabinet);
  const selectedId = useCabinetStore((s) => s.selectedPanelId);
  return cabinet?.panels.find(p => p.id === selectedId) || null;
};
