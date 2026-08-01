# Task 9 report — declare the first-cohort brand and source denominator

> ## Superseded in part by the Task 9 fix wave, `b7cd54ab`
>
> This report describes Task 9 as it stood at `b50b0c96`. It was then
> independently reviewed, returned `NEEDS_FIXES`, and a fix wave landed at
> `b7cd54ab` — `fix(registry): make a release digest attest the cohort it
> measured`. Everything below is left as written except where a correction
> is marked inline, so that what was claimed and what was wrong both stay
> readable.
>
> **Corrections made inline, by finding:**
>
> - **F5** — section 7 said *two* tests passed by construction. It is
>   **three**. Corrected in place.
> - **F8** — section 9 said a `brand-universe.json` typo *"would be read by
>   nothing and reported by nothing."* That is **wrong**. Corrected in place,
>   with the measurement.
>
> **Facts in this report that the fix wave changed, and where to read the
> current value:**
>
> - The committed `coverage-snapshot.json` was 6,895 bytes with payload
>   SHA-256 `2aa4b50a…`. At `b7cd54ab` it is **8,746 bytes**, payload SHA-256
>   **`4e61581ceee3515d263d326fcb1fa011f44bfc85ed381833be10779b14cc0171`**,
>   because `brand_universe`, `declared_unread_source_count` and
>   `first_cohort_brand_count` are now inside the hashed payload. Every
>   6,895-byte and `2aa4b50a…` figure below is a correct record of `b50b0c96`
>   and a stale record of the tree.
> - Section 9's first limitation — that the release payload does not
>   enumerate the brand universe or the two counts — is **closed**. That was
>   the review's finding F1, and it was the reason `releases.py` was granted
>   for the fix wave.
> - Section 9's `Path.rglob` symlink limitation is **narrowed, not closed**:
>   file symlinks out of the registry root are now refused by name, directory
>   symlinks are still not followed.
>
> The `coverage_statement` quoted in section 4 is **unchanged** at
> `b7cd54ab`. OR-9.1's spoken clause was not touched.
>
> This banner is a transcription by the implementer of the fix wave. It is
> not owner-attested and it is not a review verdict.
>
> ## Superseded again by fix wave 2
>
> Wave 1 was itself reviewed and returned `NEEDS_FIXES`. Wave 2 landed after
> it; see `.superpowers/sdd/task-9-fix-wave-report.md`, which covers both
> waves. **The two digest figures in the banner above are stale again.** The
> committed `coverage-snapshot.json` is now **8,930 bytes** with payload
> SHA-256
> **`72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788`**,
> because `verified_item_count` — the module's headline coverage number, which
> wave 1 missed while stating that its audit was complete — is now inside the
> hashed payload too. Every `6,895`/`2aa4b50a…` figure below records
> `b50b0c96`, and every `8,746`/`4e61581c…` figure in the banner above records
> `b7cd54ab`. Both are correct records of their commits and stale records of
> the tree.
>
> The `coverage_statement` is **still** unchanged, and was compared
> programmatically against this file's `b50b0c96` copy rather than by eye.
> The fourteen URLs and the twelve brand names are byte-unchanged across both
> waves.

**Status:** implementation complete, not reviewed.
**Task 9 base:** `5e17afbafbc0c3e13344ea4112f3c02c9622c6e7`
**Implementation commit:** `b50b0c96e5b7d22e6a78d067f11bcba0bafdff3f` —
`feat(registry): declare the first cohort as work, not as coverage`
**Branch:** `codex/global-connector-registry`. No push, merge, rebase, reset,
restore or branch change was performed.
**Implements:** OR-9.1, recorded at
`docs/reports/2026-07-31-global-connector-registry-owner-rulings.en.md`.

This report is a **claim, not evidence**. An independent reviewer should read
the diff and re-run every command below. Every figure here was taken from a
live run during this session and none was retyped from the brief, the plan, or
the Task 8 ledger.

---

## 1. What Task 9 is, and what it is not

Task 9 declares **what we intend to cover**. It fetched nothing, read no
publisher document, and ingested no assertion.

