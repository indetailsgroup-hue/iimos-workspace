# Task 7 reviewed ingestion and quarantine implementation report

## Boundary and preflight

Task 7 was implemented only in
`C:\tmp\monolith-global-connector-registry-parent` on
`codex/global-connector-registry`.

- Assigned clean base:
  `addadab0093e3de05c3af31c01248fd2da596ff1`.
- Task 7 foundation commit:
  `1be54922f04709fffd3f629318f043750d806330`.
- Task 7 HEAD after the five review-driven fix waves:
  `db48529201f25e4d4afe8d1816b12748524f8f32`.
- Required brief: 6,963 bytes; SHA-256
  `376953da346af0f69060f6a51ba6a15d4f9a46673cfe870a350339cf1f8c986c`.
- Owner governance root was inspected separately at
  `C:\Users\thai3\determined-williams (2)`: branch
  `guardrails/claim-linters`, HEAD `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4`,
  with substantial pre-existing dirty state.
- Owner nested runtime was inspected separately at
  `C:\Users\thai3\determined-williams (2)\determined-williams`: branch
  `fix/dxf-truth-chain`, HEAD
  `a1e9006add32fe3ce5346eb6ca94e8bdce1d13ab`, ahead by two with
  pre-existing dirty state.
- The owner roots and isolated nested runtime remained read-only and
  out of scope. No owner-root current-state claim was inferred from parent
  `apps/` or `packages/`.
- `AGENTS.md`, `CONTEXT.md`, the complete English and Thai 21 July repository
  scope correction, both Task 7 plan editions, both ingestion/rights/conflict
  design sections, and the task brief were read before implementation.
- No push, merge, rebase, branch change, ledger update, Task 8 work, runtime
  integration, release mutation, data mutation, or verifier modification
  occurred.

## Strict TDD evidence

The test-only edit created only
`tests/component_master/registry/test_ingestion.py`. All four production paths
were absent.

Initial RED:

```text
python -m unittest tests.component_master.registry.test_ingestion -v
```

- exit: `1`
- loaded: one failed test module
- exact cause:
  `ModuleNotFoundError: No module named 'monolith_component_master.adapters'`
- summary: `Ran 1 test in 0.000s`; `FAILED (errors=1)`

The first minimal implementation produced an initial targeted GREEN of
38/38 tests.

A focused CLI serialization test then changed the promoted fixture to carry an
immutable dimensional mapping. Before its fix it reproduced:

```text
error: cannot pickle 'mappingproxy' object
```

The single focused test exited `1`; after replacing generic dataclass
serialization with explicit assertion serialization, it passed 1/1.

Five additional bounded invariant/failure-path probes were written before
their fixes:

- closed quarantine reason-to-owner mapping;
- one trustworthy single-candidate result disposition;
- no duplicate quarantine reason;
- rollback after injected second publication failure;
- destination-race no-overwrite behavior.

The focused RED exited `1` with five failing test methods and 14 reported
failures. After the minimal fixes, the same five methods passed 5/5.

Final targeted GREEN:

```text
python -B -m unittest tests.component_master.registry.test_ingestion -v
```

- exit: `0`
- tests: `43/43` at the foundation commit; `91/91` at Task 7 HEAD after the
  fix waves (see "Review-driven fix waves")
- summary: `OK`

## Implemented contract

The three plan records preserve their exact field shapes:

```text
CandidateRecord:
  candidate_id, brand_id, entity_kind, assertions, extraction_method

QuarantineRecord:
  candidate_id, reason_code, evidence_ids, owner_role

IngestionResult:
  promoted, quarantined
```

All three are frozen. Candidate assertion values are defensively deep-frozen;
assertion tuples, source-context inputs, result tuples, and quarantine
evidence IDs are defensively snapshotted. Results require exactly one
single-candidate disposition. Quarantine reasons are unique, evidence IDs are
canonical, sorted and deduplicated, and public reason/owner combinations are
closed to the approved mapping.

The adapter constructor receives the smallest explicit source context:

```text
source_id, authority, document_kind, rights_state
```

Authority is explicitly one of `OEM`, `AUTHORIZED_DISTRIBUTOR`, or `OTHER`.
Document kind is explicitly one of `PDF`, `CAD`, `WEB`, `API`, `FEED`, or
`MANUAL`. Rights are explicitly one of `FACTUAL_INDEXING_ALLOWED`, `UNKNOWN`,
`RESTRICTED`, or `CONFLICTING`.

