# ADR-069 — กำหนด Repair Operations เป็น Bounded Context ใน MONOLITH

**สถานะ:** มติสถาปัตยกรรม Phase A ที่เจ้าของอนุมัติ โดยมีเงื่อนไขบังคับก่อน Phase B

**การอนุมัติ ADR ฉบับเขียน:** `APPROVED — 7 สิงหาคม 2026`

**วันที่:** 7 สิงหาคม 2026

**อำนาจใช้งานจริง:** ไม่มี

**G−0:** `DISABLED`

**G−1:** `BLOCKED`

## 1. มติ

MONOLITH จะจัดงานซ่อมอาคารและงานบำรุงรักษาสถานที่เป็น bounded context ใหม่ชื่อ **Repair Operations** ภายใน modular monolith เดิม ส่วน **Repair Intelligence** เป็นชั้นช่วยวิเคราะห์ภายใน context นี้ ไม่ใช่ระบบหลักของข้อมูล และไม่ใช่ runtime หรือ microservice แยกต่างหาก

ห้าม merge repository Repair Intelligence ที่แยกทดลองอยู่เข้ามาโดยตรง Repository ดังกล่าวให้คงไว้เป็นแหล่งหลักฐานการบ่มแนวคิดและ governance เท่านั้น กฎโดเมนและ records ที่ผ่านการอนุมัติอาจถูก port ภายหลังผ่าน adapter ที่ระบุชัด เมื่อผ่าน gate ใน ADR นี้แล้ว

ADR นี้ให้อำนาจเฉพาะการจัดทำเอกสารสถาปัตยกรรม ไม่ให้อำนาจสร้าง runtime code, database schema, LINE configuration, webhook routing, feature activation, การซ้อมมนุษย์, ติดต่อ vendor, ใช้เงิน หรือเปิดใช้งานจริง

## 2. บริบทและเจตนา

เป้าหมายเชิงปฏิบัติการคือให้พนักงานในอาคารแจ้งปัญหาได้ง่ายที่สุด—โดยปกติส่งรูปผ่าน LINE ของอาคาร—ขณะที่ MONOLITH ดูแลการรักษาหลักฐาน การส่งต่อ การประสานเคส การยกระดับความปลอดภัย การจัดหาราคา การอนุมัติ การตรวจรับ และ audit อยู่หลังบ้าน

MONOLITH มี platform capabilities แนวนอนอยู่แล้ว ได้แก่ การตรวจลายเซ็นและ idempotency ของ LINE webhook, identity binding, การจำกัดสิทธิ์ตาม site, capture artifacts, การดึง media, notification, รูปแบบ approval และ append-only audit การสร้างสิ่งเหล่านี้ซ้ำจะทำให้เกิด trust boundary ที่แข่งขันกันเอง

โมเดล `installation_issues` เดิมไม่สามารถเป็น aggregate ของ Repair Operations ได้ เพราะผูกกับโครงการติดตั้งและห้อง และมี lifecycle เฉพาะงานติดตั้ง กระบวนการ workflow เดิมก็ผูกกับลำดับ Sale ถึง Installation จึงห้ามบิดความหมายเพื่อแทนงานซ่อมอาคาร

## 3. Provenance

แหล่งบ่มแนวคิดที่อนุมัติคือ:

- Source repository: `MONOLITH Repair Intelligence/repair-intelligence-app`
- Source branch: `codex/g0-readiness-record-set-prototype`
- Source commit: `080af03ea71253952ffc91095eeba36eaafe61d1`
- G−0 manifest SHA-256: `237A328F78E35336E616C350152236A5350E43F7F34D059665E06D3EE6266EC4`

Provenance นี้บันทึกเพียงที่มาของแบบออกแบบ ไม่ก่อให้เกิดอำนาจปฏิบัติการหรืออำนาจเชิงพาณิชย์

## 4. ขอบเขตและความเป็นเจ้าของ

