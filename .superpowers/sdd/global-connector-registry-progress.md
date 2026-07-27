# Global Connector Registry — SDD Progress Ledger

## Task 1: Paired worktrees and baseline gates

**Recorded:** 26–27 July 2026
**Status:** COMPLETE
**Edition:** English (canonical unsuffixed Markdown)
**Companions:** `global-connector-registry-progress.en.html`, `global-connector-registry-progress.th.md`, `global-connector-registry-progress.th.html`
**Historical stop condition (superseded):** The first required parent baseline exited nonzero because its tracked test input was absent from the isolated baseline. Per the implementation plan, no later baseline command was run in that initial execution.
**Closeout:** Owner-authorized baseline adoption and verifier migration resolved the two recorded baseline gaps. Fresh parent and isolated-runtime Task 1 gates passed on 27 July 2026. Tasks 2 and 3 are COMPLETE; Task 4 has not started.

## Paired isolated worktrees

### Parent governance/bootstrap worktree

- Absolute path: `C:\tmp\monolith-global-connector-registry-parent`
- Branch: `codex/global-connector-registry`
- `git rev-parse HEAD`: `9597ce6924b14ec71fe311160a7dfe927f449b13`
- Approved-design ancestor: `92d67571`
- `git status --short` before baseline: empty
- Git directory: `C:/Users/thai3/determined-williams (2)/.git/worktrees/monolith-global-connector-registry-parent`
- Common Git directory: `C:/Users/thai3/determined-williams (2)/.git`
- Superproject working tree: empty (not a submodule)
- Isolation result: linked worktree verified

### Nested MONOLITH runtime worktree

- Absolute path: `C:\tmp\monolith-global-connector-registry-runtime`
- Branch: `codex/global-connector-runtime`
- `git rev-parse HEAD`: `ed036a2ceebc8c3c9fa71edd3fc85ff67ca53b97`
- Minifix provenance baseline: `ed036a2c` retained unchanged
- `git status --short` before baseline: empty
- Git directory: `C:/Users/thai3/determined-williams (2)/determined-williams/.git/worktrees/monolith-global-connector-registry-runtime`
- Common Git directory: `C:/Users/thai3/determined-williams (2)/determined-williams/.git`
- Superproject working tree: empty (not a submodule)
- Isolation result: linked worktree verified

## Toolchain

- Python: `Python 3.14.2`
- Node.js: `v22.21.1`
- npm: `11.6.2`

## Tracked-baseline availability

- At parent baseline `9597ce6924b14ec71fe311160a7dfe927f449b13`, `git ls-tree` reports zero tracked entries under:
  - `tests/component_master/`
  - `packages/component-master/`
  - `data/component-master/`
- None of those three paths exists in the isolated parent worktree.
- The same paths exist only as untracked (`??`) content in the original governance checkout.
- The untracked original-checkout content was not copied, staged, or modified. Integrating it into the isolated baseline requires separate authorization and is outside Task 1.

## NOT-FOR-PRODUCTION state

- State: active
- Source evidence: `src/core/config/shadowMode.ts:16` in the runtime worktree declares `SHADOW_MODE_NOT_FOR_PRODUCTION = true`.
- Packet evidence paths: `src/factory/packet/buildFactoryPacket.ts` adds `NOT_FOR_PRODUCTION.txt`; `src/factory/packet/zipBundle.ts` applies the `NFP-` prefix while shadow mode is active.
- Verification note: the source state was inspected, but the runtime targeted baseline was not run because the plan required stopping at the first failed parent baseline.

## Required baseline commands

### 1. Parent component-master unit tests — FAIL

Command:

```powershell
python -m unittest discover -s tests/component_master -v
```

Exit status: `1`

Complete captured output:

```text
Traceback (most recent call last):
  File "<frozen runpy>", line 198, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\__main__.py", line 18, in <module>
    main(module=None)
    ~~~~^^^^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 103, in __init__
    self.parseArgs(argv)
    ~~~~~~~~~~~~~~^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 119, in parseArgs
    self._do_discovery(argv[2:])
    ~~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 242, in _do_discovery
    self.createTests(from_discovery=True, Loader=Loader)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 149, in createTests
    self.test = loader.discover(self.start, self.pattern, self.top)
                ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\loader.py", line 334, in discover
    raise ImportError('Start directory is not importable: %r' % start_dir)
ImportError: Start directory is not importable: 'tests/component_master'
```

Observed summary: unittest discovery did not start because `tests/component_master/` does not exist in the tracked isolated baseline. Python therefore reported the requested start directory as not importable. No test count or passing summary was produced.

Blocker: the required tests, implementation package, and seed data are absent from the tracked isolated baseline and exist only as untracked original-checkout content. A separately authorized baseline-integration change is required before this command can exercise the intended component-master baseline.

### 2. Parent kitchen-kernel verifier — NOT RUN

Command:

```powershell
python tools/verify_kitchen_kernel.py
```

Exit status: not run after required stop condition.

### 3. Runtime targeted tests — NOT RUN

Command:

```powershell
npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet
```

Exit status: not run after required stop condition.

Minifix targeted-test requirement: **NOT SATISFIED — not run / cannot verify.**

The Minifix live-recipe provenance state was not re-evaluated by this task. Runtime commit `ed036a2c` was retained unchanged, but immutability does not satisfy the targeted-test requirement.

### 4. Runtime typecheck — NOT RUN

Command:

```powershell
npm.cmd run typecheck:all
```

Exit status: not run after required stop condition.

## Historical residual concerns at the initial stop

- `tests/component_master/`, `packages/component-master/`, and `data/component-master/` are absent from the tracked isolated baseline. The only observed copies are untracked original-checkout content; integrating them requires separate authorization.
- `CONTEXT.md` and the 21 July repository-scope correction are absent from parent commit `9597ce69`; they were read from the original governance checkout as mandatory routing context. No file from that checkout was modified.
- Runtime dependencies were installed by the controller before this task. No npm installation or audit output was produced or observed during this execution, so this ledger makes no npm-audit claim.
- The Minifix targeted tests and runtime typecheck were not run, so their requirements remain unsatisfied and cannot be verified from Task 1.
- No production source was changed. The runtime worktree remains read/test-only and unchanged.

## Authorized remediation and current Task 1 status