No authority, document kind, or rights value is inferred from a URL, filename,
publisher, source ID, assertion ID, assertion value, or other free text.
Duplicate source contexts fail at construction. Missing source context is
reason-coded separately. Only `FACTUAL_INDEXING_ALLOWED` can promote.

Promotion also requires:

- extraction method exactly `HUMAN_REVIEWED`;
- every assertion already in `VERIFIED` review state;
- no unit, authority, document, compatibility, rights, or context conflict.

The adapter never changes `FieldAssertion.review_state` and exposes no publish,
release, registry-write, pending-promotion, or manufacturing-authority API.

## Normalized field and conflict conventions

- `dimensions.*` and `geometry.*` values are objects containing numeric
  `value` and explicit normalized `unit`.
- Supported units are exactly `mm` and `in`.
- Boolean numeric values, non-finite values, and wrong numeric types are
  rejected.
- Inch conversion uses exact rational arithmetic: the magnitude is a
  `Fraction` and the factor is `Fraction(127, 5)`, which is exactly 25.4.
  Corrected in fix wave 5: this line previously said `Decimal` arithmetic with
  the exact factor 25.4, which was false, because `Decimal` multiplication
  rounds to the active context precision of 28 significant digits.
- Metric/imperial disagreement on the same logical field produces
  `UNIT_CONFLICT`; exact converted equality does not.
- Unsupported or absent units produce `UNITS_AMBIGUOUS`.
- `identity.*` is the explicit identity namespace used for
  OEM/authorized-distributor scalar comparison.
- `dimensions.*` and `geometry.*` are both used for PDF/CAD comparison.
  Corrected in fix wave 4: only `geometry.*` was compared before, although
  every other rule already treated the two prefixes alike.
- A connector assembly requires a mating part only when
  `compatibility.requires_mating_part` is explicitly boolean `true`.
- The exact mating part field is
  `compatibility.exact_mating_part_id`, which must contain a nonblank exact ID
  when the marker is true.
- The mating-part rule follows the marker, not `entity_kind`. Whenever
  `compatibility.requires_mating_part` is explicitly `true`, a nonblank exact
  mating-part ID is required for every `entity_kind`. Entity kinds that cannot
  need a mating part simply do not carry the marker, so no marker means no
  requirement. Corrected in fix wave 1: the earlier statement described a
  gate on the single literal `"CONNECTOR_ASSEMBLY"`, which silently promoted
  every other spelling.

Every detected reason is emitted once in deterministic order with relevant
sorted assertion IDs and the authoritative owner:

- `REVIEW_REQUIRED` → `OEM Evidence Curator`
- `ASSERTION_NOT_VERIFIED` → `Identity and SKU Reviewer`
- `SOURCE_CONTEXT_MISSING` → `OEM Evidence Curator`
- `RIGHTS_UNCERTAIN` → `Rights and Licensing Reviewer`
- `UNITS_AMBIGUOUS` → `Geometry and Units Reviewer`
- `UNIT_CONFLICT` → `Geometry and Units Reviewer`
- `OEM_DISTRIBUTOR_IDENTITY_CONFLICT` →
  `Identity and SKU Reviewer`
- `PDF_CAD_GEOMETRY_CONFLICT` → `Geometry and Units Reviewer`
- `DIMENSION_SOURCE_CONFLICT` → `Geometry and Units Reviewer`
- `IDENTITY_SOURCE_CONFLICT` → `Identity and SKU Reviewer`
- `MATING_PART_SOURCE_CONFLICT` →
  `BOM and Compatibility Reviewer`
- `REQUIRED_MATING_PART_MISSING` →
  `BOM and Compatibility Reviewer`

Any one reason makes `promoted == ()`.

### Which field paths are compared, and which are deliberately not

Contradictions are detected only on the documented normalized conventions:
the two dimensional prefixes `dimensions.` and `geometry.`, the `identity.`
prefix, and **both** named `compatibility.` marker fields —
`compatibility.exact_mating_part_id` since fix wave 5 and
`compatibility.requires_mating_part` since fix wave 6. This sentence claimed
both fields from wave 5 onward, before `requires_mating_part` was actually
compared; it became true only in wave 6, and the wording is corrected here
rather than left to read as if it had always held.

