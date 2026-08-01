# Task 9 fix wave 8 — brief

Base commit: `8ad41b28`. This is a **prose-only closing wave**. No production
behaviour changes. Read the whole file first.

## What this wave is, and what it is not

Two independent reviews of `8ad41b28` returned NEEDS_FIXES with **no Critical
findings**, and both said the same thing: the wave's substance is sound —
five deletions each justified, nothing true lost, H3's depth binding genuine
and independently broken to prove it, every regression intact — and **one new
sentence overgeneralises**. Everything below is a narrowing of prose the last
wave wrote, plus one test row.

If you find yourself changing production behaviour, stop and report: you have
misread the brief.

**One reviewer finding was falsified by the orchestrator and is NOT in this
brief.** Codex reported that H3's depth loop leaves a gap — that a walk
skipping tuple-valued immediate children of a recognised count, or walking
only `measured_by` after recognition, would survive the suite. Codex could not
run Python and reasoned statically. The orchestrator ran both mutants:

```
post-count walk restricted to measured_by     -> 70 failed, 839 passed
tuple-valued immediate children skipped       ->  1 failed, 908 passed
```

Both are caught. Do not "fix" that gap; it does not exist. Two small true
pieces of that finding are carried below as J4.

## Scope

```
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_first_cohort_denominator.py
packages/component-master/src/monolith_component_master/coverage.py
.superpowers/sdd/task-9-fix-wave-8-report.md
.superpowers/sdd/task-9-fix-wave-7-report.md   (append-only correction, J5)
```

`data/component-master/registry/v1/coverage-snapshot.json` byte-unchanged.
A sixth path means stop and report.

## J1 (Important — both reviewers, orchestrator reproduced) — the cyclic residual states a universal that a named shape falsifies

`releases.py:177-183` says *"A payload that contains itself is not refused; it
exhausts the stack … while every refusal in this module does both. Nothing
here detects the cycle. `canonical_json_bytes` fails the same way on the same
payload."* The attached test (test :2678) exercises one shape, and its own
docstring repeats the universal at :2683.

Orchestrator's matrix over the live tree:

```
A  list in measured_by             collector -> RecursionError   canonical -> RecursionError
B  self-referential count-shaped   collector -> ValueError       canonical -> RecursionError
   mapping                                      (names field and reason)
C  self-referential plain mapping  collector -> RecursionError   canonical -> RecursionError
```

Shape B **is** a payload that contains itself, **is** refused, the refusal
**does** name the field and the reason, the walk does **not** reach
`RecursionError`, and `canonical_json_bytes` does **not** fail the same way.
The duplicate-label arm is an accidental cycle brake for count-shaped
self-reference, and the current wording denies it exists.

Note the wave-7 **commit message got this right** — it separates the two
shapes explicitly. The durable docstring did not. That asymmetry is itself
worth avoiding: a reader reads the docstring, not the commit log.

**Required.** Narrow the bullet to what is true: a cycle through a container
this walk descends into and does **not** recognise as a count exhausts the
stack; a count-shaped mapping that contains itself is refused by the
duplicate-label arm instead, which is an accident of that arm rather than
cycle handling. Add shape B as a `subTest` beside shape A so the distinction
is bound, and narrow the test docstring to match. Shape C is optional; if you
add it, say so.

## J2 (Important — Codex; Claude found the same defect one line away) — the collector residual preamble misattributes its own coverage

`releases.py:164` says every listed residual is behaviourally exercised by
`PublicationGuardResidualTests`. The record/payload enrolment asymmetry
(releases.py:184-189) is actually exercised by `PublicationGuardSeamTests`
(test :2473); the residual class holds only a prose-fragment assertion for it
(test :2727).

Wave 7 already narrowed exactly this shape on the test side. Narrow the
production preamble the same way, naming the exception where it lives.

## J3 (Minor — Claude) — `coverage.py`'s narrowed preamble dropped the exception marker

`coverage.py:2061-2065` says *"Each unreached shape is exercised by
`CountEnrollmentResidualTests`; the non-homogeneous mapping is driven through
publication by `PublicationGuardSeamTests`."* That class's four cases are
tuple, mapping-of-mappings, plain attribute and dataclass field — the
non-homogeneous mapping is not among them, so the first clause is false for
one of its own bullets. The test-side rewrite (test :2239-2242) says it
correctly with an explicit exception marker; the production copy dropped it.
One word fixes it.

## J4 (Minor — Claude's third finding and the true half of Codex's H3 note)

- `releases.py:180`'s clause *"while every refusal in this module does both"*
  is a claim over all eighteen `raise` sites in the module. A reviewer checked
  every message by hand and it is **true**, but no test attacks it, and rule 1
  has no truth exemption. **Delete the clause** — the sentence works without
  it, and this wave's principle is to prefer deletion.
- Test :2433's *"past any plausible cap"* is unsupported: a cap above seven is
  plainly plausible. **Delete the phrase.** The depth loop's value is that it
  fails under a cap, not that it exceeds every conceivable one. Adding depth 3
  to the loop is optional and welcome — it puts a tuple directly below a
  recognised count — but do **not** justify it by the gap the orchestrator
  falsified above.

## J5 — corrections to append

Append one dated section to `task-9-fix-wave-7-report.md`, not altering
existing text, recording that the report repeats the J1 overclaim (its line
18), and that Codex's H3 gap claim was falsified by the orchestrator with the
two mutant runs quoted at the top of this brief.

## Method requirements

This wave changes no production behaviour, so there is nothing new to
mutation-check. Instead:

- After your changes, re-run the orchestrator's battery to prove nothing
  regressed: delete the collector duplicate arm; narrow the walk to
  tuples-only; delete the `unexpected` arm; delete the `changed` arm; restore
  the count-as-leaf `return`; delete the bracket-suffix refusal; depth-cap the
  post-count walk. **Every one must turn the suite red.** Record each.
- Verify both source files byte-identical after each restore.
- If your sandbox cannot launch Python, say so plainly and report BLOCKED with
  the code in place rather than predicting output.

## Regressions that must hold

Suite green (909 at base; 910+ after J1's subTest, or 909 if it lands as a
subTest inside the existing test); committed snapshot byte-unchanged and
republishing byte-identical at `72ccc63f`; `coverage_statement` byte-identical
to `b50b0c96`; twelve brand names, fourteen URLs; every behaviour waves 4–7
established. `git status --porcelain` empty at the end.

## Output contract

Do not commit; the orchestrator verifies and commits. Write
`.superpowers/sdd/task-9-fix-wave-8-report.md`: per-finding disposition J1–J5,
the full re-run battery with observed output, and full-suite output. End with
DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT or BLOCKED and one paragraph.

## Out of scope

Any production behaviour change. Ledger closeout, the `.gitignore`
`.superpowers/` decision, the Task 1 baseline manifest, the `items.json`
silent skip, `evidence.py`, fetching/ingesting/rights review, the owner
runtime lane. No production or manufacturing readiness claim. Twelve brands is
a first cohort, not the connector market. NOT-FOR-PRODUCTION stays intact.
