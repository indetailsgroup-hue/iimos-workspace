/**
 * ToleranceEngine - Semantic Tolerance Injection System
 * 
 * ARCHITECTURE (North Star v4.0):
 * - Part of Module B: Assembler Logic
 * - Auto-injects tolerances based on material behavior
 * - Ensures DXF/CSV output includes context-aware gaps
 * 
 * CONCEPT:
 * DXF R12 is just bare lines, but real production needs "context"
 * This engine knows material behavior and injects tolerances automatically
 * 
 * All dimensions in millimeters (mm)
 */

// ============================================
// MATERIAL CATEGORIES & BEHAVIORS
// ============================================

export type MaterialCategory = 
  | 'WOOD_PANEL'      // MDF, Plywood, Particle Board
  | 'SOLID_WOOD'      // Natural wood (expands/contracts)
  | 'STONE_NATURAL'   // Marble, Granite (needs grout)
  | 'STONE_ENGINEERED'// Quartz, Sintered (tighter tolerance)
  | 'METAL_SHEET'     // Aluminum, Steel
  | 'GLASS'           // Tempered, Laminated
  | 'ACRYLIC';        // Solid surface

export interface MaterialBehavior {
  category: MaterialCategory;
  
  // Expansion/Contraction
  thermalExpansion: number;     // mm per meter per °C
  humidityExpansion: number;    // mm per meter per % RH
  
  // Joint requirements
  minJointGap: number;          // mm - minimum gap between pieces
  groutWidth: number;           // mm - for stone (0 for wood)
  
  // Edge treatment
  edgeBandingAllowance: number; // mm - pre-mill allowance
  chipOutRisk: boolean;         // needs climb-cut or scoring
  
  // Structural
  density: number;              // kg/m³
  flexuralStrength: number;     // MPa
}

// ============================================
// MATERIAL BEHAVIOR DATABASE
// ============================================

export const MATERIAL_BEHAVIORS: Record<MaterialCategory, MaterialBehavior> = {
  WOOD_PANEL: {
    category: 'WOOD_PANEL',
    thermalExpansion: 0.005,
    humidityExpansion: 0.3,
    minJointGap: 0,              // Can be butt-jointed
    groutWidth: 0,
    edgeBandingAllowance: 0.5,   // Standard pre-mill
    chipOutRisk: true,
    density: 700,                // MDF average
    flexuralStrength: 30,
  },
  
  SOLID_WOOD: {
    category: 'SOLID_WOOD',
    thermalExpansion: 0.003,
    humidityExpansion: 2.5,      // Significant movement!
    minJointGap: 1,              // Allow for expansion
    groutWidth: 0,
    edgeBandingAllowance: 0,     // No edge banding
    chipOutRisk: true,
    density: 600,
    flexuralStrength: 80,
  },
  
  STONE_NATURAL: {
    category: 'STONE_NATURAL',
    thermalExpansion: 0.008,
    humidityExpansion: 0.01,
    minJointGap: 2,              // Grout line required
    groutWidth: 2,               // Standard grout width
    edgeBandingAllowance: 0,
    chipOutRisk: true,           // Needs water jet or slow cut
    density: 2700,               // Marble/Granite
    flexuralStrength: 15,
  },
  
  STONE_ENGINEERED: {
    category: 'STONE_ENGINEERED',
    thermalExpansion: 0.01,
    humidityExpansion: 0.001,
    minJointGap: 1,              // Tighter than natural
    groutWidth: 1.5,
    edgeBandingAllowance: 0,
    chipOutRisk: false,
    density: 2400,
    flexuralStrength: 40,
  },
  
  METAL_SHEET: {
    category: 'METAL_SHEET',
    thermalExpansion: 0.024,     // Aluminum expands a lot
    humidityExpansion: 0,
    minJointGap: 0.5,
    groutWidth: 0,
    edgeBandingAllowance: 0,
    chipOutRisk: false,
    density: 2700,               // Aluminum
    flexuralStrength: 200,
  },
  
  GLASS: {
    category: 'GLASS',
    thermalExpansion: 0.009,
    humidityExpansion: 0,
    minJointGap: 3,              // Safety gap required
    groutWidth: 0,
    edgeBandingAllowance: 0,
    chipOutRisk: false,          // Already polished
    density: 2500,
    flexuralStrength: 40,
  },
  
  ACRYLIC: {
    category: 'ACRYLIC',
    thermalExpansion: 0.07,      // Very high expansion!
    humidityExpansion: 0.3,
    minJointGap: 2,
    groutWidth: 0,
    edgeBandingAllowance: 0,
    chipOutRisk: false,
    density: 1200,
    flexuralStrength: 70,
  },
};

// ============================================
// TOLERANCE CALCULATION
// ============================================

export interface ToleranceContext {
  material: MaterialCategory;
  
  // Environmental conditions
  tempVariation: number;        // °C range (e.g., 10 = ±5°C)
  humidityVariation: number;    // % RH range
  
  // Installation context
  isExterior: boolean;          // More tolerance needed
  installMethod: 'GLUE' | 'MECHANICAL' | 'FLOATING';
  
  // Panel dimensions
  lengthMM: number;
  widthMM: number;
}

export interface ToleranceResult {
  // Joint gaps to add
  lengthGap: number;            // mm to add at length ends
  widthGap: number;             // mm to add at width ends
  
  // Grout (for stone)
  groutAllowance: number;       // mm per joint
  
  // Cut adjustments
  preMill: number;              // mm for edge banding
  
