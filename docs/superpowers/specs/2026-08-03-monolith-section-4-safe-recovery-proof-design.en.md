# MONOLITH Section 4 Design: Safe Recovery & Proof

**Status:** OWNER DECISION — Revised after approved scrutiny on 3 August 2026; written specification pending owner review

**Product direction:** Decision Chain UX

**Section purpose:** Contain failure, preserve authority, recover safely, and prove readiness before work resumes

**Applies first to:** Casework and kitchen packages in shadow / NOT-FOR-PRODUCTION operation

## 1. Decision Summary

Section 4 will not present Failure Handling, Governance, and Testing Gates as three separate products. It will define one shared **Safe Recovery Model**, one backstage **Capability Qualification Policy**, and one server-owned **Egress Broker**.

The runtime flow is:

`Detect → Contain → Explain → Assign → Recover → Re-verify → Resume / Retire`

The user sees one current `RecoveryCase`: the safest next action, responsible owner, last safe revision, consequence, and permitted use. MONOLITH records append-only `RecoveryEvent` entries and purpose-specific immutable `DecisionReceipt` records behind the scenes, while handling invalidation, dependency propagation, retries, reconciliation, notifications, and evidence collection.

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

### A. Patch one overloaded `FailureReceipt` — rejected

Using one object as both mutable recovery state and immutable proof creates contradictory lifecycle semantics and encourages every subsystem to add fields to the same record.

### B. Build a new universal governance platform — rejected

A general incident, workflow, policy, evidence, and export platform would duplicate substantial workflow, approval, audit, release, and policy primitives already present in the product and would exceed the bounded V1.

### C. Split recovery model plus capability gate — approved

`RecoveryCase` is the current projection. `RecoveryEvent` and `DecisionReceipt` records are append-only proof. `CapabilityPolicy` decides authority and evidence. `EgressBroker` is the only controlled path for production-usable or qualification output. Existing approval, quorum, idempotency, audit, release, and policy primitives are reused as semantic starting points, not assumed to be current production authority.

## 4. Scope and Non-Goals

### Included

- failure classification and containment;
- current-state `RecoveryCase` projections;
- append-only `RecoveryEvent` and exact-revision `DecisionReceipt` records;
- recovery ownership and next-action routing;
- authority and separation-of-duty evaluation;
- retry, idempotency, reconciliation, and compensation semantics;
- HOLD, REVOKE, SUPERSEDE, RETIRE, and RESUME decisions;
- capability-to-control-claim evidence mapping with cardinality, freshness, and minimum evidence level;
- permitted-use classes for preview, shadow simulation, qualification, and production;
- server-owned egress brokering, inventory, and no-bypass enforcement;
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

This section also does not ratify a tenant / organization / site schema. That authority model is a prerequisite for canonical recovery persistence and remains a separate governance decision.

## 5. Repository and Current-State Boundary

The parent repository is the governance/bootstrap root. The nested `determined-williams/` repository is the active product source. Substantial release, gate, audit, verification, and factory code exists, but the currently visible implementations include parallel abstractions, local-only governance stores, aspirational test documentation, and routes that remain incomplete.

This design therefore distinguishes:

- **TARGET CONTROL:** required by this specification;
- **VERIFIED SOURCE FACT:** directly supported by current source;
- **TEST EVIDENCE:** produced by an executable, commit-bound check;
- **OPERATIONAL EVIDENCE:** produced by shadow, coupon, first-article, or observed field operation;
- **UNKNOWN:** not established by the available evidence.

The design does not claim current production readiness and does not disable NOT-FOR-PRODUCTION controls.

## 6. Safe Recovery Model

The model separates current state from immutable proof. A receipt never mutates, and an editable case is never presented as proof.

### 6.1 Four bounded objects

#### `RecoveryCase` — mutable current projection

