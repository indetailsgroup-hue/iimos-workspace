# แบบระบบ MONOLITH LINE Trust Foundation

**ฉบับ:** ภาษาไทย<br>
**วันที่:** 26 กรกฎาคม 2026<br>
**สถานะ:** แบบระบบผ่านการอนุมัติระหว่างการทบทวนเชิงโต้ตอบ; รอการตรวจฉบับเอกสาร<br>
**สถานะการพัฒนา:** เอกสารนี้ยังไม่ได้เริ่ม implementation<br>
**Product repository:** `determined-williams/` ซึ่งเป็น nested active product repository<br>
**Governance repository:** workspace root ชั้นนอก<br>
**แนวทางที่เลือก:** Trust Kernel Spine โดยใช้ LINE เป็น vertical slice แรก

## 1. คำตัดสินระดับบริหาร

MONOLITH จะคง LINE ไว้เป็น **Human Surface** ของระบบ LINE OA, LINE Groups, Rooms, LIFF และ Personal Push ยังคงเป็นช่องทางสื่อสารที่ผู้ใช้คุ้นเคย แต่ LINE ไม่ใช่ฐานข้อมูลหลัก ไม่ใช่ผู้มีอำนาจตัดสินสิทธิ์ และไม่ใช่แอปแชทภายในตัวใหม่

ทุก event หรือ action ที่มีผลต่อความจริงทางธุรกิจต้องผ่าน Trust Kernel กลางเพียงชุดเดียว ซึ่งทำหน้าที่:

1. ระบุ channel และ Tenant เจ้าของ;
2. ระบุบุคคลและ tenant-local profile;
3. ระบุ organization, site, project, resource และ revision;
4. ตรวจ membership, role, project-party relationship, scoped grant และ delegation;
5. ตรวจ workflow state, ความเสี่ยงของ action และระดับความมั่นใจในการยืนยันตัวตน;
6. ตัดสินผลเป็น `PERMIT`, `DENY`, `STEP_UP` หรือ `QUARANTINE`;
7. บันทึก business write, decision audit และ atomic delivery intent ใน transaction ที่ถูกต้อง

รุ่นแรกถือว่าสำเร็จเมื่อ Tenant ที่สองผ่าน **Shadow Proof** โดยไม่มีการส่งข้อความถึงลูกค้าจริง และมีหลักฐาน negative isolation tests, grant revocation, risk-based step-up, audit completeness และ delivery reliability ครบถ้วน

## 2. ขอบเขต Repository และหลักฐานปัจจุบัน

MONOLITH เป็นระบบสอง Git root:

- root ชั้นนอกเป็น governance/bootstrap repository;
- `determined-williams/` ชั้นในเป็น active product repository

แบบนี้ปฏิบัติตาม `CONTEXT.md` และเอกสารแก้ไขขอบเขต repository วันที่ 21 กรกฎาคม 2026 ใน nested repository มี implementation ด้าน LINE, workflow, database, field และ manufacturing จำนวนมาก แต่การมี source ไม่ได้พิสูจน์ deployment หรือ production readiness

แบบระบบนี้ตอบสนองต่อหลักฐานที่ตรวจพบใน nested product source เมื่อวันที่ 26 กรกฎาคม 2026:

- มี LINE webhook, outbound sender, LINE Login, group flows, approval flows และ notification workers;
- LINE Login สร้างค่า `state` แต่ callback path ที่ตรวจยังไม่ยืนยัน server-side transaction state ก่อนผูกตัวตน;
- approval/postback แยกอยู่หลาย ingress path ทั้งที่ Messaging API channel มี webhook endpoint เดียว;
- group business action บางรายการยังไม่ได้ resolve บุคคลและ authorize action ต่อ project อย่างสม่ำเสมอ;
- `line_oa_outbound_messages` ยังไม่เป็น atomic claim/lease outbox contract ที่สมบูรณ์;
- migration model ปัจจุบันพึ่ง `site_code` อย่างมาก และยังไม่มี canonical Tenant–Organization–Site invariant ที่พิสูจน์แล้ว;
- group handler failure บางกรณีสามารถถูกส่งกลับเป็นค่า แล้วถูกบันทึกว่า processed;
- audit ปัจจุบันจำกัดการแก้/ลบ แต่ยังไม่พิสูจน์ human-actor envelope, tamper evidence, retention และ purge lifecycle อย่างครบถ้วน