  // Warnings
  warnings: string[];
  
  // Total adjustment
  adjustedLength: number;
  adjustedWidth: number;
}

/**
 * Calculate semantic tolerances based on material and context
 * 
 * This is the core "intelligence" that injects appropriate gaps
 * into the DXF/CSV output based on material behavior
 */
export function calculateSemanticTolerance(
  context: ToleranceContext
): ToleranceResult {
  const behavior = MATERIAL_BEHAVIORS[context.material];
  const warnings: string[] = [];
  
  // Calculate thermal expansion
  const lengthMeters = context.lengthMM / 1000;
  const widthMeters = context.widthMM / 1000;
  
  const thermalLengthExpansion = lengthMeters * behavior.thermalExpansion * context.tempVariation;
  const thermalWidthExpansion = widthMeters * behavior.thermalExpansion * context.tempVariation;
  
  // Calculate humidity expansion
  const humidityLengthExpansion = lengthMeters * behavior.humidityExpansion * (context.humidityVariation / 100);
  const humidityWidthExpansion = widthMeters * behavior.humidityExpansion * (context.humidityVariation / 100);
  
  // Total expansion (worst case)
  let lengthGap = Math.max(
    behavior.minJointGap,
    thermalLengthExpansion + humidityLengthExpansion
  );
  
  let widthGap = Math.max(
    behavior.minJointGap,
    thermalWidthExpansion + humidityWidthExpansion
  );
  
  // Exterior installation needs more tolerance
  if (context.isExterior) {
    lengthGap *= 1.5;
    widthGap *= 1.5;
    warnings.push('Exterior installation: tolerances increased by 50%');
  }
  
  // Floating installation needs expansion gaps
  if (context.installMethod === 'FLOATING') {
    lengthGap = Math.max(lengthGap, 8);  // Perimeter gap for floating
    widthGap = Math.max(widthGap, 8);
    warnings.push('Floating installation: minimum 8mm perimeter gap');
  }
  
  // Round to practical values (0.5mm increments)
  lengthGap = Math.ceil(lengthGap * 2) / 2;
  widthGap = Math.ceil(widthGap * 2) / 2;
  
  // Grout allowance (stone only)
  const groutAllowance = behavior.groutWidth;
  if (groutAllowance > 0) {
    warnings.push(`Stone material: ${groutAllowance}mm grout line required between pieces`);
  }
  
  // Pre-mill for edge banding
  const preMill = behavior.edgeBandingAllowance;
  
  // Chip-out warning
  if (behavior.chipOutRisk) {
    warnings.push('Material prone to chip-out: use climb-cut or scoring saw');
  }
  
  // High expansion warning
  if (behavior.thermalExpansion > 0.05 || behavior.humidityExpansion > 1) {
    warnings.push('⚠️ High expansion material: ensure adequate expansion gaps');
  }
  
  return {
    lengthGap,
    widthGap,
    groutAllowance,
    preMill,
    warnings,
    adjustedLength: context.lengthMM - (lengthGap * 2),  // Gap both ends
    adjustedWidth: context.widthMM - (widthGap * 2),
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Get tolerance for wood panel (cabinet parts)
 * Most common use case - simplified interface
 */
export function getWoodPanelTolerance(
  lengthMM: number,
  widthMM: number,
  hasEdgeBanding: boolean = true
): ToleranceResult {
  return calculateSemanticTolerance({
    material: 'WOOD_PANEL',
    tempVariation: 10,          // Typical indoor
    humidityVariation: 20,
    isExterior: false,
    installMethod: 'MECHANICAL',
    lengthMM,
    widthMM,
  });
}

/**
 * Get tolerance for stone installation
 * Includes grout line calculation
 */
export function getStoneTolerance(
  lengthMM: number,
  widthMM: number,
  isNatural: boolean = true
): ToleranceResult {
  return calculateSemanticTolerance({
    material: isNatural ? 'STONE_NATURAL' : 'STONE_ENGINEERED',
    tempVariation: 15,
    humidityVariation: 10,
    isExterior: false,
    installMethod: 'GLUE',
    lengthMM,
    widthMM,
  });
}

// ============================================
// STRUCTURAL WEIGHT CALCULATION (Module 3 Preview)
// ============================================

/**
 * Calculate panel weight for hardware validation
 * Part of Structural Integrity Check (Module 3)
 */
export function calculatePanelWeight(
  lengthMM: number,
  widthMM: number,
  thicknessMM: number,
  material: MaterialCategory
): { weightKg: number; warnings: string[] } {
  const behavior = MATERIAL_BEHAVIORS[material];
  const warnings: string[] = [];
  
  // Volume in m³
  const volumeM3 = (lengthMM / 1000) * (widthMM / 1000) * (thicknessMM / 1000);
  
  // Weight in kg
  const weightKg = volumeM3 * behavior.density;
  
  // Warnings for heavy panels
  if (weightKg > 15) {
    warnings.push(`⚠️ Heavy panel: ${weightKg.toFixed(1)}kg - verify hardware load rating`);
  }
  
  if (weightKg > 25) {
    warnings.push(`🚨 Very heavy panel: ${weightKg.toFixed(1)}kg - may require special hinges (Blum Aventos HK-XS or similar)`);
  }
  
  if (material === 'STONE_NATURAL' || material === 'STONE_ENGINEERED') {
    warnings.push('Stone panel: ensure substrate and adhesive can support weight');
  }
  
  return { weightKg, warnings };
}
