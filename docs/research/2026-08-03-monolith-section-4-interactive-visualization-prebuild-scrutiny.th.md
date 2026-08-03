# Scrutiny ก่อนสร้างภาพ Interactive MONOLITH Section 4

**สถานะ:** OWNER REVIEW — FIX-THEN-BUILD

**วันที่:** 3 สิงหาคม 2026

**Artifact ที่ตรวจ:** [Section 4 Safe Recovery & Proof Design](../superpowers/specs/2026-08-03-monolith-section-4-safe-recovery-proof-design.th.md)

**ขอบเขตการตรวจ:** deliverable การออกแบบถัดไปที่อนุมัติ—ภาพ Interactive Section 4 สองภาษา ซึ่งต้องเป็น non-operational อย่างชัดเจน การตรวจนี้ไม่อนุญาต implementation ด้าน runtime, schema, policy, egress, release หรือ machine control

## 1. Intent

ภาพต้องทำให้ทุกบทบาท V1 เข้าใจสถานะที่ปลอดภัยปัจจุบัน เหตุผล scope ที่กระทบ ผลกระทบ permitted use และ next authorized action หนึ่งอย่าง โดยไม่เปิดเผยความซับซ้อนหลังบ้านเกินจำเป็นหรือสร้างภาพว่า prototype มี runtime authority

## 2. ทางเลือกที่เล็กกว่าก่อน

อย่าเริ่มจากการเพิ่มหน้าใหม่เข้า product, ต่อ API หรือทำ dashboard ที่จำลอง recovery state machine ทั้งชุด

Deliverable ที่เล็กที่สุดและให้คุณค่าจริงคือ standalone fixture-driven prototype ที่มี:

1. **Recovery Decision Card** ตามบทบาทหนึ่งใบเป็น primary surface;
2. **Why / Proof inspector** แบบ progressive disclosure เป็น secondary surface;
3. deterministic role/scenario fixtures พร้อม evaluation mode; และ
4. ไม่มี network call, product-store import, export/download path หรือ action ที่มี authority

แนวทางนี้ reuse `RecoveryCase` projection ที่อนุมัติแล้วแทนการสร้าง presentation entity ใหม่ และทดสอบว่าผู้ใช้เข้าใจ Decision Chain UX หรือไม่ก่อนเพิ่มความเสี่ยงจาก broker/runtime integration

## 3. End-to-end Trace

### เส้นทางที่ prototype ควรทำ

**Role + seeded scenario → deterministic fixture → projection ที่ derive จาก RecoveryCase → role decision card → proof inspector เมื่อขอ → simulated response → measurement record**

### Trace กับ contract ที่อนุมัติ

- Role view ต้องตอบคำถามกลางห้าข้อและ fail closed เมื่อ input เก่า หาย ไม่ตรง ใช้งานไม่ได้ หรือเป็น UNKNOWN: Section 4 บรรทัด 368–378
- Denominator คือ role registry แปดบทบาท `V1-CASEWORK-KITCHEN-RECOVERY-01`: Section 4 บรรทัด 380–393
- Visualization contract ปัจจุบันเริ่มด้วย system-oriented synchronized views สองมุมและระบุว่า “ผู้ตรวจ” เป็นคนเลือก scenario: Section 4 บรรทัด 431–446
- Prototype ต้องรองรับ measurement cell ตาม role/scenario/language/device: Section 4 บรรทัด 450–456
- สร้าง visualization ก่อน broker convergence ได้เฉพาะเมื่อเป็น non-operational ชัดเจนและอ้าง server authorization ไม่ได้: Section 4 บรรทัด 350–360 และ 523–525

### Trace กับ product source ปัจจุบัน

- AppShell ปัจจุบัน enable ปุ่ม Export จริงจาก gate/spec state ที่แสดง: `src/components/layout/AppShell.tsx:176,213-221`
- App ผูกปุ่มนั้นกับ `handleExport`: `src/App.tsx:717-742,878-892`
- Packet path สร้างและดาวน์โหลด ZIP ใน browser: `src/factory/packet/useFactoryPacket.ts:341-365`
- Exact search ยังไม่พบ runtime implementation ของ `RecoveryCase`, `RecoveryEvent`, `DecisionReceipt`, `CapabilityPolicy` หรือ `EgressBroker` ใน `src`, `server` หรือ `supabase` จึงยังเป็น target contracts
- ไม่พบ Interactive Section 4 prototype เดิมใน `docs`; artifact ปัจจุบันคือสเปกและภาคผนวก research/scrutiny

**ผลที่ตรวจยืนยัน:** หากฝัง prototype ในแอปปัจจุบัน simulated recovery controls จะอยู่ใกล้ export behavior ที่เข้าถึงได้จริงและอาจสื่อ authority ที่ runtime ยังไม่มี เส้นทาง validate design ที่ปลอดภัยคือ standalone artifact ที่ isolate แล้ว

## 4. Findings

