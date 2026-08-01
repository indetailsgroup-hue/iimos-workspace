# Task 7 brief — reviewed ingestion and quarantine

## Boundary

- Work only in `C:\tmp\monolith-global-connector-registry-parent` on
  `codex/global-connector-registry`.
- Clean base:
  `addadab0093e3de05c3af31c01248fd2da596ff1`.
- Use strict TDD. Stop before Task 8 and before ledger closeout.
- Do not touch owner roots, nested runtime, existing ledgers, verifier, release
  files, cohort data, or registry seeds.
- Do not push, merge, rebase, or change branches.

## Exact tracked scope

Create only:

1. `packages/component-master/src/monolith_component_master/ingestion.py`
2. `packages/component-master/src/monolith_component_master/adapters/__init__.py`
3. `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py`
4. `tools/connector_registry/ingest_reviewed.py`
5. `tests/component_master/registry/test_ingestion.py`

## Required public contract

- Preserve the plan fields exactly for frozen `CandidateRecord`,
  `QuarantineRecord`, and `IngestionResult`.
- `ReviewedAssertionAdapter.ingest(candidate)` returns one immutable result and
  never mutates a candidate, assertion, evidence state, registry, release, or
  file.
- A candidate is promoted only when every required check passes. Any issue
  means `promoted == ()`.
- Return one deterministic, deduplicated quarantine record per detected reason
  so simultaneous problems are visible. Evidence IDs must be immutable,
  canonical assertion IDs and relevant to the reason.
- The adapter never changes `FieldAssertion.review_state`.

## Resolved dependency gap: explicit source context

The plan requires OEM-versus-distributor and PDF-versus-CAD conflict detection,
but neither `CandidateRecord` nor `FieldAssertion` identifies source authority
or document kind. Add the smallest immutable source-context contract needed by
the adapter constructor. It must carry:

- canonical `source_id`;
- explicit authority: `OEM`, `AUTHORIZED_DISTRIBUTOR`, or `OTHER`;
- explicit document kind: `PDF`, `CAD`, `WEB`, `API`, `FEED`, or `MANUAL`;
- explicit rights state.

Do not infer authority, document kind, or rights from a URL, filename,
publisher string, source ID, or assertion value. Every assertion source must
have exactly one explicit source context. Missing context fails closed.
Promotion requires rights explicitly cleared for factual indexing. Unknown,
missing, conflicting, or restricted rights quarantine the candidate. This
context is input metadata only; it does not enlarge the three plan-specified
result record shapes.

## Required validation

- Defensive immutable snapshots for candidates, assertions, source contexts,
  result tuples, quarantine evidence IDs, and adapter inputs.
- Reject booleans where numeric values are expected.
- Reject blank or malformed IDs, wrong types, duplicate assertion IDs,
  duplicate source contexts, assertion entity mismatches, empty assertion
  sets, and unsupported source enum values at the nearest construction
  boundary.
- Keep `entity_kind` open but nonblank; do not invent a closed global product
  taxonomy in Task 7.
- `HUMAN_REVIEWED` is the only extraction method eligible for promotion.
  AI/unreviewed methods quarantine as `REVIEW_REQUIRED`.
- Every assertion must already be `VERIFIED`; otherwise quarantine as
  `ASSERTION_NOT_VERIFIED`.

## Conflict rules

Use explicit, documented normalized field conventions in this foundation. Do
not guess conflicts from free text.

- Dimensional values are objects with numeric `value` and explicit supported
  `unit` (`mm` or `in`). Convert with decimal arithmetic. Unsupported or absent
  dimensional units quarantine as `UNITS_AMBIGUOUS`.
- For the same entity and logical dimensional field, disagreeing metric and
  imperial claims quarantine as `UNIT_CONFLICT`; exact converted equality is
  not a conflict.
- For the same identity field, an OEM assertion and an
  `AUTHORIZED_DISTRIBUTOR` assertion with different normalized scalar values
  quarantine as `OEM_DISTRIBUTOR_IDENTITY_CONFLICT`.
- For the same geometry field, explicit `PDF` and `CAD` assertions with
  different normalized dimensional values quarantine as
  `PDF_CAD_GEOMETRY_CONFLICT`.
- A connector assembly candidate that explicitly requires a mating part but
  lacks a nonblank exact mating-part ID quarantines as
  `REQUIRED_MATING_PART_MISSING`. Make the normalized marker/field convention
  explicit and test it; do not require a mating part for unrelated entity
  kinds.
- Unclear rights quarantine as `RIGHTS_UNCERTAIN`.
- Missing source context has its own fail-closed reason and cannot be promoted.

Map every reason deterministically to the appropriate owner role, including
`OEM Evidence Curator`, `Identity and SKU Reviewer`,
`Geometry and Units Reviewer`, `BOM and Compatibility Reviewer`, and
`Rights and Licensing Reviewer`.

## CLI

`tools/connector_registry/ingest_reviewed.py --help` must exit zero and list
`--brand`, `--source-manifest`, `--assertions`, `--out`, and `--quarantine`.

- Use a deterministic, documented local JSON/JSONL input/output contract.
- No network access, AI review, source-state mutation, release mutation, or
  automatic promotion of pending assertions.
- Validate `--brand` against every candidate.
- Malformed input or output collisions fail nonzero without silently producing
  a partial promoted release.
- Quarantine output remains separate from promoted output.

## Required tests

Start with an import-level RED failure. Cover at least:

- unit equality and conflict, ambiguous unit, decimal boundary;
- OEM/distributor identity equality and conflict;
- PDF/CAD geometry equality and conflict;
- unreviewed AI extraction;
- pending assertion;
- required mating part present/missing;
- rights allowed/unknown/restricted and missing source context;
- multiple simultaneous reasons, deterministic order and evidence ownership;
- immutability, duplicate/malformed inputs and no mutation;
- promoted versus quarantined mutual exclusion;
- CLI help and one valid/quarantined fixture path;
- no registry/release write or manufacturing-authority API.

Run the Task 7 module, Tasks 2–6 regression cohorts, verifier contracts, full
discovery, and the clean-HEAD verifier. Clean only verified generated cache
artifacts inside the isolated worktree.

Commit the five-path implementation with:

`feat(registry): quarantine unreviewed connector evidence`

Create ignored:

- `.superpowers/sdd/task-7-ingestion-report.md`
- `.superpowers/sdd/task-7-ingestion-review-package.diff`

The package must be a full-index binary diff from
`addadab0093e3de05c3af31c01248fd2da596ff1` to the Task 7 HEAD and reverse-apply
cleanly.

Task 7 remains an ingestion/quarantine foundation only. It does not establish a
populated worldwide registry, release signing, network monitoring, case
resolution workflow, runtime integration, freeze/export authority, or
production/manufacturing readiness. `NOT-FOR-PRODUCTION` remains unchanged;
Daph remains one tenant/pilot.
