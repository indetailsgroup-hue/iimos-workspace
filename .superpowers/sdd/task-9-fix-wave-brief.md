# Task 9 fix wave — brief

Task 9 was implemented at `b50b0c96` and an independent review returned
`NEEDS_FIXES`. The owner's binding constraint (OR-9.1) **is satisfied** and is
not reopened here. This wave closes what the review found, and the two most
consequential findings were reproduced first-hand by the orchestrator before
this brief was written.

## Scope — seven paths, and `releases.py` is now explicitly granted

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py     <-- NEW GRANT
tests/component_master/registry/test_release.py
tests/component_master/registry/test_first_cohort_denominator.py
data/component-master/registry/v1/coverage-snapshot.json
.superpowers/sdd/task-9-denominator-report.md
.superpowers/sdd/task-9-denominator-review-package.diff
```

`releases.py` was withheld from Task 9 and the implementer correctly reported
rather than widened. **The owner has approved the grant for this wave.** It is
still a grant, not a licence: change only what F1 and F2 below require.

**Do not modify `evidence.py`.** That constraint stands.

An eighth path means stop and report.

## F1 — a release digest cannot attest which cohort was declared. Fix this first.

Reproduced by the orchestrator, not taken from the review. Two registry roots
with an identical two-source denominator and **completely different** brand
universes — `Häfele`/`Blum` versus `Acme Fasteners`/`Zzz Ltd`:

```
real cohort        4890 B  9dbf4e21cd5a50693851842f9e5cf51f
different cohort   4890 B  9dbf4e21cd5a50693851842f9e5cf51f
brand names visible in payload: NONE   (both)
IDENTICAL PAYLOAD AND DIGEST: True
```

The declared first cohort is invisible to every published digest. `0 of 12` is
about to become Task 10's progress number, computed from a file no release
covers, and `first_cohort_brand_count` is already a load-bearing invariant of
`CoverageSnapshot`.

Put the declared cohort inside the hashed payload. The brand rows are already
snapshotted on the record; carry them through `snapshot_payload` with the same
exact-type and deep-snapshot discipline everything else uses. Do not invent a
new serialisation convention — match `source_denominator`.

## F2 — the payload publishes an incomplete partition of its own denominator

Two of the three source states get a `MeasuredCount` carrying
`denominator_label` and `measured_by`; the third gets none.
`declared_unread_source_count` and `first_cohort_brand_count` exist as
properties, appear in `snapshot.counts`, and are dropped on the way to the
payload. The module's own Rule 1 is that **every count carries its denominator
together with the function that produced it**. A consumer enumerating payload
count objects currently sees `0 + 0` against a denominator of `14`.

Emit both as `MeasuredCount` entries, consistent with the existing ones.

## F3 — `_require_declared_url` admits invisible and homograph characters

Reproduced by the orchestrator against `coverage._require_declared_url(value, field_name)`:

```
[ACCEPTED] U+200B zero width space    'https://exam​ple.com/x'
[ACCEPTED] U+FEFF zero width nbsp     'https://exam﻿ple.com/x'
[ACCEPTED] U+2060 word joiner         'https://exam⁠ple.com/x'
[ACCEPTED] U+00AD soft hyphen         'https://exam\xadple.com/x'
[ACCEPTED] Cyrillic a homograph       'https://exаmple.com/x'
[refused ] bare 'https://'            [control]
[refused ] U+00A0 nbsp                [control]
[refused ] ordinary space             [control]
[refused ] 'http://…'                 [control]
[ACCEPTED] 'https://example.com/x'    [control]
```

`str.isspace()` does not cover format or zero-width characters. The whole point
of a `DECLARED_UNREAD` row is that a later task fetches **exactly** what is
written; an invisible character makes the committed byte differ from what every
human reviewer sees, and it survives a character-for-character transcription
check.

Refuse them. **The homograph case is a separate decision and you must state
which you took, with the reason, in the docstring:**

- Refusing all non-ASCII would also refuse legitimate internationalised domain
  names, which this registry may eventually need — Italiana Ferramenta and
  Häfele both publish under non-ASCII-adjacent brands.
- Accepting them silently is what happens today.

Either restrict to an explicit permitted character set and say what it excludes,
or refuse the `Cf`/`Cc` categories and non-printables and **record the homograph
exposure as a stated limitation**. Do not leave it in neither place.

## F4 — a file symlink at the registry root is followed out of the root

```
[ACCEPTED] symlinked source-denominator.jsonl -> ['source:evil:i']
```

`content_path` is root-anchored by `_resolve_inside` and correctly refuses
`../../escape.bin`. The JSONL entry points are not anchored at all. The
docstring records only that `Path.rglob` does not follow **directory** symlinks;
the **file** symlink case is different and is recorded nowhere. Task 9 added two
new symlinkable, contract-bearing entry points at that root, so the exposure
grew while the record did not.

Anchor them, or record the exposure explicitly. Not neither.

## F5 — a third pass-by-construction test is undisclosed. Correct the report.

The report states two guard tests were written after the implementation. The
diff adds three:

```
test_an_undemonstrated_reason_fails_the_derivation
test_a_wrongly_placed_reason_fails_the_discovery_derivation
test_the_declaration_files_are_the_only_nonempty_jsonl        <-- undisclosed
```

The third appears in neither RED 3 nor RED 4, so it did not exist at either
observation and passes by construction like the other two. Say three. This is
the exact class of inaccuracy this lane exists to catch, and it was found in a
report that was otherwise candid — correct it plainly rather than minimising.

## F6 — a weakened assertion was smuggled into a rename

```
-        self.assertIn("Task 9", message)
+        self.assertIn("name", message)
+        self.assertIn("source_ids", message)
```

`"name"` is a substring of `brand_name`, which appears in the *"a brand row
holds exactly brand_id, brand_name, source_ids"* tail of **every** brand-row
refusal, including refusals about unrelated fields. Both assertions are close to
vacuous and neither the diff comment nor the report flags the loosening. Assert
the offending field name instead, and make the test fail if the message stops
naming it.

## F7 — the new state widened an uncross-checked pair without widening the record

```
[ACCEPTED] blocked_sources naming a DECLARED_UNREAD source ->
  "… 1 of 1 named sources declared but not yet read; 1 of 1 named sources blocked …"
