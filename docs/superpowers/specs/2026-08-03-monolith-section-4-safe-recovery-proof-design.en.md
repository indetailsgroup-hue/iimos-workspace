# MONOLITH Section 4 Design: Safe Recovery & Proof

**Status:** OWNER DECISION — Direction approved 3 August 2026; written specification pending owner review

**Product direction:** Decision Chain UX

**Section purpose:** Contain failure, preserve authority, recover safely, and prove readiness before work resumes

**Applies first to:** Casework and kitchen packages in shadow / NOT-FOR-PRODUCTION operation

## 1. Decision Summary

Section 4 will not present Failure Handling, Governance, and Testing Gates as three separate products. It will define one shared **Safe Recovery Contract** and one backstage **Qualification Evidence Matrix**.

The runtime flow is:

`Detect → Contain → Explain → Assign → Recover → Re-verify → Resume / Retire`

The user sees the safest next action, the responsible owner, and the consequence. MONOLITH handles invalidation, dependency propagation, retries, reconciliation, audit assembly, notifications, and evidence collection behind the scenes.

No failed, stale, contradictory, unauthorized, unverified, or incompletely covered state may silently advance. “No recorded failure” is not equivalent to “all required evidence is present.”

## 2. Intent and Success Condition

The section must make this promise true:

> When something fails, MONOLITH contains the effect, preserves the last safe revision, identifies who owns recovery, and proves the required controls again before permitting work to continue.

Success is not an attractive safety dashboard. Success is an enforceable path in which:

1. the failure is bound to an exact revision and affected scope;
2. the unsafe effect is stopped at the correct boundary;
3. a named authority owns the next decision;
4. recovery is idempotent, observable, and reversible where possible;
5. required evidence is complete, current, and scoped;
6. reopening or retirement creates an immutable receipt;
7. no alternate export, API, worker, cache, USB, or offline path bypasses the same decision.

## 3. Alternatives Considered

### A. Three independent modules — rejected

Separate Failure, Governance, and Testing workspaces would duplicate state, create specialist navigation, and encourage different definitions of “safe.”

### B. Central safety dashboard — rejected

A dashboard improves visibility but can remain observational. It does not guarantee that the actual state transition, export, or machine-package path is blocked.

### C. Shared recovery contract plus evidence matrix — approved

One contract governs every consequential transition. Role-specific surfaces project the same record, while deterministic policy and evidence decide whether the transition may proceed.

## 4. Scope and Non-Goals

### Included

- failure classification and containment;
- exact-revision Failure Receipts;
- recovery ownership and next-action routing;
- authority and separation-of-duty evaluation;
- retry, idempotency, reconciliation, and compensation semantics;
- HOLD, REVOKE, SUPERSEDE, RETIRE, and RESUME decisions;
- control-claim-to-test evidence mapping;
- export-egress inventory and no-bypass enforcement;
- shadow-machine qualification evidence;
- role-appropriate recovery UX.

### Explicitly excluded from this section

- autonomous approval, waiver, release, or incident closure;
- direct machine spindle, motion, or cycle-start control;
- a general workflow builder;
- generic project-level confidence or safety scores;
- automatic regulatory or professional sign-off;
- declaring production readiness from source presence, a passing unit test, or schema validation alone;
- enabling broad Interior Architecture Domain Packs before each pack qualifies independently.

## 5. Repository and Current-State Boundary

The parent repository is the governance/bootstrap root. The nested `determined-williams/` repository is the active product source. Substantial release, gate, audit, verification, and factory code exists, but the currently visible implementations include parallel abstractions, local-only governance stores, aspirational test documentation, and routes that remain incomplete.

This design therefore distinguishes:

- **TARGET CONTROL:** required by this specification;
- **VERIFIED SOURCE FACT:** directly supported by current source;
- **TEST EVIDENCE:** produced by an executable, commit-bound check;
- **OPERATIONAL EVIDENCE:** produced by shadow, coupon, first-article, or observed field operation;
- **UNKNOWN:** not established by the available evidence.

The design does not claim current production readiness and does not disable NOT-FOR-PRODUCTION controls.

## 6. Safe Recovery Contract

Every consequential failure creates one canonical `FailureReceipt`.

### 6.1 Required fields

