# Design-to-CNC Engineering Playbook — Design Specification

**Date:** 2026-07-21  
**Status:** Approved design; implementation not started  
**Primary target:** HOMAG/woodWOP using MPR/MPRX, with versioned DXF as a fallback  
**Reference article:** 600 × 560 × 720 mm frameless base cabinet

## 1. Purpose

Create an engineering playbook and machine-readable reference package that turns design intent into a verifiable manufacturing package. Phase 1 covers:

`Design → BOM → Nesting → CNC → Digital Verification → First Article Verification`

The work must be usable by three audiences:

- Executives: approval gates, risks, ownership, and release evidence.
- Engineers/software teams: formulas, schemas, coordinate contracts, derivation rules, and test vectors.
- CNC operators/quality teams: setup, simulation, dry-run, measurement, assembly, and release checklists.

## 2. Scope and non-goals

### In scope for Phase 1

- A canonical, versioned product contract.
- Parameterized product, material, hardware, machine, and quality profiles.
- Geometry, BOM, nesting, machining-feature, and verification formulas.
- One complete worked example for the reference cabinet.
- BOM/cut-list, nesting manifest, MPR/MPRX sample, and versioned DXF fallback sample.
- Fail-closed validation and a controlled production-release process.
- Digital verification followed by a supervised physical First Article.

### Not claimed in Phase 1

- A vendor-neutral production postprocessor.
- Automatic production release without engineering and operator approval.
- A production-safe MPR/MPRX file before the target machine, woodWOP version, tools, clamping, and vacuum conditions are pinned and verified.
- Complete CPQ, procurement, scheduling, installation, or warranty implementations. These are represented as later framework lanes.

## 3. Approved reference configuration

| Item | Approved baseline |
|---|---|
| Product | Kitchen base cabinet |
| Finished carcass | W600 × D560 × H720 mm |
| Plinth/legs | 100 mm adjustable legs; worktop excluded |
| Construction | European frameless 32 mm system |
| Carcass panels | 18 mm |
| Back | 6 mm, housed in a groove |
| Top | Two front/rear rails rather than a full top panel |
| Shelf | One adjustable shelf |
| Doors | Two full-overlay doors; 2 mm initial outer and center gaps |
| Hinges | Hettich Sensys 110° family plus compatible mounting plate |
| Connectors | Hettich Rastex 15 family plus dowels |
| CNC route | MPR/MPRX primary; DXF fallback |
| Proof level | Digital verification, supervised dry run, and signed First Article |

Exact Hettich order numbers, drilling drawings, mounting-plate height, overlay solution, connector variant, and dowel specification are mandatory Hardware Profile inputs. They must come from a pinned manufacturer document revision; they are not inferred from the family name.

## 4. Governing principles

1. **Contract-first:** every derived artifact originates from one canonical product contract.
2. **No silent downstream edits:** any CNC-side correction must be represented in the contract/profile, regenerated, and reverified.
3. **Parameterized rules:** material, hardware, machine, and quality values are profiles, not constants embedded in formulas.
4. **Fail closed:** missing authority, invalid geometry, unmatched mating features, or unsafe machine conditions block release.
5. **Source authority:** manufacturer and machine documentation override illustrative formulas and tutorial observations.
6. **Version everything:** contracts, formulas, schemas, profiles, adapters, sources, and approvals carry explicit versions.
7. **Separate fact from inference:** HOMAG product facts, engineering assumptions, and MONOLITH architectural choices must be labeled separately.
8. **Physical proof is required:** simulation alone cannot produce `PRODUCTION_RELEASED` status.

## 5. System architecture

### 5.1 Inputs

Five versioned profiles feed the product contract:

1. Product Profile — cabinet topology, dimensions, construction choices, gaps, and clearances.
2. Material Profile — thickness, density, grain, surface protection, edge behavior, and machining allowances.
3. Hardware Profile — exact SKUs, manufacturer drawings, load/quantity rules, mating features, and exclusions.
4. Machine Profile — woodWOP version, axes, travel, tools, tool identifiers, spindle/feed envelopes, clamping/vacuum restrictions, and postprocessor version.
5. Quality Profile — dimensional tolerances, feature tolerances, inspection method, sampling, and acceptance rules.

### 5.2 Canonical product contract

The canonical contract contains:

