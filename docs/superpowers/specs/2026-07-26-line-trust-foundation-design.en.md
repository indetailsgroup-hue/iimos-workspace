# MONOLITH LINE Trust Foundation Design

**Edition:** English<br>
**Date:** 26 July 2026<br>
**Status:** Design approved in interactive review; written-spec review pending<br>
**Implementation status:** Not started by this document<br>
**Product repository:** `determined-williams/` (nested active product repository)<br>
**Governance repository:** parent workspace root<br>
**Chosen approach:** Trust Kernel Spine with LINE as the first vertical slice

## 1. Executive decision

MONOLITH will keep LINE as the system's **Human Surface**. LINE OA, LINE groups, rooms, LIFF, and personal push remain natural engagement channels. LINE is not the system of record, is not the authorization authority, and is not a replacement internal chat application.

Every event or action that can affect business truth must pass through one canonical Trust Kernel that resolves:

1. channel and owning tenant;
2. human principal and tenant-local profile;
3. organization, site, project, resource, and revision;
4. membership, role, project-party relationship, scoped grant, and delegation;
5. workflow state, action risk, and authentication assurance;
6. a policy decision of `PERMIT`, `DENY`, `STEP_UP`, or `QUARANTINE`;
7. a transactional business write, decision audit, and atomic delivery intent.

The first release is successful only when a second tenant completes a **shadow proof** with no live customer messaging and with negative isolation tests, grant revocation, risk-based step-up, audit completeness, and delivery reliability proven.

## 2. Repository and evidence baseline

MONOLITH is a two-root system:

- the parent root is the governance/bootstrap repository;
- the nested `determined-williams/` root is the active product repository.

This design follows `CONTEXT.md` and the mandatory 21 July 2026 repository-scope correction. The nested repository contains substantial LINE, workflow, database, field, and manufacturing implementation. Source presence does not prove deployment or production readiness.

The design responds to evidence observed in the nested product source on 26 July 2026:

- LINE webhook, outbound sender, LINE Login, group flows, approval flows, and notification workers exist;
- LINE Login creates a `state` value but the inspected callback path does not verify a stored transaction state before binding identity;
- approval/postback handling is split across ingress paths even though a Messaging API channel has one webhook endpoint;
- some group business actions do not consistently resolve the human actor and authorize the exact project action;
- `line_oa_outbound_messages` does not provide a complete atomic-claim/lease outbox contract;
- the current migration model relies heavily on `site_code`, while a canonical Tenant–Organization–Site invariant is not established;
- some group handler failures can be returned as values and then recorded as processed;
- the current audit implementation is append-restricted but does not yet prove a complete human-actor envelope, tamper evidence, retention, and purge lifecycle.

These are design inputs, not claims that every deployment has the same state. Fresh implementation verification remains mandatory.

## 3. Objectives

The Trust Foundation must:

1. make Tenant the contractual and security boundary;
2. preserve one owning tenant for every business resource;
3. support external organizations through explicit, expiring, revocable access;
4. separate global authentication from tenant-owned personal and employment data;
5. centralize business-action authorization without duplicating IAM inside LINE;
6. make unknown LINE participants useful for evidence capture without granting authority;
7. require risk-based step-up for consequential actions;
8. make delegation explicit, scoped, non-transitive, and non-amplifying;
9. migrate from `site_code` additively without stopping Daph operations;
10. prevent partial business state, false processed-success, and duplicate delivery;
11. produce complete, privacy-aware, tamper-evident decision records;
12. block live tenant expansion until a second-tenant shadow proof passes.

## 4. Non-goals

This design does not:

- build a new internal chat application;
- make LINE a master database;
- perform a platform-wide big-bang replacement of every `site_code`;
- onboard a second tenant to live customer messaging;
- authorize actions from LINE group membership alone;
- make Daph the platform owner or canonical platform tenant;
- complete broader LINE customer-experience features, campaigns, AI sales automation, or analytics;
- claim production readiness from source, design approval, or unit-test presence.

## 5. Approved owner decisions

| Decision | Approved rule |
|---|---|
| Ownership model | Tenant Boundary + Project Parties |
| Cross-organization work | One owner tenant; partners receive scoped guest access |
| Person identity | Minimal global auth subject + tenant-local profile |
| Authorization | Layered: membership, role, project party, grant, delegation, time, workflow state |
| Default | Deny unless the exact action is proven permitted |
| Unknown group actor | Quarantined evidence only |
| Consequential actions | Risk-based step-up through LIFF/Login |
| Delegation | Explicit capability, resource, time, reason; revocable and non-transitive |
| Migration | Additive compatibility bridge from `site_code` |
| First success gate | Tenant 2 shadow proof, with no live customer messaging |
| Delivery approach | Transactional notification intent plus atomic outbox |
| Expansion stop rule | No tenant-2 live onboarding or broader customer messaging until every release gate passes |

