# Task 4 BOM and compatibility graph report

## Scope and precondition

- Repository: `C:\tmp\monolith-global-connector-registry-parent`
- Branch: `codex/global-connector-registry`
- Original required clean starting HEAD:
  `3f09a8b40a9bffe64c0bcd2cda5e2c054592d7e1`
- Original starting porcelain: empty.
- The four authorized Task 4 create paths were confirmed absent before the
  original test-first edit.
- Review-fix clean starting HEAD:
  `a715943995b308dff5e8d9bb71f260687b2680d5`
- Review-fix starting porcelain: empty.
- `CONTEXT.md` and the 21 July 2026 repository-scope correction were read.
- The separate nested product root was inspected at
  `C:\Users\thai3\determined-williams (2)\determined-williams`, branch
  `fix/dxf-truth-chain`, HEAD
  `a1e9006add32fe3ce5346eb6ca94e8bdce1d13ab`; its pre-existing dirty state
  was preserved and no nested product file was modified.
- Work was confined to the isolated parent governance/bootstrap worktree.
  No owner-root/runtime change, push, merge, rebase, branch switch, package
  export, verifier, ledger, model, or worktree-removal action was performed.

## Original TDD evidence

The complete original compatibility contract test and the two zero-record
JSONL seeds were created before production code. Immediately before original
RED,
`packages/component-master/src/monolith_component_master/compatibility.py`
was confirmed absent.

```text
python -m unittest tests.component_master.registry.test_compatibility -v
```

Original RED:

- Exit: `1`
- Loader count: `1`
- Expected failure:
  `ModuleNotFoundError: No module named 'monolith_component_master.compatibility'`
- Production file present before command: `False`

Original targeted GREEN:

- Exit: `0`
- Task 4 tests: exact `36`
- Final summary: `OK`

## First review: NEEDS_FIXES

The first review verdict was honestly `NEEDS_FIXES`, not accepted. It found:

1. required release incompatibility was checked only between the assembly and
   each target, so a bolt and cap explicitly incompatible with each other
   could pass;
2. `OPTIONALLY_USES` candidate edges were treated as selected release items,
   allowing optional-only graphs to avoid empty-BOM refusal and allowing
   optional target region, lifecycle, incompatibility, and contradiction state
   to block a release without any selection input; and
3. the generic namespaced-ID regex allowed empty colon segments, unsupported
   punctuation, whitespace-adjacent forms, and non-ASCII segment content.

No acceptance claim was made from the first review.

## Review-fix RED

The production implementation remained unchanged while 11 focused review
regressions were added and run.

```text
python -B -m unittest <11 focused Task 4 review regressions> -v
```

Result:

- Exit: `1`
- Focused tests run: `11`
- Failures: `10`
- Controls passing: `2`
  - approved ASCII namespaced-ID characters remained accepted;
  - an absent optional target remained nonblocking when a valid required edge
    made the release BOM nonempty.
- Failed behavior evidence:
  - malformed BOM, compatibility, registered-extra, and assertion IDs were
    accepted;
  - an optional-only graph returned no `EMPTY_RELEASE_BOM`;
  - registered optional wrong-region/lifecycle state blocked;
  - optional compatibility contradiction blocked;
  - required bolt/cap incompatibility was missed in both directions; and
  - symmetric incompatibility declarations emitted no canonical pair issue.

The failure count is `10` even though the directional incompatibility method
contains two failing subtests; unittest reports the containing focused test
count as `11`.

## Minimal review fix

Only `compatibility.py` and `test_compatibility.py` changed in the review-fix
commit.

The production fix:

- replaces the permissive regex with one reusable ASCII namespaced-ID grammar:
  lowercase namespace `[a-z][a-z0-9_-]*`, followed by one or more nonempty
  colon-delimited segments whose first character is alphanumeric and whose
  remaining characters are limited to `[A-Za-z0-9._-]*`;
- preserves approved dots, hyphens, underscores, numeric OEM codes, and
  uppercase region tokens;
- excludes `OPTIONALLY_USES` candidate edges before determining whether the
  exact-region release BOM is empty and before registration, region,
  lifecycle, incompatibility, or contradiction validation;
- evaluates explicit `INCOMPATIBLE_WITH` declarations across every pair of
  present non-optional release entities, in either direction;
- preserves assembly-first output for assembly/target incompatibility and uses
  deterministic lexical ordering for component/component pairs; and
- deduplicates symmetric declarations through the existing immutable
  `GraphIssue` set.

No selection input, auto-resolution, mutation, ingestion, qualification,
geometry quantity, signing, or Task 5+ behavior was added.

## Review-fix GREEN and final test counts

Focused review regressions:

```text
python -B -m unittest <11 focused Task 4 review regressions> -v
```

- Exit: `0`
- Tests: `11/11`
- Final summary: `OK`

Complete Task 4 module:

```text
python -B -m unittest tests.component_master.registry.test_compatibility -v
```

- Exit: `0`
- Tests: `46/46`
- Increase from first-review total: exact `10`
- Final summary: `OK`

Task 2 identity + Task 3 evidence + legacy seed compatibility:

```text
python -B -m unittest tests.component_master.registry.test_registry_models tests.component_master.registry.test_evidence tests.component_master.test_seed_integrity -v
```

- Exit: `0`
- Total: `58/58`
- Task 2 registry contracts: `24`
- Task 3 evidence contracts: `24`
- Legacy seed-integrity contracts: `10`
- Final summary: `OK`

