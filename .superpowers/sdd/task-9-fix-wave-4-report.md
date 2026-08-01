# Task 9 fix wave 4 report

## Outcome

Fix wave 4's implementation and verification are complete on base `79e76062`
in `codex/global-connector-registry`; the required final commit is blocked by
the execution environment's read-only access to this linked worktree's Git
index. Publication now evaluates the derived count
enumeration, refuses duplicate labels, and compares every count-shaped payload
object with the record in both directions without changing valid release
bytes. The bracket-suffix reviewer/fetcher divergence is refused. The count,
URL, whitespace, and transcription boundaries that remain open are stated and
attacked by tests rather than implied closed.

## Decisions and per-finding disposition

| Finding | Disposition | Evidence and boundary |
| --- | --- | --- |
| W1 | Fixed | `snapshot_payload` runs `_require_count_publication_matches`; that guard evaluates `snapshot.counts`, refuses duplicate labels, discovers payload count objects by their exact five-field shape, and compares labels and all five values in both directions. `build_release` reaches the same guard through `snapshot_payload`. Valid committed bytes and the `72ccc63f…` digest stay unchanged. |
| W2 | Fixed by construction tests | `CountEnrollmentResidualTests` now table-tests a property returning a tuple, a property returning a mapping of mappings, a plain class attribute, and a dataclass field. A separate mutation proves that the correct label with a wrong count value passes enrolment untouched. |
| W3 | Enrol `functools.cached_property` | Chosen because it is the idiomatic memoised form of the same derived descriptor and is reachable through `getattr` exactly like a property. The walk, docstring, and a RED-then-green test now agree. |
| W4 | Fixed | Text after a closing bracket is refused unless the remainder is empty or begins with `:`. The refusal names the field, quotes the suffix and bracketed host, and explains the reviewer versus `.NET System.Uri` fetcher divergence. Empty and unclosed IP-literal bracket residuals remain admitted. |
| W5 | Keep as an explicit residual | Chosen because this rule establishes a present host and does not claim to parse port grammar or range. The docstring and table keep non-digit, negative, over-range, multiply-coloned, and empty-port spellings admitted. `port = *DIGIT` permits zero digits, so `https://host:/x` remains admitted; `https://:/x` remains an empty-host refusal. `https://]/x` is filed under host well-formedness. |
| W6 | Narrow the prose | Chosen to preserve the shared blank-first `_require_string` contract. An all-whitespace value, including pure U+3000, reports `brand_name must not be blank`; by-name `Zs` refusal applies only once the value is not already blank. |
| W7 | Fixed as prose | Replaced the unverifiable independence claim with the verifiable fact: the test module carries a second transcription rather than importing the production tuple and compares it entry by entry. The prose discloses that one author transcribed both in one sitting. |

## RED observed first-hand

The behavioral findings were attacked before their fixes.

### W1 — publication did not refuse the mutation

Command selected all three publication-path attacks:

```text
pytest -q \
  tests/component_master/registry/test_first_cohort_denominator.py::CountEnrollmentDerivationTests::test_the_payload_guard_fails_when_a_property_is_not_published \
  tests/component_master/registry/test_first_cohort_denominator.py::CountEnrollmentDerivationTests::test_snapshot_payload_refuses_a_duplicate_count_label \
  tests/component_master/registry/test_first_cohort_denominator.py::CountEnrollmentDerivationTests::test_build_release_refuses_a_duplicate_count_label
```

Observed output:

```text
FFF
AssertionError: ValueError not raised
AssertionError: ValueError not raised
AssertionError: ValueError not raised
3 failed, 2 warnings in 0.18s
```

This directly observed both `snapshot_payload` and `build_release` publishing
the duplicate-label mutation before the production guard was added.

### W4 — bracket-suffix divergence was admitted

```text
pytest -q tests/component_master/registry/test_first_cohort_denominator.py::DeclaredUrlHostTests::test_text_after_a_bracketed_host_is_refused
```

Observed output:

```text
AssertionError: ValueError not raised
1 failed, 2 warnings in 0.14s
```

### W3 — chosen enrolment behavior was absent

The cached-property test was also run before the walk changed. Its label was
absent from the 25-label enumeration:

```text
AssertionError: 'smuggled_in_a_cached_property' not found in {...}
1 failed, 2 warnings in 0.11s
```

W5 was deliberately retained as a residual and W6 deliberately retained the
blank-first behavior, so the brief did not require RED for those choices.

## Tests that pass by construction