## 6. Canonical concepts

### 6.1 Tenant

A Tenant is the security, data-governance, and commercial-contract boundary. Daph is one pilot tenant. Tenant identity must not be inferred from brand name, LINE group name, `site_code`, or operator choice.

### 6.2 Organization, site, and project

- **Organization:** a legal or operating party, such as studio, dealer, factory, contractor, or customer organization.
- **Site:** an operational location belonging to one organization within one tenant context.
- **Project:** a business collaboration owned by exactly one tenant.
- **Project Party:** an organization participating in a project with a declared relationship and permitted scope.

A project can involve many organizations, but it never has multiple owner tenants.

### 6.3 Global auth subject and tenant-local profile

The global auth subject is a pseudonymous authentication anchor. It stores the minimum needed to recognize an authenticated subject and its assurance state.

Names, employment details, customer details, LINE relationship metadata, roles, memberships, and personal data belong to a tenant-local profile. The same human may have profiles in more than one tenant without creating a global personal-data master.

### 6.4 Membership, role, grant, and delegation

- **Membership** establishes a subject's relationship with a tenant or organization.
- **Role** supplies a bounded baseline of permitted action classes.
- **Project Party** proves why an external organization participates.
- **Access Grant** narrows access to resources and actions, with start, expiry, and revocation.
- **Delegation** authorizes an explicit capability on behalf of another principal.

Effective permission is the intersection of these controls. No layer can increase authority beyond the owner tenant's policy or the grantor's own authority.

### 6.5 LINE identity binding

A LINE identity binding associates a verified provider/channel identity with a tenant-local profile and records assurance, lifecycle status, verification method, and timestamps. LINE webhook signature verification proves transport origin and integrity; it does not prove that the source user is authorized for a business action.

## 7. Trust Kernel architecture

The Trust Kernel is a shared policy boundary, not a LINE-specific permission database.

### 7.1 Components

| Component | Responsibility | Must not do |
|---|---|---|
| Unified LINE ingress | Verify raw signature, record receipt, deduplicate, normalize events, dispatch by event type | Decide business permission |
| Tenant/resource resolver | Resolve owner tenant, organization, site, project, resource, revision, and bridge mappings | Guess tenant from display text |
| Principal resolver | Resolve LINE binding, auth subject, tenant profile, membership, and assurance | Treat group membership as identity |
| Action classifier | Produce canonical action, resource references, risk tier, expected revision, and payload digest | Mutate business state |
| Policy decision point | Return permit, deny, step-up, or quarantine with reason codes and policy version | Send LINE messages directly |
| Domain command handler | Apply the permitted workflow transition or business mutation | Bypass policy or audit |
| Decision audit | Record actor, delegation, action, resource, decision, reason, and causation | Store secrets or unnecessary PII |
| Atomic outbox | Persist delivery intent in the same transaction as business state and audit | Call LINE before commit |
| Delivery worker | Atomically claim, lease, send with stable retry identity, and record result | Recompose business permission |
| Compatibility bridge | Map legacy `site_code` to canonical site, organization, and tenant | Remain a permanent security boundary |

### 7.2 Non-bypass invariant

Every business mutation originating from LINE must call the policy decision point. A direct database function, Edge Function, webhook handler, LIFF callback, postback handler, worker, or operator tool that can mutate business state is non-conforming if it bypasses this decision.

## 8. Conceptual data model

Exact migration names may follow repository conventions, but the following concepts are mandatory.

| Entity | Minimum invariant |
|---|---|
| `tenants` | Stable opaque ID; lifecycle status; policy version |
| `organizations` | One owning tenant; organization type and status |
| `sites` | One organization and tenant; legacy alias separated from identity |
| `projects` | Exactly one owner tenant; owning organization/site as applicable |
| `auth_subjects` | Minimal global authentication anchor; no tenant-owned profile data |
| `tenant_profiles` | One tenant context; encrypted/minimized PII |
| `memberships` | Profile-to-tenant/organization relationship with lifecycle |
| `project_parties` | Project-to-organization relationship, purpose, and status |
| `access_grants` | Subject/party, actions, resources, start, expiry, revocation, issuer |
| `delegations` | Delegator, delegate, explicit capabilities, resource scope, time, reason, non-transitive flag |
| `line_identity_bindings` | Provider, channel, LINE subject, tenant profile, assurance, lifecycle |
| `step_up_transactions` | State, nonce, action digest, expected revision, redirect URI, expiry, consumed time |
| `inbound_events` | Event key, channel, raw digest, processing state, lease, attempts, last error |
| `policy_decisions` | Policy version, full actor envelope, action, resource, reason codes, outcome |
| `delivery_outbox` | Intent, destination, stable retry key, status, lease, attempts, next attempt, result |
| `site_code_mappings` | Legacy code, canonical IDs, validity interval, migration status |

