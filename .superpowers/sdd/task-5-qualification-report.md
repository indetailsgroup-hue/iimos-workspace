# Task 5 material/thickness qualification report

## Scope and original clean start

- Isolated parent governance/bootstrap worktree:
  `C:\tmp\monolith-global-connector-registry-parent`
- Branch: `codex/global-connector-registry`
- Original required clean starting HEAD:
  `ea161d00011d369aa48e19d752fb9036a63a1a3b`
- Original starting porcelain: empty.
- All four authorized Task 5 paths were absent before the original test-first
  edit.
- Task brief:
  - bytes: `3,269`
  - SHA-256:
    `60be522de848fbbef45c96644aa537ddc4fc8ddd753e0bc754aec3925c72b5ac`
- `CONTEXT.md`, the 21 July 2026 repository-scope correction, the required
  approved-design sections, and Tasks 2–4 implementation/test style were read.
- The owner/bootstrap root and separate nested runtime root were inspected
  read-only. Their pre-existing dirty states were preserved.
- No owner/runtime edit, push, merge, rebase, branch switch, package export,
  verifier edit, ledger edit, release action, or Task 6 behavior was performed.

## Approved contract and explicit decision

The implementation uses the recommended minimal shape without divergence:

- `Verdict` has exactly the five planned members and values.
- `ThicknessEvidenceKind` has only `EXACT_POINT`, `DECLARED_RANGE`, and
  `APPROVED_INTERPOLATION`; there is no inferred or nearest-neighbour kind.
- `MaterialInstance`, `MaterialConstraint`, `JointConfiguration`,
  `QualificationEnvelope`, and `QualificationResult` are frozen and have the
  exact approved field shapes.
- Panel A and Panel B remain independent and are never swapped.
- Substrate, core, density, moisture, orientation, nominal thickness, measured
  thickness, and facing thickness remain explicit independent constraints.
- Every envelope requires at least one canonical `assertion:` evidence ID.

The approved Task 5 algorithm was used for a sole non-`QUALIFIED` match:
it returns `UNQUALIFIED`, no envelope ID, and
`AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE`. It does not propagate a conditional,
insufficient-evidence, discontinued, or other non-qualified envelope verdict.
The selector was strengthened so any multiple matching records, including one
qualified record plus a conflicting record, also return that fail-closed
ambiguous/non-qualified result.

## Original strict TDD evidence

The complete original contract test and both zero-record JSONL seed files were
created before production code. Immediately before original RED,
`packages/component-master/src/monolith_component_master/qualification.py`
was confirmed absent.

Original RED:

```text
PYTHONDONTWRITEBYTECODE=1 python -B -m unittest tests.component_master.registry.test_qualification -v
```

- exit: `1`
- loader count: `1`
- expected error:
  `ModuleNotFoundError: No module named 'monolith_component_master.qualification'`
- final summary: `FAILED (errors=1)`

After only the minimal production module was added, the same targeted scope
was rerun.

Original GREEN:

- exit: `0`
- Task 5 tests: `48/48`
- final summary: `OK`

The original implementation commit was created only after the targeted suite,
the Task 2–4/legacy regression cohort, verifier contracts, and full dynamic
discovery passed.

## First review: NEEDS_FIXES

The first review verdict was `NEEDS_FIXES`, not accepted. It found two
fail-closed validation gaps:

1. `MaterialConstraint` rejected a negative moisture minimum but did not
   reject `moisture_max_pct` above `100`, even though `MaterialInstance`
   restricts a measured moisture percentage to `0..100`. The reviewer
   reproduction `0..101` was accepted.
2. `QualificationResult` validated its fields independently but did not
   authorize their combination by verdict. Invalid states such as
   `QUALIFIED` without an envelope and `UNQUALIFIED` with an envelope were
   constructible.

No acceptance claim was made from that review.

## Review-fix clean start and reproduction

- Review-fix clean starting HEAD:
  `ba033d0f701cac732e7e27c107e1d5806f6d8b69`
- Review-fix branch: `codex/global-connector-registry`
- Review-fix starting porcelain: empty.
- Commit count from the original base: exactly `1`.
- The two findings were reproduced against unchanged production:
  - a constraint with `moisture_min_pct=0` and `moisture_max_pct=101` was
    accepted;
  - `QualificationResult(QUALIFIED, None, ())` was accepted; and
  - an `UNQUALIFIED` result carrying an envelope ID and a reason was accepted.

