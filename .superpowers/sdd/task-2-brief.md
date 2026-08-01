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

