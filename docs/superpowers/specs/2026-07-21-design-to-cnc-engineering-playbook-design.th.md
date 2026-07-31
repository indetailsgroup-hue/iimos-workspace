# คู่มือวิศวกรรม Design-to-CNC — ข้อกำหนดการออกแบบ

**วันที่:** 2026-07-21  
**สถานะ:** แบบได้รับอนุมัติแล้ว; ยังไม่เริ่มดำเนินการสร้าง deliverables  
**เป้าหมายหลัก:** HOMAG/woodWOP โดยใช้ MPR/MPRX และใช้ DXF แบบกำหนดเวอร์ชันเป็น fallback  
**ชิ้นงานอ้างอิง:** ตู้ล่างครัว frameless ขนาด 600 × 560 × 720 มม.

## 1. วัตถุประสงค์

สร้างคู่มือวิศวกรรมและชุดข้อมูลอ้างอิงที่เครื่องตรวจสอบได้ เพื่อเปลี่ยน design intent ให้เป็น manufacturing package ที่พิสูจน์ย้อนกลับได้ เฟสแรกครอบคลุม:

`Design → BOM → Nesting → CNC → Digital Verification → First Article Verification`

งานต้องรองรับผู้ใช้สามกลุ่ม:

- ผู้บริหาร: control gates, ความเสี่ยง, ผู้รับผิดชอบ และหลักฐานการอนุมัติ
- วิศวกร/ทีมซอฟต์แวร์: สูตร schema coordinate contract กฎการ derive และ test vectors
- CNC operator/ทีมคุณภาพ: setup, simulation, dry run, การวัด การประกอบ และ checklist การ release

## 2. ขอบเขตและสิ่งที่ไม่อ้างในเฟสแรก

### อยู่ในขอบเขตเฟสแรก

- Canonical product contract ที่มีเวอร์ชัน
- Product, Material, Hardware, Machine และ Quality Profiles แบบ parameterized
- สูตร geometry, BOM, nesting, machining feature และ verification
- Worked example ครบวงจรหนึ่งชุดสำหรับตู้ตัวอย่าง
- BOM/cut-list, nesting manifest, ตัวอย่าง MPR/MPRX และตัวอย่าง DXF fallback แบบกำหนดเวอร์ชัน
- Fail-closed validation และกระบวนการ production release ที่ควบคุมได้
- Digital verification ตามด้วย First Article บนเครื่องจริงภายใต้ผู้ควบคุม

### ไม่อ้างในเฟสแรก

- Postprocessor ที่เป็น vendor-neutral
- การปล่อยผลิตอัตโนมัติโดยไม่มีวิศวกรและ operator อนุมัติ
- MPR/MPRX ที่ปลอดภัยต่อการผลิตก่อน pin เครื่องเป้าหมาย เวอร์ชัน woodWOP เครื่องมือ ระบบจับยึด และเงื่อนไข vacuum
- ระบบ CPQ, จัดซื้อ, scheduling, installation หรือ warranty ที่สมบูรณ์ โดยส่วนเหล่านี้อยู่ใน framework lanes ระยะถัดไป

## 3. Reference configuration ที่อนุมัติแล้ว

| รายการ | Baseline ที่อนุมัติ |
|---|---|
| ผลิตภัณฑ์ | ตู้ล่างครัว |
| Carcass สำเร็จ | W600 × D560 × H720 มม. |
| Plinth/ขา | ขาปรับ 100 มม.; ไม่รวม worktop |
| ระบบโครงสร้าง | European frameless 32 มม. |
| แผ่น carcass | 18 มม. |
| หลังตู้ | 6 มม. เข้าร่อง |
| ส่วนบน | คานหน้าและหลังสองชิ้น ไม่ใช้ท็อปเต็มแผ่น |
| ชั้น | ชั้นปรับระดับหนึ่งชิ้น |
| หน้าบาน | บานคู่ full overlay; gap รอบนอกและกึ่งกลางเริ่มต้น 2 มม. |
| บานพับ | Hettich Sensys 110° family พร้อม mounting plate ที่เข้ากันได้ |
| ตัวต่อ | Hettich Rastex 15 family พร้อม dowel |
| เส้นทาง CNC | MPR/MPRX เป็นหลัก; DXF เป็น fallback |
| ระดับการพิสูจน์ | Digital verification, dry run ภายใต้ผู้ควบคุม และ First Article ที่ลงนามแล้ว |

Order number, drilling drawing, mounting-plate height, overlay solution, connector variant และ dowel specification ที่แน่นอนต้องเป็น input บังคับของ Hardware Profile โดยมาจากเอกสารผู้ผลิต revision ที่ pin ไว้ ห้ามอนุมานจากชื่อ family

