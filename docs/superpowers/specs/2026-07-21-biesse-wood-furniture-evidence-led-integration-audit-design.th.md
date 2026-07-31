# การตรวจการบูรณาการ Biesse Wood/Furniture แบบยึดหลักฐาน — ข้อกำหนดการออกแบบ

**ฉบับ:** ภาษาไทย  
**วันที่ออกแบบ:** 21 กรกฎาคม 2026  
**สถานะ:** สัญญาการออกแบบที่อนุมัติแล้ว  
**แนวทางที่อนุมัติ:** B — Evidence-led Integration Audit  
**ผู้มีอำนาจตัดสินใจ:** Dave / เจ้าของ MONOLITH  

> **มติการออกแบบ:** ตรวจ software และ machine-integration stack สำหรับงานไม้/เฟอร์นิเจอร์ของ Biesse เทียบกับหลักฐานทางการปัจจุบันและ source ของผลิตภัณฑ์ MONOLITH ที่มีอยู่จริง ต้องแยกให้ชัดระหว่างคำกล่าวอ้างความสามารถของผู้ขาย implementation ที่ตรวจพบในเครื่อง และผลที่ผ่านการรับรองพร้อมผลิต พร้อมเปลี่ยนข้อสงสัยเรื่อง CIX, tooling, controller, ข้อมูล และการ release ให้เป็น qualification gates แบบ fail-closed

## 1. วัตถุประสงค์

การตรวจต้องตอบคำถามเพื่อการตัดสินใจ 5 ข้อ:

1. Biesse wood/furniture stack ปัจจุบันประกาศว่าทำอะไรได้บ้าง และมีแหล่งทางการใดรองรับแต่ละข้อ?
2. MONOLITH มี integration ของ Biesse/CIX/Biesse ISO อะไรอยู่จริง อยู่ใน Git root, branch, revision, caller, test และ release mode ใด?
3. เส้นทางใดในเครื่องยังไม่ครบ คลุมเครือ ไม่ปลอดภัย หรือไม่มีหลักฐาน OEM รองรับ?
4. MONOLITH ควร `Retain`, `Refactor`, `Integrate`, `Build` หรือ `Retire` อะไร?
5. ต้องมีหลักฐานใดก่อน output ของ Biesse จะเลื่อนจาก shadow mode ไปเป็นงานที่ได้รับอนุญาตให้รันกับเครื่องจริง?

การตรวจนี้เป็นเครื่องมือเพื่อการตัดสินใจและการรับรอง ไม่ใช่ข้อความการตลาด การรับรองจาก OEM คำปรึกษากฎหมาย หรือการอนุญาตให้ตัดชิ้นงานจริง

## 2. ขอบเขต

### 2.1 Biesse wood/furniture stack ที่รวมในงาน

การตรวจครอบคลุมสายงานต่อไปนี้เท่าที่หลักฐานปัจจุบันรองรับ:

`iX by imos -> B_NEST / B_OPTI / B_EDGE -> B_SOLID -> SmartConnection -> Biesse CNC cell ที่กำหนดค่าแล้ว -> Sophia / service และ data feedback`

สายงานนี้เป็น functional model ไม่ใช่ข้ออ้างว่าผลิตภัณฑ์ทุกชื่อจำเป็น ต้องซื้อรวมกัน เข้ากันได้ในทุก version หรือถูกติดตั้งใน MONOLITH แล้ว

หัวข้อที่รวมในงานคือ:

- การออกแบบเฟอร์นิเจอร์แบบ parametric และ process planning ผ่าน iX by imos;
- 3D CAD/CAM, programming, simulation, virtual-machine checks, tool data และ time estimation ผ่าน B_SOLID เท่าที่เอกสารทางการระบุ;
- nesting ผ่าน B_NEST และ cutting optimization ผ่าน B_OPTI;
- การเตรียมงาน edgebanding ผ่าน B_EDGE/B_SUITE;
- job-order scheduling, machine linking และ production startup ผ่าน SmartConnection;
- ขอบเขตของ CIX และ Biesse ISO รวมถึง provenance, grammar, controller, firmware, software version และการเลือก postprocessor;
- machine profile, work envelope, tool magazine, tools, feeds, speeds, faces, axes, coordinate frames, clamps และ no-cut zones;
- label, part identity, BOM และการกระทบยอด operation;
- telemetry ของ Sophia/customer care และสัญญาข้อมูลของ connected product;
- สิทธิการเข้าถึง แบ่งปัน ส่งออก และเก็บรักษาข้อมูลตาม EU Data Act รวมถึงผลต่อ integration โดยไม่ให้คำปรึกษากฎหมาย;
- code, test, caller, release control และช่องว่างการรับรอง production ของ MONOLITH

### 2.2 สิ่งที่ไม่รวมในรอบนี้

การตรวจ Biesse รอบแรกไม่รวม:

- software สำหรับแก้วและหิน ได้แก่ IC, ICAM และ Easystone;
- การคาดเดา schema หรือ algorithm ภายในที่เป็น proprietary ของ Biesse;
- การรับรองครอบคลุมเครื่องหรือ controller ของ Biesse ทุกแบบ;
- การเปลี่ยนค่าเครื่องจริง การรัน CNC หรือการเอา `NOT_FOR_PRODUCTION` ออก;
- ข้อสรุปด้านการซื้อ license สัญญา หรือกฎหมายที่ไม่มีเอกสารและผู้มีอำนาจรับผิดชอบรองรับ;
- การแก้ implementation ซึ่งต้องมี implementation plan ที่อนุมัติแยกต่างหาก

## 3. แนวทางและ deliverable ที่อนุมัติ

แนวทางที่เลือกเป็นระดับกลางจากสามระดับที่พิจารณา:

| ระดับ | ผลลัพธ์ | มติ |
|---|---|---|
| Catalog summary | อธิบายความสามารถที่เผยแพร่ แต่ยืนยัน integration ในเครื่องหรือความปลอดภัยสำหรับ production ไม่ได้ | ไม่เลือกเพราะไม่เพียงพอ |
| Evidence-led integration audit | เชื่อมแหล่งทางการ การไล่ source สอง root การวิเคราะห์ความปลอดภัย ขอบเขต Data Act และ qualification gates | **อนุมัติสำหรับรอบนี้** |
| OEM qualification dossier | เพิ่มคู่มือ licensed หลักฐาน controller/version ที่ระบุชื่อ fixture จาก B_SOLID, dry run, coupon, first article และการลงนามจาก OEM/โรงงาน | ต้องทำภายหลังก่อนมี production authority |

ชุด audit ที่เป็น authoritative จะมี 4 ไฟล์ที่เนื้อหาตรงกัน:

- `docs/research/2026-07-21-biesse-wood-furniture-monolith-evidence-led-integration-audit.en.md`
- `docs/research/2026-07-21-biesse-wood-furniture-monolith-evidence-led-integration-audit.th.md`
- ไฟล์ standalone `.en.html` และ `.th.html` ที่ตรงกัน

เมื่อ standalone audit ผ่าน acceptance แล้ว จะนำสรุป Biesse ไปเพิ่มใน Vendor and Standards Evidence Ledger ที่ควบคุมอยู่ ห้ามเขียนทับ shared ledger ขณะที่ process อื่นกำลังแก้ไข และต้องเริ่ม integration ด้วยการตรวจ status และ diff ใหม่

## 4. สัญญาหลักฐาน

### 4.1 การจำแนกข้อสรุป

ข้อสรุปสำคัญทุกข้อใช้ claim class ของ MONOLITH ที่ควบคุมไว้:

- `VERIFIED FACT`
- `OWNER DECISION`
- `INFERENCE`
- `PROPOSAL`
- `UNKNOWN`
- `CONTRADICTED`

