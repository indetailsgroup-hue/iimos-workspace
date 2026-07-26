# ข้อกำหนดการออกแบบ Global Exact-SKU Cabinet Connector Living Registry

**วันที่:** 26 กรกฎาคม 2026  
**สถานะ:** แบบได้รับอนุมัติแล้ว; ยังไม่ได้รับอนุญาตให้ดำเนิน implementation  
**เจ้าของ:** MONOLITH Platform Owner, Component Master Governance, Manufacturing Engineering, Structural Qualification และ Procurement Data Stewardship  
**Tenant ที่ให้คำปรึกษา:** Daph เป็นเพียงบริษัทลูกค้า/pilot ที่ให้คำปรึกษาหนึ่งราย ไม่มีอำนาจเหนือ canonical platform  
**ฉบับคู่ภาษาอังกฤษ:** `2026-07-26-global-exact-sku-connector-living-registry-design.en.md`

## 1. มติ

MONOLITH จะสร้าง **Global Exact-SKU Cabinet Connector Living Registry** ด้วยสถาปัตยกรรม **Evidence Graph + Deterministic Qualification Engine**

Registry ต้อง:

- ค้นหาแบรนด์และผลิตภัณฑ์ connector ทั่วโลกอย่างต่อเนื่อง;
- รักษา exact commercial identity ของสินค้าที่สั่งซื้อได้ทุกรายการที่ค้นพบ;
- สร้าง Complete System BOM ซึ่งรวม connector body, mating hardware, cap, jig, cutter, drill bit, machine adapter และ service part;
- รับค่าความกว้าง ความลึก และความสูงของตู้ได้อย่างอิสระ;
- qualify joint โดยผูกกับวัสดุ ความหนา load, geometry, tooling และหลักฐานของ configuration นั้น;
- ประกาศ coverage อย่างโปร่งใสแทนการอ้างแบบไม่มี denominator ว่าตลาดโลกครบแล้ว;
- fail closed เมื่อหลักฐานด้าน identity, compatibility, manufacturing หรือ structural ไม่พอ;
- แยก canonical product facts ออกจาก commercial overlay ของ tenant

Release แรกคือ **registry specification, ingestion system และ verified first cohort** ไม่ใช่ market spreadsheet แบบครั้งเดียว และไม่ใช่ production platform เต็มรูปแบบทันที

## 2. เหตุผลที่ต้องใช้แบบนี้

Executive research เดิมให้ coverage ระดับ connector family ที่มีประโยชน์ แต่ระบุชัดว่าตารางตลาดเป็น family/model ledger ไม่ใช่ all-SKU census ข้อกำหนดที่ได้รับอนุมัติในรอบนี้ลึกกว่าอย่างมีนัยสำคัญ:

> ทุกแบรนด์ทั่วโลกในรูป Living Registry; ทุกรุ่นและ exact product code; ทุกชิ้นส่วนและเครื่องมือที่เข้ากัน; ตู้ทุกความกว้าง ความลึก และความสูง; วัสดุตู้ทุกชนิดและความหนาจริงทุกค่า; พร้อม qualification evidence ระดับ configuration

Static list ไม่ตอบโจทย์เพราะ:

- global product catalog เปลี่ยนตลอดเวลา;
- order code, finish, pack และ availability ต่างกันตามภูมิภาค;
- geometry เดียวกันอาจมีหลาย commercial identity;
- product-family page ของ OEM ไม่ได้พิสูจน์ orderable SKU ทุกตัว;
- ความเหมาะสมของ connector ขึ้นกับ mating panel ทั้งสองด้าน ไม่ใช่ nominal thickness ค่าเดียว;
- ความสูงของตู้เพียงอย่างเดียวไม่ได้กำหนด joint demand;
- strength evidence ผูกกับ configuration;
- สิทธิ์ของ OEM อาจอนุญาตให้ทำ factual index แต่ห้ามเผยแพร่ drawing หรือ CAD;
- สินค้า discontinued และ superseded ต้องยังทำซ้ำได้เพื่อการซ่อมและงานเก่า

แบบนี้จึงวัดความครบถ้วนผ่าน coverage contract ที่ระบุ source, catalog edition, region, product family และวันที่อย่างชัดเจน

## 3. ขอบเขตที่อนุมัติ

