# การออกแบบ MONOLITH Section 4: Safe Recovery & Proof

**สถานะ:** OWNER DECISION — อนุมัติทิศทางเมื่อ 3 สิงหาคม 2026; รอตรวจทานสเปกฉบับเขียนโดยเจ้าของ

**ทิศทางผลิตภัณฑ์:** Decision Chain UX

**วัตถุประสงค์ของ Section:** กักความล้มเหลว รักษาอำนาจ กู้คืนอย่างปลอดภัย และพิสูจน์ความพร้อมก่อนกลับมาทำงานต่อ

**ขอบเขตแรก:** แพ็กเกจงานครัวและ casework ในโหมด shadow / NOT-FOR-PRODUCTION

## 1. สรุปการตัดสินใจ

Section 4 จะไม่แสดง Failure Handling, Governance และ Testing Gates เป็นสามผลิตภัณฑ์แยกกัน แต่จะกำหนด **Safe Recovery Contract** กลางหนึ่งชุด และ **Qualification Evidence Matrix** หลังบ้านหนึ่งชุด

ลำดับ runtime คือ:

`Detect → Contain → Explain → Assign → Recover → Re-verify → Resume / Retire`

ผู้ใช้เห็นการกระทำถัดไปที่ปลอดภัยที่สุด ผู้รับผิดชอบ และผลกระทบ ส่วน MONOLITH จัดการ invalidation, dependency propagation, retry, reconciliation, audit assembly, notification และการรวบรวมหลักฐานทั้งหมดหลังบ้าน

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

### A. สามโมดูลแยกกัน — ไม่เลือก

Failure, Governance และ Testing workspace แยกกันจะทำให้ state ซ้ำ เพิ่ม navigation สำหรับผู้เชี่ยวชาญ และสร้างความหมายคำว่า “ปลอดภัย” หลายแบบ

### B. Central safety dashboard — ไม่เลือก

Dashboard ช่วยให้มองเห็น แต่ยังอาจเป็นเพียงการเฝ้าดู ไม่ได้ยืนยันว่า state transition, export หรือ machine-package path จริงถูกบล็อก

### C. Shared recovery contract พร้อม evidence matrix — อนุมัติ

Contract เดียวควบคุมทุก consequential transition หน้าจอตามบทบาทแสดง projection ของ record ชุดเดียว ขณะที่ deterministic policy และ evidence เป็นผู้ตัดสินว่า transition เดินหน้าต่อได้หรือไม่

## 4. ขอบเขตและสิ่งที่ไม่ทำ

### รวมใน Section นี้

- failure classification และ containment;
- Failure Receipt ที่ผูก exact revision;
- recovery ownership และ next-action routing;
- authority และ separation-of-duty evaluation;
- retry, idempotency, reconciliation และ compensation semantics;
- การตัดสินใจ HOLD, REVOKE, SUPERSEDE, RETIRE และ RESUME;
- การเชื่อม control claim กับ test evidence;
- export-egress inventory และ no-bypass enforcement;
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

## 5. ขอบเขต Repository และ Current State

Parent repository เป็น governance/bootstrap root ส่วน `determined-williams/` nested repository เป็น active product source มี release, gate, audit, verification และ factory code จำนวนมาก แต่ implementation ที่มองเห็นในปัจจุบันยังมี abstraction หลายเส้นทาง governance store แบบ local-only เอกสารทดสอบเชิงเป้าหมาย และ route ที่ยังไม่สมบูรณ์

สเปกนี้จึงแยกประเภทดังนี้:

- **TARGET CONTROL:** สิ่งที่สเปกนี้กำหนดให้ต้องมี;
- **VERIFIED SOURCE FACT:** สิ่งที่ source ปัจจุบันรองรับโดยตรง;
- **TEST EVIDENCE:** หลักฐานจาก executable check ที่ผูกกับ commit;
- **OPERATIONAL EVIDENCE:** หลักฐานจาก shadow, coupon, first article หรือการปฏิบัติงานจริงที่สังเกตได้;
- **UNKNOWN:** สิ่งที่หลักฐานที่มีอยู่ยังพิสูจน์ไม่ได้

สเปกนี้ไม่ประกาศว่า production-ready และไม่ปิด NOT-FOR-PRODUCTION controls

## 6. Safe Recovery Contract

ทุก consequential failure สร้าง `FailureReceipt` canonical หนึ่งรายการ

### 6.1 Field บังคับ