**The fourteen URLs in `source-denominator.jsonl` are unvisited by this task.**
They are not verified, not confirmed reachable, not confirmed current, and not
rights-reviewed. Nothing in this lane has looked at any of them. They were
transcribed from the implementation plan's Step 3 table and nowhere else.

**Twelve brands are a first cohort selected for review, not the world.** The
connector market is not twelve brands and nothing in the payload, the
statement, the tests or this report says otherwise.

Task 9 signs nothing. It grants no manufacturing, freeze, export, production or
release authority, and establishes no physical qualification, coupon testing,
machine capability, first-article inspection, field validation or owner
ratification. `NOT-FOR-PRODUCTION` remains active. Daph remains one tenant and
does not own the shared registry or canonical platform data.

---

## 2. Exact tracked scope

`git diff --numstat 5e17afba..b50b0c96`, run live:

| Status | Path | + | − |
| --- | --- | ---: | ---: |
| Added | `data/component-master/registry/v1/brand-universe.jsonl` | 12 | 0 |
| Modified | `data/component-master/registry/v1/coverage-snapshot.json` | 1 | 1 |
| Added | `data/component-master/registry/v1/source-denominator.jsonl` | 14 | 0 |
| Modified | `packages/component-master/src/monolith_component_master/coverage.py` | 505 | 88 |
| Added | `tests/component_master/registry/test_first_cohort_denominator.py` | 1,101 | 0 |
| Modified | `tests/component_master/registry/test_release.py` | 127 | 21 |

`git diff --shortstat 5e17afba..b50b0c96` → **6 files changed, 1,760
insertions, 110 deletions.**

Exactly the six paths the brief authorized. **No seventh path was taken.**
`evidence.py` was not modified; `releases.py` was not modified — see the stated
limitation in section 9, which is the one place that constraint cost something.
No owner governance-root, nested product-runtime, seed-data, verifier, export or
other product path was touched.

---

## 3. The third state

**Name chosen: `DECLARED_UNREAD`.**

Justification, in one sentence, as the docstring carries it: *declared by
somebody, unread by everybody* — a reader who has never seen this module cannot
read it as a weaker form of `REGISTERED`, and it cannot be confused with
`BLOCKED`, which means somebody tried to read a source and could not.

The gate reason is named after the state: `SOURCE_DECLARED_UNREAD`.

---

## 4. The literal `coverage_statement` the committed snapshot publishes

Taken from `python tools/connector_registry/check_coverage.py --root
data/component-master/registry/v1 --fail-on-unclassified`, in full:

> 0 of 0 discovered registry items classified; 0 of 0 counted as verified with
> backing evidence; 0 of 0 verified claims refused by the evidence gate; 0 of
> 14 named sources readable and hash-verified; 14 of 14 named sources declared
> but not yet read; 0 of 14 named sources blocked; 0 of 12 declared
> first-cohort brands with at least one source read. The registry root holds
> zero records, so this release covers nothing. The declared brands are a first
> cohort selected for review, not the connector market; a source named here has
> not been fetched, read, or rights-reviewed by this measurement. Measured by
> coverage.discover_registry_root over the named registry root; no figure here
> is a market-wide claim.

That sentence is what satisfies OR-9.1's binding constraint. The
declared-but-unread count is **spoken, in words, with its own denominator**,
and it sits between the hash-verified count and the blocked count so it cannot
be skimmed past. `14 of 14` and `0 of 12` are deliberately different numbers so
that a source count can never be mistaken for a brand count.

`14` is the number of URLs the plan's Step 3 table states **literally**. Two
plan cells name a further source in prose rather than as a URL — Lamello's
*"current OEM catalog linked there"* and Hoffmann's *"OEM product/machine
documents linked from the site"*. Neither was transcribed, because no URL for
either exists in the plan and inventing one would fabricate a source. This is
recorded in the test module's own comment, not only here.

---

## 5. The three schema decisions

### 5.1 The third state's row shape

A `DECLARED_UNREAD` row holds **exactly** `source_id`, `state`, `url`.

