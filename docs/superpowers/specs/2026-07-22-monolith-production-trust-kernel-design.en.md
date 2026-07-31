# MONOLITH Production Trust Kernel Design

- **Status:** User-approved design for implementation planning
- **Date:** 22 July 2026
- **Phase objective:** Shadow Trust-Ready
- **Safety status:** `NOT_FOR_PRODUCTION` — no Production, GA, or Factory-Safe claim is permitted
- **Product scope:** MONOLITH is a multi-tenant platform; Daph is the first pilot tenant, not a runtime identity hardcoded into the product

## 1. Executive decision

MONOLITH will establish a **Canonical Release Authority + FactoryPacket V3 Protocol** so that the path from a frozen design to a manufacturing artifact has one server-side authority, fails closed when evidence or capability is incomplete, produces byte-identical results for the same release revision, uses managed signing, and can be checked offline by a verifier independent of the builder.

V3 is a protocol and migration boundary that replaces legacy release/export paths. It is not another packet/release stack operating alongside the existing stacks.

This phase delivers a shadow system that may generate production-shaped payloads to prove deterministic behavior, but cannot distribute them to a real Factory or machine.

## 2. Repository and evidence scope

Current-state claims in this document distinguish the two Git roots:

| Root | Role in this design |
|---|---|
| Parent governance root: `C:\Users\thai3\determined-williams (2)` | Audit, context, design specifications, governance gates, and future implementation plans |
| Nested product root: `C:\Users\thai3\determined-williams (2)\determined-williams` | MONOLITH source, tests, server, Supabase migrations/functions, and runtime evidence |

Primary inputs are the [executive deep audit](../../reports/2026-07-22-monolith-platform-executive-deep-audit.en.md), `CONTEXT.md`, the 21 July 2026 repository-scope correction, and as-built code in the nested product root.

The principal evidence driving this design is:

| As-built condition | Evidence anchor | Design response |
|---|---|---|
| Client role and actor can originate from local storage or headers | `src/core/auth/roles.ts:67`, `src/core/api/stateApi.ts:128`, `supabase/functions/factory-api/index.ts:136` | Server-derived `ActorContextV1`; headers are display-only |
| Node filesystem state and Supabase SQL state run in parallel and apply different export policies | `server/src/state/`, `supabase/migrations/0155_factory_state_server.sql` | Supabase/Postgres is the sole release authority; Node is a worker |
| Supabase `factory_jobs` uses a global job key and an authenticated-read policy with `using (true)` | `supabase/migrations/0155_factory_state_server.sql:9`, `supabase/migrations/0155_factory_state_server.sql:25` | Tenant-bound schema, membership RLS, and tenant-scoped object paths |
| Multiple client paths build and download packet/Cut List/DXF artifacts | `src/components/ui/ExportPanel.tsx`, `src/factory/packet/useFactoryPacket.ts` | Artifact Class Matrix, route disposition ledger, and negative bypass tests |
| Packet/bundle paths contain runtime time, random IDs, and browser ECDSA keys | `src/factory/packet/buildFactoryPacket.ts`, `src/core/manufacturing/release/buildBundleV2.ts` | Canonical release data, managed Ed25519, fixed packaging, and idempotent retrieval |
| Edge verification checks only the whole-ZIP hash | `supabase/functions/factory-api/index.ts` | Standalone protocol verifier checks schema, files, signature, trust, release status, gate, and machine binding |
| CIX converts an unknown tool to TNO=1 and drops unsupported operations | `src/cnc/post/dialects/cix.ts` | Capability compiler and dialect defense-in-depth block the whole packet |

## 3. Scope

### 3.1 In scope

- Server-owned identity, membership, tenant/org/site scope, and authorization
- Four-eyes release in which the freezer and release approver are distinct authenticated users
- Separate lifecycles for working revision, release attempt, and immutable release revision
- Immutable release snapshot and candidate hash
- Fail-closed machine capability compiler
- Deterministic FactoryPacket V3 payload and packaging
- Managed signer interface and environment-separated key custody
- Tenant-scoped private artifact store and shadow quarantine
- Signed trust bundle and signed release-status/revocation bundle external to the packet
- Standalone offline verifier and stable machine-readable reason codes
- Legacy route disposition and fail-closed migration
- Evidence bundle tied to exact source state and independently reproducible

### 3.2 Out of scope

- Enabling production distribution or sending files to real machines
- Production key ceremony, production AAL2 enforcement, GA operations, or SLA
- Changes to unrelated product domains that are not required by the Production Trust Kernel
- Creating a new microservice estate without a demonstrated need
- Hardcoding Daph, tenant identity, or roles into the packet builder

## 4. Locked design decisions