| Field | Requirement |
| --- | --- |
| `caseId` / `schemaVersion` | Stable global identity and explicit schema version |
| `failureClass` / `riskClass` | Failure mechanism and LOW, MEDIUM, HIGH, or CRITICAL risk; these are independent |
| `detectedAt` / `detectedBy` | Trusted timestamp and resolved human or system source |
| `authorityScopeRef` | Versioned tenant / organization / site authority reference; never inferred from UI state or hard-coded to `site_code` |
| `projectId`, `packageId`, `revisionId`, `capabilityId` | Exact affected project, work package, immutable revision, and controlled capability |
| `affectedClaims` / `impactTargets` | Claim dependency edges and every order, part, export, person, endpoint, machine, cache, or offline copy requiring containment |
| `lastSafeState` | Exact revision and scope whose permitted use remains valid; unaffected scope must be explicit |
| `invalidatedReceiptIds` | Purpose-specific receipts no longer usable |
| `owner` / `escalationOwner` | Named recovery owner and escalation authority; a governed service may execute but cannot replace required human authority |
| `primaryNextAction` | One plain-language primary action, with secondary actions disclosed on demand |
| `capabilityPolicyRef` | Exact policy ID and version that defines authority, proof, acknowledgement, and permitted use |
| `expectedVersion` / `fencingToken` | Optimistic concurrency version and token that prevents a stale worker or device from reopening capability |
| `state` | DETECTED, CONTAINED, ASSIGNED, RECOVERING, REVERIFYING, RESUMED, RETIRED, or SUPERSEDED |
| `relatedCaseIds` | Duplicate, parent, child, recurrence, or superseding case relationships |

#### `RecoveryEvent` — append-only lifecycle fact

Every accepted transition writes an immutable event containing `eventId`, `caseId`, event type, trusted time, resolved actor or governed service, expected and resulting case versions, command idempotency key, correlation and causation IDs, policy reference, payload digest, and audit-chain anchor. Duplicate detection links events or cases; it never silently overwrites the first observation.

#### `DecisionReceipt` — immutable purpose-specific proof

Every consequential human or governed-service decision produces a new immutable receipt containing the exact revision, capability, purpose, scope, evidence snapshot and digests, unchecked scope, conditions, consequences, resolved signer identities, authority assignments, separation-of-duty result, policy version, decision, timestamp, and previous-receipt chain anchor. Superseding or invalidating a receipt creates another receipt; the original remains.

#### `CapabilityPolicy` and `EgressGrant` — authority to act

`CapabilityPolicy` maps action, incident class, risk, permitted-use class, authority set, separation rules, mandatory control claims, expected evidence cardinality, minimum evidence level, freshness, containment acknowledgement, and allowed egress. `EgressBroker` issues a short-lived, purpose-bound, non-transferable `EgressGrant` only after that policy passes.

### 6.2 Single state machine

| From | To | Minimum precondition | Immutable output |
| --- | --- | --- | --- |
| none | DETECTED | Deduplicated detection bound to exact scope and revision | detection event |
| DETECTED | CONTAINED | Capability closed; impact targets discovered or explicitly UNKNOWN and fail-closed | containment event |
| CONTAINED | ASSIGNED | Named owner, authority scope, deadline, and escalation path | assignment event |
| ASSIGNED | RECOVERING | Approved recovery command with idempotency key and expected case version | recovery-start event |
| RECOVERING | REVERIFYING | Recovery effects reconciled; no ambiguous prepared effect remains | recovery-complete event |
| ASSIGNED, RECOVERING, or REVERIFYING | CONTAINED | Newly discovered impact invalidates stale recovery or proof; affected capability remains closed | containment-expansion event |
| REVERIFYING | RESUMED | CapabilityPolicy passes on exact recovered revision; acknowledgement threshold and authority quorum hold | resume DecisionReceipt |
| REVERIFYING | RETIRED | Qualified authority closes the capability or branch permanently | retirement DecisionReceipt |
| REVERIFYING | SUPERSEDED | Replacement identity and evidence chain exist; old capability remains unusable | supersede DecisionReceipt |

`EXPLAIN` is a presentation responsibility available in every state, not a persistent state. `OPEN` is not a lifecycle value. A new failure after a terminal state creates a related new `RecoveryCase`; a terminal case is not reopened. Any newly discovered impact before terminal disposition returns the case to CONTAINED through a new event and invalidates stale recovery work.

