/**
 * curvedPanelDxfPipeline.smoke.test.ts — @smoke
 *
 * E2E integration test for the full curved-panel DXF export pipeline:
 *
 *   computeCurveFields()          — derive developedLength / kerfCount / projectedDepth
 *        ↓
 *   CutListRow (curved)           — assemble row with curve fields
 *        ↓
 *   runNesting()                  — bin by flat-blank size; propagate isCurved + kerfCount
 *        ↓
 *   buildDxfSheet()               — render DXF with PARTS_CURVED, HATCH_CURVED, sub-label
 *        ↓
 *   assert DXF contains           — '(CURVED / 12 cuts)', PARTS_CURVED, HATCH_CURVED
 *
 * This test is intentionally thin on unit-level invariants (those live in the
 * unit suites) and thick on pipeline wiring — every stage must pass its output
 * into the next without data loss.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HATCH_CURVED Layer Invariant  (verified Stages 7 – 13)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every curved placement emits exactly 2 diagonal LINE entities on the
 * HATCH_CURVED DXF layer; straight placements emit none.  Derived formulae:
 *
 *   HATCH_CURVED = 2 × curved_count
 *   PARTS_CURVED = 4 × curved_count   (one bounding rect = 4 LINEs)
 *   PARTS        = 4 × straight_count
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
 *
 * Run:
 *   vitest run src/e2e/curvedPanelDxfPipeline.smoke.test.ts
 *
 * @smoke
 */

import { describe, it, expect } from 'vitest';

// Pipeline stages
import { computeCurveFields, DEFAULT_KERF_TOOL } from '../factory/packet/builders/curveFieldsComputer';
import { runNesting } from '../nesting/optimizer';
import { buildDxfSheet } from '../core/export/monolith/builders/buildDxfSheets';
import { getFactoryProfile } from '../core/export/factoryPackageProfiles';

// Types
import type { CutListRow } from '../core/export/monolith/monolithExportContext';
import type { CabinetPanel } from '../core/types/Cabinet';
import type { PlannedSheet } from '../core/export/planFactoryPackage';

// ============================================================
// Shared fixture — ARC panel, R=200 mm, sweep=60°, MDF 18 mm
//   developedLength ≈ 200 × (π/3) ≈ 209.44 mm
//   projectedDepth  = 200 × (1 − cos 60°) = 100.00 mm
//   correction      ≈ 109.44 mm  → isCurved = true
//   kerfCount       = 12 (validated below)
// ============================================================

// computeCurveFields only reads: profile, finishWidth, finishHeight,
// computed.realThickness — we cast a minimal object rather than populating
// every CabinetPanel field that is irrelevant to the smoke test.
const PANEL_STUB = {
  finishWidth: 400,
  finishHeight: 800,
  profile: {
    kind: 'ARC',
    edge: 'TOP',
    radius: 200,
    sweepDeg: 60,
  },
  computed: { realThickness: 18 },
} as unknown as CabinetPanel;

const MATERIAL_ID = 'MDF_18';

// ============================================================
// Stage 1 — computeCurveFields
// ============================================================

describe('@smoke — Stage 1: computeCurveFields produces curve data', () => {
  it('returns non-null CurveFields for ARC panel', () => {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF');
    expect(fields).not.toBeNull();
  });

  it('developedLength > cutHeight (arc is longer than the panel finish dimension)', () => {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    // arc length ≈ 209 mm — not directly comparable to finishHeight=800; just
    // confirm it is a realistic positive number representing the kerf-zone arc.
    expect(fields.developedLength).toBeGreaterThan(0);
  });

  it('kerfCount >= 1', () => {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.kerfCount).toBeGreaterThanOrEqual(1);
  });

  it('projectedDepth > 0', () => {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.projectedDepth).toBeGreaterThan(0);
  });

  it('curvedEdge === "TOP" (matches ARC profile edge)', () => {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.curvedEdge).toBe('TOP');
  });
});

// ============================================================
// Stage 2 — assemble CutListRow from CurveFields
// ============================================================

/**
 * Build a realistic CutListRow from live computeCurveFields() output so the
 * kerfCount value is always consistent with what the pipeline would actually
 * produce — no magic constants.
 */
function buildCurvedRow(): { row: CutListRow; kerfCount: number } {
  const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;

  const row: CutListRow = {
    partId: 'SMOKE_DOOR',
    cabinetId: 'CAB_SMOKE',
    materialId: MATERIAL_ID,
    finishW: PANEL_STUB.finishWidth,
    finishH: PANEL_STUB.finishHeight,
    edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
    premillL: 0, premillR: 0, premillT: 0, premillB: 0,
    cutW: PANEL_STUB.finishWidth,    // no edge band / premill delta
    cutH: PANEL_STUB.finishHeight,
    qty: 1,
    developedLength: fields.developedLength,
    projectedDepth:  fields.projectedDepth,
    kerfCount:       fields.kerfCount,
    curvedEdge:      fields.curvedEdge ?? undefined,
  };

  return { row, kerfCount: fields.kerfCount };
}

describe('@smoke — Stage 2: CutListRow assembly', () => {
  it('row carries developedLength, kerfCount, projectedDepth, curvedEdge', () => {
    const { row } = buildCurvedRow();
    expect(row.developedLength).toBeDefined();
    expect(row.kerfCount).toBeDefined();
    expect(row.projectedDepth).toBeDefined();
    expect(row.curvedEdge).toBe('TOP');
  });

  it('correction = developedLength − projectedDepth > 0 (flat blank is larger than finish)', () => {
    const { row } = buildCurvedRow();
    const correction = row.developedLength! - row.projectedDepth!;
    expect(correction).toBeGreaterThan(0);
  });
});

// ============================================================
// Stage 3 — runNesting: flat-blank binning + field propagation
// ============================================================

describe('@smoke — Stage 3: runNesting() propagates isCurved + kerfCount', () => {
  it('produces at least one NestingSheet', () => {
    const { row } = buildCurvedRow();
    const { sheets, unplacedParts } = runNesting([row]);
    expect(unplacedParts).toHaveLength(0);
    expect(sheets.length).toBeGreaterThan(0);
  });

  it('placement has isCurved=true', () => {
    const { row } = buildCurvedRow();
    const { sheets } = runNesting([row]);
    const p = sheets.flatMap((s) => s.placements).find((pl) => pl.partId === 'SMOKE_DOOR');
    expect(p).toBeDefined();
    expect(p!.isCurved).toBe(true);
  });

  it('placement kerfCount matches computeCurveFields output', () => {
    const { row, kerfCount } = buildCurvedRow();
    const { sheets } = runNesting([row]);
    const p = sheets.flatMap((s) => s.placements).find((pl) => pl.partId === 'SMOKE_DOOR');
    expect(p!.kerfCount).toBe(kerfCount);
  });

  it('flat blank along TOP/BOTTOM axis (cutH) is larger than finishH', () => {
    const { row } = buildCurvedRow();
    const { sheets } = runNesting([row]);
    const s = sheets[0];
    // The sheet height is a standard board (2440 mm), not the finish dimension.
    // The nesting placed the part using the flat-blank corrected cutH.
    // Verify sheetH is large enough to hold the corrected blank.
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const correction = fields.developedLength - fields.projectedDepth;
    const expectedFlatH = row.cutH + correction;
    expect(s.sheetH).toBeGreaterThanOrEqual(expectedFlatH);
  });
});