| ID | Decision |
|---|---|
| `DTK-01` | The target is Shadow Trust-Ready and every output remains `NOT_FOR_PRODUCTION` |
| `DTK-02` | DRAFT/FROZEN may preview or simulate; production-shaped outputs are not downloadable |
| `DTK-03` | The server verifies the JWT and resolves tenant/org/site/user/roles from current membership |
| `DTK-04` | Designer freezes; a distinct `RELEASE_APPROVER` releases; Factory only consumes; Admin needs a separate release role to release |
| `DTK-05` | The same release revision returns the same packet bytes; a material input change creates a new revision |
| `DTK-06` | The application holds only signer key IDs; private keys remain outside the app; production signing stays disabled until key ceremony |
| `DTK-07` | An unknown tool or unsupported operation blocks the entire packet and terminates construction before a partial or fallback artifact |
| `DTK-08` | The offline verifier has a separate executable/package graph and emits a machine-readable report |
| `DTK-09` | Trust and release-status bundles are signed external inputs; a packet cannot authorize its own key |
| `DTK-10` | An old release revision is immutable; an error requires revocation and a new working revision |
| `DTK-11` | A hard gate always denies; only soft warnings may have reasoned, expiring, four-eyes exceptions that create a new revision |
| `DTK-12` | Definition of Done includes contract, property, negative, hostile, golden-vector, E2E, and commit-linked CI evidence |
| `DTK-13` | V1/V2 remain readable as history only; production-shaped output requires V3 |
| `DTK-14` | Supabase/Postgres is the sole canonical release authority; Node acts as a deterministic worker |
| `DTK-15` | Working revision, release attempt, and release revision are separate aggregates |
| `DTK-16` | A real shadow P2 manufacturing payload is generated but sealed in private quarantine; plaintext is available only to an isolated automated verifier and P3 distribution remains disabled |
| `DTK-17` | RELEASE cannot be queued offline or auto-replayed; it requires fresh interactive identity and candidate hash |
| `DTK-18` | A machine profile is an authority input only with a valid signed `MachineProfileAttestationV1` that binds scope, tool library, and postprocessor |
| `DTK-19` | A service role is an executor, not human authority; authoritative RPCs accept immutable `VerifiedActionContextV1`, never role/name/tenant from a request body |
| `DTK-20` | An offline verdict certifies status at bundle sequence/issuedAt; freshness requires a persistent high-water mark and trusted bootstrap checkpoint |
| `DTK-21` | `ReleaseAttempt`, `ArtifactRecord`, and `ReleaseRevision` have separate state machines; `VOID` is not a release-revision status |
| `DTK-22` | A soft-warning exception requires signed `WarningExceptionGrantV1`; a hard blocker always denies |
| `DTK-23` | Evidence attestation uses a CI/workload identity key separate from the release-signing key |
| `DTK-24` | Daph-specific JWT/site helpers are legacy compatibility only and cannot serve as Trust Kernel authority |

## 5. Architecture

```text
Untrusted Client Intent
        |
        v
Verified JWT -> Membership Resolver -> ActorContextV1
        |                |
        |                +-- tenant / org / site / user / roles / AAL
        v
Postgres Canonical Release Authority
        |-- WorkingRevision + ReleaseCandidate
        |-- Approval + ReleaseAttempt
        |-- ReleaseRevision + Release Ledger + Outbox
        |
        v
Deterministic Compute Worker (no state authority)
        |-- Snapshot compiler
        |-- Machine capability compiler
        |-- FactoryPacket V3 canonical payload builder
        |
        v
Private Tenant-Scoped Quarantine -> Managed Ed25519 Signer
        |                               |
        +----------- DB atomic commit <-+
                         |
                         v
                Published artifact reference
                         |
                  environment policy
                         |
             Shadow: QA-only / Factory denied

Standalone Offline Verifier
  inputs: FactoryPacket V3 + TrustBundleV1 + ReleaseStatusBundleV1
  output: VerificationReportV1
```

### 5.1 Authority rule

Supabase/Postgres is the sole authority for identity-derived scope, working-revision state, approvals, release attempts, release revisions, signature certificates, artifact references, and lineage events.

Node or another worker receives an immutable work request and returns a deterministic result. A worker cannot mutate release state, resolve roles itself, or treat a filesystem snapshot as authoritative.

### 5.2 No dual write

Migration cannot write the same state to both filesystem and Postgres and decide later which one wins. Legacy readers may read for migration and historical inspection, but every mutation path converges on the single canonical authority.

## 6. Domain model and lifecycle

### 6.1 `TenantScopeV1`

Contains `tenantId`, `orgId`, `siteId`, and policy version. Every aggregate and artifact metadata record binds this scope. Daph is provisioned as the first tenant through configuration and onboarding data, never as a source-code constant.

### 6.2 `WorkingRevision`

Its authoritative statuses are only:

- `DRAFT`: editable and eligible for P0 preview
- `FROZEN`: immutable review candidate; inputs cannot change without unfreeze or fork

Core data includes working revision ID, parent revision ID, tenant scope, content references, creator, freezer, frozen time, candidate hash, and policy/profile versions.

### 6.3 `ReleaseCandidate`

Created at freeze. Its `candidateHash` covers the canonical snapshot, gate inputs including warning facts and eligibility, machine capability profile, `MachineProfileAttestationV1`, policy versions, tenant scope, and required artifact definitions. It deliberately excludes exception grants to avoid a circular hash.

