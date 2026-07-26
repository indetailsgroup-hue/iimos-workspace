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
// G11.9 EDGE half: the owner panel's in-plane span is read from the SAME AABB
// helper the generator adjudicates with (evaluateBlindBoreFeasibility →
// calculatePanelAABB), so the gate cannot drift from the generator's geometry.
// panelBasis.ts has NO runtime imports of its own (both of its imports are
// `import type`), so this pulls no generator or store code into the gate and
// creates no cycle.
import { calculatePanelAABB } from '../../core/manufacturing/drillMap/panelBasis';
import type { CabinetPanel } from '../../core/types/Cabinet';
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
 * ## Scope: FACE and EDGE bores (edge half closed)
 * The limiting dimension is never "thickness" as such — it is how far the
 * owner panel extends ALONG THE BORE'S OWN AXIS:
 *   - FACE bore (driven along the panel's thickness axis): that extent IS the
 *     thickness, and this half is adjudicated exactly as before.
 *   - EDGE bore (BOLT_ENTRY Ø7.5 D24 into a side panel's back edge, the Ø8
 *     edge dowel, ...): the extent is the panel's in-plane span along that
 *     axis, taken from `calculatePanelAABB` — the SAME helper the generator
 *     adjudicates with in `evaluateBlindBoreFeasibility`
 *     (generateDrillMap.ts ~:484-530). No new number is introduced: the
 *     `depth >= extent` comparison and the geometry helper are the generator's,
 *     and the geometry is the panel's own. The axis/ambiguity handling is NOT
 *     identical to the generator's — see `resolveBoreAxis` below.
 *
 * ## What this half does and does NOT protect (measured, not assumed)
 * Previously it was a bare `continue`: EVERY edge bore passed, 24mm and 2400mm
 * alike. What it guards is drill maps that did NOT come from
 * `generateMinifixDrillMap`, whose own universal sweep already adjudicates both
 * halves at source (generateDrillMap.ts ~:2657-2712). Concretely:
 * `src/gate/ui/applyGatePatch.ts` rewrites the drill map by JSON path with no
 * geometric re-adjudication and leaves G11 as the only remaining check.
 *
 * It is NOT reachable from an "Apply fix" button today, and this comment
 * previously claimed otherwise. Two independent reasons, both verified by
 * running them: (1) G11 issues are mapped to findings by `g11ToFinding`
 * (SafetyPanel.tsx ~:180), which sets no `patch` field at all, so a G11 blocker
 * can never carry a fix button; (2) every patch the UI can produce is a silent
 * no-op — `patchPathForPoint` (connectors/drillMapIndex.ts:151-161) already
 * returns a fully-prefixed `/useDrillMapStore/drillMap/...` path and
 * SafetyPanel.tsx ~:237 prefixes it a second time, so path navigation fails and
 * `applyGatePatches` still returns true. That double-prefix bug is real and
 * pre-existing; it is tracked separately and is NOT fixed here.
 *
 * ## UNKNOWN / fail-visible, never silently passed
 * When the owner's role, thickness, bore axis or in-plane span cannot be
 * resolved the rule cannot adjudicate. It emits
 * `I_G11_BREAKTHROUGH_NOT_EVALUATED` (INFO) with a `context.reason` naming
 * which input was missing, rather than returning a clean pass. It is INFO and
 * not a BLOCKER because the fail-CLOSED duty sits one layer up: the generator
 * refuses to emit the operation at all (generateDrillMap.ts
 * `evaluateBlindBoreFeasibility`), and every drill map that reaches this gate
 * through validateG11FromDrillMap now carries per-panel thickness AND per-panel
 * in-plane dimensions. Blocking here on absent metadata would only over-block
 * hand-assembled point arrays, not protect any real panel.
 *
 * Reasons emitted: `OWNER_ROLE_UNKNOWN`, `OWNER_THICKNESS_UNDECLARED`
 * (face half), `BORE_AXIS_AMBIGUOUS`, `OWNER_SPAN_UNRESOLVED` (edge half).
 *
 * @param drillPoints - All drill points
 * @param panels - Panel geometry (owner thickness + in-plane span authority)
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

    const declaredThickness = ownerPanel?.computed?.realThickness ?? point.panelThickness;

    // ── FACE half (unchanged): along the thickness axis the limiting extent
    //    IS the declared thickness, so no panel geometry is needed. ─────────
    if (inferBoreTypeFromNormal(point.normal, panelRole) === 'FACE_BORE') {
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
      continue;
    }

    // ── EDGE half: the tool travels across the panel's in-plane span, not
    //    through its thickness. Same rule, different extent. ───────────────
    const axis = resolveBoreAxis(point.normal);
    if (axis < 0) {
      issues.push({
        id: issueId('I_G11_BREAKTHROUGH_NOT_EVALUATED', point.id),
        severity: 'INFO',
        code: 'I_G11_BREAKTHROUGH_NOT_EVALUATED',
        message:
          `Breakthrough not evaluated for ${point.id}: bore normal [${point.normal?.join(', ')}] ` +
          `has no single dominant axis, so the travel direction cannot be classified.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: { reason: 'BORE_AXIS_AMBIGUOUS', measured: point.depth, panelRole },
      });
      continue;
    }

    const extent = resolvePanelExtentAlongAxis(ownerPanel, axis, declaredThickness);
    if (extent === undefined) {
      issues.push({
        id: issueId('I_G11_BREAKTHROUGH_NOT_EVALUATED', point.id),
        severity: 'INFO',
        code: 'I_G11_BREAKTHROUGH_NOT_EVALUATED',
        message:
          `Breakthrough not evaluated for ${point.id}: owner panel ${point.panelId} (${panelRole}) ` +
          `declares no usable span along ${AXIS_NAMES[axis]}, so this edge bore cannot be measured ` +
          `against anything.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        context: {
          reason: 'OWNER_SPAN_UNRESOLVED',
          measured: point.depth,
          panelRole,
          boreType: 'EDGE_BORE',
          axis: AXIS_NAMES[axis],
        },
      });
      continue;
    }

    if (point.depth >= extent) {
      issues.push({
        id: issueId('B_G11_PANEL_BREAKTHROUGH', point.id),
        severity: 'BLOCKER',
        code: 'B_G11_PANEL_BREAKTHROUGH',
        message:
          `Blind edge bore ${point.id} (${point.purpose} Ø${point.diameter}) needs ${point.depth}mm ` +
          `along ${AXIS_NAMES[axis]}, but its owner panel ${point.panelId} (${panelRole}) only ` +
          `extends ${extent}mm in that direction — the bore exits the panel. Depth was NOT reduced: ` +
          `clamping it would invent a nonfunctional fixing. Resolve the fastener recipe or the ` +
          `panel size instead.`,
        drillPointIds: [point.id],
        panelIds: [point.panelId],
        corner: point.cornerType,
        context: {
          measured: point.depth,
          expected: extent,
          panelRole,
          boreType: 'EDGE_BORE',
          axis: AXIS_NAMES[axis],
          purpose: point.purpose,
          waivable: false,
        },
      });
    }
  }

  return issues;
}

