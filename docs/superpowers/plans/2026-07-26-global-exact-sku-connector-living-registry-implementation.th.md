# แผนดำเนินงาน Global Exact-SKU Connector Living Registry

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**เป้าหมาย:** สร้าง global cabinet-connector registry ที่มี governance รักษา exact commercial identity และหลักฐาน ตรวจ Complete System BOM ประเมิน cabinet/material configuration ทุกค่าแบบ fail-closed และส่งมอบ release ที่ reproducible/hash-pinned ให้ nested MONOLITH runtime

**สถาปัตยกรรม:** Parent governance repository เป็น canonical registry producer ด้วย Python 3.11: models, reviewed evidence assertions, compatibility graph, qualification engine, coverage ledger และ deterministic JSON release bundle ส่วน nested TypeScript product เป็น consumer: validate pinned release, resolve explicit connector intent โดยไม่มี family fallback, ใส่ provenance ใน shadow factory packet และคง production block จน configuration-specific evidence ผ่าน

**Tech Stack:** Python 3.11 standard library, dataclasses, Enum, JSON/JSONL, SHA-256, unittest; TypeScript 5, Zod 4, Vitest 3, fast-check, Connector OS และ factory-packet modules ที่มีอยู่; Markdown และ `tools/render_docs.py`

## ข้อกำหนดส่วนกลาง

- Parent root เป็นเจ้าของ ontology, evidence policy, canonical identity, registry releases, qualification governance และ coverage reporting
- Nested product ใช้ pinned release และห้ามกลายเป็น product master ที่แข่งขันกัน
- Daph เป็นบริษัทลูกค้า/pilot ที่ให้คำปรึกษาหนึ่งราย; tenant overlay แก้ canonical facts ไม่ได้
- หนึ่ง orderable OEM identity เท่ากับหนึ่ง SKU record; geometry ที่ใช้ร่วมกันให้เชื่อม ไม่ใช่ merge
- `Verified` แยกเป็น identity, geometry, BOM, tooling, material/thickness, structural, commercial, field, lifecycle และ rights
- Verified field ทุกค่ามี primary-source locator, source hash, edition/region และ reviewer
- AI หรือ automated extraction สร้างได้เฉพาะ pending candidate
- รับ W × D × H และ material thickness ได้ทุกค่า แต่ unsupported configuration ต้องได้ refusal
- ห้าม interpolation, extrapolation, nearest-neighbour selection หรือ silent family fallback หากไม่มี explicit qualified rule
- OEM assets อยู่นอก Git เว้นแต่มีสิทธิ์เผยแพร่ที่บันทึกไว้
- Historical/discontinued records ต้องยัง reproducible
- เปิด NOT-FOR-PRODUCTION ตลอดแผน
- Project-facing document ทุกชิ้นมี EN/TH Markdown ที่ตรงกันและ standalone HTML
- ตอน execute ให้ใช้ paired isolated worktrees และรักษา dirty entries ปัจจุบัน 144 รายการใน parent และ 67 รายการใน nested

---

## Workstream และ file map

### Parent canonical producer

สร้าง:

- `packages/component-master/src/monolith_component_master/registry_models.py` — immutable canonical types
- `packages/component-master/src/monolith_component_master/evidence.py` — source snapshots และ field assertions
- `packages/component-master/src/monolith_component_master/compatibility.py` — Complete BOM/typed graph validation
- `packages/component-master/src/monolith_component_master/qualification.py` — material/thickness และ cabinet-joint evaluation
- `packages/component-master/src/monolith_component_master/ingestion.py` — candidate, review และ quarantine
- `packages/component-master/src/monolith_component_master/coverage.py` — denominator/coverage
- `packages/component-master/src/monolith_component_master/releases.py` — deterministic bundle/manifest hash
- `packages/component-master/src/monolith_component_master/tenant_overlays.py`
- `packages/component-master/src/monolith_component_master/adapters/__init__.py`
- `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py`
- `tools/connector_registry/ingest_reviewed.py`
- `tools/connector_registry/build_release.py`
- `tools/connector_registry/check_coverage.py`
- dataset ภายใต้ `data/component-master/registry/v1/` สำหรับ brand, source, evidence, model, SKU, BOM, compatibility, geometry, material, tooling, qualification, lifecycle, coverage และ release 0.1.0
- focused tests ภายใต้ `tests/component_master/registry/`

