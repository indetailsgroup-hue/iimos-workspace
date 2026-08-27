/**
 * buildDxfSheets.ts - DXF Sheet Builder
 *
 * ARCHITECTURE:
 * - Build DXF files from nesting sheet data
 * - One DXF file per nesting sheet
 * - Deterministic output (same input → same DXF)
 *
 * DXF FORMAT:
 * - Uses AutoCAD R12 format (most compatible)
 * - Contains part rectangles with labels
 * - Includes sheet boundary
 */

import type { FactoryPackageProfile } from '../../factoryPackageProfiles';
import type { PlannedSheet } from '../../planFactoryPackage';
import type { NestingSheet } from '../monolithExportContext';

// ============================================
// DXF BUILDER TYPES
// ============================================

export interface DxfSheetInput {
  /** Planned sheet metadata */
  planned: PlannedSheet;

  /** Nesting sheet data */
  nesting: NestingSheet;

  /** Factory profile */
  profile: FactoryPackageProfile;
}

export interface DxfSheetOutput {
  /** Output path (relative to export root) */
  path: string;

  /** DXF content as string */
  content: string;

  /** Content as bytes (UTF-8) */
  bytes: Uint8Array;
}

// ============================================
// DXF GENERATION HELPERS
// ============================================

/**
 * DXF section builder
 *
 * R12 DXF structure:
 * - HEADER section
 * - ENTITIES section
 * - EOF
 */
class DxfBuilder {
  private lines: string[] = [];

  /**
   * Add a group code/value pair
   */
  add(groupCode: number, value: string | number): void {
    this.lines.push(String(groupCode));
    this.lines.push(String(value));
  }

  /**
   * Add section start
   */
  startSection(name: string): void {
    this.add(0, 'SECTION');
    this.add(2, name);
  }

  /**
   * End current section
   */
  endSection(): void {
    this.add(0, 'ENDSEC');
  }

  /**
   * Add TABLES section with LAYER definitions (R12-compatible).
   *
   * Each layer entry: name, flags (0 = on), color number.
   * Color codes (ACI palette):
   *   1=red, 2=yellow, 3=green, 4=cyan, 7=white/black
   */
  addLayerTable(layers: Array<{ name: string; color: number }>): void {
    this.add(0, 'SECTION');
    this.add(2, 'TABLES');

    this.add(0, 'TABLE');
    this.add(2, 'LAYER');
    this.add(70, layers.length); // max entries

    for (const layer of layers) {
      this.add(0, 'LAYER');
      this.add(2, layer.name);  // Layer name
      this.add(70, 0);          // Flags: 0 = on/thawed
      this.add(62, layer.color); // Color number (positive = on)
      this.add(6, 'CONTINUOUS'); // Linetype
    }

    this.add(0, 'ENDTAB');
    this.add(0, 'ENDSEC');
  }

  /**
   * Add LINE entity.
   *
   * All four endpoint coordinates are rounded to 0.01 mm before emission so
   * CAM software never receives irrational floating-point values (e.g. from
   * arc-length corrections).  Rounding delta is at most 0.005 mm, which is
   * well within CNC kerf-width tolerance (Stage 22 smoke invariant).
   */
  addLine(x1: number, y1: number, x2: number, y2: number, layer: string = '0'): void {
    const r = (v: number): number => Math.round(v * 100) / 100;
    this.add(0, 'LINE');
    this.add(8, layer);    // Layer
    this.add(10, r(x1));   // Start X  (rounded to 0.01 mm)
    this.add(20, r(y1));   // Start Y
    this.add(30, 0);       // Start Z
    this.add(11, r(x2));   // End X    (rounded to 0.01 mm)
    this.add(21, r(y2));   // End Y
    this.add(31, 0);       // End Z
  }

  /**
   * Add rectangle as 4 lines
   */
  addRectangle(x: number, y: number, w: number, h: number, layer: string = '0'): void {
    // Bottom
    this.addLine(x, y, x + w, y, layer);
    // Right
    this.addLine(x + w, y, x + w, y + h, layer);
    // Top
    this.addLine(x + w, y + h, x, y + h, layer);
    // Left
    this.addLine(x, y + h, x, y, layer);
  }