- **No `sha256`, and a supplied one is refused rather than ignored.** Nobody has
  read these bytes, so no digest exists; publishing one would be a claim nobody
  can check. The digest is required for the states that have bytes and refused
  for the state that does not — it is **not optional for everyone**, because an
  optional digest is exactly how a registered source silently loses its hash.
- **No `blocked_reason`.** Nothing has been attempted, so there is no reason to
  give. Admitting the field would let "nobody has tried" be written as "could
  not read", which is the collapse OR-9.1 exists to prevent.
- The refusal is enforced twice: at `SourceDenominatorEntry.__post_init__`, so
  no caller can construct the shape, and at the file reader, so the message
  names the file, the line, the field and the state.
- In the published payload the row carries **no `sha256` key at all**, rather
  than a null one. A null reads as "digest unknown"; the truth is that no digest
  can exist. Absence of the key says that; `null` would not.

`BLOCKED` is unchanged from Task 8: exactly `blocked_reason`, `sha256`,
`source_id`, `state`. `REGISTERED` is still refused from the file, with Task 8's
message.

### 5.2 The plan's seven concepts

**Silence was not used for any of them.** Each is answered in the module
docstring, which is where a future implementer will look.

| Concept | Decision | Reasoning |
| --- | --- | --- |
| publisher | **refused** | A property of a document somebody has read. It already has a home in `SourceSnapshot.publisher` in `evidence-manifest.jsonl`. The organisation behind a declared source is carried instead by `brand-universe.jsonl`, which claims the source by ID. |
| official URL | **admitted**, as `url` | A declared source with no locator names nothing anybody could later fetch. Must be a whitespace-free `https://` URL. **Recording a URL asserts nothing about what is behind it** — not that it resolves, not that it is current, not that its contents may be used. The validator's own error message says so. |
| edition when printed | **refused** | An edition is printed on a document nobody has read. Belongs in `SourceSnapshot.edition`, recorded at fetch time. |
| region | **deferred** | The region a catalogue *covers* is a fact about its contents; the region in a URL path is website routing. The plan's Global/EU, US and Thailand/ASEAN review scopes are a partition of sources that have been **read**, and belong to the task that reads them. |
| language | **refused** | Same argument as region, and it has no downstream home at all: `SourceSnapshot` carries no language field, so a task that needs one must add it there first — and `evidence.py` was outside Task 9's scope. |
| access date | **refused** | Nobody accessed these. An access date for an unfetched URL is a fabricated fact. |
| rights state | **refused** | **Recording a URL is not asserting a right to use what is behind it.** Rights review of these publishers has not happened and was explicitly out of scope. Belongs in `SourceSnapshot.rights_state`, after that review. |

`AuthorityBoundaryTests.test_the_declaration_holds_no_rights_or_access_claim`
asserts that none of the strings `rights_state`, `accessed_at`, `license`,
`publisher`, `edition`, `region`, `language` appears anywhere in the committed
`source-denominator.jsonl`, so the refusals cannot quietly reappear as data.

### 5.3 The brand row shape

A brand row holds **exactly** `brand_id`, `brand_name`, `source_ids` — a
nonempty array.

The load-bearing decision is that **the brand↔source link lives on the brand
row, not on the source row.** A `brand_id` field on the declared-source row was
written first and then rejected during implementation: only `DECLARED_UNREAD`
rows could carry it, so the moment Task 10 actually reads Häfele's page and the
source moves into `evidence-manifest.jsonl`, the link would be destroyed and
"which brands have a source read" would become uncomputable. On the brand row it
survives the transition, because a read source keeps its `source_id` in the
denominator.

A brand row is refusable, in six ways, each with its own test:

- unknown field, missing field, non-canonical `brand_id`, blank `brand_name`;
- empty `source_ids` — a brand that claims no source declares no work;
- duplicate `brand_id`, and duplicate `brand_name` (two IDs sharing one display
  name would make the published cohort count disagree with the names a reader
  can see).