ข้อเหล่านี้เป็นข้อมูลสำหรับการออกแบบ ไม่ใช่ข้ออ้างว่า deployment ทุกแห่งมีสถานะเดียวกัน ต้องมี fresh implementation verification เสมอ

## 3. วัตถุประสงค์

Trust Foundation ต้อง:

1. กำหนด Tenant เป็นขอบเขตด้านสัญญา ความปลอดภัย และข้อมูล;
2. ให้ business resource ทุกชิ้นมี Tenant เจ้าของเพียงหนึ่งราย;
3. รองรับองค์กรภายนอกด้วยสิทธิ์ที่ระบุชัด มีวันหมดอายุ และเพิกถอนได้;
4. แยก global authentication ออกจากข้อมูลบุคคลและการจ้างงานที่ Tenant เป็นเจ้าของ;
5. รวม business-action authorization ไว้จุดเดียว โดยไม่สร้าง IAM ซ้ำใน LINE;
6. ให้ผู้ใช้ LINE ที่ยังไม่ยืนยันตัวตนส่งหลักฐานได้โดยไม่มีอำนาจธุรกิจ;
7. บังคับ risk-based step-up สำหรับ action ที่มีผลผูกพัน;
8. ทำ delegation ให้ explicit, scoped, non-transitive และไม่เพิ่มสิทธิ์เกินผู้มอบ;
9. ย้ายจาก `site_code` แบบ additive โดยไม่หยุดการทำงานของ Daph;
10. ป้องกัน partial business state, false processed-success และ duplicate delivery;
11. สร้าง decision record ที่ครบถ้วน คุ้มครองข้อมูลส่วนบุคคล และตรวจการแก้ไขย้อนหลังได้;
12. ปิด live tenant expansion จน Tenant ที่สองผ่าน shadow proof

## 4. สิ่งที่ไม่อยู่ในขอบเขต

แบบนี้ไม่:

- สร้างแอปแชทภายในตัวใหม่;
- ทำให้ LINE เป็น master database;
- เปลี่ยน `site_code` ทุกจุดทั้งแพลตฟอร์มแบบ big bang;
- เปิด Tenant ที่สองให้ส่งข้อความลูกค้าจริง;
- ถือว่าสมาชิก LINE Group มีสิทธิ์โดยอัตโนมัติ;
- ทำให้ Daph เป็นเจ้าของแพลตฟอร์มหรือ canonical platform tenant;
- ทำ customer campaign, AI sales automation, analytics หรือประสบการณ์ LINE ส่วนอื่นให้เสร็จในรอบนี้;
- อ้าง production readiness จาก source, design approval หรือการมี unit tests

## 5. Owner decisions ที่อนุมัติแล้ว

| ประเด็น | กฎที่อนุมัติ |
|---|---|
| Ownership model | Tenant Boundary + Project Parties |
| การทำงานข้ามองค์กร | Owner Tenant เดียว; คู่ค้าใช้ scoped guest access |
| ตัวตนบุคคล | Minimal global auth subject + tenant-local profile |
| Authorization | Membership, role, project party, grant, delegation, เวลา และ workflow state แบบซ้อนชั้น |
| Default | Deny จนพิสูจน์สิทธิ์ของ action ที่แน่นอนได้ |
| ผู้ใช้ Group ที่ไม่รู้จัก | Quarantined evidence เท่านั้น |
| Action ที่มีผลสูง | Risk-based step-up ผ่าน LIFF/Login |
| Delegation | ระบุ capability, resource, เวลา และเหตุผล; เพิกถอนได้และส่งต่อไม่ได้ |
| Migration | Additive compatibility bridge จาก `site_code` |
| Success gate แรก | Tenant 2 shadow proof โดยไม่มี live customer messaging |
| Delivery | Transactional notification intent + atomic outbox |
| Stop rule | ห้าม live onboarding Tenant 2 หรือขยาย customer messaging จนผ่าน release gate ทุกข้อ |