  /**
   * Add TEXT entity
   */
  addText(
    x: number,
    y: number,
    text: string,
    height: number = 10,
    layer: string = 'TEXT'
  ): void {
    this.add(0, 'TEXT');
    this.add(8, layer);     // Layer
    this.add(10, x);        // Insertion X
    this.add(20, y);        // Insertion Y
    this.add(30, 0);        // Insertion Z
    this.add(40, height);   // Text height
    this.add(1, text);      // Text value
    this.add(50, 0);        // Rotation angle
  }

  /**
   * Build final DXF string
   */
  build(): string {
    // Add EOF
    this.add(0, 'EOF');
    return this.lines.join('\n');
  }
}

/**
 * Standard DXF layer definitions for MONOLITH nesting sheets (AutoCAD R12).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Layer Color Codes  (ACI palette — positive value = layer ON)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Layer        | ACI | Color  | Purpose
 * -------------|----:|--------|----------------------------------------
 * SHEET        |   7 | white  | Sheet boundary rectangle
 * PARTS        |   3 | green  | Bounding rect of flat (non-curved) parts
 * PARTS_CURVED |   1 | red    | Bounding rect of kerf-bent curved parts
 * HATCH_CURVED |   4 | cyan   | X-hatch diagonals inside curved part rect
 * LABELS       |   2 | yellow | Part ID, dimension text, sub-labels
 * TEXT         |   7 | white  | Sheet-level annotations (sheet ID, material)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Hatch-Line Emission Rules
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HATCH_CURVED lines are emitted only when `placement.isCurved === true`.
 * Each curved placement produces exactly 2 diagonal LINE entities spanning
 * the full placement rectangle (corner-to-corner in both directions):
 *
 *   Line 1 — (x, y) → (x + w, y + h)   bottom-left  to top-right
 *   Line 2 — (x + w, y) → (x, y + h)   bottom-right to top-left
 *
 * Straight placements (`isCurved` falsy) use the PARTS layer; no hatch is drawn.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LINE Count Invariants per Sheet  (Stages 7 – 13)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   HATCH_CURVED = 2 × curved_count
 *   PARTS_CURVED = 4 × curved_count   (one closed rect = 4 LINEs)
 *   PARTS        = 4 × straight_count
 *   SHEET        = 4                  (always — one sheet boundary rect)
 *
 * Stage | Curved | Straight | HATCH_CURVED | PARTS_CURVED | PARTS
 * ------|-------:|----------:|:------------:|:------------:|:-----:
 *     7 |      1 |         1 |            2 |            4 |     4
 *     8 |      1 |         2 |            2 |            4 |     8
 *     9 |      2 |         0 |            4 |            8 |     0
 *    10 |      3 |         0 |            6 |           12 |     0
 *    11 |      0 |         3 |            0 |            0 |    12
 *    12 |      1 |         2 |            2 |            4 |     8
 *    13 |      2 |         1 |            4 |            8 |     4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Geometric Invariants of HATCH_CURVED Diagonals  (Stages 14 – 21)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Effective placement dimensions derive from `getRotatedDimensions(cutW, cutH, rotation)`:
 *   rotation = 0  → effectiveW = cutW,  effectiveH = cutH
 *   rotation = 90 → effectiveW = cutH,  effectiveH = cutW
 *
 * `cutW` and `cutH` in each Placement store flat-blank dimensions after the
 * curved correction applied by `runNesting` (optimizer.ts):
 *   flatBlankH = cutH + (developedLength − projectedDepth)   when curvedEdge ∈ {TOP, BOTTOM}
 *   flatBlankW = cutW + (developedLength − projectedDepth)   when curvedEdge ∈ {LEFT, RIGHT}
 *
 * Direction vectors of the two X-hatch diagonals (from hatch-line code above):
 *   d1 = ( effectiveW,  effectiveH)   ← bottom-left  to top-right
 *   d2 = (-effectiveW,  effectiveH)   ← bottom-right to top-left
 *
 * Dot-product identity (derivable from direction vectors):
 *   dot(d1, d2) = −effectiveW² + effectiveH²
 *              = effectiveH² − effectiveW²
 *
 *   → dot < 0  when effectiveW > effectiveH  (landscape flat blank)
 *   → dot = 0  when effectiveW = effectiveH  (square flat blank)
 *   → dot > 0  when effectiveW < effectiveH  (portrait flat blank)
 *
 * Stage | Panels              | Assertion
 * ------|---------------------|----------------------------------------------
 *    14 | S_CURVE (1)         | HATCH_CURVED X-lines confined within flat-blank bbox
 *    15 | ARC + S_CURVE       | diagonal length = sqrt(effectiveW²+effectiveH²);
 *       |                     |   flat-blank diag > finish diag
 *    16 | ARC + S_CURVE       | flat-blank diag > min(finishW, finishH) (shorter-side guard)
 *    17 | ARC + S_CURVE       | HATCH_CURVED lines spatially partitioned by placement Y;
 *       |                     |   no cross-contamination between the two curved placements
 *    18 | ARC + S_CURVE       | diagonal-2 length equals endpoint-derived bbox diagonal
 *    19 | ARC + S_CURVE       | diagonal-1 and diagonal-2 intersect at placement bbox centre
 *    20 | ARC + S_CURVE       | dot(d1,d2) ≈ 0 iff effectiveW = effectiveH (square bbox);
 *       |   + SQUARE_ARC      |   |dot| > 100 000 for non-square panels
 *    21 | ARC + S_CURVE       | dot(d1,d2) < 0 when effectiveW > effectiveH (FFDH rotates);
 *       |   + TALL_ARC        |   dot(d1,d2) > 0 when effectiveW < effectiveH (grain-locked)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Precision and Structural Integrity Invariants  (Stages 22 – 35)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Endpoint rounding (Stage 22): addLine() applies Math.round(v × 100) / 100
 * to all four coordinates before writing to DXF, guaranteeing 0.01 mm
 * grid-alignment across the full pipeline.
 *
 * Stage | Panels                   | Assertion
 * ------|--------------------------|-------------------------------------------
 *    22 | ARC + S_CURVE + TALL_ARC | all 4 HATCH_CURVED endpoints rounded to
 *       |                          |   0.01 mm (Math.round(v×100)/100)
 *    23 | ARC + S_CURVE + TALL_ARC | rounded endpoints lie within flat-blank
 *       |                          |   bbox (ε = 0.01 mm)
 *    24 | ARC + S_CURVE + TALL_ARC | each diagonal non-degenerate:
 *       |                          |   |x1−x2| + |y1−y2| > 1e-6
 *    25 | ARC + S_CURVE + TALL_ARC | midpoint(d1) = midpoint(d2) (±0.05 mm)
 *    26 | ARC + S_CURVE + TALL_ARC | shared midpoint = bbox centre
 *       |                          |   (minX + W/2, minY + H/2), ±0.05 mm
 *    27 | ARC + S_CURVE + TALL_ARC | diagLen(d1) ≈ diagLen(d2) (±0.05 mm)
 *   28A | ARC + S_CURVE + TALL_ARC | diagLen ≈ sqrt(effectiveW²+effectiveH²)
 *       |                          |   (±0.05 mm) for both d1 and d2
 *   28B | ARC + S_CURVE + TALL_ARC | 4 endpoints are distinct corner pairs:
 *       |                          |   new Set([…]).size === 4
 *    29 | ARC + S_CURVE + TALL_ARC | endpoints = Set of 4 rounded bbox corners:
 *       |                          |   Set({x,y}) === {(minX,minY),(maxX,maxY),
 *       |                          |   (maxX,minY),(minX,maxY)}
 *    30 | ARC + S_CURVE + TALL_ARC | d1: (minX,minY)→(maxX,maxY) (left→right);
 *       |                          |   d2: (maxX,minY)→(minX,maxY) (right→left);
 *       |                          |   d1.x1 < d1.x2; d2.x1 > d2.x2  (ε < 0.015 mm)
 *    31 | ARC + S_CURVE + TALL_ARC | shared bottom start-Y: d1.y1 ≈ d2.y1 ≈ r(minY)
 *       |                          |   (consequence of Stage 30; ε < 0.015 mm)
 *    32 | ARC + S_CURVE + TALL_ARC | shared top end-Y: d1.y2 ≈ d2.y2 ≈ r(maxY)
 *       |                          |   (symmetric counterpart of Stage 31; ε < 0.015 mm)
 *    33 | ARC + S_CURVE + TALL_ARC | orientation sense: d1.x1 < d1.x2 (left→right);
 *       |                          |   d2.x1 > d2.x2 (right→left); strict inequality,
 *       |                          |   no tolerance needed
 *    34 | ARC + S_CURVE + TALL_ARC | Y-axis monotonicity: d1.y1 < d1.y2 and
 *       |                          |   d2.y1 < d2.y2 — both diagonals ascend in Y;
 *       |                          |   strict inequality, no tolerance needed
 *    35 | ARC + S_CURVE + TALL_ARC | d1.x2 ≈ r(maxX) — diagonal-1 ends at right edge;
 *       |                          |   d2.x2 ≈ r(minX) — diagonal-2 ends at left edge;
 *       |                          |   ε < 0.015 mm
 *
 * All invariants are verified end-to-end in:
 *   src/e2e/curvedPanelDxfPipeline.smoke.test.ts  (Stages 7 – 35)
 * ─────────────────────────────────────────────────────────────────────────────
 */
