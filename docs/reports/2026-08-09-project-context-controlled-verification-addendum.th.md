# ภาคผนวกการตรวจสอบแบบควบคุม ProjectContext

**รอบหลักฐาน:** 9 สิงหาคม 2026 เวลา 09:37 น. ICT<br>
**PR:** [#37](https://github.com/indetailsgroup-hue/monolith-workspace/pull/37)<br>
**Functional SHA ที่ตรวจแล้ว:** `4d4fa01de4c24815f5fcf47141243f98cc63b1bd`<br>
**SHA ของรายงานประวัติศาสตร์:** `00a5a2015f1d579f4d779f0e8b0f38d60c27abf1` — เก็บไว้เป็นหลักฐานประวัติศาสตร์เท่านั้น ไม่ใช่หลักฐานของ merge candidate สุดท้าย<br>
**คำตัดสิน:** `บันทึกการปิดเชิงเทคนิคแล้ว — ยังไม่อนุญาตให้ MERGE`

## 1. เหตุผลที่ต้องมีภาคผนวกนี้

Owner ยกเลิกมติก่อนหน้าเพราะการยอมรับ closure ที่ต้องทำไม่สามารถเปลี่ยน code ที่ยังไม่ commit ให้เป็น verified fact ได้ ภาคผนวกนี้บันทึกรอบหลักฐานใหม่หลัง fix ปรากฏจริงใน PR #37 และไม่เขียนทับรายงานเดิม

## 2. Fix commits ที่อยู่ใน PR จริงแล้ว

- `7f8a8c48` — ล้าง `useDrillMapStore` และ `useGateStore` เมื่อ clear runtime project พร้อม regression A→B ที่พิสูจน์ว่า project B ไม่ได้รับ drill map หรือ gate result ของ project A
- `7f8a8c48` — ยอมรับ lifecycle ของ ProjectContext เฉพาะ `active` ใน parser, Factory guard และ SQL resolver พร้อม test ปฏิเสธ/no-mutation สำหรับ `completed` และ `customer_review`
- `4d4fa01d` — เพิ่ม required CI job ชื่อ **ProjectContext PR Gate**

## 3. ผล controlled verification

| Gate | คำสั่ง/ขอบเขต | ผล |
|---|---|---|
| Workflow DB regression | `supabase/tests/workflow_db_invariants.sql` | **ผ่าน — 11/11** |
| ProjectContext pgTAP | `supabase/tests/project_context_invariants.sql` | **ผ่าน — 83/83** |
| Focused Vitest | ProjectContext Gate/State/identifiers, Bridge, Factory/Field App | **ผ่าน — 27/27** |
| State contamination | regression drill-map และ gate-result แบบ A→B | **ผ่าน** |
| Active-only lifecycle | parser, Factory guard, SQL resolver; `completed` และ `customer_review` | **ผ่าน** |
| Browser simulation | `e2e/project-context-cross-project-isolation.spec.ts` | **ผ่าน — 1/1** |
| Full Vitest | test suite ทั้งหมดของ root | **ผ่าน — 4,812/4,812; ล้มเหลว 0; pending 0** |
| Typecheck | `npm run typecheck:all` | **ผ่าน** |
| Git hygiene | `git diff --check`, `git diff --exit-code` หลังคืน test-touched metadata | **ผ่าน — clean** |

ผล browser เป็น client simulation ร่วมกับการตรวจฐานข้อมูลแยกต่างหาก ไม่ได้อ้างเกินจริงว่าเป็น browser-to-database end-to-end test เต็มรูปแบบ

## 4. สภาพแวดล้อมทดสอบ

- Node `v22.21.1`; npm `11.6.2`
- Docker client/server `29.1.2`
- psql `18.1`
- Disposable database container: `supabase_db_determined-williams` (`2e94240cb7c4`), image `public.ecr.aws/supabase/postgres:17.6.1.158`
- Reset ฐานข้อมูลจาก migration chain ปัจจุบัน ไม่มีการ import หรือเข้าถึงข้อมูล production/staging

## 5. หลักฐานการบังคับใช้บน GitHub

ทุก check บน SHA `4d4fa01d` ผ่านแล้ว:

- [ProjectContext PR Gate](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/31290541465/job/93186789878) — ผ่าน
- [apply migrations + pgTAP invariants](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/31290541417/job/93186789710) — ผ่าน
- [playwright @smoke](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/31290541413/job/93186789817) — ผ่าน

Branch protection ของ `codex/repair-operations-phase-a-adr` บังคับ:

- status check `ProjectContext PR Gate`;
- approving review 1 คน;
- ยกเลิก approval เก่าเมื่อมี commit ใหม่;
- ต้อง approval หลัง push ครั้งสุดท้าย; และ
- บังคับใช้กับ administrator ด้วย

## 6. การติดตามช่องโหว่

[Issue #38](https://github.com/indetailsgroup-hue/monolith-workspace/issues/38) บันทึกแพ็กเกจที่มีช่องโหว่ 14 รายการ, advisory/CVE ไม่ซ้ำ 18 รายการ, dependency path, การจัดประเภท production/development, runtime reachability, mitigation ชั่วคราว, owner, due date และ closure evidence ครบ ข้อ critical ของ Vitest ไม่ reachable จาก API/worker production entrypoints ปัจจุบัน แต่ยังต้อง upgrade และทดสอบตามกำหนด

## 7. Merge gate ที่ยังเหลือ

Commit เผยแพร่ภาคผนวกเป็น documentation-only descendant ของ functional SHA ที่ตรวจแล้ว เนื่องจากเป็น PR commit ที่ใหม่กว่า required CI ต้องผ่านซ้ำบน published HEAD ก่อน จึงจะเปลี่ยน PR เป็น Ready และขอ independent human review ได้ ผู้อนุมัติต้องเป็นบุคคลอื่นที่ไม่ใช่ implementation session และ approval ต้องเกิดหลัง final push และ CI ผ่าน

จนกว่าจะมี approval ดังกล่าว สถานะที่ถูกต้องคือ:

`OWNER ยอมรับ CLOSURE ที่ต้องทำ — บันทึก TECHNICAL CLOSURE แล้ว — รอ INDEPENDENT HUMAN APPROVAL — ยังไม่อนุญาตให้ MERGE`

## 8. ขอบเขตอำนาจ

- PR target ยังคงเป็น `codex/repair-operations-phase-a-adr` เท่านั้น
- Repair Operations ยังคง **G−0 = DISABLED** และ **G−1 = BLOCKED**
- ภาคผนวกนี้ไม่ให้อำนาจ merge, deploy, เข้าถึง production/staging หรือทำ live migration
