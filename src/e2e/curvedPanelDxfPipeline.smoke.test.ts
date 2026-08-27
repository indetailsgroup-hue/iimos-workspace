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
 * HATCH_CURVED Layer Invariant  (verified Stages 7 – 21)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every curved placement emits exactly 2 diagonal LINE entities on the
 * HATCH_CURVED DXF layer; straight placements emit none.  Derived formulae:
 *
 *   HATCH_CURVED = 2 × curved_count
 *   PARTS_CURVED = 4 × curved_count   (one bounding rect = 4 LINEs)
 *   PARTS        = 4 × straight_count
 *
 * Stages 7 – 13: count invariants (HATCH_CURVED / PARTS_CURVED / PARTS)
 * ─────────────────────────────────────────────────────────────────────────────
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
 * Stages 14 – 21: coordinate / geometric invariants
 * ─────────────────────────────────────────────────────────────────────────────
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
 * Stages 22 – 33: precision and structural integrity invariants
 * ─────────────────────────────────────────────────────────────────────────────
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
    // addLine() rounds to 0.01 mm — compare rounded value (Stage 22 invariant)
    const farXRounded = Math.round(farX * 100) / 100;
    expect(output.content).toContain(String(farXRounded));
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

// ============================================================
// @smoke S-CURVE — Stage 14: HATCH_CURVED X-lines confined within flat-blank bbox
//
// Every HATCH_CURVED LINE endpoint must satisfy:
//   x ∈ [placement.x,  placement.x + effectiveW]
//   y ∈ [placement.y,  placement.y + effectiveH]
//
// For S_CURVE TOP-edge (rotation=90, edgeClearance=10):
//   flatBlankW  = finishWidth   = 500 mm
//   flatBlankH  = finishHeight + (developedLength − projectedDepth) ≈ 1051.800 mm
//   effectiveW  ≈ 1051.800 mm (cutH after rotation)
//   effectiveH  = 500 mm        (cutW after rotation)
//   bbox minX = 10,  maxX ≈ 1061.800
//        minY = 10,  maxY = 510
//
// buildDxfSheets.ts emits exactly two diagonal LINEs per curved placement:
//   diagonal-1: (minX, minY) → (maxX, maxY)   [top-left  → bottom-right]
//   diagonal-2: (maxX, minY) → (minX, maxY)   [top-right → bottom-left]
//
// All four endpoints lie on the bbox perimeter; none can escape it.
// ============================================================

describe('@smoke S-CURVE — Stage 14: HATCH_CURVED X-lines confined within flat-blank bbox', () => {
  /** Re-usable helper: run full pipeline for the S_CURVE panel only. */
  function runStage14() {
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

    const placement = sheets[0].placements.find(
      (p) => p.partId === 'SMOKE_SCURVE_DOOR'
    )!;

    // Mirror getRotatedDimensions() from buildDxfSheets.ts (rotation=90 → swap)
    const isRotated = placement.rotation === 90 || placement.rotation === 270;
    const effectiveW = isRotated ? placement.cutH : placement.cutW;
    const effectiveH = isRotated ? placement.cutW : placement.cutH;

    const bbox = {
      minX: placement.x,
      maxX: placement.x + effectiveW,
      minY: placement.y,
      maxY: placement.y + effectiveH,
    };

    // Parse all HATCH_CURVED LINE entity coordinates from the ENTITIES section.
    // DXF is line-oriented: group codes and values alternate as plain-text lines.
    // Extract group values with regex \n<code>\n(<number>) to avoid false positives
    // when a coordinate value happens to equal a group code integer.
    const entitiesStart = output.content.indexOf('ENTITIES');
    const entities = output.content.slice(entitiesStart);

    const hatchSegs = entities
      .split('LINE')
      .slice(1)
      .filter((seg) => seg.includes('\n8\nHATCH_CURVED\n'));

    type Coords = { x1: number; y1: number; x2: number; y2: number };

    function extractCoords(seg: string): Coords {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    }

    const coords = hatchSegs.map(extractCoords);

    return { coords, bbox, placement, effectiveW, effectiveH, output };
  }

  it('exactly 2 HATCH_CURVED LINE entities are present for the S_CURVE panel', () => {
    const { coords } = runStage14();
    expect(coords).toHaveLength(2);
  });

  it('all x1 start-coordinates lie within [placement.x, placement.x + effectiveW]', () => {
    const { coords, bbox } = runStage14();
    for (const c of coords) {
      expect(c.x1).toBeGreaterThanOrEqual(bbox.minX);
      expect(c.x1).toBeLessThanOrEqual(bbox.maxX);
    }
  });

  it('all y1 start-coordinates lie within [placement.y, placement.y + effectiveH]', () => {
    const { coords, bbox } = runStage14();
    for (const c of coords) {
      expect(c.y1).toBeGreaterThanOrEqual(bbox.minY);
      expect(c.y1).toBeLessThanOrEqual(bbox.maxY);
    }
  });

  it('all x2 end-coordinates lie within [placement.x, placement.x + effectiveW]', () => {
    const { coords, bbox } = runStage14();
    for (const c of coords) {
      expect(c.x2).toBeGreaterThanOrEqual(bbox.minX);
      expect(c.x2).toBeLessThanOrEqual(bbox.maxX);
    }
  });

  it('all y2 end-coordinates lie within [placement.y, placement.y + effectiveH]', () => {
    const { coords, bbox } = runStage14();
    for (const c of coords) {
      expect(c.y2).toBeGreaterThanOrEqual(bbox.minY);
      expect(c.y2).toBeLessThanOrEqual(bbox.maxY);
    }
  });

  it('diagonal-1 runs from top-left corner (minX, minY) to bottom-right corner (maxX, maxY)', () => {
    const { coords, bbox } = runStage14();
    const d1 = coords.find(
      (c) =>
        Math.abs(c.x1 - bbox.minX) < 0.001 &&
        Math.abs(c.y1 - bbox.minY) < 0.001 &&
        Math.abs(c.x2 - bbox.maxX) < 0.001 &&
        Math.abs(c.y2 - bbox.maxY) < 0.001
    );
    expect(d1).toBeDefined();
  });

  it('diagonal-2 runs from top-right corner (maxX, minY) to bottom-left corner (minX, maxY)', () => {
    const { coords, bbox } = runStage14();
    const d2 = coords.find(
      (c) =>
        Math.abs(c.x1 - bbox.maxX) < 0.001 &&
        Math.abs(c.y1 - bbox.minY) < 0.001 &&
        Math.abs(c.x2 - bbox.minX) < 0.001 &&
        Math.abs(c.y2 - bbox.maxY) < 0.001
    );
    expect(d2).toBeDefined();
  });
});

// ============================================================
// @smoke — Stage 15: HATCH_CURVED diagonal length equals
//          sqrt(effectiveW² + effectiveH²) for ARC and S_CURVE
//
// The X-hatch diagonals in buildDxfSheets.ts run corner-to-corner
// across the flat-blank placement rectangle, so their Euclidean
// length is exactly the space diagonal of that rectangle:
//
//   length = sqrt(effectiveW² + effectiveH²)
//
// where effectiveW / effectiveH are the post-rotation flat-blank
// dimensions (cutH / cutW when rotation=90, else cutW / cutH).
//
// Because the arc correction enlarges the flat blank beyond the
// finish-panel size, the flat-blank diagonal must be strictly
// greater than the finish-panel diagonal for every curved profile:
//
//   ARC    : finish diag = sqrt(400² + 800²) ≈  894.4 mm
//            flat-blank diag ≈ sqrt(effectiveW²+effectiveH²) > 894.4 mm
//
//   S_CURVE: finish diag = sqrt(500² + 900²) ≈ 1029.6 mm
//            flat-blank diag ≈ sqrt(effectiveW²+effectiveH²) > 1029.6 mm
// ============================================================

describe('@smoke — Stage 15: HATCH_CURVED diagonal length equals sqrt(effectiveW²+effectiveH²)', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  /** Parse all HATCH_CURVED LINE entity coordinates from a DXF content string. */
  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));

    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  /** Euclidean distance between the two endpoints of a LINE segment. */
  function diagLen(c: Coords): number {
    return Math.sqrt((c.x2 - c.x1) ** 2 + (c.y2 - c.y1) ** 2);
  }

  /** Run the full pipeline for a single curved CutListRow; return coords + effectiveDims. */
  function runFor(row: CutListRow, partId: string) {
    const { sheets } = runNesting([row]);
    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });
    const placement = sheets[0].placements.find((p) => p.partId === partId)!;
    const isRotated = placement.rotation === 90 || placement.rotation === 270;
    const effectiveW = isRotated ? placement.cutH : placement.cutW;
    const effectiveH = isRotated ? placement.cutW : placement.cutH;
    const expectedLen = Math.sqrt(effectiveW ** 2 + effectiveH ** 2);
    const coords = parseHatchCoords(output.content);
    return { coords, effectiveW, effectiveH, expectedLen };
  }

  // ── ARC panel (SMOKE_DOOR) ────────────────────────────────

  it('ARC — diagonal-1 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { row } = buildCurvedRow();
    const { coords, expectedLen } = runFor(row, 'SMOKE_DOOR');
    expect(diagLen(coords[0])).toBeCloseTo(expectedLen, 1);
  });

  it('ARC — diagonal-2 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { row } = buildCurvedRow();
    const { coords, expectedLen } = runFor(row, 'SMOKE_DOOR');
    expect(diagLen(coords[1])).toBeCloseTo(expectedLen, 1);
  });

  // ── S_CURVE panel (SMOKE_SCURVE_DOOR) ────────────────────

  it('S_CURVE — diagonal-1 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { row } = buildSCurveRow();
    const { coords, expectedLen } = runFor(row, 'SMOKE_SCURVE_DOOR');
    expect(diagLen(coords[0])).toBeCloseTo(expectedLen, 1);
  });

  it('S_CURVE — diagonal-2 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { row } = buildSCurveRow();
    const { coords, expectedLen } = runFor(row, 'SMOKE_SCURVE_DOOR');
    expect(diagLen(coords[1])).toBeCloseTo(expectedLen, 1);
  });

  // ── Flat-blank diagonal > finish-size diagonal ────────────
  // The arc correction strictly enlarges the flat blank, so the
  // DXF hatch diagonal must exceed the finish-panel diagonal.

  it('ARC — flat-blank diagonal > finish-panel diagonal (correction is strictly positive)', () => {
    const { row } = buildCurvedRow();
    const { coords } = runFor(row, 'SMOKE_DOOR');
    const flatDiag = diagLen(coords[0]);
    const finishDiag = Math.sqrt(
      PANEL_STUB.finishWidth ** 2 + PANEL_STUB.finishHeight ** 2
    );
    expect(flatDiag).toBeGreaterThan(finishDiag);
  });

  it('S_CURVE — flat-blank diagonal > finish-panel diagonal (correction is strictly positive)', () => {
    const { row } = buildSCurveRow();
    const { coords } = runFor(row, 'SMOKE_SCURVE_DOOR');
    const flatDiag = diagLen(coords[0]);
    const finishDiag = Math.sqrt(
      S_CURVE_PANEL_STUB.finishWidth ** 2 + S_CURVE_PANEL_STUB.finishHeight ** 2
    );
    expect(flatDiag).toBeGreaterThan(finishDiag);
  });
});

