# แบบออกแบบ MONOLITH Production Trust Kernel

- **สถานะ:** แบบที่ผู้ใช้อนุมัติแล้วสำหรับการจัดทำแผน implementation
- **วันที่:** 22 กรกฎาคม 2026
- **เป้าหมายรอบนี้:** Shadow Trust-Ready
- **สถานะความปลอดภัย:** `NOT_FOR_PRODUCTION` — ห้ามอ้าง Production, GA หรือ Factory-Safe
- **ขอบเขตผลิตภัณฑ์:** MONOLITH เป็นแพลตฟอร์มหลาย tenant; Daph คือ tenant นำร่องรายแรก ไม่ใช่ identity ที่ hardcode ใน runtime

## 1. Executive decision

MONOLITH จะสร้าง **Canonical Release Authority + FactoryPacket V3 Protocol** เพื่อให้เส้นทางจากแบบที่ freeze แล้วไปสู่ manufacturing artifact มี authority ฝั่ง server เพียงชุดเดียว, ปฏิเสธเมื่อข้อมูลหรือความสามารถไม่ครบ, สร้างผลลัพธ์ซ้ำได้แบบ byte-identical, ใช้ managed signing และตรวจสอบแบบ offline ด้วย verifier ที่เป็นอิสระจาก builder

V3 เป็น protocol และ migration boundary ที่มาแทนเส้นทาง release/export เดิม ไม่ใช่ packet/release stack อีกชุดหนึ่งที่ทำงานคู่ขนานกับของเดิม

ผลลัพธ์ของระยะนี้คือระบบ shadow ที่สร้าง production-shaped payload เพื่อพิสูจน์ deterministic behavior ได้ แต่ยังไม่เปิดการกระจายไฟล์ไปยัง Factory หรือเครื่องจักรจริง

## 2. Repository and evidence scope

ข้อสรุป current-state ในเอกสารนี้แยก Git roots ดังนี้:

| Root | บทบาทในแบบนี้ |
|---|---|
| Parent governance root: `C:\Users\thai3\determined-williams (2)` | audit, context, design spec, governance gates และ implementation plan ในอนาคต |
| Nested product root: `C:\Users\thai3\determined-williams (2)\determined-williams` | source, tests, server, Supabase migrations/functions และ runtime evidence ของ MONOLITH |

เอกสารอ้างอิงหลักคือ [รายงานตรวจสอบเชิงลึกผู้บริหาร](../../reports/2026-07-22-monolith-platform-executive-deep-audit.th.md), `CONTEXT.md`, repository-scope correction วันที่ 21 กรกฎาคม 2026 และ as-built code ใน nested product root

หลักฐานสำคัญที่ทำให้ต้องใช้แบบนี้:

| As-built condition | Evidence anchor | Design response |
|---|---|---|
| Client role และ actor สามารถมาจาก local storage/header | `src/core/auth/roles.ts:67`, `src/core/api/stateApi.ts:128`, `supabase/functions/factory-api/index.ts:136` | server-derived `ActorContextV1`; header ใช้เพื่อแสดงผลเท่านั้น |
| Node filesystem state กับ Supabase SQL state ทำงานคู่ขนานและให้ export policy ต่างกัน | `server/src/state/`, `supabase/migrations/0155_factory_state_server.sql` | Supabase/Postgres เป็น release authority เดียว; Node เป็น worker |
| Supabase `factory_jobs` ใช้ global job key และ authenticated read policy แบบ `using (true)` | `supabase/migrations/0155_factory_state_server.sql:9`, `supabase/migrations/0155_factory_state_server.sql:25` | tenant-bound schema, membership RLS และ tenant-scoped object paths |
| Client สร้างและดาวน์โหลด packet/Cut List/DXF ได้หลายช่อง | `src/components/ui/ExportPanel.tsx`, `src/factory/packet/useFactoryPacket.ts` | Artifact Class Matrix + route disposition ledger + negative bypass tests |
| Packet/bundle มีเวลาและ random ID; browser ECDSA key | `src/factory/packet/buildFactoryPacket.ts`, `src/core/manufacturing/release/buildBundleV2.ts` | canonical release data, managed Ed25519, fixed packaging และ idempotent retrieval |
| Edge verify ตรวจเพียง whole-ZIP hash | `supabase/functions/factory-api/index.ts` | standalone protocol verifier ตรวจ schema, files, signature, trust, release status, gate และ machine binding |
| CIX ลด unknown tool เป็น TNO=1 และข้าม unsupported operation | `src/cnc/post/dialects/cix.ts` | capability compiler และ dialect defense-in-depth ต้อง block ทั้ง packet |

## 3. Scope

### 3.1 In scope

- Server-owned identity, membership, tenant/org/site scope และ authorization
- Four-eyes release โดยผู้ freeze และผู้ release ต้องเป็นคนละ authenticated user
- Working revision, release attempt และ immutable release revision ที่แยก lifecycle กัน
- Immutable release snapshot และ candidate hash
- Machine capability compiler ที่ fail closed
- Deterministic FactoryPacket V3 payload และ packaging
- Managed signer interface และ environment-separated key custody
- Tenant-scoped private artifact store และ shadow quarantine
- Signed trust bundle และ signed release-status/revocation bundle ที่อยู่นอก packet
- Standalone offline verifier และ stable machine-readable reason codes
- Legacy route disposition และ fail-closed migration
- Evidence bundle ที่ผูกกับ exact source state และตรวจซ้ำได้

### 3.2 Out of scope

- เปิด production distribution หรือส่งไฟล์เข้าเครื่องจักรจริง
- Production key ceremony, production AAL2 enforcement, GA operations หรือ SLA
- การแก้ feature domain อื่นที่ไม่จำเป็นต่อ Production Trust Kernel
- การสร้าง microservice estate ใหม่โดยไม่มีเหตุผล
- การ hardcode Daph, tenant ID หรือ role ลงใน packet builder

