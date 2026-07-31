# MONOLITH Production Trust Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Shadow Trust-Ready Production Trust Kernel so every production-shaped artifact is tenant-bound, deterministic, two-person authorized, capability-safe, externally verifiable, revocable, and technically prevented from reaching Factory or a human as P2 plaintext.

**Architecture:** Supabase/Postgres is the only release authority. A user-scoped action-context RPC authorizes immutable release records; a Node worker compiles capabilities, constructs deterministic FactoryPacket V3 bytes, calls managed signers, and materializes private artifacts. A separate `tools/factory-packet-verifier` workspace implements packet/trust verification without importing builder code and consumes only protocol vectors and external bundles.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, Supabase Edge Functions, TypeScript 5.x, Node.js 20/22, Vitest, fast-check, `yazl` for builder packaging, `yauzl` plus `@noble/ed25519` for the independent verifier, Playwright, GitHub Actions.

**Plan scope:** 12 reviewable tasks in one authority chain. Splitting this into independent plans would allow identity, release, artifact, and verifier contracts to drift; phase gates below provide the review boundaries instead.

## Global Constraints

- All implementation paths below are relative to the nested product Git root `determined-williams/`; this plan remains in the parent governance root.
- Read `CONTEXT.md` and the 21 July 2026 repository-scope correction before implementation; inspect and report Git status in both roots at every checkpoint.
- Preserve the existing modified nested files `daph-second-brain/_inventory.json`, `_knowledge-export.json`, and `_move-log.md`.
- The phase remains `NOT_FOR_PRODUCTION`. P3 distribution and real Factory/machine delivery remain disabled.
- Daph is fixture/onboarding data for tenant 001, never a runtime constant. Every coexistence suite also provisions tenant 002.
- Postgres creates `VerifiedActionContextV1` under the caller's user bearer token. A service role cannot create human authority or accept client-supplied role, name, tenant, site, or object path.
- Freeze actor and release approver are distinct authenticated users. Admin gains release authority only through a separate `RELEASE_APPROVER` membership role.
- Hard gates and capability blockers always deny. Only catalogue warnings with `exceptionEligible=true` can use signed, expiring, two-person `WarningExceptionGrantV1`.
- Builder output is all-or-nothing. Unknown tools, unsupported operations, range failures, invalid profile attestations, or stale trust state produce stable reason codes and zero publishable output.
- The application stores signer key IDs only. Release, profile, warning-exception, and evidence private keys remain behind managed signer ports.
- The independent verifier imports no module from `server/src/trust-kernel`, `src/factory/packet`, or `src/core/manufacturing`; shared inputs are JSON schemas and golden bytes only.
- Shadow P2 plaintext is readable only by an isolated workload identity. Humans receive hashes, reports, and evidence; raw storage locators and reusable signed URLs are prohibited.
- RELEASE is never queued offline or auto-replayed. Offline verification reports `validAsOf`; it cannot claim current activity without online-current authority.
- No dual write: V3 Postgres records are the sole mutable release authority; V1/V2 surfaces become read-only projections or are denied/removed through the route disposition ledger.
- New project-facing Markdown documentation is emitted in aligned `.en.md`, `.th.md`, `.en.html`, and `.th.html` editions.
- Every production-code task uses `superpowers:test-driven-development`: RED, GREEN, refactor, targeted verification, commit.

## Phase Gates

| Gate | Tasks | Exit criterion |
|---|---|---|
| A — Authority Foundation | 1–4 | Versioned contracts, tenant membership, action contexts, governance records, and release state machines pass unit and pgTAP negative suites |
| B — Deterministic Release | 5–9 | User-authorized release produces byte-identical V3 bytes through managed signing and private artifact materialization; revocation bundles are issued |
| C — Independent Proof | 10–12 | Independent verifier, P2 containment, legacy-route denial, hostile/E2E/chaos suites, and signed evidence all pass |

## Written Spec Coverage Crosswalk

| Approved Written Spec sections | Implementation coverage |
|---|---|
| §§1–5 — executive decision, repository/evidence scope, locked decisions, architecture, authority rule, no dual write | Global Constraints; Tasks 2, 4, 5, and 11 |
| §6 — `TenantScopeV1`, `WorkingRevision`, `ReleaseCandidate`, `ReleaseAttempt`, `ArtifactRecordV1`, `ReleaseRevision`, concurrent history | Tasks 1, 4, 7, 8, and 9 |
| §7 — actor resolution, verified action context, role boundaries, four-eyes invariant, tenant isolation | Tasks 2–5 and Task 12 negative suites |
| §§8–9 — component contracts and P0/P1/P2/P3 artifact matrix | Tasks 1, 3, 5–11 |
| §10 — freeze/release/failure/revoke/fork/offline transaction choreography | Tasks 4, 5, 8, 9, and 12 |
| §11 — canonical determinism, signing profile, trust and release-status bundles | Tasks 1 and 7–10 |
| §§12–13 — capability safety and stable error model | Tasks 1, 3, 6, and 7 |
| §14 — standalone independent offline verifier | Task 10 plus Task 12 hostile/E2E proof |
| §15 — canonicalization-first legacy migration, route disposition ledger, no parallel authority | Task 11 |
| §16 — unit/property/pgTAP/Edge/E2E/chaos layers, golden corpus, transaction chaos, evidence bundle | RED/GREEN steps in Tasks 1–11 and complete-output Task 12 |
| §§17–21 — Shadow Trust-Ready gate, Production/GA NO-GO, observability, governance, ownership, risks/controls, definition of done | Task 12 and Final MONOLITH Completion Gate |

## File and Responsibility Map

| Area | Files | Responsibility |
|---|---|---|
| Server protocol | `server/src/trust-kernel/contracts/*`, `canonical/*`, `reasonCodes.ts`, `result.ts` | Builder-side versioned types, canonical hashing, stable error vocabulary |
| Database authority | `supabase/migrations/0162_*` through `0166_*` | Tenant membership, action contexts, governance, release/artifact/outbox states, RLS and RPCs |
| Edge boundary | `supabase/functions/factory-api/trustKernel.ts`, `index.ts`, `index.test.ts` | User-token action context creation and V3 transport; no client authority fields |
| Capability and builder | `server/src/trust-kernel/capability/*`, `snapshot/*`, `packet/*` | Profile adaptation, exhaustive compilation, deterministic unsigned/final packet bytes |
| Signing and worker | `server/src/trust-kernel/signing/*`, `worker/*`, `artifacts/*` | Managed signing, release choreography, content-addressed private materialization |
| Trust bundles | `server/src/trust-kernel/trust/*` | Signed trust/release-status snapshots, purpose and revocation semantics |
| Independent verifier | `tools/factory-packet-verifier/*` | Separate parser, canonicalizer, signature/freshness/revocation verifier and CLI |
| Protocol evidence | `test-vectors/factory-packet-v3/*`, `supabase/tests/trust_kernel_*.sql`, `e2e/trust-kernel/*` | Shared bytes, DB invariants, hostile vectors, cross-implementation and E2E proof |
| Containment | `src/core/api/trustKernelApi.ts`, legacy export surfaces, route ledger | V3 projection plus denial/read-only disposition of every old authority path |
| CI evidence | `.github/workflows/trust-kernel-verify.yml`, `server/src/trust-kernel/evidence/*` | Complete-output reports and managed evidence attestation |

