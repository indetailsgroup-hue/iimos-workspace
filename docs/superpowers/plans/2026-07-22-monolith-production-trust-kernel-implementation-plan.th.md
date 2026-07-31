# แผนดำเนินงาน MONOLITH Production Trust Kernel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**เป้าหมาย:** สร้าง Production Trust Kernel ระดับ Shadow Trust-Ready เพื่อให้ artifact ที่มีรูปร่างพร้อมผลิตทุกชิ้นผูกกับ tenant, deterministic, อนุมัติโดยบุคคลสองคน, ผ่าน capability safety, ตรวจจากภายนอกได้, revoke ได้ และถูกป้องกันทางเทคนิคไม่ให้ถึง Factory หรือมนุษย์ในรูป P2 plaintext

**สถาปัตยกรรม:** Supabase/Postgres เป็น release authority เพียงแห่งเดียว RPC ที่ใช้ user-scoped action context อนุญาต immutable release records; Node worker compile capability, สร้าง FactoryPacket V3 bytes แบบ deterministic, เรียก managed signers และ materialize private artifacts ส่วน workspace `tools/factory-packet-verifier` แยก implementation อิสระ ไม่ import builder code และใช้เพียง protocol vectors กับ external bundles

**Tech Stack:** PostgreSQL/Supabase migrations และ pgTAP, Supabase Edge Functions, TypeScript 5.x, Node.js 20/22, Vitest, fast-check, `yazl` สำหรับ builder packaging, `yauzl` กับ `@noble/ed25519` สำหรับ independent verifier, Playwright และ GitHub Actions

**ขอบเขตแผน:** 12 งานที่ review แยกได้แต่เป็น authority chain เดียว การแยกเป็นหลายแผนอิสระจะเพิ่มโอกาสให้ identity, release, artifact และ verifier contracts drift จึงใช้ phase gates ด้านล่างเป็นขอบเขต review แทน

## ข้อจำกัดส่วนกลาง

- Implementation paths ทั้งหมดด้านล่างอ้างอิงจาก nested product Git root `determined-williams/`; แผนนี้อยู่ใน parent governance root
- ก่อน implementation ให้อ่าน `CONTEXT.md` และ repository-scope correction วันที่ 21 กรกฎาคม 2026 และรายงาน Git status ของทั้งสอง roots ทุก checkpoint
- รักษา modified files เดิมใน nested root ได้แก่ `daph-second-brain/_inventory.json`, `_knowledge-export.json` และ `_move-log.md`
- Phase ยังคงเป็น `NOT_FOR_PRODUCTION`; P3 distribution และการส่งจริงไป Factory/machine ยังปิด
- Daph เป็น fixture/onboarding data ของ tenant 001 ไม่ใช่ runtime constant และทุก coexistence suite ต้อง provision tenant 002 ด้วย
- Postgres สร้าง `VerifiedActionContextV1` ภายใต้ user bearer token Service role สร้าง human authority ไม่ได้ และรับ role, name, tenant, site หรือ object path จาก client ไม่ได้
- Freeze actor และ release approver ต้องเป็น authenticated users คนละคน Admin release ได้เมื่อมี `RELEASE_APPROVER` membership role แยกเท่านั้น
- Hard gate และ capability blocker ปฏิเสธเสมอ เฉพาะ warning ใน catalogue ที่ `exceptionEligible=true` จึงใช้ signed, expiring, two-person `WarningExceptionGrantV1` ได้
- Builder เป็น all-or-nothing Unknown tool, unsupported operation, range failure, invalid profile attestation หรือ stale trust state ต้องคืน stable reason code และ publishable output เป็นศูนย์
- Application เก็บเพียง signer key IDs ส่วน release, profile, warning-exception และ evidence private keys อยู่หลัง managed signer ports
- Independent verifier ห้าม import module จาก `server/src/trust-kernel`, `src/factory/packet` หรือ `src/core/manufacturing`; สิ่งที่ใช้ร่วมกันมีเพียง JSON schemas และ golden bytes
- Shadow P2 plaintext อ่านได้เฉพาะ isolated workload identity มนุษย์ได้รับ hash, report และ evidence; raw storage locator และ reusable signed URL ถูกห้าม
- RELEASE ห้าม offline queue และ auto-replay Offline verification รายงาน `validAsOf` และกล่าวว่า current active ได้เมื่อมี online-current authority เท่านั้น
- No dual write: V3 Postgres records เป็น mutable release authority เพียงแห่งเดียว ส่วน V1/V2 surfaces ต้องเป็น read-only projections หรือถูก deny/remove ตาม route disposition ledger
- Project-facing Markdown ใหม่ต้องมี `.en.md`, `.th.md`, `.en.html` และ `.th.html` ที่เนื้อหาตรงกัน
- ทุก task ที่แก้ production code ใช้ `superpowers:test-driven-development`: RED, GREEN, refactor, targeted verification และ commit

## Phase Gates

| Gate | Tasks | Exit criterion |
|---|---|---|
| A — Authority Foundation | 1–4 | Versioned contracts, tenant membership, action contexts, governance records และ release state machines ผ่าน unit/pgTAP negative suites |
| B — Deterministic Release | 5–9 | User-authorized release สร้าง V3 bytes ที่ byte-identical ผ่าน managed signing และ private artifact materialization พร้อมออก revocation bundles |
| C — Independent Proof | 10–12 | Independent verifier, P2 containment, legacy-route denial, hostile/E2E/chaos suites และ signed evidence ผ่านทั้งหมด |

## Crosswalk ความครอบคลุม Written Spec

