# งานวิจัยเชิงลึก MONOLITH: UX การกู้คืนที่ปลอดภัยและเป็นที่รัก

**วันที่:** 3 สิงหาคม 2026

**สถานะ:** ข้อเสนอจากงานวิจัยสำหรับนำไป scrutinize; ไม่ใช่ข้ออ้างว่าได้ implement หรือพร้อมใช้งานจริง

**วิธีวิจัย:** ใช้ Perplexity Agent API ทำ deep research แบบแบ่งขอบเขต 2 รอบ แล้วใช้ Perplexity วิเคราะห์เทียบหลักฐานกับ Section 4 ที่อนุมัติแล้ว

**ขอบเขต:** Failure Handling, Recovery, Governance และ Testing Gates ตลอดงาน Interior Architecture ที่ใช้ AI ตั้งแต่ความต้องการลูกค้าจนถึงการใช้ในโรงงาน/CNC แบบควบคุม

## คำตอบสำหรับผู้บริหาร

MONOLITH จะเป็นที่รักเมื่อความผิดพลาดให้ความรู้สึกเหมือน **การส่งต่องานอย่างสงบและมีความสามารถ** ไม่ใช่การตำหนิผู้ใช้ และไม่ใช่หน้าจอควบคุม incident ที่เต็มไปด้วยศัพท์เทคนิค

คำสัญญาที่ผู้ใช้ควรได้รับคือ:

> เมื่อมีบางอย่างผิดปกติ MONOLITH จะรักษางานที่ยังถูกต้องไว้ บอกว่าเกิดอะไรขึ้น แสดงว่าสิ่งใดยังปลอดภัย ให้การกระทำถัดไปหนึ่งอย่างที่ฉันมีสิทธิ์ทำจริง และจัดการการสืบค้น ผลกระทบต่อ dependency, version control, หลักฐาน, อำนาจ, audit, retry และ containment หลังบ้านให้ทั้งหมด

โครงสร้างความปลอดภัยใน Section 4 ที่อนุมัติแล้วแข็งแรงอยู่แล้ว งานวิจัยนี้ **ไม่** สนับสนุนให้สร้าง workflow ใหม่ วัตถุ recovery ที่มีอำนาจใหม่ trust score หรือ AI chatbot สำหรับ recovery จุดที่ขาดจริงคือชั้นบาง ๆ ที่เรียกว่า **Recovery Presentation Contract**: Recovery Decision Card หนึ่งใบที่ปรับตามบทบาท และ derive จาก RecoveryCase, RecoveryEvent, DecisionReceipt, หลักฐาน, capability policy, authority และ egress state ที่มีอยู่

เป้าหมายด้านความรู้สึกคือ **ความโล่งใจพร้อมความไว้วางใจที่พอดีกับหลักฐาน** ผู้ใช้ควรรู้สึกว่าได้รับความช่วยเหลือ แต่ต้องไม่ถูกชักนำให้เชื่อ AI เกินกว่าหลักฐานหรือ permitted use ที่อนุญาต [Guidelines for Human-AI Interaction ของ Microsoft](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf) เน้นการบอกขอบเขตความสามารถ การแก้ไข การปฏิเสธ คำอธิบาย และการคงอำนาจควบคุมของผู้ใช้ [NIST AI RMF](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf) เชื่อม transparency, accountability, monitoring, recourse และ human oversight เข้าด้วยกัน ส่วนงานวิจัยเรื่อง [automation bias](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/) แสดงว่าคำแนะนำที่ดูน่าเชื่อและปุ่มคำสั่งที่ง่ายเกินไปอาจทำให้ทั้งทำตามสิ่งที่ผิดและละเลยสิ่งที่ควรทำ

## สิ่งที่หลักฐานสนับสนุน

### 1. หน้ากู้คืนต้องตอบคำถามตามลำดับเวลาสามข้อ

ผู้ใช้ต้องเข้าใจว่าเหตุใดระบบอัตโนมัติจึงทำเช่นนั้น ตอนนี้ระบบกำลังทำอะไร และต่อไปจะเกิดอะไร สำหรับ MONOLITH แปลงเป็น:

1. อะไรเป็นตัวกระตุ้น recovery case?
2. ตอนนี้อะไรถูกบันทึก พัก แยก กั้น หรือยังปลอดภัย?
3. อะไรจะเกิดอัตโนมัติ อะไรต้องให้คนตัดสิน และอะไรยังห้ามทำ?

คำตอบนี้มีประโยชน์มากกว่าการแสดงรหัส error หรือชื่อ lifecycle state เพียงอย่างเดียว Lifecycle ยังคงเป็นตัวควบคุมระบบ ส่วน card ทำหน้าที่แปลให้คนเข้าใจและลงมือได้