## 4. Locked design decisions

| ID | Decision |
|---|---|
| `DTK-01` | เป้าหมายคือ Shadow Trust-Ready และทุก output ยังระบุ `NOT_FOR_PRODUCTION` |
| `DTK-02` | DRAFT/FROZEN ใช้ preview/simulation; production-shaped output ไม่สามารถดาวน์โหลดได้ |
| `DTK-03` | JWT ถูกตรวจฝั่ง server และแปลงเป็น tenant/org/site/user/roles จาก membership ปัจจุบัน |
| `DTK-04` | Designer freeze; `RELEASE_APPROVER` คนละ user release; Factory consume เท่านั้น; Admin ต้องได้รับ release role แยกจึง release ได้ |
| `DTK-05` | Release revision เดิมต้องให้ packet bytes เดิมทุกครั้ง; input สำคัญเปลี่ยนต้องได้ revision ใหม่ |
| `DTK-06` | App ถือเพียง signer key ID; private key อยู่นอก app; production signing ปิดจนผ่าน key ceremony |
| `DTK-07` | Unknown tool หรือ unsupported operation block ทั้ง packetและยุติ construction ก่อนเกิด partial/fallback artifact |
| `DTK-08` | Offline verifier เป็น executable/package graph แยกจาก builder และคืน machine-readable report |
| `DTK-09` | Trust bundle และ release-status bundle เป็น signed external inputs; packet ห้าม authorize key ของตัวเอง |
| `DTK-10` | Release revision เก่า immutable; เมื่อผิดต้อง revoke และเริ่ม working revision ใหม่ |
| `DTK-11` | Hard gate ปฏิเสธเสมอ; exception ใช้ได้เฉพาะ soft warning พร้อมเหตุผล วันหมดอายุ four-eyes และ revision ใหม่ |
| `DTK-12` | Definition of Done ต้องมี contract, property, negative, hostile, golden, E2E และ commit-linked CI evidence |
| `DTK-13` | V1/V2 อ่านประวัติได้เท่านั้น; production-shaped output ต้องใช้ V3 |
| `DTK-14` | Supabase/Postgres เป็น canonical release authority เพียงแห่งเดียว; Node ทำหน้าที่ deterministic worker |
| `DTK-15` | Working revision, release attempt และ release revision เป็นคนละ aggregate |
| `DTK-16` | Shadow P2 manufacturing payload ถูกสร้างจริงแต่ sealed ใน private quarantine; plaintext ใช้ได้เฉพาะ isolated automated verifier และ P3 distribution ปิด |
| `DTK-17` | RELEASE ห้าม offline queue หรือ auto-replay; ต้องมี fresh interactive identity และ candidate hash |
| `DTK-18` | Machine profile ใช้เป็น authority input ได้เมื่อมี signed `MachineProfileAttestationV1` ที่ยัง valid และ bind scope/tool library/postprocessor เท่านั้น |
| `DTK-19` | Service role เป็น executor ไม่ใช่ human authority; authoritative RPC รับ immutable `VerifiedActionContextV1` ไม่รับ role/name/tenant จาก request body |
| `DTK-20` | Offline verdict รับรองสถานะ ณ bundle sequence/issuedAt; freshness ต้องมี persistent high-water mark และ trusted bootstrap checkpoint |
| `DTK-21` | `ReleaseAttempt`, `ArtifactRecord` และ `ReleaseRevision` มี state machine แยกกัน; `VOID` ไม่ใช่สถานะของ release revision |
| `DTK-22` | Soft-warning exception ต้องเป็น signed `WarningExceptionGrantV1`; hard blocker ปฏิเสธทุกครั้ง |
| `DTK-23` | Evidence attestation ใช้ CI/workload identity key แยกจาก release signing key |
| `DTK-24` | Daph-specific JWT/site helpers เป็น legacy compatibility เท่านั้นและห้ามใช้เป็น Trust Kernel authority |

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

Supabase/Postgres เป็น authority เดียวของ identity-derived scope, working revision state, approval, release attempt, release revision, signature certificate, artifact reference และ lineage event

Node หรือ worker อื่นรับ immutable work request แล้วคืน deterministic result เท่านั้น Worker ห้ามเปลี่ยน release state, resolve role เอง หรือถือ filesystem snapshot เป็น authority

### 5.2 No dual write

ช่วง migration ห้ามเขียนสถานะเดียวกันทั้ง filesystem และ Postgres แล้วเลือกผลภายหลัง Legacy state readers อาจอ่านเพื่อ migration/history แต่ mutation path ต้องถูกตัดมาที่ canonical authority เส้นเดียว

## 6. Domain model and lifecycle

### 6.1 `TenantScopeV1`

ประกอบด้วย `tenantId`, `orgId`, `siteId` และ policy version ทุก aggregate และ artifact metadata ต้อง bind scope นี้ Daph ถูก provision เป็น tenant แรกผ่าน configuration/onboarding data ไม่ใช่ source constant

### 6.2 `WorkingRevision`

สถานะ authoritative มีเพียง:

- `DRAFT`: แก้ไขได้และสร้าง P0 preview ได้
- `FROZEN`: immutable candidate สำหรับ review; แก้ input ไม่ได้จนกว่าจะ unfreeze หรือ fork

ข้อมูลหลัก: working revision ID, parent revision ID, tenant scope, content references, created actor, frozen actor, frozen time, candidate hash และ policy/profile versions

### 6.3 `ReleaseCandidate`

สร้างเมื่อ freeze โดย `candidateHash` ครอบคลุม canonical snapshot, gate inputs รวม warning facts/eligibility, machine capability profile, `MachineProfileAttestationV1`, policy versions, tenant scope และ required artifact definitions แต่ไม่ครอบคลุม exception grant เพื่อหลีกเลี่ยง circular hash

