/**
 * Drill Map to Minifix Pair Converter
 *
 * Converts DrillMapPoint data to MinifixConnectorPair format for validation.
 * Bridges the visualization layer (DrillMap) to the validation layer (Gate).
 *
 * v1.0: Initial implementation
 */

import type { DrillMapPoint, Vec3Tuple } from '../../../core/manufacturing/drillMap/types';
import { resolveCamDimA } from '../gateG11_types';
import type {
  MinifixConnectorPair,
  MinifixCamEntity,
  MinifixBoltEntity,
  MinifixPanelEntity,
  Vec3,
} from './minifixConstraintTypes';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function tupleToVec3(t: Vec3Tuple): Vec3 {
  return { x: t[0], y: t[1], z: t[2] };
}

// ============================================
// CAM POCKET CENTRE — SINGLE RESOLUTION POINT
// ============================================

/**
 * Resolve the cam pocket (bolt channel) centre in world coordinates.
 *
 * ## Why this is not `camDepth / 2`
 *
 * The Ø15 Minifix housing is asymmetric: it is drilled `camDepth` deep but the
 * bolt channel axis sits at Häfele "dim A" from the insertion face
 * (`minifixDefaults.ts:55` — `camHeight: 9 // 9mm - dimA`, for 18mm wood
 * drilled 13.5mm). `camDepth / 2` = 6.75mm was a constant 2.25mm short.
 *
 * ## Precedence (mirrors ruleG11_BoltCamAlignment, gateG11_minifixSystem32.ts:726-731)
 *
 * 1. **`boltPoint.targetPocketCenter`** — the generator's own declared value,
 *    emitted verbatim by every corner-joint path:
 *    OVERLAY `generateDrillMap.ts:988-996`, INSET `:1286-1297`,
 *    SHELF `:1670-1680`, BACK PANEL `:1933-1943`. It is the single authority;
 *    nothing downstream may recompute over it.
 * 2. **`camPanelThickness / 2`** — the generator's own formula, reproduced.
 *    Each of those four sites offsets the cam surface point along the cam
 *    normal by half the thickness of the panel the CAM is drilled into. This is
 *    the same source `genPocketCenter` uses in the sibling cross-checks
 *    (`validateMinifixConnector.ts:1001-1005`, commit 075ceacf).
 * 3. **`resolveCamDimA(camDepth)`** — the Häfele spec table
 *    (`CAM_DRILLING_SPECS`, `hardware/minifixDefaults.ts:42-53`) keyed by
 *    drilling depth, used when no owning-panel thickness is reachable.
 *
 * Tiers 2 and 3 agree wherever `camDepth` is the spec drilling depth for
 * `camPanelThickness` — every row of `CAM_DRILLING_SPECS` has
 * `dimA === woodThickness / 2` (12→6, 16→8, 18→9, 22→11, 29→14.5). They
 * diverge only when the two inputs disagree, and tier 2 wins because it is
 * what the generator actually did.
 */
export function resolveCamPocketCenter(args: {
  camPoint: DrillMapPoint;
  /** The paired BOLT point, when known — carries the generator's declared centre. */
  boltPoint?: DrillMapPoint;
  /** Thickness of the panel the CAM is drilled into, when known. */
  camPanelThickness?: number;
  /** CAM housing drilling depth (13.5mm for 18mm wood per Häfele FF 3.10). */
  camDepth: number;
}): Vec3 {
  const declared = args.boltPoint?.targetPocketCenter;
  if (declared) {
    // Tier 1: the generator said so. Do not recompute.
    return tupleToVec3(declared as Vec3Tuple);
  }

  const offset =
    args.camPanelThickness !== undefined && Number.isFinite(args.camPanelThickness)
      ? args.camPanelThickness / 2 // Tier 2
      : resolveCamDimA(args.camDepth); // Tier 3

  const position = tupleToVec3(args.camPoint.position);
  const normal = tupleToVec3(args.camPoint.normal);
  return {
    x: position.x + normal.x * offset,
    y: position.y + normal.y * offset,
    z: position.z + normal.z * offset,
  };
}

// ============================================
// CAM ENTITY BUILDER
// ============================================

/**
 * Build a MinifixCamEntity from a DrillMapPoint representing a CAM_LOCK/MINIFIX housing.
 *
 * @param pocketCenter - Pre-resolved pocket centre (see `resolveCamPocketCenter`).
 *   When omitted, the dim A fallback is resolved from `camDepth` alone — never
 *   `camDepth / 2`, which is not a convention anything in this repo emits.
 */
