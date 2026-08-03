# แบบออกแบบประสบการณ์ที่เล็กที่สุดแต่ผู้ใช้รักของ MONOLITH

**สถานะ:** OWNER DECISION — อนุมัติวันที่ 3 สิงหาคม 2026
**ทิศทางผลิตภัณฑ์:** Studio-first, Powered by MONOLITH
**ทิศทางประสบการณ์:** Calm Editorial · Human Action First
**North Star:** MONOLITH ทำให้สิ่งที่ควรทำต่อไปชัดเจน และทำให้งานยากเบื้องหลังไว้ใจได้

## 1. สรุปการตัดสินใจ

MONOLITH จะถูกออกแบบเป็น **Calm Decision & Exception OS** สำหรับสตูดิโอออกแบบภายใน ไม่ใช่ dashboard บริหารโครงการที่รวมทุก feature ระบบจะชนะใจเจ้าของสตูดิโอ/ผู้จัดการโครงการและดีไซเนอร์ก่อน แล้วจึงขยาย authoritative projections ที่ไว้ใจได้ไปยังโรงงาน ผู้ติดตั้ง ช่าง และลูกค้า

ผลิตภัณฑ์ที่เล็กที่สุดแต่ผู้ใช้รักคือ **Attention Cockpit ตามด้วย Client Decision Loop หนึ่งวงจรที่ผูกกับ authority** โดยลำดับ implementation ต้องคงที่:

1. Project Context Foundation ทำ identity และ authority ให้ถูกต้อง
2. Project Cockpit ฉายข้อมูล authoritative เดิมและไม่เป็น source of truth ใหม่
3. One Decision Pipeline ปิดวงจรการตัดสินใจด้านแบบของลูกค้าหนึ่งวงจร
4. One Exception Projection แสดง factory blocker แบบ normalized หนึ่งชนิด
5. Effect Ledger/Outbox ทำให้งานหลังบ้านเชื่อถือและกู้คืนได้
6. Role Views และ LINE เพิ่มหลัง authority gates ผ่านเท่านั้น

Wave 1 ที่อนุมัติยังเล็กกว่า lovable-product wedge ฉบับเต็ม โดยมีเพียง presentation contract, safety invariants และ Project Cockpit แบบ read-only ส่วน decision mutation, runtime role adaptation, customer action, factory production action และ LINE ยังถูกเลื่อนไว้

## 2. หลักฐานและที่มา

งานวิจัยใช้ Perplexity multi-source Search และ high-context Reason ส่วน Deep Research endpoint เดี่ยวหมดเวลาโดยไม่คืนเนื้อหา จึงไม่ได้นำผลจาก request ที่ล้มเหลวมาใช้ ผลการค้นหาถูกคัดไปทางแหล่งปฐมภูมิ งาน peer-reviewed มาตรฐานทางการ และงานวิจัย first-party ที่น่าเชื่อถือ

| ข้อค้นพบ | หลักฐาน | ผลต่อการออกแบบ | ประเภท |
| --- | --- | --- | --- |
| Usefulness, ease of use และ compatibility มีความสัมพันธ์สูงกับการยอมรับเทคโนโลยี | Meta-analysis ด้าน digital transformation และการยอมรับ IT ของ SME | ต้องเข้ากับ workflow จริงของสตูดิโอก่อนขยาย feature | EXTERNAL EVIDENCE |
| Progressive disclosure ช่วย learnability, efficiency และ error prevention หากแบ่งข้อมูลหลัก/รองถูกต้อง | Nielsen Norman Group | แสดง action ที่ใช้บ่อยและความเสี่ยงสำคัญก่อน ส่วนรายละเอียดเทคนิคที่ใช้น้อยอยู่หลังลิงก์ชัดเจน | EXTERNAL EVIDENCE |
| ผู้ใช้ต้องเห็นสถานะระบบที่ต่อเนื่องและตรงความจริง | Nielsen Norman Group | แยก saved, sending, pending, failed, stale และ partially complete ให้ชัด | EXTERNAL EVIDENCE |
| Transactional outbox และ idempotent processing ช่วยจัดการ dual writes, retries และ duplicate delivery | แนวทางของ AWS | บันทึก business state และ effect intent พร้อมกัน และทำ retry ให้ปลอดภัย/มองเห็นได้ | EXTERNAL EVIDENCE |
| Explanation สามารถเพิ่มความเชื่อถือแม้คำแนะนำผิด | งานวิจัย Microsoft HAX | อธิบาย source และ limitation แต่ห้ามใช้คำอธิบายแทน human authority | EXTERNAL EVIDENCE |
| การยอมรับเทคโนโลยีในงานก่อสร้างถูกจำกัดด้วย situation awareness, convention ที่ต่างกัน และสภาพหน้างาน | งานวิจัย Construction UX | เลื่อน broad field rollout และใช้ field-specific presentation profile | EXTERNAL EVIDENCE |
| หนึ่ง primary action ต่อ attention item จะลดความลังเล | อนุมานจาก progressive disclosure และ Human Action First | ต้องทดสอบกับผู้ใช้จริง ไม่ถือเป็นกฎสากล | INFERENCE / TESTABLE HYPOTHESIS |