หลังออก exception grants แล้ว Authority คำนวณ `releaseAuthorizationHash = SHA-256(canonical({domain: "MONOLITH/ReleaseAuthorization/V1", candidateHash, sortedGrantHashes}))` โดย empty grant list มี canonical representation เดียว Candidate ครอบคลุม profile/policy/artifacts อยู่แล้วจึงไม่ hash ซ้ำ Final approval, release attempt และ release certificate bind ทั้ง candidate hash และ release authorization hash การเปลี่ยน grant ทำให้ต้องสร้าง release authorization/attempt ใหม่; ถ้ามี release แล้วต้องสร้าง release revision ใหม่ การเปลี่ยน underlying candidate input หรือ profile attestation ทำให้ต้อง freeze/candidate ใหม่

### 6.4 `ReleaseAttempt`

สถานะ:

- `PENDING`: ผ่าน precondition และกำลัง compile/sign/commit
- `FAILED`: deterministic blocker หรือ non-retryable failure
- `PUBLISHED`: release commit สำเร็จและ artifact พร้อมตาม environment policy
- `VOID`: attempt ถูกยกเลิกก่อนเกิด release revision และห้ามกลับมา publish

Transient signer/store failure retry ได้ด้วย candidate hash และ idempotency key เดิมเท่านั้น Idempotency scope คือ `(tenantId, actorUserId, candidateHash, idempotencyKey)` และเก็บ `requestHash`; key เดิมกับ request hash ต่างกันต้องคืน `STATE_IDEMPOTENCY_MISMATCH`

### 6.5 `ArtifactRecordV1`

สถานะ:

- `QUARANTINED`: unsigned payload หรือ private source bytes ที่ยังไม่ publish
- `MATERIALIZING`: release commit สำเร็จและ worker กำลังเขียน final bytes ตาม expected hash
- `AVAILABLE`: exact bytes ถูกเขียนและตรวจ hash ตรงแล้ว แต่ยังขึ้นกับ publication policy
- `VOID`: artifact ถูกยกเลิกหรือ hash/materialization ไม่สำเร็จ และห้าม publish

Artifact record bind tenant/site, artifact class, release attempt/revision reference, content hash, expected packet hash, object locator ภายใน และ timestamps ห้ามใช้ artifact status เป็น release authority และห้ามเปิด raw storage locator ให้ client

### 6.6 `ReleaseRevision`

สถานะ:

- `ACTIVE`: immutable release ที่ signature, artifact reference และ ledger commit สำเร็จ
- `REVOKED`: release เดิมยังคง immutable แต่ห้าม consume

Release revision มี release revision ID, candidate hash, release authorization hash, sorted warning-exception grant hashes, content hash, expected packet hash, release certificate, approver identity, approval evidence, machine profile-attestation binding, tenant scope, parent lineage และ timestamps จาก authority

UI อาจแสดง projection ว่า “RELEASED” เมื่อมี `ACTIVE ReleaseRevision` แต่ห้ามเก็บ `RELEASED` เป็น mutable state ของ WorkingRevision

### 6.7 Concurrent history after change

หลัง revoke หรือเมื่อต้องแก้แบบ ระบบสามารถมี `REVOKED ReleaseRevision R1` พร้อมกับ `WorkingRevision R2 = DRAFT` ได้ ทำให้ไม่ต้องเปลี่ยนของเก่ากลับเป็น FROZEN และไม่ทำลายประวัติ

## 7. Authorization, tenancy and separation of duties

### 7.1 Actor resolution

`AuthContextResolver` ต้อง:

1. ตรวจ JWT signature, issuer, audience, expiry และ subject
2. ห้ามยอมรับ anon service identity เป็น human actor
3. อ่าน membership ปัจจุบันจาก server-side source
4. resolve tenant/org/site, authenticated user ID, roles, AAL และ membership version
5. ปฏิเสธเมื่อ scope ไม่ตรง, membership ถูกถอน หรือ role ไม่รองรับ action

Client-supplied role/name ใช้ได้เพียง display hint และต้องไม่เข้า authorization decision หรือ audit actor identity

JWT app-metadata และ legacy helpers `current_app_roles()`, `current_site_codes()` และ `get_active_site_codes()` เป็นข้อมูล compatibility/hint เท่านั้น ห้ามใช้เป็น current membership authority ของ Trust Kernel ระบบต้องอ่าน tenant membership/location tables ที่มี version และ revocation state จาก Postgres Daph/BKK-HQ-01 ต้องเป็น onboarding data; migration test ต้องพิสูจน์ว่า tenant 002 อยู่ร่วมได้โดยไม่แก้ source code

### 7.2 Verified action context และ service-role boundary

หลังตรวจ JWT แล้ว Edge เรียก `create_verified_action_context` ด้วย user-scoped bearer token ไม่ใช่ service role Postgres ใช้ `auth.uid()` และ current membership สร้าง immutable short-lived `VerifiedActionContextV1` ซึ่งมี action context ID, tenant/org/site, actor user ID, roles, AAL, membership version, permitted action, candidate hash, release authorization hash, request hash, issuedAt, expiresAt และ nonce แล้วบันทึกเป็น authoritative database record Service role ถูกห้ามสร้าง action context

Authoritative mutation RPC รับเฉพาะ action context ID และ business identifiers ที่ bind อยู่ใน context จากนั้น lock/consume record และตรวจ scope, membership version, expiry, nonce, candidate และ release authorization hash ซ้ำภายใน transaction ห้ามรับ actor role/name/tenant/site จาก request body เป็น authority Service-role client ใช้ execute downstream outbox work หลัง user-authorized commit เท่านั้นและไม่สามารถสร้าง human approval, ข้าม SoD หรือเลือก object path จาก client input ได้