| Field | ข้อกำหนด |
| --- | --- |
| `failureId` | identity คงที่และไม่ซ้ำทั้งระบบ |
| `failureClass` | Evidence, proposal, concurrency, authority, verification, release, post-release, infrastructure หรือ security |
| `detectedAt` / `detectedBy` | timestamp และ actor/system source ที่เชื่อถือได้ |
| `tenantContext` | canonical tenant / organization / site scope; ห้ามอนุมานจาก presentation state |
| `projectId`, `packageId`, `revisionId` | project, work package และ immutable revision ที่ได้รับผลกระทบอย่างเจาะจง |
| `affectedClaims` | Claim IDs และ dependency edges ที่ได้รับผลกระทบ |
| `containment` | สิ่งที่ถูกหยุด กัก เพิกถอน หรือเปลี่ยนเป็น read-only |
| `lastSafeState` | state ล่าสุดที่ permitted use ยังใช้ได้ |
| `invalidatedReceipts` | purpose-specific receipts ที่ใช้ต่อไม่ได้ |
| `owner` | recovery owner ที่ระบุชื่อและ authority assignment |
| `nextAction` | primary recovery action หนึ่งรายการในภาษาคน |
| `retryPolicy` | idempotency key, retry ceiling, backoff, expiry และ escalation |
| `requiredProof` | checks และหลักฐานที่ต้องมีเพื่อ reopen อย่างเจาะจง |
| `downstreamImpact` | orders, parts, exports, people, deadlines และ cached copies ที่ได้รับผลกระทบ |
| `disposition` | OPEN, CONTAINED, RECOVERING, REVERIFYING, RESUMED, RETIRED หรือ SUPERSEDED |
| `auditAnchor` | append-only event และ receipt-chain reference |

### 6.2 ความหมายของ State

1. **DETECTED:** บันทึกเหตุการณ์แล้ว แต่ยังไม่อ้างความปลอดภัยใด ๆ
2. **CONTAINED:** ปิด capability และ egress ที่ได้รับผลกระทบ โดยยังแสดง revision ล่าสุดที่ปลอดภัย
3. **ASSIGNED:** บุคคลที่ระบุชื่อหรือ governed service รับผิดชอบการกระทำถัดไป
4. **RECOVERING:** Recovery effects ทำงานผ่าน idempotent commands และ outbox/effect ledger
5. **REVERIFYING:** ประเมิน control claims ที่บังคับทั้งหมดบน recovered exact revision
6. **RESUMED:** หลักฐานครบ และผู้มีอำนาจที่ qualified เปิด capability ใหม่
7. **RETIRED / SUPERSEDED:** branch หรือ package ที่ล้มเหลวกลับมาใช้ต่อไม่ได้ ตัวแทนใหม่ต้องมี identity และ evidence chain ใหม่

Transitions เป็น append-only decisions และห้ามลบ failure record เพียงเพราะกู้คืนสำเร็จแล้ว

## 7. Failure Classes และ Default Containment

| Failure class | ตัวอย่าง | Default containment | Recovery authority |
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

1. canonical transaction ที่บันทึก business state และ effect intent พร้อมกัน;
2. stable idempotency key ที่ scope ตาม actor, command และ expected revision;
3. optimistic version comparison ก่อน mutation;
4. outbox/effect ledger สำหรับ downstream work;
5. retry ที่กำหนด ceiling และ expiry;
6. reconciliation เมื่อผลลัพธ์จาก provider คลุมเครือ;
7. compensation เฉพาะเมื่อ original effect ทำ atomic ไม่ได้;
8. recovery receipt สำหรับทุก retry, compensation หรือ terminal failure

Lifecycle ขั้นต่ำคือ `PREPARED → COMMITTED` หรือ `PREPARED → ABORTED` และ reconciler ต้องตรวจพบและจัดการ prepared records ที่ค้างจาก process failure ผู้ใช้ต้องไม่ถูกบังคับให้เดาว่าการกดหนึ่งครั้งสำเร็จหรือไม่

## 9. Governance และ Authority

### 9.1 Authority เป็นของ Server

UI role label, ปุ่มที่ซ่อน, local state, email link และ chat identity ไม่ใช่ permission ฝั่ง server ต้องประเมิน actor, authority assignment, scope, purpose, exact revision, validity window และ separation-of-duty policy ตอน commit

### 9.2 Authority Moments