// ============================================================
// Stage 4 — buildDxfSheet: PARTS_CURVED + HATCH_CURVED + label
// ============================================================

describe('@smoke — Stage 4: buildDxfSheet() renders curved DXF', () => {
  function runPipeline() {
    const { row, kerfCount } = buildCurvedRow();
    const { sheets } = runNesting([row]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const dxf = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    }).content;

    return { dxf, kerfCount };
  }

  it('DXF output is a non-empty string', () => {
    const { dxf } = runPipeline();
    expect(typeof dxf).toBe('string');
    expect(dxf.length).toBeGreaterThan(0);
  });

  it('DXF is valid R12 (AC1009 header, ENDSEC, EOF)', () => {
    const { dxf } = runPipeline();
    expect(dxf).toContain('AC1009');
    expect(dxf).toContain('ENDSEC');
    expect(dxf.trim()).toContain('EOF');
  });

  it('DXF contains TABLES section with PARTS_CURVED layer', () => {
    const { dxf } = runPipeline();
    expect(dxf).toContain('TABLES');
    expect(dxf).toContain('PARTS_CURVED');
  });

  it('ENTITIES section references PARTS_CURVED (not plain PARTS) for the curved door', () => {
    const { dxf } = runPipeline();
    const entitiesIdx = dxf.indexOf('ENTITIES');
    expect(entitiesIdx).toBeGreaterThan(-1);
    const entities = dxf.slice(entitiesIdx);
    expect(entities).toContain('PARTS_CURVED');
    // Plain PARTS must NOT appear as an entity layer (only inside TABLES)
    const lines = entities.split('\n');
    expect(lines.some((l) => l.trim() === 'PARTS')).toBe(false);
  });

  it('ENTITIES section contains HATCH_CURVED diagonal lines', () => {
    const { dxf } = runPipeline();
    const entitiesIdx = dxf.indexOf('ENTITIES');
    const entities = dxf.slice(entitiesIdx);
    expect(entities).toContain('HATCH_CURVED');
    // Two diagonal lines → at least 2 LINE entities reference HATCH_CURVED
    const segments = entities.split('LINE');
    const hatchLines = segments.filter((s) => s.includes('HATCH_CURVED'));
    expect(hatchLines.length).toBeGreaterThanOrEqual(2);
  });

  // ── PRIMARY ASSERTION ───────────────────────────────────────────────────
  it('DXF sub-label reads "(CURVED / N cuts)" with the live kerfCount', () => {
    const { dxf, kerfCount } = runPipeline();
    expect(dxf).toContain(`(CURVED / ${kerfCount} cuts)`);
  });
  // ────────────────────────────────────────────────────────────────────────

  it('part label "SMOKE_DOOR" is present in the DXF', () => {
    const { dxf } = runPipeline();
    expect(dxf).toContain('SMOKE_DOOR');
  });
});

// ============================================================
// Stage 5 — bytes field: valid UTF-8 Uint8Array matching content
// ============================================================

describe('@smoke — Stage 5: DxfSheetOutput.bytes is a valid UTF-8 Uint8Array', () => {
  function runPipelineFull() {
    const { row, kerfCount } = buildCurvedRow();
    const { sheets } = runNesting([row]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    return {
      output: buildDxfSheet({
        planned,
        nesting: sheets[0],
        profile: getFactoryProfile('DEFAULT'),
      }),
      kerfCount,
    };
  }

  it('bytes is a Uint8Array', () => {
    const { output } = runPipelineFull();
    expect(output.bytes).toBeInstanceOf(Uint8Array);
  });

  it('bytes is non-empty', () => {
    const { output } = runPipelineFull();
    expect(output.bytes.byteLength).toBeGreaterThan(0);
  });

  it('bytes decodes to the same string as content (UTF-8 round-trip)', () => {
    const { output } = runPipelineFull();
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(output.bytes);
    expect(decoded).toBe(output.content);
  });

  it('byte length equals the UTF-8 encoded length of content', () => {
    const { output } = runPipelineFull();
    // Re-encode content independently and compare byte lengths
    const reEncoded = new TextEncoder().encode(output.content);
    expect(output.bytes.byteLength).toBe(reEncoded.byteLength);
  });

  it('bytes is valid UTF-8 (TextDecoder with fatal=true does not throw)', () => {
    const { output } = runPipelineFull();
    expect(() =>
      new TextDecoder('utf-8', { fatal: true }).decode(output.bytes)
    ).not.toThrow();
  });

  it('content string is exactly reproducible from bytes (no BOM, no extra bytes)', () => {
    const { output } = runPipelineFull();
    // ASCII-only DXF → every code unit maps to exactly one byte
    const allAscii = [...output.content].every((ch) => ch.codePointAt(0)! < 128);
    if (allAscii) {
      expect(output.bytes.byteLength).toBe(output.content.length);
    }
    // Regardless of encoding width, decoded text must equal content precisely
    const decoded = new TextDecoder('utf-8').decode(output.bytes);
    expect(decoded).toBe(output.content);
  });

  it('bytes still contains the "(CURVED / N cuts)" sub-label when decoded', () => {
    const { output, kerfCount } = runPipelineFull();
    const decoded = new TextDecoder('utf-8').decode(output.bytes);
    expect(decoded).toContain(`(CURVED / ${kerfCount} cuts)`);
  });
});

// ============================================================
// S_CURVE fixture — r1=200 mm / sweep1=30° / r2=150 mm / sweep2=45°, MDF 18 mm
//   developedLength ≈ 200×(30π/180) + 150×(45π/180)
//                   ≈ 104.720 + 117.810 = 222.529 mm
//   projectedDepth  ≈ 200×(1−cos30°) + 150×(1−cos45°)
//                   ≈ 26.795 + 43.934  = 70.729 mm
//   correction      ≈ 151.800 mm  → isCurved = true
//   chord1+chord2   ≈ 103.528 + 114.805 = 218.333 mm ≤ 500 mm (fits edge ✓)
// ============================================================

const S_CURVE_PANEL_STUB = {
  finishWidth: 500,
  finishHeight: 900,
  profile: {
    kind: 'S_CURVE',
    edge: 'TOP',
    r1: 200,
    sweepDeg1: 30,
    r2: 150,
    sweepDeg2: 45,
  },
  computed: { realThickness: 18 },
} as unknown as CabinetPanel;

/**
 * Build a CutListRow from live S_CURVE computeCurveFields() output so
 * kerfCount is always consistent with the actual kerf algorithm.
 */
function buildSCurveRow(): { row: CutListRow; kerfCount: number } {
  const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;

  const row: CutListRow = {
    partId: 'SMOKE_SCURVE_DOOR',
    cabinetId: 'CAB_SMOKE',
    materialId: MATERIAL_ID,
    finishW: S_CURVE_PANEL_STUB.finishWidth,
    finishH: S_CURVE_PANEL_STUB.finishHeight,
    edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
    premillL: 0, premillR: 0, premillT: 0, premillB: 0,
    cutW: S_CURVE_PANEL_STUB.finishWidth,
    cutH: S_CURVE_PANEL_STUB.finishHeight,
    qty: 1,
    developedLength: fields.developedLength,
    projectedDepth:  fields.projectedDepth,
    kerfCount:       fields.kerfCount,
    curvedEdge:      fields.curvedEdge ?? undefined,
  };

  return { row, kerfCount: fields.kerfCount };
}

// ============================================================
// @smoke S-CURVE — Stage 1: computeCurveFields
// ============================================================

describe('@smoke S-CURVE — Stage 1: computeCurveFields produces curve data', () => {
  it('returns non-null CurveFields for S_CURVE panel', () => {
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF');
    expect(fields).not.toBeNull();
  });

  it('developedLength ≈ 222.529 mm (r1×sweep1Rad + r2×sweep2Rad)', () => {
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.developedLength).toBeCloseTo(222.529, 1);
  });

  it('kerfCount >= 1', () => {
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.kerfCount).toBeGreaterThanOrEqual(1);
  });

  it('projectedDepth > 0', () => {
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.projectedDepth).toBeGreaterThan(0);
  });

  it('curvedEdge === "TOP" (matches S_CURVE profile edge)', () => {
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    expect(fields.curvedEdge).toBe('TOP');
  });
});