Owner authorization was `อนุมัติ baseline adoption + verifier migration` (approve baseline adoption and verifier migration). The initial BLOCKED evidence above remains the historical record of the first execution; it is superseded only for the current Task 1 status by the reviewed remediation and the fresh closeout gates below.

Current Task 1 status is **COMPLETE**. This means the paired baseline and verifier gates are established for the governed parent cohort and the pinned isolated runtime baseline. It does not start Task 2, integrate a runtime branch, establish production/manufacturing readiness, or lift NOT-FOR-PRODUCTION.

## Accepted remediation chain

| Stage | Commit | Recorded result |
| --- | --- | --- |
| Adoption manifest | `a3f6216977c2f6e595c11654a13f7be441bb8dd7` | Created the five tracked manifest editions/artifacts for a 77-file, 712,400-byte exact allowlist. |
| Manifest correction | `a6a8d8bd18a871784e806cf54c3a2d6836a540fa` | Aligned EN/TH editions, purpose groups, unresolved migrations, and the ADD-only execution contract. Final manifest JSON SHA-256: `7987272b4b9828574d5244e5a99ef31f423b5546425a643358d2f30ebcc846ee`; compact inventory SHA-256: `1d25a3fdc6bb008d227fcfc80e865dd244396f8842778135e5afa833bbabb2db`. |
| Excluded-root guardrail | `929bb9413ee1f49a7f057dbf4b6911195423cca2` | Made both claim linters refuse excluded paths before testing path existence. |
| Governed cohort adoption | `6dd9937295ba3838bfa57d2610dfb5d0cf316e9d` | Added exactly the 77 manifest paths; no manifest collision, missing path, or extra path was recorded. |
| Established-state verifier migration | `11f42a052b48479ba20cda54dd9e85da6f5af7a7` | Added exact governed-suite evidence, accepted a clean established Git repository, and moved the summary schema to `1.1.0`. |
| Remote-query fail-closed correction | `01bf7b51051a520d77b0e9b510d89a0e611ad295` | Required a successful `git remote` query and prevented stderr from being interpreted as remote names. |

The adopted source bytes retain an inherited advisory: `git diff --cached --check` reported 21 accepted files with `new blank line at EOF`. The manifest pinned those bytes, so adoption did not rewrite them.

## Reviewer verdict chronology

| Review | Verdict | Disposition |
| --- | --- | --- |
| Adoption manifest first review | `NEEDS_FIXES` | Addressed by `a6a8d8bd`; first-pass acceptance is not claimed. |
| Corrected manifest rereview | `ACCEPTED` | Accepted after the edition and execution-contract corrections. |
| Excluded-root guardrail review | `ACCEPTED` | Accepted at `929bb941`. |
| Baseline adoption review | `ACCEPTED` | Accepted at `6dd99372`. |
| Verifier migration first review | `NEEDS_FIXES` | Found the remote-query fail-open defect; first-pass acceptance is not claimed. |
| Corrected verifier rereview | `ACCEPTED` | Accepted after the fail-closed correction at `01bf7b51`. |

## Verifier migration evidence

**PRE-MIGRATION:** a clean run at adopted commit `6dd99372` exited `1` with schema `1.0.0`, 12 checks, 10 passes, and exactly two failures:

1. `unittest_full_suite` rejected a successful ambient run of 258 tests because the old verifier encoded `test_count == 27`.
2. `git_bootstrap_state` rejected the clean established linked worktree because the old verifier required an unborn repository with no HEAD, index, or remote.

These were the two authorized migration failures; the other 10 checks passed.

**POST-MIGRATION:** the corrected verifier at `01bf7b51` uses schema `1.1.0`, requires a successful ambient suite above a floor without encoding its full count, requires exact governed suites of 20 Component Master plus 7 identity-tenancy tests, and checks a clean established Git state. The remote-query regression fails closed. The fresh closeout run below produced 13/13 passing checks.

## Fresh final gates — 27 July 2026

### Parent governance/bootstrap isolated worktree

| Gate | Exit | Fresh evidence |
| --- | ---: | --- |
| `python -B -m unittest discover -s tests/component_master -v` | `0` | Exactly 20 tests ran; `OK`. |
| `python -B tools/verify_kitchen_kernel.py` | `0` | Schema `1.1.0`; 13 checks, 13 passed, 0 failed. Ambient discovery ran 269 tests with a real `OK`; this full count is observational, not a permanent requirement. Governed suites were exactly 20 + 7. |
| Verifier Git evidence | `0` | `HEAD` `01bf7b51051a520d77b0e9b510d89a0e611ad295`, branch `codex/global-connector-registry`, empty porcelain/cached/unstaged/unmerged state, remote query exit `0`, one informational remote (`origin`), and no push claim. |

Fresh generated summary before authorized cleanup: 57,552 bytes; SHA-256 `1edaba16a0aab0ff6dca8521cebdba11d473ef7c92154a3cd527bdc5853e5877`. The exact ignored summary and eight generated `__pycache__` directories were then removed; no cache directory remains.

### Nested MONOLITH isolated runtime worktree

| Gate | Exit | Fresh evidence |
| --- | ---: | --- |
| T1b preservation | `0` | `src/core/connector/worldSynthesis.ts` contains both `opts.connectorCount` and `opts.excludeCorners`. It is 15,694 bytes with SHA-256 `99ee18918f60ea815cf2c718513ef90d025ad862cde88562df1efa447f4e56c8`, byte-identical to the read-only owner copy both at the gate observation `b361fb5e` and final observation `a1e9006a`. |
| `npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet` | `0` | 19 test files passed; 207 tests passed. |
| `npm.cmd run typecheck:all` | `0` | `tsc -b tsconfig.build.json` completed successfully. |

Toolchain recorded for this closeout: Git `2.52.0.windows.1`, Python `3.14.2`, Node.js `v22.21.1`, npm `11.6.2`, TypeScript `5.9.3`, Vitest `3.0.0`, and runtime package `monolith-workspace@2.1.0`.

## NOT-FOR-PRODUCTION and evidence limits