### 6.3 Containment completion

Each `ImpactTarget` has target type, exact identity, required action, required acknowledgement mode, lease or policy expiry, status, last attempt, and acknowledgement evidence. Resume is forbidden until the CapabilityPolicy threshold holds. Safety, security, integrity, revocation, and production-egress incidents require 100% acknowledgement or documented physical isolation approved by the incident-specific authority; UNKNOWN is not success.

## 7. Failure Classes and Default Containment

`failureClass` explains the mechanism; `riskClass` determines urgency and control strength. No failure class automatically implies one fixed risk level. The table gives minimum containment only; CapabilityPolicy resolves the final authority and proof for the affected capability.

| Failure class | Example | Default containment | Required authority input |
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

1. one canonical transaction that records the RecoveryEvent, advances the RecoveryCase projection, and records effect intent together;
2. a stable idempotency key scoped to resolved actor or service, command, case, capability, and expected revision;
3. expected case version, expected project revision, and a fencing token before mutation;
4. an outbox/effect ledger for downstream work;
5. retry with a defined ceiling and expiry;
6. reconciliation for ambiguous provider outcomes;
7. compensation only when the original effect cannot be made atomic;
8. an immutable event for each retry, compensation, acknowledgement, or terminal failure.

The minimum effect lifecycle is `PREPARED → COMMITTED` or `PREPARED → ABORTED`. A reconciler must detect and resolve prepared records left by process failure. Stale workers and devices are rejected by the fencing token. The user must never be asked to guess whether a click succeeded.

## 9. Governance and Authority

### 9.1 Authority is server-owned

UI role labels, hidden buttons, local state, email links, and chat identity are not permission. The server evaluates the actor, authority assignment, scope, purpose, exact revision, validity window, and separation-of-duty policy at commit time.

### 9.2 Authority moments

| Decision context | Required authority set | Separation rule |
| --- | --- | --- |
| Accept client concept | Client decision authority | Cannot imply technical or fabrication approval |
| Confirm design intent | Assigned designer | Cannot release own work to production alone |
| Record technical disposition | Qualified independent reviewer | Independent-first for critical claims |
| Confirm priced BOM basis | Commercial authority | Cannot approve geometry or machining |
| Confirm manufacturing translation | Factory engineer | Cannot alone open production egress |
| Commit ACTIVE manufacturing release | Qualified reviewer or factory-translation authority **and** Authorized Releaser | Two distinct verified humans |
| HOLD | Any authorized safety role | Immediate one-person fail-safe action; reason and scope required |
| REVOKE | Incident-specific revocation authority | Immediate fail-safe action; production egress closes without waiting for resume quorum |
| Resume after manufacturing or professional-safety incident | Qualified independent reviewer or factory-translation authority **and** Authorized Releaser | Two distinct verified humans; fresh exact-revision evidence |
| Resume after security, key, tenancy, audit-integrity, or tampering incident | Security Authority **and** Authorized Releaser | Two distinct verified humans; compromised identity or key cannot participate |
| Resume after infrastructure incident that can reopen production egress | Service Owner **and** Authorized Releaser | Two distinct verified humans plus reconciled effect ledger |

Self-approval, expired authority, scope mismatch, duplicate person under two roles, unverifiable identity, or an identity affected by the incident fail closed.

For this specification, **high risk** means any action that creates or opens production-usable egress, or resumes a capability after a safety, security, tenancy, audit-integrity, key, tampering, or revocation incident. CapabilityPolicy selects the incident-specific pair from the table; there is no generic reviewer/factory substitute for security authority. HOLD and REVOKE remain one-person fail-safe actions for an authorized incident-specific role. RESUME always creates a new DecisionReceipt; prior approval or release receipts are never reused.

### 9.3 Audit and revocation

The canonical audit and revocation registry is append-only, server-owned, tenant-scoped, and tamper-evident. Local storage may cache signed policy snapshots but cannot create, clear, or override canonical authority.

Offline enforcement requires:

- signed monotonic policy version;
- issued-at and expires-at timestamps;
- maximum accepted policy age;
- explicit machine and tenant scope;
- fail-closed behavior when policy is missing, invalid, or stale;
- reconciliation before any resumed controlled egress.

### 9.4 Authority-scope prerequisite

Canonical recovery persistence depends on a ratified tenant / organization / site authority model. Until that decision and migration pass their own denial-path tests, this design uses a versioned `authorityScopeRef` contract and must not hard-code `site_code` as the permanent tenant boundary. No multi-tenant safety claim may be derived from the presentation layer or from source-field presence alone.

## 10. Capability Qualification Policy

Every controlled action resolves one versioned CapabilityPolicy before it can run. A policy is executable only when it names the capability, action, incident class, permitted-use class, authority set, control claims, expected evidence cardinality, minimum evidence level, freshness, acknowledgement threshold, and allowed egress. A narrative statement that evidence is “complete” is not a gate.

### 10.1 Control-claim catalog

| Claim ID | Control claim | Minimum executable evidence | Operational evidence | Failure consequence |
| --- | --- | --- | --- | --- |
| `CC-ATOMIC` | Commit is all-or-nothing | Failure injection at every write boundary; crash recovery; fenced idempotent replay | Recovery drill | Release capability closed |
| `CC-COVERAGE` | Evidence coverage is complete | Expected-versus-observed cardinality, scope, freshness, duplicate, missing, and UNKNOWN tests | Seeded-defect trial | Candidate remains quarantined |
| `CC-SOD` | Separation of duties holds | Property tests across actors, roles, expiry, scope, affected identities, and self-approval | Observed shadow approvals | Commit denied |
| `CC-REVOKE` | Revocation propagates | Offline stale-policy, key compromise, cache, fencing, and clock-boundary tests | Revocation exercise at every registered endpoint | Egress closed |
| `CC-EGRESS` | No export bypass exists | Broker contract tests, unregistered-egress build/runtime denial, plus static scan | External-channel observation | Release blocked; incident opened |
| `CC-MACHINE` | Package matches machine and purpose | Manifest, checksum, unit, origin, postprocessor, tool, geometry envelope, machine profile, and permitted-use tests | Simulation, supervised coupon, then first article | Machine use prohibited |
| `CC-RECOVERY-UX` | Recovery is usable | Role E2E tests for detect-to-resume and detect-to-retire | Facilitated pilot with each role | Redesign recovery UX |

### 10.2 Evidence levels

- **E0 — Executable source evidence:** unit, property, model-based, contract, integration, security, and failure-injection results bound to commit and environment.
- **E1 — Shadow operational evidence:** real project, no production authority, independently adjudicated defects.
- **E2 — Qualified factory evidence:** simulator, supervised bounded coupon, first article, named machine profile, approved postprocessor, and operator procedure.
- **E3 — Sustained operational evidence:** monitored field performance, incidents, false-negative/positive review, recovery drills, and expiry/requalification.

E0 never implies E2 or E3. A Domain Pack earns only the capability supported by its current evidence level.

### 10.3 Minimum action policies

| Action | Permitted-use class | Minimum policy result |
| --- | --- | --- |
| Client/design preview | PREVIEW | Exact revision and visible non-production status; no machine-executable artifact |
| Shadow simulation | SHADOW_SIMULATION | E0 for relevant claims; sandboxed non-machine endpoint; output cannot be promoted by renaming |
| Qualification coupon | QUALIFICATION_COUPON | Relevant E0 plus supervised E1, bounded coupon geometry, named machine/operator, single-purpose grant, and physical isolation from production queue |
| First article | QUALIFICATION_FIRST_ARTICLE | Coupon passed; named revision, postprocessor, machine profile, operator procedure, independent disposition, and restricted grant |
| ACTIVE production release | PRODUCTION | Machine- and purpose-specific claims reach E2; every other mandatory claim meets its policy-defined level; incident-specific authority quorum, 100% required containment acknowledgement or signed not-applicable result, and brokered egress |
| Production resume | PRODUCTION | Fresh evidence on recovered exact revision; no prior receipt reuse; incident-specific quorum and fencing token advance |