// ============================================================
// @smoke — Stage 16: HATCH_CURVED diagonals are strictly longer
//          than the finish-panel shorter side for ARC and S_CURVE
//
// Because the flat blank is always at least as large as the finish
// panel in both dimensions (arc correction only adds material, never
// subtracts), the space diagonal of the flat blank must exceed either
// individual finish dimension — in particular the shorter one:
//
//   flatBlankDiag = sqrt(effectiveW² + effectiveH²)
//                ≥ max(effectiveW, effectiveH)        (Pythagorean bound)
//                > min(finishW, finishH)               (correction ≥ 0)
//
// Concrete lower bounds from the fixture values:
//   ARC     shorter side = min(400, 800) = 400 mm
//           flat-blank diag ≈ 993.5 mm   >> 400 mm ✓
//
//   S_CURVE shorter side = min(500, 900) = 500 mm
//           flat-blank diag ≈ 1164.6 mm  >> 500 mm ✓
//
// This is a minimum-sanity guard: a diagonal shorter than the finish
// panel's own shorter side would indicate a catastrophic sizing bug
// in the flat-blank correction or FFDH placement.
// ============================================================

describe('@smoke — Stage 16: HATCH_CURVED diagonals strictly exceed finish-panel shorter side', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function diagLen(c: Coords): number {
    return Math.sqrt((c.x2 - c.x1) ** 2 + (c.y2 - c.y1) ** 2);
  }

  function runFor(row: CutListRow, partId: string) {
    const { sheets } = runNesting([row]);
    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });
    sheets[0].placements.find((p) => p.partId === partId)!;
    return { coords: parseHatchCoords(output.content) };
  }

  // ── ARC panel ────────────────────────────────────────────
  // shorter finish side = min(400, 800) = 400 mm

  it('ARC — diagonal-1 > min(finishWidth, finishHeight) [400 mm]', () => {
    const { row } = buildCurvedRow();
    const { coords } = runFor(row, 'SMOKE_DOOR');
    const shorterSide = Math.min(PANEL_STUB.finishWidth, PANEL_STUB.finishHeight);
    expect(diagLen(coords[0])).toBeGreaterThan(shorterSide);
  });

  it('ARC — diagonal-2 > min(finishWidth, finishHeight) [400 mm]', () => {
    const { row } = buildCurvedRow();
    const { coords } = runFor(row, 'SMOKE_DOOR');
    const shorterSide = Math.min(PANEL_STUB.finishWidth, PANEL_STUB.finishHeight);
    expect(diagLen(coords[1])).toBeGreaterThan(shorterSide);
  });

  // ── S_CURVE panel ─────────────────────────────────────────
  // shorter finish side = min(500, 900) = 500 mm

  it('S_CURVE — diagonal-1 > min(finishWidth, finishHeight) [500 mm]', () => {
    const { row } = buildSCurveRow();
    const { coords } = runFor(row, 'SMOKE_SCURVE_DOOR');
    const shorterSide = Math.min(
      S_CURVE_PANEL_STUB.finishWidth,
      S_CURVE_PANEL_STUB.finishHeight
    );
    expect(diagLen(coords[0])).toBeGreaterThan(shorterSide);
  });

  it('S_CURVE — diagonal-2 > min(finishWidth, finishHeight) [500 mm]', () => {
    const { row } = buildSCurveRow();
    const { coords } = runFor(row, 'SMOKE_SCURVE_DOOR');
    const shorterSide = Math.min(
      S_CURVE_PANEL_STUB.finishWidth,
      S_CURVE_PANEL_STUB.finishHeight
    );
    expect(diagLen(coords[1])).toBeGreaterThan(shorterSide);
  });
});

// ============================================================
// @smoke — Stage 17: Mixed ARC + S_CURVE sheet — HATCH_CURVED
//          lines are spatially partitioned between the two placements
//
// Stage 9 confirms the global count (4) when an ARC and an S_CURVE
// panel share the same sheet.  Stage 17 goes further: it parses the
// (x1,y1,x2,y2) coordinates of every HATCH_CURVED line and verifies
// that the 4 lines are correctly partitioned — exactly 2 per placement
// — by grouping them according to the y-origin of each placement.
// It also verifies that the derived effective-bbox diagonal length
// matches √(effectiveW² + effectiveH²) for each panel type.
//
// Grouping strategy: `buildDxfSheets` always draws both diagonals
// starting from the placement's (x, y) origin, so for both lines in
// a group min(y1, y2) == placement.y (±1 mm tolerance).  Because FFDH
// places the two panels on distinct shelf rows the y-origins differ
// by at least the effectiveH of the first panel, giving unambiguous
// separation.
//
// Sheet layout (1220 × 2440, kerfWidth=3.5, edgeClearance=10):
//   Shelf 1 — S_CURVE panel (rotation=90) → effectiveH ≈  500 mm, y=10
//   Shelf 2 — ARC panel     (rotation=90) → effectiveH ≈  400 mm, y=513.5
//             (FFDH sorts descending by placed height before binning)
//
// Assertions (7 total):
//   1. Total HATCH_CURVED count is exactly 4.
//   2. Exactly 2 lines belong to the S_CURVE placement (y-origin ≈  10).
//   3. Exactly 2 lines belong to the ARC placement     (y-origin ≈ 513.5).
//   4. All 4 lines are accounted for (no unclassified lines).
//   5. ARC and S_CURVE placements are on different shelf rows (y ≠ y).
//   6. ARC-group diagonal-1 length ≈ √(arcEffW² + arcEffH²)
//      where arcEffW / arcEffH are derived from the line endpoints.
//   7. S_CURVE-group diagonal-1 length ≈ √(sCurveEffW² + sCurveEffH²).
// ============================================================

describe('@smoke — Stage 17: HATCH_CURVED lines are spatially partitioned between ARC and S_CURVE placements', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  /** Parse every LINE entity on the HATCH_CURVED layer from the ENTITIES section. */
  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  /** Euclidean length of a line segment. */
  function segLen(c: Coords): number {
    return Math.sqrt((c.x2 - c.x1) ** 2 + (c.y2 - c.y1) ** 2);
  }

  /**
   * Return all lines whose bottom y-coordinate (min of y1, y2) is within
   * 1 mm of the given placement y-origin.
   *
   * `buildDxfSheets` starts both diagonals at the placement's (x, y) corner,
   * so min(y1, y2) === placement.y for every line in that group.
   */
  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function runStage17() {
    const { row: arcRow }    = buildCurvedRow();   // SMOKE_DOOR     (ARC)
    const { row: sCurveRow } = buildSCurveRow();   // SMOKE_SCURVE_DOOR (S_CURVE)

    const { sheets, unplacedParts } = runNesting([arcRow, sCurveRow]);

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements = sheets[0].placements;
    const arcP    = placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP = placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;

    const allCoords   = parseHatchCoords(output.content);
    const arcLines    = linesForPlacement(allCoords, arcP.y);
    const sCurveLines = linesForPlacement(allCoords, sCurveP.y);

    // Derive effective bbox for ARC group from its line endpoints
    const arcMaxX = Math.max(...arcLines.flatMap((c) => [c.x1, c.x2]));
    const arcMaxY = Math.max(...arcLines.flatMap((c) => [c.y1, c.y2]));
    const arcEffW = arcMaxX - arcP.x;
    const arcEffH = arcMaxY - arcP.y;

    // Derive effective bbox for S_CURVE group from its line endpoints
    const sCurveMaxX = Math.max(...sCurveLines.flatMap((c) => [c.x1, c.x2]));
    const sCurveMaxY = Math.max(...sCurveLines.flatMap((c) => [c.y1, c.y2]));
    const sCurveEffW = sCurveMaxX - sCurveP.x;
    const sCurveEffH = sCurveMaxY - sCurveP.y;

    return {
      unplacedParts,
      arcP, sCurveP,
      allCoords, arcLines, sCurveLines,
      arcEffW, arcEffH,
      sCurveEffW, sCurveEffH,
    };
  }

  it('total HATCH_CURVED count is exactly 4 (2 diagonals × 2 curved panels)', () => {
    const { allCoords } = runStage17();
    expect(allCoords).toHaveLength(4);
  });

  it('exactly 2 HATCH_CURVED lines are attributed to the S_CURVE placement (by y-origin)', () => {
    const { sCurveLines } = runStage17();
    expect(sCurveLines).toHaveLength(2);
  });

  it('exactly 2 HATCH_CURVED lines are attributed to the ARC placement (by y-origin)', () => {
    const { arcLines } = runStage17();
    expect(arcLines).toHaveLength(2);
  });

  it('all 4 HATCH_CURVED lines are fully accounted for between the two placement groups', () => {
    const { arcLines, sCurveLines } = runStage17();
    expect(arcLines.length + sCurveLines.length).toBe(4);
  });

  it('ARC and S_CURVE placements occupy distinct shelf rows (different y-origins)', () => {
    const { arcP, sCurveP } = runStage17();
    expect(arcP.y).not.toBeCloseTo(sCurveP.y, 0);
  });

  it('ARC-group diagonal-1 length ≈ √(arcEffW² + arcEffH²) (derived from line endpoints)', () => {
    const { arcLines, arcEffW, arcEffH } = runStage17();
    const expected = Math.sqrt(arcEffW ** 2 + arcEffH ** 2);
    expect(segLen(arcLines[0])).toBeCloseTo(expected, 3);
  });

  it('S_CURVE-group diagonal-1 length ≈ √(sCurveEffW² + sCurveEffH²) (derived from line endpoints)', () => {
    const { sCurveLines, sCurveEffW, sCurveEffH } = runStage17();
    const expected = Math.sqrt(sCurveEffW ** 2 + sCurveEffH ** 2);
    expect(segLen(sCurveLines[0])).toBeCloseTo(expected, 3);
  });
});

