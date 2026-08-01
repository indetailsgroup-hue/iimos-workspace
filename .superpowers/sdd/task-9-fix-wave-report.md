# Task 9 fix waves — report

**Status:** implementation complete, not reviewed.
**Branch:** `codex/global-connector-registry`. No push, merge, rebase, reset,
restore or branch change was performed.

This report covers **all three** fix waves over Task 9:

| Wave | Commit | Subject |
| --- | --- | --- |
| Wave 1 | `b7cd54ab` | `fix(registry): make a release digest attest the cohort it measured` |
| Wave 2 | `277d508b` | `fix(registry): guard the class, not the three named instances` |
| Wave 3 | `79e76062` | `fix(registry): narrow every claim to what a test can attack` |

Wave 2's base is `45302686`, the docs-only ledger commit that sits on top of
wave 1. Wave 3's base is `277d508b`.

**Wave 3 exists because wave 2 committed, inside its own fixes, the defect
shape it was convened to close** — a fix applied to the named instance while
its prose generalises to the class. Sections 11 to 15 are wave 3's; sections 2
to 10 are left as wave 2 wrote them **except** where wave 3 corrects them, and
every correction is marked in place rather than made silently. The corrections
are: §4's claim that a name with nothing visible in it needs no separate check
(false — see §11.1), §3's residual list (incomplete — see §11.3), and §6's
count of wave 1's pass-by-construction tests (§6 says 7 from a proxy; the
adjudicated answer is 8 — see §11.4).

Wave 1 shipped without a report artifact of its own; its
pass-by-construction disclosure existed only in the implementer's chat
response, which is not a file. `.superpowers/sdd/task-9-denominator-report.md`
carries only the `b50b0c96` disclosure. This file closes that gap for wave 2
and does what can still be done for wave 1: **section 6 gives wave 2's list
first-hand, and wave 1's by measurement against the pre-wave source, with the
method stated and a disagreement with the brief's count reported rather than
smoothed over.**

This report is a **claim, not evidence**. An independent reviewer should read
the diff and re-run every command below. Every figure here was taken from a
live run during this session; none was retyped from a brief, a plan, or a
previous report.

---

## 0. What this does not claim

Nothing here is a production, manufacturing, freeze, export or release
authority claim, and nothing establishes physical qualification, coupon
testing, machine capability, first-article inspection, field validation or
owner ratification. `NOT-FOR-PRODUCTION` remains active.

**Twelve brands are a first cohort selected for review, not the connector
market and not a complete registry.** The fourteen declared URLs remain
**unvisited**: not fetched, not confirmed reachable, not confirmed current,
not rights-reviewed. Nothing in this lane has looked at any of them, and
nothing in this wave establishes that any of them belongs to the brand whose
row names it.

---

## 1. Exact tracked scope of wave 2

`git diff --numstat 45302686..277d508b`, run live after the commit:

| Path | + | − |
| --- | ---: | ---: |
| `data/component-master/registry/v1/coverage-snapshot.json` | 1 | 1 |
| `packages/component-master/src/monolith_component_master/coverage.py` | 303 | 26 |
| `packages/component-master/src/monolith_component_master/releases.py` | 25 | 1 |
| `tests/component_master/registry/test_first_cohort_denominator.py` | 930 | 2 |
| `tests/component_master/registry/test_release.py` | 2 | 2 |

`git diff --shortstat` → **5 files changed, 1,261 insertions, 32 deletions**,
plus this report and the regenerated review package, which are the sixth and
seventh authorized paths. The brief authorized eight; the eighth,
`.superpowers/sdd/task-9-denominator-report.md`, received a one-paragraph
digest correction because its existing banner now names a stale digest.
**No ninth path was taken.** `evidence.py` was not modified. No owner
governance-root, nested product-runtime, seed-data, verifier, export or other
product path was touched.

### `.superpowers/` is gitignored, and that matters for this report

`.gitignore:21` ignores `.superpowers/`. Only the four
`global-connector-registry-progress.*` files under `.superpowers/sdd/` are
tracked; every brief, report and review package in that directory — including
**this file** — is an untracked working-tree artifact that no commit carries.
That is the mechanical reason wave 1's disclosure could vanish, and writing
this report does not by itself fix it. A reader should treat these artifacts as
files on one machine, not as repository content, and the owner may want to
decide whether the SDD artifacts belong inside the ignore rule at all. **That
decision is not this wave's to make and was not made here.**

`.superpowers/sdd/task-9-denominator-review-package.diff` was **regenerated in
place**, as the brief's scope directs, so it now holds wave 2's diff rather
than wave 1's; creating a second filename would have been a ninth path. Wave
1's package was not in git and therefore could not be preserved by committing
it, but it is **exactly reconstructible**, which was verified rather than
assumed:

```
git -c core.autocrlf=false diff b50b0c96 b7cd54ab -- \
  data/component-master/registry/v1/coverage-snapshot.json \
  packages/component-master/src/monolith_component_master/coverage.py \
  packages/component-master/src/monolith_component_master/releases.py \
  tests/component_master/registry/test_first_cohort_denominator.py \
  tests/component_master/registry/test_release.py
```

reproduces 1,189 lines with the five `diff --git` headers at lines 1, 8, 320,
389 and 1,070 — identical to the file it replaced. Wave 2's package is the
same command with `45302686` and the working tree.

---

## 2. G1 — one `MeasuredCount` was still dropped

### The measurement, before and after

Both runs are live, over the committed registry root, with the same script.
The comparison is the record's own enumeration
(`{c.label for c in snapshot.counts}`) against every count-shaped object
reachable anywhere inside `releases.snapshot_payload`.

**Before (at `45302686`):**

```
MeasuredCount labels on the record             : 25
labels with no count object in the payload     : ['verified_items_with_backing_evidence']
labels whose text is absent from the payload   : ['verified_items_with_backing_evidence']

verified_item_count = MeasuredCount(label='verified_items_with_backing_evidence', count=0, denominator=0, denominator_label='discovered_items', measured_by='coverage.evaluate_evidence_gate')
'verified_items_with_backing_evidence' in payload : False
'classification.VERIFIED' in payload              : True
payload key count: 19
```

**After (this commit):**

```
MeasuredCount labels on the record             : 25
labels with no count object in the payload     : []
labels whose text is absent from the payload   : []

verified_item_count = MeasuredCount(label='verified_items_with_backing_evidence', count=0, denominator=0, denominator_label='discovered_items', measured_by='coverage.evaluate_evidence_gate')
'verified_items_with_backing_evidence' in payload : True
'classification.VERIFIED' in payload              : True
payload key count: 20
```

### The class-level guard, which is the actual deliverable

`PayloadCountCompletenessTests` compares the two enumerations **in both
directions**, over four differently shaped roots (the live root, a root with a
backed VERIFIED item, a root whose VERIFIED item names a source nobody has
read, and a root with a blocked source):

- `test_every_measured_count_on_the_record_reaches_the_payload`
- `test_the_payload_publishes_no_count_the_record_does_not_hold`

The payload side is computed by a **recursive walk** for objects carrying all
five `MeasuredCount` keys, not by a lookup over known key names — the defect
being guarded against is precisely a count nobody remembered to look for. The
walk finds counts nested inside `classification_counts` and
`dimension_verified_counts` as readily as top-level ones and needs no edit
when a count moves.

`test_the_guard_is_not_vacuous` pins that the record really holds 25 labels
and that the walk finds all 25, so the equality above cannot be satisfied by
two empty sets.

### Why it is not substitutable, measured rather than argued

`test_it_is_not_substitutable_by_the_classification_count` builds a root whose
only VERIFIED item names a `DECLARED_UNREAD` source, and asserts from the live
payload:

```
classification_counts["VERIFIED"]["count"] == 1     measured_by coverage.discover_registry_root
verified_item_count["count"]              == 0     measured_by coverage.evaluate_evidence_gate
```

Different label, different `measured_by`, and a different number. The "a
consumer can recompute it" defence was not available and was not used: wave 1
rejected exactly that defence for `declared_unread_source_count`.

### What was aggravating about it, and what was done about that

`EXPECTED_PAYLOAD_KEYS` pinned 19 keys under the comment *"a silently removed
key is a silently narrowed attestation"* and froze the incompleteness behind a
test that reads as an authority.
`test_the_published_source_counts_partition_the_denominator` filters on
`denominator_label == "sources_in_denominator"` and structurally could not see
a count whose denominator is `discovered_items`.

Both tests are kept and both now pass. The pinned list gained a comment
saying, in the file, that **it records what is published and cannot prove the
list complete**, and naming the class-level test as the thing that actually
forbids a dropped count. The same correction is made in `snapshot_payload`'s
docstring, which now says four rather than three and says why the count was
wrong.

### Payload key list, live

```
authority_state, blocked_source_count, blocked_sources, brand_universe,
classification_counts, classified_item_count, coverage_statement,
declared_unread_source_count, dimension_verified_counts,
discovered_item_count, evidence_gate_findings, first_cohort_brand_count,
items, registered_source_count, schema, source_denominator,
unbacked_verified_item_count, unclassified, unclassified_item_count,
verified_item_count
```

Twenty keys.

---

## 3. G2 — the URL rule: userinfo, the percent grammar, and the residual list

**The RFC 3986 character-set decision itself was not reopened.** This is about
its stated completeness.

### What is now refused

Two refusals were added, both derived from RFC 3986 section 3.2 and section
2.1 rather than from the character set, because every character involved was
already admitted:

1. **Userinfo in the authority.** `https://www.hafele.com@evil.invalid/` reads
   as Häfele to a reviewer and as `evil.invalid` to every fetcher. The refusal
   names both parts, so a reader is told which host a fetcher would reach.
2. **An authority that names no host** — `https:///path`, `https://?a=1`.
   This falls out of parsing the authority at all, and a locator with no host
   locates nothing. It is a refusal the brief did not ask for by name; it is
   included because writing a function that parses the authority and then
   deliberately ignores an empty one is the same "fix the instance, not the
   class" shape this wave exists to remove.
3. **A `%` that introduces no escape.** RFC 3986 section 2.1 requires exactly
   two hexadecimal digits. `%zz`, `%e` at end of string, a trailing bare `%`
   and `%/` were all admitted before.

### The percent-escape decision, stated with its reason

**An escape whose octet is a C0 control (`%00`–`%1F`) or `%7F` is refused.**
The unencoded character is refused by the character set, so admitting its
escaped spelling would make the rule turn on how the same octet happens to be
written, which bounds nothing. `%00` in particular truncates for any consumer
that hands the string to a C string API.

**Every other well-formed escape is admitted, including one that decodes to a
non-ASCII byte.** This is deliberate and it is why a blanket refusal was
rejected:

- RFC 3986 requires exactly this form for a non-ASCII byte;
- `_require_declared_url`'s own refusal message instructs a writer to use it;
- a blanket refusal would refuse `https://example.invalid/caf%C3%A9`, which is
  a committed admitted control in the test suite.

The cost is named in the residual list rather than left to be discovered.

### The corrected residual list, quoted exactly as written

From `_require_declared_url`'s docstring:

> **What this does not close, stated rather than claimed.** Each of these is
> still admitted, and each is exercised by
> `tests.component_master.registry.test_first_cohort_denominator.DeclaredUrlResidualTests`
> so that this list cannot drift from the code in either direction.
>
> - Confusables inside the admitted set: `1` against `l`, `0` against
>   `O`, `rn` against `m`. All ASCII, all admitted, and each can still
>   make a reviewer read one host while a fetcher reaches another.
> - **A percent-escape that decodes to an invisible or homograph character**,
>   such as `https://exam%E2%80%8Bple.invalid/x`. It is admitted by the
>   decision recorded above. It is a *lesser* residual than the raw
>   character, because `%E2%80%8B` is nine visible ASCII characters that a
>   character-for-character transcription check does show — but it is a
>   residual, and it is named here rather than left to be discovered.
> - **The host is not parsed, resolved, or checked against the publisher it
>   appears to name.** `https://www.hafele.com.evil.invalid/x` puts the
>   brand in a subdomain label and `https://evil.invalid/www.hafele.com/`
>   puts it in the path; both are ordinary admitted strings and this rule
>   cannot see either. After userinfo is closed this is the strongest
>   remaining member of the same family, and it is not closable by a
>   character rule at all. **Nothing here resolves a host, contacts one, or
>   establishes that any of the fourteen committed URLs belongs to the brand
>   whose row names it.**

> **Corrected by wave 3 (H3). The list above was incomplete and the rule
> underneath it did not do what it said.** Two entries were added:
> `https://www.hafele.com%40evil.invalid/`, which was admitted and unlisted;
> and the fact that the host is checked for being present and never for being
> well formed. Separately, the sentence *"An authority that names no host at
> all is refused"* was implemented as `if not authority:` — the authority
> *string* — so `https://:8443/x`, `https://:80` and `https://:/x` were all
> admitted. See §11.3.

Each of the six named residual cases is **asserted still admitted** by
`test_every_named_residual_is_genuinely_still_admitted`, so the list cannot be
wrong in either direction: a case that quietly became refused fails the test,
and the docstring would then be claiming a weakness it no longer has. Wave 3
takes that list to nine.
`test_the_docstring_names_each_residual_class` asserts the five phrases are in
the docstring, so the statement and the behaviour land in one commit. Neither
test asserts the list is exhaustive and nothing here claims it is.

### Live before/after

```
                                    before        after
https://www.hafele.com@evil.invalid/products/   ACCEPTED  ->  refused
https://www.blum.com:pass@203.0.113.9/x         ACCEPTED  ->  refused
https://example.invalid/%zz                     ACCEPTED  ->  refused
https://example.invalid/%e                      ACCEPTED  ->  refused
https://example.invalid/x%                      ACCEPTED  ->  refused
https://example.invalid/%00                     ACCEPTED  ->  refused
https://example.invalid/a%0Ab                   ACCEPTED  ->  refused
https://exam%E2%80%8Bple.invalid/x              ACCEPTED  ->  ACCEPTED  (recorded residual)
https://example.invalid/a%20b                   ACCEPTED  ->  ACCEPTED  (control)
https://example.invalid/x                       ACCEPTED  ->  ACCEPTED  (control)
```

### The fourteen committed URLs

Byte-unchanged. `source-denominator.jsonl` is 2,172 bytes, SHA-256 prefix
`c685b706bfad57e7`, identical to the figure recorded at `b50b0c96`.
`test_the_committed_fourteen_are_unaffected_by_this_wave` compares each URL
against the transcription table, asserts none contains `@` or `%`, and
re-admits each through `SourceDenominatorEntry`.

---

## 4. G3 — `brand_name` admitted exactly the class `url` refuses

### The category list and the normalisation form

Refused, by Unicode **general category**, never by an ASCII allowlist:

| Category | What it is | Why it is refused |
| --- | --- | --- |
| `Cc` | control | renders as nothing; a name padded with one prints identically to another and counts as a second brand |
| `Cf` | format | same, and **every character with the Unicode `Bidi_Control` property — U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069 — is `Cf`**, so refusing `Cf` refuses the bidi controls |
| `Cn` | unassigned | this Unicode release gives it no meaning; it renders differently on every reader's machine |
| `Co` | private use | its appearance is defined by a font vendor |
| `Cs` | surrogate | defined by nothing; a lone surrogate cannot be encoded as UTF-8 and could never reach a release |
| `Zl` | line separator | a display name that renders as two lines is not a name a reader can count |
| `Zp` | paragraph separator | the same, and this package's own JSONL serializer emits both raw |
| `Zs` except U+0020 | every other space | `Festool` + U+00A0 + `DOMINO` renders exactly like the U+0020 spelling and would sit beside it as a second brand |

`Zs`-except-U+0020 is not in the brief's four named classes. It is included
because the fix's own prose says two spellings of one name must collide, and
leaving U+00A0 admitted would have made that prose false — which is the exact
failure shape this wave exists to remove.

**A name that is empty once the invisibles are removed needs no separate
check**, and deliberately does not get one: each of its characters is refused
individually, and a name of ordinary spaces is already refused as blank by
`_require_string`. A check that can never fire is the thing this module's own
docstrings criticise.

> **Corrected by wave 3 (H1). The paragraph above was false when written.**
> "The invisibles" was `Cc` and `Cf`; `'ㅤㅤㅤ'` (U+3164 ×3, category `Lo`) was
> a brand at `277d508b`, reproduced first-hand, and so were `Häfele` padded
> with U+3164, U+115F, U+2800, U+034F or U+FFA0. The paragraph's reasoning —
> *each of its characters is refused individually* — was sound; its premise
> about which characters those are was not. The table above is likewise
> correct about the categories it lists and wrong to have been read as the
> class. See §11.1.

> **Corrected by wave 3 (H1). The `Zs`-except-U+0020 row's own argument was
> false one character away from the case it argues.** `Festool DOMINO` and
> `Festool DOMINO ` — the same name with a trailing **U+0020** — were two
> brands at `277d508b`. See §11.2.

**Normalisation form: NFC**, applied in `BrandUniverseEntry.__post_init__`,
and **the composed form is what the record keeps**. A name is a rendered
thing, so two encodings of one rendering are one name. Normalising in the
constructor rather than at each comparison is what makes both duplicate
checks — `brand-universe.jsonl`'s reader and `CoverageSnapshot` — answer the
same question without either knowing about it, and it means the released bytes
carry one spelling per name.

### Proof the twelve committed names are unaffected

Measured live over the committed root:

```
committed brand count: 12
  brand:blum                     'Blum'                     NFC-stable=True  categories=['Ll','Lu']
  brand:festool-domino           'Festool DOMINO'           NFC-stable=True  categories=['Ll','Lu','Zs']
  brand:hafele                   'Häfele'                   NFC-stable=True  categories=['Ll','Lu']
  brand:hettich                  'Hettich'                  NFC-stable=True  categories=['Ll','Lu']
  brand:hoffmann-machine-company 'Hoffmann Machine Company' NFC-stable=True  categories=['Ll','Lu','Zs']
  brand:italiana-ferramenta      'Italiana Ferramenta'      NFC-stable=True  categories=['Ll','Lu','Zs']
  brand:knapp                    'KNAPP'                    NFC-stable=True  categories=['Lu']
  brand:lamello                  'Lamello'                  NFC-stable=True  categories=['Ll','Lu']
  brand:lockdowel                'Lockdowel'                NFC-stable=True  categories=['Ll','Lu']
  brand:ovvo                     'OVVO'                     NFC-stable=True  categories=['Lu']
  brand:titus                    'Titus'                    NFC-stable=True  categories=['Ll','Lu']
  brand:valinge-threespine       'Välinge/Threespine'       NFC-stable=True  categories=['Ll','Lu','Po']

Zs code points inside the twelve committed names: ['U+0020']
```