อำนาจของแหล่งข้อมูลต้องบันทึกแยกต่างหาก ตัวอย่างเช่น หน้า Biesse ทางการยืนยันข้อเท็จจริงได้ว่า **Biesse ระบุ** ความสามารถหนึ่ง แต่ไม่ได้พิสูจน์ว่าความสามารถนั้นมี license ถูกตั้งค่า เชื่อมกับ MONOLITH ได้ หรือผ่านการรับรอง production ที่โรงงานของผู้ใช้

### 4.2 ลำดับความสำคัญของแหล่งข้อมูล

ข้ออ้างสำคัญจากผู้ขายและหน่วยงานกำกับใช้ลำดับดังนี้:

1. หน้า product, technical document, release note, manual และหนังสือโต้ตอบที่ลงนามโดย OEM/โรงงานของ Biesse ที่เป็นปัจจุบัน;
2. กฎหมายที่ใช้บังคับหรือข้อความทางการจากหน่วยงานกำกับ;
3. source, test, schema, runtime caller, configuration, generated fixture และ release evidence ปัจจุบันในเครื่อง;
4. แหล่งเทคนิคอิสระ ใช้เฉพาะเมื่อไม่มีแหล่งปฐมภูมิและต้องติดป้ายชัดเจน;
5. search และ Perplexity Research ใช้เพื่อค้นพบและสังเคราะห์เชิงโต้แย้ง ไม่ใช้เป็น authority สุดท้ายของข้ออ้างที่รับน้ำหนักการตัดสินใจ

ทุกข้ออ้างสำคัญต้องบันทึกชื่อเรื่อง URL หรือ local path, publisher หรือ Git root, revision/วันที่เข้าถึง, product/version ที่ใช้ได้, claim class, confidence, limitation, contradiction status และหลักฐานที่ต้องใช้เพื่อยกระดับ

### 4.3 กฎสำหรับข้ออ้างเชิงลบ

การตรวจต้องไม่ทำผิดแบบ A4 เดิมที่เปลี่ยน “ไม่พบในเอกสารสาธารณะ” เป็น “ไม่มีอยู่” ผลิตภัณฑ์ที่สร้างหรือรันงาน CNC ได้ย่อมต้องรับหรือคำนวณ machining parameter จากที่ใดที่หนึ่ง แต่แหล่งสาธารณะอาจไม่เปิดเผย storage model, formula, interface หรือรูปแทนเฉพาะ controller

ข้ออ้างว่าไม่มีต้องค้นทั้งเอกสารทางการ เอกสาร licensed เมื่อเข้าถึงได้ local schema, source, production caller, test, generated artifact, runtime behavior และขอบเขตที่ผู้ขายระบุ มิฉะนั้นต้องสรุปเป็น `UNKNOWN` หรือ “ยังยืนยันไม่ได้จากหลักฐานที่ตรวจ”

## 5. ชุดแหล่งทางการตั้งต้น

การตรวจเริ่มจากแหล่งทางการปัจจุบันต่อไปนี้ แต่ไม่จำกัดเพียงเท่านี้:

- [Biesse software catalog](https://biesse.com/th/th/software/)
- [B_SOLID](https://biesse.com/th/th/software/b_solid/)
- [B_NEST](https://biesse.com/th/th/software/b_nest/)
- [B_EDGE](https://biesse.com/th/th/software/b_edge/)
- [SmartConnection](https://biesse.com/th/th/software/smartconnection/)
- [iX by imos](https://biesse.com/us/en/software/ix-by-imos/)
- [บทความการจำลอง digital replica ของ B_SOLID](https://biesse.com/it/it/novita/il-software-di-simulazione-della-replica-digitale-assicura-vantaggi-concreti-agli-utenti-cnc/)
- [บทความ optimization ของ B_NEST](https://biesse.com/th/th/news/b-nest-software-for-the-optimisation-of-nesting-projects/)
- [Biesse Customer Care และ Sophia](https://biesse.com/ww/en/customer-care/)
- [หน้า Biesse Data Act](https://biesse.com/us/en/data-act/)
- เอกสารข้อมูล connected product ของ Biesse ที่หน้า Data Act เชื่อมไว้ ซึ่งตรวจพบว่าอัปเดตเดือนธันวาคม 2025;
- [Regulation (EU) 2023/2854 — Data Act](https://eur-lex.europa.eu/eli/reg/2023/2854/oj)

หน้าสาธารณะเป็นจุดเริ่มค้นหา การตรวจต้องระบุเอกสารเทคนิค licensed, คู่มือเฉพาะเครื่อง, controller reference, postprocessor specification และ sample file ที่จำเป็นแต่ไม่มีเผยแพร่สาธารณะ

## 6. สัญญาตรวจ repository และ runtime

### 6.1 Baseline สอง root ที่บังคับ

ข้อสรุป current state ทุกข้อต้องแยก:

| Root | บทบาทที่สังเกต | Snapshot ตอนออกแบบ |
|---|---|---|
| `C:\Users\thai3\determined-williams (2)` | Governance/bootstrap, research, controlled evidence, report และ specification | `master`, HEAD `acdbc36f5ecaeb63ef192da108cd2185b13711f3`; มีงานเดิมและงานพร้อมกันอยู่ใน dirty tree |
| `C:\Users\thai3\determined-williams (2)\determined-williams` | ผลิตภัณฑ์ MONOLITH แบบ TypeScript/React/Supabase และ implementation ด้าน CNC/factory | `fix/drillmap-bolt-and-brun-dowels`, HEAD `59f61e5785d2a1215a74687fe0def91e9400c75d`; มี Daph exports ที่แก้เดิมและ temporary trace tests ที่ untracked |

ข้อมูลนี้เป็นการสังเกตที่เปลี่ยนได้ ณ เวลาออกแบบ ไม่ใช่ product metric ถาวร ตอนทำ audit ต้องบันทึก branch, full SHA, upstream, status, test environment และ timestamp ใหม่

### 6.2 Local trace ที่บังคับ

การตรวจต้องไล่ execution และ data path จริง ไม่ใช่ดูเพียงชื่อไฟล์:

1. input ด้าน canonical design/BOM/part และ drilling;
2. การสร้างและ validate operation graph;
3. การเลือก machine profile;
4. การ resolve postprocessor และ normalize dialect;
5. CIX และ Biesse ISO emitter;
6. production caller, bundle construction, การส่งต่อ status, warning, filename, checksum และ release packet;
7. factory export path ที่อาจสร้าง Biesse output แข่งขันกัน;
8. test ของกรณี supported, unsupported, invalid และ unknown tool;
9. shadow mode และ release-authority control;
10. runtime route, API, import, simulator หรือ machine feedback path ที่มีอยู่

Initial trace ต้องรวมอย่างน้อย:

- `src/cnc/machine/presets/biesse.ts`
- `src/cnc/post/postProcessor.ts`
- `src/cnc/post/dialects/cix.ts`
- `src/cnc/post/dialects/biesseIso.ts`
- `src/cnc/buildGcodeBundle.ts`
- `src/cnc/mapping/validateOperationGraph.ts`
- `src/factory/cnc/generateGcodeForJob.ts`
- `src/factory/server/export/zipBundle.ts`
- `src/cnc/post/dialects/__tests__/cix.test.ts`
- `src/cnc/__tests__/buildGcodeBundle.test.ts`
- `src/core/config/shadowMode.ts`
- `src/factory/packet/__tests__/notForProduction.test.ts`

การมี source พิสูจน์ว่ามี implementation แต่ไม่พิสูจน์ deployment, machine compatibility, การยอมรับของโรงงาน หรือ production ที่ปลอดภัย

## 7. ข้อค้นพบด้านความปลอดภัยที่ audit ต้องปิดให้ได้

รายการต่อไปนี้เป็น preliminary `VERIFIED FACT` ของ source snapshot ที่ตรวจ การทำ audit ต้องทำซ้ำ จำกัดขอบเขต และจัดระดับ โดยห้ามทำให้ดูเป็นเรื่องปกติอย่างเงียบ ๆ

### B0 — operation ที่ไม่รองรับอาจหายไปแต่ output ยังเป็น OK

CIX emitter ปัจจุบันรองรับ `DRILL` และ `BORE`; type ที่ไม่รองรับจะเพิ่ม warning และไม่สร้าง operation element ส่วน test ของ POCKET คาดว่า `status` ยังเป็น `OK` ขณะที่ `operationCount` เท่ากับศูนย์ Bundle builder รวม warning และอาจคืน `status: 'OK'` หลัง postprocess

กฎสำหรับ production ที่บังคับ:

`จำนวน manufacturing operation ขาเข้า = operation ที่ emit + operation ที่ได้รับอนุญาตชัดเจนว่าไม่ต้องทำบนเครื่องนี้`

ผลต่างที่อธิบายไม่ได้ต้องทำให้ release ล้มเหลว ห้ามละ operation แบบ warning-only สำหรับ output ที่มี production authority

### B0 — unknown tool อาจ default เป็น tool หมายเลข 1

CIX emitter ปัจจุบันเตือนแล้ว default unknown tool เป็น `TNO=1`; test ยืนยันเส้นทาง OK Production output ห้ามเดา tool จริง ต้อง resolve และลงนาม tool identity, magazine position, diameter, usable cutting length, holder, rotation, speed/feed authority, life state และ applicability ต่อ machine/controller มิฉะนั้นต้อง fail closed

### B1 — ยังยืนยัน CIX conformance และ provenance ไม่ได้

Source ในเครื่องอธิบาย output ว่าเป็น CIX XML ที่เข้ากับ Biesse และอ้าง forum ของ Autodesk ซึ่งเป็นแหล่งบุคคลที่สาม เอกสาร Biesse ทางการปัจจุบันยืนยันว่า CIX file เข้าร่วม workflow ของ Biesse ได้ แต่หลักฐานสาธารณะที่ตรวจยังไม่ยืนยัน grammar ที่ MONOLITH implement ห้ามเรียก emitter ว่า OEM-conformant หากไม่มี OEM specification ที่มี version, golden fixture ที่ยอมรับ หรือหลักฐานลงนามเทียบเท่า

### B1 — Biesse output สองทางอาจเป็นคนละ contract

Postprocessor registry normalize `BIESSE` แบบทั่วไปไปเป็น CIX แต่ยังเก็บ `BIESSE_ISO`; factory ZIP อีกทางสร้าง program แบบ Biesse ISO การตรวจต้องหา caller ทุกจุดและตัดสินว่าเป็น adapter เฉพาะ controller, legacy path, test fixture หรือ competing source of truth

### B1 — generic Biesse machine preset ไม่ใช่ production authority

Rover B FT preset ในเครื่องมีค่าตัวเลขด้าน envelope, axis, spindle, magazine, tool และ process ทุกค่าต้องผูกกับ machine model, serial/configuration, controller, firmware, option ที่ติดตั้ง, tooling, material, setup และแหล่งอนุมัติที่ตรงกัน Generic preset อนุญาตให้รันเครื่องจริงไม่ได้

เนื่องจาก nested product อยู่ใน shadow mode แบบ `NOT_FOR_PRODUCTION` อย่างชัดเจน รายการ B0 เหล่านี้คือ production-release blockers ไม่ใช่หลักฐานว่าเกิดการตัดจริงที่ไม่ปลอดภัยแล้ว

## 8. ขอบเขต integration เป้าหมาย

MONOLITH ควรเป็นเจ้าของ business intent และ manufacturing intent แบบ canonical ส่วน software และ controller ของ Biesse คงความรับผิดชอบแบบ OEM-native

`งาน/revision ที่ MONOLITH อนุมัติ -> canonical BOM และ part identity -> machine-neutral operation graph -> Biesse adapter package ที่มี version -> CIX หรือ output เฉพาะ controller -> import/simulation ใน B_SOLID -> human release -> configured machine cell -> inspection และ feedback -> evidence record ใน MONOLITH`

Adapter package ต้องระบุและผูก:

- machine model และ asset identity;
- controller และ firmware;
- version ของ B_SOLID/B_NEST/software อื่นที่เกี่ยวข้อง;
- output dialect และ grammar revision;
- coordinate frame, face, datum, unit และ orientation;
- tool library และ snapshot ของ magazine;
- clamp, pod, vacuum zone, spoilboard, work envelope และ no-cut zone;
- supported-operation matrix และกฎ reject ที่ชัดเจน;
- authority ของ material/process recipe;
- postprocessor version และ checksum;
- หลักฐาน test fixture, simulator, coupon และ first article;
- ผู้ลงนาม ระยะเวลาที่ใช้ได้ และสถานะเพิกถอน

MONOLITH ต้องไม่สร้างซ้ำ proprietary machine control, safety PLC logic หรือ OEM optimization ที่มองไม่เห็น หาก governed integration ให้ผลที่ต้องการได้ Identifier และ payload แบบ Biesse-native ต้องเก็บแบบไม่สูญเสียพร้อม canonical mapping

## 9. Error handling และหลัก release

Biesse package ที่จะเป็น production candidate ต้อง fail closed เมื่อเกิดเงื่อนไขใดเงื่อนไขหนึ่ง:

- operation ไม่มี qualified mapping;
- tool หรือ tool position ไม่ทราบ ถูกอนุมาน ล้าสมัย หรือไม่เข้ากัน;
- controller, firmware, software, machine หรือ adapter version หายหรือไม่ตรงกัน;
- coordinate frame, face, datum, unit, thickness หรือ orientation คลุมเครือ;
- ไม่มีหลักฐาน tool reach, holder clearance, clamp/vacuum zone, envelope หรือ collision;
- named Biesse software/version parse หรือ import output ไม่ได้;
- operation reconciliation, checksum, revision, signature หรือ human authorization ล้มเหลว;
- หลักฐาน simulator, dry run, coupon หรือ first article ที่บังคับไม่มีหรือหมดอายุ

Warning ใช้แจ้ง engineering review ได้ แต่ห้ามลด mandatory release failure ให้กลายเป็น warning อย่างเงียบ ๆ Override ทุกครั้งต้องระบุ authorized role, เหตุผล, ขอบเขต, หลักฐาน, timestamp และวันหมดอายุ ส่วน safety-critical unknown ห้าม override

## 10. การออกแบบ qualification และ test

การตรวจต้องกำหนด evidence ladder เป็นขั้น:

1. **Source and contract review:** เอกสารทางการที่มี version, supported-operation matrix, controller/software compatibility และ data rights
2. **Static conformance:** schema, parser, unit, coordinate frame, deterministic output, operation reconciliation, tool resolution และ fail-closed test
3. **Golden fixtures:** กรณีแทนของ drill, bore, groove, pocket, profile, edge, aggregate และ orientation พร้อม expected artifact และกรณีที่ต้อง reject
4. **Differential import:** import artifact เดียวกันเข้า B_SOLID environment ที่ระบุชื่อ แล้วกระทบยอด geometry, tool, operation, warning และลำดับที่ประเมิน
5. **Virtual-machine simulation:** ตรวจ collision, travel, tool/holder, setup, clamp/vacuum และเวลา พร้อมเก็บหลักฐาน
6. **Controlled dry run:** machine/controller/configuration ที่ระบุ ไม่ตัดชิ้นงาน มี operator ที่ได้รับอนุญาต และบันทึกผล
7. **Material coupon:** ควบคุม tool/material/setup มี metrology plan, acceptance limit, NCR handling และ traceability
8. **First article:** ใช้ job revision ที่ release แล้ว ตรวจ dimension/feature ครบ ลงนาม และกำหนด rollback criteria
9. **Production authorization:** ขอบเขต adapter/machine/material ที่จำกัดเวลา พร้อม monitoring, change control และ revocation

การตรวจต้องมี qualification matrix ที่ key ด้วย machine asset, controller/firmware, software version, postprocessor, operation family, tool library, material class, thickness range, setup, evidence artifact, owner, result, validity และ expiry

ความพยายามรัน focused CIX tests ก่อนหน้านี้ยังไม่เริ่ม test เพราะ environment หา `vitest` ไม่พบ การตรวจต้องบันทึกว่าเป็นข้อจำกัดของ environment ติดตั้งหรือแก้ dependency เมื่อได้รับอนุญาตเท่านั้น และรัน test เดิมซ้ำก่อนกล่าวว่า test ผ่านหรือล้มเหลว

## 11. สัญญาข้อมูล Sophia และ EU Data Act

การตรวจต้องแยก:

- raw connected-product data;
- user/business data และ personal data;
- Biesse service data และ derived analytics;
- canonical operational evidence ของ MONOLITH;
- export format, semantics, frequency, latency, access method, retention และ deletion;
- สิทธิ first-party access และ third-party sharing;
- ข้อจำกัดด้าน cybersecurity, trade secret, contract และ competitive use;
- ความต่างระหว่างสิทธิตามกฎหมาย สิทธิตามสัญญา ความพร้อมทางเทคนิค และ MONOLITH ingestion ที่ implement แล้ว

เอกสารข้อมูล Biesse ที่ตรวจระบุข้อมูลเบื้องต้น เช่น ผู้ใช้เข้าถึงผ่าน Sophia ได้สองปี Biesse เก็บห้าปี ส่งออกอย่างน้อยในรูป TXT และอาจสร้างต่อเนื่องหรือ real time ตาม product/service รายการเหล่านี้ต้องตรวจซ้ำกับเอกสารปัจจุบันและ configuration ที่ใช้จริง ไม่ใช่หลักฐานว่ามี MONOLITH data connector แล้ว และไม่ใช่คำปรึกษากฎหมาย

สัญญาข้อมูลเป้าหมายต้องกำหนด stable identifier, timestamp และ timezone, unit, quality flag, schema/version, pagination/stream behavior, retry และ idempotency, consent/authority, retention, export, deletion, audit และ fallback เมื่อ Sophia หรือ direct protocol ใช้ไม่ได้

## 12. โครงเอกสาร audit

Audit ฉบับสุดท้ายต้องมี:

1. executive verdict และ decision summary;
2. scope, method, evidence class, snapshot และ limitation;
3. แผนผัง Biesse wood/furniture stack;
4. product capability และ claim ledger;
5. การวิเคราะห์ CIX/Biesse ISO/interface และ provenance;
6. current-state trace ของ MONOLITH สอง root พร้อม caller และ test ที่ตรง;
7. finding ระดับ B0 ถึง B3;
8. target integration architecture และ system-of-record boundary;
9. การประเมิน Sophia/Data Act/data governance;
10. qualification ladder, matrix, stop condition และ evidence template;
11. ตาราง `Retain / Refactor / Integrate / Build / Retire`;
12. remediation และ dependency sequence ตามลำดับความสำคัญ;
13. source register, contradiction, unknown และ evidence-request list

## 13. Acceptance criteria

ชุด audit ยอมรับได้เมื่อ:

- English และ Thai Markdown มีความหมายตรงกัน;
- Markdown แต่ละภาษามี standalone HTML ที่อ่านได้;
- ข้ออ้าง Biesse สำคัญทุกข้ออ้างแหล่งทางการปัจจุบัน หรือติดขอบเขตว่าไม่ใช่ primary source ชัดเจน;
- ข้ออ้าง implementation ของ MONOLITH ทุกข้อระบุ Git root, branch, full SHA, file, caller และ line หรือ symbol ที่เกี่ยวข้องถูกต้อง;
- ไม่ยกการมี source เป็น deployment, compatibility, qualification หรือ production evidence;
- ทำซ้ำ จำกัดขอบเขต และไม่ลดความรุนแรงของ B0 เรื่อง operation หายและ unknown tool;
- ผูก CIX และ Biesse ISO กับ contract ของ controller/software/version ที่ชัดเจน มิฉะนั้นคงสถานะ blocked เป็น `UNKNOWN`;
- ค่าตัวเลขของเครื่องหรือ process ทุกค่ามีแหล่งและ applicability envelope มิฉะนั้นต้องไม่เป็น production authority;
- แยก official vendor claim กับผลที่พิสูจน์อิสระอย่างเห็นได้ชัด;
- ส่วน Data Act อ้างเอกสาร Biesse และ EU ปัจจุบันตรงฉบับ และระบุว่าไม่ใช่คำปรึกษากฎหมาย;
- บันทึก test command, environment, output และ limitation โดยไม่แต่งผล;
- ไม่ commit secret, API key, credential, ข้อความจาก licensed manual, personal data หรือ proprietary customer payload;
- ไม่แตะ nested dirty worktree และการเปลี่ยนแปลงอื่นใน parent;
- Audit ไม่อนุญาต production และคง shadow-mode gates ไว้

## 14. ลำดับทำงานหลังผู้ใช้อนุมัติ written spec

หลังเจ้าของตรวจ written specification นี้แล้ว implementation plan จะจัดลำดับ:

1. refresh แหล่ง Biesse และ EU ทางการ ใช้ Perplexity Research เพื่อ discovery/adversarial checking และใช้ primary source เป็น authority สุดท้าย;
2. freeze snapshot สอง root และ evidence inventory ที่ทำซ้ำได้;
3. ไล่ Biesse path ในเครื่องทั้งเส้นและทำ safety finding ซ้ำ;
4. สร้าง claim, compatibility, operation-coverage และ qualification matrix;
5. ร่างและ self-review audit ภาษาอังกฤษ;
6. สร้างฉบับภาษาไทยที่ตรงกัน;
7. render และตรวจ standalone HTML ทั้งสองภาษา;
8. ตรวจ citation, link, parity, secret, contradiction และ Git scope;
9. เพิ่มสรุปที่ยอมรับแล้วใน Vendor and Standards Evidence Ledger โดยไม่เขียนทับงานพร้อมกัน

การอนุมัติเอกสารนี้ยังไม่อนุญาตให้เริ่มแก้ runtime

## 15. ผล self-review ของแบบ

- **ตรวจ placeholder:** ไม่มี `TBD` หรือ `TODO` ที่ยังไม่ปิด
- **ความสอดคล้อง:** scope, evidence rule, architecture, finding, test design และ acceptance gate รักษาความต่างระหว่าง public capability, local implementation และ production qualification
- **ขอบเขต:** รวมงานไม้/เฟอร์นิเจอร์ และตัดแก้ว/หินออกชัดเจน
- **ความกำกวม:** ห้ามใช้คำว่า “เข้ากับ Biesse” แบบทั่วไป Compatibility ต้องเป็น contract ที่มี version ของ machine/controller/software/adapter
- **ความปลอดภัย:** unsupported operation และ unknown tool เป็น production blocker แบบ fail-closed และ shadow mode ยังมีผล

