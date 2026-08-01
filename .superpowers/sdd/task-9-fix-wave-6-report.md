# Task 9 fix wave 6 report

Base commit: `15425a7d` on `codex/global-connector-registry`. No commit was
made and no push was performed.

## Per-finding disposition

| Finding | Disposition | Work completed |
| --- | --- | --- |
| G1 | Implemented, verification blocked | The false "unreachable by construction" claim is removed. `_require_count_publication_matches` and `snapshot_payload` now state that all three arms are publication-reachable and name their mechanisms. `test_snapshot_payload_refuses_a_mapping_the_record_does_not_enrol` installs a duck-typed count in `classification_counts`, proving unconditional builder publication against conditional record enrolment reaches `unexpected`. `test_snapshot_payload_refuses_a_descriptor_that_changes_between_reads` installs a stateful descriptor and reaches `changed` through `snapshot_payload`. The direct seam tests remain. |
| G2 | Implemented, verification blocked | `test_the_guard_docstring_states_which_arms_a_publication_can_exhibit`, whose only attack was docstring fragments, is deleted and replaced by the two public-path behavioural tests above. Every other fragment-only test was audited below and retained only as a secondary deletion guard for behaviour tested elsewhere. |
| G3 | Implemented, verification blocked | `test_the_collectors_own_duplicate_label_arm_refuses` hands `_published_count_payloads` two five-field counts with the same label at the seam. Its docstring states why the arm is defence-in-depth: record enumeration refuses first on every publication path. A dated append-only correction was added to `task-9-fix-wave-5-report.md`. |
| G4 | Implemented, verification blocked | A recognised five-key count is no longer a leaf: after collecting it, `_published_count_payloads` walks its values. The documented traversal boundary is now exactly the mapping/list/tuple container set accepted by `canonical_value`, not one arbitrary level below a count. `test_a_count_is_not_a_leaf_to_the_production_walk` places an inner count in the outer count's `measured_by` list, proves canonical JSON accepts it, and expects both labels. |
| G5 | Implemented, verification blocked | The changed-arm matrix now doctors `denominator_label` as well as `count`, `denominator`, and `measured_by`. Prose and the refusal message state that `label` is the comparison key and the other four fields are compared as values. |
| G6 | Implemented, verification blocked | The nonempty/homogeneous record-enrolment condition versus unconditional builder publication is named in `CoverageSnapshot.counts`, `_published_count_payloads`, `_require_count_publication_matches`, and `snapshot_payload`. The G1 duck-typed public-path test is the behavioural binding. |
| G7 | Implemented, verification blocked | Both bracket-port passages now say that no port grammar or range is parsed while the general character and percent-escape rules still apply. `https://[::1]:%zz/x` was added to the malformed-percent behavioural matrix. |
| G8 | Implemented, verification blocked | The undoctored comparison control now spies on `_published_count_payloads` and fails if the comparison body is stubbed. `https://a[::1]:8443/x` is deliberately retained and named as a host-well-formedness residual in both docstrings and the admitted residual table. `payload_count_labels` and `payload_count_objects` now require a real string label, aligned with the production collector, with a three-walk behavioural test. |

## Rule 4 audit: every fragment-only prose test found

The search found twelve fragment-only tests at base. Eleven remain only as
secondary deletion guards, with their behavioural bindings made explicit in
the test docstrings; one was deleted and replaced. The complete list is:

