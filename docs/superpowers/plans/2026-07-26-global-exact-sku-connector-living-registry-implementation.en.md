# Global Exact-SKU Connector Living Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a governed global cabinet-connector registry that preserves exact commercial identity and evidence, validates complete system BOMs, evaluates arbitrary cabinet/material configurations fail-closed, and supplies the nested MONOLITH runtime with reproducible hash-pinned releases.

**Architecture:** The parent governance repository is the canonical registry producer: Python 3.11 models, reviewed evidence assertions, compatibility graph, qualification engine, coverage ledger and deterministic JSON release bundle. The nested TypeScript product is a consumer: it validates a pinned release, resolves explicit connector intent without family fallback, emits provenance into shadow factory packets and keeps production blocked until configuration-specific evidence passes.

**Tech Stack:** Python 3.11 standard library, dataclasses, Enum, JSON/JSONL, SHA-256, unittest; TypeScript 5, Zod 4, Vitest 3, fast-check, existing Connector OS and factory-packet modules; Markdown plus the existing `tools/render_docs.py` renderer.

## Global Constraints

- The parent root owns ontology, evidence policy, canonical identity, registry releases, qualification governance and coverage reporting.
- The nested product consumes a pinned release and must not become a competing product master.
- Daph is one consulted pilot/customer company; tenant overlays cannot mutate canonical facts.
- One orderable OEM identity is one SKU record; shared geometry is linked rather than merged.
- `Verified` is multidimensional: identity, geometry, BOM, tooling, material/thickness, structural, commercial, field, lifecycle and rights states remain independent.
- Every verified field has a primary-source locator, source hash, edition/region and reviewer.
- AI or automated extraction creates pending candidates only.
- Arbitrary W × D × H and material thickness inputs are accepted, but unsupported configurations return a refusal.
- No interpolation, extrapolation, nearest-neighbour selection or silent family fallback is permitted without an explicit qualified rule.
- OEM assets remain outside Git unless redistribution rights are recorded.
- Historical and discontinued records remain reproducible.
- NOT-FOR-PRODUCTION remains active throughout this plan.
- Every project-facing document is delivered in aligned English and Thai Markdown with standalone HTML.
- Work in paired isolated worktrees at execution time; preserve the current 144 parent and 67 nested dirty-worktree entries.

---

## Workstream and file map

### Parent canonical producer

Create:

- `packages/component-master/src/monolith_component_master/registry_models.py` — canonical immutable domain types.
- `packages/component-master/src/monolith_component_master/evidence.py` — source snapshots and field assertions.
- `packages/component-master/src/monolith_component_master/compatibility.py` — complete BOM and typed graph validation.
- `packages/component-master/src/monolith_component_master/qualification.py` — material/thickness and cabinet-joint evaluation.
- `packages/component-master/src/monolith_component_master/ingestion.py` — candidate, review and quarantine workflow.
- `packages/component-master/src/monolith_component_master/coverage.py` — denominator and dimension-level coverage.
- `packages/component-master/src/monolith_component_master/releases.py` — deterministic bundle and manifest hashing.
- `packages/component-master/src/monolith_component_master/tenant_overlays.py` — immutable tenant-local commercial overlay.
- `packages/component-master/src/monolith_component_master/adapters/__init__.py`
- `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py`
- `tools/connector_registry/ingest_reviewed.py`
- `tools/connector_registry/build_release.py`
- `tools/connector_registry/check_coverage.py`
- `data/component-master/registry/v1/.gitignore`
- `data/component-master/registry/v1/brand-universe.jsonl`
- `data/component-master/registry/v1/source-denominator.jsonl`
- `data/component-master/registry/v1/evidence-manifest.jsonl`
- `data/component-master/registry/v1/models.jsonl`
- `data/component-master/registry/v1/commercial-skus.jsonl`
- `data/component-master/registry/v1/bom-edges.jsonl`
- `data/component-master/registry/v1/compatibility-edges.jsonl`
- `data/component-master/registry/v1/geometries.jsonl`
- `data/component-master/registry/v1/materials.jsonl`
- `data/component-master/registry/v1/tooling.jsonl`
- `data/component-master/registry/v1/qualification-envelopes.jsonl`
- `data/component-master/registry/v1/lifecycle-events.jsonl`
- `data/component-master/registry/v1/coverage-snapshot.json`
- `data/component-master/registry/v1/releases/0.1.0/registry.json`
- `data/component-master/registry/v1/releases/0.1.0/manifest.json`
- focused tests under `tests/component_master/registry/`.

Modify:

- `packages/component-master/src/monolith_component_master/__init__.py` — export approved registry APIs.

### Nested release consumer

Create:

- `src/core/hardware/registry/registryTypes.ts`
- `src/core/hardware/registry/registryReleaseSchema.ts`
- `src/core/hardware/registry/loadRegistryRelease.ts`
- `src/core/hardware/registry/selectRegistryConnector.ts`
- `src/core/hardware/registry/firstCohortRelease.json`
- focused tests in `src/core/hardware/registry/__tests__/`.

Modify:

- `src/core/connector/types.ts` — carry exact SKU and release pin.
- `src/core/connector/catalog.ts:247-253` — remove default-family resolution.
- `src/factory/packet/builders/buildConnectorOps.ts:53-54` — consume explicit selection context.
- `src/factory/packet/types.ts` — persist registry pin, verdict and refusal.
- `src/factory/packet/verifyPacket.ts` — verify hash and applicable evidence gates.

The committed nested JSON file is a materialized, hash-pinned release produced by the parent. It is not an independent authority.

## Execution order

Tasks 1–8 establish the canonical engine. Tasks 9–12 populate the first cohort in four evidence-review waves. Task 13 proves tenant separation. Tasks 14–16 integrate and verify the nested runtime. Do not begin nested cutover before Task 8 produces a deterministic release. Before Task 14, pass the runtime synchronization gate below so the connector work lands on the stable DXF-truth-chain state and does not overwrite concurrent runtime work.

### Task 1: Establish paired worktrees and baseline gates

**Files:**
- Read: `CONTEXT.md`
- Read: `docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.en.md`
- Read: `docs/superpowers/specs/2026-07-26-global-exact-sku-connector-living-registry-design.en.md`
- Record: `.superpowers/sdd/global-connector-registry-progress.md` in the parent implementation worktree