- NOT-FOR-PRODUCTION remains active: `SHADOW_MODE_NOT_FOR_PRODUCTION = true`; the targeted run passed all four NFP tests covering the notice file, manifest/hash participation, and `NFP-` ZIP prefix.
- The live Minifix recipe remains intentionally not fully sourced: the passing provenance tests record one `CONTRADICTED` value (Ø10 sleeve diameter) and two `UNSOURCED` values (17.5 mm bolt-bore depth and the Ø7.5 entry application).
- Software gates do not establish production, manufacturing, machine/coupon/first-article, security, field, or operational readiness.
- Daph remains one tenant/pilot. It does not define the system boundary or own shared canonical data.

## Four-root routing snapshot

| Root and claim boundary | HEAD / branch | Status observation |
| --- | --- | --- |
| Original parent governance/bootstrap root — parent claims only: `C:\Users\thai3\determined-williams (2)` | `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4` / `guardrails/claim-linters` | Dirty external checkout: 8,342 entries (1 tracked change, 8,341 untracked) at closeout observation; never modified by this task. |
| Original nested product runtime — runtime claims only: `C:\Users\thai3\determined-williams (2)\determined-williams` | `a1e9006add32fe3ce5346eb6ca94e8bdce1d13ab` / `fix/dxf-truth-chain` | Dirty external lane: 67 entries (18 tracked changes, 49 untracked) at final closeout observation; never modified by this task. It advanced concurrently from the gate observation `b361fb5e`. |
| Isolated parent closeout lane: `C:\tmp\monolith-global-connector-registry-parent` | Evidence base `01bf7b51051a520d77b0e9b510d89a0e611ad295` / `codex/global-connector-registry` | Clean before ledger editing and after generated-artifact cleanup. |
| Isolated runtime baseline lane: `C:\tmp\monolith-global-connector-registry-runtime` | `ed036a2ceebc8c3c9fa71edd3fc85ff67ca53b97` / `codex/global-connector-runtime` | Clean; read/test-only; no runtime source change. |

The owner runtime has diverged from the isolated baseline because of an external concurrent lane. No sync or integration was performed. The exact integration operation, overlap review, and fresh stable-tree gates remain mandatory immediately before Task 14.

## Task boundary and residual concerns

- Task 1 is closed only for paired baseline establishment and its accepted remediation.
- Tasks 2 and 3 are COMPLETE; Task 4 has not started.
- No runtime/source product code was changed, and no runtime branch was integrated.
- No push or merge was performed.
- The manifest report retained `DONE_WITH_CONCERNS` because the two migrations were unresolved at that point; this closeout preserves that history and records their later accepted resolution.
- The 21 inherited EOF warnings remain advisory debt in accepted source bytes.
- Production readiness remains outside this task and requires physical qualification plus owner ratification.

## Task 2 closeout — 27 July 2026

**Status:** COMPLETE
**Task 2 base:** `e048ec3fb765ab53ae0f3778dfbe3a3483129711`
**Implementation commit:** `84e9b16141fad33be2921cbfcd4796120ac7260b`
**Historical next boundary at Task 2 closeout:** Task 3 had not started.
**Current boundary:** Task 3 is COMPLETE; Task 4 has not started.

### Accepted verifier compatibility correction

Before Task 2, accepted commit `e048ec3fb765ab53ae0f3778dfbe3a3483129711` corrected the verifier so the frozen legacy governed cohort is selected by explicit module names:

- Component Master: `tests.component_master.test_boring_standard`, `tests.component_master.test_catalog_baseline`, `tests.component_master.test_finish_taxonomy`, and `tests.component_master.test_seed_integrity`
- Identity-tenancy: `tests.identity_tenancy.test_contracts`

The governed counts remain exact at 20 + 7, while the full repository suite remains dynamic. Fresh accepted evidence at that correction was 12 focused verifier-contract tests, 270 dynamic full-suite tests, and a clean-HEAD schema `1.1.0` verifier result of 13/13 checks with the governed suites still exact at 20 + 7. The fresh reviewer verdict was `ACCEPTED`. This correction was necessary so new registry tests would remain visible to full discovery without mutating the frozen legacy governed count.

### Authorized Task 2 paths

Implementation commit `84e9b16141fad33be2921cbfcd4796120ac7260b` changed exactly these four authorized paths:

1. `packages/component-master/src/monolith_component_master/registry_models.py`
2. `packages/component-master/src/monolith_component_master/__init__.py`
3. `tests/component_master/registry/test_registry_models.py`
4. `tests/component_master/registry/__init__.py` — the discovery package marker authorized solely so standard `unittest discover` descends into the registry tests

No owner-root or runtime file was changed. `catalog.py` and the legacy `SupplierSKU` interface remain unchanged.

### Exact public identity-model contract

The package publicly exports exactly the six new interfaces `VerificationDimension`, `VerificationState`, `LifecycleState`, `CommercialSku`, `ProductModel`, and `Registry`.

- `VerificationDimension` has exactly `IDENTITY=identity`, `GEOMETRY=geometry`, `BOM=bom`, `TOOLING=tooling`, `MATERIAL_THICKNESS=material_thickness`, `STRUCTURAL=structural`, `COMMERCIAL=commercial`, `FIELD=field`, `LIFECYCLE=lifecycle`, and `RIGHTS=rights`.
- `VerificationState` has exactly `VERIFIED`, `PENDING`, `REGION_ONLY`, `DISCONTINUED`, and `BLOCKED`, with identical uppercase values.
- `LifecycleState` has exactly `PENDING`, `ACTIVE`, `REGION_ONLY`, `SUPERSEDED`, `DISCONTINUED`, and `SOURCE_BLOCKED`, with identical uppercase values.
- Immutable `CommercialSku` has exactly `global_id`, `brand_id`, `model_id`, `oem_order_code`, `region`, `pack_qty`, and `verification`. IDs require nonblank `sku:`, `brand:`, and `model:` prefixes; order code and region must be nonblank; pack quantity must be a positive non-boolean integer; and the map must contain every typed verification dimension exactly once with typed states. The map is defensively copied, read-only, and queried dimension-by-dimension through `is_verified`.
- Immutable `ProductModel` has exactly `model_id`, `brand_id`, `name`, and `lifecycle`. IDs require nonblank `model:` and `brand:` prefixes, name must be nonblank, and lifecycle must be a typed `LifecycleState`.
- Immutable `Registry` defensively copies models and SKUs into read-only exact-ID maps. It rejects non-model/non-SKU entries, duplicate `model_id` values, duplicate SKU `global_id` values before a mapping could collapse distinct records, and SKU references to unknown models. `get_model(model_id)` and `get_sku(global_id)` are deterministic exact lookups and return `None` when absent.

