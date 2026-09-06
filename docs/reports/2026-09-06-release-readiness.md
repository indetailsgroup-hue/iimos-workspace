# MONOLITH Release Readiness — 2026-09-06

สถานะเอกสาร: **Release candidate — ยังไม่อนุญาตให้ประกาศ release**

เอกสารนี้บันทึกงาน stabilization, หลักฐานที่รันได้ในเครื่อง, gate ที่ต้องยืนยันบน GitHub Actions และเงื่อนไขตัดสิน release ตามเกณฑ์เดียวกัน ห้ามตีความการมี source, migration หรือ test file ว่า production-ready จนกว่า external CI evidence จะผ่านจริง

## 1. เกณฑ์ตัดสิน

Release-ready เมื่อทุกข้อด้านล่างเป็นสีเขียวพร้อมกันเท่านั้น:

1. MONOLITH Full Verify ผ่านทุก blocking job
2. fresh-database migration ใช้งานได้จริง และ SQL pgTAP + TypeScript database suites รันกับ local Supabase จริง
3. backend deploy ทำงานเมื่อ secrets ครบ และแสดง successful skip ที่ชัดเจนเมื่อ secrets ไม่ครบ
4. Digital Shadow, Culture, Process Templates และ Homag tests ผ่าน
5. lint มี 0 errors และ warning count ไม่เกิน ratchet
6. production dependency audit มี 0 high / 0 critical
7. v17.5/v18.0 มี routing, navigation, authentication, active-tenant, role และ plan gates
8. PR เก่าที่ถูกแทนที่ได้รับการจัดการ และ security issues #49/#50 ปิดได้เฉพาะเมื่อมีฐานข้อมูลจริงยืนยัน
9. version, changelog, release notes, tag และ GitHub Release สอดคล้องกับ commit ที่ผ่าน gate

## 2. สถานะปัจจุบัน

| Gate | สถานะ | หลักฐาน/หมายเหตุ |
|---|---|---|
| Root Vitest | PASS (local) | 377 files, 7,671 tests, 0 failed, 0 skipped |
| Node-native controls | PASS (local) | 35/35 รวม canonical schema bundle |
| Root TypeScript | PASS (local) | `npx tsc -b tsconfig.build.json` |
| Root production build | PASS (local) | Vite build สำเร็จ; มี chunk-size warnings เดิม |
| Lint | PASS (local) | 0 errors; 2,312 warnings เท่ากับ budget |
| Field App | PASS (local) | build + 7 files / 24 tests |
| Digital Shadow | PASS (local) | build + 10 files / 244 isolated unit tests |
| Homag adapter | PASS (local) | 27 tests ภายใน Digital Shadow lane |
| Factory Server | PASS (local) | build + 58 tests |
| Vault Builder | PASS (local) | build + 82 tests |
| Bible Code | PASS (local) | build + 28 tests |
| Culture | PASS (local) | 19 focused tests; รวมอยู่ใน root full suite |
| Process Templates | PASS (local) | 31 focused tests; รวมอยู่ใน root full suite |
| Production dependency audit | PASS (local gate) | root 0 high/0 critical/4 moderate; server 0 high/0 critical/1 moderate |
| LineOS | PASS (CI) | Ubuntu job พร้อม Python Playwright/Chromium ผ่านใน PR #79 |
| Fresh DB migrations | PASS (CI) | `supabase db reset --local` ลง canonical migration chain สำเร็จใน [run 34041594653](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/34041594653) |
| SQL pgTAP | PASS (CI) | `pg_prove supabase/tests/*.sql` รัน assertions จริงและผ่านใน fresh database เดียวกัน |
| TypeScript database suites | DIAGNOSTIC | legacy schema-assumption suite แยกจาก authoritative pgTAP gate และเก็บ JSON artifact; สถานะ pgTAP release gate อ้างจาก `pg_prove` job เท่านั้น |
| Playwright E2E | PASS (CI) | UI smoke และ non-vacuous factory integration ผ่านใน PR #79 |
| Chromatic | REVIEW REQUIRED | Playwright story IDs ซ่อมแล้ว; external UI baseline ยังรอ human review/acceptance และห้าม auto-accept โดยไม่ตรวจภาพ |
| Security issues #49/#50 | BLOCKED (production) | read-only hosted verification ยืนยันว่า RLS และ policies ยังไม่อยู่ใน production ทั้งสองตาราง จึงยังเปิด issues ไว้ |
| Backend deploy | BLOCKED (credential preflight) | secret inventory ให้ผล `deployment_ready=false`; workflow แสดง successful skip ตามนโยบาย และยังไม่ถือว่า deploy ผ่าน |
| Product version | RECONCILED IN PR | root `package.json` เป็น canonical `17.5.1`; README/changelog/progress ใช้ค่าเดียวกัน และ CI ตรวจ drift |
| Release tag/GitHub Release | BLOCKED | `v17.5.1` เป็น tag ล่าสุด ขณะที่ GitHub Release inventory สูงสุดคือ `v17.0.0`; ห้าม publish จน production RLS, deploy, Chromatic และ merge ผ่าน |