| Field | Requirement |
| --- | --- |
| `failureId` | Stable, globally unique identity |
| `failureClass` | Evidence, proposal, concurrency, authority, verification, release, post-release, infrastructure, or security |
| `detectedAt` / `detectedBy` | Trusted timestamp and actor/system source |
| `tenantContext` | Canonical tenant / organization / site scope; never inferred from presentation state |
| `projectId`, `packageId`, `revisionId` | Exact affected project, work package, and immutable revision |
| `affectedClaims` | Claim IDs and dependency edges affected |
| `containment` | What was stopped, quarantined, revoked, or made read-only |
| `lastSafeState` | Last state whose permitted use remains valid |
| `invalidatedReceipts` | Purpose-specific receipts no longer usable |
| `owner` | Named recovery owner and authority assignment |
| `nextAction` | One plain-language primary recovery action |
| `retryPolicy` | Idempotency key, retry ceiling, backoff, expiry, and escalation |
| `requiredProof` | Exact checks and evidence needed to re-open |
| `downstreamImpact` | Orders, parts, exports, people, deadlines, and cached copies affected |
| `disposition` | OPEN, CONTAINED, RECOVERING, REVERIFYING, RESUMED, RETIRED, or SUPERSEDED |
| `auditAnchor` | Append-only event and receipt-chain reference |

### 6.2 State semantics

1. **DETECTED:** The event is recorded; no safety claim is implied.
2. **CONTAINED:** The affected capability and egress are closed. The last safe revision remains visible.
3. **ASSIGNED:** A named person or governed service owns the next action.
4. **RECOVERING:** Recovery effects run through idempotent commands and an outbox/effect ledger.
5. **REVERIFYING:** All required control claims are evaluated on the recovered exact revision.
6. **RESUMED:** Required proof is complete and a qualified authority reopens the capability.
7. **RETIRED / SUPERSEDED:** The failed branch or package cannot resume; a replacement receives a new identity and evidence chain.

Transitions are append-only decisions. A failure record is never deleted merely because recovery succeeded.

## 7. Failure Classes and Default Containment

| Failure class | Example | Default containment | Recovery authority |
| --- | --- | --- | --- |
| Evidence | Missing site dimension, stale supplier specification | Keep WIP or review candidate blocked | Evidence owner plus reviewer |
| AI proposal | Unsupported inference, invalid propagation | Discard or quarantine proposal; canonical revision unchanged | Designer |
| Concurrency | Version conflict, partial write, duplicate command | Abort transition; reconcile prepared effects | Transaction/recovery service |
| Authority | Expired assignment, self-approval, wrong scope | Deny action; preserve state | Governance owner |
| Verification | Missing, stale, duplicate, or failed report | Quarantine release candidate | Qualified verifier |
| Release | Signature, manifest, machine-profile, or egress mismatch | Close all production egress | Authorized releaser plus factory authority |
| Post-release | Defect or changed input discovered after ACTIVE | Immediate HOLD or REVOKE; identify affected copies/orders | Incident commander / revocation authority |
| Infrastructure | Offline, timeout, unavailable signer/store | Read-only or queued capture only; no release | Service owner |
| Security | Key compromise, cross-tenant access, tampered audit | Revoke capability and keys; isolate scope | Security authority |

## 8. Transaction and Effect Reliability

“Atomic Commit” is a target control and must not be claimed from sequential writes.

Every consequential transition uses:

1. a canonical transaction that records business state and an effect intent together;
2. a stable idempotency key scoped to actor, command, and expected revision;
3. optimistic version comparison before mutation;
4. an outbox/effect ledger for downstream work;
5. retry with a defined ceiling and expiry;
6. reconciliation for ambiguous provider outcomes;
7. compensation only when the original effect cannot be made atomic;
8. a recovery receipt for each retry, compensation, or terminal failure.

The minimum lifecycle is `PREPARED → COMMITTED` or `PREPARED → ABORTED`. A reconciler must detect and resolve prepared records left by process failure. The user must never be asked to guess whether a click succeeded.

## 9. Governance and Authority

### 9.1 Authority is server-owned

UI role labels, hidden buttons, local state, email links, and chat identity are not permission. The server evaluates the actor, authority assignment, scope, purpose, exact revision, validity window, and separation-of-duty policy at commit time.

### 9.2 Authority moments

| Decision | Required authority | Separation rule |
| --- | --- | --- |
| Accept client concept | Client decision authority | Cannot imply technical or fabrication approval |
| Confirm design intent | Assigned designer | Cannot release own work to production alone |
| Record technical disposition | Qualified independent reviewer | Independent-first for critical claims |
| Confirm priced BOM basis | Commercial authority | Cannot approve geometry or machining |
| Confirm manufacturing translation | Factory engineer | Cannot alone open production egress |
| Commit ACTIVE release | Authorized releaser | High-risk release requires independent qualified evidence and policy-defined two-person control |
| HOLD | Any authorized safety role | Immediate, fail-safe, reason required |
| REVOKE / RESUME | Revocation authority | Resume requires fresh evidence; prior receipt is not reused |