แก้:

- `packages/component-master/src/monolith_component_master/__init__.py` เพื่อ export approved APIs

### Nested release consumer

สร้าง:

- `src/core/hardware/registry/registryTypes.ts`
- `src/core/hardware/registry/registryReleaseSchema.ts`
- `src/core/hardware/registry/loadRegistryRelease.ts`
- `src/core/hardware/registry/selectRegistryConnector.ts`
- `src/core/hardware/registry/firstCohortRelease.json`
- tests ภายใต้ `src/core/hardware/registry/__tests__/`

แก้:

- `src/core/connector/types.ts` ให้ carry exact SKU/release pin
- `src/core/connector/catalog.ts:247-253` เพื่อลบ default-family resolution
- `src/factory/packet/builders/buildConnectorOps.ts:53-54` ให้รับ explicit selection
- `src/factory/packet/types.ts` ให้บันทึก pin/verdict/refusal
- `src/factory/packet/verifyPacket.ts` ให้ verify hash/evidence gates

Nested JSON เป็น materialized, hash-pinned release ที่ parent ผลิต ไม่ใช่ authority ใหม่

## ลำดับดำเนินงาน

Tasks 1–8 สร้าง canonical engine; Tasks 9–12 นำเข้า first cohort สี่ waves; Task 13 พิสูจน์ tenant separation; Tasks 14–16 เชื่อม nested runtime ห้ามเริ่ม nested cutover ก่อน Task 8 สร้าง deterministic release และก่อน Task 14 ต้องผ่าน runtime synchronization gate ด้านล่าง เพื่อไม่ให้ connector work ทับงาน DXF truth chain ที่กำลังเดินขนาน

### Task 1: สร้าง paired worktrees และ baseline gates

**ไฟล์:**
- อ่าน: `CONTEXT.md`
- อ่าน: `docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.en.md`
- อ่าน: design spec ที่อนุมัติ
- บันทึก: `.superpowers/sdd/global-connector-registry-progress.md`

**Interfaces:** รับ parent commit ที่มีแผนนี้อยู่แล้ว โดยมี `92d67571` เป็น approved-design ancestor และรับ nested `ed036a2c`; ส่งออก clean worktree paths/baseline ledger

- [ ] **Step 1:** ใช้ `superpowers:using-git-worktrees` สร้าง parent branch `codex/global-connector-registry` จาก checked-in commit ที่มีแผนนี้ และ nested branch `codex/global-connector-runtime` จาก `ed036a2c`
- [ ] **Step 2:** บันทึก absolute paths, branches, HEAD, status, Python/Node/npm versions และ NFP state
- [ ] **Step 3:** รัน parent baseline

```powershell
python -m unittest discover -s tests/component_master -v
python tools/verify_kitchen_kernel.py
```

Expected: exit 0 พร้อม final summaries; หาก fail ให้หยุดและบันทึกโดยไม่แก้ production code

- [ ] **Step 4:** รัน nested baseline

```powershell
npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet
npm.cmd run typecheck:all
```

Expected: exit 0; Minifix provenance ยังรายงาน recipe ว่าไม่ fully sourced อย่างซื่อสัตย์

- [ ] **Step 5:** commit เฉพาะ ledger

```powershell
git add .superpowers/sdd/global-connector-registry-progress.md
git commit -m "chore(connectors): record paired registry baselines"
```

### Task 2: เพิ่ม canonical identity และ verification models