After exception grants are issued, the Authority computes `releaseAuthorizationHash = SHA-256(canonical({domain: "MONOLITH/ReleaseAuthorization/V1", candidateHash, sortedGrantHashes}))`; an empty grant list has one canonical representation. Candidate already covers profile, policy, and artifacts, so they are not hashed twice. Final approval, release attempt, and release certificate bind both candidate hash and release authorization hash. A grant change requires a new release authorization and attempt; after a release exists, it requires a new release revision. A change to an underlying candidate input or profile attestation requires a new freeze and candidate.

### 6.4 `ReleaseAttempt`

Statuses:

- `PENDING`: preconditions passed and compile/sign/commit is in progress
- `FAILED`: deterministic blocker or non-retryable failure
- `PUBLISHED`: release commit succeeded and the artifact is available under environment policy
- `VOID`: the attempt was cancelled before a release revision existed and can never be published

A transient signer or store failure may retry only with the same candidate hash and idempotency key. Idempotency scope is `(tenantId, actorUserId, candidateHash, idempotencyKey)` with a stored `requestHash`; reuse of the key with a different request hash returns `STATE_IDEMPOTENCY_MISMATCH`.

### 6.5 `ArtifactRecordV1`

Statuses:

- `QUARANTINED`: unsigned payload or private source bytes not eligible for publication
- `MATERIALIZING`: release commit succeeded and the worker is writing final bytes for the expected hash
- `AVAILABLE`: exact bytes were stored and their hash verified, still subject to publication policy
- `VOID`: the artifact was cancelled or failed materialization/hash verification and can never be published

An artifact record binds tenant/site, artifact class, release-attempt/revision reference, content hash, expected packet hash, internal object locator, and timestamps. Artifact status is never release authority, and a raw storage locator is never exposed to the client.

### 6.6 `ReleaseRevision`

Statuses:

- `ACTIVE`: immutable release whose signature, artifact reference, and ledger commit succeeded
- `REVOKED`: immutable historical release that can no longer be consumed

A release revision carries its release revision ID, candidate hash, release authorization hash, sorted warning-exception grant hashes, content hash, expected packet hash, release certificate, approver identity, approval evidence, machine-profile-attestation binding, tenant scope, parent lineage, and authoritative timestamps.

The UI may project “RELEASED” when an `ACTIVE ReleaseRevision` exists, but `RELEASED` cannot be stored as mutable `WorkingRevision` state.

### 6.7 Concurrent history after change

After revocation or a required design change, the system can hold `REVOKED ReleaseRevision R1` and `WorkingRevision R2 = DRAFT` simultaneously. It never mutates the old release back to FROZEN or destroys history.

## 7. Authorization, tenancy, and separation of duties

### 7.1 Actor resolution

`AuthContextResolver` must:

1. Verify JWT signature, issuer, audience, expiry, and subject
2. Reject an anonymous service identity as a human actor
3. Read current membership from a server-side source
4. Resolve tenant/org/site, authenticated user ID, roles, AAL, and membership version
5. Reject mismatched scope, revoked membership, or a role not allowed for the action

Client-supplied role or name may be a display hint only. It cannot influence authorization or authoritative audit identity.

JWT app metadata and the legacy helpers `current_app_roles()`, `current_site_codes()`, and `get_active_site_codes()` are compatibility data or hints only. They cannot be current-membership authority for the Trust Kernel. The system reads versioned tenant membership/location tables with revocation state from Postgres. Daph and BKK-HQ-01 are onboarding data; a migration test proves that tenant 002 can coexist without source-code changes.

### 7.2 Verified action context and service-role boundary

After JWT verification, the Edge calls `create_verified_action_context` with the user-scoped bearer token, never the service role. Postgres uses `auth.uid()` and current membership to create immutable short-lived `VerifiedActionContextV1` containing action-context ID, tenant/org/site, actor user ID, roles, AAL, membership version, permitted action, candidate hash, release authorization hash, request hash, issuedAt, expiresAt, and nonce, then stores it as an authoritative database record. A service role cannot create an action context.

An authoritative mutation RPC accepts only the action-context ID and business identifiers bound by that context, then locks and consumes the record and rechecks scope, membership version, expiry, nonce, candidate, and release authorization hash inside its transaction. It never accepts actor role/name/tenant/site from the request body as authority. A service-role client performs downstream outbox work only after the user-authorized commit and cannot create human approval, bypass SoD, or select an object path from client input.

### 7.3 Role responsibilities

| Role | Allowed actions |
|---|---|
| `DESIGNER` | Edit DRAFT, run validation, freeze, and submit a candidate |
| `RELEASE_APPROVER` | Approve/reject a candidate and initiate release when not the freezer |
| `FACTORY` | Consume only ACTIVE + verifier PASS + environment-policy-approved artifacts |
| `SAFETY_REVOKER` | Immediately revoke an ACTIVE release with a reason |
| `ADMIN` | Manage membership and policy; release requires a separate `RELEASE_APPROVER` role |
| `QA_EVIDENCE` | Receive only hashes, reports, and evidence for a sealed shadow artifact; P2 plaintext and raw storage URLs are denied |

### 7.4 Four-eyes invariant