- Project revision, approvals, release status, and contract hash.
- Assemblies with finished dimensions, origin, constraints, and parent/child relationships.
- Parts with finished/raw dimensions, material, grain, edge treatments, and quantities.
- Face and datum definitions with explicit coordinate transforms.
- Manufacturing features: holes, grooves, pockets, contours, and joint roles.
- Hardware instances and their mating manufacturing features.
- Formula/source provenance and assumptions.
- References to derived packages, never duplicated manual values.

### 5.3 Deterministic derivation pipeline

`Profiles → Product Contract → Geometry Resolver → Hardware Solver → BOM/Cut List → Machining Feature Graph → Nesting Package → Postprocessor → Verification`

Primary output is MPR/MPRX for a pinned woodWOP target. DXF is a versioned interchange fallback whose layer/block mapping belongs to the Machine Adapter; it is not the source of engineering truth.

## 6. Coordinate contract

- Internal linear unit: millimetres.
- Assembly origin: finished carcass front-left-bottom.
- Assembly axes: +X right, +Y back, +Z up.
- Each part stores an explicit assembly-to-part transformation.
- Each machining feature is bound to a part face, local datum, direction/normal, and depth semantics.
- The Machine Adapter maps canonical frames to the target woodWOP/machine coordinate system and records its version.
- No formula may assume that canonical part coordinates equal machine coordinates.
- Coordinate round-trip tests must recover the original point within the Quality Profile tolerance.

## 7. Formula system

Every formula record contains:

- Stable ID and semantic version.
- Typed inputs, units, allowed ranges, and source.
- Equation or deterministic procedure.
- Assumptions and prohibited uses.
- Worked reference-cabinet example.
- Authority class: engineering, manufacturer, or machine.
- Positive, boundary, and negative test vectors.
- Expected failure behavior: block, warning with sign-off, or information.
- Source URL/document identifier, revision, and access date.

### Formula families

1. Geometry — finished/raw size, setback, overlay/inset, clearance, grooves, and edge allowances.
2. Hardware/32 mm — row/datum placement, cup/mounting-plate geometry, cam/dowel mating, and manufacturer-controlled quantity/load rules.
3. BOM/cost — quantities, edge length, area, volume, mass, waste class, and revisioned cost inputs.
4. Nesting — stock bounds, trim, spacing, cutter diameter/kerf, grain lock, rotation, common-line eligibility, and remnant identity.
5. Cutting parameters — for example `feed = RPM × flute_count × chip_load`, bounded by tool, material, machine, and manufacturer limits.
6. Tolerance/inspection — worst-case stack for fit/safety; measured deviation, feature true position, diagonal difference, and acceptance.

Manufacturer-controlled values must never be guessed: hinge quantity/load limits, drilling patterns, connector geometry, tool envelopes, clamping/vacuum safety, and postprocessor syntax require pinned authoritative data.

## 8. Reference worked example

Known inputs:

`W=600, D=560, H=720, carcass_thickness=18, back_thickness=6, nominal_gap=2 mm`

Initial deterministic results:

- Clear carcass width: `W_clear = W − 2t = 564 mm`.
- Paired-door width: `W_door = (W − 2×outer_gap − center_gap) / 2 = 297 mm`.
- Door height: `H_door = H − top_gap − bottom_gap = 716 mm`.
- Side panels ×2: `720 × 560 × 18 mm`.
- Bottom ×1: `564 × 560 × 18 mm`.
- Top rails ×2: `564 × rail_width × 18 mm`; `rail_width` comes from the Product Profile.
- Shelf ×1: `(564 − 2×side_clearance) × shelf_depth × 18 mm`.
- Back ×1: derived from the groove topology; it is not manually entered.
- Raw blank dimensions: finished dimensions plus profile-defined trim and edge allowances.

Door dimensions are geometry results only. Hinge cup, mounting plate, overlay, setback, and quantity remain invalid until the pinned Hettich Hardware Profile resolves and validates them.

## 9. Control gates