**ไฟล์:** สร้าง `registry_models.py`, `test_registry_models.py`; แก้ `__init__.py`

**Interfaces:** ส่งออก `CommercialSku`, `ProductModel`, `VerificationDimension`, `VerificationState`, `LifecycleState`, `Registry`

- [ ] **Step 1:** เขียน failing tests ว่า order code ต่างกันห้าม collapse และ verified ต้องแยกมิติ

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

- [ ] **Step 2:** รัน `python -m unittest tests.component_master.registry.test_registry_models -v` และเห็น import failure
- [ ] **Step 3:** implement immutable types

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

- [ ] **Step 4:** รัน registry-model และ legacy seed tests ให้ exit 0
- [ ] **Step 5:** commit `feat(registry): add exact SKU identity model`

### Task 3: สร้าง evidence vault metadata และ field assertions

**ไฟล์:** สร้าง `evidence.py`, `test_evidence.py`, registry `.gitignore`, `evidence-manifest.jsonl`

**Interfaces:** ส่งออก `SourceSnapshot`, `FieldAssertion`, `EvidenceVault.register()`, `verify_source_hash()`

- [ ] **Step 1:** เขียน tests ที่ reject verified assertion เมื่อขาด publisher, edition/region, locator, SHA-256, access date, reviewer หรือ rights
- [ ] **Step 2:** รัน test และเห็น import failure
- [ ] **Step 3:** implement:

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

- [ ] **Step 4:** รัน `test_evidence` ให้ tamper/rights/locator cases ผ่าน
- [ ] **Step 5:** commit `feat(registry): enforce field-level OEM evidence`

### Task 4: สร้าง Complete System BOM และ compatibility graph

**ไฟล์:** สร้าง `compatibility.py`, test, `bom-edges.jsonl`, `compatibility-edges.jsonl`

**Interfaces:** ส่งออก `BomEdge`, `CompatibilityEdge`, `CompatibilityGraph.validate_release_bom()`

- [ ] **Step 1:** เขียน tests สำหรับ cam+bolt+cap BOM ครบ, missing mating part, incompatibility contradiction, region/lifecycle mismatch และ required tool
- [ ] **Step 2:** รัน test และเห็น import failure
- [ ] **Step 3:** implement typed edges

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
```

- [ ] **Step 4:** รัน `test_compatibility` ให้ incomplete/contradictory BOM ถูก refuse
- [ ] **Step 5:** commit `feat(registry): validate complete connector BOM graphs`

### Task 5: สร้าง material/thickness envelopes และ joint qualification

**ไฟล์:** สร้าง `qualification.py`, test, `materials.jsonl`, `qualification-envelopes.jsonl`

**Interfaces:** ส่งออก `MaterialInstance`, `JointConfiguration`, `QualificationEnvelope`, `QualificationResult`, `qualify_joint()`

- [ ] **Step 1:** เขียน tests ว่า Panel A/B แยกกัน, 15/18 ไม่อนุมัติ 16 โดยอัตโนมัติ, core/facing แยก, density/moisture/orientation เดินทางกับ envelope และ no match คืน insufficient evidence
- [ ] **Step 2:** รัน test และเห็น import failure
- [ ] **Step 3:** implement:

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
```

- [ ] **Step 4:** รัน `test_qualification` และยืนยัน 16 มม. ที่ไม่มี rule ยังถูก refuse
- [ ] **Step 5:** commit `feat(registry): add configuration-specific qualification`

### Task 6: เพิ่ม arbitrary W × D × H cabinet evaluation

**ไฟล์:** แก้ `qualification.py`; สร้าง `test_parametric_cabinets.py`

**Interfaces:** ส่งออก `CabinetConfiguration`, `CabinetEvaluation`, `evaluate_cabinet()`

- [ ] **Step 1:** เขียน generated cases สำหรับ base/wall/tall/wardrobe/custom และ fractional dimensions; invalid/unsupported span ต้องไม่สร้าง rule เดา
- [ ] **Step 2:** รัน test และเห็น import/attribute failure ที่ระบุ `evaluate_cabinet` ก่อน implementation
- [ ] **Step 3:** implement:

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

