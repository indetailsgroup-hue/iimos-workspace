# Task 1 — Baseline adoption execution report

## Outcome

- Status: adoption committed; expected PRE-MIGRATION verifier RED captured; verifier migration not started.
- Branch: `codex/global-connector-registry`
- Reviewed guardrail-fix HEAD: `929bb9413ee1f49a7f057dbf4b6911195423cca2`
- Adoption commit: `6dd9937295ba3838bfa57d2610dfb5d0cf316e9d`
- Commit subject: `chore(kernel): adopt governed baseline cohort`
- Commit scope: exactly 77 manifest paths, all ADD, 8,399 insertions; no missing or extra path.

## Manifest and byte gate

- Manifest JSON SHA-256: `7987272b4b9828574d5244e5a99ef31f423b5546425a643358d2f30ebcc846ee`
- Compact `/files` digest: `1d25a3fdc6bb008d227fcfc80e865dd244396f8842778135e5afa833bbabb2db`
- Read-only source HEAD: `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4`
- Verified: 77 unique exact-untracked sources; 77 pinned size/SHA matches; 77 contained ADD targets; 77 source/target byte matches; 712,400 bytes; zero collision, escape, or path-exclusion failures.
- Intervening commit `929bb941` touches only `tools/lint_claims.py` and `tools/lint_certifications.py`; overlap with the 77 manifest paths is empty.

## Fresh pre-commit gates

| Command | Exit | Result |
|---|---:|---|
| `python -B -m unittest discover -s tests/component_master -v` | 0 | 20 tests, OK |
| `python -B -m unittest discover -s tests/identity_tenancy -v` | 0 | 7 tests, OK |
| `python -B -m unittest discover -s tests -v` | 0 | 258 tests, OK |
| `git hook run pre-commit` | 0 | claim/certification checks passed |
| Normal hook during `git commit` | 0 | passed; no bypass |

Advisory inherited-content debt: `git diff --cached --check` returned 2 for 21 accepted files with `new blank line at EOF`. The accepted manifest pins those bytes, so they were not rewritten.

## PRE-MIGRATION verifier RED

- Exact one-time command on clean committed repository: `python -B tools/verify_kitchen_kernel.py`
- Exit code: `1`
- Exact command output: `{"overall_passed": false, "check_count": 12, "passed_count": 10, "failed_count": 2, "output": "artifacts/verification/kitchen-kernel-bootstrap-summary.json"}`
- Verifier output log: 159 bytes; SHA-256 `671e7876aad2e0d20afef43155b36afcbceaae4d6a1d99c1d0d5eea7851fcb43`
- Generated JSON path before cleanup: `artifacts/verification/kitchen-kernel-bootstrap-summary.json`
- Generated JSON: 47,477 bytes; SHA-256 `7be1dfeb125b60064dc77a243f7f5a407a6801a9a69d5496410d2a570994ae4b`

### Exact failure classification

1. `unittest_full_suite` — accepted `VERIFIER-TEST-COUNT-MIGRATION` only.
   - Nested command exit: `0`; observed count: `258`; command-owned tail: `Ran 258 tests ... OK`.
   - Nested output: 41,233 bytes; SHA-256 `028caf588326a3750e7791c1ca08052bebb5a00dcec6a6d61e9b7f03e20a3f4d`.
   - RED mechanism: verifier requires exactly 27 tests despite successful full discovery of 258.

2. `git_bootstrap_state` — accepted `VERIFIER-GIT-BOOTSTRAP-MIGRATION` only.
   - `status_exit_code=0`; `branch_line="## codex/global-connector-registry"`; `status_line_count=1`; `head_exists=true`; `staged_path_count=167`; `remote_count=1`.
   - `staged_path_count` is the verifier's misleading label for all `git ls-files --stage` entries, not pending staged changes.
   - RED mechanism: verifier still requires an unborn repository with no HEAD/index/remotes; this is an established clean linked worktree.

No additional verifier blocker exists. The other 10 checks passed: Python compile, component-master JSON/contract, tenant contract, bounded-context inventory, bilingual deliverables, standalone HTML, gap parity, ADR contract, and high-confidence secret scan.

## Read-only repository observations

| Repository | Before HEAD | After HEAD | Before status count | After status count | Task writes |
|---|---|---|---:|---:|---|
| Original parent | `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4` | same | 8,342 | 8,342 | None |
| Original runtime | `d38dbde264ef929e8a04813f9b89814974e43caa` | same | 67 | 71 | None; concurrent lane changed status during this task (intermediate observation: 68) |
| Isolated runtime | `ed036a2ceebc8c3c9fa71edd3fc85ff67ca53b97` | same | 0 | 0 | None |

## Review package and cleanup

- Review package: `.superpowers/sdd/task-1-baseline-adoption-commit-review-package.diff`
- Range: `929bb9413ee1f49a7f057dbf4b6911195423cca2..6dd9937295ba3838bfa57d2610dfb5d0cf316e9d`
- Package: 743,114 bytes; SHA-256 `2136169c85510222cb815924b783adf9eea4673ee22a5851244e03d24dc8b85a`
- Cleanup removed exactly six temporary logs/summary files, eight contained `__pycache__` directories, and two now-empty `artifacts` directories (16 exact targets total).
- Final retained ignored evidence: this report and the review package only.
- Final `git status --short --untracked-files=all` in the target repository is empty; zero `__pycache__` directories remain and the generated verifier summary path no longer exists.
