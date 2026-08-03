# การออกแบบ MONOLITH Section 4: Safe Recovery & Proof

**สถานะ:** OWNER DECISION — รวม visualization pre-build corrections แปดข้อที่อนุมัติเมื่อ 3 สิงหาคม 2026 แล้ว; bounded consistency re-scrutinize ผ่านโดยไม่มี blocker

**ทิศทางผลิตภัณฑ์:** Decision Chain UX

**วัตถุประสงค์ของ Section:** กักความล้มเหลว รักษาอำนาจ กู้คืนอย่างปลอดภัย และพิสูจน์ความพร้อมก่อนกลับมาทำงานต่อ

**ขอบเขตแรก:** แพ็กเกจงานครัวและ casework ในโหมด shadow / NOT-FOR-PRODUCTION

## 1. สรุปการตัดสินใจ

Section 4 จะไม่แสดง Failure Handling, Governance และ Testing Gates เป็นสามผลิตภัณฑ์แยกกัน แต่จะกำหนด **Safe Recovery Model** กลางหนึ่งชุด **Capability Qualification Policy** หลังบ้านหนึ่งชุด และ **Egress Broker** ที่เป็นของ server หนึ่งชุด

ลำดับ runtime คือ:

`Detect → Contain → Explain → Assign → Recover → Re-verify → Resume / Retire`

ผู้ใช้เห็น `RecoveryCase` ปัจจุบันหนึ่งรายการ ได้แก่ การกระทำถัดไปที่ปลอดภัยที่สุด ผู้รับผิดชอบ revision ล่าสุดที่ปลอดภัย ผลกระทบ และ permitted use ส่วน MONOLITH บันทึก `RecoveryEvent` แบบ append-only และ `DecisionReceipt` ที่ immutable และเฉพาะวัตถุประสงค์ พร้อมจัดการ invalidation, dependency propagation, retry, reconciliation, notification และการรวบรวมหลักฐานหลังบ้าน

สถานะที่ล้มเหลว เก่า ขัดแย้ง ไม่มีอำนาจ ยังไม่ตรวจ หรือมี coverage ไม่ครบ จะเดินหน้าต่ออย่างเงียบ ๆ ไม่ได้ “ไม่พบ failure” ไม่เท่ากับ “มีหลักฐานที่บังคับครบแล้ว”

## 2. เจตนาและเงื่อนไขความสำเร็จ

Section นี้ต้องทำให้คำมั่นต่อไปนี้เป็นจริง:

> เมื่อบางอย่างล้มเหลว MONOLITH จะกักผลกระทบ รักษา revision ล่าสุดที่ปลอดภัย ระบุเจ้าของการกู้คืน และพิสูจน์ control ที่บังคับใหม่ก่อนอนุญาตให้ทำงานต่อ

ความสำเร็จไม่ใช่ dashboard ความปลอดภัยที่สวยงาม แต่เป็นเส้นทางที่บังคับใช้ได้จริง ซึ่ง:

1. failure ผูกกับ exact revision และ affected scope;
2. unsafe effect ถูกหยุดที่ boundary ที่ถูกต้อง;
3. ผู้มีอำนาจที่ระบุชื่อเป็นเจ้าของการตัดสินใจถัดไป;
4. recovery ทำซ้ำได้อย่างปลอดภัย สังเกตสถานะได้ และย้อนกลับได้เมื่อเหมาะสม;
5. หลักฐานบังคับครบ ใหม่ และตรง scope;
6. การ reopen หรือ retire สร้าง immutable receipt;
7. ไม่มี export, API, worker, cache, USB หรือ offline path อื่นหลบการตัดสินใจชุดเดียวกันได้

## 3. ทางเลือกที่พิจารณา

### A. Patch `FailureReceipt` ที่ทำหลายหน้าที่ — ไม่เลือก

การใช้ออบเจ็กต์เดียวเป็นทั้ง recovery state ที่เปลี่ยนได้และ immutable proof ทำให้ lifecycle ขัดกัน และผลักให้ทุก subsystem เพิ่ม field ลงใน record เดียว

### B. สร้าง universal governance platform ใหม่ — ไม่เลือก

Incident, workflow, policy, evidence และ export platform แบบทั่วไปจะสร้างของซ้ำกับ workflow, approval, audit, release และ policy primitives ที่มีอยู่มากแล้ว และเกินขอบเขต V1

### C. Split recovery model พร้อม capability gate — อนุมัติ

`RecoveryCase` เป็น current projection ส่วน `RecoveryEvent` และ `DecisionReceipt` เป็น append-only proof ขณะที่ `CapabilityPolicy` ตัดสิน authority และ evidence และ `EgressBroker` เป็น controlled path เดียวสำหรับ production-usable หรือ qualification output นำ approval, quorum, idempotency, audit, release และ policy primitives เดิมมาใช้เป็นจุดตั้งต้นทางความหมาย แต่ไม่ถือว่าเป็น production authority ปัจจุบัน

Deep research เรื่อง beloved-safe-recovery เป็นหลักฐานและ UX appendix ของ Section นี้ ไม่ใช่ normative architecture layer ใหม่ มุมมองตามบทบาทเป็น derived projection จาก `RecoveryCase`, events, receipts, policy และ broker result ที่มีอยู่ สเปกนี้ **ไม่** สร้าง “Recovery Presentation Contract” ที่ persist แยกต่างหาก ไม่สร้าง recovery source of truth ชุดที่สอง และไม่เพิ่ม lifecycle state

## 4. ขอบเขตและสิ่งที่ไม่ทำ

### รวมใน Section นี้

- failure classification และ containment;
- `RecoveryCase` projection ของ current state;
- `RecoveryEvent` แบบ append-only และ `DecisionReceipt` ที่ผูก exact revision;
- recovery ownership และ next-action routing;
- authority และ separation-of-duty evaluation;
- retry, idempotency, reconciliation และ compensation semantics;
- การตัดสินใจ HOLD, REVOKE, SUPERSEDE, RETIRE และ RESUME;
- การเชื่อม capability กับ control-claim evidence พร้อม cardinality, freshness และ minimum evidence level;
- permitted-use classes สำหรับ preview, shadow simulation, qualification และ production;
- server-owned egress brokering, inventory และ no-bypass enforcement;
- shadow-machine qualification evidence;
- recovery UX ที่เหมาะกับแต่ละบทบาท

### ไม่รวมอย่างชัดเจน

- autonomous approval, waiver, release หรือ incident closure;
- การควบคุม spindle, motion หรือ cycle start ของเครื่องโดยตรง;
- general workflow builder;
- project-level confidence หรือ safety score แบบรวม;
- automatic regulatory หรือ professional sign-off;
- การประกาศ production readiness จากการมี source, unit test ที่ผ่าน หรือ schema validation เพียงอย่างเดียว;
- การเปิด Interior Architecture Domain Pack กว้าง ๆ ก่อนที่แต่ละ pack จะผ่าน qualification ของตนเอง

Section นี้ยังไม่ ratify tenant / organization / site schema โดย authority model ดังกล่าวเป็น prerequisite ของ canonical recovery persistence และยังเป็น governance decision แยกต่างหาก

## 5. ขอบเขต Repository และ Current State

Parent repository เป็น governance/bootstrap root ส่วน `determined-williams/` nested repository เป็น active product source มี release, gate, audit, verification และ factory code จำนวนมาก แต่ implementation ที่มองเห็นในปัจจุบันยังมี abstraction หลายเส้นทาง governance store แบบ local-only เอกสารทดสอบเชิงเป้าหมาย และ route ที่ยังไม่สมบูรณ์

สเปกนี้จึงแยกประเภทดังนี้:

- **TARGET CONTROL:** สิ่งที่สเปกนี้กำหนดให้ต้องมี;
- **VERIFIED SOURCE FACT:** สิ่งที่ source ปัจจุบันรองรับโดยตรง;
- **TEST EVIDENCE:** หลักฐานจาก executable check ที่ผูกกับ commit;
- **OPERATIONAL EVIDENCE:** หลักฐานจาก shadow, coupon, first article หรือการปฏิบัติงานจริงที่สังเกตได้;
- **UNKNOWN:** สิ่งที่หลักฐานที่มีอยู่ยังพิสูจน์ไม่ได้

