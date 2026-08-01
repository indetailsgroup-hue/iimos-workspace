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