### [BLOCKER] 1. ยังไม่ Freeze Boundary ที่ Isolate Prototype

**Finding:** คำว่า “clearly labelled non-operational” ยังไม่กำหนดว่า prototype import product stores, เรียก API, เขียน state, ดาวน์โหลด artifact หรืออยู่ข้าง real export controls ได้หรือไม่

**Why it matters:** mock action ที่ดูน่าเชื่อถือภายใน AppShell เดิมอาจถูกเข้าใจว่าเป็น authorized action ขณะที่ AppShell มี Export path จริง

**Evidence:** Section 4 บรรทัด 350–360 และ 523–525 อนุญาต non-operational visualization ส่วน `src/components/layout/AppShell.tsx:176,221` และ `src/factory/packet/useFactoryPacket.ts:341-365` แสดง export/download behavior ที่เข้าถึงได้

**Suggested change:** บังคับเป็น standalone docs artifact ที่ใช้ deterministic local fixtures เท่านั้น ห้าม runtime import, network, persistence, download หรือ egress และมี banner ถาวร “DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION”

### [MAJOR] 2. Information Architecture เริ่มจากระบบแทนที่จะเริ่มจากบทบาท

**Finding:** Section 14 กำหนด Recovery Case/Event Chain และ Capability Gate/Egress เป็นสอง primary views แต่ Section 13 สัญญาว่าจะใช้ภาษาสงบตามบทบาทและมี primary action เดียว

**Why it matters:** ลูกค้าและบทบาทที่ไม่ใช่ technical จะเจอ lifecycle, policy, quorum และ broker ก่อนตอบคำถามตัดสินใจของตน

**Evidence:** Section 4 บรรทัด 364–378 กำหนด role experience ส่วนบรรทัด 431–434 กำหนด entry surface ปัจจุบันของ visualization

**Suggested change:** ให้ Recovery Decision Card ตามบทบาทเป็น primary screen และซ่อน event chain, evidence, policy และ broker detail ไว้หลัง “เหตุใดงานจึงหยุด?” หรือ “ดูหลักฐาน” เปิด full inspector เป็น default เฉพาะ reviewer/test mode

### [MAJOR] 3. Reviewer-only Scenario Control ขัดกับ Role Coverage

**Finding:** Denominator ที่ freeze มีแปดบทบาท แต่ Section 14 ระบุเพียงว่า “ผู้ตรวจ” เลือก representative scenarios

**Why it matters:** Artifact อาจถูกประกาศว่าครบหลังพิสูจน์ reviewer view แต่ข้าม client, estimator/procurement, installer/field หรือ factory comprehension

**Evidence:** Section 4 บรรทัด 380–393 freeze แปดบทบาท; บรรทัด 436 ระบุเฉพาะผู้ตรวจ; บรรทัด 452–454 บังคับผลแยกตาม role/scenario cell

**Suggested change:** มี Role selector และ Scenario selector แยกกันพร้อม versioned coverage manifest ไม่ต้องแสดง Cartesian product ทั้ง 56 คู่ใน UI แต่ต้องมี risk-relevant seeded scenario อย่างน้อยหนึ่งรายการต่อบทบาทและ coverage ชัดเจนครบ registry

### [MAJOR] 4. กฎ “Field ชุดเดียวกัน” ขัดกับ Role-derived Presentation

**Finding:** Section 14 ระบุว่าทุก scenario update field ชุดเดียวกัน แต่ Section 13 กำหนดคำถามกลางห้าข้อพร้อม policy-critical role fields และ progressive disclosure

**Why it matters:** Raw-field dashboard ชุดตายตัวจะหนักเกินไปสำหรับลูกค้า หรือซ่อนหลักฐานที่ reviewer, factory engineer และ field verifier ต้องใช้

**Evidence:** Section 4 บรรทัด 368–378 กำหนด derived role view; บรรทัด 384–393 กำหนด role-specific critical information; บรรทัด 446 บังคับ same fields

**Suggested change:** Freeze คำถามกลางห้าข้อเป็น shared skeleton ไม่ใช่ shared raw-field list แต่ละ fixture ต้อง map role-critical fields เพิ่มเติมและระบุว่ารายละเอียดใดซ่อน สรุป หรือขยาย

### [MAJOR] 5. Scenario Library ยังไม่ Pressure-test Truth Rules ใหม่

**Finding:** Seven scenarios ครอบคลุม domain/control failures แต่ยังไม่ครอบคลุม pending assignment acceptance, truth source ใช้งานไม่ได้ชั่วคราว, UNKNOWN impact, newer HOLD ที่ขัด old Approved display หรือ broker denial หลัง stale action อย่างชัดเจน

**Why it matters:** Prototype อาจ validate เฉพาะ snapshot ที่สอดคล้องกันและไม่เคยแสดง fail-closed behavior ที่เพิ่งเพิ่มจาก correction ที่อนุมัติ