**Interfaces:**
- Consumes: the parent commit containing this checked-in plan (with `92d67571` as the approved-design ancestor); nested commit `ed036a2c`.
- Produces: clean paired-worktree paths and a baseline ledger with exact commit hashes and gate results.

- [ ] **Step 1: Create one isolated worktree per Git root**

Use `superpowers:using-git-worktrees`. Create parent branch `codex/global-connector-registry` from the checked-in commit containing this plan and nested branch `codex/global-connector-runtime` from `ed036a2c`. Do not reuse the two dirty working directories.

- [ ] **Step 2: Record the two-root baseline**

The ledger must record both absolute worktree paths, branches, `git rev-parse HEAD`, `git status --short`, Python/Node/npm versions and NOT-FOR-PRODUCTION state.

- [ ] **Step 3: Run the parent baseline**

Run:

```powershell
python -m unittest discover -s tests/component_master -v
python tools/verify_kitchen_kernel.py
```

Expected: exit 0 with a visible unittest summary and verifier final summary. If either fails, stop; record the failure without changing production code.

- [ ] **Step 4: Run the nested targeted baseline**

Run:

```powershell
npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet
npm.cmd run typecheck:all
```

Expected: exit 0. The Minifix provenance tests must continue to report the live recipe as not fully sourced; that is an honest baseline, not a test failure.

- [ ] **Step 5: Commit only the progress ledger**

```powershell
git add .superpowers/sdd/global-connector-registry-progress.md
git commit -m "chore(connectors): record paired registry baselines"
```

### Task 2: Add canonical identity and verification models

**Files:**
- Create: `packages/component-master/src/monolith_component_master/registry_models.py`
- Create: `tests/component_master/registry/test_registry_models.py`
- Modify: `packages/component-master/src/monolith_component_master/__init__.py`

**Interfaces:**
- Produces: `CommercialSku`, `ProductModel`, `VerificationDimension`, `VerificationState`, `LifecycleState`, `Registry`.
- Consumed by: Tasks 3–13.

- [ ] **Step 1: Write failing identity tests**

```python
def make_sku(order_code: str, geometry: VerificationState) -> CommercialSku:
    states = {
        dimension: VerificationState.PENDING
        for dimension in VerificationDimension
    }
    states[VerificationDimension.IDENTITY] = VerificationState.VERIFIED
    states[VerificationDimension.GEOMETRY] = geometry
    return CommercialSku(
        global_id=f"sku:hafele:{order_code}:EU",
        brand_id="brand:hafele",
        model_id="model:hafele:minifix-15",
        oem_order_code=order_code,
        region="EU",
        pack_qty=1,
        verification=states,
    )

def test_same_geometry_does_not_collapse_distinct_order_codes():
    a = make_sku("262.26.033", VerificationState.VERIFIED)
    b = make_sku("262.26.533", VerificationState.VERIFIED)
    assert a.global_id != b.global_id

def test_verified_is_dimension_specific():
    item = make_sku("262.26.033", VerificationState.PENDING)
    assert item.is_verified(VerificationDimension.IDENTITY) is True
    assert item.is_verified(VerificationDimension.GEOMETRY) is False
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
python -m unittest tests.component_master.registry.test_registry_models -v
```

Expected: import failure for `registry_models`.

- [ ] **Step 3: Implement immutable domain types**

The implementation must expose this shape:

```python
class VerificationDimension(str, Enum):
    IDENTITY = "identity"
    GEOMETRY = "geometry"
    BOM = "bom"
    TOOLING = "tooling"
    MATERIAL_THICKNESS = "material_thickness"
    STRUCTURAL = "structural"
    COMMERCIAL = "commercial"
    FIELD = "field"
    LIFECYCLE = "lifecycle"
    RIGHTS = "rights"

class VerificationState(str, Enum):
    VERIFIED = "VERIFIED"
    PENDING = "PENDING"
    REGION_ONLY = "REGION_ONLY"
    DISCONTINUED = "DISCONTINUED"
    BLOCKED = "BLOCKED"

@dataclass(frozen=True)
class CommercialSku:
    global_id: str
    brand_id: str
    model_id: str
    oem_order_code: str
    region: str
    pack_qty: int
    verification: Mapping[VerificationDimension, VerificationState]

    def is_verified(self, dimension: VerificationDimension) -> bool:
        return self.verification.get(dimension) is VerificationState.VERIFIED
```

Validate IDs, order codes, region, pack and all ten verification dimensions. Keep legacy `SupplierSKU` unchanged.

- [ ] **Step 4: Verify GREEN and legacy compatibility**

```powershell
python -m unittest tests.component_master.registry.test_registry_models tests.component_master.test_seed_integrity -v
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/registry_models.py packages/component-master/src/monolith_component_master/__init__.py tests/component_master/registry/test_registry_models.py
git commit -m "feat(registry): add exact SKU identity model"
```

### Task 3: Implement evidence vault metadata and field assertions

**Files:**
- Create: `packages/component-master/src/monolith_component_master/evidence.py`
- Create: `tests/component_master/registry/test_evidence.py`
- Create: `data/component-master/registry/v1/.gitignore`
- Create: `data/component-master/registry/v1/evidence-manifest.jsonl`

**Interfaces:**
- Produces: `SourceSnapshot`, `FieldAssertion`, `EvidenceVault.register()`, `verify_source_hash()`.
- Consumed by: ingestion, qualification and release tasks.

- [ ] **Step 1: Write failing evidence tests**

Test that a verified assertion is rejected without publisher, edition/region, locator, SHA-256, access date, reviewer and rights state. Test that `_source-cache/` content is ignored while its manifest remains tracked.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_evidence -v
```

Expected: import failure for `evidence`.

- [ ] **Step 3: Implement field-level provenance**

```python
@dataclass(frozen=True)
class SourceSnapshot:
    source_id: str
    publisher: str
    url: str
    edition: str
    region: str
    accessed_at: str
    sha256: str
    rights_state: str

@dataclass(frozen=True)
class FieldAssertion:
    assertion_id: str
    entity_id: str
    field_path: str
    value: object
    source_id: str
    locator: str
    reviewer: str
    review_state: str
```

`VERIFIED` assertions must reference a registered source whose stored bytes match the manifest hash. Candidate assertions may reference remote metadata but remain pending.

- [ ] **Step 4: Verify GREEN**

```powershell
python -m unittest tests.component_master.registry.test_evidence -v
```

Expected: exit 0 and tests for tampered bytes, absent rights state and field locator pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/evidence.py tests/component_master/registry/test_evidence.py data/component-master/registry/v1/.gitignore data/component-master/registry/v1/evidence-manifest.jsonl
git commit -m "feat(registry): enforce field-level OEM evidence"
```