Every other field path is left uncompared on purpose, because the brief
requires explicit documented normalized field conventions and forbids guessing
conflicts from free text. Pinned by tests as control cases that must keep
promoting even when two OEM sources disagree: `material.core`,
`notes.internal`, `packaging.carton_code`, `compatibility.freeform_remark`.

Three consequences of these conventions that operators need before cohort
ingestion, not during:

- **`geometry.width` versus `dimensions.width` is not compared.**
  `_group_by_field` keys on the exact `field_path`, so `geometry.width = 10 mm`
  and `dimensions.width = 999 mm` on one candidate both promote. This is
  defensible — the two prefixes are distinct documented namespaces and nothing
  in the brief declares them aliases — but wave 4 did declare them "the same
  disease" for the PDF/CAD rule, so the asymmetry is recorded here rather than
  left implicit. Carry-forward; deciding whether the prefixes are aliases needs
  a field-naming ruling Task 7 does not own.
- **`mm`↔`in` exact equality is only reachable when the mm value is an exact
  multiple of 25.4.** 10 mm is 0.393700787… in, which does not terminate, so a
  catalogue that states 10 mm from one source and a rounded inch value from
  another will now quarantine as `DIMENSION_SOURCE_CONFLICT`. Dual-unit
  catalogue data will therefore quarantine noticeably more often than it did
  before wave 4. That is the accepted "no invented tolerance" consequence
  biting harder, not a defect: the system says two sources disagree and a human
  decides, instead of guessing a threshold with no provenance.
- **Identity `10` (int) versus `"10"` (str) quarantines.** `_normalized_scalar`
  maps numbers to `Decimal` and strings to stripped text, so these land in
  different equivalence classes. This is a type mismatch rather than a value
  mismatch. The behaviour is left as-is because quarantining is the fail-closed
  direction, but it is documented so a reviewer meeting the case knows it is
  intended.

## Local CLI contract

```text
python -B tools/connector_registry/ingest_reviewed.py --help
```

exited `0` and listed:

- `--brand`
- `--source-manifest`
- `--assertions`
- `--out`
- `--quarantine`

`--source-manifest` is a local JSON array of explicit source contexts.
`--assertions` is local JSONL with one candidate and nested assertions per
nonblank line. Promoted candidate JSONL and quarantine JSONL remain separate.
Every candidate brand must exactly match `--brand`.

All inputs are parsed and evaluated before publication. Existing output paths
fail closed. Publication uses atomic new-file hard links rather than overwrite
replacement. If the second publication fails, the first destination is removed
only when it is still the same file created by this invocation. A raced
external destination is neither overwritten nor removed. Tests cover
malformed input, brand mismatch, pre-existing collision, injected second-file
failure, destination race, one promoted fixture, and one multi-reason
quarantined fixture.

The CLI performs no network access, AI review, source-state mutation, registry
mutation, release mutation, or manufacturing authorization.

## Regression and repository verification

Tasks 5–6:

```text
python -B -m unittest tests.component_master.registry.test_parametric_cabinets tests.component_master.registry.test_qualification -v
```

- exit: `0`
- tests: `96/96`
- summary: `OK`

Tasks 2–4 plus seed integrity:

```text
python -B -m unittest tests.component_master.registry.test_registry_models tests.component_master.registry.test_evidence tests.component_master.registry.test_compatibility tests.component_master.test_seed_integrity -v
```

- exit: `0`
- tests: `104/104`
- summary: `OK`

Verifier contracts:

```text
python -B -m unittest tests.test_verify_kitchen_kernel_contract -v
```

- exit: `0`
- tests: `12/12`
- summary: `OK`

Full dynamic discovery:

```text
python -B -m unittest discover -s tests -q
```

- exit: `0`
- tests: `551/551`
- summary: `OK`
- the visible `no such path: ...\no-such-directory` line is expected output
  from an existing negative-path fixture; it did not change the successful
  exit or final unittest summary.

`git diff --check` passed before the commit.

## Clean-HEAD verifier

At clean committed Task 7 HEAD `db48529201f25e4d4afe8d1816b12748524f8f32`
(the same command also returned `13/13` at the foundation commit):

