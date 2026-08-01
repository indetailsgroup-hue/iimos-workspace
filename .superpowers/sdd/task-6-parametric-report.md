# Task 6 arbitrary W × D × H cabinet evaluation report

## Outcome

Task 6 adds an immutable, evidence-bound cabinet policy evaluator for
arbitrary positive finite W × D × H values. It selects exactly one explicit
qualification envelope and one explicit parametric policy for every joint,
then calculates connector count and spacing only from the selected policy.
No global, built-in, inferred, nearest-match, or fabricated cabinet rule was
introduced.

The fresh implementation review returned `NEEDS_FIXES`. A second strict-TDD
cycle closed all three findings:

- exact SKU lifecycle verification now gates independently from model
  lifecycle;
- connector arithmetic now uses a checked decimal-boundary integer-ratio
  helper instead of raw binary-float division and `ceil`;
- conditional evaluation reason codes must exactly match the populated
  reinforcement and anchor categories.

The second re-review identified one ordering defect: evaluation accumulated
condition reasons in joint order even though the result contract requires
category order. A third strict-TDD cycle now derives reasons once from the
fully aggregated requirements, so anchor-first multi-joint cabinets emit
`REINFORCEMENT_REQUIRED` followed by `ANCHOR_REQUIRED` for both concrete and
legitimately unresolved placement combinations.

Task 6 stops here. Task 7 was not started.

## Repository and authority preflight

- Assigned implementation worktree:
  `C:\tmp\monolith-global-connector-registry-parent`
- Branch: `codex/global-connector-registry`
- Frozen base:
  `12af68acf9aa0add75cd329480911d14a85fe3b1`
- The assigned worktree was clean before Task 6.
- The governance root and separate nested product root required by
  `CONTEXT.md` were inspected independently. Both had pre-existing dirty
  state and were not modified.
- The 21 July 2026 repository-scope correction was read from the governance
  root because the isolated Task 6 worktree does not contain the linked
  correction file.
- The Task 6 brief was verified at 2,193 bytes with SHA-256
  `e7a00617143f9f3cee6bde4c18d70bb053f3e7a5b8a6a4df30242fb52cac0de4`.
- Approved design sections 10.1–10.5 and 16.2, the Task 2 registry contracts,
  and the accepted Task 5 qualification implementation/tests were read
  before editing.

## Approved dependency and interface resolution

The controller-approved dependency resolution was implemented exactly:

```python
def evaluate_cabinet(
    cabinet: CabinetConfiguration,
    registry: Registry,
    machine_capabilities: frozenset[str],
    *,
    qualification_envelopes: Sequence[QualificationEnvelope] = (),
    policies: Sequence[CabinetPolicy] = (),
) -> CabinetEvaluation:
```

The original three positional arguments are preserved. A three-argument call
remains valid and fails closed because the default evidence and policy
collections are empty. The two new collections are keyword-only, explicit,
snapshotted inputs. No spelling adjustment or interface divergence was
required.

`mounting` remains the string field frozen in the Task 6 brief and accepts
only the exact values `FLOOR`, `WALL`, and `MOBILE`. `WALL` requires a
nonblank substrate; the other values require `wall_substrate=None`.

## Implemented contracts

The production change adds:

- `SpacingAxis` with exactly `WIDTH`, `DEPTH`, and `HEIGHT`;
- frozen `CabinetConfiguration`;
- frozen, evidence-bearing `CabinetPolicy`;
- frozen `ConnectorPlacement`;
- frozen `CabinetEvaluation`;
- `evaluate_cabinet()`.

Validation is fail closed for:

- nonpositive, nonfinite, Boolean, or non-real dimensions;
- unknown topology or mounting;
- empty, untyped, duplicate, or mutable-input joint/load/capability/evidence
  collections;
- malformed canonical identifiers;
- invalid or unordered policy bounds;
- invalid connector count and spacing limits;
- an absent exact connector SKU;
- SKU lifecycle verification states other than `VERIFIED` and `REGION_ONLY`;
- lifecycle states other than `ACTIVE` and `REGION_ONLY`;
- missing required machine capability;
- missing, conflicting, or nonqualified joint evidence;
- missing or overlapping parametric policies;
- policy connector-count demand above the governed maximum without an
  evidenced reinforcement or anchor condition.

For a selected spacing axis, the calculation is:

```text
computed_count =
    max(min_connector_count, ceil(axis_length / max_spacing_mm) + 1)
spacing_mm = axis_length / (computed_count - 1)
```

Bounds are inclusive and arbitrary fractional dimensions are preserved.
The reviewed arithmetic rule treats the canonical shortest decimal spelling
of each accepted float as the governed boundary, then computes the ratio
ceiling with exact integer arithmetic. Thus `0.918 / 0.102` is exactly nine,
while `nextafter(0.918, +infinity)` is immediately above nine. Finite ratios
outside binary-float range, including `1e308 / 1e-308`, do not overflow.
Concrete spacing is emitted only when conversion produces a positive finite
float; otherwise the evaluator refuses with
`PARAMETRIC_ARITHMETIC_UNREPRESENTABLE` and no authorization.

When the calculated count exceeds the selected policy maximum and the same
policy carries a reinforcement or anchor requirement, the result is
`CONDITIONALLY_QUALIFIED` and its joint placement has
`connector_count=None` and `spacing_mm=None`. This records that final
manufacturing placement is unresolved instead of emitting guessed machining.
Any selected reinforcement or anchor condition also makes an otherwise
count-valid result conditional.

`CONDITIONALLY_QUALIFIED` records accept only the exact deterministic reason
tuple implied by populated categories: reinforcement requires
`REINFORCEMENT_REQUIRED`, anchor requires `ANCHOR_REQUIRED`, and both require
both codes in that order. Missing, extra, reversed, or unknown codes are
rejected. Evaluation derives this canonical tuple after deduplicating all
requirements, independent of joint order.

Tall cabinets receive no automatic anchor or reinforcement. A tall cabinet
without a matching explicit policy returns `INSUFFICIENT_EVIDENCE`.

Refusal evaluations contain no placements, policy IDs, requirements, or
evidence IDs, so they cannot be mistaken for manufacturing authorization.

## Explicit authority boundary

This evaluator implements evidence-bound rule selection and connector
count/spacing only. It does not claim full racking, overturning,
center-of-gravity, structural extrapolation, collision, edge-distance,
installation-sequence, or physical qualification analysis. Existing
not-for-production and governance boundaries remain unchanged.

## Strict TDD evidence

Tests were completed before production changes.

RED:

```text
PYTHONDONTWRITEBYTECODE=1
python -m unittest tests.component_master.registry.test_parametric_cabinets -v
```

- exit: `1`
- unittest loaded one failed module
- expected error:
  `ImportError: cannot import name 'evaluate_cabinet'`
- `qualification.py` was unchanged at the RED checkpoint.

Original implementation GREEN:

```text
PYTHONDONTWRITEBYTECODE=1
python -m unittest tests.component_master.registry.test_parametric_cabinets tests.component_master.registry.test_qualification -v
```

- exit: `0`
- tests: `88/88`
- Task 6 tests: `37`
- accepted Task 5 qualification tests: `51`
- final summary: `OK`

Review-fix tests were added before the second production edit. The three
focused RED commands observed:

```text
python -B -m unittest <SKU lifecycle regression> -v
```

- exit: `1`
- tests: `1`
- failure: SKU `PENDING` returned `QUALIFIED` instead of
  `INSUFFICIENT_EVIDENCE`

```text
python -B -m unittest <4 decimal/extreme arithmetic regressions> -v
```

- exit: `1`
- tests: `4`
- failures: decimal boundary count `11` instead of `10`; two
  `OverflowError` results for `1e308 / 1e-308`; zero-spacing `ValueError`
  for the smallest positive float divided across three intervals

```text
python -B -m unittest <conditional reason/category regression> -v
```

- exit: `1`
- tests: `1`
- failing subtests: `6`; mismatched, missing, extra, unknown, and reversed
  reason/category combinations were accepted

Focused review-fix GREEN:

- SKU lifecycle regression: `1/1`, exit `0`, `OK`
- decimal/extreme arithmetic regressions: `4/4`, exit `0`, `OK`
- conditional reason/category regression: `1/1`, exit `0`, `OK`

Complete post-fix Task 6 plus accepted Task 5 GREEN:

```text
PYTHONDONTWRITEBYTECODE=1
python -B -m unittest tests.component_master.registry.test_parametric_cabinets tests.component_master.registry.test_qualification -v
```

