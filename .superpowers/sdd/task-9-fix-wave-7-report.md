# Task 9 fix wave 7 report

Base commit: `33782a92` on `codex/global-connector-registry`. No commit was
made and no push was performed. The working tree holds exactly the scoped
changes.

This wave was told to prefer deleting or narrowing a claim over binding it.
Five of the seven findings were closed by **deleting** prose; one was
**bound**, because its claim is class-wide, true, and cheap to attack; one is a
report correction only. No new sentence was written to justify an old one, with
one exception recorded under H2 below and flagged in the terminal state.

## Per-finding disposition

| Finding | Deleted or bound | Why | What changed |
| --- | --- | --- | --- |
| H1 | **Deleted** | The precedence claim was the only false part; the arm's behaviour was already mutation-bound by the direct seam test, so binding the claim would have meant adding a public-path test to keep a sentence alive rather than to keep a behaviour honest. | The "defence-in-depth … the record enumeration's refusal fires first" sentence is gone from `_published_count_payloads`; the docstring now says the arm refuses two payload counts under one label and names the test that kills its deletion, and stops. The echoed claim in `test_the_collectors_own_duplicate_label_arm_refuses` is replaced by a one-line statement of what that test actually does. |
| H2 | **Named as a residual and pinned** (no cycle detection added) | Detection buys little: the payload is already unpublishable through the canonical path, so detection would change only the words on the exception, and it would add a branch nothing in this lane can reach through publication. The honest record is the failure mode. | A new residual bullet in `_published_count_payloads` states that a payload containing itself exhausts the stack instead of being refused, that `canonical_json_bytes` fails identically, and that nothing here detects the cycle. `test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused` asserts `RecursionError` from both walks. The collector's residual list previously named no cycle at all; it does now. |
| H3 | **Bound** | Narrowing to "one level" would have understated true behaviour, which the brief forbids as the opposite error, and the class claim is genuinely true at HEAD. Binding it costs one loop. | `test_a_count_is_not_a_leaf_to_the_production_walk` is now a depth loop over 1, 2, 4 and 7 levels below the count, with the containers cycling `list` → mapping → `tuple`, so a depth cap fails the deeper rows and a partial container set fails the mixed ones. No prose was added: the existing claim is what the loop now attacks. |
| H4 | **Deleted** | "Empty" closes nothing and can be attacked by nothing — mutation M4 below removed the emptiness half of the enrolment condition and the whole suite stayed green. Deleting the word is the only fix that leaves nothing unattackable behind. | The residual bullet in `CoverageSnapshot.counts` is now "**A count-bearing mapping that is not homogeneous.**", and its body no longer restates the emptiness condition. The production condition is untouched. |
| H4 (compounding) | **Narrowed** | Moving the non-homogeneous case into `CountEnrollmentResidualTests` would have duplicated a test that already exists and drives it through publication; narrowing states where the binding is. | `CountEnrollmentResidualTests`'s class docstring no longer claims "every residual the docstring names is exercised here … so the list cannot be wrong in either direction". It now claims only that each count *shape* named as unreached is exercised there, and points at `PublicationGuardSeamTests` for the non-homogeneous mapping. The same over-claim in the production docstring's residual preamble was narrowed the same way. |
| H5 | **Deleted** | The counterfactual is a true fact wrongly attributed to a test that does not assert it. Making the test assert it would add a counterfactual assertion to buy back a clause nobody needs. | "and proves publication would pass if the refusal were removed" is deleted. The sentence now says only that the public-path test installs that descriptor, which is what it does. |
| H6 | **Claim kept, credit corrected** | The rename window is a real, deliberately recorded residual that predates this lane. What was wrong was the wave-6 audit entry calling it behaviourally bound. | No code change. `_require_inside_root` implies no test for the rename window, and `test_the_residual_is_recorded_rather_than_claimed_closed` already states in its own docstring that its fragment check is not the behavioural attack. Corrected in the wave-6 report append. Static search confirmed first-hand: `grep -c "\.rename(\|os\.replace("` over the test module returns `0`. |
| H7 | **Appended** | — | One dated section appended to `task-9-fix-wave-6-report.md`, existing text unaltered: the Method requirement was discharged by the orchestrator rather than the implementer; the G3 precedence claim is false; the rule-4 audit's twelfth entry credits a non-attack. |

## One clause of H2 was not written, because a probe falsified it

The brief's H2 asks the residual to state "that no publication path can produce
one". Under this module's own established meaning of *publication path* — the
one wave 6 used to call the `unexpected` arm reachable, namely a duck-typed
`as_payload` value installed on `classification_counts` and published
unconditionally by `snapshot_payload` — a cyclic payload **is** reachable:

```text
$ python probe2.py                       # duck-typed count whose measured_by is a self-referential list
snapshot_payload RecursionError
```