### Task 4: Implement Complete System BOM and compatibility graph

**Files:**
- Create: `packages/component-master/src/monolith_component_master/compatibility.py`
- Create: `tests/component_master/registry/test_compatibility.py`
- Create: `data/component-master/registry/v1/bom-edges.jsonl`
- Create: `data/component-master/registry/v1/compatibility-edges.jsonl`

**Interfaces:**
- Produces: `BomEdge`, `CompatibilityEdge`, `CompatibilityGraph.validate_release_bom()`.
- Consumed by: Tasks 5, 7 and 15.

- [ ] **Step 1: Write failing graph tests**

Cover a complete cam + bolt + cap BOM, a required edge targeting an unregistered mating SKU, an `INCOMPATIBLE_WITH` contradiction, region mismatch, lifecycle mismatch and a required tool edge.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_compatibility -v
```

Expected: import failure.

- [ ] **Step 3: Implement typed edges**

```python
class EdgeType(str, Enum):
    REQUIRES = "REQUIRES"
    OPTIONAL = "OPTIONALLY_USES"
    COMPATIBLE = "COMPATIBLE_WITH"
    INCOMPATIBLE = "INCOMPATIBLE_WITH"
    SUPERSEDES = "SUPERSEDES"
    REGION_VARIANT = "REGION_VARIANT_OF"
    GEOMETRY_VARIANT = "GEOMETRY_VARIANT_OF"
    TOOLED_BY = "TOOLED_BY"
    MACHINED_BY = "MACHINED_BY"

@dataclass(frozen=True)
class BomEdge:
    assembly_sku_id: str
    component_id: str
    edge_type: EdgeType
    quantity: float
    region: str
    evidence_assertion_ids: tuple[str, ...]
```

Graph validation returns structured issues; it never auto-selects a substitute.

- [ ] **Step 4: Verify GREEN**

```powershell
python -m unittest tests.component_master.registry.test_compatibility -v
```

Expected: exit 0 with the incomplete and contradictory BOM cases refused.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/compatibility.py tests/component_master/registry/test_compatibility.py data/component-master/registry/v1/bom-edges.jsonl data/component-master/registry/v1/compatibility-edges.jsonl
git commit -m "feat(registry): validate complete connector BOM graphs"
```

### Task 5: Implement material/thickness envelopes and joint qualification

**Files:**
- Create: `packages/component-master/src/monolith_component_master/qualification.py`
- Create: `tests/component_master/registry/test_qualification.py`
- Create: `data/component-master/registry/v1/materials.jsonl`
- Create: `data/component-master/registry/v1/qualification-envelopes.jsonl`

**Interfaces:**
- Produces: `MaterialInstance`, `JointConfiguration`, `QualificationEnvelope`, `QualificationResult`, `qualify_joint()`.
- Consumed by: Tasks 6, 7 and nested release.

- [ ] **Step 1: Write failing boundary tests**

Use synthetic evidence fixtures to prove:

- Panel A and Panel B thickness are independent;
- 15 mm and 18 mm evidence does not qualify 16 mm without an interpolation rule;
- core and facing thickness remain separate;
- material class, density, moisture and orientation travel with the envelope;
- no matching configuration returns `INSUFFICIENT_EVIDENCE`.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_qualification -v
```

Expected: import failure.

- [ ] **Step 3: Implement fail-closed qualification**

```python
class Verdict(str, Enum):
    QUALIFIED = "QUALIFIED"
    CONDITIONALLY_QUALIFIED = "CONDITIONALLY_QUALIFIED"
    UNQUALIFIED = "UNQUALIFIED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    DISCONTINUED_OR_UNORDERABLE = "DISCONTINUED_OR_UNORDERABLE"

@dataclass(frozen=True)
class MaterialInstance:
    substrate: str
    core: str
    density_kg_m3: float
    moisture_pct: float
    orientation: str
    nominal_thickness_mm: float
    measured_thickness_mm: float
    facing_thickness_mm: float

def qualify_joint(
    joint: JointConfiguration,
    envelopes: Sequence[QualificationEnvelope],
) -> QualificationResult:
    matches = tuple(envelope for envelope in envelopes if envelope.matches(joint))
    if not matches:
        return QualificationResult(
            verdict=Verdict.INSUFFICIENT_EVIDENCE,
            envelope_id=None,
            reason_codes=("NO_EXACT_CONFIGURATION_EVIDENCE",),
        )
    qualified = tuple(
        envelope for envelope in matches if envelope.verdict is Verdict.QUALIFIED
    )
    if len(qualified) != 1:
        return QualificationResult(
            verdict=Verdict.UNQUALIFIED,
            envelope_id=None,
            reason_codes=("AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE",),
        )
    selected = qualified[0]
    return QualificationResult(
        verdict=Verdict.QUALIFIED,
        envelope_id=selected.envelope_id,
        reason_codes=(),
    )
```

Only exact points, declared ranges or explicitly evidenced interpolation rules may return qualified.

- [ ] **Step 4: Verify GREEN**

```powershell
python -m unittest tests.component_master.registry.test_qualification -v
```

Expected: exit 0; the unapproved 16 mm interpolation case remains refused.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/qualification.py tests/component_master/registry/test_qualification.py data/component-master/registry/v1/materials.jsonl data/component-master/registry/v1/qualification-envelopes.jsonl
git commit -m "feat(registry): add configuration-specific qualification"
```

### Task 6: Add arbitrary W × D × H cabinet evaluation

**Files:**
- Modify: `packages/component-master/src/monolith_component_master/qualification.py`
- Create: `tests/component_master/registry/test_parametric_cabinets.py`

**Interfaces:**
- Produces: `CabinetConfiguration`, `CabinetEvaluation`, `evaluate_cabinet()`.
- Consumed by: release and runtime tasks.

- [ ] **Step 1: Write failing parametric/property cases**

