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
   * Add LINE entity
   */
  addLine(x1: number, y1: number, x2: number, y2: number, layer: string = '0'): void {
    this.add(0, 'LINE');
    this.add(8, layer); // Layer
    this.add(10, x1);   // Start X
    this.add(20, y1);   // Start Y
    this.add(30, 0);    // Start Z
    this.add(11, x2);   // End X
    this.add(21, y2);   // End Y
    this.add(31, 0);    // End Z
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
 * LINE Count Invariants per Sheet  (n = number of placements)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   HATCH_CURVED = 2 × curved_count
 *   PARTS_CURVED = 4 × curved_count   (one closed rect = 4 LINEs)
 *   PARTS        = 4 × straight_count
 *   SHEET        = 4                  (always — one sheet boundary rect)
 *
 * These invariants are verified end-to-end in:
 *   src/e2e/curvedPanelDxfPipeline.smoke.test.ts  (Stages 7 – 13)
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