const NESTING_LAYERS = [
  { name: 'SHEET',        color: 7 }, // white — sheet boundary
  { name: 'PARTS',        color: 3 }, // green — flat (non-curved) parts
  { name: 'PARTS_CURVED', color: 1 }, // red   — kerf-bent curved parts
  { name: 'HATCH_CURVED', color: 4 }, // cyan  — X-hatch inside curved parts
  { name: 'LABELS',       color: 2 }, // yellow — part ID / dimension text
  { name: 'TEXT',         color: 7 }, // white — sheet-level annotations
] as const;

/**
 * Build minimal DXF header for R12 compatibility
 */
function buildHeader(builder: DxfBuilder, sheetW: number, sheetH: number): void {
  builder.startSection('HEADER');

  // AutoCAD version
  builder.add(9, '$ACADVER');
  builder.add(1, 'AC1009'); // R12

  // Drawing extents
  builder.add(9, '$EXTMIN');
  builder.add(10, 0);
  builder.add(20, 0);
  builder.add(30, 0);

  builder.add(9, '$EXTMAX');
  builder.add(10, sheetW);
  builder.add(20, sheetH);
  builder.add(30, 0);

  // Drawing limits
  builder.add(9, '$LIMMIN');
  builder.add(10, 0);
  builder.add(20, 0);

  builder.add(9, '$LIMMAX');
  builder.add(10, sheetW);
  builder.add(20, sheetH);

  builder.endSection();
}