| หมวด Written Spec ที่อนุมัติ | ความครอบคลุมใน implementation |
|---|---|
| §§1–5 — executive decision, repository/evidence scope, locked decisions, architecture, authority rule และ no dual write | ข้อจำกัดส่วนกลาง; Tasks 2, 4, 5 และ 11 |
| §6 — `TenantScopeV1`, `WorkingRevision`, `ReleaseCandidate`, `ReleaseAttempt`, `ArtifactRecordV1`, `ReleaseRevision` และ concurrent history | Tasks 1, 4, 7, 8 และ 9 |
| §7 — actor resolution, verified action context, role boundaries, four-eyes invariant และ tenant isolation | Tasks 2–5 และ negative suites ใน Task 12 |
| §§8–9 — component contracts และ P0/P1/P2/P3 artifact matrix | Tasks 1, 3, 5–11 |
| §10 — freeze/release/failure/revoke/fork/offline transaction choreography | Tasks 4, 5, 8, 9 และ 12 |
| §11 — canonical determinism, signing profile, trust และ release-status bundles | Tasks 1 และ 7–10 |
| §§12–13 — capability safety และ stable error model | Tasks 1, 3, 6 และ 7 |
| §14 — standalone independent offline verifier | Task 10 พร้อม hostile/E2E proof ใน Task 12 |
| §15 — canonicalization-first legacy migration, route disposition ledger และ no parallel authority | Task 11 |
| §16 — unit/property/pgTAP/Edge/E2E/chaos layers, golden corpus, transaction chaos และ evidence bundle | RED/GREEN steps ใน Tasks 1–11 และ complete-output Task 12 |
| §§17–21 — Shadow Trust-Ready gate, Production/GA NO-GO, observability, governance, ownership, risks/controls และ definition of done | Task 12 และ Final MONOLITH Completion Gate |

## แผนผังไฟล์และความรับผิดชอบ

| Area | Files | Responsibility |
|---|---|---|
| Server protocol | `server/src/trust-kernel/contracts/*`, `canonical/*`, `reasonCodes.ts`, `result.ts` | Builder-side versioned types, canonical hashing และ stable error vocabulary |
| Database authority | `supabase/migrations/0162_*` ถึง `0166_*` | Tenant membership, action contexts, governance, release/artifact/outbox states, RLS และ RPCs |
| Edge boundary | `supabase/functions/factory-api/trustKernel.ts`, `index.ts`, `index.test.ts` | User-token action context creation และ V3 transport โดยไม่รับ client authority fields |
| Capability และ builder | `server/src/trust-kernel/capability/*`, `snapshot/*`, `packet/*` | Profile adaptation, exhaustive compilation และ deterministic unsigned/final packet bytes |
| Signing และ worker | `server/src/trust-kernel/signing/*`, `worker/*`, `artifacts/*` | Managed signing, release choreography และ content-addressed private materialization |
| Trust bundles | `server/src/trust-kernel/trust/*` | Signed trust/release-status snapshots, key purpose และ revocation semantics |
| Independent verifier | `tools/factory-packet-verifier/*` | Parser, canonicalizer, signature/freshness/revocation verifier และ CLI ที่แยก implementation |
| Protocol evidence | `test-vectors/factory-packet-v3/*`, `supabase/tests/trust_kernel_*.sql`, `e2e/trust-kernel/*` | Shared bytes, DB invariants, hostile vectors, cross-implementation และ E2E proof |
| Containment | `src/core/api/trustKernelApi.ts`, legacy export surfaces, route ledger | V3 projection และ denial/read-only disposition ของ authority paths เดิมทุกเส้น |
| CI evidence | `.github/workflows/trust-kernel-verify.yml`, `server/src/trust-kernel/evidence/*` | Complete-output reports และ managed evidence attestation |

## ภาพรวม Tasks

1. **Protocol contracts และ canonical hashing** — ไม่มี dependency
2. **Tenant membership และ verified action contexts** — รอ Task 1 reason codes
3. **Machine-profile และ warning-exception governance** — รอ Tasks 1–2
4. **Release, artifact, ledger และ outbox authority** — รอ Tasks 1–3
5. **User-token Edge transport และ service-role containment** — รอ Tasks 2 และ 4
6. **Profile adapters และ exhaustive capability compiler** — รอ Tasks 1 และ 3
7. **Deterministic snapshot และ FactoryPacket V3 builder** — รอ Tasks 1 และ 6
8. **Managed signer, release worker และ artifact materialization** — รอ Tasks 4 และ 7
9. **Trust และ release-status bundle issuance** — รอ Tasks 3, 4 และ 8
10. **Standalone independent offline verifier** — รอ Tasks 1, 7 และ 9 ผ่าน schemas/vectors เท่านั้น
11. **P2 quarantine, client projection และ legacy-route containment** — รอ Tasks 5, 8 และ 10
12. **E2E chaos, signed evidence, CI และ executive acceptance gate** — รอทุก task ก่อนหน้า

---

### Task 1: Protocol contracts และ canonical hashing

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

- Produces: `canonicalJson(value: JsonValue): string`, `sha256Hex(value: Uint8Array | string): string`, `computeReleaseAuthorizationHash(candidateHash, sortedGrantHashes): string`
- Produces: `TrustResult<T>`, stable `TrustReasonCode` และ approved protocol types ได้แก่ `ActorContextV1`, `VerifiedActionContextV1`, `TenantScopeV1`, `WorkingRevision`, `ReleaseCandidate`, `ReleaseAttempt`, `ReleaseSnapshotV3`, `MachineCapabilityProfileV1`, `MachineProfileAttestationV1`, `WarningExceptionGrantV1`, `CapabilityReportV1`, `FactoryPacketManifestV3`, `ReleaseCertificateV1`, `ArtifactRecordV1`, `ReleaseRevision`, `TrustBundleV1`, `ReleaseStatusBundleV1`, `VerificationReportV1` และ `EvidenceAttestationV1`

- [ ] **Step 1: เขียน RED contract และ property tests**

```ts
expect(canonicalJson({ b: 1, a: "x" })).toBe('{"a":"x","b":1}');
expect(() => canonicalJson({ n: Number.NaN })).toThrow("NON_CANONICAL_NUMBER");
expect(computeReleaseAuthorizationHash("ab".repeat(32), [])).toBe(
  sha256Hex('{"candidateHash":"' + "ab".repeat(32) + '","domain":"MONOLITH/ReleaseAuthorization/V1","sortedGrantHashes":[]}'),
);
expect(RELEASE_ATTEMPT_STATUSES).toEqual(["PENDING", "FAILED", "PUBLISHED", "VOID"]);
expect(RELEASE_REVISION_STATUSES).toEqual(["ACTIVE", "REVOKED"]);
```

- [ ] **Step 2: รัน RED**

Run: `npm.cmd --prefix server test -- --run src/trust-kernel/test/protocolV3.test.ts src/trust-kernel/test/canonicalJson.property.test.ts`

Expected: FAIL เพราะ modules ยังไม่ถูกสร้าง และห้ามตีความ zero tests ว่าสำเร็จ

- [ ] **Step 3: สร้าง canonical และ result contracts ขั้นต่ำ**

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