Each concrete CapabilityPolicy must replace “relevant” and “mandatory” with explicit claim IDs, expected counts, freshness windows, scope match, and expiry before that policy can be activated.

### 10.4 Gate evaluation

The gate resolves the exact policy, computes the expected claim set, joins only evidence matching build, policy, adapter, machine profile, authority scope, package, and revision, then rejects missing, duplicate, stale, mismatched, cancelled, quarantined, or UNKNOWN evidence. It verifies minimum evidence levels, authority quorum, separation of duties, containment acknowledgement, and permitted use before an EgressGrant is issued. An empty expected or observed mandatory set fails unless the policy explicitly declares that claim not applicable with a signed rationale.

## 11. Testing Gates

### 11.1 Mandatory test families

1. Unit and property tests for invariants and boundary values.
2. Model-based state-machine tests for every legal and illegal transition, terminal-case immutability, recurrence, duplicate detection, and return-to-CONTAINED behavior.
3. Contract tests for RecoveryCase projections, RecoveryEvent entries, DecisionReceipt records, UI, API, worker, server, and external adapter agreement.
4. Concurrency, fencing, and idempotency tests, including duplicate, reordered, delayed, and stale-device delivery.
5. Failure-injection tests at each persistence, signing, audit, notification, acknowledgement, policy, broker, and export boundary.
6. Seeded-defect tests for stale revision, empty/missing/duplicate evidence, contradictory dimensions, unsupported inference, wrong hardware/material, and post-review change.
7. Authority tests for denial, expiry, scope, self-approval, incident-affected identity, and every two-person pairing.
8. Offline and revocation tests, including stale cache, missing policy, fencing-token mismatch, and clock skew.
9. Egress-bypass tests covering browser download, API, server, worker, object URL, cache, USB package, scripts, integrations, generated artifacts, and legacy paths.
10. Permitted-use tests proving that preview, shadow, coupon, and first-article artifacts cannot become production by copying, renaming, replay, or policy downgrade.
11. Role-specific E2E and accessibility tests in Thai and English at desktop and required mobile widths.
12. Shadow simulation, supervised bounded coupon, and first-article qualification for each machine profile and postprocessor.

### 11.2 CI evidence contract

Each required check publishes a machine-readable record containing:

- control claim IDs;
- repository, commit, ref, protected-branch status, and dirty-tree status;
- environment, runner identity, toolchain, and dependency lock;
- workflow, run, job, and command identity;
- total, passed, failed, skipped, cancelled, and quarantined counts;
- expected evidence count, observed count, not-applicable count with signed rationale, and UNKNOWN count;
- independent typecheck, build, migration, security, test, and broker-gate outcomes;
- start/end timestamps;
- artifact digests;
- signed provenance or equivalent tamper-evident attestation and retention location;
- final PASS or FAIL status computed from every mandatory outcome;
- expiry/requalification date when applicable.

Required checks run on pull requests and protected release branches. A script that exists but is not wired as a required check is not a gate.

## 12. Egress Control

### 12.1 Permitted-use classes

| Class | Permitted output | Prohibited use |
| --- | --- | --- |
| PREVIEW | Human-viewable concept or coordination artifact with exact revision and visible status | Machine execution or fabrication instruction |
| SHADOW_SIMULATION | Sandboxed simulation input/output that cannot address a production machine | Promotion to qualification or production by copying or renaming |
| QUALIFICATION_COUPON | Bounded test geometry for one named machine, operator, procedure, and grant | Reusable project package or production queue |
| QUALIFICATION_FIRST_ARTICLE | Restricted first-article package after coupon evidence | General production or another machine/profile |
| PRODUCTION | Exact ACTIVE package for a qualified machine/profile through controlled egress | Any use outside grant purpose, scope, or expiry |

NOT-FOR-PRODUCTION packages may use PREVIEW, SHADOW_SIMULATION, QUALIFICATION_COUPON, or QUALIFICATION_FIRST_ARTICLE only when their exact CapabilityPolicy passes. They can never receive a PRODUCTION grant. Qualification artifacts remain conspicuously marked, scope-limited, non-promotable, and auditable.

