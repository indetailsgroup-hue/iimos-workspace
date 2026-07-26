/**
 * Gate G11: Minifix/System32/Dowel Validation
 *
 * @module gate/rules/gateG11_minifixSystem32
 * @version 1.1.0
 *
 * Validates Minifix connector placement against Häfele engineering standards.
 * Based on the Canonical Engineering Specification (CANONICAL_SPEC.md)
 * and Master Specification v1.1.
 *
 * ## Rule Set
 * - G11.1: Distance B - measured from mate edge (LEFT/RIGHT), not FRONT
 * - G11.2: Dowel Depth - follows actual bore orientation: EDGE_BORE=18mm, FACE_BORE=12mm
 * - G11.3: Drill Type - purpose invariant (T10b): BOLT/CAM/MINIFIX=FACE bore
 *   into host panel, BOLT_ENTRY=EDGE bore, DOWEL pairs=EDGE+FACE
 * - G11.4: Mating Alignment - world-space dowel alignment ≤0.1mm
 * - G11.5: Bolt Tip ↔ CAM Center Alignment (T10c): pocket = emitted
 *   targetPocketCenter (else dimA fallback), perpendicular residual ≤0.1mm
 * - G11.6: N-Center Policy & Mode Consistency (v1.1)
 * - G11.7: Double PVC Compensation Prevention (v1.1)
 * - G11.8: Edge Banding on Join Edge Forbidden (v1.1)
 *
 * ## Philosophy
 * "โรงงานก่อน ความสวยทีหลัง" (Factory first, aesthetics second)
 */

import type { Severity } from '../../spec';
import type { DrillMapPoint, DrillMap } from '../../core/manufacturing/drillMap/types';
// Type-only (erased at runtime — no generator code is pulled into the gate).
// Importing it also brings the `DrillMap.manufacturabilityRefusals` module
// augmentation declared in generateDrillMap.ts into scope. F-07.
import type { BlindBoreRefusal } from '../../core/manufacturing/drillMap/generateDrillMap';
import type { NCenterPolicy, ManufacturingMode, EdgeBandMap } from '../../core/connector/types';
import {
  G11_CONSTANTS,
  type G11Issue,
  type G11IssueCode,
  type G11Policy,
  type G11Result,
  type G11DrillPoint,
  type G11Panel,
  type G11Cabinet,
  type G11MatingPair,
  type DrillBoreType,
  isSidePanel,
  isHorizontalPanel,
  calculateDistance,
  issueId,
  calculateBoltTipPosition,
  calculateCamPocketCenter,
} from './gateG11_types';

// ============================================
// DEFAULT POLICY
// ============================================

const DEFAULT_POLICY: Required<G11Policy> = {
  matingTolerance: G11_CONSTANTS.MATING_TOLERANCE,
  dimensionBTolerance: G11_CONSTANTS.DIMENSION_B_TOLERANCE,
  depthTolerance: G11_CONSTANTS.DEPTH_TOLERANCE,
  allowAlternateDistanceB: true,
  skipMatingCheck: [],
};

// ============================================
// G11.1: DISTANCE B VALIDATION
// ============================================

/**
 * G11.1: Validate Distance B is measured from mate edge.
 *
 * Distance B (24mm or 34mm) must be measured from the LEFT or RIGHT
 * edge of TOP/BOTTOM panels - NOT from the FRONT edge.
 *
 * @param drillPoints - CAM drill points on horizontal panels
 * @param policy - Validation policy
 * @returns Array of validation issues
 */
export function ruleG11_DistanceB(
  drillPoints: G11DrillPoint[],
  policy: G11Policy = {}
): G11Issue[] {
  const issues: G11Issue[] = [];
  const { dimensionBTolerance, allowAlternateDistanceB } = {
    ...DEFAULT_POLICY,
    ...policy,
  };

  // Filter CAM points on horizontal panels
  const camPoints = drillPoints.filter(
    p => (p.purpose === 'CAM_LOCK' || p.purpose === 'MINIFIX') &&
         isHorizontalPanel(p.connectedPanelRole || '')
  );

  for (const point of camPoints) {
    const edgeDistance = point.edgeDistance;
    if (edgeDistance === undefined) continue;

    // Check if Distance B matches standard (24mm) or alternate (34mm)
    const standardB = G11_CONSTANTS.DIMENSION_B_STANDARD;
    const alternateB = G11_CONSTANTS.DIMENSION_B_ALTERNATE;

    const deltaStandard = Math.abs(edgeDistance - standardB);
    const deltaAlternate = Math.abs(edgeDistance - alternateB);

    const matchesStandard = deltaStandard <= dimensionBTolerance;
    const matchesAlternate = allowAlternateDistanceB && deltaAlternate <= dimensionBTolerance;

    if (!matchesStandard && !matchesAlternate) {
      // Determine if it's a blocker or warning
      const minDelta = Math.min(deltaStandard, deltaAlternate);

      if (minDelta > dimensionBTolerance * 2) {
        // Severe deviation - likely wrong reference point (FRONT instead of mate edge)
        issues.push({
          id: issueId('B_G11_DISTANCE_B_WRONG_REFERENCE', point.id),
          severity: 'BLOCKER',
          code: 'B_G11_DISTANCE_B_WRONG_REFERENCE',
          message: `CAM at ${point.id}: Distance B (${edgeDistance.toFixed(1)}mm) appears to be measured from wrong reference. Expected ${standardB}mm from mate edge (LEFT/RIGHT).`,
          drillPointIds: [point.id],
          panelIds: [point.panelId],
          corner: point.cornerType,
          context: {
            measured: edgeDistance,
            expected: standardB,
            tolerance: dimensionBTolerance,
            mateEdge: point.cornerType?.includes('LEFT') ? 'LEFT' : 'RIGHT',
          },
        });
      } else {
        // Within recoverable range - warning
        issues.push({
          id: issueId('W_G11_DISTANCE_B_OUT_OF_TOLERANCE', point.id),
          severity: 'WARNING',
          code: 'W_G11_DISTANCE_B_OUT_OF_TOLERANCE',
          message: `CAM at ${point.id}: Distance B (${edgeDistance.toFixed(1)}mm) is ${minDelta.toFixed(1)}mm off from expected ${standardB}mm.`,
          drillPointIds: [point.id],
          panelIds: [point.panelId],
          context: {
            measured: edgeDistance,
            expected: standardB,
            tolerance: dimensionBTolerance,
          },
        });
      }
    }
  }

  return issues;
}

// ============================================
// G11.2: DOWEL DEPTH VALIDATION
// ============================================

