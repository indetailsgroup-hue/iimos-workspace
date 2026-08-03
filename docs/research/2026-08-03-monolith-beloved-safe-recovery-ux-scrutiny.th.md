# รายงาน Scrutinize: งานวิจัย UX การกู้คืนที่ปลอดภัยและเป็นที่รักของ MONOLITH

**วันที่:** 3 สิงหาคม 2026

**รูปแบบการตรวจ:** ตรวจ end-to-end จากมุมคนนอก

**เอกสารที่ตรวจ:** [งานวิจัยเชิงลึก MONOLITH: UX การกู้คืนที่ปลอดภัยและเป็นที่รัก](2026-08-03-monolith-beloved-safe-recovery-ux-deep-research.th.md)

**Baseline ที่อนุมัติแล้ว:** [การออกแบบ MONOLITH Section 4: Safe Recovery & Proof](../superpowers/specs/2026-08-03-monolith-section-4-safe-recovery-proof-design.th.md)

**คำตัดสิน:** **ต้องแก้ก่อนนำเข้า Section 4**

## เจตนาในหนึ่งประโยค

ทำให้ทุกบทบาทเข้าใจและกู้คืนจากความผิดพลาดได้อย่างเป็นมนุษย์ โดยไม่ลด exact-revision evidence, อำนาจทางวิชาชีพ, containment หรือ controlled production egress

## ทางเลือกที่เล็กกว่า — การท้าทาย scope ที่บังคับต้องทำ

อย่าเพิ่ม Recovery Presentation Contract ที่มีชื่อแยก หรือสร้าง authoritative view object อีกชิ้น

ให้ใช้ RecoveryCase ที่อนุมัติแล้วเป็น current projection ชุดเดียว และเพิ่มเพียง:

1. mapping จาก RecoveryCase ไปยัง role view แบบ deterministic;
2. กติกา freshness และ fail-closed ของ projection;
3. semantics แยก assignment request ออกจาก assignment acceptance;
4. notification budget;
5. usability tests ที่นิยามวิธีวัดชัดเจน

แนวทางนี้บรรลุเป้าหมายงานวิจัยด้วยคำศัพท์น้อยกว่าและลดความเสี่ยงที่ความจริงสองชุดจะแยกจากกัน Section 4 กำหนด RecoveryCase ปัจจุบัน, primary action หนึ่งอย่าง, last safe revision, owner, consequence, permitted use, มุมมองตามบทบาท, accessibility tests ไทย/อังกฤษ และเป้าหมาย 30 วินาที/95% ไว้แล้ว

## End-to-end trace

### เส้นทางอนาคตที่งานวิจัยอ้าง

งานวิจัยเสนอ:

**RecoveryCase และ proof state → Recovery Decision Card ตามบทบาท → server-authorized action หนึ่งอย่าง → server revalidation → governed effect หรือ controlled egress**

### เส้นทางที่การออกแบบอนุมัติแล้วกำหนด

Section 4 เสนออยู่แล้ว:

**Failure detection → RecoveryCase projection → primary next action → expected case version และ fencing token → CapabilityPolicy evaluation → DecisionReceipt หรือ EgressGrant**

หลักฐาน:

- Section 4 บรรทัด 19 และ 102–119 กำหนด current projection และ field ที่ผู้ใช้ต้องเห็นอยู่แล้ว
- Section 4 บรรทัด 333–378 กำหนดมุมมองตามบทบาทที่ใช้ภาษาสงบ มี action หลักหนึ่งอย่าง และ visualization ของ recovery/egress ที่ sync กัน
- Section 4 บรรทัด 273–285 กำหนด projection contract, concurrency, failure injection, seeded defect, bypass และ accessibility tests ไทย/อังกฤษอยู่แล้ว

### เส้นทางปัจจุบันของผลิตภัณฑ์

Object ที่ตั้งใจไว้ยังไม่ใช่ runtime contract ปัจจุบัน: การค้น source แบบ exact ไม่พบ RecoveryCase, RecoveryEvent, DecisionReceipt, CapabilityPolicy, EgressBroker, RecoveryCardView หรือ Recovery Decision Card ใน **src**, **server** และ **supabase**

เส้นทาง export ที่ผู้ใช้เห็นในผลิตภัณฑ์ปัจจุบันยังแยกหลายทาง:

1. **src/App.tsx:878–892** ส่ง direct export handler ให้ AppShell
2. **src/components/layout/AppShell.tsx:176,221** เปิดปุ่ม “Export to CNC” จาก local gate/spec state ที่แสดงอยู่
3. **src/App.tsx:717–724** เรียก generateFactoryPacketFromStores
4. **src/factory/packet/useFactoryPacket.ts:341–365** สร้างและดาวน์โหลด package ใน browser
5. **src/App.tsx:732–742** upload package ที่ดาวน์โหลดไปแล้วขึ้น server ภายหลัง หาก upload ล้มเหลวมีเพียง warning

พื้นผิว release/export อื่นใช้ checks คนละชุด ได้แก่ GateToolbar, ExportPanel, ReleaseWizardModal, ReleasePanel และ factory JobDetail export path จาก test inventory ที่ตรวจพบ มี focused tests ของ GateToolbar และ ExportPanel แต่ยังไม่มี Recovery contract test และไม่มี test ของ AppShell main-export path

ข้อเท็จจริงนี้ยืนยันคำเตือนของ Section 4: primitive เดิมเป็นเพียง reuse candidate ไม่ใช่ canonical authority ที่ตรวจยืนยันแล้ว

## Findings

### [BLOCKER 1] “ชั้นที่ขาด” ที่เสนอซ้ำกับ Section 4 เกือบทั้งหมด

**Finding:** งานวิจัยระบุว่า Recovery Presentation Contract คือชั้นสำคัญที่ขาด แต่แปด field ที่เสนอ map ตรงกับ RecoveryCase และ role-experience requirements เดิมเกือบหนึ่งต่อหนึ่ง

**Why it matters:** การมีสองชื่อสำหรับ projection เดียวจะทำให้เกิด schema, acceptance criteria และการตีความ UI สองชุด โครงการที่ตั้งใจทำ UX ให้ง่ายจะเพิ่ม conceptual complexity หลังบ้านเสียเอง

**Evidence:**

- งานวิจัยบรรทัด 19 และ 185–195 เรียก presentation contract ว่าเป็นสิ่งที่ต้องเพิ่ม
- งานวิจัยบรรทัด 104–111 กำหนด status/safe state, cause, scope/revision, consequence, evidence gap, primary action, owner และ progress
- Section 4 บรรทัด 106–119 กำหนด failure/risk, scope/revision, impact targets, last safe state, owner, primary next action, policy reference, expected version, fencing token และ state อยู่แล้ว
- Section 4 บรรทัด 335–378 กำหนด calm copy, one primary action, role projection และ scenario fields ชุดเดียวกัน

**Suggested change:** เก็บงานวิจัยไว้เป็นภาคผนวกด้านหลักฐานและ microcopy เปลี่ยนจาก “เพิ่ม Recovery Presentation Contract” เป็น “ทำ mapping การแสดงผลของ RecoveryCase เดิมให้ชัดขึ้น” ห้ามเพิ่ม entity ใหม่หรือ source of truth ชุดที่สอง

### [BLOCKER 2] ข้อเสนอ card-first ไม่กำหนดลำดับ implementation แบบ broker-first

**Finding:** งานวิจัยบอกว่าทุก action บน card ต้องถูก server ตรวจซ้ำ และเฉพาะ controlled egress จึงสร้าง production-usable package ได้ แต่ไม่ได้กำหนดให้รวม release/export paths เดิมเป็น prerequisite ก่อนทำ card

**Why it matters:** Card ที่สงบและดูมี authority ซึ่งวางทับ release paths ที่ยังอยู่ฝั่ง client และแยกหลายชุด อาจเพิ่มความเชื่อของผู้ใช้ทั้งที่ authority boundary จริงยังไม่สอดคล้องกัน

**Evidence:**

- งานวิจัยบรรทัด 113 และ 217–224 กำหนด server authority, exact binding และ controlled egress
- AppShell เปิด main export จาก displayed state ที่ **src/components/layout/AppShell.tsx:176,221**
- Handler นั้นดาวน์โหลดก่อน server upload ที่ **src/App.tsx:717–742** และ **src/factory/packet/useFactoryPacket.ts:341–365**
- GateToolbar และ ExportPanel มี checks ของตนเอง และ factory route มี execution path อีกชุด

**Suggested change:** กำหนดลำดับ implementation ให้ชัด:

1. ทำ inventory และ classify release/export/download surface ทุกจุด;
2. รวม controlled paths ทั้งหมดเข้าสู่ server-owned policy และ egress decision;
3. เพิ่ม contract tests ให้ UI/API/worker/server ตรงกัน;
4. แล้วจึง render RecoveryCase view ตามบทบาท

ห้าม card ระบุว่า action เป็น server-authorized ตราบใดที่ user-facing controlled path ใดยังพึ่ง local display state

### [MAJOR 3] ยังไม่กำหนด truth precedence และ freshness ของ projection