No name touches any refused category; every `Zs` present is U+0020; all twelve
are already NFC, so normalisation is a no-op on them.
`brand-universe.jsonl` is byte-unchanged: 1,430 bytes, SHA-256 prefix
`77e006aca245553e`, identical to the figure recorded at `b50b0c96`.
`test_the_twelve_committed_names_are_admitted_unchanged` asserts each name
against the transcription table, re-admits it through the type, and asserts
NFC stability.

Non-vacuity controls: `Häfele`, `Välinge/Threespine`, `Festool DOMINO`,
`KNAPP`, `Italiana Ferramenta`, and — outside the cohort, on purpose —
`ニチハ` and `Wilh. Schütte & Co.` are all asserted still admitted. The rule
is about invisible and unassigned characters, not about scripts.

### The NFC collision, live before and after

```
NFC='Häfele' len=6   NFD='Häfele' len=7   equal=False

before: -> two brands whose names render identically coexist; cohort denominator = 2
after : -> refused: duplicate brand_name
```

Refused in both places: `brand-universe.jsonl:2` names the offending line, and
`CoverageSnapshot` refuses the same shape for a caller that never went through
a file.

### Stated residual for G3

**A homograph brand name is still admitted**, and this is deliberate rather
than an oversight. `Blуm` with a Cyrillic *у* is accepted. Refusing it would
mean an ASCII allowlist, which the brief explicitly rules out and which would
refuse three of the twelve committed names. This is a genuine asymmetry with
the `url` rule and it is recorded here rather than in neither place: `url` is
ASCII-only because a URL is a machine locator, and `brand_name` is not because
a brand name is a human name in whatever script its owner uses.

`brand_id` and `source_ids` were left alone. They go through
`_require_canonical_id`, which was verified safe by the brief and re-verified
by the existing suite.

---

## 5. G4 — the anchor's resolved path, and the Windows junction

### The check-then-open fix

Both call sites discarded `_require_inside_root`'s return value and re-opened
the unpinned argument. Both now read the resolved path:

- `_discover_sources` binds `resolved_manifest` and passes it to `_read_jsonl`
  with an explicit label, so a refusal still names the file a reader has to
  edit even when the resolved name differs.
- `discover_registry_root` binds `resolved` and carries it into `item_files`
  and `denominator_files`. The two filename checks stay on the **listed**
  name, because where a file sits in the root is what the filename contract is
  about, while what gets read is the path the anchor decided about.

Proven behaviourally rather than structurally.
`AnchorResolvedPathTests.redirect` patches `_require_inside_root` to return a
*different but still-inside* path; if a caller re-opens its own argument the
redirect has no effect at all. Three tests cover the three readers (item file,
source manifest, denominator input) and all three were RED before the change.

**Recorded, not claimed closed.** Resolving and then opening still leaves a
rename of a directory component of the resolved path between the two calls
unaccounted for. Closing that needs an open-then-verify against the opened
handle, which this reader does not do. The severity stays low: reaching the
window needs write access to the registry root, which already permits
arbitrary content.

### Windows directory junction versus directory symlink

Measured first-hand on this host, not transcribed:

```
mklink /J                     rc: 0
junction.is_symlink()       : False
os.path.islink(junction)    : False
rglob(*.jsonl) sees         : [..., 'nested/smuggled.jsonl', ...]
descends the junction       : True
discover_registry_root      : refused -> nested/smuggled.jsonl: this file resolves to
                              ...\outside\smuggled.jsonl, outside the registry root ...\v1

symdir.is_symlink()         : True
descends the symlinked dir  : False
```

So the two are opposite facts, and the record previously stated only the
symlink one:

- **directory symlink** — `is_symlink() == True`, `rglob` does not descend,
  files inside go **unmeasured**. Unexplored, not handled; the anchor cannot
  close it, because the anchor refuses files that are listed and lead outward
  and an unfollowed directory is never listed.
- **Windows directory junction** — `is_symlink() == False`, `rglob` **does**
  descend, and the anchor is what refuses each file inside **by name**.

Both are now recorded in the module docstring and in
`_require_inside_root`'s docstring, and both are asserted by
`WindowsDirectoryJunctionTests`, which skips on non-Windows hosts.

---

## 6. RED observed first-hand, and the complete pass-by-construction list

### Wave 2 RED

Command, at `45302686` with the new tests written and **no** implementation
change:

```
python -m unittest tests.component_master.registry.test_first_cohort_denominator
```

Observed, verbatim (tail):

```
Ran 117 tests in 1.790s

FAILED (failures=96, errors=2)
```

The 96 failures and 2 errors are 25 distinct new test methods (most carry
`subTest` cases, each counted separately) plus the pre-existing
`test_the_payload_key_list_is_exactly_as_declared`, which went RED from the
pin edit. Each new test method was then run **individually** at that same
tree, and the classification below is that run's output, not a reconstruction:

**RED, observed (25):**

```
AnchorResolvedPathTests.test_a_denominator_input_file_is_read_from_the_resolved_path
AnchorResolvedPathTests.test_an_item_file_is_read_from_the_resolved_path
AnchorResolvedPathTests.test_the_residual_is_recorded_rather_than_claimed_closed
AnchorResolvedPathTests.test_the_source_manifest_is_read_from_the_resolved_path
BrandNameCharacterClassTests.test_a_name_that_is_empty_once_the_invisibles_go_is_refused
BrandNameCharacterClassTests.test_each_refused_category_is_named_by_the_refusal
BrandNameCharacterClassTests.test_the_type_refuses_them_too_not_only_the_file_reader
BrandNameNormalizationTests.test_the_docstring_states_the_categories_and_the_form
BrandNameNormalizationTests.test_the_published_bytes_carry_the_composed_form
BrandNameNormalizationTests.test_the_record_stores_the_composed_form
BrandNameNormalizationTests.test_two_spellings_of_one_name_are_refused_in_the_file
BrandNameNormalizationTests.test_two_spellings_of_one_name_are_refused_on_the_record
DeclaredUrlAuthorityTests.test_an_authority_that_names_no_host_is_refused
DeclaredUrlAuthorityTests.test_the_refusal_names_the_host_a_fetcher_would_reach
DeclaredUrlAuthorityTests.test_the_type_refuses_userinfo_too_not_only_the_file_reader
DeclaredUrlAuthorityTests.test_userinfo_is_refused_in_the_authority
DeclaredUrlPercentGrammarTests.test_a_malformed_escape_is_refused
DeclaredUrlPercentGrammarTests.test_an_escape_decoding_to_a_control_is_refused
DeclaredUrlPercentGrammarTests.test_the_type_refuses_a_malformed_escape_too
DeclaredUrlResidualTests.test_the_docstring_names_each_residual_class
PayloadCountCompletenessTests.test_every_measured_count_on_the_record_reaches_the_payload
PayloadCountCompletenessTests.test_it_is_not_substitutable_by_the_classification_count
PayloadCountCompletenessTests.test_the_guard_is_not_vacuous
PayloadCountCompletenessTests.test_the_headline_count_is_published_by_name
PayloadCountCompletenessTests.test_the_payload_publishes_no_count_the_record_does_not_hold
```

Plus, in the same run and in the same file:

```
PayloadAttestsTheDeclaredCohortTests.test_the_payload_key_list_is_exactly_as_declared
```

The G1 failure text, verbatim:

```
AssertionError: Items in the first set but not the second:
'verified_items_with_backing_evidence'
```

### Wave 2 — passes by construction (11), with the reason for each

Every one of these passed on its first run, at the pre-implementation tree.
No RED was observed for any of them, and none of them tests new behaviour.

| Test | Why it passes by construction |
| --- | --- |
| `DeclaredUrlAuthorityTests.test_a_port_an_ip_literal_and_a_later_at_sign_are_admitted` | Non-vacuity control. These were admitted before and must stay admitted; the new rule refuses userinfo, not authorities. |
| `DeclaredUrlPercentGrammarTests.test_a_well_formed_escape_is_still_admitted` | Non-vacuity control for the percent decision. `%C3%A9` and friends were admitted before and are the reason a blanket refusal was rejected. |
| `DeclaredUrlResidualTests.test_every_named_residual_is_genuinely_still_admitted` | It asserts the residual list is **not** closed. Each case was admitted before and is still admitted; the test's job is to fail if one quietly becomes refused and the docstring starts claiming a weakness it no longer has. |
| `DeclaredUrlResidualTests.test_the_committed_fourteen_are_unaffected_by_this_wave` | Regression control over data this wave does not touch. It would have gone RED had the new refusals caught a committed URL — that is its entire purpose. |
| `BrandNameCharacterClassTests.test_the_premise_of_each_case_is_the_category_it_claims` | Asserts facts about the Unicode database (`unicodedata` 16.0.0), not about this code. It exists so a Unicode release that reassigns one of these code points fails loudly rather than quietly making a case test nothing. |
| `BrandNameCharacterClassTests.test_legitimate_non_ascii_names_are_still_admitted` | Non-vacuity control. A category rule that refused these would be an ASCII allowlist, which is the thing the brief forbids. |
| `BrandNameCharacterClassTests.test_the_twelve_committed_names_are_admitted_unchanged` | Regression control over committed data. It would have gone RED had the category rule or NFC touched any of the twelve. |
| `BrandNameNormalizationTests.test_the_premise_holds_the_two_spellings_differ_in_bytes` | Asserts a fact about NFC/NFD, not about this code. It pins the premise the collision tests rest on. |
| `BrandNameNormalizationTests.test_two_genuinely_different_names_still_coexist` | Non-vacuity control. Normalisation must collapse spellings, not brands. |
| `WindowsDirectoryJunctionTests.test_a_junction_is_descended_and_the_file_inside_is_refused` | The refusal already worked: wave 1's anchor catches the file inside. This test records a **measured platform fact** that was previously mis-recorded in prose; the code change for G4 is the docstring, not the behaviour. |
| `WindowsDirectoryJunctionTests.test_a_directory_symlink_is_still_not_descended` | The same, for the contrasting case. It pins that this wave did not change the symlink behaviour while correcting the record about junctions. |