สเปกนี้ไม่ประกาศว่า production-ready และไม่ปิด NOT-FOR-PRODUCTION controls

## 6. Safe Recovery Model

Model แยก current state ออกจาก immutable proof อย่างชัดเจน Receipt จะไม่เปลี่ยน และ case ที่แก้ไขได้จะไม่ถูกนำเสนอว่าเป็น proof

### 6.1 ออบเจ็กต์ที่แยกขอบเขตชัดเจนสี่ประเภท

#### `RecoveryCase` — current projection ที่เปลี่ยนได้

| Field | ข้อกำหนด |
| --- | --- |
| `caseId` / `schemaVersion` | identity ไม่ซ้ำทั้งระบบและ schema version ที่ชัดเจน |
| `failureClass` / `riskClass` | กลไกความล้มเหลว และความเสี่ยง LOW, MEDIUM, HIGH หรือ CRITICAL โดยเป็นคนละมิติ |
| `detectedAt` / `detectedBy` | timestamp ที่เชื่อถือได้และ human/system source ที่ resolve แล้ว |
| `authorityScopeRef` | versioned tenant / organization / site authority reference; ห้ามอนุมานจาก UI state หรือ hard-code เป็น `site_code` |
| `projectId`, `packageId`, `revisionId`, `capabilityId` | project, work package, immutable revision และ controlled capability ที่ได้รับผลกระทบอย่างเจาะจง |
| `affectedClaims` / `impactTargets` | claim dependency edges และทุก order, part, export, person, endpoint, machine, cache หรือ offline copy ที่ต้อง containment |
| `lastSafeState` | exact revision และ scope ที่ permitted use ยังใช้ได้ โดยต้องระบุ unaffected scope อย่างชัดเจน |
| `invalidatedReceiptIds` | purpose-specific receipts ที่ใช้ต่อไม่ได้ |
| `assignmentRequest` / `assignmentAcceptance` | ผู้รับที่ร้องขอ เวลาที่ร้องขอ หลักฐาน delivery/acknowledgement รูปแบบและเวลาการยอมรับ deadline และ auto-assignment policy ที่เกี่ยวข้อง โดย request ไม่เท่ากับ acceptance |
| `owner` / `escalationOwner` | recovery owner ที่ยอมรับงานแล้ว หรือ owner ที่เกิดจาก authoritative auto-assignment policy อย่างชัดเจน พร้อม escalation authority โดย governed service ทำงานได้แต่แทน human authority ที่บังคับไม่ได้ |
| `primaryNextAction` | primary action หนึ่งรายการในภาษาคน พร้อม secondary actions แบบ progressive disclosure |
| `capabilityPolicyRef` | policy ID และ version ที่กำหนด authority, proof, acknowledgement และ permitted use |
| `expectedVersion` / `fencingToken` | optimistic concurrency version และ token ที่ป้องกัน worker/device เก่า reopen capability |
| `state` | DETECTED, CONTAINED, ASSIGNED, RECOVERING, REVERIFYING, RESUMED, RETIRED หรือ SUPERSEDED |
| `relatedCaseIds` | ความสัมพันธ์แบบ duplicate, parent, child, recurrence หรือ superseding case |

#### `RecoveryEvent` — lifecycle fact แบบ append-only

ทุก transition ที่ยอมรับสร้าง immutable event ซึ่งมี `eventId`, `caseId`, event type, trusted time, resolved actor หรือ governed service, expected/resulting case versions, command idempotency key, correlation/causation IDs, policy reference, payload digest และ audit-chain anchor การตรวจ duplicate ใช้การ link events หรือ cases และห้าม overwrite observation แรกอย่างเงียบ ๆ

#### `DecisionReceipt` — immutable proof เฉพาะวัตถุประสงค์

ทุก consequential human หรือ governed-service decision สร้าง receipt ใหม่ที่ immutable โดยมี exact revision, capability, purpose, scope, evidence snapshot และ digests, unchecked scope, conditions, consequences, resolved signer identities, authority assignments, separation-of-duty result, policy version, decision, timestamp และ previous-receipt chain anchor การ supersede หรือ invalidate receipt ต้องสร้าง receipt ใหม่และคงต้นฉบับไว้

#### `CapabilityPolicy` และ `EgressGrant` — อำนาจในการลงมือทำ

`CapabilityPolicy` map action, incident class, risk, permitted-use class, authority set, separation rules, mandatory control claims, expected evidence cardinality, minimum evidence level, freshness, containment acknowledgement และ allowed egress ส่วน `EgressBroker` ออก `EgressGrant` ที่อายุสั้น ผูก purpose และโอนไม่ได้ เฉพาะเมื่อ policy ผ่าน

### 6.2 State machine ชุดเดียว

| จาก | ไป | Minimum precondition | Immutable output |
| --- | --- | --- | --- |
| ไม่มี | DETECTED | Detection ผ่าน deduplication และผูก exact scope/revision | detection event |
| DETECTED | CONTAINED | ปิด capability; ค้นพบ impact targets แล้ว หรือระบุ UNKNOWN และ fail closed | containment event |
| CONTAINED | ASSIGNED | ผู้รับที่ระบุชื่อยอมรับ assignment แล้ว หรือ incident policy บันทึก authoritative auto-assignment; มี authority scope, deadline และ escalation path | assignment-accepted หรือ auto-assigned event |
| ASSIGNED | RECOVERING | Recovery command ผ่านอนุมัติ พร้อม idempotency key และ expected case version | recovery-start event |
| RECOVERING | REVERIFYING | Reconcile recovery effects แล้วและไม่มี prepared effect ที่คลุมเครือ | recovery-complete event |
| ASSIGNED, RECOVERING หรือ REVERIFYING | CONTAINED | Impact ที่พบใหม่ invalidate recovery/proof ที่ stale และ capability ยังปิดอยู่ | containment-expansion event |
| REVERIFYING | RESUMED | CapabilityPolicy ผ่านบน exact recovered revision และ acknowledgement threshold/authority quorum ครบ | resume DecisionReceipt |
| REVERIFYING | RETIRED | Qualified authority ปิด capability หรือ branch ถาวร | retirement DecisionReceipt |
| REVERIFYING | SUPERSEDED | มี replacement identity และ evidence chain โดยของเดิมยังใช้ไม่ได้ | supersede DecisionReceipt |

`EXPLAIN` เป็นหน้าที่การนำเสนอที่มีในทุก state ไม่ใช่ persistent state และไม่มี lifecycle value ชื่อ `OPEN` Failure ใหม่หลัง terminal state ต้องสร้าง `RecoveryCase` ใหม่ที่เชื่อมกัน ห้าม reopen terminal case หากพบ impact ใหม่ก่อน terminal disposition ให้กลับไป CONTAINED ผ่าน event ใหม่และ invalidate recovery work ที่ stale

Assignment request ทำให้ case คงอยู่ที่ CONTAINED ส่วน requested, delivered, read, accepted, rejected, expired และ policy-auto-assigned เป็น `RecoveryEvent` facts ที่แยกกัน โดยไม่เพิ่ม state ที่เก้า Assignment acceptance ยังต่างจาก containment acknowledgement: อย่างแรกกำหนดว่าใครเป็นเจ้าของ recovery ส่วนอย่างหลังพิสูจน์ว่า impact target หนึ่งถูกหยุดหรือ isolate แล้ว

### 6.3 ความครบถ้วนของ Containment

แต่ละ `ImpactTarget` มี target type, exact identity, required action, required acknowledgement mode, lease หรือ policy expiry, status, last attempt และ acknowledgement evidence ห้าม Resume จนกว่า threshold ใน CapabilityPolicy จะผ่าน Incident ด้าน safety, security, integrity, revocation และ production egress ต้อง acknowledgement ครบ 100% หรือมี documented physical isolation ที่ incident-specific authority อนุมัติ โดย UNKNOWN ไม่ใช่ความสำเร็จ