## 4. หลักการกำกับ

1. **Contract-first:** derived artifact ทุกชิ้นมาจาก canonical product contract เดียว
2. **ห้ามแก้ปลายน้ำแบบไร้ร่องรอย:** การแก้ฝั่ง CNC ต้องย้อนกลับไปแก้ contract/profile แล้ว generate และ verify ใหม่
3. **Parameterized rules:** ค่าวัสดุ ฮาร์ดแวร์ เครื่องจักร และคุณภาพเป็น profile ไม่ใช่ constant ฝังในสูตร
4. **Fail closed:** แหล่งอ้างอิงไม่ครบ geometry ผิด mating features ไม่ตรง หรือเครื่องไม่ปลอดภัย ต้อง block release
5. **Source authority:** เอกสารผู้ผลิตและคู่มือเครื่องมีอำนาจเหนือสูตรตัวอย่างและข้อมูลจาก tutorial
6. **กำหนดเวอร์ชันทุกอย่าง:** contract, formula, schema, profile, adapter, source และ approval ต้องมีเวอร์ชัน
7. **แยกข้อเท็จจริงจาก inference:** ต้องแยก HOMAG facts, engineering assumptions และ MONOLITH architecture
8. **ต้องพิสูจน์ทางกายภาพ:** simulation อย่างเดียวไม่สามารถให้สถานะ `PRODUCTION_RELEASED`

## 5. สถาปัตยกรรมระบบ

### 5.1 Inputs

Profiles ที่มีเวอร์ชันห้ากลุ่มป้อนเข้า product contract:

1. Product Profile — topology, มิติ, construction choices, gaps และ clearances
2. Material Profile — ความหนา ความหนาแน่น ลายผิว การปกป้องผิว edge behavior และ machining allowances
3. Hardware Profile — SKU จริง แบบผู้ผลิต กฎ load/quantity mating features และข้อห้าม
4. Machine Profile — เวอร์ชัน woodWOP, axes, travel, tools, tool IDs, spindle/feed envelopes, ข้อจำกัด clamping/vacuum และเวอร์ชัน postprocessor
5. Quality Profile — tolerance, วิธีตรวจ, sampling และ acceptance rules

### 5.2 Canonical product contract

Contract ต้องมี:

- Project revision, approvals, release status และ contract hash
- Assemblies พร้อม finished dimensions, origin, constraints และความสัมพันธ์ parent/child
- Parts พร้อม finished/raw dimensions, material, grain, edge treatments และ quantities
- Face และ datum definitions พร้อม coordinate transforms ที่ระบุชัด
- Manufacturing features ได้แก่ holes, grooves, pockets, contours และ joint roles
- Hardware instances และ mating manufacturing features
- Formula/source provenance และ assumptions
- References ไป derived packages โดยไม่ทำสำเนาค่าที่กรอกด้วยมือ

### 5.3 Deterministic derivation pipeline

`Profiles → Product Contract → Geometry Resolver → Hardware Solver → BOM/Cut List → Machining Feature Graph → Nesting Package → Postprocessor → Verification`

Output หลักคือ MPR/MPRX สำหรับ woodWOP target ที่ pin ไว้ DXF เป็น interchange fallback ที่ layer/block mapping อยู่ใน Machine Adapter และมีเวอร์ชัน DXF ไม่ใช่แหล่ง engineering truth

## 6. Coordinate contract

- หน่วยระยะภายใน: มิลลิเมตร
- Assembly origin: มุมหน้า-ซ้าย-ล่างของ carcass สำเร็จ
- Assembly axes: +X ไปขวา, +Y ไปหลัง, +Z ขึ้นบน
- Part แต่ละชิ้นเก็บ assembly-to-part transformation อย่างชัดเจน
- Machining feature ทุกตัวผูกกับ part face, local datum, direction/normal และ depth semantics
- Machine Adapter แปลง canonical frames ไปยัง coordinate system ของ woodWOP/เครื่องเป้าหมายและบันทึกเวอร์ชัน
- ห้ามสูตรสมมติว่า canonical part coordinates เท่ากับ machine coordinates
- Coordinate round-trip test ต้องคืนจุดเดิมภายใน tolerance ของ Quality Profile

## 7. ระบบสูตร

Formula record ทุกตัวต้องมี:

- Stable ID และ semantic version
- Typed inputs, units, ช่วงค่าที่อนุญาต และแหล่งข้อมูล
- สมการหรือ deterministic procedure
- Assumptions และ prohibited uses
- ตัวอย่างแทนค่าจากตู้ reference
- Authority class: engineering, manufacturer หรือ machine
- Positive, boundary และ negative test vectors
- Failure behavior: block, warning ที่ต้อง sign-off หรือ information
- Source URL/document identifier, revision และ access date

### ตระกูลสูตร

1. Geometry — finished/raw size, setback, overlay/inset, clearance, grooves และ edge allowances
2. Hardware/32 มม. — row/datum placement, cup/mounting-plate geometry, cam/dowel mating และกฎ quantity/load ของผู้ผลิต
3. BOM/cost — quantities, edge length, area, volume, mass, waste class และ cost inputs ที่มี revision
4. Nesting — stock bounds, trim, spacing, cutter diameter/kerf, grain lock, rotation, common-line eligibility และ remnant identity
5. Cutting parameters — เช่น `feed = RPM × flute_count × chip_load` โดยต้องถูกจำกัดด้วย tool, material, machine และ manufacturer limits
6. Tolerance/inspection — worst-case stack สำหรับ fit/safety, measured deviation, feature true position, diagonal difference และ acceptance

ค่าที่ผู้ผลิตควบคุมห้ามเดา ได้แก่ hinge quantity/load limits, drilling patterns, connector geometry, tool envelopes, clamping/vacuum safety และ postprocessor syntax ต้องมี authoritative data ที่ pin ไว้

## 8. Worked example ของตู้ reference

Known inputs:

`W=600, D=560, H=720, carcass_thickness=18, back_thickness=6, nominal_gap=2 มม.`

Initial deterministic results:

- Clear carcass width: `W_clear = W − 2t = 564 มม.`
- Paired-door width: `W_door = (W − 2×outer_gap − center_gap) / 2 = 297 มม.`
- Door height: `H_door = H − top_gap − bottom_gap = 716 มม.`
- Side panels ×2: `720 × 560 × 18 มม.`
- Bottom ×1: `564 × 560 × 18 มม.`
- Top rails ×2: `564 × rail_width × 18 มม.` โดย `rail_width` มาจาก Product Profile
- Shelf ×1: `(564 − 2×side_clearance) × shelf_depth × 18 มม.`
- Back ×1: derive จาก groove topology ห้ามกรอกมือ
- Raw blank dimensions: finished dimensions บวก trim และ edge allowances จาก profile

มิติหน้าบานเป็น geometry result เท่านั้น Hinge cup, mounting plate, overlay, setback และ quantity ยังไม่ valid จนกว่า Hettich Hardware Profile ที่ pin ไว้จะ resolve และ validate

## 9. Control gates

| Gate | หลักฐานที่ต้องมี | ตัวอย่างที่ block |
|---|---|---|
| G0 Input completeness | Units, sources, versions และ profile fields บังคับ | ไม่มี SKU, source revision หรือ machine/tool definition |
| G1 Geometry/buildability | มิติ clearance topology และ collision ถูกต้อง | ขนาดติดลบ ชิ้นงานซ้อน ประกอบเข้าไม่ถึง |
| G2 Hardware/32 มม. | Manufacturer rules และ mating-feature reconciliation | รู cam/dowel ไม่ตรง หรือ hinge overlay ใช้ไม่ได้ |
| G3 BOM | Reconcile parts, hardware และ edges | Orphan feature, ขาด part หรือ quantity ไม่ตรง |
| G4 Nesting | วางทุก part หนึ่งครั้งภายใต้ constraints | ลายผิด overlap ขาด part หรือ spacing ผิด |
| G5 Machine compatibility | Tool, travel, depth, clamping/vacuum และ adapter | ไม่มี tool, overtravel หรือทะลุ protected face |
| G6 Digital verification | Parse ใน woodWOP target และ simulation ไม่ชน | Parse error, collision หรือ unsafe path |
| G7 Operator/dry run | ลงนาม datum/tool/spoilboard/vacuum และ dry run | Zero ผิด เสี่ยงชน clamp หรือ tool ไม่ตรง |
| G8 First Article | Measurements, assembly, motion, gaps และ defect record | ฝืนประกอบ tolerance ไม่ผ่าน หรือบานชน |
| G9 Production release | Evidence bundle และ release identity ที่อนุมัติ | ขาด approval หรือ dependency version ล้าสมัย |

## 10. Error model

- **ERROR — block:** ขาด authority, geometry ผิด, joint ไม่ตรง, tool ไม่มี, depth ไม่ปลอดภัย, simulation fail หรือ release dependency ล้าสมัย
- **WARNING — ต้อง sign-off:** nesting yield ต่ำ, non-preferred tool, tolerance ใกล้ขีดจำกัด, manual handling หรือ substitution ที่อนุมัติ
- **INFO — บันทึก:** cost/time estimate, optimization alternative, remnant creation และ observation ที่ไม่ block