`freezeActorUserId != releaseApproverUserId` is enforced by database constraint or transaction logic, not by the UI. An approval binds candidate hash, release authorization hash, tenant scope, approver user ID, membership version, AAL, decision time, and reason.

Shadow evidence records the AAL used. Production distribution remains disabled until a production policy requires and proves AAL2.

### 7.5 Tenant isolation

- Every authoritative table carries `tenant_id`; child records use tenant-bound foreign keys
- A job/project identifier alone is never global authority
- RLS checks membership and tenant/site scope; product data cannot use `using (true)`
- Object paths reside under `tenantId/siteId/releaseRevisionId/contentHash`
- The signed manifest and release certificate bind tenant/org/site
- Any content-addressed physical deduplication remains behind logical tenant authorization and cannot expose an existence side channel
- A service role does not waive tenant authorization; every mutation transaction binds action context, tenant foreign key, and candidate

## 8. Component contracts

| Component | Input | Output | Responsibility boundary |
|---|---|---|---|
| `AuthContextResolver` | Verified JWT/request | `ActorContextV1` | Identity, membership, scope, roles, AAL |
| `ActionContextBroker` | Actor + permitted action + request hash | `VerifiedActionContextV1` | Short-lived immutable authority handoff; one-time consumption |
| `ReleaseAuthority` | Actor, action, expected candidate, idempotency | Transition/result/event | State, SoD, CAS, ledger; never builds a packet |
| `SnapshotService` | Frozen working revision | `ReleaseSnapshotV3` | Immutable canonical input |
| `ProfileAttestationRegistry` | Profile/tool/postprocessor governance | Signed `MachineProfileAttestationV1` | Scope, validity, approval, and revocation |
| `WarningExceptionAuthority` | Eligible warning + two approvers | Signed `WarningExceptionGrantV1` | Exact-scope expiring exception; hard blockers excluded |
| `CapabilityCompiler` | Snapshot operations + attested `MachineCapabilityProfileV1` | Capability report | Exhaustive support decision; no fallback |
| `PacketBuilderV3` | Approved snapshot + capability report | Canonical unsigned payload | Pure deterministic construction |
| `ManagedSignerPort` | Fixed digest/certificate + key ID | Ed25519 signature | Private key remains outside the application |
| `ArtifactRepository` | Tenant-scoped bytes/reference | `ArtifactRecordV1` | Private write, quarantine, hash verification, availability; no release authority |
| `TrustBundleManager` | Key/revocation governance | Signed bundles | Trust roots, key validity, expiry, sequence |
| `OfflineVerifier` | Packet + external bundles | `VerificationReportV1` | Independent validation; no builder import |
| `EvidenceRecorder` | Run context/results/artifacts | Evidence bundle | Exact source/environment/result traceability |

Contracts evolve independently: `ActorContextV1`, `VerifiedActionContextV1`, `TenantScopeV1`, `ReleaseSnapshotV3`, `MachineCapabilityProfileV1`, `MachineProfileAttestationV1`, `WarningExceptionGrantV1`, `CapabilityReportV1`, `FactoryPacketManifestV3`, `ReleaseCertificateV1`, `ArtifactRecordV1`, `TrustBundleV1`, `ReleaseStatusBundleV1`, `VerificationReportV1`, and `EvidenceAttestationV1`.

## 9. Artifact Class Matrix

| Class | Examples | DRAFT | FROZEN | Shadow ACTIVE release | Production distribution |
|---|---|---:|---:|---:|---:|
| `P0_PREVIEW` | Interactive render, in-product simulation | View | View | View | Not applicable |
| `P1_REVIEW` | Watermarked PDF/JSON without machine geometry | Optional audited download | Audited download | Audited download | Policy controlled |
| `P2_MANUFACTURING` | Cut List CSV, DXF, CIX/G-code, full packet | Deny | Deny | Build real bytes; sealed quarantine; isolated automated verifier only | Deny in this phase |
| `P3_DISTRIBUTION` | Factory/operator/machine delivery | Deny | Deny | Deny | Disabled until separate production authorization |

During the shadow phase, no human, including `QA_EVIDENCE`, receives P2 plaintext, a raw object locator, or a reusable signed URL. An isolated QA runner uses workload identity to read exact bytes from the private store and exports only hashes, reports, and evidence that cannot drive production. A safe extension is defense in depth, not access control. Human plaintext inspection is out of scope and requires a separately approved secure-workstation and one-time audited-proxy policy.

## 10. Release transaction choreography

### 10.1 Freeze

1. Designer submits freeze intent with expected working-revision version
2. Server resolves actor/membership and checks tenant scope
3. Server compiles canonical snapshot inputs and gate inputs
4. Database CAS changes DRAFT to FROZEN with candidate hash, freezer identity, and policy/profile versions
5. Client receives a server projection; local state has no authority

### 10.2 Release