`canonicalJson` sort object keys แบบ recursive, รักษาลำดับ array, รับ null/boolean/string/safe finite number, แปลง `-0` เป็น `0` และ reject undefined, non-finite number, bigint, function, symbol, sparse array และ cyclic input ส่วน `protocolV3.schema.json` ใช้ `additionalProperties:false` ทุก signed boundary

- [ ] **Step 4: รัน GREEN และ server build**

Run targeted test เดิม แล้วรัน `npm.cmd --prefix server run build`

Expected: ทั้งสอง exit 0 และ property suite ครอบ key-order permutations, Unicode, `-0`, unsafe numbers และ cyclic rejection

- [ ] **Step 5: Commit**

```bash
git add server/src/trust-kernel
git commit -m "feat(trust-kernel): define protocol v3 contracts"
```

---

### Task 2: Tenant membership และ verified action contexts

**Files:**

- Create: `supabase/migrations/0162_trust_kernel_tenancy_action_context.sql`
- Create: `supabase/tests/trust_kernel_tenancy.sql`
- Modify: `.github/workflows/db-verify.yml`

**Interfaces:**

- Produces tables: `monolith_tenant`, `monolith_site`, `monolith_membership`, `monolith_membership_role`, `monolith_membership_site`, `verified_action_context`
- Produces RPC: `create_verified_action_context(action, tenant_id, site_id, resource_type, resource_id, request_hash, candidate_hash default null, release_authorization_hash default null) returns uuid`
- Produces internal function: `consume_verified_action_context(context_id, expected_action) returns verified_action_context`

- [ ] **Step 1: เขียน RED pgTAP assertions**

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

Suite สร้างสอง tenants/sites ภายใน transaction เดียว สร้าง authenticated users/memberships, จำลอง user JWT ผ่าน `request.jwt.claim.sub` และ rollback

- [ ] **Step 2: รัน RED บน local Supabase**

Run: `supabase start`

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tA -v ON_ERROR_STOP=1 -f supabase/tests/trust_kernel_tenancy.sql`

Expected: FAIL เพราะ `monolith_tenant` และ RPCs ยังไม่อยู่

- [ ] **Step 3: สร้าง tenant-bound schema และ RLS**

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

Role/site join tables ใช้ `(tenant_id,membership_id)` composite foreign keys ทั้งหก tables เปิด RLS และ deny direct writes Context bind resource type/ID กับ request hash `FREEZE` ต้องใช้ working-revision resource และ candidate hashes เป็น null; `RELEASE` ต้องมี candidate/release-authorization hashes; `REVOKE` ต้องใช้ release-revision resource `create_verified_action_context` ต้องมี `auth.role()='authenticated'`, derive `auth.uid()`, อ่าน current membership/AAL, ตั้ง `expires_at=clock_timestamp()+interval '5 minutes'` และไม่รับ actor/role/name ส่วน `consume_verified_action_context` lock row, เทียบ action/resource/expiry/membership version, ตั้ง `consumed_at` และคืน stable auth errors

- [ ] **Step 4: ขยาย DB CI โดยไม่ลดความเข้ม suite เดิม**

แก้ `db-verify.yml` ให้รัน SQL สองไฟล์แยกเป็น `workflow-db.tap` และ `trust-kernel-tenancy.tap`, reject `not ok`, reject empty suite และใส่ per-suite counts ใน `db-verify-evidence.json`

- [ ] **Step 5: รัน GREEN**

รัน pgTAP command ใหม่และ original `supabase/tests/workflow_db_invariants.sql` Expected: ทั้งคู่ exit 0 และมี `ok` อย่างน้อยหนึ่งบรรทัด Tenant 001 แบบ Daph กับ tenant 002 ยัง isolate กัน

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0162_trust_kernel_tenancy_action_context.sql supabase/tests/trust_kernel_tenancy.sql .github/workflows/db-verify.yml
git commit -m "feat(trust-kernel): add tenant action authority"
```

---

### Task 3: Machine-profile และ warning-exception governance

**Files:**

- Create: `supabase/migrations/0163_trust_kernel_profile_exception.sql`
- Create: `supabase/tests/trust_kernel_governance.sql`
- Create: `server/src/trust-kernel/contracts/profileGovernance.ts`
- Create: `server/src/trust-kernel/governance/verifyGovernanceSignature.ts`
- Test: `server/src/trust-kernel/test/profileGovernance.test.ts`

**Interfaces:**

- Produces `MachineProfileAttestationV1` และ `WarningExceptionGrantV1`
- Produces `verifyProfileAttestation(attestation, trust): TrustResult<MachineProfileAttestationV1>` และ `verifyWarningGrant(grant, candidateHash, trust): TrustResult<WarningExceptionGrantV1>`
- Produces DB functions `assert_profile_attestation_current` และ `assert_warning_grants_current` สำหรับ release transaction

- [ ] **Step 1: เขียน RED unit และ pgTAP tests**

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

- [ ] **Step 2: รัน RED**

Run server targeted test และ governance pgTAP Expected: ทั้งสองคืน non-zero พร้อม stable module-resolution และ SQLSTATE assertion codes

- [ ] **Step 3: สร้าง governance records แบบ exact**

`MachineProfileAttestationV1` มี `id`, tenant/site/machine IDs, canonical profile hash, tool-library hash, postprocessor ID/version/binary hash, profile approver user ID, key ID ที่มี purpose `PROFILE_ATTESTATION`, issued/valid-from/valid-until, sequence, status และ signature

`WarningExceptionGrantV1` มี `id`, tenant/site, candidate hash, warning code, sorted entity IDs, reason, policy version, approver user IDs สองคนที่ต่างกัน, issued/expires, key ID purpose `WARNING_EXCEPTION` และ signature Database constraints บังคับ distinct approvers และ `expires_at>issued_at`; catalogue table เป็นเจ้าของ `exception_eligible` และกำหนด `CAP_*` ทุก code เป็น false

- [ ] **Step 4: สร้าง managed-key-purpose verification**

```ts
export type KeyPurpose = "RELEASE" | "TRUST_BUNDLE" | "PROFILE_ATTESTATION" | "WARNING_EXCEPTION" | "EVIDENCE";
export function requireKeyPurpose(key: TrustedKeyV1, expected: KeyPurpose): TrustResult<TrustedKeyV1> {
  return key.purpose === expected
    ? { ok: true, value: key }
    : { ok: false, code: "CRYPTO_ALGORITHM_DENIED", detail: { expected, actual: key.purpose } };
}
```