**Finding:** งานวิจัยบอกว่า card คำนวณใหม่ได้และ stale action จะถูกตรวจซ้ำ แต่ไม่กำหนดว่าจะแสดงอะไรเมื่อ RecoveryCase, latest event, receipt validity, policy, evidence หรือ egress state ไม่ตรงกันชั่วคราวหรืออ่านไม่ได้

**Why it matters:** Recovery copy ที่อันตรายที่สุดคือคำว่า “safe”, “saved” หรือ “ready” ที่เก่า Server ปฏิเสธหลังผู้ใช้กดอาจป้องกัน side effect ได้ แต่ยังสร้าง automation surprise และทำลายความไว้วางใจ

**Evidence:**

- งานวิจัยบรรทัด 104–113 ต้องการ safe state ชัดและบอกว่า stale card refresh อย่างปลอดภัย
- Section 4 บรรทัด 117–118 มี expectedVersion และ fencingToken อยู่แล้ว แต่ visible contract ในงานวิจัยไม่กำหนด projection version, policy version, evidence snapshot หรือ precedence
- Source ปัจจุบันมี local/server state seams หลายจุด; **src/core/store/useSpecStore.ts:616–713** ทำ asynchronous server release ขณะที่ **src/core/store/useSpecStore.ts:788–822** derive displayed gate status โดยไม่ใช้ server-sync status

**Suggested change:** กำหนด presenter rule แบบ deterministic:

- ผูกทุก rendered action กับ caseVersion, latestEventId, policyVersion, evidenceSnapshotId, actor scope และ renderedAt;
- HOLD มี precedence เหนือ state ลำดับต่ำกว่าทั้งหมด;
- proof ที่ revoked หรือ invalidated มี precedence เหนือ approval เก่า;
- หาก source ที่จำเป็นอ่านไม่ได้ ไม่ตรง หรือ stale ให้แสดง “กำลังอัปเดตสถานะ—งานยังถูกพัก” และเปิดเพียง refresh, report หรือ authorized escalation;
- ห้ามอนุมานว่า scope ที่ไม่กระทบยังปลอดภัยเมื่อ impact discovery เป็น UNKNOWN

### [MAJOR 4] Handoff acknowledgement ขัดกับ lifecycle แปด state ที่อนุมัติ

**Finding:** งานวิจัยบอกว่าห้ามแสดง handoff ว่า assigned จนผู้รับ acknowledge แต่ Section 4 เปลี่ยนเป็น ASSIGNED ทันทีเมื่อมี owner, deadline และ escalation path

**Why it matters:** Case เดียวกันอาจเป็น “ASSIGNED” ใน lifecycle แต่เป็น “requested—not accepted” บน card ความกำกวมนี้สร้าง handoff gap แบบที่ feature ตั้งใจแก้

**Evidence:**

- งานวิจัยบรรทัด 192 และ 204 เพิ่ม requested/acknowledged handoff และห้ามใช้ “assigned” ก่อนเวลา
- Section 4 บรรทัด 139 กำหนด CONTAINED → ASSIGNED โดยไม่ต้องมี recipient acceptance
- RecoveryCase มี owner และ escalationOwner แต่ไม่มี assignment-request projection ที่ Section 4 บรรทัด 114
- **src/workflow/handoff/canonical.ts:35–57** ปัจจุบันตรวจ process order และ active site เท่านั้น ไม่ model recipient acceptance

**Suggested change:** คง lifecycle แปด state:

- เขียน RecoveryEvent แบบ assignment-requested และ assignment-accepted;
- คง case ไว้ที่ CONTAINED จนได้รับ acceptance ที่ policy บังคับ หรือบันทึก incident-policy auto-assignment โดย authority อย่างชัดเจน;
- transition เป็น ASSIGNED เมื่อ acknowledgement condition ตาม policy ผ่านเท่านั้น;
- project requested owner, acceptance state, deadline และ escalation โดยไม่สร้าง lifecycle state ที่เก้า

### [MAJOR 5] คำว่า “ทุกบทบาท” และ cross-domain ยังไม่มี Role Registry กำหนดขอบเขต

**Finding:** งานวิจัยเพิ่ม estimator/procurement แต่บอกให้ Section 4 คงเดิม ขณะที่ Section 4 ไม่มีบทบาทนี้ และทั้งสองเอกสารไม่มี installer/field recovery แม้ platform และ post-release scenarios เกี่ยวข้องกับงานหน้างาน