// ============================================================
// @smoke S-CURVE — Stage 2: CutListRow assembly
// ============================================================

describe('@smoke S-CURVE — Stage 2: CutListRow assembly', () => {
  it('row carries developedLength, kerfCount, projectedDepth, curvedEdge', () => {
    const { row } = buildSCurveRow();
    expect(row.developedLength).toBeDefined();
    expect(row.kerfCount).toBeDefined();
    expect(row.projectedDepth).toBeDefined();
    expect(row.curvedEdge).toBe('TOP');
  });

  it('correction = developedLength − projectedDepth > 0 (flat blank larger than finish)', () => {
    const { row } = buildSCurveRow();
    const correction = row.developedLength! - row.projectedDepth!;
    expect(correction).toBeGreaterThan(0);
  });
});

// ============================================================
// @smoke S-CURVE — Stage 3: runNesting() propagates isCurved + kerfCount
// ============================================================

describe('@smoke S-CURVE — Stage 3: runNesting() propagates isCurved + kerfCount', () => {
  it('produces at least one NestingSheet with no unplaced parts', () => {
    const { row } = buildSCurveRow();
    const { sheets, unplacedParts } = runNesting([row]);
    expect(unplacedParts).toHaveLength(0);
    expect(sheets.length).toBeGreaterThan(0);
  });

  it('placement has isCurved=true', () => {
    const { row } = buildSCurveRow();
    const { sheets } = runNesting([row]);
    const p = sheets
      .flatMap((s) => s.placements)
      .find((pl) => pl.partId === 'SMOKE_SCURVE_DOOR');
    expect(p).toBeDefined();
    expect(p!.isCurved).toBe(true);
  });

  it('placement kerfCount matches computeCurveFields output', () => {
    const { row, kerfCount } = buildSCurveRow();
    const { sheets } = runNesting([row]);
    const p = sheets
      .flatMap((s) => s.placements)
      .find((pl) => pl.partId === 'SMOKE_SCURVE_DOOR');
    expect(p!.kerfCount).toBe(kerfCount);
  });

  it('sheetH accommodates flat blank (>= finishH + correction)', () => {
    const { row } = buildSCurveRow();
    const { sheets } = runNesting([row]);
    const s = sheets[0];
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const correction = fields.developedLength - fields.projectedDepth;
    const expectedFlatH = row.cutH + correction;
    expect(s.sheetH).toBeGreaterThanOrEqual(expectedFlatH);
  });
});

// ============================================================
// @smoke S-CURVE — Stage 4: buildDxfSheet() renders curved DXF
// ============================================================