## Task Overview

1. **Protocol contracts and canonical hashing** — no dependencies.
2. **Tenant membership and verified action contexts** — depends on Task 1 reason codes.
3. **Machine-profile and warning-exception governance** — depends on Tasks 1–2.
4. **Release, artifact, ledger, and outbox authority** — depends on Tasks 1–3.
5. **User-token Edge transport and service-role containment** — depends on Tasks 2 and 4.
6. **Profile adapters and exhaustive capability compiler** — depends on Tasks 1 and 3.
7. **Deterministic snapshot and FactoryPacket V3 builder** — depends on Tasks 1 and 6.
8. **Managed signer, release worker, and artifact materialization** — depends on Tasks 4 and 7.
9. **Trust and release-status bundle issuance** — depends on Tasks 3, 4, and 8.
10. **Standalone independent offline verifier** — depends on Tasks 1, 7, and 9 only through schemas/vectors.
11. **P2 quarantine, client projection, and legacy-route containment** — depends on Tasks 5, 8, and 10.
12. **E2E chaos, signed evidence, CI, and executive acceptance gate** — depends on all prior tasks.

---

### Task 1: Protocol contracts and canonical hashing

**Files:**

- Create: `server/src/trust-kernel/contracts/protocolV3.ts`
- Create: `server/src/trust-kernel/contracts/protocolV3.schema.json`
- Create: `server/src/trust-kernel/canonical/canonicalJson.ts`
- Create: `server/src/trust-kernel/canonical/hash.ts`
- Create: `server/src/trust-kernel/reasonCodes.ts`
- Create: `server/src/trust-kernel/result.ts`
- Test: `server/src/trust-kernel/test/protocolV3.test.ts`
- Test: `server/src/trust-kernel/test/canonicalJson.property.test.ts`

**Interfaces:**

- Produces: `canonicalJson(value: JsonValue): string`, `sha256Hex(value: Uint8Array | string): string`, `computeReleaseAuthorizationHash(candidateHash, sortedGrantHashes): string`.
- Produces: `TrustResult<T>`, stable `TrustReasonCode`, and the approved protocol types `ActorContextV1`, `VerifiedActionContextV1`, `TenantScopeV1`, `WorkingRevision`, `ReleaseCandidate`, `ReleaseAttempt`, `ReleaseSnapshotV3`, `MachineCapabilityProfileV1`, `MachineProfileAttestationV1`, `WarningExceptionGrantV1`, `CapabilityReportV1`, `FactoryPacketManifestV3`, `ReleaseCertificateV1`, `ArtifactRecordV1`, `ReleaseRevision`, `TrustBundleV1`, `ReleaseStatusBundleV1`, `VerificationReportV1`, and `EvidenceAttestationV1`.

- [ ] **Step 1: Write RED contract and property tests**

```ts
expect(canonicalJson({ b: 1, a: "x" })).toBe('{"a":"x","b":1}');
expect(() => canonicalJson({ n: Number.NaN })).toThrow("NON_CANONICAL_NUMBER");
expect(computeReleaseAuthorizationHash("ab".repeat(32), [])).toBe(
  sha256Hex('{"candidateHash":"' + "ab".repeat(32) + '","domain":"MONOLITH/ReleaseAuthorization/V1","sortedGrantHashes":[]}'),
);
expect(RELEASE_ATTEMPT_STATUSES).toEqual(["PENDING", "FAILED", "PUBLISHED", "VOID"]);
expect(RELEASE_REVISION_STATUSES).toEqual(["ACTIVE", "REVOKED"]);
```

- [ ] **Step 2: Run RED**

Run: `npm.cmd --prefix server test -- --run src/trust-kernel/test/protocolV3.test.ts src/trust-kernel/test/canonicalJson.property.test.ts`

Expected: FAIL because the modules do not exist; zero tests may not be reported as success.

- [ ] **Step 3: Implement the minimal canonical and result contracts**

```ts
export type TrustResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TrustReasonCode; detail?: Readonly<Record<string, string>> };

export const RELEASE_ATTEMPT_STATUSES = ["PENDING", "FAILED", "PUBLISHED", "VOID"] as const;
export const ARTIFACT_STATUSES = ["QUARANTINED", "MATERIALIZING", "AVAILABLE", "VOID"] as const;
export const RELEASE_REVISION_STATUSES = ["ACTIVE", "REVOKED"] as const;

export function computeReleaseAuthorizationHash(candidateHash: string, grantHashes: readonly string[]): string {
  assertSha256(candidateHash);
  const sortedGrantHashes = [...grantHashes].sort();
  sortedGrantHashes.forEach(assertSha256);
  return sha256Hex(canonicalJson({
    domain: "MONOLITH/ReleaseAuthorization/V1",
    candidateHash,
    sortedGrantHashes,
  }));
}
```

`canonicalJson` recursively sorts object keys, preserves array order, accepts null/boolean/string/safe finite numbers, converts `-0` to `0`, and rejects undefined, non-finite numbers, bigint, functions, symbols, sparse arrays, and cyclic input. `protocolV3.schema.json` sets `additionalProperties:false` at every signed boundary.

- [ ] **Step 4: Run GREEN and server build**

Run: `npm.cmd --prefix server test -- --run src/trust-kernel/test/protocolV3.test.ts src/trust-kernel/test/canonicalJson.property.test.ts`

Run: `npm.cmd --prefix server run build`

Expected: both exit 0; property suite covers key-order permutations, Unicode, `-0`, unsafe numbers, and cyclic rejection.

- [ ] **Step 5: Commit**

```bash
git add server/src/trust-kernel
git commit -m "feat(trust-kernel): define protocol v3 contracts"
```

---

### Task 2: Tenant membership and verified action contexts

**Files:**

- Create: `supabase/migrations/0162_trust_kernel_tenancy_action_context.sql`
- Create: `supabase/tests/trust_kernel_tenancy.sql`
- Modify: `.github/workflows/db-verify.yml`

**Interfaces:**

- Produces tables: `monolith_tenant`, `monolith_site`, `monolith_membership`, `monolith_membership_role`, `monolith_membership_site`, `verified_action_context`.
- Produces RPC: `create_verified_action_context(action, tenant_id, site_id, resource_type, resource_id, request_hash, candidate_hash default null, release_authorization_hash default null) returns uuid`.
- Produces internal function: `consume_verified_action_context(context_id, expected_action) returns verified_action_context`.

- [ ] **Step 1: Write RED pgTAP assertions**

```sql
select throws_ok(
  $$select public.create_verified_action_context('RELEASE', :'tenant_001', :'site_001', 'RELEASE_CANDIDATE', :'candidate_id', repeat('c',64), repeat('a',64), repeat('b',64))$$,
  '42501', null, 'service role cannot create human action context'
);
select is(
  (select count(*) from public.monolith_membership_role where tenant_id = :'tenant_001' and role = 'RELEASE_APPROVER'),
  1::bigint, 'tenant 001 approver remains tenant scoped'
);
select is(
  (select count(*) from public.monolith_site where tenant_id = :'tenant_002'),
  1::bigint, 'tenant 002 coexists without source changes'
);
select throws_ok(
  $$select public.consume_verified_action_context(:'context_id', 'RELEASE')$$,
  'P0001', 'AUTH_ACTION_CONTEXT_INVALID', 'nonce is one-time'
);
```