/**
 * G11.2: Validate dowel depth according to Häfele standard.
 *
 * Split depth prevents wood bulge in 16-19mm panels:
 * - SIDE panel (EDGE_BORE): 18mm
 * - TOP/BOTTOM panel (FACE_BORE): 12mm
 * - Total: 30mm
 *
 * @param drillPoints - DOWEL drill points
 * @param panels - Panel information for role lookup
 * @param policy - Validation policy
 * @returns Array of validation issues
 */
export function ruleG11_DowelDepth(
  drillPoints: G11DrillPoint[],
  panels: G11Panel[] = [],
  policy: G11Policy = {}
): G11Issue[] {
  const issues: G11Issue[] = [];
  const { depthTolerance } = { ...DEFAULT_POLICY, ...policy };

  // Build panel role lookup
  const panelRoleMap = new Map(panels.map(p => [p.id, p.role]));

  // Filter DOWEL points
  const dowelPoints = drillPoints.filter(p => p.purpose === 'DOWEL');

  for (const point of dowelPoints) {
    // Determine panel role
    const panelRole = point.connectedPanelRole ||
                      panelRoleMap.get(point.panelId) ||
                      inferPanelRoleFromPoint(point);

    if (!panelRole) continue;

    // Construction-aware (S16): ความลึกตามชนิดรูจริง ไม่ใช่ตามแผ่น —
    // EDGE_BORE (end grain) = 18mm, FACE_BORE = 12mm, รวม 30mm ทั้ง OVERLAY และ INSET
    // (เดิม hardcode ตาม role แบบ INSET v4.0 → ด่าตู้ OVERLAY ทุกใบทั้งที่ generator ถูก)
    const boreType = inferBoreTypeFromNormal(point.normal, panelRole);
    const expectedDepth = boreType === 'EDGE_BORE'
      ? G11_CONSTANTS.DOWEL_DEPTH_HORIZ_EDGE
      : G11_CONSTANTS.DOWEL_DEPTH_SIDE_FACE;
    const actualDepth = point.depth;
    const delta = Math.abs(actualDepth - expectedDepth);

    if (delta > depthTolerance) {
      const isSide = isSidePanel(panelRole);
      const code: G11IssueCode = isSide
        ? 'B_G11_DOWEL_DEPTH_SIDE_WRONG'
        : 'B_G11_DOWEL_DEPTH_HORIZONTAL_WRONG';

      issues.push({
        id: issueId(code, point.id),
        severity: 'BLOCKER',
        code,
        message: `Dowel at ${point.id}: Depth ${actualDepth}mm should be ${expectedDepth}mm for ${panelRole} panel (${boreType}).`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: {
          measured: actualDepth,
          expected: expectedDepth,
          tolerance: depthTolerance,
          panelRole,
          boreType,
        },
      });
    } else if (delta > 0.1) {
      // Within tolerance but not exact - info
      issues.push({
        id: issueId('W_G11_DOWEL_DEPTH_TOLERANCE', point.id),
        severity: 'WARNING',
        code: 'W_G11_DOWEL_DEPTH_TOLERANCE',
        message: `Dowel at ${point.id}: Depth ${actualDepth}mm is ${delta.toFixed(1)}mm off from optimal ${expectedDepth}mm.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: {
          measured: actualDepth,
          expected: expectedDepth,
          tolerance: depthTolerance,
          panelRole,
        },
      });
    }
  }

  return issues;
}

// ============================================
// G11.3: DRILL TYPE ENFORCEMENT
// ============================================

/**
 * G11.3: Validate drill orientation matches the purpose invariant.
 *
 * Orientation-aware (T10b): the expectation is keyed on PURPOSE, not panel
 * role — the old role-based mapping (getExpectedBoreType, now deleted) was
 * INSET-v4-only and false-blocked the entire BACK-panel overlay joint family.
 *
 * Invariant derived from all four emitter families in generateDrillMap.ts
 * (OVERLAY corner :572/:610/:631 · INSET corner :815/:855/:919 · shelf
 * junction :1222/:1270/:1310 · back overlay :1517/:1555/:1575):
 * - BOLT / CAM_LOCK / MINIFIX: always a FACE bore into the host panel
 *   (drilled along the host panel's thickness axis)
 * - BOLT_ENTRY: always an EDGE bore (bolt passage through the mating panel)
 * - DOWEL: one EDGE + one FACE pairwise (checked below, per-point skipped)
 *
 * @param drillPoints - All drill points
 * @param panels - Panel information for role lookup
 * @returns Array of validation issues
 */

/** Purposes that must be FACE bores (housing/sleeve into the host panel face) */
const G11_FACE_BORE_PURPOSES = ['BOLT', 'CAM_LOCK', 'MINIFIX'];
/** Purposes that must be EDGE bores (passage through the mating panel edge) */
const G11_EDGE_BORE_PURPOSES = ['BOLT_ENTRY'];

export function ruleG11_DrillType(
  drillPoints: G11DrillPoint[],
  panels: G11Panel[] = []
): G11Issue[] {
  const issues: G11Issue[] = [];

  // Build panel role lookup
  const panelRoleMap = new Map(panels.map(p => [p.id, p.role]));

  // Filter relevant drill points (BOLT, CAM, BOLT_ENTRY, DOWEL)
  const relevantPurposes = [...G11_FACE_BORE_PURPOSES, ...G11_EDGE_BORE_PURPOSES, 'DOWEL'];
  const relevantPoints = drillPoints.filter(p => relevantPurposes.includes(p.purpose));

  for (const point of relevantPoints) {
    const panelRole = point.connectedPanelRole ||
                      panelRoleMap.get(point.panelId) ||
                      inferPanelRoleFromPoint(point);

    if (!panelRole) continue;

    // Construction-aware (S16): DOWEL เจาะได้ทั้งสองแบบตาม construction
    // (OVERLAY: side EDGE + horiz FACE · INSET v4.0: side FACE + horiz EDGE)
    // → ตรวจแบบคู่ (ต้องเป็น EDGE+FACE ผสมกัน) ด้านล่างแทน ไม่ตรวจ per-role
    if (point.purpose === 'DOWEL') continue;

    // Actual bore type from drill normal vs host panel thickness axis;
    // expected bore type from the purpose invariant (see doc above)
    const actualBoreType = inferBoreTypeFromNormal(point.normal, panelRole);
    const expectedBoreType: DrillBoreType =
      G11_FACE_BORE_PURPOSES.includes(point.purpose) ? 'FACE_BORE' : 'EDGE_BORE';

    if (actualBoreType !== expectedBoreType) {
      const isSide = isSidePanel(panelRole);
      const code: G11IssueCode = isSide
        ? 'B_G11_DRILL_TYPE_SIDE_NOT_FACE'  // v4.0: SIDE must use FACE_BORE
        : 'B_G11_DRILL_TYPE_HORIZONTAL_NOT_FACE';

      issues.push({
        id: issueId(code, point.id),
        severity: 'BLOCKER',
        code,
        message: `Drill at ${point.id}: ${point.purpose} on ${panelRole} should be ${expectedBoreType}, but appears to be ${actualBoreType}.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: {
          panelRole,
          boreType: actualBoreType,
          expectedBoreType,
          purpose: point.purpose,
        },
      });
    }
  }

  // DOWEL pair consistency: คู่ dowel ต้องเป็น EDGE_BORE + FACE_BORE เสมอ
  // (ทั้งคู่ EDGE หรือทั้งคู่ FACE = ประกอบไม่ได้ ไม่ว่า construction ไหน)
  const dowelPairs = findMatingPairs(drillPoints);
  for (const pair of dowelPairs) {
    const sideRole = pair.sidePoint.connectedPanelRole || 'SIDE';
    const horizRole = pair.horizontalPoint.connectedPanelRole || 'TOP';
    const sideType = inferBoreTypeFromNormal(pair.sidePoint.normal, sideRole);
    const horizType = inferBoreTypeFromNormal(pair.horizontalPoint.normal, horizRole);

    if (sideType === horizType) {
      issues.push({
        id: issueId('B_G11_DRILL_TYPE_SIDE_NOT_FACE', pair.sidePoint.id, pair.horizontalPoint.id),
        severity: 'BLOCKER',
        code: 'B_G11_DRILL_TYPE_SIDE_NOT_FACE',
        message: `Dowel pair ${pair.sidePoint.id}↔${pair.horizontalPoint.id}: both bores are ${sideType} — a dowel joint needs one EDGE_BORE and one FACE_BORE.`,
        drillPointIds: [pair.sidePoint.id, pair.horizontalPoint.id],
        corner: pair.corner,
        context: {
          boreType: sideType,
          expectedBoreType: sideType === 'EDGE_BORE' ? 'FACE_BORE' : 'EDGE_BORE',
          purpose: 'DOWEL',
        },
      });
    }
  }

  return issues;
}