Generate base, wall, tall, wardrobe and custom cabinets across fractional W × D × H values. Assert that invalid numeric inputs are refused, unsupported spans never manufacture a guessed rule, and tall cabinets request only reinforcements/anchors backed by a selected policy.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_parametric_cabinets -v
```

Expected: import or attribute failure naming `evaluate_cabinet` before implementation.

- [ ] **Step 3: Implement the cabinet pipeline**

```python
@dataclass(frozen=True)
class CabinetConfiguration:
    width_mm: float
    depth_mm: float
    height_mm: float
    topology: str
    joints: tuple[JointConfiguration, ...]
    load_cases: tuple[str, ...]
    mounting: str
    wall_substrate: str | None

def evaluate_cabinet(
    cabinet: CabinetConfiguration,
    registry: Registry,
    machine_capabilities: frozenset[str],
) -> CabinetEvaluation:
    """Normalize, qualify every joint, then aggregate refusals without fallback."""
```

Connector count and spacing come only from selected qualification rules. When increased connector count cannot resolve the governed demand, return an evidenced reinforcement/anchor requirement or refuse.

- [ ] **Step 4: Verify GREEN**

```powershell
python -m unittest tests.component_master.registry.test_parametric_cabinets tests.component_master.registry.test_qualification -v
```

Expected: exit 0 with deterministic results for repeated identical inputs.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/qualification.py tests/component_master/registry/test_parametric_cabinets.py
git commit -m "feat(registry): evaluate parametric cabinet configurations"
```

### Task 7: Add reviewed ingestion and quarantine

**Files:**
- Create: `packages/component-master/src/monolith_component_master/ingestion.py`
- Create: `packages/component-master/src/monolith_component_master/adapters/__init__.py`
- Create: `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py`
- Create: `tools/connector_registry/ingest_reviewed.py`
- Create: `tests/component_master/registry/test_ingestion.py`

**Interfaces:**
- Produces: `CandidateRecord`, `QuarantineRecord`, `ReviewedAssertionAdapter.ingest()`.
- Consumed by: first-cohort waves.

- [ ] **Step 1: Write failing ingestion tests**

Test unit conflict, OEM/distributor identity conflict, PDF/CAD geometry conflict, unreviewed AI candidate, missing mating part and rights uncertainty. Each becomes a reason-coded quarantine record and cannot enter a release.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_ingestion -v
```

Expected: import failure.

- [ ] **Step 3: Implement the adapter contract**

```python
@dataclass(frozen=True)
class CandidateRecord:
    candidate_id: str
    brand_id: str
    entity_kind: str
    assertions: tuple[FieldAssertion, ...]
    extraction_method: str

@dataclass(frozen=True)
class QuarantineRecord:
    candidate_id: str
    reason_code: str
    evidence_ids: tuple[str, ...]
    owner_role: str

@dataclass(frozen=True)
class IngestionResult:
    promoted: tuple[CandidateRecord, ...]
    quarantined: tuple[QuarantineRecord, ...]

class ReviewedAssertionAdapter:
    def ingest(self, candidate: CandidateRecord) -> IngestionResult:
        if candidate.extraction_method != "HUMAN_REVIEWED":
            return IngestionResult(
                promoted=(),
                quarantined=(
                    QuarantineRecord(
                        candidate_id=candidate.candidate_id,
                        reason_code="REVIEW_REQUIRED",
                        evidence_ids=tuple(
                            assertion.assertion_id
                            for assertion in candidate.assertions
                        ),
                        owner_role="OEM Evidence Curator",
                    ),
                ),
            )
        if any(
            assertion.review_state != "VERIFIED"
            for assertion in candidate.assertions
        ):
            return IngestionResult(
                promoted=(),
                quarantined=(
                    QuarantineRecord(
                        candidate_id=candidate.candidate_id,
                        reason_code="ASSERTION_NOT_VERIFIED",
                        evidence_ids=tuple(
                            assertion.assertion_id
                            for assertion in candidate.assertions
                        ),
                        owner_role="Identity and SKU Reviewer",
                    ),
                ),
            )
        return IngestionResult(promoted=(candidate,), quarantined=())
```

Promotion requires human-reviewed primary assertions for the promoted dimensions; the adapter never changes review state itself.

- [ ] **Step 4: Verify GREEN and CLI behavior**

```powershell
python -m unittest tests.component_master.registry.test_ingestion -v
python tools/connector_registry/ingest_reviewed.py --help
```

Expected: exit 0; help lists `--brand`, `--source-manifest`, `--assertions`, `--out` and `--quarantine`.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/ingestion.py packages/component-master/src/monolith_component_master/adapters tools/connector_registry/ingest_reviewed.py tests/component_master/registry/test_ingestion.py
git commit -m "feat(registry): quarantine unreviewed connector evidence"
```

### Task 8: Add coverage ledger and deterministic release

**Files:**
- Create: `packages/component-master/src/monolith_component_master/coverage.py`
- Create: `packages/component-master/src/monolith_component_master/releases.py`
- Create: `tools/connector_registry/check_coverage.py`
- Create: `tools/connector_registry/build_release.py`
- Create: `tests/component_master/registry/test_release.py`
- Create: `data/component-master/registry/v1/coverage-snapshot.json`

**Interfaces:**
- Produces: `CoverageSnapshot`, `RegistryRelease`, `build_release()`, SHA-256 manifest.
- Consumed by: Tasks 9–16.

- [ ] **Step 1: Write failing determinism and denominator tests**

Assert source-order-independent output hashes, no unclassified discovered item, separate evidence-dimension counts, blocked-source reporting and no verified record with a missing assertion.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_release -v
```

Expected: import failure.

- [ ] **Step 3: Implement canonical serialization**

Serialize UTF-8 JSON with sorted keys, stable record order, normalized line endings and no wall-clock field inside the hashed payload. The manifest contains release ID, semantic version, payload SHA-256, source denominator hash and creation metadata outside the payload digest.

- [ ] **Step 4: Verify GREEN and byte replay**

```powershell
python -m unittest tests.component_master.registry.test_release -v
python tools/connector_registry/build_release.py --root data/component-master/registry/v1 --version 0.1.0
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified
```

Expected: exit 0; two consecutive builds have identical `registry.json` hashes.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/coverage.py packages/component-master/src/monolith_component_master/releases.py tools/connector_registry/check_coverage.py tools/connector_registry/build_release.py tests/component_master/registry/test_release.py data/component-master/registry/v1/coverage-snapshot.json
git commit -m "feat(registry): publish deterministic coverage releases"
```

### Task 9: Declare the first-cohort brand and source denominator