The suite creates two tenants and sites inside one transaction, creates authenticated users/memberships, exercises user-JWT claims through `request.jwt.claim.sub`, and rolls back.

- [ ] **Step 2: Run RED on local Supabase**

Run: `supabase start`

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tA -v ON_ERROR_STOP=1 -f supabase/tests/trust_kernel_tenancy.sql`

Expected: FAIL with PostgreSQL `42P01` for the relation assertions and `42883` for the RPC assertions.

- [ ] **Step 3: Implement tenant-bound schema and RLS**

```sql
create table public.monolith_tenant (
  id uuid primary key, slug text not null unique, display_name text not null,
  status text not null check (status in ('ACTIVE','SUSPENDED'))
);
create table public.monolith_site (
  id uuid not null, tenant_id uuid not null references public.monolith_tenant(id),
  code text not null, display_name text not null, status text not null check (status in ('ACTIVE','INACTIVE')),
  primary key (tenant_id,id), unique (tenant_id,code)
);
create table public.monolith_membership (
  id uuid not null, tenant_id uuid not null references public.monolith_tenant(id),
  user_id uuid not null references auth.users(id), version bigint not null default 1,
  status text not null check (status in ('ACTIVE','REVOKED')),
  primary key (tenant_id,id), unique (tenant_id,user_id)
);
```

Role/site join tables carry `(tenant_id,membership_id)` composite foreign keys. All six tables enable RLS; direct writes are denied. The context binds resource type/ID and request hash. `FREEZE` requires a working-revision resource and null candidate hashes; `RELEASE` requires candidate plus release-authorization hashes; `REVOKE` requires a release-revision resource. `create_verified_action_context` requires `auth.role()='authenticated'`, derives `auth.uid()`, reads current membership and AAL, sets `expires_at=clock_timestamp()+interval '5 minutes'`, and never accepts actor/role/name. `consume_verified_action_context` locks the row, compares action/resource/expiry/membership version, sets `consumed_at`, and returns stable auth errors.

- [ ] **Step 4: Extend DB CI without weakening the existing suite**

Change `db-verify.yml` to run both SQL files separately into `workflow-db.tap` and `trust-kernel-tenancy.tap`, reject `not ok`, reject an empty suite, and include per-suite counts in `db-verify-evidence.json`.

- [ ] **Step 5: Run GREEN**

Run the pgTAP command again, then run the original `supabase/tests/workflow_db_invariants.sql` command.

Expected: both exit 0 with at least one `ok` line; Daph-like tenant 001 and tenant 002 remain isolated.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0162_trust_kernel_tenancy_action_context.sql supabase/tests/trust_kernel_tenancy.sql .github/workflows/db-verify.yml
git commit -m "feat(trust-kernel): add tenant action authority"
```

---

### Task 3: Machine-profile and warning-exception governance

**Files:**

- Create: `supabase/migrations/0163_trust_kernel_profile_exception.sql`
- Create: `supabase/tests/trust_kernel_governance.sql`
- Create: `server/src/trust-kernel/contracts/profileGovernance.ts`
- Create: `server/src/trust-kernel/governance/verifyGovernanceSignature.ts`
- Test: `server/src/trust-kernel/test/profileGovernance.test.ts`

**Interfaces:**

- Produces `MachineProfileAttestationV1` and `WarningExceptionGrantV1`.
- Produces `verifyProfileAttestation(attestation, trust): TrustResult<MachineProfileAttestationV1>` and `verifyWarningGrant(grant, candidateHash, trust): TrustResult<WarningExceptionGrantV1>`.
- Produces DB functions `assert_profile_attestation_current` and `assert_warning_grants_current` for release transactions.

- [ ] **Step 1: Write RED unit and pgTAP tests**

```ts
expect(verifyProfileAttestation(attestation({ toolLibraryHash: badHash }), trust).ok).toBe(false);
expect(verifyWarningGrant(grant({ approverUserIds: [userA, userA] }), candidateHash, trust)).toMatchObject({
  ok: false, code: "GATE_WARNING_EXCEPTION_MISMATCH",
});
expect(verifyWarningGrant(grant({ warningCode: "CAP_UNKNOWN_TOOL" }), candidateHash, trust)).toMatchObject({
  ok: false, code: "GATE_HARD_BLOCKER",
});
```

```sql
select throws_ok(
  $$select public.assert_profile_attestation_current(:'tenant_002', :'attestation_tenant_001', clock_timestamp())$$,
  'P0001', 'CAP_PROFILE_ATTESTATION_INVALID', 'cross-tenant profile rejected'
);
```

- [ ] **Step 2: Run RED**

Run: `npm.cmd --prefix server test -- --run src/trust-kernel/test/profileGovernance.test.ts`

Run the governance pgTAP file against local Supabase.

Expected: missing modules/tables fail both suites.

- [ ] **Step 3: Implement exact governance records**

`MachineProfileAttestationV1` contains `id`, tenant/site/machine IDs, canonical profile hash, tool-library hash, postprocessor ID/version/binary hash, approver user ID, key ID with purpose `PROFILE_ATTESTATION`, issued/valid-from/valid-until, sequence, status, signature.

`WarningExceptionGrantV1` contains `id`, tenant/site, candidate hash, warning code, sorted entity IDs, reason, policy version, two distinct approver user IDs, issued/expires, key ID with purpose `WARNING_EXCEPTION`, signature. Database constraints enforce two distinct approvers and `expires_at>issued_at`; the catalogue table owns `exception_eligible` and marks every `CAP_*` code false.

- [ ] **Step 4: Implement managed-key-purpose verification**

```ts
export type KeyPurpose = "RELEASE" | "TRUST_BUNDLE" | "PROFILE_ATTESTATION" | "WARNING_EXCEPTION" | "EVIDENCE";
export function requireKeyPurpose(key: TrustedKeyV1, expected: KeyPurpose): TrustResult<TrustedKeyV1> {
  return key.purpose === expected
    ? { ok: true, value: key }
    : { ok: false, code: "CRYPTO_ALGORITHM_DENIED", detail: { expected, actual: key.purpose } };
}
```

Verification canonicalizes the unsigned record, checks Ed25519 through an injected public-key verifier, checks scope/time/sequence/revocation, then returns the record. Database functions repeat scope/time/status checks at release commit.

- [ ] **Step 5: Run GREEN and commit**

Run server tests, server build, and governance pgTAP. Expected: exit 0; expired, revoked, wrong-purpose, duplicate-approver, hard-blocker, and cross-tenant cases reject.

```bash
git add supabase/migrations/0163_trust_kernel_profile_exception.sql supabase/tests/trust_kernel_governance.sql server/src/trust-kernel
git commit -m "feat(trust-kernel): govern profiles and warning exceptions"
```

---

### Task 4: Release, artifact, ledger, and outbox authority

**Files:**

- Create: `supabase/migrations/0164_trust_kernel_release_authority.sql`
- Create: `supabase/tests/trust_kernel_release.sql`
- Create: `server/src/trust-kernel/contracts/releasePorts.ts`
- Test: `server/src/trust-kernel/test/releaseStateModel.test.ts`