// ============================================
// G11.4: MATING ALIGNMENT CHECK
// ============================================

/**
 * G11.4: Validate mating pair alignment.
 *
 * Matching dowel holes on SIDE and TOP/BOTTOM panels must align
 * within 0.1mm tolerance in world space.
 *
 * @param drillPoints - All drill points
 * @param policy - Validation policy
 * @returns Array of validation issues
 */
export function ruleG11_MatingAlignment(
  drillPoints: G11DrillPoint[],
  policy: G11Policy = {}
): G11Issue[] {
  const issues: G11Issue[] = [];
  const { matingTolerance, skipMatingCheck } = { ...DEFAULT_POLICY, ...policy };

  // Find mating pairs based on pairId
  const matingPairs = findMatingPairs(drillPoints);

  for (const pair of matingPairs) {
    // Skip if corner is in skip list
    if (skipMatingCheck?.includes(pair.corner)) continue;

    // Construction-aware (S16): วัดเฉพาะระนาบตั้งฉากกับแกน dowel —
    // ระยะตามแกน (ความหนาแผ่น เช่น 19.6mm) เป็น geometry ปกติ ไม่ใช่ misalignment
    const axis = dominantAxis(pair.sidePoint.normal);
    const distance = perpendicularDistance(
      pair.sidePoint.position,
      pair.horizontalPoint.position,
      axis,
    );

    if (distance > matingTolerance) {
      issues.push({
        id: issueId('B_G11_MATING_MISALIGNMENT', pair.sidePoint.id, pair.horizontalPoint.id),
        severity: 'BLOCKER',
        code: 'B_G11_MATING_MISALIGNMENT',
        message: `Mating pair misalignment: SIDE dowel (${pair.sidePoint.id}) and horizontal dowel (${pair.horizontalPoint.id}) are ${distance.toFixed(2)}mm apart. Max allowed: ${matingTolerance}mm.`,
        drillPointIds: [pair.sidePoint.id, pair.horizontalPoint.id],
        corner: pair.corner,
        context: {
          measured: distance,
          tolerance: matingTolerance,
          sidePointId: pair.sidePoint.id,
          horizontalPointId: pair.horizontalPoint.id,
        },
      });
    } else if (distance > matingTolerance * 0.8) {
      // Near tolerance - warning
      issues.push({
        id: issueId('W_G11_MATING_NEAR_TOLERANCE', pair.sidePoint.id, pair.horizontalPoint.id),
        severity: 'WARNING',
        code: 'W_G11_MATING_NEAR_TOLERANCE',
        message: `Mating pair near tolerance: ${distance.toFixed(2)}mm (limit: ${matingTolerance}mm).`,
        drillPointIds: [pair.sidePoint.id, pair.horizontalPoint.id],
        corner: pair.corner,
        context: {
          measured: distance,
          tolerance: matingTolerance,
        },
      });
    }
  }

  return issues;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Infer panel role from drill point properties.
 */
function inferPanelRoleFromPoint(point: G11DrillPoint): string | undefined {
  // Use face property if available
  if (point.face) {
    switch (point.face) {
      case 'LEFT':
        return 'LEFT_SIDE';
      case 'RIGHT':
        return 'RIGHT_SIDE';
      case 'TOP':
        return 'TOP';
      case 'BOTTOM':
        return 'BOTTOM';
    }
  }

  // Use corner type if available
  if (point.cornerType) {
    if (point.cornerType.includes('LEFT')) {
      return point.purpose === 'BOLT' ? 'LEFT_SIDE' : undefined;
    }
    if (point.cornerType.includes('RIGHT')) {
      return point.purpose === 'BOLT' ? 'RIGHT_SIDE' : undefined;
    }
  }

  return undefined;
}

/**
 * แกนเด่นของ normal (0=X, 1=Y, 2=Z)
 */
function dominantAxis(normal: [number, number, number]): number {
  const abs = normal.map(Math.abs);
  let axis = 0;
  if (abs[1] > abs[axis]) axis = 1;
  if (abs[2] > abs[axis]) axis = 2;
  return axis;
}

/**
 * ระยะห่างเฉพาะระนาบตั้งฉากกับแกนที่กำหนด (ตัด component ตามแกนทิ้ง)
 */
function perpendicularDistance(
  a: [number, number, number],
  b: [number, number, number],
  axis: number,
): number {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    if (i === axis) continue;
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Infer bore type from drill normal vector and host panel role.
 *
 * A FACE bore drills along the host panel's THICKNESS axis; any other
 * dominant axis enters through an edge. Thickness axis per role (T10b —
 * derived from panelBasis.ts:122-165 AABB layout, exercised by all four
 * emitter families; pinned in gateG11_drillType_orientation.test.ts):
 * - SIDE panels (LEFT_SIDE/RIGHT_SIDE/SIDE): X
 * - HORIZ panels (TOP/BOTTOM/SHELF) and unknown roles: Y
 * - BACK panels: Z
 *
 * Verdicts per family:
 * - SIDE  ±X = FACE (INSET bolt / OVERLAY cam) · ±Y = EDGE (OVERLAY entry)
 *         · ±Z = EDGE (back-joint entry/dowel into the side back edge —
 *           the pre-T10b code called this FACE, so a bolt mistakenly bored
 *           into the side back edge passed the gate silently)
 * - HORIZ ±Y = FACE (cam / OVERLAY bolt) · ±X/±Z = EDGE (INSET dowel/entry)
 * - BACK  ±Z = FACE (back-overlay bolt/dowel — pre-T10b this fell into the
 *           HORIZ branch as EDGE, false-blocking every overlay-back cabinet)
 *
 * @param normal - Drill normal vector
 * @param panelRole - Optional host panel role for context-aware inference
 */
function inferBoreTypeFromNormal(
  normal: [number, number, number],
  panelRole?: string
): 'EDGE_BORE' | 'FACE_BORE' {
  const thicknessAxis =
    panelRole && isSidePanel(panelRole) ? 0 :
    panelRole === 'BACK' ? 2 :
    1;
  return dominantAxis(normal) === thicknessAxis ? 'FACE_BORE' : 'EDGE_BORE';
}

/**
 * Find mating pairs of dowel points.
 *
 * v4.0 Side-covers-Top: Pairs are identified by panel role:
 * - SIDE panel dowels pair with HORIZ panel dowels
 *
 * Pairs are identified by matching pairId patterns or by proximity.
 */
function findMatingPairs(drillPoints: G11DrillPoint[]): G11MatingPair[] {
  const pairs: G11MatingPair[] = [];

  // Filter dowel points
  const dowelPoints = drillPoints.filter(p => p.purpose === 'DOWEL');

  // v4.0: Separate by panel role (not bore type)
  const sidePoints = dowelPoints.filter(p =>
    isSidePanel(p.connectedPanelRole || '')
  );
  const horizPoints = dowelPoints.filter(p =>
    isHorizontalPanel(p.connectedPanelRole || '')
  );

  // Group by pairId base (remove -edge/-face/-side/-horiz suffix)
  const pairGroups = new Map<string, G11DrillPoint[]>();

  for (const point of dowelPoints) {
    if (!point.pairId) continue;

    // Extract base pairId (e.g., "pair-1-dowel" from "pair-1-dowel-side")
    const basePairId = point.pairId.replace(/-(?:edge|face|side|horiz)$/, '');
    const group = pairGroups.get(basePairId) || [];
    group.push(point);
    pairGroups.set(basePairId, group);
  }

  // Find matching pairs from pairId groups
  for (const [, points] of pairGroups) {
    if (points.length < 2) continue;

    // Find side and horizontal panel points
    const sidePoint = points.find(p =>
      isSidePanel(p.connectedPanelRole || '')
    );
    const horizPoint = points.find(p =>
      isHorizontalPanel(p.connectedPanelRole || '')
    );

    if (sidePoint && horizPoint) {
      const distance = calculateDistance(sidePoint.position, horizPoint.position);
      pairs.push({
        sidePoint,
        horizontalPoint: horizPoint,
        corner: sidePoint.cornerType || horizPoint.cornerType || 'UNKNOWN',
        distance,
      });
    }
  }

  // Also match by proximity for points without matching pairIds
  const matchedSide = new Set(pairs.map(p => p.sidePoint.id));
  const matchedHoriz = new Set(pairs.map(p => p.horizontalPoint.id));

  for (const sidePoint of sidePoints) {
    if (matchedSide.has(sidePoint.id)) continue;

    // Find closest unmatched horizontal point
    let closestHoriz: G11DrillPoint | null = null;
    let closestDistance = Infinity;

    for (const horizPoint of horizPoints) {
      if (matchedHoriz.has(horizPoint.id)) continue;

      const dist = calculateDistance(sidePoint.position, horizPoint.position);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestHoriz = horizPoint;
      }
    }

    // Only pair if they're reasonably close (within 5mm)
    if (closestHoriz && closestDistance < 5) {
      pairs.push({
        sidePoint,
        horizontalPoint: closestHoriz,
        corner: sidePoint.cornerType || closestHoriz.cornerType || 'UNKNOWN',
        distance: closestDistance,
      });
      matchedSide.add(sidePoint.id);
      matchedHoriz.add(closestHoriz.id);
    }
  }

  return pairs;
}

// ============================================
// G11.5: BOLT TIP → CAM CENTER ALIGNMENT
// ============================================

/**
 * G11.5: Validate Bolt Tip aligns with CAM Pocket Center.
 *
 * CRITICAL FOR PHYSICAL ASSEMBLY:
 * The bolt's ball head must enter the CAM's bolt channel for engagement.
 *
 * Calculation (T10c — hardware truth):
 * - Bolt Tip = Entry Position + Protrusion × (-Normal)
 * - CAM Pocket = bolt.targetPocketCenter when the generator emitted it
 *   (single authority, B=C truth chain); FALLBACK = cam surface + dimA ×
 *   camNormal — dimA resolved from the Häfele spec table, NOT camDepth/2
 *   (the Ø15×13.5 housing is asymmetric: channel at 9mm for 18mm wood).
 * - Misalignment = full perpendicular residual w.r.t. the bolt drilling
 *   axis (dominant axis of bolt.normal) ≤ 0.1mm. The old deltaX-only check
 *   validated ONLY X: it false-blocked every OVERLAY/BACK cabinet (cam
 *   normal ±X carried the 2.25mm model error) while a genuinely misaligned
 *   INSET pair (cam normal ±Y — error hides in Y/Z) passed silently.
 *   The along-axis component is panel-construction geometry (entry face vs
 *   mate edge, dado offsets) and is owned by the generator's linkage chain
 *   (validateBoltPocketLinkage + golden drift tests), not by this rule.
 *
 * @param drillPoints - All drill points (BOLT and CAM pairs)
 * @param policy - Validation policy
 * @returns Array of validation issues
 */
export function ruleG11_BoltCamAlignment(
  drillPoints: G11DrillPoint[],
  policy: G11Policy = {}
): G11Issue[] {
  const issues: G11Issue[] = [];
  const { matingTolerance = G11_CONSTANTS.MATING_TOLERANCE } = policy;

  // Find BOLT points
  const boltPoints = drillPoints.filter(p => p.purpose === 'BOLT');

  // Find CAM points
  const camPoints = drillPoints.filter(p =>
    p.purpose === 'CAM_LOCK' || p.purpose === 'MINIFIX'
  );

  for (const bolt of boltPoints) {
    // Find paired CAM point
    let cam: G11DrillPoint | undefined;

    // Try explicit pairedHoleId first
    if (bolt.pairedHoleId) {
      cam = camPoints.find(c => c.id === bolt.pairedHoleId);
    }

    // Fallback: match by pairId
    if (!cam && bolt.pairId) {
      const basePairId = bolt.pairId.replace(/-(?:bolt|cam|side|horiz)$/i, '');
      cam = camPoints.find(c => {
        if (!c.pairId) return false;
        const camBasePairId = c.pairId.replace(/-(?:bolt|cam|side|horiz)$/i, '');
        return camBasePairId === basePairId;
      });
    }

    // Fallback: match by corner type
    if (!cam && bolt.cornerType) {
      cam = camPoints.find(c => c.cornerType === bolt.cornerType);
    }

    if (!cam) continue;

    // Validate bolt and CAM are in the same corner
    if (bolt.cornerType && cam.cornerType && bolt.cornerType !== cam.cornerType) {
      issues.push({
        id: issueId('B_G11_BOLT_CAM_CORNER_MISMATCH', bolt.id, cam.id),
        severity: 'BLOCKER',
        code: 'B_G11_BOLT_CAM_CORNER_MISMATCH',
        message: `Bolt ${bolt.id} (${bolt.cornerType}) paired with CAM ${cam.id} (${cam.cornerType}) in different corners. Assembly will fail.`,
        drillPointIds: [bolt.id, cam.id],
        corner: bolt.cornerType,
        context: {
          boltCorner: bolt.cornerType,
          camCorner: cam.cornerType,
        },
      });
      continue;
    }

    // Calculate bolt tip position
    // Bolt protrusion extends OPPOSITE to drill normal direction
    const boltTip = calculateBoltTipPosition(
      bolt.position,
      bolt.normal,
      G11_CONSTANTS.BOLT_PROTRUSION_TOTAL // 24mm
    );

    // CAM pocket (bolt channel) center — generator's emitted value is the
    // single authority; dimA-based fallback otherwise (T10c).
    // Default camDepth from Häfele spec for 18mm wood: 13.5mm (FF 3.10)
    const camDepth = cam.depth || 13.5;
    const pocketSource = bolt.targetPocketCenter ? 'targetPocketCenter' : 'dimA-fallback';
    const camPocketCenter = bolt.targetPocketCenter ?? calculateCamPocketCenter(
      cam.position,
      cam.normal,
      camDepth
    );

    // Perpendicular residual w.r.t. the bolt drilling axis — validates BOTH
    // cam orientations (±X OVERLAY/BACK and ±Y INSET). The along-axis
    // component is construction geometry, not a channel miss (see rule doc).
    const boltAxis = dominantAxis(bolt.normal);
    const perpendicularGap = perpendicularDistance(boltTip, camPocketCenter, boltAxis);
    const boltAxisName = (['X', 'Y', 'Z'] as const)[boltAxis];

    // Full 3D distance (informational)
    const distance3D = calculateDistance(boltTip, camPocketCenter);

    if (perpendicularGap > matingTolerance) {
      // BLOCKER: Bolt ball head misses the CAM bolt channel
      issues.push({
        id: issueId('B_G11_BOLT_CAM_MISALIGNMENT', bolt.id, cam.id),
        severity: 'BLOCKER',
        code: 'B_G11_BOLT_CAM_MISALIGNMENT',
        message: `Bolt tip at ${bolt.id} does not reach CAM center at ${cam.id}. Perpendicular gap: ${perpendicularGap.toFixed(2)}mm (max: ${matingTolerance}mm). Bolt axis misses the cam bolt channel.`,
        drillPointIds: [bolt.id, cam.id],
        corner: bolt.cornerType,
        context: {
          measured: perpendicularGap,
          boltAxis: boltAxisName,
          pocketSource,
          distance3D,
          tolerance: matingTolerance,
          boltProtrusion: G11_CONSTANTS.BOLT_PROTRUSION_TOTAL,
          camDepth,
        },
      });
    } else if (perpendicularGap > matingTolerance * 0.8) {
      // Warning: Near tolerance
      issues.push({
        id: issueId('W_G11_BOLT_CAM_NEAR_TOLERANCE', bolt.id, cam.id),
        severity: 'WARNING',
        code: 'W_G11_BOLT_CAM_NEAR_TOLERANCE',
        message: `Bolt-CAM alignment near tolerance: perpendicular gap ${perpendicularGap.toFixed(2)}mm (limit: ${matingTolerance}mm).`,
        drillPointIds: [bolt.id, cam.id],
        corner: bolt.cornerType,
        context: {
          measured: perpendicularGap,
          boltAxis: boltAxisName,
          pocketSource,
          tolerance: matingTolerance,
        },
      });
    }
  }

  return issues;
}

// ============================================
// G11.6: N-CENTER POLICY MODE CONSISTENCY (v1.1)
// ============================================

/** Extended drill point with v1.1 metadata */
export interface G11DrillPointV11 extends G11DrillPoint {
  nCenterPolicy?: NCenterPolicy;
  mode?: ManufacturingMode;
  vCoordinate?: number;
}

/** Panel with edge banding info for G11.8 */
export interface G11PanelWithEdgeBanding extends G11Panel {
  edgeBanding?: EdgeBandMap;
}

/**
 * G11.6: Validate manufacturing mode matches N-center policy.
 *
 * FATAL if:
 * - FINISHED_CENTER base used with DRILL_ON_CORE mode
 * - CORE_CENTER base used with DRILL_ON_FINISHED mode
 *
 * @param drillPoints - Drill points with optional nCenterPolicy
 * @param globalMode - Global manufacturing mode
 * @param policy - Validation policy
 * @returns Array of validation issues
 *
 * @see Master Specification v1.1 §7 (G11:N_POLICY_MATCH_MODE)
 */
export function ruleG11_NCenterPolicyMode(
  drillPoints: G11DrillPointV11[],
  globalMode?: ManufacturingMode,
  policy: G11Policy = {},
): G11Issue[] {
  const issues: G11Issue[] = [];

  for (const point of drillPoints) {
    const ncPolicy = point.nCenterPolicy;
    if (!ncPolicy) continue;

    const mode = point.mode ?? globalMode;
    if (!mode) continue;

    const expectedMode: ManufacturingMode =
      ncPolicy.base === 'CORE_CENTER' ? 'DRILL_ON_CORE' : 'DRILL_ON_FINISHED';

    if (mode !== expectedMode) {
      issues.push({
        id: issueId('B_G11_N_POLICY_MODE_MISMATCH', point.id),
        severity: 'BLOCKER',
        code: 'B_G11_N_POLICY_MODE_MISMATCH',
        message: `Drill at ${point.id}: N-center policy base '${ncPolicy.base}' requires '${expectedMode}', but current mode is '${mode}'.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: {
          policyBase: ncPolicy.base,
          currentMode: mode,
          expectedMode,
          offsetMm: ncPolicy.offsetMm,
        },
      });
    }
  }

  return issues;
}

// ============================================
// G11.7: DOUBLE PVC COMPENSATION PREVENTION (v1.1)
// ============================================

/**
 * G11.7: Prevent double PVC deduction in FINISHED mode.
 *
 * FATAL if V-coordinate looks like system32S minus PVC in DRILL_ON_FINISHED mode.
 * In FINISHED mode, CNC zero is at finished surface — no manual PVC adjustment needed.
 *
 * @param drillPoints - Drill points with V-coordinate
 * @param globalMode - Global manufacturing mode
 * @param system32S - Expected System 32 backset (default 37mm)
 * @param pvcThickness - PVC thickness (default 1.0mm)
 * @param policy - Validation policy
 * @returns Array of validation issues
 *
 * @see Master Specification v1.1 §7 (G11:DOUBLE_COMPENSATION)
 */
export function ruleG11_DoublePvcCompensation(
  drillPoints: G11DrillPointV11[],
  globalMode?: ManufacturingMode,
  system32S: number = 50,
  pvcThickness: number = 1.0,
  policy: G11Policy = {},
): G11Issue[] {
  const issues: G11Issue[] = [];

  for (const point of drillPoints) {
    const mode = point.mode ?? globalMode;
    if (mode !== 'DRILL_ON_FINISHED') continue;

    const vCoord = point.vCoordinate;
    if (vCoord === undefined) continue;

    const expectedV = system32S;
    const suspectV = system32S - pvcThickness;

    // V matches suspect (double-compensated) value but not expected
    if (Math.abs(vCoord - suspectV) < 0.1 && Math.abs(vCoord - expectedV) > 0.1) {
      issues.push({
        id: issueId('B_G11_DOUBLE_PVC_COMPENSATION', point.id),
        severity: 'BLOCKER',
        code: 'B_G11_DOUBLE_PVC_COMPENSATION',
        message: `Drill at ${point.id}: V=${vCoord}mm suggests double PVC compensation. In DRILL_ON_FINISHED mode, V should be ${expectedV}mm (no manual PVC adjustment).`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: {
          measured: vCoord,
          expected: expectedV,
          pvcThickness,
        },
      });
    }
  }

  return issues;
}

// ============================================
// G11.8: EDGE BANDING ON JOIN EDGE FORBIDDEN (v1.1)
// ============================================

/**
 * G11.8: Prevent edge banding on join edges.
 *
 * FATAL if edge banding is applied to edges where panels mate:
 * - Horizontal panels (TOP/BOTTOM): LEFT/RIGHT edges are join edges
 * - Side panels (LEFT_SIDE/RIGHT_SIDE): TOP/BOTTOM edges are join edges
 *
 * Edge banding on join edges creates a gap (0.4-2.0mm) that prevents
 * flush wood-to-wood contact required for Minifix and dowel engagement.
 *
 * @param panels - Panels with edge banding information
 * @param policy - Validation policy
 * @returns Array of validation issues
 *
 * @see Master Specification v1.1 §7 (G11:EDGE_BAND_JOIN_FORBIDDEN)
 */
export function ruleG11_EdgeBandJoinForbidden(
  panels: G11PanelWithEdgeBanding[],
  policy: G11Policy = {},
): G11Issue[] {
  const issues: G11Issue[] = [];

  for (const panel of panels) {
    if (!panel.edgeBanding) continue;

    const role = panel.role;
    const isSide = isSidePanel(role);
    const isHoriz = isHorizontalPanel(role);

    if (!isSide && !isHoriz) continue;

    // Determine join edges based on panel role
    const joinEdges: Array<'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'> = [];
    if (isHoriz) {
      joinEdges.push('LEFT', 'RIGHT');
    }
    if (isSide) {
      joinEdges.push('TOP', 'BOTTOM');
    }

    // Check which join edges have banding
    const banded = panel.edgeBanding.banded;
    const violating = joinEdges.filter(edge => banded[edge]);

    if (violating.length > 0) {
      issues.push({
        id: issueId('B_G11_EDGE_BAND_JOIN_FORBIDDEN', panel.id),
        severity: 'BLOCKER',
        code: 'B_G11_EDGE_BAND_JOIN_FORBIDDEN',
        message: `Panel ${panel.id} (${role}): Edge banding on join edge(s) [${violating.join(', ')}] prevents flush assembly. Join edges must be bare wood.`,
        panelIds: [panel.id],
        context: {
          panelRole: role,
          joinEdges: joinEdges.join(', '),
          violatingEdges: violating.join(', '),
          bandThkMm: panel.edgeBanding.bandThkMm,
        },
      });
    }
  }

  return issues;
}

// ============================================
// G11.9: PANEL BREAKTHROUGH (ADR-005 MON-BS-001)
// ============================================

/**
 * G11.9: A blind bore may not be as deep as, or deeper than, the panel that
 * owns it.
 *
 * ADR-005 (`docs/adr/ADR-005-boring-standard.en.md`) lists `panel breakthrough`
 * among the conformance tests MON-BS-001 requires. Until this rule existed no
 * breakthrough check lived anywhere in src/gate or src/core/manufacturing/
 * drillMap — only comments mentioned one. Review finding F-07 [P0] is the
 * concrete failure it was missing: a 6mm overlay back panel receiving
 * back-owned 17.5mm and 11mm blind bores.
 *
 * ## The single geometric fact this rule relies on (nothing invented)
 * A BLIND bore whose depth is >= the owner panel's own thickness cannot exist
 * in that panel — it reaches or passes the far face. `depth === thickness` is
 * included: at that point the bore is a through hole, not a blind one, and it
 * was not declared as such.
 *
 * This is NOT a margin rule. 17.5mm in an 18mm panel (0.5mm residual — the
 * normal Häfele S200 case) PASSES. Whether 0.5mm of residual wall is
 * structurally adequate is a different question that needs a cited Häfele
 * member-thickness range; MinifixConfig declares none, so this rule
 * deliberately does not adjudicate it. See the UNKNOWN note below.
 *
 * ## Owner thickness authority (per-panel, never a cabinet default)
 * 1. `panels[].computed.realThickness` for the owning panel, else
 * 2. `point.panelThickness` — copied by validateG11FromDrillMap from
 *    DrillMapPanel.dimensions.thickness, which the generator fills from that
 *    panel's own `computed.realThickness`.
 *
 * ## Scope: FACE bores only
 * Only bores driven along the owner panel's THICKNESS axis are adjudicated.
 * For an EDGE bore (BOLT_ENTRY Ø7.5 D24 into a side panel's back edge, the
 * D19 dowel edge bore, ...) the limiting dimension is the panel's in-plane
 * span, not its thickness — the G11 input carries no panel-local basis, so
 * that half of the breakthrough test is deliberately left unimplemented
 * rather than guessed at.
 *
 * ## UNKNOWN / fail-visible, never silently passed
 * When the owner's role or thickness cannot be resolved the rule cannot
 * adjudicate. It emits `I_G11_BREAKTHROUGH_NOT_EVALUATED` (INFO) rather than
 * returning a clean pass. It is INFO and not a BLOCKER because the fail-CLOSED
 * duty sits one layer up: the generator refuses to emit the operation at all
 * (generateDrillMap.ts `evaluateBlindBoreFeasibility`), and every drill map
 * that reaches this gate through validateG11FromDrillMap does carry per-panel
 * thickness. Blocking here on absent metadata would only over-block
 * hand-assembled point arrays, not protect any real panel.
 *
 * @param drillPoints - All drill points
 * @param panels - Panel information (owner thickness authority)
 * @returns Array of validation issues
 */
export function ruleG11_PanelBreakthrough(
  drillPoints: G11DrillPoint[],
  panels: G11Panel[] = [],
): G11Issue[] {
  const issues: G11Issue[] = [];

  const panelById = new Map(panels.map(p => [p.id, p]));

  for (const point of drillPoints) {
    // No bore, or a bore whose depth was never declared → nothing to measure.
    if (!Number.isFinite(point.depth) || point.depth <= 0) continue;
    // A declared through hole is intentional, not a breakthrough.
    if (point.throughHole === true) continue;

    const ownerPanel = panelById.get(point.panelId);
    const panelRole = point.connectedPanelRole ||
                      ownerPanel?.role ||
                      inferPanelRoleFromPoint(point);

    if (!panelRole) {
      issues.push({
        id: issueId('I_G11_BREAKTHROUGH_NOT_EVALUATED', point.id),
        severity: 'INFO',
        code: 'I_G11_BREAKTHROUGH_NOT_EVALUATED',
        message: `Breakthrough not evaluated for ${point.id}: owner panel role is unknown, so the bore axis cannot be classified.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: { reason: 'OWNER_ROLE_UNKNOWN', measured: point.depth },
      });
      continue;
    }

    // Thickness is only the limiting dimension for bores along the thickness axis.
    if (inferBoreTypeFromNormal(point.normal, panelRole) !== 'FACE_BORE') continue;

    const declaredThickness = ownerPanel?.computed?.realThickness ?? point.panelThickness;
    if (declaredThickness === undefined ||
        !Number.isFinite(declaredThickness) ||
        declaredThickness <= 0) {
      issues.push({
        id: issueId('I_G11_BREAKTHROUGH_NOT_EVALUATED', point.id),
        severity: 'INFO',
        code: 'I_G11_BREAKTHROUGH_NOT_EVALUATED',
        message: `Breakthrough not evaluated for ${point.id}: owner panel ${point.panelId} declares no usable thickness.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: { reason: 'OWNER_THICKNESS_UNDECLARED', measured: point.depth, panelRole },
      });
      continue;
    }

    if (point.depth >= declaredThickness) {
      issues.push({
        id: issueId('B_G11_PANEL_BREAKTHROUGH', point.id),
        severity: 'BLOCKER',
        code: 'B_G11_PANEL_BREAKTHROUGH',
        message:
          `Blind bore ${point.id} (${point.purpose} Ø${point.diameter}) needs ${point.depth}mm ` +
          `but its owner panel ${point.panelId} (${panelRole}) is only ${declaredThickness}mm thick — ` +
          `the bore breaks through the far face. Reducing the depth would invent a nonfunctional ` +
          `fixing: resolve the fastener recipe instead.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        corner: point.cornerType,
        context: {
          measured: point.depth,
          expected: declaredThickness,
          panelRole,
          boreType: 'FACE_BORE',
          purpose: point.purpose,
          waivable: false,
        },
      });
    }
  }

  return issues;
}

// ============================================
// MAIN GATE FUNCTION
// ============================================

/**
 * Additional context for v1.1 rules.
 * Optional to maintain backward compatibility.
 */
export interface G11V11Context {
  /** Global manufacturing mode */
  mode?: ManufacturingMode;
  /** System 32 backset (default 37mm) */
  system32S?: number;
  /** PVC thickness from stack (default 1.0mm) */
  pvcThickness?: number;
}

/**
 * Run all G11 validation rules.
 *
 * @param drillPoints - All drill points to validate
 * @param panels - Panel information (optional)
 * @param policy - Validation policy (optional)
 * @param v11Context - Additional context for v1.1 rules (optional)
 * @returns G11 validation result
 */
export function runG11Rules(
  drillPoints: G11DrillPoint[],
  panels: G11Panel[] = [],
  policy: G11Policy = {},
  v11Context?: G11V11Context,
): G11Result {
  const allIssues: G11Issue[] = [];

  // G11.1: Distance B
  allIssues.push(...ruleG11_DistanceB(drillPoints, policy));

  // G11.2: Dowel Depth
  allIssues.push(...ruleG11_DowelDepth(drillPoints, panels, policy));

  // G11.3: Drill Type
  allIssues.push(...ruleG11_DrillType(drillPoints, panels));

  // G11.4: Mating Alignment
  allIssues.push(...ruleG11_MatingAlignment(drillPoints, policy));

  // G11.5: Bolt Tip ↔ CAM Center Alignment
  allIssues.push(...ruleG11_BoltCamAlignment(drillPoints, policy));

  // G11.9: Panel Breakthrough (ADR-005 MON-BS-001 conformance test)
  allIssues.push(...ruleG11_PanelBreakthrough(drillPoints, panels));

  // v1.1 Rules (only when context is provided)
  if (v11Context) {
    // G11.6: N-Center Policy & Mode Consistency
    if (v11Context.mode) {
      allIssues.push(...ruleG11_NCenterPolicyMode(
        drillPoints as G11DrillPointV11[],
        v11Context.mode,
        policy,
      ));
    }

    // G11.7: Double PVC Compensation Prevention
    if (v11Context.mode) {
      allIssues.push(...ruleG11_DoublePvcCompensation(
        drillPoints as G11DrillPointV11[],
        v11Context.mode,
        v11Context.system32S,
        v11Context.pvcThickness,
        policy,
      ));
    }

    // G11.8: Edge Banding on Join Edge Forbidden
    allIssues.push(...ruleG11_EdgeBandJoinForbidden(
      panels as G11PanelWithEdgeBanding[],
      policy,
    ));
  }

  // Count by severity
  const blockers = allIssues.filter(i => i.severity === 'BLOCKER').length;
  const warnings = allIssues.filter(i => i.severity === 'WARNING').length;
  const info = allIssues.filter(i => i.severity === 'INFO').length;

  return {
    gate: 'G11_MINIFIX_SYSTEM32',
    status: blockers > 0 ? 'FAIL' : 'PASS',
    issues: allIssues,
    summary: {
      blockers,
      warnings,
      info,
      pairsValidated: findMatingPairs(drillPoints).length,
      pointsValidated: drillPoints.length,
    },
  };
}

/**
 * Validate G11 rules from a full DrillMap structure.
 *
 * Convenience wrapper that extracts drill points from nested DrillMap.
 *
 * @param drillMap - Full DrillMap structure
 * @param panels - Panel information (optional)
 * @param policy - Validation policy (optional)
 * @returns G11 validation result
 */
export function validateG11FromDrillMap(
  drillMap: DrillMap | null,
  panels: G11Panel[] = [],
  policy: G11Policy = {}
): G11Result {
  if (!drillMap) {
    return {
      gate: 'G11_MINIFIX_SYSTEM32',
      status: 'PASS',
      issues: [],
      summary: {
        blockers: 0,
        warnings: 0,
        info: 0,
        pairsValidated: 0,
        pointsValidated: 0,
      },
    };
  }

  // Flatten drill points from nested structure
  const allPoints: G11DrillPoint[] = [];

  for (const panel of drillMap.panels || []) {
    // DrillMapPanel uses single `points` array (not separated by type)
    if (!panel.points) continue;

    for (const point of panel.points) {
      allPoints.push({
        id: point.id,
        panelId: point.panelId,
        position: point.position,
        normal: point.normal,
        diameter: point.diameter,
        depth: point.depth,
        purpose: point.purpose,
        componentType: point.componentType,
        pairId: point.pairId,
        pairedHoleId: point.pairedHoleId,
        edgeDistance: point.edgeDistance,
        cornerType: point.cornerType,
        face: point.face,
        connectedPanelRole: point.connectedPanelRole,
        // G11.5 single authority: the generator's emitted cam pocket center
        targetPocketCenter: point.targetPocketCenter,
        // G11.9 owner-thickness authority: the OWNING panel's own value.
        // DrillMapPanel.dimensions.thickness is filled by the generator from
        // that panel's `computed.realThickness` — never a cabinet default.
        // A per-point override (point.panelThickness) wins if the emitter set one.
        panelThickness: point.panelThickness ?? panel.dimensions?.thickness,
        // G11.9: a bore the generator declared as through is not a breakthrough
        throughHole: point.throughHole,
      });
    }
  }

  const result = runG11Rules(allPoints, panels, policy);

  // G11.9b (F-07): a refused joint leaves NO drill points behind, so the
  // point-level rules above can never see it. Without this, "the generator
  // withheld every operation because the fastener cannot exist in this panel"
  // would read as a clean PASS. Surface each refusal as a non-waivable BLOCKER.
  const refusalIssues = refusalsToG11Issues(drillMap);
  if (refusalIssues.length === 0) return result;

  const issues = [...refusalIssues, ...result.issues];
  return {
    ...result,
    status: 'FAIL',
    issues,
    summary: {
      ...result.summary,
      blockers: issues.filter(i => i.severity === 'BLOCKER').length,
      warnings: issues.filter(i => i.severity === 'WARNING').length,
      info: issues.filter(i => i.severity === 'INFO').length,
    },
  };
}

/**
 * Translate the generator's structured refusals into G11 blockers.
 *
 * `DrillMap.manufacturabilityRefusals` is written by generateDrillMap when a
 * fastener recipe cannot physically exist in the panel that would own it
 * (F-07). Those joints emit zero machining features on purpose — this makes
 * the reason visible to the Safety Gate instead of leaving a silently empty
 * panel. Never waivable: the fix is a compatible recipe or a different
 * construction, not a shallower hole.
 */
export function refusalsToG11Issues(drillMap: DrillMap | null): G11Issue[] {
  const refusals: BlindBoreRefusal[] = drillMap?.manufacturabilityRefusals ?? [];

  return refusals.map((r) => ({
    id: issueId(
      'B_G11_MANUFACTURABILITY_REFUSAL',
      r.joint,
      r.ownerPanelId,
      r.purpose,
      String(r.requiredDepthMm),
    ),
    severity: 'BLOCKER' as Severity,
    code: 'B_G11_MANUFACTURABILITY_REFUSAL' as G11IssueCode,
    message: `[${r.reasonCode}] ${r.message}`,
    panelIds: [r.ownerPanelId],
    corner: r.corner,
    context: {
      reason: r.reasonCode,
      measured: r.requiredDepthMm ?? undefined,
      expected: r.ownerThicknessMm ?? undefined,
      panelRole: r.ownerPanelRole,
      purpose: r.purpose,
      recipeSource: r.recipeSource,
      joint: r.joint,
      waivable: false,
    },
  }));
}

// ============================================
// EXPORTS
// ============================================

export type {
  G11Issue,
  G11IssueCode,
  G11Policy,
  G11Result,
  G11DrillPoint,
  G11Panel,
  G11Cabinet,
  G11MatingPair,
};

export { G11_CONSTANTS };