- [ ] **Step 4:** รัน parametric และ qualification tests ให้ deterministic/exit 0
- [ ] **Step 5:** commit `feat(registry): evaluate parametric cabinet configurations`

### Task 7: เพิ่ม reviewed ingestion และ quarantine

**ไฟล์:** สร้าง `ingestion.py`, adapters package, `reviewed_assertions.py`, `ingest_reviewed.py`, test

**Interfaces:** ส่งออก `CandidateRecord`, `QuarantineRecord`, `ReviewedAssertionAdapter.ingest()`

- [ ] **Step 1:** เขียน tests สำหรับ unit conflict, OEM/distributor conflict, PDF/CAD conflict, unreviewed AI candidate, missing mating part และ uncertain rights
- [ ] **Step 2:** รัน test และเห็น import failure
- [ ] **Step 3:** implement:

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
```

- [ ] **Step 4:** รัน test และ CLI `--help`; ต้องมี `--brand`, `--source-manifest`, `--assertions`, `--out`, `--quarantine`
- [ ] **Step 5:** commit `feat(registry): quarantine unreviewed connector evidence`

### Task 8: เพิ่ม coverage ledger และ deterministic release

**ไฟล์:** สร้าง `coverage.py`, `releases.py`, coverage/release tools, test และ `coverage-snapshot.json`

**Interfaces:** ส่งออก `CoverageSnapshot`, `RegistryRelease`, `build_release()` และ manifest SHA-256

- [ ] **Step 1:** เขียน tests สำหรับ source-order-independent hash, no unclassified item, dimension counts, blocked sources และ verified-without-evidence
- [ ] **Step 2:** รัน test และเห็น import failure
- [ ] **Step 3:** implement canonical UTF-8 JSON, sorted keys/records, normalized line endings และไม่ใส่ wall-clock field ใน hashed payload
- [ ] **Step 4:** รัน:

```powershell
python -m unittest tests.component_master.registry.test_release -v
python tools/connector_registry/build_release.py --root data/component-master/registry/v1 --version 0.1.0
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified
```

Expected: exit 0 และ rebuild สองครั้งได้ hash เดิม

- [ ] **Step 5:** commit `feat(registry): publish deterministic coverage releases`

### Task 9: ประกาศ first-cohort brand/source denominator

**ไฟล์:** สร้าง `brand-universe.jsonl`, `source-denominator.jsonl`, `test_first_cohort_denominator.py`

**Interfaces:** ส่งออก denominator 12 แบรนด์ใน Global/EU, US และ Thailand/ASEAN scopes

- [ ] **Step 1:** เขียน exact-set test สำหรับ Häfele, Hettich, Titus, Lamello, Italiana Ferramenta, OVVO, Lockdowel, Välinge/Threespine, KNAPP, Festool DOMINO, Hoffmann และ Blum
- [ ] **Step 2:** รัน test และเห็น denominator absent
- [ ] **Step 3:** เพิ่ม official source roots เท่านั้น พร้อม publisher, URL, edition, region, language, access date, rights และ state:

| Brand | Official source root |
|---|---|
| Häfele | `https://www.hafele.com/us/en/products/furniture-fittings-living-solutions/connectors-shelf-supports/connectors/50/` |
| Hettich | `https://shop.hettich.com/us_EN/Further-products/Connecting-technology/Connecting-fittings-for-cabinet-bodies/c/group824491857740` |
| Titus | `https://cabinet.titusplus.com/us/en/cabinet-connectors` |
| Lamello | `https://lamello.com/products/p-system` และ current OEM catalog |
| Italiana Ferramenta | `https://www.italianaferramenta.it/en/catalog/connectings` |
| OVVO | `https://ovvotech.com/furniture-connector-types/` |
| Lockdowel | `https://lockdowel.com/cabinets/` และ `/downloads/` |
| Välinge/Threespine | `https://valinge.com/threespine/this-is-threespine/` |
| KNAPP | `https://knappconnectors.com/industries/cabinets-closets-and-case-goods/` |
| Festool DOMINO | OEM pages ของ D8 `576797---kv-sys-d8` และ D14 `576795---sv-sys-d14` |
| Hoffmann | `https://hoffmann-usa.com/faq/` และ OEM documents ที่เชื่อมจากเว็บไซต์ |
| Blum | `https://www.blum.com/eu/en/products/various-products/thin-fronts/assembly/` |
- [ ] **Step 4:** รัน denominator test และ `check_coverage --fail-on-unclassified` ให้ exit 0
- [ ] **Step 5:** commit `data(registry): declare first-cohort source denominator`