### 7.3 Role responsibilities

| Role | Allowed |
|---|---|
| `DESIGNER` | แก้ DRAFT, run validation, freeze และ submit candidate |
| `RELEASE_APPROVER` | approve/reject candidate และ initiate release เมื่อไม่ใช่ผู้ freeze |
| `FACTORY` | consume เฉพาะ ACTIVE + verifier PASS + environment policy อนุญาต |
| `SAFETY_REVOKER` | revoke ACTIVE release ได้ทันที พร้อมเหตุผล |
| `ADMIN` | จัด membership/policy; การ release ต้องมี `RELEASE_APPROVER` role แยก |
| `QA_EVIDENCE` | รับเฉพาะ hash/report/evidence ของ sealed shadow artifact; P2 plaintext และ raw storage URL ถูก deny |

### 7.4 Four-eyes invariant

`freezeActorUserId != releaseApproverUserId` ต้องบังคับด้วย database constraint/transaction logic ไม่ใช่ UI check Approval bind candidate hash, release authorization hash, tenant scope, approver user ID, membership version, AAL, decision time และ reason

Shadow evidence ต้องบันทึก AAL ที่ใช้ Production distribution ยังปิดจนมี production policy ที่กำหนดและทดสอบ AAL2

### 7.5 Tenant isolation

- ทุก authoritative table มี `tenant_id`; child rows ใช้ tenant-bound foreign keys
- Job/project identifiers ไม่เป็น global authority โดยลำพัง
- RLS ตรวจ membership และ tenant/site scope; ห้าม `using (true)` สำหรับ product data
- Object paths อยู่ใต้ `tenantId/siteId/releaseRevisionId/contentHash`
- Signed manifest และ release certificate bind tenant/org/site
- Content-addressed physical deduplication ถ้ามีต้องอยู่หลัง logical tenant authorization และห้ามเปิด existence side-channel
- Service role ไม่ยกเว้น tenant authorization; database transaction ต้อง bind action context, tenant FK และ candidate ก่อนทุก mutation

## 8. Component contracts

| Component | Input | Output | Responsibility boundary |
|---|---|---|---|
| `AuthContextResolver` | verified JWT/request | `ActorContextV1` | identity, membership, scope, roles, AAL |
| `ActionContextBroker` | actor + permitted action + request hash | `VerifiedActionContextV1` | short-lived immutable authority handoff; one-time consumption |
| `ReleaseAuthority` | actor, action, expected candidate, idempotency | transition/result/event | state, SoD, CAS, ledger; ไม่ build packet |
| `SnapshotService` | frozen working revision | `ReleaseSnapshotV3` | immutable canonical input |
| `ProfileAttestationRegistry` | profile/tool/postprocessor governance | signed `MachineProfileAttestationV1` | scope, validity, approval และ revocation |
| `WarningExceptionAuthority` | eligible warning + two approvers | signed `WarningExceptionGrantV1` | exact-scope expiring exception; hard blockers excluded |
| `CapabilityCompiler` | snapshot operations + attested `MachineCapabilityProfileV1` | capability report | exhaustive support decision; no fallback |
| `PacketBuilderV3` | approved snapshot + capability report | canonical unsigned payload | pure deterministic construction |
| `ManagedSignerPort` | fixed digest/certificate + key ID | Ed25519 signature | private key อยู่นอก app |
| `ArtifactRepository` | tenant-scoped bytes/reference | `ArtifactRecordV1` | private write, quarantine, hash verification, availability; no release authority |
| `TrustBundleManager` | key/revocation governance | signed bundles | trust roots, key validity, expiry, sequence |
| `OfflineVerifier` | packet + external bundles | `VerificationReportV1` | independent validation; no builder import |
| `EvidenceRecorder` | run context/results/artifacts | evidence bundle | exact source/environment/result traceability |

Versioned contracts แยก evolution กัน: `ActorContextV1`, `VerifiedActionContextV1`, `TenantScopeV1`, `ReleaseSnapshotV3`, `MachineCapabilityProfileV1`, `MachineProfileAttestationV1`, `WarningExceptionGrantV1`, `CapabilityReportV1`, `FactoryPacketManifestV3`, `ReleaseCertificateV1`, `ArtifactRecordV1`, `TrustBundleV1`, `ReleaseStatusBundleV1`, `VerificationReportV1` และ `EvidenceAttestationV1`

## 9. Artifact Class Matrix

| Class | Examples | DRAFT | FROZEN | Shadow ACTIVE release | Production distribution |
|---|---|---:|---:|---:|---:|
| `P0_PREVIEW` | interactive render, simulation UI | view | view | view | not applicable |
| `P1_REVIEW` | watermarked PDF/JSON ที่ไม่มี machine geometry | optional audited download | audited download | audited download | policy-controlled |
| `P2_MANUFACTURING` | Cut List CSV, DXF, CIX/G-code, full packet | deny | deny | build real bytes; sealed quarantine; isolated automated verifier only | deny in this phase |
| `P3_DISTRIBUTION` | Factory/operator/machine delivery | deny | deny | deny | disabled until separate production authorization |

ใน shadow phase มนุษย์รวมถึง `QA_EVIDENCE` ห้ามรับ P2 plaintext, raw object locator หรือ reusable signed URL Isolated QA runner ใช้ workload identity อ่าน exact bytes จาก private store, ตรวจและส่งออกเฉพาะ hash/report/evidence ที่ไม่สามารถใช้ผลิต การเปลี่ยนนามสกุลเป็นเพียง defense-in-depth ไม่ใช่ access control การตรวจ plaintext ด้วยมนุษย์อยู่นอกขอบเขตและต้องมี secure-workstation/one-time audited proxy policy ที่อนุมัติแยกต่างหาก