## 7. Failure Classes และ Default Containment

`failureClass` อธิบายกลไก ส่วน `riskClass` กำหนดความเร่งด่วนและความเข้มของ control โดยไม่มี failure class ใดบังคับ risk level เดียวตายตัว ตารางนี้กำหนด containment ขั้นต่ำเท่านั้น ส่วน CapabilityPolicy เป็นผู้ resolve authority และ proof สุดท้ายของ capability ที่ได้รับผลกระทบ

| Failure class | ตัวอย่าง | Default containment | Authority input ที่บังคับ |
| --- | --- | --- | --- |
| Evidence | ไม่มี site dimension, supplier specification เก่า | Block WIP หรือ review candidate ไว้ | Evidence owner พร้อม reviewer |
| AI proposal | inference ไม่มีหลักฐาน, propagation ไม่ถูกต้อง | ทิ้งหรือกัก proposal; canonical revision ไม่เปลี่ยน | Designer |
| Concurrency | version conflict, partial write, duplicate command | Abort transition และ reconcile prepared effects | Transaction/recovery service |
| Authority | assignment หมดอายุ, self-approval, scope ผิด | ปฏิเสธ action และรักษา state เดิม | Governance owner |
| Verification | report หาย เก่า ซ้ำ หรือ FAIL | กัก release candidate | Qualified verifier |
| Release | signature, manifest, machine profile หรือ egress ไม่ตรง | ปิด production egress ทั้งหมด | Authorized releaser พร้อม factory authority |
| Post-release | พบ defect หรือ input เปลี่ยนหลัง ACTIVE | HOLD หรือ REVOKE ทันที และระบุ copies/orders ที่ได้รับผลกระทบ | Incident commander / revocation authority |
| Infrastructure | offline, timeout, signer/store ใช้งานไม่ได้ | read-only หรือ queued capture เท่านั้น; ห้าม release | Service owner |
| Security | key compromise, cross-tenant access, audit ถูกแก้ | เพิกถอน capability และ keys พร้อม isolate scope | Security authority |

## 8. ความน่าเชื่อถือของ Transaction และ Effect

“Atomic Commit” เป็น target control และห้ามอ้างจาก sequential writes

ทุก consequential transition ใช้:

1. canonical transaction เดียวที่บันทึก RecoveryEvent, advance RecoveryCase projection และบันทึก effect intent พร้อมกัน;
2. stable idempotency key ที่ scope ตาม resolved actor/service, command, case, capability และ expected revision;
3. expected case version, expected project revision และ fencing token ก่อน mutation;
4. outbox/effect ledger สำหรับ downstream work;
5. retry ที่กำหนด ceiling และ expiry;
6. reconciliation เมื่อผลลัพธ์จาก provider คลุมเครือ;
7. compensation เฉพาะเมื่อ original effect ทำ atomic ไม่ได้;
8. immutable event สำหรับทุก retry, compensation, acknowledgement หรือ terminal failure

Effect lifecycle ขั้นต่ำคือ `PREPARED → COMMITTED` หรือ `PREPARED → ABORTED` และ reconciler ต้องตรวจพบและจัดการ prepared records ที่ค้างจาก process failure โดย fencing token ต้องปฏิเสธ worker/device ที่ stale ผู้ใช้ต้องไม่ถูกบังคับให้เดาว่าการกดหนึ่งครั้งสำเร็จหรือไม่

### 8.1 เจตนาของ Notification และความหมายของ Acknowledgement

Notification เป็น derived effect ไม่ใช่ authority หรือ lifecycle state การ routing ต้อง resolve risk, actor capability, required response, deadline และ acknowledgement mode ให้เป็นสี่ intent:

| Intent | ใช้เมื่อ | Default delivery |
| --- | --- | --- |
| Immediate interruption | การผลิต/ปล่อยงานที่ไม่ปลอดภัยใกล้เกิดขึ้น, critical containment acknowledgement ที่บังคับ หรือ authority action เร่งด่วน | ส่งเฉพาะบทบาทที่ระบุชื่อและ escalation path ปัจจุบัน |
| Action queue | Correction, review, assignment acceptance หรือ evidence task ที่ต้องทำแต่ไม่เป็นอันตรายทันที | Queue ของบทบาทที่รับผิดชอบพร้อม due time |
| Digest | Dependency หรือ coordination update ที่ไม่เร่งด่วน | Digest ตามเวลาของบทบาท |
| Activity log only | Routine retry, autosave, diagnostic หรือ transient event ที่แก้แล้วและไม่ต้องการ human response | Audit/activity record ที่ค้นได้ โดยไม่รบกวน |

Failure ที่เกี่ยวข้องกันต้อง deduplicate เป็น current case เดียวและ current owner เดียว คำว่า “FYI” ไม่เพียงพอให้รบกวนทั้งกลุ่ม Delivery, read, assignment acceptance และ containment acknowledgement เป็น immutable events คนละรายการและห้ามอนุมานแทนกัน Notification และ workflow-handoff helpers ปัจจุบันเป็น semantic starting points เท่านั้น และยังไม่ conform จนกว่าจะ implement และทดสอบ intent/acknowledgement rules เหล่านี้

## 9. Governance และ Authority

### 9.1 Authority เป็นของ Server

UI role label, ปุ่มที่ซ่อน, local state, email link และ chat identity ไม่ใช่ permission ฝั่ง server ต้องประเมิน actor, authority assignment, scope, purpose, exact revision, validity window และ separation-of-duty policy ตอน commit

### 9.2 Authority Moments

| Decision context | Required authority set | Separation rule |
| --- | --- | --- |
| Accept client concept | Client decision authority | ห้ามสื่อว่าเป็น technical หรือ fabrication approval |
| Confirm design intent | Assigned designer | คนเดียว release งานตนเองไป production ไม่ได้ |
| Record technical disposition | Qualified independent reviewer | Critical claims ใช้ independent-first |
| Confirm priced BOM basis | Commercial authority | อนุมัติ geometry หรือ machining ไม่ได้ |
| Confirm manufacturing translation | Factory engineer | เปิด production egress คนเดียวไม่ได้ |
| Commit ACTIVE manufacturing release | Qualified reviewer หรือ factory-translation authority **พร้อม** Authorized Releaser | ต้องเป็น verified humans สองคนที่ต่างกัน |
| HOLD | Authorized safety role คนใดก็ได้ | One-person fail-safe action ทันที ต้องระบุเหตุผลและ scope |
| REVOKE | Incident-specific revocation authority | Fail-safe action ทันที ปิด production egress โดยไม่รอ resume quorum |
| Resume หลัง manufacturing หรือ professional-safety incident | Qualified independent reviewer หรือ factory-translation authority **พร้อม** Authorized Releaser | สองบุคคลต่างกัน พร้อม fresh exact-revision evidence |
| Resume หลัง security, key, tenancy, audit-integrity หรือ tampering incident | Security Authority **พร้อม** Authorized Releaser | สองบุคคลต่างกัน และ identity/key ที่ได้รับผลกระทบห้ามเข้าร่วม |
| Resume หลัง infrastructure incident ที่เปิด production egress ได้ | Service Owner **พร้อม** Authorized Releaser | สองบุคคลต่างกัน พร้อม effect ledger ที่ reconcile แล้ว |

Self-approval, authority หมดอายุ, scope mismatch, บุคคลเดียวใช้สอง role ที่ขัดกัน, identity ที่ตรวจไม่ได้ หรือ identity ที่ได้รับผลจาก incident ต้อง fail closed

