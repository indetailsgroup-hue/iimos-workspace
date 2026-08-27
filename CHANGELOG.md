# Changelog

All notable changes to the Monolith project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.1.0] – 2026-08-27

### Minor Release — Sub-Label kerfCount Verification Milestone (Stages 70–73)

This release completes the **sub-label kerfCount verification milestone**, adding Stages 70–71
(sub-label correctness for kerfCount=1 and independent dual-panel sub-labels), Stage 72
(kerfCount=0 override guard), and Stage 73 (triple-panel independent sub-label verification).

#### Stage 70 — kerfCount=1 Sub-Label

- Panel with `kerfCount=1` produces exactly 2 HATCH_CURVED lines and the DXF LABELS sub-label
  reads `(CURVED / 1 cuts)` end-to-end through `runNesting → buildDxfSheets`.

#### Stage 71 — Independent Dual-Panel Sub-Labels

- Two curved panels with `kerfCount=3` and `kerfCount=7` on the same sheet each emit the
  correct `(CURVED / N cuts)` sub-label independently, verified via LABELS TEXT isolation.

#### Stage 72 — kerfCount=0 Override Guard

- Added optimizer guard: `kerfCount=0` explicitly overrides `isCurved` to `false` even when
  `correction > 0`, preventing phantom curved DXF output for panels with no kerf cuts.
- Panel with `kerfCount=0`, `developedLength=250`, `projectedDepth=200` → `correction=50 > 0`
  but `isCurved=false` → zero HATCH_CURVED lines in DXF.
- Stage 69 fixture corrected: `kerfCount` field removed (boundary test targets correction
  threshold only, not kerfCount behaviour).

#### Stage 73 — Independent Triple-Panel Sub-Labels

- Three curved panels with `kerfCount=1`, `kerfCount=5`, and `kerfCount=12` on the same sheet
  each emit the correct `(CURVED / N cuts)` sub-label independently in the DXF LABELS layer.

#### Test Suite

- **326 smoke tests passing** (0 failures).

---

## [5.0.0] – 2026-08-27

### Major Release — Rotation-Invariance Milestone & Sub-Label kerfCount Verification

This major release completes the **rotation-invariance milestone** for the Curved Panel DXF
pipeline, adding full rotation-symmetry verification for HATCH_CURVED diagonal geometry across
all four rotation angles, boundary guard stages for zero/negative correction exclusion, a
determinism regression guard, and a new sub-label kerfCount verification series (Stages 70–71).

#### Rotation-Symmetry Series (Stages 61–68)

- **Stage 61** — rotation=180 HATCH_CURVED diagonal corners match flat-blank bbox.
- **Stage 62** — HATCH_CURVED diagonals have strictly non-zero length (|Δx|+|Δy| > 1.0 mm)
  for ARC, S_CURVE, and TALL_ARC.
- **Stage 63** — Determinism regression guard: re-running `runNesting` twice with the same
  `CutListRow` produces identical HATCH_CURVED line coordinates for ARC and S_CURVE.
- **Stage 64** — rotation=270 HATCH_CURVED diagonal corners match flat-blank bbox
  (effective w=cutH, h=cutW, mirroring rotation=90 behaviour).
- **Stage 65** — Panel with `projectedDepth=0` (flat panel forced into curved pipeline)
  emits zero HATCH_CURVED lines and `isCurved=false`.
- **Stage 66** — Panel with `developedLength < projectedDepth` (negative correction) also
  emits zero HATCH_CURVED lines and `isCurved=false`.
- **Stage 67** — rotation=90 and rotation=270 HATCH_CURVED endpoints are point-reflections
  through the sheet centre.
- **Stage 68** — rotation=0 and rotation=180 HATCH_CURVED endpoints are point-reflections
  through the sheet centre (symmetric counterpart of Stage 67).

#### Boundary Guard Series (Stages 65–69)

- **Stage 65** — Zero-correction exclusion: `projectedDepth=0` → zero HATCH_CURVED lines.
- **Stage 66** — Negative-correction exclusion: `developedLength < projectedDepth` →
  zero HATCH_CURVED lines.
- **Stage 69** — Boundary positive guard: `correction=0.001` (barely positive) →
  `isCurved=true` and exactly 2 HATCH_CURVED lines emitted.

#### Sub-Label kerfCount Verification Series (Stages 70–71)

- **Stage 70** — Panel with `kerfCount=1` emits exactly 2 HATCH_CURVED lines and the DXF
  LABELS sub-label reads `'(CURVED / 1 cuts)'` end-to-end through `runNesting →
  buildDxfSheets`.
- **Stage 71** — Two curved panels with distinct kerfCounts (kc=3, kc=7) on the same sheet
  each emit the correct `'(CURVED / N cuts)'` sub-label independently, verified via
  `parseCurvedLabelCounts` isolation on the LABELS TEXT layer.

#### Test Suite

- **324 smoke tests passing** (0 failures).

---

## [4.4.0] - 2026-08-27

### Added

#### Smoke Test — Stage 68: rotation=0 and rotation=180 HATCH_CURVED endpoints are point-reflections through the sheet centre
- Symmetric counterpart of Stage 67, which verified the rotation=90–270 axis.
- Two separate `NestingSheet`s constructed with `sheetW=2440`, `sheetH=1220`
  (centre `cx=1220`, `cy=610`).
- Placement 1 (rotation=0) placed at `(10, 10)`; Placement 2 (rotation=180)
  placed at `(2·cx−P_X−w, 2·cy−P_Y−h)` so that the two bboxes are
  symmetric about the sheet centre.
- Both rotations use `w=cutW`, `h=cutH` (identical effective dimensions, as
  `getRotatedDimensions` returns `{w:cutW, h:cutH}` for both 0° and 180°).
- Asserts: for every endpoint `(ex, ey)` from the rotation=0 HATCH_CURVED lines,
  the reflected point `(round(2·cx−ex), round(2·cy−ey))` equals one of the
  rotation=180 endpoints (ε < 0.02 mm).
- 1 `it()` block.

#### Smoke Test — Stage 69: panel with correction=0.001 (barely positive) gets isCurved=true and emits exactly 2 HATCH_CURVED lines
- Boundary test: the smallest representable positive correction must trigger the
  curved pipeline.
- Constructs a `CutListRow` with `developedLength=200.001`, `projectedDepth=200`,
  `curvedEdge='TOP'` — giving `correction = 0.001 mm > 0`.
- Confirms `isCurved=true` in the produced `NestingSheet` placement via
  `runNesting`.
- Asserts `HATCH_CURVED` LINE count equals exactly 2 (diagonal `d1` + `d2`) in
  the DXF output via `buildDxfSheet`.
- 1 `it()` block.

#### JSDoc
- Smoke test file header updated from `Stages 22 – 67` to `Stages 22 – 69`; table
  entries added for Stages 68 and 69.
- `buildDxfSheets.ts` cross-reference updated from `(Stages 7 – 67)` to `(Stages 7 – 69)`.

### Milestone
- **Negative-correction exclusion and reflection-symmetry milestone** (Stages 66–67):
  negative-correction `isCurved=false` exclusion (Stage 66) and rotation=90/270
  point-reflection symmetry (Stage 67) — grouped here for milestone traceability.
- Total smoke-test coverage: **322 tests** across 69 stages.

## [4.3.0] - 2026-08-27

### Added

#### Smoke Test — Stage 66: negative correction emits zero HATCH_CURVED lines
- Constructs a `CutListRow` with `developedLength=50`, `projectedDepth=200` so
  `correction = 50 − 200 = −150 < 0`.
- Confirms `isCurved=false` in the produced `NestingSheet` placement (negative
  correction does **not** satisfy `correction > 0`).
- Asserts `HATCH_CURVED` LINE count equals zero in the DXF output.
- Guards against accidental HATCH_CURVED emission for physically invalid (under-developed)
  panel specifications that reach the nesting pipeline.
- 1 `it()` block.

#### Smoke Test — Stage 67: rotation=90 and rotation=270 HATCH_CURVED endpoints are point-reflections through the sheet centre
- Two separate `NestingSheet`s are constructed with `sheetW=2440`, `sheetH=1220`
  (centre `cx=1220`, `cy=610`).
- Placement 1 (rotation=90) placed at `(10, 10)`; Placement 2 (rotation=270)
  placed at `(2·cx−P_X−w, 2·cy−P_Y−h)` so that the two bboxes are
  symmetric about the sheet centre.
- Both rotations use `w=cutH`, `h=cutW` (identical effective dimensions).
- Asserts: for every endpoint `(ex, ey)` from the rotation=90 HATCH_CURVED lines,
  the reflected point `(round(2·cx−ex), round(2·cy−ey))` equals one of the
  rotation=270 endpoints (ε < 0.02 mm).
- 1 `it()` block.

#### JSDoc
- Smoke test file header updated from `Stages 22 – 65` to `Stages 22 – 67`; table
  entries added for Stages 66 and 67.
- `buildDxfSheets.ts` cross-reference updated from `(Stages 7 – 65)` to `(Stages 7 – 67)`.

### Milestone
- **Rotation-270 and zero-correction exclusion milestone** (Stages 64–65): rotation=270
  diagonal correctness (Stage 64) and zero-correction `isCurved=false` exclusion
  (Stage 65) — grouped here for milestone traceability.
- Total smoke-test coverage: **320 tests** across 67 stages.

## [4.2.0] - 2026-08-27

### Added

#### Smoke Test — Stage 64: rotation=270 HATCH_CURVED diagonal correctness
- Manually constructed `NestingSheet` with `rotation=270` for the ARC fixture.
- Asserts `getRotatedDimensions(cutW, cutH, 270)` returns `{ w: cutH, h: cutW }` (same
  branch as `rotation=90`), confirming the symmetric rotation guard.
- Verifies d1 and d2 each span the correct flat-blank bbox corners (ε < 0.02 mm).
- 1 `it()` block.

#### Smoke Test — Stage 65: zero-correction panel emits zero HATCH_CURVED lines
- Constructs a `CutListRow` with `developedLength=0`, `projectedDepth=0`,
  `curvedEdge='TOP'` so `correction = developedLength − projectedDepth = 0`.
- Confirms `isCurved=false` in the produced `NestingSheet` placement.
- Asserts `HATCH_CURVED` LINE count equals zero in the DXF output.
- Guards against false positives from the curved pipeline when a flat panel is
  accidentally routed through it.
- 1 `it()` block.

#### JSDoc
- Smoke test file header updated from `Stages 22 – 63` to `Stages 22 – 65`; table
  entries added for Stages 64 and 65.
- `buildDxfSheets.ts` cross-reference updated from `(Stages 7 – 63)` to `(Stages 7 – 65)`.

### Milestone
- **Rotation-guard and determinism milestone** (Stages 61–63): rotation=180 diagonal
  correctness (Stage 61), non-zero diagonal length guard for all three panel types
  (Stage 62), and HATCH_CURVED coordinate determinism across two `runNesting` runs
  (Stage 63) — all fully covered as of v4.1.0; documented here for milestone traceability.
- Total smoke-test coverage: **318 tests** across 65 stages.

## [4.1.0] - 2026-08-27

### Added

#### Smoke Stage 61 — rotation=180 HATCH_CURVED diagonal correctness
- Manually constructed `NestingSheet` with a curved placement assigned `rotation=180`.
- `getRotatedDimensions` returns `{ w: cutW, h: cutH }` for `rotation=180` (identical to
  `rotation=0`); asserts this behaviour propagates correctly through `buildDxfSheet`.
- 1 it() block: d1 and d2 span the correct flat-blank bbox corners (ε < 0.02 mm).

#### Smoke Stage 62 — HATCH_CURVED diagonals are non-degenerate (all fixtures)
- 3 it() blocks (ARC, S_CURVE, TALL_ARC): for each HATCH_CURVED line on a single-panel
  sheet, asserts Manhattan length `|x2−x1| + |y2−y1| > 1.0 mm`.
- Guards against zero-length or collapsed diagonal emission for any realistic panel size.

#### Smoke Stage 63 — HATCH_CURVED determinism regression guard
- 2 it() blocks (ARC, S_CURVE): calls `runNesting` twice with the same `CutListRow`,
  builds a DXF from each result, and asserts all four HATCH_CURVED coordinate values
  (`x1`, `y1`, `x2`, `y2`) are **bit-for-bit identical** between runs.
- Protects against any future introduction of non-determinism (random UUIDs, `Map` key
  ordering, `Date.now()` seeds, etc.) in the nesting or DXF-building pipeline.

### Changed

- `buildDxfSheets.ts` JSDoc reference updated to `(Stages 7 – 63)`.
- Smoke test module header updated to `Stages 22 – 63`; stage table extended with
  entries for Stages 61, 62, and 63.
- Added `NestingSheet` to the smoke test's import from `monolithExportContext` to
  support manual fixture construction in Stage 61.

## [4.0.0] - 2026-08-27

### BREAKING CHANGE

This major release marks the completion of the **HATCH_CURVED Geometric Verification Series**
(Smoke Stages 52 – 60). All HATCH_CURVED diagonal geometry is now fully validated end-to-end
against flat-blank placement coordinates. Any downstream test that previously relied on
undocumented HATCH_CURVED line ordering must be updated to use bbox-proximity matching.

### Added

#### Smoke Stage 52 — HATCH_CURVED count invariant: single-panel sheets
- `countHATCHCURVEDLines()` helper counts HATCH_CURVED LINE entities in DXF content.
- 3 it() blocks (ARC, S_CURVE, TALL_ARC): each single-panel sheet emits exactly 2 HATCH_CURVED
  lines (one d1 diagonal, one d2 diagonal).

#### Smoke Stage 53 — HATCH_CURVED count invariant: two-panel sheet (ARC + S_CURVE)
- 1 it() block: ARC + S_CURVE on the same sheet produces exactly 4 HATCH_CURVED lines
  (2 × curved_count rule confirmed for multi-panel sheets).