1. `RELEASE_APPROVER` sends a release request with candidate hash, release authorization hash, idempotency key, and request hash; the Edge asks Postgres to create `VerifiedActionContextV1` under the user bearer token
2. Authority consumes the action context and rechecks distinct user, membership version, tenant/site scope, candidate/release-authorization freshness, required gates, profile attestation, and exception grants
3. The database locks or creates `ReleaseAttempt=PENDING` and allocates release revision ID, monotonic release sequence, and authoritative timestamp before signing
4. Worker reads the immutable snapshot and runs the capability compiler; any blocker fails the whole attempt
5. Worker creates the canonical unsigned payload and `ArtifactRecord=QUARANTINED` in the private tenant store
6. Worker creates the deterministic release certificate from authority fields, requests a managed Ed25519 signature, assembles final packet bytes in memory with fixed packaging, and computes the expected final packet hash; no signed downloadable object exists
7. One database transaction consumes the nonce, rechecks candidate CAS, membership, profile, and exception grants, then records approval, certificate, `ReleaseRevision=ACTIVE`, `ArtifactRecord=MATERIALIZING`, expected hash, ledger event, and outbox
8. If the transaction fails, discard the in-memory signature/final bytes and end the flow at `VOID` attempt/artifact; release-revision creation and URL exposure occur only on the successful-commit branch
9. After commit, the worker materializes exact final bytes reproducible from the persisted canonical payload and certificate, verifies the expected hash, then changes the artifact to `AVAILABLE` and attempt to `PUBLISHED`; a retry produces identical bytes
10. Publication policy exposes only an opaque reference when `ReleaseRevision=ACTIVE` and `ArtifactRecord=AVAILABLE`; shadow policy still denies P2 human plaintext and Factory/P3

### 10.3 Failure rules

- Automatically retry only transient signer/store failures under the same idempotency key
- Deterministic gate/capability/schema/auth/state failures cannot be retried while hiding the reason
- Store success + DB failure produces a private VOID artifact and VOID attempt; no release revision or signed downloadable packet exists
- If the DB commit response is lost, an idempotency lookup returns the existing release and certificate
- A concurrent release has one CAS winner; all others receive stable `STATE_CONFLICT`
- Candidate change, unfreeze, or membership change invalidates the previous approval
- A crash after commit but before materialization is recovered by outbox retry producing the exact same bytes; Factory eligibility remains closed until artifact `AVAILABLE`

### 10.4 Revoke and fork

- `SAFETY_REVOKER` may revoke an ACTIVE release immediately without a four-eyes delay
- Revocation records reason, actor, effective sequence/time, and emits a new release-status bundle
- The old artifact is neither edited nor deleted, but Factory consumption and verification reject it
- Correction begins as a new DRAFT WorkingRevision with parent lineage

### 10.5 Offline intent

`RELEASE` cannot enter an offline queue and cannot auto-drain after reconnection. Freeze intent may be retained as draft UX, but the server re-evaluates every condition. An offline revoke intent must display “not yet enforced” until server confirmation succeeds.

## 11. Determinism and cryptography

### 11.1 Determinism boundary

The same release revision means identical tenant scope, release snapshot, machine profile, policy versions, approval data, canonical release timestamp, signer key ID, and release-certificate data. It must yield:

- Identical canonical payload bytes
- Identical file ordering, paths, newlines, numeric precision, and Unicode normalization
- Fixed ZIP timestamp, compression profile, and implementation version
- Identical Ed25519 signature bytes for identical signable bytes
- Identical final FactoryPacket V3 bytes and SHA-256

Runtime clock, `Date.now()`, random IDs, filesystem ordering, and locale cannot affect output. The release revision ID comes from authority and content binding, not client-generated randomness.

### 11.2 Signing profile

- V3 production-shaped artifacts use an explicitly pinned managed Ed25519 profile
- The application or worker holds only a key ID and calls the signer port
- Development uses an ephemeral development key with an explicit marker
- Staging uses a managed non-production key
- The production signer remains disabled until key ceremony, custody, rotation, recovery, and incident drill succeed
- An existing release cannot be re-signed; the system returns its persisted certificate/signature

### 11.3 Trust and release-status bundles

`TrustBundleV1` contains scope, sequence, issuedAt, expiresAt, trusted key IDs with key purpose (`RELEASE`, `PROFILE_ATTESTATION`, `WARNING_EXCEPTION`), algorithms, validity windows, key revocations, profile-attestation revocations, and warning-exception-grant revocations. Every revocation entry binds ID/hash, effectiveAt, and reason. A high-water mark is keyed by `(bundleType, trustScope)`.

`ReleaseStatusBundleV1` contains scope, sequence, issuedAt, expiresAt, and only the set of `REVOKED ReleaseRevision` IDs. `VOID` ends the flow at attempt or artifact before release-certificate/revision creation and is therefore excluded from this bundle. A valid release certificate proves that the authority issued the release; an acceptable status bundle must prove that the revision is outside the revoked set.

Both are signed by a trust authority pinned by the verifier and are delivered separately from the packet. The verifier rejects expiry, sequence rollback, scope mismatch, invalid signature, or a trusted clock/clock policy that fails to prove time. A key revocation declares `revocationMode` as `ALL_SIGNATURES`, `SIGNED_AT_OR_AFTER`, or `ISSUANCE_DISABLED`, together with effectiveAt and reason; the explicit mode is the sole source of semantics.