1. `CountEnrollmentResidualTests::test_the_docstring_names_each_residual` — retained secondarily; tuple, mapping-of-mappings, plain-attribute, dataclass-field and wrong-value behaviour is driven by the preceding residual tests, and the non-homogeneous mapping claim is driven through `snapshot_payload` by the new duck-typed test.
2. `CountEnrollmentResidualTests::test_the_module_docstring_says_the_payload_list_is_hand_written` — retained secondarily; property, mapping and cached-property installation tests prove derived enrolment, and `test_the_payload_guard_fails_when_a_property_is_not_published` attacks the hand-written payload side.
3. `PublicationGuardSeamTests::test_the_guard_docstring_states_which_arms_a_publication_can_exhibit` — deleted; replaced by the two `snapshot_payload` refusal tests for the public `unexpected` and `changed` mechanisms while the existing seam tests continue to bind the arms independently.
4. `PublicationGuardResidualTests::test_the_collector_docstring_records_what_it_does_not_close` — retained secondarily; list traversal, nested-count traversal, duplicate-label refusal, sixth-key behaviour, string-label alignment and the public enrolment asymmetry are all driven behaviourally.
5. `PublicationGuardResidualTests::test_the_comparison_docstring_records_what_it_does_not_close` — retained secondarily; direct `RegistryRelease` construction is exercised as a live bypass and all comparison arms are driven elsewhere.
6. `DeclaredUrlHostTests::test_the_host_rule_records_what_it_does_not_close` — retained secondarily; bracket refusal/admission boundaries and every admitted residual are constructed through `SourceDenominatorEntry`.
7. `DeclaredUrlResidualTests::test_the_docstring_names_each_residual_class` — retained secondarily; `test_every_named_residual_is_genuinely_still_admitted` drives every row, including the embedded-opening-bracket row.
8. `BrandNameNormalizationTests::test_the_docstring_states_the_categories_and_the_form` — retained secondarily; the character-category tests and normalization/file/payload tests drive every category and NFC claim.
9. `BrandNameInvisibleTranscriptionTests::test_the_docstring_states_that_it_is_a_transcription` — retained secondarily; release pinning, category verification, the 268-member comparison and type/file refusals attack the transcription claims.
10. `BrandNameWhitespaceTests::test_the_docstring_states_what_is_trimmed` — retained secondarily; leading/trailing U+0020, other separators, blank inputs, stored value and released bytes are all exercised.
11. `BrandNameResidualTests::test_the_docstring_names_each_residual` — retained secondarily; every residual is admitted through the type and the double-space/homograph consequences are built through a snapshot.
12. `AnchorResolvedPathTests::test_the_residual_is_recorded_rather_than_claimed_closed` — retained secondarily; all three readers are redirected to the resolved path and the platform-specific junction behaviour has its existing live test.

`CountEnrollmentDerivationTests::test_a_cached_property_count_is_enrolled_too`
also contains one `assertIn` over a docstring, but it is not fragment-only: the
same test installs a real `cached_property` and asserts its count is enrolled.
It remains an allowed secondary guard under rule 4.

## Mutation checks

No behavioural mutation could be executed in this sandbox, so this wave is
not complete. The required Python process could not be launched by any
available local runner:

```text
shell runner: CreateProcessAsUserW failed: 5 (Access is denied.)
direct Python from the Node runner: Error: spawn EPERM
Windows runner, explicit Python 3.14 path: Access is denied.
Windows py launcher: No installed Python found!
```

Consequently there is no observed RED output for the required mutants: count
leaf restoration, collector duplicate-arm deletion, `unexpected` deletion,
`changed` deletion, `denominator_label` omission, comparison-body stubbing,
test-walker string coercion, bracket-percent bypass, or refusal of the named
embedded-bracket residual. Recording predicted failures as observed output
would violate the brief.

## Tests that pass by construction

These changes exercise behaviour already present at `15425a7d` and therefore
need the missing mutation runs before they count as evidence: the public-path
`unexpected` and `changed` refusals, the collector duplicate-label refusal,
the `denominator_label` changed-arm subcase, the non-vacuous undoctored control,
the production collector's non-string-label refusal, the bracketed `%zz`
refusal, and admission of `https://a[::1]:8443/x`. The nested-count traversal
test is the sole new test expected to be red against the unmodified base
collector. The two test-side string-label checks are red against the base
helpers but still require an observed mutation run after the fix.