#### Smoke Stage 54 — HATCH_CURVED diagonal geometry: ARC fixture
- `parseHATCHCURVEDLines()` helper parses HATCH_CURVED LINE segments from DXF content.
- 1 it() block: both diagonal lines span the four flat-blank bbox corners
  (ε < 0.015 mm): d1 from (minX,minY)→(maxX,maxY), d2 from (maxX,minY)→(minX,maxY).

#### Smoke Stage 55 — HATCH_CURVED diagonal geometry: S_CURVE fixture (rotation=90)
- 1 it() block: rotation-aware w/h (w=cutH, h=cutW for rotation=90); d1/d2 corners
  verified at ε < 0.015 mm.

#### Smoke Stage 56 — HATCH_CURVED diagonal geometry: TALL_ARC fixture (rotation=0)
- 1 it() block: grain=HORIZONTAL forces rotation=0; cutW and cutH used directly;
  d1/d2 corners verified at ε < 0.015 mm.

#### Smoke Stage 57 — per-panel HATCH_CURVED isolation: ARC + S_CURVE two-panel sheet
- `isD1()`/`isD2()` proximity helpers match HATCH_CURVED lines to a specific placement
  bbox rather than relying on emission order.
- 1 it() block: each placement owns exactly 1 d1 match and 1 d2 match from 4 total lines.

#### Smoke Stage 58 — HATCH_CURVED diagonal intersection equals flat-blank bbox centre
- 3 it() blocks (ARC, S_CURVE, TALL_ARC): intersection computed as midpoint of d1
  `(intersectionX = (d1.x1+d1.x2)/2, intersectionY = (d1.y1+d1.y2)/2)` equals
  expected bbox centre to within ε < 0.015 mm.

#### Smoke Stage 59 — overlapping-Y HATCH_CURVED proximity isolation
- Fixture: two ARC panels (finishWidth=400 and finishWidth=300) on a wide sheet
  (sheetWidth=3000); FFDH places both at y_start=10 → Y ranges [10,410] and [10,310]
  overlap.
- 1 it() block: asserts `sheets.length===1`, `placements.length===2`,
  `placements[0].y === placements[1].y` (same row confirmed), then uses
  `isD1_59()`/`isD2_59()` proximity helpers to assert each placement still owns
  exactly 1 d1 and 1 d2 from 4 total HATCH_CURVED lines.

#### Smoke Stage 60 — diagonal intersection strictly inside flat-blank bbox
- 3 it() blocks (ARC, S_CURVE, TALL_ARC): strict inequality assertions
  `minX < intersectionX < maxX` and `minY < intersectionY < maxY` (no tolerance required
  for centre-point containment; reuses same midpoint formula as Stage 58).

### Changed

- `buildDxfSheets.ts` JSDoc reference updated to `(Stages 7 – 60)`.
- Smoke test module header updated to `Stages 22 – 60`; stage table extended with
  entries for Stages 59 and 60.

## [3.8.0] - 2026-08-27

### Overview
Completes the **full three-fixture HATCH_CURVED diagonal geometry milestone** (Stages 55–56) and
adds two new stages (57–58) that extend diagonal assertions to multi-panel isolation and diagonal
intersection-point geometry.  All three panel types (ARC, S_CURVE, TALL_ARC) are now fully
verified for per-panel diagonal identity and bbox-centre intersection.

### Added

#### Stage 57 — Per-Panel Diagonal Isolation: ARC + S_CURVE Two-Panel Sheet
- ARC + S_CURVE on the same sheet (1 `NestingSheet`, 2 placements, 4 `HATCH_CURVED` LINEs total).
- **Helper functions** `isD1(line, minX, minY, maxX, maxY, eps)` and `isD2(...)` match each line
  to a placement's bbox by corner proximity.
- For **each** placement the test filters all 4 lines and asserts:
  - `d1Matches.length === 1` — exactly one d1 diagonal belongs to this panel.
  - `d2Matches.length === 1` — exactly one d2 diagonal belongs to this panel.
- Approach is robust against FFDH ordering changes (proximity-based, not index-based).
- 1 it() block.

#### Stage 58 — HATCH_CURVED Diagonal Intersection Equals Flat-Blank Bbox Centre
- For each of the three panel types (ARC, S_CURVE, TALL_ARC) on a single-panel sheet:
  - Parses 2 `HATCH_CURVED` LINE entities.
  - Computes intersection as midpoint of d1:
    `intersectionX = (d1.x1 + d1.x2) / 2`, `intersectionY = (d1.y1 + d1.y2) / 2`.
  - Expected centre: `expectedCentreX = (r(p.x) + r(p.x + w)) / 2`,
    `expectedCentreY = (r(p.y) + r(p.y + h)) / 2`.
  - Asserts `|intersectionX − expectedCentreX| < 0.015 mm` and same for Y.
- TALL_ARC variant uses local `buildTallArcRow()` with `partId='SMOKE_TALL_ARC_58'` and
  `materialId=MATERIAL_ID`; guards `placement.rotation === 0`.
- 3 it() blocks (one per panel type).

### Changed
- `buildDxfSheets.ts` JSDoc reference updated from `(Stages 7 – 56)` → `(Stages 7 – 58)`.
- Smoke test module JSDoc section header updated from `Stages 22 – 56` → `Stages 22 – 58`.
- Smoke test JSDoc stage table extended with entries for Stages 57–58.

### Tests
- **306 smoke tests passing** (up from 302); 0 failures; 0 TypeScript errors.

---

## [3.7.0] - 2026-08-27

### Overview
Completes the **two-panel HATCH_CURVED count and diagonal geometry milestone** (Stages 53–54) and
adds two new diagonal-geometry stages (55–56) that extend the bbox-corner assertions from the ARC
fixture to the S_CURVE (rotation=90) and TALL_ARC (grain=HORIZONTAL, rotation=0) fixtures,
fully covering all three panel types.

### Added

#### Stage 55 — S_CURVE: HATCH_CURVED Diagonal Pairs Span Correct Flat-Blank Bbox Corners
- S_CURVE single-panel sheet; placement `p` retrieved from `runNesting` output.
- FFDH rotates (rotation=90): `w = p.cutH` (flatBlankH ≈ 1051.8 mm), `h = p.cutW` (500 mm).
- Asserts exactly 2 `HATCH_CURVED` LINE entities.
- **d1** `(minX, minY) → (maxX, maxY)`: each coordinate checked ε < 0.015 mm.
- **d2** `(maxX, minY) → (minX, maxY)`: each coordinate checked ε < 0.015 mm.
- 1 it() block.

#### Stage 56 — TALL_ARC (grain=HORIZONTAL, rotation=0): HATCH_CURVED Diagonal Pairs Span Correct Flat-Blank Bbox Corners
- TALL_ARC single-panel sheet (`grain='HORIZONTAL'`, `materialId=MATERIAL_ID`, `partId='SMOKE_TALL_ARC_56'`).
- `canRotate=false` → FFDH keeps rotation=0: `w = p.cutW` (400 mm), `h = p.cutH` (flatBlankH ≈ 909.44 mm).
- **Additional guard**: asserts `placement.rotation === 0` before checking diagonals.
- Asserts exactly 2 `HATCH_CURVED` LINE entities.
- **d1** `(minX, minY) → (maxX, maxY)`: each coordinate checked ε < 0.015 mm.
- **d2** `(maxX, minY) → (minX, maxY)`: each coordinate checked ε < 0.015 mm.
- 1 it() block.

### Changed
- `buildDxfSheets.ts` JSDoc reference updated from `(Stages 7 – 54)` → `(Stages 7 – 56)`.
- Smoke test module JSDoc section header updated from `Stages 22 – 54` → `Stages 22 – 56`.
- Smoke test JSDoc stage table extended with entries for Stages 55–56.

### Tests
- **302 smoke tests passing** (up from 300); 0 failures; 0 TypeScript errors.

---

## [3.6.0] - 2026-08-27

### Overview
Completes the **three-panel count and HATCH_CURVED invariant milestone** (Stages 51–52) and adds
two new HATCH_CURVED count and geometry stages (53–54) that fully pin the cross-hatch diagonal
structure to the flat-blank bbox for every curved panel configuration.

### Added

#### Stage 53 — Two-Panel Sheet: HATCH_CURVED LINE Count = 4 (2 × 2)
- Nests ARC + S_CURVE onto a single sheet via `runNesting` (both rows carry `materialId=MATERIAL_ID`).
- Asserts `sheets.length === 1` (single shared sheet).
- Asserts total `HATCH_CURVED` LINE count = 4 (two diagonal X-lines per curved panel × 2 panels).
- 1 it() block.

#### Stage 54 — HATCH_CURVED Diagonal Pairs Span Correct Flat-Blank Bbox Corners (ARC)
- ARC single-panel sheet; placement `p` retrieved from `runNesting` output.
- Derives effective dimensions `w, h` from `getRotatedDimensions(p.cutW, p.cutH, p.rotation)`.
- Asserts exactly 2 `HATCH_CURVED` LINE entities.
- **d1** `(minX, minY) → (maxX, maxY)` (bottom-left → top-right): each coordinate checked `ε < 0.015 mm`.
- **d2** `(maxX, minY) → (minX, maxY)` (bottom-right → top-left): each coordinate checked `ε < 0.015 mm`.
- 1 it() block.

### Changed
- `buildDxfSheets.ts` JSDoc reference updated from `(Stages 7 – 52)` → `(Stages 7 – 54)`.
- Smoke test module JSDoc section header updated from `Stages 22 – 52` → `Stages 22 – 54`.
- Smoke test JSDoc stage table extended with entries for Stages 47–54.

### Tests
- **300 smoke tests passing** (up from 298); 0 failures; 0 TypeScript errors.

---

## [3.5.0] - 2026-08-27

### Overview
Completes the **multi-panel count and SHEET boundary milestone** (Stages 49–50) and adds two new
geometric invariant stages (51–52) that harden the smoke suite against panel-grouping regressions
and HATCH_CURVED line-count drift.

### Added

#### Stage 49 — Two Curved Panels: PARTS_CURVED Count = 8 + Non-Overlapping Bboxes
- Nests ARC + S_CURVE onto a single sheet via `runNesting`.
- Asserts total `PARTS_CURVED` LINE count = 8 (4 per panel).
- Parses per-panel bounding rectangles with `parsePARTSCURVEDRectList()` and asserts the two
  bboxes are fully non-overlapping.

#### Stage 50 — SHEET Layer Always Has Exactly 4 LINE Entities
- Runs three distinct sheet configurations: single curved panel, two curved panels, mixed
  curved + straight panel.
- For each configuration asserts `SHEET` LINE count = 4 (one boundary rectangle per sheet,
  constant regardless of placement count).

#### Stage 51 — Three Curved Panels: PARTS_CURVED Count = 12 + Mutually Non-Overlapping Bboxes
- Nests TALL_ARC (`grain=HORIZONTAL`, `materialId=MDF_18`) + S_CURVE + ARC onto a single sheet.
- Asserts total `PARTS_CURVED` LINE count = 12 (4 per panel).
- Parses all three per-panel bounding rectangles and asserts every pair (0-1, 0-2, 1-2) is
  fully non-overlapping.
- **Key fix**: `buildTallArcRow()` must carry `materialId: MATERIAL_ID` so `groupByMaterial`
  places all three rows on the same sheet.

#### Stage 52 — HATCH_CURVED LINE Count = 2 × curved_count (Single-Panel Sheets)
- Three independent it() blocks: ARC, S_CURVE, TALL_ARC.
- Asserts `HATCH_CURVED` LINE count = 2 for each single-panel sheet (two diagonal cross-hatch
  lines per curved panel).

### Changed
- `buildDxfSheets.ts` JSDoc reference updated from `(Stages 7 – 50)` → `(Stages 7 – 52)`.
- Smoke test JSDoc section header updated from `Stages 22 – 50` → `Stages 22 – 52`.

### Tests
- **298 smoke tests passing** (up from 294); 0 failures; 0 TypeScript errors.

---

## [3.4.0] - 2026-08-27

### Overview
Minor release completing the **layer-count and non-overlap validation milestone**
(Stages 47–50).  Stages 47–48 (per-panel PARTS_CURVED count and mixed-sheet
non-overlap, shipped in v3.3.0) are joined here by two new stages that cover
multi-curved-panel count invariants and the unconditional SHEET-boundary count.
Together these four stages close the full layer-count arc for every DXF LINE
entity emitted by `buildDxfSheet`.

### Added

#### Stage 49 — two curved panels on the same sheet: PARTS_CURVED count = 8, bboxes non-overlapping
- **Helper `parsePARTSCURVEDRectList(content)`** (Stage 49 describe scope):
  filters all `PARTS_CURVED` LINE segments, chunks them into groups of 4
  (one group per `addRectangle()` call), and returns an array of
  `{ minX, minY, maxX, maxY }` objects — one per curved placement.
- **1 `it()` block** (ARC + S_CURVE):
  - Nests both panels via `runNesting([arcRow, sCurveRow])` and locates the
    sheet where `placements.filter(isCurved).length >= 2`.
  - Asserts total `PARTS_CURVED` LINE count = **8**.
  - Parses the two per-panel bboxes with `parsePARTSCURVEDRectList` and
    asserts `rects.length === 2` plus `noOverlapX || noOverlapY` (ε < 0.015 mm).
- Confirms the additive `4 × curved_count` invariant for multi-panel sheets
  and that FFDH places the two curved panels in distinct, non-intersecting
  shelf regions (S_CURVE shelf-1 y ≈ 10; ARC shelf-2 y ≈ 513.5 mm).

#### Stage 50 — SHEET layer LINE count is always exactly 4
- **Helper `countSHEETLines(content)`**: counts LINE entities whose segment
  starts with `'8\nSHEET\n'`.
- **3 `it()` blocks**:
  - **(a) single curved panel (ARC)**: `SHEET` count = 4.
  - **(b) two curved panels (ARC + S_CURVE)** on the same sheet:
    `SHEET` count = 4.
  - **(c) mixed sheet (ARC + STRAIGHT_ROW)**: `SHEET` count = 4.