**Why it matters:** “Each role” กลายเป็น acceptance criterion ที่ไม่มี denominator Shared card อาจดูครบถ้วนทั้งที่บทบาทซึ่งรับงาน ติดตั้ง วัดหน้างาน หรือรายงาน defect ไม่มี authority หรือมุมมองที่กำหนดไว้

**Evidence:**

- งานวิจัยบรรทัด 125–134 กำหนดหก projection รวม estimator/procurement
- Section 4 บรรทัด 337–359 กำหนด client, designer, reviewer, coordinator, factory engineer และ CNC operator แต่ไม่มี estimator/procurement
- งานวิจัยบรรทัด 272–276 อ้างการใช้กับ Interior Architecture Domain Pack ที่ qualify แล้วทุกหมวด
- CONTEXT ของ parent repository ระบุชัดว่า MONOLITH ให้บริการ installer รวมกับ designer, factory และ customer

**Suggested change:** เพิ่ม V1 Role Registry แบบ versioned ซึ่งระบุ:

- role และ authority purpose;
- case ที่ role มองเห็นได้;
- permitted actions และ prohibited decisions;
- field สำคัญที่ต้องเห็นเสมอ;
- handoff/acknowledgement responsibility;
- seeded test scenarios

ให้ตัดสินชัดว่าจะรวม estimator/procurement และ installer/field ใน Section 4 V1 หรือระบุว่า defer ห้ามใช้คำว่า “ทุกบทบาท” จน freeze denominator ของ registry

### [MAJOR 6] Hard cap แปด field อาจซ่อนข้อมูลสำคัญตามบทบาท

**Finding:** “ไม่เกินแปด field” ถูกเสนอเป็น universal contract ทั้งที่ factory, security, revocation และ qualification ต้องเห็นข้อเท็จจริงสำคัญต่างกัน

**Why it matters:** Progressive disclosure ห้ามซ่อน machine, permitted use, expiry, active package identity, acknowledgement coverage หรือ HOLD การรวมหลายข้อเท็จจริงไว้ใน field ชื่อเดียวรักษาจำนวนได้ แต่ไม่ได้ทำให้ cognitive load ง่ายขึ้น

**Evidence:**

- งานวิจัยบรรทัด 100–111 กำหนด hard cap
- Section 4 บรรทัด 353–359 กำหนดให้ factory user เห็น candidate identity, machine context, permitted use, last ACTIVE comparison, acknowledgement, qualification restriction, procedure และ expiry
- งานวิจัยบรรทัด 274 ขยาย contract เดียวไปยังหลาย domain ที่มี risk evidence ต่างกัน

**Suggested change:** แทน field-count cap ด้วย:

- คำถามสากลห้าข้อ: status/safe state, what happened, affected scope, consequence และ next action;
- policy-defined always-visible critical fields ตาม actor และ capability;
- evidence/detail drawer สำหรับข้อมูลลึกที่ไม่ critical;
- usability tests ที่วัด orientation และ error ไม่ใช่จำนวน visual fields

### [MAJOR 7] Notification tiers และ assignment acceptance ยังไม่ reconcile กับ workflow semantics ปัจจุบัน

**Finding:** งานวิจัยเสนอ immediate/action-queue/digest/activity-only tiers แต่ routing ปัจจุบันแยกเพียง direct push กับ group message และส่ง FYI เป็น group message

**Why it matters:** Recovery card ใหม่จะลด alert fatigue ไม่ได้ หาก backstage router ยัง broadcast FYI ที่ลงมือไม่ได้ หรือถือว่าการส่งเท่ากับ assignment

**Evidence:**

- งานวิจัยบรรทัด 193 และ 204 เสนอ tiering และ acknowledgement
- **src/workflow/notification/routing.ts:4–23** map personal responsibility/approval ไป direct push และ cross-team handoff/FYI ไป group message
- **src/workflow/handoff/canonical.ts:35–57** ไม่มี acknowledgement

**Suggested change:** กำหนด recovery notification intent จาก severity, actor capability, required response, deadline และ acknowledgement mode ให้ข้อมูลที่ลงมือไม่ได้ไป digest หรือ activity log เป็น default และแยก delivery, read, acceptance กับ containment acknowledgement เป็นคนละ event

### [MAJOR 8] Usability targets ยัง falsify ไม่ได้ในเชิงปฏิบัติ

**Finding:** เป้าหมาย 30 วินาที, 95% และ 100% ไม่กำหนด clock start, denominator, sample, task mix, baseline, confidence interval หรือวิธีแยกผลตามบทบาทและ risk class

**Why it matters:** ผลรวมอาจซ่อน workflow ของ CNC หรือ reviewer ที่ล้มเหลวไว้หลัง task ของ client ที่ง่ายกว่า “100% ใน qualification testing” จาก sample เล็กไม่ได้พิสูจน์ safety property

