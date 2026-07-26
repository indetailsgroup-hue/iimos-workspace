/**
 * panelLocalProjection.ts — WORLD → PANEL-LOCAL (2D cut-drawing) projection
 *
 * MISSION (fix/dxf-truth-chain, T2): the OperationGraph DXF path draws drill
 * points at raw world coordinates (operationGraphToDxf.ts:296-306 — Z dropped,
 * no panel frame, no mirroring). This module supplies the missing projection:
 * world drill points → per-panel 2D cut-drawing coordinates that match the
 * shipped legacy DXF convention. T3 wires it into the exporter.
 *
 * FRAME CONVENTION (single source of truth — NOT re-derived here):
 * The forward machinery lives in src/core/manufacturing/drillMap/panelBasis.ts
 * (getPanelBasisFromAABB ~:187, panelLocalToWorld ~:340). Drill points are
 * computed panel-local-first and converted to world (generateDrillMap.ts
 * ~:908, ~:1416). worldToPanelLocal() below is the exact inverse projection
 * onto the same orthonormal basis: x = d·xAxis, y = d·yAxis, u = d·uAxis.
 *
 * DRAWING FRAME (legacy operator-familiar convention):
 * X along the panel's width-in-drawing, Y along height-in-drawing, origin at
 * the panel outline's bottom-left, mm units — exactly the frame the legacy
 * generator drew per role (cabinetToDxf.ts + DXFGenerator.ts:296 outline):
 *   LEFT_SIDE / RIGHT_SIDE : depth  × height  (e.g. 560×720; legacy System-32
 *                            front column at x = EDGE_OFFSET_FRONT from x=0 —
 *                            cabinetToDxf.ts:126-174 → front edge at x=0)
 *   TOP / BOTTOM / SHELF   : width  × depth   (cabinetToDxf.ts:424-479)
 *   BACK                   : width  × height
 *
 * MIRROR RULING (G1-established: geometry is mirrored IN-FILE per panel; there
 * is NO machine-side L/R flip):
 * Every drawing depicts the MACHINING FACE as seen from the drill side (the
 * face lies up on the machine bed). This is the same semantics as the legacy
 * Face-A frame: DXFGenerator.ts:423-427 mirrors X (`panelWidth − x`) whenever
 * an operation is drilled from the opposite face — i.e. legacy already mirrors
 * in-file across the drawing's VERTICAL centerline, never front/back.
 * Role-generically, the drawing's up vector is the basis yAxis and the viewer
 * looks along the drill direction (+uAxis), so the view's right vector is
 * cross(uAxis, yAxis). When that vector opposes the basis xAxis the basis
 * frame is seen x-flipped and the drawing must mirror: drawX = faceWidth − x.
 *
 * Resulting per-role ruling (derived, not hardcoded — see mirroredInX):
 *   | role       | machining face (panelBasis.ts) | mirroredInX |
 *   |------------|--------------------------------|-------------|
 *   | LEFT_SIDE  | inner/right face  (:265-284)   | no          |
 *   | RIGHT_SIDE | inner/left face   (:286-305)   | YES         |
 *   | BOTTOM     | top face          (:222-241)   | no          |
 *   | TOP        | bottom face       (:200-220)   | YES         |
 *   | SHELF      | top face          (:243-263)   | no          |
 *   | BACK       | front/inner face  (:307-326)   | no          |
 * RIGHT_SIDE is therefore the mirror of LEFT_SIDE across the drawing's
 * vertical centerline (mandated), and TOP vs BOTTOM fall out of the SAME rule:
 * the TOP panel is machined from its bottom face, so its drawing is x-mirrored
 * relative to BOTTOM. Legacy cabinetToDxf emitted identical face-'A' patterns
 * for both sides and both horizontals only because it worked in abstract panel
 * space with no world mapping; the world-aware mapping is what G1 pinned down.
 *
 * CLASSIFICATION (per drill point, from its normal vs the panel's uAxis):
 *   FACE_BORE : |n̂·uAxis| ≈ 1 → circle at its in-face position.
 *               faceSide 'A' = machining face (n̂ = +u), 'B' = opposite face.
 *               layerHint = DRILL_V_<dia>_D<depth>   (Production.ts:229-232,
 *               DXFGenerator.ts:249,438)
 *   EDGE_BORE : n̂·uAxis ≈ 0 → position on the panel boundary edge plus
 *               metadata {edge (drawing frame), axis, zOffset}. zOffset = u =
 *               distance from the machining face into the thickness (legacy
 *               z_center semantics).
 *               layerHint = DRILL_H_<dia>_Z<zOffset>_D<depth> (Production.ts:
 *               237-239, DXFGenerator.ts:251,471)
 *
 * FAIL-CLOSED: unknown panelId, zero-length normal, oblique normal, entry
 * point off the panel face/boundary/thickness → the point is NEVER drawn;
 * it lands in ProjectionResult.skipped with a machine-readable reason.
 * No silent drops: |bores| + |skipped| === |input points|.
 *
 * PURE MODULE: no store imports, no side effects. Type-only imports from
 * '../types/Cabinet'; runtime imports only from the pure panelBasis module.
 */