Four cross-file invariants are enforced by `_require_brand_source_agreement`,
called **both** from `discover_registry_root`, where it can name the two files,
**and** from `CoverageSnapshot.__post_init__`, where it is an invariant of the
record. That double enforcement is deliberate: Task 8 wave 1 established that an
invariant living inside one caller is a convention, not an invariant.

- a brand claiming a source the denominator does not hold → refused;
- two brands claiming the same source → refused;
- a `DECLARED_UNREAD` source no brand claims → refused;
- the rule is **scoped to that state on purpose**: a `BLOCKED` source reaches
  the denominator from `evidence-manifest.jsonl`, where no brand is involved,
  so requiring a claim for it would refuse a shape the reader produces itself.
  `test_a_blocked_row_needs_no_brand` pins that.

---

## 6. The `sha256`-on-`BLOCKED` question

**Judged intended, with one recorded limitation that was deliberately not
fixed.**

It is intended, and it is what makes `BLOCKED` and `DECLARED_UNREAD` differ in
**shape** and not only in spelling. A `BLOCKED` row's `sha256` is *the digest
that was expected and could not be confirmed*. For a manifest-derived block it
is `SourceSnapshot.sha256` exactly as the manifest asserted it, carried through
unchanged by `_discover_sources` — it is the claim that failed, and a blocked
source with no such claim would be indistinguishable from one nobody tried. A
`DECLARED_UNREAD` row has no claim to carry, so requiring a digest there would
invent a fact. This is now documented in the module docstring under its own
heading, as the brief required for the "intended" answer.

**The limitation, recorded and not fixed:** for a `BLOCKED` row written directly
into `source-denominator.jsonl` rather than derived from the manifest, the
64-hex digest is a value this reader can **never** confirm against bytes,
because it holds none. Relaxing the requirement would weaken a check, which is
the standing red line, so it stands exactly as Task 8 left it. The
`DECLARED_UNREAD` state's no-digest rule was **not** extended to `BLOCKED` as a
side effect; `test_blocked_still_requires_its_digest` pins that it did not.

---

## 7. RED observed first-hand

Every RED below was run and watched in this session. **Nothing here is
reconstructed.** Where output is quoted it is copied from the terminal.

### RED 1 — `test_first_cohort_denominator`, before any implementation

Command, at `5e17afba` with the new test file written and no other change:

```
python -m unittest tests.component_master.registry.test_first_cohort_denominator -v
```

Observed, verbatim (tail):

```
test_first_cohort_denominator (unittest.loader._FailedTest.test_first_cohort_denominator) ... ERROR

======================================================================
ERROR: test_first_cohort_denominator (unittest.loader._FailedTest.test_first_cohort_denominator)
----------------------------------------------------------------------
ImportError: Failed to import test module: test_first_cohort_denominator
Traceback (most recent call last):
  File "...\unittest\loader.py", line 137, in loadTestsFromName
    module = __import__(module_name)
  File "...\tests\component_master\registry\test_first_cohort_denominator.py", line 33, in <module>
    from monolith_component_master.coverage import (  # noqa: E402
    ...<7 lines>...
    )
ImportError: cannot import name 'BrandUniverseEntry' from 'monolith_component_master.coverage' (...\coverage.py)

----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (errors=1)
```

### RED 2 — the plan's own Step 4 command, conflict reproduced live

With the two declaration files written and `coverage.py` still at `5e17afba`:

```
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified
```

Observed, verbatim:

```
error: brand-universe.jsonl:1: brand-universe.jsonl is recognized as denominator input, but no row schema for it is defined. This package holds no brand record type to validate a row against and CoverageSnapshot has no field to carry one, so an accepted row could only be discarded. Task 9 must define the brand-universe row schema and the field that carries it. A zero-record file is read and contributes nothing.
EXIT=2
```

**This is the plan-versus-implementation conflict the Task 8 closeout recorded,
observed rather than quoted.** The plan states *"Expected: exit 0."*

### RED 3 — `test_release`, same moment (declaration files present, no code change)

```
python -m unittest tests.component_master.registry.test_release
```

Observed: `Ran 177 tests` → `FAILED (failures=4, errors=7)`. The eleven names,
copied from the run:

```
ERROR: AuthorityBoundaryTests.test_release_does_not_claim_completeness
ERROR: BuildReleaseCliTests.test_check_coverage_main_returns_zero_for_the_live_root
ERROR: BuildReleaseCliTests.test_in_process_main_returns_zero_for_the_live_root
ERROR: LiveEmptyRegistryTests.test_committed_snapshot_matches_a_fresh_measurement
ERROR: LiveEmptyRegistryTests.test_empty_release_states_zero_coverage_not_by_omission
ERROR: LiveEmptyRegistryTests.test_release_over_the_empty_registry_succeeds
ERROR: LiveEmptyRegistryTests.test_the_empty_root_payload_digest_is_unchanged
FAIL: BuildReleaseCliTests.test_planned_invocation_over_the_live_root_exits_zero
FAIL: CheckCoverageCliTests.test_planned_invocation_over_the_live_root_exits_zero
FAIL: LiveEmptyRegistryTests.test_every_seed_is_a_zero_record_file (seed='brand-universe.jsonl')
FAIL: LiveEmptyRegistryTests.test_every_seed_is_a_zero_record_file (seed='source-denominator.jsonl')
```

### RED 4 — `test_release`, after `coverage.py` was implemented and before `test_release.py` was updated

```
python -m unittest tests.component_master.registry.test_release
```

Observed: `Ran 177 tests` → `FAILED (failures=7)`, with exactly the seven
contracts that had moved:

```
FAIL: DenominatorInputFileTests.test_a_nonblank_brand_row_is_refused_naming_what_is_missing
FAIL: GateReasonReachabilityTests.test_every_declared_reason_is_demonstrated_somewhere
FAIL: GateReasonReachabilityTests.test_the_discovery_reachable_set_is_exactly_as_declared
FAIL: LiveEmptyRegistryTests.test_committed_snapshot_matches_a_fresh_measurement
FAIL: LiveEmptyRegistryTests.test_every_seed_is_a_zero_record_file (seed='brand-universe.jsonl')
FAIL: LiveEmptyRegistryTests.test_every_seed_is_a_zero_record_file (seed='source-denominator.jsonl')
FAIL: LiveEmptyRegistryTests.test_the_empty_root_payload_digest_is_unchanged
```

The two `GateReasonReachabilityTests` failures are the derivation doing its job:
`SOURCE_DECLARED_UNREAD` had been added to the allowlist and had no
demonstration yet. The derivation refused the allowlist before a single line of
the reachability comment was edited.

### What was **not** RED-first, stated plainly

> **Corrected by the Task 9 fix wave (finding F5).** This section originally
> said *two* tests passed by construction. The diff adds **three**. The
> paragraph below is the corrected text; the original undercount is left
> described rather than erased, because the point of this section is that the
> disclosure be accurate, and a silent edit would defeat it.

**Three** tests were written after the implementation, not before it, and pass
on their first run by construction. No RED was observed for any of them.

1. `GateReasonReachabilityTests.test_an_undemonstrated_reason_fails_the_derivation`
2. `GateReasonReachabilityTests.test_a_wrongly_placed_reason_fails_the_discovery_derivation`
3. `LiveEmptyRegistryTests.test_the_declaration_files_are_the_only_nonempty_jsonl`

The first two do not test new behaviour; they demonstrate that the **existing**
derivation refuses a reason with no demonstration behind it, by patching the
module-level allowlist and asserting the derivation raises `AssertionError`.
The brief asked for confirmation that the guard still fails; that confirmation
is these two tests, not a watched RED.

The third asserts that `brand-universe.jsonl` and `source-denominator.jsonl`
are the only nonempty `*.jsonl` files at the registry root. It appears in
neither RED 3 nor RED 4 above, so it did not exist at either observation. It
was written alongside the rename of `test_every_seed_is_a_zero_record_file` to
`test_every_item_seed_is_a_zero_record_file`, to hold the half of that
contract the rename gave up, and it passed immediately.

The original report named only the first two. That was an inaccuracy of exactly
the class this lane exists to catch, and it is corrected here plainly rather
than minimised.

