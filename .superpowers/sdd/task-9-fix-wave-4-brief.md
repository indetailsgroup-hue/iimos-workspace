# Task 9 fix wave 4 — brief

Read this twice before you write any code. Base commit: `79e76062`.

## Why this wave exists

Two independent reviews of `79e76062` — one by Claude, one by Codex — both
returned **NEEDS_FIXES**, and **each found defects the other missed**. Claude
found W1 and W3; Codex found W4 and W6; W2 and W5 were found by both
independently. Every finding below was reproduced first-hand by its reviewer
before it was written down.

The lane's recurring defect shape is now on its fourth instance:

> **a test written *from* a docstring sees the behaviour it was told to
> expect, and never attacks the claim.**

W1 is that shape exactly. The rules wave 3 introduced still bind:

1. **A docstring may state a class only if a test attacks the class.** If you
   can only test instances, write instance-scoped prose.
2. **Every rule gets a `what this does not close` section in the docstring**,
   and every named residual gets a test asserting it is genuinely still
   admitted — and nothing unnamed hides beside it.
3. A sentence you cannot attack is a sentence you must not write.

## Scope

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_first_cohort_denominator.py
tests/component_master/registry/test_release.py
.superpowers/sdd/task-9-fix-wave-4-report.md
```

`evidence.py` and both data files stay untouched. The committed
`data/component-master/registry/v1/coverage-snapshot.json` must remain
byte-unchanged; if any fix would change its bytes, stop and report instead.
A sixth code path means stop and report.

## W1 (severest) — the duplicate-label refusal is not on any publication path

`coverage.py:1997` claims two counts sharing a label are *"**refused** rather
than published."* Measured at `79e76062`:

```
CoverageSnapshot.dup = property(lambda s: mk("first_cohort_brands_with_a_source_read"))
  snapshot.counts      -> ValueError
  build_release(...)   -> SUCCEEDS, payload_sha256 72ccc63f...
  snapshot_payload(...)-> SUCCEEDS, 8930 bytes