### Wave 1 (`b7cd54ab`) — measured, and the count disagrees with the brief

**Read the method before the list.** Wave 1's RED was not observed by this
implementer and cannot be. "Passes by construction" is a claim about
**authoring order** — the test was written after the implementation and passed
on its first run — and authoring order leaves no trace in the tree. What can
be measured is a **proxy**: run each of wave 1's 29 added tests against the
pre-wave-1 source and see which pass.

The measurement was made by materialising `b50b0c96` into a scratch directory
(`git archive b50b0c96 | tar -x`), overlaying **only** the two test files as
`b7cd54ab` left them, and running each of the 29 individually. No repository
state was touched. All 29 were located.

> **Corrected by wave 3 (H4). The answer adopted is 8, not 7.** Under this
> report's own definition — *"a claim about authoring order"* — the reviewer's
> adjudication is that
> `RegistryRootAnchoringTests.test_the_anchor_admits_a_path_inside_the_root`
> is the eighth: it is a non-vacuity control by character, and at `b50b0c96`
> it fails only with `AttributeError` because `_require_inside_root` did not
> exist there at all, so it never had a meaningful RED. **The proxy's answer
> is 7; the answer is 8.** The proxy and its seven are kept below as
> corroboration and are clearly labelled as such. Reporting the proxy's answer
> as the answer is the same substitution wave 3 exists to stop, and this
> paragraph is where that substitution is undone rather than argued away.
>
> `test_the_anchor_refuses_a_path_outside_the_root_without_a_symlink` fails at
> `b50b0c96` for the same incidental reason but is **not** counted as a ninth:
> it asserts a refusal that did not exist before wave 1, so it is a genuine
> RED for the behaviour it tests. The distinction is that one asserts new
> behaviour and the other asserts unchanged behaviour.

**Proxy result (corroboration, not the answer): 22 RED at `b50b0c96`, 7
passing.**

| Test passing against the pre-wave source | Why it passes without the wave-1 change |
| --- | --- |
| `DeclaredUrlCharacterSetTests.test_the_admitted_controls_are_still_admitted` | Non-vacuity control for F3. A rule that refused everything would pass every refusal test and break the fourteen committed rows. |
| `DeclaredUrlCharacterSetTests.test_the_already_refused_controls_are_still_refused` | The pre-wave rule already refused whitespace and a non-`https` scheme; this pins that F3 did not lose those. |
| `DeclaredUrlCharacterSetTests.test_every_committed_url_is_still_admitted_unchanged` | Regression control over committed data. |
| `RegistryRootAnchoringTests.test_an_ordinary_root_is_still_measured` | Non-vacuity control for F4: the anchor must not refuse the committed root. |
| `RegistryRootAnchoringTests.test_a_symlink_that_stays_inside_the_root_is_admitted` | Pins that F4 anchors rather than bans; the admitted case was never broken. |
| `BlockedStateAgreementTests.test_the_agreeing_shape_is_still_accepted` | Non-vacuity control for F7: the shape discovery itself produces must stay accepted. |
| `BlockedStateAgreementTests.test_discovery_still_produces_the_agreeing_shape` | The same, over the live root. |

**The brief states that wave 1's reviewer independently confirmed exactly
eight such tests and no ninth. This proxy measurement finds seven, and the
discrepancy was reported rather than reconciled away.** The two questions are
not the same one: a test authored after the implementation can still fail
against the pre-wave source for an incidental reason, and every such test
lands in the 22 rather than the 7 under this method.
`RegistryRootAnchoringTests.test_the_anchor_admits_a_path_inside_the_root` is
exactly such a test, and it is the eighth.

**Wave 3 adopted 8**, per the block above. Wave 2's own inference here was
correct and was then not acted on — it named the eighth candidate and still
headlined 7, which is the substitution this lane exists to stop. A reviewer
who wants certainty should still compare against wave 1's implementer's own
disclosure, which is the artifact that did not survive; the eight is an
adjudication over a defined question, not a recovery of that artifact.

Wave 1's four RED observations (`test_first_cohort_denominator` import error,
the plan Step 4 CLI conflict, and the two `test_release` runs) are recorded in
`.superpowers/sdd/task-9-denominator-report.md` section 7 by the implementer
who watched them, and are not restated here.

---

## 7. Verification, all from live runs

`PYTHONPATH` was set to
`C:\tmp\monolith-global-connector-registry-parent\packages\component-master\src`
for every unittest run.

| Check | Command | Result |
| --- | --- | --- |
| Full dynamic discovery | `python -m unittest discover -s tests -t .` | `Ran 849 tests` · `OK` |
| Registry directory | `python -m unittest discover -s tests/component_master/registry -t .` | `Ran 579 tests` · `OK` |
| `test_release` | `python -m unittest tests.component_master.registry.test_release` | `Ran 181 tests` · `OK` |
| `test_first_cohort_denominator` | `python -m unittest tests.component_master.registry.test_first_cohort_denominator` | `Ran 117 tests` · `OK` |
| Verifier | `python tools/verify_kitchen_kernel.py` | `overall_passed: true`, `check_count 13`, `passed_count 13`, `failed_count 0` |
| Plan Step 4, check | `check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified` | **exit 0** |
| Plan CLI, release | `build_release.py --root data/component-master/registry/v1 --version 0.1.0` | **exit 0** |
| Worktree | `git status --porcelain` | empty |

Every row above was re-run **at `277d508b`**, after the commit, not before it.

The verifier read `12/13` while the five source paths were uncommitted, with
`git_established_repository_state` the single failing check and the five
modified paths listed in its details. It read `13/13` once they were
committed. That is the only verifier check that moved during this wave and it
moved for that reason.

`git apply -R --check .superpowers/sdd/task-9-denominator-review-package.diff`
at `277d508b` exits 0, so the regenerated package reverse-applies cleanly at
the new HEAD.

Test counts moved 813 → 849 (`+36`, all in
`test_first_cohort_denominator`). `test_release` is unchanged at 181; the only
edit to it is the two pinned digest constants.

### The rebuilt snapshot

- `data/component-master/registry/v1/coverage-snapshot.json`: **8,930 bytes**,
  SHA-256 `72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788`,
  **zero CR bytes**. It was 8,746 bytes /
  `4e61581ceee3515d263d326fcb1fa011f44bfc85ed381833be10779b14cc0171` at
  `b7cd54ab`; the 184-byte growth is the `verified_item_count` object.
- Re-pinned in **two** places, both content-derived:
  `LiveEmptyRegistryTests.EMPTY_ROOT_PAYLOAD_SHA256` /
  `EMPTY_ROOT_PAYLOAD_BYTE_COUNT` in `test_release.py`, and
  `DeterminismOverDeclaredInputTests.LIVE_PAYLOAD_SHA256` /
  `LIVE_PAYLOAD_BYTE_COUNT` in `test_first_cohort_denominator.py`.
- `test_a_fresh_build_reproduces_the_committed_file_byte_for_byte` and
  `test_committed_snapshot_matches_a_fresh_measurement` compare a fresh
  `build_snapshot` payload against the committed file **with no
  normalization**. Task 9's tightening is kept; no `\r\n` stripping was
  reintroduced.
- Determinism across processes under `PYTHONHASHSEED=random` and across
  reversed declaration order is unchanged and still asserted.

### The `coverage_statement`, literal, from a live run

> 0 of 0 discovered registry items classified; 0 of 0 counted as verified with
> backing evidence; 0 of 0 verified claims refused by the evidence gate; 0 of
> 14 named sources readable and hash-verified; 14 of 14 named sources declared
> but not yet read; 0 of 14 named sources blocked; 0 of 12 declared
> first-cohort brands with at least one source read. The registry root holds
> zero records, so this release covers nothing. The declared brands are a
> first cohort selected for review, not the connector market; a source named
> here has not been fetched, read, or rights-reviewed by this measurement.
> Measured by coverage.discover_registry_root over the named registry root; no
> figure here is a market-wide claim.

Compared programmatically against
`git show b50b0c96:data/component-master/registry/v1/coverage-snapshot.json`:
**identical**. OR-9.1's spoken clause was not touched by either wave.

### Worktree digests at this commit (first sixteen hex characters)

| File | Bytes | SHA-256 (16) | CR bytes |
| --- | ---: | --- | ---: |
| `coverage-snapshot.json` | 8,930 | `72ccc63ff4a3fd71` | 0 |
| `brand-universe.jsonl` | 1,430 | `77e006aca245553e` | 0 |
| `source-denominator.jsonl` | 2,172 | `c685b706bfad57e7` | 0 |
| `coverage.py` | 102,956 | `ea779d9d66668719` | 0 |
| `releases.py` | 17,142 | `31a2482d990545ef` | 0 |
| `test_first_cohort_denominator.py` | 104,979 | `d14c1ef4bbfd8ca4` | 0 |
| `test_release.py` | 126,931 | `58ca3fd2036c8f54` | 0 |