**Interfaces:**

- Produces tables: `release_working_revision`, `release_candidate`, `release_attempt`, `release_approval`, `release_revision`, `release_artifact`, `release_event`, `release_outbox`.
- Produces RPCs: `rpc_trust_freeze`, `rpc_trust_begin_release`, `rpc_trust_commit_release`, `rpc_trust_mark_artifact_available`, `rpc_trust_void_artifact`, `rpc_trust_revoke`.
- Produces `ReleaseAuthorityPort` consumed by Task 8.

- [ ] **Step 1: Write RED state/concurrency/idempotency tests**

```sql
select throws_ok($$select public.rpc_trust_begin_release(:'freezer_context', :'candidate', :'auth_hash', 'idem-1', :'request')$$,
  'P0001', 'AUTH_SOD_VIOLATION', 'freezer cannot approve own release');
select is((public.rpc_trust_begin_release(:'approver_context', :'candidate', :'auth_hash', 'idem-1', :'request')).attempt_id,
          (public.rpc_trust_begin_release(:'retry_context', :'candidate', :'auth_hash', 'idem-1', :'request')).attempt_id,
          'same idempotency request returns same attempt');
select throws_ok($$select public.rpc_trust_begin_release(:'new_context', :'candidate', :'auth_hash', 'idem-1', repeat('f',64))$$,
  'P0001', 'STATE_IDEMPOTENCY_MISMATCH', 'same key with changed request rejects');
```

Also assert `VOID` is accepted only for attempt/artifact, release revision accepts only `ACTIVE|REVOKED`, one CAS winner exists, and a committed `ACTIVE` revision can be consumed only with `AVAILABLE` artifact.

- [ ] **Step 2: Run RED against local Supabase**

Expected: FAIL because release authority tables/RPCs are absent.

- [ ] **Step 3: Implement state tables and constraints**

Every table carries `tenant_id`; child tables use composite tenant-bound foreign keys. `release_attempt` has a unique `(tenant_id,actor_user_id,candidate_hash,idempotency_key)` and stored request hash. `release_revision` stores candidate hash, release authorization hash, sorted grant hashes, certificate, expected packet hash, profile-attestation binding, sequence, and authority timestamps. `release_artifact` stores only an internal locator under `tenantId/siteId/releaseRevisionId/contentHash`.

- [ ] **Step 4: Implement transaction choreography**

`rpc_trust_begin_release` consumes a fresh action context, rechecks SoD/current membership/profile/grants, locks the candidate, allocates attempt/revision ID, sequence, and authority time. `rpc_trust_commit_release` is callable only by the worker role, locks the attempt, rechecks current membership version and candidate CAS, stores certificate plus `ACTIVE` revision and `MATERIALIZING` artifact, then appends event/outbox atomically. Failed commit creates no release revision. Availability and revocation are append-only transitions.

- [ ] **Step 5: Run GREEN, race tests, and commit**

Run the release pgTAP file twice: once normally and once with two concurrent `psql` sessions invoking the same candidate. Expected: one success, one `STATE_CONFLICT`, no duplicate active revision.

```bash
git add supabase/migrations/0164_trust_kernel_release_authority.sql supabase/tests/trust_kernel_release.sql server/src/trust-kernel/contracts/releasePorts.ts server/src/trust-kernel/test/releaseStateModel.test.ts
git commit -m "feat(trust-kernel): add canonical release authority"
```

---

### Task 5: User-token Edge transport and service-role containment

**Files:**

- Create: `supabase/functions/factory-api/trustKernel.ts`
- Create: `supabase/functions/factory-api/index.test.ts`
- Modify: `supabase/functions/factory-api/index.ts`
- Modify: `.github/workflows/edge-fn-verify.yml`

**Interfaces:**

- Produces `handleTrustKernelRequest(req, deps): Promise<Response>`.
- V3 endpoints: `POST /v3/factory/jobs/:id/freeze`, `/release`, `/revoke`; `GET /v3/factory/releases/:id/status`.
- Calls action-context creation with incoming bearer plus anon key; service role is reserved for outbox/storage worker calls.

- [ ] **Step 1: Write RED transport tests**

```ts
expect((await handleTrustKernelRequest(post("/release", {}, {}), deps)).status).toBe(401);
expect((await handleTrustKernelRequest(post("/release", body, {
  authorization: userBearer, "x-actor-role": "ADMIN", "x-actor-name": "spoof",
}), deps)).status).toBe(202);
expect(deps.createActionContext).toHaveBeenCalledWith(expect.objectContaining({ bearer: userBearer }));
expect(deps.createActionContext).not.toHaveBeenCalledWith(expect.objectContaining({ bearer: serviceBearer }));
expect(JSON.stringify(deps.createActionContext.mock.calls)).not.toContain("spoof");
```

Add invalid JSON, wrong method, candidate mismatch, offline replay header, expired context, and service-role spoof cases with stable HTTP/reason-code mapping.

- [ ] **Step 2: Run RED**

Run: `npx vitest run supabase/functions/factory-api/index.test.ts --reporter=verbose`

Expected: FAIL because the injectable V3 handler is absent.

- [ ] **Step 3: Split pure transport from environment adapters**

```ts
export type TrustKernelDeps = Readonly<{
  createActionContext(input: UserActionInput): Promise<TrustResult<{ contextId: string }>>;
  invokeAuthority(input: AuthorityRequest): Promise<TrustResult<AuthorityResponse>>;
}>;
```

`createActionContext` forwards the incoming Authorization header and `SUPABASE_ANON_KEY`. It filters the request body to candidate/release-authorization/idempotency/request hashes. Existing service-role helpers remain inaccessible to this function and reject any user-authority operation.

- [ ] **Step 4: Run GREEN and Edge suite**

Run the targeted test, then `npx vitest run supabase/functions --reporter=default --reporter=json --outputFile=edge-fn-report.json`.