### 3.1 ขอบเขตแบรนด์ทั่วโลก

Registry เป็น global living registry แบบปลายเปิด รองรับ:

- OEM brand ที่ active;
- regional brand;
- contract-manufactured และ white-label product;
- แบรนด์ที่ถูกซื้อ ควบรวม เปลี่ยนชื่อ หรือหยุดดำเนินการ;
- order code เฉพาะภูมิภาค;
- discontinued product ที่ต้องใช้ซ่อมหรือทำโครงการเก่าซ้ำ;
- แบรนด์ที่เพิ่งค้นพบและยังประเมิน relevance ไม่เสร็จ

“ทุกแบรนด์” หมายถึงทุกแบรนด์ที่กระบวนการค้นพบอย่างมี governance พบจะต้องมีสถานะและวันที่ทบทวน ไม่ได้หมายความว่าตลาดเป็นชุดปิดหรือเสร็จสมบูรณ์ถาวร

### 3.2 Complete System BOM

Coverage รวม:

- connector body หรือ housing;
- bolt, dowel, pin, anchor, sleeve และ insert;
- screw และ fastener;
- cap, cover และ trim;
- adhesive หรือ activation material เมื่อจำเป็น;
- jig, template และ gauge;
- drill bit, boring tool, router cutter และ profiled cutter;
- spindle, collet, tool holder หรือ machine adapter ที่ผูกกับผลิตภัณฑ์;
- insertion, press, torque หรือ activation tool;
- spare และ replacement part;
- consumable ที่จำเป็น;
- compatible machine process และ setup

ทุก relationship ต้องมี type, direction, cardinality, condition, evidence และ lifecycle

### 3.3 วัสดุตู้ทุกชนิด

Material model ครอบคลุม:

- solid wood;
- particleboard;
- MDF และ HDF;
- plywood;
- blockboard;
- OSB;
- lightweight และ honeycomb panel;
- compact laminate;
- bamboo panel;
- wood-plastic composite;
- aluminium และ steel frame;
- thin front และ surface system บางประเภทที่เกี่ยวข้องกับ connector;
- substrate class ในอนาคตโดยไม่ต้องเปลี่ยน schema หลัก

Qualification แยก core, grade, density, moisture, orientation, coating, nominal thickness, measured thickness และ thickness tolerance

### 3.4 ขอบเขตตู้แบบ parametric

Engine รับค่า W × D × H ใด ๆ ภายใต้ numeric precision ที่ governance กำหนด ครอบคลุมตู้มาตรฐานและ custom:

- base cabinet;
- wall cabinet;
- tall cabinet;
- wardrobe และ closet;
- vanity;
- shelving และ storage unit;
- island และ peninsula;
- freestanding, built-in, wall-mounted และ mobile unit;
- modular และ transport-separated assembly

การรับ input ไม่ได้แปลว่าจะอนุมัติ configuration นั้น กรณีที่หลักฐานไม่รองรับต้องได้ผล refusal หรือ insufficient evidence

## 4. สิ่งที่ไม่อยู่ในเป้าหมาย

First cohort จะไม่:

- อ้างว่าพบทุกแบรนด์หรือ SKU ทั่วโลกแล้ว;
- อนุมาน product code จากชื่อ family;
- ใช้ marketplace listing เป็น primary geometry evidence;
- อนุมาน structural performance จาก product test เพียงอย่างเดียว;
- extrapolate ความหนาหรือวัสดุที่ทดสอบโดยไม่มีกฎอนุมัติ;
- ถือ distributor code เป็น OEM code;
- เผยแพร่ OEM drawing, CAD, photograph หรือข้อความ catalog โดยไม่มีสิทธิ์;
- ทำ preference ของ Daph ให้เป็น canonical;
- อนุญาต production จาก AI-extracted data โดยไม่มี human review;
- ใช้ software test แทน physical test;
- รวมประวัติสินค้าเก่าหรือ discontinued เข้ากับ replacement ปัจจุบัน

## 5. อำนาจและขอบเขต repository

Governance/bootstrap root เป็นเจ้าของ:

- ontology;
- evidence policy;
- canonical identity rules;
- registry releases;
- qualification governance;
- coverage reporting;
- tenant-overlay policy