## 6. แนวคิดมาตรฐาน

### 6.1 Tenant

Tenant คือขอบเขตด้านความปลอดภัย ธรรมาภิบาลข้อมูล และสัญญาทางการค้า Daph เป็น pilot tenant หนึ่งราย ห้ามอนุมาน Tenant จากชื่อแบรนด์ ชื่อ LINE Group, `site_code` หรือการเลือกของ operator

### 6.2 Organization, Site และ Project

- **Organization:** ฝ่ายทางกฎหมายหรือฝ่ายปฏิบัติการ เช่น studio, dealer, factory, contractor หรือ customer organization
- **Site:** สถานที่ปฏิบัติงานของ organization หนึ่งภายใต้ Tenant context หนึ่ง
- **Project:** ความร่วมมือทางธุรกิจที่ Tenant หนึ่งเป็นเจ้าของ
- **Project Party:** organization ที่เข้าร่วม Project ด้วยความสัมพันธ์และ scope ที่ประกาศชัด

Project หนึ่งมีหลาย organization ได้ แต่มี Owner Tenant หลายรายไม่ได้

### 6.3 Global auth subject และ tenant-local profile

Global auth subject เป็น pseudonymous authentication anchor เก็บเฉพาะข้อมูลขั้นต่ำสำหรับจดจำ authenticated subject และ assurance state

ชื่อ ข้อมูลการจ้างงาน ข้อมูลลูกค้า ความสัมพันธ์กับ LINE, role, membership และข้อมูลส่วนบุคคลอยู่ใน tenant-local profile บุคคลคนเดียวมี profile ในหลาย Tenant ได้ โดยไม่สร้าง global personal-data master

### 6.4 Membership, Role, Grant และ Delegation

- **Membership** ระบุความสัมพันธ์ของ subject กับ Tenant หรือ Organization
- **Role** ให้ baseline ของกลุ่ม action ที่จำกัดขอบเขตแล้ว
- **Project Party** พิสูจน์เหตุผลที่ organization ภายนอกเข้าร่วม Project
- **Access Grant** จำกัด resource และ action พร้อมเวลาเริ่ม หมดอายุ และเพิกถอน
- **Delegation** มอบ capability ที่ระบุชัดให้ทำแทน principal อื่น

Effective permission เป็นผลตัดร่วมของ control เหล่านี้ ไม่มีชั้นใดเพิ่มอำนาจเกิน policy ของ Owner Tenant หรือสิทธิ์จริงของผู้มอบได้

### 6.5 LINE identity binding

LINE identity binding เชื่อม provider/channel identity ที่ยืนยันแล้วกับ tenant-local profile พร้อม assurance, lifecycle status, verification method และเวลา การตรวจ webhook signature พิสูจน์แหล่ง transport และความครบถ้วนของข้อมูล แต่ไม่พิสูจน์ว่าผู้ส่งมีสิทธิ์ทำ business action

## 7. สถาปัตยกรรม Trust Kernel

Trust Kernel เป็น shared policy boundary ไม่ใช่ permission database เฉพาะ LINE

### 7.1 Components