## 3. ขอบเขต Repository และผลิตภัณฑ์

แบบออกแบบนี้กล่าวถึงผลิตภัณฑ์ที่อยู่ใน nested repository `determined-williams/` ส่วน parent repository เป็น governance/bootstrap root มี implementation จำนวนมากอยู่ใน nested product แต่การมี source ไม่ได้พิสูจน์ production readiness และ shadow mode กับ NOT-FOR-PRODUCTION ยังคงเป็นข้อบังคับด้านความปลอดภัย

แบบออกแบบนี้ไม่อนุญาต tenant model ใหม่, production release, schema migration, external message delivery หรือ role-based permission implementation Project Context และ authority ต้องมาจาก canonical server-owned foundation ก่อนเปิด write action

## 4. ผู้ใช้ลำดับแรกและงานที่ต้องช่วย

### 4.1 เจ้าของสตูดิโอ / ผู้จัดการโครงการ

Cockpit ต้องช่วยให้พวกเขา:

- รู้ว่าโครงการใดต้องสนใจโดยไม่ไล่ตรวจหลายช่องทาง
- ยืนยัน project, site, room, client, revision, freshness และ authority
- เข้าใจผลกระทบ กำหนดเวลา และ accountable owner
- ได้คำตัดสินจากลูกค้าโดยไม่ต้องตามซ้ำ
- เห็นว่า factory blocker กระทบเวลาและ scope หรือไม่
- รู้ว่า effect สำเร็จ ยังรอ หรือจำเป็นต้องกู้คืน

### 4.2 ดีไซเนอร์

ประสบการณ์ต้องช่วยให้พวกเขา:

- ปกป้องเวลาทำงานออกแบบจาก coordination overhead ที่หลีกเลี่ยงได้
- เห็นผลกระทบต่อแบบจาก client decision หรือ factory blocker
- แยก draft, ready for review, approved, released และ superseded
- เปรียบเทียบ revision และ source evidence ที่เกี่ยวข้อง
- เตรียมหนึ่งคำตัดสินที่ชัดโดยไม่รวบรวม context ด้วยมือ

### 4.3 ผู้ใช้ปลายทาง

ในระยะแรก โรงงานและผู้ติดตั้งจะได้รับ authoritative projections ไม่ใช่ความเป็นเจ้าของ project model ของสตูดิโอ ลูกค้าจะได้รับ decision experience แบบแคบ ไม่ใช่ portal ทั่วไป แนวทางนี้ลดการบังคับเปลี่ยนพฤติกรรมและรักษา authority boundaries

## 5. คำมั่นของประสบการณ์

ภายในสิบวินาทีหลังเปิดโครงการ ในกรณีทั่วไปผู้ใช้ควรตอบได้ว่า:

1. ฉันอยู่ที่ studio, project, site/room และ revision ใด
2. ข้อมูลใหม่เพียงใดและมาจากแหล่งไหน
3. สถานะปัจจุบันปลอดภัยที่จะลงมือหรือไม่
4. เรื่องใดสำคัญที่สุดตอนนี้ และเพราะอะไร
5. next action ที่ดีที่สุดสำหรับฉันคืออะไร

เป้าหมายสิบวินาทีเป็นสมมติฐานผลิตภัณฑ์สำหรับการทดสอบ ไม่ใช่ benchmark ภายนอก

## 6. Experience Architecture

```text
Project Context Foundation
        ↓ authoritative identity and capability
Project Cockpit Read Model
        ↓ attention-ranked projection
Human Action Card
        ↓ authority check before any write
Decision / Exception Pipeline
        ↓ committed business state + effect intent
Effect Ledger / Outbox
        ↓ delivery, retry, reconciliation
Receipt Projection
```