```

`grep -rn "\.counts" packages/ tools/` outside the two count mappings returns
only docstrings and a comment. **No production path reads `counts`.**
`snapshot_payload` builds from its own hand-written field list, so a record
carrying a duplicate label is published, released and digested with no refusal
anywhere. The refusal lives only inside a property nothing calls.

The existing test `test_no_two_counts_share_a_label` reads `counts` directly —
it was written from the sentence, so it sees the refusal it was told to
expect, and never asks whether **publication** is refused.

**Required.** Put the refusal on the publication path. `snapshot_payload` (and
therefore `build_release`) must evaluate the derived enumeration and refuse a
snapshot whose counts duplicate a label — and while you are there, make the
module docstring's *"count-by-count comparison of the record against the
payload"* true at publication: the labels the payload publishes and the labels
the derived enumeration collects must be compared, not coexist. Constraints:

- Publishing the committed valid snapshot must still produce a payload
  **byte-identical** to today's: same bytes, `payload_sha256` beginning
  `72ccc63f`. The fix is a guard, not a reformat.
- The new test must attack **publication**: inject the duplicate-label
  property, call `snapshot_payload` and `build_release`, assert both refuse.
  A test that only reads `counts` repeats the defect this wave closes.
- Rewrite or extend `test_no_two_counts_share_a_label` accordingly; keep the
  direct `counts` assertion as corroboration if you wish, clearly secondary.

## W2 (both reviewers) — `CountEnrollmentResidualTests` does not exercise each named residual

`coverage.py:2001` says *"Each is exercised by
`CountEnrollmentResidualTests`."* Measured coverage of the named residuals:

| Named residual | Tested at `79e76062`? |
| --- | --- |
| property returning a `tuple` of counts | yes |
| **"or a mapping of mappings"** | **no** |
| plain class attribute | yes |
| **"or a dataclass field"** | **no** |
| "an enrolment check, not an arithmetic one" | **no** |

The behaviour claims are all true — every one of those shapes is genuinely not
enrolled. What is false is the **coverage** claim, in the one sentence wave 3
made binding. `STILL_OPEN_URL_CASES` (9/9) and `STILL_OPEN_BRAND_NAME_CASES`
(4/4) both comply exactly; `counts` is the one rule written to the pattern's
shape without its table.

**Required.** Make the sentence true: add residual tests for the mapping of
mappings, the dataclass field, and the enrolment-not-arithmetic limit. The
arithmetic one is testable: a count published under its correct label with a
**wrong value** must pass enrolment untouched — demonstrate that, so the
sentence "it does not check that a count is right" is attacked, not trusted.
Follow the existing table-driven shape so the list cannot rot in either
direction.

## W3 (Claude) — `functools.cached_property` is silently not enrolled and no residual names it

The walk is `isinstance(attribute, property)`. `CoverageSnapshot` is a frozen
dataclass without `slots`, so `cached_property` works on it and is the
idiomatic way to memoise a derived count. Measured: a `cached_property`
returning a `MeasuredCount` is **not** enrolled — `cached_property enrolled:
False`, value reachable via `getattr`. The named residuals are "plain class
attribute" and "dataclass field"; a `cached_property` is neither, so the
residual list itself has a hole.

**Required.** Decide and state which, with the reason, in the docstring:

- Extend the walk to enrol `functools.cached_property` (it is a descriptor
  with `func`; the value is reachable the same way), with a test proving a
  `cached_property` count is enrolled; **or**
- Name it as a fourth residual bullet with a test asserting it is genuinely
  not enrolled.

Either is acceptable. Silence is not.

## W4 (Codex) — `[::1]evil.invalid` is a real consumer divergence — refuse it

The bracketed-host branch (`coverage.py:721`) takes everything up to `]` as
the host and never validates what follows. Measured:

```
this module:  ADMIT host="[::1]"          https://[::1]evil.invalid/x
.NET System.Uri: host [::1], port 443     https://[::1]evil.invalid/x
```

A reviewer reading the line sees `evil.invalid`; a fetcher goes to `::1`.
That is precisely the reviewer/fetcher disagreement the docstring uses to
justify refusing userinfo, so the same argument applies with the same force.

**Required. Refuse it** — after a closing `]`, the remainder of the authority
must be empty or begin with `:`; anything else is refused with a message in
this module's voice (name the field, quote what stands after the bracket, say
which reader diverges from which fetcher). Do not merely document it.
Regression surface: `https://[]/x` and `https://[2001:db8::1/x` are **named
residuals and must stay admitted** — `[]` has an empty remainder and an
unclosed bracket never reaches the new check.

## W5 (both reviewers) — the port is never parsed, and no residual says so

```
[ADMIT] https://host:abc/x     [ADMIT] https://host:-1/x
[ADMIT] https://host:99999999999/x   [ADMIT] https://a:b:c/x   [ADMIT] https://]/x
```

RFC 3986 §3.2.3 is `port = *DIGIT`. Both existing residual bullets are
host-scoped, and neither function claims to check the port — but the section
is titled *what this rule does not close*, and this is something it does not
close that it does not say.

**Required.** Decide and state which, with the reason, in the docstring:

- Refuse a non-`*DIGIT` port per RFC 3986 §3.2.3 (empty port `https://:/x`…
  note `https://:/x` is already refused by the host rule; `https://host:/x`
  has an empty port, which **is** valid `*DIGIT` — zero digits — decide and
  say so), with tests for each shape above; **or**
- Add a port residual bullet to the docstring with a table-driven test
  asserting each shape above is genuinely still admitted.

`https://]/x` belongs to the host well-formedness residual either way — say
where you filed it. Either choice is acceptable. Silence is not.

## W6 (Codex) — "every other `Zs` is refused **by name**" is false for an all-`Zs` name

`_require_brand_name` calls `_require_string` first, whose unrestricted
`text.strip()` removes U+3000 too, so a name of only U+3000 raises the generic
`brand_name must not be blank` — refused, but not *by name*, and the reader
who trusts the sentence expects the named refusal. The existing test attacks
U+3000 only when appended to visible text.

