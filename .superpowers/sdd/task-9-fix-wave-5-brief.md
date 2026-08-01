# Task 9 fix wave 5 — brief

Base commit: `a46c5e85`. Read this twice before you write any code.

## Why this wave exists

Two independent reviews of `a46c5e85` (fix wave 4) both returned
**NEEDS_FIXES**, and both said the same thing about the same function: every
W1–W7 behaviour is right, but **the wave-4 W1 fix committed the lane's defect
shape a fifth time inside itself** — the new publication guard's docstring
claims refusals no test drives, and its collector has a hole both reviewers
reproduced independently. Codex additionally found a W4 test-contract gap
Claude missed, again.

The lane rules bind unchanged:

1. A docstring may state a class only if a test attacks the class.
2. Every rule gets a `what this does not close` section in its docstring,
   with a test per named residual asserting it is genuinely still open.
3. A test written *from* prose cannot falsify it. Write tests that try to
   make the production code refuse, and watch them fail against a mutant.

## Scope

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_first_cohort_denominator.py
.superpowers/sdd/task-9-fix-wave-5-report.md
.superpowers/sdd/task-9-fix-wave-4-report.md   (one correction, see F4)
```

`data/component-master/registry/v1/coverage-snapshot.json` byte-unchanged; a
sixth code path means stop and report.

## F1 (both reviewers, independently) — the collector ignores list containers

`canonical_value` (coverage.py:399) admits both `list` and `tuple`;
`_published_count_payloads` (releases.py:158) descends only into Mappings and
tuples. So a count nested in a `list` is invisible to the guard while being
perfectly publishable through canonical JSON — Codex's probe collected **0
labels** from `{"wrapper": [ {five-field count} ]}`; Claude's probe drove the
guard past a list-nested count silently. The docstring's "every count object
reachable" guarantee (releases.py:212) is false for lists. The test-side
walkers already handle both (test file :1170), so the attacker and the guard
disagree about what "reachable" means — the exact asymmetry rule 3 forbids.

**Required.** Traverse `(list, tuple)` in the production collector, and add a
test that publishes a list-nested count-shaped object through the guard and
watches it get collected (RED against the wave-4 collector, observed
first-hand).

## F2 (both reviewers, independently) — the guard's `unexpected` and `changed` arms are prose, not tested behaviour

The guard computes `missing`, `unexpected`, and `changed` (releases.py:173).
Only `missing` is driven to refusal by any test (the smuggled-property one).
Claude's mutation probe **deleted the `unexpected` and `changed` computations
entirely and the full suite stayed green** (162/162 in the module). A
test-tree scan (Codex) found zero references to
`_require_count_publication_matches`, `_published_count_payloads`, or any of
their three diagnostic messages.

Sharper: through the public `snapshot_payload` path the `unexpected` and
`changed` arms are **unreachable by construction** — the payload's count
objects and the record's enumeration read the same properties through the
same `as_payload`, so no snapshot can ever exhibit those two refusals. The
docstring (releases.py:215–218) says "publication is refused if either side
holds one the other does not" and "a wrong number, denominator or
``measured_by`` is refused too", crediting `PayloadCountCompletenessTests` —
which never makes the guard refuse anything.

**Required.**

- Add direct attacks that drive each arm to refusal: an unexpected payload
  count (list- or mapping-nested, doctored payload passed to the comparison),
  and a right-label count with one changed field. Drive them at the guard
  seam if the public path cannot reach them — and then **say so in the
  docstring**: which arms a publication can exhibit, and which are
  defense-in-depth reachable only if the payload builder itself diverges.
  Prose may not credit a test that does not attack.
- Each attack must be observed RED against a mutant that lacks the arm
  (delete or neuter the arm locally, watch the test fail, restore). Record
  the mutation and the failure in the report.

## F3 (Codex; Claude found the prose half) — W4's admitted colon boundary has no test, and the prose overstates it

The implementation is correctly bounded: suffix after `]` must be empty or
begin with `:`. But no test admits a bracketed host **with** a port —
searching every test for `https://\[[^\]]+\]:` returns zero matches. Codex's
boundary mutation proved an over-broad `if after_bracket:` refusal would pass
the whole suite while incorrectly refusing `https://[::1]:8443/x`. And the
docstring clause (coverage.py:692) says "after that only an optional
``":" port`` may stand" — false by one clause: `https://[::1]:8080extra/x`
is admitted, because the port is never parsed (the W5 residual), but the
residual table carries no bracketed-host port spelling to pin that.