Nested active MONOLITH product ใช้ pinned, versioned registry release และ map เข้า runtime connector operations เท่านั้น ห้ามรักษา product truth อีกชุดที่แข่งขันกับ canonical registry

Daph และ tenant ในอนาคตเป็นเจ้าของ overlay เช่น:

- preferred supplier;
- contract price;
- local stock;
- approved substitution;
- lead time;
- procurement restriction เฉพาะ tenant

Tenant สามารถเสนอ evidence และ mapping แต่ไม่มีสิทธิ์แก้ global identity, OEM geometry, qualification evidence หรือ canonical lifecycle

## 6. Hybrid architecture

### 6.1 OEM Evidence Vault

Vault เก็บ immutable source snapshot และ metadata:

- source URL และ publisher;
- document title, edition และ publication date;
- ประเทศ ตลาด และภาษา;
- access timestamp;
- content hash;
- MIME type;
- extraction permission;
- redistribution และ asset-rights constraints;
- ความสัมพันธ์กับ source ที่มาแทน;
- reviewer notes

Vault รักษาหลักฐาน แต่ไม่ได้ทำให้ claim ที่ extract มาเป็น canonical โดยอัตโนมัติ

### 6.2 Vendor ingestion adapters

Adapter ราย vendor แปลง vendor-native structure เป็น candidate record โดยอาจ parse:

- OEM web catalog;
- PDF catalog และ datasheet;
- installation manual;
- CAD metadata;
- product API หรือ feed;
- availability source จาก authorized distributor

สิทธิ์ของ Adapter จำกัดอยู่ที่การสร้าง `PENDING_CANDIDATE`; การ publish `VERIFIED` fact ต้องผ่าน human review และ release governance

### 6.3 Canonical Exact-SKU Registry

Canonical registry resolve:

- manufacturer และ brand;
- family, series และ model;
- OEM order code;
- GTIN, EAN, UPC หรือ public identifier อื่น;
- region และ commercial offer;
- finish, colour, material, handedness และ pack;
- revision และ lifecycle;
- equivalence โดยไม่ทำลาย identity

หนึ่ง orderable commercial identity เท่ากับหนึ่ง record ส่วน geometry ที่ใช้ร่วมกันให้เชื่อม ไม่ใช่ merge

### 6.4 Complete System BOM และ Compatibility Graph

Typed graph edges ประกอบด้วย:

- `REQUIRES`;
- `OPTIONALLY_USES`;
- `COMPATIBLE_WITH`;
- `INCOMPATIBLE_WITH`;
- `REPLACES`;
- `SUPERSEDES`;
- `REGION_VARIANT_OF`;
- `GEOMETRY_VARIANT_OF`;
- `TOOLED_BY`;
- `MACHINED_BY`;
- `INSTALLED_WITH`;
- `QUALIFIED_WITH`;
- `REQUIRES_MATERIAL_CONDITION`

แต่ละ edge มี quantity, panel role, region, version, conditional expression, evidence reference และ validity interval

### 6.5 Deterministic Qualification Engine

Engine อ่าน:

- cabinet configuration;
- material instances;
- exact SKU และ Complete BOM candidates;
- geometry และ machining constraints;
- structural qualification envelopes;
- available machine และ tool capabilities;
- region และ lifecycle state;
- governing release policy

และสร้าง deterministic verdict, trace และ manufacturing proposal

### 6.6 Coverage และ Release Ledger

Ledger ประกาศ:

- discovered brand denominator;
- expected family/model/SKU denominator ตาม source edition;
- classified record counts;
- evidence completeness;
- source freshness;
- blocked sources;
- unresolved conflicts;
- qualification gaps;
- release version และ hash

## 7. Canonical data model

### 7.1 Brand universe

ฟิลด์บังคับ:

- global brand ID;
- legal manufacturer;
- trading brand;
- parent company;
- origin และ operating regions;
- official domains;
- trademarks และ aliases;
- OEM, white-label, acquisition และ rebrand relationships;
- discovery source และวันที่;
- last reviewed date;
- relevance state

สถานะที่อนุญาต:

- `DISCOVERED`;
- `RELEVANCE_PENDING`;
- `CONNECTOR_OEM_CONFIRMED`;
- `NO_RELEVANT_PRODUCTS_FOUND`;
- `SOURCE_ACCESS_BLOCKED`;
- `DORMANT_OR_DEFUNCT`;
- `ACQUIRED_OR_REBRANDED`