**Files:**
- Create: `data/component-master/registry/v1/brand-universe.jsonl`
- Create: `data/component-master/registry/v1/source-denominator.jsonl`
- Create: `tests/component_master/registry/test_first_cohort_denominator.py`

**Interfaces:**
- Produces: the controlled denominator for 12 brands and Global/EU, US and Thailand/ASEAN review scopes.
- Consumed by: Tasks 10–12.

- [ ] **Step 1: Write the failing exact-brand test**

Assert the exact approved set: Häfele, Hettich, Titus, Lamello, Italiana Ferramenta, OVVO, Lockdowel, Välinge/Threespine, KNAPP, Festool DOMINO, Hoffmann Machine Company and Blum.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_first_cohort_denominator -v
```

Expected: denominator files absent.

- [ ] **Step 3: Add official-source roots**

Seed official source roots only:

| Brand | Required official source root |
|---|---|
| Häfele | `https://www.hafele.com/us/en/products/furniture-fittings-living-solutions/connectors-shelf-supports/connectors/50/` |
| Hettich | `https://shop.hettich.com/us_EN/Further-products/Connecting-technology/Connecting-fittings-for-cabinet-bodies/c/group824491857740` |
| Titus | `https://cabinet.titusplus.com/us/en/cabinet-connectors` |
| Lamello | `https://lamello.com/products/p-system` and the current OEM catalog linked there |
| Italiana Ferramenta | `https://www.italianaferramenta.it/en/catalog/connectings` |
| OVVO | `https://ovvotech.com/furniture-connector-types/` |
| Lockdowel | `https://lockdowel.com/cabinets/` and `https://lockdowel.com/downloads/` |
| Välinge/Threespine | `https://valinge.com/threespine/this-is-threespine/` |
| KNAPP | `https://knappconnectors.com/industries/cabinets-closets-and-case-goods/` |
| Festool DOMINO | `https://www.festoolusa.com/accessories/joining/accessories-for-joining/domino-connectors/576797---kv-sys-d8` and `https://www.festoolusa.com/accessories/joining/accessories-for-joining/domino-connectors/576795---sv-sys-d14` |
| Hoffmann | `https://hoffmann-usa.com/faq/` plus OEM product/machine documents linked from the site |
| Blum | `https://www.blum.com/eu/en/products/various-products/thin-fronts/assembly/` |

Each row records publisher, official URL, edition when printed, region, language, access date, rights state and one of `DISCOVERED`, `SOURCE_BLOCKED`, `DORMANT_OR_DEFUNCT` or `REVIEWED`.

- [ ] **Step 4: Verify denominator integrity**

```powershell
python -m unittest tests.component_master.registry.test_first_cohort_denominator -v
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified
```

Expected: exit 0; no source or brand lacks a state.

- [ ] **Step 5: Commit**

```powershell
git add data/component-master/registry/v1/brand-universe.jsonl data/component-master/registry/v1/source-denominator.jsonl tests/component_master/registry/test_first_cohort_denominator.py
git commit -m "data(registry): declare first-cohort source denominator"
```

### Task 10: Ingest cohort wave A — Häfele, Hettich and Titus

**Files:**
- Create: `data/component-master/registry/v1/vendors/hafele/reviewed-assertions.jsonl`
- Create: `data/component-master/registry/v1/vendors/hettich/reviewed-assertions.jsonl`
- Create: `data/component-master/registry/v1/vendors/titus/reviewed-assertions.jsonl`
- Create: `tests/component_master/registry/test_wave_a.py`
- Modify: canonical models/SKUs/BOM/geometry/tooling datasets through the ingestion CLI.

**Interfaces:**
- Produces: classified exact order codes, BOM edges and unresolved evidence queues for the three brands.
- Consumed by: release and nested bridge tasks.

- [ ] **Step 1: Add failing coverage assertions**

For every reviewed source table/page, assert `discovered rows = verified + pending + region-only + discontinued + source-blocked + out-of-scope-with-reason`. Pin Häfele Minifix page-24 articles and the ambiguous page-23 articles as separate records with their honest states.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_wave_a -v
```

Expected: wave records absent.

- [ ] **Step 3: Transcribe and review primary assertions**

Run `ingest_reviewed.py` separately for each brand. Preserve every OEM order code, region, pack, finish, mating part and tool reference. Hettich `Rastex` must resolve to its own reviewed identity or a reason-coded refusal; mapping it to Minifix is prohibited.

- [ ] **Step 4: Verify and rebuild**

```powershell
python -m unittest tests.component_master.registry.test_wave_a -v
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --brands hafele hettich titus --fail-on-unclassified
python tools/connector_registry/build_release.py --root data/component-master/registry/v1 --version 0.1.0
```

Expected: exit 0; all three denominators classify every discovered row.

- [ ] **Step 5: Commit**

Stage only the three vendor directories, generated canonical JSONL changes and wave test. Commit:

```powershell
git commit -m "data(registry): ingest first-cohort wave A"
```

### Task 11: Ingest cohort wave B — Lamello, Italiana Ferramenta and OVVO

**Files:**
- Create: vendor reviewed-assertion files under `vendors/lamello/`, `vendors/italiana/`, `vendors/ovvo/`.
- Create: `tests/component_master/registry/test_wave_b.py`
- Modify: canonical registry datasets through the ingestion CLI.

**Interfaces:**
- Produces: P-System groove/CNC/tool dependencies, Target-family identities and OVVO thickness/process variants.

- [ ] **Step 1: Add failing wave-B tests**

Assert Lamello family/model separation, Italiana exact product-code preservation and OVVO drilling-versus-milling process separation. Require tool/cutter edges for proprietary machining.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_wave_b -v
```

- [ ] **Step 3: Ingest reviewed OEM assertions**

Classify each source-denominator row and preserve regional/lifecycle states. Product-family marketing names cannot stand in for exact order codes.

- [ ] **Step 4: Verify and rebuild**

```powershell
python -m unittest tests.component_master.registry.test_wave_b -v
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --brands lamello italiana ovvo --fail-on-unclassified
python tools/connector_registry/build_release.py --root data/component-master/registry/v1 --version 0.1.0
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git commit -m "data(registry): ingest first-cohort wave B"
```

### Task 12: Ingest cohort waves C and D

