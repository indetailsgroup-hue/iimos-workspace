# บริบท MONOLITH Repository

## วัตถุประสงค์

Repository นี้เป็นฐานที่มี governance สำหรับ MONOLITH ซึ่งเป็นแพลตฟอร์ม multi-tenant ที่ให้บริการแบรนด์ครัว สตูดิโอ ตัวแทน นักออกแบบ โรงงาน ช่างติดตั้ง ลูกค้า และลูกค้าของลูกค้า Daph เป็น pilot tenant หนึ่งรายและไม่ได้เป็นเจ้าของ governance หรือข้อมูล canonical กลางของแพลตฟอร์ม

## โครงสร้าง Repository — ต้องตรวจก่อนประเมินระบบ

- โฟลเดอร์นี้เป็น **governance/bootstrap root**
- source ของผลิตภัณฑ์ MONOLITH ที่ใช้งานพัฒนาอยู่ใน **determined-williams/** ซึ่งเป็น nested Git repository แยกสำหรับ **monolith-workspace**
- การตรวจ current state, maturity, gap, test, migration, runtime หรือ roadmap ทุกครั้งต้องตรวจ Git root ทั้งสอง และระบุว่าแต่ละข้อสรุปอ้างถึง root ใด
- ห้ามสรุปว่า MONOLITH ไม่มี runtime หรือ domain implementation จากโฟลเดอร์ **apps/** หรือ **packages/** ของ parent เพียงอย่างเดียว
- ต้องรักษา dirty worktree ของ nested repository และตรวจ Git status แยกทั้งสอง root ก่อนแก้ไฟล์ รัน test commit หรือ cleanup
- อ่าน [ภาคผนวกแก้ไขขอบเขต repository วันที่ 21 กรกฎาคม 2026](docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.th.md) ก่อนใช้ส่วน current state ของ MONOLITH ในรายงาน IMA Schelling

## สถานะอำนาจปัจจุบัน

- สถานะ parent root: governed bootstrap ข้อความนี้ไม่ได้อธิบาย nested product runtime
- สถานะ nested product: มี source ของ runtime, database, workflow, manufacturing และ test จำนวนมาก แต่การมี source ยังไม่พิสูจน์ deployment หรือ production readiness ต้องตรวจ branch, dirty state, test, release mode, security และ operational evidence ปัจจุบัน
- Governance records: เป็น Proposed จนกว่า evidence และ ratification gates จะผ่าน
- Runtime claims จาก parent root นี้: ไม่มี Contracts, schemas และ reference engines ที่นี่ไม่ได้พิสูจน์ isolation ที่ deploy แล้ว ความปลอดภัยการผลิต หรือ field use
- Canonical shared knowledge: แก้ไขผ่าน MONOLITH governance เท่านั้น
- Tenant policy: ADR-001 บันทึก Bridge model เป้าหมาย ส่วน schema และ runtime ใน nested product ต้องตรวจ conformance แยกก่อนกล่าวอ้างว่าเป็น multi-tenant

## หลักฐานต้นทาง

Kitchen encyclopedia และ reference implementation เดิมอยู่ใน `All aboute kitchen/` ส่วน governed bootstrap artifacts อยู่ใน `docs/`, `packages/`, `data/` และ `tests/` และ active product source อยู่ใน nested repository แยก `determined-williams/` การคัดลอก evidence ต้องเก็บ provenance ไว้เสมอ

## กติกาการทำงาน

1. แยก `VERIFIED FACT`, `OWNER DECISION`, `INFERENCE`, `PROPOSAL`, `UNKNOWN` และ `CONTRADICTED`
2. ห้ามยกระดับ unit test ที่ผ่านให้เป็น production-readiness claim
3. เก็บ supplier-native codes โดยไม่สูญข้อมูล และ mapping ต้องมี provenance/rights metadata
4. ถือ `MON-BS-001` เป็น internal interoperability profile ไม่ใช่มาตรฐาน ISO/EN
5. Deliverables ของโปรเจกต์ต้องมีอังกฤษและไทย พร้อม standalone HTML ที่ตรงกับ Markdown