---

## 8. Verification, all from live runs at `b50b0c96`

Every number below came from a command run after the commit. None is retyped
from the Task 8 ledger.

| Check | Command | Result |
| --- | --- | --- |
| Full dynamic discovery | `python -m unittest discover -s tests -t .` | `Ran 784 tests` · `OK` |
| Registry directory | `python -m unittest discover -s tests/component_master/registry -t .` | `Ran 514 tests` · `OK` |
| `test_release` | `python -m unittest tests.component_master.registry.test_release` | `Ran 180 tests` · `OK` |
| `test_first_cohort_denominator` | `python -m unittest tests.component_master.registry.test_first_cohort_denominator` | `Ran 53 tests` · `OK` |
| Verifier | `python tools/verify_kitchen_kernel.py` | `overall_passed: true`, `check_count 13`, `passed_count 13`, `failed_count 0` |
| Plan Step 4, check | `check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified` | **exit 0** |
| Plan CLI, release | `build_release.py --root data/component-master/registry/v1 --version 0.1.0` | **exit 0** |
| Worktree | `git status --porcelain` | empty |

`PYTHONPATH` was set to
`C:\tmp\monolith-global-connector-registry-parent\packages\component-master\src`
for the unittest runs.

The verifier failed `git_established_repository_state` (12/13) while the six
paths were uncommitted, and passed 13/13 once they were committed. That is the
only verifier check that moved during Task 9 and it moved for that reason.

### Rebuilt snapshot

- `data/component-master/registry/v1/coverage-snapshot.json`: **6,895 bytes**,
  SHA-256 `2aa4b50a9da685783efd8aa2c7e3023d90b094dfe9d7905ca1b9e5abd4e4e0fb`,
  **zero CR bytes**.
- Pinned in **two** places, both as content-derived constants:
  `LiveEmptyRegistryTests.EMPTY_ROOT_PAYLOAD_SHA256` /
  `EMPTY_ROOT_PAYLOAD_BYTE_COUNT` in `test_release.py`, and
  `DeterminismOverDeclaredInputTests.LIVE_PAYLOAD_SHA256` /
  `LIVE_PAYLOAD_BYTE_COUNT` in the new suite.
- `test_a_fresh_build_reproduces_the_committed_file_byte_for_byte` asserts a
  fresh `build_snapshot` payload equals the committed file **with no
  normalization**. Task 8's version of this comparison normalized `\r\n` away;
  that normalization was removed, because `51c6428b` pinned `*.json -text`
  inside this directory and normalizing here would hide exactly the failure that
  pinning exists to prevent. **This is a tightened check, not a relaxed one.**
- Determinism over the now-non-empty input: two separate processes under
  `PYTHONHASHSEED=random` produce identical bytes and the same
  `payload_sha256`, and reversed declaration order produces identical bytes.
  Both are asserted, and the two-process test additionally asserts the pinned
  digest.

### Worktree digests at `b50b0c96` (first sixteen hex characters)

| File | Bytes | SHA-256 (16) | CR bytes |
| --- | ---: | --- | ---: |
| `brand-universe.jsonl` | 1,430 | `77e006aca245553e` | 0 |
| `source-denominator.jsonl` | 2,172 | `c685b706bfad57e7` | 0 |
| `coverage-snapshot.json` | 6,895 | `2aa4b50a9da68578` | 0 |
| `coverage.py` | 78,165 | `bf1f2d0d7b180628` | 0 |
| `test_release.py` | 123,676 | `32391e79b4107314` | 0 |
| `test_first_cohort_denominator.py` | 40,792 | `9ebc992ee6ed6ee3` | 0 |
| `.superpowers/sdd/task-9-brief.md` (accepted brief) | 10,898 | `dee3a9380b0927af` | 0 |
| `.superpowers/sdd/task-9-denominator-review-package.diff` | 105,512 | `9ec5c6e2e74dcaba` | 0 |