| Gate | Required evidence | Blocking examples |
|---|---|---|
| G0 Input completeness | Units, sources, versions, required profile fields | Missing SKU, source revision, machine/tool definition |
| G1 Geometry/buildability | Valid dimensions, clearances, topology, collision checks | Negative size, overlapping parts, inaccessible assembly |
| G2 Hardware/32 mm | Manufacturer rule resolution and mating-feature reconciliation | Unmatched cam/dowel holes, invalid hinge overlay |
| G3 BOM | Part/hardware/edge reconciliation | Orphan feature, missing part, quantity mismatch |
| G4 Nesting | Every required part placed exactly once under all constraints | Grain violation, overlap, missing part, invalid spacing |
| G5 Machine compatibility | Tool, travel, depth, clamping/vacuum, adapter checks | Missing tool, overtravel, protected-face breakthrough |
| G6 Digital verification | Target woodWOP parse and collision-free simulation | Parse error, collision, unsafe path |
| G7 Operator/dry run | Signed datum/tool/spoilboard/vacuum review and dry run | Incorrect zero, clamp risk, tool mismatch |
| G8 First Article | Measurements, assembly, motion, gap, and defect record | Forced fit, tolerance failure, door collision |
| G9 Production release | Approved evidence bundle and release identity | Missing approval or stale dependency version |

## 10. Error model

- **ERROR — block:** missing authority, invalid geometry, unmatched joint, unavailable tool, unsafe depth, simulation failure, or stale release dependency.
- **WARNING — sign-off required:** low nesting yield, non-preferred tool, tolerance near limit, manual handling, or approved substitution.
- **INFO — record:** cost/time estimate, optimization alternative, remnant creation, and non-blocking observations.

Every diagnostic includes code, severity, affected entity, formula/profile/source version, human explanation, and corrective action.

## 11. Verification strategy

Verification proceeds in this order:

1. Formula unit tests, including boundary and negative cases.
2. Schema validation and cross-entity invariants.
3. Golden BOM and cut-list reconciliation.
4. Coordinate transformation and round-trip tests.
5. Nesting completeness/overlap/grain/spacing tests.
6. MPR/MPRX parsing and simulation in the pinned woodWOP target.
7. Operator review and dry run above stock.
8. First Article dimensional inspection.
9. Assembly, gap, movement, and collision acceptance.

A change to a profile, formula, schema, adapter, source revision, tool, machine, or woodWOP version invalidates affected evidence and reruns the impacted test set.

## 12. Release states

1. `DRAFT`
2. `ENGINEERING_VALIDATED`
3. `DIGITAL_VERIFIED`
4. `FIRST_ARTICLE_APPROVED`
5. `PRODUCTION_RELEASED`

Sample CNC files are marked `NOT_FOR_PRODUCTION` until all gates through G8 pass and G9 is signed. A dependency change automatically returns the release to the earliest affected state.

## 13. Deliverable package

### Human-readable

- Executive control gates.
- Engineering principles, formulas, and data contracts.
- Complete reference-cabinet worked example.
- Operator and inspection procedures.
- Formula/source register.
- Thai and English Markdown plus matching standalone HTML editions.

### Machine-readable

- JSON Schemas for the product contract, five profile types, and validation results.
- Reference JSON for the 600 mm cabinet.
- Formula and test-vector registry.
- BOM/cut-list CSV and nesting manifest.
- MPR/MPRX sample and versioned DXF fallback sample.
- Golden expected results, inspection record, deviation log, and release record.

## 14. Expansion framework

The complete system is divided into independently planned lanes:

1. Design-to-CNC — Phase 1 detailed scope.
2. Site Truth — survey, datum, as-built, VIF, scribing, and worktop templating.
3. Commercial — CPQ, costing, lead time, approvals, and change propagation.
4. Materials — procurement, inventory, lots, remnants, and substitutions.
5. Production — scheduling, labels/QR, station routing, WIP, and QA holds.
6. Installation/Warranty — packing, installation sequence, tolerances, as-installed records, DLP, and warranty.

Each later lane receives its own approved design, implementation plan, contracts, gates, and tests.

## 15. Definition of Done for Phase 1

- TH/EN Markdown and standalone HTML editions are aligned.
- No unresolved placeholders or uncited production constants exist.
- Schemas validate all reference contracts and profiles.
- Formula test vectors, including negative cases, pass.
- Golden BOM and nesting manifest reconcile 100%.
- MPR/MPRX opens and simulates successfully in the pinned woodWOP target.
- The operator checklist covers datum, tools, spoilboard, vacuum/clamping, and dry run.
- First Article measurements and assembly acceptance are signed before production release.
- Every released artifact is traceable to contract, profile, formula, source, adapter, and approval versions.

## 16. Safety boundary

This design does not authorize unattended machining. The CNC operator and responsible engineer retain authority over machine setup, tool condition, workholding, vacuum/clamping, zero points, spoilboard condition, simulation interpretation, dry run, and emergency procedures. Manufacturer manuals and the actual machine configuration always override this playbook.