## 3. การซ่อม Full Verify และ CI ownership

`MONOLITH Full Verify` แบ่ง environment ownership เป็น blocking jobs แยกกัน:

- root: lint, typecheck, Vitest, production build และ E0 artifact
- LineOS: Node contract suite พร้อม Python Playwright 1.61.0 และ Chromium
- node-controls: governance, schema bundle, dogfood และ readiness controls
- server: build และ Vitest
- S17-4: deterministic generator evidence
- field: Field App build/test
- digital-shadow: build และ isolated unit tests
- workspace-tools: Vault Builder และ Bible Code
- dependency-audit: production dependencies ของ root/workspaces และ server
- clean-worktree: build ต้องไม่เปลี่ยน tracked files
- e2e-smoke: critical UI path ต้องรันและห้าม skip
- e2e-integration: ต้องมีอย่างน้อยหนึ่ง test รันจริง; service-gated skips แสดงเป็น notice
- manifests: ตรวจ byte-exact governance hashes
- gate-bypass-scan: ยังเป็น report-only ตาม debt เดิม ไม่ใช่ blocking release gate ในงานนี้

Root Vitest ไม่รับผิดชอบ suite ที่ต้องมี Postgres, Redis, MQTT, InfluxDB, browser, หรือ tool-specific config อีกต่อไป เพื่อป้องกันทั้ง false failure และ false green แต่ละ suite ถูกส่งไป lane ที่จัด environment ให้จริง

## 4. Database, migration และ pgTAP

### ปัญหาที่พบ

- `20260828_multi_tenant_schema.sql` เป็น historical bootstrap ที่ต้องแยกให้ลงก่อนและหลัง migration 0172
- มี migration หลายไฟล์ใช้ numeric version ซ้ำกัน ซึ่ง Supabase CLI ปฏิเสธ
- `00000000000063_organizations_org_members_stub.sql` สร้าง `org_members` แบบไม่ครบ เมื่อรันก่อน full bootstrap แล้ว `CREATE TABLE IF NOT EXISTS` จะไม่แก้โครงสร้าง ทำให้ schema เสียแม้คำสั่งไม่ error

### วิธีแก้

`scripts/prepare_supabase_migrations_ci.sh` ทำงานแบบ deterministic:

1. แยก bootstrap ด้วย semantic SQL marker `-- 4. ADD org_id TO EXISTING TABLES` ไม่อิงเลขบรรทัด
2. วางส่วนต้นก่อน 0172 และส่วนท้ายหลัง 0172
3. ลบ stub เก่าเฉพาะเมื่อ canonical full `org_members` schema พร้อมแล้ว
4. merge migration version ที่ซ้ำตามลำดับชื่อไฟล์ พร้อม source delimiter
5. ตรวจซ้ำและ fail หากยังมี numeric version ซ้ำ
6. รองรับ rerun โดยไม่ทำให้ผลต่างจากรอบแรก

pgTAP workflow ไม่ใช้ hosted Supabase token แล้ว แต่สร้าง local stack ใหม่ทั้งหมด จากนั้น:

1. `supabase start`
2. `supabase db reset --local`
3. enable pgTAP
4. รัน SQL tests ทุกไฟล์ด้วย `pg_prove`
5. export local anon/service keys ลง masked environment
6. ติดตั้ง test-only `exec_sql` helper ซึ่งไม่ถูกบรรจุเป็น production migration
7. seed Org A/Org B และ authenticated users แบบ deterministic
8. รัน RLS/migration/integration Vitest ด้วย `vitest.database.config.ts`
9. upload JSON evidence และ stop stack เสมอ

## 5. Backend deploy secret behavior

- เมื่อ `DATABASE_URL` เป็นค่าว่าง: migration/deployment preflight จะแสดง notice และให้ job จบแบบ successful skip
- Supabase Functions deploy รันเฉพาะเมื่อ project ref และ access token มีครบ
- output `deployment_ready` เป็นเงื่อนไข explicit ระหว่าง jobs
- ไม่มีการเปลี่ยน missing secret ให้เป็น failure ที่ทำให้ PR ภายนอกหรือ fork ใช้งานไม่ได้ และไม่มีการแสดงค่าของ secret ใน log