### TDD and verification evidence

| Gate | Accepted result |
| --- | --- |
| RED before production edits | `python -m unittest tests.component_master.registry.test_registry_models -v` exited `1` because `monolith_component_master.registry_models` did not exist. |
| Targeted + legacy GREEN | 34/34 tests passed: 24 new registry contracts + 10 legacy seed-integrity contracts; `OK`. |
| Dynamic full discovery | 294/294 tests passed: the prior dynamic 270 + exactly 24 Task 2 tests; `OK`. |
| Focused verifier contracts | 12/12 tests passed; `OK`. |
| Single clean-HEAD verifier | Schema `1.1.0`; 13/13 checks passed; exact governed suites 20 + 7; dynamic suite 294; Python compile and Git evidence passed. |
| Review | Fresh reviewer verdict `ACCEPTED`. |

### Evidence integrity and cleanup

- Accepted Task 2 report: `.superpowers/sdd/task-2-identity-models-report.md`; 5,907 bytes; SHA-256 `a6075621f56218d3ad42fbba6934c736694fc2e68f4f7cb64e3fb70092fd7599`.
- Accepted native full-index binary review package: `.superpowers/sdd/task-2-identity-models-review-package.diff`; 22,760 bytes; SHA-256 `5e1c9bd0c49a34dccf3a84308dad7f2ebe15d00e776e7bd167e2b611bf731fea`.
- Generated clean-HEAD verifier summary before cleanup: 61,845 bytes; SHA-256 `6ab7d67b41e8540fd74cc6b7fc0d0d8bf8101183aaaeeec8139d21269d5a9e7f`.
- The ignored verifier summary and generated caches were removed after capture.

### Task 2 authority boundary

- Task 2 establishes the domain identity foundation only; it is not a populated living registry.
- It does not create an evidence vault, ingestion pipeline, BOM resolution, qualification workflow, release authority, or runtime integration.
- It establishes no production or manufacturing authority. NOT-FOR-PRODUCTION remains unchanged.
- Daph remains one tenant/pilot only and does not own the shared registry or canonical platform data.
- No push or merge was performed.
- Task 3 is COMPLETE. Task 4 is next and has not started.

## Task 3 closeout — 27 July 2026

**Status:** COMPLETE
**Task 3 base:** `3a29be5ecb69ecb99dac1d2500b57ace9c9b572a`
**Implementation commit:** `24c83de030013e8fde7d9240de4ea5f116dc1d92`
**Next boundary:** Task 4 is next and has not started.

### Authorized Task 3 paths

Implementation commit `24c83de030013e8fde7d9240de4ea5f116dc1d92` changed exactly these four paths:

1. `packages/component-master/src/monolith_component_master/evidence.py`
2. `tests/component_master/registry/test_evidence.py`
3. `data/component-master/registry/v1/.gitignore`
4. `data/component-master/registry/v1/evidence-manifest.jsonl`

No owner-root or nested-runtime file was changed.

### Exact evidence-vault foundation contract

- Immutable `SourceSnapshot` and `FieldAssertion` records have exact frozen field shapes. `SourceSnapshot` records source metadata and an exact lowercase SHA-256 digest; `FieldAssertion` records the entity field, value, source, locator, reviewer, and literal review state.
- `verify_source_hash` computes SHA-256 over the exact supplied bytes-like content without mutating caller input.
- `EvidenceVault.register` is a type-directed, fail-closed registration boundary. Source registration requires hash-matching bytes and stores a defensive immutable copy; source and assertion duplicate IDs are rejected before mapping replacement.
- A `VERIFIED` assertion requires a registered source, a nonblank locator and reviewer, and stored source bytes that still match the registered digest. An unregistered remote-source candidate may be registered only while it remains literally `PENDING`; there is no promotion or deletion API.
- Source and assertion lookup is deterministic and returns `None` when the exact ID is absent.
- The anchored `/_source-cache/` rule ignores only the sibling source cache. The tracked evidence manifest remains visible and contains zero records, so Task 3 fabricates no OEM evidence.

### TDD, verification, and review evidence

| Gate | Accepted result |
| --- | --- |
| RED before production code | `python -m unittest tests.component_master.registry.test_evidence -v` exited `1` with the expected `ModuleNotFoundError` because `monolith_component_master.evidence` did not exist. |
| Targeted evidence GREEN | 24/24 evidence tests passed; `OK`. |
| Task 2 registry + legacy seed | 34/34 tests passed: 24 registry contracts + 10 seed-integrity contracts; `OK`. |
| Focused verifier contracts | 12/12 tests passed; `OK`. |
| Dynamic full discovery | 318/318 tests passed: the prior Task 2 total of 294 + exactly 24 Task 3 evidence tests; `OK`. |
| Single clean-HEAD verifier | Schema `1.1.0`; 13/13 checks passed; governed suites exact 20 + 7; dynamic suite 318; Python compile and Git evidence passed. |
| Fresh review | Spec `ACCEPTED`; Quality `ACCEPTED`; overall verdict `ACCEPTED`; no findings. |

### Evidence integrity and cleanup

- Accepted Task 3 report: `.superpowers/sdd/task-3-evidence-vault-report.md`; 7,144 bytes; SHA-256 `42e45e1d69e8c81bd801b86197cfdd4b0603d7527469670c7f082cd5059ea224`.
- Accepted native full-index binary review package: `.superpowers/sdd/task-3-evidence-vault-review-package.diff`; 22,541 bytes; SHA-256 `15ab2f449c402652ccd36a57c10811d165e8c785ac1bf3cf83e670a0daff2ca2`; reverse-apply validation passed at the implementation HEAD.
- Generated clean-HEAD verifier summary before cleanup: 66,350 bytes; SHA-256 `d7c5211f98eb2bd24094eda8f9f65a4c4e897bc8e6292faf203def4448b2dff4`.
- The ignored verifier summary and all generated caches were removed after capture. The implementation worktree finished clean.

### Task 3 authority boundary