Repair Operations เป็นเจ้าของ lifecycle ของ repair case, safety containment, technical assessment, assignment, การประสาน sourcing, การเปรียบเทียบราคา, authority reference, การทำงาน, การตรวจสอบ, การตรวจรับ, warranty, การเปิดเคสซ้ำ และประวัติ case event

ส่วนที่ reuse จาก MONOLITH ผ่าน adapter ได้แก่:

- การตรวจลายเซ็น LINE, channel topology, webhook idempotency และ outbound delivery;
- identity binding และ actor resolution;
- ขอบเขต `site_code` และแนวทาง row-level security;
- capture artifacts และ media retrieval;
- notification, retry, quiet hours และ escalation;
- รูปแบบ immutable audit และ autonomy vocabulary กลาง

ส่วนที่ห้าม reuse หรือบิดความหมายโดยตรง:

- ห้ามใช้ `installation_issues` เป็น facility repair case;
- ห้ามใช้ process model ตั้งแต่ Sale ถึง Installation เป็น repair lifecycle;
- ห้ามตีความ work-item approval เดิมเป็นอำนาจการเงินหรือกฎหมาย;
- ห้ามใช้ generated G−0 forms เป็น runtime records

## 5. Conceptual flow

`LINE webhook → ตรวจ context binding → fail-closed context router → repair intake draft → human triage → repair case → safety/assessment → sourcing/authority → work → inspection/acceptance → close หรือ reopen`

รูป ข้อความ ผล classifier หรือ feature flag เพียงอย่างเดียวห้ามสร้างข้อผูกพันภายนอก วินิจฉัยภาวะอันตราย เลือก vendor อนุมัติค่าใช้จ่าย หรือปิดเคส

## 6. เงื่อนไขบังคับก่อน Phase B

### 6.1 Context routing ต้อง fail closed

Router ต้องใช้ controlled binding metadata เป็นหลัก ไม่ใช่ AI content classification และต้องคืนผลหนึ่งในสี่สถานะที่ชัดเจน:

- `RESOLVED_INSTALLATION`
- `RESOLVED_FACILITY_REPAIR`
- `AMBIGUOUS_OR_CONFLICTING`
- `UNBOUND`

`AMBIGUOUS_OR_CONFLICTING` และ `UNBOUND` ห้ามเข้า business lifecycle ใดทั้งสิ้น ต้องไปยัง quarantine/triage queue ที่มนุษย์ควบคุม รักษาหลักฐานต้นฉบับตามกฎ privacy และห้ามเกิด side effect ด้าน completion, procurement, การแจ้ง vendor หรือ authority

หากเนื้อหาอาจบ่งชี้อันตรายทันที Router ทำได้เพียงยก Human Safety Trigger เพื่อให้มนุษย์ตรวจเร่งด่วน ห้ามวินิจฉัยจากรูป กฎคือ “ไม่แน่ใจให้ยกระดับ” ไม่ใช่ส่งเข้าทางใดทางหนึ่งแบบเงียบ ๆ

### 6.2 ต้องกำหนด retention และ privacy แยกต่างหาก

ก่อนสร้าง capture type หรือ storage path ชื่อ `facility_repair_evidence` โครงการต้องจัดทำ data inventory และ retention/privacy rule สำหรับรูป ตัวตนผู้ส่ง ตำแหน่ง asset reference annotation ผลการจำแนกที่อนุมานขึ้น access log และ exported copy

ตราบใดที่ Legal Entity และ Data Controller ยังเป็น `UNDEFINED`:

- Preservation Hold มีผลเหนือ automatic deletion และ retention ปกติ;
- cleanup worker ห้ามลบหรือทำให้หลักฐาน Repair Operations หมดอายุ;
- ห้ามส่งข้อมูลไปสกัดบน public cloud หรือข้ามประเทศ เว้นแต่ capture type นั้นได้รับอนุมัติแยกโดยตรง;
- การเข้าถึงใช้ least privilege และต้องบันทึกทุก disclosure หรือ controlled copy;
- การพบเอกสารที่เคยหายภายหลังไม่ปลด hold อัตโนมัติ

