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
| LineOS | WAITING FOR CI | 350/351 ผ่านใน sandbox; browser-evidence test เปิด Chromium ไม่ได้เพราะ macOS MachPort sandbox permission; GitHub Ubuntu job ติดตั้ง Python Playwright/Chromium แบบ pinned |
| Fresh DB migrations | WAITING FOR CI | เครื่องนี้ไม่มี Docker; workflow ต้องยืนยัน `supabase db reset --local` |
| SQL pgTAP | WAITING FOR CI | workflow ใช้ `pg_prove supabase/tests/*.sql` กับฐานข้อมูลใหม่จริง |
| TypeScript database suites | WAITING FOR CI | workflow seed สอง tenant แล้วรัน `npm run test:database` |
| Playwright E2E | WAITING FOR CI | smoke ต้องไม่ skip; integration lane ต้องไม่ vacuous |
| Security issues #49/#50 | OPEN | มี migration 0178 และ tests แต่ห้ามปิดก่อน database CI ผ่าน |
| Release tag/GitHub Release | BLOCKED | รอ CI, review, merge และการ reconcile ประวัติเวอร์ชัน |

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

- ถ้า `DATABASE_URL` ไม่มี: migration/deployment preflight จะแสดง notice และให้ job จบแบบ successful skip
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
| #41 Digital Shadow Service | open, 3 commits, 69 files, base=`review/pre-digital-shadow` | เมื่อเทียบกับ merge-base เหลือ 2 paths: `RULPredictionService.ts` ต่าง และ package changelog ไม่มีใน main; core service ส่วนใหญ่มีใน main แล้ว | ปิดเป็น superseded ได้หลัง stabilization PR อ้างหลักฐาน Digital Shadow 244 tests และยืนยันว่า RUL delta ไม่ใช่ fix ที่ต้องเก็บ |
| #44 Digital Shadow integration | open, dirty conflict, 47 commits, 27 files | 23 files ยังไม่มีใน main เช่น Machine Shadow UI/API/store, Feature Cache และ integration tests | **ห้ามปิดว่า superseded**; ต้อง salvage/rebase เฉพาะ integration ที่ยังขาดเป็น PR ใหม่หรือปรับ PR เดิม |
| #46 Accounting/RLS | open, dirty conflict, 89 commits, 73 files | 45 files byte-identical กับ main, 27 files ต่างเพราะ main เดินหน้าต่อ, 1 legacy bootstrap path ไม่มีใน main | มีแนวโน้ม superseded โดย main แต่ต้อง review 27 deltas ก่อนปิด; ห้าม merge branch เก่าตรง ๆ |
| #78 CONTRIBUTING formatting | open, 1 commit, 1 line | ไม่อยู่ใน scope stabilization และไม่เกี่ยวกับ release gates | คงไว้ให้ owner จัดการแยก |

Security issues #49/#50 ยังไม่มี comment และยัง open ทั้งคู่ Migration `0178_notification_platform_metrics_rls.sql` มี RLS/policies/assertions ตาม closure criteria แต่ source presence ยังไม่ใช่ execution evidence จึงยังไม่ปิด

### ลำดับหลังเปิด stabilization PR

1. รอ Full Verify และ pgTAP workflows จบ
2. แก้ failure จน blocking jobs เขียว โดยไม่อนุญาต vacuous skips
3. เมื่อ fresh DB, pgTAP และ RLS suites ผ่าน จึงใส่ run URL/commit SHA เป็นหลักฐานใน issues #49/#50 และปิด
4. ตรวจ PR #41, #44 และ #46 เทียบ stabilization PR; ปิดเฉพาะรายการที่ถูกแทนที่จริง พร้อม comment อ้างอิง
5. merge ผ่าน review ตาม repository policy
6. reconcile version history: root package=`2.1.0`, server package=`0.13.2`, Git tags มี `v17.5.1`, `CHANGELOG.md` ไปถึง 18.5.1 แต่ public GitHub Releases ล่าสุดที่พบคือ v17.0.0
7. สร้าง tag และ GitHub Release บน merged commit เท่านั้น ห้าม tag branch candidate หรือประกาศย้อนหลังโดยเดา version

### GitHub authentication และ branch publication

GitHub CLI authentication เชื่อมกับบัญชี `indetailsgroup-hue` ผ่าน macOS keyring แล้ว โดย Git ใช้ HTTPS credential helper และ token มี `repo`/`workflow` scopes ที่จำเป็น Branch `codex/readiness-stabilization-20260906` ถูก push ไปยัง `origin` สำเร็จแล้ว ขั้นถัดไปคือเปิด stabilization PR และใช้ GitHub Actions เป็น external evidence ตามลำดับด้านบน ห้ามสร้าง tag/release จนกว่า PR จะผ่าน gate, review และ merge

## 10. Release decision

**ปัจจุบัน: HOLD**

เหตุผลเดียวที่ยังไม่ให้ release คือ external evidence ยังไม่ครบ: fresh database, pgTAP, database integration, LineOS browser evidence และ Playwright E2E ต้องผ่าน GitHub Actions ก่อน รวมถึงต้องปิด security issues ด้วยหลักฐานและ reconcile version หลัง merge งาน local ที่ระบุ PASS ด้านบนผ่านแล้ว แต่ไม่ใช้แทน CI evidence