- Task 3 establishes an in-memory evidence-vault foundation only.
- It does not add network fetching, a filesystem vault service, signatures, release authority, ingestion or promotion, populated OEM evidence, runtime integration, or Task 4 behavior.
- It establishes no manufacturing or production authority. NOT-FOR-PRODUCTION remains unchanged.
- Daph remains one tenant/pilot only and does not own the shared registry or canonical platform data.
- No push or merge was performed.
- Task 4 is next and has not started.

## Task 4 closeout — 27 July 2026

**Status:** COMPLETE
**Task 4 base:** `3f09a8b40a9bffe64c0bcd2cda5e2c054592d7e1`
**Implementation commit:** `a715943995b308dff5e8d9bb71f260687b2680d5`
**Review-fix commit:** `30403137cef216ce373f8fba76d90ef5f03f3285`
**Current boundary:** Task 5 is next and has not started. This current closeout supersedes only the earlier Task 1–3 boundary statements that recorded Task 4 as next or not started; those statements remain preserved as historical snapshots.

### Exact tracked Task 4 scope

The combined two-commit range from the Task 4 base changes exactly four Task 4 paths:

1. `packages/component-master/src/monolith_component_master/compatibility.py`
2. `tests/component_master/registry/test_compatibility.py`
3. `data/component-master/registry/v1/bom-edges.jsonl`
4. `data/component-master/registry/v1/compatibility-edges.jsonl`

The implementation commit created all four paths. The review-fix commit changed only `compatibility.py` and `test_compatibility.py`; the two zero-record seed files remained unchanged. No owner-root or nested-runtime file was changed.

### Exact BOM and compatibility graph foundation

- `EdgeType` has exactly 13 literal values: `REQUIRES`, `OPTIONALLY_USES`, `COMPATIBLE_WITH`, `INCOMPATIBLE_WITH`, `REPLACES`, `SUPERSEDES`, `REGION_VARIANT_OF`, `GEOMETRY_VARIANT_OF`, `TOOLED_BY`, `MACHINED_BY`, `INSTALLED_WITH`, `QUALIFIED_WITH`, and `REQUIRES_MATERIAL_CONDITION`.
- Frozen `BomEdge` has exactly `assembly_sku_id`, `component_id`, `edge_type`, `quantity`, `region`, and `evidence_assertion_ids`. Frozen `CompatibilityEdge` has exactly `source_id`, `target_id`, `edge_type`, `region`, and `evidence_assertion_ids`. Frozen `GraphIssue` has exactly `code`, `entity_id`, `related_id`, and `message`.
- `CompatibilityGraph` accepts the typed `Registry`, immutable snapshots of the BOM and compatibility edge iterables, and optional registered non-SKU extras. Its registered entity set is exactly the registry SKU IDs plus canonical extras in the `tool`, `machine`, `material`, and `qualification` namespaces; malformed IDs, wrong types, and duplicate exact edge records fail closed.
- Release validation returns an immutable tuple of structured issues sorted deterministically by code, entity, related entity, and message. Its exact issue codes are `UNKNOWN_ASSEMBLY`, `ASSEMBLY_REGION_MISMATCH`, `ASSEMBLY_LIFECYCLE_INVALID`, `EMPTY_RELEASE_BOM`, `UNREGISTERED_REQUIRED_TARGET`, `TARGET_REGION_MISMATCH`, `TARGET_LIFECYCLE_INVALID`, `INCOMPATIBLE_BOM_TARGET`, and `COMPATIBILITY_CONTRADICTION`. It therefore refuses an unknown assembly, wrong assembly or target region, non-releasable lifecycle, an empty exact-region release BOM, an unregistered required target, an explicit incompatibility between any two present non-optional release entities, and a directed compatible/incompatible contradiction.
- Required `REQUIRES`, `TOOLED_BY`, `MACHINED_BY`, `INSTALLED_WITH`, `QUALIFIED_WITH`, and `REQUIRES_MATERIAL_CONDITION` targets must be registered. `OPTIONALLY_USES` candidates do not fill an empty release BOM and do not block on registration, region, lifecycle, incompatibility, or contradiction until a future explicit selection contract exists.
- The complete exact-region cam + bolt + cap fixture returns zero issues. Symmetric incompatibility declarations produce one canonical component-pair issue, and component-pair checks work in either direction.
- `REPLACES`, `SUPERSEDES`, `REGION_VARIANT_OF`, and `GEOMETRY_VARIANT_OF` are evidence relationships only. A missing exact required target is never auto-substituted or auto-resolved, and the graph exposes no resolve, substitute, auto-select, mutation, add-edge, or remove-edge API.
- `bom-edges.jsonl` and `compatibility-edges.jsonl` are valid tracked JSONL seeds with zero records. Task 4 does not fabricate a populated BOM or compatibility catalog.

### Honest review and TDD chronology

| Stage | Verdict / result | Disposition |
| --- | --- | --- |
| Original TDD | RED: expected missing `compatibility` module; GREEN: 36/36 original Task 4 tests | Established the first implementation without claiming review acceptance. |
| First review | `NEEDS_FIXES` | P1: required component-pair incompatibility could escape release validation. P1: optional candidates could both make an empty release appear nonempty and overblock on region, lifecycle, incompatibility, or contradiction. P2: namespaced IDs admitted loose empty, punctuation, whitespace-adjacent, and non-ASCII segments. |
| Review-fix RED | 11 focused regressions ran; 10 failed | Production code was unchanged for the RED run. Two controls still passed; the reported failure count remained 10 because the directional pair check used subtests inside one test method. |
| Minimal review fix | Only code + test changed | Enforced one ASCII namespaced-ID grammar; excluded optional candidates from release validation; checked incompatibility across every present non-optional entity pair in either direction; retained assembly-first reporting, lexical component-pair ordering, and structured issue deduplication. |
| Review-fix GREEN | 11/11 focused regressions passed; complete Task 4 module 46/46 | The fix added exactly 10 Task 4 regression tests beyond the original 36. |
| Fresh rereview | Spec `ACCEPTED`; Quality `ACCEPTED`; overall `ACCEPTED` | No findings remained. |

### Accepted final gates

These are the accepted Task 4 implementation/fix gates recorded in the refreshed report; the docs-only ledger closeout did not rerun product tests.