```text
PYTHONDONTWRITEBYTECODE=1 python -B tools/verify_kitchen_kernel.py
```

- process exit: `0`
- schema: `1.1.0`
- overall: `PASS`
- checks: `13/13`
- failed: `0`
- embedded dynamic full suite: `551` tests, exit `0`, real `OK`
- embedded full-suite output: 87,839 bytes; SHA-256
  `3e47a3b41ad403f5aa82ead156a30c104dded4d1455a61c3a12e0fa188279475`.
  **Environment-derived, not a portable claim**: the embedded output contains
  per-run timings and absolute paths, so an independent run reproduces the test
  counts and the `OK` verdict but not this digest.
- governed Component Master: `20/20`, exit `0`
- governed identity-tenancy: `7/7`, exit `0`
- compile: exit `0`, empty output
- verifier-recorded Git state: clean branch
  `codex/global-connector-registry`, zero status lines, zero staged/unstaged
  diff, zero unmerged entries, exact Task 7 HEAD
- verifier summary: 102,873 bytes; SHA-256
  `4709e68232d41cd38cca47db4413dd5412d6b2d1f31c973c2c87e83a1cf04826`.
  **Environment-derived, not a portable claim**, for the same reason: an
  independent reviewer run produced a 111,439-byte summary. The portable facts
  are the check counts and the pass verdict, not the byte size or digest.

The verifier created nine ignored `__pycache__` directories containing 41
`.pyc` files. Every resolved cache path was verified to remain under the
isolated repository, then only those directories and the already-hashed
ignored verifier summary were removed. Final cache and `.pyc` counts are zero.

## Commit and exact scope

Commits, all on `codex/global-connector-registry`, each touching only Task 7
paths:

```text
1be54922f04709fffd3f629318f043750d806330
feat(registry): quarantine unreviewed connector evidence

dec823a66c877318b8ca9482513d67545e5d4cac
fix(registry): fail closed on non-primitive values and marker gating

798164f7d689551f99315c8b4bfaef099d1290b0
fix(registry): rebuild stored records from exact library types

33b252cc180b2001faebf42d44089b526258a17b
feat(registry): quarantine contradicting sources, never promote silently

8c90d52eb6b07348b77d056714dab507bd63ca9d
fix(registry): close mating-part contradictions and exact inch conversion

db48529201f25e4d4afe8d1816b12748524f8f32
fix(registry): quarantine contradicting mating-part markers
```

The foundation commit contains exactly five added paths and 2,189 insertions:

| Path | Bytes | SHA-256 |
|---|---:|---|
| `packages/component-master/src/monolith_component_master/ingestion.py` | 10,122 | `88afde40d1d2ad5120548c7d57f3ffa6fdf63286e675020839f42b8bf4c04267` |
| `packages/component-master/src/monolith_component_master/adapters/__init__.py` | 344 | `1b318ef16b95ed0a1a81cc6c7c20655b5864d092fc5055855e5c131104862b29` |
| `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py` | 12,233 | `f8989af8c3da7e1f7893f680c9314ce32af2ebaed3e1b93c9e305639c30babcb` |
| `tools/connector_registry/ingest_reviewed.py` | 9,178 | `d9ba9b127ec379dab0a88c453e85c90fb5840fec2b0b74f86d95fb794ff97a8f` |
| `tests/component_master/registry/test_ingestion.py` | 45,610 | `c13afb1f43d987f9631ddf4d0efafd2a4fac063162bb64817a960d158843df1c` |

At Task 7 HEAD `db48529201f25e4d4afe8d1816b12748524f8f32` the same five paths
total 3,715 insertions against the clean base. Every byte count and
digest below is read from the committed Git objects with `git cat-file`, not
from the working tree, so line-ending normalization cannot skew them:

| Path | Bytes | SHA-256 |
|---|---:|---|
| `packages/component-master/src/monolith_component_master/ingestion.py` | 14,344 | `8bf42b9b54818223ce3d8b77db73358d47991a08c3ade9d436464f3a493156cc` |
| `packages/component-master/src/monolith_component_master/adapters/__init__.py` | 344 | `1b318ef16b95ed0a1a81cc6c7c20655b5864d092fc5055855e5c131104862b29` |
| `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py` | 17,917 | `a5fab67d255c6533cf605ebbbcfaad7c1b3d1e1f099fc7a0218086fa8ea8d219` |
| `tools/connector_registry/ingest_reviewed.py` | 9,490 | `d80435a16981b66cdd81f2aa8eca772511198a227e732a51a3a01c08630405a0` |
| `tests/component_master/registry/test_ingestion.py` | 93,838 | `e4cb82701f41731af660493f377d620e9963c343584a21c6ffae821cc8f9148e` |