import {
  calculatePanelAABB,
  getPanelBasisFromAABB,
  vecDot,
  vecSub,
  vecLen,
  type Box3Like,
  type PanelWorldBasis,
} from '../manufacturing/drillMap/panelBasis';
import type { Vec3Tuple } from '../manufacturing/drillMap/types';
import type { CabinetPanel, PanelRole } from '../types/Cabinet';

// ============================================
// PUBLIC TYPES
// ============================================

/** Edge of the 2D drawing an EDGE bore enters through (drawing frame, post-mirror). */
export type DrawingEdge = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

/** In-drawing travel axis of an EDGE bore ('X' = enters LEFT/RIGHT, 'Y' = TOP/BOTTOM). */
export type DrawingAxis = 'X' | 'Y';

export type BoreType = 'FACE' | 'EDGE';

/**
 * Minimal structural panel input. Provide EITHER a world AABB, OR the store
 * convention (center position + finishWidth/finishHeight) from which the AABB
 * is derived via the same calculatePanelAABB used by the drill-map generator.
 */
export interface ProjectionPanelInput {
  panelId: string;
  role: PanelRole;
  /** Panel thickness (mm) — realThickness in store terms. */
  thickness: number;
  /** World-space AABB, if already available (e.g. from a packet). */
  aabb?: Box3Like;
  /** Panel CENTER position in world mm (store convention). */
  position?: Vec3Tuple;
  /** Store finish dims (role-dependent semantics, see calculatePanelAABB). */
  finishWidth?: number;
  finishHeight?: number;
}

/** Minimal structural drill-point input (DrillMapPoint-compatible subset). */
export interface ProjectionPointInput {
  id?: string;
  panelId: string;
  /** World position of the drill ENTRY point (mm). */
  position: Vec3Tuple;
  /** Drill direction, into material. Need not be normalized. */
  normal: Vec3Tuple;
  diameter: number;
  depth: number;
  purpose?: string;
}

export interface ProjectedBore {
  sourceId?: string;
  purpose?: string;
  /** Drawing coordinates, mm, origin at the panel outline's bottom-left. */
  x: number;
  y: number;
  diameter: number;
  depth: number;
  boreType: BoreType;
  /** FACE only: 'A' = drilled from the machining face, 'B' = from the opposite face. */
  faceSide?: 'A' | 'B';
  /** EDGE only. */
  edge?: DrawingEdge;
  axis?: DrawingAxis;
  /** EDGE only: entry offset within the panel thickness, measured from the machining face (mm). */
  zOffset?: number;
  /** Legacy layer name: DRILL_V_<dia>_D<depth> | DRILL_H_<dia>_Z<zOffset>_D<depth>. */
  layerHint: string;
}

export interface PanelDrawingProjection {
  panelId: string;
  role: PanelRole;
  /** Drawing outline size (mm): faceWidth × faceHeight of the machining face. */
  drawWidth: number;
  drawHeight: number;
  /** True when the drawing is x-mirrored in-file (RIGHT_SIDE, TOP). */
  mirroredInX: boolean;
  bores: ProjectedBore[];
}