| Gate | Accepted result |
| --- | --- |
| Complete Task 4 compatibility module | 46/46 tests passed; `OK`. |
| Prior Task 2 + Task 3 + legacy compatibility | 58/58 tests passed: 24 identity-model + 24 evidence-vault + 10 seed-integrity; `OK`. |
| Focused verifier contracts | 12/12 tests passed; `OK`. |
| Full dynamic discovery | 364/364 tests passed; `OK`. |
| Single clean-HEAD verifier | Schema `1.1.0`; 13/13 checks passed; governed suites exact at 20 Component Master + 7 identity-tenancy; dynamic suite 364; Python compile, JSON/JSONL parsing, and clean Git evidence passed. |

### Evidence integrity and cleanup

- Refreshed Task 4 report: `.superpowers/sdd/task-4-bom-graph-report.md`; 10,491 bytes; SHA-256 `03dd372d0dd30bf2b9312221be832f98647ec8325511747b1c89ede3bf35b8fa`.
- Refreshed native full-index binary review package: `.superpowers/sdd/task-4-bom-graph-review-package.diff`; 63,106 bytes; SHA-256 `f15d4405e125d16cde47af751e5b06086c05963b9b774bbbe74f6d2cb3463f7b`; it contains exactly the four Task 4 paths and reverse-applies cleanly at the review-fix HEAD.
- The generated verifier summary was recorded, then removed. All generated cache directories were removed. The implementation/fix worktree was clean at `30403137cef216ce373f8fba76d90ef5f03f3285`.

### Task 4 authority boundary

- Task 4 establishes only an immutable graph foundation and two empty seeds.
- It does not provide a populated BOM, automatic substitution, material/thickness qualification, ingestion, release signing, runtime integration, or production/manufacturing authority.
- NOT-FOR-PRODUCTION remains active. Software tests do not establish machine, coupon, first-article, field, security, operational, or production readiness.
- Daph remains one tenant/pilot only and does not own the shared registry or canonical platform data.
- No push, merge, rebase, or branch change was performed.
- Task 5 is next and has not started.

## Task 5 closeout — 27 July 2026

**Status:** COMPLETE
**Task 5 base:** `ea161d00011d369aa48e19d752fb9036a63a1a3b`
**Implementation commit:** `ba033d0f701cac732e7e27c107e1d5806f6d8b69`
**Review-fix commit:** `33c48582ecef65e081c949435d82a660ce16529c`
**Current boundary:** Task 6 is next and has not started. This current closeout supersedes only the earlier Task 4 boundary statement that recorded Task 5 as next or not started; the Task 1–4 statements remain preserved as historical snapshots.

### Exact tracked Task 5 scope

The combined two-commit range from the Task 5 base changes exactly four Task 5 paths:

1. `packages/component-master/src/monolith_component_master/qualification.py`
2. `tests/component_master/registry/test_qualification.py`
3. `data/component-master/registry/v1/materials.jsonl`
4. `data/component-master/registry/v1/qualification-envelopes.jsonl`

The implementation commit created all four paths. The review-fix commit changed only `qualification.py` and `test_qualification.py`; the two zero-record seed files remained unchanged. No owner-root or nested-runtime file was changed.

### Exact material and joint-qualification foundation

- `Verdict` has exactly five members with identical uppercase values: `QUALIFIED`, `CONDITIONALLY_QUALIFIED`, `UNQUALIFIED`, `INSUFFICIENT_EVIDENCE`, and `DISCONTINUED_OR_UNORDERABLE`. `ThicknessEvidenceKind` has exactly three members with identical uppercase values: `EXACT_POINT`, `DECLARED_RANGE`, and `APPROVED_INTERPOLATION`; there is no inferred or nearest-neighbour evidence kind.
- Frozen `MaterialInstance` has exactly `substrate`, `core`, `density_kg_m3`, `moisture_pct`, `orientation`, `nominal_thickness_mm`, `measured_thickness_mm`, and `facing_thickness_mm`.
- Frozen `MaterialConstraint` has exactly `substrate`, `core`, `density_min_kg_m3`, `density_max_kg_m3`, `moisture_min_pct`, `moisture_max_pct`, `orientation`, `nominal_thickness_min_mm`, `nominal_thickness_max_mm`, `measured_thickness_min_mm`, `measured_thickness_max_mm`, `facing_thickness_min_mm`, `facing_thickness_max_mm`, and `thickness_evidence_kind`.
- Frozen `JointConfiguration` has exactly `connector_sku_id`, `panel_a`, and `panel_b`. Frozen `QualificationEnvelope` has exactly `envelope_id`, `connector_sku_id`, `panel_a`, `panel_b`, `verdict`, and `evidence_assertion_ids`. Frozen `QualificationResult` has exactly `verdict`, `envelope_id`, and `reason_codes`.
- Panel A and Panel B are independent and never swapped. Each side must match its own constraint for substrate, core, density, moisture, orientation, nominal thickness, measured thickness, and facing thickness within the same envelope.
- `EXACT_POINT` requires collapsed nominal and measured bounds. `DECLARED_RANGE` qualifies only inside its explicit inclusive bounds. `APPROVED_INTERPOLATION` qualifies only inside its explicit evidenced range, and every envelope carries at least one canonical `assertion:` evidence ID. Separate exact evidence at 15 mm and 18 mm does not qualify 16 mm. There is no extrapolation, nearest substitute, panel swap, or nominal-for-measured substitution.
- No match returns `INSUFFICIENT_EVIDENCE` with `NO_EXACT_CONFIGURATION_EVIDENCE`. Any multiple match, including one qualified record plus a conflicting record, and any sole non-qualified match fail closed as `UNQUALIFIED` with `AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE`. Exactly one qualified match returns its exact envelope ID.
- `materials.jsonl` and `qualification-envelopes.jsonl` are valid tracked JSONL seeds with zero records. Task 5 does not fabricate material or qualification evidence.

### Honest review and TDD chronology

