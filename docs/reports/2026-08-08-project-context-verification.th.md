# รายงานตรวจยืนยันแบบควบคุม — การปรับ ProjectContext Identity ให้สอดคล้องกัน

**วันที่รันหลักฐาน:** 9 สิงหาคม 2026 (Asia/Bangkok)<br>
**Base ที่ได้รับอนุญาต:** `3dc814f24343feee8ad131d62a43a2768fc8a0d9`<br>
**Source commit ที่ใช้ตรวจ:** `00a5a2015f1d579f4d779f0e8b0f38d60c27abf1`<br>
**Branch:** `codex/project-context-identity-reconciliation`<br>
**ผลลัพธ์:** `TASKS_1_TO_10_IMPLEMENTED — REVIEW_READY — DEPLOYMENT_NOT_AUTHORIZED`

## 1. ขอบเขตและ Authority Boundary

รายงานนี้ตรวจ implementation ของ ProjectContext identity reconciliation ใน isolated worktree ที่สร้างจาก base ที่ได้รับอนุญาตเท่านั้น ไม่ได้ให้อำนาจ deploy, apply migration ใน production, เข้าถึงข้อมูล production/staging หรือเปิด Repair Operations สถานะ Repair Operations ยังคงเป็น **G−0 = DISABLED** และ **G−1 = BLOCKED**

เป้าหมาย Pull Request จำกัดไว้ที่ `codex/repair-operations-phase-a-adr` ห้าม merge ตรงเข้า `main` หรือ `fix/dxf-truth-chain`

## 2. Provenance ของ Repository

| Root | Branch / HEAD ที่ตรวจพบ | สถานะขณะเก็บหลักฐาน |
|---|---|---|
| Governance/bootstrap root | `guardrails/claim-linters` / `aa1b30e509ece9d8efad3d68e949860aa79bdecf` | มี status entries เดิม 538 รายการ; งานนี้ไม่ได้แก้ |
| Primary product root | `fix/dxf-truth-chain` / `3dc814f24343feee8ad131d62a43a2768fc8a0d9` | มี status entries เดิม 73 รายการ; ไม่ได้นำมารวมหรือแก้ |
| Isolated implementation worktree | `codex/project-context-identity-reconciliation` / `00a5a2015f1d579f4d779f0e8b0f38d60c27abf1` | ขณะเก็บหลักฐานยังไม่ได้ commit ไฟล์รายงาน Task 10; implementation commits แยกจาก dirty roots ทั้งสอง |

ไม่มีการนำการเปลี่ยนแปลงจาก lane `project-binding-v2` ที่ทำคู่ขนานเข้ามา

## 3. Contract ที่ Implement แล้ว

- ใช้ `installation_projects` เป็น binding anchor และไม่เพิ่ม `project_context_id`
- Server ออกและ resolve tuple ที่ตรงกันครบ Work Item / installation project / design project / binding version
- Atomic customer-job opening สร้าง canonical tuple พร้อม idempotency ที่ผูกกับ stable principal
- Bridge v2 lock และตรวจ full tuple ก่อนเปลี่ยน package/material ใดๆ
- Browser route, stores, Factory packet, validation, upload, Field Bridge และ Field App ใช้ design identity จาก server
- Scratch mode ยัง unbound และ cross-domain action fail closed
- Active row ถูกบังคับตอน commit ให้มี tuple ครบ; authenticated ถูกถอนสิทธิ์ Bridge v1 และ direct project creation

## 4. หลักฐาน Disposable Database

| รายการ | ค่าที่ตรวจยืนยัน |
|---|---|
| Environment variable | `MONOLITH_TEST_DB_CONTAINER=monolith-project-context-db-20260808` |
| Container ID | `c1c699a3b20e9ebecb7809f47dfa7c2ed827e0de23176192bd795ac815bf7bee` |
| Image | `public.ecr.aws/supabase/postgres:17.6.1.158` |
| Image digest | `sha256:99b1729aeb0bac314445024fc149fbd39306170b61dd50800ccf180327ab3459` |
| Docker | `29.1.2` |
| psql / PostgreSQL | `17.6` |
| Network mode | `none` |
| Mount | mount isolated worktree แบบ read-only ที่ `/workspace` |
| Database | `postgres`; installation-project rows `0`; unresolved active rows `0` |
| Import จาก production/staging | ไม่มี |

ค่า SHA-256 ของ migration:

- `0162_project_context_binding.sql` — `8c42c00173c11fa58a5f3216a5d58d6003707101adf206d4f0280f678a5918ee`
- `0163_project_context_reconciliation_and_open.sql` — `e5b1e06a99ce154a44c225207712bc374bf1f46b2a97aae831cae8654e905df2`
- `0164_project_context_bridge_v2.sql` — `70f709c9c0573811566d746193f28ea4b7c498603dc26ee1f1bdc6fe27ff31b6`
- `0165_project_context_enforcement.sql` — `a140be55de33295a3d7db049100a5c186abdad474a03e2ffd9197fc2a7ca0996`

รัน migration `0165` ซ้ำใน disposable DB ได้สำเร็จ Trigger สุดท้ายเป็น deferrable และ initially deferred สิทธิ์ legacy ของ authenticated เป็น false ขณะที่ atomic-open และ Bridge v2 ที่อนุมัติยังเป็น true

## 5. ผล Verification

| Gate | คำสั่ง / หลักฐาน | ผล |
|---|---|---|
| ProjectContext pgTAP | `supabase/tests/project_context_invariants.sql` | **79/79 PASS** |
| Workflow DB regression | `supabase/tests/workflow_db_invariants.sql` | **11/11 PASS** |
| Runtime legacy caller scan | Production/runtime paths โดยตัด tests และ historical migrations ออก | **0 callers** |
| Focused browser attack path | `npm.cmd run e2e -- e2e/project-context-cross-project-isolation.spec.ts --project=chromium` | **1/1 PASS** |
| Full Vitest | `npm.cmd run test:run -- --reporter=basic` | **290 files, 4,807/4,807 PASS** |
| TypeScript | `npm.cmd run typecheck:all` | **PASS** |
| Full Playwright | `npm.cmd run e2e` | **18 passed, 5 skipped, 0 unexpected failures** |
| Diff integrity | `git diff --check` / cached diff checks ทุก commit | **PASS** |

Browser test A/B หน่วง response ของ Project A แล้วเปลี่ยนไป B ยืนยันว่า late A แทน B ไม่ได้ ส่ง exact B tuple ได้หนึ่งครั้ง จากนั้นโจมตีด้วย Work Item ผสม, design ID ผสม และ binding version เก่า ทั้งสามกรณีถูกปฏิเสธ และ package/material counts ของ A กับ B ไม่เปลี่ยนจาก baseline เพราะรายการที่ถูกปฏิเสธ

## 6. ปัญหาที่พบระหว่าง Verification

1. Full Vitest รอบแรก resolve `yazl` ไม่ได้ Dependency และ lock entry ถูกต้องแล้วใน `server/package.json` และ `server/package-lock.json` แต่ isolated worktree ยังไม่มี `server/node_modules` จึงรัน `npm.cmd ci --prefix server --ignore-scripts` จาก lockfile โดยไม่แก้ tracked files แล้ว full suite รอบใหม่ผ่าน
2. Full Playwright พบ expected-failure marker แบบ self-clearing ของ test Select All / Deselect All เดิม ทั้งที่ test ผ่านแล้ว จึงลบ stale marker ตาม comment ของ test เอง โดยไม่เปลี่ยน product behavior
3. Audit ของ locked server dependencies รายงาน vulnerabilities 14 รายการ (moderate 8, high 5, critical 1) ไม่รัน automated audit fix เพราะอยู่นอกแผนและอาจสร้าง breaking change

## 7. ข้อจำกัดของหลักฐานและความเสี่ยงคงเหลือ

- pgTAP ทดสอบ schema/functions จริงใน disposable PostgreSQL ผ่าน `psql` ไม่ได้ใช้ production Supabase network endpoint
- Playwright ทดสอบ browser/provider/store/Bridge client path จริงกับ mock RPC responses ที่ deterministic ส่วน server-side mutation isolation พิสูจน์แยกด้วย pgTAP ไม่ใช่อ้าง mock เป็นหลักฐาน DB
- Playwright เดิมยังมี 5 cases ที่ skip และ checkbox case เดิม 1 รายการที่เป็น expected failure; ไม่มีรายการใดเป็น ProjectContext test
- ไม่มี independent second-person review ภายใน session นี้ Branch จึงเป็น **review-ready** ไม่ใช่ deployment-ready และยังต้องผ่าน PR review
- ไม่มี production/staging data, deployment credential, live migration หรือ cutover ถูกใช้หรือได้รับอนุญาต

## 8. คำตัดสิน

**อนุมัติสำหรับการเปิด Pull Request เพื่อ review เท่านั้น** Tasks 1–10 implement แล้วและ controlled technical verification gates ผ่าน ผลนี้ไม่ใช่อำนาจ production cutover และไม่เปลี่ยนสถานะ Repair Operations G−0/G−1