Phase B ถูกบล็อกจนกว่า retention schedule ที่อนุมัติจะระบุฐานกฎหมายหรือสัญญาและผู้มีอำนาจที่อนุมัติ

### 6.3 การเปิดใช้ต้องผูกกับ authority ไม่ใช่ feature flag อย่างเดียว

Software feature flag เป็นเพียง technical interlock ไม่ใช่ authority grant

เงื่อนไขเปิดใช้จริงต้องเป็น:

`technical_flag = ON` **และ** `valid_G1_unblock_record = PRESENT` **และ** `authority_reference_matches = TRUE`

G−1 Unblock Record ต้องได้รับความเห็นชอบเป็นเอกฉันท์จาก Corporate Authority Approver, Safety Owner, Privacy/Governance Approver และ Independent Readiness Observer ส่วน Custodian ตรวจได้เฉพาะการควบคุม records แต่ไม่มีอำนาจอนุมัติ activation นักพัฒนา ผู้ดูแล repository, CI/CD, deployment operator และ database administrator ต้องไม่สามารถสร้างอำนาจได้ด้วยการเปลี่ยน configuration

Runtime ต้อง fail closed เมื่อ authority record ขาด หมดอายุ ถูกแทนที่ ขัดแย้ง นอกขอบเขต หรือไม่สามารถจับคู่กับ deployment configuration ได้ทั้งเชิง cryptographic หรือเชิงกระบวนการ ความเงียบ เวลาที่ผ่านไป deployment สำเร็จ หรือ environment variable ไม่เคยเปิด route ได้เอง

### 6.4 Phase B ต้องถอดกลับได้และมี rollback

Phase B ต้องเป็นการเพิ่มแบบ additive และถอดออกได้ตราบใดที่ยังไม่มี production data หรือ external commitment ก่อนนำ schema ไปใช้ภายนอก isolated development environment ต้องมี:

- dependency inventory ของ `repair_*` object และ adapter ทุกตัว;
- teardown หรือ compensating migration ที่ทดสอบแล้วสำหรับกรณีไม่มีข้อมูล;
- ห้ามแก้ installation, LINE, workflow หรือ capture records แบบย้อนกลับไม่ได้;
- เมื่อ feature ปิด flow เดิมของ MONOLITH ต้องไม่เปลี่ยน;
- orphan scan ยืนยันว่าไม่เหลือ job, binding, storage object, policy, function, trigger, queue หรือ reference;
- เก็บ audit record อธิบายเหตุผลที่ถอนการทดลอง

ห้ามเขียนทับ migration history ที่ใช้แล้ว หาก migration ถูกใช้ใน shared หรือ production-like infrastructure ต้อง rollback ด้วย compensating migration ใหม่

ต้อง rollback เมื่อ human drills ล้มเหลวซ้ำโดยไม่มี correction path ที่อนุมัติ ไม่สามารถกำหนด Legal Entity/Data Controller ไม่สามารถตรวจ authority evidence ไม่สามารถอนุมัติ privacy/retention หรือพบว่า context boundary ไม่ตรงกับการปฏิบัติงานจริง

เมื่อมี production data หรือ external commitment จริง clean teardown ไม่เพียงพอ ต้องมีแผน archival, migration, notification และ legal closeout ที่ได้รับอนุมัติแยก

## 7. ขอบเขตแต่ละระยะ

### Phase A — Architecture Port (ADR นี้อนุญาต)

- รักษา repository แยกและ provenance;
- บันทึกมติ bounded context;
- ระบุ platform reuse และ coupling ที่ห้ามทำ;
- ไม่สร้าง runtime code, schema, route, flag, credential หรือ live configuration

### Phase B — Skeleton Integration (ยังไม่อนุญาต)

วางแผนได้ต่อเมื่อเงื่อนไขทั้งสี่ในหมวด 6 ถูกเขียนเป็น acceptance criteria ที่ทดสอบได้ Implementation plan ในอนาคตต้องได้รับอนุมัติจากเจ้าของแยกต่างหาก