/**
 * Apply rotation to part dimensions
 */
function getRotatedDimensions(
  cutW: number,
  cutH: number,
  rotation: 0 | 90 | 180 | 270
): { w: number; h: number } {
  if (rotation === 90 || rotation === 270) {
    return { w: cutH, h: cutW };
  }
  return { w: cutW, h: cutH };
}

// ============================================
// MAIN BUILDER
// ============================================

/**
 * Build DXF file for a single nesting sheet
 *
 * DETERMINISM:
 * - Same nesting data → same DXF output
 * - Parts ordered by placement order (not random)
 * - Coordinates are absolute (not relative)
 */
export function buildDxfSheet(input: DxfSheetInput): DxfSheetOutput {
  const { planned, nesting, profile } = input;

  const builder = new DxfBuilder();

  // Build header
  buildHeader(builder, nesting.sheetW, nesting.sheetH);

  // TABLES section: layer color definitions (R12)
  builder.addLayerTable([...NESTING_LAYERS]);

  // Build entities section
  builder.startSection('ENTITIES');

  // Sheet boundary (layer: SHEET)
  builder.addRectangle(0, 0, nesting.sheetW, nesting.sheetH, 'SHEET');

  // Sheet label
  builder.addText(
    10,
    nesting.sheetH - 30,
    `Sheet ${planned.index1}${nesting.label ? ` - ${nesting.label}` : ''}`,
    20,
    'TEXT'
  );

  // Material info
  builder.addText(
    10,
    nesting.sheetH - 60,
    `Material: ${nesting.materialId} | ${nesting.sheetThickness}mm`,
    12,
    'TEXT'
  );

  // Utilization
  builder.addText(
    10,
    nesting.sheetH - 85,
    `Utilization: ${nesting.utilization.toFixed(1)}%`,
    12,
    'TEXT'
  );

  // Draw each part placement (deterministic order)
  for (const placement of nesting.placements) {
    const { w, h } = getRotatedDimensions(
      placement.cutW,
      placement.cutH,
      placement.rotation
    );

    // Part rectangle — curved parts on PARTS_CURVED (red), flat on PARTS (green)
    const partLayer = placement.isCurved ? 'PARTS_CURVED' : 'PARTS';
    builder.addRectangle(placement.x, placement.y, w, h, partLayer);

    // X-hatch for curved parts: two diagonal lines on HATCH_CURVED (cyan)
    if (placement.isCurved) {
      builder.addLine(
        placement.x,     placement.y,
        placement.x + w, placement.y + h,
        'HATCH_CURVED'
      );
      builder.addLine(
        placement.x + w, placement.y,
        placement.x,     placement.y + h,
        'HATCH_CURVED'
      );
    }

    // Part label (layer: LABELS)
    const labelX = placement.x + w / 2 - 20;
    const labelY = placement.y + h / 2;
    builder.addText(labelX, labelY, placement.partId, 8, 'LABELS');

    // Dimensions label
    const dimText = `${placement.cutW}x${placement.cutH}`;
    builder.addText(labelX, labelY - 15, dimText, 6, 'LABELS');

    // Rotation indicator (if rotated)
    if (placement.rotation !== 0) {
      builder.addText(labelX, labelY - 28, `R${placement.rotation}`, 5, 'LABELS');
    }

    // Curved sub-label: "(CURVED / N cuts)" or "(CURVED)" when kerfCount absent
    if (placement.isCurved) {
      const curveLbl = placement.kerfCount !== undefined
        ? `(CURVED / ${placement.kerfCount} cuts)`
        : '(CURVED)';
      builder.addText(labelX, labelY - 40, curveLbl, 5, 'LABELS');
    }
  }

  builder.endSection();

  // Build DXF content
  const content = builder.build();
  const bytes = new TextEncoder().encode(content);

  // Generate filename using profile pattern
  const filename = profile.sheetNamePattern(planned.index1, nesting.label);
  const path = `${profile.sheetFolder}/${filename}`;

  return {
    path,
    content,
    bytes,
  };
}