Final Task 4 plus explicit compatibility total: `104/104`.

Focused verifier contracts:

```text
python -B -m unittest tests.test_verify_kitchen_kernel_contract -v
```

- Exit: `0`
- Tests: `12/12`
- Final summary: `OK`

Full standard dynamic discovery:

```text
python -B -m unittest discover -s tests -q
```

- Exit: `0`
- Tests: `364`
- Increase from the first-review total of `354`: exact `10` review regressions
- Increase from the Task 3 baseline of `318`: exact `46` Task 4 tests
- Final summary: `OK`

`PYTHONDONTWRITEBYTECODE=1` was set for original and review-fix TDD,
compatibility, verifier-contract, full-discovery, and clean-HEAD verifier
commands and inherited by child processes where honored.

## Commits and exact tracked scope

Original implementation commit:

- Commit:
  `a715943995b308dff5e8d9bb71f260687b2680d5`
- Message: `feat(registry): validate complete connector BOM graphs`
- Scope: exactly the four original Task 4 create paths

Review-fix commit:

- Commit:
  `30403137cef216ce373f8fba76d90ef5f03f3285`
- Message: `fix(registry): enforce release BOM edge semantics`
- Commit count from first-review HEAD: exactly `1`
- Diffstat: `2 files changed, 354 insertions, 21 deletions`
- Staged scope: exactly `compatibility.py` and `test_compatibility.py`
- Staged whitespace check: exit `0`
- Unstaged tracked paths before commit: none
- Unmerged entries before commit: `0`

Combined state from original base:

- Commit count: exactly `2`
- Tracked paths: still exactly the original four Task 4 paths
- Combined diff: four new files, `1,942` insertions, zero deletions

| Path | Bytes | SHA-256 |
|---|---:|---|
| `packages/component-master/src/monolith_component_master/compatibility.py` | 16,467 | `48387f0650e72972a1e32ac44438544bf363acbf592410177113c44acc475578` |
| `tests/component_master/registry/test_compatibility.py` | 43,339 | `3d740653f20afb0d5d14aafbcc6557ef37cca0ddf7b4538291ddc3b61b749b49` |
| `data/component-master/registry/v1/bom-edges.jsonl` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |
| `data/component-master/registry/v1/compatibility-edges.jsonl` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |

Both seed files parse as valid JSONL with zero records.

## Final clean-HEAD verifier

Before the verifier, HEAD, branch, both commit counts, porcelain, cached diff,
unstaged tracked diff, and unmerged entries were checked. The worktree was
clean at the committed review-fix HEAD.

```text
python -B tools/verify_kitchen_kernel.py
```

Result:

- Exit: `0`
- Schema: `1.1.0`
- Overall: `PASS`
- Checks: `13/13 PASS`; `0` failed
- Dynamic full suite: `364` tests, exit `0`, real unittest `OK`
- Governed Component Master suite: exact `20/20`, exit `0`, real unittest
  `OK`
- Governed identity-tenancy suite: exact `7/7`, exit `0`, real unittest `OK`
- Python compile check: pass
- Component Master JSON/JSONL parse: pass with both new seed paths included,
  eight JSONL files total, and zero errors
- Verifier Git evidence: HEAD
  `30403137cef216ce373f8fba76d90ef5f03f3285`, branch
  `codex/global-connector-registry`, zero porcelain, cached, unstaged, and
  unmerged entries

Generated verifier summary before cleanup:

- Path:
  `artifacts/verification/kitchen-kernel-bootstrap-summary.json`
- Bytes: `75,127`
- SHA-256:
  `f2b833c41fa92c7c0bd897b82fa8a8b5f2d6f77911b75e6c17dbbe45ab666107`

## Combined review package

- Range:
  `3f09a8b40a9bffe64c0bcd2cda5e2c054592d7e1..30403137cef216ce373f8fba76d90ef5f03f3285`
- Includes both Task 4 commits
- Format: native `git diff --binary --full-index`
- Path:
  `.superpowers/sdd/task-4-bom-graph-review-package.diff`
- Changed paths: exactly the four original tracked Task 4 paths
- Numstat: `1 + 1 + 553 + 1387 = 1,942` insertions, zero deletions
- Bytes: `63,106`
- SHA-256:
  `f15d4405e125d16cde47af751e5b06086c05963b9b774bbbe74f6d2cb3463f7b`
- Reverse-apply validation at final HEAD: exit `0`

## Cleanup and final state

- Removed the exact ignored generated verifier summary after recording its
  size and hash.
- Resolved all cache targets under the isolated worktree and removed exactly
  `8` generated `__pycache__` directories.
- Remaining verifier summary: absent.
- Remaining `__pycache__` directories: `0`.
- Final HEAD:
  `30403137cef216ce373f8fba76d90ef5f03f3285`
- Final branch: `codex/global-connector-registry`
- Final commit count from original base: exactly `2`
- Final review-fix commit count: exactly `1`
- Final tracked range: exactly the original four authorized Task 4 paths
- Final porcelain: empty.
- Final cached diff: empty, exit `0`.
- Final unstaged tracked diff: empty, exit `0`.
- Final unmerged entries: `0`.
- The regenerated report and combined full-index review package are ignored
  and outside both commits.

Task 4 stops here. Task 5 was not started.