Expected: exit 0, `numPassedTests>0`, `numFailedTests=0`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/factory-api .github/workflows/edge-fn-verify.yml
git commit -m "feat(trust-kernel): enforce user-authorized edge actions"
```

---

### Task 6: Profile adapters and exhaustive capability compiler

**Files:**

- Create: `server/src/trust-kernel/capability/canonicalProfile.ts`
- Create: `server/src/trust-kernel/capability/adaptLegacyProfile.ts`
- Create: `server/src/trust-kernel/capability/compileCapabilities.ts`
- Create: `server/src/trust-kernel/contracts/capability.ts`
- Modify: `server/src/post/machineProfiles.ts`
- Test: `server/src/trust-kernel/test/compileCapabilities.property.test.ts`
- Test: `server/src/trust-kernel/test/profileAdapter.test.ts`

**Interfaces:**

- Produces `adaptLegacyProfile(input): TrustResult<MachineCapabilityProfileV1>`.
- Produces `compileCapabilities(snapshot, profile, attestation): TrustResult<CapabilityReportV1>`.

- [ ] **Step 1: Write RED exhaustive failure tests**

```ts
expect(compileCapabilities(snapshotWithTool("UNKNOWN"), profile, attestation)).toMatchObject({
  ok: false, code: "CAP_UNKNOWN_TOOL",
});
expect(compileCapabilities(snapshotWithOperation("FIVE_AXIS_SWARF"), profile, attestation)).toMatchObject({
  ok: false, code: "CAP_UNSUPPORTED_OPERATION",
});
expect(compileCapabilities(snapshotWithDepth(41), profileWithDepthMax(40), attestation)).toMatchObject({
  ok: false, code: "CAP_PARAMETER_RANGE",
});
```

Property tests generate operation permutations and assert `checkedOperationIds` equals the sorted set of all input operation IDs on PASS; any dropped ID fails.

- [ ] **Step 2: Run RED**

Run: `npm.cmd --prefix server test -- --run src/trust-kernel/test/compileCapabilities.property.test.ts src/trust-kernel/test/profileAdapter.test.ts`

- [ ] **Step 3: Implement one canonical profile schema**

Canonical profile contains machine/dialect versions, operation catalogue, tool IDs and machine numbers, parameter ranges, faces, units, coordinate convention, postprocessor ID/version/binary hash. Legacy server/client shapes are read-only inputs to `adaptLegacyProfile`; local storage and arbitrary overrides never set attestation status.

Remove the `unknown tool -> 1` behavior from the V3 path. The legacy `PostContext` may retain historical reading, but any V3 invocation receives a `TrustResult` failure before dialect output.

- [ ] **Step 4: Run GREEN and dialect defense tests**

Add CIX/G-code tests proving the dialect layer independently rejects unknown tool and unsupported operation even when a forged upstream capability report says PASS.

Expected: targeted tests and server build exit 0; no partial file list is returned on failure.

- [ ] **Step 5: Commit**

```bash
git add server/src/trust-kernel server/src/post/machineProfiles.ts
git commit -m "feat(trust-kernel): compile attested machine capabilities"
```

---

### Task 7: Deterministic snapshot and FactoryPacket V3 builder

**Files:**

- Create: `server/src/trust-kernel/snapshot/buildReleaseSnapshot.ts`
- Create: `server/src/trust-kernel/packet/buildUnsignedPayloadV3.ts`
- Create: `server/src/trust-kernel/packet/packageFactoryPacketV3.ts`
- Create: `server/src/trust-kernel/packet/fixedZipProfile.ts`
- Create: `test-vectors/factory-packet-v3/valid-minimal/input.json`
- Create: `test-vectors/factory-packet-v3/valid-minimal/expected-manifest.json`
- Create: `test-vectors/factory-packet-v3/valid-minimal/packet.zip`
- Create: `test-vectors/factory-packet-v3/valid-minimal/expected-packet.sha256`
- Create: `test-vectors/factory-packet-v3/mutations/index.json`
- Test: `server/src/trust-kernel/test/packetV3.determinism.test.ts`

**Interfaces:**

- Produces `buildReleaseSnapshot(input): TrustResult<ReleaseSnapshotV3>`.
- Produces `buildUnsignedPayloadV3(snapshot, capabilityReport): TrustResult<UnsignedPacketV3>`.
- Produces `packageFactoryPacketV3(unsigned, certificate): Promise<Uint8Array>`.

- [ ] **Step 1: Write RED byte-determinism tests**

```ts
const runs = await Promise.all(Array.from({ length: 100 }, () => buildFixturePacket()));
expect(new Set(runs.map(sha256Hex)).size).toBe(1);
expect(runs.every(bytes => Buffer.from(bytes).equals(Buffer.from(runs[0])))).toBe(true);
expect(listZipPaths(runs[0])).toEqual([...listZipPaths(runs[0])].sort());
```

Test snapshot permutation, Unicode, Windows/Linux path normalization, fixed decimals/units, extra-file rejection, and identical empty optional collections.

- [ ] **Step 2: Run RED**

Expected: missing builder modules.

- [ ] **Step 3: Implement deterministic construction**

The snapshot owns tenant scope, candidate/profile/policy hashes, sorted operation/entity references, and required artifact definitions. The unsigned manifest lists every file path, byte length, SHA-256, media type, artifact class, and `NOT_FOR_PRODUCTION` marker.

`fixedZipProfile.ts` sets sorted POSIX paths, fixed timestamp `1980-01-01T00:00:00Z`, UTF-8 names, fixed compression level, fixed permissions, and an exact file allowlist. Its output is a pure function of declared bytes and constants, independent of runtime locale, clock, or randomness. Final packet content is unsigned payload plus persisted certificate only.

- [ ] **Step 4: Materialize and pin golden vectors**

Run in PowerShell: `$env:UPDATE_TRUST_VECTORS='1'; npm.cmd --prefix server test -- --run src/trust-kernel/test/packetV3.determinism.test.ts --update; Remove-Item Env:UPDATE_TRUST_VECTORS`

The update mode may create expected bytes only when `UPDATE_TRUST_VECTORS=1`; normal tests compare byte-for-byte and reject silent vector updates.

- [ ] **Step 5: Cross-platform verification and commit**

Run targeted tests and server build on Windows. CI later repeats on Ubuntu. Expected: 100/100 byte-identical runs and one pinned SHA-256.

```bash
git add server/src/trust-kernel test-vectors/factory-packet-v3
git commit -m "feat(trust-kernel): build deterministic factory packet v3"
```

---

### Task 8: Managed signer, release worker, and artifact materialization

**Files:**

- Create: `server/src/trust-kernel/signing/managedSignerPort.ts`
- Create: `server/src/trust-kernel/signing/httpManagedSignerClient.ts`
- Create: `server/src/trust-kernel/artifacts/artifactRepository.ts`
- Create: `server/src/trust-kernel/authority/supabaseReleaseAuthority.ts`
- Create: `server/src/trust-kernel/worker/releaseWorker.ts`
- Create: `server/src/trust-kernel/worker/materializeArtifact.ts`
- Modify: `server/src/worker/index.ts`
- Test: `server/src/trust-kernel/test/releaseWorker.chaos.test.ts`

**Interfaces:**

- Produces `ManagedSignerPort.sign({ keyId, purpose, digest }): Promise<TrustResult<ManagedSignature>>`.
- Produces `executeReleaseAttempt(attemptId, ports): Promise<TrustResult<ReleaseWorkerResult>>`.
- Produces `materializeArtifact(outboxEvent, ports): Promise<TrustResult<ArtifactRecordV1>>`.

- [ ] **Step 1: Write RED failure-injection tests**

```ts
await expect(runWith({ signer: timeoutSigner })).resolves.toMatchObject({ ok: false, code: "CRYPTO_SIGNER_UNAVAILABLE" });
expect(db.commitRelease).not.toHaveBeenCalled();

await runWith({ db: commitFailureDb });
expect(store.markVoid).toHaveBeenCalledOnce();
expect(store.exposeUrl).not.toHaveBeenCalled();

