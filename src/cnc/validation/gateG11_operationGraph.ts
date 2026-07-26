/**
 * Gate G11: OperationGraph Layer Validation
 *
 * @module cnc/validation/gateG11_operationGraph
 * @version 1.0.0
 *
 * Validates CNC operations against Häfele engineering standards at the
 * OperationGraph (canonical) layer.
 *
 * ## Rule Set
 * - G11-OP.1: CAM Housing - Ø15, BORE, direction='V' (FACE), on TOP/BOTTOM
 * - G11-OP.2: Bolt Sleeve - Ø10, DRILL/BORE, direction='H' (EDGE), on SIDE
 * - G11-OP.3: Dowel Side - Ø8 on SIDE panel, depth follows bore orientation
 * - G11-OP.4: Dowel Horizontal - Ø8 on TOP/BOTTOM panel, depth follows bore orientation
 * - G11-OP.5: Distance B - Must be 24mm (or 34mm alternate) from mating edge
 *
 * ## Canonical Spec Reference
 * - CAM Housing: Ø15mm face bore on horizontal panel
 * - Bolt Sleeve: Ø10mm edge bore on side panel
 * - Dowel depth is BORE-AWARE, not role-based (matches drill-map validator
 *   gateG11_minifixSystem32 S16): EDGE_BORE (direction='H', end grain) = 18mm,
 *   FACE_BORE (direction='V') = 12mm, total 30mm. Which panel carries which
 *   bore flips between constructions:
 *   - OVERLAY: side EDGE 18mm + horiz FACE 12mm
 *   - INSET v4.0 (side-covers-top): side FACE 12mm + horiz EDGE 18mm
 *   When an operation has no direction, the strongest honest check is the
 *   symmetric pair {12, 18}; the single-value expectation cannot be asserted.
 */

import type {
  Operation,
  DrillOperation,
  BoreOperation,
  OperationGraph,
} from '../operation/operationTypes';

// ============================================
// CONSTANTS (Häfele Standards)
// ============================================

export const G11_OP_CONSTANTS = {
  // Diameters (mm)
  CAM_DIAMETER: 15,
  BOLT_SLEEVE_DIAMETER: 10,
  DOWEL_DIAMETER: 8,

  // Depths (mm) — keyed by bore orientation, NOT by panel role
  // (which panel carries the edge bore flips between OVERLAY and INSET)
  DOWEL_DEPTH_EDGE: 18,    // EDGE_BORE (direction='H', into end grain)
  DOWEL_DEPTH_FACE: 12,    // FACE_BORE (direction='V', into panel face)

  // Distance B
  DIMENSION_B_STANDARD: 24,
  DIMENSION_B_ALTERNATE: 34,

  // Tolerances
  DIAMETER_TOLERANCE: 0.1,
  DEPTH_TOLERANCE: 0.5,
  DISTANCE_B_TOLERANCE: 1.0,
} as const;

// ============================================
// EXTENDED OPERATION METADATA
// ============================================

/**
 * Extended metadata for G11 validation.
 * Should be attached to operations during mapping from DrillMap.
 */
export interface G11OperationMeta {
  /** Panel role: LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM */
  panelRole?: string;
  /** Operation purpose: CAM_HOUSING, BOLT_SLEEVE, DOWEL_SIDE, DOWEL_HORIZONTAL */
  purpose?: G11Purpose;
  /** Distance from mating edge (Dimension B) for CAM operations */
  distanceFromMatingEdge?: number;
  /** Mating pair ID for alignment validation */
  matingPairId?: string;
  /** Source drill point ID */
  sourcePointId?: string;
}

export type G11Purpose =
  | 'CAM_HOUSING'
  | 'BOLT_SLEEVE'
  | 'DOWEL_SIDE'
  | 'DOWEL_HORIZONTAL'
  | 'OTHER';

// ============================================
// ISSUE TYPES
// ============================================

export type G11OpSeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface G11OpIssue {
  id: string;
  severity: G11OpSeverity;
  code: string;
  message: string;
  operationId: string;
  context?: Record<string, string | number | boolean | undefined>;
}

