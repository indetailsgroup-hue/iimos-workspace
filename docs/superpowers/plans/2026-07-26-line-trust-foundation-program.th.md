# แผนโปรแกรม MONOLITH LINE Trust Foundation

**ฉบับ:** ภาษาไทย<br>
**วันที่:** 26 กรกฎาคม 2026<br>
**สถานะ:** ลำดับโปรแกรมได้รับรองจาก Written Design แล้ว; ยังไม่เริ่ม implementation<br>
**แบบระบบอ้างอิง:** `docs/superpowers/specs/2026-07-26-line-trust-foundation-design.th.md`<br>
**Product repository:** nested Git repository `determined-williams/`<br>
**Governance repository:** workspace root ชั้นนอก

## 1. ผลลัพธ์ระดับบริหาร

MONOLITH จะส่งมอบ LINE Trust Foundation เป็น 6 Wave ที่ตรวจรับแยกกันได้ ทุก Wave ต้องให้ซอฟต์แวร์ที่ทดสอบได้ มีหลักฐานสด มีขอบเขต rollback และมี commit ที่ตรวจได้โดยไม่บังคับให้ยอมรับ Wave ถัดไป

โปรแกรมนี้ไม่ใช่การขยาย customer messaging จริง Proof เชิงพาณิชย์แรกยังเป็น Tenant ที่สองใน shadow journey โดยปิด delivery

## 2. Program invariants ที่บังคับ

1. LINE ยังคงเป็น Human Surface ไม่ใช่ system of record หรือ authorization authority
2. Business resource ทุกชิ้นมี Owner Tenant เดียว
3. Daph เป็น pilot tenant หนึ่งรายและไม่ใช่เจ้าของ platform governance หรือ shared canonical data
4. องค์กรภายนอกร่วมงานผ่าน grant ที่จำกัดขอบเขต มีวันหมดอายุ และเพิกถอนได้
5. ผู้ใช้ LINE ที่ไม่รู้จักส่งได้เฉพาะ quarantined evidence
6. Action ความเสี่ยงสูงต้องผ่าน action-bound step-up
7. Delegation ต้อง explicit, bounded, revocable, non-transitive และไม่เพิ่มอำนาจ
8. `site_code` เป็น compatibility alias ระหว่าง migration และห้ามเป็น canonical tenant boundary
9. Business state, decision audit และ delivery intent ต้อง commit แบบ atomic
10. ห้าม Tenant-2 live messaging หรือขยาย customer messaging จนผ่าน release gate ทุกข้อ

## 3. การควบคุม Repository และการลงมือ

- ตรวจ parent และ nested Git root ก่อนทุก Wave
- อ่าน `CONTEXT.md` และเอกสารแก้ไขขอบเขต repository วันที่ 21 กรกฎาคม 2026 ก่อนกล่าวถึง maturity, runtime, migration หรือ readiness
- ทำแต่ละ Wave ใน isolated Git worktree ที่สร้างผ่าน `using-git-worktrees`
- รักษาการเปลี่ยนแปลงเดิมทั้งหมดใน Git root ทั้งสอง
- ใช้ `test-driven-development` กับทุก feature หรือ defect change
- ใช้ `verification-before-completion` ก่อนกล่าวว่า test, build, migration, release หรือ Wave ผ่าน
- ใช้ `requesting-code-review` เมื่อจบทุก Wave
- Project-facing Markdown ทุกฉบับต้องมี EN/TH และ standalone HTML ที่ตรงกัน
- ปิด live customer delivery ตลอด Wave 1–6

## 4. Dependency map