export function buildCamEntityFromDrillPoint(
  point: DrillMapPoint,
  camDepth: number = 13.5,  // 13.5mm for 18mm wood per Häfele FF 3.10
  arrowDirection?: Vec3Tuple,
  pocketCenter?: Vec3
): MinifixCamEntity {
  const position = tupleToVec3(point.position);
  const normal = tupleToVec3(point.normal);

  // Pocket centre = the generator's declared value where available, else dim A
  // into the panel from the drill surface. NOT camDepth/2 (see
  // resolveCamPocketCenter for the full precedence and its citations).
  const resolvedPocketCenter: Vec3 =
    pocketCenter ?? resolveCamPocketCenter({ camPoint: point, camDepth });

  // Default arrow direction (perpendicular to normal, in XZ plane)
  const defaultArrow: Vec3 = arrowDirection
    ? tupleToVec3(arrowDirection)
    : { x: -normal.z, y: 0, z: normal.x };

  return {
    id: point.id,
    kind: 'cam_housing',
    mountPanel: point.connectedPanelRole || 'panel_horizontal',
    frame: {
      origin: position,
      axes: {
        x: { x: 1, y: 0, z: 0 },
        y: { x: 0, y: 1, z: 0 },
        z: normal,
      },
    },
    geometry: {
      housingDiameter: point.diameter,
      housingDepth: camDepth,
      pocketCenter: resolvedPocketCenter,
    },
    params: {
      depth: camDepth,
      arrowDirection: defaultArrow,
    },
  };
}

// ============================================
// VECTOR MATH FOR BOLT SOLVER
// ============================================

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ============================================
// BOLT ENTITY BUILDER
// ============================================

/**
 * Build a MinifixBoltEntity from a DrillMapPoint representing a connecting bolt.
 *
 * CRITICAL GEOMETRY:
 * - If `boltDirection` is set by drill map generator: use it for BOTH axis AND ball center
 *   This is the PRODUCTION path where drill positions are correct
 * - If `boltDirection` is NOT set (test fixtures): use drilling normal for BOTH
 *   This allows tests to create intentional misalignments for error detection testing
 *
 * The drill map generator (generateDrillMap.ts) sets boltDirection to point from
 * bolt position toward cam pocket center. This ensures the engagement direction is correct.
 *
 * @param point - The bolt drill point (A = drill origin on edge surface)
 * @param ballHeadOffset - Distance from drill surface to ball center along axis
 * @param ballDiameter - Ball head diameter for clearance checks
 * @param _targetCamCenter - The cam pocket center (unused - axis comes from boltDirection or drilling normal)
 */
/**
 * Solve mode for ball center computation:
 * - BALL_TO_POCKET: Force B = C (canonical mode, ensures B ≈ C validation passes)
 * - FIXED_BALL_OFFSET: B = A + axis * ballHeadOffset (legacy/test mode)
 * - AUTO: Use BALL_TO_POCKET if boltDirection is set, otherwise FIXED_BALL_OFFSET
 */
export type MinifixSolveMode = 'BALL_TO_POCKET' | 'FIXED_BALL_OFFSET' | 'AUTO';

export function buildBoltEntityFromDrillPoint(
  point: DrillMapPoint,
  ballHeadOffset: number,
  ballDiameter: number,
  targetCamCenter: Vec3,
  solveMode: MinifixSolveMode = 'BALL_TO_POCKET' // ✅ Default to canonical mode
): MinifixBoltEntity {
  const A = tupleToVec3(point.position); // Bolt drill origin (edge surface)
  const drillingNormal = vec3Normalize(tupleToVec3(point.normal));
  const hasBoltDirection = !!point.boltDirection;

  // Determine effective solve mode
  const effectiveMode: 'BALL_TO_POCKET' | 'FIXED_BALL_OFFSET' =
    solveMode === 'AUTO'
      ? (hasBoltDirection ? 'BALL_TO_POCKET' : 'FIXED_BALL_OFFSET')
      : solveMode;

  // Compute axis and ball center based on solve mode
  let axis: Vec3;
  let ballCenter: Vec3;

  if (effectiveMode === 'BALL_TO_POCKET') {
    // ✅ Canonical mode:
    // - axis = direction from A to C (bolt origin to cam pocket center)
    // - ballCenter = C (force B = C)
    // This ensures validation passes regardless of boltDirection
    axis = vec3Normalize(vec3Sub(targetCamCenter, A));
    ballCenter = targetCamCenter;
  } else {
    // Legacy/test mode: use boltDirection or drilling normal
    const rawAxis: Vec3 = hasBoltDirection
      ? tupleToVec3(point.boltDirection!)
      : drillingNormal;
    axis = vec3Normalize(rawAxis);
    ballCenter = vec3Add(A, vec3Scale(axis, ballHeadOffset));
  }

  return {
    id: point.id,
    kind: 'connecting_bolt',
    mountPanel: point.connectedPanelRole || 'panel_vertical',
    frame: {
      origin: A,
      axis: axis,
    },
    geometry: {
      ballCenter,
      ballDiameter,
    },
    params: {
      ballD: ballDiameter,
      drillDiameter: point.diameter,
      drillDepth: point.depth,
    },
  };
}

// ============================================
// PANEL ENTITY BUILDER
// ============================================