- Verifies that `addRectangle(0, 0, sheetW, sheetH, 'SHEET')` is called
  exactly once per `buildDxfSheet()` invocation regardless of how many
  or what type of placements the nesting sheet carries.

### Changed
- **JSDoc** in `buildDxfSheets.ts` extended to document Stages 49–50 in the
  reference table; reference updated to `(Stages 7–50)`.
- **JSDoc** header line in `curvedPanelDxfPipeline.smoke.test.ts` updated to
  `Stages 22–50`.

## [3.3.0] - 2026-08-27

### Overview
Minor release completing the **bounding-rect validation milestone** (Stages 45–48).
Stages 45–46 (bounding-rect coordinates for `PARTS_CURVED` and `PARTS`) were
shipped in v3.2.0; this release adds the complementary **layer-count** and
**non-overlap** invariants (Stages 47–48) that together close the full
geometric verification arc for every DXF rectangle emitted by `buildDxfSheet`.

### Added

#### Stage 47 — PARTS_CURVED LINE count equals exactly 4 per curved panel
- **Helper `countPARTSCURVEDLines(content)`** (Stage 47 describe scope):
  splits DXF on `'\n0\nLINE\n'`, filters segments starting with
  `'8\nPARTS_CURVED\n'`, returns count.
- **3 `it()` blocks** (ARC, S_CURVE, TALL_ARC) each assert
  `countPARTSCURVEDLines === 4`, confirming that `addRectangle()` always
  emits exactly 4 LINE entities (bottom, right, top, left edges) per curved
  panel placement.
- Verifies the closed-rectangle invariant for the `PARTS_CURVED` layer across
  all three canonical curved-panel fixture types.

#### Stage 48 — mixed-sheet: one PARTS_CURVED rect, one PARTS rect, non-overlapping bboxes
- **Helper `countLayerLines(content, layer)`**: generalized LINE counter for
  any named DXF layer.
- **Helper `parseLayerBbox(content, layer)`**: generalized bbox parser
  returning `{ minX, minY, maxX, maxY }` for any layer; same group-code
  extraction logic as Stage 45.
- **1 `it()` block** (ARC + STRAIGHT_ROW mixed sheet):
  - Locates the sheet where `placements` contains at least one `isCurved=true`
    and at least one `isCurved=false` entry.
  - Asserts `PARTS_CURVED` LINE count = 4 and `PARTS` LINE count = 4 (exactly
    one closed rectangle per layer).
  - Parses both bboxes and asserts non-overlap: the two axis-aligned rectangles
    are separated on at least one axis (`noOverlapX || noOverlapY`), with EPS
    tolerance of 0.015 mm to absorb `addLine()` rounding.
- Confirms that two panels sharing a single nesting sheet occupy geometrically
  distinct, non-intersecting footprints in the exported DXF.

### Changed
- **JSDoc** in `buildDxfSheets.ts` extended to document Stages 47–48 in the
  reference table; reference updated to `(Stages 7–48)`.
- **JSDoc** header line in `curvedPanelDxfPipeline.smoke.test.ts` updated to
  `Stages 22–48`.

## [3.2.0] - 2026-08-27

### Overview

Minor release completing the **bounding-rect validation milestone** (Stages 45–46).
Together with the label-position and PARTS_CURVED exclusivity work from [3.1.0]
(Stages 43–44), this release closes the full Stages 43–46 arc: every DXF
rectangle — curved and straight alike — is now geometrically verified end-to-end
through the smoke suite.

### Added

#### Stage 45 — PARTS_CURVED bounding-rect matches flat-blank placement dimensions

- **Helper `parsePARTSCURVEDRects(content)`** (Stage 45 describe scope):
  splits DXF on `'\n0\nLINE\n'`, filters segments starting with
  `'8\nPARTS_CURVED\n'`, collects all `x1/y1/x2/y2` endpoints, and returns
  `{ minX, minY, maxX, maxY }`.
- **3 `it()` blocks** (ARC, S_CURVE, TALL_ARC) each assert:
  - `minX ≈ r(p.x)`, `minY ≈ r(p.y)`
  - `maxX ≈ r(p.x + ew)`, `maxY ≈ r(p.y + eh)`
  where `ew/eh` come from `getRotatedDimensions(cutW, cutH, rotation)`:
  `rotation=90|270 → ew=cutH, eh=cutW`; `rotation=0|180 → ew=cutW, eh=cutH`.
- Tolerance: ε < 0.015 mm (consistent with Stages 31–44).
- Verifies that `addRectangle()` on `PARTS_CURVED` faithfully reflects the
  flat-blank footprint after nesting optimizer correction and FFDH placement.

#### Stage 46 — PARTS layer bounding-rect matches cutW × cutH (no flat-blank correction)

- **Helper `parsePARTSRect(content)`** (Stage 46 describe scope):
  same splitting logic as Stage 45 but filters `'8\nPARTS\n'` segments.
- **3 `it()` blocks**:
  - **(a) single STRAIGHT_ROW** (`cutW=300, cutH=400`): asserts
    `placement.cutW === 300` and `placement.cutH === 400` (no flat-blank offset
    applied), then verifies `maxX − minX ≈ ew`, `maxY − minY ≈ eh` where `ew/eh`
    derive from placement rotation.
  - **(b) narrower row** (`cutW=280, cutH=380`): same assertion pattern,
    verifying `placement.cutW === 280`, `placement.cutH === 380`.
  - **(c) mixed sheet** (1 curved ARC + 1 straight): locates the sheet
    containing the straight placement via `!pl.isCurved`, asserts its
    `cutW/H` unmodified, and confirms PARTS rect spans `ew × eh` from
    straight panel dims only.
- Tolerance: ε < 0.015 mm.
- Confirms that straight panels receive **no** `projectedDepth` flat-blank
  correction — `placement.cutW/H` equals `CutListRow.cutW/H` verbatim, and
  the PARTS rectangle accurately reflects those raw dimensions after any FFDH
  rotation.

### Changed

- **JSDoc updated** in `curvedPanelDxfPipeline.smoke.test.ts`:
  - Section heading changed from *"Stages 22–44"* to
    *"Stages 22–46: precision, structural integrity, label, and bounding-rect invariants"*.
  - Stage 45 and Stage 46 entries added to the reference table.
- **JSDoc updated** in `buildDxfSheets.ts`:
  - Section heading changed from *"Stages 22–44"* to *"Stages 22–46"*.
  - Stage 45 and Stage 46 entries added to the reference table.
  - Footer reference updated from *(Stages 7–44)* to *(Stages 7–46)*.

### Test Results

- **286 smoke tests passing** (3 new Stage 45 + 3 new Stage 46 on top of 280).
- Full suite: all tests passing; 0 TypeScript errors; ESLint 1,199 warnings.

### Notes

- Stage 46 accounts for FFDH rotation of straight panels: FFDH may place a
  straight piece at `rotation=90`, making `effectiveW = cutH` and
  `effectiveH = cutW`. The "no flat-blank correction" invariant is therefore
  expressed as `placement.cutW/H == CutListRow.cutW/H`, not as a fixed
  `width × height` equality, to remain correct regardless of rotation.
- Stages 43–46 together form the complete **label-position and bounding-rect
  validation milestone**: label Y (43), PARTS_CURVED exclusivity (44),
  PARTS_CURVED rect geometry (45), PARTS rect geometry (46).

---

## [3.1.0] - 2026-08-27

### Overview

**Curved Panel System — DXF Label Y-Position & PARTS_CURVED Bounding-Rect Validation**

This minor release extends the `@smoke` suite with two new stages that complete
DXF label-position coverage and formally validate PARTS_CURVED bounding-rect
emission exclusivity: curved sub-label Y coordinate is now pinned to
`placement.y + h/2 − 40`, and straight panels are confirmed to produce zero
PARTS_CURVED entities regardless of sheet composition.

### Added

#### Stage 43 — Curved sub-label Y position (DXF group code 20)

- **`@smoke Stage 43`**: asserts the `(CURVED / N cuts)` TEXT entity Y position
  (DXF group code 20) equals `placement.y + h/2 − 40` for all three panel
  types (ARC, S_CURVE, TALL_ARC), where `h = isRotated ? cutW : cutH`
  (flat-blank effective height in the rotated frame).
- Sub-label is anchored at bbox centre Y minus 40 mm vertical sub-label offset.
- `addText()` stores coords without rounding; tolerance ε < 0.015 mm.
- Helper: `parseCurvedLabelYPositions(content)` — splits on `\n0\nTEXT\n`,
  filters by `8\nLABELS\n` and curved-label regex, extracts `\n20\n([^\n]+)`.
- 3 `it()` blocks (one per panel type).

#### Stage 44 — Straight panels emit zero PARTS_CURVED LINE entities

- **`@smoke Stage 44`**: validates that straight (non-curved) placements never
  produce LINE entities on the PARTS_CURVED layer, formally separating curved
  and flat rendering paths.
- `parsePARTSCURVEDLineCount(content)` helper: splits on `\n0\nLINE\n`, filters
  segments starting with `8\nPARTS_CURVED\n`.
- Three `it()` blocks:
  - **(a)** single straight panel → PARTS_CURVED = 0
  - **(b)** three straight panels on same sheet → PARTS_CURVED = 0
  - **(c)** mixed sheet (1 curved + 1 straight) → PARTS_CURVED = 4
    (confirms curved-only emission; straight contributes nothing)

#### JSDoc invariant tables updated to Stages 22–44

- `curvedPanelDxfPipeline.smoke.test.ts`: Section 3 header updated to
  `Stages 22 – 44`; Stage 43 row (Y position formula) and Stage 44 row
  (PARTS_CURVED exclusivity) added.
- `buildDxfSheets.ts`: "Precision, Structural Integrity, and Label Invariants"
  section header updated to `Stages 22 – 44`; Stage 43 and Stage 44 rows added;
  reference updated to `(Stages 7 – 44)`.

### Test Coverage

- **280 smoke tests** — 280 passing (0 failing)
- Stage 43 adds 3 `it()` blocks (Y-position per panel type)
- Stage 44 adds 3 `it()` blocks (PARTS_CURVED exclusivity: single/triple/mixed)

---

## [3.0.0] - 2026-08-27

### Overview

**Curved Panel System — Complete Geometric & Label Invariant Milestone**

This major release marks the full end-to-end completion of the Curved Panel System
introduced in v2.0.0. Every stage of the pipeline — from curve-field computation
through FFDH nesting, DXF export, and label rendering — is now covered by 274
automated smoke-test assertions across 42 stages. The `@smoke` suite verifies all
geometric, structural, precision, layer-color, and label invariants for all three
curved panel types (ARC, S_CURVE, TALL_ARC).

### Added

#### Smoke Stages 41–42 (label height and X-position invariants)

- **Stage 41** (`@smoke Stage 41`): asserts the `(CURVED / N cuts)` TEXT entity on
  the LABELS layer carries DXF group code 40 (text height) = exactly **5** for all
  three panel types (ARC, S_CURVE, TALL_ARC). Verified by parsing TEXT entities
  after splitting on `\n0\nTEXT\n` and filtering by `8\nLABELS\n` and the curved
  sub-label regex. 3 `it()` blocks.

- **Stage 42** (`@smoke Stage 42`): asserts the `(CURVED / N cuts)` TEXT entity X
  position (DXF group code 10) equals `placement.x + w/2 − 20` where
  `w = isRotated ? cutH : cutW` (flat-blank effective width in the rotated frame).
  Anchored at bbox centre X minus 20 mm text indent. `addText()` stores coords
  without rounding; tolerance ε < 0.015 mm. 3 `it()` blocks per panel type.

#### JSDoc invariant tables updated to Stages 22–42

- `curvedPanelDxfPipeline.smoke.test.ts`: Section 3 header and table updated to
  cover Stages 22–42 including Stage 41 (height=5) and Stage 42 (X position formula).
- `buildDxfSheets.ts`: "Precision, Structural Integrity, and Label Invariants"
  section updated to Stages 22–42 with Stage 41 and Stage 42 rows and reference
  updated to `(Stages 7–42)`.

---

### Full Curved Panel System — Phase 0 through Stage 42 (complete history)

#### Phase 0 — Curved Panel domain model
- `CurvedProfile` type (`radius`, `sweepDeg`, `edge`, `realThickness`)
- `KerfBending.ts` — kerf-bend engineering constants for MDF/Plywood/Particle Board/HMR
- `curveFieldsComputer.ts` — `computeCurveFields()` deriving `developedLength`,
  `projectedDepth`, `kerfCount`, `curvedEdge`

#### Phase 1 — CutListRow enrichment
- `CutListRow` extended with `developedLength?`, `projectedDepth?`, `kerfCount?`,
  `curvedEdge?`
- `PacketCutList` builder updated to compute and carry curve fields per row

#### Phase 2 — Nesting optimizer flat-blank correction
- FFDH optimizer bins curved panels by flat-blank size (`cutH + correction` for
  `TOP/BOTTOM` curved edge) instead of finish size
- `isCurved` and `kerfCount` propagated from CutListRow through NestingSheet
  placements

#### Phase 3 — DXF layer definitions
- `PARTS_CURVED` layer (ACI color 1, red) for curved panel bounding rectangles
- `HATCH_CURVED` layer (ACI color 4, cyan) for diagonal cross-hatch lines

#### Phase 4 — DXF ENTITIES rendering
- `buildDxfSheets.ts` renders curved placements on `PARTS_CURVED` (not `PARTS`)
- Two diagonal lines emitted per curved placement on `HATCH_CURVED`
- `addLine()` rounds all coordinates via `Math.round(v × 100) / 100`

#### Phase 5 — Curved sub-label
- `(CURVED / N cuts)` TEXT entity on LABELS layer at height 5
- Position: `labelX = placement.x + w/2 − 20` (centre X minus 20 mm text indent)
- `addText()` stores X/Y coords as-is (no rounding)

#### Phase 6 — S_CURVE support
- `S_CURVE` profile type with dual-radius geometry (`r1`, `sweepDeg1`, `r2`, `sweepDeg2`)
- `computeCurveFields()` handles S_CURVE with summed arc lengths