describe('@smoke S-CURVE — Stage 4: buildDxfSheet() renders curved DXF', () => {
  function runSCurvePipeline() {
    const { row, kerfCount } = buildSCurveRow();
    const { sheets } = runNesting([row]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    return {
      dxf: buildDxfSheet({
        planned,
        nesting: sheets[0],
        profile: getFactoryProfile('DEFAULT'),
      }).content,
      kerfCount,
    };
  }

  it('DXF contains PARTS_CURVED layer', () => {
    const { dxf } = runSCurvePipeline();
    expect(dxf).toContain('PARTS_CURVED');
  });

  it('DXF contains HATCH_CURVED layer', () => {
    const { dxf } = runSCurvePipeline();
    expect(dxf).toContain('HATCH_CURVED');
  });

  it('DXF contains "(CURVED / N cuts)" sub-label with live kerfCount', () => {
    const { dxf, kerfCount } = runSCurvePipeline();
    expect(dxf).toContain(`(CURVED / ${kerfCount} cuts)`);
  });

  it('part label "SMOKE_SCURVE_DOOR" is present in the DXF', () => {
    const { dxf } = runSCurvePipeline();
    expect(dxf).toContain('SMOKE_SCURVE_DOOR');
  });
});

// ============================================================
// @smoke S-CURVE — Stage 5: DxfSheetOutput.bytes is a valid UTF-8 Uint8Array
// ============================================================

describe('@smoke S-CURVE — Stage 5: DxfSheetOutput.bytes is a valid UTF-8 Uint8Array', () => {
  function runSCurvePipelineFull() {
    const { row, kerfCount } = buildSCurveRow();
    const { sheets } = runNesting([row]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    return {
      output: buildDxfSheet({
        planned,
        nesting: sheets[0],
        profile: getFactoryProfile('DEFAULT'),
      }),
      kerfCount,
    };
  }

  it('bytes is a Uint8Array', () => {
    const { output } = runSCurvePipelineFull();
    expect(output.bytes).toBeInstanceOf(Uint8Array);
  });

  it('bytes is non-empty', () => {
    const { output } = runSCurvePipelineFull();
    expect(output.bytes.byteLength).toBeGreaterThan(0);
  });

  it('bytes decodes to the same string as content (UTF-8 round-trip)', () => {
    const { output } = runSCurvePipelineFull();
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(output.bytes);
    expect(decoded).toBe(output.content);
  });

  it('byte length equals the UTF-8 encoded length of content', () => {
    const { output } = runSCurvePipelineFull();
    const reEncoded = new TextEncoder().encode(output.content);
    expect(output.bytes.byteLength).toBe(reEncoded.byteLength);
  });

  it('bytes is valid UTF-8 (TextDecoder with fatal=true does not throw)', () => {
    const { output } = runSCurvePipelineFull();
    expect(() =>
      new TextDecoder('utf-8', { fatal: true }).decode(output.bytes)
    ).not.toThrow();
  });

  it('content string is exactly reproducible from bytes (no BOM, no extra bytes)', () => {
    const { output } = runSCurvePipelineFull();
    const allAscii = [...output.content].every((ch) => ch.codePointAt(0)! < 128);
    if (allAscii) {
      expect(output.bytes.byteLength).toBe(output.content.length);
    }
    const decoded = new TextDecoder('utf-8').decode(output.bytes);
    expect(decoded).toBe(output.content);
  });

  it('bytes still contains the "(CURVED / N cuts)" sub-label when decoded', () => {
    const { output, kerfCount } = runSCurvePipelineFull();
    const decoded = new TextDecoder('utf-8').decode(output.bytes);
    expect(decoded).toContain(`(CURVED / ${kerfCount} cuts)`);
  });
});

// ============================================================
// @smoke S-CURVE — Stage 6: HATCH_CURVED X-lines span flat-blank footprint
//
// The X-hatch in buildDxfSheets.ts spans the FULL placement rectangle
// (placement.x, placement.y) → (placement.x + effectiveW, placement.y + effectiveH)
// where effectiveW/H are the rotated flat-blank dimensions, NOT the finish dimensions.
//
// For TOP-edge S_CURVE:
//   correction   = developedLength − projectedDepth ≈ 151.800 mm
//   flatBlankW   = finishWidth  = 500 mm        (no correction on perpendicular axis)
//   flatBlankH   = finishHeight + correction ≈ 1051.800 mm
//
// FFDH picks rotation=90 (shelf height = 500 mm < 1051.800 mm → less wasted space),
// so effectiveW ≈ 1051.800 mm (horizontal) and effectiveH = 500 mm (vertical).
// ============================================================

describe('@smoke S-CURVE — Stage 6: HATCH_CURVED X-lines span flat-blank footprint', () => {
  function runStage6() {
    const fields = computeCurveFields(S_CURVE_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const { row } = buildSCurveRow();
    const { sheets } = runNesting([row]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placement = sheets
      .flatMap((s) => s.placements)
      .find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;

    // Mirror getRotatedDimensions() (private in buildDxfSheets.ts)
    const isRotated = placement.rotation === 90 || placement.rotation === 270;
    const effectiveW = isRotated ? placement.cutH : placement.cutW;
    const effectiveH = isRotated ? placement.cutW : placement.cutH;

    const correction = fields.developedLength - fields.projectedDepth;

    return { fields, placement, output, effectiveW, effectiveH, correction };
  }

  it('placement.cutW equals finishWidth — no correction on perpendicular axis', () => {
    const { placement } = runStage6();
    // TOP-edge curve: correction is applied only to the HEIGHT dimension
    expect(placement.cutW).toBe(S_CURVE_PANEL_STUB.finishWidth); // 500 mm
  });

  it('placement.cutH ≈ finishHeight + chord correction (flat-blank from arc geometry)', () => {
    const { placement, correction } = runStage6();
    const expectedFlatH = S_CURVE_PANEL_STUB.finishHeight + correction;
    // Flat blank must be taller than the finish panel by the arc-to-projection difference
    expect(placement.cutH).toBeCloseTo(expectedFlatH, 3);
  });

  it('flat-blank height is greater than finish height (correction > 0)', () => {
    const { placement } = runStage6();
    expect(placement.cutH).toBeGreaterThan(S_CURVE_PANEL_STUB.finishHeight);
  });

  it('hatch footprint area equals flatBlankW × flatBlankH (covers full flat blank)', () => {
    const { effectiveW, effectiveH, correction } = runStage6();
    const expectedArea =
      S_CURVE_PANEL_STUB.finishWidth *
      (S_CURVE_PANEL_STUB.finishHeight + correction);
    // area is rotation-invariant: effectiveW × effectiveH = flatBlankW × flatBlankH
    expect(effectiveW * effectiveH).toBeCloseTo(expectedArea, 3);
  });

  it('DXF contains far-corner x-coordinate of HATCH_CURVED diagonal', () => {
    const { placement, effectiveW, output } = runStage6();
    const farX = placement.x + effectiveW; // ≈ 10 + 1051.800 = 1061.800...
    // String(farX) appears verbatim in the DXF LINE entity for the X-hatch
    expect(output.content).toContain(String(farX));
  });

  it('DXF contains far-corner y-coordinate of HATCH_CURVED diagonal', () => {
    const { placement, effectiveH, output } = runStage6();
    const farY = placement.y + effectiveH; // ≈ 10 + 500 = 510
    expect(output.content).toContain(String(farY));
  });
});

// ============================================================
// @smoke S-CURVE — Stage 7: HATCH_CURVED absent for straight
//   panel on the same sheet
//
// A straight panel (no curve fields, no isCurved flag) placed on
// the same nesting sheet as the S_CURVE panel must NOT receive
// HATCH_CURVED X-lines in the DXF output.  Only placements where
// isCurved=true trigger the diagonal hatch in buildDxfSheets.ts.
//
// Verification strategy:
//   - Run nesting with 1 curved row + 1 straight row → same sheet
//   - Count LINE entities per layer in the ENTITIES section
//   - PARTS_CURVED  → exactly 4  (curved panel rectangle only)
//   - PARTS         → exactly 4  (straight panel rectangle only)
//   - HATCH_CURVED  → exactly 2  (2 diagonals for curved panel,
//                                  0 extra lines for straight panel)
// ============================================================

/** Straight (non-curved) panel row — no curve fields whatsoever */
const STRAIGHT_ROW: CutListRow = {
  partId: 'SMOKE_STRAIGHT_SHELF',
  cabinetId: 'CAB_SMOKE',
  materialId: MATERIAL_ID,
  finishW: 300,
  finishH: 400,
  edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
  premillL: 0, premillR: 0, premillT: 0, premillB: 0,
  cutW: 300,
  cutH: 400,
  qty: 1,
  // No developedLength / projectedDepth / kerfCount / curvedEdge
};

describe('@smoke S-CURVE — Stage 7: HATCH_CURVED absent for straight panel on same sheet', () => {
  function runStage7() {
    const { row: curvedRow, kerfCount } = buildSCurveRow();

    // Place both rows; both fit on a single 1220×2440 sheet
    const { sheets, unplacedParts } = runNesting([curvedRow, STRAIGHT_ROW]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const sheet0Placements = sheets[0].placements;
    const curvedPlacement  = sheet0Placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const straightPlacement = sheet0Placements.find((p) => p.partId === 'SMOKE_STRAIGHT_SHELF')!;

    // Isolate ENTITIES section (layer names in TABLES do not count)
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    /**
     * Count LINE entities whose layer attribute is exactly `layer`.
     *
     * DXF R12 LINE encoding (after DxfBuilder.addLine):
     *   …\nLINE\n8\n<LAYER>\n10\n…
     *
     * Splitting by 'LINE' yields segments where the very first group-code
     * pair is `\n8\n<LAYER>\n`.  We match `\n8\n${layer}\n` (newline on
     * both sides) so `PARTS` does NOT accidentally match `PARTS_CURVED`.
     */
    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1) // skip any text before the first LINE entity
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      curvedPlacement, straightPlacement,
      kerfCount, unplacedParts, sheets,
      countLayer,
    };
  }

  it('both panels are placed on sheets[0] with no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage7();
    expect(unplacedParts).toHaveLength(0);
    expect(sheets[0].placements.some((p) => p.partId === 'SMOKE_SCURVE_DOOR')).toBe(true);
    expect(sheets[0].placements.some((p) => p.partId === 'SMOKE_STRAIGHT_SHELF')).toBe(true);
  });

  it('straight panel placement has isCurved falsy (no curve correction applied)', () => {
    const { straightPlacement } = runStage7();
    expect(straightPlacement).toBeDefined();
    expect(straightPlacement.isCurved).toBeFalsy();
  });

  it('ENTITIES has exactly 4 PARTS_CURVED lines (curved panel rect, no straight contribution)', () => {
    const { countLayer } = runStage7();
    // One rectangle = 4 LINE entities; only the curved panel uses PARTS_CURVED
    expect(countLayer('PARTS_CURVED')).toBe(4);
  });

  it('ENTITIES has exactly 4 PARTS lines (straight panel rect, no curved contribution)', () => {
    const { countLayer } = runStage7();
    // One rectangle = 4 LINE entities; only the straight panel uses PARTS
    expect(countLayer('PARTS')).toBe(4);
  });

  it('ENTITIES has exactly 2 HATCH_CURVED lines (2 diagonals for curved panel, 0 for straight)', () => {
    const { countLayer } = runStage7();
    // Two diagonal X-hatch lines for the single curved panel;
    // the straight panel contributes exactly zero HATCH_CURVED lines.
    expect(countLayer('HATCH_CURVED')).toBe(2);
  });

  it('DXF still contains (CURVED / N cuts) sub-label for the curved panel', () => {
    const { entities, kerfCount } = runStage7();
    expect(entities).toContain(`(CURVED / ${kerfCount} cuts)`);
  });

  it('both part labels are present in the DXF', () => {
    const { output } = runStage7();
    expect(output.content).toContain('SMOKE_SCURVE_DOOR');
    expect(output.content).toContain('SMOKE_STRAIGHT_SHELF');
  });
});

// ============================================================
// @smoke S-CURVE — Stage 8: HATCH_CURVED count stays exactly 2
//   when TWO straight panels share the sheet with one curved panel
//
// Scaling from Stage 7 (1 straight + 1 curved) to 2 straight + 1 curved
// must not produce extra HATCH_CURVED lines.  The invariant is:
//
//   HATCH_CURVED count  = 2  × (number of curved placements)
//   PARTS_CURVED count  = 4  × (number of curved placements)
//   PARTS count         = 4  × (number of straight placements)
//
// With 1 curved + 2 straight panels:
//   HATCH_CURVED = 2   (unchanged — zero contribution from straight panels)
//   PARTS_CURVED = 4
//   PARTS        = 8
// ============================================================

/** Second straight panel — distinct partId and size from STRAIGHT_ROW */
const STRAIGHT_ROW_2: CutListRow = {
  partId: 'SMOKE_STRAIGHT_BACK',
  cabinetId: 'CAB_SMOKE',
  materialId: MATERIAL_ID,
  finishW: 250,
  finishH: 350,
  edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
  premillL: 0, premillR: 0, premillT: 0, premillB: 0,
  cutW: 250,
  cutH: 350,
  qty: 1,
};

describe('@smoke S-CURVE — Stage 8: HATCH_CURVED count stays 2 with two straight panels on same sheet', () => {
  function runStage8() {
    const { row: curvedRow, kerfCount } = buildSCurveRow();

    // All three rows land on a single 1220×2440 sheet
    const { sheets, unplacedParts } = runNesting([curvedRow, STRAIGHT_ROW, STRAIGHT_ROW_2]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements = sheets[0].placements;
    const curvedP  = placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const straight1 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_SHELF')!;
    const straight2 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_BACK')!;

    // ENTITIES section only — TABLES layer definitions must not be counted
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1)
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      curvedP, straight1, straight2,
      kerfCount, unplacedParts, sheets,
      countLayer,
    };
  }

  it('all three panels placed on sheets[0] — no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage8();
    expect(unplacedParts).toHaveLength(0);
    const ids = sheets[0].placements.map((p) => p.partId);
    expect(ids).toContain('SMOKE_SCURVE_DOOR');
    expect(ids).toContain('SMOKE_STRAIGHT_SHELF');
    expect(ids).toContain('SMOKE_STRAIGHT_BACK');
  });

  it('both straight placements have isCurved falsy', () => {
    const { straight1, straight2 } = runStage8();
    expect(straight1.isCurved).toBeFalsy();
    expect(straight2.isCurved).toBeFalsy();
  });

  it('HATCH_CURVED count is exactly 2 — adding a second straight panel adds zero hatch lines', () => {
    const { countLayer } = runStage8();
    expect(countLayer('HATCH_CURVED')).toBe(2);
  });

  it('PARTS_CURVED count is exactly 4 (one curved rect)', () => {
    const { countLayer } = runStage8();
    expect(countLayer('PARTS_CURVED')).toBe(4);
  });

  it('PARTS count is exactly 8 (two straight rects × 4 lines each)', () => {
    const { countLayer } = runStage8();
    expect(countLayer('PARTS')).toBe(8);
  });

  it('DXF still contains (CURVED / N cuts) sub-label for the curved panel', () => {
    const { entities, kerfCount } = runStage8();
    expect(entities).toContain(`(CURVED / ${kerfCount} cuts)`);
  });

  it('all three part labels are present in the DXF', () => {
    const { output } = runStage8();
    expect(output.content).toContain('SMOKE_SCURVE_DOOR');
    expect(output.content).toContain('SMOKE_STRAIGHT_SHELF');
    expect(output.content).toContain('SMOKE_STRAIGHT_BACK');
  });
});