### 7.2 Product และ exact commercial identity

Identity dimensions ที่บังคับ:

- manufacturer;
- brand;
- family;
- series;
- model;
- OEM order code;
- public barcode identifier เมื่อมี;
- commercial region;
- finish และ colour;
- product material;
- handedness หรือ orientation;
- pack quantity;
- unit of measure;
- revision;
- lifecycle state และวันที่

OEM order code คนละรหัสเป็นคนละ commercial record แม้ geometry เหมือนกัน Pack, finish หรือ region variant ต้องแยกเมื่อรหัสสั่งซื้อเปลี่ยน

### 7.3 Connector geometry

Geometry record ประกอบด้วย:

- connector class และ joint semantics;
- body envelope;
- bore, slot, profile และ pocket geometry;
- coordinate datum;
- drilling/routing direction;
- edge และ end distances;
- minimum ligament;
- tolerances;
- assembly vector;
- tool-access volume;
- visible และ concealed state;
- disassembly และ retightening attributes

### 7.4 Material instance

Material record แยก:

- substrate class;
- exact material product เมื่อทราบ;
- grade และ governing standard;
- core construction;
- density และ tolerance;
- moisture และ conditioning;
- grain หรือ layer orientation;
- nominal thickness;
- measured thickness;
- thickness tolerance;
- coating, laminate หรือ facing layers;
- edge treatment

Panel A และ Panel B ต้องมี material instance แยกจากกันเสมอ

### 7.5 Tool และ machine capability

Capability record ประกอบด้วย:

- process class;
- machine identity หรือ capability class;
- spindle และ axis limits;
- drill/cutter identity;
- diameter และ cutting geometry;
- collet/tool-holder/adapter;
- feed, speed และ depth rule เมื่อมีหลักฐาน;
- insertion, press หรือ torque requirement;
- jig และ datum method;
- achievable tolerance;
- tool reach และ access;
- inspection method

### 7.6 Evidence record

Verified field ทุกค่าต้องชี้ไป evidence ซึ่งมี:

- publisher และ source identity;
- document/page/figure/table locator;
- region และภาษา;
- publication และ access date;
- content hash;
- extracted field;
- extraction method;
- reviewer และ review date;
- confidence;
- rights state;
- contradiction และ supersession links

## 8. Verification dimensions ที่แยกจากกัน

ห้ามใช้ `Verified` flag เดียวครอบทุกมิติ แต่ละ SKU ต้องมีสถานะแยกสำหรับ:

- identity verification;
- geometry verification;
- BOM compatibility verification;
- tooling และ manufacturing verification;
- material/thickness applicability;
- structural configuration qualification;
- commercial orderability;
- field installation validation;
- lifecycle freshness;
- rights review

ดังนั้น SKU อาจ identity-verified แต่ยัง structurally unqualified หรือ geometry-verified แต่ commercially unorderable ได้

## 9. Thickness model

Engine รับ measured thickness ทุกค่าที่แสดงได้ภายใต้ precision policy หลักฐานแบ่งเป็น:

- exact OEM-declared points;
- exact OEM-declared ranges;
- tested configuration points;
- statistically qualified ranges;
- approved interpolation rules;
- prohibited extrapolation zones;
- unknown zones

กฎ:

- ประเมินความหนา Panel A และ Panel B แยกกัน;
- ห้ามรวม core thickness และ facing thickness โดยเงียบ;
- nominal thickness ไม่แทน measured thickness เมื่อ tolerance มีผล;
- ผ่านที่ 15 มม. และ 18 มม. ไม่ได้แปลว่า 16 มม. ผ่านอัตโนมัติ;
- density, moisture และ orientation constraint ต้องเดินทางไปกับ thickness envelope;
- จุดที่ไม่รองรับต้องคืน `INSUFFICIENT_EVIDENCE` หรือ `UNQUALIFIED`;
- ห้าม nearest-neighbour connector substitution สำหรับ release

## 10. Parametric Qualification Envelope

### 10.1 Inputs

Engine รับ:

- W × D × H ภายนอกและภายใน;
- geometry ของ panel และ joint ทุกตัว;
- cabinet topology;
- shelf, divider, rail, stretcher, back และ plinth;
- exact material instances;
- dead, live, point, eccentric, racking และ dynamic loads;
- มวลและ eccentricity ของบาน/ลิ้นชัก;
- wall/floor/mobile condition;
- wall substrate และ anchors;
- environment และ corrosion conditions;
- service และ repeated-assembly requirement;
- factory machines และ tools;
- installation access และ sequence;
- region และ compliance policy

### 10.2 Decision pipeline

1. Normalize unit, precision และ tolerance
2. สร้าง cabinet joint graph
3. Filter ตาม lifecycle, region และ orderability
4. Filter ตาม material/thickness ของ Panel A และ Panel B
5. Resolve Complete System BOM
6. Validate geometry, edge distance และ collision
7. Validate tool access, machine capability และ assembly sequence
8. Match exact structural qualification evidence
9. คำนวณ connector count, spacing และตำแหน่งจาก qualified rules
10. ประเมิน racking, overturning, wall attachment และ anti-tip requirements
11. Emit verdict, trace, BOM, machining proposal และ inspection plan

### 10.3 พฤติกรรมสำหรับตู้สูงและตู้ขนาดใหญ่

Engine ไม่ใช้ความสูงเป็น proxy เพียงค่าเดียว แต่ประเมิน:

- unsupported span;
- joint-line length;
- panel slenderness และ bow risk;
- door/drawer eccentricity;
- center of gravity และ overturning;
- back-panel contribution;
- fixed shelf และ divider contribution;
- rail และ stretcher contribution;
- wall-anchor capacity และ position;
- transport และ handling;
- module splitting;
- installation access

หากเพิ่มจำนวน connector อย่างเดียวไม่พอ Engine ต้องกำหนด reinforcement, fixed structure, anchoring, module division หรือ refusal

### 10.4 Verdicts

- `QUALIFIED`;
- `CONDITIONALLY_QUALIFIED`;
- `UNQUALIFIED`;
- `INSUFFICIENT_EVIDENCE`;
- `DISCONTINUED_OR_UNORDERABLE`

ทุก verdict มี reason codes และ evidence references

### 10.5 Mandatory refusal gates

ต้อง refuse release เมื่อ:

- exact identity ยัง resolve ไม่ได้;
- required mating part ยัง resolve ไม่ได้;
- material หรือ thickness อยู่นอก qualified envelope;
- ต้องใช้ extrapolation ที่ไม่ได้อนุมัติ;
- BOM compatibility ไม่ครบ;
- geometry ชนหรือผิด governed distance;
- ไม่มี machine หรือ tool capability ที่จำเป็น;
- assembly access เป็นไปไม่ได้;
- wall substrate หรือ anchor evidence ไม่ครบในกรณีที่จำเป็น;
- lifecycle replacement ยังไม่ qualified;
- evidence chain ไม่ครบ;
- ไม่สามารถทำผลซ้ำจาก pinned registry version

## 11. Ingestion และ publication workflow

1. ค้นพบ brand หรือ source ใหม่
2. ลงทะเบียน brand และ source denominator
3. Snapshot source เข้า Evidence Vault
4. Hash และ classify source
5. Extract candidate product, SKU, geometry และ BOM
6. Validate schema และ units
7. Resolve identity, duplicate, regional variant และ rebrand
8. Validate compatibility edges
9. Review field-level citations
10. แยก geometry review ออกจาก structural review
11. Review rights
12. Publish signed/versioned registry release

AI extraction ไม่มีสิทธิ์เลื่อน output ของตนเกิน pending candidate state

## 12. Change monitoring และ lifecycle

ระบบติดตาม:

- OEM catalog indexes;
- source content hashes;
- document editions;
- order code ใหม่และที่หายไป;
- geometry changes;
- installation-instruction changes;
- regional offer changes;
- discontinuation และ replacement notices;
- authorized-distributor orderability

Commercial freshness ต้องประเมินแยกจาก geometry freshness

Historical record ใช้ tombstone หรือ supersede ห้าม replace แบบทำลายประวัติ Released project ต้อง pin registry version เพื่อให้ BOM และ machining plan ทำซ้ำได้

## 13. Conflict และ error handling

