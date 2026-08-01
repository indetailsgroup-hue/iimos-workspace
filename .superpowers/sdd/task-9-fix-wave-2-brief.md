# Task 9 fix wave 2 — brief

The first fix wave (`b7cd54ab`) closed F1, F4, F6 and the snapshot work, and an
independent review confirmed those survived every attack it could build. It
returned `NEEDS_FIXES` on three defects that share one shape:

> **a fix applied to the named instance, while its own prose generalises to the class.**

That is the shape to fix, not just the three instances. Each finding below was
reproduced first-hand by the orchestrator before this brief was written.

## Scope

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_release.py
tests/component_master/registry/test_first_cohort_denominator.py
data/component-master/registry/v1/coverage-snapshot.json
.superpowers/sdd/task-9-denominator-report.md
.superpowers/sdd/task-9-denominator-review-package.diff
.superpowers/sdd/task-9-fix-wave-report.md            <-- NEW, see G6
```

**Do not modify `evidence.py`.** A ninth path means stop and report.

## G1 — one `MeasuredCount` is still dropped, and the docstring says the audit is complete

Measured by the orchestrator against the live registry root:

```
MeasuredCount labels on the record            : 25
labels whose text is absent from the payload  : ['verified_items_with_backing_evidence']

verified_item_count = MeasuredCount(label='verified_items_with_backing_evidence',
    count=0, denominator=0, denominator_label='discovered_items',
    measured_by='coverage.evaluate_evidence_gate')

'verified_items_with_backing_evidence' in payload : False
'classification.VERIFIED' in payload              : True
```

`snapshot_payload`'s docstring claims *"Three were missing and are named now."*
Four were missing. The survivor is the module's **headline coverage number** —
the clause `coverage_statement` speaks second — and it is **not** substitutable
by `classification_counts["VERIFIED"]`: different label, different
`measured_by` (`evaluate_evidence_gate` versus `discover_registry_root`),
different meaning.

The "a consumer can recompute it" defence is unavailable to you, because this
wave's predecessor rejected exactly that defence for `declared_unread_source_count`,
which was equally recomputable before it was added.

Aggravating, and the part that must not be repeated: `EXPECTED_PAYLOAD_KEYS`
pins 19 keys with the comment *"a silently removed key is a silently narrowed
attestation"*, and freezes the incompleteness behind a test that reads as an
authority. `test_the_published_source_counts_partition_the_denominator` filters
on `denominator_label == "sources_in_denominator"` and structurally cannot see
this.

**Required:** emit it; correct the count in the docstring; and add the
**class-level** assertion — every label in `{c.label for c in snapshot.counts}`
appears in the payload's count objects — so no future count can be dropped
silently. The class-level test is the actual deliverable here.

## G2 — the URL residual list is wrong on its strongest residual

The docstring says *"What this does not close, stated rather than claimed"* and
lists only `1`/`l`, `0`/`O`, `rn`/`m`. Reproduced:

```
[ACCEPTED] https://www.hafele.com@evil.invalid/products/  -> host evil.invalid
[ACCEPTED] https://www.blum.com:pass@203.0.113.9/x        -> host 203.0.113.9
[ACCEPTED] https://exam%E2%80%8Bple.invalid/x             -> host exam%E2%80%8Bple.invalid
[ACCEPTED] https://example.invalid/%zz                    -> accepted, malformed escape
```

Every character is inside the permitted set. **Userinfo is not glyph confusion
in some font — it is an unread grammar feature, strictly more powerful than
`rn`/`m`, and it defeats the exact check the docstring says the rule rests on:**
*"the only thing standing between the transcription and that fetch is a human
reading the committed line."* A reviewer reading `https://www.hafele.com@evil.invalid/`
sees Häfele; every fetcher sees `evil.invalid`.

**Required:** refuse userinfo in the authority. A declared source URL has no
business carrying credentials, and there is no legitimate case for one in this
registry. Also require `%` to be followed by exactly two hex digits, and decide —
stating which, with the reason — what to do about percent-escapes that decode to
characters the rule refuses unencoded. Then make the residual list accurate: it
must name what genuinely remains after this wave, and nothing that does not.

**The RFC 3986 character-set decision itself is correct and is not reopened.**
The review judged it right and so do I. This is about its stated completeness.

## G3 — `brand_name` admits exactly the class `url` refuses, and F1 put it in the digest