/** World axis names, index-aligned with the AABB tuples. */
const AXIS_NAMES = ['X', 'Y', 'Z'] as const;

/**
 * Dominant bore axis (0=X, 1=Y, 2=Z), or -1 when it cannot be resolved.
 *
 * Applies the generator's ambiguity test (generateDrillMap.ts ~:496-506): a
 * zero, non-finite or 45°-diagonal normal has no single dominant axis and is
 * not assigned one by a tie-break.
 *
 * ## This is NOT parity with the generator, and the difference is measurable
 * This helper only ever sees bores that `inferBoreTypeFromNormal` (~:521) has
 * ALREADY classified as EDGE — and that classifier uses `dominantAxis()`, which
 * DOES tie-break. So an unadjudicable normal is first routed by a tie-break and
 * only then reaches this test. Measured consequence: normal `[1,1,0]` or
 * `[NaN,0,0]` on a LEFT_SIDE panel is classified FACE_BORE and measured against
 * thickness, where the generator refuses it outright with
 * `R_BORE_AXIS_UNDECLARED`. At depth 24 the gate happens to block anyway; at
 * depth 17.5 it would pass where the generator refuses.
 *
 * Closing that gap means resolving the axis BEFORE the face/edge split —
 * i.e. dropping the role-based pre-classification the generator already
 * abandoned for the same reason (generateDrillMap.ts ~:246-252, "judging 'is
 * this a face bore?' first was the bug"). That is a change to the FACE half's
 * behaviour, so it is deliberately NOT bundled into this edge-half task.
 *
 * NOTE the `!Array.isArray(normal)` guard below is currently unreachable: a
 * point with no `normal` throws earlier inside `inferBoreTypeFromNormal`
 * (pre-existing at HEAD). It is kept as a cheap invariant, not as coverage —
 * `BORE_AXIS_AMBIGUOUS` does not catch a missing normal.
 */
function resolveBoreAxis(normal: [number, number, number] | undefined): number {
  if (!Array.isArray(normal) || normal.length !== 3) return -1;
  const n = [Math.abs(Number(normal[0])), Math.abs(Number(normal[1])), Math.abs(Number(normal[2]))];
  if (!n.every(Number.isFinite)) return -1;
  const maxN = Math.max(n[0], n[1], n[2]);
  if (!(maxN > 0)) return -1;
  // 0.7071 = cos 45°: more than one component above it means a diagonal normal.
  if (n.filter((v) => v > maxN * 0.7071).length !== 1) return -1;
  return n.indexOf(maxN);
}