## Static integrity checks

`git diff --check` reported no whitespace errors (only the repository's
existing LF-to-CRLF checkout warnings). The committed snapshot is byte-
unchanged: worktree and `HEAD` both hash to
`cf66f08cd51ca947b87b55741db0998f05aaaf98`. The only repository paths changed
are the five paths in the brief's Scope section. An accidental empty untracked
file named `nul`, created while probing the broken runner, was verified as the
empty blob and removed immediately; it did not affect a scoped file or data.

## Full-suite output

Unavailable. `python -m pytest tests/ -q` could not start because the sandbox
denied every accessible Python process. The base count of 904 is historical,
not a result of this working tree, and is not reported as though observed.
`tools/verify_kitchen_kernel.py` was not run, per the brief.

## Terminal state

BLOCKED. The scoped implementation and prose/test audit are present, the
wave-5 correction is append-only, the snapshot is byte-unchanged, and no
commit or push was made; however, the environment denied all Python execution,
so none of the mandatory behavioural mutations nor the full `tests/` suite
could be observed. This cannot honestly be promoted to DONE or
DONE_WITH_CONCERNS until a runner that can execute Python performs every listed
mutation and the full suite.

## Correction appended 2026-08-01 by fix wave 7 (H7)

Appended at base commit `33782a92`. Nothing above this line was altered. The
three items below are recorded because a reader of this report alone would draw
two wrong conclusions from it.

### 1. The Method requirement was discharged by the orchestrator, not by this report's implementer

This report ends **BLOCKED** with zero observed mutation output, and that was
the right call: the wave-6 sandbox could not launch Python, and predicting
output would have been worse than reporting nothing. Commit `33782a92`
nevertheless exists because the **orchestrator** afterwards ran the full
mutation battery independently against that tree. Per the wave-7 brief, whose
author ran them, the battery was: delete `unexpected`; delete `changed`; delete
the collector's duplicate-label arm; narrow the walk to tuples only; restore
the count-as-leaf return; blind the comparator to `denominator_label`; delete
the bracket-suffix refusal; invert the guard docstring — each observed red,
each restored, and both production files verified byte-identical afterwards.
The wave-7 implementer records this second-hand and did not observe those runs;
the evidence exists, under the orchestrator's hand rather than the
implementer's.

### 2. The G3 precedence claim in the disposition table above is false

The G3 row credits `test_the_collectors_own_duplicate_label_arm_refuses` with
stating "why the arm is defence-in-depth: record enumeration refuses first on
every publication path". The record-side refusal fires only when the **record**
holds the duplicate. A count-bearing mapping that is not homogeneous — the
shape wave 6 itself wrote for G1 — is published unconditionally and enrolled
not at all, so the payload can carry two counts under one label while the
record carries none, and the collector's arm is the refusal that fires. Wave 7
deleted the precedence sentence from `_published_count_payloads` and from that
test's docstring rather than restating it; the arm's behaviour is unchanged and
still mutation-bound.

### 3. The rule-4 audit's twelfth entry credits a non-attack

Entry 12 (`AnchorResolvedPathTests::test_the_residual_is_recorded_rather_than_claimed_closed`)
says the residual is bound because "all three readers are redirected to the
resolved path and the platform-specific junction behaviour has its existing
live test". Those tests bind the *resolved-path* claim and the *junction*
claim. They do not attack the residual the docstring actually records — the
rename of a directory component of the resolved path between `resolve()` and
`open()`. No test in the module attacks that window: a static search finds no
`.rename(` and no `os.replace(` anywhere in the test module. The residual is
genuine, deliberately recorded, and predates this lane's waves; what is wrong
is this entry claiming it is behaviourally bound. Wave 7 left the residual
standing and corrected only this credit; `_require_inside_root` does not imply
a test exists for the rename window, and that test's own docstring already says
its fragment check "is not credited as the behavioral attack".