Verification canonicalize unsigned record, ตรวจ Ed25519 ผ่าน injected public-key verifier, ตรวจ scope/time/sequence/revocation แล้วคืน record ส่วน database functions ตรวจ scope/time/status ซ้ำตอน release commit

- [ ] **Step 5: รัน GREEN และ commit**

รัน server tests, server build และ governance pgTAP Expected: expired, revoked, wrong-purpose, duplicate-approver, hard-blocker และ cross-tenant cases ถูก reject

```bash
git add supabase/migrations/0163_trust_kernel_profile_exception.sql supabase/tests/trust_kernel_governance.sql server/src/trust-kernel
git commit -m "feat(trust-kernel): govern profiles and warning exceptions"
```

---

### Task 4: Release, artifact, ledger และ outbox authority

**Files:**

- Create: `supabase/migrations/0164_trust_kernel_release_authority.sql`
- Create: `supabase/tests/trust_kernel_release.sql`
- Create: `server/src/trust-kernel/contracts/releasePorts.ts`
- Test: `server/src/trust-kernel/test/releaseStateModel.test.ts`

**Interfaces:**

- Produces tables: `release_working_revision`, `release_candidate`, `release_attempt`, `release_approval`, `release_revision`, `release_artifact`, `release_event`, `release_outbox`
- Produces RPCs: `rpc_trust_freeze`, `rpc_trust_begin_release`, `rpc_trust_commit_release`, `rpc_trust_mark_artifact_available`, `rpc_trust_void_artifact`, `rpc_trust_revoke`
- Produces `ReleaseAuthorityPort` สำหรับ Task 8

- [ ] **Step 1: เขียน RED state/concurrency/idempotency tests**

```sql
select throws_ok($$select public.rpc_trust_begin_release(:'freezer_context', :'candidate', :'auth_hash', 'idem-1', :'request')$$,
  'P0001', 'AUTH_SOD_VIOLATION', 'freezer cannot approve own release');
select is((public.rpc_trust_begin_release(:'approver_context', :'candidate', :'auth_hash', 'idem-1', :'request')).attempt_id,
          (public.rpc_trust_begin_release(:'retry_context', :'candidate', :'auth_hash', 'idem-1', :'request')).attempt_id,
          'same idempotency request returns same attempt');
select throws_ok($$select public.rpc_trust_begin_release(:'new_context', :'candidate', :'auth_hash', 'idem-1', repeat('f',64))$$,
  'P0001', 'STATE_IDEMPOTENCY_MISMATCH', 'same key with changed request rejects');
```

เพิ่ม assertions ว่า `VOID` ใช้ได้เฉพาะ attempt/artifact, release revision รับเฉพาะ `ACTIVE|REVOKED`, มี CAS winner เดียว และ `ACTIVE` revision consume ได้เมื่อ artifact `AVAILABLE` เท่านั้น

- [ ] **Step 2: รัน RED กับ local Supabase**

Expected: FAIL เพราะ release authority tables/RPCs ยังไม่อยู่

- [ ] **Step 3: สร้าง state tables และ constraints**

ทุก table มี `tenant_id`; child tables ใช้ composite tenant-bound foreign keys `release_attempt` มี unique `(tenant_id,actor_user_id,candidate_hash,idempotency_key)` และเก็บ request hash `release_revision` เก็บ candidate hash, release authorization hash, sorted grant hashes, certificate, expected packet hash, profile-attestation binding, sequence และ authority timestamps `release_artifact` เก็บ internal locator ภายใต้ `tenantId/siteId/releaseRevisionId/contentHash` เท่านั้น

- [ ] **Step 4: สร้าง transaction choreography**

`rpc_trust_begin_release` consume fresh action context, recheck SoD/current membership/profile/grants, lock candidate และ allocate attempt/revision ID, sequence, authority time ส่วน `rpc_trust_commit_release` เรียกได้เฉพาะ worker role, lock attempt, recheck current membership version/candidate CAS, เก็บ certificate พร้อม `ACTIVE` revision กับ `MATERIALIZING` artifact แล้ว append event/outbox แบบ atomic Failed commit ต้องจบก่อนสร้าง release revision Availability และ revocation เป็น append-only transitions

- [ ] **Step 5: รัน GREEN, race tests และ commit**

รัน release pgTAP ปกติและสอง concurrent `psql` sessions บน candidate เดียว Expected: success หนึ่ง, `STATE_CONFLICT` หนึ่ง และ active revision ไม่ซ้ำ

```bash
git add supabase/migrations/0164_trust_kernel_release_authority.sql supabase/tests/trust_kernel_release.sql server/src/trust-kernel/contracts/releasePorts.ts server/src/trust-kernel/test/releaseStateModel.test.ts
git commit -m "feat(trust-kernel): add canonical release authority"
```

---

### Task 5: User-token Edge transport และ service-role containment

**Files:**

- Create: `supabase/functions/factory-api/trustKernel.ts`
- Create: `supabase/functions/factory-api/index.test.ts`
- Modify: `supabase/functions/factory-api/index.ts`
- Modify: `.github/workflows/edge-fn-verify.yml`

**Interfaces:**

- Produces `handleTrustKernelRequest(req, deps): Promise<Response>`
- V3 endpoints: `POST /v3/factory/jobs/:id/freeze`, `/release`, `/revoke`; `GET /v3/factory/releases/:id/status`
- เรียก action-context creation ด้วย incoming bearer + anon key; service role จำกัดไว้สำหรับ outbox/storage worker calls

- [ ] **Step 1: เขียน RED transport tests**

```ts
expect((await handleTrustKernelRequest(post("/release", {}, {}), deps)).status).toBe(401);
expect((await handleTrustKernelRequest(post("/release", body, {
  authorization: userBearer, "x-actor-role": "ADMIN", "x-actor-name": "spoof",
}), deps)).status).toBe(202);
expect(deps.createActionContext).toHaveBeenCalledWith(expect.objectContaining({ bearer: userBearer }));
expect(deps.createActionContext).not.toHaveBeenCalledWith(expect.objectContaining({ bearer: serviceBearer }));
expect(JSON.stringify(deps.createActionContext.mock.calls)).not.toContain("spoof");
```

เพิ่ม invalid JSON, wrong method, candidate mismatch, offline replay header, expired context และ service-role spoof พร้อม stable HTTP/reason-code mapping