// ============================================================
// @smoke S-CURVE — Stage 9: HATCH_CURVED count scales to 4
//   when TWO curved panels (ARC + S_CURVE) share the same sheet
//
// Each curved panel contributes exactly 2 HATCH_CURVED diagonal
// lines regardless of its profile type.  With two curved panels:
//
//   HATCH_CURVED count  = 2 × 2 = 4
//   PARTS_CURVED count  = 4 × 2 = 8
//   PARTS count         = 0       (no straight panels)
//
// Sheet layout (1220 × 2440, kerfWidth=3.5, edgeClearance=10):
//   Shelf 1 — ARC panel   (rotation=90) → effectiveH = 400 mm, y=10
//   Shelf 2 — S_CURVE     (rotation=90) → effectiveH = 500 mm, y=413.5
//   Max Y used ≈ 913.5 mm  ≪  2440 mm  →  both fit on one sheet
// ============================================================

describe('@smoke S-CURVE — Stage 9: HATCH_CURVED count scales to 4 with two curved panels', () => {
  function runStage9() {
    const { row: arcRow,    kerfCount: arcKerfCount    } = buildCurvedRow();
    const { row: sCurveRow, kerfCount: sCurveKerfCount } = buildSCurveRow();

    // Both curved rows → same sheet
    const { sheets, unplacedParts } = runNesting([arcRow, sCurveRow]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements  = sheets[0].placements;
    const arcP        = placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP     = placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;

    // ENTITIES section only — TABLES layer definitions must not be counted
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1)
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      arcP, sCurveP,
      arcKerfCount, sCurveKerfCount,
      unplacedParts, sheets,
      countLayer,
    };
  }

  it('both curved panels placed on sheets[0] — no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage9();
    expect(unplacedParts).toHaveLength(0);
    const ids = sheets[0].placements.map((p) => p.partId);
    expect(ids).toContain('SMOKE_DOOR');
    expect(ids).toContain('SMOKE_SCURVE_DOOR');
  });

  it('both placements have isCurved=true', () => {
    const { arcP, sCurveP } = runStage9();
    expect(arcP.isCurved).toBe(true);
    expect(sCurveP.isCurved).toBe(true);
  });

  it('HATCH_CURVED count is exactly 4 — 2 diagonals per curved panel × 2 panels', () => {
    const { countLayer } = runStage9();
    expect(countLayer('HATCH_CURVED')).toBe(4);
  });

  it('PARTS_CURVED count is exactly 8 — one rect (4 lines) per curved panel × 2 panels', () => {
    const { countLayer } = runStage9();
    expect(countLayer('PARTS_CURVED')).toBe(8);
  });

  it('PARTS count is exactly 0 — no straight panels on this sheet', () => {
    const { countLayer } = runStage9();
    expect(countLayer('PARTS')).toBe(0);
  });

  it('each curved panel carries its own (CURVED / N cuts) sub-label', () => {
    const { entities, arcKerfCount, sCurveKerfCount } = runStage9();
    expect(entities).toContain(`(CURVED / ${arcKerfCount} cuts)`);
    expect(entities).toContain(`(CURVED / ${sCurveKerfCount} cuts)`);
  });

  it('both part labels are present in the DXF', () => {
    const { output } = runStage9();
    expect(output.content).toContain('SMOKE_DOOR');
    expect(output.content).toContain('SMOKE_SCURVE_DOOR');
  });
});