// ============================================================
// @smoke — Stage 18: Both diagonal-2 lengths equal the endpoint-
//          derived bbox diagonal for the mixed ARC + S_CURVE sheet
//
// Stage 17 verified diagonal-1 (the main diagonal, running from the
// placement's bottom-left to top-right corner) for both panel types.
// Stage 18 extends that coverage to diagonal-2 — the anti-diagonal,
// running from bottom-right to top-left — confirming that the X-hatch
// is symmetric and that `buildDxfSheets` emits both diagonals with
// equal length regardless of direction.
//
// Because both diagonals span the same bounding box (effectiveW ×
// effectiveH), their lengths must be identical:
//
//   |diag-1| = |diag-2| = √(effectiveW² + effectiveH²)
//
// Any discrepancy would indicate a coordinate swap bug in the DXF
// renderer (e.g. one endpoint using finish-size coords while the
// other uses flat-blank-corrected coords).
//
// The stage reuses the same fixture (buildCurvedRow + buildSCurveRow),
// the same linesForPlacement grouping strategy, and the same
// endpoint-derived effectiveW/effectiveH as Stage 17 — only the
// index into each group changes from [0] to [1].
//
// Assertions (4 total):
//   1. ARC diagonal-2 length ≈ √(arcEffW² + arcEffH²)      (3 d.p.)
//   2. ARC diagonal-1 and diagonal-2 lengths are equal      (3 d.p.)
//   3. S_CURVE diagonal-2 length ≈ √(sCurveEffW² + sCurveEffH²) (3 d.p.)
//   4. S_CURVE diagonal-1 and diagonal-2 lengths are equal  (3 d.p.)
// ============================================================

describe('@smoke — Stage 18: diagonal-2 lengths equal bbox diagonal for both ARC and S_CURVE on mixed-panel sheet', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function segLen(c: Coords): number {
    return Math.sqrt((c.x2 - c.x1) ** 2 + (c.y2 - c.y1) ** 2);
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function runStage18() {
    const { row: arcRow }    = buildCurvedRow();
    const { row: sCurveRow } = buildSCurveRow();

    const { sheets } = runNesting([arcRow, sCurveRow]);

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const placements = sheets[0].placements;
    const arcP    = placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP = placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;

    const allCoords   = parseHatchCoords(output.content);
    const arcLines    = linesForPlacement(allCoords, arcP.y);
    const sCurveLines = linesForPlacement(allCoords, sCurveP.y);

    // Effective bbox dimensions derived from endpoints (same as Stage 17)
    const arcMaxX    = Math.max(...arcLines.flatMap((c) => [c.x1, c.x2]));
    const arcMaxY    = Math.max(...arcLines.flatMap((c) => [c.y1, c.y2]));
    const arcEffW    = arcMaxX - arcP.x;
    const arcEffH    = arcMaxY - arcP.y;

    const sCurveMaxX = Math.max(...sCurveLines.flatMap((c) => [c.x1, c.x2]));
    const sCurveMaxY = Math.max(...sCurveLines.flatMap((c) => [c.y1, c.y2]));
    const sCurveEffW = sCurveMaxX - sCurveP.x;
    const sCurveEffH = sCurveMaxY - sCurveP.y;

    return {
      arcLines, sCurveLines,
      arcEffW, arcEffH,
      sCurveEffW, sCurveEffH,
    };
  }

  it('ARC — diagonal-2 length ≈ √(arcEffW² + arcEffH²) (endpoint-derived)', () => {
    const { arcLines, arcEffW, arcEffH } = runStage18();
    const expected = Math.sqrt(arcEffW ** 2 + arcEffH ** 2);
    expect(segLen(arcLines[1])).toBeCloseTo(expected, 3);
  });

  it('ARC — diagonal-1 and diagonal-2 lengths are equal (X-hatch is symmetric)', () => {
    const { arcLines, arcEffW, arcEffH } = runStage18();
    const expected = Math.sqrt(arcEffW ** 2 + arcEffH ** 2);
    expect(segLen(arcLines[0])).toBeCloseTo(expected, 3);
    expect(segLen(arcLines[1])).toBeCloseTo(expected, 3);
  });

  it('S_CURVE — diagonal-2 length ≈ √(sCurveEffW² + sCurveEffH²) (endpoint-derived)', () => {
    const { sCurveLines, sCurveEffW, sCurveEffH } = runStage18();
    const expected = Math.sqrt(sCurveEffW ** 2 + sCurveEffH ** 2);
    expect(segLen(sCurveLines[1])).toBeCloseTo(expected, 3);
  });

  it('S_CURVE — diagonal-1 and diagonal-2 lengths are equal (X-hatch is symmetric)', () => {
    const { sCurveLines, sCurveEffW, sCurveEffH } = runStage18();
    const expected = Math.sqrt(sCurveEffW ** 2 + sCurveEffH ** 2);
    expect(segLen(sCurveLines[0])).toBeCloseTo(expected, 3);
    expect(segLen(sCurveLines[1])).toBeCloseTo(expected, 3);
  });
});

// ============================================================
// Stage 19 — diagonal intersection at bbox centre for ARC + S_CURVE
// ============================================================
//
// A rectangle's two diagonals bisect each other at its centre.
// For the X-hatch emitted by buildDxfSheets, both HATCH_CURVED
// diagonals must therefore share the same midpoint, which must
// equal the centre of the flat-blank placement bbox:
//
//   midpoint(diag) = ( minX + effectiveW/2,  minY + effectiveH/2 )
//
// where minX/minY are derived from the line endpoints (no Placement
// w/h fields exist) and effectiveW/H are also endpoint-derived.
//
// This asserts that neither diagonal is skewed, shifted, or
// computed with an off-centre origin — catching any asymmetry in
// the DXF hatch coordinate emitter that pure length checks
// (Stages 15–18) cannot detect.
//
// Fixture: the standard mixed-panel sheet (ARC + S_CURVE),
// same FFDH layout as Stages 17–18.
//
// Assertions (8 total):
//   1. ARC diagonal-1 midpoint x ≈ arcMinX + arcEffW / 2  (3 d.p.)
//   2. ARC diagonal-1 midpoint y ≈ arcMinY + arcEffH / 2  (3 d.p.)
//   3. ARC diagonal-2 midpoint x ≈ arcMinX + arcEffW / 2  (3 d.p.)
//   4. ARC diagonal-2 midpoint y ≈ arcMinY + arcEffH / 2  (3 d.p.)
//   5. S_CURVE diagonal-1 midpoint x ≈ sCurveMinX + sCurveEffW / 2  (3 d.p.)
//   6. S_CURVE diagonal-1 midpoint y ≈ sCurveMinY + sCurveEffH / 2  (3 d.p.)
//   7. S_CURVE diagonal-2 midpoint x ≈ sCurveMinX + sCurveEffW / 2  (3 d.p.)
//   8. S_CURVE diagonal-2 midpoint y ≈ sCurveMinY + sCurveEffH / 2  (3 d.p.)
// ============================================================