| Decision | Required authority | Separation rule |
| --- | --- | --- |
| Accept client concept | Client decision authority | ห้ามสื่อว่าเป็น technical หรือ fabrication approval |
| Confirm design intent | Assigned designer | คนเดียว release งานตนเองไป production ไม่ได้ |
| Record technical disposition | Qualified independent reviewer | Critical claims ใช้ independent-first |
| Confirm priced BOM basis | Commercial authority | อนุมัติ geometry หรือ machining ไม่ได้ |
| Confirm manufacturing translation | Factory engineer | เปิด production egress คนเดียวไม่ได้ |
| Commit ACTIVE release | Authorized releaser | High-risk release ต้องมี independent qualified evidence และ two-person control ตาม policy |
| HOLD | Authorized safety role คนใดก็ได้ | ทำได้ทันทีแบบ fail-safe และต้องระบุเหตุผล |
| REVOKE / RESUME | Revocation authority | Resume ต้องใช้หลักฐานใหม่ ห้ามนำ receipt เดิมกลับมาใช้ |

Self-approval, authority หมดอายุ, scope mismatch, บุคคลเดียวใช้สอง role ที่ขัดกัน และ identity ที่ตรวจไม่ได้ ต้อง fail closed

ในสเปกนี้ **high risk** หมายถึง action ใดก็ตามที่สร้างหรือเปิด production-usable egress หรือ resume capability หลัง safety, security, integrity หรือ revocation incident ต้องใช้บุคคลที่ยืนยันตัวตนแล้วสองคนและเป็นคนละคนกัน ได้แก่ qualified reviewer หรือ factory-translation authority หนึ่งคน และ Authorized Releaser หนึ่งคน บุคคลเดียวทำหน้าที่ทั้งสองไม่ได้ ส่วน HOLD ยังคงเป็น one-person fail-safe action ที่ authorized safety role คนใดก็ได้ทำทันที

### 9.3 Audit และ Revocation

Canonical audit และ revocation registry ต้องเป็น append-only, server-owned, tenant-scoped และ tamper-evident Local storage ใช้ cache signed policy snapshots ได้ แต่สร้าง ล้าง หรือ override canonical authority ไม่ได้

Offline enforcement ต้องมี:

- signed monotonic policy version;
- issued-at และ expires-at timestamps;
- อายุ policy สูงสุดที่ยอมรับได้;
- machine และ tenant scope ที่ชัดเจน;
- fail-closed เมื่อ policy หาย ไม่ถูกต้อง หรือเก่า;
- reconciliation ก่อน resumed controlled egress

## 10. Qualification Evidence Matrix

ทุก capability มี `ControlClaim` และยังเปิดใช้ไม่ได้จนกว่า mandatory claims ตาม risk class จะผ่านบน exact build, policy, adapter, machine profile และ revision

| Control claim | Minimum executable evidence | Operational evidence | Failure consequence |
| --- | --- | --- | --- |
| Commit เป็น all-or-nothing | Failure injection ทุก write boundary; crash recovery; idempotent replay | Recovery drill | ปิด release capability |
| Evidence coverage ครบ | ทดสอบ cardinality, scope, freshness, duplicate, missing และ unknown state | Seeded-defect trial | Candidate อยู่ใน quarantine |
| Separation of duties ใช้ได้จริง | Property tests ครอบคลุม actor, role, expiry, scope และ self-approval | สังเกต shadow approvals | ปฏิเสธ commit |
| Revocation กระจายถึงปลายทาง | ทดสอบ offline stale policy, key compromise, cache และ clock boundary | Revocation exercise ที่ factory endpoint | ปิด egress |
| ไม่มี export bypass | Static egress scan พร้อม route/API/worker contract tests | สังเกต external channel | Block release และเปิด incident |
| Package ตรงกับเครื่อง | Manifest, checksum, unit, origin, postprocessor, tool และ machine profile tests | Simulation, coupon แล้วจึง first article | ห้ามใช้กับเครื่อง |
| Recovery ใช้งานได้ | Role E2E tests ตั้งแต่ detect-to-resume และ detect-to-retire | Facilitated pilot แยกทุกบทบาท | ออกแบบ recovery UX ใหม่ |

### 10.1 ระดับหลักฐาน

- **E0 — Executable source evidence:** unit, property, model-based, contract, integration, security และ failure-injection results ที่ผูก commit และ environment
- **E1 — Shadow operational evidence:** โครงการจริงแต่ไม่มี production authority พร้อม defect adjudication โดยผู้เชี่ยวชาญอิสระ
- **E2 — Qualified factory evidence:** simulator, coupon, first article, machine profile ที่ระบุชื่อ, postprocessor ที่อนุมัติ และ operator procedure
- **E3 — Sustained operational evidence:** monitored field performance, incidents, false-negative/positive review, recovery drills และ expiry/requalification