**Files:**
- Create: reviewed-assertion files under `vendors/lockdowel/`, `vendors/threespine/`, `vendors/knapp/`, `vendors/festool/`, `vendors/hoffmann/`, `vendors/blum/`.
- Create: `tests/component_master/registry/test_wave_c_d.py`
- Modify: canonical registry datasets through the ingestion CLI.

**Interfaces:**
- Produces: snap/slide/profile/dovetail/loose-tenon/thin-front identities with explicit licensing, tool and role constraints.

- [ ] **Step 1: Add failing scope tests**

Assert:

- Threespine licensing/process evidence remains distinct from SKU evidence;
- Festool D8 and D14 systems do not cross-map;
- Hoffmann connector keys require matching machining capability;
- Blum EXPANDO T remains a thin-front fixing and is not generalized to carcass joints;
- every discovered Lockdowel and KNAPP model has a classification.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_wave_c_d -v
```

- [ ] **Step 3: Ingest reviewed assertions for all six brands**

Preserve proprietary-process and rights restrictions. If exact order codes are not present in primary evidence, retain the model as pending rather than fabricating an SKU.

- [ ] **Step 4: Verify full-cohort coverage and rebuild**

```powershell
python -m unittest tests.component_master.registry.test_wave_c_d -v
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified
python tools/connector_registry/build_release.py --root data/component-master/registry/v1 --version 0.1.0
```

Expected: exit 0; the ledger names all blocked and pending dimensions.

- [ ] **Step 5: Commit**

```powershell
git commit -m "data(registry): complete first-cohort classifications"
```

### Task 13: Enforce tenant overlays without canonical mutation

**Files:**
- Create: `packages/component-master/src/monolith_component_master/tenant_overlays.py`
- Create: `tests/component_master/registry/test_tenant_overlays.py`

**Interfaces:**
- Produces: `TenantCommercialOverlay`, `apply_tenant_overlay()`.
- Consumed by: procurement/UI integrations outside this release.

- [ ] **Step 1: Write failing isolation tests**

Prove Daph can set preferred supplier, price, stock, lead time and an approval reference while canonical order code, geometry, evidence, qualification and lifecycle remain byte-identical. Prove a second tenant cannot read Daph overlays.

- [ ] **Step 2: Verify RED**

```powershell
python -m unittest tests.component_master.registry.test_tenant_overlays -v
```

- [ ] **Step 3: Implement immutable overlay projection**

```python
@dataclass(frozen=True)
class TenantCommercialOverlay:
    tenant_id: str
    sku_id: str
    preferred: bool
    price_minor: int | None
    currency: str | None
    local_stock: int | None
    lead_time_days: int | None
    approved_substitution_ref: str | None

@dataclass(frozen=True)
class TenantSkuView:
    canonical: CommercialSku
    commercial: TenantCommercialOverlay

def apply_tenant_overlay(
    canonical: CommercialSku,
    overlay: TenantCommercialOverlay,
    requesting_tenant_id: str,
) -> TenantSkuView:
    if overlay.tenant_id != requesting_tenant_id:
        raise PermissionError("tenant overlay access denied")
    if overlay.sku_id != canonical.global_id:
        raise ValueError("overlay SKU does not match canonical SKU")
    return TenantSkuView(canonical=canonical, commercial=overlay)
```

- [ ] **Step 4: Verify GREEN**

```powershell
python -m unittest tests.component_master.registry.test_tenant_overlays -v
```

Expected: exit 0 with cross-tenant denial.

- [ ] **Step 5: Commit**

```powershell
git add packages/component-master/src/monolith_component_master/tenant_overlays.py tests/component_master/registry/test_tenant_overlays.py
git commit -m "feat(registry): isolate tenant commercial overlays"
```

### Mandatory runtime synchronization gate before Task 14

This gate is a prerequisite, not a selector implementation task.

- [ ] Record the current commit and status of both the owner's runtime tree (`fix/dxf-truth-chain`) and the isolated runtime branch.
- [ ] Confirm `src/core/connector/worldSynthesis.ts` contains the T1b `opts.connectorCount` and `opts.excludeCorners` contract. Do not edit or replace that file merely to change connector selection.
- [ ] Wait for a stable-tree point before integrating a newer owner commit. If the owner tree has advanced beyond the isolated runtime base, obtain approval for the exact integration operation and record the before/after commits.
- [ ] Inspect overlap in `catalog.ts`, `types.ts`, `worldSynthesis.ts`, G11, gate stores and freeze/export surfaces before changing runtime code. Preserve concurrent DXF-truth-chain behavior.
- [ ] Run the full nested gate only while the tree is stable. Before attributing a failure to this work, classify it by changed file/owner lane and reproduce it with the exact commit recorded.

Current observation on 2026-07-26: the owner tree and isolated runtime worktree both point at `ed036a2c`; their `worldSynthesis.ts` files are byte-identical and already contain the T1b options above. Recheck this observation immediately before Task 14 because it is not a permanent assumption.

### Task 14: Build the nested hash-pinned release consumer

**Files:**
- Create: `src/core/hardware/registry/registryTypes.ts`
- Create: `src/core/hardware/registry/registryReleaseSchema.ts`
- Create: `src/core/hardware/registry/loadRegistryRelease.ts`
- Create: `src/core/hardware/registry/firstCohortRelease.json`
- Create: `src/core/hardware/registry/__tests__/loadRegistryRelease.test.ts`

**Interfaces:**
- Consumes: parent `RegistryRelease` version 0.1.0.
- Produces: `loadRegistryRelease(bytes, expectedSha256): RegistryRelease`.

- [ ] **Step 1: Copy the exact parent release and write failing hash/schema tests**

Tests cover valid load, one-byte tamper, unsupported schema version, duplicate SKU ID and a verified field missing evidence.

- [ ] **Step 2: Verify RED**

```powershell
npm.cmd run test:run -- src/core/hardware/registry/__tests__/loadRegistryRelease.test.ts
```

Expected: module import failure.

- [ ] **Step 3: Implement Zod validation and SHA-256 pinning**

```typescript
export type RegistryPin = {
  releaseId: string;
  version: string;
  payloadSha256: string;
};