Tenant identifiers are required on tenant-owned rows or must be derivable by an enforced foreign-key path that cannot cross tenants. Resource references used for authorization must be canonical and stable.

## 9. Authorization decision contract

### 9.1 Input

`authorize_business_action()` receives a canonical envelope:

- authenticated or transport principal;
- tenant-local profile and membership context;
- owner tenant;
- organization, site, project, resource, and expected revision;
- requested action and normalized payload digest;
- channel and source context;
- role, project-party relationship, access grants, and delegation;
- workflow state;
- risk tier and current assurance;
- request time and correlation identifiers.

### 9.2 Output

The decision is exactly one of:

- `PERMIT`: the exact command may run;
- `DENY`: no business mutation may run;
- `STEP_UP`: stronger, action-bound authentication is required;
- `QUARANTINE`: evidence may be retained without granting business authority.

The result also carries:

- policy version;
- machine-readable reason codes;
- required assurance when step-up is needed;
- normalized tenant/resource/action identifiers;
- decision timestamp and audit reference.

### 9.3 Mandatory rules

1. Default deny.
2. One owner tenant per resource.
3. Unknown identities cannot approve, accept, order, change scope, or transition workflow.
4. Group membership is context, never permission.
5. Grants and delegations must be active at decision time.
6. Delegation is non-transitive and cannot amplify privilege.
7. Consequential approval is bound to the exact action digest and expected revision.
8. A changed revision, amount, scope, or payload invalidates the prior approval transaction.
9. Revocation takes effect on the next policy check; caches must invalidate by policy/grant version.
10. Policy and audit failure cause fail-closed behavior.

## 10. Risk and assurance

| Tier | Examples | Required behavior |
|---|---|---|
| Low | Submit photo, report issue, request information | Bound identity where available; unknown actor becomes quarantined evidence |
| Medium | Acknowledge task, confirm attendance, submit structured field record | Short-lived, one-time action token bound to resource and revision |
| High | Approve design, accept installation, create binding order, approve scope/price | LIFF/Login step-up, verified state and nonce, explicit consequence screen, action digest, expected revision, short TTL |
| Prohibited by LINE-only interaction | Actions restricted by owner policy or law | Redirect to the authoritative application or human-controlled process |

Step-up is not a generic login session. It is an authorization transaction for one explicit action.

## 11. Identity binding and step-up lifecycle

### 11.1 Binding lifecycle

`pending → active → suspended → revoked`

Activation requires a server-side transaction containing:

- unpredictable `state`;
- OIDC `nonce` where applicable;
- exact redirect URI;
- intended tenant and profile;
- one-time bind-token digest;
- creation and expiry time;
- consumed marker.

The callback must compare and consume the transaction before binding the LINE identity or minting a MONOLITH session. Missing, expired, mismatched, replayed, or already-consumed transactions fail closed.

### 11.2 Step-up lifecycle

`created → presented → authenticated → confirmed → consumed`

The transaction contains the exact tenant, actor, resource, action, payload digest, expected revision, assurance requirement, and expiry. Confirmation fails if any bound value changed.

## 12. Canonical LINE data flow

### 12.1 Inbound

1. Receive the raw webhook at one ingress for the Messaging API channel.
2. Resolve channel configuration and verify the signature on the raw body before parsing.
3. Persist an idempotent inbox receipt with `RECEIVED` status.
4. Claim processing atomically with a lease.
5. Resolve tenant and resource context; require channel, group/conversation, project, and bridge mappings to agree.
6. Resolve the human principal, tenant profile, membership, and assurance.
7. Normalize a canonical action envelope.
8. Evaluate the Trust Kernel decision.
9. For `DENY`, record the decision and return a safe response without mutation.
10. For `QUARANTINE`, store evidence with source and review state, without workflow mutation.
11. For `STEP_UP`, create an expiring, one-time, action-bound LIFF/Login transaction.
12. For `PERMIT`, execute domain state, decision audit, and notification intent in one database transaction.
13. Mark the inbound event `SUCCEEDED` only after the transaction commits.