// ============================================
// BATCH BUILDER
// ============================================

export interface BuildDxfSheetsInput {
  /** Planned sheets (determines order) */
  plannedSheets: PlannedSheet[];

  /** Nesting sheets (actual data) */
  nestingSheets: NestingSheet[];

  /** Factory profile */
  profile: FactoryPackageProfile;
}

/**
 * Build all DXF sheets
 *
 * DETERMINISM:
 * - Sheets ordered by planned index
 * - Same input → same output files
 */
export function buildDxfSheets(input: BuildDxfSheetsInput): DxfSheetOutput[] {
  const { plannedSheets, nestingSheets, profile } = input;

  // Create map of nesting sheets by index for lookup
  const nestingByIndex = new Map<number, NestingSheet>();
  for (const ns of nestingSheets) {
    nestingByIndex.set(ns.index1, ns);
  }

  // Build DXF for each planned sheet (in deterministic order)
  const outputs: DxfSheetOutput[] = [];

  for (const planned of plannedSheets) {
    const nesting = nestingByIndex.get(planned.index1);
    if (!nesting) {
      console.warn(`No nesting data for sheet index ${planned.index1}`);
      continue;
    }

    const output = buildDxfSheet({
      planned,
      nesting,
      profile,
    });

    outputs.push(output);
  }

  return outputs;
}