### Task 10: นำเข้า wave A — Häfele, Hettich และ Titus

**ไฟล์:** สร้าง reviewed assertions ใต้ `vendors/hafele/`, `vendors/hettich/`, `vendors/titus/`; สร้าง `test_wave_a.py`; generate canonical datasets ผ่าน CLI

**Interfaces:** ส่งออก exact order codes, BOM edges และ evidence queues ของสามแบรนด์

- [ ] **Step 1:** เขียน coverage equation ต่อทุก source table/page และ pin Häfele Minifix page-24 articles กับ ambiguous page-23 articles แยก record/state
- [ ] **Step 2:** รัน test และเห็น wave records absent
- [ ] **Step 3:** transcribe/review OEM assertions; preserve order code, region, pack, finish, mating/tool references; Rastex ห้ามตกเป็น Minifix
- [ ] **Step 4:** รัน wave test, brand-scoped coverage และ rebuild 0.1.0 ให้ exit 0
- [ ] **Step 5:** stage เฉพาะ wave A data/generated canonical changes/test และ commit `data(registry): ingest first-cohort wave A`

### Task 11: นำเข้า wave B — Lamello, Italiana Ferramenta และ OVVO

**ไฟล์:** สร้าง vendor assertion files, `test_wave_b.py`; generate canonical datasets

**Interfaces:** ส่งออก P-System tool/groove dependencies, Target identities และ OVVO thickness/process variants

- [ ] **Step 1:** tests ต้องแยก Lamello family/model, รักษา exact Italiana codes และแยก OVVO drilling/milling
- [ ] **Step 2:** รัน test และเห็น RED
- [ ] **Step 3:** ingest reviewed OEM assertions; marketing family name ใช้แทน exact order code ไม่ได้
- [ ] **Step 4:** รัน wave test, scoped coverage และ rebuild ให้ exit 0
- [ ] **Step 5:** commit `data(registry): ingest first-cohort wave B`

### Task 12: นำเข้า waves C และ D

**ไฟล์:** reviewed assertions สำหรับ Lockdowel, Threespine, KNAPP, Festool, Hoffmann, Blum; `test_wave_c_d.py`

**Interfaces:** ส่งออก snap/slide/profile/dovetail/loose-tenon/thin-front identities พร้อม licensing/tool/role constraints

- [ ] **Step 1:** tests แยก Threespine licensing จาก SKU evidence, Festool D8/D14, Hoffmann machine requirement, Blum thin-front role และ classify Lockdowel/KNAPP models
- [ ] **Step 2:** รัน test และเห็น RED
- [ ] **Step 3:** ingest ทั้งหกแบรนด์; หาก primary evidence ไม่มี exact order code ให้คง model เป็น pending
- [ ] **Step 4:** รัน full-cohort coverage/rebuild ให้ exit 0 และ ledger แสดง pending/blocked
- [ ] **Step 5:** commit `data(registry): complete first-cohort classifications`

### Task 13: บังคับ tenant overlays โดยไม่เปลี่ยน canonical

**ไฟล์:** สร้าง `tenant_overlays.py`, `test_tenant_overlays.py`