const retry = await runMaterializerTwice(committedAttempt);
expect(retry.firstHash).toBe(retry.secondHash);
expect(retry.records).toHaveLength(1);
```

Cover signer timeout, store failure, DB commit loss, crash after commit/before materialization, hash mismatch, outbox duplicate, and membership revoked before final commit.

- [ ] **Step 2: Run RED**

Run the chaos suite; expected missing ports/worker failure.

- [ ] **Step 3: Implement managed signer without local private-key APIs**

```ts
export interface ManagedSignerPort {
  sign(input: Readonly<{ keyId: string; purpose: KeyPurpose; digestSha256: string }>):
    Promise<TrustResult<Readonly<{ algorithm: "Ed25519"; keyId: string; signatureBase64: string }>>>;
}
```

`HttpManagedSignerClient` accepts endpoint, key ID, workload credential provider, timeout, and fetch dependency. It validates algorithm/key ID and never accepts private key bytes or seed material.

- [ ] **Step 4: Implement exact sign/commit/materialize order**

Worker reads immutable attempt allocation, compiles, builds unsigned payload, requests signature, assembles final bytes in memory, computes expected hash, then calls atomic commit. After commit, outbox materializer reconstructs identical bytes from persisted payload/certificate, stores them under the DB-provided internal locator, verifies hash, and marks `AVAILABLE`. Any precommit failure ends at `FAILED`/`VOID`; a postcommit retry never creates another certificate.

- [ ] **Step 5: Run GREEN, build, and commit**

Expected: all chaos cases have stable reason codes, no downloadable orphan, and no second signature.

```bash
git add server/src/trust-kernel server/src/worker/index.ts
git commit -m "feat(trust-kernel): sign and materialize releases safely"
```

---

### Task 9: Trust and release-status bundle issuance

**Files:**

- Create: `supabase/migrations/0165_trust_kernel_bundles_publication.sql`
- Create: `supabase/tests/trust_kernel_bundles.sql`
- Create: `server/src/trust-kernel/trust/buildTrustBundle.ts`
- Create: `server/src/trust-kernel/trust/buildReleaseStatusBundle.ts`
- Create: `server/src/trust-kernel/trust/issueSignedBundle.ts`
- Create: `test-vectors/factory-packet-v3/valid-minimal/trust-bundle.json`
- Create: `test-vectors/factory-packet-v3/valid-minimal/release-status-bundle.json`
- Create: `test-vectors/factory-packet-v3/valid-minimal/policy.json`
- Create: `test-vectors/factory-packet-v3/valid-minimal/checkpoint.json`
- Test: `server/src/trust-kernel/test/trustBundles.test.ts`

**Interfaces:**

- Produces signed `TrustBundleV1` and `ReleaseStatusBundleV1` with independent `(bundleType,trustScope)` sequences.
- Key revocation modes: `ALL_SIGNATURES`, `SIGNED_AT_OR_AFTER`, `ISSUANCE_DISABLED`.

- [ ] **Step 1: Write RED bundle tests**

```ts
expect(buildReleaseStatusBundle(rowsWithVoidAttempt)).not.toContain("VOID");
expect(buildReleaseStatusBundle(rowsWithRevokedRevision).revokedReleaseRevisionIds).toEqual([revokedId]);
expect(buildTrustBundle(keyRevocation({ mode: "SIGNED_AT_OR_AFTER" })).keyRevocations[0]).toMatchObject({
  mode: "SIGNED_AT_OR_AFTER", effectiveAt, reason: "COMPROMISE",
});
```

Add sequence monotonicity, scope mismatch, expired attestation/grant revocation, wrong signer-purpose, and packet/bundle self-authorized trust-root rejection tests.

- [ ] **Step 2: Run RED**

Expected: missing bundle builders and DB tables.

- [ ] **Step 3: Implement bundle authority**

DB tables store trusted public keys with purpose/validity, key revocations, profile-attestation revocations, warning-grant revocations, release revocations, per-scope bundle sequence, issued/expiry, canonical hash, and signature. The public key that authenticates a `TrustBundleV1` is pinned in verifier policy and cannot be introduced or authorized by that same bundle. Bundle issuance runs in a transaction that increments sequence and snapshots all effective entries.

- [ ] **Step 4: Sign with purpose-bound managed keys**

`issueSignedBundle` canonicalizes unsigned bundle, hashes it, calls `ManagedSignerPort` with the configured trust-bundle key, and persists exact bytes/signature. Existing sequences are immutable; retry returns the persisted bundle.

Export the valid-minimal trust/status bundles, pinned-root policy, and bootstrap checkpoint into the shared corpus. The corpus policy pins the trust-bundle public key outside the bundle, identifies the permitted `trustScope`, and carries explicit freshness and archive limits. Regeneration is opt-in and the test must byte-compare regenerated JSON against the committed vectors.

- [ ] **Step 5: Run GREEN and commit**

Run server tests, bundle pgTAP, and server build. Expected: `VOID` never enters release status, monotonic sequence survives concurrent issuers, and purpose/scope/expiry failures deny.

```bash
git add supabase/migrations/0165_trust_kernel_bundles_publication.sql supabase/tests/trust_kernel_bundles.sql server/src/trust-kernel/trust server/src/trust-kernel/test/trustBundles.test.ts
git commit -m "feat(trust-kernel): issue signed trust status bundles"
```

---

### Task 10: Standalone independent offline verifier

**Files:**

- Create: `tools/factory-packet-verifier/package.json`
- Create: `tools/factory-packet-verifier/tsconfig.json`
- Create: `tools/factory-packet-verifier/vitest.config.ts`
- Create: `tools/factory-packet-verifier/src/types.ts`
- Create: `tools/factory-packet-verifier/src/canonical.ts`
- Create: `tools/factory-packet-verifier/src/packetReader.ts`
- Create: `tools/factory-packet-verifier/src/freshnessStore.ts`
- Create: `tools/factory-packet-verifier/src/verify.ts`
- Create: `tools/factory-packet-verifier/src/cli.ts`
- Create: `tools/factory-packet-verifier/src/verify.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- CLI: `factory-packet-verify --packet <zip> --trust <json> --status <json> --policy <json> --state <json> --report <json>`.
- Produces `VerificationReportV1` with verdict, codes, hashes, sequences, verifier build hash, `validAsOf`, freshness age, checkpoint, and summary.

- [ ] **Step 1: Write RED corpus tests**

```ts
expect(await verifyFixture("valid-minimal", stateWithCheckpoint())).toMatchObject({ verdict: "PASS" });
expect(await verifyMutation("unknown-extra-file")).toMatchObject({ verdict: "FAIL", codes: ["PACKET_EXTRA_FILE"] });
expect(await verifyWithState(noCheckpoint())).toMatchObject({ verdict: "FAIL", codes: ["TRUST_CHECKPOINT_REQUIRED"] });
expect(await verifyWithBundle(sequence(9), stateAtSequence(10))).toMatchObject({ verdict: "FAIL", codes: ["TRUST_SEQUENCE_ROLLBACK"] });
```

Mutation corpus includes path traversal, duplicate path, corrupt hash, signature mutation, wrong key purpose, scope mismatch, expired bundle, stale-but-unexpired bundle, revoked release/profile/grant, zip bomb ratio, oversize file, and untrusted clock.

- [ ] **Step 2: Create isolated workspace and run RED**

`tools/factory-packet-verifier/package.json` declares only `@noble/ed25519`, `yauzl`, TypeScript, Vitest, and Node types. It does not depend on the root app or server package.

