# Task 9 fix wave 8 report

Base commit: `8ad41b28` on `codex/global-connector-registry`. No commit was
made and no push was performed. The working tree holds exactly the scoped
changes.

This was a prose-only closing wave. **No production behaviour changed**: the
only edits to `releases.py` and `coverage.py` are inside docstrings, and the
only test-side additions are subTests and a docstring narrowing. The
re-run battery below re-attacks the seven behaviours the earlier waves
established and every one is still red, so nothing regressed while the prose
was narrowed.

Before writing a word of J1 I ran the orchestrator's matrix against the live
tree myself rather than taking it on trust:

```
A  list in measured_by            collector RecursionError   canonical RecursionError
B  self-referential count-shaped  collector ValueError        canonical RecursionError
   mapping                                  "the payload publishes two counts
                                             with the same label:
                                             self_referential_count"
C  self-referential plain mapping collector RecursionError   canonical RecursionError
```

Reproduced exactly. Shape B is a payload that contains itself, is refused, the
refusal names the field and the reason, and `canonical_json_bytes` does not
fail the same way. The old bullet's universal was false.

## Per-finding disposition

| Finding | Disposition | What changed |
| --- | --- | --- |
| J1 | **Narrowed, and the distinction bound** | The cyclic residual in `_published_count_payloads` no longer says "a payload that contains itself is not refused". It now scopes the stack-exhaustion claim to *a cycle through a container this walk does not recognise as a count*, and states the exception in the same bullet: a count-shaped mapping that contains itself is refused by the duplicate-label arm on the second visit, which names the field and the reason, while `canonical_json_bytes` still exhausts the stack on that same payload — an accident of that arm, not cycle handling. On the test side, `test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused` is renamed to `..._or_trips_the_duplicate_arm` (its old name asserted the same universal), its docstring is narrowed to match, and it is now a two-row table: shape A expecting `RecursionError` from the collector, shape B expecting `ValueError` with both message fragments asserted, and `RecursionError` from the canonical serialiser in both rows. Shape C was **not** added — it is the same collector verdict as shape A by the same mechanism, and the wave's principle is to prefer deletion over more rows. |
| J2 | **Narrowed** | The residual preamble at `releases.py` no longer claims every listed residual is exercised by `PublicationGuardResidualTests`. It carries the same exception marker wave 7 put on the test side: **except** the record/payload enrolment asymmetry, which `PublicationGuardSeamTests` drives through `snapshot_payload`, with the residual class holding only a prose-fragment assertion for it. |
| J3 | **One word** | `CoverageSnapshot.counts`'s preamble now reads "Each unreached shape is exercised by `CountEnrollmentResidualTests`, **except** the non-homogeneous mapping, which is driven through publication by `PublicationGuardSeamTests`." The semicolon was doing the work of an exception marker and failing at it. |
| J4 | **Both deleted** | "while every refusal in this module does both" is gone from the cyclic residual — true when checked by hand, attacked by nothing, and rule 1 has no truth exemption. "past any plausible cap" is gone from `test_a_count_is_not_a_leaf_to_the_production_walk`; the docstring now says the depths *vary*, which is what the loop shows. Depth 3 was added to the loop (1, 2, **3**, 4, 7) — it puts a `tuple` directly below a recognised count. It is justified by the container-set claim the loop already attacks, **not** by Codex's H3 gap, which the orchestrator falsified. |
| J5 | **Appended** | One dated section appended to `task-9-fix-wave-7-report.md`, existing text unaltered. |

Nothing else was touched. Files changed:

```
packages/component-master/src/monolith_component_master/releases.py
packages/component-master/src/monolith_component_master/coverage.py
tests/component_master/registry/test_first_cohort_denominator.py
.superpowers/sdd/task-9-fix-wave-8-report.md
.superpowers/sdd/task-9-fix-wave-7-report.md   (append only)
```