| Component | หน้าที่ | สิ่งที่ห้ามทำ |
|---|---|---|
| Unified LINE ingress | ตรวจ raw signature, บันทึกรับ event, deduplicate, normalize และ dispatch ตาม event type | ตัดสิน business permission |
| Tenant/resource resolver | Resolve owner tenant, organization, site, project, resource, revision และ bridge mappings | เดา Tenant จากข้อความแสดงผล |
| Principal resolver | Resolve LINE binding, auth subject, tenant profile, membership และ assurance | ถือ group membership เป็นตัวตน |
| Action classifier | สร้าง canonical action, resource references, risk tier, expected revision และ payload digest | เปลี่ยน business state |
| Policy decision point | คืน permit, deny, step-up หรือ quarantine พร้อม reason codes และ policy version | ส่ง LINE โดยตรง |
| Domain command handler | ทำ workflow transition หรือ business mutation ที่ได้รับอนุญาต | ข้าม policy หรือ audit |
| Decision audit | บันทึก actor, delegation, action, resource, decision, reason และ causation | เก็บ secret หรือ PII ที่ไม่จำเป็น |
| Atomic outbox | บันทึก delivery intent ใน transaction เดียวกับ business state และ audit | เรียก LINE ก่อน commit |
| Delivery worker | Claim แบบ atomic, ใช้ lease, ส่งด้วย stable retry identity และบันทึกผล | ตัดสิน business permission ซ้ำ |
| Compatibility bridge | Map `site_code` เดิมไป canonical site, organization และ tenant | คงอยู่เป็น security boundary ถาวร |

### 7.2 Non-bypass invariant

Business mutation ทุกชนิดที่มาจาก LINE ต้องเรียก policy decision point ถ้า database function, Edge Function, webhook handler, LIFF callback, postback handler, worker หรือ operator tool เปลี่ยน business state โดยข้าม decision นี้ ให้ถือว่าไม่ conform

## 8. Conceptual data model

ชื่อ migration จริงปรับตาม convention ของ repository ได้ แต่แนวคิดต่อไปนี้เป็นข้อบังคับ

| Entity | Minimum invariant |
|---|---|
| `tenants` | Stable opaque ID, lifecycle status และ policy version |
| `organizations` | Owner Tenant หนึ่งราย, organization type และ status |
| `sites` | Organization และ Tenant เดียว; legacy alias แยกจาก identity |
| `projects` | Owner Tenant เดียว; owning organization/site ตามบริบท |
| `auth_subjects` | Minimal global authentication anchor; ไม่มี tenant-owned profile data |
| `tenant_profiles` | Tenant context เดียว; PII เข้ารหัสและเก็บขั้นต่ำ |
| `memberships` | ความสัมพันธ์ profile-to-tenant/organization พร้อม lifecycle |
| `project_parties` | ความสัมพันธ์ project-to-organization พร้อม purpose และ status |
| `access_grants` | Subject/party, actions, resources, start, expiry, revocation และ issuer |
| `delegations` | Delegator, delegate, capabilities, resource scope, เวลา, เหตุผล และ non-transitive flag |
| `line_identity_bindings` | Provider, channel, LINE subject, tenant profile, assurance และ lifecycle |
| `step_up_transactions` | State, nonce, action digest, expected revision, redirect URI, expiry และ consumed time |
| `inbound_events` | Event key, channel, raw digest, processing state, lease, attempts และ last error |
| `policy_decisions` | Policy version, actor envelope, action, resource, reason codes และ outcome |
| `delivery_outbox` | Intent, destination, stable retry key, status, lease, attempts, next attempt และ result |
| `site_code_mappings` | Legacy code, canonical IDs, validity interval และ migration status |

Tenant-owned row ต้องมี Tenant ID หรือ derive ผ่าน foreign-key path ที่บังคับไม่ให้ข้าม Tenant ได้ Resource reference ที่ใช้ authorize ต้อง canonical และ stable

## 9. Authorization decision contract

### 9.1 Input

`authorize_business_action()` รับ canonical envelope:

- authenticated หรือ transport principal;
- tenant-local profile และ membership context;
- owner tenant;
- organization, site, project, resource และ expected revision;
- requested action และ normalized payload digest;
- channel และ source context;
- role, project-party relationship, access grants และ delegation;
- workflow state;
- risk tier และ assurance ปัจจุบัน;
- request time และ correlation identifiers

### 9.2 Output

ผลตัดสินมีเพียง:

- `PERMIT`: ทำ command ที่ระบุได้;
- `DENY`: ห้ามเกิด business mutation;
- `STEP_UP`: ต้องยืนยันตัวตนที่แรงขึ้นและผูกกับ action;
- `QUARANTINE`: เก็บหลักฐานได้แต่ไม่มี business authority