```json
{
  "name": "@monolith/factory-packet-verifier",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "bin": { "factory-packet-verify": "dist/cli.js" },
  "scripts": { "test": "vitest", "build": "tsc -p tsconfig.json" },
  "dependencies": { "@noble/ed25519": "^3.0.0", "yauzl": "^3.3.0" },
  "devDependencies": { "@types/node": "^20.10.0", "@types/yauzl": "^2.10.3", "typescript": "^5.3.2", "vitest": "^3.0.0" }
}
```

`tools/factory-packet-verifier/tsconfig.json` is exact and keeps emitted CLI paths stable:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

Run: `npm.cmd install`

Run: `npm.cmd test -w tools/factory-packet-verifier -- --run`

Expected: FAIL because verifier modules are absent.

- [ ] **Step 3: Implement independent parsing and canonicalization**

Implement canonical JSON again in this workspace from the protocol text as a separately authored implementation. `packetReader` requires safe unique paths and the exact allowlisted file set, then rejects declared/actual size mismatch, compression ratio above policy, and total size above policy before deep parsing.

- [ ] **Step 4: Implement signature, revocation, and freshness state**

```ts
export type VerifierStateV1 = Readonly<{
  bootstrapCheckpoint: Readonly<Record<string, number>>;
  highWaterMarks: Readonly<Record<string, number>>;
}>;
```

State keys are `${bundleType}:${trustScope}`. Verification requires a pinned minimum sequence on first use, rejects rollback, applies `maxOfflineStalenessSeconds`, uses explicit key-revocation mode, updates high-water marks only after full PASS, and reports `validAsOf`. CLI writes state atomically through temp-file plus rename.

- [ ] **Step 5: Prove dependency independence**

Add a test/script that walks verifier imports and fails if any resolved path enters `server/src`, `src/factory/packet`, or `src/core/manufacturing`.

Run verifier tests and `npm.cmd run build -w tools/factory-packet-verifier`. Expected: exit 0; valid corpus passes and every mutation fails with its specified code.

- [ ] **Step 6: Commit**

```bash
git add tools/factory-packet-verifier package.json package-lock.json test-vectors/factory-packet-v3
git commit -m "feat(trust-kernel): add independent packet verifier"
```

---

### Task 11: P2 quarantine, client projection, and legacy-route containment

**Files:**

- Create: `src/core/api/trustKernelApi.ts`
- Create: `src/factory/packet/trustKernelProjection.ts`
- Create: `scripts/trust-kernel/verify-route-ledger.mjs`
- Create: `docs/governance/trust-kernel-route-disposition.json`
- Create: `supabase/migrations/0166_trust_kernel_legacy_containment.sql`
- Create: `supabase/tests/trust_kernel_containment.sql`
- Create: `server/src/trust-kernel/artifacts/isolatedVerifierRunner.ts`
- Modify: `src/core/api/stateApi.ts`
- Modify: `src/factory/packet/useFactoryPacket.ts`
- Modify: `src/components/ui/ExportPanel.tsx`
- Modify: `src/export/cutList/download.ts`
- Modify: `src/core/export/downloadArtifacts.ts`
- Modify: `supabase/functions/factory-api/index.ts`
- Test: `src/factory/packet/__tests__/trustKernelContainment.test.ts`
- Test: `supabase/functions/factory-api/index.test.ts`

**Interfaces:**

- Client sees server projections only: candidate, attempt, release, artifact status, report/evidence references.
- Route ledger dispositions: `REUSE`, `ADAPT`, `READ_ONLY`, `BLOCK` with owner, class, current behavior, target, and negative-test ID.

- [ ] **Step 1: Write RED containment tests**

```ts
expect(await requestLegacyManufacturingDownload("FROZEN")).toMatchObject({ ok: false, code: "STATE_CANDIDATE_STALE" });
expect(await requestShadowP2AsHuman(activeRelease)).toMatchObject({ ok: false, code: "STORE_PLAINTEXT_ACCESS_DENIED" });
expect(await requestShadowP2AsIsolatedRunner(activeRelease)).toMatchObject({ ok: true, value: { mode: "WORKLOAD_STREAM" } });
expect(routeLedgerCoverage(reachableSurfaces)).toEqual({ missing: [], duplicateAuthority: [] });
```

- [ ] **Step 2: Run RED**

Run the targeted root Vitest and Edge test. Expected: current browser download/signed-URL routes violate assertions.

- [ ] **Step 3: Replace client authority with V3 projections**

`trustKernelApi.ts` sends bearer-authorized candidate/release intents and never sends actor role/name. UI hooks render state/reason codes only. DRAFT/FROZEN keep P0 preview and eligible P1 review; P2 build/download buttons are removed or disabled with `NOT_FOR_PRODUCTION` explanation.

- [ ] **Step 4: Enforce P2 publication policy**

Migration 0166 revokes authenticated execution on legacy packet mutation/signing RPCs, adds tenant-bound storage policies, and permits P2 reads only through the isolated workload role. Edge returns no raw locator or reusable signed URL for P2. `isolatedVerifierRunner.ts` authenticates with that workload identity, streams exact bytes into the verifier child process without importing verifier code, emits report/hash/evidence, and removes transient local bytes. Revocation/status is rechecked at request start.

- [ ] **Step 5: Complete and enforce route ledger**

Inventory every reachable build/export/download plus profile/tool/policy/JWT/storage-signing authority input. `verify-route-ledger.mjs` scans declared source globs and exits non-zero when discovered and ledgered route sets differ, mutable authority is duplicated, or P2 human URLs, client role headers, or V1/V2 production-shaped output are reachable.

- [ ] **Step 6: Run GREEN and commit**

Run targeted containment tests, `trust_kernel_containment.sql`, the route-ledger verifier, root typecheck, and Edge suite. Expected: all reachable legacy surfaces have a disposition and negative test; P2 human plaintext remains impossible.

```bash
git add src server/src/trust-kernel/artifacts/isolatedVerifierRunner.ts supabase/functions/factory-api supabase/migrations/0166_trust_kernel_legacy_containment.sql supabase/tests/trust_kernel_containment.sql scripts/trust-kernel docs/governance/trust-kernel-route-disposition.json
git commit -m "feat(trust-kernel): contain shadow artifacts and legacy routes"
```

---

### Task 12: E2E chaos, signed evidence, CI, and executive acceptance gate

**Files:**

- Create: `e2e/trust-kernel/release-shadow.spec.ts`
- Create: `e2e/trust-kernel/revocation-race.spec.ts`
- Create: `server/src/trust-kernel/evidence/buildEvidenceManifest.ts`
- Create: `server/src/trust-kernel/evidence/issueEvidenceAttestation.ts`
- Create: `server/src/trust-kernel/test/evidenceAttestation.test.ts`
- Create: `server/src/trust-kernel/observability/securityEvents.ts`
- Create: `server/src/trust-kernel/observability/metrics.ts`
- Create: `server/src/trust-kernel/test/observability.test.ts`
- Create: `docs/governance/trust-kernel-ownership.json`
- Create: `.github/workflows/trust-kernel-verify.yml`
- Create: `docs/runbooks/trust-kernel-shadow.en.md`
- Create: `docs/runbooks/trust-kernel-shadow.th.md`
- Create: `docs/runbooks/trust-kernel-shadow.en.html`
- Create: `docs/runbooks/trust-kernel-shadow.th.html`
- Modify: `package.json`

**Interfaces:**