ในสเปกนี้ **high risk** หมายถึง action ใดก็ตามที่สร้างหรือเปิด production-usable egress หรือ resume capability หลัง safety, security, tenancy, audit-integrity, key, tampering หรือ revocation incident โดย CapabilityPolicy ต้องเลือกคู่ authority ที่ตรง incident จากตาราง ห้ามใช้ generic reviewer/factory แทน Security Authority ส่วน HOLD และ REVOKE เป็น one-person fail-safe action สำหรับ incident-specific role ที่ authorized ขณะที่ RESUME ต้องสร้าง DecisionReceipt ใหม่เสมอและห้าม reuse approval/release receipt เดิม

### 9.3 Audit และ Revocation

Canonical audit และ revocation registry ต้องเป็น append-only, server-owned, tenant-scoped และ tamper-evident Local storage ใช้ cache signed policy snapshots ได้ แต่สร้าง ล้าง หรือ override canonical authority ไม่ได้

Offline enforcement ต้องมี:

- signed monotonic policy version;
- issued-at และ expires-at timestamps;
- อายุ policy สูงสุดที่ยอมรับได้;
- machine และ tenant scope ที่ชัดเจน;
- fail-closed เมื่อ policy หาย ไม่ถูกต้อง หรือเก่า;
- reconciliation ก่อน resumed controlled egress

### 9.4 Prerequisite ของ Authority Scope

Canonical recovery persistence พึ่งพา tenant / organization / site authority model ที่ ratify แล้ว ก่อน decision และ migration ดังกล่าวผ่าน denial-path tests ของตนเอง สเปกนี้ใช้ versioned `authorityScopeRef` contract และห้าม hard-code `site_code` เป็น permanent tenant boundary ห้ามอนุมาน multi-tenant safety claim จาก presentation layer หรือการมี source field เพียงอย่างเดียว

## 10. Capability Qualification Policy

ทุก controlled action ต้อง resolve versioned CapabilityPolicy หนึ่งรายการก่อนทำงาน Policy จะ executable ได้เมื่อระบุ capability, action, incident class, permitted-use class, authority set, control claims, expected evidence cardinality, minimum evidence level, freshness, acknowledgement threshold และ allowed egress อย่างครบถ้วน คำบรรยายว่า evidence “ครบ” ไม่ถือเป็น Gate

### 10.1 Control-claim Catalog

| Claim ID | Control claim | Minimum executable evidence | Operational evidence | Failure consequence |
| --- | --- | --- | --- | --- |
| `CC-ATOMIC` | Commit เป็น all-or-nothing | Failure injection ทุก write boundary; crash recovery; fenced idempotent replay | Recovery drill | ปิด release capability |
| `CC-COVERAGE` | Evidence coverage ครบ | Expected-versus-observed cardinality, scope, freshness, duplicate, missing และ UNKNOWN tests | Seeded-defect trial | Candidate อยู่ใน quarantine |
| `CC-SOD` | Separation of duties ใช้ได้จริง | Property tests ครอบคลุม actor, role, expiry, scope, affected identity และ self-approval | สังเกต shadow approvals | ปฏิเสธ commit |
| `CC-REVOKE` | Revocation กระจายถึงปลายทาง | ทดสอบ offline stale policy, key compromise, cache, fencing และ clock boundary | Revocation exercise ทุก registered endpoint | ปิด egress |
| `CC-EGRESS` | ไม่มี export bypass | Broker contract tests, unregistered-egress build/runtime denial และ static scan | สังเกต external channel | Block release และเปิด incident |
| `CC-MACHINE` | Package ตรงเครื่องและ purpose | Manifest, checksum, unit, origin, postprocessor, tool, geometry envelope, machine profile และ permitted-use tests | Simulation, supervised coupon แล้วจึง first article | ห้ามใช้กับเครื่อง |
| `CC-RECOVERY-UX` | Recovery ใช้งานได้ | Role E2E tests ตั้งแต่ detect-to-resume และ detect-to-retire | Facilitated pilot แยกทุกบทบาท | ออกแบบ recovery UX ใหม่ |

### 10.2 ระดับหลักฐาน

- **E0 — Executable source evidence:** unit, property, model-based, contract, integration, security และ failure-injection results ที่ผูก commit และ environment
- **E1 — Shadow operational evidence:** โครงการจริงแต่ไม่มี production authority พร้อม defect adjudication โดยผู้เชี่ยวชาญอิสระ
- **E2 — Qualified factory evidence:** simulator, supervised bounded coupon, first article, machine profile ที่ระบุชื่อ, postprocessor ที่อนุมัติ และ operator procedure
- **E3 — Sustained operational evidence:** monitored field performance, incidents, false-negative/positive review, recovery drills และ expiry/requalification

E0 ไม่ได้แปลว่า E2 หรือ E3 Domain Pack จะได้เฉพาะ capability ที่ระดับหลักฐานปัจจุบันรองรับ

### 10.3 Minimum Action Policies

| Action | Permitted-use class | Minimum policy result |
| --- | --- | --- |
| Client/design preview | PREVIEW | Exact revision และ visible non-production status โดยไม่มี machine-executable artifact |
| Shadow simulation | SHADOW_SIMULATION | E0 สำหรับ claims ที่เกี่ยวข้อง; sandboxed non-machine endpoint; output เลื่อนระดับด้วยการ rename ไม่ได้ |
| Qualification coupon | QUALIFICATION_COUPON | Relevant E0 พร้อม supervised E1, bounded coupon geometry, named machine/operator, single-purpose grant และแยกกายภาพจาก production queue |
| First article | QUALIFICATION_FIRST_ARTICLE | Coupon ผ่าน; ระบุ revision, postprocessor, machine profile, operator procedure, independent disposition และ restricted grant |
| ACTIVE production release | PRODUCTION | Machine/purpose-specific claims ถึง E2 และ mandatory claim อื่นถึง policy-defined level พร้อม incident-specific authority quorum, required containment acknowledgement 100% หรือ signed not-applicable result และ brokered egress |
| Production resume | PRODUCTION | Fresh evidence บน recovered exact revision; ไม่ reuse receipt; incident-specific quorum และ fencing token ใหม่ |

CapabilityPolicy ที่นำไปใช้จริงต้องแทนคำว่า “relevant” และ “mandatory” ด้วย claim IDs, expected counts, freshness windows, scope match และ expiry ที่ชัดเจนก่อน activate policy

### 10.4 Gate Evaluation

Gate resolve exact policy, คำนวณ expected claim set และ join เฉพาะ evidence ที่ตรง build, policy, adapter, machine profile, authority scope, package และ revision จากนั้นปฏิเสธ evidence ที่ missing, duplicate, stale, mismatched, cancelled, quarantined หรือ UNKNOWN แล้วจึงตรวจ minimum evidence levels, authority quorum, separation of duties, containment acknowledgement และ permitted use ก่อนออก EgressGrant หาก expected หรือ observed mandatory set ว่างต้อง fail เว้นแต่ policy ประกาศ claim นั้นว่า not applicable อย่างชัดเจนพร้อม signed rationale

## 11. Testing Gates

### 11.1 กลุ่มการทดสอบบังคับ

1. Unit และ property tests สำหรับ invariants และ boundary values
2. Model-based state-machine tests สำหรับทุก legal/illegal transition, terminal-case immutability, recurrence, duplicate detection และ return-to-CONTAINED behavior
3. Contract tests สำหรับ RecoveryCase projections, RecoveryEvent entries, DecisionReceipt records, UI, API, worker, server และ external adapter
4. Concurrency, fencing และ idempotency tests รวม duplicate, reordered, delayed และ stale-device delivery
5. Failure-injection tests ทุก persistence, signing, audit, notification, acknowledgement, policy, broker และ export boundary
6. Seeded-defect tests สำหรับ stale revision, empty/missing/duplicate evidence, contradictory dimensions, unsupported inference, wrong hardware/material และ post-review change
7. Authority tests สำหรับ denial, expiry, scope, self-approval, incident-affected identity และทุก two-person pairing
8. Offline และ revocation tests รวม stale cache, missing policy, fencing-token mismatch และ clock skew
9. Egress-bypass tests ครอบคลุม browser download, API, server, worker, object URL, cache, USB package, scripts, integrations, generated artifacts และ legacy paths
10. Permitted-use tests ที่พิสูจน์ว่า preview, shadow, coupon และ first-article artifacts เปลี่ยนเป็น production ด้วยการ copy, rename, replay หรือ policy downgrade ไม่ได้
11. Role-specific E2E และ accessibility tests ภาษาไทยและอังกฤษบน desktop และ mobile widths ที่บังคับ
12. Shadow simulation, supervised bounded coupon และ first-article qualification สำหรับทุก machine profile และ postprocessor