| Stage | Verdict / result | Disposition |
| --- | --- | --- |
| Original TDD | RED: expected missing `qualification` module; GREEN: 48/48 original Task 5 tests | Established the first implementation without claiming review acceptance. |
| First review | `NEEDS_FIXES` | P1: `MaterialConstraint` admitted `moisture_max_pct > 100`. P1: contradictory public `QualificationResult` states were constructible because verdict, envelope, and reasons lacked cross-field invariants. |
| Review-fix RED | 3 focused regression methods ran; 12 subtests failed | Production code was unchanged for the RED run. Valid boundary and result-shape controls passed. |
| Minimal review fix | Only `qualification.py` + test changed | Enforced `moisture_max_pct <= 100`; required `QUALIFIED` to have an envelope and exactly empty reasons; required `CONDITIONALLY_QUALIFIED` to have an envelope and at least one nonblank reason; required all three refusal verdicts to have no envelope and at least one nonblank reason; defensively snapshotted reasons before validation. |
| Review-fix GREEN | Focused regressions passed 3/3; complete Task 5 module passed 51/51 | The fix added exactly three Task 5 regression methods beyond the original 48. |
| Fresh rereview | Spec `ACCEPTED`; Quality `ACCEPTED`; overall `ACCEPTED` | No findings remained. |

### Accepted final gates

These are the accepted Task 5 implementation/fix gates recorded in the refreshed report; the docs-only ledger closeout did not rerun product tests.

| Gate | Accepted result |
| --- | --- |
| Complete Task 5 qualification module | 51/51 tests passed; `OK`. |
| Prior Task 2 + Task 3 + Task 4 + legacy regression cohort | 104/104 tests passed; `OK`. |
| Focused verifier contracts | 12/12 tests passed; `OK`. |
| Full dynamic discovery | 415/415 tests passed; `OK`. |
| Single clean-HEAD verifier | Schema `1.1.0`; 13/13 checks passed; governed suites exact at 20 Component Master + 7 identity-tenancy; dynamic suite 415; Python compile, JSON/JSONL parsing, and clean Git evidence passed. |

### Evidence integrity and cleanup

- Refreshed Task 5 report: `.superpowers/sdd/task-5-qualification-report.md`; 12,269 bytes; SHA-256 `d819894ef49ad1ad3cc2d7a99a6a7948b22383e914b4f98ad9aa48d3ccb17ac5`.
- Refreshed native full-index binary review package: `.superpowers/sdd/task-5-qualification-review-package.diff`; 59,874 bytes; SHA-256 `84ff64c4267b236865cb2c755edfcc00a5a6842054b7b0af8fbcc3114f7eed3d`; it contains exactly the four Task 5 paths and reverse-applies cleanly at the review-fix HEAD.
- The generated verifier summary was recorded, then removed. Exactly eight generated `__pycache__` directories were removed. The implementation/fix worktree was clean at `33c48582ecef65e081c949435d82a660ce16529c`.

### Task 5 authority boundary

- Task 5 establishes only immutable, evidence-bound joint matching and two empty seeds.
- It does not add W × D × H cabinet evaluation, connector count or spacing, structural extrapolation, lifecycle resolution, BOM mutation, ingestion, release authority, runtime integration, or production/manufacturing authority.
- NOT-FOR-PRODUCTION remains active. Software tests do not establish machine, coupon, first-article, field, security, operational, or production readiness.
- Daph remains one tenant/pilot only and does not own the shared registry or canonical platform data.
- No push or merge was performed.
- Task 6 is next and has not started.

## Task 6 closeout — 27 July 2026

**Status:** COMPLETE
**Task 6 base:** `12af68acf9aa0add75cd329480911d14a85fe3b1`
**Implementation commit:** `1a4971a59622517577dc2a6f8760165395f91f77` — `feat(registry): evaluate parametric cabinet configurations`
**First review-fix commit:** `e6680415c68d0944d7cc6d2c90e32d2bb26f13d1` — `fix(registry): close parametric qualification gaps`
**Second review-fix and accepted HEAD:** `6663cc9901b961defdb0b781228f701591b97df5` — `fix(registry): normalize conditional reason ordering`
**Current boundary:** Task 7 is next and has not started. This closeout supersedes only the Task 5 current-boundary statement that recorded Task 6 as next or not started; all earlier Task 1–5 statements remain preserved as historical snapshots.

### Exact tracked Task 6 scope

The combined three-commit range from the Task 6 base changes exactly two paths:

| Status | Path | Insertions | Deletions |
| --- | --- | ---: | ---: |
| Modified | `packages/component-master/src/monolith_component_master/qualification.py` | 842 | 0 |
| Added | `tests/component_master/registry/test_parametric_cabinets.py` | 1,743 | 0 |

No owner governance-root, nested product-runtime, seed-data, verifier, export, or other product path was changed. No push, merge, rebase, or branch change was performed.

### Exact immutable interfaces and configuration contract

- `SpacingAxis` has exactly `WIDTH`, `DEPTH`, and `HEIGHT`, with identical uppercase values.
- Frozen `CabinetConfiguration` has exactly `width_mm`, `depth_mm`, `height_mm`, `topology`, `joints`, `load_cases`, `mounting`, and `wall_substrate`.
- Frozen, evidence-bearing `CabinetPolicy` has exactly `policy_id`, `connector_sku_id`, `topology`, the inclusive minimum and maximum bounds for width, depth, and height, `spacing_axis`, `max_spacing_mm`, `min_connector_count`, `max_connector_count`, `required_machine_capabilities`, `reinforcement_requirement`, `anchor_requirement`, and `evidence_assertion_ids`.
- Frozen `ConnectorPlacement` has exactly `joint_index`, `connector_sku_id`, `policy_id`, `connector_count`, and `spacing_mm`. Frozen `CabinetEvaluation` has exactly `verdict`, `policy_ids`, `placements`, `reinforcement_requirements`, `anchor_requirements`, `reason_codes`, and `evidence_assertion_ids`.
- `evaluate_cabinet` retains the three positional arguments `cabinet`, `registry`, and `machine_capabilities`; `qualification_envelopes=()` and `policies=()` are explicit keyword-only inputs. The legacy three-argument call remains valid and fails closed because evidence and policy are absent.
- Configuration dimensions accept arbitrary positive finite W × D × H values, including fractional values. Topology is exactly one of `base`, `wall`, `tall`, `wardrobe`, or `custom`. Joints and load cases must be nonempty, typed, defensively snapshotted immutable tuples.
- Mounting is exactly `FLOOR`, `WALL`, or `MOBILE`. `WALL` requires a nonblank wall substrate; `FLOOR` and `MOBILE` require `wall_substrate=None`. IDs and machine capabilities use the strict canonical identifier contract.

