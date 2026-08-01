# Task 8 brief — coverage ledger and deterministic release

## Boundary

Task 8 adds a coverage ledger and a deterministic release builder. It publishes
what the registry currently holds; it does not decide what belongs in the
registry, and it does not populate it. Tasks 9–12 populate the first cohort.

The registry is empty today. Every `.jsonl` under
`data/component-master/registry/v1/` is a zero-record seed (one byte, a bare
newline), verified with `wc -l`. **A release over an empty registry must
succeed and must say plainly that it covers nothing** — an empty release is a
truthful release, not an error, and it must never read as coverage.

Task 8 grants no manufacturing, freeze, export, or production authority. It
signs nothing. `NOT-FOR-PRODUCTION` stays intact. Daph remains one tenant.

## Exact tracked scope — create only these six paths

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tools/connector_registry/check_coverage.py
tools/connector_registry/build_release.py
tests/component_master/registry/test_release.py
data/component-master/registry/v1/coverage-snapshot.json
```

Do not modify any existing file. If a fix genuinely requires a seventh path,
stop and report rather than widening silently. In particular **do not modify
`evidence.py`** — see the inherited debt below.

## Required public contract

- `CoverageSnapshot` — the measured denominator and what is classified against
  it. Immutable, exact-typed, and constructed the way Task 7's records are.
- `RegistryRelease` — release identity, semantic version, payload digest,
  source-denominator digest, and creation metadata that sits **outside** the
  hashed payload.
- `build_release()` — produces a release from a registry root.
- A SHA-256 manifest.

Apply Task 7's record discipline verbatim, because it was earned across seven
review waves and the same attacks will be tried here:

- **Exact type identity, not `isinstance`.** A subclass that overrides
  `__getattribute__` or `__eq__` must not be able to substitute state after
  inspection. Rebuild every record you store from library-built types.
- **Deep snapshots with a closed admitted-type allowlist.** Containers rebuilt
  into immutable equivalents; scalars admitted by exact type; anything else
  refused at construction, never stored by reference.
- **Refuse unordered collections** wherever record order is observable in
  output.
- **Canonical IDs** rejected when blank or malformed.

## Determinism — the whole point of this task

- UTF-8 JSON, sorted keys, stable record order, LF line endings.
- **No wall-clock value inside the hashed payload.** Creation time belongs in
  the manifest, outside the payload digest.
- Two consecutive builds of the same input must produce byte-identical
  `registry.json` and identical digests, in separate processes and under
  `PYTHONHASHSEED=random`.
- Input order must not change the output. Feeding the same records in a
  different sequence must produce the same bytes.
- If any value cannot be canonicalized deterministically, refuse — do not fall
  back to a best-effort ordering.

## Coverage semantics — say what is true, never imply more

- **No unclassified discovered item.** Every item the ledger discovers is
  classified, or the run fails. Silence is not a classification.
- **Evidence dimensions are counted separately, never merged into one score.**
  A single "coverage percent" that blends orderability, geometry, installation
  documentation and independent structural evidence would misrepresent all
  four. Report each separately.
- **Blocked sources are reported, not dropped.** A source that could not be
  read is a visible gap, not an absence.
- **No verified record with a missing assertion.** This is the entry gate
  Task 7 explicitly deferred to Task 8 (see the inherited debt below).
- Counts must carry their denominator. "12 verified" without "of what" is not
  a coverage claim.

## Inherited debt — Task 8 owns this, and it is the reason the gate exists

Task 7 established that an assertion's `review_state` is a **state check, not a
provenance check**: a caller can declare `review_state="VERIFIED"` and
`FACTUAL_INDEXING_ALLOWED` pointing at a `source_id` that exists nowhere, and
Task 7's adapter admits it, while `EvidenceVault` rejects the identical
assertion. `git grep` over Task 7's production paths returns zero references to
`EvidenceVault`, `SourceSnapshot`, `verify_source_hash`, or `sha256`.

The approved plan places the closing gate here — Task 8 Step 1 requires *"no
verified record with a missing assertion"* and a *"source denominator hash"*.
So Task 8 must make an unbacked claim **unable to reach a release**, by
requiring, for every record a release counts as verified, that its assertions
resolve to a registered source with a verified hash.

Two constraints on how you close it:

- **Do not modify `evidence.py`.** Consume its existing API. If the API cannot
  express what the gate needs, report that rather than editing it.
- **Related, recorded, and NOT yours to fix:** `evidence.FieldAssertion`
  accepts `Decimal`, `bytearray`, `frozenset` and `nan`, all of which
  `CandidateRecord` refuses at construction. Task 7's ledger names
  reconciliation as work inside `evidence.py`, outside its approved paths.
  Do not reconcile it here. Do not let it block you either — state how your
  gate behaves if such a value appears.

## CLI

`tools/connector_registry/build_release.py` and
`tools/connector_registry/check_coverage.py`, matching the plan's invocations:

```
python tools/connector_registry/build_release.py  --root data/component-master/registry/v1 --version 0.1.0
python tools/connector_registry/check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified
```

Fail closed, and carry Task 7's CLI lessons forward:

- Validate every flag **before any filesystem work** — Task 7 shipped a
  `--brand` guard that never ran when the input was empty.
- Never overwrite a pre-existing output, and never overwrite a file an external
  process wrote between the check and the write.
- All-or-nothing publication. A failure at any point leaves no partial output
  and exits non-zero with a reason. Never exit 0 for work not done — Task 7's
  `applyGatePatches` returned success for a no-op and that defect reached the
  user interface.
- Malformed or truncated input exits non-zero with a reason, not a traceback.

## Required tests — RED first, and you must observe the red

`tests/component_master/registry/test_release.py`. At minimum:

1. **Empty registry** — a release over the zero-record seeds succeeds, and the
   snapshot states zero coverage explicitly rather than by omission.
2. **Byte replay** — two builds in separate processes produce identical bytes
   and identical digests; assert the digest, not just equality.
3. **Order independence** — same records, different input order, identical
   output bytes.
4. **No wall-clock in the payload** — prove the payload digest is unchanged
   across two builds at different times, and that creation metadata lives
   outside it.
5. **Unclassified item fails** — with `--fail-on-unclassified`, a discovered
   item that no rule classifies exits non-zero and names the item.
6. **Blocked source is reported**, not silently dropped.
7. **Evidence-dimension counts stay separate** — no test may assert a single
   blended coverage score, because none should exist.
8. **The inherited gate** — a record whose assertion names a source that is not
   registered, or whose source hash does not verify, cannot be counted as
   verified in a release. This is the Task 7 carry-forward and it is the most
   important test in the file.
9. **Exact-type and snapshot refusals** — a record subclass, a mutable value,
   and an unordered collection are each refused at construction.
10. **CLI fail-closed** — pre-existing output, bad flag with empty input,
    malformed input, and a failure injected mid-publish each exit non-zero
    leaving no partial output.

## Evidence discipline for the report

Every quantified or absolute claim in the task report must cite the command or
field that produces it. Task 7's ledger review caught three stale figures and
one outright false claim — *"the registry contains zero real SKUs"*, while the
verifier printed `sku_count = 20` on every run. The failure was prose written
before consulting the source that already answered it.

- Derive figures from a live run or from git; do not retype them.
- State plainly which suites you observed in RED first-hand, and do not
  reconstruct RED after the fact — that was ruled inadmissible in Task 7.
- Label environment-derived digests as non-portable.
- Any claim of the form "there are zero X" must cite the command that counted
  them.

## Out of scope

Populating the registry. Release signing. Network access. Runtime integration.
Freeze or export authority. Regional order-code collision, pack/finish
ambiguity, per-entity ID namespacing, `geometry.*` vs `dimensions.*`
cross-prefix comparison, and the `SourceContext`↔`SourceSnapshot` rights
reconciliation — all Task 7 carry-forward, none of it Task 8's.

No production or manufacturing readiness claim may appear anywhere. No software
test in this task establishes physical qualification, coupon testing, machine
capability, first-article inspection, field validation, or owner ratification.