**Interfaces:** ส่งออก `TenantCommercialOverlay`, `apply_tenant_overlay()`

- [ ] **Step 1:** tests พิสูจน์ Daph ตั้ง preference/price/stock/lead-time/approval ได้ แต่ canonical bytes ไม่เปลี่ยน และ tenant อื่นอ่าน overlay ไม่ได้
- [ ] **Step 2:** รัน test และเห็น RED
- [ ] **Step 3:** implement:

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
```

- [ ] **Step 4:** รัน test ให้ cross-tenant denial ผ่าน
- [ ] **Step 5:** commit `feat(registry): isolate tenant commercial overlays`

### Runtime synchronization gate ที่ต้องผ่านก่อน Task 14

gate นี้เป็น prerequisite ไม่ใช่งานแก้ selector

- [ ] บันทึก commit และ status ปัจจุบันของทั้ง owner runtime tree (`fix/dxf-truth-chain`) และ isolated runtime branch
- [ ] ยืนยันว่า `src/core/connector/worldSynthesis.ts` มีสัญญา T1b `opts.connectorCount` และ `opts.excludeCorners`; ห้ามแก้หรือแทนไฟล์นี้เพียงเพื่อเปลี่ยน connector selection
- [ ] รอจุดที่ tree นิ่งก่อนนำ owner commit ใหม่เข้ามา หาก owner tree เดินหน้าเกิน isolated base ต้องขออนุมัติวิธี integration ที่ระบุ commit ชัดเจนและบันทึก before/after
- [ ] ตรวจ overlap ใน `catalog.ts`, `types.ts`, `worldSynthesis.ts`, G11, gate stores และ freeze/export surfaces ก่อนแก้ runtime พร้อมรักษาพฤติกรรม DXF truth chain
- [ ] รัน full nested gate เฉพาะตอน tree นิ่ง ก่อนสรุปว่า failure มาจากงานนี้ต้องจำแนกตามไฟล์/owner lane และ reproduce ที่ exact commit

ข้อสังเกต ณ 2026-07-26: owner tree และ isolated runtime worktree อยู่ที่ `ed036a2c` เหมือนกัน; `worldSynthesis.ts` ตรงกันทุกไบต์และมี T1b options แล้ว ต้องตรวจใหม่ทันทีก่อน Task 14 เพราะข้อมูลนี้ไม่ใช่สมมติฐานถาวร

### Task 14: สร้าง nested hash-pinned release consumer

**ไฟล์:** สร้าง registry types/schema/loader/JSON/test ใต้ `src/core/hardware/registry/`

**Interfaces:** รับ parent release 0.1.0; ส่งออก `loadRegistryRelease(bytes, expectedSha256)`

- [ ] **Step 1:** copy exact parent release และเขียน tests สำหรับ valid load, one-byte tamper, wrong schema, duplicate SKU และ verified field ที่ขาด evidence
- [ ] **Step 2:** รัน Vitest และเห็น module import failure
- [ ] **Step 3:** implement:

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

- [ ] **Step 4:** รัน registry tests และ typecheck ให้ exit 0
- [ ] **Step 5:** commit ใน nested: `feat(hardware): consume pinned connector registry release`

### Task 15: แทน connector fallback ด้วย explicit registry resolution

**ไฟล์:** สร้าง `selectRegistryConnector.ts`, `connectorRecovery.ts` และ tests; แก้ `connector/types.ts`, `connector/catalog.ts:247-253`

**Interfaces:** ส่งออก `ConnectorResolution`, `ConnectorRecoveryAction`, `selectRegistryConnector(input, release)`

- [ ] **Step 1:** tests ครอบคลุม exact Minifix BOM, Rastex refusal, material/thickness out-of-envelope, region/lifecycle block, live Minifix Ø10/17.5 เป็น shadow-only, ทุก user-facing refusal มี recovery actions และ primary action หนึ่งรายการ, core 12/15/16mm มี exact thickness-specific housing/compatible construction path และ action ที่ shadow-only/region-blocked/discontinued/ผิด tenant ห้ามใช้ authorize production
- [ ] **Step 2:** รัน test และเห็น RED
- [ ] **Step 3:** implement discriminated result:

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

ขยาย family โดยไม่สร้าง closed list สี่ค่าอีก:

```typescript
export type LegacyConnectorFamily = 'MINIFIX' | 'TARGET_J' | 'RASTEX' | 'DOWEL';
export type ConnectorFamily = LegacyConnectorFamily | `OEM:${string}`;
```

ลบพฤติกรรมที่ family อื่นตกเป็น Minifix; deprecated wrapper ต้องรับ exact SKU และจัดการ refusal

recovery ต้องไม่เป็น fallback ที่เปลี่ยนชื่อ UI ต้องแสดง OEM, family, exact order code, material/thickness envelope และ construction change ก่อนใช้ one-click apply ทำได้เฉพาะ action ที่ deterministic, registry-pinned, production-qualified และ audit ได้ ถ้ามี safe choices ที่ต่างกันอย่างมีนัยสำคัญ primary click ต้องเปิดหน้าตัดสินใจที่กรองมาแล้ว ห้ามเลือก Minifix เงียบ ๆ หรือ waive G11

- [ ] **Step 4:** รัน registry/connector tests และ typecheck ให้ exit 0
- [ ] **Step 5:** commit `fix(connectors): resolve exact SKU without family fallback`

### Task 16: ต่อ registry truth และ recovery ผ่าน G11, freeze/export และ shadow factory packets

**ไฟล์:** แก้ `buildConnectorOps.ts`, packet types/verifier/callers, `gateG11_minifixSystem32.ts`, gate types/`useExportGate.ts`, `GateBlockerModal.tsx`, `GateToolbar.tsx`, `ExportPanel.tsx`; สร้าง packet และ connector-recovery gate tests

**Interfaces:** รับ `ConnectorResolution`; ส่งออก registry pin, exact SKU/BOM, verdict, evidence IDs, refusals และเส้นทาง recovery ที่ audit ได้จาก G11 blocker ไปถึง fresh verdict

- [ ] **Step 1:** tests ต้องตรวจ pin/hash/SKU/BOM, determinism, tamper block, SHADOW_ONLY/NFP, no default Minifix, parity เดิม และพิสูจน์ว่า `refusalsToG11Issues()` รักษา resolution/recovery จนถึง GateToolbar/ExportPanel; Rastex ที่ไม่รองรับถูก block แต่มี exact qualified recovery; คลิก action แล้วสร้าง design revision/audit, regenerate drill map, invalidate verdict เก่า, rerun G11 และ freeze ได้เฉพาะ fresh PASS; core 12/15/16mm ไม่เป็นทางตัน; action ที่ stale/shadow/tampered ห้ามแก้ design หรือ authorize
- [ ] **Step 2:** รัน test และเห็น RED
- [ ] **Step 3:** เปลี่ยน signature:

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

`resolution.ok=false` ต้อง emit refusal/zero manufacturing ops; `SHADOW_ONLY` ใช้ comparison ops ได้แต่ต้องคง NFP

เส้นทาง refusal ที่ต้องพิสูจน์ครบ:

```text
registry resolution refusal
  -> DrillMap.manufacturabilityRefusals
  -> refusalsToG11Issues
  -> G11 FAIL / gate verdict
  -> useExportGate freeze-release-export authority
  -> recovery action
  -> design revision + drill-map regeneration + fresh gate run