Writing "no publication path can produce one" would therefore have committed
this lane's defect shape for an eighth time, in the fix meant to stop it. The
residual states the two clauses that are verified true — the failure mode, and
that canonical serialisation fails the same way — and makes no reachability
claim at all, which is the narrowing this wave prefers. The orchestrator should
decide whether the brief's clause or this probe is authoritative; the probe is
reproducible from the transcript below.

Probe (run from the repo root, `packages/component-master/src` on the path):
install `property(lambda s: {"C": Cyclic()})` on
`CoverageSnapshot.classification_counts`, where `Cyclic.as_payload` returns the
five count keys with `measured_by` set to a list containing itself, then call
`snapshot_payload(build_snapshot(Path("data/component-master/registry/v1")))`.

## Mutations, each run by me, with observed output

Every mutation was applied to the working tree, the full suite was run, and the
file was restored from a byte-exact copy taken beforehand. Post-restore SHA-256
is quoted for each.

**Reference hashes of the final tree**

```text
bab76c15ee0e3d927e4c145821b62ea938d60a40b631fdfd29423396cefb8fa8  releases.py
4223e6227c62b161e5f5112ce9ad0ed1b1d9fdfd414b092cb873881975d579ce  coverage.py
41210b485d8d37d5917cd8d3f336c6c1dca9bbbd2d996c8f6c19d574ac1264ca  test_first_cohort_denominator.py
72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788  coverage-snapshot.json  (unchanged, matches HEAD)
```

### M1 — H3. Cap the post-count walk at two levels below a count

`walk` given a `below` budget set to 2 whenever a count is recognised, refusing
to descend once it reaches 0. Depth 1 still collects; deeper does not.

```text
FAILED tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardSeamTests::test_a_count_is_not_a_leaf_to_the_production_walk
FAILED tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardResidualTests::test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused
2 failed, 907 passed in 14.82s
```

The depth test fails at `depth=2`; the cyclic test fails on the `collector`
subTest because a depth cap also truncates a cycle. This is the mutation the
brief reported as `908 passed` at base — it is now red.
Restored: `bab76c15…` (identical).

### M2 — H2. Add cycle detection to the collector

An `id()` memo at the top of `walk`, returning early on a value already seen.

```text
E           AssertionError: RecursionError not raised
FAILED tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardResidualTests::test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused
1 failed, 908 passed in 12.39s
```

Only the `collector` subTest fails; `canonical_json_bytes` still exhausts the
stack, which is exactly why adding detection to the collector alone would buy
little.
Restored: `bab76c15…` (identical).

### M3 — H1. Delete the collector's duplicate-label arm

The `if label in collected: raise ValueError(...)` block removed, leaving the
assignment. Confirms the arm stays mutation-bound after the precedence claim was
deleted from its docstring.

```text
E       AssertionError: ValueError not raised
FAILED tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardSeamTests::test_the_collectors_own_duplicate_label_arm_refuses
1 failed, 908 passed in 13.06s
```

Restored: `bab76c15…` (identical).

### M4 — H4. Remove the emptiness half of the enrolment condition

`and value` deleted from `CoverageSnapshot.counts`. **No red, deliberately** —
this is the evidence that the deleted word closed nothing.

```text
909 passed in 12.56s
```

Restored: `4223e622…` (identical).

### M5 — H4. Neuter the homogeneity half of the enrolment condition

`all(isinstance(item, MeasuredCount) …)` replaced by `all(True …)`. Evidence
that the half of the residual which was **kept** in the bullet is genuinely
bound, and bound in both classes.

```text
E       AttributeError: 'PayloadOnlyCount' object has no attribute 'label'
FAILED …::CountEnrollmentResidualTests::test_every_named_count_shape_is_genuinely_still_unenrolled
FAILED …::PublicationGuardSeamTests::test_snapshot_payload_refuses_a_mapping_the_record_does_not_enrol
2 failed, 907 passed in 13.72s
```

Restored: `4223e622…` (identical).

## Tests that pass by construction

- `test_a_count_is_not_a_leaf_to_the_production_walk` rows at depths 2, 4 and 7
  exercise behaviour already present at `33782a92`; M1 is what makes them
  evidence rather than decoration. The `depth=1` row is the pre-existing case
  and is not credited with anything new.
- Both subTests of `test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused`
  pin behaviour already present at `33782a92`; M2 is their mutation.
- Every prose deletion (H1, H4, H5, and the two narrowed over-claims) changes no
  behaviour. The behaviours those sentences described are unchanged and are
  attacked by M3, M5 and the pre-existing seam tests. The one fragment
  assertion that named deleted text — `"defence-in-depth"` in
  `test_the_collector_docstring_records_what_it_does_not_close` — was replaced
  by `"contains itself"`, which guards the new residual bullet, so the fragment
  count of that secondary guard is unchanged.