`adapters/__init__.py` is byte-identical to the foundation commit; the public
export surface never changed.

No existing product, package export, ledger, verifier, registry seed, cohort
data, release, runtime, or nested repository file changed.

## Review package

`.superpowers/sdd/task-7-ingestion-review-package.diff` is a native
full-index, binary-capable Git diff from
`addadab0093e3de05c3af31c01248fd2da596ff1` to Task 7 HEAD
`db48529201f25e4d4afe8d1816b12748524f8f32`.

- bytes: `141,447`
- SHA-256:
  `37529a0a1df5429bec2de27fc19bd9c79ce8edf7e4fb19ae8d087b898547f407`
- paths: exactly the five Task 7 paths
- full-index headers: five
- `git apply --check --reverse`: exit `0`

`.superpowers/sdd/task-7-ingestion-rereview-package.diff` covers the delta since
the last reviewed commit, `8c90d52e..db485292`.

- bytes: `9,599`
- SHA-256:
  `24a15d58d80647c2388a16d87e94c5ecda32308778393567a465989bdcba4d8e`
- paths: two
- full-index headers: two
- `git apply --check --reverse`: exit `0`

Both packages are regenerated at each wave, so an earlier edition covering an
earlier HEAD no longer reverse-applies and is superseded rather than kept.

## Review-driven fix waves

Five fix waves followed the foundation commit, numbered 1 and 3 to 6 in the
order they were worked. Four of them — waves 1, 3, 5 and 6 — answered
P-numbered findings from independent review passes that returned NEEDS_FIXES,
and each of those findings was reproduced before any code changed. Wave 4 was
not a review finding: it was an owner-ordered scope addition over the brief's
closed conflict list, and is labelled as such in its own section.

This paragraph previously read "three independent reviews", which was both
stale and a category error: it counted review passes, not waves, and the
section beneath it documents five. Every wave was tests-first.

### Wave 1 — `dec823a6` fail closed on non-primitive values and marker gating

- **P1, values stored by reference, escalating to a promotion bypass.**
  `_snapshot_value` converted a few container types and returned the caller's
  object for everything else. An arbitrary mutable object stayed tamperable
  after construction, and an `int` subclass whose `__str__` disagreed with its
  magnitude let a 25.4 mm claim and a 999 in claim promote together with no
  `UNIT_CONFLICT`, because the conflict rule normalized via
  `Decimal(str(value))` while nothing ever converted the stored value.
- Admitted value types are now exactly what the documented JSON/JSONL contract
  can represent: `None`, `bool`, `int`, finite `float`, `str`, object with
  exact-`str` keys, and array. Containers are rebuilt into immutable
  equivalents; scalars are admitted by exact type only. `Decimal`, `bytes`,
  `bytearray`, `memoryview`, `complex`, sets, non-finite floats, non-`str`
  mapping keys, and every `int`/`float`/`str` subclass are refused at
  construction.
- Values are snapshotted **before** validation, so every rule inspects the
  exact value the record stores.
- The same mechanism was found unprompted on the record's text fields and
  closed the same way: a `str` subclass overriding `__eq__`/`__ne__` promoted a
  PENDING assertion, defeated the `--brand` guard, and accepted a wrong
  quarantine `owner_role`. Text fields now require an exact `str`.
- **P2, mating-part rule gated on one `entity_kind` literal.** See the
  corrected statement under "Normalized field and conflict conventions".
- `--brand` is validated as a canonical ID itself, not only against each
  candidate: with zero candidates nothing was validated and two empty files
  were written on exit `0`.
- Unordered collections are refused wherever stored record order is observable
  output. A `set` of assertions produced a different stored order in every
  fresh process. Refusal was chosen over imposing an order, because there is
  no repo-sourced canonical assertion ordering and inventing one would
  silently reorder deliberately ordered input.

### Wave 3 — `798164f7` rebuild stored records from exact library types