**These are worktree digests on this host and are not portable.** The two
`.jsonl` files and the `.json` are pinned by `.gitattributes` in that
directory and will reproduce on a clone; the four `.py` files are outside that
pinned scope and will not on a machine with a different `core.autocrlf`. The
two `.jsonl` digests are **identical to the figures recorded at `b50b0c96`**,
which is the check that the fourteen URLs and twelve brand names are
byte-unchanged.

---

## 8. Regressions confirmed still holding

Each was re-run live at this commit, not assumed.

- F1's cohort attestation, including order-independence (reversed names →
  same digest) and content attestation (any content change → different
  digest) — `PayloadAttestsTheDeclaredCohortTests`,
  `DeterminismOverDeclaredInputTests`, `OrderIndependenceTests`.
- F4's file-symlink anchoring — `RegistryRootAnchoringTests`, all cases.
- F6's assertion on the offending field name —
  `test_a_brand_row_off_the_schema_is_refused_naming_the_field` in
  `test_release.py`, untouched by this wave.
- OR-9.1's spoken clause in `coverage_statement`, byte-identical to
  `b50b0c96` (verified programmatically, above).
- The fourteen URLs and the twelve brand names, byte-unchanged (digests
  above).
- The per-state row schema, `sha256` refused on `DECLARED_UNREAD` and
  required on `BLOCKED`.
- The source counts partitioning their denominator.
- `_require_brand_source_agreement` dual-enforced.
- The reachability derivation still failing on an undemonstrated reason.
- `git status --porcelain` empty at the end of this wave.

---

## 9. What was found and deliberately **not** fixed

- **A homograph brand name is still admitted.** `Blуm` with a Cyrillic *у* is
  accepted. Closing it would require an ASCII allowlist, which the brief rules
  out and which would refuse three of the twelve committed names. Recorded in
  section 4 and in the `BrandUniverseEntry` docstring rather than left in
  neither place.
- **The host in a declared URL is never parsed, resolved, or matched against
  the brand that claims it.** After userinfo is closed this is the strongest
  remaining member of that family and it is not closable by a character rule.
  Recorded in the residual list and asserted still open.
- **A percent-escape decoding to an invisible or homograph character is
  admitted.** The decision and its reason are in section 3.
- **`_require_inside_root` is narrowed, not closed.** A rename of a directory
  component of the resolved path between resolve and open is unaccounted for.
- **Directory symlinks are still not followed**, so a subdirectory reachable
  only through one still goes unmeasured. Unchanged from Task 8.
- **`brand_id` and `source_ids` were not touched.** They go through
  `_require_canonical_id`, verified safe.
- **`evidence.py` was not modified**, as required.
- **The `items.json` silent skip inherited from Task 8 is unchanged**, as the
  brief directs.
- **A `BLOCKED` row written directly into `source-denominator.jsonl` carries a
  digest this reader can never confirm.** Unchanged from Task 8; relaxing the
  requirement would weaken a check.

## 10. What could not be verified

- **Cross-platform and cross-interpreter byte identity.** Determinism was
  proven on CPython 3.14.2, `unicodedata` 16.0.0, Windows 11, on this host
  only. A different Unicode database version could in principle change which
  code points are `Cn`; `test_the_premise_of_each_case_is_the_category_it_claims`
  is what would fail loudly if it did, but it has only ever been run against
  16.0.0.
- **A case-sensitive filesystem was never exercised.** Task 8's recorded
  exposure is unchanged.
- **The POSIX behaviour of `WindowsDirectoryJunctionTests`.** Both of its
  tests skip on non-Windows hosts, so the junction/symlink contrast recorded
  in the module docstring is confirmed on Windows and asserted-by-skip
  elsewhere. The directory-symlink half was exercised here and passed.
- **That the fourteen URLs resolve, are current, are the publishers' own, or
  may lawfully be read.** Nothing in this lane establishes any of that, and
  the userinfo refusal does not begin to.

---

# Wave 3

**Status:** implementation complete, not reviewed. Same branch, same rules: no
push, merge, rebase, reset, restore or branch change was performed.

Wave 3's subject is not three defects. It is that **every completeness claim
in this module either became true or became narrower**, because wave 2 was
convened to close *a fix applied to the named instance while its prose
generalises to the class* and committed that shape three more times inside the
fixes. The mechanism was that the tests were written **from** the prose rather
than **against** it: the docstring named three invisible characters, so the
test refused those three; the docstring said "an authority that names no
host", so the test tried the empty authority. The suite went green at 849 and
the verifier at 13/13 and neither could see any of it, because a test derived
from a claim cannot falsify that claim.

The rule this wave adopts and every later wave inherits:

1. A docstring may state a class only if a test attacks the class. Otherwise
   the prose is narrowed to the instances, and the rest goes in a residual
   list.
2. Every rule gets a `what this does not close` section **in the docstring**,
   and each named residual gets a test asserting it is genuinely still
   admitted — the `DeclaredUrlResidualTests` shape.
3. The residual list lives where a reader meets the rule, not only in a
   report.

## 11. The three defects, reproduced first-hand before anything was written

Every block below is console output from this session, at `277d508b`, before
any edit.

### 11.1 H1 — `brand_name` closed two named invisibles; its prose closed the class

```
== invisible characters appended to 'Häfele' ==
[ADMIT ] U+3164 HANGUL FILLER                      cat=Lo
[ADMIT ] U+115F HANGUL CHOSEONG FILLER             cat=Lo
[ADMIT ] U+2800 BRAILLE PATTERN BLANK              cat=So
[ADMIT ] U+034F COMBINING GRAPHEME JOINER          cat=Mn
[ADMIT ] U+FFA0 HALFWIDTH HANGUL FILLER            cat=Lo
[refuse] U+200B ZERO WIDTH SPACE                   cat=Cf
[refuse] U+FEFF ZERO WIDTH NO-BREAK SPACE          cat=Cf

== a name made ONLY of invisibles ==
[ADMIT ] U+3164 x3 -> stored 'ㅤㅤㅤ'
[ADMIT ] U+2800 x3 -> stored '⠀⠀⠀'
[ADMIT ] U+115F x3 -> stored 'ᅟᅟᅟ'
[ADMIT ] U+034F x3 -> stored '͏͏͏'
```

**The decision, and the reason, quoted from the `BrandUniverseEntry` docstring
as committed:**

> **``Cc`` and ``Cf`` are two categories such characters live in. They are
> not the class.** The previous version of this docstring called them *the
> characters that render as nothing*, and that sentence did not survive
> contact: U+3164 HANGUL FILLER is ``Lo``, U+2800 BRAILLE PATTERN BLANK is
> ``So``, U+034F COMBINING GRAPHEME JOINER is ``Mn``, and all three were
> admitted, as was a name made of nothing but fillers. No general category
> reaches them, and refusing ``Lo``, ``So`` or ``Mn`` wholesale would refuse
> ニチハ and most of the world's diacritics.
>
> They are therefore refused from an explicit list, and the claim is
> narrowed to match it. ``_REFUSED_BRAND_NAME_CODE_POINT_RANGES`` is a
> **transcription** of the Unicode 16.0.0 ``Default_Ignorable_Code_Point``
> property, restricted to members no category above already refuses, plus
> U+2800. It is **not a derivation**: ``unicodedata`` exposes no accessor
> for that property, so nothing here re-derives the list and nothing here
> proves it complete. What is checked is every member's category, that every
> member does work no category rule already did, and the Unicode release the
> list was read from.

So: **the refusal was extended and the prose was narrowed**, both. The
extension is 268 code points in ten named ranges (`U+034F`, `U+115F–U+1160`,
`U+17B4–U+17B5`, `U+180B–U+180D`, `U+180F`, `U+2800`, `U+3164`,
`U+FE00–U+FE0F`, `U+FFA0`, `U+E0100–U+E01EF`). The boundary is named and so is
its weakness: it is a transcription a human made, it cannot notice a Unicode
release that adds a member, and
`test_the_transcription_is_pinned_to_the_release_it_was_read_from` **fails**
rather than skips when `unicodedata.unidata_version` moves off `16.0.0`.

`test_the_module_carries_the_same_transcription` compares the module's set
against an independently written table in the test file and pins the count at
268; `test_every_transcribed_code_point_has_the_category_it_claims` attacks
each of the 268 against `unicodedata`;
`test_no_transcribed_code_point_was_already_refused_by_category` asserts no
member is doing work the category rule already did, so the list cannot be
padded to look larger than the hole it closes.

**After, live:**

```
[refuse] U+3164 HANGUL FILLER                      cat=Lo
[refuse] U+115F HANGUL CHOSEONG FILLER             cat=Lo
[refuse] U+2800 BRAILLE PATTERN BLANK              cat=So
[refuse] U+034F COMBINING GRAPHEME JOINER          cat=Mn
[refuse] U+FFA0 HALFWIDTH HANGUL FILLER            cat=Lo

[refuse] U+3164 x3 -> brand_name holds a character that renders as nothing;
         position 0 holds U+3164 (HANGUL FILLER), general category Lo. No
         general category names this class, so it is refused from a list
         transcribed from Unicode 16.0.0. A name padded with one prints
         exactly like the name beside it and would be counted as a second brand
```