/**
 * Build a MinifixPanelEntity from panel data.
 */
export function buildPanelEntity(
  id: string,
  thickness: number,
  normalDirection: Vec3Tuple
): MinifixPanelEntity {
  return {
    id,
    thickness,
    plane: {
      normal: tupleToVec3(normalDirection),
    },
  };
}

// ============================================
// CONNECTOR PAIR BUILDER
// ============================================

export interface DrillPointPair {
  camPoint: DrillMapPoint;
  boltPoint: DrillMapPoint;
  camDepth: number;
  boltBallOffset: number;
  boltBallDiameter: number;
  panelHThickness: number;
  panelVThickness: number;
  /** Optional solve mode for ball center computation (default: BALL_TO_POCKET) */
  solveMode?: MinifixSolveMode;
}

/**
 * Build a MinifixConnectorPair from a pair of DrillMapPoints.
 */
export function buildConnectorPairFromDrillPoints(
  pair: DrillPointPair
): MinifixConnectorPair {
  // Resolve the cam pocket centre ONCE, from the generator's declared value
  // where it exists. Everything downstream — arrow direction, bolt axis, ball
  // centre, and every rule that reads cam.geometry.pocketCenter — hangs off
  // this single value. `panelHThickness` is the CAM's owning panel thickness:
  // the gate resolves it per-panel via getPanelThicknessForPoint(ctx, cam, …)
  // (validateMinifixConnector.ts:970, 979), which is the same panel the
  // generator halves.
  const boltPos = tupleToVec3(pair.boltPoint.position);
  const camPocketCenter: Vec3 = resolveCamPocketCenter({
    camPoint: pair.camPoint,
    boltPoint: pair.boltPoint,
    camPanelThickness: pair.panelHThickness,
    camDepth: pair.camDepth,
  });

  // Compute arrow direction: from cam pocket center to bolt position
  // This MUST match what the validator expects: direction from C (pocketCenter) to A (bolt origin)
  // NOT projected - use full 3D direction
  const arrowVec = vec3Sub(boltPos, camPocketCenter);
  const arrowLen = vec3Length(arrowVec);
  const arrowDirection: Vec3Tuple = arrowLen > 1e-6
    ? [arrowVec.x / arrowLen, arrowVec.y / arrowLen, arrowVec.z / arrowLen]
    : [1, 0, 0]; // Fallback if zero (shouldn't happen in practice)

  // Build cam entity with computed arrow direction and the resolved pocket centre
  const cam = buildCamEntityFromDrillPoint(
    pair.camPoint,
    pair.camDepth,
    arrowDirection,
    camPocketCenter
  );

  // Build bolt entity (ball should align with cam pocket center)
  const bolt = buildBoltEntityFromDrillPoint(
    pair.boltPoint,
    pair.boltBallOffset,
    pair.boltBallDiameter,
    cam.geometry.pocketCenter,
    pair.solveMode // Pass through solveMode (defaults to BALL_TO_POCKET)
  );

  // Horizontal panel (where cam is mounted)
  const panelHorizontal = buildPanelEntity(
    'panel_horizontal',
    pair.panelHThickness,
    pair.camPoint.normal
  );

  // Vertical panel (where bolt is mounted)
  const panelVertical = buildPanelEntity(
    'panel_vertical',
    pair.panelVThickness,
    pair.boltPoint.normal
  );

  return {
    cam,
    bolt,
    panelHorizontal,
    panelVertical,
  };
}

// ============================================
// FIND PAIRED POINTS
// ============================================

/**
 * Find cam-bolt pairs from a list of drill points.
 * Uses pairedHoleId to match cams with their corresponding bolts.
 */
export function findMinifixPairs(
  points: DrillMapPoint[]
): Array<{ cam: DrillMapPoint; bolt: DrillMapPoint }> {
  const pairs: Array<{ cam: DrillMapPoint; bolt: DrillMapPoint }> = [];

  // Find all HOUSING (cam) points
  const housingPoints = points.filter(
    p => p.componentType === 'HOUSING' && (p.purpose === 'MINIFIX' || p.purpose === 'CAM_LOCK')
  );

  // Find all BOLT points
  const boltPoints = points.filter(p => p.componentType === 'BOLT');

  // Match by pairedHoleId
  for (const cam of housingPoints) {
    if (cam.pairedHoleId) {
      const bolt = boltPoints.find(b => b.id === cam.pairedHoleId);
      if (bolt) {
        pairs.push({ cam, bolt });
      }
    }
  }

  // Also check reverse pairing (bolt pointing to cam)
  for (const bolt of boltPoints) {
    if (bolt.pairedHoleId) {
      const cam = housingPoints.find(c => c.id === bolt.pairedHoleId);
      if (cam && !pairs.some(p => p.cam.id === cam.id)) {
        pairs.push({ cam, bolt });
      }
    }
  }

  return pairs;
}

// DrillPointPair is already exported via interface declaration above