E0 ไม่ได้แปลว่า E2 หรือ E3 Domain Pack จะได้เฉพาะ capability ที่ระดับหลักฐานปัจจุบันรองรับ

## 11. Testing Gates

### 11.1 กลุ่มการทดสอบบังคับ

1. Unit และ property tests สำหรับ invariants และ boundary values
2. Model-based state-machine tests สำหรับทุก legal และ illegal transition
3. Contract tests ให้ UI, API, worker, server และ external adapter ใช้ความหมายตรงกัน
4. Concurrency และ idempotency tests รวม duplicate และ reordered delivery
5. Failure-injection tests ทุก persistence, signing, audit, notification และ export boundary
6. Seeded-defect tests สำหรับ stale revision, missing evidence, contradictory dimensions, unsupported inference, wrong hardware/material และ post-review change
7. Authority tests สำหรับ denial, expiry, scope, self-approval และ two-person control
8. Offline และ revocation tests รวม stale cache และ clock skew
9. Egress-bypass tests ครอบคลุม browser download, API, server, worker, cache, USB package และ legacy paths
10. Role-specific E2E และ accessibility tests ภาษาไทยและอังกฤษบน desktop และ mobile widths ที่บังคับ
11. Shadow simulation, coupon และ first-article qualification สำหรับทุก machine profile และ postprocessor

### 11.2 CI Evidence Contract

ทุก required check เผยแพร่ machine-readable record ที่มี:

- control claim IDs;
- commit และ dirty-tree status;
- environment และ dependency lock;
- command identity;
- จำนวน total, passed, failed, skipped, cancelled และ quarantined;
- start/end timestamps;
- artifact digests;
- สถานะสุดท้าย PASS หรือ FAIL;
- expiry/requalification date เมื่อเกี่ยวข้อง

Required checks ต้องทำงานบน pull requests และ protected release branches Script ที่มีอยู่แต่ไม่ได้ wiring เป็น required check ยังไม่ถือเป็น Gate

## 12. Egress Control

MONOLITH มี Governed Egress Registry ชุดเดียวสำหรับทุก path ที่ส่งข้อมูลซึ่งอาจใช้ผลิตได้ รวม browser downloads, direct ZIPs, APIs, workers, server exporters, integrations, caches, offline packages, USB packages และ machine-facing adapters

ทุก egress path ต้อง:

1. resolve exact ACTIVE package;
2. verify manifest, signature, policy, machine profile และ revocation status;
3. ปฏิเสธ evidence ที่หายหรือ stale;
4. บันทึก actor, endpoint, artifact hash, purpose และ result;
5. ปฏิเสธ package ที่ superseded, held, revoked, quarantined หรือ NOT-FOR-PRODUCTION;
6. ไม่เปิด direct หรือ legacy production path อื่น

Legacy paths ต้องถูกลบ isolate เป็น non-production อย่างชัดเจน หรืออยู่ภายใต้ server enforcement ชุดเดียวกัน Static bypass scanning ต้องครอบคลุม `src`, `server`, workers, API routes, scripts และ adapter code และเป็น required CI check

## 13. ประสบการณ์ตามบทบาท

หน้าบ้านใช้ภาษาสงบ ตรงข้อเท็จจริง และมี recovery action เดียว

### ลูกค้า

“บันทึกตัวเลือกของคุณแล้ว การปล่อยแบบเทคนิคหยุดอยู่เพราะยังไม่ได้วัดความกว้างหน้างาน” ลูกค้าไม่ต้องแก้รายละเอียดการผลิต

### นักออกแบบ

เห็น affected objects, last safe revision, proposed correction, invalidated receipts และ reversible branch นักออกแบบแก้หรือ resubmit ได้ แต่ override technical containment ไม่ได้

### ผู้ตรวจ

เห็น exact changed claims, evidence ที่หาย/ขัดแย้ง, mandatory coverage denominator, independent assessment และ permitted dispositions

### ผู้ประสานงาน

เห็น blocking recovery task เดียว เจ้าของที่ระบุชื่อ deadline, downstream roles ที่ได้รับผลกระทบ และ escalation path ไม่ใช่ feed ของทุก system event

### วิศวกรโรงงาน