#### Phase 7 — TALL_ARC (grain-locked) support
- TALL_ARC: `grain='HORIZONTAL'` locks rotation, flat-blank remains portrait
- All three panel types (ARC, S_CURVE, TALL_ARC) verified across all smoke stages

#### Smoke Stages 1–6 — pipeline wiring
- Stage 1: `computeCurveFields()` returns correct `developedLength`, `kerfCount`,
  `projectedDepth`, `curvedEdge` for ARC and S_CURVE panels
- Stage 2: `CutListRow` carries all curve fields from `computeCurveFields()`
- Stage 3: `runNesting()` propagates `isCurved=true` and correct `kerfCount`
  through NestingSheet placements; flat-blank `cutH` exceeds `finishH`
- Stage 4: `buildDxfSheet()` renders `PARTS_CURVED`, `HATCH_CURVED`,
  `(CURVED / N cuts)` sub-label, and part label in the DXF
- Stage 5: `DxfSheetOutput.bytes` is a valid UTF-8 `Uint8Array`; round-trips
  to the same string as `content`
- Stage 6 (S_CURVE): HATCH_CURVED X-lines span the full flat-blank footprint

#### Smoke Stages 7–13 — HATCH_CURVED count invariants
- Verified: `HATCH_CURVED = 2 × curved_count`, `PARTS_CURVED = 4 × curved_count`,
  `PARTS = 4 × straight_count` for mixed sheets of 0–3 curved/straight panels

#### Smoke Stages 14–21 — geometric coordinate invariants
- Stage 14: HATCH_CURVED lines confined within flat-blank bbox
- Stage 15: diagonal length = `sqrt(effectiveW² + effectiveH²)` > finish diagonal
- Stage 16: flat-blank diagonal > shorter finish side
- Stage 17: HATCH_CURVED lines spatially partitioned between ARC and S_CURVE
  placements on the same sheet (no cross-contamination)
- Stage 18: diagonal-2 length equals endpoint-derived bbox diagonal
- Stage 19: diagonal-1 and diagonal-2 intersect at placement bbox centre
- Stage 20: `dot(d1,d2) ≈ 0` iff `effectiveW = effectiveH` (square bbox)
- Stage 21: `dot(d1,d2) < 0` when `effectiveW > effectiveH`;
  `dot(d1,d2) > 0` when `effectiveW < effectiveH` (TALL_ARC grain-locked)

#### Smoke Stages 22–28 — endpoint precision and structural integrity
- Stage 22: all 4 HATCH_CURVED endpoints rounded to 0.01 mm
- Stage 23: rounded endpoints lie within flat-blank bbox (ε = 0.01 mm)
- Stage 24: each diagonal is non-degenerate (`|x1−x2| + |y1−y2| > 1e-6`)
- Stage 25: `midpoint(d1) = midpoint(d2)` (±0.05 mm)
- Stage 26: shared midpoint = bbox centre (±0.05 mm)
- Stage 27: `diagLen(d1) ≈ diagLen(d2)` (±0.05 mm)
- Stage 28A: `diagLen ≈ sqrt(effectiveW² + effectiveH²)` (±0.05 mm)
- Stage 28B: 4 endpoints form two distinct corner pairs (`Set.size === 4`)

#### Smoke Stages 29–38 — corner-direction full synthesis
- Stage 29: endpoints match exactly the Set of 4 rounded bbox corners
- Stage 30: `d1: (minX,minY)→(maxX,maxY)`; `d2: (maxX,minY)→(minX,maxY)`
- Stage 31: `d1.y1 ≈ d2.y1 ≈ r(minY)` — shared bottom Y (ε < 0.015 mm)
- Stage 32: `d1.y2 ≈ d2.y2 ≈ r(maxY)` — shared top Y (ε < 0.015 mm)
- Stage 33: orientation sense — `d1.x1 < d1.x2`; `d2.x1 > d2.x2` (strict)
- Stage 34: Y-axis monotonicity — both diagonals ascend in Y (strict)
- Stage 35: `d1.x2 ≈ r(maxX)`; `d2.x2 ≈ r(minX)` — end-X pinning (ε < 0.015 mm)
- Stage 36: `d1.x1 ≈ r(minX)`; `d2.x1 ≈ r(maxX)` — start-X pinning (ε < 0.015 mm)
- Stage 37: d1 all-four-coordinate synthesis (12 `it()` blocks; ε < 0.015 mm)
- Stage 38: d2 all-four-coordinate synthesis (12 `it()` blocks; ε < 0.015 mm)

#### Smoke Stages 39–42 — layer-color and label invariants
- Stage 39: DXF TABLES layer colors — `HATCH_CURVED = ACI 4`; `PARTS_CURVED = ACI 1`
- Stage 40: `(CURVED / N cuts)` label N = actual `kerfCount` from `computeCurveFields()`
- Stage 41: `(CURVED / N cuts)` TEXT height (group code 40) = exactly **5**
- Stage 42: `(CURVED / N cuts)` TEXT X (group code 10) = `placement.x + w/2 − 20`
  (ε < 0.015 mm)

### Changed
- JSDoc invariant tables in `curvedPanelDxfPipeline.smoke.test.ts` and
  `buildDxfSheets.ts` updated to cover Stages 22–42.

### Test Coverage
- **274 smoke tests** — 274 passing (0 failing)
- Smoke suite covers all three panel types (ARC, S_CURVE, TALL_ARC) across every
  invariant category: pipeline wiring, count invariants, geometric coordinates,
  precision rounding, structural integrity, corner synthesis, layer colors, and
  label text/height/position.

---

## [2.9.0] - 2026-08-27

### Added

- **Smoke Stage 39 — DXF TABLES layer colors** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Asserts that the DXF TABLES section declares `HATCH_CURVED = ACI 4` (cyan) and
  `PARTS_CURVED = ACI 1` (red) for all three panel types (ARC, S_CURVE, TALL_ARC) on a
  mixed sheet. Implemented `parseLayerColors()` helper that correctly locates the TABLES
  section via `\n2\nTABLES\n` rather than the first ENDSEC. 6 new it() blocks.

- **Smoke Stage 40 — `(CURVED / N cuts)` label text matches kerfCount**
  (`curvedPanelDxfPipeline.smoke.test.ts`):
  Asserts that each curved panel's sub-label TEXT entity on the LABELS layer contains
  `(CURVED / N cuts)` where N exactly equals the `kerfCount` returned by
  `computeCurveFields`. Implemented `parseCurvedLabelCounts()` helper that splits on
  TEXT entity boundaries and filters by layer. 3 new it() blocks (one per panel type).

- **JSDoc invariant table extended to Stage 40** — both
  `curvedPanelDxfPipeline.smoke.test.ts` (Section 3) and `buildDxfSheets.ts`
  (Precision / Label Invariants section) updated with Stage 39 and 40 rows;
  section headers updated to "Stages 22 – 40" and reference updated to "(Stages 7 – 40)".

### Milestone: d1+d2 All-Coordinate Synthesis (Stages 37–38)

Stages 37 and 38 (shipped in v2.8.0) together completed full corner-pinning synthesis
for both HATCH_CURVED diagonals:
- **Stage 37**: verified all four coordinates of d1 jointly
  (d1.x1≈r(minX), d1.y1≈r(minY), d1.x2≈r(maxX), d1.y2≈r(maxY)).
- **Stage 38**: verified all four coordinates of d2 jointly
  (d2.x1≈r(maxX), d2.y1≈r(minY), d2.x2≈r(minX), d2.y2≈r(maxY)).
Both stages cover ARC, S_CURVE, and TALL_ARC panel types with 12 it() blocks each
and ε < 0.015 mm tolerance, completing the geometric correctness contract for
HATCH_CURVED diagonal emission.

---

## [2.8.0] - 2026-08-27

### Added

- **d1+d2 all-coordinate synthesis group (Stages 37–38)** — two smoke stages
  that jointly verify every individual coordinate of both HATCH_CURVED diagonals
  against the flat-blank bbox corners, completing the full coordinate contract
  established progressively from Stage 29 through Stage 36:

  | Stage | Diagonal | Assertion |
  |-------|----------|-----------|
  | 37 | d1 | `d1.x1 ≈ r(minX)`, `d1.y1 ≈ r(minY)`, `d1.x2 ≈ r(maxX)`, `d1.y2 ≈ r(maxY)` — all four d1 coordinates in one describe block. 12 it() blocks (4 coords × 3 panel types). ε < 0.015 mm. |
  | 38 | d2 | `d2.x1 ≈ r(maxX)`, `d2.y1 ≈ r(minY)`, `d2.x2 ≈ r(minX)`, `d2.y2 ≈ r(maxY)` — all four d2 coordinates in one describe block. 12 it() blocks (4 coords × 3 panel types). ε < 0.015 mm. |

  Together Stages 37–38 provide the first complete synthesis of both diagonal
  coordinate tuples, confirming that every HATCH_CURVED X-line endpoint precisely
  maps to its expected flat-blank bbox corner for all three panel types
  (ARC, S_CURVE, TALL_ARC).

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 38 row appended to Section 3; section header updated to "Stages 22 – 38".

- **JSDoc invariant table** (`buildDxfSheets.ts`):
  Stage 38 row appended; section updated to "Stages 22 – 38"; reference
  updated to `(Stages 7 – 38)`.

**Test delta:** 247 → 259 (+12 tests, all passing)

---

## [2.6.2] - 2026-08-27

### Added

- **Stage 37 — diagonal-1 all-coordinate synthesis** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Twelve new `it()` blocks assert all four individual coordinates of diagonal-1
  in a single describe block — `d1.x1 ≈ r(minX)`, `d1.y1 ≈ r(minY)`,
  `d1.x2 ≈ r(maxX)`, `d1.y2 ≈ r(maxY)` — verified for ARC, S_CURVE, and TALL_ARC
  (ε < 0.015 mm throughout).

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 37 row appended to Section 3; section header updated to "Stages 22 – 37".

- **JSDoc invariant table** (`buildDxfSheets.ts`):
  Stage 37 row appended; section updated to "Stages 22 – 37"; reference
  updated to `(Stages 7 – 37)`.

**Test delta:** 235 → 247 (+12 tests, all passing)

---

## [2.7.0] - 2026-08-27

### Added

- **Start/end X-coordinate pinning group (Stages 35–36)** — two smoke stages
  that individually pin all four X coordinates of both HATCH_CURVED diagonals
  to the flat-blank bbox extents, providing explicit per-coordinate evidence
  for the directional contract established in Stage 30:

  | Stage | Assertion |
  |-------|-----------|
  | 35 | `d1.x2 ≈ r(maxX)` — diagonal-1 ends at the right bbox edge; `d2.x2 ≈ r(minX)` — diagonal-2 ends at the left bbox edge. ε < 0.015 mm. |
  | 36 | `d1.x1 ≈ r(minX)` — diagonal-1 starts at the left bbox edge; `d2.x1 ≈ r(maxX)` — diagonal-2 starts at the right bbox edge. ε < 0.015 mm. |

  Together Stages 35–36 complete the per-coordinate X-pinning proof: every
  X value of every HATCH_CURVED endpoint is explicitly verified against the
  rounded flat-blank bbox extent for all three panel types (ARC, S_CURVE,
  TALL_ARC).

- **Stage 37 — diagonal-1 synthesis** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Twelve new `it()` blocks assert all four individual coordinates of diagonal-1
  jointly — `d1.x1 ≈ r(minX)`, `d1.y1 ≈ r(minY)`, `d1.x2 ≈ r(maxX)`,
  `d1.y2 ≈ r(maxY)` — for each of the three panel types (4 coords × 3 panels).
  This is the first synthesis stage: rather than testing one coordinate in
  isolation it validates the complete (x1, y1, x2, y2) tuple of d1.

- **JSDoc invariant tables** (`curvedPanelDxfPipeline.smoke.test.ts` and
  `buildDxfSheets.ts`): Stages 36–37 rows added; headers updated to
  "Stages 22 – 37"; reference updated to `(Stages 7 – 37)`.

**Test delta (cumulative Stages 35–37):** 229 → 247 (+18 tests)

---

## [2.6.1] - 2026-08-27

### Added