Front stage ห้ามสร้าง authority ใหม่ ห้ามอนุมาน tenant จาก `site_code` และห้ามถือ local role เป็น permission หลังบ้านทำ orchestration ส่วนผู้ใช้เห็น states, receipts และ recovery choices ที่เข้าใจง่าย

## 7. สัญญาของ Project Cockpit

### 7.1 ลำดับข้อมูล

หน้าเริ่มต้นต้องตอบตามลำดับนี้:

1. **Context:** project identity, site/room, revision, freshness และ viewing authority
2. **Safety:** ready for review, blocked, draft, stale หรือ shadow/NFP
3. **Attention:** รายการ decision และ exception แบบสั้นที่จัดอันดับแล้ว ไม่ใช่ activity feed
4. **Consequence:** ผลต่อ design, schedule, cost, factory หรือ customer commitment
5. **Action:** หนึ่ง primary human task
6. **Evidence:** source, history, receipt และ recovery ผ่าน progressive disclosure

### 7.2 Attention Card

ทุก card ประกอบด้วย:

- เหตุการณ์หรือสิ่งที่ต้องการด้วยภาษาธรรมดา
- เหตุผลที่สำคัญ
- scope ที่ได้รับผล
- accountable owner
- due time เมื่อมีความหมาย
- หนึ่ง primary action
- secondary actions ที่มองเห็นไม่เกินสองรายการ
- source และ freshness indicator

ตัวอย่าง primary action ได้แก่ `Review decision`, `Confirm project`, `Inspect blocker` และ `Retry delivery` Action ต้องหายไปหรือ disabled เมื่อ identity, authority, revision หรือ safety state ยังไม่ชัด

### 7.3 Progressive disclosure

- **Level 1 — Attention:** state, consequence, owner, deadline, primary action
- **Level 2 — Working context:** options, affected items, source files, revision comparison
- **Level 3 — Authority and provenance:** capability ที่ใช้, actor, revision lineage, history
- **Level 4 — Recovery:** attempts, provider response, effect ID, retry และ reconciliation controls

ลิงก์ใช้ชื่อที่คาดเดาได้ เช่น `Why this is shown`, `Compare revisions`, `Delivery history` และ `Recovery details`

## 8. One Client Decision Loop

ส่วนนี้กำหนด action แรกหลัง authority พร้อม และยังไม่อยู่ใน Wave 1 แบบ read-only

Authority-bound Decision Brief ประกอบด้วย:

- immutable project และ revision context
- หนึ่งคำถามหรือ decision scope
- curated options
- ผลกระทบของแต่ละตัวเลือกด้วยภาษาธรรมดา
- studio recommendation ที่แยกชัดจากคำตอบของลูกค้า
- affected items และ source evidence
- deadline และสิ่งที่จะเกิดขึ้นต่อ
- authorized recipient และ response capability
- revocation หรือ supersession state
- durable receipt

Client approval ไม่ใช่ production release เว้นแต่กฎ authority ที่แยกและชัดเจนกำหนดเช่นนั้น Revision ใหม่ต้อง invalidate หรือ supersede decision brief ที่ stale ตาม server policy

## 9. One Factory Blocker Projection

ประสบการณ์โรงงานชุดแรกเป็น projection เข้าสู่ studio cockpit โดยมี:

- project, revision, location และ item ที่ได้รับผล
- blocker category และ evidence
- consequence และเวลาปลอดภัยล่าสุดที่ต้องตัดสินใจ
- reporter และ accountable studio owner
- freshness และ reconciliation state
- NFP/shadow status เมื่อเกี่ยวข้อง

Projection นี้ไม่ authorize production, ควบคุมเครื่อง, จัดตารางแรงงาน หรือสร้าง factory workspace เต็มระบบ ระหว่าง shadow mode ให้ใช้ถ้อยคำเชิงตรวจหลักฐาน เช่น `Inspect packet`, `Review blocker` หรือ `Run shadow verification` ห้ามใช้ `Start work` หรือ `Start production`

## 10. Honest State และ Recovery Model