เห็น quarantined exact candidate, failed checks, machine context, การเปรียบเทียบกับ last ACTIVE package และ HOLD/escalation controls ห้ามดาวน์โหลด production file ก่อน commit

### CNC Operator

เห็นเฉพาะ ACTIVE packages ที่ตรงเครื่อง พร้อม HOLD และ report-issue controls MONOLITH ไม่มี spindle, motion หรือ cycle-start action

## 14. Contract ของภาพ Section 4

ภาพที่อนุมัติจะมีสองมุมมองที่ sync กัน:

1. **Safe Recovery Loop:** เส้นทางเจ็ด state จาก Detect ถึง Resume/Retire
2. **Qualification Evidence Matrix:** หลักฐานที่บังคับก่อน reopen แต่ละ capability

ผู้ตรวจสามารถเลือก scenarios ตัวแทน:

- missing site evidence;
- stale revision หลัง review;
- unauthorized หรือ self-approval attempt;
- missing verification report;
- post-release defect;
- offline หรือ stale revocation policy

แต่ละ scenario อัปเดต field ชุดเดียวกัน ได้แก่ containment, last safe state, owner, next action, invalidated scope, required proof และ permitted output ภาพต้องไม่ทำให้เข้าใจว่า UI badge เป็นผู้ enforce safety

## 15. Acceptance Criteria

Section 4 รับได้เมื่อ:

1. ทุก failure scenario มี containment, authority, recovery และ re-verification;
2. missing evidence แสดงเป็น PASS ไม่ได้;
3. ทุก consequential action ผูก actor, purpose, scope และ exact revision;
4. high-risk release และ resume policy บังคับ separation of duties ได้;
5. transaction failure ไม่ทิ้ง unexplained ambiguous state;
6. canonical audit และ revocation ล้างจาก user device ไม่ได้;
7. ทุก production egress path อยู่ใน inventory และ governance;
8. control claims เชื่อม executable evidence ที่มี expiry;
9. interface ให้แต่ละ role มี recovery action ที่ชัดเจนหนึ่งรายการ;
10. NOT-FOR-PRODUCTION ยังคงทำงานจนผ่าน machine qualification และ owner release gates

## 16. Stop Conditions

หยุดหรือออกแบบใหม่เมื่อ:

- critical seeded defect ไปถึง release;
- missing report ผ่านเพราะ report set ว่าง;
- actor คนเดียวทำ incompatible duties ได้;
- crash ทำให้ canonical state และ release evidence แยกจากกัน;
- stale หรือ missing revocation policy อนุญาต offline use;
- alternate path ใด export non-ACTIVE package;
- consequential recovery work มากกว่า 10% เกิดนอก governed chain;
- ผู้ใช้ระบุ last safe revision, owner และ next action โดยไม่ขอความช่วยเหลือไม่ได้

## 17. Current Source Trace ที่ใช้ในการออกแบบ

- Sequential manifest, HEAD และ geometry effects: `src/core/export/commitApprovedState.ts:200-205`
- Report checks ที่ค้นหา FAIL โดยไม่ตรวจ required cardinality อย่างชัดเจน: `src/core/manufacturing/export/enforceExportGate.ts:119-157`
- Client-side approval requirement ที่ default หนึ่ง approval และ any-role matching: `src/core/manufacturing/release/releaseStore.ts:47-97`
- Key audit และ revocation state แบบ local และล้างได้: `src/release/keys/audit.ts:4-8,56-73,121-126` และ `src/release/keys/revocationPolicy.ts:53-84,197-202`
- Direct ZIP path ที่ไม่มี full package structure: `server/src/export/exportServiceP22a.ts:426-467`
- Bypass scanner ปัจจุบัน scope เฉพาะ `src`: `scripts/gates/bypass-scan.ts:82-87`
- Full verification workflow ทำงานแบบ push/manual: `.github/workflows/verify-full.yml:5-12`
- Gate pull-request workflow paths ไม่รวม release/export modules: `.github/workflows/gate-tests.yml:13-16`
- Release route ยังเป็น incomplete surface: `src/routes/index.tsx:873-880`

## 18. ขั้นถัดไปที่อนุมัติหลังตรวจ Written Spec

หลังเจ้าของยืนยัน written specification นี้ ให้สร้างภาพ interactive Section 4 สองภาษา ห้ามนำเอกสารนี้ไป implement production release, schema, policy หรือ machine-control changes โดยไม่มี implementation plan ที่อนุมัติแยกต่างหาก