```
[ACCEPTED] brand_name zero width space    'Häfele​'
[ACCEPTED] brand_name RTL override        'Häfele‮'
[ACCEPTED] brand_name newline             'Blum\nEvil'
[ACCEPTED] brand_name NUL                 'Blum\x00'
[ACCEPTED] brand_name cyrillic homograph  'Blуm'
[ACCEPTED] brand_name only invisibles     '​​​'

NFC='Häfele' len=6   NFD='Häfele' len=7   equal=False
-> two brands whose names render identically coexist; cohort denominator = 2
```

`BrandUniverseEntry.brand_name` goes through `_require_string` only. The
duplicate-name refusal is byte equality, so its own comment — *"a reader counting
names would count fewer brands than the denominator states"* — describes a
failure it does not prevent. **The denominator it corrupts is the `0 of 12` that
becomes Task 10's progress number.** F1 is what moved this field into the
released bytes, so F3's justification transfers verbatim.

**Required, and note this is deliberately *not* the URL rule:** brand names
legitimately carry non-ASCII — Häfele, Välinge, Italiana Ferramenta. Do not
restrict to ASCII. Refuse the control, format, bidi-control and unassigned
categories, refuse a name that is empty once those are removed, and normalise to
NFC before the duplicate check so two spellings of one name collide. State the
category list and the normalisation form in the docstring, with the reason each
is there.

`brand_id` and `source_ids` are already safe via `_require_canonical_id` —
verified. Do not touch them.

## G4 — `_require_inside_root` is check-then-open; the resolved path is discarded

Both call sites discard the return value and re-open the unpinned `path` later.
The review demonstrated the window by instrumenting the swap; the ordering is
readable directly from the source.

**LOW severity** — an attacker needs write access to the registry root, which
already permits arbitrary content. Fix it anyway, because it is free: pass the
`resolved` path to the read instead of the original. If you judge that it cannot
be closed, record it rather than leaving it in neither place.

While you are there: the record says directory symlinks are not followed. On
Windows a **directory junction** has `is_symlink() == False`, so `rglob` *does*
descend it, and the new anchor is what catches the file inside. Record that —
it is a real difference between the two platforms and it currently reads as
though junctions behave like symlinks.

## G6 — the fix wave's own disclosure does not survive

The previous brief required pass-by-construction disclosure "in the report", and
the substance was correct — the review independently confirmed exactly eight such
tests and no ninth. But the disclosure existed only in the implementer's
response, which is not a file. `.superpowers/sdd/task-9-denominator-report.md`
carries only the `b50b0c96` disclosure.

**Required:** write `.superpowers/sdd/task-9-fix-wave-report.md` covering
`b7cd54ab` *and* this wave — RED observed, GREEN, every test that passes by
construction with the reason, every figure from a live run, and what you did not
fix. Task 8 shipped with no report artifact and its ledger had to record that as
a process regression; do not make it two.

## Required tests

1. **The class-level count completeness assertion** (G1). This is the most
   important test in the wave — it is what makes G1 unrepeatable.
2. Userinfo refused, `%` grammar enforced, and the residual list's claims
   asserted where they are assertable (G2).
3. Each category in the G3 table refused by name, NFC/NFD duplicates collapsing,
   and the twelve committed brand names still admitted unchanged — the control
   that keeps the test from going vacuous.
4. The anchoring reads the resolved path (G4).
5. The rebuilt snapshot digest re-pinned; a fresh build byte-identical **with no
   normalization**; determinism across processes and reversed order.

RED first, observed first-hand. **List every test that passes by construction.**

## Regressions that must still hold

F1's cohort attestation, including order-independence (same names reversed →
same digest) and content attestation (any content change → different digest);
OR-9.1's spoken clause in `coverage_statement`, byte-identical to `b50b0c96`;
the fourteen URLs byte-unchanged; the per-state row schema; the source counts
partitioning their denominator; `_require_brand_source_agreement` dual-enforced;
the reachability derivation still failing on an undemonstrated reason;
`git status --porcelain` empty when you finish.

## Out of scope

`evidence.py`. Fetching or ingesting. Rights review. The `items.json` silent
skip. The Task 1 baseline manifest. Task 10.

No production or manufacturing readiness claim. Twelve brands is a first cohort,
not the connector market. `NOT-FOR-PRODUCTION` stays intact.
