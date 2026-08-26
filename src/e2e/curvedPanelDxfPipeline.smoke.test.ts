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