ผลยังต้องมี:

- policy version;
- machine-readable reason codes;
- required assurance เมื่อจำเป็นต้อง step-up;
- normalized tenant/resource/action identifiers;
- decision timestamp และ audit reference

### 9.3 Mandatory rules

1. Default deny
2. หนึ่ง Owner Tenant ต่อหนึ่ง resource
3. Unknown identity ห้าม approve, accept, order, change scope หรือ transition workflow
4. Group membership เป็น context ไม่ใช่ permission
5. Grant และ delegation ต้อง active ณ เวลาตัดสิน
6. Delegation ส่งต่อไม่ได้และเพิ่มสิทธิ์ไม่ได้
7. Consequential approval ต้องผูกกับ action digest และ expected revision
8. Revision, amount, scope หรือ payload ที่เปลี่ยนทำให้ approval transaction เดิมใช้ไม่ได้
9. Revocation มีผลในการ policy check ครั้งถัดไป; cache ต้อง invalidate ตาม policy/grant version
10. Policy หรือ audit ล้มเหลวต้อง fail closed

## 10. Risk และ Assurance

| Tier | ตัวอย่าง | พฤติกรรมบังคับ |
|---|---|---|
| Low | ส่งรูป แจ้งปัญหา ขอข้อมูล | ใช้ bound identity เมื่อมี; unknown actor เป็น quarantined evidence |
| Medium | รับทราบงาน ยืนยันเข้าหน้างาน ส่ง structured field record | ใช้ short-lived one-time action token ผูกกับ resource และ revision |
| High | อนุมัติแบบ รับมอบงานติดตั้ง สร้าง binding order อนุมัติ scope/ราคา | LIFF/Login step-up, state/nonce ที่ตรวจแล้ว, explicit consequence screen, action digest, expected revision และ TTL สั้น |
| ห้ามทำด้วย LINE อย่างเดียว | Action ที่ owner policy หรือกฎหมายจำกัด | ส่งต่อไป authoritative application หรือ human-controlled process |

Step-up ไม่ใช่ generic login session แต่เป็น authorization transaction สำหรับ action เดียว

## 11. Identity binding และ Step-up lifecycle

### 11.1 Binding lifecycle

`pending → active → suspended → revoked`

Activation ต้องใช้ server-side transaction ที่มี:

- `state` ที่เดาไม่ได้;
- OIDC `nonce` เมื่อเกี่ยวข้อง;
- exact redirect URI;
- Tenant และ profile เป้าหมาย;
- one-time bind-token digest;
- creation/expiry time;
- consumed marker

Callback ต้องเปรียบเทียบและ consume transaction ก่อนผูก LINE identity หรือ mint MONOLITH session ถ้าขาด หมดอายุ ไม่ตรง ถูก replay หรือเคยใช้แล้ว ต้อง fail closed

### 11.2 Step-up lifecycle

`created → presented → authenticated → confirmed → consumed`

Transaction ต้องเก็บ tenant, actor, resource, action, payload digest, expected revision, assurance requirement และ expiry ที่แน่นอน หากค่าใดเปลี่ยน confirmation ต้องล้มเหลว

## 12. Canonical LINE data flow

### 12.1 Inbound

1. รับ raw webhook ที่ ingress เดียวของ Messaging API channel
2. Resolve channel configuration และตรวจ signature บน raw body ก่อน parse
3. บันทึก idempotent inbox receipt เป็น `RECEIVED`
4. Claim processing แบบ atomic พร้อม lease
5. Resolve tenant/resource context และบังคับให้ channel, group/conversation, project และ bridge mappings ตรงกัน
6. Resolve human principal, tenant profile, membership และ assurance
7. Normalize canonical action envelope
8. ประเมิน Trust Kernel decision
9. ถ้า `DENY` ให้บันทึก decision และตอบอย่างปลอดภัยโดยไม่ mutation
10. ถ้า `QUARANTINE` ให้เก็บ evidence พร้อม source/review state โดยไม่เปลี่ยน workflow
11. ถ้า `STEP_UP` ให้สร้าง one-time action-bound LIFF/Login transaction ที่มี expiry
12. ถ้า `PERMIT` ให้บันทึก domain state, decision audit และ notification intent ใน database transaction เดียว
13. Mark inbound event เป็น `SUCCEEDED` หลัง transaction commit เท่านั้น

