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

