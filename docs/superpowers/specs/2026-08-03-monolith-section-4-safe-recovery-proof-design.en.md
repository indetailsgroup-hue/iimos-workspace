# MONOLITH Section 4 Design: Safe Recovery & Proof

**Status:** OWNER DECISION — Minimum corrections approved on 3 August 2026 and incorporated; bounded consistency review passed with no blocker

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

The beloved-safe-recovery deep research is evidence and a UX appendix to this section, not another normative architecture layer. A role view is a derived projection of the existing `RecoveryCase`, events, receipts, policy, and broker result. This design does **not** create a separately persisted “Recovery Presentation Contract,” a second recovery source of truth, or a new lifecycle state.

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
| `assignmentRequest` / `assignmentAcceptance` | Requested assignee, requested time, delivery/acknowledgement evidence, acceptance mode and time, deadline, and applicable auto-assignment policy; request is not acceptance |
| `owner` / `escalationOwner` | Accepted recovery owner, or owner established by an explicit authoritative auto-assignment policy, plus escalation authority; a governed service may execute but cannot replace required human authority |
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
| CONTAINED | ASSIGNED | Named recipient has accepted the assignment, or an incident policy has recorded authoritative auto-assignment; authority scope, deadline, and escalation path exist | assignment-accepted or auto-assigned event |
| ASSIGNED | RECOVERING | Approved recovery command with idempotency key and expected case version | recovery-start event |
| RECOVERING | REVERIFYING | Recovery effects reconciled; no ambiguous prepared effect remains | recovery-complete event |
| ASSIGNED, RECOVERING, or REVERIFYING | CONTAINED | Newly discovered impact invalidates stale recovery or proof; affected capability remains closed | containment-expansion event |
| REVERIFYING | RESUMED | CapabilityPolicy passes on exact recovered revision; acknowledgement threshold and authority quorum hold | resume DecisionReceipt |
| REVERIFYING | RETIRED | Qualified authority closes the capability or branch permanently | retirement DecisionReceipt |
| REVERIFYING | SUPERSEDED | Replacement identity and evidence chain exist; old capability remains unusable | supersede DecisionReceipt |

`EXPLAIN` is a presentation responsibility available in every state, not a persistent state. `OPEN` is not a lifecycle value. A new failure after a terminal state creates a related new `RecoveryCase`; a terminal case is not reopened. Any newly discovered impact before terminal disposition returns the case to CONTAINED through a new event and invalidates stale recovery work.

An assignment request leaves the case in CONTAINED. Requested, delivered, read, accepted, rejected, expired, and policy-auto-assigned outcomes are distinct `RecoveryEvent` facts; they do not add a ninth state. Assignment acceptance is also distinct from containment acknowledgement: the former establishes who owns recovery, while the latter proves that a specific impact target has been stopped or isolated.

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

### 8.1 Notification intent and acknowledgement semantics

Notifications are derived effects, not authority or lifecycle state. Routing resolves risk, actor capability, required response, deadline, and acknowledgement mode into four intents:

| Intent | Use | Default delivery |
| --- | --- | --- |
| Immediate interruption | Imminent unsafe production/release, required critical containment acknowledgement, or time-critical authority action | Named role and current escalation path only |
| Action queue | Required correction, review, assignment acceptance, or evidence task that is actionable but not immediately dangerous | Responsible role queue with due time |
| Digest | Non-urgent dependency or coordination update | Scheduled role digest |
| Activity log only | Routine retry, autosave, diagnostic, or resolved transient event with no human response required | Searchable audit/activity record; no interruption |

Related failures are deduplicated into one current case and one current owner. “FYI” does not justify a group interruption. Delivery, read, assignment acceptance, and containment acknowledgement are separate immutable events and must never be inferred from one another. The current notification and workflow-handoff helpers are semantic starting points only; they do not conform until these intent and acknowledgement rules are implemented and tested.

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

### 12.4 Broker-first implementation prerequisite

Before an operational recovery UI may label an export, release, resume, or download action as server-authorized, the implementation must:

1. inventory and classify every browser, API, server, worker, cache, offline/USB, integration, generated-artifact, and legacy egress surface;
2. remove, physically isolate as non-controlled preview, or converge every controlled surface on the server-owned broker;
3. pass UI/API/worker/server contract tests plus dynamic external-channel and bypass tests; and only then
4. enable the role-view action and begin the usability pilot.

A clearly labelled non-operational visualization may be built earlier for design validation. It cannot issue an `EgressGrant`, claim server authorization, or substitute for broker convergence.

## 13. Role Experience

The front stage uses calm, factual language and one primary recovery action.

### 13.1 Derived role view and truth precedence

Every role view answers five universal questions; this is not an eight-field or other fixed-count cap:

| Universal question | Canonical source |
| --- | --- |
| What is safe now? | `RecoveryCase.state`, `lastSafeState`, and current `impactTargets` |
| What happened and why? | `failureClass`, `riskClass`, and latest relevant `RecoveryEvent` |
| What exact scope and revision are affected? | `authorityScopeRef`, project/package/revision/capability IDs, `affectedClaims`, and `impactTargets` |
| What is the consequence and permitted use? | invalidated receipts, impact status, `CapabilityPolicy`, and current broker result |
| What is my next authorized action? | `primaryNextAction`, accepted owner, actor authority, policy version, and required proof |

Policy-critical role fields remain visible; non-critical detail may use progressive disclosure. The presenter stores no competing authority. Each actionable view binds `caseVersion`, latest event ID, policy version, evidence-snapshot ID, actor scope, and rendered time, and the server revalidates all of them at commit. A newer HOLD, containment expansion, revocation, invalidated receipt, or broker denial dominates any older Approved/ACTIVE display. If any required source is missing, mismatched, stale, unavailable, or has UNKNOWN impact coverage, the view says **“Status updating—work remains paused”** and offers only refresh, report issue, or authorized escalation. It must not claim that unconfirmed scope is unaffected.

### 13.2 Frozen V1 Role Registry

“Each role” in Section 4 means every role in `V1-CASEWORK-KITCHEN-RECOVERY-01`; changing the denominator requires a versioned registry decision.

| Role | Recovery purpose | Policy-critical information and action boundary |
| --- | --- | --- |
| Client / homeowner | Understand the decision consequence | Saved selection, paused status, consequence, permitted use, and simple client decision; no technical or fabrication resolution |
| Interior designer | Correct design intent | Affected objects, last safe revision, proposed correction, invalidated receipts, reversible branch; cannot override containment or self-release |
| Architect / technical reviewer | Make qualified disposition | Changed claims, evidence denominator, missing/contradictory proof, independent assessment, and permitted dispositions |
| Coordinator / information manager | Restore accountable flow | Accepted owner, assignment status, deadline, affected downstream roles, and escalation; no event-firehose or inferred acceptance |
| Estimator / procurement | Protect commercial basis | Priced-BOM revision, affected quantities/specifications/suppliers, commercial consequence, and reprice task; cannot approve geometry or machining |
| Factory engineer | Validate manufacturing translation | Quarantined candidate, checks, machine/profile, permitted-use class, last ACTIVE comparison, acknowledgement and HOLD/escalation controls |
| CNC operator | Use only granted machine package | Exact ACTIVE package or bounded qualification grant, named machine/procedure, restriction, expiry, HOLD and report-issue; no spindle/motion/cycle-start control |
| Installer / field verifier | Prove field condition and installation disposition | Exact site/installation revision, unresolved dimensions/interfaces, evidence capture requirement, safe stop, and escalation; cannot sign technical or production release unless separately authorized |

### 13.3 Role-specific presentation examples

#### Client

“Your selection is saved. Technical release is paused because the site width is not yet measured.” The client is never asked to resolve manufacturing detail.

#### Designer

Shows the affected objects, last safe revision, proposed correction, invalidated receipts, and a reversible branch. The designer can edit or resubmit but cannot override technical containment.

#### Reviewer

Shows exact changed claims, missing/contradictory evidence, mandatory coverage denominator, independent assessment, and permitted dispositions.