The root causes were local to two existing `__post_init__` validation blocks:

- no moisture upper-cap check existed; and
- reason codes were defensively copied, but no verdict-dependent cross-field
  invariant followed the copy.

## Review-fix RED

Exactly three focused test methods were added while production remained
unchanged:

- moisture percentage accepts the `100` boundary and rejects `100.01` and
  `101`, including the exact `0..101` reviewer reproduction;
- qualified and conditionally-qualified results enforce their envelope/reason
  shapes; and
- refusal results forbid envelope IDs and require reasons.

```text
PYTHONDONTWRITEBYTECODE=1 python -B -m unittest <3 focused Task 5 review regressions> -v
```

Result:

- exit: `1`
- focused tests run: `3`
- failed subtests: `12`
- final summary: `FAILED (failures=12)`
- failed behavior evidence:
  - both above-100 moisture maxima were accepted;
  - `QUALIFIED` accepted a missing envelope and unexpected reasons;
  - `CONDITIONALLY_QUALIFIED` accepted a missing envelope and empty reasons;
  - all three refusal verdicts accepted an envelope; and
  - all three refusal verdicts accepted empty reasons.

The valid controls in those methods passed:

- `0..100` moisture;
- `QUALIFIED` with an envelope and exactly empty reasons;
- `CONDITIONALLY_QUALIFIED` with an envelope and a nonblank condition; and
- each refusal verdict with no envelope and a nonblank refusal reason.

## Minimal review fix

Only `qualification.py` and `test_qualification.py` changed in the review-fix
commit.

The production fix:

- rejects `moisture_max_pct > 100`;
- defensively snapshots reason codes once before cross-field validation;
- requires `QUALIFIED` to carry a canonical non-`None` envelope ID and exactly
  empty reason codes;
- requires `CONDITIONALLY_QUALIFIED` to carry a canonical non-`None` envelope
  ID and at least one nonblank reason code; and
- requires `UNQUALIFIED`, `INSUFFICIENT_EVIDENCE`, and
  `DISCONTINUED_OR_UNORDERABLE` to carry no envelope ID and at least one
  nonblank reason code.

`qualify_joint` was not changed, and all three of its existing result shapes
remain valid. No matching, interpolation, substitution, lifecycle, quantity,
release, or Task 6 behavior was added.

## Review-fix GREEN and regression evidence

All commands used `PYTHONDONTWRITEBYTECODE=1` and `python -B`.

Focused review regressions:

```text
python -B -m unittest <3 focused Task 5 review regressions> -v
```

- exit: `0`
- tests: `3/3`
- final summary: `OK`

Complete Task 5 module:

```text
python -B -m unittest tests.component_master.registry.test_qualification -v
```

- exit: `0`
- tests: `51/51`
- increase from the first-review total: exactly `3`
- final summary: `OK`

Task 2 identity + Task 3 evidence + Task 4 compatibility + legacy seed
integrity:

```text
python -B -m unittest tests.component_master.registry.test_registry_models tests.component_master.registry.test_evidence tests.component_master.registry.test_compatibility tests.component_master.test_seed_integrity -v
```

- exit: `0`
- tests: `104/104`
- final summary: `OK`

Focused verifier contracts:

```text
python -B -m unittest tests.test_verify_kitchen_kernel_contract -v
```

- exit: `0`
- tests: `12/12`
- final summary: `OK`

Full dynamic discovery:

```text
python -B -m unittest discover -s tests -q
```

- exit: `0`
- tests: `415/415`
- increase from the first-review total of `412`: exactly `3`
- increase from the Task 4 baseline of `364`: exactly `51` Task 5 tests
- final summary: `OK`

## Commits and exact tracked scope

Original implementation commit:

- commit:
  `ba033d0f701cac732e7e27c107e1d5806f6d8b69`
- message: `feat(registry): add configuration-specific qualification`
- scope: exactly the four original Task 5 create paths
- diffstat: `4 files changed, 1,600 insertions`

Review-fix commit:

- commit:
  `33c48582ecef65e081c949435d82a660ce16529c`