### 2. Appropriate reliance ปลอดภัยกว่าการพยายามให้เชื่อมากที่สุด

เป้าหมายไม่ใช่ “ผู้ใช้เชื่อ AI” แต่คือผู้ใช้ยอมรับความช่วยเหลือที่ถูก ปฏิเสธความช่วยเหลือที่ผิด และรู้ว่าเมื่อใดต้องเปิดหลักฐานหรือให้ผู้เชี่ยวชาญตรวจ [NIST AI RMF Playbook](https://airc.nist.gov/docs/AI_RMF_Playbook.pdf) แนะนำให้กำหนดบทบาทมนุษย์ override, recourse, version history, monitoring และสิ่งที่ต้องทำหลัง alert อย่างชัดเจน จึงต้องวัดความไว้วางใจเทียบกับความถูกต้องจริง ไม่ใช่วัดเพียงความพึงพอใจ

MONOLITH ควร:

- บอกว่าแต่ละ claim มาจากผู้ให้ข้อมูล การสังเกต การอนุมาน การคำนวณ การตรวจยืนยัน หรืออยู่ในสถานะขัดแย้ง เก่า หรือขาดหาย;
- แสดงหลักฐานและขอบเขตที่ยังไม่ได้ตรวจสำหรับการตัดสินใจสำคัญ;
- ใช้สถานะหลักฐานที่ตรงไปตรงมา แทนเปอร์เซ็นต์ AI confidence รวมทั้งโครงการ;
- รักษาทางทำงานแบบ manual และผลลัพธ์ล่าสุดที่ตรวจยืนยันแล้วเมื่อ AI ใช้งานไม่ได้;
- ไม่ให้ AI มีอำนาจอนุมัติ waive, release, ปิด incident หรือสั่งเริ่มเครื่องจักร

### 3. ภาษาที่ไม่ตำหนิช่วยให้รายงานปัญหาและกู้คืนได้ดีขึ้น

[แนวทาง blameless postmortem ของ Google](https://sre.google/sre-book/postmortem-culture/) ตั้งสมมติฐานว่าคนตัดสินใจอย่างสมเหตุสมผลตามข้อมูลที่มี แล้วค้นหาว่าระบบทำให้การตัดสินใจนั้นดูสมเหตุสมผลได้อย่างไร เมื่อนำมาใช้กับข้อความในผลิตภัณฑ์:

- อธิบายสถานะ ไม่กล่าวโทษคน;
- บอกว่า MONOLITH รักษาหรือหยุดอะไรไว้;
- ระบุวัตถุและ revision ที่ได้รับผลกระทบ;
- ให้ recovery action ที่ทำได้จริง;
- ทำให้ “ขอผู้เชี่ยวชาญตรวจ” เป็นงานวิชาชีพปกติ ไม่ใช่ความล้มเหลว

ใช้ “ยังไม่มีหลักฐานความสูงฝ้าเพดาน” หลีกเลี่ยง “คุณไม่ได้ใส่ความสูงฝ้าเพดาน”

### 4. Progressive disclosure ต้องซ่อนกลไก ไม่ใช่ซ่อนความจริง

[แนวทาง validation ของ GOV.UK](https://design-system.service.gov.uk/patterns/validation/) แนะนำให้ใช้ข้อความแก้ไขที่สั้น รักษาข้อมูลที่ผู้ใช้กรอก แสดงสรุปชัด และพาไปยังจุดที่ต้องแก้โดยตรง ชั้นแรกจึงควรแสดงเฉพาะข้อมูลที่จำเป็นต่อการตั้งหลักและลงมือ ส่วนหลักฐาน diff, receipt, policy, audit history, raw identifier และ technical diagnostic เปิดดูต่อได้ใน detail drawer

สิ่งที่ต้องเห็นเสมอ:

- safe state ปัจจุบัน;
- ขอบเขตและ revision ที่ได้รับผลกระทบ;
- ผลกระทบ;
- หลักฐานที่ขาด ขัดแย้ง หรือยังไม่ได้ตรวจ;
- primary action หนึ่งอย่าง;
- เจ้าของงานและ acknowledgement state;
- สิทธิ์ในการผลิตหรือทำ commitment

สิ่งที่ซ่อนไว้จนกว่าจะต้องใช้:

- internal event taxonomy;
- model prompt และ inference bookkeeping;
- การเดิน dependency graph;
- policy evaluation trace;
- retry/outbox mechanics;
- raw telemetry และ stack trace

### 5. Accessible status เป็นส่วนหนึ่งของความปลอดภัย

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) กำหนดให้ระบุข้อผิดพลาดเป็นข้อความ ให้คำแนะนำการแก้ไขเมื่อทราบ ทำให้ assistive technology รับรู้ status message และเปิดให้ตรวจทาน แก้ไข ยืนยัน หรือย้อนกลับก่อนส่งข้อมูลที่มีผลสำคัญ ห้ามใช้สีเพียงอย่างเดียว ภาษาไทยและอังกฤษต้องมี language metadata ถูกต้อง และหน้าจอภาษาไทยต้องรองรับการแบ่งคำและ combining marks ตาม [W3C Thai Layout Requirements](https://www.w3.org/TR/thai-lreq/)

## แนวทางผลิตภัณฑ์สามแบบ

| แนวทาง | จุดแข็ง | ความเสี่ยง | คำตัดสิน |
|---|---|---|---|
| **A. Recovery Decision Card หนึ่งใบพร้อมรายละเอียดที่ขยายได้** | ตั้งหลักเร็ว มี visible truth หนึ่งชุด action ตามบทบาท และเข้ากับเป้าหมาย 30 วินาที | ต้องจัดลำดับ action อย่างมีวินัยและ derive ข้อมูลอย่างระมัดระวัง | **แนะนำให้เป็นทางเข้าหลัก** |
| **B. Guided recovery wizard** | เหมาะเมื่อการแก้ไขต้องเก็บหลักฐานหลายขั้นหรือส่งต่อหลายบทบาทจริง | ต้องเปลี่ยนหน้ามากขึ้น และผู้ใช้อาจเข้าใจผิดว่าทำ wizard ครบเท่ากับมีอำนาจ commit | เรียกจาก card เฉพาะเคสซับซ้อน |
| **C. Dashboard ตามบทบาทและ notification inbox** | รองรับคิว ทีม และหลายเคสพร้อมกัน | บริบทแตกกระจาย และอาจเห็นสถานะเก่าหรือขัดกัน | ใช้เป็น navigation รองเท่านั้น |

Recovery Decision Card ควรเป็น **presentation ที่มีอำนาจอ้างอิง** แต่ไม่ใช่ authority ใหม่ Wizard ใช้ดำเนินการแก้ไขหลายขั้นได้ ส่วน dashboard, LINE, email หรือ notification อื่นควร deep-link กลับมายัง case เดียวกัน และห้ามกลายเป็นพื้นผิวตัดสินใจแยก

## ประสบการณ์ที่แนะนำ: Recovery Decision Card

### Minimum lovable recovery contract

มุมมองแรกมีข้อมูลไม่เกินแปดช่อง:

| ช่องที่ผู้ใช้เห็น | เนื้อหาที่ต้องมี |
|---|---|
| **1. Status และ safe state** | สถานะภาษาคน พร้อมบอกว่างานที่ถูกต้องถูกบันทึก แยก พัก กั้น หรือย้อนกลับได้หรือไม่ |
| **2. เกิดอะไรขึ้นและเพราะอะไร** | คำอธิบายหนึ่งชุดที่มีขอบเขต แยกสิ่งที่รู้ สาเหตุที่คาด และสิ่งที่ยังไม่รู้ |
| **3. ขอบเขตและ revision ที่ได้รับผลกระทบ** | Project, ห้อง/วัตถุ/job, revision หรือ package identity ที่แน่นอน และปลายทางเมื่อเกี่ยวข้อง |
| **4. ผลกระทบ** | อะไรหยุด อะไรยังใช้ได้ และการรอหรือดำเนินต่อจะกระทบอะไร |
| **5. Evidence gap** | หลักฐานที่ขาด ขัดแย้ง เก่า หรือไม่เพียงพอ ระดับ/cardinality ที่ต้องมี และห้ามแสดง unknown เป็น pass |
| **6. Primary next action** | การกระทำที่ปลอดภัยที่สุดหนึ่งอย่างซึ่ง server ยืนยันว่าบทบาทนี้มีสิทธิ์ พร้อมป้ายชื่อที่บอกผลลัพธ์ |
| **7. ทางเลือกและผู้รับผิดชอบ** | ทางเลือกปลอดภัยไม่เกินสองข้อ เจ้าของปัจจุบัน บทบาทที่ร้องขอ และ acknowledgement state |
| **8. Progress และรายละเอียด** | ขั้นปัจจุบัน เวลาที่อัปเดตล่าสุด retry/reversal state และลิงก์ไปยัง diff, evidence, receipt และ activity history |

Card สามารถคำนวณใหม่จาก authoritative state ได้ แต่ต้องไม่มีอำนาจอนุมัติ waive, revoke, release หรือเปลี่ยน recovery lifecycle ด้วยตัวเอง ทุก action ต้องผ่านการตรวจของ server ซ้ำ ณ เวลาทำจริง Card ที่เก่าต้องนำไปสู่ safe refresh ไม่ใช่ commitment

### ความเข้มของ recovery สามระดับ

| โหมด | ประสบการณ์ผู้ใช้ | พฤติกรรมหลังบ้าน |
|---|---|---|
| **Routine recovery** | MONOLITH รักษาข้อมูล อธิบายปัญหา แนะนำการแก้หนึ่งอย่าง และให้ retry หรือ undo | Validation, deduplication, idempotent retry, dependency refresh, event logging |
| **Expert recovery** | ผู้มีคุณสมบัติตามบทบาทได้รับ exact revision, diff, evidence gap, assumption และการตัดสินใจที่มีขอบเขต | Impact analysis, evidence assembly, authority check, receipt binding, handoff acknowledgement |
| **Incident containment** | Card ที่เด่นชัดแสดง HOLD, job ที่กระทบ, acknowledgement ที่ต้องมี และสถานะ replacement | หยุด egress ใหม่ fence capability, ยกเลิก controlled authorization, ไล่ปลายทาง, บันทึก acknowledgement และรักษา append-only timeline |

Routine failure ไม่ควรดูเหมือน incident และ incident ต้องไม่ดูเหมือน warning ธรรมดา

## มุมมองตามบทบาทบนความจริงชุดเดียว

| บทบาท | คำถามแรกที่ต้องตอบ | Recovery moment ที่ควรทำให้รักระบบ | งานที่ MONOLITH ทำหลังบ้าน |
|---|---|---|---|
| **ลูกค้า / เจ้าของบ้าน** | แบบของฉันถูกบันทึกไหม และกระทบการตัดสินใจใด? | “ตัวเลือกของคุณถูกบันทึกแล้ว เรายังต้องมีความสูงฝ้าที่วัดจริงก่อนอนุมัติด้านเทคนิค” | Source classification, ambiguity detection, downstream impact, routing ไป designer |
| **Interior designer** | วัตถุใดเปลี่ยน และแก้โดยไม่เริ่มใหม่ได้ไหม? | เปรียบเทียบ base เก่ากับ revision ปัจจุบัน เก็บ draft อัปเดตเฉพาะวัตถุที่กระทบ และ undo ได้ | Stable object mapping, diff, invalidation, regeneration, provenance |
| **สถาปนิก / Technical reviewer** | ขอบเขต หลักฐาน assumption และส่วนที่ยังไม่ได้ตรวจใดต้องใช้ judgment? | เห็น exception ตามความเสี่ยงและ coverage ของ exact revision แล้วบันทึก purpose-specific decision | Requirement applicability, evidence cardinality, independent-review ordering, receipt creation |
| **Coordinator** | ใครเป็นเจ้าของ blocker รับ handoff แล้วหรือยัง และกั้นอะไรอยู่? | เห็นการตัดสินใจหนึ่งข้อที่ block จริงแทน open issue ทั้งหมด และ escalate เมื่อ acknowledgement หรือ deadline ล้มเหลวเท่านั้น | Dependency graph, SLA, notification deduplication, acknowledgement tracking |
| **Estimator / Procurement** | Quantity, price, supplier หรือ commitment ใดเปลี่ยน? | รักษา priced snapshot เดิมและเห็น cost/lead-time delta ก่อนแก้ order | BOM reconciliation, quote age, substitution impact, reopening technical gates |
| **Factory / CNC operator** | Job นี้ revision นี้ run กับเครื่องนี้ได้ตอนนี้หรือไม่? | Scan แล้วเห็น ACTIVE หรือ HOLD ที่ไม่กำกวม พร้อม verified fallback และ safe-stop action | Point-of-use identity check, destination policy, replay prevention, egress fencing, run audit |

## เส้นแบ่ง Frontstage และ Backstage

| สิ่งที่ผู้ใช้เห็น | สิ่งที่ MONOLITH ทำหลังบ้าน |
|---|---|
| Recovery card ที่สงบหนึ่งใบ | Failure classification และ case correlation |
| Revision และ scope ที่กระทบอย่างแน่นอน | Dependency reachability และ derivative inventory |
| อะไรถูกบันทึก ปลอดภัย พัก หรือกั้น | Snapshot preservation, quarantine, fencing และ last-verified selection |
| หลักฐานที่ขาดและ unchecked scope | Evidence collection, applicability, cardinality, freshness และ provenance checks |
| Next action หนึ่งอย่างและทางเลือกไม่เกินสอง | Capability policy, role/tenant authority, separation-of-duties และ server revalidation |
| Owner, acknowledgement และ progress | Routing, notification deduplication, SLA, retry/outbox และ audit assembly |
| Preview หรือ diff ก่อน commitment | คำนวณผลกระทบต่อ geometry, BOM, cost, procurement, shop drawing และ CNC |
| Purpose-specific confirmation | Immutable receipt, manifest binding, controlled egress และ point-of-use verification |

## Microcopy contract

ทุก recovery message ควรเรียงตามนี้:

1. สถานะที่เป็นกลาง;
2. วัตถุและ revision ที่ได้รับผลกระทบ;
3. สิ่งที่รักษาไว้หรือ safe state;
4. ผลกระทบ;
5. next action

| สถานการณ์ | ข้อความที่ดี | สิ่งที่ควรหลีกเลี่ยง |
|---|---|---|
| ขาดหลักฐานหน้างาน | “ต้องตรวจด้านเทคนิค ยังยืนยันความสูงฝ้าจาก A-14 ไม่ได้ แบบถูกบันทึกแล้วและการผลิตยังพักอยู่ เพิ่มแบบวัดจริงหรือมอบหมายผู้ตรวจ” | “Inference failed: insufficient geometric context.” |
| Base ของ designer เก่า | “Layout นี้สร้างก่อนตำแหน่งเสาเปลี่ยนใน A-15 เปรียบเทียบวัตถุสองรายการที่ได้รับผลกระทบ แล้วอัปเดตหรือเก็บ draft ไว้” | “แบบของคุณล้าสมัย” |
| หลักฐาน review ไม่ครบ | “ยังไม่มีแหล่งอ้างอิง fire rating ของผนัง P-12 และยังไม่ได้บันทึก technical approval” | “AI confidence ต่ำ อนุมัติต่อไหม?” |
| Handoff ยังไม่รับ | “ส่งคำขอตรวจให้ Arun เวลา 14:20 แล้ว แต่ยังไม่ได้รับงาน Procurement จึงยังพักอยู่” | “กำลังรอทีม” |
| BOM เปลี่ยน | “A-15 เปลี่ยนแผ่น PX-04 จาก 18 เป็น 22 แผ่น Purchase order ยังไม่เปลี่ยนจนกว่าคุณจะตรวจส่วนต่างราคา” | “คำนวณ estimate สำเร็จ” |
| CNC revision ไม่ตรง | “ห้าม run K07-R18 เพราะสร้างจาก A-14 ที่ถูก supersede แล้ว ให้โหลด K07-R17 ที่ตรวจยืนยันแล้ว หรือขอ release ใหม่” | “อาจมี version mismatch ดำเนินต่อไหม?” |

ข้อความภาษาไทยต้องเขียนเป็นภาษาไทย ไม่ประกอบประโยคจาก fragment ที่แปลแยกกัน เลือก “ยังไม่มีข้อมูลความสูงฝ้าเพดาน” แทน “คุณใส่ข้อมูลไม่ครบ”

## ความสอดคล้องกับ Section 4 ที่อนุมัติ

### คงไว้โดยไม่เปลี่ยน

- RecoveryCase เป็น mutable current projection
- RecoveryEvent เป็น append-only lifecycle fact
- DecisionReceipt เป็น immutable purpose-specific proof
- CapabilityPolicy และ EgressBroker ที่ server เป็นเจ้าของ
- Lifecycle แปด state และ containment acknowledgement
- Permitted-use classes: PREVIEW, SHADOW_SIMULATION, QUALIFICATION_COUPON, QUALIFICATION_FIRST_ARTICLE และ PRODUCTION
- Authority matrix ตาม incident, separation of duties และ tenant-authority prerequisite
- Evidence levels และ cardinality proof
- Exact-revision binding, controlled egress, ข้อจำกัด offline revocation ที่พูดตามจริง, audit trail และ no-bypass enforcement
- เป้าหมายผู้ใช้เดิม: หา next action ที่ถูกภายใน 30 วินาที และแก้หรือย้อนกลับได้อย่างน้อย 95% โดยไม่ต้องพึ่ง support

### เพิ่มเป็น presentation และ communication contract

- Recovery Decision Card แปดช่อง
- ข้อความ safe state และ saved work ที่ชัด
- Role-specific projection จาก RecoveryCase เดียวกัน
- Primary authorized action หนึ่งอย่างและ safe alternatives ไม่เกินสอง
- Preview/diff ก่อน commitment ที่มีผลสำคัญ
- Owner พร้อม requested/acknowledged handoff state
- Notification tiers: immediate interruption, action queue, digest และ activity log only
- พฤติกรรมภาษาไทย/อังกฤษและ assistive technology
- Recovery instrumentation และ seeded user tests

### หลีกเลี่ยงหรือทำให้ง่ายลง

- ไม่แสดง lifecycle, policy, evidence หรือ authority matrix ทั้งหมดในมุมแรก;
- ไม่ใช้ raw error code, stack trace หรือ model telemetry เป็นข้อความหลัก;
- ไม่แสดง global confidence score หรือป้าย “AI approved”;
- ไม่สร้าง banner, retry button หรือ notification stream หลายชุดที่แข่งกัน;
- ไม่วาง “Proceed anyway” ให้ดูเป็นทางเลือกปกติข้างปุ่มปลอดภัย;
- ไม่แสดง handoff ว่า “assigned” ก่อนผู้รับ acknowledge;
- ไม่อ้างว่าไฟล์ remote/offline ถูกลบแล้ว หากทำได้เพียงห้าม access ในอนาคตผ่านระบบที่ควบคุม

### เลื่อนไปก่อน

- Recovery-orchestration entity ใหม่หรือ universal workflow engine;
- Conversational recovery เป็น primary interface;
- Automatic approval, waiver, release, incident closure หรือ machine start;
- Customizable card builder, gamification, omnichannel decision-making และ predictive incident prevention;
- Fully automatic rollback ที่เริ่มจาก presentation layer

## Safety invariants ที่ต่อรองไม่ได้

1. Recovery card เป็น projection; server ยังคงเป็น authority
2. ทุก consequential action ผูกกับ scope, revision/package identity, purpose, actor, authority, evidence และเวลาที่แน่นอน
3. การเปลี่ยนสาระสำคัญต้องสร้าง revision ใหม่และ invalidate approval ที่ได้รับผลกระทบ ห้ามสืบทอด approval แบบเงียบ
4. Evidence ที่ unknown, timeout, stale, missing หรือ parser error ห้ามเปลี่ยนเป็น pass
5. “All passed” ต้องมี cardinality proof ครบ requirement population ที่ applicable และถูก freeze
6. เฉพาะ controlled egress path เท่านั้นที่สร้าง production-usable package ได้
7. Production HOLD ต้องมีอำนาจเหนือ display Approved หรือ ACTIVE ที่ลำดับต่ำกว่า
8. Retry และ replay ต้องไม่สร้าง approval, order, export, job หรือ machine-start authority ซ้ำ
9. ข้อความ revocation ต้องจำกัดอยู่ที่ระบบภายใต้การควบคุมของ MONOLITH ไฟล์ที่ถูกดึงออกไปต้องมี recipient inventory และ acknowledgement
10. Platform checks, AI, simulation และ safe-stop workflow ห้ามแทน physical guard, interlock, emergency control หรือ judgment ของ operator ที่มีคุณสมบัติ [แนวทาง machine guarding ของ OSHA](https://www.osha.gov/machine-guarding) ทำให้เส้นแบ่งนี้จำเป็น

## การทดสอบที่ออกแบบมาเพื่อหักล้างข้อเสนอ

### Seeded scenarios ตามบทบาท

| บทบาท | Failure ที่ฝังไว้ | หลักฐานว่าผ่าน |
|---|---|---|
| ลูกค้า | AI ยืนยันความสูงฝ้าจากภาพไม่ได้ | เข้าใจว่าแบบถูกบันทึก technical approval ถูก block และต้องมีแหล่งวัดจริง |
| Designer | ตำแหน่งเสาเปลี่ยนหลัง base revision ของ draft | หา affected objects เปรียบเทียบ revision แก้หรือเก็บ draft ได้โดยไม่เริ่มใหม่ |
| Reviewer | หลักฐาน fire rating เก่าและเป็นของ revision ก่อน | ปฏิเสธการสืบทอด approval แบบเงียบ ระบุหลักฐานปัจจุบันที่ขาด และบันทึก bounded decision |
| Coordinator | ส่ง review request แล้วแต่ผู้รับยังไม่ acknowledge | แยก requested ออกจาก accepted ระบุ blocker เดียว และ escalate ถูกต้อง |
| Estimator/procurement | เปลี่ยน hardware แล้วกระทบราคาและ technical compatibility | เก็บ priced snapshot เดิม ตรวจ delta และ reopen gates ก่อน commitment |
| Factory/CNC | Cached package ถูก supersede ระหว่างรอเข้าคิว | หยุดใช้ เลือก verified fallback หรือขอ release ใหม่ และไม่ bypass HOLD |
| ทุกบทบาท | Double-click, refresh, timeout และ action replay | ไม่มี side effect ซ้ำ สถานะสุดท้ายตรงความจริงและ audit ได้ |
| Accessibility/localization | Async state change ภาษาไทย/อังกฤษ ใช้ keyboard และ screen reader | ประกาศสถานะ ใช้ได้โดยไม่พึ่งสี ตัดบรรทัดถูก และรักษา technical identifier |

### ตัวชี้วัด

| ผลลัพธ์ | เป้าหมายหรือวิธีตีความ |
|---|---|
| ตั้งหลักหา next action ที่ถูก | เป้าหมาย Section 4 เดิม: ภายใน 30 วินาที |
| แก้หรือย้อนกลับโดยไม่ใช้ support | เป้าหมาย Section 4 เดิม: อย่างน้อย 95% |
| First safe action ใน critical production scenario | 100% ใน qualification test; unsafe action ใด ๆ เป็น stop condition |
| ยอมรับ stale revision หรือ stale approval ว่าปัจจุบัน | 0 |
| Unauthorized หรือ non-ACTIVE egress | 0 |
| Consequential side effect ซ้ำหลัง retry/replay | 0 |
| Evidence cardinality หรือ unknown ถูกแสดงเป็น complete/pass | 0 |
| Appropriate reliance | รายงาน accept-correct และ reject-incorrect แยกกัน ห้ามแทนด้วย trust score |
| Workload | ปรับมิติ [NASA-TLX](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/) ตามบทบาทให้ดีขึ้นจาก workflow เดิม โดย defect escape ต้องไม่แย่ลง |
| Notification quality | วัด actionable interruption, duplicate, acknowledgement time และ urgent notice ที่ถูกละเลย |
| Psychological safety | ผู้ใช้รายงานความไม่แน่นอนและขอ review ได้โดยไม่รู้สึกว่าถูกตำหนิ |

### Stop conditions

หยุดและออกแบบใหม่หากเกิดข้อใดข้อหนึ่ง:

- UI อ้างว่า safe, approved, complete, active หรือ revoked โดยไม่มีหลักฐานที่ server ตรวจได้;
- ผู้ใช้หรือ client ที่ถูกแก้ไข bypass authority, evidence, lifecycle, tenant หรือ egress policy ได้;
- stale revision, stale approval, unknown evidence หรือ revoked acknowledgement ถูกยอมรับว่าถูกต้อง;
- replay สร้าง commitment หรือ production action ซ้ำ;
- scope หรือ revision ที่เห็นไม่ตรงกับ committed receipt;
- critical role ใดหา safe state และ next authorized action ไม่ได้ภายใน threshold ที่ตกลง;
- ผู้ใช้แก้หรือย้อนกลับได้โดยไม่ใช้ support ต่ำกว่า 95%;
- ความหมายสำคัญพึ่งสี assistive technology อ่านไม่ได้ หรือแปลผิดสาระ

## การใช้ข้ามทุกหมวด Interior Architecture

Recovery Presentation Contract เป็น domain-neutral และควรใช้กับ Interior Architecture Domain Pack ที่ผ่าน qualification ทุกหมวด: casework และ millwork; ประตูและ partition; ฝ้าและ lighting coordination; wall/floor finishes; sanitary และ wet area; loose furniture และ FF&E; soft furnishing; signage; specialist equipment; และ MEP interface

Card contract ใช้ร่วมกันได้ แต่แต่ละ domain ต้องมีภาษาของ affected object, evidence requirements, risk taxonomy, qualified reviewer role, deterministic checks, safe output adapter และ release authority ของตนเอง UX ที่ร่วมกันห้ามทำให้ผู้ใช้เข้าใจผิดว่า qualification ร่วมกัน

## วิธีวิจัยและข้อจำกัด

งานนี้ใช้ Perplexity สามช่วง:

1. ทดลองส่ง broad deep-research request รอบเดียว แต่เกิน API timeout ห้านาทีและไม่มีผลลัพธ์ที่นำมาใช้ได้
2. แบ่งเป็น Perplexity deep-research สองรอบและทำสำเร็จ: human factors/recovery UX กับ safety governance/design-to-manufacturing
3. ใช้ Perplexity reasoning เทียบผลกับ Section 4 ที่อนุมัติ โดยจำกัดแหล่งอ้างอิงไปยังโดเมนปฐมภูมิหรือทางการ

การสังเคราะห์แยกสถานะอย่างเคร่งครัด:

- **Evidence-backed principle:** มีแหล่งทางการ หน่วยงานมาตรฐาน หรือ peer-reviewed รองรับ
- **Product-design inference:** Recovery Decision Card, contract แปดช่อง, role projection และการแบ่ง frontstage/backstage
- **Existing owner decision:** Objects, lifecycle, authority, evidence, qualification และ egress model ของ Section 4 ที่อนุมัติแล้ว

ได้ตรวจ parent repository ในฐานะ governance/bootstrap root และตรวจ nested **determined-williams/** ในฐานะ active product source เอกสารนี้ไม่อ้างว่า Recovery Presentation Contract ถูก implement, deploy, machine-qualify หรือพร้อม production แล้ว

## แหล่งอ้างอิงหลัก

| แหล่ง | หน่วยงาน / วันที่ | ประเภทหลักฐาน | สิ่งที่รองรับ |
|---|---|---|---|
| [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf) | Microsoft Research, 2019 | Research-derived guidance | ขอบเขตความสามารถ ความไม่แน่นอน การแก้ ปฏิเสธ อธิบาย และควบคุม |
| [HAX Toolkit AI Guidelines](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) | Microsoft | Official design toolkit | Human-AI interaction patterns |
| [AI Risk Management Framework 1.0](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf) | NIST, 2023 | Government framework | Governance, accountability, validity, monitoring, human oversight |
| [AI RMF Playbook](https://airc.nist.gov/docs/AI_RMF_Playbook.pdf) | NIST | Government playbook | Recourse, override, version history, incident response, measurement |
| [Automation Bias: A Systematic Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/) | JAMIA, 2012 | Peer-reviewed systematic review | Commission/omission errors และ mitigations |
| [Trust in Automation: Designing for Appropriate Reliance](https://pubmed.ncbi.nlm.nih.gov/15151155/) | Human Factors, 2004 | Peer-reviewed review | Calibrated trust และ appropriate reliance |
| [Blameless Postmortem Culture](https://sre.google/sre-book/postmortem-culture/) | Google SRE | Official operational guidance | การเรียนรู้จาก failure แบบไม่กล่าวโทษ |
| [Managing Incidents](https://sre.google/sre-book/managing-incidents/) | Google SRE | Official operational guidance | บทบาท handoff การสื่อสาร และ timeline |
| [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) | Google SRE | Official operational guidance | Alert ที่ actionable เน้น symptom และลด noise |
| [Validation Pattern](https://design-system.service.gov.uk/patterns/validation/) | GOV.UK Design System | Government service pattern | รักษาข้อมูล error summary และ corrective recovery |
| [Error Message Component](https://design-system.service.gov.uk/components/error-message/) | GOV.UK Design System | Government service pattern | Error copy ที่สั้น เฉพาะเจาะจง และไม่ตำหนิ |
| [Check Answers Pattern](https://design-system.service.gov.uk/patterns/check-answers/) | GOV.UK Design System | Government service pattern | ตรวจและแก้ก่อน commitment |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C, 2023 | Web standard | Error, correction, prevention, language, color และ focus |
| [Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | W3C WAI | Normative-supporting guidance | Async status และ progress ที่เข้าถึงได้ |
| [Thai Layout Requirements](https://www.w3.org/TR/thai-lreq/) | W3C Internationalization | Language layout guidance | การแบ่งคำ combining marks และ typography ภาษาไทย |
| [Common Data Environment Guidance](https://ukbimframework.org/wp-content/uploads/2020/02/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf) | UK BIM Framework, 2020 | Industry guidance | Information state, revision, suitability, archive |
| [BIM Collaboration Format](https://www.buildingsmart.org/standards/bsi-standards/bim-collaboration-format/) | buildingSMART | Open standard | Issue exchange แบบมีโครงสร้างและผูกกับ object |
| [Information Delivery Specification](https://technical.buildingsmart.org/projects/information-delivery-specification-ids/) | buildingSMART | Open standard | Information requirements และ checking ที่ machine-readable |
| [Zero Trust Architecture SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final) | NIST, 2020 | Government security standard | Per-session authorization และ least privilege |
| [Security and Privacy Controls SP 800-53 Rev. 5](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-53r5.pdf) | NIST, 2020 | Government security controls | Separation of duties, audit protection, information flow |
| [Guide to Operational Technology Security SP 800-82 Rev. 3](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-82r3.pdf) | NIST, 2023 | Government OT guidance | OT segmentation, allowlisting, controlled conduits |
| [Deployment Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) | GitHub | Official product documentation | Protected deployment approval และ anti-self-approval precedent |
| [Track and Revoke Documents](https://learn.microsoft.com/en-us/purview/track-and-revoke-admin) | Microsoft Purview | Official product documentation | ข้อจำกัด revocation ของ downloaded/offline copy |
| [Machine Guarding](https://www.osha.gov/machine-guarding) | OSHA | Government safety guidance | Software ไม่แทน physical safeguard |
| [EC2 API Idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html) | AWS | Official product documentation | Retry โดยไม่เกิด side effect ซ้ำ |
| [NASA Task Load Index](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/) | NASA | Validated workload method | การวัด workload หลายมิติ |

## ข้อเสนอสุดท้ายจากงานวิจัย

คง truth, authority, evidence, qualification และ egress model ของ Section 4 ไว้ทั้งหมด เพิ่มเพียง **Recovery Presentation Contract** ที่บาง:

**หนึ่ง case → Recovery Decision Card หนึ่งใบตามบทบาท → การกระทำที่ปลอดภัยที่สุดหนึ่งอย่าง → เปิด proof เพิ่มได้ → server ตรวจซ้ำก่อน commitment**

นี่คือการเปลี่ยนแปลงที่เล็กที่สุดแต่มีโอกาสสูงที่สุดที่จะทำให้ recovery ง่าย เป็นมนุษย์ และเป็นที่รัก โดยไม่ลดความรับผิดชอบทางวิชาชีพหรือความปลอดภัยในการผลิต