Candidate ต้องเข้า quarantine เมื่อ:

- หน่วยกำกวม;
- inch และ metric ขัดกัน;
- เอกสาร OEM ขัดกัน;
- PDF และ CAD geometry ขัดกัน;
- regional order code ชนกัน;
- distributor และ OEM identity ขัดกัน;
- required mating part ไม่อยู่ใน candidate graph;
- pack หรือ finish identity กำกวม;
- source rights ไม่ชัด;
- installation instruction รุ่นใหม่เปลี่ยน constraint ที่ release ไปแล้ว

Quarantine ป้องกัน manufacturing release และบันทึก owner, reason, evidence, opened date และ resolution

## 14. Coverage contract

รายงาน coverage ตาม:

- brand;
- legal manufacturer;
- region;
- catalog edition;
- product family;
- model;
- exact SKU;
- evidence dimension;
- lifecycle;
- review date

Release อาจระบุ:

> Classified 1,284 จาก 1,331 expected orderable SKUs ครอบคลุม 42 confirmed OEMs และ 18 regions ตาม source editions ที่ระบุ ณ วัน release

แต่ห้ามระบุว่า “global products ครบทั้งหมด” โดยไม่มี denominator

ทุกรายการที่ค้นพบต้องได้หนึ่งสถานะ:

- `VERIFIED`;
- `PENDING`;
- `REGION_ONLY`;
- `SUPERSEDED`;
- `DISCONTINUED`;
- `OUT_OF_SCOPE_WITH_REASON`;
- `SOURCE_BLOCKED`

## 15. Verified first cohort

First cohort ที่เสนอ:

1. Häfele
2. Hettich
3. Titus
4. Lamello
5. Italiana Ferramenta
6. OVVO
7. Lockdowel
8. Välinge Innovation / Threespine
9. KNAPP
10. Festool DOMINO
11. Hoffmann Machine Company
12. Blum โดยจำกัดตาม connector role จริง ไม่เหมารวมเป็น carcass connector supplier

Denominator แรกครอบคลุม:

- OEM global/EU sources;
- United States regional sources;
- Thailand/ASEAN orderability;
- region อื่นที่พบว่ามี geometry หรือ order code ต่างกันระหว่าง source review

Minifix, Target J10, Rastex intent และ dowel seed ที่มีใน MONOLITH ต้อง reconcile กับ cohort นี้ Implementation เดิมไม่ได้มีอำนาจเหนือ primary evidence ที่ใหม่กว่าโดยอัตโนมัติ

## 16. Validation strategy

### 16.1 Data และ graph validation

- schema และ unit validation;
- required-field validation;
- duplicate identity detection;
- regional-code collision detection;
- dangling BOM edge detection;
- incompatible-edge contradiction detection;
- lifecycle graph validation;
- field-level citation enforcement;
- rights-state enforcement

### 16.2 Qualification-engine validation

- boundary tests ที่ทุก min/max constraint;
- property tests ครอบคลุม W × D × H และ unit conversions;
- golden configurations สำหรับ base, wall, tall, wardrobe และ custom cabinets;
- collision และ edge-distance cases;
- machine-capability negative cases;
- absent-tool และ absent-mating-part negative cases;
- lifecycle และ region negative cases;
- deterministic replay จาก pinned releases;
- mutation tests ที่พิสูจน์ว่า refusal gates fail closed

### 16.3 Tenant-boundary validation

- Daph overlay เปลี่ยน canonical facts ไม่ได้;
- tenant price และ stock อยู่เฉพาะ tenant;
- tenant substitution ต้องผ่าน governed approval;
- การลบ tenant overlay ไม่ลบ canonical หรือ historical registry evidence

### 16.4 Physical qualification

Physical matrix ครอบคลุมตามกรณี:

- static strength;
- cyclic durability;
- racking;
- pull-out และ withdrawal;
- repeated assembly;
- transport และ impact;
- environmental conditioning;
- misuse และ repair;
- wall suspension และ anti-tip

แต่ละผลบันทึก specimen material, actual thickness, density, moisture, connector lot, machining tolerance, torque หรือ insertion state, sample size, statistical treatment และ failure mode

Software test ไม่สามารถแทน physical result เหล่านี้

## 17. เกณฑ์รับมอบ First Cohort

