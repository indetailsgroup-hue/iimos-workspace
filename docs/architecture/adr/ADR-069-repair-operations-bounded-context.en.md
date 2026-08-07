# ADR-069 — Repair Operations as a Bounded Context in MONOLITH

**Status:** Owner-approved Phase A architecture decision with mandatory pre-Phase-B conditions

**Written ADR approval:** `APPROVED — 7 August 2026`

**Date:** 7 August 2026

**Runtime authority:** None

**G−0:** `DISABLED`

**G−1:** `BLOCKED`

## 1. Decision

MONOLITH will model building repair and facility-maintenance work as a new **Repair Operations** bounded context inside the existing modular monolith. **Repair Intelligence** is an advisory layer inside that context, not the system of record and not an independent runtime or microservice.

The isolated Repair Intelligence repository will not be merged directly. It remains an incubation and governance evidence source. Selected domain rules and approved records may later be ported through explicit adapters after the gates in this ADR are satisfied.

This ADR authorizes architecture documentation only. It does not authorize runtime code, database schema, LINE configuration, webhook routing, feature activation, human drills, vendor contact, spending, or live operation.

## 2. Context and intent

The operational goal is to let a building employee report a problem with minimal effort—normally by sending photos through the building's LINE channel—while MONOLITH performs evidence preservation, routing, case coordination, safety escalation, sourcing, approval, acceptance, and audit behind the scenes.

MONOLITH already contains horizontal platform capabilities for LINE webhook verification and idempotency, identity binding, site-scoped access, capture artifacts, media retrieval, notifications, approval patterns, and append-only audit. Duplicating those capabilities would create competing trust boundaries.

The existing `installation_issues` model cannot be the Repair Operations aggregate. It is tied to installation projects and rooms and has only an installation-specific lifecycle. The existing workflow process is also fixed to the Sale-to-Installation sequence and must not be distorted to represent building repair.

## 3. Provenance

The approved incubation source is:

- Source repository: `MONOLITH Repair Intelligence/repair-intelligence-app`
- Source branch: `codex/g0-readiness-record-set-prototype`
- Source commit: `080af03ea71253952ffc91095eeba36eaafe61d1`
- G−0 manifest SHA-256: `237A328F78E35336E616C350152236A5350E43F7F34D059665E06D3EE6266EC4`

This provenance records the design source only. It grants no execution or commercial authority.

## 4. Boundary and ownership

Repair Operations owns the repair-case lifecycle, safety containment state, technical assessment, assignments, sourcing coordination, quote comparison, authority references, work execution, inspection, acceptance, warranty, reopening, and case event history.

It reuses MONOLITH platform seams through adapters:

- LINE signature verification, channel topology, webhook idempotency, and outbound delivery;
- identity binding and actor resolution;
- `site_code` access boundaries and row-level-security conventions;
- capture artifacts and media retrieval;
- notification, retry, quiet-hours, and escalation infrastructure;
- immutable audit patterns and the shared autonomy vocabulary.

It must not directly reuse or overload:

- `installation_issues` as a facility repair case;
- the fixed Sale-to-Installation process model as a repair lifecycle;
- existing work-item approvals as financial or legal authority;
- generated G−0 forms as runtime records.

## 5. Conceptual flow

`LINE webhook → context binding lookup → fail-closed context router → repair intake draft → human triage → repair case → safety/assessment → sourcing/authority → work → inspection/acceptance → close or reopen`

No photo, message, classifier output, or feature flag may independently create an external commitment, diagnose a safety condition, select a vendor, approve spending, or close a case.

## 6. Mandatory conditions before Phase B

### 6.1 Fail-closed context routing

Routing must be based first on controlled binding metadata, not AI content classification. The router must return one of four explicit results:

- `RESOLVED_INSTALLATION`
- `RESOLVED_FACILITY_REPAIR`
- `AMBIGUOUS_OR_CONFLICTING`
- `UNBOUND`

`AMBIGUOUS_OR_CONFLICTING` and `UNBOUND` must not enter either business lifecycle. They go to a human-controlled quarantine/triage queue, retain the original evidence under the applicable privacy rule, and produce no completion, procurement, notification-to-vendor, or authority side effect.

If content may indicate immediate danger, the router may only raise the Human Safety Trigger for urgent human review. It must not diagnose from an image. The rule remains: uncertainty escalates; it never silently routes.

### 6.2 Separate retention and privacy control

Before any `facility_repair_evidence` capture type or storage path is created, the project must define a repair-specific data inventory and retention/privacy rule covering images, sender identity, location, asset references, annotations, derived classifications, access logs, and exported copies.

While the Legal Entity and Data Controller remain `UNDEFINED`:

- Preservation Hold overrides automatic deletion and ordinary retention;
- no cleanup worker may delete or expire Repair Operations evidence;
- cross-border or public-cloud extraction remains prohibited unless separately approved for the exact capture type;
- access is least-privilege and every disclosure or controlled copy is logged;
- finding a previously missing record never releases a hold automatically.