/**
 * How far the owner panel extends along a world axis, in mm.
 *
 * Delegates to `calculatePanelAABB` (panelBasis.ts:122-165) — the single
 * source the generator already uses — rather than re-deriving the box layout
 * here. Returns undefined (never a guessed number) when the panel does not
 * declare position, in-plane dimensions or thickness.
 *
 * ## ⚠️ LATENT TRAP for whoever adds the next emitter — measured, not theorised
 * Two role tables disagree, and this rule sits across both:
 *   - `inferBoreTypeFromNormal` (~:521): SIDE→X, BACK→Z, EVERYTHING ELSE→Y
 *   - `calculatePanelAABB` (panelBasis.ts:130-150): TOP/BOTTOM/SHELF→Y,
 *     LEFT_SIDE/RIGHT_SIDE→X, DEFAULT (everything else)→Z
 * They agree only on {LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM, SHELF, BACK}. For
 * `DIVIDER`, `DRAWER_SIDE`, `DRAWER_BACK`, `DOOR*`, `FRONT` — and the bare
 * `'SIDE'` that `isSidePanel()` accepts but `calculatePanelAABB` does not —
 * they disagree, and the review measured BOTH failure directions on a
 * store-shaped DIVIDER (useCabinetStore.ts ~:1984): a legal 24mm BOLT_ENTRY
 * into the 540mm front edge FALSE-BLOCKS (expected: 18), while a genuinely
 * fatal 24mm bore through the 18mm thickness FALSE-PASSES.
 *
 * Harmless TODAY only because generateDrillMap.ts has no DIVIDER/DRAWER
 * emitter, so no such panel ever carries points or reaches `drillMap.panels`
 * (verified: a 2-divider cabinet yields 0 blockers because the dividers emit
 * nothing). The moment such an emitter is added, reconcile the two tables
 * FIRST — do not tune this rule around the symptom.
 *
 * `panel.rotation` is ignored (calculatePanelAABB never reads it), so a rotated
 * panel's world-axis extent would be wrong. The generator ignores it
 * identically, so gate and generator do not disagree; today only
 * generateDrawerPanels.ts sets a non-zero rotation, and drawers emit no bores.
 */
function resolvePanelExtentAlongAxis(
  panel: G11Panel | undefined,
  axis: number,
  thickness: number | undefined,
): number | undefined {
  if (!panel) return undefined;
  if (thickness === undefined || !Number.isFinite(thickness) || thickness <= 0) return undefined;
  if (!Array.isArray(panel.position) || panel.position.length !== 3) return undefined;
  if (!panel.position.every((v) => Number.isFinite(v))) return undefined;
  if (!Number.isFinite(panel.finishWidth) || panel.finishWidth <= 0) return undefined;
  if (!Number.isFinite(panel.finishHeight) || panel.finishHeight <= 0) return undefined;

  // calculatePanelAABB reads exactly these five fields; the cast supplies the
  // CabinetPanel nominal type without fabricating any of the fields it ignores.
  const aabb = calculatePanelAABB({
    position: panel.position,
    rotation: panel.rotation,
    role: panel.role,
    finishWidth: panel.finishWidth,
    finishHeight: panel.finishHeight,
    computed: { realThickness: thickness },
  } as unknown as CabinetPanel);

  const extent = aabb.max[axis] - aabb.min[axis];
  return Number.isFinite(extent) && extent > 0 ? extent : undefined;
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

  // ── G11.9 EDGE half: the in-plane span has to REACH the rules ──────────
  // DrillMapPanel already carries everything calculatePanelAABB needs — role,
  // worldPosition (= CabinetPanel.position), dimensions.width (= finishWidth),
  // dimensions.height (= finishHeight), dimensions.thickness
  // (= computed.realThickness); see the DrillMapPanel assembly in
  // generateDrillMap.ts (~:2756-2767). The flattener used to copy the thickness
  // onto each point and DISCARD width/height, so the edge half had no span to
  // measure against even once it existed.
  //
  // Synthesising here rather than at the call sites is deliberate: production
  // calls this with no panels argument at all (SafetyPanel.tsx:170,
  // RightInspectorSafetySection). Fixing one button leaves the next caller
  // fail-open — same reasoning that put the export guard in the exporter.
  // A caller-supplied G11Panel still wins: it may carry richer Cabinet data.
  const panelById = new Map<string, G11Panel>();
  for (const panel of drillMap.panels || []) {
    if (!panel?.panelId || !panel.dimensions) continue;
    panelById.set(panel.panelId, {
      id: panel.panelId,
      role: panel.role,
      position: panel.worldPosition,
      rotation: panel.worldRotation,
      finishWidth: panel.dimensions.width,
      finishHeight: panel.dimensions.height,
      computed: { realThickness: panel.dimensions.thickness },
    });
  }
  for (const panel of panels) panelById.set(panel.id, panel);
  const effectivePanels = [...panelById.values()];

  const result = runG11Rules(allPoints, effectivePanels, policy);

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
