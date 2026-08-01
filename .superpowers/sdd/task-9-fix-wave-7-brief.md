# Task 9 fix wave 7 — brief

Base commit: `33782a92`. Read this whole file before writing any code.

## Read this part twice: prefer deletion to elaboration

Seven waves in, the pattern is unmistakable. Every wave closes real defects,
every regression holds, and **every wave's new prose becomes the next wave's
findings.** Wave 6 added rule 4 to stop claims that no test can attack — and
the same wave wrote a false claim (H1 below) in the fix that rule 4 governed.

The behaviour in this module is in good shape: every functional mutant the
orchestrator has run is now caught. What keeps failing review is **prose that
promises more than the code delivers**.

So this wave inverts the default. For each finding below, two fixes are
offered, and **deleting or narrowing the claim is the preferred one** unless
binding it buys a reader something real. Do not write a new sentence to
explain a sentence. A rule that says less and is exactly true beats a rule
that says more and needs three tests to stay honest.

If you find yourself adding prose to justify prose, stop and delete instead.

Rules 1–4 from waves 3–6 still bind.

## Scope

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_first_cohort_denominator.py
.superpowers/sdd/task-9-fix-wave-7-report.md
.superpowers/sdd/task-9-fix-wave-6-report.md   (append-only correction, see H7)
```

`data/component-master/registry/v1/coverage-snapshot.json` byte-unchanged.
A sixth path means stop and report.

## H1 (Critical — both reviewers independently, orchestrator reproduced) — G3's new prose is false, and it is falsified by G1's own mechanism

`releases.py:158-163` says the collector's duplicate-label arm is
*"defence-in-depth at this seam: every publication path builds the record
enumeration first, whose own duplicate-label refusal fires before this
collector can run."* Echoed in the test docstring at test file :2442 and in
the wave-5 report's appended correction.

False. The record-side refusal fires only when the **record** holds a
duplicate. A non-homogeneous count mapping — the exact shape wave 6 wrote for
G1 — is published unconditionally and enrolled not at all, so the payload can
carry two counts under one label while the record carries none. Orchestrator's
reproduction against the live tree:

```
record contains LABEL?  False
snapshot_payload -> ValueError: the payload publishes two counts with the
    same label: duplicate_through_the_public_builder