## 6. v17.5/v18.0 routing และ access control

| Route | Module | Minimum plan | Tenant roles |
|---|---|---|---|
| `/people` | People Directory | STARTER | ทุก active role |
| `/people/:employeeId/ai-readiness` | Super Employee Tracker | PROFESSIONAL | ทุก active role |
| `/training` | Training Tracker | PROFESSIONAL | ทุก active role |
| `/culture/metrics` | Culture Metrics | PROFESSIONAL | ทุก active role |
| `/ai/costs` | AI Cost Estimation | ENTERPRISE | OWNER, ADMIN, FINANCE |
| `/ai/scheduler` | AI Production Scheduler | ENTERPRISE | OWNER, ADMIN, FACTORY |
| `/structure/org-chart` | Interactive OrgChart | PROFESSIONAL | ทุก active role |
| `/structure/role-network` | Role Network | ENTERPRISE | ทุก active role |
| `/quality/anomalies` | QC Anomaly Detection | ENTERPRISE | OWNER, ADMIN, FACTORY |
| `/ai/quotation-drafts` | AI Quotation Draft | ENTERPRISE | OWNER, ADMIN, FINANCE |
| `/culture/leadership-actions` | Leadership Actions | ENTERPRISE | OWNER, ADMIN |

ทุก route ผ่าน boundary เดียวกันก่อน lazy module mount:

- เมื่อ Supabase configured ต้องมี authenticated session
- selected member ต้องตรงกับ session user และ selected organization
- organization ต้องเป็น `ACTIVE` หรือ `TRIAL`
- membership ต้อง active
- tenant role และ plan ต้องผ่าน registry policy
- admin UI actions ใช้เฉพาะ OWNER/ADMIN จริง
- unauthorized module ไม่ mount จึงไม่เริ่ม module data fetch
- sign-in รองรับ safe `next` path และปฏิเสธ protocol-relative redirect

หมายเหตุ: minimum plan ของ Super Employee และ Role Network ยึด helper ที่ implementation ปัจจุบันใช้จริง (`PROFESSIONAL` และ `ENTERPRISE` ตามลำดับ) ซึ่งต่างจาก roadmap เก่าบางบรรทัด จึงต้อง reconcile roadmap แยกจาก runtime authorization

## 7. Dependency security

การเปลี่ยนแปลง:

- `pdfjs-dist` → 6.3.289
- MQTT → 5.15.2
- override `ws` → 8.21.3
- ลบ `sparkplug-payload` ที่ไม่มี runtime import และดึง `protobufjs` ที่มี advisory เข้ามา
- Vault Builder ใช้ SheetJS 0.20.3 จาก official CDN และตั้ง Node filesystem binding สำหรับ ESM build

ผล audit ณ วันที่เอกสาร:

- root/workspaces: 4 moderate, 0 high, 0 critical
- server: 1 moderate, 0 high, 0 critical
- blocking command คือ `npm audit --omit=dev --audit-level=high`
- moderate ที่เหลือมาจาก React Router/@remix-run/router, fflate และ server `qs`; ต้องติดตามต่อ แต่ไม่ฝ่าฝืนเกณฑ์ release ที่กำหนดไว้

## 8. Lint ratchet

- แก้ error ทั้งหมดจนเหลือ 0
- baseline ปัจจุบัน 2,312 warnings
- `npm run lint:budget` ใช้ `--max-warnings 2312`
- CI จะล้มทันทีเมื่อมี warning ใหม่ แม้ technical debt เดิมยังไม่ได้ลดทั้งหมด
- เมื่อแก้ warning เดิม ต้องลดเลข budget ใน commit เดียวกัน ห้ามปล่อย budget คงเดิมโดยไม่มีเหตุผล

## 9. PR, issues และ release lifecycle

### ผลตรวจ PR ที่ค้าง