- **Stage 36 — diagonal start-X coordinates** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Six new `it()` blocks assert the start-X values of both HATCH_CURVED diagonals
  (the start-X counterpart of Stage 35's end-X checks):
  - `d1.x1 ≈ r(minX)` — diagonal-1 starts at the left edge of the flat-blank bbox
  - `d2.x1 ≈ r(maxX)` — diagonal-2 starts at the right edge
  Tolerance: ε < 0.015 mm. Verified for ARC, S_CURVE, and TALL_ARC.

  Together with Stage 35, all four X coordinates of both diagonals are now
  individually pinned to the flat-blank bbox extents.

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 36 row appended to Section 3; section header updated to
  "Stages 22 – 36".

- **JSDoc invariant table** (`buildDxfSheets.ts`):
  Stage 36 row appended; section updated to "Stages 22 – 36"; reference
  updated to `(Stages 7 – 36)`.

**Test delta:** 229 → 235 (+6 tests, all passing)

---

## [2.6.0] - 2026-08-27

### Added

- **Orientation and Y-monotonicity group (Stages 33–34)** — two smoke stages
  that complete the per-coordinate directional contract for HATCH_CURVED
  diagonals, building on the Stage 30 directional assignment and Stages 31–32
  shared-Y invariants:

  | Stage | Assertion |
  |-------|-----------|
  | 33 | X-axis orientation sense: `d1.x1 < d1.x2` (diagonal-1 left→right); `d2.x1 > d2.x2` (diagonal-2 right→left). Strict inequality — no tolerance. |
  | 34 | Y-axis monotonicity: `d1.y1 < d1.y2` and `d2.y1 < d2.y2` — both diagonals ascend in Y (bottom→top). Strict inequality — no tolerance. |

  Together Stages 33–34 formally close the directional proof: every coordinate
  pair of both diagonals is independently constrained by strict inequality,
  leaving no ambiguity in the HATCH_CURVED hatch pattern across all three panel
  types (ARC, S_CURVE, TALL_ARC).

- **Stage 35 — diagonal end-X coordinates** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Six new `it()` blocks provide explicit per-coordinate verification of the end-X
  values of both diagonals: `d1.x2 ≈ r(maxX)` and `d2.x2 ≈ r(minX)` (ε < 0.015 mm).

- **JSDoc invariant tables** updated in both `curvedPanelDxfPipeline.smoke.test.ts`
  and `buildDxfSheets.ts`: Stages 33–35 rows added; section headers and
  reference ranges updated to "Stages 22 – 35" / "(Stages 7 – 35)".

**Test delta (cumulative Stages 33–35):** 217 → 229 (+12 tests)

---

## [2.4.4] - 2026-08-27

### Added

- **Stage 34 — Y-axis monotonicity** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Six new `it()` blocks assert that both HATCH_CURVED diagonals strictly ascend
  in Y (the Y-axis counterpart of the Stage 33 X-axis orientation sense):
  - `d1.y1 < d1.y2` — diagonal-1 ascends (bottom→top; no tolerance; strict)
  - `d2.y1 < d2.y2` — diagonal-2 ascends (bottom→top; no tolerance; strict)
  Verified for ARC, S_CURVE, and TALL_ARC panel types.

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 34 row appended to Section 3; section header updated to
  "Stages 22 – 34".

- **JSDoc invariant table** (`buildDxfSheets.ts`):
  Stage 34 row appended to the "Precision and Structural Integrity Invariants
  (Stages 22 – 34)" section; reference updated to `(Stages 7 – 34)`.

**Test delta:** 217 → 223 (+6 tests, all passing)

---

## [2.5.0] - 2026-08-27

### Added

- **Corner-direction-Y structural integrity group (Stages 29–32)** — four smoke
  stages that build exhaustively on the Stage 28 set-of-four-corners invariant
  and lock in the complete directional contract for HATCH_CURVED diagonals:

  | Stage | Assertion |
  |-------|-----------|
  | 29 | HATCH_CURVED endpoints form exactly the four rounded bbox corners `{(minX,minY),(maxX,maxY),(maxX,minY),(minX,maxY)}` — order-agnostic set equality |
  | 30 | Directional assignment: `d1` runs `(minX,minY)→(maxX,maxY)` (left→right); `d2` runs `(maxX,minY)→(minX,maxY)` (right→left); both `d1.x1 < d1.x2` and `d2.x1 > d2.x2` within ε < 0.015 mm |
  | 31 | Shared bottom start-Y: `d1.y1 ≈ d2.y1 ≈ r(minY)` — both diagonals grounded at the flat-blank bottom edge (ε < 0.015 mm) |
  | 32 | Shared top end-Y: `d1.y2 ≈ d2.y2 ≈ r(maxY)` — symmetric counterpart of Stage 31 (ε < 0.015 mm) |

  All six it() assertions per stage verified for ARC (FFDH-rotated),
  S_CURVE (FFDH-rotated), and TALL_ARC (grain-locked, no rotation).

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stages 29–32 rows added to Section 3. Section header updated to
  "Stages 22 – 28 → 22 – 32".

**Test delta (cumulative Stages 29–32):** 196 → 217 (+21 tests)

---

## [2.4.3] - 2026-08-27

### Added

- **Stage 33 — X-axis orientation sense** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Six new `it()` blocks assert strict X-direction inequality for each diagonal:
  - `d1.x1 < d1.x2` — diagonal-1 always runs left→right (no tolerance; strict)
  - `d2.x1 > d2.x2` — diagonal-2 always runs right→left (no tolerance; strict)
  Verified for ARC, S_CURVE, and TALL_ARC panel types.

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 33 row appended to Section 3; section header updated to
  "Stages 22 – 33".

**Test delta:** 211 → 217 (+6 tests, all passing)

---

## [2.4.2] - 2026-08-27

### Fixed / Verified

- **Stage 31 — shared bottom start-Y invariant** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Three new `it()` blocks (one per panel type: ARC, S_CURVE, TALL_ARC) assert that both
  HATCH_CURVED diagonal start Y coordinates equal `r(minY)` within ±0.015 mm.  Because
  Stage 30 pinned `d1` to start at `(minX, minY)` and `d2` to start at `(maxX, minY)`,
  Stage 31 provides a cross-check confirming both diagonals are grounded at the same
  horizontal level — the bottom edge of the flat-blank placement — regardless of panel
  type, FFDH rotation, or grain-lock.

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 30 row added to Section 3 documenting the directional assertions:
  `d1: (minX,minY)→(maxX,maxY)` (left→right); `d2: (maxX,minY)→(minX,maxY)` (right→left);
  orientation sense `d1.x1 < d1.x2` and `d2.x1 > d2.x2`.

**Test delta:** 205 → 208 (+3 tests, all passing)

---

## [2.4.1] - 2026-08-27

### Fixed / Verified

- **Stage 29 — exact bbox corner-matching** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Three new `it()` blocks (one per panel type: ARC, S_CURVE, TALL_ARC) assert that the
  Set of four HATCH_CURVED diagonal endpoints equals the Set of four rounded flat-blank
  bbox corners `{(minX,minY),(maxX,maxY),(maxX,minY),(minX,maxY)}`.  This makes the
  Stage 28B distinct-corners assertion strictly stronger by pinning each endpoint to
  a specific bbox corner (order-agnostic union).

- **Stage 30 — exact diagonal direction** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Nine new `it()` blocks (3 per panel type) assert the directional assignment of each
  HATCH_CURVED diagonal:

  | diagonal | start       | end         | X sense         |
  |----------|-------------|-------------|-----------------|
  | d1       | (minX,minY) | (maxX,maxY) | left → right    |
  | d2       | (maxX,minY) | (minX,maxY) | right → left    |

  Per panel: (1) d1 start/end within ±0.015 mm, (2) d2 start/end within ±0.015 mm,
  (3) orientation sense (`d1.x1 < d1.x2`, `d2.x1 > d2.x2`).

- **JSDoc invariant table** (`curvedPanelDxfPipeline.smoke.test.ts`):
  Stage 29 row added to Section 3 (Stages 22–28B), completing the table through
  Stage 29.

- **JSDoc in `buildDxfSheets.ts`**:
  Added a new "Stages 22–29 Precision and Structural Integrity Invariants" section
  documenting all eight precision/structural stages alongside the existing
  Stages 14–21 geometric invariants and Stages 7–13 count invariants.  Reference
  updated from `(Stages 7 – 21)` to `(Stages 7 – 29)`.

**Test delta:** 196 → 205 (+9 tests, all passing)

---

## [2.4.0] - 2026-08-27

### Added

- **Stage 22 — HATCH_CURVED endpoint precision** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - `buildDxfSheets.ts`: `addLine()` now rounds all four coordinates to 0.01 mm via
    `Math.round(v * 100) / 100`, eliminating irrational arc-length floats from CNC DXF output.
  - 6 new `it()` blocks assert `isRounded(coord)` (abs residual < 1e-6) for both endpoints of
    diagonal-1 and diagonal-2 across ARC, S_CURVE, and TALL_ARC panels.
  - Companion fixes: Stage 15 precision relaxed to ±0.05 mm; Stage 6 verbatim byte check updated.
- **Stage 23 — bbox confinement under rounding** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - 6 `it()` blocks assert every rounded endpoint lies within the flat-blank placement bbox
    with ε = 0.01 mm tolerance.
- **Stage 24 — non-degenerate diagonals** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - 6 `it()` blocks assert each HATCH_CURVED diagonal has non-zero length
    (`|x1−x2| + |y1−y2| > 1e-6`).
- **Stage 25 — shared midpoint** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - 6 `it()` blocks assert the midpoint of diagonal-1 equals the midpoint of diagonal-2
    for each panel type (tolerance ±0.05 mm).
- **Stage 26 — midpoint equals bbox centre** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - 6 `it()` blocks assert the shared diagonal midpoint equals the centre of the flat-blank
    placement bbox `(minX + effectiveW/2, minY + effectiveH/2)` (tolerance ±0.05 mm).
- **Stage 27 — equal diagonal length** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - 3 `it()` blocks assert diagonal-1 and diagonal-2 have equal length for each panel type
    (tolerance ±0.05 mm, consistent with 0.01 mm rounding worst-case delta of ~0.014 mm).
- **Stage 28 — sqrt(W²+H²) length and distinct corner pairs** (`curvedPanelDxfPipeline.smoke.test.ts`)
  - Part A — 6 `it()` blocks assert each diagonal length equals `sqrt(effectiveW² + effectiveH²)`
    derived from the flat-blank placement bbox (tolerance ±0.05 mm).
  - Part B — 3 `it()` blocks assert the four diagonal endpoints form two distinct corner pairs
    (`new Set(pts).size === 4`) after 0.01 mm rounding.

### Summary

Precision and structural integrity suite (Stages 22–28); test delta **151 → 193** (+42 tests).
The `addLine()` rounding change (Stage 22) is the sole production-code modification; all other
additions are test-only geometric invariant assertions covering DXF HATCH_CURVED output.

Panel set verified across all seven stages: ARC (SMOKE_DOOR), S_CURVE (SMOKE_SCURVE_DOOR),
TALL_ARC (SMOKE_TALL_ARC) on a single 1220 × 2440 mm nesting sheet.

## [2.3.6] - 2026-08-26

### 🧪 Smoke Suite — Equal Diagonal Length Invariant (Stage 27)

Patch release adding a smoke stage that asserts both `HATCH_CURVED` diagonals
of every curved panel have equal length, confirming the X-hatch spans
congruent diagonals as expected for an axis-aligned rectangle.

**Total smoke test delta: 181 → 184 (+3 tests)**

---

#### Stage 27 — diagonal-1 and diagonal-2 have equal length (`e5650c3d`, 2026-08-26)

Asserts that for each curved panel the two diagonals satisfy:

```
sqrt((d1.x2−d1.x1)² + (d1.y2−d1.y1)²)
  ≈  sqrt((d2.x2−d2.x1)² + (d2.y2−d2.y1)²)
```

Tolerance: `toBeCloseTo(x, 1)` (±0.05 mm). Rounding shifts each coord by at
most 0.005 mm, giving a worst-case per-diagonal length error of
`sqrt(2)×0.01 ≈ 0.014 mm`, so the worst-case length difference between d1
and d2 is ≤ 0.028 mm — well within ±0.05 mm.

Helper: `diagLen(d: Coords): number`

Panel set: same three-panel sheet as Stages 19–26
(SMOKE\_DOOR + SMOKE\_SCURVE\_DOOR + SMOKE\_TALL\_ARC).

**3 assertions added. Smoke total: 181 → 184.**

---

## [2.3.5] - 2026-08-26

### 🧪 Smoke Suite — Bbox-Centred Midpoint Invariant (Stage 26)

Patch release adding a smoke stage that asserts the shared diagonal midpoint
coincides with the geometric centre of the flat-blank placement bbox,
confirming the X-hatch is centred on the panel.

**Total smoke test delta: 175 → 181 (+6 tests)**

---

#### Stage 26 — shared diagonal midpoint equals bbox centre (`8213e50b`, 2026-08-26)

Asserts that for each curved panel the shared midpoint of the two diagonals
satisfies:

```
midX(d)  ≈  (bbox.minX + bbox.maxX) / 2
midY(d)  ≈  (bbox.minY + bbox.maxY) / 2
```

Tolerance: `toBeCloseTo(x, 1)` (±0.05 mm). The 0.01 mm rounding introduced
in Stage 22 can shift each midpoint coord by at most 0.005 mm — well within
the ±0.05 mm window.

Helpers: `centreX(b: Bbox): number`, `centreY(b: Bbox): number`,
`bboxForPlacement(p)`.

Panel set: same three-panel sheet as Stages 19–25
(SMOKE\_DOOR + SMOKE\_SCURVE\_DOOR + SMOKE\_TALL\_ARC).

**6 assertions added. Smoke total: 175 → 181.**

---

## [2.3.4] - 2026-08-26

### 🧪 Smoke Suite — Shared Midpoint Invariant (Stage 25)

Patch release adding a smoke stage that asserts both `HATCH_CURVED` diagonals
of every curved panel share the same midpoint, confirming the X-hatch crosses
at the centre of the flat-blank placement bbox.

**Total smoke test delta: 169 → 175 (+6 tests)**

---

#### Stage 25 — midpoint of diagonal-1 equals midpoint of diagonal-2 (`a99d6abc`, 2026-08-26)

Asserts that for each curved panel the two diagonals satisfy:

```
(d1.x1 + d1.x2) / 2  ≈  (d2.x1 + d2.x2) / 2   (midX)
(d1.y1 + d1.y2) / 2  ≈  (d2.y1 + d2.y2) / 2   (midY)
```

Tolerance: `toBeCloseTo(x, 1)` (±0.05 mm). The 0.01 mm rounding introduced
in Stage 22 can shift each midpoint coord by at most 0.005 mm, so the
worst-case midpoint difference is 0.01 mm — well within the ±0.05 mm window.

Helpers: `midX(d: Coords): number`, `midY(d: Coords): number`

Panel set: same three-panel sheet as Stages 19–24
(SMOKE\_DOOR + SMOKE\_SCURVE\_DOOR + SMOKE\_TALL\_ARC).

**6 assertions added. Smoke total: 169 → 175.**

---

## [2.3.3] - 2026-08-26

### 🧪 Smoke Suite — Non-Degenerate Diagonal Invariant (Stage 24)

Patch release adding a smoke stage that asserts no `HATCH_CURVED` diagonal
LINE entity is degenerate (zero-length), i.e. every diagonal satisfies
`|x1 − x2| + |y1 − y2| > 1e-6` across all three panel types.

**Total smoke test delta: 163 → 169 (+6 tests)**

---

#### Stage 24 — all HATCH\_CURVED diagonals have non-zero length (`b4841a8c`, 2026-08-26)

Asserts that both diagonals of every curved panel satisfy:

```
|x1 − x2| + |y1 − y2| > 1e-6
```

The threshold (1e-6 mm) is five orders of magnitude below the 0.01 mm
rounding quantum introduced in Stage 22, so any geometrically real diagonal
passes trivially while a truly degenerate zero-length line would fail.

Helper: `isNonDegenerate(d: Coords): boolean`

Panel set: same three-panel sheet as Stages 19–23
(SMOKE\_DOOR + SMOKE\_SCURVE\_DOOR + SMOKE\_TALL\_ARC).

**6 assertions added. Smoke total: 163 → 169.**

---

## [2.3.2] - 2026-08-26

### 🧪 Smoke Suite — Bbox-Confinement Under Rounding (Stage 23)

Patch release adding a smoke stage that asserts coordinate rounding introduced
in Stage 22 does not push any `HATCH_CURVED` diagonal endpoint outside the
flat-blank bounding box derived from the placement coordinates.

**Total smoke test delta: 157 → 163 (+6 tests)**

---

#### Stage 23 — HATCH\_CURVED bbox-confinement invariant preserved after rounding (`d9a6b60b`, 2026-08-26)

Asserts that all four endpoint fields `{ x1, y1, x2, y2 }` of every
`HATCH_CURVED` diagonal satisfy:

```
minX − ε ≤ coord ≤ maxX + ε   (horizontal axes)
minY − ε ≤ coord ≤ maxY + ε   (vertical axes)
```

where the bbox is derived from the raw (unrounded) placement coordinates and
`ε = 0.01 mm` (2× the maximum rounding delta of 0.005 mm per coordinate).

Panel set: same three-panel sheet as Stages 19–22
(SMOKE\_DOOR + SMOKE\_SCURVE\_DOOR + SMOKE\_TALL\_ARC).

Self-contained helpers: `bboxForPlacement()`, `linesForPlacement()`,
`parseHatchCoords()`, `buildTallArcRow()`, `runStage23()`.

**6 assertions added. Smoke total: 157 → 163.**

---

## [2.3.1] - 2026-08-26

### 🧪 Smoke Suite — Endpoint Precision Invariant (Stage 22)

Patch release introducing coordinate-rounding in `buildDxfSheets.addLine()`
and a new smoke stage that asserts all `HATCH_CURVED` line endpoints are
multiples of 0.01 mm, preventing irrational arc-length floats from leaking
into CNC DXF output.

**Total smoke test delta: 151 → 157 (+6 tests)**

---

#### `buildDxfSheets.addLine()` — round all four endpoint coordinates to 0.01 mm (`7d7b2aae`, 2026-08-26)

Added `const r = (v: number): number => Math.round(v * 100) / 100;` inside
`addLine()` so every `LINE` entity written to DXF R12 text carries coordinates
that are exact multiples of 0.01 mm.

Maximum rounding delta per coordinate: **0.005 mm**, well within CNC
kerf-width tolerance (R\_min MDF 18 mm = 144 mm; kerf = 3.5 mm).

---

#### Stage 22 — HATCH\_CURVED endpoint coords rounded to 0.01 mm precision (`7d7b2aae`, 2026-08-26)

Asserts that every HATCH\_CURVED diagonal endpoint satisfies:

```
Math.abs(v * 100 − Math.round(v * 100)) < 1e-6
```

for all four fields `{ x1, y1, x2, y2 }` of both diagonals, across all
three panel types (ARC, S\_CURVE, TALL\_ARC).

Precision helper: `isRounded(v: number): boolean`

Panel set: same three-panel sheet as Stages 19–21
(SMOKE\_DOOR + SMOKE\_SCURVE\_DOOR + SMOKE\_TALL\_ARC).

**6 assertions added. Smoke total: 151 → 157.**

---

#### Stage 15 — diagonal-length precision relaxed to `toBeCloseTo(x, 1)` (`7d7b2aae`, 2026-08-26)

Coordinate rounding in `addLine()` shifts diagonal lengths by up to
`sqrt(2) × 0.01 ≈ 0.014 mm`, exceeding the previous `toBeCloseTo(x, 3)`
tolerance of ±0.0005 mm. Precision relaxed to `toBeCloseTo(x, 1)` (±0.05 mm)
— Stage 22 now owns the sub-millimetre precision contract.

*(No change to assertion count.)*

---

#### Stage 6 — far-corner x-coordinate verbatim check updated (`7d7b2aae`, 2026-08-26)

`String(farX)` → `String(Math.round(farX * 100) / 100)`:
the DXF `LINE` entity now stores the rounded value, so the verbatim check
must compare against the rounded string.

*(No change to assertion count.)*

---


## [2.3.0] - 2026-08-26

### 🧪 Smoke Suite — Geometric Invariant Suite (Stages 14–21)

Minor release formalising the full geometric invariant specification for
`HATCH_CURVED` diagonals in the DXF nesting output, and adding two
comprehensive JSDoc invariant tables to the codebase.

**Total smoke test delta: 109 → 151 (+42 tests)**

---

#### Stage 14 — HATCH\_CURVED X-lines confined within flat-blank bounding box (`6328f92e`, 2026-08-26)

Asserts that every `X` line emitted for a curved panel lies strictly inside
the flat-blank placement bounding box. Guards against off-by-one origins or
scale bugs that would bleed hatch lines outside the allocated sheet region.

**7 assertions added. Smoke total: 109 tests.**

---

#### Stage 15 — Diagonal length equals `sqrt(effectiveW² + effectiveH²)` (`b5dcbf1a`, 2026-08-26)

Asserts that both HATCH\_CURVED diagonals for ARC and S\_CURVE panels have
length equal to `Math.sqrt(effW² + effH²)`, where `effectiveW` / `effectiveH`
are the FFDH-post-rotation flat-blank dimensions.

This pins the Pythagorean diagonal length as a formal invariant independent
of FFDH rotation or grain lock.

**6 assertions added. Smoke total: 109 → 115.**

---

#### Stage 16 — Diagonal strictly longer than the finish-panel shorter side (`e5a60918`, 2026-08-26)

Asserts that the flat-blank diagonal is always strictly longer than the
shorter finish dimension, confirming that the kerf-correction expansion is
reflected in every HATCH\_CURVED line and is never accidentally suppressed.

Covers both ARC and S\_CURVE fixtures (2 assertions each).

**4 assertions added. Smoke total: 115 → 119.**

---

#### Stage 17 — Spatial partition: ARC and S\_CURVE occupy non-overlapping bbox regions on a mixed sheet (`f66cb5a4`, 2026-08-26)

Verifies that FFDH places the two curved panels in distinct, non-overlapping
bounding boxes, and that each bbox's `HATCH_CURVED` lines are strictly confined
to their own region — ensuring the DXF layer carries no cross-panel bleed.

**7 assertions added. Smoke total: 119 → 126.**

---

#### Stage 18 — Diagonal-2 lengths equal bbox diagonal for both ARC and S\_CURVE on mixed sheet (`56c0a24b`, 2026-08-26)

Asserts that the anti-diagonal (diagonal-2) of each panel equals the
endpoint-derived bbox diagonal, and that both diagonals of the same panel
are equal in length. Confirms the X-hatch is symmetric about the bbox centre.

**4 assertions added. Smoke total: 126 → 130.**

---

#### Stage 19 — Diagonal intersection at bbox centre (`f5c48ab4`, 2026-08-26)

Asserts that the midpoint of both HATCH\_CURVED diagonals for each panel
equals the centre of the flat-blank placement bounding box.

This catches asymmetry bugs — off-centre origins, skewed start/end points —
that pure length checks cannot detect.

**8 assertions added. Smoke total: 130 → 138.**

---

#### Stage 20 — Perpendicularity of HATCH\_CURVED diagonals (`9b74baa5`, 2026-08-26)

Uses the dot-product identity `dot(d1, d2) = effectiveH² − effectiveW²`
(derived from direction vectors `d1=(w,h)` and `d2=(−w,h)`) to assert that
diagonals are perpendicular only when the flat blank is square.

| Panel       | effectiveW  | effectiveH  | Expected dot              |
|-------------|-------------|-------------|---------------------------|
| ARC         | ≈ 909.44    | 400         | ≈ −667 000 (non-perp)     |
| S\_CURVE   | ≈ 1 051.8   | 500         | ≈ −856 000 (non-perp)     |
| SQUARE\_ARC| ≈ 509.44    | ≈ 509.44    | ≈ 0 (perpendicular)       |

SQUARE\_ARC is constructed so `finishWidth = 400 + correction`, making
`flatBlankW = flatBlankH` — the only case where the X forms a true `+`.

**7 assertions added. Smoke total: 138 → 145.**

---

#### Stage 21 — Dot-product sign by orientation (`48c5c5ad`, 2026-08-26)

Asserts that `sign(dot(d1, d2)) = sign(effectiveH² − effectiveW²)`:

- **Negative** when `effectiveW > effectiveH` (landscape flat blank):
  ARC (`grain=NONE`, FFDH rotates to landscape) and
  S\_CURVE (`grain=NONE`, FFDH rotates to landscape).
- **Positive** when `effectiveW < effectiveH` (portrait flat blank):
  **TALL\_ARC** — `grain='HORIZONTAL'`, FFDH cannot rotate, flat blank stays
  portrait (`effectiveW=400 < effectiveH≈909.44`).

The `TALL_ARC` fixture exercises the full grain-lock path through
`optimizer.ts` (`canRotateWithGrain` → `canRotate=false`) and FFDH
(`canRotatePart` guard) for the first time in the smoke suite.

**6 assertions added. Smoke total: 145 → 151.**

---

### Added

#### JSDoc invariant table — `curvedPanelDxfPipeline.smoke.test.ts` (two-section update, `c7050d27`, 2026-08-26)

Top-of-file JSDoc block split into two sections:

1. **LINE Count Invariants (Stages 7–13)** — stage-by-stage table of expected
   `HATCH_CURVED` X-line counts for all multi-panel nesting combinations.
2. **Geometric Invariants of HATCH\_CURVED Diagonals (Stages 14–21)** —
   describes flat-blank correction formulae, FFDH rotation rules, direction
   vectors, the dot-product identity `dot(d1,d2) = effH² − effW²`, and a
   per-stage assertion summary with all three panel types.

---

#### JSDoc invariant table — `buildDxfSheets.ts` (two-section update, `cd635ffd`, 2026-08-26)

The `NESTING_LAYERS` JSDoc block extended with two sections mirroring the smoke
test documentation:

1. **LINE Count Invariants (Stages 7–13)** — ACI colour codes and hatch-line
   emission rules (`2 × kerfCount` lines per curved placement).
2. **Geometric Invariants of HATCH\_CURVED Diagonals (Stages 14–21)** —
   `getRotatedDimensions` explanation, flat-blank correction formulae,
   direction-vector derivation, dot-product identity, and a Stage 14–21
   assertion table anchored to the source implementation.

---
## [2.2.6] - 2026-08-26

### 🧪 Smoke Suite — Stage 21 (Dot-Product Sign: Negative when effectiveW > effectiveH, Positive when effectiveW < effectiveH)

Patch adds Stage 21 to `curvedPanelDxfPipeline.smoke.test.ts`, asserting
that the sign of `dot(d1, d2)` is determined entirely by which flat-blank
dimension dominates after FFDH placement:

- **ARC** (`grain=NONE`, FFDH rotates to landscape): `effectiveW ≈ 909.44 > effectiveH = 400` → `dot < 0`
- **S_CURVE** (`grain=NONE`, FFDH rotates to landscape): `effectiveW ≈ 1051.8 > effectiveH = 500` → `dot < 0`
- **TALL_ARC** (`grain='HORIZONTAL'`, locked to portrait): `effectiveW = 400 < effectiveH ≈ 909.44` → `dot > 0`

Each part additionally asserts the dot-product identity
`dot(d1, d2) ≈ effH² − effW²` (confirmed numerically via `toBeCloseTo`).

The `TALL_ARC` fixture introduces the `grain: 'HORIZONTAL'` field on
`CutListRow`, exercising the full grain-lock path through `optimizer.ts`
(`canRotateWithGrain` → `canRotate=false`) and FFDH (`canRotatePart` guard),
proving that grain-locked curved panels retain their natural portrait
orientation on the DXF sheet.

**Smoke test count:** 145 → 151 (+6 tests)

---

## [2.2.5] - 2026-08-26

### 🧪 Smoke Suite — Stage 20 (Perpendicularity of HATCH\_CURVED Diagonals)

Patch adds Stage 20 to `curvedPanelDxfPipeline.smoke.test.ts`, asserting
that the two HATCH\_CURVED diagonals for each curved panel are perpendicular
(dot product ≈ 0) only when `effectiveW` equals `effectiveH`, and
non-perpendicular otherwise.

The dot-product identity used is `dot(d1, d2) = effectiveH² − effectiveW²`,
derived from direction vectors `d1=(w,h)` and `d2=(-w,h)` of the two diagonals
emitted by `buildDxfSheets`.

**Three-panel fixture on one sheet:**

| Panel       | effectiveW | effectiveH | Expected dot  |
|-------------|------------|------------|---------------|
| ARC         | ≈ 909.44   | 400        | ≈ −667 000 (≠ 0) |
| S\_CURVE    | ≈ 1051.8   | 500        | ≈ −856 000 (≠ 0) |
| SQUARE\_ARC | ≈ 509.44   | ≈ 509.44   | ≈ 0 (perpendicular) |

SQUARE\_ARC is constructed so `finishWidth = 400 + correction` (where
`correction = developedLength − projectedDepth` from the standard ARC fixture),
making `flatBlankW = flatBlankH ≈ 509.44 mm` — a square flat blank.

**Assertions (7 total, 3 parts):**

*Part A — ARC (non-perpendicular):*
- `|dot(d1, d2)| > 100 000`
- `dot ≈ arcEffH² − arcEffW²`

*Part B — S\_CURVE (non-perpendicular):*
- `|dot(d1, d2)| > 100 000`
- `dot ≈ sCurveEffH² − sCurveEffW²`

*Part C — SQUARE\_ARC (perpendicular):*
- `effectiveW ≈ effectiveH` (square flat blank)
- `dot(d1, d2) ≈ 0`
- `sqEffH² − sqEffW² ≈ 0` (identity consistency check)

**Smoke suite total: 145 tests (was 138 after Stage 19).**

---

## [2.2.4] - 2026-08-26

### 🧪 Smoke Suite — Stage 19 (Diagonal Intersection at BBox Centre)

Patch adds Stage 19 to `curvedPanelDxfPipeline.smoke.test.ts`, asserting
that the midpoint of both HATCH_CURVED diagonals for each panel equals the
centre of the flat-blank placement bounding box — i.e. the two diagonals
bisect each other at the bbox centre.

This verifies that neither diagonal is skewed, shifted, or computed with
an off-centre origin, catching asymmetry bugs that pure length checks
(Stages 15–18) cannot detect.

**Fixture:** standard mixed-panel sheet (ARC + S_CURVE), same FFDH layout
as Stages 17–18.

**Assertions (8 total):**
- ARC diagonal-1 midpoint x/y ≈ `arcMinX + arcEffW/2`, `arcMinY + arcEffH/2`
- ARC diagonal-2 midpoint x/y ≈ same bbox centre
- S_CURVE diagonal-1 midpoint x/y ≈ `sCurveMinX + sCurveEffW/2`, `sCurveMinY + sCurveEffH/2`
- S_CURVE diagonal-2 midpoint x/y ≈ same bbox centre

**New tests added:** 8 (130 → 138 in smoke file)

---

## [2.2.3] - 2026-08-26

### 🧪 Smoke Suite — Stage 18 (X-Hatch Symmetry Assertion)

Patch adds Stage 18 to `curvedPanelDxfPipeline.smoke.test.ts`, asserting
that diagonal-2 (the anti-diagonal) of both ARC and S_CURVE placements
equals the endpoint-derived bbox diagonal and that both diagonals of each
panel are equal in length.

**New tests added:** 4 (126 → 130 in smoke file)

---

### Added

#### Stage 18 — diagonal-2 lengths equal bbox diagonal for both ARC and S_CURVE on mixed-panel sheet (`56c0a24b`, 2026-08-26)
- **File:** `src/e2e/curvedPanelDxfPipeline.smoke.test.ts`
- Covers the same mixed ARC (`SMOKE_DOOR`) + S_CURVE (`SMOKE_SCURVE_DOOR`)
  fixture as Stage 17, targeting the anti-diagonal (index `[1]` in each
  placement group) rather than the main diagonal (index `[0]`).
- Stage 17 verified diagonal-1 for both panel types. Stage 18 extends
  coverage to diagonal-2 and adds a symmetry check — asserting that
  both diagonals of each panel share the same length — catching any
  renderer bug where one endpoint uses finish-size coords while the other
  uses flat-blank-corrected coords.
- Reuses the same `linesForPlacement` y-origin grouping and endpoint-derived
  `effectiveW` / `effectiveH` as Stage 17; only the group index changes
  from `[0]` to `[1]`.
- **4 assertions** (2 per panel type):
  - ARC diagonal-2 length ≈ `√(arcEffW² + arcEffH²)` (`toBeCloseTo` 3 d.p.).
  - ARC diagonal-1 and diagonal-2 lengths are equal (X-hatch is symmetric).
  - S_CURVE diagonal-2 length ≈ `√(sCurveEffW² + sCurveEffH²)`.
  - S_CURVE diagonal-1 and diagonal-2 lengths are equal (X-hatch is symmetric).

---

## [2.2.2] - 2026-08-26

### 🧪 Smoke Suite — Stage 17 (Spatial Partition Assertion)

Patch adds Stage 17 to `curvedPanelDxfPipeline.smoke.test.ts`, asserting
that `HATCH_CURVED` lines are correctly partitioned between the ARC and
S_CURVE placements on a mixed-panel sheet.

**New tests added:** 7 (119 → 126 in smoke file)

---

### Added

#### Stage 17 — HATCH_CURVED lines spatially partitioned between ARC and S_CURVE placements (`f66cb5a4`, 2026-08-26)
- **File:** `src/e2e/curvedPanelDxfPipeline.smoke.test.ts`
- Covers a sheet containing one ARC panel (`SMOKE_DOOR`) and one S_CURVE panel
  (`SMOKE_SCURVE_DOOR`) — the same fixture combination as Stage 9.
- Stage 9 only verified the global `HATCH_CURVED` count (4). Stage 17 parses
  every line's `(x1, y1, x2, y2)` coordinates and asserts that each of the 4
  lines is attributed to the correct placement region.
- **Grouping strategy:** `buildDxfSheets` always starts both diagonals at the
  placement's `(x, y)` corner, so `min(y1, y2) ≈ placement.y` for both lines in
  a group (±1 mm tolerance). Because FFDH places ARC and S_CURVE on distinct
  shelf rows, the y-origins differ by ≥ 400 mm — unambiguous separation.
- **Effective bbox** for each group is derived from the line endpoints themselves
  (`maxX − placement.x`, `maxY − placement.y`) since `Placement.w/h` are not
  present on the nesting type.
- **Sheet layout** (1220 × 2440, kerfWidth=3.5, edgeClearance=10):
  - Shelf 1 — S_CURVE panel (rotation=90°) → effectiveH ≈ 500 mm, y = 10
  - Shelf 2 — ARC panel     (rotation=90°) → effectiveH ≈ 400 mm, y = 513.5
- **7 assertions:**
  - Total `HATCH_CURVED` count is exactly 4.
  - Exactly 2 lines attributed to the S_CURVE placement (y-origin ≈ 10 mm).
  - Exactly 2 lines attributed to the ARC placement (y-origin ≈ 513.5 mm).
  - All 4 lines fully accounted for across both groups (arcLines + sCurveLines = 4).
  - ARC and S_CURVE placements occupy distinct shelf rows (y-origins differ).
  - ARC-group diagonal-1 length ≈ `√(arcEffW² + arcEffH²)` (endpoint-derived, `toBeCloseTo` 3 d.p.).
  - S_CURVE-group diagonal-1 length ≈ `√(sCurveEffW² + sCurveEffH²)` (endpoint-derived).

---

## [2.2.1] - 2026-08-26

### 🧪 Smoke Suite — Stages 14, 15 & 16 (Geometric Assertions)

Patch adds three new E2E smoke stages to `curvedPanelDxfPipeline.smoke.test.ts`
that verify the geometric correctness of `HATCH_CURVED` X-line coordinates
produced by `buildDxfSheets.ts`.

**New tests added:** 17 (109 → 119 in smoke file, 115 → 119 after Stage 16)

---

### Added

#### Stage 14 — HATCH_CURVED X-lines confined within flat-blank bbox (`6328f92e`, 2026-08-26)
- **File:** `src/e2e/curvedPanelDxfPipeline.smoke.test.ts`
- Targets the S_CURVE panel (`r1=200 mm / sweep1=30° / r2=150 mm / sweep2=45°`, MDF 18 mm).
- Parses every `HATCH_CURVED` LINE entity from the DXF ENTITIES section using
  group-code regex (`\n<code>\n<value>`) — immune to `edgeClearance=10` coinciding
  with group code `10`.
- **7 assertions:**
  - Exactly 2 `HATCH_CURVED` LINE entities present.
  - All `x1` start-coordinates ∈ `[placement.x, placement.x + effectiveW]`.
  - All `y1` start-coordinates ∈ `[placement.y, placement.y + effectiveH]`.
  - All `x2` end-coordinates ∈ `[placement.x, placement.x + effectiveW]`.
  - All `y2` end-coordinates ∈ `[placement.y, placement.y + effectiveH]`.
  - Diagonal-1 runs exactly `(minX, minY) → (maxX, maxY)` (tolerance 0.001 mm).
  - Diagonal-2 runs exactly `(maxX, minY) → (minX, maxY)` (tolerance 0.001 mm).

#### Stage 15 — HATCH_CURVED diagonal length equals `√(effectiveW²+effectiveH²)` (`b5dcbf1a`, 2026-08-26)
- **File:** `src/e2e/curvedPanelDxfPipeline.smoke.test.ts`
- Covers both ARC (`SMOKE_DOOR`) and S_CURVE (`SMOKE_SCURVE_DOOR`) panels.
- Shared `parseHatchCoords()` helper (same regex pattern as Stage 14) and
  `diagLen()` Euclidean distance helper scoped to the `describe` block.
- **6 assertions:**
  - ARC diagonal-1 length ≈ `√(effectiveW²+effectiveH²)` (`toBeCloseTo` 3 d.p.).
  - ARC diagonal-2 length ≈ `√(effectiveW²+effectiveH²)`.
  - S_CURVE diagonal-1 length ≈ `√(effectiveW²+effectiveH²)`.
  - S_CURVE diagonal-2 length ≈ `√(effectiveW²+effectiveH²)`.
  - ARC flat-blank diagonal (`≈993.5 mm`) > finish-panel diagonal (`≈894.4 mm`).
  - S_CURVE flat-blank diagonal (`≈1164.6 mm`) > finish-panel diagonal (`≈1029.6 mm`).
- Verifies that the arc correction strictly enlarges the flat blank for both
  profile types, meaning the hatch diagonal is always longer than the
  finish-size diagonal.

#### Stage 16 — HATCH_CURVED diagonals exceed finish-panel shorter side (`e5a60918`, 2026-08-26)
- **File:** `src/e2e/curvedPanelDxfPipeline.smoke.test.ts`
- Covers both ARC (`SMOKE_DOOR`) and S_CURVE (`SMOKE_SCURVE_DOOR`) panels.
- Minimum-sanity guard: a diagonal shorter than the finish panel's own shorter
  side indicates a catastrophic sizing bug in the flat-blank correction or FFDH
  placement. Derived from the Pythagorean bound
  `flatBlankDiag ≥ max(effectiveW, effectiveH) > min(finishW, finishH)`.
- **4 assertions** (2 diagonals × 2 panel types):
  - ARC diagonal-1 > `min(400, 800)` = 400 mm (actual ≈ 993.5 mm).
  - ARC diagonal-2 > 400 mm.
  - S_CURVE diagonal-1 > `min(500, 900)` = 500 mm (actual ≈ 1164.6 mm).
  - S_CURVE diagonal-2 > 500 mm.

---

## [2.2.0] - 2026-08-26

### 🌀 Curved Panel System — Full Implementation (Phases 0–7 + Pipeline Extension)

This release delivers the complete **Curved Panel System** for kerf-bent cabinet panels,
from material science foundations through CNC export, nesting optimisation, DXF rendering,
and a fully verified E2E smoke test suite.

**New tests added:** 102 E2E smoke tests + 250 unit tests across 9 new modules  
**Total test suite at release:** 5,680+ passing

---

### Added

#### Phase 0 — Kerf Bending Engine (`88fb8c22`, 2026-08-25)
- **`src/core/catalog/KerfBending.ts`** — complete rewrite
  - `KerfToolProfile`: blade kerf width, tooth set, pass depth
  - `c_mat` correction coefficients per material (MDF, PLY, HDF, SOLID)
  - Springback angle `γ` for spring-back compensation
  - `lookupMinBendRadius()`: R_min catalog (MDF 18 mm → 144 mm)
  - Variable `p(s)` stress distribution across kerf pattern
  - Web ≥ 15% hard-block guard prevents structural failure
- **77 unit tests** (`KerfBending.test.ts`)

#### Phase 1 — Type System + Curve Profile Engine (`e9672c26`, 2026-08-25)
- **`src/core/types/Cabinet.ts`** — `PanelProfile` discriminated union
  - `ARC { kind, edge, radius, sweepDeg }` — single-radius arc panel
  - `S_CURVE { kind, edge, r1, r2, sweepDeg1, sweepDeg2 }` — two-radius S-curve
- **`src/core/manufacturing/curve/curveProfile.ts`**
  - `computeArcSegment()`: arc length, chord depth, flat-blank correction
  - `computeSCurveSegments()`: compound `L_outer = r1·sweep1 + r2·sweep2`
- **`src/core/types/SkinConfig.ts`** — skin layer thickness & material model
- **27 unit tests** (`curveProfile.test.ts`)

#### Phase 2 — Pattern Generators (`038e6675`, 2026-08-25)
- **`src/core/manufacturing/curve/kerfPatternGenerator.ts`**
  - `generateKerfPattern()`: slot positions, depths, widths for target bend
- **`src/core/manufacturing/curve/matingSlotGenerator.ts`**
  - `generateMatingSlots()`: complementary slots on mating panel face
- **43 unit tests**

#### Phase 3 — G12 Manufacturability Gate (`238c5843`, 2026-08-25)
- **`src/factory/gates/gateG12_curveManufacturability.ts`**
  - 10 hard rules: R ≥ R_min, web integrity, slot overlap, skin thickness,
    sweep angle range, material support, edge clearance, slot count ceiling,
    compound-curve sweep balance, springback margin
- **41 unit tests**

#### Phase 4 — Kerf Zone Drill Filter (`8f55e81e`, 2026-08-25)
- **`src/core/manufacturing/curve/kerfZoneFilter.ts`**
  - `filterDrillPointsInKerfZone()`: excludes drill points inside kerf slots
  - Integrated into `generateDrillMap.ts` — prevents drill/kerf collisions
- **21 unit tests**

#### Phase 5 — Arc Profile Geometry + Canvas Overlays (`dda12e20`, 2026-08-25)
- **Arc profile geometry** (`src/core/geometry/arcProfileGeometry.ts`)
  - `computeArcBoundingBox()`, `computeArcChord()`, `sampleArcPoints()`
- **`KerfPatternOverlay`** (`src/canvas/overlays/KerfPatternOverlay.tsx`)
  - Real-time canvas rendering of kerf slot positions on curved panels
- **`PanelOverrideModal`** — Curve section for radius / sweep override
- 135 curve-related unit tests passing across Phases 0–5

#### Phase 6 — OperationGraph SLOT Ops + DXF Arc Entity (`ed4d591d`, 2026-08-25)
- **`SlotOperation`** added to OperationGraph for kerf-slot CNC paths
- **DXF arc entity emitter** in `buildDxfSheets.ts` — ARC entity for curved profiles
- **`CutListRow`** extended: `developedLength?`, `kerfCount?`, `projectedDepth?`, `curvedEdge?`
- **`PacketCutListRow`** mirror fields added to `src/factory/packet/types.ts`

#### Phase 7 — Phase 7 @smoke Baseline (`93b6074c`, 2026-08-25)
- **`src/e2e/curvedPanelSystem.smoke.test.ts`** — 12 tests
  - ARC-only pipeline: `generateKerfPattern → DrillMap → G12 gate` end-to-end

---

### Nesting Pipeline Extension (Tasks 12–15)

#### Task 12 — `developedLength` + `kerfCount` in Cut List (`b061243f`, 2026-08-25)
- **`src/factory/packet/builders/curveFieldsComputer.ts`** (new)
  - `computeCurveFields(panel, tool, material)` — derives `developedLength`,
    `kerfCount`, `projectedDepth`, `curvedEdge` from live `generateKerfPattern` output
  - `DEFAULT_KERF_TOOL` constant exported for test fixtures
- **`src/factory/packet/builders/buildCutList.ts`** extended
  - `BuildCutListOptions` — opt-in curved field computation
  - Curved rows automatically carry `developedLength` and `kerfCount`
- **16 unit tests** (`curveFieldsComputer.test.ts`)

#### Task 13 — Flat-Blank Nesting Bins (`42879c2d`, 2026-08-26)
- **`src/nesting/optimizer.ts`** — `extractNestingParts()` updated
  - Curved panels binned by `flatBlankW / flatBlankH` (developed size) not finish size
  - Correction formula: `flatBlankH = finishH + developedLength − projectedDepth`
- **`src/nesting/types.ts`** — `NestingPart` extended: `isCurved?`, `flatBlankW?`, `flatBlankH?`, `kerfCount?`
- **`CurveFields`** extended with `projectedDepth` and `curvedEdge`
- **`buildCutListCsv.ts`** — `DEV_LENGTH` and `KERF_COUNT` columns added
- **18 new unit tests**

#### Task 14 — DXF Curved Layer Rendering (`80f2eb41`, 2026-08-26)
- **`NestingSheet.placements`** (`monolithExportContext.ts`) — `isCurved?: boolean` added
- **`runNesting()`** — builds `isCurvedMap` and propagates to placements
- **`buildDxfSheets.ts`** — full TABLES/LAYER section (6 layers with ACI colors):
  - `PARTS_CURVED` (ACI 1, red) — bounding rect for curved panels
  - `HATCH_CURVED` (ACI 4, cyan) — two diagonal X-hatch lines per curved placement
  - `(CURVED)` sub-label emitted on `LABELS` layer
- **18 new tests** (`buildDxfSheets.curvedLayer.test.ts`)

#### Task 15 — `kerfCount` in Curved Sub-Label (`8bde2f35`, 2026-08-26)
- **`NestingSheet.placements`** — `kerfCount?: number` added
- **`runNesting()`** — builds `kerfCountMap` alongside `isCurvedMap`
- Sub-label renders `(CURVED / ${kerfCount} cuts)` with `(CURVED)` fallback
- **+3 tests** (21 total in `buildDxfSheets.curvedLayer.test.ts`)

---

### E2E Smoke Test Suite — `curvedPanelDxfPipeline.smoke.test.ts`

Full pipeline: `computeCurveFields → CutListRow → runNesting → buildDxfSheet → DXF assertions`

| Commit | Date | Stage(s) | Tests |
|--------|------|----------|------:|
| `6b851395` | 2026-08-26 | ARC Stages 1–4: curve fields, cut list row, nesting, DXF content | 18 |
| `cc54dd4e` | 2026-08-26 | ARC Stage 5: DXF `bytes` UTF-8 Uint8Array round-trip | 25 |
| `683bcee0` | 2026-08-26 | S_CURVE fixture — Stages 1–5 replicated for two-radius profile | 47 |
| `2996e4c3` | 2026-08-26 | S_CURVE Stage 6: `HATCH_CURVED` X-lines span flat-blank footprint | 53 |
| `b9d90625` | 2026-08-26 | Stage 7: `HATCH_CURVED` absent for straight panel on mixed sheet | 60 |
| `5d0d50c4` | 2026-08-26 | Stage 8: `HATCH_CURVED` = 2 with two straight + one curved panel | 67 |
| `946b7629` | 2026-08-26 | Stage 9: `HATCH_CURVED` scales to 4 with two curved panels | 74 |
| `d59837cc` | 2026-08-26 | Stage 10: `HATCH_CURVED` scales to 6 with three curved panels | 81 |
| `d82727b6` | 2026-08-26 | Stage 11: `HATCH_CURVED` = 0 when all three panels are straight | 88 |
| `5f812ed6` | 2026-08-26 | Stage 12: `HATCH_CURVED` = 2 after replacing one straight with curved | 95 |
| `faaef037` | 2026-08-26 | Stage 13: `HATCH_CURVED` = 4 after replacing two straights with curved | 102 |

**Verified invariant** (`HATCH_CURVED = 2 × curved_count`) across all combinations of 0–3 curved panels.

---

### Documentation

#### JSDoc Invariant Tables (`b49f4d3d`, `ba29380d`, 2026-08-26)
- **`src/e2e/curvedPanelDxfPipeline.smoke.test.ts`** — top-level JSDoc block added:
  - `HATCH_CURVED` layer invariant table (Stages 7–13)
  - Formulae: `HATCH_CURVED = 2×curved`, `PARTS_CURVED = 4×curved`, `PARTS = 4×straight`
- **`src/core/export/monolith/builders/buildDxfSheets.ts`** — `NESTING_LAYERS` JSDoc block added:
  - Layer color codes table (6 layers, ACI palette)
  - Hatch-line emission rules (geometry of the two diagonal LINEs)
  - LINE count invariants per sheet with cross-reference to smoke test stages

---

## [2.1.0] - 2026-01-22

### 🏭 Factory-Ready CNC Pipeline (Phases D1–D3.3)

This release marks the completion of the **Trust Chain for CNC Manufacturing**.
The entire pipeline from Designer Intent → Verified Packet → G-code → Factory is now
cryptographically secured and deterministic.

**Test Coverage:** 867 tests passing

---

### Added

#### Phase D1: DrillMap → Operation Graph
- **Operation Types** (`src/cnc/operation/operationTypes.ts`)
  - `DrillOperation`: Standard drilling with depth, feedRate, throughHole
  - `PeckDrillOperation`: Deep hole drilling with peck depth
  - `BoringOperation`: Precision boring
  - `CounterboreOperation`: Counterbore with pilot
  - `CountersinkOperation`: Countersink with angle
  - `TapOperation`: Thread tapping with pitch
  - `HelicalMillOperation`: Helical interpolation

- **Operation Graph Builder** (`src/cnc/mapping/`)
  - `mapDrillMapToOps()`: Convert DrillMap points → Operations
  - `mapMinifixToOps()`: Convert Minifix connector pairs → Drill operations
  - `buildOperationGraph()`: Complete DrillMap → OperationGraph
  - `validateOperationGraph()`: 12 safety validators

- **Machine Profiles** (`src/cnc/machine/`)
  - `KDT` preset: Nested-based router (3-axis)
  - `BIESSE` preset: Pod-and-rail CNC

#### Phase D2: Operation Graph → G-code
- **Post Processors** (`src/cnc/post/`)
  - `FANUC` dialect: Standard ISO G-code (G81/G83)
  - `BIESSE_ISO` dialect: Biesse-compatible ISO

- **G-code Builder** (`src/cnc/post/gcodeBuilder.ts`)
  - Header/footer generation with checksums
  - Tool change management
  - Feed/speed optimization
  - Deterministic output (sorted operations)

- **G-code Bundle** (`src/cnc/buildGcodeBundle.ts`)
  - Complete pipeline: Packet → DrillMap → Ops → G-code
  - SHA-256 verification at each step

#### Phase D3.1: CNC Bundle ZIP
- **Bundle Format** (`src/cnc/bundle/`)
  - Deterministic ZIP creation (fixed timestamps)
  - `cnc-manifest.json`: Factory-verifiable manifest
  - `opgraph.json`: Operation graph for audit
  - `checksums.sha256`: File integrity checksums
  - `nc/*.nc`: G-code program files

- **Manifest Schema** (`monolith.cnc.manifest@1.0`)
  ```typescript
  interface CncManifest {
    schema: 'monolith.cnc.manifest@1.0';
    jobId: string;
    machineId: string;
    packetContentHash?: string;  // Trust chain linkage
    opGraphHash: string;         // SHA-256 of opgraph.json
    gcodeSha256: string;         // SHA-256 of G-code
    post: { dialect: CncDialect; postVersion: string };
    createdAt: number;
    files: CncManifestFileEntry[];
    stats?: CncManifestStats;
  }
  ```

#### Phase D3.2: CNC Cache (IndexedDB)
- **Deterministic Cache Keys** (`src/cnc/cache/cncCacheKey.ts`)
  - Cache key = SHA-256(packetContentHash + machineId + dialect + postVersion)
  - Same inputs → guaranteed same cache key

- **IndexedDB Store** (`src/cnc/cache/indexedDbCncStore.ts`)
  - Persistent CNC bundle storage
  - Metadata indexing by jobId, cachedAt
  - LRU eviction support

- **Cache Helpers** (`src/cnc/cache/cncCacheHelpers.ts`)
  - `getCachedBundle()`: Basic cache lookup
  - `cacheBundle()`: Store with deterministic key
  - `invalidateJobCache()`: Job-level cache invalidation

#### Phase D3.3: Re-verify on Load
- **Strict Verification Policy** (`src/factory/verify/`)
  - Cache hits only returned if verification passes
  - Tamper detection: G-code hash, OpGraph hash
  - Linkage verification: packetContentHash must match
  - Post version mismatch → STALE (not FAIL)
  - Auto-invalidation of corrupted entries

- **Verification Functions**
  - `reverifyCncBundleFromIndexedDb()`: Full re-verification
  - `getVerifiedCachedBundle()`: Verified cache lookup
  - `isCncBundleValid()`: Quick validity check
  - `invalidateIfVerifyFailed()`: Cleanup corrupted entries

---

### API Contracts (Stable)

These interfaces are **guaranteed stable** for factory integration:

#### CNC Manifest (`cnc-manifest.json`)
```json
{
  "schema": "monolith.cnc.manifest@1.0",
  "jobId": "JOB-12345678",
  "machineId": "KDT",
  "packetContentHash": "abc123...",
  "opGraphHash": "def456...",
  "gcodeSha256": "789ghi...",
  "post": {
    "dialect": "FANUC",
    "postVersion": "1.0.0"
  },
  "createdAt": 1704067200000,
  "files": [
    { "path": "nc/PROG001.nc", "bytes": 1234, "sha256": "..." }
  ]
}
```

#### Operation Graph (`opgraph.json`)
```json
{
  "machineId": "KDT",
  "operations": [
    {
      "id": "drill-001",
      "type": "DRILL",
      "toolId": "DRILL_5",
      "position": { "x": 100, "y": 100, "z": 0 },
      "depth": 13,
      "feedRate": 500,
      "throughHole": false,
      "sourceId": "point-001"
    }
  ],
  "toolsUsed": ["DRILL_5"],
  "safeZ": 50,
  "rapidZ": 60,
  "metadata": {
    "jobId": "job-001",
    "sourceContentHash": "hash-001",
    "builtAt": "2024-01-01T00:00:00Z",
    "toolVersion": "monolith@2.1.0"
  }
}
```

#### Cache Key Format
```
SHA-256(packetContentHash + machineId + dialect + postVersion)
```

---

### Verification Guarantees

| Check | Description | Failure Mode |
|-------|-------------|--------------|
| G-code Hash | SHA-256 of .nc file matches manifest | `E_BUNDLE_GCODE_HASH_MISMATCH` |
| OpGraph Hash | SHA-256 of opgraph.json matches manifest | `E_BUNDLE_OPGRAPH_HASH_MISMATCH` |
| Packet Linkage | packetContentHash matches expected | `STALE` (not FAIL) |
| Post Version | postVersion matches current | `STALE` (not FAIL) |
| ZIP Integrity | ZIP can be extracted | `E_BUNDLE_CORRUPT` |
| Manifest Schema | Schema matches `monolith.cnc.manifest@1.0` | `E_BUNDLE_MANIFEST_INVALID` |

---

### What's NOT in This Release (Planned for D4/D5)

- ❌ Workpiece coordinate system (panel origin, face selection)
- ❌ Multi-face drilling (TOP/BOTTOM face logic)
- ❌ Panel flip/mirror/rotation transforms
- ❌ Advanced drilling cycles (G83 peck parameters)
- ❌ Material-aware feed/speed tables
- ❌ Coolant/spindle control
- ❌ Nesting / multi-part programs

---

### Dependencies

- Node.js 18+
- TypeScript 5.x
- Vite 5.x
- Vitest 3.0.0 (downgraded from 4.x due to jsdom compatibility)
- JSZip 3.x

---

### Migration Notes

**For Factory Integration:**
1. Parse `cnc-manifest.json` from bundle ZIP
2. Verify `gcodeSha256` against actual G-code file
3. Check `post.postVersion` matches expected version
4. Trust `packetContentHash` for audit trail linkage

**For Cache Consumers:**
- Use `getVerifiedCachedBundle()` instead of `getCachedBundle()` for strict policy
- Handle `STALE` status separately from `FAIL` (stale = regenerate, fail = investigate)

---

### Contributors

- Trust Chain Architecture
- CNC Pipeline Implementation
- Test Infrastructure (867 tests)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

---

## [2.0.0] - Previous Release

Initial release with:
- Cabinet design system
- Parametric constraints
- Gate validation
- Factory packet generation
- Release workflow (DRAFT → FROZEN → GATED → RELEASED)