| Wave | Deliverable | ต้องมีมาก่อน | สิ่งที่เปิดทางให้ |
|---|---|---|---|
| 1 | Trust Kernel contracts, canonical tenant bridge และ shadow inbound observation | Approved design | ทุก policy/isolation decision ถัดไป |
| 2 | Unified LINE ingress และ dispatcher enforcement | หลักฐาน Shadow จาก Wave 1 | Webhook เดียวสำหรับ message, postback, group, room และ lifecycle events |
| 3 | LINE identity binding และ risk-based step-up | Wave 1–2 | Approval และ order ที่มีผลผูกพัน |
| 4 | Group authorization และ quarantined evidence | Wave 1–3 | Field evidence และ customer-group action ที่ปลอดภัย |
| 5 | Atomic outbox และ reliable LINE delivery | Wave 1–4 | Push/reply/group delivery ที่ retry ได้ |
| 6 | Tamper-evident audit, privacy lifecycle, Tenant-2 shadow proof และ release dossier | Wave 1–5 | คำตัดสิน go/no-go ของผู้บริหาร |

## 5. Wave 1 — Trust Kernel และ Shadow Ingress

**แผนลงมือ:** `docs/superpowers/plans/2026-07-26-line-trust-kernel-wave-1.th.md`

### Scope

- สร้าง canonical TypeScript decision contract
- เพิ่มโครงสร้าง Tenant, Organization, Site, profile, membership, grant, delegation และ mapping แบบ additive
- รักษาพฤติกรรม Daph ผ่าน compatibility bridge ที่ deterministic
- เพิ่ม policy-decision records และ default-deny decision RPC
- Observe LINE webhook ที่ตรวจ signature แล้วใน shadow inbox โดยไม่เปลี่ยน business outcome หรือส่งข้อความ
- สร้าง machine-readable shadow report

### Exit gate

- Policy contract tests ใหม่ผ่าน
- Database isolation และ mapping tests ผ่าน
- Existing Daph LINE tests ไม่เปลี่ยน หรือผ่านพร้อมการแก้ที่มีเหตุผลและผ่าน review
- Observed event ทุกตัว resolve Owner Tenant ได้หรือมี unresolved reason ชัดเจน
- Shadow observation สร้าง delivery intent เป็นศูนย์
- ยังไม่มีการเปิด enforcement

## 6. Wave 2 — Unified Ingress และ Dispatcher

### File boundary

- แก้ `supabase/functions/line-webhook/index.ts`
- แก้ `supabase/functions/approval-postback/index.ts` เป็น compatibility adapter ที่เรียก ingress contract เดียวกัน
- สร้าง `supabase/functions/_shared/line-oa/dispatcher.ts`
- สร้าง `supabase/functions/_shared/line-oa/dispatcher.test.ts`
- สร้าง `supabase/migrations/0165_line_trust_unified_ingress.sql` หลังยืนยันว่า Wave 1 ใช้ migration `0162`–`0164`
- เพิ่ม `tests/line-oa-commerce/py/test_unified_ingress_property.py`

### พฤติกรรมบังคับ

1. ตรวจ LINE signature บน raw body ก่อน parse
2. Resolve receiving channel และ Owner Tenant
3. บันทึก idempotent receipt
4. Claim processing พร้อม lease
5. Dispatch event type ที่รองรับทั้งหมดผ่าน registry เดียว
6. Mark `SUCCEEDED` หลัง domain, audit และ delivery-intent transaction commit เท่านั้น
7. บันทึก retryable failure เป็น `RETRYABLE`; ห้ามแปลง returned error value เป็น success
8. Reclaim stale lease ได้อย่างปลอดภัย
9. ปิด approval URL แยกใน LINE channel configuration

### Exit gate

- Message, postback, follow, join, leave, group, room และ unsupported event มี test outcome ชัดเจน
- Duplicate ที่ `SUCCEEDED` no-op
- Failed event เป็น retryable หรือ dead-letter ไม่ใช่ false success
- Approval postback ผ่าน unified dispatcher
- Daph regression evidence ผ่านก่อนเปิด enforcement

## 7. Wave 3 — Identity Binding และ Action-bound Step-up

### File boundary