## 10. Release transaction choreography

### 10.1 Freeze

1. Designer ส่ง freeze intent พร้อม expected working revision version
2. Server resolve actor/membership และตรวจ tenant scope
3. Server compile canonical snapshot inputs และ gate inputs
4. Database CAS เปลี่ยน DRAFT เป็น FROZEN พร้อม candidate hash, freezer identity และ policy/profile versions
5. Client รับ server projection; local state ไม่เป็น authority

### 10.2 Release

1. `RELEASE_APPROVER` ส่ง release request พร้อม candidate hash, release authorization hash, idempotency key และ request hash; Edge ขอ Postgres สร้าง `VerifiedActionContextV1` ภายใต้ user bearer token
2. Authority consume action context และ recheck distinct user, membership version, tenant/site scope, candidate/release-authorization freshness, required gates, profile attestation และ exception grants
3. Database lock/สร้าง `ReleaseAttempt=PENDING` แล้วจัดสรร release revision ID, monotonic release sequence และ authoritative timestamp ก่อน signing
4. Worker อ่าน immutable snapshot และรัน capability compiler; blocker ใด ๆ ทำให้ทั้ง attempt fail
5. Worker สร้าง canonical unsigned payload และ `ArtifactRecord=QUARANTINED` ใน private tenant store
6. Worker สร้าง deterministic release certificate จาก authority fields, ขอ managed Ed25519 signature, assemble final packet bytes ใน memory ด้วย fixed packaging และคำนวณ expected final packet hash; ยังไม่มี signed downloadable object
7. Database transaction เดียว consume nonce, recheck candidate CAS/membership/profile/exception อีกครั้ง แล้วบันทึก approval, certificate, `ReleaseRevision=ACTIVE`, `ArtifactRecord=MATERIALIZING`, expected hash, ledger event และ outbox
8. ถ้า transaction ล้มเหลว ให้ทิ้ง in-memory signature/final bytesและจบ flow ที่ attempt/artifact `VOID`; การสร้าง release revision และ URL เกิดได้เฉพาะ successful commit branch
9. หลัง commit worker materialize exact final bytes ที่ต้องสร้างซ้ำได้จาก persisted canonical payload + certificate, ตรวจ expected hash แล้วเปลี่ยน artifact เป็น `AVAILABLE` และ attempt เป็น `PUBLISHED`; retry ต้องได้ bytes เดิม
10. Publication policy เปิด opaque reference เมื่อ `ReleaseRevision=ACTIVE` และ `ArtifactRecord=AVAILABLE` เท่านั้น Shadow policyยังคง deny P2 human plaintext และ Factory/P3

### 10.3 Failure rules

- Retry อัตโนมัติเฉพาะ transient signer/store failure ด้วย idempotency เดิม
- Deterministic gate/capability/schema/auth/state failure ห้าม retry แบบซ่อนเหตุผล
- Store success + DB failure = private VOID artifact และ VOID attempt; ไม่มี release revision หรือ signed downloadable packet
- DB commit response lost = retry query ด้วย idempotency แล้วคืน release/certificate เดิม
- Concurrent release = หนึ่ง CAS ชนะ; รายอื่นได้ stable `STATE_CONFLICT`
- Candidate เปลี่ยน, unfreeze หรือ membership เปลี่ยน = approval เก่าหมดผล
- Crash หลัง commit ก่อน materialization = outbox retry สร้าง exact bytes เดิม; Factory eligibility ยังปิดจน artifact `AVAILABLE`

### 10.4 Revoke and fork

- `SAFETY_REVOKER` revoke ACTIVE release ได้ทันทีโดยไม่รอ four-eyes delay
- Revoke บันทึก reason, actor, effective sequence/time และออก release-status bundle ใหม่
- Artifact เดิมไม่ถูกแก้หรือลบ แต่ Factory consume และ verifier ต้อง reject
- การแก้ไขเริ่ม WorkingRevision ใหม่แบบ DRAFT พร้อม parent lineage

### 10.5 Offline intent

`RELEASE` ห้ามอยู่ใน offline queue และห้าม auto-drain เมื่อ reconnect Freeze intent อาจเก็บเป็น draft UX ได้แต่ server ต้อง re-evaluate ทุกอย่าง Revoke offline intent ต้องแสดงว่า “ยังไม่บังคับใช้” จน server ยืนยันสำเร็จ

## 11. Determinism and cryptography

### 11.1 Determinism boundary

Same release revision หมายถึง tenant scope, release snapshot, machine profile, policy versions, approval data, canonical release timestamp, signer key ID และ release certificate data เหมือนเดิม ผลต้องเป็น:

- canonical payload bytes เดิม
- file order, paths, newline, numeric precision และ Unicode normalization เดิม
- fixed ZIP timestamp, compression profile และ implementation version
- Ed25519 signature bytes เดิมสำหรับ signable bytes เดิม
- final FactoryPacket V3 bytes และ SHA-256 เดิม

Runtime clock, `Date.now()`, random IDs, filesystem ordering หรือ locale ห้ามเข้าผลลัพธ์ Release revision ID มาจาก authority และ content binding ไม่ใช่ client-generated randomness

### 11.2 Signing profile

- V3 production-shaped artifacts ใช้ managed Ed25519 profile ที่ pin ชัดเจน
- App/worker ถือ key ID และเรียก signer port เท่านั้น
- Dev ใช้ ephemeral development key พร้อม marker
- Staging ใช้ managed non-production key
- Production signer ถูก disable จนผ่าน key ceremony, custody, rotation, recovery และ incident drill
- Release เดิมห้าม re-sign; ระบบคืน persisted certificate/signature เดิม

### 11.3 Trust and release status bundles

