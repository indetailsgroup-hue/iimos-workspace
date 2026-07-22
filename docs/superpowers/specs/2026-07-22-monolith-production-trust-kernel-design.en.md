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
| Client role and actor can originate from local storage or headers | `src/core/auth/roles.ts`, `src/core/api/stateApi.ts`, `supabase/functions/factory-api/index.ts` | Server-derived `ActorContextV1`; headers have no authority |
| Node filesystem state and Supabase SQL state run in parallel and apply different export policies | `server/src/state/`, `supabase/migrations/0155_factory_state_server.sql` | Supabase/Postgres is the sole release authority; Node is a worker |
| Supabase `factory_jobs` lacks tenant scope and has broad authenticated-read policy | `supabase/migrations/0155_factory_state_server.sql` | Tenant-bound schema, membership RLS, and tenant-scoped object paths |
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
| `DTK-04` | Designer freezes; a distinct `RELEASE_APPROVER` releases; Factory only consumes; Admin has no implicit release authority |
| `DTK-05` | The same release revision returns the same packet bytes; a material input change creates a new revision |
| `DTK-06` | The application holds only signer key IDs; private keys remain outside the app; production signing stays disabled until key ceremony |
| `DTK-07` | An unknown tool or unsupported operation blocks the entire packet; no partial output or fallback |
| `DTK-08` | The offline verifier has a separate executable/package graph and emits a machine-readable report |
| `DTK-09` | Trust and release-status bundles are signed external inputs; a packet cannot authorize its own key |
| `DTK-10` | An old release revision is immutable; an error requires revocation and a new working revision |
| `DTK-11` | There is no hard-gate override; only soft warnings may have reasoned, expiring, four-eyes exceptions that create a new revision |
| `DTK-12` | Definition of Done includes contract, property, negative, hostile, golden-vector, E2E, and commit-linked CI evidence |
| `DTK-13` | V1/V2 remain readable as history only; production-shaped output requires V3 |
| `DTK-14` | Supabase/Postgres is the canonical release authority; Node has no authoritative filesystem state |
| `DTK-15` | Working revision, release attempt, and release revision are separate aggregates |
| `DTK-16` | A real shadow P2 manufacturing payload is generated but sealed in private quarantine; P3 distribution remains disabled |
| `DTK-17` | RELEASE cannot be queued offline or auto-replayed; it requires fresh interactive identity and candidate hash |

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

Created at freeze. Its hash covers the canonical snapshot, gate inputs, machine capability profile, policy versions, tenant scope, and required artifact definitions. Every approval binds this candidate hash.

### 6.4 `ReleaseAttempt`

Statuses:

- `PENDING`: preconditions passed and compile/sign/commit is in progress
- `FAILED`: deterministic blocker or non-retryable failure
- `PUBLISHED`: release commit succeeded and the artifact is available under environment policy
- `VOID`: attempt or quarantined artifact is cancelled and cannot be published

A transient signer or store failure may retry only with the same candidate hash and idempotency key.

### 6.5 `ReleaseRevision`

Statuses:

- `ACTIVE`: immutable release whose signature, artifact reference, and ledger commit succeeded
- `REVOKED`: immutable historical release that can no longer be consumed

A release revision carries its release revision ID, candidate hash, content hash, expected packet hash, release certificate, approver identity, approval evidence, machine-profile binding, tenant scope, parent lineage, and authoritative timestamps.

The UI may project “RELEASED” when an `ACTIVE ReleaseRevision` exists, but `RELEASED` cannot be stored as mutable `WorkingRevision` state.

### 6.6 Concurrent history after change

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

### 7.2 Role responsibilities

| Role | Allowed actions |
|---|---|
| `DESIGNER` | Edit DRAFT, run validation, freeze, and submit a candidate |
| `RELEASE_APPROVER` | Approve/reject a candidate and initiate release when not the freezer |
| `FACTORY` | Consume only ACTIVE + verifier PASS + environment-policy-approved artifacts |
| `SAFETY_REVOKER` | Immediately revoke an ACTIVE release with a reason |
| `ADMIN` | Manage membership and policy, with no implicit release permission |
| `QA_EVIDENCE` | Access sealed shadow artifacts under QA policy and audit |