**Required.** Decide and state which, with the reason, in the docstring:

- Reorder so the by-name `Zs` refusal runs before the blank check, making the
  sentence true; **or**
- Narrow the sentence: an all-whitespace name is refused as blank before any
  by-name check runs.

Either way, add a test that attacks a name made **only** of a non-U+0020 `Zs`
(U+3000 at minimum) and asserts the actual message matches what the docstring
now says. The twelve committed names must stay admitted byte-unchanged.

## W7 (Claude, minor) — "two independent transcriptions … compared" is unverifiable

`test_first_cohort_denominator.py:2937` and `:3045` claim independence of
authorship. Two structurally identical ten-tuples, same order, same commit,
same author — independence leaves no trace in the tree, so the word claims
what no reader can check. The comparison itself is real and stays.

**Required.** Narrow the prose: drop or replace "independent(ly)" with what a
reader can verify — a second transcription written in the test module rather
than imported from `coverage.py`, compared entry by entry. Disclose that both
were transcribed in one sitting by one author, which is the fact.

## Required tests, RED observed first-hand

1. **W1**: duplicate-label snapshot refused by `snapshot_payload` **and**
   `build_release`; valid committed snapshot publishes byte-identical bytes
   with `payload_sha256` beginning `72ccc63f`.
2. **W2**: mapping-of-mappings, dataclass field, and wrong-value-right-label
   each demonstrated in `CountEnrollmentResidualTests`.
3. **W3**: `cached_property` either enrolled or asserted-still-unenrolled,
   matching the docstring's choice.
4. **W4**: `https://[::1]evil.invalid/x` refused; `https://[]/x` and
   `https://[2001:db8::1/x` still admitted.
5. **W5**: every port shape above either refused or asserted-still-admitted,
   matching the docstring's choice.
6. **W6**: pure-U+3000 name attacked; message matches prose; twelve names
   byte-unchanged.

Run RED before the fix where the finding is behavioural (W1, W4, and W5/W6 if
you choose refusal). **List every test that passes by construction** — and
remember that "I wrote the test from the docstring" is exactly how three green
suites carried false claims.

## Regressions that must hold — confirmed correct by both reviewers, do not re-litigate

- The 268-code-point Unicode transcription: complete and correct as verified;
  do not touch it or its pinning test.
- H1: invisibles refused, pure-invisible names refused, `'X'`/`'X '` collide,
  twelve names byte-unchanged. H2: `counts` genuinely derived, full MRO walk.
  H3: the ten-case matrix and six hostless cases.
- All nine URL residuals and all four brand residuals still admitted (9/9 and
  4/4), except where W4 — and W5/W6 if you chose refusal — deliberately moves
  a case, and then the residual table moves with it in the same commit.
- Payload digest `72ccc63f…` for the committed snapshot; `coverage_statement`
  byte-identical to `b50b0c96`; both data files byte-unchanged; source counts
  partition `0 + 0 + 14 == 14`; `_require_brand_source_agreement`
  dual-enforced; report §11.4 records 8.
- Full suite green (888 at base; more after this wave), verifier 13/13,
  `git status --porcelain` empty when you finish.

## Output contract

One commit on `codex/global-connector-registry`, message in the lane's voice
(what was false, what is now true, what stayed open). Write
`.superpowers/sdd/task-9-fix-wave-4-report.md`: per-finding disposition, RED
evidence, pass-by-construction list, decisions taken where the brief offered
two, and full-suite + verifier output. Do not push. Do not touch any path
outside Scope.

## Out of scope

Task 9 ledger closeout (wave 5's, after this lands). The `.gitignore`
`.superpowers/` tracking decision (owner-ruled, separate change). The Task 1
baseline manifest. The `items.json` silent skip. `evidence.py`. Fetching,
ingesting, rights review. The owner runtime lane.

No production or manufacturing readiness claim. Twelve brands is a first
cohort, not the connector market. NOT-FOR-PRODUCTION stays intact.