`data/component-master/registry/v1/coverage-snapshot.json` is byte-unchanged:
`git diff` over that path is empty and its digest is still
`72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788`.

## Re-run battery

Seven mutants, applied one at a time to the tree as this wave leaves it, each
followed by the full suite and an immediate byte-level restore. Every mutant
turned the suite red. Both source files were SHA-256 checked after **every**
restore, not only at the end.

Reference digests, held before the first mutant and re-checked after each:

```
releases.py  dfda0ae076d7defe812ef9a816382e5bafe1ec167d047c4f5d18d681b2bc8242
coverage.py  79065189fc4c1fef6ab41a846911666182214f2c4d3add5757b486060bacae4a
```

Observed output, verbatim:

```
BASELINE 909 passed in 12.67s
M1 delete the collector duplicate arm -> 2 failed, 907 passed in 13.22s | restored=dfda0ae076d7defe both_identical=True
M2 narrow the walk to tuples-only -> 4 failed, 905 passed in 12.92s | restored=dfda0ae076d7defe both_identical=True
M3 delete the `unexpected` arm -> 2 failed, 907 passed in 12.68s | restored=dfda0ae076d7defe both_identical=True
M4 delete the `changed` arm -> 2 failed, 907 passed in 13.01s | restored=dfda0ae076d7defe both_identical=True
M5 restore the count-as-leaf `return` -> 2 failed, 907 passed in 12.68s | restored=dfda0ae076d7defe both_identical=True
M6 delete the bracket-suffix refusal -> 1 failed, 908 passed in 12.59s | restored=79065189fc4c1fef both_identical=True
M7 depth-cap the post-count walk -> 2 failed, 907 passed in 13.14s | restored=dfda0ae076d7defe both_identical=True
```

`restored=` is the digest of the file that mutant touched, re-read from disk
after the restore; `both_identical=True` means *both* source files matched
their reference digests at that moment.

What each mutant was, precisely:

- **M1** — the five lines of the `if label in collected: raise ValueError(...)`
  arm deleted from `_published_count_payloads`.
- **M2** — `elif isinstance(value, (list, tuple)):` narrowed to
  `elif isinstance(value, tuple):`, the F1 hole reopened.
- **M3** — `unexpected = sorted(set(published) - set(record))` replaced with
  `unexpected = []`.
- **M4** — the `changed = sorted(...)` generator replaced with `changed = []`.
- **M5** — `return` reinserted after `collected[label] = value`, making a
  recognised count a leaf again.
- **M6** — `if after_bracket and not after_bracket.startswith(":"):` in
  `coverage.py`'s declared-URL rule replaced with `if False:`.
- **M7** — a recursion budget added to the collector's `walk`, set to two
  levels when a count is recognised, so the post-count walk is depth-capped.

M1 rose from the base wave's count because J1's shape B binds it a second way:
delete the duplicate arm and the self-referential count no longer raises
`ValueError`, it recurses to `RecursionError`. The new subTest is itself
mutation-bound, not a prose echo.

## Full suite

```
909 passed in 12.51s
```

Base was 909 and the count is unchanged, as the brief anticipated: J1's shape B
landed as subTests inside the existing test, and J4's depth 3 as a subTest
inside an existing loop. `git status --porcelain` lists only the three source
files above plus the two reports.

## Terminal state

DONE. Four prose findings closed — three by narrowing an overclaimed sentence
to what the code actually does and one by deleting two unattackable phrases —
plus one report correction, with one new test row that binds the distinction
J1 exposed rather than merely restating it. No production behaviour was
changed and none was needed: every one of the seven established behaviours was
re-attacked after the edits and every mutant turned the suite red, with both
source files verified byte-identical after each restore. The one judgement
call worth the orchestrator's attention is the test rename: the brief asked
only for a subTest and a docstring narrowing, but the old test *name* asserted
the same universal J1 exists to retract, so leaving it would have left the
falsified claim standing in the one place a reader sees first in a failure
report.
