# Task 1 — Kitchen-kernel verifier migration evidence

## Authorized scope

- Isolated repository: `C:\tmp\monolith-global-connector-registry-parent`
- Required base: `6dd9937295ba3838bfa57d2610dfb5d0cf316e9d`
- Branch: `codex/global-connector-registry`
- Migration commit: `11f42a052b48479ba20cda54dd9e85da6f5af7a7`
- Commit message: `fix(kernel): verify established repository state`
- Intended committed files only:
  - `.gitignore`
  - `tests/test_verify_kitchen_kernel_contract.py`
  - `tools/verify_kitchen_kernel.py`
- Commit diff: 3 files, 472 insertions, 21 deletions
- No runtime implementation, source-repository edit, push, merge, or project-facing ledger update was performed.

## Pre-migration reproduction

The isolated repository started clean at the required base and branch. A fresh
pre-migration run of `python -B tools/verify_kitchen_kernel.py` exited 1 with
schema `1.0.0`, 12 checks, 10 passes, and exactly 2 failures:

1. `unittest_full_suite`: the repository-wide suite exited 0, parsed 258 tests,
   and emitted `OK`, but the verifier rejected it because it required
   `test_count == 27`.
2. `git_bootstrap_state`: the clean established repository had a real `HEAD`,
   tracked index entries, and one remote, while the old bootstrap contract
   required no `HEAD`, an empty index, and no remote.

The generated pre-migration summary was removed before RED work began.

## TDD RED evidence

Focused test file was created before production edits:
`tests/test_verify_kitchen_kernel_contract.py`.

Command:

```text
python -B -m unittest tests.test_verify_kitchen_kernel_contract -v
```

Final clean RED result before production edits:

```text
Ran 10 tests in 3.253s
FAILED (failures=8)
```

There were zero harness errors. The eight failing contracts were:

- exact generated-summary ignore rule was absent;
- clean committed repository without a remote was not accepted;
- clean committed repository with a remote was not accepted;
- clean detached `HEAD` acceptance and identity metadata were absent;
- unborn-repository `head_exists` evidence under the new check was absent;
- unmerged-entry evidence under the new check was absent;
- an additional passing ambient suite (35 tests, exit 0, real `OK`) was rejected,
  and the exact governed-suite evidence check was absent;
- output schema constant `1.1.0` was absent.

The old verifier already rejected dirty repositories and invalid suite
outcomes, so those negative contract tests remained fail-closed during RED.
They cover staged, unstaged tracked, untracked, unmerged, below-floor, count
drift, missing-`OK`, and nonzero-exit states.

## Minimal implementation

- Repository-wide unittest evidence still runs full discovery. It now requires:
  exit 0, a parsed count at least the governed-core floor of 27, and a standalone
  unittest `OK` summary. No ambient total such as 258 or 268 is encoded.
- Added one structured `governed_kernel_unittest_suites` check:
  - Component Master discovery must exit 0, emit unittest `OK`, and run exactly
    20 tests.
  - identity-tenancy discovery must exit 0, emit unittest `OK`, and run exactly
    7 tests.
- Replaced `git_bootstrap_state` with
  `git_established_repository_state`.
  Passing requires empty porcelain status including untracked files, an existing
  `HEAD`, cached diff exit 0, unstaged tracked diff exit 0, successful and empty
  unmerged listing, and valid branch/detached identity detection.
- Remote names/count are recorded but do not decide pass/fail. Evidence explicitly
  makes no push claim.
- Bumped the consumer-visible output schema from `1.0.0` to `1.1.0`, documented
  beside `OUTPUT_SCHEMA_VERSION` and covered by a focused test.
- Added only the exact root-anchored ignore rule:
  `/artifacts/verification/kitchen-kernel-bootstrap-summary.json`.
- NFP wording, residual limitations, and every unrelated verifier check were
  left unchanged.

## GREEN and pre-commit verification

| Verification | Result |
| --- | --- |
| Focused verifier contracts | exit 0; 10 tests; `OK` |
| Component Master discovery | exit 0; exactly 20 tests; `OK` |
| identity-tenancy discovery | exit 0; exactly 7 tests; `OK` |
| Full repository discovery | exit 0; actual 268 tests; `OK` |
| `lint_claims.py docs/` | exit 0; existing allowlisted debt 110 hits / 25 files |
| `lint_certifications.py docs/` | exit 0; 34 documents checked; existing allowlisted debt 5 hits / 3 files |
| Native pre-commit hook | exit 0 through `C:\Program Files\Git\bin\sh.exe` |
| Staged diff scope/check | exactly 3 intended files; `git diff --cached --check` exit 0 |