### 11.2 CI Evidence Contract

ทุก required check เผยแพร่ machine-readable record ที่มี:

- control claim IDs;
- repository, commit, ref, protected-branch status และ dirty-tree status;
- environment, runner identity, toolchain และ dependency lock;
- workflow, run, job และ command identity;
- จำนวน total, passed, failed, skipped, cancelled และ quarantined;
- expected evidence count, observed count, not-applicable count พร้อม signed rationale และ UNKNOWN count;
- typecheck, build, migration, security, test และ broker-gate outcomes แยกกัน;
- start/end timestamps;
- artifact digests;
- signed provenance หรือ tamper-evident attestation ที่เทียบเท่า พร้อม retention location;
- สถานะสุดท้าย PASS หรือ FAIL ที่คำนวณจากทุก mandatory outcome;
- expiry/requalification date เมื่อเกี่ยวข้อง

Required checks ต้องทำงานบน pull requests และ protected release branches Script ที่มีอยู่แต่ไม่ได้ wiring เป็น required check ยังไม่ถือเป็น Gate

## 12. Egress Control

### 12.1 Permitted-use Classes

| Class | Permitted output | Prohibited use |
| --- | --- | --- |
| PREVIEW | Concept หรือ coordination artifact สำหรับคน พร้อม exact revision และ visible status | Machine execution หรือ fabrication instruction |
| SHADOW_SIMULATION | Sandboxed simulation input/output ที่ address production machine ไม่ได้ | เลื่อนเป็น qualification/production ด้วยการ copy หรือ rename |
| QUALIFICATION_COUPON | Bounded test geometry สำหรับ named machine, operator, procedure และ grant หนึ่งชุด | Reusable project package หรือ production queue |
| QUALIFICATION_FIRST_ARTICLE | Restricted first-article package หลังมี coupon evidence | General production หรือเครื่อง/profile อื่น |
| PRODUCTION | Exact ACTIVE package สำหรับ qualified machine/profile ผ่าน controlled egress | ใช้นอก grant purpose, scope หรือ expiry |

NOT-FOR-PRODUCTION package ใช้ PREVIEW, SHADOW_SIMULATION, QUALIFICATION_COUPON หรือ QUALIFICATION_FIRST_ARTICLE ได้เมื่อ exact CapabilityPolicy ผ่านเท่านั้น และจะไม่ได้รับ PRODUCTION grant เด็ดขาด Qualification artifact ต้องแสดงข้อจำกัดชัดเจน จำกัด scope เลื่อนระดับไม่ได้ และ audit ได้

### 12.2 Server-owned Egress Broker

MONOLITH มี Governed Egress Registry ชุดเดียว แต่ Registry ไม่ใช่ enforcement boundary ทุก controlled browser download, direct ZIP, API, worker, server exporter, integration, cache delivery, offline package, USB package และ machine-facing adapter ต้องเรียก server-owned EgressBroker

Broker resolve exact package/policy, verify manifest, signature, revocation, machine/profile, permitted use, evidence, authority, acknowledgement และ fencing token แล้วจึงออก `EgressGrant` อายุสั้นที่ผูก grant ID, artifact digest, purpose, permitted-use class, actor, endpoint, machine scope, policy version, expiry และ one-time nonce ผล allow/deny ต้องบันทึกแบบ append-only

Client badge, filename, MIME type, hidden button หรือ local store ไม่สร้าง permission Package ที่ superseded, held, revoked, quarantined, stale หรือ mismatched ต้อง fail closed ส่วน NOT-FOR-PRODUCTION ถูกปฏิเสธสำหรับ PRODUCTION และมีสิทธิ์เฉพาะ qualification class ที่ govern ไว้ด้านบน

### 12.3 No-bypass Enforcement

Egress implementation ที่ไม่ได้ register และ authorize ผ่าน broker ต้อง fail ตอน build หรือ runtime Legacy path ต้องถูกลบ แยกกายภาพเป็น non-controlled preview tooling หรือ migrate หลัง broker Static scan ครอบคลุม `src`, `server`, workers, API routes, scripts, integrations, generated-artifact definitions และ adapter code เป็น defense in depth ที่บังคับ แต่ static scan เพียงอย่างเดียวพิสูจน์ no bypass ไม่ได้ จึงต้องผ่าน dynamic contract tests และ observed external-channel trials ด้วย

### 12.4 Prerequisite แบบ Broker-first ก่อน Implement

ก่อน operational recovery UI จะระบุว่า export, release, resume หรือ download action ได้รับ server authorization implementation ต้อง:

1. ทำ inventory และ classify ทุก browser, API, server, worker, cache, offline/USB, integration, generated-artifact และ legacy egress surface;
2. ลบ แยกกายภาพเป็น non-controlled preview หรือ converge ทุก controlled surface เข้าสู่ server-owned broker;
3. ผ่าน UI/API/worker/server contract tests พร้อม dynamic external-channel และ bypass tests; แล้วจึง
4. เปิด role-view action และเริ่ม usability pilot

สร้าง visualization แบบ non-operational ที่ติดป้ายชัดเจนก่อนได้เพื่อ validate design แต่ห้ามออก `EgressGrant`, อ้าง server authorization หรือใช้แทน broker convergence

## 13. ประสบการณ์ตามบทบาท

หน้าบ้านใช้ภาษาสงบ ตรงข้อเท็จจริง และมี primary recovery action เดียว

### 13.1 Derived Role View และ Truth Precedence

ทุก role view ตอบคำถามกลางห้าข้อต่อไปนี้ โดยไม่ใช่ hard cap แปด field หรือจำนวนตายตัวอื่น:

| คำถามกลาง | Canonical source |
| --- | --- |
| ตอนนี้อะไรปลอดภัย? | `RecoveryCase.state`, `lastSafeState` และ `impactTargets` ปัจจุบัน |
| เกิดอะไรขึ้นและเพราะอะไร? | `failureClass`, `riskClass` และ `RecoveryEvent` ล่าสุดที่เกี่ยวข้อง |
| Scope และ revision ใดได้รับผลกระทบอย่างเจาะจง? | `authorityScopeRef`, project/package/revision/capability IDs, `affectedClaims` และ `impactTargets` |
| ผลกระทบและ permitted use คืออะไร? | invalidated receipts, impact status, `CapabilityPolicy` และ broker result ปัจจุบัน |
| การกระทำถัดไปที่ฉันมีอำนาจทำคืออะไร? | `primaryNextAction`, accepted owner, actor authority, policy version และ proof ที่บังคับ |

Policy-critical role fields ต้องมองเห็นเสมอ ส่วนรายละเอียดที่ไม่ critical ใช้ progressive disclosure ได้ Presenter ไม่เก็บ authority ชุดที่แข่งขันกัน มุมมองที่ทำ action ได้ต้องผูก `caseVersion`, latest event ID, policy version, evidence-snapshot ID, actor scope และ rendered time และ server ต้อง revalidate ทั้งหมดตอน commit HOLD, containment expansion, revocation, invalidated receipt หรือ broker denial ที่ใหม่กว่า มี precedence เหนือ Approved/ACTIVE display ที่เก่ากว่า หาก source ที่บังคับหาย ไม่ตรง เก่า ใช้งานไม่ได้ หรือ impact coverage เป็น UNKNOWN ให้แสดง **“กำลังอัปเดตสถานะ—งานยังคงหยุดอยู่”** และมีเพียง refresh, report issue หรือ authorized escalation ห้ามอ้างว่า scope ที่ยังไม่ยืนยันไม่ได้รับผลกระทบ