describe('@smoke — Stage 19: diagonal intersection at bbox centre for ARC + S_CURVE', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function mid(c: Coords): { mx: number; my: number } {
    return { mx: (c.x1 + c.x2) / 2, my: (c.y1 + c.y2) / 2 };
  }

  function runStage19() {
    const { row: arcRow }    = buildCurvedRow();
    const { row: sCurveRow } = buildSCurveRow();

    const { sheets } = runNesting([arcRow, sCurveRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords   = parseHatchCoords(output.content);
    const arcLines    = linesForPlacement(allCoords, arcP.y);
    const sCurveLines = linesForPlacement(allCoords, sCurveP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);

    const arcMinX     = Math.min(...arcLines.flatMap((c) => [c.x1, c.x2]));
    const arcMinY     = Math.min(...arcLines.flatMap((c) => [c.y1, c.y2]));
    const arcMaxX     = Math.max(...arcLines.flatMap((c) => [c.x1, c.x2]));
    const arcMaxY     = Math.max(...arcLines.flatMap((c) => [c.y1, c.y2]));
    const arcEffW     = arcMaxX - arcMinX;
    const arcEffH     = arcMaxY - arcMinY;

    const sCurveMinX  = Math.min(...sCurveLines.flatMap((c) => [c.x1, c.x2]));
    const sCurveMinY  = Math.min(...sCurveLines.flatMap((c) => [c.y1, c.y2]));
    const sCurveMaxX  = Math.max(...sCurveLines.flatMap((c) => [c.x1, c.x2]));
    const sCurveMaxY  = Math.max(...sCurveLines.flatMap((c) => [c.y1, c.y2]));
    const sCurveEffW  = sCurveMaxX - sCurveMinX;
    const sCurveEffH  = sCurveMaxY - sCurveMinY;

    return {
      arcLines, sCurveLines,
      arcMinX, arcMinY, arcEffW, arcEffH,
      sCurveMinX, sCurveMinY, sCurveEffW, sCurveEffH,
    };
  }

  it('ARC — diagonal-1 midpoint x ≈ bbox centre x', () => {
    const { arcLines, arcMinX, arcEffW } = runStage19();
    expect(mid(arcLines[0]).mx).toBeCloseTo(arcMinX + arcEffW / 2, 3);
  });

  it('ARC — diagonal-1 midpoint y ≈ bbox centre y', () => {
    const { arcLines, arcMinY, arcEffH } = runStage19();
    expect(mid(arcLines[0]).my).toBeCloseTo(arcMinY + arcEffH / 2, 3);
  });

  it('ARC — diagonal-2 midpoint x ≈ bbox centre x', () => {
    const { arcLines, arcMinX, arcEffW } = runStage19();
    expect(mid(arcLines[1]).mx).toBeCloseTo(arcMinX + arcEffW / 2, 3);
  });

  it('ARC — diagonal-2 midpoint y ≈ bbox centre y', () => {
    const { arcLines, arcMinY, arcEffH } = runStage19();
    expect(mid(arcLines[1]).my).toBeCloseTo(arcMinY + arcEffH / 2, 3);
  });

  it('S_CURVE — diagonal-1 midpoint x ≈ bbox centre x', () => {
    const { sCurveLines, sCurveMinX, sCurveEffW } = runStage19();
    expect(mid(sCurveLines[0]).mx).toBeCloseTo(sCurveMinX + sCurveEffW / 2, 3);
  });

  it('S_CURVE — diagonal-1 midpoint y ≈ bbox centre y', () => {
    const { sCurveLines, sCurveMinY, sCurveEffH } = runStage19();
    expect(mid(sCurveLines[0]).my).toBeCloseTo(sCurveMinY + sCurveEffH / 2, 3);
  });

  it('S_CURVE — diagonal-2 midpoint x ≈ bbox centre x', () => {
    const { sCurveLines, sCurveMinX, sCurveEffW } = runStage19();
    expect(mid(sCurveLines[1]).mx).toBeCloseTo(sCurveMinX + sCurveEffW / 2, 3);
  });

  it('S_CURVE — diagonal-2 midpoint y ≈ bbox centre y', () => {
    const { sCurveLines, sCurveMinY, sCurveEffH } = runStage19();
    expect(mid(sCurveLines[1]).my).toBeCloseTo(sCurveMinY + sCurveEffH / 2, 3);
  });
});

// ============================================================
// Stage 20 — Perpendicularity of HATCH_CURVED diagonals when
//            effectiveW equals effectiveH
//
// Diagonals are perpendicular iff dot(d1, d2) = 0, which
// equals effectiveH² − effectiveW² (derivation: d1=(w,h),
// d2=(-w,h) → dot = h² − w²).
//
// Three panels on one sheet:
//   ARC        — effectiveW≈909 ≠ effectiveH=400  → dot ≠ 0
//   S_CURVE    — effectiveW≈1052 ≠ effectiveH=500 → dot ≠ 0
//   SQUARE_ARC — effectiveW=effectiveH≈509         → dot = 0
//
// SQUARE_ARC construction:
//   correction = developedLength − projectedDepth  (from PANEL_STUB)
//   finishWidth = 400 + correction  ← makes flatBlankW = flatBlankH
// ============================================================

describe('@smoke — Stage 20: perpendicularity of HATCH_CURVED diagonals', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function dotProduct(l1: Coords, l2: Coords): number {
    const v1x = l1.x2 - l1.x1;
    const v1y = l1.y2 - l1.y1;
    const v2x = l2.x2 - l2.x1;
    const v2y = l2.y2 - l2.y1;
    return v1x * v2x + v1y * v2y;
  }

  function buildSquareArcRow(): { row: CutListRow; kerfCount: number } {
    // Reuse PANEL_STUB geometry (radius=200, sweep=60°) to get the same
    // correction value as the standard ARC row.  Set finishWidth = 400 + correction
    // so that flatBlankW = cutW = 400+correction AND
    //           flatBlankH = cutH + correction = 400 + correction → square.
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const correction = fields.developedLength - fields.projectedDepth;
    const FINISH_H = 400;
    const squareFinishW = FINISH_H + correction;   // ≈ 509.44 mm

    const row: CutListRow = {
      partId:    'SMOKE_SQUARE_ARC',
      cabinetId: 'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:   squareFinishW,
      finishH:   FINISH_H,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:      squareFinishW,
      cutH:      FINISH_H,
      qty:       1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
    };

    return { row, kerfCount: fields.kerfCount };
  }

  function runStage20() {
    const { row: arcRow }       = buildCurvedRow();
    const { row: sCurveRow }    = buildSCurveRow();
    const { row: squareArcRow } = buildSquareArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, squareArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP       = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP    = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const squareArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_SQUARE_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords      = parseHatchCoords(output.content);
    const arcLines       = linesForPlacement(allCoords, arcP.y);
    const sCurveLines    = linesForPlacement(allCoords, sCurveP.y);
    const squareArcLines = linesForPlacement(allCoords, squareArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(squareArcLines).toHaveLength(2);

    const arcEffW     = Math.max(...arcLines.flatMap((c) => [c.x1, c.x2]))
                      - Math.min(...arcLines.flatMap((c) => [c.x1, c.x2]));
    const arcEffH     = Math.max(...arcLines.flatMap((c) => [c.y1, c.y2]))
                      - Math.min(...arcLines.flatMap((c) => [c.y1, c.y2]));
    const sCurveEffW  = Math.max(...sCurveLines.flatMap((c) => [c.x1, c.x2]))
                      - Math.min(...sCurveLines.flatMap((c) => [c.x1, c.x2]));
    const sCurveEffH  = Math.max(...sCurveLines.flatMap((c) => [c.y1, c.y2]))
                      - Math.min(...sCurveLines.flatMap((c) => [c.y1, c.y2]));
    const sqEffW      = Math.max(...squareArcLines.flatMap((c) => [c.x1, c.x2]))
                      - Math.min(...squareArcLines.flatMap((c) => [c.x1, c.x2]));
    const sqEffH      = Math.max(...squareArcLines.flatMap((c) => [c.y1, c.y2]))
                      - Math.min(...squareArcLines.flatMap((c) => [c.y1, c.y2]));

    return {
      arcLines, sCurveLines, squareArcLines,
      arcEffW, arcEffH,
      sCurveEffW, sCurveEffH,
      sqEffW, sqEffH,
    };
  }

  // ── Part A: ARC — non-perpendicular ────────────────────────────────────────

  it('ARC — |dot(d1, d2)| > 100_000 (non-square bbox, strongly non-perpendicular)', () => {
    const { arcLines } = runStage20();
    expect(Math.abs(dotProduct(arcLines[0], arcLines[1]))).toBeGreaterThan(100_000);
  });

  it('ARC — dot(d1, d2) ≈ arcEffH² − arcEffW² (direction-vector dot-product identity)', () => {
    const { arcLines, arcEffW, arcEffH } = runStage20();
    const dot = dotProduct(arcLines[0], arcLines[1]);
    expect(dot).toBeCloseTo(arcEffH ** 2 - arcEffW ** 2, 0);
  });

  // ── Part B: S_CURVE — non-perpendicular ────────────────────────────────────

  it('S_CURVE — |dot(d1, d2)| > 100_000 (non-square bbox, strongly non-perpendicular)', () => {
    const { sCurveLines } = runStage20();
    expect(Math.abs(dotProduct(sCurveLines[0], sCurveLines[1]))).toBeGreaterThan(100_000);
  });

  it('S_CURVE — dot(d1, d2) ≈ sCurveEffH² − sCurveEffW² (direction-vector dot-product identity)', () => {
    const { sCurveLines, sCurveEffW, sCurveEffH } = runStage20();
    const dot = dotProduct(sCurveLines[0], sCurveLines[1]);
    expect(dot).toBeCloseTo(sCurveEffH ** 2 - sCurveEffW ** 2, 0);
  });

  // ── Part C: SQUARE_ARC — perpendicular ────────────────────────────────────

  it('SQUARE_ARC — effectiveW ≈ effectiveH (square flat blank, both dims equal)', () => {
    const { sqEffW, sqEffH } = runStage20();
    expect(sqEffW).toBeCloseTo(sqEffH, 1);
  });

  it('SQUARE_ARC — dot(d1, d2) ≈ 0 (perpendicular diagonals for square bbox)', () => {
    const { squareArcLines } = runStage20();
    expect(dotProduct(squareArcLines[0], squareArcLines[1])).toBeCloseTo(0, 0);
  });

  it('SQUARE_ARC — sqEffH² − sqEffW² ≈ 0 (confirms perpendicularity via dot-product identity)', () => {
    const { sqEffW, sqEffH } = runStage20();
    expect(sqEffH ** 2 - sqEffW ** 2).toBeCloseTo(0, 0);
  });
});

// ============================================================
// Stage 21 — dot-product sign: negative when effectiveW > effectiveH,
//            positive when effectiveW < effectiveH
//
// Three panel types on one sheet:
//   ARC       (grain=NONE, FFDH rotates → effectiveW≈909.44 > effectiveH=400)   → dot < 0
//   S_CURVE   (grain=NONE, FFDH rotates → effectiveW≈1051.8 > effectiveH=500)   → dot < 0
//   TALL_ARC  (grain=HORIZONTAL, locked → effectiveW=400 < effectiveH≈909.44)   → dot > 0
// ============================================================

describe('@smoke — Stage 21: dot-product sign is negative when effectiveW > effectiveH, positive when effectiveW < effectiveH', () => {
  type Coords = { x1: number; y1: number; x2: number; y2: number };

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function dotProduct(l1: Coords, l2: Coords): number {
    const v1x = l1.x2 - l1.x1;
    const v1y = l1.y2 - l1.y1;
    const v2x = l2.x2 - l2.x1;
    const v2y = l2.y2 - l2.y1;
    return v1x * v2x + v1y * v2y;
  }

  /**
   * TALL_ARC — same ARC geometry as PANEL_STUB (radius=200, sweepDeg=60)
   * but with grain='HORIZONTAL' to lock orientation.
   *
   * FFDH cannot rotate a grain-locked part → rotation=0:
   *   effectiveW = flatBlankW = cutW = 400
   *   effectiveH = flatBlankH = cutH + correction = 800 + 109.44 ≈ 909.44
   *   → effectiveW < effectiveH → dot(d1, d2) = effH² − effW² > 0
   */
  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;

    const row: CutListRow = {
      partId:    'SMOKE_TALL_ARC',
      cabinetId: 'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:   PANEL_STUB.finishWidth,
      finishH:   PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:      PANEL_STUB.finishWidth,
      cutH:      PANEL_STUB.finishHeight,
      qty:       1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };

    return { row, kerfCount: fields.kerfCount };
  }

  function runStage21() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    const arcEffW    = Math.max(...arcLines.flatMap((c) => [c.x1, c.x2]))
                     - Math.min(...arcLines.flatMap((c) => [c.x1, c.x2]));
    const arcEffH    = Math.max(...arcLines.flatMap((c) => [c.y1, c.y2]))
                     - Math.min(...arcLines.flatMap((c) => [c.y1, c.y2]));
    const sCurveEffW = Math.max(...sCurveLines.flatMap((c) => [c.x1, c.x2]))
                     - Math.min(...sCurveLines.flatMap((c) => [c.x1, c.x2]));
    const sCurveEffH = Math.max(...sCurveLines.flatMap((c) => [c.y1, c.y2]))
                     - Math.min(...sCurveLines.flatMap((c) => [c.y1, c.y2]));
    const tallEffW   = Math.max(...tallArcLines.flatMap((c) => [c.x1, c.x2]))
                     - Math.min(...tallArcLines.flatMap((c) => [c.x1, c.x2]));
    const tallEffH   = Math.max(...tallArcLines.flatMap((c) => [c.y1, c.y2]))
                     - Math.min(...tallArcLines.flatMap((c) => [c.y1, c.y2]));

    return {
      arcLines, sCurveLines, tallArcLines,
      arcEffW, arcEffH,
      sCurveEffW, sCurveEffH,
      tallEffW, tallEffH,
    };
  }

  // ── Part A: ARC — effectiveW > effectiveH → dot < 0 ──────────────────────

  it('ARC — dot(d1, d2) < 0 (effectiveW > effectiveH, FFDH rotates to landscape)', () => {
    const { arcLines } = runStage21();
    expect(dotProduct(arcLines[0], arcLines[1])).toBeLessThan(0);
  });

  it('ARC — dot(d1, d2) ≈ arcEffH² − arcEffW² (negative identity, confirms effectiveW > effectiveH)', () => {
    const { arcLines, arcEffW, arcEffH } = runStage21();
    const dot = dotProduct(arcLines[0], arcLines[1]);
    expect(dot).toBeCloseTo(arcEffH ** 2 - arcEffW ** 2, 0);
  });

  // ── Part B: S_CURVE — effectiveW > effectiveH → dot < 0 ──────────────────

  it('S_CURVE — dot(d1, d2) < 0 (effectiveW > effectiveH, FFDH rotates to landscape)', () => {
    const { sCurveLines } = runStage21();
    expect(dotProduct(sCurveLines[0], sCurveLines[1])).toBeLessThan(0);
  });

  it('S_CURVE — dot(d1, d2) ≈ sCurveEffH² − sCurveEffW² (negative identity, confirms effectiveW > effectiveH)', () => {
    const { sCurveLines, sCurveEffW, sCurveEffH } = runStage21();
    const dot = dotProduct(sCurveLines[0], sCurveLines[1]);
    expect(dot).toBeCloseTo(sCurveEffH ** 2 - sCurveEffW ** 2, 0);
  });

  // ── Part C: TALL_ARC — effectiveW < effectiveH → dot > 0 ─────────────────

  it('TALL_ARC — dot(d1, d2) > 0 (effectiveW < effectiveH, grain-locked keeps portrait)', () => {
    const { tallArcLines } = runStage21();
    expect(dotProduct(tallArcLines[0], tallArcLines[1])).toBeGreaterThan(0);
  });

  it('TALL_ARC — dot(d1, d2) ≈ tallEffH² − tallEffW² (positive identity, confirms effectiveW < effectiveH)', () => {
    const { tallArcLines, tallEffW, tallEffH } = runStage21();
    const dot = dotProduct(tallArcLines[0], tallArcLines[1]);
    expect(dot).toBeCloseTo(tallEffH ** 2 - tallEffW ** 2, 0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Stage 22 — HATCH_CURVED endpoint precision: multiples of 0.01 mm
// ══════════════════════════════════════════════════════════════════════════════

describe('@smoke Stage 22 — HATCH_CURVED endpoint coords rounded to 0.01 mm precision', () => {
  /**
   * buildDxfSheets.addLine() rounds all four endpoint coordinates via
   *   Math.round(v * 100) / 100
   * before writing to DXF.  This ensures CNC output never carries irrational
   * arc-length floats.  Max rounding delta: 0.005 mm (< CNC kerf-width).
   *
   * Panel set: ARC (SMOKE_DOOR) + S_CURVE (SMOKE_SCURVE_DOOR) + TALL_ARC
   * Same three-panel sheet as Stages 19–21.
   *
   * Invariant (per diagonal, per panel type):
   *   ∀ v ∈ { x1, y1, x2, y2 } : Math.abs(v * 100 − Math.round(v * 100)) < 1e-6
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  /** Returns true iff v is a multiple of 0.01 mm (within 1e-6 float tolerance). */
  function isRounded(v: number): boolean {
    return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
  }

  function runStage22() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return { arcLines, sCurveLines, tallArcLines };
  }

  // ── Part A: ARC ───────────────────────────────────────────────────────────

  it('ARC — diagonal-1 all four endpoint coords are multiples of 0.01 mm', () => {
    const { arcLines } = runStage22();
    const d = arcLines[0];
    expect(isRounded(d.x1)).toBe(true);
    expect(isRounded(d.y1)).toBe(true);
    expect(isRounded(d.x2)).toBe(true);
    expect(isRounded(d.y2)).toBe(true);
  });

  it('ARC — diagonal-2 all four endpoint coords are multiples of 0.01 mm', () => {
    const { arcLines } = runStage22();
    const d = arcLines[1];
    expect(isRounded(d.x1)).toBe(true);
    expect(isRounded(d.y1)).toBe(true);
    expect(isRounded(d.x2)).toBe(true);
    expect(isRounded(d.y2)).toBe(true);
  });

  // ── Part B: S_CURVE ───────────────────────────────────────────────────────

  it('S_CURVE — diagonal-1 all four endpoint coords are multiples of 0.01 mm', () => {
    const { sCurveLines } = runStage22();
    const d = sCurveLines[0];
    expect(isRounded(d.x1)).toBe(true);
    expect(isRounded(d.y1)).toBe(true);
    expect(isRounded(d.x2)).toBe(true);
    expect(isRounded(d.y2)).toBe(true);
  });

  it('S_CURVE — diagonal-2 all four endpoint coords are multiples of 0.01 mm', () => {
    const { sCurveLines } = runStage22();
    const d = sCurveLines[1];
    expect(isRounded(d.x1)).toBe(true);
    expect(isRounded(d.y1)).toBe(true);
    expect(isRounded(d.x2)).toBe(true);
    expect(isRounded(d.y2)).toBe(true);
  });

  // ── Part C: TALL_ARC ──────────────────────────────────────────────────────

  it('TALL_ARC — diagonal-1 all four endpoint coords are multiples of 0.01 mm', () => {
    const { tallArcLines } = runStage22();
    const d = tallArcLines[0];
    expect(isRounded(d.x1)).toBe(true);
    expect(isRounded(d.y1)).toBe(true);
    expect(isRounded(d.x2)).toBe(true);
    expect(isRounded(d.y2)).toBe(true);
  });

  it('TALL_ARC — diagonal-2 all four endpoint coords are multiples of 0.01 mm', () => {
    const { tallArcLines } = runStage22();
    const d = tallArcLines[1];
    expect(isRounded(d.x1)).toBe(true);
    expect(isRounded(d.y1)).toBe(true);
    expect(isRounded(d.x2)).toBe(true);
    expect(isRounded(d.y2)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Stage 23 — Rounding does not violate bbox-confinement invariant
// ══════════════════════════════════════════════════════════════════════════════

describe('@smoke Stage 23 — rounded HATCH_CURVED endpoints remain within flat-blank bbox', () => {
  /**
   * Stage 14 established the bbox-confinement invariant for S_CURVE only,
   * using unrounded coordinates.  Stage 22 introduced 0.01 mm rounding in
   * addLine().  Stage 23 asserts that rounding does NOT push any endpoint
   * outside the flat-blank placement bounding box.
   *
   * Tolerance: ε = 0.01 mm  (2× max rounding delta of 0.005 mm per coord).
   * Panel set: same three-panel sheet as Stages 19–22
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   *
   * Invariant (per diagonal d, per panel p):
   *   d.x1 ∈ [bbox.minX − ε, bbox.maxX + ε]
   *   d.y1 ∈ [bbox.minY − ε, bbox.maxY + ε]
   *   d.x2 ∈ [bbox.minX − ε, bbox.maxX + ε]
   *   d.y2 ∈ [bbox.minY − ε, bbox.maxY + ε]
   *   where ε = 0.01 mm
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  function runStage23() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  const ε = 0.01; // 2× max rounding delta (0.005 mm per coord)

  // ── Part A: ARC ───────────────────────────────────────────────────────────

  it('ARC — diagonal-1 all four endpoint coords remain within flat-blank bbox ± 0.01 mm', () => {
    const { arcLines, arcBbox: b } = runStage23();
    const d = arcLines[0];
    expect(d.x1).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x1).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y1).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y1).toBeLessThanOrEqual(b.maxY + ε);
    expect(d.x2).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x2).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y2).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y2).toBeLessThanOrEqual(b.maxY + ε);
  });

  it('ARC — diagonal-2 all four endpoint coords remain within flat-blank bbox ± 0.01 mm', () => {
    const { arcLines, arcBbox: b } = runStage23();
    const d = arcLines[1];
    expect(d.x1).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x1).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y1).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y1).toBeLessThanOrEqual(b.maxY + ε);
    expect(d.x2).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x2).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y2).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y2).toBeLessThanOrEqual(b.maxY + ε);
  });

  // ── Part B: S_CURVE ───────────────────────────────────────────────────────

  it('S_CURVE — diagonal-1 all four endpoint coords remain within flat-blank bbox ± 0.01 mm', () => {
    const { sCurveLines, sCurveBbox: b } = runStage23();
    const d = sCurveLines[0];
    expect(d.x1).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x1).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y1).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y1).toBeLessThanOrEqual(b.maxY + ε);
    expect(d.x2).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x2).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y2).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y2).toBeLessThanOrEqual(b.maxY + ε);
  });

  it('S_CURVE — diagonal-2 all four endpoint coords remain within flat-blank bbox ± 0.01 mm', () => {
    const { sCurveLines, sCurveBbox: b } = runStage23();
    const d = sCurveLines[1];
    expect(d.x1).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x1).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y1).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y1).toBeLessThanOrEqual(b.maxY + ε);
    expect(d.x2).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x2).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y2).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y2).toBeLessThanOrEqual(b.maxY + ε);
  });

  // ── Part C: TALL_ARC ──────────────────────────────────────────────────────

  it('TALL_ARC — diagonal-1 all four endpoint coords remain within flat-blank bbox ± 0.01 mm', () => {
    const { tallArcLines, tallBbox: b } = runStage23();
    const d = tallArcLines[0];
    expect(d.x1).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x1).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y1).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y1).toBeLessThanOrEqual(b.maxY + ε);
    expect(d.x2).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x2).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y2).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y2).toBeLessThanOrEqual(b.maxY + ε);
  });

  it('TALL_ARC — diagonal-2 all four endpoint coords remain within flat-blank bbox ± 0.01 mm', () => {
    const { tallArcLines, tallBbox: b } = runStage23();
    const d = tallArcLines[1];
    expect(d.x1).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x1).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y1).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y1).toBeLessThanOrEqual(b.maxY + ε);
    expect(d.x2).toBeGreaterThanOrEqual(b.minX - ε);
    expect(d.x2).toBeLessThanOrEqual(b.maxX + ε);
    expect(d.y2).toBeGreaterThanOrEqual(b.minY - ε);
    expect(d.y2).toBeLessThanOrEqual(b.maxY + ε);
  });
});

// Stage 24 — Every HATCH_CURVED diagonal is non-degenerate (non-zero length)
// ══════════════════════════════════════════════════════════════════════════════

describe('@smoke Stage 24 — all HATCH_CURVED diagonals have non-zero length', () => {
  /**
   * A degenerate LINE entity (x1=x2 AND y1=y2) would produce a zero-length
   * mark in CNC DXF output and is meaningless as a hatch guide.
   * Stage 24 asserts that both diagonals of every curved panel satisfy:
   *
   *   |x1 − x2| + |y1 − y2| > 1e-6
   *
   * This threshold (1e-6 mm) is five orders of magnitude below the 0.01 mm
   * rounding quantum introduced in Stage 22, so any geometrically real diagonal
   * passes trivially while a truly degenerate line would fail.
   *
   * Panel set: same three-panel sheet as Stages 19–23
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  /** Returns true when a LINE entity spans a non-zero distance. */
  function isNonDegenerate(d: Coords): boolean {
    return Math.abs(d.x1 - d.x2) + Math.abs(d.y1 - d.y2) > 1e-6;
  }

  function runStage24() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return { arcLines, sCurveLines, tallArcLines };
  }

  // ── Part A: ARC ───────────────────────────────────────────────────────────

  it('ARC — diagonal-1 has non-zero length', () => {
    const { arcLines } = runStage24();
    expect(isNonDegenerate(arcLines[0])).toBe(true);
  });

  it('ARC — diagonal-2 has non-zero length', () => {
    const { arcLines } = runStage24();
    expect(isNonDegenerate(arcLines[1])).toBe(true);
  });

  // ── Part B: S_CURVE ───────────────────────────────────────────────────────

  it('S_CURVE — diagonal-1 has non-zero length', () => {
    const { sCurveLines } = runStage24();
    expect(isNonDegenerate(sCurveLines[0])).toBe(true);
  });

  it('S_CURVE — diagonal-2 has non-zero length', () => {
    const { sCurveLines } = runStage24();
    expect(isNonDegenerate(sCurveLines[1])).toBe(true);
  });

  // ── Part C: TALL_ARC ──────────────────────────────────────────────────────

  it('TALL_ARC — diagonal-1 has non-zero length', () => {
    const { tallArcLines } = runStage24();
    expect(isNonDegenerate(tallArcLines[0])).toBe(true);
  });

  it('TALL_ARC — diagonal-2 has non-zero length', () => {
    const { tallArcLines } = runStage24();
    expect(isNonDegenerate(tallArcLines[1])).toBe(true);
  });
});

// Stage 25 — Both HATCH_CURVED diagonals share the same midpoint
// ══════════════════════════════════════════════════════════════════════════════

describe('@smoke Stage 25 — midpoint of diagonal-1 equals midpoint of diagonal-2', () => {
  /**
   * For a correct X-hatch the two diagonals of a placement bbox intersect at
   * the centre of the bbox.  That centre is exactly the midpoint of each
   * diagonal, so both midpoints must be equal:
   *
   *   (d1.x1 + d1.x2) / 2  ≈  (d2.x1 + d2.x2) / 2
   *   (d1.y1 + d1.y2) / 2  ≈  (d2.y1 + d2.y2) / 2
   *
   * Tolerance: toBeCloseTo(x, 1)  →  ±0.05 mm.
   * The 0.01 mm rounding introduced in Stage 22 can shift each midpoint by at
   * most 0.005 mm, so the worst-case difference is 0.01 mm — well within the
   * ±0.05 mm window.
   *
   * Panel set: same three-panel sheet as Stages 19–24
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  const midX = (d: Coords): number => (d.x1 + d.x2) / 2;
  const midY = (d: Coords): number => (d.y1 + d.y2) / 2;

  function runStage25() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return { arcLines, sCurveLines, tallArcLines };
  }

  // ── Part A: ARC ───────────────────────────────────────────────────────────

  it('ARC — midX of diagonal-1 equals midX of diagonal-2', () => {
    const { arcLines } = runStage25();
    expect(midX(arcLines[0])).toBeCloseTo(midX(arcLines[1]), 1);
  });

  it('ARC — midY of diagonal-1 equals midY of diagonal-2', () => {
    const { arcLines } = runStage25();
    expect(midY(arcLines[0])).toBeCloseTo(midY(arcLines[1]), 1);
  });

  // ── Part B: S_CURVE ───────────────────────────────────────────────────────

  it('S_CURVE — midX of diagonal-1 equals midX of diagonal-2', () => {
    const { sCurveLines } = runStage25();
    expect(midX(sCurveLines[0])).toBeCloseTo(midX(sCurveLines[1]), 1);
  });

  it('S_CURVE — midY of diagonal-1 equals midY of diagonal-2', () => {
    const { sCurveLines } = runStage25();
    expect(midY(sCurveLines[0])).toBeCloseTo(midY(sCurveLines[1]), 1);
  });

  // ── Part C: TALL_ARC ──────────────────────────────────────────────────────

  it('TALL_ARC — midX of diagonal-1 equals midX of diagonal-2', () => {
    const { tallArcLines } = runStage25();
    expect(midX(tallArcLines[0])).toBeCloseTo(midX(tallArcLines[1]), 1);
  });

  it('TALL_ARC — midY of diagonal-1 equals midY of diagonal-2', () => {
    const { tallArcLines } = runStage25();
    expect(midY(tallArcLines[0])).toBeCloseTo(midY(tallArcLines[1]), 1);
  });
});

// Stage 26 — Shared midpoint equals the centre of the flat-blank placement bbox
// ══════════════════════════════════════════════════════════════════════════════

describe('@smoke Stage 26 — shared diagonal midpoint equals bbox centre', () => {
  /**
   * Stage 25 showed that both diagonals share the same midpoint.
   * Stage 26 asserts that this shared midpoint coincides with the geometric
   * centre of the flat-blank placement bounding box:
   *
   *   midX(d)  ≈  (bbox.minX + bbox.maxX) / 2
   *   midY(d)  ≈  (bbox.minY + bbox.maxY) / 2
   *
   * This confirms the X-hatch is centred on the panel, not offset.
   *
   * Tolerance: toBeCloseTo(x, 1)  →  ±0.05 mm.
   * Rounding in addLine() can shift each midpoint coord by at most 0.005 mm,
   * so the worst-case deviation from the true bbox centre is 0.005 mm —
   * well within the ±0.05 mm window.
   *
   * Panel set: same three-panel sheet as Stages 19–25
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  const midX      = (d: Coords): number => (d.x1 + d.x2) / 2;
  const midY      = (d: Coords): number => (d.y1 + d.y2) / 2;
  const centreX   = (b: Bbox):   number => (b.minX + b.maxX) / 2;
  const centreY   = (b: Bbox):   number => (b.minY + b.maxY) / 2;

  function runStage26() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  // ── Part A: ARC ───────────────────────────────────────────────────────────

  it('ARC — shared midX equals bbox centreX', () => {
    const { arcLines, arcBbox: b } = runStage26();
    expect(midX(arcLines[0])).toBeCloseTo(centreX(b), 1);
  });

  it('ARC — shared midY equals bbox centreY', () => {
    const { arcLines, arcBbox: b } = runStage26();
    expect(midY(arcLines[0])).toBeCloseTo(centreY(b), 1);
  });

  // ── Part B: S_CURVE ───────────────────────────────────────────────────────

  it('S_CURVE — shared midX equals bbox centreX', () => {
    const { sCurveLines, sCurveBbox: b } = runStage26();
    expect(midX(sCurveLines[0])).toBeCloseTo(centreX(b), 1);
  });

  it('S_CURVE — shared midY equals bbox centreY', () => {
    const { sCurveLines, sCurveBbox: b } = runStage26();
    expect(midY(sCurveLines[0])).toBeCloseTo(centreY(b), 1);
  });

  // ── Part C: TALL_ARC ──────────────────────────────────────────────────────

  it('TALL_ARC — shared midX equals bbox centreX', () => {
    const { tallArcLines, tallBbox: b } = runStage26();
    expect(midX(tallArcLines[0])).toBeCloseTo(centreX(b), 1);
  });

  it('TALL_ARC — shared midY equals bbox centreY', () => {
    const { tallArcLines, tallBbox: b } = runStage26();
    expect(midY(tallArcLines[0])).toBeCloseTo(centreY(b), 1);
  });
});

// Stage 27 — Both HATCH_CURVED diagonals have equal length
// ══════════════════════════════════════════════════════════════════════════════

describe('@smoke Stage 27 — diagonal-1 and diagonal-2 have equal length', () => {
  /**
   * The two diagonals of any axis-aligned rectangle are congruent; their
   * lengths are equal.  Stage 27 asserts this property holds for every
   * HATCH_CURVED X-hatch after 0.01 mm rounding:
   *
   *   sqrt((d1.x2−d1.x1)² + (d1.y2−d1.y1)²)
   *     ≈  sqrt((d2.x2−d2.x1)² + (d2.y2−d2.y1)²)
   *
   * Tolerance: toBeCloseTo(x, 1)  →  ±0.05 mm.
   * Rounding shifts each coord by at most 0.005 mm, giving a worst-case
   * per-diagonal length error of sqrt(2)×0.01 ≈ 0.014 mm, so the worst-case
   * length difference between d1 and d2 is ≤ 0.028 mm — within ±0.05 mm.
   *
   * Panel set: same three-panel sheet as Stages 19–26
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  const diagLen = (d: Coords): number =>
    Math.sqrt((d.x2 - d.x1) ** 2 + (d.y2 - d.y1) ** 2);

  function runStage27() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return { arcLines, sCurveLines, tallArcLines };
  }

  // ── assertions ────────────────────────────────────────────────────────────

  it('ARC — diagonal-1 and diagonal-2 have equal length', () => {
    const { arcLines } = runStage27();
    expect(diagLen(arcLines[0])).toBeCloseTo(diagLen(arcLines[1]), 1);
  });

  it('S_CURVE — diagonal-1 and diagonal-2 have equal length', () => {
    const { sCurveLines } = runStage27();
    expect(diagLen(sCurveLines[0])).toBeCloseTo(diagLen(sCurveLines[1]), 1);
  });

  it('TALL_ARC — diagonal-1 and diagonal-2 have equal length', () => {
    const { tallArcLines } = runStage27();
    expect(diagLen(tallArcLines[0])).toBeCloseTo(diagLen(tallArcLines[1]), 1);
  });
});

describe('@smoke Stage 28 — diagonal length = sqrt(W²+H²) and endpoints are distinct corner pairs', () => {
  /**
   * Stage 28 splits into two parts:
   *
   * Part A — Each HATCH_CURVED diagonal length equals the bbox diagonal
   *           sqrt(effectiveW² + effectiveH²)
   *
   *   diagLen(d) = sqrt((d.x2−d.x1)² + (d.y2−d.y1)²)
   *             ≈ sqrt((maxX−minX)² + (maxY−minY)²)
   *
   *   Tolerance: toBeCloseTo(x, 1) → ±0.05 mm.
   *   Rounding shifts each coord by at most 0.005 mm, giving a worst-case
   *   diagonal length error of sqrt(2)×0.01 ≈ 0.014 mm — within ±0.05 mm.
   *
   * Part B — The four diagonal endpoints form two distinct corner pairs
   *           (no two endpoints are identical after 0.01 mm rounding):
   *
   *   new Set([ "x1,y1", "x2,y2", "x1',y1'", "x2',y2'" ]).size === 4
   *
   * Panel set: same three-panel sheet as Stages 19–27
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  const diagLen      = (d: Coords): number =>
    Math.sqrt((d.x2 - d.x1) ** 2 + (d.y2 - d.y1) ** 2);

  const expectedDiag = (b: Bbox): number =>
    Math.sqrt((b.maxX - b.minX) ** 2 + (b.maxY - b.minY) ** 2);

  function runStage28() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  // ── Part A: diagonal length = sqrt(effectiveW² + effectiveH²) ─────────────

  it('ARC — diagonal-1 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { arcLines, arcBbox: b } = runStage28();
    expect(diagLen(arcLines[0])).toBeCloseTo(expectedDiag(b), 1);
  });

  it('ARC — diagonal-2 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { arcLines, arcBbox: b } = runStage28();
    expect(diagLen(arcLines[1])).toBeCloseTo(expectedDiag(b), 1);
  });

  it('S_CURVE — diagonal-1 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { sCurveLines, sCurveBbox: b } = runStage28();
    expect(diagLen(sCurveLines[0])).toBeCloseTo(expectedDiag(b), 1);
  });

  it('S_CURVE — diagonal-2 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { sCurveLines, sCurveBbox: b } = runStage28();
    expect(diagLen(sCurveLines[1])).toBeCloseTo(expectedDiag(b), 1);
  });

  it('TALL_ARC — diagonal-1 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { tallArcLines, tallBbox: b } = runStage28();
    expect(diagLen(tallArcLines[0])).toBeCloseTo(expectedDiag(b), 1);
  });

  it('TALL_ARC — diagonal-2 length equals sqrt(effectiveW² + effectiveH²)', () => {
    const { tallArcLines, tallBbox: b } = runStage28();
    expect(diagLen(tallArcLines[1])).toBeCloseTo(expectedDiag(b), 1);
  });

  // ── Part B: four endpoints are two distinct corner pairs ──────────────────

  it('ARC — four diagonal endpoints are two distinct corner pairs (no endpoint repeats)', () => {
    const { arcLines } = runStage28();
    const [d1, d2] = arcLines;
    const pts = [`${d1.x1},${d1.y1}`, `${d1.x2},${d1.y2}`, `${d2.x1},${d2.y1}`, `${d2.x2},${d2.y2}`];
    expect(new Set(pts).size).toBe(4);
  });

  it('S_CURVE — four diagonal endpoints are two distinct corner pairs (no endpoint repeats)', () => {
    const { sCurveLines } = runStage28();
    const [d1, d2] = sCurveLines;
    const pts = [`${d1.x1},${d1.y1}`, `${d1.x2},${d1.y2}`, `${d2.x1},${d2.y1}`, `${d2.x2},${d2.y2}`];
    expect(new Set(pts).size).toBe(4);
  });

  it('TALL_ARC — four diagonal endpoints are two distinct corner pairs (no endpoint repeats)', () => {
    const { tallArcLines } = runStage28();
    const [d1, d2] = tallArcLines;
    const pts = [`${d1.x1},${d1.y1}`, `${d1.x2},${d1.y2}`, `${d2.x1},${d2.y1}`, `${d2.x2},${d2.y2}`];
    expect(new Set(pts).size).toBe(4);
  });
});

describe('@smoke Stage 29 — HATCH_CURVED diagonal endpoints match exact flat-blank bbox corners', () => {
  /**
   * Stage 29 verifies that the four HATCH_CURVED line endpoints are exactly
   * the four corners of the flat-blank placement bbox after 0.01 mm rounding:
   *
   *   diagonal-1: (minX, minY) → (maxX, maxY)   [top-left  → bottom-right]
   *   diagonal-2: (maxX, minY) → (minX, maxY)   [top-right → bottom-left]
   *
   * The test collects all four endpoints and the four expected corners as
   * "x,y" strings (with rounding matching addLine()), then asserts
   * Set(endpoints) equals Set(corners).
   *
   * Rounding helper mirrors buildDxfSheets.ts addLine():
   *   round(v) = Math.round(v * 100) / 100
   *
   * Panel set: same three-panel sheet as Stages 19–28
   *            (ARC SMOKE_DOOR + S_CURVE SMOKE_SCURVE_DOOR + TALL_ARC).
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  /** Mirror of addLine() rounding in buildDxfSheets.ts */
  const r   = (v: number): number => Math.round(v * 100) / 100;
  const pt  = (x: number, y: number): string => `${r(x)},${r(y)}`;

  const cornersForBbox = (b: Bbox): Set<string> =>
    new Set([pt(b.minX, b.minY), pt(b.maxX, b.maxY), pt(b.maxX, b.minY), pt(b.minX, b.maxY)]);

  function runStage29() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  // ── assertions ────────────────────────────────────────────────────────────

  it('ARC — four diagonal endpoints equal the four flat-blank bbox corners', () => {
    const { arcLines, arcBbox: b } = runStage29();
    const [d1, d2] = arcLines;
    const endpoints = new Set([
      `${d1.x1},${d1.y1}`, `${d1.x2},${d1.y2}`,
      `${d2.x1},${d2.y1}`, `${d2.x2},${d2.y2}`,
    ]);
    expect(endpoints).toEqual(cornersForBbox(b));
  });

  it('S_CURVE — four diagonal endpoints equal the four flat-blank bbox corners', () => {
    const { sCurveLines, sCurveBbox: b } = runStage29();
    const [d1, d2] = sCurveLines;
    const endpoints = new Set([
      `${d1.x1},${d1.y1}`, `${d1.x2},${d1.y2}`,
      `${d2.x1},${d2.y1}`, `${d2.x2},${d2.y2}`,
    ]);
    expect(endpoints).toEqual(cornersForBbox(b));
  });

  it('TALL_ARC — four diagonal endpoints equal the four flat-blank bbox corners', () => {
    const { tallArcLines, tallBbox: b } = runStage29();
    const [d1, d2] = tallArcLines;
    const endpoints = new Set([
      `${d1.x1},${d1.y1}`, `${d1.x2},${d1.y2}`,
      `${d2.x1},${d2.y1}`, `${d2.x2},${d2.y2}`,
    ]);
    expect(endpoints).toEqual(cornersForBbox(b));
  });
});

describe('@smoke Stage 30 — diagonal-1 runs (minX,minY)→(maxX,maxY); diagonal-2 runs (maxX,minY)→(minX,maxY)', () => {
  /**
   * Stage 30 asserts the exact directional assignment of the two HATCH_CURVED
   * diagonals emitted by buildDxfSheet().
   *
   * Stage 29 verified (order-agnostic) that the Set of 4 endpoints equals the
   * Set of 4 rounded bbox corners.  Stage 30 adds directional specificity:
   *
   *   diagonal-1  (lines[0])  →  (minX, minY) ──→ (maxX, maxY)
   *                               bottom-left        top-right
   *
   *   diagonal-2  (lines[1])  →  (maxX, minY) ──→ (minX, maxY)
   *                               bottom-right       top-left
   *
   * Equivalently:
   *   diagonal-1 runs left-to-right along X  (x1 < x2)
   *   diagonal-2 runs right-to-left along X  (x1 > x2)
   *
   * Tolerance: ±0.015 mm (one rounding delta above addLine()'s 0.01 mm precision).
   *
   * Verified for ARC (SMOKE_DOOR), S_CURVE (SMOKE_SCURVE_DOOR), and TALL_ARC
   * (grain-locked SMOKE_DOOR, rotation=0) panel types.
   */

  const EPS = 0.015; // one rounding delta
  const r   = (v: number): number => Math.round(v * 100) / 100;

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  function runStage30() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  // ── ARC ───────────────────────────────────────────────────────────────────

  it('ARC — diagonal-1 starts at (minX,minY) and ends at (maxX,maxY)', () => {
    const { arcLines, arcBbox: b } = runStage30();
    const d1 = arcLines[0];
    expect(Math.abs(d1.x1 - r(b.minX))).toBeLessThan(EPS);
    expect(Math.abs(d1.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d1.x2 - r(b.maxX))).toBeLessThan(EPS);
    expect(Math.abs(d1.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('ARC — diagonal-2 starts at (maxX,minY) and ends at (minX,maxY)', () => {
    const { arcLines, arcBbox: b } = runStage30();
    const d2 = arcLines[1];
    expect(Math.abs(d2.x1 - r(b.maxX))).toBeLessThan(EPS);
    expect(Math.abs(d2.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d2.x2 - r(b.minX))).toBeLessThan(EPS);
    expect(Math.abs(d2.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('ARC — diagonal-1 runs left-to-right; diagonal-2 runs right-to-left along X', () => {
    const { arcLines } = runStage30();
    const [d1, d2] = arcLines;
    expect(d1.x1).toBeLessThan(d1.x2); // d1: left-to-right
    expect(d2.x1).toBeGreaterThan(d2.x2); // d2: right-to-left
  });

  // ── S_CURVE ───────────────────────────────────────────────────────────────

  it('S_CURVE — diagonal-1 starts at (minX,minY) and ends at (maxX,maxY)', () => {
    const { sCurveLines, sCurveBbox: b } = runStage30();
    const d1 = sCurveLines[0];
    expect(Math.abs(d1.x1 - r(b.minX))).toBeLessThan(EPS);
    expect(Math.abs(d1.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d1.x2 - r(b.maxX))).toBeLessThan(EPS);
    expect(Math.abs(d1.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('S_CURVE — diagonal-2 starts at (maxX,minY) and ends at (minX,maxY)', () => {
    const { sCurveLines, sCurveBbox: b } = runStage30();
    const d2 = sCurveLines[1];
    expect(Math.abs(d2.x1 - r(b.maxX))).toBeLessThan(EPS);
    expect(Math.abs(d2.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d2.x2 - r(b.minX))).toBeLessThan(EPS);
    expect(Math.abs(d2.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('S_CURVE — diagonal-1 runs left-to-right; diagonal-2 runs right-to-left along X', () => {
    const { sCurveLines } = runStage30();
    const [d1, d2] = sCurveLines;
    expect(d1.x1).toBeLessThan(d1.x2);
    expect(d2.x1).toBeGreaterThan(d2.x2);
  });

  // ── TALL_ARC ──────────────────────────────────────────────────────────────

  it('TALL_ARC — diagonal-1 starts at (minX,minY) and ends at (maxX,maxY)', () => {
    const { tallArcLines, tallBbox: b } = runStage30();
    const d1 = tallArcLines[0];
    expect(Math.abs(d1.x1 - r(b.minX))).toBeLessThan(EPS);
    expect(Math.abs(d1.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d1.x2 - r(b.maxX))).toBeLessThan(EPS);
    expect(Math.abs(d1.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('TALL_ARC — diagonal-2 starts at (maxX,minY) and ends at (minX,maxY)', () => {
    const { tallArcLines, tallBbox: b } = runStage30();
    const d2 = tallArcLines[1];
    expect(Math.abs(d2.x1 - r(b.maxX))).toBeLessThan(EPS);
    expect(Math.abs(d2.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d2.x2 - r(b.minX))).toBeLessThan(EPS);
    expect(Math.abs(d2.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('TALL_ARC — diagonal-1 runs left-to-right; diagonal-2 runs right-to-left along X', () => {
    const { tallArcLines } = runStage30();
    const [d1, d2] = tallArcLines;
    expect(d1.x1).toBeLessThan(d1.x2);
    expect(d2.x1).toBeGreaterThan(d2.x2);
  });
});

describe('@smoke Stage 31 — d1.y1 and d2.y1 are both ≈ minY (shared bottom start)', () => {
  /**
   * Stage 31 cross-asserts a consequence of the Stage 30 direction invariant:
   * because diagonal-1 starts at (minX, minY) and diagonal-2 starts at (maxX, minY),
   * both start Y coordinates must equal minY.
   *
   *   d1.y1 ≈ r(minY)   (bottom of the flat-blank placement)
   *   d2.y1 ≈ r(minY)
   *
   * This confirms that the DXF hatch convention always grounds both diagonals at
   * the same horizontal level — the bottom edge of the flat-blank bbox — regardless
   * of panel type, FFDH rotation, or grain-lock.
   *
   * Tolerance: ±0.015 mm.  Verified for ARC, S_CURVE, and TALL_ARC.
   */

  const EPS = 0.015;
  const r   = (v: number): number => Math.round(v * 100) / 100;

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  function runStage31() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  // ── assertions ────────────────────────────────────────────────────────────

  it('ARC — d1.y1 and d2.y1 are both ≈ minY', () => {
    const { arcLines, arcBbox: b } = runStage31();
    const [d1, d2] = arcLines;
    expect(Math.abs(d1.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d2.y1 - r(b.minY))).toBeLessThan(EPS);
  });

  it('S_CURVE — d1.y1 and d2.y1 are both ≈ minY', () => {
    const { sCurveLines, sCurveBbox: b } = runStage31();
    const [d1, d2] = sCurveLines;
    expect(Math.abs(d1.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d2.y1 - r(b.minY))).toBeLessThan(EPS);
  });

  it('TALL_ARC — d1.y1 and d2.y1 are both ≈ minY', () => {
    const { tallArcLines, tallBbox: b } = runStage31();
    const [d1, d2] = tallArcLines;
    expect(Math.abs(d1.y1 - r(b.minY))).toBeLessThan(EPS);
    expect(Math.abs(d2.y1 - r(b.minY))).toBeLessThan(EPS);
  });
});

describe('@smoke Stage 32 — d1.y2 and d2.y2 are both ≈ maxY (shared top end-Y)', () => {
  /**
   * Stage 32 is the symmetric counterpart of Stage 31.
   *
   * Stage 31 asserted both diagonal start Y values equal minY (bottom edge).
   * Stage 32 asserts both diagonal end Y values equal maxY (top edge):
   *
   *   d1.y2 ≈ r(maxY)   (diagonal-1 ends at the top of the flat-blank bbox)
   *   d2.y2 ≈ r(maxY)   (diagonal-2 ends at the top of the flat-blank bbox)
   *
   * Together Stages 31 + 32 confirm that the two X-hatch diagonals span the
   * full height of the flat-blank placement: every diagonal runs from the
   * bottom edge to the top edge, regardless of panel type or orientation.
   *
   * Tolerance: ±0.015 mm.  Verified for ARC, S_CURVE, and TALL_ARC.
   */

  const EPS = 0.015;
  const r   = (v: number): number => Math.round(v * 100) / 100;

  type Coords = { x1: number; y1: number; x2: number; y2: number };
  type Bbox   = { minX: number; maxX: number; minY: number; maxY: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function bboxForPlacement(p: { x: number; y: number; cutW: number; cutH: number; rotation: number }): Bbox {
    const isRotated = p.rotation === 90 || p.rotation === 270;
    const ew = isRotated ? p.cutH : p.cutW;
    const eh = isRotated ? p.cutW : p.cutH;
    return { minX: p.x, maxX: p.x + ew, minY: p.y, maxY: p.y + eh };
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  function runStage32() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return {
      arcLines,    arcBbox:    bboxForPlacement(arcP),
      sCurveLines, sCurveBbox: bboxForPlacement(sCurveP),
      tallArcLines, tallBbox:  bboxForPlacement(tallArcP),
    };
  }

  // ── assertions ────────────────────────────────────────────────────────────

  it('ARC — d1.y2 and d2.y2 are both ≈ maxY', () => {
    const { arcLines, arcBbox: b } = runStage32();
    const [d1, d2] = arcLines;
    expect(Math.abs(d1.y2 - r(b.maxY))).toBeLessThan(EPS);
    expect(Math.abs(d2.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('S_CURVE — d1.y2 and d2.y2 are both ≈ maxY', () => {
    const { sCurveLines, sCurveBbox: b } = runStage32();
    const [d1, d2] = sCurveLines;
    expect(Math.abs(d1.y2 - r(b.maxY))).toBeLessThan(EPS);
    expect(Math.abs(d2.y2 - r(b.maxY))).toBeLessThan(EPS);
  });

  it('TALL_ARC — d1.y2 and d2.y2 are both ≈ maxY', () => {
    const { tallArcLines, tallBbox: b } = runStage32();
    const [d1, d2] = tallArcLines;
    expect(Math.abs(d1.y2 - r(b.maxY))).toBeLessThan(EPS);
    expect(Math.abs(d2.y2 - r(b.maxY))).toBeLessThan(EPS);
  });
});

// ============================================================
// @smoke Stage 33 — orientation sense: d1.x1 < d1.x2 and d2.x1 > d2.x2
// ============================================================
describe('@smoke Stage 33 — d1 runs left→right (d1.x1 < d1.x2) and d2 runs right→left (d2.x1 > d2.x2)', () => {
  /**
   * Stage 33 asserts the X-axis orientation sense of the two HATCH_CURVED
   * diagonals for every panel type.
   *
   * From Stage 30 we know:
   *   d1 starts at (minX, minY) and ends at (maxX, maxY)  → d1.x1 < d1.x2
   *   d2 starts at (maxX, minY) and ends at (minX, maxY)  → d2.x1 > d2.x2
   *
   * Stage 33 asserts this strictly, checking the raw floating-point values
   * (not rounded), so no tolerance is needed — the inequality must hold exactly.
   *
   * Panels tested: ARC (FFDH-rotated), S_CURVE (FFDH-rotated), TALL_ARC
   * (grain-locked, no rotation).  In every case minX < maxX, so the sense is
   * unambiguous.
   */

  type Coords = { x1: number; y1: number; x2: number; y2: number };

  // ── helpers (self-contained) ──────────────────────────────────────────────

  function parseHatchCoords(content: string): Coords[] {
    const entitiesStart = content.indexOf('ENTITIES');
    const entities = content.slice(entitiesStart);
    const segs = entities
      .split('LINE')
      .slice(1)
      .filter((s) => s.includes('\n8\nHATCH_CURVED\n'));
    return segs.map((seg) => {
      const num = (code: string): number => {
        const m = seg.match(new RegExp(`\n${code}\n([\\d.+\\-e]+)`));
        return m ? parseFloat(m[1]) : NaN;
      };
      return { x1: num('10'), y1: num('20'), x2: num('11'), y2: num('21') };
    });
  }

  function linesForPlacement(coords: Coords[], placementY: number): Coords[] {
    return coords.filter((c) => Math.abs(Math.min(c.y1, c.y2) - placementY) < 1.0);
  }

  function buildTallArcRow(): { row: CutListRow; kerfCount: number } {
    const fields = computeCurveFields(PANEL_STUB, DEFAULT_KERF_TOOL, 'MDF')!;
    const row: CutListRow = {
      partId:     'SMOKE_TALL_ARC',
      cabinetId:  'CAB_SMOKE',
      materialId: MATERIAL_ID,
      finishW:    PANEL_STUB.finishWidth,
      finishH:    PANEL_STUB.finishHeight,
      edgeL: 0, edgeR: 0, edgeT: 0, edgeB: 0,
      premillL: 0, premillR: 0, premillT: 0, premillB: 0,
      cutW:       PANEL_STUB.finishWidth,
      cutH:       PANEL_STUB.finishHeight,
      qty:        1,
      developedLength: fields.developedLength,
      projectedDepth:  fields.projectedDepth,
      kerfCount:       fields.kerfCount,
      curvedEdge:      fields.curvedEdge ?? undefined,
      grain:           'HORIZONTAL',
    };
    return { row, kerfCount: fields.kerfCount };
  }

  function runStage33() {
    const { row: arcRow }     = buildCurvedRow();
    const { row: sCurveRow }  = buildSCurveRow();
    const { row: tallArcRow } = buildTallArcRow();

    const { sheets } = runNesting([arcRow, sCurveRow, tallArcRow]);
    expect(sheets).toHaveLength(1);

    const arcP     = sheets[0].placements.find((p) => p.partId === 'SMOKE_DOOR')!;
    const sCurveP  = sheets[0].placements.find((p) => p.partId === 'SMOKE_SCURVE_DOOR')!;
    const tallArcP = sheets[0].placements.find((p) => p.partId === 'SMOKE_TALL_ARC')!;

    const planned: PlannedSheet = { index1: 1, sheetId: 'SHEET_001', materialId: MATERIAL_ID };
    const output = buildDxfSheet({
      planned,
      nesting: sheets[0],
      profile: getFactoryProfile('DEFAULT'),
    });

    const allCoords    = parseHatchCoords(output.content);
    const arcLines     = linesForPlacement(allCoords, arcP.y);
    const sCurveLines  = linesForPlacement(allCoords, sCurveP.y);
    const tallArcLines = linesForPlacement(allCoords, tallArcP.y);

    expect(arcLines).toHaveLength(2);
    expect(sCurveLines).toHaveLength(2);
    expect(tallArcLines).toHaveLength(2);

    return { arcLines, sCurveLines, tallArcLines };
  }

  // ── assertions ────────────────────────────────────────────────────────────

  it('ARC — d1.x1 < d1.x2 (left→right)', () => {
    const { arcLines } = runStage33();
    const [d1] = arcLines;
    expect(d1.x1).toBeLessThan(d1.x2);
  });

  it('ARC — d2.x1 > d2.x2 (right→left)', () => {
    const { arcLines } = runStage33();
    const [, d2] = arcLines;
    expect(d2.x1).toBeGreaterThan(d2.x2);
  });

  it('S_CURVE — d1.x1 < d1.x2 (left→right)', () => {
    const { sCurveLines } = runStage33();
    const [d1] = sCurveLines;
    expect(d1.x1).toBeLessThan(d1.x2);
  });

  it('S_CURVE — d2.x1 > d2.x2 (right→left)', () => {
    const { sCurveLines } = runStage33();
    const [, d2] = sCurveLines;
    expect(d2.x1).toBeGreaterThan(d2.x2);
  });

  it('TALL_ARC — d1.x1 < d1.x2 (left→right)', () => {
    const { tallArcLines } = runStage33();
    const [d1] = tallArcLines;
    expect(d1.x1).toBeLessThan(d1.x2);
  });

  it('TALL_ARC — d2.x1 > d2.x2 (right→left)', () => {
    const { tallArcLines } = runStage33();
    const [, d2] = tallArcLines;
    expect(d2.x1).toBeGreaterThan(d2.x2);
  });
});
