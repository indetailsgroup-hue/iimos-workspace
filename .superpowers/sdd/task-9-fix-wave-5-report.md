# Task 9 fix wave 5 report

Base commit: `a46c5e85` on `codex/global-connector-registry`. Runner: Python
3.14.2. No commit was made and no push was performed; the working tree holds
exactly the scoped changes.

## Per-finding disposition

| Finding | Disposition | Decisions taken |
| --- | --- | --- |
| F1 | Fixed | `_published_count_payloads` now descends into `(list, tuple)`, matching the container set `canonical_value` admits. The new `PublicationGuardSeamTests::test_a_list_nested_count_is_collected_by_the_production_walk` publishes a list-nested five-field count through the collector (three container spellings: bare list, list inside a tuple, tuple inside a list) and was observed RED against the wave-4 collector before the production change. Valid payloads are built from tuples only, so no valid release byte changes; the suite's byte-identity and `72ccc63f…` digest tests confirm. |
| F2 | Fixed | Direct attacks added at the guard seam: `test_an_unexpected_count_is_refused_at_the_comparison` (list-nested and mapping-nested doctored counts handed to `_require_count_publication_matches`) and `test_a_right_label_count_with_one_changed_field_is_refused` (right-label `verified_item_count` with a wrong `count`, wrong `denominator`, and wrong `measured_by`, one field per subTest). Driven at the seam because through `snapshot_payload` those two arms are unreachable by construction — and the guard's docstring now says exactly that: `missing` is the one arm a publication can exhibit (driven by `CountEnrollmentDerivationTests` through the public path); `unexpected` and `changed` are defence-in-depth, live only if the payload builder itself diverges, driven by `PublicationGuardSeamTests` at the seam. `snapshot_payload`'s docstring no longer credits `PayloadCountCompletenessTests` with attacking the comparison; it now states that class re-walks and asserts equality and "makes nothing refuse". A control test passes the undoctored payload through the same seam. Each arm was observed RED against a mutant lacking it (below). |
| F3 | Fixed | Admitted cases added: `https://[::1]:8443/x` and `https://[::1]:/x` (`DeclaredUrlHostTests::test_a_bracketed_host_with_a_port_is_admitted` — the second attacks the exact "empty or begins with `:`" boundary). The docstring clause "after that only an optional ``":" port`` may stand" is narrowed in `_require_hostful_authority_without_userinfo` to: the suffix must be empty or begin with `:`, nothing after that `:` is parsed, the port residual reaches bracketed hosts too. The port residual bullets in both `_require_hostful_authority_without_userinfo` and `_require_declared_url` name the bracketed spelling. `https://[::1]:8080extra/x` added to `STILL_OPEN_URL_CASES` ("bracketed host with an unparsed port suffix"), and both docstring-fragment tests now pin the new prose. All observed RED against Codex's over-broad boundary mutant (below). |
| F4 | Fixed | A dated correction section ("Correction appended 2026-08-01 (fix wave 5, F4)") is appended to `task-9-fix-wave-4-report.md`, stating the final terminal state (`a46c5e85` exists, exactly the three scoped files, orchestrator-committed after the implementer's sandbox was denied the linked worktree's Git index, clean porcelain). No existing text of that report was altered. |
| F5 | Fixed | Both guard functions now carry long-form docstrings with `What this does not close` sections. Residuals named and tested in `PublicationGuardResidualTests`: (1) a count-shaped mapping carrying a sixth key is a container, not a count — the definitional difference against the test helpers' superset matching is stated on both sides (`_published_count_payloads` docstring and `payload_count_labels` docstring) and the divergent verdict on one six-key object is asserted; (2) direct `RegistryRelease(...)` construction with self-consistent doctored `payload_bytes` bypasses the guard — the binding (`snapshot_payload` and everything that calls it, not the constructor) is stated in the comparison's docstring and the bypass is asserted genuinely open. The F1 list bullet is closed, not listed. No further open residual was found while writing the section: the non-string-label branch is internal-shape defensive code (`pragma: no cover`), and duplicate-label refusal is already publication-path tested by wave 4. |