`TrustBundleV1` มี scope, sequence, issuedAt, expiresAt, trusted key IDs พร้อม key purpose (`RELEASE`, `PROFILE_ATTESTATION`, `WARNING_EXCEPTION`), algorithms, validity windows, key revocations, profile-attestation revocations และ warning-exception-grant revocations แต่ละ revocation entry bind ID/hash, effectiveAt และ reason High-water mark แยกตาม `(bundleType, trustScope)`

`ReleaseStatusBundleV1` มี scope, sequence, issuedAt, expiresAt และรายการ `ReleaseRevision` ที่ถูก `REVOKED` เท่านั้น `VOID` จบ flow ที่ attempt/artifact ก่อนขั้นสร้าง release certificate/revision จึงถูก exclude จาก bundle การมี release certificate ที่ถูกต้องพิสูจน์ว่า authority เคยออก release; status bundle ที่ยอมรับได้ต้องยืนยันว่า revision นั้นอยู่นอกรายการ revoked

ทั้งสอง signed โดย trust authority ที่ verifier pin ไว้และส่งแยกจาก packet Verifier ต้อง reject เมื่อ bundle หมดอายุ, sequence rollback, scope ไม่ตรง, signature ไม่ถูก หรือ trusted clock/clock policy พิสูจน์เวลาไม่สำเร็จ Key revocation ต้องระบุ `revocationMode` เป็น `ALL_SIGNATURES`, `SIGNED_AT_OR_AFTER` หรือ `ISSUANCE_DISABLED` พร้อม effectiveAt และ reason; verifier ใช้ explicit mode เป็น semantics เพียงแหล่งเดียว

Offline verifier รับรองสถานะในขอบเขต “valid as of bundle sequence/issuedAt” เท่านั้น การแสดง “currently active” ต้องมี online-current authority Verifier ต้องเก็บ persistent high-water mark แยก trust scope, ปฏิเสธ sequence ต่ำกว่าที่เคยยอมรับ และบังคับ `maxOfflineStaleness` จาก pinned environment policy การ bootstrap ครั้งแรกต้องมี online trusted provisioning หรือ pinned minimum-sequence checkpoint; checkpoint/state store/trusted clock ที่ไม่พร้อมหรือ freshness เกิน policy ให้คืน `TRUST_FRESHNESS_UNPROVEN` Factory work start ทุกครั้งต้อง refresh ภายใน policy window และใช้ current authorization แทน verdict เก่า

## 12. Capability safety

`MachineCapabilityProfileV1` ระบุ machine/dialect version, supported operation types, tool identities, ranges, faces, units, coordinate conventions และ postprocessor version

Profile ใช้ใน candidate/compiler/verifier ได้เมื่อมี signed `MachineProfileAttestationV1` จาก Profile Attestation Authority ภายใต้ Manufacturing Engineering เท่านั้น Attestation bind tenant/site/machine IDs, canonical profile hash, tool-library hash, postprocessor ID/version/binary hash, profile approver identity, issuedAt, validFrom, validUntil, status และ attestation sequence Candidate และ release certificate bind attestation ID/hash Verifier ตรวจ signature, scope, validity, sequence และ revocation จาก external trust data Profile ที่มาจาก local storage, client override หรือ legacy schema ต้องผ่าน read-only adapter ไปยัง canonical schema และได้รับ authority หลัง attestation ผ่านเท่านั้น

`WarningExceptionGrantV1` bind warning code, exact entity IDs, tenant/site, candidate hash, reason, policy version, ผู้อนุมัติ authenticated สองคนที่ต่างกัน, issuedAt, expiresAt และ signature จาก `WARNING_EXCEPTION` authority เฉพาะ warning ที่ catalogue ระบุ `exceptionEligible=true` จึงสร้าง grant ได้ Hard blocker และ capability blocker ไม่ eligible ผู้ freeze และ release approver อาจเป็นผู้อนุมัติ grant สองคนนี้ได้ถ้าทั้งคู่ยืนยัน exception และเป็นคนละ user จึงไม่บังคับให้มีมนุษย์เพิ่ม Compiler และ verifier ต้อง reject grant ที่หมดอายุ, scope/hash/entity ไม่ตรง, signer purpose ไม่ trusted หรือ approver ซ้ำ การเปลี่ยน grant ทำให้ release authorization hash เปลี่ยน และการเปลี่ยน underlying input ทำให้ต้องออก candidate ใหม่

`CapabilityCompiler` ต้อง enumerate ทุก operation และคืน blocker เมื่อ:

- operation type ไม่รองรับ
- tool ID ไม่รู้จักหรือไม่ bound กับ machine profile
- parameter อยู่นอก range
- face/orientation/coordinate transform ไม่รองรับ
- postprocessor/profile version ไม่ตรง
- operation ถูก drop หรือ transformed โดยไม่มี normative rule

Builder ห้ามสร้าง partial packet Dialect เช่น CIX ต้องตรวจซ้ำและ fail แม้ upstream gate ผิดพลาด ห้าม default unknown tool เป็น `TNO=1` และห้ามเปลี่ยน unsupported operation เป็น warning

## 13. Error model

ทุก service boundary ใช้ typed `TrustResult<T>` และ stable reason-code registry

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

HTTP mapping: 401 ไม่มี verified human identity, 403 scope/role/SoD denied, 409 stale/CAS/idempotency conflict, 422 deterministic blocker, 503 transient signer/store dependency

Logs ห้ามบันทึก raw JWT, private key, full packet contents หรือ unnecessary PII UI, API, CI และ verifier ใช้ reason code เดียวกัน

## 14. Standalone offline verifier

Verifier รับเพียง:

1. FactoryPacket V3
2. `TrustBundleV1`
3. `ReleaseStatusBundleV1`
4. verifier policy/config ที่ pin ไว้
5. persistent verifier state ที่มี trusted bootstrap checkpoint และ per-scope high-water marks