- **P2, the exact-type root was closed at the leaf and left open at the
  record.** `_snapshot_assertion` and the adapter constructor rebuilt
  `FieldAssertion` and `SourceContext`, but `ingest()` and `IngestionResult`
  only `isinstance`-checked `CandidateRecord` / `QuarantineRecord` and then
  retained the caller's instance. A subclass overriding `__getattribute__`
  answered honestly while the rules inspected it and differently once a
  consumer read the stored record. Reproduced on both paths: a
  `CandidateRecord` subclass promoted with a PENDING assertion visible to
  consumers, and a `QuarantineRecord` subclass whose stored `reason_code`
  became `TOTALLY_UNMAPPED_REASON` after validation passed.
- Both now require exact type identity and are rebuilt. `SourceContext` is
  tightened to exact type for uniformity; it was already rebuilt, so that is
  not a newly closed hole.
- Not reachable from the CLI or any data path: the CLI builds real records from
  parsed JSON. It needs an in-process caller who subclasses one of our own
  frozen records, so it is strictly weaker than the original P1.
- **P3, public-surface regression introduced by wave 1.** The exact-`str` check
  refused `SourceAuthority` / `DocumentKind` / `RightsState` members, which
  `adapters.__all__` exports and `isinstance` accepted at `1be54922`. Members
  are now normalized to their canonical `.value` at the boundary and the
  normalized text is stored, so the field still holds an exact `str`.
  Normalizing was chosen over dropping the exports, because they are exported
  for callers to use.

### Wave 4 — `33b252cc` quarantine contradicting sources

Owner-ordered scope addition, recorded as such. The brief's conflict list is
closed; the owner reviewed the carry-forward list and ruled that OEM documents
contradicting each other in the same unit, promoted silently, is unacceptable
and must not be possible. This is not the implementer widening scope.

Three conditions closed as one family:

1. Two sources contradicting for one dimensional field. New reason code
   `DIMENSION_SOURCE_CONFLICT` owned by `Geometry and Units Reviewer`. Before
   this, two OEM PDFs claiming 10 mm and 999 mm for one `geometry.width`
   promoted with no reason code at all.
2. PDF versus CAD under `dimensions.*`, not `geometry.*` alone. Same meaning
   and owner, so `PDF_CAD_GEOMETRY_CONFLICT` keeps its code and gains the
   second dimensional prefix.
3. Identity disagreement between any two sources. New reason code
   `IDENTITY_SOURCE_CONFLICT` owned by `Identity and SKU Reviewer`. Covers OEM
   versus `OTHER` as ordered, plus OEM versus OEM and distributor versus
   `OTHER`, which were open for the same reason.

The two new codes are general contradiction codes with their own distinct
meaning. `UNIT_CONFLICT`, `PDF_CAD_GEOMETRY_CONFLICT` and
`OEM_DISTRIBUTOR_IDENTITY_CONFLICT` are unchanged and remain narrower
refinements naming which pairing disagreed, so no existing code is overloaded.
A contradiction therefore reports the general code and, where applicable, the
specific one; four existing tests were updated to expect both, and all of
those cases already quarantined.

Exact decimal equality, no tolerance. A close-enough threshold would be an
engineering number with no provenance, which is the failure mode this registry
exists to prevent. Accepted consequence, already ruled on: `0.3` versus
`0.30000000000000004` quarantines. Decimal comparison is numeric, so `10`
versus `10.0` mm does not.

Findings-by-code census for **wave 4**, over 30 constructed candidate families
at that wave, measured
before and after: promoted fell from `21` to `14`, which is exactly the 14
legitimate families; the 7 previously silent contradictions now quarantine;
all 9 pre-existing quarantine families still quarantine. No legitimate family
became a quarantine.

### Wave 5 — `8c90d52e` mating-part contradictions and exact inch conversion

- **5A, P2, the owner ruling reached one more documented field.** Two OEM
  sources naming different exact mating parts for one candidate still promoted:
  `requires_mating_part=true` plus `exact_mating_part_id` `"MP-1"` from an OEM
  PDF and `"MP-2"` from an OEM CAD gave PROMOTED, shipping one candidate
  carrying two mutually exclusive mating parts.
  `compatibility.exact_mating_part_id` is an explicit named module constant with
  a documented convention, so it sits on the documented-convention side of the
  brief's line.