### 13.2 V1 Role Registry ที่ Freeze แล้ว

คำว่า “แต่ละ role” ใน Section 4 หมายถึงทุกบทบาทใน `V1-CASEWORK-KITCHEN-RECOVERY-01` การเปลี่ยน denominator ต้องผ่าน versioned registry decision

| บทบาท | เป้าหมายของ Recovery | ข้อมูล policy-critical และขอบเขต action |
| --- | --- | --- |
| ลูกค้า / เจ้าของบ้าน | เข้าใจผลของการตัดสินใจ | ตัวเลือกที่บันทึก สถานะหยุด ผลกระทบ permitted use และ client decision แบบง่าย; ไม่แก้ technical หรือ fabrication detail |
| Interior designer | แก้ design intent | Affected objects, last safe revision, proposed correction, invalidated receipts, reversible branch; override containment หรือ self-release ไม่ได้ |
| สถาปนิก / ผู้ตรวจเทคนิค | ทำ qualified disposition | Changed claims, evidence denominator, proof ที่หาย/ขัดแย้ง, independent assessment และ permitted dispositions |
| ผู้ประสานงาน / Information manager | คืน accountable flow | Accepted owner, assignment status, deadline, downstream roles ที่กระทบ และ escalation; ไม่มี event firehose หรือ inferred acceptance |
| Estimator / Procurement | ปกป้อง commercial basis | Priced-BOM revision, quantities/specifications/suppliers ที่กระทบ ผลเชิงพาณิชย์ และ reprice task; อนุมัติ geometry หรือ machining ไม่ได้ |
| วิศวกรโรงงาน | ตรวจ manufacturing translation | Quarantined candidate, checks, machine/profile, permitted-use class, last ACTIVE comparison, acknowledgement และ HOLD/escalation controls |
| CNC Operator | ใช้เฉพาะ machine package ที่ grant แล้ว | Exact ACTIVE package หรือ bounded qualification grant, named machine/procedure, restriction, expiry, HOLD และ report issue; ไม่มี spindle/motion/cycle-start control |
| Installer / Field verifier | พิสูจน์หน้างานและ installation disposition | Exact site/installation revision, dimensions/interfaces ที่ยังไม่จบ, evidence capture requirement, safe stop และ escalation; sign technical/production release ไม่ได้เว้นแต่ได้รับ authority แยก |

### 13.3 ตัวอย่างการนำเสนอตามบทบาท

#### ลูกค้า

“บันทึกตัวเลือกของคุณแล้ว การปล่อยแบบเทคนิคหยุดอยู่เพราะยังไม่ได้วัดความกว้างหน้างาน” ลูกค้าไม่ต้องแก้รายละเอียดการผลิต

#### นักออกแบบ

เห็น affected objects, last safe revision, proposed correction, invalidated receipts และ reversible branch นักออกแบบแก้หรือ resubmit ได้ แต่ override technical containment ไม่ได้

#### ผู้ตรวจ

เห็น exact changed claims, evidence ที่หาย/ขัดแย้ง, mandatory coverage denominator, independent assessment และ permitted dispositions

#### ผู้ประสานงาน

เห็น blocking recovery task เดียว เจ้าของที่ระบุชื่อ deadline, downstream roles ที่ได้รับผลกระทบ และ escalation path ไม่ใช่ feed ของทุก system event

#### Estimator / Procurement

เห็น priced-BOM basis, รายการและ supplier specifications ที่ exact revision กระทบ ผลเชิงพาณิชย์ และ reprice หรือ substitution-evidence task หนึ่งรายการ โดยไม่แสดง commercial confirmation เป็น geometry หรือ machining approval

#### วิศวกรโรงงาน

เห็น quarantined exact candidate, failed checks, machine context, permitted-use class, การเปรียบเทียบกับ last ACTIVE package, containment acknowledgement และ HOLD/escalation controls ห้ามดาวน์โหลด production file ก่อน ACTIVE commit ส่วน bounded qualification output ต้องใช้ restricted grant ของตนเอง

#### CNC Operator

ใน production mode เห็นเฉพาะ ACTIVE packages ที่ตรงเครื่อง พร้อม HOLD และ report-issue controls ส่วน qualification mode เห็นเฉพาะ bounded coupon/first-article grant พร้อมข้อจำกัดชัดเจน named procedure และ expiry MONOLITH ไม่มี spindle, motion หรือ cycle-start action

#### Installer / Field Verifier

เห็น exact site/installation revision, dimensions หรือ interfaces ที่ยังเปิดอยู่, field evidence ที่บังคับ, ผลของ safe stop และ capture หรือ escalation action หนึ่งรายการ Observation หน้างานห้ามเปลี่ยน design truth อย่างเงียบ ๆ หรือสร้าง technical/production approval

## 14. Contract ของภาพ Section 4

Visualization ที่เจ้าของอนุมัติเป็น standalone deterministic fixture-driven design-validation artifact ใช้ validate ความเข้าใจ Decision Chain ไม่ใช่ operational MONOLITH surface และไม่สร้าง runtime authority

### 14.1 Boundary แบบ Standalone Fixture-only

Artifact อยู่ใต้ project documentation และห้าม import product stores หรือ runtime modules, เรียก network/API/backend, อ่านหรือเขียน production data, persist participant/project state, สร้างหรือ download artifact, invoke egress หรืออยู่ข้าง operational export/release control โดยทำงานจาก deterministic local fixtures ใน session memory เท่านั้น

มี banner ถาวรว่า **“DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION”** ในภาษาที่ใช้งาน ไม่มี state, role selector, simulated action, badge, color หรือ fixture ใดออก `EgressGrant`, mutate canonical record หรืออ้าง server authorization ชื่อใน fixture schema ใช้เหมือน Section 4 ได้เฉพาะในฐานะ test data ไม่ใช่ persisted contract ใหม่หรือ source of truth ชุดที่สอง

### 14.2 Information Architecture แบบ Role-first

Participant เห็น **Recovery Decision Card** หลักหนึ่งใบ ซึ่งตอบคำถามกลางห้าข้อใน Section 13 และแสดง next action ที่เหมาะกับบทบาทหนึ่งอย่าง จากนั้นจึงเปิด **Why / Proof inspector** เมื่อร้องขอ โดย inspector มีสอง pane ที่ sync จาก fixture snapshot เดียวกัน:

1. **Recovery Case and Event Chain:** lifecycle position, current projection, append-only events, immutable receipts, impact acknowledgement, assignment status และ last safe revision;
2. **Capability Gate and Egress:** policy, evidence level, authority quorum, permitted-use class, source freshness และ simulated broker result

เปิด full inspector เป็น default ได้เฉพาะ reviewer หรือ evaluator mode ภาษาสำหรับลูกค้าต้องไม่เปิด policy, quorum, broker หรือ lifecycle jargon เว้นแต่ผู้ใช้ขอรายละเอียด

### 14.3 Role/Scenario Controls และ Coverage Manifest

Design-review shell มี **Role** และ **Scenario** selectors แยกกัน ซึ่งเลือก test perspective เท่านั้นและไม่ grant authority เมื่อ evaluator เริ่ม task แล้ว participant-test mode ต้องซ่อน selectors เหล่านี้

Versioned coverage manifest ผูก fixture IDs กับทุก role ใน `V1-CASEWORK-KITCHEN-RECOVERY-01` โดยบังคับ risk-relevant seeded scenario อย่างน้อยหนึ่งรายการต่อบทบาท แต่ไม่บังคับให้แสดง role-by-domain-scenario combinations ทั้ง 56 คู่ใน interface

Domain scenarios เจ็ดรายการยังคงอยู่:

- missing site evidence;
- stale revision หลัง review;
- unauthorized หรือ self-approval attempt;
- missing verification report;
- post-release defect;
- offline หรือ stale revocation policy;
- supervised qualification coupon ขณะที่ NOT-FOR-PRODUCTION ยังทำงาน