## Considered and deliberately not done

- **`and value` was left in the production enrolment condition.** M4 proves it
  is inert, and deleting inert code would have been an unrequested behavioural
  change no mutation could witness. H4 asked for the bullet, not the branch.
- **`CoverageSnapshot.counts` still says "a descriptor returning a nonempty
  mapping"** in its enrolment description at the head of the docstring. That is
  a true description of the condition in the code and is outside H4's residual
  bullet; removing "nonempty" there would make the prose and the code disagree
  in the opposite direction. Flagged here so the next wave can rule on it rather
  than discover it.
- **No public-path test was added for the collector's duplicate arm (H1) or for
  the cyclic payload (H2).** Neither docstring now makes a reachability claim,
  so neither needs one; the probe under H2 is recorded in this report instead of
  being frozen into the suite.

## Regressions held

Full suite green; the committed snapshot is byte-unchanged and absent from
`git status --porcelain`, which lists only the three scoped code paths (the two
report paths are inside the gitignored `.superpowers/`). Republication is
byte-identical at `72ccc63f`, asserted by
`test_a_fresh_build_reproduces_the_committed_file_byte_for_byte`. Twelve brand
names, fourteen URLs, twenty-five count labels, the three guard arms, the
collector's duplicate arm, count-not-a-leaf, `denominator_label`, the bracket
matrix, pure-U+3000, `cached_property` enrolment and the 268-code-point
transcription are all still asserted by their existing tests and all green.
`git diff --check` reports no whitespace errors (only the repository's existing
LF/CRLF checkout warning). Line endings were preserved per file: `coverage.py`
and `releases.py` remain wholly CRLF, the test module wholly LF.
`tools/verify_kitchen_kernel.py` was not run, per the brief.

## Full-suite output

```text
$ python -m pytest tests/ -q
........................................................................ [ 95%]
.............................................                            [100%]
909 passed in 12.63s
```

Base was 908. The one added test is
`PublicationGuardResidualTests::test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused`;
the H3 depth rows are subTests inside an existing test and add no count.

## Terminal state

DONE_WITH_CONCERNS. Every finding is closed, five of them by deleting or
narrowing the claim rather than by writing more prose to defend it, and every
behavioural change is mutation-checked with observed red and a byte-identical
restore. The single concern is H2: the brief required the new residual to state
that no publication path can produce a cyclic payload, and my own probe shows
that one can, by exactly the duck-typed descriptor mechanism this module
already documents as a publication path for the `unexpected` arm. Rather than
write a sentence I had just falsified — the precise failure this wave exists to
stop — I wrote the residual without any reachability clause and recorded the
probe here for the orchestrator to adjudicate. If the orchestrator holds that a
monkeypatched descriptor is not a publication path, the clause can be added in
one line; if it holds the probe, the residual as written is already correct and
this report is DONE.

## Correction appended 2026-08-01 (fix wave 8, finding J5)

Appended by the wave-8 implementer. Nothing above this line was altered.

**1. This report repeats the J1 overclaim.** Line 18, the H2 row of the
per-finding table, records the new residual as stating "that a payload
containing itself exhausts the stack instead of being refused, that
`canonical_json_bytes` fails identically". That is a universal, and a named
shape falsifies it. A *count-shaped* mapping that contains itself is **not**
walked to `RecursionError` by the collector: the second visit finds its label
already collected and the duplicate-label arm refuses it by name, naming the
field and the reason, while `canonical_json_bytes` does still exhaust the
stack on that same payload. Verified on the live tree:

```
A  list in measured_by            collector RecursionError   canonical RecursionError
B  self-referential count-shaped  collector ValueError        canonical RecursionError
   mapping
C  self-referential plain mapping collector RecursionError   canonical RecursionError
```

The wave-7 *commit message* separated the two shapes correctly; the durable
docstring and this row did not. Wave 8 narrows both the docstring and the test,
and binds shape B as a subTest beside shape A. The refusal is an accident of
the duplicate-label arm, not cycle handling, and wave 8 says so in the bullet.

**2. Codex's H3 gap claim was falsified.** Codex reported that the H3 depth
loop leaves a gap — that a walk skipping tuple-valued immediate children of a
recognised count, or walking only `measured_by` after recognition, would
survive the suite. Codex could not run Python and reasoned statically. The
orchestrator ran both mutants:

```
post-count walk restricted to measured_by     -> 70 failed, 839 passed
tuple-valued immediate children skipped       ->  1 failed, 908 passed
```

Both are caught. The gap does not exist, and no fix was made for it. Wave 8
adds depth 3 to that loop anyway — it puts a `tuple` directly below a
recognised count — justified by the container-set claim the loop already
attacks, not by this falsified finding.