Decision on F5's "align the definitions or state the difference": stated, not
aligned. Widening the production match to superset would change guard
behaviour on payloads containing five-key-superset mappings for no
demonstrated defect; narrowing the test helpers would weaken the attacker.
The difference is now load-bearing prose on both walks plus an asserted
divergent verdict, so it cannot drift silently.

## Mutations run, each observed RED first-hand

### F1 — the wave-4 collector itself (test written first, code unmutated)

The list-collector test was run against the untouched wave-4 collector
(mappings and tuples only) before `(list, tuple)` was introduced:

```text
python -m pytest -q tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardSeamTests::test_a_list_nested_count_is_collected_by_the_production_walk

E               AssertionError: Items in the first set but not the second:
E               'doctored_count_nobody_measured'
tests\component_master\registry\test_first_cohort_denominator.py:2410: AssertionError
1 failed in 0.33s
```

The collector collected zero labels from `{"wrapper": [ {five-field count} ]}`
— the exact probe both reviewers ran. In the same pre-fix run of the whole
seam class, the list-nested `unexpected` subTest also failed
(`AssertionError: ValueError not raised`), confirming the guard drove past a
list-nested count silently. After the one-line production change both are
green.

### F2, mutant A — `unexpected` arm deleted

Mutation applied locally to `_require_count_publication_matches`:

```python
unexpected = []  # WAVE-5 MUTANT A: arm deleted
# replacing: unexpected = sorted(set(published) - set(record))
```

```text
python -m pytest -q tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardSeamTests::test_an_unexpected_count_is_refused_at_the_comparison

E               AssertionError: ValueError not raised
tests\component_master\registry\test_first_cohort_denominator.py:2426: AssertionError
1 failed in 0.35s
```

Restored; test green.

### F2, mutant B — `changed` arm deleted

```python
changed = []  # WAVE-5 MUTANT B: arm deleted
# replacing the five-field inequality comprehension
```

```text
python -m pytest -q tests/component_master/registry/test_first_cohort_denominator.py::PublicationGuardSeamTests::test_a_right_label_count_with_one_changed_field_is_refused

E               AssertionError: ValueError not raised
tests\component_master\registry\test_first_cohort_denominator.py:2454: AssertionError
1 failed in 0.32s
```

Restored; test green.

### F3, mutant C — over-broad bracket-suffix refusal

Codex's boundary mutation, reproduced:

```python
if after_bracket:  # WAVE-5 MUTANT C: boundary over-broadened
# replacing: if after_bracket and not after_bracket.startswith(":"):
```

```text
python -m pytest -q ...DeclaredUrlHostTests::test_a_bracketed_host_with_a_port_is_admitted ...DeclaredUrlResidualTests::test_every_named_residual_is_genuinely_still_admitted

E  ValueError: url has ':8443' standing after the bracketed host '[::1]'. ...
E  ValueError: url has ':8080extra' standing after the bracketed host '[::1]'. ...
FAILED ...::test_a_bracketed_host_with_a_port_is_admitted
FAILED ...::test_every_named_residual_is_genuinely_still_admitted
2 failed in 0.41s
```

The mutation that passed the whole wave-4 suite now fails two tests. Restored;
both green.

### Prose mutants (observed in the pre-fix run, not separately staged)

`test_the_guard_docstring_states_which_arms_a_publication_can_exhibit` was
observed RED against the wave-4 one-line docstring
(`AssertionError: 'missing' not found in 'refuse a payload whose count
objects diverge from the record.'`) before the new docstrings were written.
The residual-docstring fragment tests and the two extended URL fragment lists
are of the same kind: they fail against the wave-4 prose by construction of
the fragment sets.

## Tests that pass by construction

These pin behaviour that was already true at `a46c5e85`; their green result is
not evidence of a production change, and where an attack was required the RED
came from a mutant above:

1. `PublicationGuardSeamTests::test_a_right_label_count_with_one_changed_field_is_refused` — arm existed; RED via mutant B.
2. `PublicationGuardSeamTests::test_an_unexpected_count_is_refused_at_the_comparison`, mapping-nested subTest — arm existed for mapping nesting; RED via mutant A. (The list-nested subTest was RED at base.)
3. `PublicationGuardSeamTests::test_the_comparison_is_green_without_the_doctoring` — the control.
4. `PublicationGuardResidualTests::test_a_sixth_key_makes_a_count_shaped_mapping_a_container` — residual asserted still open.
5. `PublicationGuardResidualTests::test_direct_release_construction_bypasses_the_guard` — pre-existing bypass asserted still open.
6. `DeclaredUrlHostTests::test_a_bracketed_host_with_a_port_is_admitted` — admitted at base; RED via mutant C.
7. `DeclaredUrlResidualTests::test_every_named_residual_is_genuinely_still_admitted`, new `8080extra` row — admitted at base; RED via mutant C.

## Full-suite output

`python -m pytest tests/ -q` from the repository root (no `--basetemp`
needed; no temp-dir PermissionError occurred):

```text
........................................................................ [  7%]
........................................................................ [ 15%]
........................................................................ [ 23%]
........................................................................ [ 31%]
........................................................................ [ 39%]
........................................................................ [ 47%]
........................................................................ [ 55%]
........................................................................ [ 63%]
........................................................................ [ 71%]
........................................................................ [ 79%]
........................................................................ [ 87%]
........................................................................ [ 95%]
........................................                                 [100%]
904 passed in 13.05s
```

904 = wave 4's 894 plus this wave's 10 additions (5 in
`PublicationGuardSeamTests`, 4 in `PublicationGuardResidualTests`, 1 in
`DeclaredUrlHostTests`). The scoped module alone: 172 passed (wave 4's 162
plus 10). `tools/verify_kitchen_kernel.py` was not run, per the brief — it
needs a committed tree and the orchestrator runs it post-commit.

## Regression surface held

- `data/component-master/registry/v1/coverage-snapshot.json` byte-unchanged:
  Git blob `cf66f08cd51ca947b87b55741db0998f05aaaf98` before and after, and
  the suite's byte-identity test (`test_no_two_counts_share_a_label`)
  re-asserted the committed bytes and the `72ccc63f…` release digest.
- The coverage-statement, twelve-name, fourteen-URL, ten-case authority
  matrix, six hostless spellings, six port spellings, `[::1]evil.invalid`
  refusal, `[]`/unclosed-bracket admissions, pure-U+3000 blank refusal,
  duplicate-label refusals at `snapshot_payload` and both release builders,
  five-field comparison, and `cached_property` enrolment tests all ran green
  inside the 904.
- The `_published_count_payloads` widening cannot change valid release bytes:
  `snapshot_payload` builds its containers as tuples, so the list arm is
  reachable only by doctored payloads at the seam.

## git status --porcelain

```text
 M packages/component-master/src/monolith_component_master/coverage.py
 M packages/component-master/src/monolith_component_master/releases.py
 M tests/component_master/registry/test_first_cohort_denominator.py
```

The two `.superpowers/sdd/` reports (this one and the corrected wave-4
report) are ignored and stay untracked, as the brief requires.

## Terminal state

DONE. All five findings are dispositioned inside scope: the collector now
walks the same container set the canonical allowlist admits with its hole
observed RED first; both untested refusal arms are driven to refusal at the
only seam that can reach them, each observed RED against a mutant lacking the
arm, and every docstring now states which arms a publication can exhibit
rather than crediting a test that attacks nothing; the bracket-port boundary
is pinned on both sides against Codex's surviving mutant and the residual
table carries the bracketed port spelling; the wave-4 report carries its
dated terminal-state correction with history unaltered; and the new guard
carries the lane-standard residual sections with every named residual
asserted genuinely still open. 904 tests green, snapshot and release bytes
byte-identical, working tree holding exactly the three scoped code/test
modifications, nothing committed, nothing pushed.

## Correction appended 2026-08-01 (fix wave 6, G3)

The F5 disposition's statement that the collector's duplicate-label refusal
"is already publication-path tested by wave 4" is false. All three cited
publication-path tests reach ``CoverageSnapshot.counts`` first and stop at its
record-side duplicate-label refusal, before ``_published_count_payloads`` can
run. The collector's own arm therefore remained unattacked through wave 5.
Fix wave 6 adds a direct seam test that hands the collector two payload counts
with one label; this correction changes no other wave-5 text or claim.