### 12.2 Server-owned Egress Broker

MONOLITH maintains one governed Egress Registry, but the registry is not the enforcement boundary. Every controlled browser download, direct ZIP, API, worker, server exporter, integration, cache delivery, offline package, USB package, and machine-facing adapter must call the server-owned EgressBroker.

The broker resolves the exact package and policy, verifies manifest, signature, revocation, machine/profile, permitted use, evidence, authority, acknowledgement, and fencing token, then issues a short-lived `EgressGrant` bound to grant ID, artifact digest, purpose, permitted-use class, actor, endpoint, machine scope, policy version, expiry, and one-time nonce. The result—allow or deny—is append-only audited.

No client badge, filename, MIME type, hidden button, or local store creates permission. Superseded, held, revoked, quarantined, stale, or mismatched packages fail closed. NOT-FOR-PRODUCTION packages are rejected for PRODUCTION while remaining eligible only for the explicitly governed qualification classes above.

### 12.3 No-bypass enforcement

An egress implementation that is not registered with and authorized by the broker fails build or runtime. Legacy paths are removed, physically isolated as non-controlled preview tooling, or migrated behind the broker. Static scanning across `src`, `server`, workers, API routes, scripts, integrations, generated-artifact definitions, and adapter code is required defense in depth, but scanning alone never proves no bypass. Dynamic contract tests and observed external-channel trials must also pass.

## 13. Role Experience

The front stage uses calm, factual language and one primary recovery action.

### Client

“Your selection is saved. Technical release is paused because the site width is not yet measured.” The client is never asked to resolve manufacturing detail.

### Designer

Shows the affected objects, last safe revision, proposed correction, invalidated receipts, and a reversible branch. The designer can edit or resubmit but cannot override technical containment.

### Reviewer

Shows exact changed claims, missing/contradictory evidence, mandatory coverage denominator, independent assessment, and permitted dispositions.

### Coordinator

Shows the single blocking recovery task, named owner, deadline, downstream roles affected, and escalation path—not a feed of every system event.

### Factory engineer

Shows a quarantined exact candidate, failed checks, machine context, permitted-use class, comparison with the last ACTIVE package, containment acknowledgement, and HOLD/escalation controls. No production file is downloadable before ACTIVE commit; bounded qualification output requires its own restricted grant.

### CNC operator

In production mode, shows only ACTIVE packages matched to the machine plus HOLD and report-issue controls. In qualification mode, shows only the bounded coupon or first-article grant, its conspicuous restriction, named procedure, and expiry. MONOLITH never presents a spindle, motion, or cycle-start action.

## 14. Section 4 Visualization Contract

The approved visualization will contain two synchronized views:

1. **Recovery Case and Event Chain:** the single eight-state lifecycle, current projection, append-only events, immutable decision receipts, impact acknowledgements, and last safe revision.
2. **Capability Gate and Egress:** the policy, evidence level, authority quorum, permitted-use class, and broker decision required before a capability can reopen or an artifact can leave.

The reviewer can select representative scenarios:

- missing site evidence;
- stale revision after review;
- unauthorized or self-approval attempt;
- missing verification report;
- post-release defect;
- offline or stale revocation policy;
- supervised qualification coupon while NOT-FOR-PRODUCTION remains active.

Each scenario updates the same fields: RecoveryCase state, latest immutable event, containment coverage, last safe state, owner, next action, invalidated scope, CapabilityPolicy, required proof, permitted-use class, and EgressBroker result. It must visually distinguish mutable projection from immutable proof and never imply that a UI badge itself enforces safety.

## 15. Acceptance Criteria

Section 4 is accepted only when:

1. RecoveryCase, RecoveryEvent, and DecisionReceipt responsibilities are separate and testable;
2. one state enum and transition table govern every legal and illegal transition;
3. every failure scenario has containment, acknowledgement, authority, recovery, and re-verification;
4. missing, empty, duplicate, stale, mismatched, or UNKNOWN mandatory evidence cannot be represented as PASS;
5. every CapabilityPolicy names exact claims, counts, minimum level, freshness, quorum, acknowledgement, and permitted use;
6. every consequential action binds resolved actor, purpose, scope, policy, capability, and exact revision;
7. incident-specific high-risk release and resume policies enforce distinct-human separation of duties;
8. transaction failure or a stale worker cannot leave an unexplained or reopened ambiguous state;
9. canonical audit and revocation cannot be cleared or overridden from a user device;
10. every controlled egress path is registered, brokered, dynamically tested, and audited;
11. qualification output is possible without granting production use, and no qualification artifact can be promoted by copying, renaming, replay, or policy downgrade;
12. the tenant / organization / site authority model is ratified before canonical recovery persistence is implemented;
13. each role identifies the last safe revision, owner, consequence, permitted use, and primary next action in a median of 30 seconds or less;
14. at least 95% of pilot participants complete a correction, containment acknowledgement, or reversal without support or external reconstruction;
15. NOT-FOR-PRODUCTION remains active until exact machine, postprocessor, operator-procedure, owner-release, and production-egress gates pass.

## 16. Stop Conditions

Stop or redesign if:

- a mutable case is presented as an immutable receipt, or an immutable receipt changes;
- two state names describe the same lifecycle position or an undefined transition is accepted;
- a critical seeded defect reaches release;
- a missing or empty mandatory report set passes;
- the same actor can satisfy incompatible duties;
- a crash produces divergent canonical state and release evidence;
- a stale worker, device, or grant can reopen or export after a newer fencing token;
- a stale or missing revocation policy permits offline use;
- any path outside the EgressBroker exports a controlled artifact, or any path represents a non-ACTIVE package as PRODUCTION;
- a NOT-FOR-PRODUCTION artifact receives PRODUCTION use, or qualification evidence cannot be generated without doing so;
- any safety, authority, evidence, revocation, or controlled-egress action bypasses the governed chain—the tolerated safety-bypass rate is zero;
- more than 10% of non-safety coordination tasks in the pilot occur outside the governed chain; this is a UX redesign trigger and never relaxes the zero-bypass safety rule;
- users cannot identify the last safe revision, owner, and next action without assistance.

## 17. Current Source Trace Informing This Design

- Sequential manifest, HEAD, and geometry effects: `src/core/export/commitApprovedState.ts:200-205`.
- Report checks that search for FAIL without explicit required cardinality: `src/core/manufacturing/export/enforceExportGate.ts:119-157`.
- Client-side approval requirement with default one approval and any-role matching: `src/core/manufacturing/release/releaseStore.ts:47-97`.
- Current visible client release path builds and auto-downloads after browser-held approval state: `src/components/ui/ModelingReleasePanel.tsx:44-86`.
- Local, clearable key audit and revocation state: `src/release/keys/audit.ts:4-8,56-73,121-126` and `src/release/keys/revocationPolicy.ts:53-84,197-202`.
- A direct ZIP function without full package structure exists at `server/src/export/exportServiceP22a.ts:426-467`; no caller was found in the inspected `src`, `server`, or `tests` tree, so source presence is not treated as a verified reachable production path.
- Bypass scanner currently scoped to `src`: `scripts/gates/bypass-scan.ts:82-87`.
- Full verification workflow is push/manual-triggered: `.github/workflows/verify-full.yml:5-12`.
- Gate pull-request workflow paths do not include release/export modules: `.github/workflows/gate-tests.yml:13-16`.
- Release route remains an incomplete surface: `src/routes/index.tsx:873-880`.
- Existing workflow authz, quorum, idempotency, and audit primitives are semantic reuse candidates, not verified canonical server authority: `src/workflow/approval/authz.ts`, `quorum.ts`, `idempotency.ts`, and `src/workflow/audit/writer.ts`.

## 18. Approved Next Step After Written-Spec Review

After the owner confirms this revised written specification, run one bounded re-scrutinize against the updated contract. If no blocker remains, create the bilingual interactive Section 4 visualization. Do not implement production release, schema, policy, egress, or machine-control changes from this document without a separate approved implementation plan.