```

One source published simultaneously as declared-but-unread and blocked — the two
states the commit message says nothing may collapse in either direction. It is
unreachable through `discover_registry_root`, and the general shape is recorded
in `_require_backed_verified_claims`, but that record names only the `REGISTERED`
variant. Extend the recorded limit to name the new state, or cross-check.

Note this cuts against the module's own principle that an invariant living in
one caller is a convention: `_require_brand_source_agreement` was correctly
dual-enforced; this one was not.

## F8 — the report overstates the inherited `.json` gap

The report says a `brand-universe.json` typo *"would be read by nothing and
reported by nothing."* Not true once either sibling holds rows — the cross-file
agreement invariant catches the single-typo case loudly in both directions. Only
a **simultaneous double typo** is silent. Correct the sentence. The residual
`items.json` case is unchanged from Task 8 and stays unfixed; that is right.

## Required tests

Every fix above needs a test that fails without it. In particular:

1. **Two roots differing only in their brand universe produce different payload
   digests.** This is F1's proof and it is the most important test in the wave.
2. Each invisible character from the F3 table is refused, by name, with the
   controls kept so the test cannot go vacuous.
3. The symlink case behaves as you decided, and the decision is asserted.
4. `declared_unread_source_count` and `first_cohort_brand_count` appear in the
   payload as `MeasuredCount` entries with their denominators.
5. The rebuilt `coverage-snapshot.json` digest is re-pinned, and a fresh build
   reproduces it byte-for-byte **with no normalization** — keep Task 9's
   tightening, do not reintroduce `\r\n` stripping.

RED first, observed first-hand. If a test passes by construction, **say so in
the report** — F5 is on this list because that disclosure was incomplete last
time.

## Regressions that must still hold

Everything the review confirmed still holding: OR-9.1's spoken clause in
`coverage_statement`; the fourteen URLs exactly as transcribed; `SOURCE_DECLARED_UNREAD`
distinct from `SOURCE_NOT_REGISTERED`; the per-state row schema with `sha256`
refused on declared and required on `BLOCKED`; `_require_brand_source_agreement`
dual-enforced; determinism across processes and reversed input order; the
reachability derivation still failing on an undemonstrated reason.

## Evidence discipline

Derive every figure from a live run or from git. Any "there are zero X" claim
must cite the command that counted them and the scope searched. Label
environment-derived digests non-portable. The fourteen URLs remain unvisited —
do not describe them as reachable, current, or rights-reviewed.

## Out of scope

Fetching or ingesting anything. Rights review. `evidence.py`. The `items.json`
silent-skip inherited from Task 8. Task 10.

No production or manufacturing readiness claim. Twelve brands is a first cohort,
not the connector market. `NOT-FOR-PRODUCTION` stays intact.