**Required.**

- Add admitted cases: `https://[::1]:8443/x` and `https://[::1]:/x` (attacks
  the exact "empty or begins with `:`" boundary against over-refusal).
- Narrow the docstring clause to what is enforced: a suffix beginning with
  `:` is admitted and its content is never parsed — the port residual reaches
  bracketed hosts too.
- Add `https://[::1]:8080extra/x` to the still-admitted residual table so the
  non-parsed bracketed port cannot rot silently.

## F4 (both, minor) — the wave-4 report's terminal state is stale

`task-9-fix-wave-4-report.md:5` and `:172` still say the commit is blocked
and nothing was staged. The commit exists (`a46c5e85`, exactly the three
scoped files, orchestrator-committed after the implementer's sandbox was
denied the linked worktree's git index; clean porcelain). Append a dated
correction section to that report — do not rewrite its history — stating the
final terminal state and who created the commit.

## F5 (Claude) — the new guard is a rule with no `what this does not close` section

`_published_count_payloads` and `_require_count_publication_matches` carry
one-line docstrings, no residual section, no residual tests, while every rule
this lane touched in waves 3–4 carries both. Reproduced residuals to name and
test (each asserted genuinely still open):

- A count-shaped mapping carrying a **sixth key** is treated as a container,
  not a count (exact five-key-set match, releases.py:145) — while the test
  helper `payload_count_labels` (test file :1166) uses **superset** matching,
  a different definition. Align the definitions or state the difference where
  both live; an attacker and a guard that disagree about what a count *is*
  will drift.
- Direct `RegistryRelease(...)` construction with self-consistent doctored
  `payload_bytes` bypasses the guard entirely (pre-existing at base). Name
  it: the guard binds `snapshot_payload` and everything that calls it,
  not the release dataclass's constructor.
- Anything else you find while writing the section. F1's list fix moves that
  bullet from residual to closed; do not list closed things.

## Regressions that must hold

Everything wave 4 verified: 894 tests green plus this wave's additions;
verifier 13/13; committed snapshot byte-identical, digest `72ccc63f…`;
coverage_statement byte-identical to `b50b0c96`; twelve names and fourteen
URLs byte-unchanged; all W1–W7 behaviours of `a46c5e85` intact —
`[::1]evil.invalid` refused, `[]` and unclosed-bracket admitted, six port
spellings admitted, pure-U+3000 refused as blank, duplicate label refused at
`snapshot_payload` and both release builders; the five-field comparison; the
`cached_property` enrolment. `git status --porcelain` empty at the end
(the `.superpowers/` reports are ignored and stay untracked).

## Output contract

Do not commit — the linked worktree's git index is outside your sandbox; the
orchestrator commits after verifying. Leave the working tree holding exactly
the scoped changes. Write `.superpowers/sdd/task-9-fix-wave-5-report.md`:
per-finding disposition, every mutation you ran with its observed RED, the
pass-by-construction list, full-suite output. End with DONE,
DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED and one paragraph.

## Out of scope

Everything wave 4's out-of-scope names: ledger closeout, `.gitignore`
tracking decision, Task 1 manifest, `items.json` skip, `evidence.py`,
fetching/ingesting/rights, the owner runtime lane. No production or
manufacturing readiness claim. NOT-FOR-PRODUCTION stays intact.