- parent:
  `ba033d0f701cac732e7e27c107e1d5806f6d8b69`
- message: `fix(registry): enforce qualification result invariants`
- commit count from first-review HEAD: exactly `1`
- scope: exactly `qualification.py` and `test_qualification.py`
- diffstat: `2 files changed, 130 insertions, 1 deletion`
- staged whitespace check: exit `0`
- unstaged tracked paths before commit: none
- unmerged entries before commit: `0`

Combined state from the original required base:

- commit count: exactly `2`
- tracked paths: still exactly the four original authorized Task 5 paths
- combined diff: `4` new files, `1,729` insertions, zero deletions

| Path | Bytes | SHA-256 |
|---|---:|---|
| `packages/component-master/src/monolith_component_master/qualification.py` | 14,712 | `f19f7a52ff61c9c6d14bd652ae53a39ea61fc350d67459bfd8180ffa7df00dfd` |
| `tests/component_master/registry/test_qualification.py` | 42,063 | `05eecd5c28ffcc72b250b670e73938a3e163d6aad938a961273010c06399694a` |
| `data/component-master/registry/v1/materials.jsonl` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |
| `data/component-master/registry/v1/qualification-envelopes.jsonl` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |

Both seed files parse as valid JSONL with zero records.

## Final clean-HEAD verifier

Before the verifier, the branch, HEAD, both commit counts, exact fix and
combined paths, porcelain, cached diff, unstaged tracked diff, and unmerged
entries were checked. The committed review-fix worktree was clean.

```text
PYTHONDONTWRITEBYTECODE=1 python -B tools/verify_kitchen_kernel.py
```

Result:

- exit: `0`
- schema: `1.1.0`
- overall: `PASS`
- checks: `13/13`; `0` failed
- dynamic full suite: `415` tests, exit `0`, real unittest `OK`
- governed Component Master suite: exact `20/20`
- governed identity-tenancy suite: exact `7/7`
- Python compile: pass
- Component Master JSON/JSONL parse: pass; `10` JSONL files; `0` errors
- Git evidence:
  - HEAD:
    `33c48582ecef65e081c949435d82a660ce16529c`
  - branch: `codex/global-connector-registry`
  - porcelain entries: `0`
  - staged diff: empty
  - unstaged tracked diff: empty
  - unmerged entries: `0`

Generated verifier summary before cleanup:

- path:
  `artifacts/verification/kitchen-kernel-bootstrap-summary.json`
- bytes: `85,323`
- SHA-256:
  `fc55726bda1cd31352002e110150775293bca035f502dead58e9210bede748ff`

## Combined review package

- range:
  `ea161d00011d369aa48e19d752fb9036a63a1a3b..33c48582ecef65e081c949435d82a660ce16529c`
- includes both Task 5 commits
- format: native `git diff --binary --full-index`
- path:
  `.superpowers/sdd/task-5-qualification-review-package.diff`
- changed paths: exactly the four original authorized Task 5 paths
- numstat: `1 + 1 + 447 + 1,280 = 1,729` insertions, zero deletions
- bytes: `59,874`
- SHA-256:
  `84ff64c4267b236865cb2c755edfcc00a5a6842054b7b0af8fbcc3114f7eed3d`
- reverse-apply validation at final HEAD: exit `0`
- ignore rule confirmed:
  `.gitignore:21:.superpowers/`

## Cleanup and final boundary

- The exact ignored verifier summary was removed after its size and SHA-256
  were recorded.
- The verifier-generated cache targets were resolved under the isolated
  worktree before deletion.
- Exactly `8` generated `__pycache__` directories were removed.
- Remaining verifier summary: absent.
- Remaining `__pycache__` directories: `0`.
- Final tracked HEAD:
  `33c48582ecef65e081c949435d82a660ce16529c`
- Final branch: `codex/global-connector-registry`
- Final commit count from original base: exactly `2`
- Final review-fix commit count: exactly `1`
- Final tracked range: exactly the four original authorized Task 5 paths
- Final porcelain: empty.
- Final cached diff: empty.
- Final unstaged tracked diff: empty.
- Final unmerged entries: `0`.
- This report and the combined full-index review package are ignored and
  outside both commits.

Task 5 stops here. Task 6 was not started.