| State | พฤติกรรมที่ผู้ใช้เห็น | พฤติกรรมหลังบ้านที่ต้องมี |
| --- | --- | --- |
| ไม่มี attention | “ตอนนี้ไม่มีเรื่องที่ต้องดำเนินการ” พร้อม scope และ last refresh | เก็บ query time และ sources |
| Loading | รักษา context ให้เห็นและบอกว่ากำลังตรวจอะไร | Resolve authoritative context ก่อน projections |
| Refreshing | แสดงข้อมูลล่าสุดที่ทราบพร้อม refreshing indicator | ห้ามเปลี่ยน version แบบเงียบ ๆ |
| Stale | ระบุ revision เก่าและ revision ปัจจุบัน | Block stale action เว้นแต่ได้รับ authority ชัดเจน |
| Permission denied | อธิบายขอบเขต view/action และทางขอสิทธิ์ | Enforce ที่ server และ audit การปฏิเสธ |
| Saved, delivery pending | แยกงานที่ commit แล้วออกจาก external effect ที่ยังไม่ครบ | คง outbox เป็น pending และ retry แบบ idempotent |
| Transient failure | แสดงสถานะปลอดภัยล่าสุดและหนึ่ง retry action | ใช้ bounded retry/backoff และ correlation ID |
| Conflict | รักษาข้อเท็จจริงทั้งสองและต้องให้ผู้มี authority ตัดสิน | Halt effect ที่เกี่ยวข้องและ reconcile อย่างชัดเจน |
| Shadow / NFP | Safety language ถาวรที่ theme เปลี่ยนไม่ได้ | Block หรือ sandbox production effects |

Receipt บันทึก project, revision, actor, authority, requested action, business object, effect ID, current state, timestamp, destination, attempts, provider response, retry eligibility และ recovery action UI ปกติสรุปให้สั้นและเปิดรายละเอียดเทคนิคเมื่อผู้ใช้ร้องขอ

## 11. Surface Profiles และ Semantic Language เดียวกัน

Semantic states ต้องไม่เปลี่ยน ได้แก่ `Draft`, `Needs review`, `Approved`, `Released`, `Blocked`, `Delivery pending`, `Failed` และ `Shadow / NOT-FOR-PRODUCTION`

| Profile | ความต้องการหลัก | พฤติกรรมการนำเสนอ |
| --- | --- | --- |
| Calm — Owner/PM | ความมั่นใจและการจัดลำดับ | โปร่ง สื่อผลกระทบก่อน จัดอันดับ attention และมี controls ที่มองเห็นน้อย |
| Workspace — Designer | Context และการเปรียบเทียบ | หนาแน่นขึ้น เห็น source/revision และรักษาพื้นที่สร้างสรรค์ |
| Field — Factory/Installer | เข้าใจเร็วภายใต้สภาพไม่เอื้อ | High contrast, ภาษาสั้น, target ใหญ่, connectivity state และ evidence capture |
| Customer | ตัดสินใจอย่างมั่นใจ | Studio-first, ภาษาธรรมดา, หนึ่ง decision, consequence, receipt และ next step |

Presentation profiles ห้ามให้ permission และห้ามซ่อน safety information ที่จำเป็น

## 12. Controlled Brand Kit

ลำดับแบรนด์คือ **Studio-first, Powered by MONOLITH**

Server-resolved studio profile ควบคุมได้:

- ชื่อและโลโก้สตูดิโอ
- accent ที่ผ่าน accessibility
- greeting และ client-facing tone
- approved imagery
- terminology aliases แบบมีขอบเขต

MONOLITH ควบคุมเสมอ:

- project และ revision identity
- authority และ permission language
- draft/approval/release semantics
- ความหมายของ warning, error, pending และ recovery
- audit receipts
- NFP และ production-safety language
- ข้อกำหนดขั้นต่ำด้าน typography, contrast, focus และ target size

Brand styling ทำให้ประสบการณ์อบอุ่นขึ้นได้ แต่ห้ามทำให้ความเสี่ยงดูเบาลง

## 13. Accessibility และ Field Physics

WCAG 2.2 AA เป็น baseline ไม่ใช่เพดาน สถานะต้องสื่อด้วยข้อความและ programmatic semantics ไม่ใช้สีอย่างเดียว เนื้อหาภาษาไทยไม่น้อยกว่า 14px และ line-height ไม่น้อยกว่า 1.5; metadata ไม่น้อยกว่า 12px; interactive target ทั่วไปไม่น้อยกว่า 44px; field controls คงขั้นต่ำ 48px Field physics ต้องชนะเมื่อ brand styling ขัดกับการอ่านกลางแดด การใช้ถุงมือ latency หรือ safety

## 14. สิ่งที่ไม่ทำอย่างชัดเจน

ผลิตภัณฑ์ที่เล็กที่สุดแต่ผู้ใช้รักไม่รวม:

- universal dashboard หรือ general-purpose project-management suite
- customer portal ทั่วไป
- factory หรือ installer operating system เต็มรูปแบบ
- chat replacement
- LINE ก่อน authority และ effect reliability
- automatic production release หรือ customer commitment
- AI decision ที่นำเสนอเป็น authority
- silent project-state mutation
- exactly-once delivery claim
- workflow หรือ brand customization แบบไม่จำกัด
- retrospective analytics ที่ไม่มี next action

## 15. ตัววัดความสำเร็จ

ตัวเลขต่อไปนี้เป็นสมมติฐานเริ่มต้นสำหรับทดสอบ ไม่ใช่ benchmark ภายนอก:

| ตัววัด | Gate เริ่มต้น |
| --- | ---: |
| ยืนยัน project context ในกรณีทั่วไป | ≤10 วินาที |
| พบ attention item ที่สำคัญที่สุด | ≤15 วินาที |
| ทำ primary action สำเร็จโดยไม่ต้องช่วย | ≥80% |
| อธิบาย success, pending หรือ failure ได้ถูกต้อง | ≥90% |
| Critical wrong-project/revision actions | 0 |
| Partial failure ที่แสดงเป็น complete | 0 |
| Production effect ที่ผ่าน shadow mode | 0 |
| Pilot users กลับมาใช้กับงานจริงโดยสมัครใจ | ≥60% |

หาก identity, state comprehension หรือ shadow safety ล้มเหลว ต้องหยุดและออกแบบใหม่ แม้ผู้ใช้จะชอบความสวยงามก็ตาม

## 16. แผนทดสอบสี่สัปดาห์

### สัปดาห์ 1 — เข้าใจงานจริง

สัมภาษณ์และสังเกต Owner/PM 3–4 คน, ดีไซเนอร์ 3–4 คน, ผู้เกี่ยวข้องจากโรงงาน/ติดตั้ง 2 คน และลูกค้าที่เพิ่งตัดสินใจ 2 คน ย้อนสร้าง decision, blocker, artifact, authority และ terminology จากงานจริง

### สัปดาห์ 2 — ทดสอบ Cockpit

ทดสอบกับ primary users 6–8 คน ครอบคลุม context confirmation, attention discovery, consequence comprehension, progressive disclosure, NFP recognition และ partial-failure recovery

### สัปดาห์ 3 — Non-production vertical slice

ทดสอบ Project Context, read-only Cockpit, non-live decision object, authority denial, effect ledger/outbox, fake delivery, duplicate events, stale revisions, timeouts และ shadow guards

### สัปดาห์ 4 — Controlled pilot

ใช้กับสตูดิโอ 2–3 แห่งในงาน non-production หรือความเสี่ยงต่ำ สังเกต voluntary return, การใช้ช่องทางเดิมคู่ขนาน, ความเชื่อถือใน receipts, vocabulary failures และว่า MONOLITH ลดการตามงานหรือเพิ่มอีกที่หนึ่งให้ต้องตรวจ

## 17. Acceptance Criteria

แบบออกแบบนี้ถือว่าบรรลุเมื่อ:

- Project Context มองเห็นได้ก่อนทุก meaningful action
- Project Cockpit ยังคงเป็น read model
- Attention จัดอันดับตาม consequence ไม่ใช่ recency อย่างเดียว
- ทุก attention item มี primary human action ที่ชัดหนึ่งรายการ หรือมีเหตุผลชัดว่าทำไมยังลงมือไม่ได้
- Write action fail closed เมื่อ identity, authority, revision หรือ safety คลุมเครือ
- Asynchronous effects แสดง receipt และ recovery state ตามความจริง
- Semantic และ safety meaning คงที่ข้าม profiles และ brands
- NFP ไม่สามารถถูกซ่อนหรือแต่งให้ดูพร้อมผลิต
- Role Views และ LINE ยังถูก block จนกว่า authority และ effect gates ผ่าน
- User testing ตรวจ task comprehension ไม่ใช่ aesthetic preference อย่างเดียว

## 18. แหล่งอ้างอิง

- Nielsen Norman Group, [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- Nielsen Norman Group, [Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/)
- Nielsen Norman Group, [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)
- W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- AWS Prescriptive Guidance, [Transactional Outbox Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- AWS Builders' Library, [Making Retries Safe with Idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- Microsoft Research, [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/)
- Chalmers University, [Enabling Connected Construction Sites](https://odr.chalmers.se/items/b7339ddc-796b-495a-a2a8-0607699beeb3)
- Santini et al., [Drivers of Digital Transformation Adoption](https://pmc.ncbi.nlm.nih.gov/articles/PMC8841366/)