Diagnostic ทุกตัวต้องมี code, severity, entity ที่ได้รับผล, เวอร์ชัน formula/profile/source, คำอธิบายสำหรับคน และ corrective action

## 11. Verification strategy

ตรวจตามลำดับ:

1. Formula unit tests รวม boundary และ negative cases
2. Schema validation และ cross-entity invariants
3. Golden BOM และ cut-list reconciliation
4. Coordinate transformation และ round-trip tests
5. Nesting completeness/overlap/grain/spacing tests
6. MPR/MPRX parsing และ simulation ใน woodWOP target ที่ pin ไว้
7. Operator review และ dry run เหนือ stock
8. First Article dimensional inspection
9. Assembly, gaps, movement และ collision acceptance

การเปลี่ยน profile, formula, schema, adapter, source revision, tool, machine หรือเวอร์ชัน woodWOP ทำให้หลักฐานที่เกี่ยวข้องหมดอายุและต้อง rerun test set ที่ได้รับผล

## 12. Release states

1. `DRAFT`
2. `ENGINEERING_VALIDATED`
3. `DIGITAL_VERIFIED`
4. `FIRST_ARTICLE_APPROVED`
5. `PRODUCTION_RELEASED`

ตัวอย่างไฟล์ CNC ต้องติดสถานะ `NOT_FOR_PRODUCTION` จนผ่าน G8 และมีการลงนาม G9 การเปลี่ยน dependency ทำให้ release ย้อนกลับไปสถานะแรกที่ได้รับผล

## 13. ชุด deliverables

### Human-readable

- Executive control gates
- Engineering principles, formulas และ data contracts
- Worked example ตู้ reference แบบครบวงจร
- Operator และ inspection procedures
- Formula/source register
- Markdown ภาษาไทยและอังกฤษ พร้อม standalone HTML ที่เนื้อหาตรงกัน

### Machine-readable

- JSON Schemas สำหรับ product contract, profiles ห้าชนิด และ validation results
- Reference JSON ของตู้ 600 มม.
- Formula และ test-vector registry
- BOM/cut-list CSV และ nesting manifest
- ตัวอย่าง MPR/MPRX และ DXF fallback ที่มีเวอร์ชัน
- Golden expected results, inspection record, deviation log และ release record

## 14. Expansion framework

ระบบครบวงจรถูกแบ่งเป็น lanes ที่วางแผนแยกกัน:

1. Design-to-CNC — ขอบเขตลงลึกในเฟสแรก
2. Site Truth — survey, datum, as-built, VIF, scribing และ worktop templating
3. Commercial — CPQ, costing, lead time, approvals และ change propagation
4. Materials — procurement, inventory, lots, remnants และ substitutions
5. Production — scheduling, labels/QR, station routing, WIP และ QA holds
6. Installation/Warranty — packing, installation sequence, tolerances, as-installed records, DLP และ warranty

Lane ระยะถัดไปแต่ละ lane ต้องมี design, implementation plan, contracts, gates และ tests ที่อนุมัติแยกกัน

## 15. Definition of Done ของเฟสแรก

- Markdown TH/EN และ standalone HTML มีเนื้อหาตรงกัน
- ไม่มี placeholder ที่ยังไม่แก้หรือ production constant ที่ไม่มีแหล่งอ้างอิง
- Schemas validate reference contracts และ profiles ทั้งหมด
- Formula test vectors รวม negative cases ผ่าน
- Golden BOM และ nesting manifest reconcile 100%
- MPR/MPRX เปิดและ simulate ผ่านใน woodWOP target ที่ pin ไว้
- Operator checklist ครอบคลุม datum, tools, spoilboard, vacuum/clamping และ dry run
- First Article measurements และ assembly acceptance ลงนามก่อน production release
- Released artifact ทุกชิ้น trace กลับไปยัง contract, profile, formula, source, adapter และ approval versions ได้

## 16. ขอบเขตความปลอดภัย

แบบนี้ไม่อนุญาตการ machining แบบ unattended CNC operator และวิศวกรผู้รับผิดชอบยังคงมีอำนาจตัดสินใจเรื่อง machine setup, สภาพ tool, workholding, vacuum/clamping, zero points, spoilboard, การตีความ simulation, dry run และ emergency procedures คู่มือผู้ผลิตและ configuration จริงของเครื่องมีอำนาจเหนือคู่มือนี้เสมอ