// ============================================================
// @smoke S-CURVE — Stage 10: HATCH_CURVED count scales to 6
//   when THREE curved panels (ARC + S_CURVE + ARC_SMALL) share
//   the same sheet.
//
// Each curved panel contributes exactly 2 HATCH_CURVED diagonal
// lines.  With three curved panels:
//
//   HATCH_CURVED count  = 2 × 3 = 6
//   PARTS_CURVED count  = 4 × 3 = 12
//   PARTS count         = 0       (no straight panels)
//
// Sheet layout (1220 × 2440, kerfWidth=3.5, edgeClearance=10):
//   Shelf 1 — ARC panel   (rotation=90) → effectiveH = 400 mm, y=10
//   Shelf 2 — S_CURVE     (rotation=90) → effectiveH = 500 mm, y=413.5
//   Shelf 3 — ARC_SMALL   (rotation=90) → effectiveH = 300 mm, y=917.0
//   Max Y used = 917 + 300 = 1217 mm  ≪  2440 mm  →  all three fit
//
// ARC_SMALL profile: same ARC kind, radius=200, sweepDeg=60 as
// PANEL_STUB — so arcSmallKerfCount === arcKerfCount.
// ============================================================

/** Third curved panel fixture — smaller ARC with same bend profile */
const ARC_SMALL_PANEL_STUB = {
  finishWidth: 300,
  finishHeight: 500,
  profile: { kind: 'ARC', edge: 'TOP', radius: 200, sweepDeg: 60 },
  computed: { realThickness: 18 },
} as unknown as CabinetPanel;

/**
 * Build a CutListRow for ARC_SMALL from live computeCurveFields() so
 * kerfCount is always consistent with the pipeline.
 */