A name that is empty after removing everything invisible is therefore refused,
because every one of its characters is refused individually — and that
sentence is now true for the transcribed set rather than asserted about a
class nobody bounded.

### 11.2 H1 — whitespace, the sharpest row

**Before, live at `277d508b`:**

```
[ADMIT ] 'Festool DOMINO'   -> stored 'Festool DOMINO'
[ADMIT ] 'Festool DOMINO '  -> stored 'Festool DOMINO '
[ADMIT ] ' Festool DOMINO'  -> stored ' Festool DOMINO'
two brands that render identically: True
```

**The decision, quoted from the docstring as committed:**

> **Leading and trailing U+0020 are trimmed** before validation and before
> the name is stored, so that ``'X'`` and ``'X '`` collide in both duplicate
> checks. Without that the paragraph above about U+00A0 was false one
> character away from the case it argues: ``Festool DOMINO`` and ``Festool
> DOMINO`` with a trailing U+0020 were two brands. Only U+0020 is trimmed —
> every other ``Zs`` is refused by name, because trimming a refused
> character would silently repair a line a human has to read and approve.

**After, live:**

```
[ADMIT ] 'Festool DOMINO'    -> stored 'Festool DOMINO'
[ADMIT ] 'Festool DOMINO '   -> stored 'Festool DOMINO'
[ADMIT ] ' Festool DOMINO'   -> stored 'Festool DOMINO'
[ADMIT ] 'Festool DOMINO  '  -> stored 'Festool DOMINO'
two brands that render identically: False
```

`'X'` and `'X '` now collide, and the collision is refused in **both**
enforcement points: `brand-universe.jsonl:2` names the offending line
(`test_a_trailing_space_collides_in_the_file`,
`test_a_leading_space_collides_too`) and `CoverageSnapshot` refuses the same
shape for a caller with no file
(`test_the_same_collision_is_refused_on_the_record`).

**The twelve committed names are unaffected**, measured rather than assumed:
none carries a leading or trailing U+0020, so trimming is a no-op on all
twelve, and none contains any of the 268 transcribed code points.
`brand-universe.jsonl` is byte-unchanged at **1,430 bytes**, SHA-256 prefix
`77e006aca245553e`, identical to the figure recorded at `b50b0c96`.
`test_the_twelve_committed_names_are_unaffected_by_trimming` and
`test_the_twelve_committed_names_are_admitted_unchanged` both assert it.

### 11.3 H3 — the URL rule stated "names no host" and implemented "authority is empty"

**Before, live at `277d508b`:**

```
[ADMIT ] https://:8443/x                            host=None
[ADMIT ] https://:80                                host=None
[ADMIT ] https://:/x                                host=None
[ADMIT ] https://:                                  host=None
[refuse] https:///x                                 host=None
[refuse] https://?a=1                               host=None
[refuse] https://#f                                 host=None
[refuse] https:///                                  host=None
```

**The host check now used, quoted from
`_require_hostful_authority_without_userinfo`:**

> Userinfo is refused first, so the authority the host rule reads carries
> none and the host is what stands before an optional ``":" port``. An
> IP-literal is bracketed and holds colons of its own, so a closing ``]`` is
> what ends it; every other host ends at the first ``:``.

**After, live — all eight refused:**

```
[refuse] https://:8443/x        [refuse] https:///x
[refuse] https://:80            [refuse] https://?a=1
[refuse] https://:/x            [refuse] https://#f
[refuse] https://:              [refuse] https:///
```

**The ten-case matrix is unchanged**, asserted row by row with its verdict by
`test_the_ten_case_matrix_is_unchanged` rather than left to two tests to
imply: `https://example.invalid:8443/a`, `https://203.0.113.9/x`,
`https://[2001:db8::1]/x`, `https://example.invalid/a@b`,
`https://example.invalid/x?to=a@b` and `https://example.invalid/x#a@b` are
admitted; `https:///path`, `https://?a=1`, `https://#f` and `https:///` are
refused. Six userinfo cases and five malformed-escape cases are likewise
unchanged, and `test_the_committed_fourteen_are_unaffected_by_this_wave` still
passes over the committed rows: `source-denominator.jsonl` is byte-unchanged
at **2,172 bytes**, SHA-256 prefix `c685b706bfad57e7`, identical to `b50b0c96`.

**The six residuals are unchanged and three were added, taking the list to
nine.** `STILL_OPEN_URL_CASES` now holds `rn`/`m`, `1`/`l`, `0`/`O`, the brand
as a subdomain prefix, the brand in the path, the percent-encoded zero-width
space, and — new in this wave — `https://www.hafele.com%40evil.invalid/`,
`https://[]/x` and `https://[2001:db8::1/x`. Each is asserted **still
admitted**. The `%40` case is recorded exactly as the brief describes it:
**not a live spoof**, because `%40` is not a literal `@` and no fetcher
reaches `evil.invalid` — but it was admitted and it was not on the list, and
the list is what the rule rests on.

### 11.4 H4 — adopted

Section 6 now carries the correction in place. **8, not 7.** The proxy and its
seven are kept and labelled as corroboration.

## 12. H2 — the "class-level" guard was a hand-typed list checked against a hand-typed list

### The introspection used

`CoverageSnapshot.counts` no longer names its members. It walks the class:

```python
for name in sorted(
    {
        attribute_name
        for klass in type(self).__mro__
        for attribute_name, attribute in vars(klass).items()
        if isinstance(attribute, property)
    }
):
    if name == _COUNTS_PROPERTY_NAME:
        continue
    value = getattr(self, name)
    if isinstance(value, MeasuredCount):
        collected.append(value)
    elif isinstance(value, Mapping) and value and all(
        isinstance(item, MeasuredCount) for item in value.values()
    ):
        collected.extend(value.values())
```

Two shapes, and they are the two the record uses: a property returning a
count, and a property returning a nonempty mapping of counts. `counts` is
itself a property, so it is the one name excluded — walking it would recurse —
and `_COUNTS_PROPERTY_NAME` is a module constant rather than a literal in a
loop. Two counts sharing one label are **refused** rather than published,
because every comparison downstream is over a *set* of labels and a set cannot
see a duplicate.

### The mutation, and the guard failing on it

Before, at `277d508b`, live:

```
counts is hand-typed (no introspection): True
labels on record: 25
smuggled_count exists on the record: smuggled_count
labels on record after adding it: 25
'smuggled_count' in {c.label for c in counts}: False
'smuggled_count' anywhere in payload: False
```

After, live, same script:

```
counts is hand-typed (no introspection): False
labels on record: 25
labels on record after adding it: 26
'smuggled_count' in {c.label for c in counts}: True
'smuggled_count' anywhere in payload: False
```

`CountEnrollmentDerivationTests.test_the_payload_guard_fails_when_a_property_is_not_published`
is the proof, and it is *watched* rather than argued: it installs a real
`MeasuredCount` property on `CoverageSnapshot`, then **runs** the wave-2 guard
`PayloadCountCompletenessTests.test_every_measured_count_on_the_record_reaches_the_payload`
through a `unittest.TestResult` and asserts the failure list is non-empty and
names `smuggled_by_a_property`.
`test_the_guard_is_green_without_the_mutation` is its control: the same guard,
the same way, no property added, no failures. Before this wave the same
mutation left the guard green.

### The label-only limit — closed, not recorded

The review named it: the comparison was label-only, so a count published with
the right label and a wrong value would pass. It is now **value-level**.
`payload_count_objects` carries all five fields of each count rather than its
label, and `record_count_objects` produces the same fingerprints from
`MeasuredCount.as_payload()`;
`test_the_comparison_carries_every_field_not_only_the_label` compares them
over four differently shaped roots, and
`test_the_value_level_comparison_is_not_vacuous` pins 25 fingerprints each
carrying exactly the five keys.

### What replaced the false sentence

The module docstring said the guarantee was *"a count-by-count comparison of
the record against the payload — **not a list anybody maintains by hand**"*
while `counts` was itself hand-typed. It now says which half is derived:

> The record side is **enumerated by introspection** over
> :class:`CoverageSnapshot`'s own properties [...]
>
> ``releases.snapshot_payload``'s field list is **still written by hand**, and
> deliberately, because the payload's key names are part of the published
> contract and are not derivable from a count's label. The two-way comparison
> is what stops that hand-written list going stale. Which half is derived and
> which is not is stated here rather than left for a reader to assume both
> are.

`CountEnrollmentResidualTests.test_the_module_docstring_says_the_payload_list_is_hand_written`
asserts both halves of that statement, in `coverage.py`'s module docstring and
in `releases.snapshot_payload`'s.

## 13. Every rule this wave touched, with its residual list and the test that holds it honest

Four rules were touched. Each carries a `what this does not close` section in
its own docstring, and each residual is asserted **still admitted**, so the
list cannot rot in either direction: a case that quietly became refused fails
the test, and the docstring would then be claiming a weakness the rule no
longer has. **No test in this section asserts that any list is exhaustive, and
nothing here claims it.**

### 13.1 `BrandUniverseEntry` / `_require_brand_name` — new; it had none

Held honest by `BrandNameResidualTests`.