First cohort ผ่านเมื่อ:

- ประกาศ named source denominator ของทั้ง 12 แบรนด์;
- classify connector-relevant family, model และ SKU ที่ค้นพบทุกตัว;
- identity-verified SKU ทุกตัวมี primary OEM evidence;
- verified field ทุกค่ามี field-level source locator;
- released BOM ไม่มี required part ที่หายหรือ dangling;
- แยก geometry state และ structural qualification state;
- qualification ไม่ใช้ extrapolation ที่ไม่ได้อนุมัติ;
- unsupported configuration ถูก refuse อย่าง deterministic;
- มองเห็น source freshness และ blocked-source gaps;
- registry release ทำซ้ำได้และอ้างด้วย hash;
- parent canonical identity และ nested runtime mapping ไม่ขัดกัน;
- production release ยังคงถูก block จนผ่าน evidence gates ที่ใช้บังคับทั้งหมด

## 18. First-cohort deliverables

Project-facing output ต้องมีฉบับไทยและอังกฤษที่เนื้อหาสอดคล้องกัน พร้อม standalone HTML

Machine-readable output แยก logical dataset สำหรับ:

- brands;
- sources;
- product families;
- models;
- exact SKUs;
- regional commercial offers;
- BOM edges;
- compatibility edges;
- geometries;
- material instances;
- tools และ machines;
- qualification envelopes;
- evidence records;
- lifecycle events;
- coverage snapshots

Exact filename และ migration sequence เป็นเรื่องของ implementation plan ไม่ใช่ design ฉบับนี้

## 19. Operational ownership

บทบาทที่ต้องมี:

- Brand Discovery Steward;
- OEM Evidence Curator;
- Identity and SKU Reviewer;
- Manufacturing Geometry Reviewer;
- Structural Qualification Authority;
- Tooling and Machine Capability Owner;
- Rights and Licensing Reviewer;
- Procurement Data Steward;
- Registry Release Manager;
- Tenant Overlay Approver

ห้ามบทบาทเดียว self-approve ทุกขั้นของ safety-relevant record

## 20. ตัวชี้วัดความสำเร็จ

Program วัด:

- classified SKUs หาร expected SKUs ต่อ declared denominator;
- สัดส่วน verified fields ที่มี field-level primary evidence;
- สัดส่วน released BOMs ที่มี compatible parts ครบ;
- สัดส่วน qualified configurations ที่มี exact test evidence;
- stale source rate;
- unresolved conflict age;
- source-blocked coverage;
- deterministic replay rate;
- refusal-gate escape count;
- field defect และ repair outcomes ต่อ exact configuration;
- เวลาที่ใช้รับ OEM catalog change;
- tenant-overlay isolation failures

ผลลัพธ์ต่อผู้ใช้ต้องมาจากความเชื่อมั่นและคุณค่าที่ทำซ้ำได้ ไม่ใช่การผูกมัดด้วย lock-in

## 21. การเปลี่ยนผ่านสู่ implementation

หลังผู้ใช้ทบทวนและอนุมัติ written specification นี้ ขั้นต่อไปคือ implementation plan แยกต่างหาก ซึ่งต้อง:

- reconcile parent และ nested connector records ที่มีอยู่ก่อนเพิ่ม authority ใหม่;
- แบ่ง first cohort เป็น ingestion waves ที่มีขอบเขต;
- รักษาการเปลี่ยนแปลงเดิมทั้งหมดใน dirty worktree;
- กำหนด migration, schema, test และ release gates;
- เปิด NOT-FOR-PRODUCTION controls ต่อจนผ่าน evidence gates;
- ไม่อ้าง global completeness ใน intermediate release ใด

## 22. บันทึกการอนุมัติ

ผู้ใช้อนุมัติ:

- Global Living Registry;
- Complete System BOM;
- Parametric Qualification Envelope;
- วัสดุตู้ทุกชนิด;
- primary-source evidence hierarchy;
- registry specification + ingestion system + verified first cohort;
- Evidence Graph + Deterministic Qualification architecture แบบ hybrid;
- architecture และ authority model;
- exact-SKU master schema และ thickness rules;
- qualification engine และ refusal gates;
- ingestion, lifecycle และ transparent coverage design;
- first cohort, validation และ acceptance criteria