The first bare `sh tools/hooks/pre-commit` attempt did not execute the hook
because `sh` was not on the PowerShell `PATH`. The Git-for-Windows shell was
located and the same hook then ran successfully through its absolute path.

## Single clean-HEAD verifier run

The verifier was run exactly once after the migration commit, after confirming
empty porcelain status.

Command:

```text
python -B tools/verify_kitchen_kernel.py
```

Exit code: `0`

Complete verifier console output:

```json
{"overall_passed": true, "check_count": 13, "passed_count": 13, "failed_count": 0, "output": "artifacts/verification/kitchen-kernel-bootstrap-summary.json"}
```

Summary:

- Schema: `1.1.0`
- Overall: PASS
- Checks: 13
- Passed: 13
- Failed: 0
- Ambient unittest count: 268 (minimum 27), exit 0, real `OK`
- Governed Component Master: 20/20, exit 0, real `OK`
- Governed identity-tenancy: 7/7, exit 0, real `OK`

Check list:

1. `unittest_full_suite` — PASS
2. `governed_kernel_unittest_suites` — PASS
3. `python_compile` — PASS
4. `component_master_json_parse` — PASS
5. `component_master_seed_contract` — PASS
6. `tenant_contract_contract` — PASS
7. `bounded_context_inventory` — PASS
8. `bilingual_project_deliverables` — PASS
9. `standalone_html` — PASS
10. `gap_report_parity` — PASS
11. `adr_decision_contract` — PASS
12. `high_confidence_secret_scan` — PASS
13. `git_established_repository_state` — PASS

Established Git evidence:

- `HEAD`: `11f42a052b48479ba20cda54dd9e85da6f5af7a7`
- Branch: `codex/global-connector-registry`
- Detached: false
- Porcelain status lines: 0
- Cached diff exit: 0
- Unstaged tracked diff exit: 0
- Unmerged entries: 0
- Remote count: 1 (`origin`), informational only
- Note: established repository state is verified locally; remote presence is
  informational, and no push is claimed.

Generated summary artifact before intentional cleanup:

- Bytes: `57353`
- SHA-256:
  `efae8f770ffb7f180b67fafbe656b3ebaa957acad95f7f5ee185ffdd009249bf`

## Preserved residual limitations

1. ADRs and fixtures are Proposed and are not deployed runtime evidence.
2. All 19 component specs are Proposed; only 2 of 20 SKU records are
   primary-source Verified.
3. MON-BS-001 and all variants prohibit manufacturing release.
4. Finish mappings do not establish physical equivalence.
5. Supplier/product/model completeness remains unknown without contracted
   feeds.

## Native SDD review package

- Range:
  `6dd9937295ba3838bfa57d2610dfb5d0cf316e9d..11f42a052b48479ba20cda54dd9e85da6f5af7a7`
- File:
  `.superpowers/sdd/task-1-verifier-migration-review-package.diff`
- Bytes: `21272`
- SHA-256:
  `fa61fa9531d9f6fd85f2ad5641fd438e262319b5c9a0bcdf76a2c48e06620b39`

The package is a native `git diff --binary --full-index` for the complete
parent-to-HEAD range. Its head and tail were inspected after generation.

## Cleanup and repository routing

- Removed the exact generated verifier summary after recording its digest.
- Removed 8 generated `__pycache__` directories inside the isolated repository.
- Confirmed 0 remaining `__pycache__` directories in the isolated repository.
- Confirmed the isolated committed repository has empty porcelain status after
  cleanup. The ignored SDD report and review package remain as requested.
- Read-only routing check:
  - Original governance/bootstrap root:
    `C:\Users\thai3\determined-williams (2)`,
    `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4`,
    branch `guardrails/claim-linters`; its existing worktree is dirty.
  - Nested MONOLITH product source:
    `C:\Users\thai3\determined-williams (2)\determined-williams`,
    `b361fb5ef8738a01805d1aa83289ac1337230e4e`,
    branch `fix/dxf-truth-chain`; its existing worktree is dirty.
- Neither original Git root was modified. Neither runtime was started, tested,
  changed, or otherwise exercised.

## Concerns and handoff notes

- Consumers that validate the summary shape must accept schema `1.1.0` and the
  added governed-suite check.
- The final JSON evidence artifact was intentionally removed after its byte
  count and digest were captured, as authorized; rerunning the verifier will
  regenerate it without dirtying the repository.
- No push or merge has been performed.

## Post-review fail-closed correction

This section supersedes the earlier final-HEAD evidence where values differ.
The original migration evidence remains above as the historical RED/GREEN
record.

### Review finding

The rereviewer returned `NEEDS_FIXES` for one objective defect:
`git remote` exit status was recorded but not included in the passing
predicate, and `run()` combines stdout and stderr, so a failed remote query's
stderr was parsed as remote names. The optional second-porcelain TOCTOU
hardening was explicitly excluded from this correction because it is not an
approved-contract defect.