An offline verifier certifies status only within “valid as of bundle sequence/issuedAt.” Displaying “currently active” requires online-current authority. It persists a high-water mark per trust scope, rejects a sequence below one already accepted, and enforces `maxOfflineStaleness` from pinned environment policy. First-use bootstrap requires trusted online provisioning or a pinned minimum-sequence checkpoint. An unavailable checkpoint, state store, trusted clock, or policy-compliant freshness returns `TRUST_FRESHNESS_UNPROVEN`. Every Factory work start refreshes within the policy window and uses current authorization instead of an old verdict.

## 12. Capability safety

`MachineCapabilityProfileV1` declares machine and dialect version, supported operation types, tool identities, ranges, faces, units, coordinate conventions, and postprocessor version.

A profile participates in candidate, compiler, or verifier authority only with signed `MachineProfileAttestationV1` from a Profile Attestation Authority governed by Manufacturing Engineering. The attestation binds tenant/site/machine IDs, canonical profile hash, tool-library hash, postprocessor ID/version/binary hash, profile approver identity, issuedAt, validFrom, validUntil, status, and attestation sequence. Candidate and release certificate bind attestation ID/hash. The verifier checks signature, scope, validity, sequence, and revocation from external trust data. A local-storage profile, client override, or legacy schema passes through a read-only adapter into the canonical schema and acquires authority only after successful attestation.

`WarningExceptionGrantV1` binds warning code, exact entity IDs, tenant/site, candidate hash, reason, policy version, two distinct authenticated approvers, issuedAt, expiresAt, and signature from a `WARNING_EXCEPTION` authority. Only a warning declared `exceptionEligible=true` in the catalogue may receive a grant. Hard blockers and capability blockers are never eligible. The freezer and release approver may serve as the two grant approvers when both affirm the exception and are distinct users, so no additional humans are mandatory. Compiler and verifier reject an expired grant, mismatched scope/hash/entity, untrusted signer purpose, or duplicate approver. A grant change changes release authorization hash; an underlying input change requires a new candidate.

`CapabilityCompiler` enumerates every operation and returns a blocker when:

- Operation type is unsupported
- Tool ID is unknown or not bound to the machine profile
- A parameter is outside its range
- Face, orientation, or coordinate transformation is unsupported
- Postprocessor and profile versions do not match
- An operation would be dropped or transformed without a normative rule

The builder cannot create a partial packet. A dialect such as CIX checks again and fails even if the upstream gate malfunctions. It cannot default an unknown tool to `TNO=1` or downgrade an unsupported operation to a warning.

## 13. Error model

Every service boundary uses typed `TrustResult<T>` and a stable reason-code registry.

| Namespace | Examples |
|---|---|
| `AUTH` | `AUTH_REQUIRED`, `AUTH_ANON_NOT_ALLOWED`, `AUTH_MEMBERSHIP_REVOKED`, `AUTH_SCOPE_DENIED`, `AUTH_SOD_VIOLATION`, `AUTH_ACTION_CONTEXT_INVALID`, `AUTH_ACTION_CONTEXT_EXPIRED` |
| `STATE` | `STATE_CANDIDATE_STALE`, `STATE_RELEASE_AUTHORIZATION_STALE`, `STATE_CONFLICT`, `STATE_RELEASE_REVOKED`, `STATE_IDEMPOTENCY_MISMATCH` |
| `GATE` | `GATE_HARD_BLOCKER`, `GATE_WARNING_EXCEPTION_EXPIRED`, `GATE_WARNING_EXCEPTION_MISMATCH` |
| `CAP` | `CAP_UNKNOWN_TOOL`, `CAP_UNSUPPORTED_OPERATION`, `CAP_PROFILE_MISMATCH`, `CAP_PROFILE_ATTESTATION_INVALID`, `CAP_PROFILE_ATTESTATION_EXPIRED`, `CAP_PARAMETER_RANGE` |
| `PACKET` | `PACKET_SCHEMA_UNSUPPORTED`, `PACKET_HASH_MISMATCH`, `PACKET_EXTRA_FILE`, `PACKET_RESOURCE_LIMIT` |
| `CRYPTO` | `CRYPTO_SIGNER_UNAVAILABLE`, `CRYPTO_SIGNATURE_INVALID`, `CRYPTO_ALGORITHM_DENIED` |
| `TRUST` | `TRUST_BUNDLE_EXPIRED`, `TRUST_SEQUENCE_ROLLBACK`, `TRUST_SCOPE_MISMATCH`, `TRUST_CLOCK_UNAVAILABLE`, `TRUST_CHECKPOINT_REQUIRED`, `TRUST_FRESHNESS_UNPROVEN` |
| `STORE` | `STORE_QUARANTINE_FAILED`, `STORE_HASH_MISMATCH`, `STORE_ARTIFACT_UNAVAILABLE`, `STORE_PLAINTEXT_ACCESS_DENIED` |

HTTP mapping: 401 for no verified human identity, 403 for scope/role/SoD denial, 409 for stale/CAS/idempotency conflict, 422 for a deterministic blocker, and 503 for a transient signer/store dependency.