Self-approval, expired authority, scope mismatch, duplicate person under two roles, and unverifiable identity fail closed.

For this specification, **high risk** means any action that creates or opens production-usable egress, or resumes a capability after a safety, security, integrity, or revocation incident. It requires two distinct verified human identities: one qualified reviewer or factory-translation authority and one Authorized Releaser. The same person cannot satisfy both duties. HOLD remains a one-person fail-safe action for any authorized safety role.

### 9.3 Audit and revocation

The canonical audit and revocation registry is append-only, server-owned, tenant-scoped, and tamper-evident. Local storage may cache signed policy snapshots but cannot create, clear, or override canonical authority.

Offline enforcement requires:

- signed monotonic policy version;
- issued-at and expires-at timestamps;
- maximum accepted policy age;
- explicit machine and tenant scope;
- fail-closed behavior when policy is missing, invalid, or stale;
- reconciliation before any resumed controlled egress.

## 10. Qualification Evidence Matrix

Every capability has a `ControlClaim`. A capability remains unavailable until all mandatory claims for its risk class hold on the exact build, policy, adapter, machine profile, and revision.

| Control claim | Minimum executable evidence | Operational evidence | Failure consequence |
| --- | --- | --- | --- |
| Commit is all-or-nothing | Failure injection at every write boundary; crash recovery; idempotent replay | Recovery drill | Release capability closed |
| Evidence coverage is complete | Cardinality, scope, freshness, duplicate, missing, and unknown-state tests | Seeded-defect trial | Candidate remains quarantined |
| Separation of duties holds | Property tests across actors, roles, expiry, scope, and self-approval | Observed shadow approvals | Commit denied |
| Revocation propagates | Offline stale-policy, key compromise, cache, and clock-boundary tests | Revocation exercise at factory endpoint | Egress closed |
| No export bypass exists | Static egress scan plus route/API/worker contract tests | External-channel observation | Release blocked; incident opened |
| Package matches machine | Manifest, checksum, unit, origin, postprocessor, tool, and machine-profile tests | Simulation, coupon, then first article | Machine use prohibited |
| Recovery is usable | Role E2E tests for detect-to-resume and detect-to-retire | Facilitated pilot with each role | Redesign recovery UX |

### 10.1 Evidence levels

- **E0 — Executable source evidence:** unit, property, model-based, contract, integration, security, and failure-injection results bound to commit and environment.
- **E1 — Shadow operational evidence:** real project, no production authority, independently adjudicated defects.
- **E2 — Qualified factory evidence:** simulator, coupon, first article, named machine profile, approved postprocessor, and operator procedure.
- **E3 — Sustained operational evidence:** monitored field performance, incidents, false-negative/positive review, recovery drills, and expiry/requalification.

E0 never implies E2 or E3. A Domain Pack earns only the capability supported by its current evidence level.

## 11. Testing Gates

### 11.1 Mandatory test families

1. Unit and property tests for invariants and boundary values.
2. Model-based state-machine tests for every legal and illegal transition.
3. Contract tests for UI, API, worker, server, and external adapter agreement.
4. Concurrency and idempotency tests, including duplicate and reordered delivery.
5. Failure-injection tests at each persistence, signing, audit, notification, and export boundary.
6. Seeded-defect tests for stale revision, missing evidence, contradictory dimensions, unsupported inference, wrong hardware/material, and post-review change.
7. Authority tests for denial, expiry, scope, self-approval, and two-person control.
8. Offline and revocation tests, including stale cache and clock skew.
9. Egress-bypass tests covering browser download, API, server, worker, cache, USB package, and legacy paths.
10. Role-specific E2E and accessibility tests in Thai and English at desktop and required mobile widths.
11. Shadow simulation, coupon, and first-article qualification for each machine profile and postprocessor.

### 11.2 CI evidence contract

Each required check publishes a machine-readable record containing:

- control claim IDs;
- commit and dirty-tree status;
- environment and dependency lock;
- command identity;
- total, passed, failed, skipped, cancelled, and quarantined counts;
- start/end timestamps;
- artifact digests;
- final PASS or FAIL status;
- expiry/requalification date when applicable.

Required checks run on pull requests and protected release branches. A script that exists but is not wired as a required check is not a gate.

## 12. Egress Control

MONOLITH maintains one governed Egress Registry for every path that can deliver production-usable information. It includes browser downloads, direct ZIPs, APIs, workers, server exporters, integrations, caches, offline packages, USB packages, and machine-facing adapters.