### Phase C — G−0 Human Validation (ยังไม่อนุญาต)

Human drills 9 รายการยังห้ามดำเนินการจนกว่าจะได้รับอำนาจแยก Tests ทางเทคนิคที่ผ่านไม่ถือว่า Gate นี้ผ่าน

### Phase D — Controlled G−1 (ถูกบล็อก)

ต้องมี Legal Entity, Data Controller, retention schedule, authority/DOA records, มติ G−1 unblock แบบเอกฉันท์ และ controlled cohort ที่อนุมัติแล้ว

### Phase E — Automation Research (ถูกบล็อก)

ศึกษา automation ได้ต่อเมื่อ controlled cohort ให้ผลลัพธ์ที่กำกับแยกชื่อ `AUTOMATION_RESEARCH_ELIGIBLE` และผลลัพธ์นี้ไม่ใช่อำนาจ deploy automation

## 8. ทางเลือกที่ปฏิเสธ

1. **Merge repository ตรง:** ปฏิเสธเพราะแหล่งต้นทางเป็น governance/readiness prototype ไม่ใช่ runtime feature ของ MONOLITH
2. **ขยาย `installation_issues`:** ปฏิเสธเพราะ aggregate, authorization, location และ lifecycle เป็นงานติดตั้งโดยเฉพาะ
3. **สร้าง microservice ใหม่:** ยังปฏิเสธเพราะจะสร้าง trust boundary ซ้ำก่อนพิสูจน์ความต้องการด้าน scaling หรือ ownership
4. **ทำ workflow engine ทั้งระบบให้ generic ก่อน:** ปฏิเสธว่าเร็วเกินไป Repair Operations ต้องพิสูจน์ lifecycle ของตนโดยไม่ทำให้ production workflow เดิมอ่อนลง

## 9. ผลที่ตามมา

ผลเชิงบวก:

- MONOLITH มี trust boundary เดียวสำหรับ LINE, identity, site scope, capture, notification และ audit;
- repair semantics ชัดเจนและทดสอบได้แยก;
- authority และ safety ยังอยู่ภายใต้มนุษย์;
- rollback ยังเป็นไปได้ก่อนใช้ production;
- UX ยังเป็น LINE-first ได้โดยไม่ใช้สมาชิกกลุ่ม LINE เป็นแหล่ง authorization

ต้นทุนและข้อจำกัด:

- Repair Operations ต้องมี lifecycle และ application adapters ของตน;
- LINE group binding เดิมต้องมี context-aware seam แทนการ hard-code installation;
- financial approval ยังออกใช้ไม่ได้จนกว่าจะตรวจ legal authority และ DOA;
- Phase A ไม่สร้าง operational capability

## 10. เกณฑ์จบ Phase A

Phase A จบเมื่อ:

- ADR ภาษาอังกฤษและภาษาไทยมี standalone HTML ที่เนื้อหาตรงกัน;
- เงื่อนไขก่อน Phase B ทั้งสี่ข้อชัดเจนและไม่ขัดกัน;
- provenance ระบุ source commit และ manifest hash;
- เอกสารระบุ `G−0 = DISABLED` และ `G−1 = BLOCKED`;
- ไม่มี runtime, schema, feature flag, webhook, vendor, spending หรือ live-data change;
- repository diff และ bilingual semantic checks ผ่าน

## 11. Decision record

**คำตัดสิน:** `APPROVED WITH CONDITIONS — PHASE A ONLY`

**การอนุมัติ ADR ฉบับเขียน:** `APPROVED — 7 สิงหาคม 2026`

**การกระทำถัดไปที่อนุญาต:** ขออำนาจจากเจ้าของแยกต่างหากเพื่อจัดทำ Phase B Implementation Plan

**การกระทำถัดไปที่ห้าม:** จัดทำ Phase B Implementation Plan หรือเขียนโค้ด Phase B จนกว่าจะได้รับอำนาจแยกดังกล่าวอย่างชัดแจ้ง