raised from releases.py line 199 in walk      <- the collector, not the record
```

The only test attached to that claim hands a payload straight to the
collector, so it can never fail when the reachability claim is wrong.

**Required — preferred fix: delete the precedence claim.** Say the arm
refuses two payload counts under one label, and stop. If you keep any
reachability statement, it must say the arm **is** publication-reachable by
the enrolment asymmetry G1 names, and a public-path test must drive it.

## H2 (Important — Codex found it; Claude checked a different shape and
concluded the opposite; orchestrator adjudicated) — a cycle reaches
`RecursionError` instead of a refusal

The two reviewers disagreed, and both were right about the shape they tried:

```
self-referential count mapping   -> ValueError (duplicate label)   [Claude]
self-referential list in measured_by -> RecursionError             [Codex]
```

Orchestrator confirmed both, and established the part neither reported:
`canonical_json_bytes` **also** raises `RecursionError` on the cyclic shape,
so a cycle is unpublishable through the canonical path either way. The defect
is therefore the **failure mode**, not a bypass: this module refuses a cyclic
payload by exhausting the stack rather than by saying what is wrong. That
matters here because every other refusal in this module names the field and
the reason.

**Required — preferred fix: name it as a residual**, stating that a cyclic
payload raises `RecursionError` from the walk rather than a refusal, that
canonical serialisation cannot render such a payload either, and that no
publication path can produce one. A test asserting `RecursionError` pins the
current behaviour honestly. Adding cycle detection is acceptable but buys
little — say why if you choose it.

Also correct the collector's residual list, which names no cycle at all.

## H3 (Important — Claude, orchestrator mutation-confirmed) — the traversal boundary is stated as a class and tested at one level

`releases.py:145-150` claims *"the traversal boundary is the canonical
container set, not one arbitrary level below a count."* Orchestrator kept the
post-count walk but capped it at two levels below a count:

```
depth-limited post-count walk -> 908 passed
```

`test_a_count_is_not_a_leaf_to_the_production_walk` nests exactly one level,
so it binds "not zero levels" and nothing more. This is rule 1: a class claim
with an instance test. (HEAD does handle `measured_by=[[inner]]` correctly —
orchestrator verified both labels collected — it is simply untested.)

**Required — preferred fix: bind it**, since the behaviour is genuinely
class-wide and cheap to test: a parametrised depth loop (say 1, 2 and 4
levels, through mixed mapping/list/tuple containers) that fails under a depth
cap. Narrowing the prose to "one level" would understate true behaviour, which
is the opposite error and equally forbidden.

## H4 (Important — Claude, orchestrator mutation-confirmed) — half a residual is unbound and behaviourally inert

`coverage.py:2069-2070` names the residual *"a count-bearing mapping that is
empty or not homogeneous"*. The non-homogeneous half is genuinely bound by the
duck-typed public-path test. The empty half is bound by nothing:

```
removed `and value` from the enrolment condition -> 908 passed
```

and it is inert by construction — `all()` over an empty mapping is `True`, and
an empty mapping contributes no counts either way.

Compounding: `CountEnrollmentResidualTests`'s class docstring (test :2239-2241)
claims *"every residual the docstring names is exercised here and asserted
still open, so the list cannot be wrong in either direction."* That is now
false — neither half of this residual is among its four cases.

**Required — preferred fix: drop "empty" from the bullet** (it closes
nothing and can be attacked by nothing), and either move the non-homogeneous
case into that class or narrow the class docstring to what it actually covers.

## H5 (Minor — Claude) — prose credits a test with a counterfactual it does not assert

`coverage.py:2075-2077` says the public-path test *"proves publication would
pass if the refusal were removed."* The named test asserts only that
`snapshot_payload` raises; it contains no counterfactual. The underlying fact
is true — the reviewer confirmed publication passes with `unexpected` deleted
— so this is a misattribution, not a false fact. Delete the clause or make the
test assert it.

## H6 (Minor — Codex) — the rule-4 audit's twelfth entry credits a non-attack

`_require_inside_root` (coverage.py:2251) states that a directory-component
rename between resolve and open remains exploitable. The wave-6 report credits
resolved-path redirects and a junction test with binding it; neither attacks
the rename window, and a static search finds no `.rename(` or `os.replace(`
anywhere in the test module.

**Required — preferred fix: leave the claim and fix the credit.** The rename
window is a genuine, deliberately-recorded residual (it predates this lane's
waves); what is wrong is the audit entry saying it is behaviourally bound.
Correct the entry in the wave-6 report's appended correction, and if the
docstring implies a test exists, remove that implication.

## H7 — corrections to append

Append one dated correction section to `task-9-fix-wave-6-report.md`, not
altering existing text, recording:

- The wave-6 report ended **BLOCKED** with zero observed mutation output
  because the implementer's sandbox could not launch Python. The commit
  `33782a92` exists because the **orchestrator** ran the full mutation battery
  independently — delete `unexpected`, delete `changed`, delete the collector
  duplicate arm, narrow the walk to tuples-only, restore the count-as-leaf
  return, blind the comparator to `denominator_label`, delete the
  bracket-suffix refusal, invert the guard docstring — each observed red, each
  restored, both files verified byte-identical afterward. Record that the
  Method requirement was discharged by the orchestrator rather than by the
  implementer, because a reader of that report alone would conclude the
  evidence does not exist.
- The G3 precedence claim in that report is false (H1), and the rule-4 audit's
  twelfth entry credits a non-attack (H6).

## Method requirements

Every behavioural change mutation-checked by you, with the mutation and its
observed red recorded. If your sandbox cannot launch Python, say so plainly
and report BLOCKED with the code in place rather than predicting output — that
is what wave 6's implementer did, and it was the right call.

## Regressions that must hold

Everything waves 4–6 established, and specifically: suite green (908 at base);
committed snapshot byte-unchanged, republishing byte-identical at `72ccc63f`;
`coverage_statement` byte-identical to `b50b0c96`; twelve brand names, fourteen
URLs, twenty-five count labels; all three guard arms publication-reachable and
mutation-bound; the collector's duplicate arm mutation-bound; count-not-a-leaf;
`denominator_label` compared; `[::1]evil.invalid` and `[::1]:%zz/x` refused
while `[]`, `[2001:db8::1`, `[::1]:8443/x`, `[::1]:/x`, `[::1]:8080extra/x`
and `a[::1]:8443/x` stay admitted; pure-U+3000 refused as blank;
`cached_property` enrolled; the 268-code-point transcription untouched.
`git status --porcelain` empty at the end.

## Output contract

Do not commit; the orchestrator verifies and commits. Write
`.superpowers/sdd/task-9-fix-wave-7-report.md`: per-finding disposition H1–H7,
**and for each, whether you deleted the claim or bound it, with the reason**;
every mutation with observed output; the pass-by-construction list; full-suite
output. End with DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT or BLOCKED and one
paragraph.

## Out of scope

Ledger closeout, the `.gitignore` `.superpowers/` decision, the Task 1 baseline
manifest, the `items.json` silent skip, `evidence.py`, fetching/ingesting/
rights review, the owner runtime lane. No production or manufacturing
readiness claim. Twelve brands is a first cohort, not the connector market.
NOT-FOR-PRODUCTION stays intact.