export async function loadRegistryRelease(
  jsonText: string,
  expectedSha256: string,
): Promise<RegistryRelease> {
  const bytes = new TextEncoder().encode(jsonText);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (actual !== expectedSha256.toLowerCase()) {
    throw new Error(`REGISTRY_HASH_MISMATCH expected=${expectedSha256} actual=${actual}`);
  }
  return RegistryReleaseSchema.parse(JSON.parse(jsonText));
}
```

The JSON file header records its parent commit and release manifest hash.

- [ ] **Step 4: Verify GREEN**

```powershell
npm.cmd run test:run -- src/core/hardware/registry
npm.cmd run typecheck:all
```

Expected: exit 0.

- [ ] **Step 5: Commit in the nested repository**

```powershell
git add src/core/hardware/registry
git commit -m "feat(hardware): consume pinned connector registry release"
```

### Task 15: Replace connector fallback with explicit registry resolution

**Files:**
- Create: `src/core/hardware/registry/selectRegistryConnector.ts`
- Create: `src/core/hardware/registry/connectorRecovery.ts`
- Create: `src/core/hardware/registry/__tests__/selectRegistryConnector.test.ts`
- Create: `src/core/hardware/registry/__tests__/connectorRecovery.test.ts`
- Modify: `src/core/connector/types.ts`
- Modify: `src/core/connector/catalog.ts:247-253`

**Interfaces:**
- Produces: `ConnectorResolution`, `ConnectorRecoveryAction`, `selectRegistryConnector(input, release)`.
- Consumed by: factory packet and G11/user-recovery task.

- [ ] **Step 1: Write failing resolution tests**

Cover:

- exact Minifix SKU + compatible housing/BOM;
- `RASTEX` intent returns `STRUCTURAL_EVIDENCE_INSUFFICIENT` rather than Minifix;
- material/thickness outside envelope refuses;
- discontinued/region-only SKU refuses for the wrong region;
- unqualified live Minifix Ø10/17.5 recipe remains shadow-only because the current provenance audit records contradicted/unsourced values.
- every refusal intended for a user-facing gate has recovery actions and exactly one primary action;
- 12/15/16 mm core cases select an exact qualified thickness-specific housing or an explicit compatible-construction action; none becomes a message-only dead end;
- a recovery action never selects `SHADOW_ONLY`, region-blocked, discontinued or tenant-forbidden data as production-qualified.

- [ ] **Step 2: Verify RED**

```powershell
npm.cmd run test:run -- src/core/hardware/registry/__tests__/selectRegistryConnector.test.ts
```

- [ ] **Step 3: Implement discriminated resolution**

```typescript
export type ConnectorResolution =
  | {
      ok: true;
      mode: 'QUALIFIED' | 'SHADOW_ONLY';
      skuId: string;
      connectorSpec: ConnectorSpec;
      registryPin: RegistryPin;
      evidenceAssertionIds: string[];
    }
  | {
      ok: false;
      reason:
        | 'SKU_NOT_FOUND'
        | 'BOM_INCOMPLETE'
        | 'MATERIAL_THICKNESS_UNQUALIFIED'
        | 'TOOL_CAPABILITY_MISSING'
        | 'STRUCTURAL_EVIDENCE_INSUFFICIENT'
        | 'LIFECYCLE_OR_REGION_BLOCKED';
      message: string;
      primaryRecoveryAction: ConnectorRecoveryAction;
      recoveryActions: ConnectorRecoveryAction[];
    };

export type ConnectorRecoveryAction =
  | {
      kind: 'APPLY_QUALIFIED_EXACT_SKU';
      label: string;
      skuId: string;
      expectedRegistryPin: RegistryPin;
    }
  | {
      kind: 'APPLY_QUALIFIED_CONFIGURATION';
      label: string;
      configurationPatch: QualifiedConfigurationPatch;
      expectedRegistryPin: RegistryPin;
    }
  | {
      kind: 'OPEN_FILTERED_RESOLUTION';
      label: string;
      compatibleSkuIds: string[];
      requiredEvidence: string[];
    };
```

Extend `ConnectorFamily` without another closed four-value list:

```typescript
export type LegacyConnectorFamily = 'MINIFIX' | 'TARGET_J' | 'RASTEX' | 'DOWEL';
export type ConnectorFamily = LegacyConnectorFamily | `OEM:${string}`;
```

Delete the behavior in `selectConnector()` that returns Minifix for every family except Target J and dowel. Keep a deprecated wrapper only if every caller passes an exact SKU and handles refusal.

Recovery is not a disguised fallback. The UI must show the OEM, family, exact order code, material/thickness envelope and resulting construction change before applying it. A one-click apply is allowed only when the action is deterministic, registry-pinned, production-qualified and auditable. Where materially different safe choices remain, the primary click opens a pre-filtered resolution surface; it must never silently choose Minifix or waive G11.

- [ ] **Step 4: Verify GREEN and existing Connector OS tests**

```powershell
npm.cmd run test:run -- src/core/hardware/registry src/core/connector
npm.cmd run typecheck:all
```

Expected: exit 0 and no Rastex-to-Minifix fallback test remains.

- [ ] **Step 5: Commit**

```powershell
git add src/core/hardware/registry/selectRegistryConnector.ts src/core/hardware/registry/connectorRecovery.ts src/core/hardware/registry/__tests__/selectRegistryConnector.test.ts src/core/hardware/registry/__tests__/connectorRecovery.test.ts src/core/connector/types.ts src/core/connector/catalog.ts
git commit -m "fix(connectors): resolve exact SKU without family fallback"
```

### Task 16: Wire registry truth and recovery through G11, freeze/export and shadow factory packets

**Files:**
- Modify: `src/factory/packet/builders/buildConnectorOps.ts`
- Modify: `src/factory/packet/types.ts`
- Modify: `src/factory/packet/verifyPacket.ts`
- Create: `src/factory/packet/__tests__/connectorRegistryPin.test.ts`
- Modify: `src/gate/rules/gateG11_minifixSystem32.ts`
- Modify: `src/gate/ui/gateTypes.ts`
- Modify: `src/gate/ui/useExportGate.ts`
- Modify: `src/gate/ui/GateBlockerModal.tsx`
- Modify: `src/components/ui/GateToolbar.tsx`
- Modify: `src/components/ui/ExportPanel.tsx`
- Create: `src/gate/ui/__tests__/connectorRecoveryGate.test.tsx`
- Modify: applicable factory-packet call sites to pass explicit selection context.

**Interfaces:**
- Consumes: `ConnectorResolution`.
- Produces: packet registry pin, exact SKU/BOM, qualification verdict, evidence IDs, refusal records and an auditable recovery path from G11 blocker to a fresh verdict.

- [ ] **Step 1: Write failing packet tests**

Assert:

- packet output contains release ID, SHA-256, exact SKU and BOM;
- identical inputs and release bytes produce identical packet hashes;
- tampered registry hash blocks verification;
- `SHADOW_ONLY` emits NOT-FOR-PRODUCTION and a reason-coded refusal;
- missing explicit connector intent cannot fall back to Minifix;
- current drill-map/connector-ops parity tests remain intact.
- `refusalsToG11Issues()` preserves the resolution reference and recovery actions when it creates the non-waivable G11 blocker;
- the blocker reaches `useExportGate`, GateToolbar and ExportPanel without losing its primary recovery action;
- an unsupported Rastex selection can never freeze/export, but the same refusal offers a qualified exact-SKU/configuration recovery instead of a disabled dead end;
- clicking a qualified deterministic recovery creates an audit event/design revision, regenerates the drill map, invalidates the old verdict, reruns G11 and freezes only after the new verdict is a fresh PASS;
- 12/15/16 mm core refusals expose thickness-specific compatible housing/construction recovery where the pinned release proves it;
- rejected, stale, shadow-only or tampered recovery actions cannot mutate the design or authorize freeze/export.

- [ ] **Step 2: Verify RED**

```powershell
npm.cmd run test:run -- src/factory/packet/__tests__/connectorRegistryPin.test.ts
```

- [ ] **Step 3: Replace the hard-coded selection seam**

Change `buildConnectorOpsData(drillMap)` to consume:

```typescript
export interface ConnectorSelectionContext {
  resolution: ConnectorResolution;
  materialAId: string;
  materialBId: string;
  measuredThicknessAMm: number;
  measuredThicknessBMm: number;
  machineCapabilityIds: string[];
}