Every egress path must:

1. resolve the exact ACTIVE package;
2. verify manifest, signature, policy, machine profile, and revocation status;
3. reject missing or stale evidence;
4. record actor, endpoint, artifact hash, purpose, and result;
5. reject superseded, held, revoked, quarantined, or NOT-FOR-PRODUCTION packages;
6. expose no alternate direct or legacy production path.

Legacy paths are either removed, isolated as explicitly non-production, or covered by the same server enforcement. Static bypass scanning covers `src`, `server`, workers, API routes, scripts, and adapter code and is a required CI check.

## 13. Role Experience

The front stage uses calm, factual language and one recovery action.

### Client

“Your selection is saved. Technical release is paused because the site width is not yet measured.” The client is never asked to resolve manufacturing detail.

### Designer

Shows the affected objects, last safe revision, proposed correction, invalidated receipts, and a reversible branch. The designer can edit or resubmit but cannot override technical containment.

### Reviewer

Shows exact changed claims, missing/contradictory evidence, mandatory coverage denominator, independent assessment, and permitted dispositions.

### Coordinator

Shows the single blocking recovery task, named owner, deadline, downstream roles affected, and escalation path—not a feed of every system event.

### Factory engineer

Shows a quarantined exact candidate, failed checks, machine context, comparison with the last ACTIVE package, and HOLD/escalation controls. No production file is downloadable before commit.

### CNC operator

Shows only ACTIVE packages matched to the machine plus HOLD and report-issue controls. MONOLITH never presents a spindle, motion, or cycle-start action.

## 14. Section 4 Visualization Contract

The approved visualization will contain two synchronized views:

1. **Safe Recovery Loop:** the seven-state path from Detect to Resume/Retire.
2. **Qualification Evidence Matrix:** the proof required before each capability can reopen.

The reviewer can select representative scenarios:

- missing site evidence;
- stale revision after review;
- unauthorized or self-approval attempt;
- missing verification report;
- post-release defect;
- offline or stale revocation policy.

Each scenario updates the same fields: containment, last safe state, owner, next action, invalidated scope, required proof, and permitted output. It must never imply that a UI badge itself enforces safety.

## 15. Acceptance Criteria

Section 4 is accepted only when:

1. every failure scenario has containment, authority, recovery, and re-verification;
2. missing evidence cannot be represented as PASS;
3. every consequential action binds actor, purpose, scope, and exact revision;
4. high-risk release and resume policies can enforce separation of duties;
5. transaction failure cannot leave an unexplained ambiguous state;
6. canonical audit and revocation cannot be cleared from a user device;
7. every production egress path is inventoried and governed;
8. control claims map to executable evidence with expiry;
9. the interface gives each role one clear recovery action;
10. NOT-FOR-PRODUCTION remains active until machine qualification and owner release gates pass.

## 16. Stop Conditions

Stop or redesign if:

- a critical seeded defect reaches release;
- a missing report passes because the report set is empty;
- the same actor can satisfy incompatible duties;
- a crash produces divergent canonical state and release evidence;
- a stale or missing revocation policy permits offline use;
- any alternate path exports a non-ACTIVE package;
- more than 10% of consequential recovery work occurs outside the governed chain;
- users cannot identify the last safe revision, owner, and next action without assistance.

## 17. Current Source Trace Informing This Design

- Sequential manifest, HEAD, and geometry effects: `src/core/export/commitApprovedState.ts:200-205`.
- Report checks that search for FAIL without explicit required cardinality: `src/core/manufacturing/export/enforceExportGate.ts:119-157`.
- Client-side approval requirement with default one approval and any-role matching: `src/core/manufacturing/release/releaseStore.ts:47-97`.
- Local, clearable key audit and revocation state: `src/release/keys/audit.ts:4-8,56-73,121-126` and `src/release/keys/revocationPolicy.ts:53-84,197-202`.
- Direct ZIP path without full package structure: `server/src/export/exportServiceP22a.ts:426-467`.
- Bypass scanner currently scoped to `src`: `scripts/gates/bypass-scan.ts:82-87`.
- Full verification workflow is push/manual-triggered: `.github/workflows/verify-full.yml:5-12`.
- Gate pull-request workflow paths do not include release/export modules: `.github/workflows/gate-tests.yml:13-16`.
- Release route remains an incomplete surface: `src/routes/index.tsx:873-880`.

## 18. Approved Next Step After Written-Spec Review

After the owner confirms this written specification, create the bilingual interactive Section 4 visualization. Do not implement production release, schema, policy, or machine-control changes from this document without a separate approved implementation plan.