**Evidence:**

- งานวิจัยบรรทัด 243–257 กำหนด target โดยไม่มี measurement protocol
- Section 4 บรรทัด 396–397 ใช้ median 30 วินาทีและ 95% โดยยังไม่มี frozen test protocol เช่นกัน
- งานวิจัยบรรทัด 232–241 รวม routine comprehension, professional review, handoff, manufacturing, replay และ accessibility ไว้ในชุดเดียว

**Suggested change:** Freeze measurement protocol:

- กำหนด clock start และ successful end state จาก event;
- รายงานแยกตาม role, language, device, risk class และ scenario;
- กำหนด sample size และ confidence interval ก่อน pilot;
- วัด safe first action, completion, backtracking, evidence opening, support escape และ NASA-TLX เทียบ baseline;
- บังคับ safety invariants ด้วย automated/property/failure-injection tests และถือ human study เป็น usability evidence ไม่ใช่หลักฐานว่าเหตุการณ์อันตรายเป็นไปไม่ได้

## สิ่งที่ผ่านการ scrutinize และควรเก็บไว้

ข้อเสนอจากงานวิจัยต่อไปนี้ควรเก็บ:

- เป้าหมายด้านอารมณ์คือความโล่งใจ ไม่ใช่ความตื่นตา;
- คำอธิบายตามเวลา why / now / next;
- microcopy ที่บอกสถานะโดยไม่กล่าวโทษ;
- ภาษาที่บอก saved work และ safe state ชัด;
- preview/diff ก่อน consequential commitment;
- appropriate reliance แทน trust score;
- notification discipline;
- ข้อกำหนดภาษาไทย/อังกฤษและ assistive technology;
- seeded recovery scenarios ตามบทบาท;
- ภาษาที่บอกขอบเขต revocation ตามจริงและการคง physical machine safeguards แยกจาก software

ทั้งหมดนี้ช่วยเสริม presentation และ validation clauses ของ Section 4 เดิม โดยไม่ต้องสร้าง authoritative object ใหม่

## ชุดแก้ขั้นต่ำก่อนให้ owner อนุมัติ

1. จัดประเภทงานวิจัยใหม่ให้เป็น evidence และ UX guidance appendix ของ Section 4
2. ลบข้ออ้างว่า Recovery Presentation Contract ที่มีชื่อแยกคือ material missing layer
3. เพิ่ม RecoveryCase-to-role-view mapping และ fail-closed freshness/precedence rules ใน Section 4
4. ตัดสิน requested versus accepted assignment โดยไม่เพิ่ม lifecycle state
5. Freeze V1 Role Registry และตัดสิน scope ของ estimator/procurement กับ installer/field ให้ชัด
6. เปลี่ยน hard cap แปด field เป็น universal questions บวก policy-critical role fields
7. กำหนด notification intent, acknowledgement semantics และ measurement protocol
8. ทำ broker-first convergence ของ export/release path ปัจจุบันทุกจุดให้เป็น prerequisite ก่อน implement UI

## Repository boundary และการจัดประเภทหลักฐาน

- **VERIFIED FACT — parent root:** Parent repository เป็น governance/bootstrap root และระบุ installer เป็นหนึ่งในกลุ่มที่ platform ให้บริการ
- **VERIFIED FACT — nested root:** มี release, workflow, factory และ export source จำนวนมาก มี UI entry paths หลายจุด และยังไม่มี implementation แบบ exact ของ Recovery contract ชื่อใหม่
- **OWNER DECISION:** RecoveryCase, RecoveryEvent, DecisionReceipt, CapabilityPolicy, lifecycle และ EgressBroker model ของ Section 4
- **PRODUCT-DESIGN INFERENCE:** Card layout, field budget, role projection, microcopy และ notification tiers
- **UNKNOWN / ยังไม่ยืนยัน:** พฤติกรรมหลัง deploy, production readiness, ความรักของผู้ใช้, machine qualification หรือผล recovery จาก real job

การ scrutinize รอบนี้ไม่ได้แก้ production code หรือไฟล์ Section 4 ที่อนุมัติแล้ว

## Final verdict

**FIX-THEN-SHIP ในฐานะข้อมูลนำเข้า Section 4**

หลักฐานและ human-factors guidance มีประโยชน์ แต่คำแนะนำปัจจุบันซ้ำกับ projection model ที่อนุมัติแล้ว และยังไม่แก้ authority-path, projection-freshness, assignment-acknowledgement, role-denominator และ measurement seams ที่เกิดขึ้นจริง