Verifier ตรวจ:

- envelope/schema/version และ resource limits ก่อน parse ลึก
- path traversal, duplicate path, extra/missing file, decompression ratio และ maximum sizes
- per-file bytes/hash และ canonical manifest binding
- release certificate signature และ key/trust validity
- tenant/org/site, candidate, machine profile และ artifact-class binding
- release certificate ถูกต้อง และ release revision ไม่อยู่ใน revoked entries ของ status bundle ที่ยอมรับได้
- machine-profile attestation, release authorization hash และ warning-exception grant hashes ที่ bind ใน certificate
- trust/release bundle scope, signature, sequence, expiry, key-revocation mode, persistent high-water mark, bootstrap checkpoint, `maxOfflineStaleness` และ trusted clock policy
- gate and capability report hashes
- `NOT_FOR_PRODUCTION`/environment policy

ผลคือ `VerificationReportV1` ที่มี verdict, stable reason codes, checked hashes, bundle sequences, verifier build hash, `validAsOf`, freshness age/checkpoint และ human summary การแสดงคำว่า “currently active” ต้องมี online-current authority

ความเป็นอิสระต้องพิสูจน์ด้วย executable/package dependency graph แยกจาก builder การไม่ import อย่างเดียวไม่พอ ทั้งสอง implementation ต้องผ่าน normative protocol และ golden vectors เดียวกัน

## 15. Legacy migration and containment

### 15.1 Canonicalization-first migration

1. เพิ่ม tenant-aware Postgres authority และ contracts
2. ทำ client state เป็น projection ของ server
3. ย้าย packet construction ไป deterministic worker/V3
4. ทำ V1/V2 read-only history adapter
5. ปิด production-shaped downloads เดิมก่อนเปิด V3 shadow path
6. ลบ filesystem state authority หลัง migration evidence ผ่าน

### 15.2 Route disposition ledger

ทุก reachable build/export/download surface รวมถึง authority-input surfaces เช่น machine/profile schemas, tool libraries, hardware presets, gate policies, JWT/site helpers และ storage-signing routes ต้องอยู่ใน machine-readable ledger พร้อม owner, artifact class, current behavior, target disposition และ negative test:

- `REUSE`: pure non-authoritative primitive เช่น canonical hash helper
- `ADAPT`: implementation ที่นำมาใช้ภายใต้ V3 contract เช่น deterministic ZIP หลังเอา runtime time ออก
- `READ_ONLY`: V1/V2 history/inspection; สร้าง production-shaped output ไม่ได้
- `BLOCK`: client download, FROZEN manufacturing export, legacy direct CNC, duplicate state mutation หรือ route ที่ bypass authority

คำว่า “block or route” โดยไม่มีรายการครบถือว่าไม่ผ่าน Definition of Done

## 16. Verification and evidence design

### 16.1 Test layers

1. Contract/schema/version and reason-code tests
2. JWT, membership, verified-action-context, service-role misuse, SoD และ cross-tenant negative tests
3. State, CAS, idempotency, concurrency, revoke, artifact materialization และ fork tests
4. Machine-profile attestation, tool-library binding, capability compiler และ dialect defense-in-depth tests
5. Warning exception eligibility/scope/expiry/two-person negative tests
6. Canonicalization, property-based determinism และ mutation tests
7. Managed signing, trust, first-use checkpoint, expiry, rollback, staleness, key-mode และ revocation golden vectors
8. Hostile packet/ZIP/fuzz/resource-limit tests
9. Builder/verifier cross-implementation conformance
10. Two-person E2E release/revoke flow
11. P2 human-plaintext/raw-URL denial และ isolated-runner tests
12. Legacy route/authority-input bypass tests ครบทุก ledger entry รวม Daph compatibility และ tenant 002 coexistence

### 16.2 Golden corpus

Corpus ครอบคลุม canonical JSON edge cases, Unicode, decimals, units, representative cabinet/panel/connector operations, supported machine profiles, boundary ranges, unknown tool, unsupported operations, corrupt packets และ trust failures

แต่ละ determinism vector รันซ้ำอย่างน้อย 100 ครั้งบน Windows และ Linux ด้วย pinned runtime/lockfiles ผล canonical payload, signature envelope และ final packet ต้อง byte-identical 100% จำนวน repetition เป็น nondeterminism smoke; ความครอบคลุมหลักมาจาก representative corpus และ property-based permutations

### 16.3 Transaction chaos cases

- signer timeout/unavailable
- quarantine store success + DB failure
- DB commit response lost
- two approvers race
- candidate mutation after approval
- membership revoked mid-flow
- revoke racing with publication/download
- crash หลัง release commit ก่อน artifact materialization
- action context replay/expiry และ service-role RPC spoof
- P2 raw URL/token issued แล้ว revoke หรือ policy เปลี่ยน
- attempted offline queued release
- first-use verifier ไม่มี checkpoint และ stale-but-unexpired bundle
- cross-tenant object/hash guessing

ทุก case ต้องพิสูจน์ว่าไม่มี valid downloadable orphan, ไม่มี unauthorized state transition และ reason code ถูกต้อง

### 16.4 Evidence bundle

Evidence bundle แบบ self-verifying ประกอบด้วย:

- signed `evidence-manifest.json`, `EvidenceAttestationV1` และ root hashes
- Git state ของทั้งสอง roots: commit, branch, dirty files
- dependency lock hashes, OS/runtime/compression/signer profiles
- exact commands, exit codes, pass/fail/skip และ full machine-readable results
- golden inputs, expected bytes/hashes และ mutations
- standalone verifier binary/package hash และ conformance report
- E2E actor/approval/release/revoke audit evidence
- route disposition ledger และ negative results
- tenant isolation, hostile packet, trust freshness และ resource-limit reports
- packet/trust/release-status/evidence artifact hashes