```

ต้อง fail-closed แต่ห้ามเป็น dead-end; แค่ปุ่ม `View Issues` ยังไม่ผ่าน requirement นี้ gate surface ต้องแสดง primary recovery action ในบริบทเดียวกับ refusal การ apply ต้อง idempotent, ตรวจ registry pin และมี audit แยกจาก freeze ที่ตามมา

- [ ] **Step 4:** รัน:

```powershell
npm.cmd run test:run -- src/core/hardware/registry src/core/connector src/factory/packet
npm.cmd run test:run -- src/gate src/components/ui/__tests__/GateToolbar.dxfExport.test.tsx src/components/ui/__tests__/ExportPanel.dxfExport.test.tsx
npm.cmd run typecheck:all
npm.cmd run build
```

Expected: exit 0 และ packets ยัง NOT-FOR-PRODUCTION

- [ ] **Step 5:** commit `feat(factory): pin exact connector registry evidence`

## Final reconciliation และ release gate

- [ ] รัน parent component-master tests ทั้งหมดและ `verify_kitchen_kernel.py`
- [ ] rebuild 0.1.0 สองครั้งและบันทึก SHA-256 ที่ตรงกัน
- [ ] รัน full nested Vitest, typecheck และ build พร้อม output ครบ
- [ ] diff parent SKU IDs กับ nested materialized release
- [ ] พิสูจน์ denominator ของ 12 แบรนด์และ classification ของทุกรายการที่ค้นพบ
- [ ] พิสูจน์ verified fields มี primary evidence/rights
- [ ] พิสูจน์ incomplete BOM, unsupported thickness, Rastex fallback และ tampered hash fail closed
- [ ] พิสูจน์ทุก user-facing connector refusal มี recovery path; qualified one-click action ต้อง revise และ revalidate ก่อน freeze ส่วน action ไม่ปลอดภัยยังถูก block
- [ ] พิสูจน์ core 12/15/16mm และ unsupported-family ไม่กลายเป็น message-only dead end
- [ ] บันทึก Minifix geometry ที่ contradicted/unsourced เป็น blocker ห้ามเรียก qualified
- [ ] render implementation/coverage reports สองภาษาเป็น standalone HTML
- [ ] แยก parent/nested commits และห้าม push จน owner review histories/evidence

## Execution checkpoints

1. **Foundation:** หลัง Task 8 review schema, graph, qualification และ deterministic release
2. **Cohort:** หลัง Task 12 review source denominator, rights และ classifications
3. **Runtime synchronization:** ก่อน Task 14 ให้บันทึก runtime commits ทั้งสองใหม่ ยืนยัน T1b ตรวจ overlap และเดินต่อเฉพาะตอน tree นิ่ง
4. **Runtime:** หลัง Task 16 ทำ independent spec-conformance/code-quality review และ full gates รวม refusal→recovery→fresh verdict
5. **Production decision:** อยู่นอกแผนนี้ ต้องมี physical qualification, machine/coupon/first-article evidence, security และ owner ratification; software completion ไม่ปลด NOT-FOR-PRODUCTION

## Spec-coverage self-review

| Approved requirement | Tasks |
|---|---|
| Global living brand registry/transparent denominator | 8–12 |
| Exact model/order code/multidimensional verification | 2, 3, 9–12 |
| Complete System BOM/tools/compatibility | 4 และ cohort data tasks |
| วัสดุตู้ทุกชนิด/ความหนาจริง | 5 |
| Arbitrary W × D × H/ตู้สูง/fail-closed | 6 |
| Primary evidence/immutable source/rights | 3, 7, 9–12 |
| Ingestion/quarantine/lifecycle/coverage | 7–12 |
| Daph/tenant commercial overlay | 13 |
| Parent authority/nested pinned consumer | 1, 8, 14 |
| ไม่มี Rastex/unknown-family fallback | 15 |
| Fail-closed โดยไม่สร้างทางตัน; qualified one-click recovery และ fresh revalidation | 15–16 |
| Stable-tree runtime synchronization และรักษา T1b ที่เดินขนาน | gate ก่อน Task 14 |
| Factory-packet provenance/NFP | 16 |
| Physical qualification แยกจาก software proof | Final gate/production checkpoint |