Logs cannot contain raw JWTs, private keys, full packet contents, or unnecessary PII. UI, API, CI, and verifier use the same reason codes.

## 14. Standalone offline verifier

The verifier accepts only:

1. FactoryPacket V3
2. `TrustBundleV1`
3. `ReleaseStatusBundleV1`
4. Pinned verifier policy/configuration
5. Persistent verifier state containing a trusted bootstrap checkpoint and per-scope high-water marks

It validates:

- Envelope/schema/version and resource limits before deep parsing
- Path traversal, duplicate paths, extra/missing files, decompression ratio, and maximum sizes
- Per-file bytes/hash and canonical manifest binding
- Release-certificate signature and key/trust validity
- Tenant/org/site, candidate, machine-profile, and artifact-class binding
- A valid release certificate and absence of the release revision from an acceptable status bundle's revoked entries
- Machine-profile attestation, release authorization hash, and warning-exception grant hashes bound into the certificate
- Trust/release bundle scope, signature, sequence, expiry, key-revocation mode, persistent high-water mark, bootstrap checkpoint, `maxOfflineStaleness`, and trusted-clock policy
- Gate and capability-report hashes
- `NOT_FOR_PRODUCTION` and environment policy

It emits `VerificationReportV1` containing verdict, stable reason codes, checked hashes, bundle sequences, verifier build hash, `validAsOf`, freshness age/checkpoint, and a human summary. Displaying “currently active” requires online-current authority.

Independence is proven through a separate executable/package dependency graph. Avoiding imports alone is insufficient. Both implementations pass the same normative protocol and golden vectors.

## 15. Legacy migration and containment

### 15.1 Canonicalization-first migration

1. Add tenant-aware Postgres authority and contracts
2. Make client state a server projection
3. Move packet construction to the deterministic V3 worker
4. Convert V1/V2 to read-only history adapters
5. Block legacy production-shaped downloads before enabling the V3 shadow path
6. Remove filesystem state authority after migration evidence passes

### 15.2 Route disposition ledger

Every reachable build/export/download surface, together with authority-input surfaces such as machine/profile schemas, tool libraries, hardware presets, gate policies, JWT/site helpers, and storage-signing routes, appears in a machine-readable ledger with owner, artifact class, current behavior, target disposition, and negative test:

- `REUSE`: pure non-authoritative primitive, such as a canonical hash helper
- `ADAPT`: implementation reused under the V3 contract, such as deterministic ZIP after removal of runtime time
- `READ_ONLY`: V1/V2 history and inspection with no production-shaped output
- `BLOCK`: client download, FROZEN manufacturing export, legacy direct CNC, duplicate state mutation, or any authority bypass

“Block or route” without a complete inventory does not satisfy Definition of Done.

## 16. Verification and evidence design

### 16.1 Test layers

1. Contract/schema/version and reason-code tests
2. JWT, membership, verified-action-context, service-role-misuse, SoD, and cross-tenant negative tests
3. State, CAS, idempotency, concurrency, revocation, artifact-materialization, and fork tests
4. Machine-profile-attestation, tool-library-binding, capability-compiler, and dialect defense-in-depth tests
5. Warning-exception eligibility, scope, expiry, and two-person negative tests
6. Canonicalization, property-based determinism, and mutation tests
7. Managed signing, trust, first-use checkpoint, expiry, rollback, staleness, key-mode, and revocation golden vectors
8. Hostile packet/ZIP/fuzz/resource-limit tests
9. Builder/verifier cross-implementation conformance
10. Two-person E2E release and revocation flow
11. P2 human-plaintext/raw-URL denial and isolated-runner tests
12. Legacy route/authority-input bypass tests for every ledger entry, including Daph compatibility and tenant-002 coexistence

### 16.2 Golden corpus

The corpus covers canonical JSON edge cases, Unicode, decimals, units, representative cabinet/panel/connector operations, supported machine profiles, boundary ranges, unknown tools, unsupported operations, corrupt packets, and trust failures.

Each determinism vector runs at least 100 times on Windows and Linux with pinned runtimes and lockfiles. Canonical payload, signature envelope, and final packet must be 100% byte-identical. Repetition is a nondeterminism smoke test; representative corpus and property-based permutations provide the substantive coverage.

### 16.3 Transaction chaos cases

- Signer timeout or unavailability
- Quarantine-store success followed by DB failure
- Lost DB-commit response
- Two approvers racing
- Candidate mutation after approval
- Membership revocation mid-flow
- Revocation racing with publication or download
- Crash after release commit but before artifact materialization
- Action-context replay/expiry and service-role RPC spoofing
- P2 raw URL or token already issued when revocation or policy change occurs
- Attempted offline queued release
- First-use verifier without a checkpoint and a stale-but-unexpired bundle
- Cross-tenant object/hash guessing

Every case proves that no valid downloadable orphan exists, no unauthorized state transition occurs, and the reason code is correct.

### 16.4 Evidence bundle

The self-verifying evidence bundle contains:

- Signed `evidence-manifest.json`, `EvidenceAttestationV1`, and root hashes
- Git state of both roots: commit, branch, dirty files
- Dependency lock hashes and OS/runtime/compression/signer profiles
- Exact commands, exit codes, pass/fail/skip counts, and full machine-readable results
- Golden inputs, expected bytes/hashes, and mutations
- Standalone verifier binary/package hash and conformance report
- E2E actor/approval/release/revocation audit evidence
- Route disposition ledger and negative results
- Tenant isolation, hostile-packet, trust-freshness, and resource-limit reports
- Packet, trust, release-status, and evidence artifact hashes

`EvidenceAttestationV1` is signed by a CI/workload identity key separate from the release key and binds Git state of both roots, exact command/report digests, CI run/workflow identity, builder/verifier binary hashes, issuedAt, retention policy, and evidence root hash. Trust policy declares evidence-key owner, validity, rotation, and revocation.

The CI artifact binds the exact commit and records dirty state. A truncated log or skipped test cannot support a passing claim.

## 17. Executive acceptance gates

### 17.1 Shadow Trust-Ready PASS

All conditions must pass together:

- Critical and negative trust gates pass 100%
- No trust or security test is skipped
- Route disposition ledger covers 100% of reachable production-shaped surfaces
- Cross-platform golden outputs are 100% byte-identical
- Standalone verifier accepts the valid corpus and rejects the mutation corpus with specified reason codes
- Two distinct authenticated humans complete freeze/approve/release E2E
- Revocation, attempt/artifact VOID, stale candidate, action-context replay, membership revocation, service-role spoofing, and cross-tenant attacks are proven
- Profile attestation and warning exception are accepted or rejected by scope, expiry, revocation, and distinct-approver rules
- Offline verifier rejects first use without a checkpoint, sequence rollback, and a bundle beyond `maxOfflineStaleness`
- P2 shadow artifacts remain in sealed quarantine; human plaintext/raw URL and Factory/P3 access are denied
- Daph tenant 001 and tenant 002 coexist through data/configuration without hardcoded authority
- Evidence bundle self-verifies, uses an evidence key separate from the release key, and binds exact source and environment

### 17.2 Production/GA remains NO-GO

Even after Shadow Trust-Ready passes, Production/GA remains prohibited until separately approved work proves:

- Production key ceremony, custody, rotation, and recovery
- AAL2 production approval policy
- Production operations, monitoring, backup/restore, and incident drills
- Authorized factory pilot and machine-specific safety acceptance
- P3 distribution authorization
- Evidence matching the exact deployed build

## 18. Observability and governance

Every security or release event carries tenant scope, event ID, actor user ID, membership version, candidate/release revision, artifact hash, reason code, and correlation ID.

Metrics and alerts cover authentication denials, SoD violations, stale candidates, capability blockers, signer/store failures, VOID artifacts, verifier failures, stale trust bundles, revoked-release access, and attempts against blocked legacy routes.

Audit events are append-only and exportable in machine-readable form. A human display name is supplementary data, never identity authority.

## 19. Ownership

| Domain | Accountable owner |
|---|---|
| Identity, tenancy, RLS, signer custody, trust bundles | Security/IAM |
| Working/release lifecycle, SoD, exceptions, revocation | Release Governance |
| Operation semantics, capability profiles, machine ranges | Manufacturing Engineering |
| Deterministic builder, artifact storage, outbox/workers | Platform Engineering |
| Independent verifier, hostile corpus, evidence bundle | Independent QA/Safety |

An owner may evolve implementation inside the boundary, but cannot change a protocol or invariant without a versioned decision and migration.

## 20. Risks and controls

| Risk | Control |
|---|---|
| V3 becomes another parallel stack | Canonical authority, route ledger, no dual write, V1/V2 read-only |
| Signed orphan | Unsigned quarantine, final bytes/hash built in memory, atomic certificate/release/artifact commit, publication after materialization |
| Cross-tenant leakage | Tenant-bound FK/RLS/object paths/manifest and negative matrix |
| Service role bypasses RLS or SoD | Verified action context, DB recheck and nonce consumption, and no client-supplied authority fields |
| Profile overstates capability | Signed profile attestation, tool/postprocessor hashes, validity/revocation, and canonical adapter |
| Shadow artifact is used for production | Sealed private P2, isolated automated verifier only, deny human plaintext/raw URL, and no Factory/P3 |
| Determinism claim exceeds evidence | Golden bytes, property tests, cross-platform runs, pinned packaging and signing profile |
| Verifier repeats the builder defect | Separate implementation graph plus common normative vectors, not common implementation |
| Offline revocation is stale | High-water mark, trusted bootstrap checkpoint, maximum staleness, monotonic sequence, trusted clock, and freshness-unproven rejection |
| Evidence signer becomes release authority | Separate CI/workload evidence key and separate trust policy |
| A legacy bypass remains | Machine-readable inventory and a negative test per surface |

## 21. Definition of Done for this design

This design is ready for implementation planning when:

- Thai and English Markdown/HTML editions are content-aligned
- No unresolved marker or ambiguous decision remains
- Architecture, component contracts, state, transaction, artifact policy, error model, and tests are internally consistent
- The user reviews and approves the written specification

Approval of this design is not Production approval and does not authorize P3 distribution.
