# Changelog

All notable changes to the Monolith project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