เพิ่ม truth-pressure fixtures ข้าม scenario สี่รายการเป็นข้อบังคับ:

- `PENDING_ASSIGNMENT` — มี request แต่ยังไม่มี accepted หรือ policy-auto-assigned owner;
- `SOURCE_UNAVAILABLE_OR_UNKNOWN` — required source ใช้งานไม่ได้หรือ impact coverage เป็น UNKNOWN;
- `NEWER_HOLD_OVERRIDES_OLD_APPROVAL` — containment truth ที่ใหม่กว่ามี precedence เหนือ Approved/ACTIVE display เก่า;
- `STALE_ACTION_BROKER_DENIED` — action ที่ render จาก snapshot เก่า fail simulated revalidation

### 14.4 Mapping จาก Fixture ไป Role View

คำถามกลางห้าข้อคือ shared skeleton ไม่ใช่ raw-field list ตายตัว แต่ละ fixture ระบุ `fixtureId`, fixture version, role-registry version, role, scenario, risk, language, viewport, case projection, latest event, relevant receipts, policy result, broker result, source status/freshness, simulated next-action outcome และ expected participant answers

แต่ละ role mapping ระบุ policy-critical fields ที่ต้องมองเห็น และ classify รายละเอียดอื่นว่า summarized, expandable หรือ hidden Card และ inspector ต้องใช้ immutable fixture snapshot เดียวกัน การเปลี่ยน role หรือ scenario ต้องแทน snapshot ทั้งชุดและห้าม merge facts ที่ขัดกัน

### 14.5 Simulate-only Action Semantics

ทุก interactive action ติด label **Simulate** และเปลี่ยนได้เฉพาะ deterministic fixture snapshots ผลแสดง expected case version, simulated policy/broker result และระบุว่า runtime จริงต้อง server revalidation หรือไม่ ห้ามใช้ Approved, Released, Resumed, ACTIVE, Exported หรือ Downloaded ใน message โดยไม่มีคำว่า **SIMULATED** ที่เห็นชัด Artifact ไม่สร้าง file, receipt, grant, notification หรือ persistent audit record

### 14.6 Evaluator Harness

Evaluator mode ที่ซ่อนจาก participant เก็บ immutable fixture ID, role-registry version, scenario, risk, language, viewport, render/announcement start, answer completion, safe-first-action result, backtracking, proof opening, support event, workload response และ unsafe-action flag โดยใช้ session memory และ on-screen summary เท่านั้น ไม่มี analytics, network, persistence หรือ export ส่วน approved research process เป็นผู้บันทึก adjudicated result ภายนอก artifact นี้

Harness ทำตาม clock boundaries ใน Section 15 และเปลี่ยน answer rubric, exclusion rule หรือ success condition หลัง task เริ่มแล้วไม่ได้

### 14.7 Bilingual Visual และ Accessibility Semantics

ภาษาไทยและอังกฤษใช้ fixture IDs, facts, action boundaries และ expected answers ชุดเดียวกัน Status, severity, mutable projection, immutable proof, permitted use และ simulated outcome ใช้ text พร้อม icon/shape โดยสีเพียงอย่างเดียวไม่มี safety meaning Artifact รองรับ keyboard navigation, visible focus, screen-reader announcements, reduced motion, required widths แบบ responsive, zoom/reflow และ client-safe vocabulary

Corporate identity ที่อนุมัติใช้กำหนด typography, spacing, form และ color ได้ แต่ห้ามทำให้ permanent prototype banner อ่อนลงหรือใช้แทน explicit safety/status language

## 15. Acceptance Criteria

### 15.1 Operational Measurement Protocol

นาฬิกา orientation เริ่มเมื่อ role view render และประกาศครบหลังเปิดหรือ material state change และหยุดเมื่อ participant ระบุ last safe revision, consequence, permitted use และ next authorized action ถูกต้อง รายงานผลแยกตาม registry version, role, seeded scenario, risk class, ภาษา และ required device width โดยผลรวมแบบ pooled ห้ามซ่อน cell ที่ล้มเหลว

Denominator ของ correction/acknowledgement/reversal คือ seeded task ทุกงานที่เริ่มแล้ว Exclusion จำกัดเฉพาะ test-harness failure ที่ประกาศและ freeze ก่อน unblinding รายงาน numerator, denominator และ 95% confidence interval ของทุก cell ต้อง freeze sample-size/power plan, success rubric, นิยาม support และ unsafe-action adjudication ก่อน pilot Median orientation time ต้องไม่เกิน 30 วินาทีต่อ required role/scenario cell และอย่างน้อย 95% ต้องทำ assigned non-safety task สำเร็จโดยไม่ขอ support Unsafe critical action, bypass หรือการอนุมาน permission ผิดเพียงครั้งเดียวเป็น immediate stop โดยไม่สน aggregate percentage

ให้บันทึก safe first action, backtracking, evidence opening, support escape และ workload เทียบ approved baseline ด้วย Automated property, state-machine, contract และ failure-injection tests เป็นผู้พิสูจน์ control invariants ส่วน human pilot ให้ usability evidence เท่านั้นและใช้พิสูจน์ runtime authority หรือ production readiness ไม่ได้

### 15.2 Contract Acceptance Criteria

Section 4 รับได้เมื่อ:

1. แยกหน้าที่ RecoveryCase, RecoveryEvent และ DecisionReceipt และทดสอบแยกกันได้;
2. state enum และ transition table ชุดเดียว govern ทุก legal/illegal transition;
3. ทุก failure scenario มี containment, acknowledgement, authority, recovery และ re-verification;
4. mandatory evidence ที่ missing, empty, duplicate, stale, mismatched หรือ UNKNOWN แสดงเป็น PASS ไม่ได้;
5. ทุก CapabilityPolicy ระบุ exact claims, counts, minimum level, freshness, quorum, acknowledgement และ permitted use;
6. ทุก consequential action ผูก resolved actor, purpose, scope, policy, capability และ exact revision;
7. incident-specific high-risk release/resume policies บังคับ distinct-human separation of duties;
8. transaction failure หรือ stale worker ทิ้ง unexplained/ reopened ambiguous state ไม่ได้;
9. canonical audit และ revocation ล้างหรือ override จาก user device ไม่ได้;
10. ทุก controlled egress path ถูก register, broker, dynamic test และ audit;
11. สร้าง qualification output ได้โดยไม่ grant production use และ artifact เลื่อนระดับด้วย copy, rename, replay หรือ policy downgrade ไม่ได้;
12. ratify tenant / organization / site authority model ก่อน implement canonical recovery persistence;
13. assignment request และ acceptance แยกกัน และ ASSIGNED ต้องมี accepted หรือ policy-auto-assigned ownership โดยไม่เพิ่ม lifecycle state;
14. ทุก view ใน frozen V1 Role Registry derive จาก canonical case/event/receipt/policy/broker facts และ fail closed เมื่อ input เก่า หาย ไม่ตรง ใช้งานไม่ได้ หรือเป็น UNKNOWN;
15. notification delivery, read, assignment acceptance และ containment acknowledgement แยกกันและทำตาม four-intent routing model;
16. broker convergence พร้อม cross-surface contract/bypass tests ผ่านก่อน operational UI อ้าง server-authorized export, release, resume หรือ download;
17. ทุก required role/scenario cell ผ่านเป้าหมาย orientation 30 วินาทีภายใต้ frozen measurement protocol;
18. อย่างน้อย 95% ของแต่ละ required non-safety pilot cell ทำ correction, containment acknowledgement หรือ reversal ที่มอบหมายได้โดยไม่ขอ support หรือ reconstruct ข้อมูลนอกระบบ พร้อมรายงาน numerator, denominator และ confidence interval;
19. NOT-FOR-PRODUCTION ยังคงทำงานจนผ่าน exact machine, postprocessor, operator-procedure, owner-release และ production-egress gates;
20. design visualization เป็น standalone และ fixture-only โดยไม่มี runtime import, network, persistence, artifact generation/download, egress หรืออยู่ข้าง operational control;
21. role-first card, optional inspector, eight-role coverage manifest, seven domain scenarios และ four truth-pressure fixtures conform กับ Section 14;
22. fixture mappings ใช้ five-question skeleton พร้อม role-critical fields โดยไม่สร้าง persisted contract ใหม่หรือรวม incompatible snapshots;
23. ทุก action/outcome เป็น simulated อย่างเห็นชัด และ participant-hidden evaluator harness ทำตาม frozen measurement protocol; และ
24. Facts/actions ไทย–อังกฤษเทียบเท่ากัน และเข้าถึง safety/status meaning ทุกอย่างได้โดยไม่พึ่งสีเพียงอย่างเดียว