- แก้ `supabase/functions/line-login/index.ts`
- สร้าง `supabase/functions/line-login/index.test.ts`
- สร้าง `supabase/functions/line-auth-start/index.ts`
- สร้าง `supabase/functions/line-auth-start/index.test.ts`
- สร้าง `src/pages/LineStepUpPage.tsx` และ component test
- แก้ `src/routes/index.tsx` เพื่อเพิ่ม authoritative step-up route
- สร้าง `supabase/migrations/0166_line_trust_identity_step_up.sql`
- เพิ่ม `tests/line-oa-commerce/py/test_identity_step_up_property.py`

### พฤติกรรมบังคับ

1. ออก server-side `state` และ OIDC `nonce` ที่เดาไม่ได้
2. ผูก exact redirect URI, tenant, profile, action digest, expected revision, expiry และ one-time token digest
3. Consume transaction แบบ atomic ก่อน identity binding หรือ session minting
4. Reject transaction ที่ขาด หมดอายุ ไม่ตรง replay callback-swapped หรือเคย consume แล้ว
5. แสดงผลกระทบที่แน่นอนก่อน confirmation
6. Invalidate transaction เมื่อ revision, amount, scope หรือ payload เปลี่ยน

### Exit gate

- State/nonce positive และ negative tests ผ่าน
- Replay และ callback swap fail closed
- High-risk action ให้ `STEP_UP` จน exact transaction ถูก consume
- Generic login session อนุมัติ action อื่นไม่ได้

## 8. Wave 4 — Group Authorization และ Quarantine

### File boundary

- สร้าง `supabase/functions/_shared/line-oa/group-action-classifier.ts`
- สร้าง unit test ของไฟล์นี้
- สร้าง `supabase/migrations/0167_line_trust_group_quarantine.sql`
- เพิ่ม `tests/line-oa-commerce/py/test_group_quarantine_property.py`
- เพิ่ม quarantine review surface ใต้ `src/pages/` ตาม route/component convention ปัจจุบัน

### พฤติกรรมบังคับ

1. Resolve group, owner tenant, project, organization party, human profile, membership, grants และ delegation แยกกัน
2. Group membership เป็น context เท่านั้น
3. เก็บรูปและ issue report จาก unknown actor เป็น quarantined evidence
4. Quarantined evidence เปลี่ยน workflow state ไม่ได้
5. Approval, acceptance, ordering, scope, price และ workflow transition ต้อง authorize exact action
6. บันทึก review, promotion, rejection, retention และ purge

### Exit gate

- Wrong group/project/tenant, spoofed source, expired grant และ transitive delegation ถูก deny
- Unknown actor evidence ถูกเก็บโดยไม่มี business mutation
- Authorized low-risk evidence ผูก Project ถูกต้อง
- High-risk group action ต้องใช้ Step-up จาก Wave 3

## 9. Wave 5 — Atomic Outbox และ Delivery Reliability

### File boundary

- แก้ `supabase/functions/line-outbound-sender/index.ts`
- ขยาย `tests/line-oa-commerce/ts/senderClaimAndRecord.integration.test.ts`
- สร้าง `tests/line-oa-commerce/ts/senderLeaseAndRetry.integration.test.ts`
- สร้าง `supabase/migrations/0168_line_trust_atomic_outbox.sql`
- เพิ่ม `tests/line-oa-commerce/py/test_atomic_outbox_property.py`

### พฤติกรรมบังคับ

1. บันทึก delivery intent ใน transaction เดียวกับ business state และ decision audit
2. Claim row แบบ atomic พร้อม owner, lease token และ lease expiry
3. ใช้ stable retry key หนึ่งค่าต่อ delivery intent สำหรับ LINE API ที่รองรับ
4. แยก success, duplicate acceptance, retryable failure, permanent failure และ unknown-after-send
5. ใช้ bounded backoff และ dead letter
6. Unknown-after-send ต้องผ่าน audited operator reconciliation
7. Result recording ล้มเหลวห้าม mark delivery ว่าสำเร็จ

### Exit gate