### 7.3 Four-eyes invariant

`freezeActorUserId != releaseApproverUserId` is enforced by database constraint or transaction logic, not by the UI. An approval binds candidate hash, tenant scope, approver user ID, membership version, AAL, decision time, and reason.

Shadow evidence records the AAL used. Production distribution remains disabled until a production policy requires and proves AAL2.

### 7.4 Tenant isolation

- Every authoritative table carries `tenant_id`; child records use tenant-bound foreign keys
- A job/project identifier alone is never global authority
- RLS checks membership and tenant/site scope; product data cannot use `using (true)`
- Object paths reside under `tenantId/siteId/releaseRevisionId/contentHash`
- The signed manifest and release certificate bind tenant/org/site
- Any content-addressed physical deduplication remains behind logical tenant authorization and cannot expose an existence side channel

## 8. Component contracts

| Component | Input | Output | Responsibility boundary |
|---|---|---|---|
| `AuthContextResolver` | Verified JWT/request | `ActorContextV1` | Identity, membership, scope, roles, AAL |
| `ReleaseAuthority` | Actor, action, expected candidate, idempotency | Transition/result/event | State, SoD, CAS, ledger; never builds a packet |
| `SnapshotService` | Frozen working revision | `ReleaseSnapshotV3` | Immutable canonical input |
| `CapabilityCompiler` | Snapshot operations + `MachineCapabilityProfileV1` | Capability report | Exhaustive support decision; no fallback |
| `PacketBuilderV3` | Approved snapshot + capability report | Canonical unsigned payload | Pure deterministic construction |
| `ManagedSignerPort` | Fixed digest/certificate + key ID | Ed25519 signature | Private key remains outside the application |
| `ArtifactRepository` | Tenant-scoped bytes/reference | Content-addressed record | Private write, quarantine, availability; no release authority |
| `TrustBundleManager` | Key/revocation governance | Signed bundles | Trust roots, key validity, expiry, sequence |
| `OfflineVerifier` | Packet + external bundles | `VerificationReportV1` | Independent validation; no builder import |
| `EvidenceRecorder` | Run context/results/artifacts | Evidence bundle | Exact source/environment/result traceability |

Contracts evolve independently: `ActorContextV1`, `TenantScopeV1`, `ReleaseSnapshotV3`, `MachineCapabilityProfileV1`, `CapabilityReportV1`, `FactoryPacketManifestV3`, `ReleaseCertificateV1`, `TrustBundleV1`, `ReleaseStatusBundleV1`, and `VerificationReportV1`.

## 9. Artifact Class Matrix

| Class | Examples | DRAFT | FROZEN | Shadow ACTIVE release | Production distribution |
|---|---|---:|---:|---:|---:|
| `P0_PREVIEW` | Interactive render, in-product simulation | View | View | View | Not applicable |
| `P1_REVIEW` | Watermarked PDF/JSON without machine geometry | Optional audited download | Audited download | Audited download | Policy controlled |
| `P2_MANUFACTURING` | Cut List CSV, DXF, CIX/G-code, full packet | Deny | Deny | Build real bytes; sealed quarantine; QA-only safe extension | Deny in this phase |
| `P3_DISTRIBUTION` | Factory/operator/machine delivery | Deny | Deny | Deny | Disabled until separate production authorization |

Changing the P2 extension for QA is defense in depth, not primary authority. Primary controls are private storage, access control, no Factory URL, and environment policy.

## 10. Release transaction choreography

### 10.1 Freeze

1. Designer submits freeze intent with expected working-revision version
2. Server resolves actor/membership and checks tenant scope
3. Server compiles canonical snapshot inputs and gate inputs
4. Database CAS changes DRAFT to FROZEN with candidate hash, freezer identity, and policy/profile versions
5. Client receives a server projection; local state has no authority

### 10.2 Release