## 16. Stop Conditions

หยุดหรือออกแบบใหม่เมื่อ:

- mutable case ถูกนำเสนอเป็น immutable receipt หรือ immutable receipt เปลี่ยนค่า;
- state name สองชื่ออธิบาย lifecycle position เดียวกัน หรือระบบรับ undefined transition;
- case เข้า ASSIGNED ก่อนผู้รับยอมรับ เว้นแต่ authoritative auto-assignment policy ที่ชัดเจนบันทึก assignment;
- critical seeded defect ไปถึง release;
- mandatory report set ที่ missing หรือ empty ผ่าน;
- actor คนเดียวทำ incompatible duties ได้;
- crash ทำให้ canonical state และ release evidence แยกจากกัน;
- stale worker, device หรือ grant reopen/export หลัง fencing token ใหม่ได้;
- stale หรือ missing revocation policy อนุญาต offline use;
- path ใดนอก EgressBroker export controlled artifact หรือ path ใดนำเสนอ non-ACTIVE package ว่าเป็น PRODUCTION;
- operational UI อ้าง server authorization ก่อนทุก controlled egress surface converge เข้า broker และผ่าน contract/bypass tests;
- role-view input ที่เก่า หาย ไม่ตรง ใช้งานไม่ได้ หรือ UNKNOWN ถูกนำเสนอว่าปลอดภัย พร้อม ไม่ได้รับผลกระทบ หรือทำ action ได้;
- NOT-FOR-PRODUCTION artifact ได้รับ PRODUCTION use หรือสร้าง qualification evidence ไม่ได้หากไม่ทำเช่นนั้น;
- safety, authority, evidence, revocation หรือ controlled-egress action ใดหลบ governed chain โดย safety-bypass rate ที่ยอมรับคือศูนย์;
- non-safety coordination tasks ใน pilot มากกว่า 10% เกิดนอก governed chain ซึ่งเป็น UX redesign trigger และไม่ลด zero-bypass safety rule;
- role denominator ไม่ถูก freeze, pooled metrics ซ่อน role/scenario cell ที่ล้มเหลว หรือมี exclusion เพิ่มหลัง unblinding;
- ผู้ใช้ระบุ last safe revision, owner, consequence, permitted use และ next authorized action โดยไม่ขอความช่วยเหลือไม่ได้;
- prototype import runtime/product state, เรียก network, persist data, สร้างหรือ download artifact, invoke egress หรืออยู่ข้าง operational export/release control;
- prototype banner หาย, role/scenario selector สื่อ authority หรือ outcome ที่ดูเหมือน approval/release/resume/export/download ไม่มี SIMULATED qualifier ที่มองเห็นได้;
- role V1 ใดไม่มี coverage, required truth-pressure fixture หาย หรือ card/inspector รวม facts จาก fixture snapshots คนละชุด;
- สีหรือ untranslated technical jargon เป็นตัวสื่อ safety, status, permitted use, proof type หรือ action meaning เพียงอย่างเดียว

## 17. Current Source Trace ที่ใช้ในการออกแบบ

- Sequential manifest, HEAD และ geometry effects: `src/core/export/commitApprovedState.ts:200-205`
- Report checks ที่ค้นหา FAIL โดยไม่ตรวจ required cardinality อย่างชัดเจน: `src/core/manufacturing/export/enforceExportGate.ts:119-157`
- Client-side approval requirement ที่ default หนึ่ง approval และ any-role matching: `src/core/manufacturing/release/releaseStore.ts:47-97`
- Current visible client release path สร้างและ auto-download หลัง browser-held approval state: `src/components/ui/ModelingReleasePanel.tsx:44-86`
- Release/export surfaces ปัจจุบันเพิ่มเติมมี direct App/AppShell export wiring, browser packet generation/download และ upload หลัง download เท่านั้น: `src/App.tsx:717-742,878-892`, `src/components/layout/AppShell.tsx:176,221` และ `src/factory/packet/useFactoryPacket.ts:341-365` เส้นทางเหล่านี้ทำให้ broker-first convergence เป็น prerequisite ไม่ใช่งานตามหลัง UI
- Key audit และ revocation state แบบ local และล้างได้: `src/release/keys/audit.ts:4-8,56-73,121-126` และ `src/release/keys/revocationPolicy.ts:53-84,197-202`
- มี direct ZIP function ที่ไม่มี full package structure ที่ `server/src/export/exportServiceP22a.ts:426-467` แต่ไม่พบ caller ใน `src`, `server` หรือ `tests` ที่ตรวจ จึงไม่ถือว่าการมี source เป็น verified reachable production path
- Bypass scanner ปัจจุบัน scope เฉพาะ `src`: `scripts/gates/bypass-scan.ts:82-87`
- Full verification workflow ทำงานแบบ push/manual: `.github/workflows/verify-full.yml:5-12`
- Gate pull-request workflow paths ไม่รวม release/export modules: `.github/workflows/gate-tests.yml:13-16`
- Release route ยังเป็น incomplete surface: `src/routes/index.tsx:873-880`
- Workflow authz, quorum, idempotency และ audit primitives ที่มีอยู่เป็น semantic reuse candidates แต่ยังไม่ใช่ verified canonical server authority: `src/workflow/approval/authz.ts`, `quorum.ts`, `idempotency.ts` และ `src/workflow/audit/writer.ts`
- Handoff validation ปัจจุบันบันทึก process order และ active site แต่ยังไม่สร้าง recipient acceptance: `src/workflow/handoff/canonical.ts:35-57`
- Notification routing ปัจจุบันส่ง personal responsibility/approval เป็น direct push และส่ง cross-team handoff/FYI เป็น group message โดยยังไม่มี four notification intents หรือ acknowledgement semantics ที่แยกกัน: `src/workflow/notification/routing.ts:4-23`
- ไม่พบ exact runtime identifiers ของ `RecoveryCase`, `RecoveryEvent`, `DecisionReceipt`, `CapabilityPolicy`, `EgressBroker` หรือ role-view contract ใน `src`, `server` หรือ `supabase` source ที่ตรวจ จึงยังเป็น target design contracts ไม่ใช่ current production facts
- Evidence/UX appendix: [Deep research เรื่อง Beloved Safe Recovery UX](../../research/2026-08-03-monolith-beloved-safe-recovery-ux-deep-research.th.md), [bounded scrutiny correction report](../../research/2026-08-03-monolith-beloved-safe-recovery-ux-scrutiny.th.md) และ [interactive-visualization pre-build scrutiny](../../research/2026-08-03-monolith-section-4-interactive-visualization-prebuild-scrutiny.th.md)

## 18. ขั้นถัดไปที่อนุมัติหลังตรวจ Written Spec

เจ้าของอนุมัติ visualization pre-build corrections ทั้งแปดข้อเมื่อ 3 สิงหาคม 2026 และ bounded consistency re-scrutinize ผ่านโดยไม่มี blocker Deliverable การออกแบบถัดไปที่อนุมัติคือ bilingual standalone fixture-driven prototype ตาม Section 14 ส่วน broker-surface inventory และ convergence ยังเป็น prerequisite แรกสำหรับ operational implementation ในอนาคต ห้ามนำเอกสารนี้ไป implement production release, schema, policy, egress หรือ machine-control changes โดยไม่มี implementation plan ที่อนุมัติแยกต่างหาก