- [ ] **Step 2: รัน RED**

Run: `npx vitest run supabase/functions/factory-api/index.test.ts --reporter=verbose`

Expected: FAIL เพราะ injectable V3 handler ยังไม่อยู่

- [ ] **Step 3: แยก pure transport จาก environment adapters**

```ts
export type TrustKernelDeps = Readonly<{
  createActionContext(input: UserActionInput): Promise<TrustResult<{ contextId: string }>>;
  invokeAuthority(input: AuthorityRequest): Promise<TrustResult<AuthorityResponse>>;
}>;
```

`createActionContext` forward incoming Authorization header และ `SUPABASE_ANON_KEY` และ filter request body ให้เหลือ candidate/release-authorization/idempotency/request hashes Existing service-role helpers ต้องเข้าถึง function นี้ไม่ได้และ reject user-authority operation

- [ ] **Step 4: รัน GREEN และ Edge suite**

รัน targeted test แล้ว `npx vitest run supabase/functions --reporter=default --reporter=json --outputFile=edge-fn-report.json`

Expected: exit 0, `numPassedTests>0`, `numFailedTests=0`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/factory-api .github/workflows/edge-fn-verify.yml
git commit -m "feat(trust-kernel): enforce user-authorized edge actions"
```

---

### Task 6: Profile adapters และ exhaustive capability compiler

**Files:**

- Create: `server/src/trust-kernel/capability/canonicalProfile.ts`
- Create: `server/src/trust-kernel/capability/adaptLegacyProfile.ts`
- Create: `server/src/trust-kernel/capability/compileCapabilities.ts`
- Create: `server/src/trust-kernel/contracts/capability.ts`
- Modify: `server/src/post/machineProfiles.ts`
- Test: `server/src/trust-kernel/test/compileCapabilities.property.test.ts`
- Test: `server/src/trust-kernel/test/profileAdapter.test.ts`

**Interfaces:**

- Produces `adaptLegacyProfile(input): TrustResult<MachineCapabilityProfileV1>`
- Produces `compileCapabilities(snapshot, profile, attestation): TrustResult<CapabilityReportV1>`

- [ ] **Step 1: เขียน RED exhaustive failure tests**

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

Property tests generate operation permutations และยืนยันว่า `checkedOperationIds` เท่ากับ sorted set ของ operation IDs ทุกตัวเมื่อ PASS; ID ที่หายทำให้ test fail

- [ ] **Step 2: รัน RED**

Run: `npm.cmd --prefix server test -- --run src/trust-kernel/test/compileCapabilities.property.test.ts src/trust-kernel/test/profileAdapter.test.ts`

- [ ] **Step 3: สร้าง canonical profile schema เพียงหนึ่งชุด**

Canonical profile มี machine/dialect versions, operation catalogue, tool IDs/machine numbers, parameter ranges, faces, units, coordinate convention, postprocessor ID/version/binary hash Legacy server/client shapes เป็น read-only input ของ `adaptLegacyProfile`; local storage และ arbitrary overrides ตั้ง attestation status ไม่ได้

ตัด `unknown tool -> 1` ออกจาก V3 path Legacy `PostContext` อาจอ่านประวัติเดิมต่อ แต่ V3 invocation ต้องได้รับ `TrustResult` failure ก่อนเกิด dialect output

- [ ] **Step 4: รัน GREEN และ dialect defense tests**

เพิ่ม CIX/G-code tests ที่พิสูจน์ว่า dialect layer reject unknown tool/unsupported operation ซ้ำ แม้ forged upstream capability report ระบุ PASS

Expected: targeted tests และ server build exit 0 และไม่คืน partial file list เมื่อ fail

- [ ] **Step 5: Commit**

```bash
git add server/src/trust-kernel server/src/post/machineProfiles.ts
git commit -m "feat(trust-kernel): compile attested machine capabilities"
```

---

### Task 7: Deterministic snapshot และ FactoryPacket V3 builder

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

- Produces `buildReleaseSnapshot(input): TrustResult<ReleaseSnapshotV3>`
- Produces `buildUnsignedPayloadV3(snapshot, capabilityReport): TrustResult<UnsignedPacketV3>`
- Produces `packageFactoryPacketV3(unsigned, certificate): Promise<Uint8Array>`

- [ ] **Step 1: เขียน RED byte-determinism tests**

```ts
const runs = await Promise.all(Array.from({ length: 100 }, () => buildFixturePacket()));
expect(new Set(runs.map(sha256Hex)).size).toBe(1);
expect(runs.every(bytes => Buffer.from(bytes).equals(Buffer.from(runs[0])))).toBe(true);
expect(listZipPaths(runs[0])).toEqual([...listZipPaths(runs[0])].sort());
```

ทดสอบ snapshot permutation, Unicode, Windows/Linux path normalization, fixed decimals/units, extra-file rejection และ identical empty optional collections

- [ ] **Step 2: รัน RED**

Expected: missing builder modules

- [ ] **Step 3: สร้าง deterministic construction**

Snapshot ครอบ tenant scope, candidate/profile/policy hashes, sorted operation/entity references และ required artifact definitions Unsigned manifest ระบุทุก file path, byte length, SHA-256, media type, artifact class และ `NOT_FOR_PRODUCTION` marker

`fixedZipProfile.ts` บังคับ sorted POSIX paths, fixed timestamp `1980-01-01T00:00:00Z`, UTF-8 names, fixed compression level, fixed permissions และ exact file allowlist โดย output เป็น pure function ของ declared bytes/constants ซึ่งเป็นอิสระจาก runtime locale, clock และ randomness Final packet content คือ unsigned payload + persisted certificate เท่านั้น

- [ ] **Step 4: Materialize และ pin golden vectors**

Run ใน PowerShell: `$env:UPDATE_TRUST_VECTORS='1'; npm.cmd --prefix server test -- --run src/trust-kernel/test/packetV3.determinism.test.ts --update; Remove-Item Env:UPDATE_TRUST_VECTORS`

Update mode สร้าง expected bytes ได้เมื่อ `UPDATE_TRUST_VECTORS=1` เท่านั้น Normal tests เทียบ byte-for-byte และ reject silent vector update

- [ ] **Step 5: Cross-platform verification และ commit**

รัน targeted tests และ server build บน Windows; CI รันซ้ำ Ubuntu Expected: 100/100 byte-identical runs และ pinned SHA-256 หนึ่งค่า

```bash
git add server/src/trust-kernel test-vectors/factory-packet-v3
git commit -m "feat(trust-kernel): build deterministic factory packet v3"
```

---

### Task 8: Managed signer, release worker และ artifact materialization

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

- Produces `ManagedSignerPort.sign({ keyId, purpose, digest }): Promise<TrustResult<ManagedSignature>>`
- Produces `executeReleaseAttempt(attemptId, ports): Promise<TrustResult<ReleaseWorkerResult>>`
- Produces `materializeArtifact(outboxEvent, ports): Promise<TrustResult<ArtifactRecordV1>>`

- [ ] **Step 1: เขียน RED failure-injection tests**

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

ครอบ signer timeout, store failure, DB commit loss, crash after commit/before materialization, hash mismatch, outbox duplicate และ membership revoked ก่อน final commit

- [ ] **Step 2: รัน RED**

รัน chaos suite Expected: missing ports/worker

- [ ] **Step 3: สร้าง managed signer โดยไม่มี local private-key API**

```ts
export interface ManagedSignerPort {
  sign(input: Readonly<{ keyId: string; purpose: KeyPurpose; digestSha256: string }> ):
    Promise<TrustResult<Readonly<{ algorithm: "Ed25519"; keyId: string; signatureBase64: string }>>>;
}
```

`HttpManagedSignerClient` รับ endpoint, key ID, workload credential provider, timeout และ fetch dependency ตรวจ algorithm/key ID และไม่รับ private key bytes หรือ seed material

- [ ] **Step 4: สร้าง exact sign/commit/materialize order**

Worker อ่าน immutable attempt allocation, compile, สร้าง unsigned payload, ขอ signature, assemble final bytes ใน memory, คำนวณ expected hash แล้วจึง atomic commit หลัง commit outbox materializer สร้าง bytes เดิมจาก persisted payload/certificate, เก็บใต้ DB-provided internal locator, ตรวจ hash และ mark `AVAILABLE` Precommit failure จบที่ `FAILED`/`VOID`; postcommit retry ห้ามสร้าง certificate ใบที่สอง

- [ ] **Step 5: รัน GREEN, build และ commit**

Expected: chaos cases ทุกกรณีมี stable reason code, ไม่มี downloadable orphan และไม่มี signature ใบที่สอง

```bash
git add server/src/trust-kernel server/src/worker/index.ts
git commit -m "feat(trust-kernel): sign and materialize releases safely"
```

---

### Task 9: Trust และ release-status bundle issuance

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

- Produces signed `TrustBundleV1` และ `ReleaseStatusBundleV1` ที่มี independent `(bundleType,trustScope)` sequences
- Key revocation modes: `ALL_SIGNATURES`, `SIGNED_AT_OR_AFTER`, `ISSUANCE_DISABLED`

- [ ] **Step 1: เขียน RED bundle tests**

```ts
expect(buildReleaseStatusBundle(rowsWithVoidAttempt)).not.toContain("VOID");
expect(buildReleaseStatusBundle(rowsWithRevokedRevision).revokedReleaseRevisionIds).toEqual([revokedId]);
expect(buildTrustBundle(keyRevocation({ mode: "SIGNED_AT_OR_AFTER" })).keyRevocations[0]).toMatchObject({
  mode: "SIGNED_AT_OR_AFTER", effectiveAt, reason: "COMPROMISE",
});
```

เพิ่ม sequence monotonicity, scope mismatch, expired attestation/grant revocation, wrong signer-purpose และ packet/bundle self-authorized trust-root rejection tests

- [ ] **Step 2: รัน RED**

Expected: missing bundle builders และ DB tables

- [ ] **Step 3: สร้าง bundle authority**

DB tables เก็บ trusted public keys พร้อม purpose/validity, key revocations, profile-attestation revocations, warning-grant revocations, release revocations, per-scope bundle sequence, issued/expiry, canonical hash และ signature Public key ที่ authenticate `TrustBundleV1` ต้อง pin ใน verifier policy และห้าม bundle ใบเดียวกันเพิ่มหรือ authorize key นี้เอง Bundle issuance ทำ transaction ที่ increment sequence และ snapshot effective entries ทั้งหมด

- [ ] **Step 4: Sign ด้วย purpose-bound managed keys**

`issueSignedBundle` canonicalize unsigned bundle, hash, เรียก `ManagedSignerPort` ด้วย configured trust-bundle key และ persist exact bytes/signature Existing sequence immutable และ retry คืน persisted bundle เดิม

Export valid-minimal trust/status bundles, pinned-root policy และ bootstrap checkpoint ลง shared corpus โดย corpus policy ต้อง pin trust-bundle public key จากนอก bundle, ระบุ permitted `trustScope` และมี freshness/archive limits แบบ explicit การ regenerate ต้อง opt-in และ test ต้อง byte-compare JSON ที่ regenerate กับ committed vectors

- [ ] **Step 5: รัน GREEN และ commit**

รัน server tests, bundle pgTAP และ server build Expected: `VOID` ไม่เข้า release status, monotonic sequence ทน concurrent issuers และ purpose/scope/expiry failures ถูก deny

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

- CLI: `factory-packet-verify --packet <zip> --trust <json> --status <json> --policy <json> --state <json> --report <json>`
- Produces `VerificationReportV1` ที่มี verdict, codes, hashes, sequences, verifier build hash, `validAsOf`, freshness age, checkpoint และ summary

- [ ] **Step 1: เขียน RED corpus tests**

```ts
expect(await verifyFixture("valid-minimal", stateWithCheckpoint())).toMatchObject({ verdict: "PASS" });
expect(await verifyMutation("unknown-extra-file")).toMatchObject({ verdict: "FAIL", codes: ["PACKET_EXTRA_FILE"] });
expect(await verifyWithState(noCheckpoint())).toMatchObject({ verdict: "FAIL", codes: ["TRUST_CHECKPOINT_REQUIRED"] });
expect(await verifyWithBundle(sequence(9), stateAtSequence(10))).toMatchObject({ verdict: "FAIL", codes: ["TRUST_SEQUENCE_ROLLBACK"] });
```

Mutation corpus ครอบ path traversal, duplicate path, corrupt hash, signature mutation, wrong key purpose, scope mismatch, expired bundle, stale-but-unexpired bundle, revoked release/profile/grant, zip bomb ratio, oversize file และ untrusted clock

- [ ] **Step 2: สร้าง isolated workspace และรัน RED**

`tools/factory-packet-verifier/package.json` declare เฉพาะ `@noble/ed25519`, `yauzl`, TypeScript, Vitest และ Node types และไม่ depend on root app/server package

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

`tools/factory-packet-verifier/tsconfig.json` ใช้ค่าตายตัวต่อไปนี้เพื่อให้ emitted CLI paths คงที่:

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

Expected: FAIL เพราะ verifier modules ยังไม่อยู่

- [ ] **Step 3: สร้าง independent parsing และ canonicalization**

สร้าง canonical JSON ภายใน workspace จาก protocol text เป็น implementation ที่เขียนแยกอิสระ `packetReader` บังคับ safe unique paths และ exact allowlisted file set จากนั้น reject declared/actual size mismatch, compression ratio เกิน policy และ total size เกิน policy ก่อน deep parse

- [ ] **Step 4: สร้าง signature, revocation และ freshness state**

```ts
export type VerifierStateV1 = Readonly<{
  bootstrapCheckpoint: Readonly<Record<string, number>>;
  highWaterMarks: Readonly<Record<string, number>>;
}>;
```

State keys ใช้ `${bundleType}:${trustScope}` Verification ต้องมี pinned minimum sequence เมื่อ first use, reject rollback, บังคับ `maxOfflineStalenessSeconds`, ใช้ explicit key-revocation mode, update high-water marks หลัง full PASS เท่านั้น และรายงาน `validAsOf` CLI เขียน state แบบ atomic ผ่าน temp-file + rename

- [ ] **Step 5: พิสูจน์ dependency independence**

เพิ่ม test/script เดิน verifier imports และ fail ถ้า resolved path เข้า `server/src`, `src/factory/packet` หรือ `src/core/manufacturing`

รัน verifier tests และ `npm.cmd run build -w tools/factory-packet-verifier` Expected: exit 0, valid corpus ผ่าน และทุก mutation fail ด้วย assigned code

- [ ] **Step 6: Commit**

```bash
git add tools/factory-packet-verifier package.json package-lock.json test-vectors/factory-packet-v3
git commit -m "feat(trust-kernel): add independent packet verifier"
```

---

### Task 11: P2 quarantine, client projection และ legacy-route containment

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

- Client เห็นเฉพาะ server projections: candidate, attempt, release, artifact status และ report/evidence references
- Route ledger dispositions: `REUSE`, `ADAPT`, `READ_ONLY`, `BLOCK` พร้อม owner, class, current behavior, target และ negative-test ID

- [ ] **Step 1: เขียน RED containment tests**

```ts
expect(await requestLegacyManufacturingDownload("FROZEN")).toMatchObject({ ok: false, code: "STATE_CANDIDATE_STALE" });
expect(await requestShadowP2AsHuman(activeRelease)).toMatchObject({ ok: false, code: "STORE_PLAINTEXT_ACCESS_DENIED" });
expect(await requestShadowP2AsIsolatedRunner(activeRelease)).toMatchObject({ ok: true, value: { mode: "WORKLOAD_STREAM" } });
expect(routeLedgerCoverage(reachableSurfaces)).toEqual({ missing: [], duplicateAuthority: [] });
```

- [ ] **Step 2: รัน RED**

รัน targeted root Vitest และ Edge test Expected: browser download/signed-URL routes ปัจจุบันทำ assertions fail

- [ ] **Step 3: แทน client authority ด้วย V3 projections**

`trustKernelApi.ts` ส่ง bearer-authorized candidate/release intents และไม่ส่ง actor role/name UI hooks แสดง state/reason codes เท่านั้น DRAFT/FROZEN คง P0 preview และ P1 review ที่อนุญาต ส่วน P2 build/download buttons ถูกถอดหรือ disable พร้อมข้อความ `NOT_FOR_PRODUCTION`

- [ ] **Step 4: บังคับ P2 publication policy**

Migration 0166 revoke authenticated execution บน legacy packet mutation/signing RPCs, เพิ่ม tenant-bound storage policies และให้ P2 read ผ่าน isolated workload role เท่านั้น Edge ไม่คืน raw locator หรือ reusable signed URL สำหรับ P2 `isolatedVerifierRunner.ts` authenticate ด้วย workload identity นี้, stream exact bytes เข้า verifier child processโดยไม่ import verifier code, emit report/hash/evidence และลบ transient local bytes พร้อม recheck revocation/status ตอนเริ่ม request

- [ ] **Step 5: ทำ route ledger ให้ครบและ enforce**

Inventory ทุก reachable build/export/download รวม profile/tool/policy/JWT/storage-signing authority input `verify-route-ledger.mjs` scan declared source globs และคืน non-zero เมื่อ discovered route set ต่างจาก ledgered route set, mutable authority ซ้ำ หรือยัง reach P2 human URL, client role header หรือ V1/V2 production-shaped output

- [ ] **Step 6: รัน GREEN และ commit**

รัน targeted containment tests, `trust_kernel_containment.sql`, route-ledger verifier, root typecheck และ Edge suite Expected: reachable legacy surfaces ทุกจุดมี disposition/negative test และมนุษย์รับ P2 plaintext ไม่ได้

```bash
git add src server/src/trust-kernel/artifacts/isolatedVerifierRunner.ts supabase/functions/factory-api supabase/migrations/0166_trust_kernel_legacy_containment.sql supabase/tests/trust_kernel_containment.sql scripts/trust-kernel docs/governance/trust-kernel-route-disposition.json
git commit -m "feat(trust-kernel): contain shadow artifacts and legacy routes"
```

---

### Task 12: E2E chaos, signed evidence, CI และ executive acceptance gate

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

- Produces signed `EvidenceAttestationV1` กับ `evidence-manifest.json` ที่ bind Git roots ทั้งสอง, commands, reports, binaries, run identity, retention และ root hash
- Produces CI gate เดียวที่ final machine-readable summary ระบุ pass/fail/skip counts ของทุก layer
- Produces append-only exportable `SecurityEventV1`, approved trust/release metrics/alerts และ machine-readable accountable-owner map

- [ ] **Step 1: เขียน RED E2E และ evidence tests**

```ts
test("two distinct humans release while P2 remains unavailable to humans", async ({ page, request }) => {
  await freezeAs(designerA, candidate);
  await approveAndReleaseAs(approverB, candidate);
  await expectReleaseState(request, "ACTIVE", "AVAILABLE");
  await expectHumanP2Request(request).resolves.toMatchObject({ status: 403, code: "STORE_PLAINTEXT_ACCESS_DENIED" });
});
```

เพิ่ม membership revocation mid-flow, two approver race, DB response loss, crash before materialization, revoke/download race, offline replay, tenant hash guessing, first-use verifier without checkpoint และ tenant-002 isolation

- [ ] **Step 2: สร้าง evidence manifest และ managed evidence signing**

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

`issueEvidenceAttestation` ใช้ managed signer จาก `EVIDENCE_SIGNER_URL` และ `EVIDENCE_SIGNER_KEY_ID` purpose `EVIDENCE` CI fail closed เมื่อ signer config/signature verification ไม่พร้อม และไม่เก็บ private key

- [ ] **Step 3: สร้าง observability และ ownership enforcement**

`SecurityEventV1` ต้องมี tenant scope, event ID, actor user ID, membership version, candidate/release revision, artifact hash, reason code, correlation ID และ authority timestamp Recorder append immutable rows และ export canonical JSONL; display name เป็นข้อมูลเสริมและใช้แทน identity field ไม่ได้ Metrics/alert rules ครอบ authentication denials, SoD violations, stale candidates, capability blockers, signer/store failures, VOID artifacts, verifier failures, stale trust bundles, revoked-release access และ blocked-legacy-route attempts

`trust-kernel-ownership.json` map Identity/tenancy/RLS/signer custody/trust bundles ไป Security/IAM; lifecycle/SoD/exceptions/revocation ไป Release Governance; operation/profile/range semantics ไป Manufacturing Engineering; deterministic builder/storage/outbox/workers ไป Platform Engineering; verifier/hostile corpus/evidence bundle ไป Independent QA/Safety Tests reject domain ที่ไร้ owner และ protocol/invariant change record ที่ไม่มี versioned decision พร้อม migration reference

- [ ] **Step 4: สร้าง complete-output CI**

Workflow matrix รัน Windows/Ubuntu deterministic/server/verifier tests ตามด้วย Edge, local Supabase pgTAP, root typecheck/build, route ledger, Playwright shadow E2E, hostile corpus และ evidence self-verification ทุก noisy command เขียน JSON/TAP output และ final job อ่านไฟล์ครบแล้ว reject failures, cancellations, skips, report set ที่ต่างจาก declared matrix, empty suites หรือ hash mismatch

- [ ] **Step 5: สร้าง bilingual standalone runbooks**

Runbooks ระบุ local prerequisites, exact commands, environment variables ที่มีเฉพาะ key ID/endpoint, วิธี provision tenant fixtures, inspect reason codes, revoke, refresh verifier checkpoints, evidence retention และสถานะ `NOT_FOR_PRODUCTION`/P3-disabled อย่างชัดเจน Render HTML ด้วย repository renderer และตรวจ content alignment

- [ ] **Step 6: รัน complete local acceptance sequence**

รันตามลำดับ:

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

จากนั้นรัน Trust Kernel pgTAP ทั้งห้า suites บน Supabase ที่เพิ่ง start ใหม่ Expected: ทุก command exit 0, ทุก suite มี non-zero assertions, skips เป็นศูนย์, P2 human access ถูก deny, valid vectors ผ่าน และ hostile vector ทุกตัว reject ด้วย assigned code

- [ ] **Step 7: รัน independent review gates**

ใช้ `superpowers:requesting-code-review` แล้วใช้ `scrutinize` ไล่ entry → action context → DB authority → worker → artifact → bundle → verifier → evidence ทั้งเส้น แก้ blocker/major ทุกข้อและรัน Step 6 ใหม่จาก clean process state

- [ ] **Step 8: Commit final integration**

```bash
git add e2e/trust-kernel server/src/trust-kernel/evidence server/src/trust-kernel/observability server/src/trust-kernel/test/observability.test.ts .github/workflows/trust-kernel-verify.yml docs/runbooks docs/governance/trust-kernel-ownership.json package.json
git commit -m "test(trust-kernel): prove shadow trust-ready acceptance"
```

## Final MONOLITH Completion Gate

ก่อนอ้าง Shadow Trust-Ready:

- [ ] Capture Git roots ทั้งสองและ dirty-file lists ใน evidence
- [ ] Tasks 1–12 ทุก task มี targeted RED/GREEN proof และ commit
- [ ] Critical/negative trust gates ผ่าน 100% และ skipped trust/security tests เท่ากับศูนย์
- [ ] Route ledger ครอบ 100% ของ reachable production-shaped และ authority-input surfaces
- [ ] Windows/Ubuntu golden packet hashes byte-identical
- [ ] Independent verifier accept valid corpus และ reject mutation ทุกตัวด้วย specified stable code
- [ ] Authenticated users สองคนทำ freeze/release สำเร็จ และ SoD, membership revocation, replay, cross-tenant attacks ถูก reject
- [ ] Profile attestation และ warning grants บังคับ scope, key purpose, expiry, revocation และ distinct approvers
- [ ] Offline verifier reject missing checkpoint, rollback, stale bundle, untrusted clock และ revoked records
- [ ] P2 plaintext/raw URL ถูก deny สำหรับมนุษย์ และ Factory/P3 ยัง disabled
- [ ] Evidence attestation verify ด้วย `EVIDENCE` key แยก และ bind exact source/reports/binaries
- [ ] Append-only security-event export, required metrics/alerts และ accountable-owner mapping ผ่าน contract tests
- [ ] Runbook TH/EN Markdown/HTML ตรงกันและระบุ `NOT_FOR_PRODUCTION`
- [ ] Production/GA ยัง NO-GO จนผ่าน production key ceremony, AAL2 policy, operations drills, authorized factory pilot, machine acceptance และ separate P3 authorization

## การส่งต่อเพื่อดำเนินงาน

แนะนำให้ execute ด้วย `superpowers:subagent-driven-development` ใน fresh isolated worktree ใช้ fresh subagent ต่อ task, review สองชั้นคือ specification แล้ว code quality และห้าม parallelize migrations หรือ tasks ที่ใช้ `factory-api`, `server/src/trust-kernel`, `package-lock.json` หรือ route-ledger files ร่วมกัน

ทางเลือกคือ execute ใน session นี้ด้วย `superpowers:executing-plans` ทีละ phase gate พร้อม checkpoints หลัง Tasks 4, 9 และ 12