export interface G11OpResult {
  gate: 'G11_OPERATION_GRAPH';
  status: 'PASS' | 'FAIL';
  issues: G11OpIssue[];
  summary: {
    blockers: number;
    warnings: number;
    info: number;
    operationsValidated: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function almostEqual(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

function isSidePanel(role: string | undefined): boolean {
  if (!role) return false;
  return ['LEFT_SIDE', 'RIGHT_SIDE', 'SIDE'].includes(role);
}

function isHorizontalPanel(role: string | undefined): boolean {
  if (!role) return false;
  return ['TOP', 'BOTTOM', 'SHELF'].includes(role);
}

function issueId(code: string, opId: string): string {
  return `${code}::${opId}`;
}

/**
 * Get G11 metadata from operation.
 * Metadata may be in workpieceContext or attached as custom property.
 */
function getG11Meta(op: Operation): G11OperationMeta {
  // Check if metadata is attached via workpieceContext
  const ctx = op.workpieceContext;
  if (ctx) {
    const ctxAny = ctx as unknown as Record<string, unknown>;
    return {
      panelRole: ctxAny.panelRole as string | undefined,
      purpose: ctxAny.purpose as G11Purpose | undefined,
      distanceFromMatingEdge: ctxAny.distanceFromMatingEdge as number | undefined,
      matingPairId: ctxAny.matingPairId as string | undefined,
      sourcePointId: ctxAny.sourceId as string | undefined,
    };
  }

  // Check if attached as g11Meta property
  const anyOp = op as unknown as Record<string, unknown>;
  if (anyOp.g11Meta) {
    return anyOp.g11Meta as G11OperationMeta;
  }

  return {};
}

// ============================================
// VALIDATION RULES
// ============================================

/**
 * G11-OP.1: CAM Housing Validation
 *
 * CAM Housing must be:
 * - Ø15mm BORE operation
 * - Direction = 'V' (face bore)
 * - On TOP or BOTTOM panel
 * - Have Dimension B defined
 */
function validateCamHousing(op: BoreOperation, meta: G11OperationMeta): G11OpIssue[] {
  const issues: G11OpIssue[] = [];
  const { CAM_DIAMETER, DIAMETER_TOLERANCE, DIMENSION_B_STANDARD, DIMENSION_B_ALTERNATE, DISTANCE_B_TOLERANCE } = G11_OP_CONSTANTS;

  // Check diameter
  if (!almostEqual(op.diameter, CAM_DIAMETER, DIAMETER_TOLERANCE)) {
    issues.push({
      id: issueId('B_G11_OP_CAM_DIAMETER', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_CAM_DIAMETER',
      message: `CAM housing must be Ø${CAM_DIAMETER}mm, found Ø${op.diameter}mm`,
      operationId: op.id,
      context: { expected: CAM_DIAMETER, actual: op.diameter },
    });
  }

  // Check direction (must be vertical = face bore)
  if (op.direction && op.direction !== 'V') {
    issues.push({
      id: issueId('B_G11_OP_CAM_DIRECTION', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_CAM_DIRECTION',
      message: `CAM housing must be FACE_BORE (direction='V'), found direction='${op.direction}'`,
      operationId: op.id,
      context: { expected: 'V', actual: op.direction },
    });
  }

  // Check panel role
  if (meta.panelRole && !isHorizontalPanel(meta.panelRole)) {
    issues.push({
      id: issueId('B_G11_OP_CAM_PANEL', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_CAM_PANEL',
      message: `CAM housing must be on TOP/BOTTOM panel, found on ${meta.panelRole}`,
      operationId: op.id,
      context: { panelRole: meta.panelRole },
    });
  }

  // Check Dimension B
  if (meta.distanceFromMatingEdge === undefined) {
    issues.push({
      id: issueId('B_G11_OP_CAM_NO_DIM_B', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_CAM_NO_DIM_B',
      message: 'CAM housing must define distanceFromMatingEdge (Dimension B)',
      operationId: op.id,
    });
  } else {
    const dimB = meta.distanceFromMatingEdge;
    const matchesStandard = almostEqual(dimB, DIMENSION_B_STANDARD, DISTANCE_B_TOLERANCE);
    const matchesAlternate = almostEqual(dimB, DIMENSION_B_ALTERNATE, DISTANCE_B_TOLERANCE);

    if (!matchesStandard && !matchesAlternate) {
      issues.push({
        id: issueId('W_G11_OP_CAM_DIM_B', op.id),
        severity: 'WARNING',
        code: 'W_G11_OP_CAM_DIM_B',
        message: `CAM Dimension B (${dimB}mm) should be ${DIMENSION_B_STANDARD}mm or ${DIMENSION_B_ALTERNATE}mm`,
        operationId: op.id,
        context: { actual: dimB, expected: DIMENSION_B_STANDARD },
      });
    }
  }

  return issues;
}

/**
 * G11-OP.2: Bolt Sleeve Validation
 *
 * Bolt Sleeve must be:
 * - Ø10mm operation
 * - Direction = 'H' (edge bore)
 * - On SIDE panel
 */
function validateBoltSleeve(op: DrillOperation | BoreOperation, meta: G11OperationMeta): G11OpIssue[] {
  const issues: G11OpIssue[] = [];
  const { BOLT_SLEEVE_DIAMETER, DIAMETER_TOLERANCE } = G11_OP_CONSTANTS;

  const diameter = op.type === 'BORE' ? op.diameter : (op as DrillOperation).diameter;

  // Check diameter
  if (diameter !== undefined && !almostEqual(diameter, BOLT_SLEEVE_DIAMETER, DIAMETER_TOLERANCE)) {
    issues.push({
      id: issueId('B_G11_OP_BOLT_DIAMETER', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_BOLT_DIAMETER',
      message: `Bolt sleeve must be Ø${BOLT_SLEEVE_DIAMETER}mm, found Ø${diameter}mm`,
      operationId: op.id,
      context: { expected: BOLT_SLEEVE_DIAMETER, actual: diameter },
    });
  }

  // Check direction (must be horizontal = edge bore)
  const direction = op.type === 'BORE' ? op.direction : (op as DrillOperation).direction;
  if (direction && direction !== 'H') {
    issues.push({
      id: issueId('B_G11_OP_BOLT_DIRECTION', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_BOLT_DIRECTION',
      message: `Bolt sleeve must be EDGE_BORE (direction='H'), found direction='${direction}'`,
      operationId: op.id,
      context: { expected: 'H', actual: direction },
    });
  }

  // Check panel role
  if (meta.panelRole && !isSidePanel(meta.panelRole)) {
    issues.push({
      id: issueId('B_G11_OP_BOLT_PANEL', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_BOLT_PANEL',
      message: `Bolt sleeve must be on SIDE panel, found on ${meta.panelRole}`,
      operationId: op.id,
      context: { panelRole: meta.panelRole },
    });
  }

  return issues;
}

/**
 * Shared bore-aware dowel depth check (G11-OP.3 / G11-OP.4).
 *
 * Depth follows the actual bore orientation carried by the operation
 * (direction: 'H' = EDGE_BORE = 18mm end grain, 'V' = FACE_BORE = 12mm),
 * matching the drill-map G11 validator (gateG11_minifixSystem32, S16).
 * The old role-based hardcode (SIDE=18 / HORIZ=12) was OVERLAY-only and
 * wrongly flagged every INSET v4.0 cabinet.
 *
 * When direction is absent (optional for backward compat), the strongest
 * honest check is the symmetric pair {12, 18}: reject anything else, and
 * flag orientation-unknown as INFO instead of asserting a single value
 * that would be wrong for one of the two constructions.
 */
function validateDowelDepthBoreAware(
  op: DrillOperation,
  purposeLabel: 'DOWEL_SIDE' | 'DOWEL_HORIZONTAL',
  depthCode: string
): G11OpIssue[] {
  const issues: G11OpIssue[] = [];
  const { DOWEL_DEPTH_EDGE, DOWEL_DEPTH_FACE, DEPTH_TOLERANCE } = G11_OP_CONSTANTS;

  if (op.direction === 'H' || op.direction === 'V') {
    // Orientation known — assert the single bore-aware expected depth
    const boreType = op.direction === 'H' ? 'EDGE_BORE' : 'FACE_BORE';
    const expected = op.direction === 'H' ? DOWEL_DEPTH_EDGE : DOWEL_DEPTH_FACE;

    if (!almostEqual(op.depth, expected, DEPTH_TOLERANCE)) {
      issues.push({
        id: issueId(depthCode, op.id),
        severity: 'BLOCKER',
        code: depthCode,
        message: `${purposeLabel} depth must be ${expected}mm for ${boreType} (direction='${op.direction}'), found ${op.depth}mm`,
        operationId: op.id,
        context: { expected, actual: op.depth, boreType, direction: op.direction },
      });
    }
  } else {
    // Orientation unknown — accept the {12, 18} pair symmetrically
    const matchesEdge = almostEqual(op.depth, DOWEL_DEPTH_EDGE, DEPTH_TOLERANCE);
    const matchesFace = almostEqual(op.depth, DOWEL_DEPTH_FACE, DEPTH_TOLERANCE);

    if (!matchesEdge && !matchesFace) {
      issues.push({
        id: issueId(depthCode, op.id),
        severity: 'BLOCKER',
        code: depthCode,
        message: `${purposeLabel} depth must be ${DOWEL_DEPTH_FACE}mm (FACE_BORE) or ${DOWEL_DEPTH_EDGE}mm (EDGE_BORE), found ${op.depth}mm`,
        operationId: op.id,
        context: { expectedFace: DOWEL_DEPTH_FACE, expectedEdge: DOWEL_DEPTH_EDGE, actual: op.depth },
      });
    } else {
      issues.push({
        id: issueId('I_G11_OP_DOWEL_ORIENTATION_UNKNOWN', op.id),
        severity: 'INFO',
        code: 'I_G11_OP_DOWEL_ORIENTATION_UNKNOWN',
        message: `${purposeLabel} at ${op.id}: no direction on operation — depth ${op.depth}mm accepted as ${matchesEdge ? `EDGE_BORE (${DOWEL_DEPTH_EDGE}mm)` : `FACE_BORE (${DOWEL_DEPTH_FACE}mm)`} without orientation confirmation`,
        operationId: op.id,
        context: { actual: op.depth, assumedBoreType: matchesEdge ? 'EDGE_BORE' : 'FACE_BORE' },
      });
    }
  }

  return issues;
}

/**
 * G11-OP.3: Dowel Side Validation
 *
 * Dowel on SIDE panel must be:
 * - Ø8mm DRILL operation
 * - Depth consistent with its bore orientation:
 *   EDGE_BORE (direction='H') = 18mm — OVERLAY construction
 *   FACE_BORE (direction='V') = 12mm — INSET v4.0 construction
 */
function validateDowelSide(op: DrillOperation, meta: G11OperationMeta): G11OpIssue[] {
  const issues: G11OpIssue[] = [];
  const { DOWEL_DIAMETER, DIAMETER_TOLERANCE } = G11_OP_CONSTANTS;

  // Check diameter
  if (op.diameter !== undefined && !almostEqual(op.diameter, DOWEL_DIAMETER, DIAMETER_TOLERANCE)) {
    issues.push({
      id: issueId('B_G11_OP_DOWEL_SIDE_DIA', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_DOWEL_SIDE_DIA',
      message: `DOWEL_SIDE must be Ø${DOWEL_DIAMETER}mm, found Ø${op.diameter}mm`,
      operationId: op.id,
      context: { expected: DOWEL_DIAMETER, actual: op.diameter },
    });
  }

  // Check depth against actual bore orientation (construction-agnostic)
  issues.push(...validateDowelDepthBoreAware(op, 'DOWEL_SIDE', 'B_G11_OP_DOWEL_SIDE_DEPTH'));

  // Check panel role
  if (meta.panelRole && !isSidePanel(meta.panelRole)) {
    issues.push({
      id: issueId('B_G11_OP_DOWEL_SIDE_PANEL', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_DOWEL_SIDE_PANEL',
      message: `DOWEL_SIDE must be on SIDE panel, found on ${meta.panelRole}`,
      operationId: op.id,
      context: { panelRole: meta.panelRole },
    });
  }

  return issues;
}

/**
 * G11-OP.4: Dowel Horizontal Validation
 *
 * Dowel on TOP/BOTTOM panel must be:
 * - Ø8mm DRILL operation
 * - Depth consistent with its bore orientation:
 *   FACE_BORE (direction='V') = 12mm — OVERLAY construction
 *   EDGE_BORE (direction='H') = 18mm — INSET v4.0 construction
 */
function validateDowelHorizontal(op: DrillOperation, meta: G11OperationMeta): G11OpIssue[] {
  const issues: G11OpIssue[] = [];
  const { DOWEL_DIAMETER, DIAMETER_TOLERANCE } = G11_OP_CONSTANTS;

  // Check diameter
  if (op.diameter !== undefined && !almostEqual(op.diameter, DOWEL_DIAMETER, DIAMETER_TOLERANCE)) {
    issues.push({
      id: issueId('B_G11_OP_DOWEL_HORIZ_DIA', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_DOWEL_HORIZ_DIA',
      message: `DOWEL_HORIZONTAL must be Ø${DOWEL_DIAMETER}mm, found Ø${op.diameter}mm`,
      operationId: op.id,
      context: { expected: DOWEL_DIAMETER, actual: op.diameter },
    });
  }

  // Check depth against actual bore orientation (construction-agnostic)
  issues.push(...validateDowelDepthBoreAware(op, 'DOWEL_HORIZONTAL', 'B_G11_OP_DOWEL_HORIZ_DEPTH'));

  // Check panel role
  if (meta.panelRole && !isHorizontalPanel(meta.panelRole)) {
    issues.push({
      id: issueId('B_G11_OP_DOWEL_HORIZ_PANEL', op.id),
      severity: 'BLOCKER',
      code: 'B_G11_OP_DOWEL_HORIZ_PANEL',
      message: `DOWEL_HORIZONTAL must be on TOP/BOTTOM panel, found on ${meta.panelRole}`,
      operationId: op.id,
      context: { panelRole: meta.panelRole },
    });
  }

  return issues;
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate operations against G11 Minifix/System32 standards.
 *
 * @param operations - Operations to validate
 * @returns G11 validation result
 */
export function validateG11Operations(operations: Operation[]): G11OpResult {
  const issues: G11OpIssue[] = [];

  for (const op of operations) {
    const meta = getG11Meta(op);
    const purpose = meta.purpose;

    if (!purpose) continue; // Skip operations without G11 purpose

    switch (purpose) {
      case 'CAM_HOUSING':
        if (op.type === 'BORE') {
          issues.push(...validateCamHousing(op, meta));
        } else {
          issues.push({
            id: issueId('B_G11_OP_CAM_TYPE', op.id),
            severity: 'BLOCKER',
            code: 'B_G11_OP_CAM_TYPE',
            message: `CAM housing must be BORE operation, found ${op.type}`,
            operationId: op.id,
          });
        }
        break;

      case 'BOLT_SLEEVE':
        if (op.type === 'DRILL' || op.type === 'BORE') {
          issues.push(...validateBoltSleeve(op, meta));
        }
        break;

      case 'DOWEL_SIDE':
        if (op.type === 'DRILL') {
          issues.push(...validateDowelSide(op, meta));
        } else {
          issues.push({
            id: issueId('B_G11_OP_DOWEL_SIDE_TYPE', op.id),
            severity: 'BLOCKER',
            code: 'B_G11_OP_DOWEL_SIDE_TYPE',
            message: `DOWEL_SIDE must be DRILL operation, found ${op.type}`,
            operationId: op.id,
          });
        }
        break;

      case 'DOWEL_HORIZONTAL':
        if (op.type === 'DRILL') {
          issues.push(...validateDowelHorizontal(op, meta));
        } else {
          issues.push({
            id: issueId('B_G11_OP_DOWEL_HORIZ_TYPE', op.id),
            severity: 'BLOCKER',
            code: 'B_G11_OP_DOWEL_HORIZ_TYPE',
            message: `DOWEL_HORIZONTAL must be DRILL operation, found ${op.type}`,
            operationId: op.id,
          });
        }
        break;
    }
  }

  const blockers = issues.filter(i => i.severity === 'BLOCKER').length;
  const warnings = issues.filter(i => i.severity === 'WARNING').length;
  const info = issues.filter(i => i.severity === 'INFO').length;

  return {
    gate: 'G11_OPERATION_GRAPH',
    status: blockers > 0 ? 'FAIL' : 'PASS',
    issues,
    summary: {
      blockers,
      warnings,
      info,
      operationsValidated: operations.length,
    },
  };
}

/**
 * Validate an entire OperationGraph against G11 standards.
 *
 * @param graph - OperationGraph to validate
 * @returns G11 validation result
 */
export function validateG11OperationGraph(graph: OperationGraph): G11OpResult {
  return validateG11Operations(graph.operations);
}