export type SkipReason =
  | 'UNKNOWN_PANEL'
  | 'UNSUPPORTED_ROLE'
  | 'ZERO_NORMAL'
  | 'OBLIQUE_NORMAL'
  | 'FACE_ENTRY_OFF_FACE'
  | 'FACE_OUT_OF_BOUNDS'
  | 'EDGE_ENTRY_OFF_PANEL'
  | 'EDGE_ENTRY_OFF_BOUNDARY';

export interface SkippedPointReport {
  pointId?: string;
  panelId: string;
  reason: SkipReason;
  detail: string;
}

export interface ProjectionResult {
  panels: PanelDrawingProjection[];
  skipped: SkippedPointReport[];
}

export interface ProjectionOptions {
  /** Positional tolerance (mm) for face/boundary membership checks. Default 0.05. */
  positionTolerance?: number;
  /** Angular tolerance in cosine space for FACE/EDGE classification. Default 1e-3. */
  angularTolerance?: number;
}

/** Panel-local coordinates on the machining-face basis (pre-mirror). */
export interface PanelLocalCoords {
  x: number;
  y: number;
  /** Depth-axis coordinate: distance from the machining face into the material. */
  u: number;
}

export interface PanelDrawingFrame {
  basis: PanelWorldBasis;
  drawWidth: number;
  drawHeight: number;
  mirroredInX: boolean;
  thickness: number;
}

// ============================================
// CORE MATH
// ============================================