`EvidenceAttestationV1` signed ด้วย CI/workload identity key ที่แยกจาก release key และ bind Git state ของทั้งสอง roots, exact command/report digests, CI run/workflow identity, builder/verifier binary hashes, issuedAt, retention policy และ evidence root hash Trust policy ต้องระบุ key owner, validity, rotation และ revocation ของ evidence key

CI artifact ต้องผูก exact commit และระบุ dirty state ห้ามสรุปว่า pass จาก log ที่ถูกตัดหรือ test ที่ถูก skip

## 17. Executive acceptance gates

### 17.1 Shadow Trust-Ready PASS

ต้องผ่านพร้อมกันทั้งหมด:

- Critical/negative trust gates ผ่าน 100%
- ไม่มี skipped trust/security test
- Route disposition ledger ครบ 100% ของ reachable production-shaped surfaces
- Cross-platform golden outputs byte-identical 100%
- Standalone verifier ผ่าน valid corpus และ reject mutation corpus ด้วย reason codes ที่กำหนด
- Two distinct authenticated humans ทำ freeze/approve/release E2E สำเร็จ
- Revoke, attempt/artifact VOID, stale candidate, action-context replay, membership revocation, service-role spoof และ cross-tenant attack ถูกพิสูจน์
- Profile attestation และ warning exception ถูก accept/reject ตาม scope, expiry, revocation และ distinct approvers
- Offline verifier ปฏิเสธ first-use ที่ไม่มี checkpoint, rollback และ bundle ที่เกิน `maxOfflineStaleness`
- P2 shadow artifacts อยู่ใน sealed quarantine; human plaintext/raw URL และ Factory/P3 access ถูก deny
- Daph tenant 001 และ tenant 002 อยู่ร่วมกันด้วย data/config โดยไม่มี hardcoded authority
- Evidence bundle self-verifies, ใช้ evidence key แยกจาก release key และผูก exact source/environment

### 17.2 Production/GA remains NO-GO

แม้ Shadow Trust-Ready ผ่าน ยังห้าม Production/GA จนกว่าจะมีงานแยกที่อนุมัติและพิสูจน์:

- production key ceremony/custody/rotation/recovery
- AAL2 production approval policy
- production operations, monitoring, backup/restore และ incident drills
- authorized factory pilot และ machine-specific safety acceptance
- P3 distribution authorization
- evidence ตรงกับ exact deployed build

## 18. Observability and governance

ทุก security/release event มี tenant scope, event ID, actor user ID, membership version, candidate/release revision, artifact hash, reason code และ correlation ID

ต้องมี metric/alert สำหรับ auth denials, SoD violations, stale candidates, capability blockers, signer/store failures, VOID artifacts, verifier failures, stale trust bundles, revoked-release access และ legacy blocked-route attempts

Audit events เป็น append-only และ export ได้ในรูปแบบ machine-readable การแสดง human name เป็นข้อมูลประกอบ ไม่ใช่ identity authority

## 19. Ownership

| Domain | Accountable owner |
|---|---|
| Identity, tenancy, RLS, signer custody, trust bundles | Security/IAM |
| Working/release lifecycle, SoD, exceptions, revocation | Release Governance |
| Operation semantics, capability profiles, machine ranges | Manufacturing Engineering |
| Deterministic builder, artifact storage, outbox/workers | Platform Engineering |
| Independent verifier, hostile corpus, evidence bundle | Independent QA/Safety |

Owner สามารถพัฒนา implementation ภายใน boundary ได้ แต่เปลี่ยน protocol/invariant ไม่ได้โดยไม่มี versioned decision และ migration

## 20. Risks and controls

| Risk | Control |
|---|---|
| V3 กลายเป็น stack เพิ่มอีกชุด | canonical authority, route ledger, no dual write, V1/V2 read-only |
| Signed orphan | unsigned quarantine, final bytes/hash สร้างใน memory, atomic certificate/release/artifact commit, publish after materialization |
| Cross-tenant leakage | tenant-bound FK/RLS/object paths/manifest and negative matrix |
| Service role ข้าม RLS/SoD | verified action context, DB recheck/nonce consumption และห้าม client-supplied authority fields |
| Profile ประกาศ capability เกินจริง | signed profile attestation, tool/postprocessor hashes, validity/revocation และ canonical adapter |
| Shadow artifact ถูกนำไปผลิต | sealed private P2, isolated automated verifier only, deny human plaintext/raw URL และ no Factory/P3 |
| Determinism claim เกินจริง | golden bytes, property tests, cross-platform runs, pinned packaging/signing profile |
| Verifier bugเหมือน builder | separate implementation graph + shared normative vectors, not shared implementation |
| Offline revocation stale | high-water mark, trusted bootstrap checkpoint, max staleness, monotonic sequence, trusted clock และ freshness-unproven = reject |
| Evidence signer กลายเป็น release authority | separate CI/workload evidence key และ trust policy แยก |
| Legacy bypass เหลืออยู่ | machine-readable inventory + negative test ต่อ surface |

## 21. Definition of Done for this design

แบบนี้พร้อมเข้าสู่ implementation planning เมื่อ:

- เอกสาร TH/EN และ HTML มีเนื้อหาตรงกัน
- ไม่มีข้อความค้างหรือการตัดสินใจที่กำกวม
- Architecture, component contracts, state, transaction, artifact policy, error model และ tests สอดคล้องกัน
- ผู้ใช้ตรวจ spec ที่เขียนแล้วและอนุมัติ

การอนุมัติ design นี้ไม่ใช่การอนุมัติ Production และไม่อนุญาตให้เปิด P3 distribution