- exit: `0`
- tests: `94/94`
- Task 6 tests: `43`
- accepted Task 5 qualification tests: `51`
- final summary: `OK`

Second re-review RED:

```text
PYTHONDONTWRITEBYTECODE=1
python -B -m unittest <anchor-first concrete regression> <anchor-first unresolved regression> -v
```

- exit: `1`
- tests: `2`
- failures: `2`
- both valid multi-joint evaluations raised the constructor's canonical
  reason-order `ValueError`

Second re-review focused GREEN:

- exit: `0`
- tests: `2/2`
- final summary: `OK`

Final Task 6 plus accepted Task 5 GREEN:

```text
PYTHONDONTWRITEBYTECODE=1
python -B -m unittest tests.component_master.registry.test_parametric_cabinets tests.component_master.registry.test_qualification -v
```

- exit: `0`
- tests: `96/96`
- Task 6 tests: `45`
- accepted Task 5 qualification tests: `51`
- final summary: `OK`

## Regression and repository verification

Task 2 identity, Task 3 evidence, Task 4 compatibility, and legacy seed
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
- tests: `460/460`
- final summary: `OK`

Clean committed verifier:

```text
PYTHONDONTWRITEBYTECODE=1 python -B tools/verify_kitchen_kernel.py
```

- exit: `0`
- schema: `1.1.0`
- overall: `PASS`
- checks: `13/13`; failed: `0`
- embedded dynamic full suite: `460` tests, exit `0`, real `OK`
- governed Component Master suite: exact `20/20`
- governed identity-tenancy suite: exact `7/7`
- verifier summary: 94,668 bytes
- verifier summary SHA-256:
  `731108a34fdb2e42e98e93fc4b10cb9701299be3add1fc548f3afa3a0b4ac30c`

The verifier's explicit compile step created eight ignored `__pycache__`
directories containing 37 `.pyc` files despite the no-bytecode environment.
Every resolved cache path was verified to remain under the assigned
worktree, then only those generated directories were removed. Final counts
are zero cache directories and zero `.pyc` files.

## Commit and exact tracked scope

- Original implementation commit:
  `1a4971a59622517577dc2a6f8760165395f91f77`
- Original message:
  `feat(registry): evaluate parametric cabinet configurations`
- Review-fix commit:
  `e6680415c68d0944d7cc6d2c90e32d2bb26f13d1`
- Review-fix message:
  `fix(registry): close parametric qualification gaps`
- Review-fix diffstat:
  `2 files changed, 410 insertions, 10 deletions`
- Reason-order fix commit:
  `6663cc9901b961defdb0b781228f701591b97df5`
- Reason-order fix message:
  `fix(registry): normalize conditional reason ordering`
- Reason-order fix diffstat:
  `2 files changed, 182 insertions, 11 deletions`
- Commit count from frozen base: `3`
- Combined base-to-HEAD diffstat:
  `2 files changed, 2,585 insertions`
- Unmerged entries: `0`
- Final tracked worktree status: clean

The base-to-HEAD range contains exactly:

| Status | Path | Insertions | Deletions |
|---|---|---:|---:|
| Modified | `packages/component-master/src/monolith_component_master/qualification.py` | 842 | 0 |
| Added | `tests/component_master/registry/test_parametric_cabinets.py` | 1,743 | 0 |

No export, seed data, ledger, verifier, runtime, owner, push, merge, or rebase
change was made.

## Artifact hashes

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `packages/component-master/src/monolith_component_master/qualification.py` | 42,279 | `52ef4b274653f19aa40b6402a9329c789e381202182a4c36139c39edddc5d6fa` |
| `tests/component_master/registry/test_parametric_cabinets.py` | 59,779 | `f7230160e457cd84044eea3fc403de5575bd8c2fc1d7bd1c2d82607ca6138840` |
| `.superpowers/sdd/task-6-parametric-review-package.diff` | 91,796 | `d16757f5843b572a9e7ebb75aa6d975cc35f25b127022586a72583e0ca17de0e` |

The ignored review package is a native binary-capable full-index Git diff
for
`12af68acf9aa0add75cd329480911d14a85fe3b1..6663cc9901b961defdb0b781228f701591b97df5`.
It contains exactly the two authorized Task 6 paths and passes
`git apply --check --reverse`.