1. `RELEASE_APPROVER` sends a release request with candidate hash and idempotency key
2. Authority rechecks distinct user, membership, tenant/site scope, candidate freshness, required gates, and profile versions
3. Create `ReleaseAttempt=PENDING`
4. Worker reads the immutable snapshot and runs the capability compiler; any blocker fails the whole attempt
5. Worker creates the canonical unsigned payload and stores it in private tenant quarantine
6. Worker creates deterministic release-certificate data and requests a managed Ed25519 signature; the signature remains in memory and there is no signed downloadable object
7. One database transaction rechecks candidate CAS and records approval, signature certificate, `ReleaseRevision=ACTIVE`, expected final packet hash, artifact reference, ledger event, and outbox
8. If the transaction fails, discard the signature, mark the quarantine record VOID, and expose no URL
9. After commit, the worker constructs final packet bytes from canonical payload plus the persisted certificate using fixed packaging, then stores them at the expected hash; a retry must produce the same bytes
10. Publication policy exposes a reference only when `ReleaseRevision=ACTIVE` and artifact status is `AVAILABLE`; shadow policy still denies Factory/P3

### 10.3 Failure rules

- Automatically retry only transient signer/store failures under the same idempotency key
- Deterministic gate/capability/schema/auth/state failures cannot be retried while hiding the reason
- Store success + DB failure produces a private VOID artifact; no signed packet exists before commit
- If the DB commit response is lost, an idempotency lookup returns the existing release and certificate
- A concurrent release has one CAS winner; all others receive stable `STATE_CONFLICT`
- Candidate change, unfreeze, or membership change invalidates the previous approval

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

`TrustBundleV1` contains scope, sequence, issuedAt, expiresAt, trusted key IDs, algorithms, validity windows, and key revocations.

`ReleaseStatusBundleV1` contains scope, sequence, issuedAt, expiresAt, and the set of release revisions that have been revoked or voided. A valid release certificate proves that the authority issued the release; the latest unexpired bundle must prove that the revision is absent from the revoked/void set.

Both are signed by a trust authority pinned by the verifier and are delivered separately from the packet. The verifier rejects expiry, sequence rollback, scope mismatch, invalid signature, or the absence of a trusted clock/clock policy capable of proving time.

## 12. Capability safety

`MachineCapabilityProfileV1` declares machine and dialect version, supported operation types, tool identities, ranges, faces, units, coordinate conventions, and postprocessor version.

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
| `AUTH` | `AUTH_REQUIRED`, `AUTH_ANON_NOT_ALLOWED`, `AUTH_MEMBERSHIP_REVOKED`, `AUTH_SCOPE_DENIED`, `AUTH_SOD_VIOLATION` |
| `STATE` | `STATE_CANDIDATE_STALE`, `STATE_CONFLICT`, `STATE_RELEASE_REVOKED`, `STATE_IDEMPOTENCY_MISMATCH` |
| `GATE` | `GATE_HARD_BLOCKER`, `GATE_WARNING_EXCEPTION_EXPIRED` |
| `CAP` | `CAP_UNKNOWN_TOOL`, `CAP_UNSUPPORTED_OPERATION`, `CAP_PROFILE_MISMATCH`, `CAP_PARAMETER_RANGE` |
| `PACKET` | `PACKET_SCHEMA_UNSUPPORTED`, `PACKET_HASH_MISMATCH`, `PACKET_EXTRA_FILE`, `PACKET_RESOURCE_LIMIT` |
| `CRYPTO` | `CRYPTO_SIGNER_UNAVAILABLE`, `CRYPTO_SIGNATURE_INVALID`, `CRYPTO_ALGORITHM_DENIED` |
| `TRUST` | `TRUST_BUNDLE_EXPIRED`, `TRUST_SEQUENCE_ROLLBACK`, `TRUST_SCOPE_MISMATCH`, `TRUST_CLOCK_UNAVAILABLE` |
| `STORE` | `STORE_QUARANTINE_FAILED`, `STORE_HASH_MISMATCH`, `STORE_ARTIFACT_UNAVAILABLE` |

HTTP mapping: 401 for no verified human identity, 403 for scope/role/SoD denial, 409 for stale/CAS/idempotency conflict, 422 for a deterministic blocker, and 503 for a transient signer/store dependency.

Logs cannot contain raw JWTs, private keys, full packet contents, or unnecessary PII. UI, API, CI, and verifier use the same reason codes.

## 14. Standalone offline verifier

The verifier accepts only:

1. FactoryPacket V3
2. `TrustBundleV1`
3. `ReleaseStatusBundleV1`
4. Pinned verifier policy/configuration

It validates:

- Envelope/schema/version and resource limits before deep parsing
- Path traversal, duplicate paths, extra/missing files, decompression ratio, and maximum sizes
- Per-file bytes/hash and canonical manifest binding
- Release-certificate signature and key/trust validity
- Tenant/org/site, candidate, machine-profile, and artifact-class binding
- A valid release certificate and absence of the release revision from the latest status bundle's revoked/void entries
- Trust/release bundle scope, sequence, expiry, and trusted-clock policy
- Gate and capability-report hashes
- `NOT_FOR_PRODUCTION` and environment policy

It emits `VerificationReportV1` containing verdict, stable reason codes, checked hashes, bundle sequences, verifier build hash, and a human summary.

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

Every reachable build/export/download surface appears in a machine-readable ledger with owner, artifact class, current behavior, target disposition, and negative test:

- `REUSE`: safe primitive without authority, such as a canonical hash helper
- `ADAPT`: implementation reused under the V3 contract, such as deterministic ZIP after removal of runtime time
- `READ_ONLY`: V1/V2 history and inspection with no production-shaped output
- `BLOCK`: client download, FROZEN manufacturing export, legacy direct CNC, duplicate state mutation, or any authority bypass

“Block or route” without a complete inventory does not satisfy Definition of Done.

## 16. Verification and evidence design

### 16.1 Test layers

1. Contract/schema/version and reason-code tests
2. JWT, membership, role, SoD, and cross-tenant negative tests
3. State, CAS, idempotency, concurrency, revocation, and fork tests
4. Capability compiler and dialect defense-in-depth tests
5. Canonicalization, property-based determinism, and mutation tests
6. Managed signing, trust, expiry, rollback, and revocation golden vectors
7. Hostile packet/ZIP/fuzz/resource-limit tests
8. Builder/verifier cross-implementation conformance
9. Two-person E2E release and revocation flow
10. Legacy route bypass tests for every ledger entry

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
- Attempted offline queued release
- Cross-tenant object/hash guessing

Every case proves that no valid downloadable orphan exists, no unauthorized state transition occurs, and the reason code is correct.

### 16.4 Evidence bundle

The self-verifying evidence bundle contains:

- Signed `evidence-manifest.json` and root hashes
- Git state of both roots: commit, branch, dirty files
- Dependency lock hashes and OS/runtime/compression/signer profiles
- Exact commands, exit codes, pass/fail/skip counts, and full machine-readable results
- Golden inputs, expected bytes/hashes, and mutations
- Standalone verifier binary/package hash and conformance report
- E2E actor/approval/release/revocation audit evidence
- Route disposition ledger and negative results
- Tenant isolation, hostile-packet, trust-freshness, and resource-limit reports
- Packet, trust, release-status, and evidence artifact hashes

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
- Revocation, VOID, stale candidate, membership revocation, and cross-tenant attacks are proven
- P2 shadow artifacts remain in sealed quarantine and Factory/P3 access is denied
- Evidence bundle self-verifies and binds the exact source and environment

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
| Signed orphan | Unsigned quarantine, signature retained in memory, atomic certificate/release commit, publication after commit |
| Cross-tenant leakage | Tenant-bound FK/RLS/object paths/manifest and negative matrix |
| Shadow artifact is used for production | Sealed private P2, QA-only policy, safe extension, no Factory/P3 URL |
| Determinism claim exceeds evidence | Golden bytes, property tests, cross-platform runs, pinned packaging and signing profile |
| Verifier repeats the builder defect | Separate implementation graph plus common normative vectors, not common implementation |
| Offline revocation is stale | Short validity, monotonic sequence, trusted clock, expiry or unknown clock means rejection |
| A legacy bypass remains | Machine-readable inventory and a negative test per surface |

## 21. Definition of Done for this design

This design is ready for implementation planning when:

- Thai and English Markdown/HTML editions are content-aligned
- No unresolved marker or ambiguous decision remains
- Architecture, component contracts, state, transaction, artifact policy, error model, and tests are internally consistent
- The user reviews and approves the written specification

Approval of this design is not Production approval and does not authorize P3 distribution.