### 12.2 Outbound

1. Domain logic สร้าง notification intent ไม่เรียก LINE โดยตรง
2. Notification policy เลือก recipient, channel, urgency, SLA, escalation และ template
3. Delivery intent commit เข้า atomic outbox พร้อม business state และ audit
4. Worker claim row แบบ atomic พร้อม lease
5. Worker ใช้ stable retry key สำหรับ LINE send API ที่รองรับ
6. บันทึก success, duplicate acceptance, retryable failure, permanent failure และ response metadata
7. Retryable row ใช้ bounded backoff; เมื่อหมดโอกาสหรือเป็น permanent failure ให้เข้า dead letter
8. Operator resolution ต้องถูก audit

## 13. Processing และ Failure semantics

Inbound processing states:

`RECEIVED → PROCESSING → SUCCEEDED`

Failure paths:

`PROCESSING → RETRYABLE → PROCESSING` หรือ `DEAD_LETTER`

กฎ:

- duplicate ที่เป็น `SUCCEEDED` เท่านั้นจึง ack เป็น no-op;
- error string ที่ return กลับมาไม่ใช่ success;
- stale processing lease reclaim ได้อย่างปลอดภัย;
- domain, audit หรือ outbox failure ต้อง rollback transaction ทั้งหมด;
- ห้ามมี external side effect ก่อน commit;
- LINE timeout, `429` และ `5xx` ใช้ stable retry identity และ backoff;
- permanent `4xx` ห้าม retry ไม่สิ้นสุด;
- delivery failure ห้ามเปลี่ยนเป็น delivered;
- ข้อความถึงผู้ใช้ห้ามอ้างว่าอนุมัติหรือส่งสำเร็จก่อนมี confirmation

## 14. Audit, Privacy และ Retention

Governed event ทุกตัวต้องบันทึก:

- owner tenant และ resource;
- transport actor และ human principal แยกกัน;
- tenant profile และ delegated-by principal เมื่อมี;
- action, expected revision และ payload/action digest;
- policy version, assurance, reason codes และ outcome;
- event, correlation และ causation identifiers;
- UTC timestamps;
- before/after state digest เมื่อเหมาะสม;
- retention class และ data classification

Audit ต้อง append-only และ tamper-evident ด้วย chained digest หรือ external immutable archive การห้าม update/delete อย่างเดียวไม่เพียงพอสำหรับคำกล่าวว่า tamper-evident

Secret, access token, bind token, raw authorization code และ PII ที่ไม่จำเป็นห้ามอยู่ใน log/audit Raw LINE payload และ quarantined evidence ต้องมี retention, encryption, review, export และ purge policy ที่ชัด การ pseudonymize/delete tenant-local personal data ต้องรักษา lawful audit record ขั้นต่ำโดยไม่เก็บเนื้อหาเกินจำเป็น

## 15. Additive compatibility migration

### Phase 0 — Baseline

Inventory `site_code`, LINE channel, group, conversation, identity binding, project, policy path และ tenant-relevant RLS rule ที่ active ทั้งหมด พร้อม reproducible baseline

### Phase 1 — Add

เพิ่ม canonical tenant, organization, site, profile, membership, project-party, grant, delegation, decision และ mapping structures โดยยังไม่เปลี่ยนพฤติกรรม Daph

### Phase 2 — Map และ Backfill

สร้าง mapping จาก `site_code` ปัจจุบันของ Daph ไป canonical site, organization และ tenant ID ตรวจ duplicate, orphan, ambiguous mapping และ cross-scope conflict Backfill ต้องรันซ้ำได้อย่าง idempotent