| PR | สถานะจาก GitHub | ผลเปรียบเทียบกับ `main` | คำแนะนำ |
|---|---|---|---|
| #41 Digital Shadow Service | closed as superseded | unique three-parameter Weibull/RUL delta ถูกย้ายเข้า PR #79; product integration อยู่ใน PR #80 | ปิดแล้วพร้อม comment อ้างอิง replacement |
| #44 Digital Shadow integration | closed and replaced | แยกเฉพาะ Machine Shadow UI/API/store, Feature Cache, adapters/services และ tests ออกมาเป็น clean PR #80 โดยไม่พา CI/Slack/SARIF commits เก่า | ปิดแล้ว; PR #80 ต้อง rebase บน stabilization ก่อน merge |
| #46 Accounting/RLS | closed as superseded | 42/73 paths byte-identical, 30 paths มีใน main และพัฒนาต่อแล้ว; canonical migration preparation รับหน้าที่แทน legacy bootstrap | ปิดแล้วหลัง fresh DB/pgTAP ยืนยัน current design |
| #78 CONTRIBUTING formatting | open, 1 commit, 1 line | ไม่อยู่ใน scope stabilization และไม่เกี่ยวกับ release gates | คงไว้ให้ owner จัดการแยก |

Security issues #49/#50 ยัง open ทั้งคู่ การตรวจ production แบบ read-only ผ่าน Supabase Management API ที่ commit `c76b478` พบว่า `notification_digest_queue` และ `platform_metrics_snapshots` มี `rls=false`, `policies=false` (ขณะที่ไม่พบ permissive bypass) จึงใส่หลักฐานลงทั้งสอง issue แล้วและ **ไม่ปิด** Migration `0178_notification_platform_metrics_rls.sql` ผ่าน fresh DB/pgTAP แต่ยังไม่ได้ deploy ไป production ตามผลตรวจจริง

### ลำดับหลังเปิด stabilization PR

1. ตรวจและยอมรับ Chromatic baseline เฉพาะภาพที่ผ่าน visual review แล้ว
2. ตั้ง `DATABASE_URL` ผ่าน GitHub secret UI หรือ `gh secret set DATABASE_URL` จาก terminal โดยไม่ส่งค่าในแชต
3. deploy approved migration chain ไป production ผ่าน workflow แล้ว rerun hosted RLS verification
4. ปิด issues #49/#50 เฉพาะเมื่อ artifact ใหม่ให้ `verified=true` ทั้งสอง contract
5. rebase PR #80 บน stabilization, แก้ conflict และให้ product-integration checks ผ่าน
6. merge ผ่าน review ตาม repository policy
7. publish GitHub Release บน merged commit/tag ที่สอดคล้องกับ root `package.json`; ห้ามสร้างหรือย้าย tag บน branch candidate

### Version source และประวัติ release

- root `package.json` คือ single source of truth ของ product version: `17.5.1`
- root `package-lock.json`, README, CHANGELOG และ progress document ต้องตรงกับค่านี้; `npm run version:check` เป็น CI gate
- package versions ของ `server`, Field App, Digital Shadow และ tools เป็น component versions แยกกัน ไม่ต้องเท่ากับ product version
- `v17.5.0` (`3a819c17`) และ `v17.5.1` (`532783be`) ถูก tag จริงวันที่ 2026-09-01
- `v17.5.2` ถึง `v18.5.1` ถูกจัดเป็น planned implementation records ตาม tag inventory ที่สิ้นสุดที่ `v17.5.1` และ release inventory ที่สิ้นสุดที่ `v17.0.0`
- GitHub Release ที่เผยแพร่สูงสุดคือ `v17.0.0`; หน้า Releases ยังตั้ง `v15.9.0` เป็น Latest อย่างไม่ถูกต้อง การแก้ Latest/สร้าง v17.5.1 Release ต้องทำหลัง release gates ผ่านทั้งหมด

### GitHub authentication และ branch publication

GitHub CLI authentication เชื่อมกับบัญชี `indetailsgroup-hue` ผ่าน macOS keyring แล้ว โดย Git ใช้ HTTPS credential helper และ token มี `repo`/`workflow` scopes ที่จำเป็น Branch `codex/readiness-stabilization-20260906` ถูก push ไปยัง `origin` สำเร็จแล้ว ขั้นถัดไปคือเปิด stabilization PR และใช้ GitHub Actions เป็น external evidence ตามลำดับด้านบน ห้ามสร้าง tag/release จนกว่า PR จะผ่าน gate, review และ merge

## 10. Release decision

**ปัจจุบัน: HOLD**

ยังไม่ให้ release เพราะ production RLS verification ของ #49/#50 ล้มจริง, `DATABASE_URL` ยังไม่ถูกตั้งจึงยังไม่มี backend deploy evidence, Chromatic baseline ยังรอ visual approval, PR #79 ยังต้องจบ/merge และ PR #80 ต้อง rebase/ผ่าน CI ก่อน ส่วน fresh DB, pgTAP, LineOS, root/server/field, lint, audits และ Playwright หลักผ่าน GitHub Actions แล้วใน PR #79 ณ commit `c76b478`
