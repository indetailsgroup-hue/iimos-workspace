# Global Connector Registry — SDD Progress Ledger

## Task 1: Paired worktrees and baseline gates

**Recorded:** 26–27 July 2026
**Status:** COMPLETE
**Edition:** English (canonical unsuffixed Markdown)
**Companions:** `global-connector-registry-progress.en.html`, `global-connector-registry-progress.th.md`, `global-connector-registry-progress.th.html`
**Historical stop condition (superseded):** The first required parent baseline exited nonzero because its tracked test input was absent from the isolated baseline. Per the implementation plan, no later baseline command was run in that initial execution.
**Closeout:** Owner-authorized baseline adoption and verifier migration resolved the two recorded baseline gaps. Fresh parent and isolated-runtime Task 1 gates passed on 27 July 2026. Task 2 is COMPLETE; Task 3 has not started.

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
- Task 2 is COMPLETE; Task 3 has not started.
- No runtime/source product code was changed, and no runtime branch was integrated.
- No push or merge was performed.
- The manifest report retained `DONE_WITH_CONCERNS` because the two migrations were unresolved at that point; this closeout preserves that history and records their later accepted resolution.
- The 21 inherited EOF warnings remain advisory debt in accepted source bytes.
- Production readiness remains outside this task and requires physical qualification plus owner ratification.

## Task 2 closeout — 27 July 2026

**Status:** COMPLETE
**Task 2 base:** `e048ec3fb765ab53ae0f3778dfbe3a3483129711`
**Implementation commit:** `84e9b16141fad33be2921cbfcd4796120ac7260b`
**Next boundary:** Task 3 has not started.

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
- Task 3 is next and has not started.