| Residual, as written in the docstring | Test |
| --- | --- |
| **A homograph.** `Blуm` with a Cyrillic U+0443 is admitted and sits beside `Blum` as a second brand. Closing it would mean an ASCII allowlist, which would refuse Häfele, Välinge/Threespine and Italiana Ferramenta. | `test_every_named_residual_is_genuinely_still_admitted`, `test_a_homograph_still_makes_two_brands` (asserts the cohort denominator really becomes 2) |
| **Interior runs of U+0020 are not collapsed.** `Festool  DOMINO` with two spaces is a second brand beside `Festool DOMINO`. | `test_every_named_residual_is_genuinely_still_admitted`, `test_an_interior_double_space_still_makes_two_brands` |
| **A combining mark is not an invisible.** A name of only combining marks has no base character and is admitted; so is `Blum` padded with U+0300. | `test_every_named_residual_is_genuinely_still_admitted` |
| **The transcription is version-pinned, not derived.** A code point a later Unicode release adds is not covered until a human re-reads the table. | `test_the_transcription_is_pinned_to_the_release_it_was_read_from` — fails, not skips |

`test_the_docstring_names_each_residual` asserts the statement and the tested
behaviour land in one commit.

### 13.2 `_require_hostful_authority_without_userinfo` — new; it had none

Held honest by `DeclaredUrlResidualTests` and
`DeclaredUrlHostTests.test_the_host_rule_records_what_it_does_not_close`.

| Residual, as written in the docstring | Test |
| --- | --- |
| **The host is checked for being present, never for being well formed.** `https://[]/x` and `https://[2001:db8::1/x` both leave a nonempty host and both are admitted. A reg-name and an IP-literal each have their own grammar in RFC 3986 §3.2.2; this rule implements neither. | `test_every_named_residual_is_genuinely_still_admitted` |
| **No percent-escape is decoded before the authority is read**, so `https://www.hafele.com%40evil.invalid/` is one reg-name here. That is also what RFC 3986 makes of it, so no fetcher reaches `evil.invalid`; it is a residual of the record, not a live spoof. | `test_every_named_residual_is_genuinely_still_admitted` |
| Everything `_require_declared_url` already records. This rule reads a string; it resolves nothing, contacts nothing, and establishes nothing about who owns the host it finds. | the six inherited cases |

### 13.3 `_require_declared_url` — existing list, extended from six to nine

The two new entries are the `%40` case and the well-formedness case above,
both asserted by `test_every_named_residual_is_genuinely_still_admitted` and
both named in `test_the_docstring_names_each_residual_class`, which went RED
when the fragments were added.

### 13.4 `CoverageSnapshot.counts` — new; it had none

Held honest by `CountEnrollmentResidualTests`.

| Residual, as written in the docstring | Test |
| --- | --- |
| **A count reached through any other shape.** A property returning a `tuple` of counts, or a mapping of mappings, is not walked. Adding one more level would only move the boundary, so the boundary is named instead of chased. | `test_a_count_inside_a_tuple_is_not_enumerated` |
| **A count held in something that is not a property** — a plain class attribute or a dataclass field — is not reached at all. | `test_a_count_in_a_plain_class_attribute_is_not_enumerated` |
| **This is an enrolment check, not an arithmetic one.** It establishes that every count the record computes reaches the payload carrying the same five field values; it **does not check that a count is right**. | a scope statement, not an admitted behaviour; named so a reader does not read the guard as an audit of the numbers |

## 14. RED observed first-hand, and the complete pass-by-construction list

### RED

Command, at `277d508b` with wave 3's tests written and **no** implementation
change:

```
python -m unittest tests.component_master.registry.test_first_cohort_denominator
```

Observed, verbatim (tail):

```
Ran 156 tests in 1.838s

FAILED (failures=322, errors=1)
```

The single error, verbatim:

```
ERROR: test_the_module_carries_the_same_transcription
AttributeError: module 'monolith_component_master.coverage' has no attribute
'_REFUSED_BRAND_NAME_CODE_POINTS'. Did you mean: '_REFUSED_BRAND_NAME_CATEGORIES'?
```

The 322 failures and 1 error resolve to **24 distinct test methods** (most
carry `subTest` cases, each counted separately). Twenty-three are new; the
twenty-fourth is the pre-existing
`DeclaredUrlResidualTests.test_the_docstring_names_each_residual_class`, which
went RED from the two residual fragments added to it.

```
BrandNameInvisibleTranscriptionTests.test_a_name_made_only_of_transcribed_invisibles_is_refused
BrandNameInvisibleTranscriptionTests.test_a_name_padded_with_one_collides_with_nothing_because_it_is_refused
BrandNameInvisibleTranscriptionTests.test_the_docstring_states_that_it_is_a_transcription
BrandNameInvisibleTranscriptionTests.test_the_five_reproduced_admissions_are_refused_and_named
BrandNameInvisibleTranscriptionTests.test_the_module_carries_the_same_transcription   (ERROR)
BrandNameInvisibleTranscriptionTests.test_the_type_refuses_every_transcribed_code_point
BrandNameResidualTests.test_the_docstring_names_each_residual
BrandNameWhitespaceTests.test_a_leading_space_collides_too
BrandNameWhitespaceTests.test_a_trailing_space_collides_in_the_file
BrandNameWhitespaceTests.test_the_docstring_states_what_is_trimmed
BrandNameWhitespaceTests.test_the_published_bytes_carry_the_trimmed_name
BrandNameWhitespaceTests.test_the_record_stores_the_trimmed_name
BrandNameWhitespaceTests.test_the_same_collision_is_refused_on_the_record
CountEnrollmentDerivationTests.test_a_mapping_of_counts_is_enrolled_too
CountEnrollmentDerivationTests.test_a_new_count_property_is_enrolled_without_being_listed
CountEnrollmentDerivationTests.test_no_two_counts_share_a_label
CountEnrollmentDerivationTests.test_the_payload_guard_fails_when_a_property_is_not_published
CountEnrollmentResidualTests.test_the_docstring_names_each_residual
CountEnrollmentResidualTests.test_the_module_docstring_says_the_payload_list_is_hand_written
DeclaredUrlHostTests.test_an_authority_whose_host_is_empty_is_refused
DeclaredUrlHostTests.test_the_host_rule_records_what_it_does_not_close
DeclaredUrlHostTests.test_the_refusal_states_the_rule_it_comes_from
DeclaredUrlHostTests.test_the_type_refuses_them_too_not_only_the_file_reader
DeclaredUrlResidualTests.test_the_docstring_names_each_residual_class
```

### Passes by construction — the complete list (16 of the 39 new methods)

Each of these **ran in the RED run above and passed there**, at the
pre-implementation tree. This is observation, not inference: any new method
absent from the 24 above is a method that passed against the old
`coverage.py`. None of them tests new behaviour.

The brief's warning is worth restating: *"I wrote the test from the docstring"
is exactly how the last two waves produced green suites over false claims.*
Three of the sixteen — the two Unicode-database tests and the version pin —
are exactly that shape of test, and they are disclosed as such rather than
counted as evidence that the rule works.

| Test | Why it passes by construction |
| --- | --- |
| `BrandNameInvisibleTranscriptionTests.test_every_transcribed_code_point_has_the_category_it_claims` | Asserts facts about `unicodedata` 16.0.0, not about this code. It attacks the **transcription** — a wrong range fails here — but it cannot attack the refusal. |
| `BrandNameInvisibleTranscriptionTests.test_no_transcribed_code_point_was_already_refused_by_category` | The same: a fact about the Unicode database against a constant that existed at `277d508b`. It stops the list being padded with members closing nothing new. |
| `BrandNameInvisibleTranscriptionTests.test_the_transcription_is_pinned_to_the_release_it_was_read_from` | Asserts `unicodedata.unidata_version`. It has only ever been run against 16.0.0 and its entire purpose is to fail on a different one. |
| `BrandNameResidualTests.test_every_named_residual_is_genuinely_still_admitted` | It asserts the residual list is **not** closed. Every case was admitted before and is still admitted; the test's job is to fail if one quietly becomes refused. |
| `BrandNameResidualTests.test_a_homograph_still_makes_two_brands` | The same residual with its consequence spelled out. The cohort denominator was 2 before and is 2 now. |
| `BrandNameResidualTests.test_an_interior_double_space_still_makes_two_brands` | The same. Trimming touches the ends only, which is exactly what this pins. |
| `BrandNameWhitespaceTests.test_a_name_of_only_spaces_is_still_refused_as_blank` | `_require_string` already refused a blank name. This pins that trimming did not open a hole underneath it. |
| `BrandNameWhitespaceTests.test_only_u0020_is_trimmed_and_every_other_space_is_refused` | U+00A0, U+3000, U+2007 and U+205F were already refused as `Zs`. This pins that trimming did not start silently repairing them. |
| `BrandNameWhitespaceTests.test_the_twelve_committed_names_are_unaffected_by_trimming` | Regression control over committed data. It would have gone RED had trimming or the code-point list touched any of the twelve — that is its entire purpose. |
| `CountEnrollmentDerivationTests.test_counts_is_not_reached_by_its_own_enumeration` | The hand-typed list did not include `counts` either. It pins the one exclusion the introspection needs, and it could not have failed before. |
| `CountEnrollmentDerivationTests.test_the_guard_is_green_without_the_mutation` | The control for the mutation test. The guard passed at `277d508b` and passes now; without it, "the guard failed" would not distinguish a mutation from a broken guard. |
| `CountEnrollmentResidualTests.test_a_count_inside_a_tuple_is_not_enumerated` | A residual. Not enumerated before, not enumerated now. It fails if a later wave silently widens the walk and leaves the docstring claiming a boundary it no longer has. |
| `CountEnrollmentResidualTests.test_a_count_in_a_plain_class_attribute_is_not_enumerated` | The same, for the non-property shape. |
| `DeclaredUrlHostTests.test_the_ten_case_matrix_is_unchanged` | Regression control. Every row held before and holds now; it exists because the host rule replaced the authority rule underneath it. |
| `PayloadCountCompletenessTests.test_the_comparison_carries_every_field_not_only_the_label` | The payload already republished the record's own values, so strengthening the comparison from labels to fingerprints was satisfied on arrival. It closes the label-only limit going forward; it did not detect a live defect. |
| `PayloadCountCompletenessTests.test_the_value_level_comparison_is_not_vacuous` | Pins 25 fingerprints so the strengthened comparison cannot be satisfied by two empty sets. |