### 12.2 Outbound

1. Domain logic creates a notification intent, not a direct LINE call.
2. Notification policy selects recipients, channel, urgency, SLA, escalation, and template.
3. The delivery intent is committed to the atomic outbox with business state and audit.
4. A worker atomically claims rows with a lease.
5. The worker uses a stable retry key for supported LINE send APIs.
6. Success, duplicate acceptance, retryable failure, permanent failure, and response metadata are recorded.
7. Retryable rows use bounded backoff; exhausted or permanent failures enter dead letter.
8. Operator resolution is audited.

## 13. Processing and failure semantics

Inbound processing states:

`RECEIVED → PROCESSING → SUCCEEDED`

Failure paths:

`PROCESSING → RETRYABLE → PROCESSING` or `DEAD_LETTER`

Rules:

- only `SUCCEEDED` duplicates are acknowledged as no-op;
- a returned error string is not success;
- a stale processing lease may be reclaimed safely;
- domain, audit, or outbox failure rolls back the whole transaction;
- no external side effect occurs before commit;
- LINE timeout, `429`, and `5xx` use stable retry identity and backoff;
- permanent `4xx` failures do not retry indefinitely;
- delivery failure never changes status to delivered;
- customer-facing text must not claim approval or delivery before confirmation.

## 14. Audit, privacy, and retention

Every governed event records:

- owner tenant and resource;
- transport actor and human principal separately;
- tenant profile and delegated-by principal where applicable;
- action, expected revision, and payload/action digest;
- policy version, assurance, reason codes, and outcome;
- event, correlation, and causation identifiers;
- UTC timestamps;
- before/after state digest where appropriate;
- retention class and data classification.

Audit records are append-only and tamper-evident through a chained digest or external immutable archive. Append restriction alone is insufficient for a tamper-evidence claim.

Secrets, access tokens, bind tokens, raw authorization codes, and unnecessary PII must never appear in logs or audits. Raw LINE payloads and quarantined evidence receive explicit retention, encryption, review, export, and purge policies. Pseudonymization or deletion of tenant-local personal data must preserve the minimum lawful audit record without retaining unnecessary content.

## 15. Additive compatibility migration

### Phase 0 — Baseline

Inventory every active `site_code`, LINE channel, group, conversation, identity binding, project, policy path, and tenant-relevant RLS rule. Record a reproducible baseline.

### Phase 1 — Add

Add canonical tenant, organization, site, profile, membership, project-party, grant, delegation, decision, and mapping structures. Do not change Daph runtime behavior yet.

### Phase 2 — Map and backfill

Create explicit mappings from Daph's current `site_code` values to canonical site, organization, and tenant IDs. Detect duplicates, orphans, ambiguous mappings, and cross-scope conflicts. Backfill scripts must be idempotent.

### Phase 3 — Shadow decisions

Run Trust Kernel resolution and policy evaluation beside existing behavior. Record differences without changing outcomes. Any unexplained difference blocks enforcement.

### Phase 4 — Enforce the LINE vertical slice

Require every LINE-originated business mutation to pass the Trust Kernel. Unresolved or inconsistent tenant context fails closed; unknown actors may still submit quarantined evidence.

### Phase 5 — Tenant 2 shadow proof

Create a second tenant with separate organizations, sites, profiles, grants, LINE configuration, and projects in a non-live environment or blocked-delivery mode. Prove isolation, collaboration, revocation, step-up, audit, retry, and operator recovery.

`site_code` may remain as a legacy alias during the bridge. It must not remain the security boundary.

## 16. Verification strategy

### 16.1 Policy unit and property tests

Generate combinations of roles, memberships, parties, grants, delegations, times, workflow states, risks, and assurance. Prove default deny, non-amplification, expiry, revocation, and deterministic reason codes.

### 16.2 Database and RLS denial tests

Prove:

- cross-tenant reads and writes are denied;
- project resources cannot reference a different owner tenant;
- guest access is limited to granted resources/actions;
- revocation and expiry deny access;
- service-role paths cannot become an undocumented authorization bypass.

### 16.3 Webhook and identity integration

Test:

- signature before parse;
- unknown channel;
- replay and duplicate delivery;
- one webhook ingress dispatching message, postback, group, room, follow, join, leave, and relevant event types;
- OAuth `state` and `nonce` positive and negative paths;
- bind-token replay, callback swapping, exact redirect URI, expiry, and lifecycle transitions.