### Phase 3 — Shadow decisions

รัน Trust Kernel resolution/policy ขนานกับ behavior เดิม บันทึกความต่างโดยยังไม่เปลี่ยน outcome ความต่างที่อธิบายไม่ได้ต้อง block enforcement

### Phase 4 — Enforce LINE vertical slice

บังคับ LINE-originated business mutation ทุกตัวผ่าน Trust Kernel Tenant context ที่ resolve ไม่ได้หรือไม่สอดคล้องต้อง fail closed ส่วน unknown actor ยังส่ง quarantined evidence ได้

### Phase 5 — Tenant 2 shadow proof

สร้าง Tenant ที่สองพร้อม organization, site, profile, grant, LINE configuration และ project แยก ใน non-live environment หรือ blocked-delivery mode แล้วพิสูจน์ isolation, collaboration, revocation, step-up, audit, retry และ operator recovery

`site_code` อยู่เป็น legacy alias ชั่วคราวได้ แต่ห้ามเป็น security boundary

## 16. Verification strategy

### 16.1 Policy unit และ Property tests

Generate combination ของ role, membership, party, grant, delegation, เวลา, workflow state, risk และ assurance เพื่อพิสูจน์ default deny, non-amplification, expiry, revocation และ deterministic reason codes

### 16.2 Database และ RLS denial tests

ต้องพิสูจน์:

- cross-tenant read/write ถูกปฏิเสธ;
- project resource อ้าง owner tenant อื่นไม่ได้;
- guest access จำกัดเฉพาะ resource/action ที่ grant;
- revocation และ expiry ปฏิเสธ access;
- service-role path ไม่กลายเป็น undocumented authorization bypass

### 16.3 Webhook และ Identity integration

ทดสอบ:

- signature before parse;
- unknown channel;
- replay และ duplicate delivery;
- webhook ingress เดียว dispatch message, postback, group, room, follow, join, leave และ event type ที่เกี่ยวข้อง;
- OAuth `state`/`nonce` positive และ negative paths;
- bind-token replay, callback swapping, exact redirect URI, expiry และ lifecycle transitions

### 16.4 LINE Group security

ทดสอบ unknown actor quarantine, source spoofing, wrong group/project, wrong tenant, approval-token reuse, non-primary customer, authorized delegate, expired grant และ non-transitive delegation

### 16.5 Outbox reliability

ทดสอบ concurrent claim, lease expiry, worker crash ก่อน/หลัง LINE response, result-record failure, stable retry identity, duplicate acceptance, `429`, `5xx`, permanent `4xx`, bounded attempts และ dead-letter replay

### 16.6 Migration, End-to-end และ Operations

ทดสอบ idempotent backfill, uniqueness, orphan detection, shadow-decision comparison, Daph regression, Tenant 2 shadow journey, backup/restore, rollback, monitoring และ operator runbooks

## 17. Release gates

ต้องผ่านครบทุกข้อ:

1. Active LINE/project record ใน scope มี canonical tenant mapping ที่ชัดเจนทุกตัว
2. Daph regression verification ผ่านด้วย fresh evidence
3. Cross-tenant denial, revoke, expired grant, non-transitive delegation และ action-digest tests ผ่าน
4. OAuth state/nonce, step-up TTL, one-time consumption และ exact-action binding ผ่านทั้ง positive/negative tests
5. Outbox concurrency, partial failure, retry, duplicate acceptance และ dead-letter tests ผ่าน
6. Tenant 2 ผ่าน shadow journey โดยไม่มี live customer messaging
7. Audit completeness, tamper evidence, retention และ secret/PII leakage checks ผ่าน
8. ซ้อม monitoring, operator resolution, backup/restore และ rollback
9. ไม่มี Critical/High security finding ที่ยังเปิดใน Trust Foundation scope
10. Release evidence ระบุ commit, migration set, configuration, test run, environment และ approvers

ถ้า gate ใดไม่ผ่าน:

- tenant-2 live onboarding ต้องปิดต่อ;
- customer-messaging expansion ต้องปิดต่อ;
- Daph อยู่บน controlled compatibility path;
- gate ที่ล้มเหลวต้องมี owner, evidence requirement และ remediation plan

## 18. Operational signals

Dashboard/alert ขั้นต่ำ:

- inbound events แยก processing state และอายุเก่าสุด;
- signature/channel rejection rate;
- tenant-resolution mismatch count;
- quarantine queue age และ review backlog;
- permit/deny/step-up/quarantine แยก reason code และ policy version;
- step-up completion, expiry และ replay rejection;
- grant/delegation ที่ active, ใกล้หมดอายุ และ revoked;
- outbox pending age, attempts, lease recovery และ dead-letter count;
- delivery outcome แยก LINE endpoint/error class;
- audit append failure และ tamper-verification failure;
- unresolved `site_code` mapping count;
- Tenant 2 shadow isolation violation ซึ่งต้องเป็นศูนย์

## 19. ทางเลือกที่พิจารณา

### ย้ายทั้งแพลตฟอร์มก่อน

ไม่เลือกในรอบนี้ เพราะ blast radius สูง ทำให้การปิด LINE trust gap ช้า และไม่ปลอดภัยใน worktree ที่กำลังเปลี่ยนหนัก Target platform model ยังรองรับการย้าย domain อื่นภายหลัง

### สร้าง permission wrapper เฉพาะ LINE

ไม่เลือก เพราะทำให้ identity/authorization truth ซ้ำ เกิด policy drift และต้องรื้อใหม่ภายหลัง

### ใช้ `site_code` เป็น Tenant ต่อ

ไม่เลือก เพราะ Site, legal organization, contract boundary, brand, factory และ customer organization เป็นคนละแนวคิด

### ให้ Project มีหลาย Owner Tenant

ไม่เลือก เพราะ shared ownership ทำให้ deletion, export, legal control, incident response และ authorization authority ไม่ชัด Collaboration ใช้ owner เดียว + scoped grants

## 20. Risks และ Mitigations

| ความเสี่ยง | วิธีลดความเสี่ยง |
|---|---|
| Existing path ข้าม policy point | Inventory mutation entrypoints; เพิ่ม contract tests และ deny direct calls |
| โมเดลเก่า–ใหม่ drift ระหว่าง migration | Mapping table, shadow comparison, metrics และ cutover gate |
| Global identity กลายเป็น PII master | Minimal auth subject + tenant-local encrypted profiles |
| Guest access ค้างหลังจบงาน | Required expiry, revocation, periodic review และ active-use checks |
| Step-up ทำให้ใช้งานยาก | ใช้ risk tier; low-risk evidence ยังเป็นธรรมชาติใน LINE |
| LINE retry ทำข้อความซ้ำ | Stable retry identity, atomic claims, leases และ result reconciliation |
| Audit กลายเป็นคลังข้อมูลอ่อนไหว | Data minimization, digests, retention classes, encryption และ purge |
| Tenant 2 ถูกอ้างเป็น proof เร็วเกินไป | Shadow-only delivery block และ mandatory negative isolation evidence |

## 21. Completion definition ของ Design Cycle นี้

Design cycle นี้เสร็จเมื่อ:

- ฉบับอังกฤษและไทยที่เนื้อหาตรงกันได้รับการตรวจ;
- Markdown และ standalone HTML ทั้งสองภาษาถูก commit;
- ผู้ใช้อนุมัติ written spec;
- มี implementation plan แยกต่างหากจากแบบที่อนุมัติ;
- ยังไม่เริ่ม implementation ก่อนแผนดังกล่าวได้รับการตรวจ

Design cycle ถัดไปตามลำดับ:

1. Unified LINE ingress และ dispatcher;
2. LINE Login/binding และ risk-based step-up;
3. Group action authorization และ quarantine review;
4. Reliable delivery outbox;
5. Audit, privacy, retention และ operator controls;
6. ประสบการณ์ LINE สำหรับลูกค้าและหน้างานในวงกว้าง