- New reason code `MATING_PART_SOURCE_CONFLICT` owned by
  `BOM and Compatibility Reviewer`. Not reused from `IDENTITY_SOURCE_CONFLICT`,
  because an exact mating part is not an identity of this candidate but a
  BOM/compatibility relation; routing it to the Identity and SKU Reviewer would
  send a BOM contradiction to the wrong desk.
  `REQUIRED_MATING_PART_MISSING` already maps mating-part concerns to the same
  owner, so the new code is consistent with the closed map.
- The rule is deliberately not generalized to arbitrary field paths. See "Which
  field paths are compared, and which are deliberately not".
- **5B, P3, the inch conversion was not exact, so an earlier edition of this
  report was false.** `_dimension_parts` computed `number * Decimal("25.4")`
  under the default decimal context at `prec=28`, which rounds the product.
  10^30 in and 10^30+1 in compared equal and promoted — an implicit
  28-significant-digit tolerance underneath a rule founded on exact equality.
  The mechanism was fixed rather than the claim weakened: the millimetre
  magnitude is now a `Fraction` and the inch factor is `Fraction(127, 5)`, which
  is exactly 25.4. `Fraction` is exact and unbounded, so there is no precision
  ceiling. `mm` values were already exact via context-free `Decimal(str(...))`
  and are unchanged.
- Bounding, kept deliberately: the 5B defect was unreachable with physically
  plausible hardware data, and only via integer values, since no float carries
  28 significant digits. It was fixed because the wave-4 rule is founded on
  exact set cardinality, so the mechanism has to actually be exact.
- **5C**, a false clause in this report's known-divergences section, is
  corrected there.

### Wave 6 — `db485292` contradicting mating-part markers

Owner-ruling coverage, not implementer discretion. The ruling was about
contradiction, not about which field carries it, so it reaches this case too.

- **6A, P2.** Two sources disagreeing on
  `compatibility.requires_mating_part` promoted a self-contradictory record.
  Reproduced: marker `True` from an OEM PDF and `False` from an OEM CAD, with
  MP-1 present, gave PROMOTED with the stored record carrying both `True` and
  `False` for one field. The marker is a documented named module constant, so
  it sits on the documented-convention side of the brief's line exactly as
  `exact_mating_part_id` did in wave 5.
- **Reason code: `MATING_PART_SOURCE_CONFLICT` reused, no fourth code.** The
  two `compatibility.` fields are one documented convention family answering to
  one desk, and the established pattern here is one general contradiction code
  per field family rather than per sub-fact: `DIMENSION_SOURCE_CONFLICT`
  already covers same-unit and cross-unit disagreement alike, and
  `IDENTITY_SOURCE_CONFLICT` covers every authority pairing. Splitting
  mating-part contradictions across two codes would fragment one family while
  the other two keep theirs whole. Evidence IDs distinguish the sub-cases, and
  `add_reason` merges evidence, so a candidate whose marker and whose part ID
  both contradict yields one record naming all four disagreeing assertions.
- **The two mating codes can now co-fire, and that is intended.** Before wave 6
  `MATING_PART_SOURCE_CONFLICT` and `REQUIRED_MATING_PART_MISSING` were
  provably mutually exclusive: one required at least two distinct mating IDs,
  the other required none. A candidate whose sources disagree on the marker
  with no mating ID present now trips both, which is correct — the sources
  disagree on whether a part is required, and under the `true` reading the
  required ID is absent. Ordering is deterministic through `_REASON_ORDER`
  (`MATING_PART_SOURCE_CONFLICT` then `REQUIRED_MATING_PART_MISSING`), reason
  codes remain unique per result, and the case is pinned by a test.
- **6B**, a provenance table that was labelled with the wave-5 HEAD while
  carrying wave-4 byte counts and digests, is corrected: the table above is now
  generated from `git cat-file` against the committed objects.
- **6C**, two false or self-contradicting report statements, are corrected in
  place: the compared-field sentence above, and the "three existing tests were
  updated" count, which is four.

### Census across the waves

The census is the regression control for every contradiction rule: it measures
which candidate families promote and which quarantine, before and after each
change, so a rule that silently blocks legitimate data is caught immediately.
Each wave extended the corpus rather than replacing it, and each wave re-ran
the previous wave's families unchanged to prove nothing flipped.