**These digests are worktree digests on this host and are not portable.** They
are computed over the bytes in this working tree; a clone on a machine with a
different `core.autocrlf` will reproduce the two `.jsonl` and the `.json` (those
globs are pinned by `.gitattributes` in that directory) but **not** the three
`.py` files or the two `.superpowers` files, which are outside the pinned scope.

### Counted claims, with the command and the scope searched

| Claim | Command | Scope | Result |
| --- | --- | --- | --- |
| Zero coverage items in the registry root | `build_snapshot(...)` via `check_coverage.py` | `data/component-master/registry/v1`, recursive | `discovered_item_count: 0` |
| Only the two declaration files hold records | Python glob over `*.jsonl`, counting nonblank lines | `data/component-master/registry/v1/*.jsonl` | `bom-edges 0`, `brand-universe 12`, `compatibility-edges 0`, `evidence-manifest 0`, `materials 0`, `qualification-envelopes 0`, `source-denominator 14` |
| Zero CR bytes in any Task 9 file | Python `bytes.count(13)` per file | the six Task 9 paths plus the two artifacts | 0 in every file (table above) |
| No production/manufacturing/completeness claim | `grep -rniE "production.ready\|manufactur\|first.article\|qualified for\|worldwide\|complete registry"` | the six Task 9 paths | 10 hits, **all of them denials or test assertions that the string is absent**; zero are claims |
| Zero test deletions | `git diff 5e17afba..b50b0c96 -- tests/.../test_release.py \| grep -E "^[-+] *def test_"` | `test_release.py` | 2 renamed (`test_a_nonblank_brand_row_...` → `test_a_brand_row_off_the_schema_...`, `test_every_seed_...` → `test_every_item_seed_...`), 3 added, **0 removed outright** |

`test_release.py` went from 177 to 180 tests: three additions (two derivation
guards, one nonempty-file assertion) and two renames whose bodies were rewritten
because the contract they pinned had moved.

---

## 9. Stated limitations

Each of these bounds what the Task 9 evidence supports. None is softened.

- **The release payload does not enumerate the brand universe or the two new
  counts.** `releases.snapshot_payload` names the fields it publishes one by
  one, and `releases.py` was **not** among the six authorized paths. The payload
  therefore carries every declared source row (each with its `state` and `url`)
  and the full rendered `coverage_statement` — which includes both new clauses,
  in words — but it does **not** carry `brand_universe`,
  `declared_unread_source_count` or `first_cohort_brand_count` as payload
  entries of their own, and the twelve brand **names** appear nowhere in the
  release payload. This was a scope decision, not an oversight: extending
  `snapshot_payload` would have been a seventh path, and the brief says stop and
  report rather than widen. It is recorded in the module docstring as well as
  here. **A reviewer or the owner should decide whether this warrants a
  follow-up wave with `releases.py` explicitly granted.**
- **The URLs are unvisited.** Repeated because it is the single most misreadable
  fact in this task. No check in this lane establishes that any of the fourteen
  resolves, is the current edition, or may lawfully be read or indexed.
- **The brand and source IDs are constructed, not sourced.** `brand:hafele`,
  `source:hafele:connectors-index` and the rest were chosen by the implementer
  to satisfy the canonical-ID pattern. No vendor, standard or prior artifact
  assigns them. They are identifiers, not facts about the world.