**Evidence:** Section 4 บรรทัด 438–444 แสดง scenario list; บรรทัด 378, 474–477 และ 488–497 กำหนด pressure states ที่ยังขาด

**Suggested change:** เพิ่ม deterministic fixtures ข้าม scenario สี่รายการ: `PENDING_ASSIGNMENT`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL` และ `STALE_ACTION_BROKER_DENIED`

### [MAJOR] 6. Simulated Action ยังไม่มี Outcome Semantics ที่ Freeze

**Finding:** Visualization ต้องมี next action แต่ไม่กำหนดว่าการคลิกทำอะไรได้ใน non-operational artifact

**Why it matters:** ปุ่มตายทดสอบความเข้าใจ Decision Chain ไม่ได้ ส่วนปุ่มที่ดูเหมือน commit สำเร็จอาจสื่อ server authorization ผิด

**Evidence:** Section 4 บรรทัด 364–378 บังคับ next action หนึ่งอย่างและ server revalidation ส่วนบรรทัด 350–360 ห้าม visualization ออก `EgressGrant` หรืออ้าง authorization

**Suggested change:** Action เปลี่ยนได้เฉพาะ deterministic fixture snapshots และต้องใช้คำว่า “Simulate” ผลทุกครั้งแสดง expected case version, simulated policy result และระบุว่า runtime ต้อง server revalidation หรือไม่ Success message ห้ามใช้ Approved, Released, Resumed หรือ Downloaded โดยไม่มีคำว่า “SIMULATED” ที่มองเห็นได้

### [MAJOR] 7. Measurement Contract ยังไม่มี Prototype Harness

**Finding:** Section 15 กำหนด clock boundaries, cell reporting, exclusions, confidence intervals และ stop conditions แต่ Section 14 ไม่กำหนด stable scenario identity หรือวิธีบันทึก test observation

**Why it matters:** Informal walkthrough ใช้พิสูจน์เป้าหมาย 30 วินาที/95% ไม่ได้และอาจซ่อนบทบาทที่ล้มเหลวด้วยการเลือก scenario

**Evidence:** Section 4 บรรทัด 450–456 และ 478–479 กำหนด measurement obligations แต่บรรทัด 429–446 ไม่มี harness contract

**Suggested change:** เพิ่ม evaluator mode แยก ซึ่งมี immutable fixture ID, role-registry version, scenario, risk, language, viewport, start/stop markers, answer rubric, support event, unsafe-action flag และ export-free local result summary โดยซ่อน evaluator surface จาก participant

### [MAJOR] 8. Visual Safety และ Bilingual Accessibility Semantics ยังไม่ชัด

**Finding:** สเปกบังคับ accessibility ไทย/อังกฤษและ non-operational label แต่ยังไม่ freeze วิธีแยก status, severity, proof type, mutable projection และ simulated action โดยไม่พึ่งสีหรือ English jargon

**Why it matters:** การใช้ corporate identity ที่อนุมัติอาจทำให้ prototype สวย แต่ status meaning ยังเข้าถึงไม่ได้หรือทำให้เข้าใจผิด

**Evidence:** Section 4 บรรทัด 303 บังคับ role-specific accessibility tests ไทย/อังกฤษ; บรรทัด 364–378 บังคับ calm language และ truth distinction; บรรทัด 446 บังคับแยก projection/proof

**Suggested change:** บังคับ text + icon/shape semantics, keyboard navigation, visible focus, screen-reader announcements, Thai/English fixture parity, responsive layouts และ client-safe vocabulary Corporate identity ใช้ตกแต่ง surface ได้แต่ห้ามให้สีเป็นผู้สื่อ safety meaning เพียงอย่างเดียว

## 5. Minimum Pre-build Correction Contract

Freeze แปดข้อนี้ก่อนสร้าง visualization:

1. standalone fixture-only artifact boundary;
2. role decision card ก่อน และ proof/system inspector ตามหลัง;
3. eight-role coverage manifest พร้อม role/scenario controls แยกกัน;
4. five universal questions พร้อม role-critical fields แทน raw field set เดียว;
5. truth-pressure fixtures สี่รายการเพิ่มจาก domain scenarios เจ็ดรายการ;
6. simulate-only action และ outcome semantics;
7. evaluator harness ที่ตรง measurement protocol; และ
8. non-operational, bilingual, accessible visual semantics แบบถาวร

Fixture schema ใช้ชื่อจาก Section 4 ได้ แต่เป็น test data ไม่ใช่ persisted contract ใหม่หรือ runtime authority

## 6. Verdict

**FIX-THEN-BUILD.** สถาปัตยกรรม Section 4 ไม่ต้อง rework แต่ Visualization Contract ต้องรับ bounded pre-build corrections แปดข้อด้านบน เพราะ framing แบบ reviewer/system-first ปัจจุบันยังไม่รับประกัน prototype ที่ปลอดภัย role-first วัดผลได้ และ non-operational จริง