- Concurrent worker ครอง lease เดียวกันไม่ได้
- Crash-before-send และ crash-after-send reconcile ได้โดยไม่มี uncontrolled duplicate
- Tests สำหรับ `429`, `5xx`, permanent `4xx`, duplicate acceptance และ lease expiry ผ่าน
- Secret/access token ไม่อยู่ใน log, audit หรือ error detail

## 10. Wave 6 — Audit, Privacy, Tenant-2 Proof และ Release Dossier

### File boundary

- สร้าง `supabase/migrations/0169_line_trust_audit_privacy.sql`
- สร้าง `scripts/line-trust-shadow-report.mjs`
- สร้าง Vitest test ของสคริปต์
- เพิ่ม `tests/line-oa-commerce/py/test_audit_privacy_property.py`
- สร้าง runbook สองภาษาและ matching HTML ใต้ `docs/runbooks/line-trust-foundation/`
- สร้าง machine-readable release evidence ใต้ `artifacts/line-trust/`

### พฤติกรรมบังคับ

1. บันทึก transport actor, human principal, tenant profile, delegated-by principal, action, resource, revision, digest, policy version, assurance, decision, reason, causation, retention class และ data classification
2. มี digest chaining หรือ external immutable archive proof
3. Block secret, raw authorization code, bind token และ PII ที่ไม่จำเป็น
4. บังคับ retention, export, review, pseudonymization และ purge
5. สร้าง Tenant ที่สองใน non-live หรือ blocked-delivery environment
6. พิสูจน์ negative tenant isolation, scoped collaboration, revocation, expiry, step-up, retry, backup/restore, rollback และ operator recovery
7. Release dossier ต้องระบุ commit, migrations, configuration, tests, environment, evidence hashes, reviewers และ approvers

### Exit gate

- Release gate ทั้ง 10 ข้อใน approved design ผ่านด้วย fresh complete output
- Tenant-2 live delivery ยังปิด
- ไม่มี Critical/High finding ค้าง
- ผู้บริหารได้รับ go/no-go recommendation ชัดเจน; โปรแกรมห้ามเปิด production messaging เอง

## 11. Rollback Strategy

| Wave | Rollback boundary |
|---|---|
| 1 | ปิด shadow observer; เก็บ canonical tables และ mappings แบบ additive |
| 2 | กลับ legacy routing หลังยืนยันว่าไม่มี event ค้าง lease; เก็บ inbox records |
| 3 | ปิด step-up initiation และรักษา consumed transaction audit |
| 4 | ปิด governed group actions; เก็บ quarantined evidence ตาม retention policy |
| 5 | หยุด worker, expire lease, reconcile unknown-after-send แล้วจึงคืน sender เดิม |
| 6 | คง Tenant 2 ในสถานะ blocked และเก็บ release evidence; ไม่มี live state ต้องย้อน |

Rollback ห้ามลบ audit หรือหลักฐานที่จำเป็นต่อการอธิบาย action ที่เกิดแล้ว

## 12. Program Decision Gates

เมื่อจบแต่ละ Wave Owner เลือกหนึ่งทาง:

- **Proceed:** Exit criteria ผ่านพร้อม complete evidence
- **Remediate:** Scope เดิม; failed evidence มี owner และ correction
- **Stop:** ปิด runtime path ใหม่และเก็บหลักฐาน
- **Redesign:** กลับ brainstorming เมื่อ invariant หรือ architecture ที่อนุมัติต้องเปลี่ยน

ห้ามเดินหน้าด้วยคำว่า “น่าจะผ่าน” partial output หรือ source inspection อย่างเดียว

## 13. Execution Handoff

Program plan นี้อนุญาต Implementation เฉพาะ Wave 1 เท่านั้น Wave 2–6 ต้องมี agentic plan ของตัวเองและผ่าน review ก่อนแก้โค้ด

โหมดแนะนำสำหรับ Wave 1 คือ `subagent-driven-development`; ถ้าทำใน session เดียวให้ใช้ `executing-plans` ทั้งสองแบบต้องเริ่มจาก isolated worktree และรักษา dirty repositories ปัจจุบัน
