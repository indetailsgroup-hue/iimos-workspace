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

