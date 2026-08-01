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