| Wave | Families | Promoted | Quarantined | Prior families re-run |
|---|---:|---:|---:|---|
| 4 | 30 | 14 | 16 | n/a, first census |
| 5 | 39 | 21 | 18 | 30 wave-4 families identical |
| 6 | 46 | 25 | 21 | 39 wave-5 families identical |

`quarantine → promote` is **0** in every wave. The only promoted-to-quarantine
movements are the intended ones: the 7 silently-promoted contradictions closed
in wave 4, the 2 closed in wave 5, and the 3 closed in wave 6. Every legitimate
family that promoted in an earlier wave still promotes, including the free-text
control families that must never be compared.

An earlier edition of this report recorded only the wave-4 census, which left
"30 families" reading as the current corpus when waves 5 and 6 had each run a
larger one. The per-wave figures above are derived by re-running each wave's
census harness, not retyped.

### Suite counts across the waves

| Suite | `1be54922` | `dec823a6` | `798164f7` | `33b252cc` | `8c90d52e` | `db485292` |
|---|---:|---:|---:|---:|---:|---:|
| `tests.component_master.registry.test_ingestion` | 43 | 61 | 68 | 79 | 87 | 91 |
| registry directory | 233 | 251 | 258 | 269 | 277 | 281 |
| verifier contracts | 12 | 12 | 12 | 12 | 12 | 12 |
| full dynamic discovery | 503 | 521 | 528 | 539 | 547 | 551 |

Every delta is added test methods only: 18, then 7, then 11, then 8, then 4. No test was
removed; four expectations were updated in place, all on cases that already
quarantined. The verifier-contract suite is unchanged throughout, because it
does not include the registry tests.

## Known divergences and limitations

- **`evidence.py` and `ingestion.py` now disagree, deliberately.**
  `EvidenceVault.register` still accepts a `FieldAssertion` carrying
  `Decimal`, `bytearray` or `set`, which `CandidateRecord` now refuses to
  ingest. The divergence is intended and tested on the ingestion side;
  `evidence.py` was out of scope and was not touched. A later task that wants
  one admitted-value contract across both modules must reconcile it there.
- **The CLI's `except` clause does not cover every escape.**
  `AttributeError` and `RecursionError` escape
  `except (OSError, TypeError, ValueError, json.JSONDecodeError)`, so a very
  deeply nested value exits `1` with a bare traceback instead of exit `2` with
  a reason. Pre-existing at `1be54922`, still fail-closed with no output files
  written. It **is** reachable from ordinary JSONL: a well-formed line whose
  value is a 3,000-deep nested array reaches it, verified directly. An earlier
  edition of this report claimed it was unreachable from JSONL input; that
  claim was false and has been removed. Not fixed.
- **RED evidence for the wave 1 regression suites was reconstructed, and is
  not admissible as evidence.** During wave 1, RED was observed first-hand
  only for `tests.component_master.registry.test_ingestion`. The registry
  directory, verifier-contract and full-discovery RED figures were produced
  afterwards in a throwaway copy of the tree with the implementation reverted;
  that copy had no `.git`, which made two `git check-ignore` tests fail with
  returncode `128` for reasons unrelated to the change. That reconstruction is
  worth nothing as evidence and is not cited here as if it were. Nothing in
  this report rests on it: the guards are fully observable at the final state
  and are pinned by 48 added test methods. Waves 3 to 6 observed RED directly
  on the module under test.
- No source-hash, `EvidenceVault` or immutable-source-bytes binding to
  `review_state="VERIFIED"`; `SourceContext` versus `SourceSnapshot`
  `rights_state` reconciliation; regional order-code collision; pack/finish
  ambiguity; and per-entity ID namespacing all remain carry-forward. The last
  two need a taxonomy Task 7 deliberately does not create.

## Authority boundary

Task 7 is only an ingestion/quarantine foundation. It does not establish a
populated worldwide registry, signed release, network monitor, conflict case
workflow, runtime integration, freeze/export authority, structural
qualification, production readiness, or manufacturing readiness.

`SHADOW` / `NOT-FOR-PRODUCTION` remains unchanged. Daph remains one
tenant/pilot and does not own shared platform governance or canonical global
registry data. Task 8 and ledger closeout were not started.
