# Task 9 fix wave 6 — brief

Base commit: `15425a7d`. Read this whole file before writing any code.

## Why this wave exists, and the rule it adds

Two independent reviews of `15425a7d` both returned **NEEDS_FIXES**, and the
orchestrator reproduced every finding below first-hand before writing it down.
Wave 5 was convened because wave 4's fix committed the lane's defect shape a
fifth time. **Wave 5 committed it a sixth time, in the test written to prevent
it.**

The sixth instance is `test_the_guard_docstring_states_which_arms_a_publication_can_exhibit`
(test file :2477). Its entire body asserts that six substrings appear in a
docstring. A reviewer rewrote that docstring to say the **opposite** of what
wave 5 claims, kept all six substrings, and the scoped module stayed green at
172/172. The inverted text was, per G1 below, the **true** one.

So this wave adds the rule that should have existed since wave 3:

> **4. A test whose only assertion is that a docstring contains a substring
> may never be the test a prose claim is credited to.** Prose that states
> behaviour must be bound by a test that makes production code do — or refuse
> — something, and that test must fail when the behaviour is removed. Fragment
> assertions are allowed only as a secondary guard against a docstring being
> deleted wholesale, never as the attack.

Rules 1–3 from waves 3–5 stand unchanged.

Apply rule 4 to **every** fragment-only test in this module, not just the one
named above. Find them (`grep` for `assertIn` over a `__doc__`), and for each:
either bind the claim to a behavioural test, or delete the claim from the
prose. A claim no test can attack must not survive this wave.

## Scope

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_first_cohort_denominator.py
.superpowers/sdd/task-9-fix-wave-6-report.md
.superpowers/sdd/task-9-fix-wave-5-report.md   (append-only, see G3 and the
                                                Output contract)
```

`data/component-master/registry/v1/coverage-snapshot.json` byte-unchanged.
A sixth path means stop and report.

## G1 (Critical — Claude found it, Codex reached the same conclusion by a
different route, orchestrator reproduced) — "unreachable by construction" is
false

`releases.py:219-224` claims `unexpected` and `changed` are unreachable
through `snapshot_payload` **by construction**, "because that builder's count
objects and the record's enumeration read the same properties through the same
``as_payload``." Echoed at `releases.py:296-298`. That mechanism is wrong.

`snapshot_payload` publishes `classification_counts` and
`dimension_verified_counts` **unconditionally** (releases.py:361-379).
`CoverageSnapshot.counts` enrols such a mapping **conditionally** — only when
it is nonempty *and* `all(isinstance(item, MeasuredCount) …)`
(coverage.py:2086-2092). One value that is not a `MeasuredCount` drops the
whole mapping from the record while the builder still publishes every entry.

Orchestrator's reproduction, using a duck-typed object that has `as_payload`
but is not a `MeasuredCount` — a different construction from the reviewer's,
reaching the same arm:

```
record enrols any classification.* : False
snapshot_payload -> ValueError: ... published counts absent from the record:
    classification.DISCONTINUED, classification.OUT_OF_SCOPE_WITH_...