- Produces signed `EvidenceAttestationV1` and `evidence-manifest.json` tied to both Git roots, commands, reports, binaries, run identity, retention, and root hash.
- Produces one CI gate whose final machine-readable summary records pass/fail/skip counts for every layer.
- Produces append-only exportable `SecurityEventV1`, the approved trust/release metrics and alerts, and a machine-readable accountable-owner map.

- [ ] **Step 1: Write RED E2E and evidence tests**

```ts
test("two distinct humans release while P2 remains unavailable to humans", async ({ page, request }) => {
  await freezeAs(designerA, candidate);
  await approveAndReleaseAs(approverB, candidate);
  await expectReleaseState(request, "ACTIVE", "AVAILABLE");
  await expectHumanP2Request(request).resolves.toMatchObject({ status: 403, code: "STORE_PLAINTEXT_ACCESS_DENIED" });
});
```

Add membership revocation mid-flow, two approver race, DB response loss, crash before materialization, revoke/download race, offline replay, tenant hash guessing, first-use verifier without checkpoint, and tenant-002 isolation.

- [ ] **Step 2: Implement evidence manifest and managed evidence signing**

```ts
export type EvidenceAttestationV1 = Readonly<{
  schema: "EvidenceAttestationV1";
  parentGit: GitState;
  productGit: GitState;
  commandReportDigests: readonly DigestRef[];
  ciRunId: string;
  workflowIdentity: string;
  builderBinaryHash: string;
  verifierBinaryHash: string;
  evidenceRootHash: string;
  issuedAt: string;
  retentionDays: number;
  keyId: string;
  signatureBase64: string;
}>;
```

`issueEvidenceAttestation` uses a managed signer configured by `EVIDENCE_SIGNER_URL` and `EVIDENCE_SIGNER_KEY_ID` with purpose `EVIDENCE`. CI fails closed when signer configuration or signature verification is unavailable; it never stores a private key.

- [ ] **Step 3: Implement observability and ownership enforcement**

`SecurityEventV1` requires tenant scope, event ID, actor user ID, membership version, candidate/release revision, artifact hash, reason code, correlation ID, and authority timestamp. The recorder appends immutable rows and exports canonical JSONL; a display name is supplementary and cannot satisfy an identity field. Metrics and alert rules cover authentication denials, SoD violations, stale candidates, capability blockers, signer/store failures, VOID artifacts, verifier failures, stale trust bundles, revoked-release access, and blocked-legacy-route attempts.

`trust-kernel-ownership.json` maps Identity/tenancy/RLS/signer custody/trust bundles to Security/IAM; lifecycle/SoD/exceptions/revocation to Release Governance; operation/profile/range semantics to Manufacturing Engineering; deterministic builder/storage/outbox/workers to Platform Engineering; and verifier/hostile corpus/evidence bundle to Independent QA/Safety. Tests reject an unowned domain and any protocol/invariant change record that lacks a versioned decision plus migration reference.

- [ ] **Step 4: Build complete-output CI**

Workflow matrix runs Windows and Ubuntu deterministic/server/verifier tests, then Edge, local Supabase pgTAP, root typecheck/build, route ledger, Playwright shadow E2E, hostile corpus, and evidence self-verification. Every noisy command writes JSON/TAP output; the final job reads complete files and rejects failures, cancellations, skips, missing reports, empty suites, or hash mismatch.

- [ ] **Step 5: Create bilingual standalone runbooks**

Runbooks define local prerequisites, exact commands, environment variables by key ID/endpoint only, how to provision tenant fixtures, how to inspect reason codes, how to revoke, how to refresh verifier checkpoints, evidence retention, and explicit `NOT_FOR_PRODUCTION`/P3-disabled status. Render HTML with the repository renderer and verify content alignment.

- [ ] **Step 6: Run the complete local acceptance sequence**

Run, in order:

```text
npm.cmd --prefix server test -- --run src/trust-kernel
npm.cmd --prefix server run build
npm.cmd test -w tools/factory-packet-verifier -- --run
npm.cmd run build -w tools/factory-packet-verifier
npx vitest run supabase/functions/factory-api/index.test.ts
npm.cmd run test:run -- src/factory/packet/__tests__/trustKernelContainment.test.ts
node scripts/trust-kernel/verify-route-ledger.mjs
npm.cmd run typecheck:all
npm.cmd run build
npm.cmd run e2e -- e2e/trust-kernel
```

Then run all five Trust Kernel pgTAP suites against a freshly started Supabase instance. Expected: every command exits 0, every suite has non-zero assertions, skips are zero, P2 human access is denied, valid vectors pass, and every hostile vector rejects with its assigned code.

- [ ] **Step 7: Run independent review gates**

Use `superpowers:requesting-code-review`, then `scrutinize` the entire entry → action context → DB authority → worker → artifact → bundle → verifier → evidence path. Resolve every blocker/major finding and rerun Step 6 from a clean process state.

- [ ] **Step 8: Commit final integration**

```bash
git add e2e/trust-kernel server/src/trust-kernel/evidence server/src/trust-kernel/observability server/src/trust-kernel/test/observability.test.ts .github/workflows/trust-kernel-verify.yml docs/runbooks docs/governance/trust-kernel-ownership.json package.json
git commit -m "test(trust-kernel): prove shadow trust-ready acceptance"
```

## Final MONOLITH Completion Gate

Before claiming Shadow Trust-Ready:

- [ ] Both Git roots and dirty-file lists are captured in evidence.
- [ ] Tasks 1–12 each have their targeted RED/GREEN proof and commit.
- [ ] Critical and negative trust gates pass 100%; skipped trust/security tests equal zero.
- [ ] Route ledger covers 100% of reachable production-shaped and authority-input surfaces.
- [ ] Windows and Ubuntu golden packet hashes are byte-identical.
- [ ] Independent verifier accepts valid corpus and rejects every mutation with the specified stable code.
- [ ] Two authenticated users complete freeze and release; SoD, membership revocation, replay, and cross-tenant attacks reject.
- [ ] Profile attestation and warning grants enforce scope, key purpose, expiry, revocation, and distinct approvers.
- [ ] Offline verifier rejects missing checkpoint, rollback, stale bundle, untrusted clock, and revoked records.
- [ ] P2 plaintext/raw URL is denied to humans and Factory/P3 remains disabled.
- [ ] Evidence attestation verifies under a separate `EVIDENCE` key and binds exact source, reports, and binaries.
- [ ] Append-only security-event export, required metrics/alerts, and accountable-owner mapping pass their contract tests.
- [ ] Runbook TH/EN Markdown and HTML editions are aligned and explicitly state `NOT_FOR_PRODUCTION`.
- [ ] Production/GA remains NO-GO pending production key ceremony, AAL2 policy, operations drills, authorized factory pilot, machine acceptance, and separate P3 authorization.

## Execution Handoff

Recommended: execute with `superpowers:subagent-driven-development` in a fresh isolated worktree. Use one fresh subagent per task, specification review followed by code-quality review, and do not parallelize migrations or tasks sharing `factory-api`, `server/src/trust-kernel`, `package-lock.json`, or route-ledger files.

Alternative: execute in this session with `superpowers:executing-plans`, one phase gate at a time with checkpoints after Tasks 4, 9, and 12.