### Exact evidence-bound evaluation semantics

- Every connector is resolved by its exact SKU and model. SKU `VerificationDimension.LIFECYCLE` permits only `VERIFIED` or `REGION_ONLY`; `PENDING` returns insufficient evidence, while `DISCONTINUED` or `BLOCKED` is unavailable. Model lifecycle permits only `ACTIVE` or `REGION_ONLY`; all other model lifecycle states are unavailable.
- Every joint is qualified against the explicit Task 5 envelopes before policy selection. Each joint must then have exactly one unambiguous explicit policy matching its exact connector SKU, topology, and inclusive W × D × H bounds. Missing evidence or policy fails closed, and overlapping policies are ambiguous.
- Required machine capabilities are matched exactly. There is no global, built-in, guessed, inferred, nearest-match, or fabricated rule source, no exact-SKU substitution, and no partial manufacturing output on refusal.
- For the selected axis, `connector_count = max(min_connector_count, ceil(axis_length / max_spacing_mm) + 1)`. Accepted floats are governed by their canonical shortest decimal spelling and checked integer-ratio arithmetic, so the decimal boundary `0.918 / 0.102` is exactly nine while the immediately greater float is above nine; finite extreme ratios do not overflow.
- A concrete placement is emitted only with positive finite spacing, calculated as `axis_length / (connector_count - 1)`. An unrepresentable positive finite result refuses with `PARAMETRIC_ARITHMETIC_UNREPRESENTABLE` and no authorization.
- A count above `max_connector_count` refuses unless that exact evidence-bearing policy supplies a reinforcement or anchor requirement. In that allowed conditional case, the placement remains unresolved with both `connector_count=None` and `spacing_mm=None`; no machining value is guessed.
- Any selected reinforcement or anchor requirement keeps the evaluation `CONDITIONALLY_QUALIFIED` even when the count fits. Conditional reason categories are exact and canonical: reinforcement yields `REINFORCEMENT_REQUIRED`, anchor yields `ANCHOR_REQUIRED`, and both yield that two-code tuple in category order regardless of joint order.
- Tall cabinets receive no automatic anchor or reinforcement. Any refusal returns reasons but no policy IDs, placements, reinforcement requirements, anchor requirements, or evidence IDs.

### Honest TDD and independent-review chronology

| Stage | Verdict / result | Disposition |
| --- | --- | --- |
| Initial RED | Expected `ImportError` because `evaluate_cabinet` did not exist | `qualification.py` remained unchanged at the RED checkpoint. |
| Initial implementation GREEN | Task 6 + Task 5 passed 88/88: 37 + 51; full discovery passed 452 tests | The implementation was not yet accepted. |
| First independent review | `NEEDS_FIXES` | P1: SKU lifecycle was ignored. P1: raw-float arithmetic mishandled the `0.918 / 0.102` boundary and finite `1e308 / 1e-308` extremes. P2: contradictory conditional reason/requirement states were constructible. |
| First review-fix RED | Lifecycle: 1/1 failure. Arithmetic: 4 failing methods exposed the decimal boundary, two overflow cases, and subnormal-zero spacing. Conditional shape: 1 method with 6 failing subtests. | Production code was unchanged for each RED reproduction. |
| First review-fix GREEN | Task 6 + Task 5 passed 94/94: 43 + 51; regressions 104/104; verifier contracts 12/12; full discovery 458/458; clean-HEAD verifier 13/13 | Closed the first review findings without claiming final acceptance. |
| Independent re-review | `NEEDS_FIXES` | P2: anchor-first then reinforcement in a multi-joint cabinet produced noncanonical reason order and crashed both concrete and unresolved placement cases. |
| Second review-fix RED and GREEN | RED: 2/2 failures. GREEN: 2/2 passed. | Canonical category reasons are derived after all requirements are aggregated, independent of joint order. |
| Final implementation gates | Task 6 + Task 5 passed 96/96: 45 + 51; regressions 104/104; verifier contracts 12/12; full discovery 460/460 | The clean-HEAD verifier reported schema `1.1.0`, PASS 13/13, dynamic 460, and governed cohorts exact at 20 + 7. |
| Final independent rereview | `ACCEPTED` — no findings | Eight focused reproductions passed, diff-check passed, and exact scope plus clean-tree checks passed. |

### Accepted evidence integrity and cleanup

These are the accepted implementation/fix results recorded by the Task 6 evidence; this docs-only ledger closeout did not rerun product tests.

- Accepted report: `.superpowers/sdd/task-6-parametric-report.md`; 12,859 bytes; SHA-256 `c11933ad60f634571b72edea67ca271a4524069eab47adbc177e9545aea0d747`.
- Accepted native full-index binary review package: `.superpowers/sdd/task-6-parametric-review-package.diff`; 91,796 bytes; SHA-256 `d16757f5843b572a9e7ebb75aa6d975cc35f25b127022586a72583e0ca17de0e`; it contains exactly the two Task 6 paths and reverse-applies cleanly at the accepted HEAD.
- Accepted clean-HEAD verifier summary before removal: 94,668 bytes; SHA-256 `731108a34fdb2e42e98e93fc4b10cb9701299be3add1fc548f3afa3a0b4ac30c`.
- The verifier summary was removed after capture. Accepted cleanup left zero cache directories and zero `.pyc` files, and the accepted implementation worktree was clean at `6663cc9901b961defdb0b781228f701591b97df5`.

### Task 6 authority boundary

- Task 6 establishes only evidence-bound parametric rule selection plus connector count and spacing.
- It is not full racking, overturning, center-of-gravity, FEA, physical/coupon/machine/first-article/field qualification, populated worldwide policies or evidence, ingestion, release authority, runtime integration, freeze/export authority, or production readiness.
- NOT-FOR-PRODUCTION remains active. Software evidence does not grant manufacturing, installation, operational, or production authority.
- Daph remains one tenant/pilot only and does not own the shared registry or canonical platform data.
- No push, merge, rebase, or branch change was performed.
- Task 7 is next and has not started.