`DeclaredUrlResidualTests.test_every_named_residual_is_genuinely_still_admitted`
is **not** new, but its three added cases pass by construction for the same
reason as every other residual case: they were admitted at `277d508b` and are
admitted now.

## 15. Verification, all from live runs at this commit

`PYTHONPATH` was set to
`C:\tmp\monolith-global-connector-registry-parent\packages\component-master\src`
for every unittest run.

| Check | Command | Result |
| --- | --- | --- |
| Full dynamic discovery | `python -m unittest discover -s tests -t .` | `Ran 888 tests` · `OK` |
| Registry directory | `python -m unittest discover -s tests/component_master/registry -t .` | `Ran 618 tests` · `OK` |
| `test_release` | `python -m unittest tests.component_master.registry.test_release` | `Ran 181 tests` · `OK` |
| `test_first_cohort_denominator` | `python -m unittest tests.component_master.registry.test_first_cohort_denominator` | `Ran 156 tests` · `OK` |
| Verifier | `python tools/verify_kitchen_kernel.py` | `check_count 13`, `passed_count 13`, `failed_count 0` after commit |
| Plan Step 4, check | `check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified` | **exit 0** |
| Plan CLI, release | `build_release.py --root data/component-master/registry/v1 --version 0.1.0` | **exit 0** |
| Worktree | `git status --porcelain` | empty |

Test counts moved 849 → 888 (**+39**, all in `test_first_cohort_denominator`,
117 → 156). `test_release.py` is **unchanged by this wave** — not one byte —
because the payload digest did not move.

As in wave 2, the verifier read `12/13` while the three source paths were
uncommitted, with `git_established_repository_state` the single failing check
and the three modified paths listed in its details, and `13/13` once they were
committed. That is the only verifier check that moved and it moved for that
reason.

### The rebuilt snapshot

**The payload digest did not change, and that is the expected result rather
than a check that was skipped.** Nothing this wave touched enters the payload:
the twelve names carry no leading or trailing U+0020 and none of the 268
transcribed code points, the fourteen URLs carry no `@`, no `%` and no empty
host, and `snapshot_payload`'s field list is unchanged. Measured live:

```
committed bytes: 8930  sha256: 72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788
fresh     bytes: 8930  sha256: 72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788
byte-identical, no normalization: True
CR bytes in committed: 0
```

The fresh build is `canonical_json_bytes(snapshot_payload(build_snapshot(root)))`
compared to the committed file **with no normalization** — no `\r\n`
stripping, no re-serialisation. The digest is therefore re-pinned at the same
value it already carried, in both places, and both pins were re-verified by a
live run rather than left unread:
`LiveEmptyRegistryTests.EMPTY_ROOT_PAYLOAD_SHA256` /
`EMPTY_ROOT_PAYLOAD_BYTE_COUNT` in `test_release.py`, and
`DeterminismOverDeclaredInputTests.LIVE_PAYLOAD_SHA256` /
`LIVE_PAYLOAD_BYTE_COUNT` in `test_first_cohort_denominator.py`. Determinism
across processes under `PYTHONHASHSEED=random` and across reversed declaration
order is unchanged and still asserted.

`build_release.py` printed, live:

```
"payload_sha256":"72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788"
"source_denominator_sha256":"cdb61e57ffffd1877125258bc7004ba6b614144b65d3637c2d45c7e4abb40ced"
"authority_state":"NOT-FOR-PRODUCTION"
```

### The `coverage_statement`, literal, from a live run at this commit

> 0 of 0 discovered registry items classified; 0 of 0 counted as verified with
> backing evidence; 0 of 0 verified claims refused by the evidence gate; 0 of
> 14 named sources readable and hash-verified; 14 of 14 named sources declared
> but not yet read; 0 of 14 named sources blocked; 0 of 12 declared
> first-cohort brands with at least one source read. The registry root holds
> zero records, so this release covers nothing. The declared brands are a
> first cohort selected for review, not the connector market; a source named
> here has not been fetched, read, or rights-reviewed by this measurement.
> Measured by coverage.discover_registry_root over the named registry root; no
> figure here is a market-wide claim.

Compared programmatically against
`git show b50b0c96:data/component-master/registry/v1/coverage-snapshot.json`:
**identical**. OR-9.1's spoken clause was not touched by any of the three
waves.

### Worktree digests at this commit (first sixteen hex characters)

| File | Bytes | SHA-256 (16) | CR bytes |
| --- | ---: | --- | ---: |
| `coverage-snapshot.json` | 8,930 | `72ccc63ff4a3fd71` | 0 |
| `brand-universe.jsonl` | 1,430 | `77e006aca245553e` | 0 |
| `source-denominator.jsonl` | 2,172 | `c685b706bfad57e7` | 0 |
| `coverage.py` | 118,078 | `1ff3f169f7f19a54` | 0 |
| `releases.py` | 17,934 | `f5e94695f82ec6f6` | 0 |
| `test_first_cohort_denominator.py` | 142,644 | `3ad1e10ca57df8ec` | 0 |
| `test_release.py` | 126,931 | `58ca3fd2036c8f54` | 0 |

**These are worktree digests on this host and are not portable.** The two
`.jsonl` files and the `.json` are pinned by `.gitattributes` in that
directory and reproduce on a clone; the four `.py` files are outside that
pinned scope and will not on a machine with a different `core.autocrlf`. The
three data digests are **identical to the figures recorded at `b50b0c96`** and
`test_release.py`'s is identical to the figure recorded at `277d508b`, which
is the check that this wave moved no data and no release test.

### Regressions confirmed still holding, each re-run live

- `coverage_statement` byte-identical to `b50b0c96` (verified programmatically
  above).
- The fourteen URLs and the twelve brand names byte-unchanged (digests above).
- F1's cohort attestation, including order-independence (reversed names → same
  digest) and content attestation (any content change → different digest).
- The per-state row schema; `sha256` refused on `DECLARED_UNREAD` and required
  on `BLOCKED`.
- The source counts partitioning their denominator.
- `_require_brand_source_agreement` dual-enforced.
- The reachability derivation still failing on an undemonstrated reason.
- The G4 anchor still reading the resolved path (`AnchorResolvedPathTests`,
  all four).
- `git status --porcelain` empty at the end of this wave.

## 16. What wave 3 found and deliberately did **not** fix

- **A homograph brand name is still admitted.** Unchanged from wave 2, and now
  in the `BrandUniverseEntry` docstring with a test rather than only in this
  report.
- **Interior runs of U+0020 are not collapsed.** Trimming the ends is what the
  duplicate-check argument needs; collapsing the interior would rewrite a name
  rather than normalise its edges.
- **A combining mark is not treated as an invisible.** Refusing `Mn` wholesale
  would refuse most of the world's diacritics, and the transcription refuses
  only the `Mn` code points that render as nothing.
- **The invisible list is a transcription, not a derivation, and cannot be
  proven complete from here.** `unicodedata` exposes no
  `Default_Ignorable_Code_Point` accessor. This is the sharpest thing this
  wave did not close, and the version pin is the only thing that can notice it
  going stale.
- **The host is not validated for well-formedness**, only for presence.
- **`https://www.hafele.com%40evil.invalid/` is admitted.** Not a live spoof;
  now on the list.
- **The enrolment walk reaches two shapes, not all shapes.**
- **The host is still never resolved, contacted, or matched against the brand
  that claims it.** Unchanged, and still the strongest residual of that family.
- **`_require_inside_root` is narrowed, not closed**; the check-then-open race
  is recorded and stays recorded, as the brief directs.
- **Directory symlinks are still not followed.**
- **`brand_id` and `source_ids` were not touched**; `evidence.py` was not
  modified; the `items.json` silent skip is unchanged.

## 17. What wave 3 could not verify

- **That the invisible-code-point transcription is complete.** It is a human
  reading of Unicode 16.0.0 `DerivedCoreProperties.txt`. Every member's
  category is checked and the release is pinned; completeness is not checked
  and cannot be from inside this package.
- **Any Unicode release other than 16.0.0.** Every category assertion in this
  wave has only ever run against `unicodedata` 16.0.0 on CPython 3.14.2.
- **Cross-platform and cross-interpreter byte identity.** Determinism was
  proven on this host only.
- **A case-sensitive filesystem.** Task 8's recorded exposure is unchanged.
- **The POSIX behaviour of `WindowsDirectoryJunctionTests`.** Unchanged from
  wave 2.
- **That the fourteen URLs resolve, are current, are the publishers' own, or
  may lawfully be read.** Nothing in this lane establishes any of that, and no
  refusal added in any of the three waves begins to.

**Nothing in this wave is a production, manufacturing, freeze, export or
release authority claim, and nothing establishes physical qualification or
registry completeness. Twelve brands are a first cohort selected for review,
not the connector market. `NOT-FOR-PRODUCTION` remains active.**