### 16.4 LINE group security

Test unknown actor quarantine, source spoofing, wrong group/project, wrong tenant, approval-token reuse, non-primary customer, authorized delegate, expired grant, and non-transitive delegation.

### 16.5 Outbox reliability

Test concurrent claim, lease expiry, worker crash before and after LINE response, result-record failure, stable retry identity, duplicate acceptance, `429`, `5xx`, permanent `4xx`, bounded attempts, and dead-letter replay.

### 16.6 Migration, end-to-end, and operations

Test idempotent backfill, uniqueness, orphan detection, shadow-decision comparison, Daph regression, Tenant 2 shadow journey, backup/restore, rollback, monitoring, and operator runbooks.

## 17. Release gates

All gates are mandatory:

1. Every active LINE/project record in scope has an unambiguous canonical tenant mapping.
2. Daph regression verification passes with fresh evidence.
3. Cross-tenant denial, revoke, expired grant, non-transitive delegation, and action-digest tests pass.
4. OAuth state/nonce, step-up TTL, one-time consumption, and exact-action binding pass positive and negative tests.
5. Outbox concurrency, partial failure, retry, duplicate acceptance, and dead-letter tests pass.
6. Tenant 2 completes the shadow journey with no live customer messaging.
7. Audit completeness, tamper evidence, retention, and secret/PII leakage checks pass.
8. Monitoring, operator resolution, backup/restore, and rollback are rehearsed.
9. No open Critical or High security finding remains in the Trust Foundation scope.
10. Release evidence identifies commit, migration set, configuration, test run, environment, and approvers.

If any gate fails:

- tenant-2 live onboarding remains off;
- customer-messaging expansion remains off;
- Daph stays on the controlled compatibility path;
- the failed gate receives an owner, evidence requirement, and remediation plan.

## 18. Operational signals

Minimum dashboards and alerts:

- inbound events by processing state and oldest age;
- signature/channel rejection rate;
- tenant-resolution mismatch count;
- quarantine queue age and review backlog;
- permit/deny/step-up/quarantine decisions by reason code and policy version;
- step-up completion, expiry, and replay rejection;
- active, expiring, and revoked grants/delegations;
- outbox pending age, attempts, lease recovery, and dead-letter count;
- delivery outcome by LINE endpoint and error class;
- audit append failure and tamper-verification failure;
- unresolved `site_code` mapping count;
- Tenant 2 shadow isolation violations, which must remain zero.

## 19. Alternatives considered

### Platform-wide migration first

Rejected for this cycle because it creates a large blast radius, delays closure of known LINE trust gaps, and is unsafe in a highly active worktree. The target platform model remains compatible with later domain migration.

### LINE-local permission wrapper

Rejected because it would duplicate identity and authorization truth, create policy drift, and require later replacement.

### Keep `site_code` as tenant

Rejected because site, legal organization, contract boundary, brand, factory, and customer organization are not the same concept.

### Multi-tenant project co-ownership

Rejected because shared ownership obscures deletion, export, legal control, incident response, and authorization authority. Collaboration uses one owner plus scoped grants.

## 20. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Existing paths bypass the policy point | Inventory mutation entrypoints; add contract tests and deny direct calls |
| Dual-model drift during migration | Explicit mapping table, shadow comparison, metrics, and cutover gate |
| Global identity becomes a PII master | Minimal auth subject; tenant-local encrypted profiles |
| Guest access remains after project work | Required expiry, revocation, periodic review, and active-use checks |
| Step-up harms usability | Risk tiers; low-risk evidence remains natural in LINE |
| LINE retry creates duplicate messages | Stable retry identity, atomic claims, leases, and result reconciliation |
| Audit becomes a sensitive-data lake | Data minimization, digests, retention classes, encryption, and purge |
| Second tenant is treated as proof too early | Shadow-only delivery block and mandatory negative isolation evidence |

## 21. Completion definition for this design cycle

This design cycle is complete when:

- this English edition and the aligned Thai edition are reviewed;
- both Markdown and standalone HTML versions are committed;
- the user approves the written spec;
- a separate implementation plan is created using the approved design;
- implementation does not begin before that plan is reviewed.

The next design cycles, in order, are:

1. Unified LINE ingress and dispatcher;
2. LINE Login/binding and risk-based step-up;
3. Group action authorization and quarantine review;
4. Reliable delivery outbox;
5. audit, privacy, retention, and operator controls;
6. broader LINE customer and field experience.