#### Coordinator

Shows the single blocking recovery task, named owner, deadline, downstream roles affected, and escalation path—not a feed of every system event.

#### Estimator / procurement

Shows the priced-BOM basis, items and supplier specifications affected by the exact revision, commercial consequence, and one reprice or substitution-evidence task. It never presents commercial confirmation as geometry or machining approval.

#### Factory engineer

Shows a quarantined exact candidate, failed checks, machine context, permitted-use class, comparison with the last ACTIVE package, containment acknowledgement, and HOLD/escalation controls. No production file is downloadable before ACTIVE commit; bounded qualification output requires its own restricted grant.

#### CNC operator

In production mode, shows only ACTIVE packages matched to the machine plus HOLD and report-issue controls. In qualification mode, shows only the bounded coupon or first-article grant, its conspicuous restriction, named procedure, and expiry. MONOLITH never presents a spindle, motion, or cycle-start action.

#### Installer / field verifier

Shows the exact site and installation revision, open dimensions or interfaces, required field evidence, safe-stop consequence, and one capture or escalation action. Field observation cannot silently alter design truth or confer technical/production approval.

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

### 15.1 Operational measurement protocol

The orientation clock starts only when the role view is fully rendered and announced after open or material state change. It stops when the participant correctly identifies the last safe revision, consequence, permitted use, and next authorized action. Results are reported separately by registry version, role, seeded scenario, risk class, language, and required device width; pooled results cannot hide a failing cell.

The correction/acknowledgement/reversal denominator is every started seeded task. Exclusions are limited to predeclared test-harness failures frozen before unblinding. Report numerator, denominator, and 95% confidence interval for each cell. The sample-size/power plan, success rubric, support definition, and unsafe-action adjudication are frozen before the pilot. Median orientation time is at most 30 seconds per required role/scenario cell, and at least 95% complete the assigned non-safety task without support. Any unsafe critical action, bypass, or incorrect permission inference is an immediate stop regardless of aggregate percentage.

Also record safe first action, backtracking, evidence opening, support escape, and workload against the approved baseline. Automated property, state-machine, contract, and failure-injection tests prove control invariants; the human pilot supplies usability evidence only and cannot establish runtime authority or production readiness.

### 15.2 Contract acceptance criteria

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
13. assignment request and acceptance remain distinct, and ASSIGNED requires accepted or policy-auto-assigned ownership without adding a lifecycle state;
14. every view in the frozen V1 Role Registry derives from canonical case/event/receipt/policy/broker facts and fails closed on stale, missing, mismatched, unavailable, or UNKNOWN inputs;
15. notification delivery, read, assignment acceptance, and containment acknowledgement remain distinct and follow the four-intent routing model;
16. broker convergence and cross-surface contract/bypass tests pass before any operational UI claims server-authorized export, release, resume, or download;
17. each required role/scenario cell meets the 30-second orientation target under the frozen measurement protocol;
18. at least 95% of each required non-safety pilot cell completes its assigned correction, containment acknowledgement, or reversal without support or external reconstruction, with numerator, denominator, and confidence interval reported;
19. NOT-FOR-PRODUCTION remains active until exact machine, postprocessor, operator-procedure, owner-release, and production-egress gates pass.

## 16. Stop Conditions

Stop or redesign if:

- a mutable case is presented as an immutable receipt, or an immutable receipt changes;
- two state names describe the same lifecycle position or an undefined transition is accepted;
- a case enters ASSIGNED before the recipient accepts, unless an explicit authoritative auto-assignment policy records the assignment;
- a critical seeded defect reaches release;
- a missing or empty mandatory report set passes;
- the same actor can satisfy incompatible duties;
- a crash produces divergent canonical state and release evidence;
- a stale worker, device, or grant can reopen or export after a newer fencing token;
- a stale or missing revocation policy permits offline use;
- any path outside the EgressBroker exports a controlled artifact, or any path represents a non-ACTIVE package as PRODUCTION;
- an operational UI claims server authorization before every controlled egress surface converges on the broker and passes contract/bypass tests;
- a stale, missing, mismatched, unavailable, or UNKNOWN role-view input is presented as safe, ready, unaffected, or actionable;
- a NOT-FOR-PRODUCTION artifact receives PRODUCTION use, or qualification evidence cannot be generated without doing so;
- any safety, authority, evidence, revocation, or controlled-egress action bypasses the governed chain—the tolerated safety-bypass rate is zero;
- more than 10% of non-safety coordination tasks in the pilot occur outside the governed chain; this is a UX redesign trigger and never relaxes the zero-bypass safety rule;
- the role denominator is not frozen, pooled metrics conceal a failing role/scenario cell, or an exclusion is introduced after unblinding;
- users cannot identify the last safe revision, owner, consequence, permitted use, and next authorized action without assistance.

## 17. Current Source Trace Informing This Design

- Sequential manifest, HEAD, and geometry effects: `src/core/export/commitApprovedState.ts:200-205`.
- Report checks that search for FAIL without explicit required cardinality: `src/core/manufacturing/export/enforceExportGate.ts:119-157`.
- Client-side approval requirement with default one approval and any-role matching: `src/core/manufacturing/release/releaseStore.ts:47-97`.
- Current visible client release path builds and auto-downloads after browser-held approval state: `src/components/ui/ModelingReleasePanel.tsx:44-86`.
- Additional current release/export surfaces include direct App/AppShell export wiring, browser packet generation/download, and upload only after download: `src/App.tsx:717-742,878-892`, `src/components/layout/AppShell.tsx:176,221`, and `src/factory/packet/useFactoryPacket.ts:341-365`. These paths make broker-first convergence a prerequisite rather than a UI follow-up.
- Local, clearable key audit and revocation state: `src/release/keys/audit.ts:4-8,56-73,121-126` and `src/release/keys/revocationPolicy.ts:53-84,197-202`.
- A direct ZIP function without full package structure exists at `server/src/export/exportServiceP22a.ts:426-467`; no caller was found in the inspected `src`, `server`, or `tests` tree, so source presence is not treated as a verified reachable production path.
- Bypass scanner currently scoped to `src`: `scripts/gates/bypass-scan.ts:82-87`.
- Full verification workflow is push/manual-triggered: `.github/workflows/verify-full.yml:5-12`.
- Gate pull-request workflow paths do not include release/export modules: `.github/workflows/gate-tests.yml:13-16`.
- Release route remains an incomplete surface: `src/routes/index.tsx:873-880`.
- Existing workflow authz, quorum, idempotency, and audit primitives are semantic reuse candidates, not verified canonical server authority: `src/workflow/approval/authz.ts`, `quorum.ts`, `idempotency.ts`, and `src/workflow/audit/writer.ts`.
- Current handoff validation records process order and active site but does not establish recipient acceptance: `src/workflow/handoff/canonical.ts:35-57`.
- Current notification routing sends personal responsibility/approval to direct push and cross-team handoff/FYI to group messages; it does not implement the four notification intents or distinct acknowledgement semantics: `src/workflow/notification/routing.ts:4-23`.
- No exact runtime identifiers for `RecoveryCase`, `RecoveryEvent`, `DecisionReceipt`, `CapabilityPolicy`, `EgressBroker`, or a role-view contract were found in the inspected `src`, `server`, or `supabase` source. They remain target design contracts, not current production facts.
- Evidence/UX appendix: [Beloved Safe Recovery UX deep research](../../research/2026-08-03-monolith-beloved-safe-recovery-ux-deep-research.en.md) and its [bounded scrutiny correction report](../../research/2026-08-03-monolith-beloved-safe-recovery-ux-scrutiny.en.md).

## 18. Approved Next Step After Written-Spec Review

The bounded consistency re-scrutinize of this corrected contract passed with no blocker. The next approved design deliverable is the bilingual interactive Section 4 visualization as a clearly labelled non-operational artifact. Broker-surface inventory and convergence remain the first implementation prerequisite. Do not implement production release, schema, policy, egress, or machine-control changes from this document without a separate approved implementation plan.
