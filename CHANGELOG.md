# Changelog

All notable changes to the Monolith project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