```

Codex independently traced the `changed` arm to the same asymmetry by a
stateful descriptor read twice (releases.py:361 during build, coverage.py:2083
during enrolment) returning different five-field values.

**Required.**

- Correct the claim. State what is actually true: which divergences a
  publication can exhibit and by what mechanism — the enrolment condition on
  the record side against the unconditional publication on the builder side.
- Take the attack the wave-5 premise talked you out of: drive **at least one**
  arm to refusal through `snapshot_payload` itself, not at the seam. The
  descriptor-installation technique is already the lane's accepted public-path
  attack (`CountEnrollmentDerivationTests.add_count_property`, test :2094).
- Keep the seam tests. They bind the arms; they were never the problem.

## G2 (Critical — both reviewers, orchestrator confirmed by inspection) — the prose guard cannot falsify the prose

Covered by rule 4 above. `test_the_guard_docstring_states_which_arms_a_publication_can_exhibit`
must be replaced by a test that fails when the behaviour it describes changes.
If a claim genuinely cannot be bound to behaviour, the claim comes out of the
docstring.

## G3 (Important — Claude found it, orchestrator mutation-confirmed) — the collector's own duplicate-label arm is unattacked

`_published_count_payloads` refuses two payload counts sharing a label
(releases.py:185-188). Orchestrator deleted that arm outright and ran the full
suite: **904 passed**, zero failures. All three existing duplicate-label tests
drive the **record-side** refusal in `CoverageSnapshot.counts`, which runs
first (`record` is built before `published`, releases.py:251-252), so the
collector arm is unreachable through publication as well.

This is the identical shape F2 was convened for, on the identical function,
missed. The wave-5 report's line 15 asserts this arm "is already
publication-path tested by wave 4" — that is false, and the report needs a
correction section saying so.

**Required.** Attack it at the seam (a payload holding two counts under one
label, handed to the collector), mutation-check it, and state in the docstring
that this arm is defence-in-depth for the same reason — the record-side
refusal fires first through every publication path.

## G4 (Important — Codex found it, orchestrator reproduced) — an exact-five-key count is a leaf, so counts nested inside one are invisible

The collector returns immediately once it recognises an exact five-key count
(releases.py:180), so it never walks that count's own values. `canonical_value`
recurses into mappings and sequences without that stop, so the shape is
publishable. Orchestrator's reproduction — a nested count placed inside the
`measured_by` list of an outer count, outer still exactly five keys:

```
outer key count: 5 ['count','denominator','denominator_label','label','measured_by']
collector saw: ['outer_visible']          inner_invisible: not collected
canonical JSON accepts the nested shape: True
```

The new residual section does not name this. It is the same class as F1, which
this wave's predecessor closed one level shallower.

**Required.** Either keep walking a recognised count's values after collecting
it, or name the leaf boundary in the residual section with a test asserting it
is genuinely still open. State which, and why the boundary is where it is
rather than one level further — "adding one more level would only move the
boundary" is an argument this module has already used and may reuse, but it
must be *made*, not implied.

## G5 (Important — Codex found it, orchestrator mutation-confirmed) — "all five fields" has an untested field

The comparison claims all five fields (releases.py:209); the changed-arm tests
doctor only `count`, `denominator` and `measured_by` (test :2443). Orchestrator
narrowed the production comparator to ignore `denominator_label` and ran the
full suite: **904 passed**.

**Required.** Add the `denominator_label` subcase and mutation-check it. While
you are there, check the remaining field — `label` itself is the comparison
key, so say in the docstring that four of the five are compared as values and
the fifth is the key, if that is what is true.

## G6 (Important — Claude) — the residual list is incomplete on the axis that makes G1 possible

Neither guard function, nor `CoverageSnapshot.counts`'s own residual list
(coverage.py:2054-2061), names the enrolment asymmetry: `counts` enrols a
count-bearing mapping only when it is nonempty and homogeneous, while the
builder publishes it unconditionally. That asymmetry is the mechanism of G1.
Name it where a reader meets it, with a test.

## G7 (Minor — Codex, orchestrator accepts the reasoning) — the bracket prose still overstates

"nothing after that colon is parsed" (coverage.py:600 and :695) is false in the
public validator: percent escapes are parsed first (coverage.py:632), so
`https://[::1]:%zz/x` is refused by the percent grammar. Narrow to: no port
grammar or range is parsed; the general character and percent-escape rules
still apply.

## G8 (Minor — Claude) — three small ones

- `test_the_comparison_is_green_without_the_doctoring` (test :2466) asserts
  only `assertIsNone(...)`, which any function stubbed to return `None`
  passes. Make it a real control or drop it.
- `https://a[::1]:8443/x` is admitted: the bracket branch requires
  `authority.startswith("[")`, so the `else` partition yields host `a[`. Same
  reviewer/fetcher divergence class the bracket rule exists to refuse. Decide
  and state: refuse, or name as a residual with a test.
- `payload_count_labels` (test :1176) coerces `str(node["label"])` while the
  guard requires a real `str` (releases.py:182) — a third silent divergence
  between attacker and guard, on top of the documented superset/exact one.
  Align or state it beside the other two.

## Method requirements

Every behavioural fix in this wave must be **mutation-checked by you**: remove
or neuter the behaviour, run the suite, observe the failure, restore, and
record the mutation and the observed output in the report. A fix whose
mutation leaves the suite green is not done. The orchestrator will re-run a
sample of your mutations independently and will treat a green mutant as a
failed wave.

## Regressions that must hold

Everything waves 4 and 5 established: the committed snapshot byte-unchanged
and republishing byte-identical at `72ccc63f`; `coverage_statement`
byte-identical to `b50b0c96`; twelve brand names and fourteen URLs unchanged;
duplicate label refused at `snapshot_payload` and both release builders;
`cached_property` enrolled; `[::1]evil.invalid` refused while `[]`,
`[2001:db8::1`, `[::1]:8443/x`, `[::1]:/x` and `[::1]:8080extra/x` stay
admitted; the six port spellings admitted; pure-U+3000 refused as blank; the
268-code-point transcription untouched. Suite green (904 at base, more after
this wave); `git status --porcelain` empty at the end.

## Output contract

Do not commit; the orchestrator verifies and commits. Write
`.superpowers/sdd/task-9-fix-wave-6-report.md`: per-finding disposition G1–G8,
every mutation with its observed output, the full list of fragment-only tests
you found under rule 4 and what you did with each, the pass-by-construction
list, and full-suite output. Append a dated correction to
`task-9-fix-wave-5-report.md` for the false line 15 (G3) without altering its
existing text. End with DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT or BLOCKED and
one paragraph.

## Out of scope

Ledger closeout, the `.gitignore` `.superpowers/` decision, the Task 1 baseline
manifest, the `items.json` silent skip, `evidence.py`, fetching/ingesting/
rights review, the owner runtime lane. No production or manufacturing
readiness claim. Twelve brands is a first cohort, not the connector market.
NOT-FOR-PRODUCTION stays intact.