export function buildConnectorOpsData(
  drillMap: DrillMap | null,
  context: ConnectorSelectionContext,
): PacketConnectorOps
```

When `resolution.ok` is false, emit a refusal artifact and zero manufacturing operations. `SHADOW_ONLY` may emit comparison operations but must retain the NFP gate.

The refusal path is explicitly end-to-end:

```text
registry resolution refusal
  -> DrillMap.manufacturabilityRefusals
  -> refusalsToG11Issues
  -> G11 FAIL / gate verdict
  -> useExportGate freeze-release-export authority
  -> recovery action
  -> design revision + drill-map regeneration + fresh gate run
```

Fail-closed remains mandatory; dead-end refusal is not acceptable. `View Issues` alone does not satisfy this task. Gate surfaces must expose the primary recovery action in the same refusal context. Applying an action must be idempotent, registry-pin checked and separately auditable from the subsequent freeze.

- [ ] **Step 4: Run scoped and full nested gates**

```powershell
npm.cmd run test:run -- src/core/hardware/registry src/core/connector src/factory/packet
npm.cmd run test:run -- src/gate src/components/ui/__tests__/GateToolbar.dxfExport.test.tsx src/components/ui/__tests__/ExportPanel.dxfExport.test.tsx
npm.cmd run typecheck:all
npm.cmd run build
```

Expected: exit 0; factory packets remain explicitly NOT-FOR-PRODUCTION.

- [ ] **Step 5: Commit**

```powershell
git add src/factory/packet src/core/hardware/registry
git commit -m "feat(factory): pin exact connector registry evidence"
```

## Final reconciliation and release gate

- [ ] Run all parent component-master tests and `tools/verify_kitchen_kernel.py`.
- [ ] Rebuild release 0.1.0 twice and record identical SHA-256 values.
- [ ] Run full nested Vitest, typecheck and build with complete output.
- [ ] Diff parent release SKU IDs against nested materialized release; count and list any differences.
- [ ] Prove all 12 cohort brands have a denominator and every discovered row has a classification.
- [ ] Prove each `VERIFIED` field has primary-source evidence and rights state.
- [ ] Prove all incomplete BOMs, unsupported thicknesses, Rastex fallback attempts and tampered hashes fail closed.
- [ ] Prove every user-facing connector refusal carries a recovery path; qualified one-click actions revise and revalidate before freeze, while unsafe actions remain blocked.
- [ ] Prove 12/15/16 mm core and unsupported-family scenarios do not become message-only dead ends.
- [ ] Record the current Minifix contradicted/unsourced geometry as an explicit blocker; do not relabel it qualified.
- [ ] Render a bilingual implementation report and coverage report to standalone HTML.
- [ ] Keep parent and nested commits separate; do not push until the owner reviews both histories and evidence.

## Execution checkpoints

1. **Foundation checkpoint:** after Task 8, review schema, graph, qualification and deterministic release before vendor data expansion.
2. **Cohort checkpoint:** after Task 12, review source denominators, rights and classifications before runtime import.
3. **Runtime synchronization checkpoint:** immediately before Task 14, re-record both runtime commits, confirm T1b preservation, inspect overlap and proceed only from a stable tree.
4. **Runtime checkpoint:** after Task 16, run independent spec-conformance and code-quality review plus full gates, including refusal-to-recovery-to-fresh-verdict scenarios.
5. **Production decision:** outside this plan. Requires physical configuration qualification, machine/coupon/first-article evidence, security and owner ratification; software completion alone cannot remove NOT-FOR-PRODUCTION.

## Spec-coverage self-review

| Approved requirement | Implemented by |
|---|---|
| Global living brand registry and transparent denominator | Tasks 8–12 |
| Exact model/order code and multidimensional verification | Tasks 2, 3, 9–12 |
| Complete System BOM, tools and compatibility | Task 4 plus cohort data tasks |
| All cabinet substrates and actual thickness | Task 5 |
| Arbitrary W × D × H and tall-cabinet refusal behavior | Task 6 |
| Primary-source hierarchy, immutable evidence and rights | Tasks 3, 7, 9–12 |
| Continuous ingestion, quarantine, lifecycle and coverage | Tasks 7–12 |
| Tenant-local Daph/commercial overlays | Task 13 |
| Parent canonical authority and nested pinned consumer | Tasks 1, 8, 14 |
| No Rastex/unknown-family fallback | Task 15 |
| Fail-closed without user dead ends; one-click qualified recovery and fresh revalidation | Tasks 15–16 |
| Stable-tree runtime synchronization and concurrent T1b preservation | Pre-Task-14 gate |
| Factory-packet provenance and NFP enforcement | Task 16 |
| Physical qualification remains separate from software proof | Final gate and production checkpoint |