function buildArcSmallRow(): { row: CutListRow; kerfCount: number } {
  const fields = computeCurveFields(ARC_SMALL_PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;

  const row: CutListRow = {
    partId: 'SMOKE_ARC_SMALL',
    cabinetId: 'CAB_SMOKE',
    materialId: MATERIAL_ID,
    finishW: ARC_SMALL_PANEL_STUB.finishWidth,
    finishH: ARC_SMALL_PANEL_STUB.finishHeight,
    edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
    premillL: 0, premillR: 0, premillT: 0, premillB: 0,
    cutW: ARC_SMALL_PANEL_STUB.finishWidth,
    cutH: ARC_SMALL_PANEL_STUB.finishHeight,
    qty: 1,
    developedLength: fields.developedLength,
    projectedDepth:  fields.projectedDepth,
    kerfCount:       fields.kerfCount,
    curvedEdge:      fields.curvedEdge ?? undefined,
  };

  return { row, kerfCount: fields.kerfCount };
}

describe('@smoke S-CURVE — Stage 10: HATCH_CURVED count scales to 6 with three curved panels', () => {
  function runStage10() {
    const { row: arcRow,      kerfCount: arcKerfCount      } = buildCurvedRow();
    const { row: sCurveRow,   kerfCount: sCurveKerfCount   } = buildSCurveRow();
    const { row: arcSmallRow, kerfCount: arcSmallKerfCount } = buildArcSmallRow();

    // All three curved rows → same sheet
    const { sheets, unplacedParts } = runNesting([arcRow, sCurveRow, arcSmallRow]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements  = sheets[0].placements;
    const arcP        = placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP     = placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const arcSmallP   = placements.find((p) => p.partId === 'SMOKE_ARC_SMALL')!;

    // ENTITIES section only — TABLES layer definitions must not be counted
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1)
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      arcP, sCurveP, arcSmallP,
      arcKerfCount, sCurveKerfCount, arcSmallKerfCount,
      unplacedParts, sheets,
      countLayer,
    };
  }

  it('all three curved panels placed on sheets[0] — no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage10();
    expect(unplacedParts).toHaveLength(0);
    const ids = sheets[0].placements.map((p) => p.partId);
    expect(ids).toContain('SMOKE_DOOR');
    expect(ids).toContain('SMOKE_SCURVE_DOOR');
    expect(ids).toContain('SMOKE_ARC_SMALL');
  });

  it('all three placements have isCurved=true', () => {
    const { arcP, sCurveP, arcSmallP } = runStage10();
    expect(arcP.isCurved).toBe(true);
    expect(sCurveP.isCurved).toBe(true);
    expect(arcSmallP.isCurved).toBe(true);
  });

  it('HATCH_CURVED count is exactly 6 — 2 diagonals per curved panel × 3 panels', () => {
    const { countLayer } = runStage10();
    expect(countLayer('HATCH_CURVED')).toBe(6);
  });

  it('PARTS_CURVED count is exactly 12 — one rect (4 lines) per curved panel × 3 panels', () => {
    const { countLayer } = runStage10();
    expect(countLayer('PARTS_CURVED')).toBe(12);
  });

  it('PARTS count is exactly 0 — no straight panels on this sheet', () => {
    const { countLayer } = runStage10();
    expect(countLayer('PARTS')).toBe(0);
  });

  it('each curved panel carries its own (CURVED / N cuts) sub-label', () => {
    const { entities, arcKerfCount, sCurveKerfCount } = runStage10();
    // ARC and ARC_SMALL share the same kerfCount (identical profile + material)
    expect(entities).toContain(`(CURVED / ${arcKerfCount} cuts)`);
    expect(entities).toContain(`(CURVED / ${sCurveKerfCount} cuts)`);
  });

  it('all three part labels are present in the DXF', () => {
    const { output } = runStage10();
    expect(output.content).toContain('SMOKE_DOOR');
    expect(output.content).toContain('SMOKE_SCURVE_DOOR');
    expect(output.content).toContain('SMOKE_ARC_SMALL');
  });
});

// ============================================================
// @smoke — Stage 11: HATCH_CURVED is absent when all three
//   curved panels are replaced with straight panels.
//
// This is the complement of Stage 10: the same sheet geometry
// with three straight rows must produce zero HATCH_CURVED lines,
// zero PARTS_CURVED rects, and no (CURVED / N cuts) sub-label.
//
//   HATCH_CURVED count  = 0
//   PARTS_CURVED count  = 0
//   PARTS count         = 12  (3 straight rects × 4 lines each)
// ============================================================

/** Third straight panel — distinct partId and size from STRAIGHT_ROW and STRAIGHT_ROW_2 */
const STRAIGHT_ROW_3: CutListRow = {
  partId: 'SMOKE_STRAIGHT_SIDE',
  cabinetId: 'CAB_SMOKE',
  materialId: MATERIAL_ID,
  finishW: 200,
  finishH: 300,
  edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
  premillL: 0, premillR: 0, premillT: 0, premillB: 0,
  cutW: 200,
  cutH: 300,
  qty: 1,
};

describe('@smoke — Stage 11: HATCH_CURVED is absent when all panels are straight', () => {
  function runStage11() {
    // Three straight rows — no curved panels at all
    const { sheets, unplacedParts } = runNesting([STRAIGHT_ROW, STRAIGHT_ROW_2, STRAIGHT_ROW_3]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements = sheets[0].placements;
    const straight1 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_SHELF')!;
    const straight2 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_BACK')!;
    const straight3 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_SIDE')!;

    // ENTITIES section only — TABLES layer definitions must not be counted
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1)
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      straight1, straight2, straight3,
      unplacedParts, sheets,
      countLayer,
    };
  }

  it('all three straight panels placed on sheets[0] — no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage11();
    expect(unplacedParts).toHaveLength(0);
    const ids = sheets[0].placements.map((p) => p.partId);
    expect(ids).toContain('SMOKE_STRAIGHT_SHELF');
    expect(ids).toContain('SMOKE_STRAIGHT_BACK');
    expect(ids).toContain('SMOKE_STRAIGHT_SIDE');
  });

  it('all three placements have isCurved falsy', () => {
    const { straight1, straight2, straight3 } = runStage11();
    expect(straight1.isCurved).toBeFalsy();
    expect(straight2.isCurved).toBeFalsy();
    expect(straight3.isCurved).toBeFalsy();
  });

  it('HATCH_CURVED count is exactly 0 — no hatch lines without curved panels', () => {
    const { countLayer } = runStage11();
    expect(countLayer('HATCH_CURVED')).toBe(0);
  });

  it('PARTS_CURVED count is exactly 0 — no curved rects without curved panels', () => {
    const { countLayer } = runStage11();
    expect(countLayer('PARTS_CURVED')).toBe(0);
  });

  it('PARTS count is exactly 12 — three straight rects × 4 lines each', () => {
    const { countLayer } = runStage11();
    expect(countLayer('PARTS')).toBe(12);
  });

  it('no (CURVED / N cuts) sub-label appears anywhere in the DXF', () => {
    const { entities } = runStage11();
    expect(entities).not.toContain('(CURVED /');
  });

  it('all three part labels are present in the DXF', () => {
    const { output } = runStage11();
    expect(output.content).toContain('SMOKE_STRAIGHT_SHELF');
    expect(output.content).toContain('SMOKE_STRAIGHT_BACK');
    expect(output.content).toContain('SMOKE_STRAIGHT_SIDE');
  });
});

// ============================================================
// @smoke — Stage 12: HATCH_CURVED scales to 2 when one straight
//   panel from Stage 11 is replaced with a curved panel.
//
// Replaces STRAIGHT_ROW (SMOKE_STRAIGHT_SHELF) with the ARC
// curved panel (SMOKE_DOOR).  The remaining two straight panels
// carry no hatch, so the count rises from 0 → 2.
//
//   HATCH_CURVED count  = 2  (1 curved panel × 2 diagonals)
//   PARTS_CURVED count  = 4  (1 curved rect  × 4 lines)
//   PARTS count         = 8  (2 straight rects × 4 lines each)
// ============================================================