These tests pin behavior that was already true; they are listed separately so
their green result is not presented as evidence that production code changed:

1. `CountEnrollmentResidualTests::test_every_named_count_shape_is_genuinely_still_unenrolled`
2. `CountEnrollmentResidualTests::test_a_wrong_value_under_the_right_label_passes_enrolment_untouched`
3. `DeclaredUrlResidualTests::test_every_named_residual_is_genuinely_still_admitted`
4. `DeclaredUrlHostTests::test_the_named_bracket_well_formedness_residuals_stay_admitted`
5. `BrandNameWhitespaceTests::test_a_name_of_only_non_u0020_zs_is_refused_as_blank_first`

The five-test construction run passed:

```text
5 passed in 0.11s
```

The URL residual table covers the original nine cases plus all W5 spellings:
non-digit port, negative port, over-range digit port, multiple unbracketed
colons, empty port, and the unmatched closing bracket filed under host
well-formedness.

## Focused and regression test output

After the implementation, the focused registry selection passed:

```text
41 passed in 0.43s
```

The two scoped component-master registry modules, excluding only the runtime
Unicode-version pin while using the available Python 3.12/Unicode 15 runner,
passed:

```text
342 passed, 1 deselected in 5.62s
```

The final full suite used Python 3.14.6 with Unicode 16.0 and a fresh
`--basetemp` under the repository's `.superpowers/`; the temporary directory
was removed and is not committed:

```text
........................................................................ [894 tests]
894 passed in 14.71s
```

The expected fixture diagnostics on stderr were:

```text
no such path: C:\tmp\monolith-global-connector-registry-parent\no-such-directory
error: injected mid-publish failure
```

They are asserted failure-path fixtures, not suite failures.

## Verifier output

`tools/verify` requires an already-committed clean tree while this assignment
requires verification before the lane's single commit. It was therefore run
before the lane commit in a disposable local clone containing a temporary
commit of the exact final production and test files. No remote was contacted;
the clone and generated artifact were removed afterward.

Final verifier console output:

```json
{"overall_passed": true, "check_count": 13, "passed_count": 13, "failed_count": 0, "output": "artifacts/verification/kitchen-kernel-bootstrap-summary.json"}
```

The artifact recorded schema `1.1.0`, full-suite exit code 0 with 894 tests,
component-master governed-suite exit code 0 with 20/20 tests,
identity-tenancy exit code 0 with 7/7 tests, compile exit code 0, and all
remaining contract, data, secret-scan, and clean-git checks passing. The
verifier full-suite output SHA-256 was
`355f94a63bb0e3b328f9d3131faab6159d80653a516ff3151e794bf818b3a0e9`.

## Scope, bytes, and terminal state

- The protected snapshot remained byte-unchanged; its Git blob is
  `cf66f08cd51ca947b87b55741db0998f05aaaf98` before and after the wave.
- The committed valid payload remains byte-identical to
  `data/component-master/registry/v1/coverage-snapshot.json`, with SHA-256
  `72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788`.
- Full-suite regression tests retained the byte-identical coverage statement,
  both data files, the `0 + 0 + 14 == 14` source partition, dual-enforced brand
  source agreement, report section 11.4's value 8, the ten-case and six
  hostless URL matrices, all original nine URL residuals, all four brand
  residuals, the 268-code-point Unicode transcription, and NOT-FOR-PRODUCTION.
- Only Scope paths are in the commit. `test_release.py` required no change.
- Temporary test and verifier workspaces were removed.
- Final clean-state gate is not yet available: `git add` was refused before it
  could stage any file because Git could not create
  `C:/Users/thai3/determined-williams (2)/.git/worktrees/monolith-global-connector-registry-parent/index.lock`
  (`Permission denied`). The index is outside the writable workspace. The
  worktree therefore still contains only the three scoped code/test changes,
  plus this ignored-but-required scoped report; no file was staged.
- No push was performed.

## Correction appended 2026-08-01 (fix wave 5, F4)

The two terminal-state statements above — the opening paragraph's "the
required final commit is blocked by the execution environment's read-only
access to this linked worktree's Git index", and the closing bullet "Final
clean-state gate is not yet available … no file was staged" — were accurate
when written and are now stale. The commit exists: `a46c5e85`, containing
exactly the three scoped files, created by the orchestrator after the
implementer's sandbox was denied the linked worktree's Git index, with clean
porcelain afterward. The text above is left unaltered as history; this
section records the final terminal state and who created the commit.