function vecCross(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Exact inverse of panelBasis.panelLocalToWorld for the orthonormal panel
 * basis, extended with the depth coordinate u (into material).
 */
export function worldToPanelLocal(basis: PanelWorldBasis, world: Vec3Tuple): PanelLocalCoords {
  const d = vecSub(world, basis.origin);
  return {
    x: vecDot(d, basis.xAxis),
    y: vecDot(d, basis.yAxis),
    u: vecDot(d, basis.uAxis),
  };
}

/**
 * Build the per-panel drawing frame: machining-face basis + outline size +
 * in-file mirror flag.
 *
 * Mirror derivation (role-generic, see module docstring): the drawing shows
 * the machining face viewed along the drill direction (+uAxis) with drawing-up
 * = basis yAxis; the view's right vector is cross(uAxis, yAxis). If it opposes
 * the basis xAxis, drawX = faceWidth − localX.
 */
export function getPanelDrawingFrame(panel: ProjectionPanelInput): PanelDrawingFrame {
  const stub = toBasisPanel(panel);
  const aabb = resolveAabb(panel, stub);
  const basis = getPanelBasisFromAABB(stub, aabb);

  // Handedness of the basis frame relative to the machining-face view:
  // viewer looks along the drill direction (+uAxis) with drawing-up = yAxis;
  // the view's right vector is cross(uAxis, yAxis). When it opposes the basis
  // xAxis, the drawing must mirror in-file: drawX = faceWidth − localX.
  // Yields: LEFT_SIDE/BOTTOM/SHELF/BACK unmirrored; RIGHT_SIDE/TOP mirrored.
  const viewRight = vecCross(basis.uAxis, basis.yAxis);
  const mirroredInX = vecDot(viewRight, basis.xAxis) < 0;

  return {
    basis,
    drawWidth: basis.faceWidth,
    drawHeight: basis.faceHeight,
    mirroredInX,
    thickness: panel.thickness,
  };
}

// ============================================
// INPUT ADAPTERS (structural, store-free)
// ============================================

/**
 * getPanelBasisFromAABB / calculatePanelAABB read ONLY role, position,
 * finishWidth, finishHeight and computed.realThickness. This structural stub
 * lets the module reuse the exact same basis convention without importing
 * store state or constructing full CabinetPanel objects.
 */
function toBasisPanel(p: ProjectionPanelInput): CabinetPanel {
  return {
    role: p.role,
    position: p.position ?? ([0, 0, 0] as Vec3Tuple),
    finishWidth: p.finishWidth ?? 0,
    finishHeight: p.finishHeight ?? 0,
    computed: { realThickness: p.thickness },
  } as unknown as CabinetPanel;
}

function resolveAabb(p: ProjectionPanelInput, stub: CabinetPanel): Box3Like {
  if (p.aabb) return p.aabb;
  if (!p.position || p.finishWidth === undefined || p.finishHeight === undefined) {
    throw new Error(
      `panelLocalProjection: panel '${p.panelId}' needs either aabb or position+finishWidth+finishHeight`,
    );
  }
  return calculatePanelAABB(stub);
}

// ============================================
// LAYER HINTS (legacy naming — Production.ts:229-239)
// ============================================

/** Format numbers the way legacy layer names do (raw, FP-noise-rounded to 1µm). */
function fmtNum(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

function faceLayerHint(diameter: number, depth: number): string {
  return `DRILL_V_${fmtNum(diameter)}_D${fmtNum(depth)}`;
}

function edgeLayerHint(diameter: number, zOffset: number, depth: number): string {
  return `DRILL_H_${fmtNum(diameter)}_Z${fmtNum(zOffset)}_D${fmtNum(depth)}`;
}

// ============================================
// MAIN PROJECTION
// ============================================

interface FrameEntry {
  frame: PanelDrawingFrame | null;
  /** Populated when the role is unsupported by the basis machinery. */
  unsupportedDetail?: string;
}

export function projectDrillPointsToPanelLocal(
  input: { panels: ProjectionPanelInput[]; points: ProjectionPointInput[] },
  options: ProjectionOptions = {},
): ProjectionResult {
  const posTol = options.positionTolerance ?? 0.05;
  const cosTol = options.angularTolerance ?? 1e-3;

  // ── Build per-panel frames (fail-closed on unsupported roles) ──
  const frames = new Map<string, FrameEntry>();
  const projections = new Map<string, PanelDrawingProjection>();
  const orderedPanelIds: string[] = [];

  for (const p of input.panels) {
    if (frames.has(p.panelId)) {
      throw new Error(`panelLocalProjection: duplicate panelId '${p.panelId}' in input.panels`);
    }
    try {
      const frame = getPanelDrawingFrame(p);
      frames.set(p.panelId, { frame });
      projections.set(p.panelId, {
        panelId: p.panelId,
        role: p.role,
        drawWidth: frame.drawWidth,
        drawHeight: frame.drawHeight,
        mirroredInX: frame.mirroredInX,
        bores: [],
      });
      orderedPanelIds.push(p.panelId);
    } catch (e) {
      // Unsupported role (getPanelBasisFromAABB throws) — panel excluded,
      // every point targeting it is reported, never silently dropped.
      frames.set(p.panelId, {
        frame: null,
        unsupportedDetail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const skipped: SkippedPointReport[] = [];
  const skip = (pt: ProjectionPointInput, reason: SkipReason, detail: string): void => {
    skipped.push({ pointId: pt.id, panelId: pt.panelId, reason, detail });
  };

  // ── Project each point ──
  for (const pt of input.points) {
    const entry = frames.get(pt.panelId);
    if (!entry) {
      skip(pt, 'UNKNOWN_PANEL', `no panel '${pt.panelId}' in input.panels`);
      continue;
    }
    if (!entry.frame) {
      skip(pt, 'UNSUPPORTED_ROLE', entry.unsupportedDetail ?? 'panel role unsupported by panel basis');
      continue;
    }
    const { basis, drawWidth, drawHeight, mirroredInX, thickness } = entry.frame;

    const nLen = vecLen(pt.normal);
    if (nLen < 1e-9) {
      skip(pt, 'ZERO_NORMAL', `normal [${pt.normal.join(', ')}] has zero length`);
      continue;
    }
    const nHat: Vec3Tuple = [pt.normal[0] / nLen, pt.normal[1] / nLen, pt.normal[2] / nLen];

    const local = worldToPanelLocal(basis, pt.position);
    const drawX = mirroredInX ? drawWidth - local.x : local.x;
    const drawY = local.y;

    const nu = vecDot(nHat, basis.uAxis);

    // ── FACE bore: drill axis perpendicular to the panel face ──
    if (Math.abs(nu) >= 1 - cosTol) {
      const faceSide: 'A' | 'B' = nu > 0 ? 'A' : 'B';
      const expectedU = faceSide === 'A' ? 0 : thickness;
      if (Math.abs(local.u - expectedU) > posTol) {
        skip(
          pt,
          'FACE_ENTRY_OFF_FACE',
          `face-${faceSide} bore entry u=${local.u.toFixed(3)}mm, expected ${expectedU}±${posTol}mm`,
        );
        continue;
      }
      if (drawX < -posTol || drawX > drawWidth + posTol || drawY < -posTol || drawY > drawHeight + posTol) {
        skip(
          pt,
          'FACE_OUT_OF_BOUNDS',
          `face bore at (${drawX.toFixed(3)}, ${drawY.toFixed(3)}) outside 0..${drawWidth} × 0..${drawHeight}`,
        );
        continue;
      }
      projections.get(pt.panelId)!.bores.push({
        sourceId: pt.id,
        purpose: pt.purpose,
        x: drawX,
        y: drawY,
        diameter: pt.diameter,
        depth: pt.depth,
        boreType: 'FACE',
        faceSide,
        layerHint: faceLayerHint(pt.diameter, pt.depth),
      });
      continue;
    }

    // ── Oblique: neither perpendicular nor parallel to the face ──
    if (Math.abs(nu) > cosTol) {
      skip(
        pt,
        'OBLIQUE_NORMAL',
        `normal·uAxis=${nu.toFixed(4)} — oblique bores (angled joints) are not representable in this 2D frame`,
      );
      continue;
    }

    // ── EDGE bore: drill axis parallel to the face plane ──
    if (local.u < -posTol || local.u > thickness + posTol) {
      skip(
        pt,
        'EDGE_ENTRY_OFF_PANEL',
        `edge bore entry u=${local.u.toFixed(3)}mm outside panel thickness 0..${thickness}mm`,
      );
      continue;
    }

    // Travel direction in the (post-mirror) drawing frame decides the entry edge.
    const nxDraw = (mirroredInX ? -1 : 1) * vecDot(nHat, basis.xAxis);
    const nyDraw = vecDot(nHat, basis.yAxis);
    let edge: DrawingEdge;
    let axis: DrawingAxis;
    if (Math.abs(nxDraw) >= Math.abs(nyDraw)) {
      axis = 'X';
      edge = nxDraw > 0 ? 'LEFT' : 'RIGHT';
    } else {
      axis = 'Y';
      edge = nyDraw > 0 ? 'BOTTOM' : 'TOP';
    }

    const boundaryOk =
      edge === 'LEFT' ? Math.abs(drawX) <= posTol :
      edge === 'RIGHT' ? Math.abs(drawX - drawWidth) <= posTol :
      edge === 'BOTTOM' ? Math.abs(drawY) <= posTol :
      Math.abs(drawY - drawHeight) <= posTol;
    const inPlaneOk =
      axis === 'X'
        ? drawY >= -posTol && drawY <= drawHeight + posTol
        : drawX >= -posTol && drawX <= drawWidth + posTol;
    if (!boundaryOk || !inPlaneOk) {
      skip(
        pt,
        'EDGE_ENTRY_OFF_BOUNDARY',
        `edge-${edge} bore entry (${drawX.toFixed(3)}, ${drawY.toFixed(3)}) not on the ${edge} boundary of 0..${drawWidth} × 0..${drawHeight}`,
      );
      continue;
    }

    projections.get(pt.panelId)!.bores.push({
      sourceId: pt.id,
      purpose: pt.purpose,
      x: drawX,
      y: drawY,
      diameter: pt.diameter,
      depth: pt.depth,
      boreType: 'EDGE',
      edge,
      axis,
      zOffset: local.u,
      layerHint: edgeLayerHint(pt.diameter, local.u, pt.depth),
    });
  }

  return {
    panels: orderedPanelIds.map(id => projections.get(id)!),
    skipped,
  };
}