- **The brand display names are transcriptions of the plan's table**, including
  `Välinge/Threespine` and `Hoffmann Machine Company`. They are not verified
  against any company's own registered trading name. The plan's Step 3 table
  writes `Hoffmann` where the brief's brand list writes `Hoffmann Machine
  Company`; the brief's spelling was used, because the brief is binding.
- **Two plan sources have no URL and were not invented.** Lamello's "current
  OEM catalog linked there" and Hoffmann's "OEM product/machine documents
  linked from the site" are not represented. A later task that wants them must
  supply real URLs.
- **`first_cohort_brand_count` is 0 of 12 and will stay 0 until a source is
  actually fetched, hashed and declared in `evidence-manifest.jsonl`.** It is
  computed from `REGISTERED` sources intersected with each brand's claimed
  `source_ids`, so it depends on a later task keeping the `source_id` stable
  when it moves a source from declaration to manifest. That dependency is real
  and is not enforced by anything in this commit.
- **Determinism was proven on one interpreter and one operating system**:
  CPython 3.14.2 on Windows 11, on this host. Byte identity was confirmed across
  separate processes, under `PYTHONHASHSEED=random`, and across reversed input
  order. Cross-platform and cross-interpreter byte identity remains unproven,
  exactly as Task 8 recorded.
- **A case-sensitive filesystem was never exercised.** Task 8's recorded
  exposure is unchanged.
- **`Path.rglob` still does not follow directory symlinks**, so a symlinked
  subdirectory inside the registry root is still not measured. Recorded, not
  fixed; unchanged from Task 8.
- **A file at the registry root that is not `*.jsonl` is still skipped
  silently.** Task 8 recorded this and Task 9 did not close it. There is a test
  — `test_a_json_near_miss_is_outside_the_readers_input_glob` — that documents
  the behaviour, but no refusal.

  > **Corrected by the Task 9 fix wave (finding F8).** This bullet originally
  > said a `brand-universe.json` typo *"would be read by nothing and reported by
  > nothing."* **That is wrong**, and it overstated the gap. Measured live
  > against the module as committed at `b50b0c96`, on a root holding one brand
  > and one declared source:
  >
  > | Case | Result |
  > | --- | --- |
  > | both filenames correct | accepted, 1 brand and 1 source measured |
  > | `brand-universe.json` typo | **refused**: *"source:hafele:index is declared DECLARED_UNREAD but no row of brand-universe.jsonl claims it"* |
  > | `source-denominator.json` typo | **refused**: *"brand:hafele claims source:hafele:index, which source-denominator.jsonl does not declare"* |
  > | **both** typo'd at once | silent: 0 brands, 0 sources |
  >
  > Once either sibling holds rows, `_require_brand_source_agreement` catches a
  > single typo loudly and in both directions. Only a **simultaneous double
  > typo** is silent, and then the root reads as one that declares nothing at
  > all. The residual `items.json` case is unchanged from Task 8 and stays
  > unfixed; that remains the right call, because closing it means deciding
  > what a stray file at the root *means*.
- **The census families remain hand-constructed.** They bound the rules against
  imagined shapes, not against real vendor data.
- **This report is unreviewed.** No independent review of Task 9 had been run at
  the time of writing.
- **The Task 1 baseline manifest's 77 unreproducible digests remain open and
  unruled.** Not Task 9's.

---

## 10. Found and deliberately not fixed

- **The `sha256`-on-file-declared-`BLOCKED` weakness**, section 6. Reported, not
  fixed, because the fix direction is a relaxed check.
- **The Task 8 ledger says the reachability table has "a mutation-tested
  guard".** At `5e17afba` no such test existed:
  `grep -n "mock.patch\|mutation\|guard" tests/component_master/registry/test_release.py`
  returned only two unrelated `mock.patch.object(os, "link", ...)` uses and two
  `# pragma: no cover - guard` comments. The derivation itself was real and did
  catch the new reason unprompted (RED 4), so the ledger's substance held; the
  word "mutation-tested" did not. Task 9 added the two guard tests that make the
  phrase true going forward, and records the discrepancy here rather than
  silently fixing the ledger, which is not Task 9's file to edit.
- **`releases.snapshot_payload` not extended**, section 9. Reported as a scope
  boundary rather than crossed.
- **The non-`.jsonl` silent-skip gap** at the registry root, inherited from Task
  8 and now marginally more consequential. Not fixed, because closing it means
  deciding what a stray file at the root *means*, which is a contract decision
  outside this brief.

---

## 11. Artifacts

- This report: `.superpowers/sdd/task-9-denominator-report.md`.
- Review package: `.superpowers/sdd/task-9-denominator-review-package.diff` —
  105,512 bytes, 6 `diff --git` headers, exactly the six Task 9 paths.
  `git apply --reverse --check` against it at `b50b0c96` **passed**.
- `.superpowers/` is gitignored, so both artifacts are untracked by design and
  the worktree is clean with them present.