Phase B is blocked until the approved retention schedule identifies its legal or contractual basis and the authority that approved it.

### 6.3 Authority-bound activation, not a feature flag alone

A software feature flag is only a technical interlock. It is not an authority grant.

The effective activation condition must be:

`technical_flag = ON` **and** `valid_G1_unblock_record = PRESENT` **and** `authority_reference_matches = TRUE`.

The G−1 Unblock Record must contain unanimous approval from the Corporate Authority Approver, Safety Owner, Privacy/Governance Approver, and Independent Readiness Observer. The Custodian may verify record control but cannot approve activation. Developers, repository maintainers, CI/CD, deployment operators, and database administrators must not be able to manufacture authority merely by changing configuration.

The runtime must fail closed if the authority record is missing, expired, superseded, contradictory, out of scope, or cannot be cryptographically or procedurally matched to the deployed configuration. Silence, elapsed time, deployment success, or an environment variable never activates the route.

### 6.4 Reversible Phase-B design and rollback

Phase B must be additive and removable while no production data or external commitment exists. Before its schema is applied outside an isolated development environment, it must include:

- a dependency inventory for every `repair_*` object and adapter;
- a tested teardown or compensating migration for an empty-data installation;
- no irreversible mutation of installation, LINE, workflow, or capture records;
- feature-off behavior that leaves existing MONOLITH flows unchanged;
- an orphan scan proving that teardown leaves no jobs, bindings, storage objects, policies, functions, triggers, queues, or references behind;
- a retained audit record explaining why the experiment was withdrawn.

Applied migration history must never be rewritten. If shared or production-like infrastructure has received a migration, rollback uses a new compensating migration.

Rollback is required when human drills repeatedly fail without an approved correction path, the Legal Entity/Data Controller cannot be established, authority evidence cannot be verified, privacy/retention controls cannot be approved, or the context boundary proves incompatible with operational reality.

Once real production data or an external commitment exists, clean teardown is no longer sufficient; a separately approved archival, migration, notification, and legal-closeout plan is mandatory.

## 7. Phase boundaries

### Phase A — Architecture Port (authorized by this ADR)

- preserve the isolated repository and provenance;
- record this bounded-context decision;
- document platform reuse and prohibited coupling;
- create no runtime code, schema, route, flag, credential, or live configuration.

### Phase B — Skeleton Integration (not authorized)

May be planned only after all four conditions in section 6 are expressed as testable acceptance criteria. Any later implementation plan requires separate owner approval.

### Phase C — G−0 Human Validation (not authorized)

The nine controlled human drills remain unexecuted until separately authorized. Passing technical tests does not pass this gate.

### Phase D — Controlled G−1 (blocked)

Requires verified Legal Entity, Data Controller, retention schedule, authority/DOA records, unanimous G−1 unblock, and the approved controlled cohort.

### Phase E — Automation Research (blocked)

Automation research is eligible only if the controlled cohort produces the separately governed outcome `AUTOMATION_RESEARCH_ELIGIBLE`. Eligibility is not permission to deploy automation.

## 8. Alternatives rejected

1. **Direct repository merge:** rejected because the source is a governance/readiness prototype, not a MONOLITH runtime feature.
2. **Extend `installation_issues`:** rejected because its aggregate, authorization, location, and lifecycle semantics are installation-specific.
3. **New microservice:** rejected for now because it would duplicate trust boundaries before independent scaling or ownership needs are demonstrated.
4. **Generalize the entire workflow engine first:** rejected as premature. Repair Operations must first prove its domain lifecycle without weakening the existing production workflow.

## 9. Consequences

Positive consequences:

- one MONOLITH trust boundary for LINE, identity, site scope, capture, notification, and audit;
- repair semantics remain explicit and independently testable;
- authority and safety remain human-governed;
- rollback remains possible before production use;
- the user experience can remain LINE-first without making LINE membership an authorization source.

Costs and constraints:

- Repair Operations needs its own lifecycle and application adapters;
- existing LINE group binding requires a context-aware seam rather than installation hard-coding;
- financial approval cannot ship until legal authority and DOA are verified;
- Phase A produces no operational capability.

## 10. Phase-A completion criteria

Phase A is complete only when:

- this English ADR and its Thai edition have matching standalone HTML editions;
- all four pre-Phase-B conditions are explicit and internally consistent;
- provenance identifies the isolated source commit and manifest hash;
- the document states `G−0 = DISABLED` and `G−1 = BLOCKED`;
- no runtime, schema, feature flag, webhook, vendor, spending, or live-data change is included;
- repository diff and bilingual semantic checks pass.

## 11. Decision record

**Verdict:** `APPROVED WITH CONDITIONS — PHASE A ONLY`

**Written ADR approval:** `APPROVED — 7 August 2026`

**Next allowed action:** request separate owner authorization to prepare the Phase-B Implementation Plan

**Next prohibited action:** preparing the Phase-B Implementation Plan or writing Phase-B code until that separate authorization is explicitly granted.