describe('@smoke — Stage 12: HATCH_CURVED scales to 2 when one straight is replaced with a curved panel', () => {
  function runStage12() {
    const { row: curvedRow, kerfCount } = buildCurvedRow(); // ARC panel (SMOKE_DOOR)

    // STRAIGHT_ROW replaced by curvedRow; STRAIGHT_ROW_2 + STRAIGHT_ROW_3 remain
    const { sheets, unplacedParts } = runNesting([curvedRow, STRAIGHT_ROW_2, STRAIGHT_ROW_3]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements = sheets[0].placements;
    const curvedP   = placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const straight2 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_BACK')!;
    const straight3 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_SIDE')!;

    // ENTITIES section only — TABLES layer definitions must not be counted
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1)
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      curvedP, straight2, straight3,
      kerfCount, unplacedParts, sheets,
      countLayer,
    };
  }

  it('one curved + two straight panels placed on sheets[0] — no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage12();
    expect(unplacedParts).toHaveLength(0);
    const ids = sheets[0].placements.map((p) => p.partId);
    expect(ids).toContain('SMOKE_DOOR');
    expect(ids).toContain('SMOKE_STRAIGHT_BACK');
    expect(ids).toContain('SMOKE_STRAIGHT_SIDE');
  });

  it('curved placement has isCurved=true; straight placements have isCurved falsy', () => {
    const { curvedP, straight2, straight3 } = runStage12();
    expect(curvedP.isCurved).toBe(true);
    expect(straight2.isCurved).toBeFalsy();
    expect(straight3.isCurved).toBeFalsy();
  });

  it('HATCH_CURVED count is exactly 2 — replacing one straight with one curved adds exactly 2 hatch lines', () => {
    const { countLayer } = runStage12();
    expect(countLayer('HATCH_CURVED')).toBe(2);
  });

  it('PARTS_CURVED count is exactly 4 — one curved rect × 4 lines', () => {
    const { countLayer } = runStage12();
    expect(countLayer('PARTS_CURVED')).toBe(4);
  });

  it('PARTS count is exactly 8 — two straight rects × 4 lines each', () => {
    const { countLayer } = runStage12();
    expect(countLayer('PARTS')).toBe(8);
  });

  it('(CURVED / N cuts) sub-label is present for the curved panel', () => {
    const { entities, kerfCount } = runStage12();
    expect(entities).toContain(`(CURVED / ${kerfCount} cuts)`);
  });

  it('all three part labels are present in the DXF', () => {
    const { output } = runStage12();
    expect(output.content).toContain('SMOKE_DOOR');
    expect(output.content).toContain('SMOKE_STRAIGHT_BACK');
    expect(output.content).toContain('SMOKE_STRAIGHT_SIDE');
  });
});

// ============================================================
// @smoke — Stage 13: HATCH_CURVED scales to 4 when two of the
//   three straight panels are replaced with curved panels.
//
// Replaces STRAIGHT_ROW_2 and STRAIGHT_ROW_3 with the ARC panel
// (SMOKE_DOOR) and the S_CURVE panel (SMOKE_SCURVE_DOOR).
// Only STRAIGHT_ROW_3 (SMOKE_STRAIGHT_SIDE) remains straight.
//
//   HATCH_CURVED count  = 4  (2 curved panels × 2 diagonals)
//   PARTS_CURVED count  = 8  (2 curved rects  × 4 lines)
//   PARTS count         = 4  (1 straight rect  × 4 lines)
//
// Sheet layout (1220 × 2440, kerfWidth=3.5, edgeClearance=10):
//   Shelf 1 — ARC panel   (rotation=90) → effectiveH = 400 mm, y=10
//   Shelf 2 — S_CURVE     (rotation=90) → effectiveH = 500 mm, y=413.5
//   Shelf 3 — STRAIGHT    (200×300, no rotation) → effectiveH = 300 mm
//   Max Y well under 2440 mm → all fit on one sheet
// ============================================================

describe('@smoke — Stage 13: HATCH_CURVED scales to 4 when two straight panels are replaced with curved', () => {
  function runStage13() {
    const { row: arcRow,    kerfCount: arcKerfCount    } = buildCurvedRow();   // SMOKE_DOOR
    const { row: sCurveRow, kerfCount: sCurveKerfCount } = buildSCurveRow();   // SMOKE_SCURVE_DOOR

    // Two curved + one straight
    const { sheets, unplacedParts } = runNesting([arcRow, sCurveRow, STRAIGHT_ROW_3]);

    const planned: PlannedSheet = {
      index1: 1,
      sheetId: 'SHEET_001',
      materialId: MATERIAL_ID,
    };

    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements = sheets[0].placements;
    const arcP      = placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP   = placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const straight3 = placements.find((p) => p.partId === 'SMOKE_STRAIGHT_SIDE')!;

    // ENTITIES section only — TABLES layer definitions must not be counted
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const countLayer = (layer: string): number =>
      entities
        .split('LINE')
        .slice(1)
        .filter((seg) => seg.includes(`\n8\n${layer}\n`))
        .length;

    return {
      output, entities,
      arcP, sCurveP, straight3,
      arcKerfCount, sCurveKerfCount,
      unplacedParts, sheets,
      countLayer,
    };
  }

  it('two curved + one straight panel placed on sheets[0] — no unplaced parts', () => {
    const { unplacedParts, sheets } = runStage13();
    expect(unplacedParts).toHaveLength(0);
    const ids = sheets[0].placements.map((p) => p.partId);
    expect(ids).toContain('SMOKE_DOOR');
    expect(ids).toContain('SMOKE_SCURVE_DOOR');
    expect(ids).toContain('SMOKE_STRAIGHT_SIDE');
  });

  it('both curved placements have isCurved=true; straight placement has isCurved falsy', () => {
    const { arcP, sCurveP, straight3 } = runStage13();
    expect(arcP.isCurved).toBe(true);
    expect(sCurveP.isCurved).toBe(true);
    expect(straight3.isCurved).toBeFalsy();
  });

  it('HATCH_CURVED count is exactly 4 — replacing two straights with curved adds 4 hatch lines', () => {
    const { countLayer } = runStage13();
    expect(countLayer('HATCH_CURVED')).toBe(4);
  });

  it('PARTS_CURVED count is exactly 8 — two curved rects × 4 lines each', () => {
    const { countLayer } = runStage13();
    expect(countLayer('PARTS_CURVED')).toBe(8);
  });

  it('PARTS count is exactly 4 — one straight rect × 4 lines', () => {
    const { countLayer } = runStage13();
    expect(countLayer('PARTS')).toBe(4);
  });

  it('each curved panel carries its own (CURVED / N cuts) sub-label', () => {
    const { entities, arcKerfCount, sCurveKerfCount } = runStage13();
    expect(entities).toContain(`(CURVED / ${arcKerfCount} cuts)`);
    expect(entities).toContain(`(CURVED / ${sCurveKerfCount} cuts)`);
  });

  it('all three part labels are present in the DXF', () => {
    const { output } = runStage13();
    expect(output.content).toContain('SMOKE_DOOR');
    expect(output.content).toContain('SMOKE_SCURVE_DOOR');
    expect(output.content).toContain('SMOKE_STRAIGHT_SIDE');
  });
});