### Correction RED

A new focused regression test used a real clean temporary committed repository
and injected failure only at the `git remote` command boundary.

Command:

```text
python -B -m unittest tests.test_verify_kitchen_kernel_contract -v
```

RED result:

```text
Ran 11 tests in 11.570s
FAILED (failures=1)
```

The single failure reproduced the defect without harness errors:

- `git_established_repository_state` incorrectly passed;
- `remote_exit_code` was correctly recorded as 2;
- stderr `fatal: injected remote query failure` was incorrectly recorded as one
  remote name;
- `remote_count` was incorrectly 1.

### Minimal correction

- Require `remotes["exit_code"] == 0` in the established-repository pass
  predicate.
- Parse remote names only when the remote query exits 0; otherwise record an
  empty name list and count 0.
- Preserve zero or more successful remote results as informational.
- No schema, check-count, NFP, residual-limitation, runtime, or TOCTOU behavior
  was changed.

### Correction GREEN and gates

| Verification | Corrected result |
| --- | --- |
| Focused verifier contracts | exit 0; 11 tests; `OK` |
| Injected remote-query failure regression | fails closed; exit 2 recorded; names `[]`; count 0 |
| Component Master discovery | exit 0; exactly 20 tests; `OK` |
| identity-tenancy discovery | exit 0; exactly 7 tests; `OK` |
| Full repository discovery | exit 0; actual 269 tests; `OK` |
| `lint_claims.py docs/` | exit 0; existing allowlisted debt 110 hits / 25 files |
| `lint_certifications.py docs/` | exit 0; 34 documents; existing allowlisted debt 5 hits / 3 files |
| Native pre-commit hook | exit 0 through `C:\Program Files\Git\bin\sh.exe` |
| Staged diff check | exactly 2 intended files; whitespace check exit 0 |

### Correction commit and exact diff

- Commit:
  `01bf7b51051a520d77b0e9b510d89a0e611ad295`
- Message: `fix(kernel): fail closed when remote query fails`
- Files:
  - `tests/test_verify_kitchen_kernel_contract.py`
  - `tools/verify_kitchen_kernel.py`
- Diff: 2 files, 43 insertions, 3 deletions
- No push or merge was performed.

### Single corrected clean-HEAD verifier run

After confirming clean porcelain status, the verifier was run exactly once on
the corrected commit.

```text
python -B tools/verify_kitchen_kernel.py
```

Exit code: `0`

Complete console output:

```json
{"overall_passed": true, "check_count": 13, "passed_count": 13, "failed_count": 0, "output": "artifacts/verification/kitchen-kernel-bootstrap-summary.json"}
```

Corrected summary:

- Schema: `1.1.0`
- Overall: PASS
- Checks: 13/13 PASS; 0 failures
- Ambient unittest discovery: 269 tests, minimum 27, real `OK`
- Governed Component Master: exactly 20, real `OK`
- Governed identity-tenancy: exactly 7, real `OK`
- Remote query: exit 0
- Informational remotes: 1 (`origin`)
- Check names remain:
  `unittest_full_suite`, `governed_kernel_unittest_suites`,
  `python_compile`, `component_master_json_parse`,
  `component_master_seed_contract`, `tenant_contract_contract`,
  `bounded_context_inventory`, `bilingual_project_deliverables`,
  `standalone_html`, `gap_report_parity`, `adr_decision_contract`,
  `high_confidence_secret_scan`, and
  `git_established_repository_state`.

Corrected generated summary before intentional cleanup:

- Bytes: `57552`
- SHA-256:
  `68aec4bc6b0883f11eb5c3a763b1540973f85a1bada6788a78918a559ae9a0f4`

### Native full-range rereview package

- Range:
  `6dd9937295ba3838bfa57d2610dfb5d0cf316e9d..01bf7b51051a520d77b0e9b510d89a0e611ad295`
- File:
  `.superpowers/sdd/task-1-verifier-migration-rereview-package.diff`
- Bytes: `22805`
- SHA-256:
  `ae9f2895f91221def7fe009be5806547203cf8d700728a9cc4de27daae16008c`

The rereview package is a native `git diff --binary --full-index` for the full
original-base-to-corrected-HEAD range. Its head and tail were inspected.

### Corrected cleanup state

- Removed the exact corrected verifier summary after recording its digest.
- Removed 8 generated `__pycache__` directories.
- Confirmed zero remaining cache directories.
- Confirmed empty porcelain status after cleanup; the report and rereview
  package are ignored evidence files.
- The original governance root, nested product source, and both runtimes were
  not modified or exercised.
