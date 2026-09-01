# MONOLITH Manufacturing OS — Changelog

All notable changes to the Monolith Workspace are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v17.0.0] — Process Templates Module — 2026-12-01 🚧 In Progress

### Added

#### Process Templates (`src/jobs/`)
- **`ProcessTemplateList`** component — template browser with category/global filters + plan gate badges
  - Category dropdown filter (8 categories: CABINET, DOOR, DRAWER, LABEL, SITE, CNC, QUOTATION, CUSTOM)
  - Search input with 300ms debounce
  - Global-only checkbox filter
  - Template cards showing name, category icon, estimated hours, version, plan gate badge
  - Clone global template into org-specific copy (ADMIN+)
  - Plan gate wall for FREE plan with upgrade prompt
  - Loading skeleton (6 cards) + empty state
  - `data-testid` attrs: `process-template-list`, `template-card`, `template-name`, `plan-gate-badge`, `global-badge`, `apply-template-btn`, `clone-template-btn`
- **`BottleneckHeatmap`** component — PROFESSIONAL+ stage bottleneck analytics
  - Summary bar: overall bottleneck rate %, worst stage, total bottleneck events
  - Heatmap table: stage × (job count, avg actual, avg expected, % of plan, bottleneck rate)
  - Severity coloring: OK (green ≤110%), WARNING (amber 111–150%), CRITICAL (red >150%)
  - Visual progress bar per stage row
  - Worst-stage highlighted row with ⚠️ indicator
  - Plan gate wall for FREE/STARTER with feature teaser
  - Loading skeleton + empty state
  - `data-testid` attrs: `bottleneck-heatmap`, `bottleneck-table`, `heatmap-row`, `severity-cell`, `bottleneck-summary-bar`, `worst-stage-display`
- **`src/jobs/processTemplateTypes.ts`** — complete type system for Process Templates module
  - `JobTemplateCategory` union (8 values) + Thai labels + emoji icons
  - `PlanGate` type with `PLAN_GATE_RANK` ordering and `meetsplanGate()` helper
  - `JobTemplate`, `JobTemplateStage`, `JobTemplateInput`, `JobTemplateStageInput`, `JobTemplateSummary`
  - `TimeInStageEntry`, `StageEntryInput`, `StageExitInput`
  - `BottleneckHeatmapRow`, `BottleneckSeverity`, `getBottleneckSeverity()`
  - `BOTTLENECK_SEVERITY_COLORS`, `BOTTLENECK_SEVERITY_LABELS` lookup maps
  - `BottleneckAnalysisSummary`, `JobTemplateFilters`, `DEFAULT_TEMPLATE_FILTERS`
  - `ApplyTemplateResult`, `ProcessTemplateState`
- **`src/jobs/processTemplateStore.ts`** — Zustand store for Process Templates
  - `PlanGateError` class (name: `"PlanGateError"`, plan-aware message in Thai)
  - `fetchTemplates(orgId, filters?)` — fetches org + global templates in one query
  - `fetchTemplateById(templateId)` — with joined stages sorted by `stageOrder`
  - `fetchBottleneckData(orgId, orgPlan, templateId?)` — PROFESSIONAL+ gated; throws `PlanGateError`
  - `createTemplate(orgId, input)` — inserts template + stages; refreshes list
  - `updateTemplate(templateId, updates)` — partial update + re-fetch
  - `deleteTemplate(templateId)` — optimistic UI removal from state
  - `cloneGlobalTemplate(templateId, orgId, overrideName?)` — deep clone to org copy
  - `addStage`, `updateStage`, `deleteStage`, `reorderStages` — stage CRUD
  - `applyTemplateToJob(templateId, jobId, orgId)` — logs first stage entry
  - `logStageEntry`, `logStageExit` — PROFESSIONAL+ gated time-in-stage logging

#### Database Migrations
- **`supabase/migrations/20261201_process_templates.sql`** — Process Templates schema
  - `job_templates` table — org_id + is_global pattern (null org_id = global seed)
  - `job_template_stages` table — ordered stages with `expected_duration_hours`
  - `time_in_stage_log` table — PostgreSQL generated columns for `duration_minutes` + `is_bottleneck`
  - `bottleneck_heatmap_v` view — `SECURITY INVOKER`; aggregates pct_of_expected, bottleneck rate per stage
  - `pt_set_updated_at()` trigger function — SECURITY INVOKER, auto-updates `updated_at`
  - RLS policies — tenant isolation via `org_id = current_setting('app.current_org_id')`; ADMIN+ for write; global templates readable by all
  - 5 seed global templates (ตู้ครัวมาตรฐาน, งาน CNC Batch, ประตูบานเปิด, งานติดตั้ง on-site, ป้ายงาน)
  - Stages for ตู้ครัวมาตรฐาน (8 stages) and งาน CNC Batch (4 stages)
  - ASSERTION block: verifies seed data row counts post-migration
- **`supabase/migrations/20261201_process_templates_rollback.sql`** — full rollback
  - Drops view → time_in_stage_log → job_template_stages → job_templates → trigger fn → enum type (all CASCADE)
  - Safe to run multiple times (all IF EXISTS)

#### Plan Limits Update
- **`src/tenant/types.ts`** — `PLAN_LIMITS` updated:
  - `STARTER+`: added `process_templates` feature
  - `PROFESSIONAL+`: added `process_templates` + `bottleneck_heatmap` features
  - `ENTERPRISE+`: same as PROFESSIONAL plus existing enterprise features

### Tests
- **`src/jobs/__tests__/processTemplateTypes.test.ts`** — 30 pure TypeScript tests
  - `meetsplanGate()` — 11 cases (all plan combinations including edge/boundary)
  - `PLAN_GATE_RANK` ordering contract
  - `getBottleneckSeverity()` — 9 cases (OK/WARNING/CRITICAL thresholds including exact boundaries)
  - `BOTTLENECK_SEVERITY_COLORS` / `LABELS` — completeness + hex format validation
  - `JOB_TEMPLATE_CATEGORY_LABELS` / `ICONS` — all 8 categories covered, no extra keys
  - `DEFAULT_TEMPLATE_FILTERS` — all defaults correct
- **`src/jobs/__tests__/processTemplateStore.test.ts`** — 28 tests
  - `PlanGateError` class — name, message, instanceof
  - `fetchBottleneckData` — PlanGateError on FREE/STARTER; resolves on PROFESSIONAL/ENTERPRISE
  - `logStageEntry` / `logStageExit` — PlanGateError on non-PROFESSIONAL
  - `setFilters` — merge, multi-key, null-clear
  - `clearError` — no-op + active
  - `reset` — all state keys restored
  - `fetchTemplates` — error state + success path + isLoading lifecycle
  - `deleteTemplate` — optimistic removal; selectedTemplate cleared/kept

---

## [v16.0.0] — People & Culture Module — 2026-08-28

### Added

#### People Module (`src/people/`)
- **`PeopleDirectory`** component — org-scoped employee directory with real-time filtering
  - Search by name / department (debounced)
  - Stage filter (dropdown) across all 5 SuperEmployee stages
  - Skill chip filter (local state) with `employeeSkills` join
  - Expandable employee rows showing skill tags and inactive badge
  - Loading skeleton and empty-state UI
  - `onSelectEmployee(employee)` callback prop
  - `data-testid="people-directory"` and `data-testid="employee-card"` for E2E targeting
- **`SuperEmployeeProgressCard`** component — visual progress card per employee
  - Displays current `SuperEmployeeStage` with amber/indigo badge
  - Skill gap list with mastered vs. in-progress differentiation
  - Stage progression timeline (5 stages: ONBOARDING → DEVELOPING → COMPETENT → ADVANCED → SUPER_EMPLOYEE)
- **`src/people/types.ts`** — complete type system for People module
  - `Employee`, `Skill`, `EmployeeSkill`, `EmployeeFilters` interfaces
  - `SuperEmployeeStage` union + `AiStage` alias (backward compatibility)
  - `SUPER_EMPLOYEE_STAGE_LABEL_TH` — Thai stage labels
  - `STAGE_PROGRESSION` order array
  - `DEFAULT_EMPLOYEE_FILTERS` with `isActive: true`
- **`src/people/peopleStore.ts`** — Zustand store for People module
  - `loadEmployees(orgId)` / `loadSkills(orgId)` actions
  - `updateEmployee(id, patch)` optimistic update
  - `setFilters(partial)` / `resetFilters()` actions
  - Full multi-tenant `orgId` scoping

#### Culture Module (`src/culture/`)
- **`CultureDashboard`** component — PS (People Score) analytics dashboard
  - Recharts radar chart for PS benchmarking vs. `THAI_MANUFACTURING_PS_BENCHMARK = 55`
  - Anonymous feedback list with RBAC gating (ADMIN+ only)
  - Action feedback acknowledgement flow
  - `isAdmin` prop controlling sensitive sections
- **`PsSurveyForm`** component — PS survey submission form
  - 6-dimension PS scoring (1–100 each)
  - Submission triggers `useCultureStore.submitPsScore()`
- **`src/culture/types.ts`** — complete type system for Culture module
  - `PsScore` (with `score` field), `AnonymousFeedback` (with `actionNote` field)
  - `THAI_MANUFACTURING_PS_BENCHMARK = 55`
  - `ORG_ROLE_HIERARCHY` (`OWNER=100`, `ADMIN=80`, `VIEWER=10`)
- **`src/culture/cultureStore.ts`** — Zustand store for Culture module
  - `loadPsScores(orgId)` / `loadFeedback(orgId)` / `submitPsScore()` actions
  - RBAC-aware feedback access

#### Database Migrations
- **`20261001_people_culture_schema.sql`** — People & Culture schema
  - `employees`, `skills`, `employee_skills` tables with `org_id` tenant scoping
  - `ps_scores` table — PS survey results per employee per period
  - `anonymous_feedback` table — org-level anonymous feedback store
  - `audit_log` table — immutable action audit trail
- **RLS policies**
  - `employees`, `skills`, `employee_skills` — tenant-isolated SELECT/INSERT/UPDATE/DELETE via `org_id = current_setting('app.current_org_id')`
  - `ps_scores` — VIEWER+ read; ADMIN+ write
  - `anonymous_feedback` SELECT — **ADMIN+ (hierarchy ≥ 80) only** — anonymous submitter identity never exposed to non-admins
  - `audit_log` — append-only INSERT; SELECT restricted to ADMIN+

#### CI / Storybook / Chromatic
- **`.github/workflows/people-culture-ci.yml`** — People & Culture CI pipeline
  - Jobs: TypeCheck (scoped `tsconfig.people-culture.json`), Lint, Vitest (166 tests), Storybook build verify
  - TypeScript check scoped to `src/people/**/*` via `tsconfig.people-culture.json`
- **`.github/workflows/chromatic.yml`** — Chromatic visual regression pipeline
  - `chromatic-upload` job — uploads Storybook to Chromatic; `allowConsoleErrors: true`; `exitZeroOnChanges: true`
  - `chromatic-playwright` job — Playwright visual snapshots via `@chromatic-com/playwright`
  - `chromatic-storybook-verify` job — pre-upload Storybook build sanity check
- **Storybook stories** (CSF3, Storybook 8.6)
  - `PeopleDirectory.stories.tsx` — 13 stories covering all stage badges, skill/stage/search filters, loading skeleton, empty state, inactive badge, `onSelectEmployee` callback interaction
  - `CultureDashboard.stories.tsx` — 17 stories covering all RBAC states, PS radar chart, action feedback flow, status filter interactions
  - `SuperEmployeeProgressCard.stories.tsx` — 10 stories covering all 5 stages and skill gap display

### Fixed (during PR review cycle)
- `CultureDashboard.stories.tsx` — `PsScore.overallScore` → `PsScore.score` (correct field name)
- `CultureDashboard.stories.tsx` — `StatusFilter_Resolved` / `StatusFilter_Pending` combobox targeting via `findByDisplayValue('ทุกสถานะ')`
- `PeopleDirectory.stories.tsx` — `onSelectEmployee Callback` story: replaced legacy `argTypes.action` with `args: { onSelectEmployee: fn() }` for proper Vitest spy; `getByRole` → `findByRole` (async)
- `PeopleDirectory.visual.spec.ts` — corrected Storybook story ID `skill-filter-python-ai` (was `python-a-i`); fixed invalid `toHaveCount({ minimum })` API usage
- `PeopleDirectory.tsx` — added `data-testid="people-directory"` and `data-testid="employee-card"` for Playwright targeting
- `StageBadge` — added `data-testid="super-employee-badge"` on `SUPER_EMPLOYEE` stage
- `tsconfig.people-culture.json` — scoped TypeScript check prevents pre-existing repo-wide errors from blocking People & Culture CI

### Tests
- **166 / 166 Vitest tests passing** (all green, committed `783bc286`)
  - `SuperEmployeeProgressCard.test.tsx` — 34 tests
  - `CultureDashboard.test.tsx` — 19 tests
  - `PsSurveyForm.test.tsx` — 30 tests
  - `validateStageProgression.test.ts` — 36 tests
  - `PeopleDirectory.test.tsx` — 47 tests
- **Chromatic Build 11** — 0 component errors, 39 stories, visual baseline accepted

### Security
- `anonymous_feedback` SELECT policy: `ORG_ROLE_HIERARCHY[role] >= 80` (ADMIN+) — enforced at both RLS and application layer
- All People & Culture tables enforce `org_id` tenant isolation
- `audit_log` is append-only (no UPDATE/DELETE policies)

---

---

## [v16.8.0] — 2026-08-28

### Security — Multi-Tenant RLS Hardening & Identity Reconciliation

This release closes the complete v16.8.0 security audit cycle.
Six RLS isolation findings (F1–F6), four SECURITY DEFINER privilege-escalation
findings (SD-R1–SD-R4), four medium-risk input-validation gaps (M1–M4),
and fourteen npm dependency vulnerabilities (issue #38) have all been resolved.

---

#### Migrations

| # | File | Scope | Findings Closed |
|---|------|-------|-----------------|
| 1 | `0173_rls_isolation_hardening.sql` | RLS policies + backfill on `customer`, `job`, `quotation`, `invoice` | F1, F2 |
| 2 | `0174_secdef_rpc_hardening.sql` | SECURITY INVOKER guards on `get_search_suggestions`, `rpc_approve_quotation`; org_id scoping | SD-R3, SD-R4 |
| 3 | `0175_child_table_rls.sql` | RLS policies on `job_panel`, `quotation_line` child tables | F3 (partial) |
| 4 | `0176_medium_risk_hardening.sql` | M1 auth guard on `get_org_usage`; M2 SECURITY INVOKER on `rpc_ledger_entries`; M3/M4 input-validation guards | SD-R1, SD-R2 (M1–M4) |
| 5 | `0177_audit_log_insert_hardening.sql` | `validate_audit_log_insert` trigger; spoofed actor_id / org_id rejection in `rpc_write_audit_log` | F5 |
| 6 | `0178_f3_f4_rls_hardening.sql` | Full org-scoped SELECT/INSERT/UPDATE/DELETE RLS on `job_panel`, `quotation_line` | F3, F4 |
| 7 | `0179_f1_full_fix_org_id_not_null.sql` | NOT NULL org_id constraints on singular tables (`job`, `quotation`, `invoice`, `invoice_payment`, `ledger_entry`, `job_panel`, `quotation_line`) + sentinel backfill | F1 (full close) |
| 8 | `0180_identity_reconciliation_hardening.sql` | `fn_verify_org_claim()` JWT ↔ org_id reconciliation guard; backfill sentinel where NULL | SD-R (identity) |
| 9 | `0181_revoke_execute_public_sweep.sql` | REVOKE EXECUTE FROM PUBLIC on all 14 public-schema RPCs | F6 + privilege sweep |
| 10 | `0182_audit_logs_org_id_not_null_fk_fix.sql` | NOT NULL org_id on `audit_logs`; FK corrected from broken `organizations(id)` → `organizations(org_id)` | F5 (full close) |
| 11 | `0183_baseline_tables_org_id_not_null.sql` | NOT NULL org_id on plural baseline tables (`jobs`, `quotations`, `invoices`, `ledger_entries`) + sentinel backfill | F1/F2 (baseline close) |

All migrations include a corresponding rollback file (`*_rollback.sql`) for CI forward-and-back idempotency testing.

---

#### pgTAP Test Coverage

| Suite file | Migration | Tests | What is verified |
|------------|-----------|-------|-----------------|
| `0179_f1_full_fix.sql` | 0179 | 14 | col_not_null on singular tables, zero NULL rows, sentinel FK |
| `0179_not_null_sentinel_backfill.sql` | 0179 | 35 | Sentinel backfill correctness across all 7 singular tables |
| `0180_identity_reconciliation.sql` | 0180 | 17 | `fn_verify_org_claim` caller-auth, mismatched claim rejection, NULL org_id guard |
| `0181_revoke_sweep.sql` | 0181 | 18 | No EXECUTE grant to PUBLIC on each of the 14 RPCs |
| `0182_audit_logs_org_id_hardening.sql` | 0182 | 13 | NOT NULL on `audit_logs.org_id`, FK to `organizations(org_id)`, spoofed insert rejection |
| `0183_baseline_org_id_not_null.sql` | 0183 | 13 | NOT NULL on `jobs`/`quotations`/`invoices`/`ledger_entries`, sentinel backfill, FK, zero NULL rows |
| **Total (forward migrations)** | | **110** | |

**Rollback verification suites (CI forward-and-back, not counted in production total):**

| Suite file | Migration | Tests | What is verified |
|------------|-----------|-------|-----------------|
| `0183_rollback_verification.sql` | 0183 rollback | 12 | `information_schema` nullable=YES, `pg_catalog` attnotnull=false, `lives_ok` NULL UPDATE on all 4 tables |

---

#### Dependency Vulnerabilities (issue #38)

| Package | Previous version | Patched version | CVEs resolved |
|---------|-----------------|-----------------|---------------|
| `uuid` (server) | `^8.3.2` | `^11.1.1` | 14 transitive vulnerabilities |
| `bullmq` (server) | `^4.x` | `^5.81.4` | Transitive uuid chain |

`npm audit` result as of 2026-08-28: **0 vulnerabilities** (0 high, 0 moderate, 0 low).

---

#### CI Integration

| File | Description |
|------|-------------|
| `.github/workflows/pgtap-tests.yml` | Runs `pg_prove` on all `supabase/tests/*.sql` against a fresh Supabase local stack on every push to `main` and every PR targeting `main`. Requires `SUPABASE_ACCESS_TOKEN` secret. |

---

#### Findings Resolution Matrix

| ID | Description | Migration(s) | Status |
|----|-------------|-------------|--------|
| F1 | Missing NOT NULL org_id — singular tables | 0173, 0179, 0183 | ✅ FIXED |
| F2 | RLS isolation gaps — singular tables | 0173 | ✅ FIXED |
| F3 | Missing RLS — `job_panel` child table | 0175, 0178 | ✅ FIXED |
| F4 | Missing RLS — `quotation_line` child table | 0175, 0178 | ✅ FIXED |
| F5 | `audit_logs` `WITH CHECK (true)` + broken FK | 0177, 0182 | ✅ FIXED |
| F6 | EXECUTE granted to PUBLIC on all RPCs | 0181 | ✅ FIXED |
| SD-R1 | `get_org_usage` — missing caller auth check | 0176 | ✅ FIXED |
| SD-R2 | `rpc_ledger_entries` — SECURITY DEFINER without invoker guard | 0176 | ✅ FIXED |
| SD-R3 | `rpc_approve_quotation` — missing org_id scope | 0174 | ✅ FIXED |
| SD-R4 | `get_search_suggestions` — missing org_id scope | 0174 | ✅ FIXED |
| M1 | `get_org_usage` — missing auth guard | 0176 | ✅ FIXED |
| M2 | `rpc_ledger_entries` — SECURITY DEFINER | 0176 | ✅ FIXED |
| M3 | Input validation gap — ledger RPC | 0176 | ✅ FIXED |
| M4 | Input validation gap — usage RPC | 0176 | ✅ FIXED |
| #38 | 14 npm dependency vulnerabilities | `package.json` bump | ✅ FIXED |
| Identity | JWT org_id claim not reconciled against DB | 0180 | ✅ FIXED |

---

#### GitHub Issues & PRs Closed

| Ref | Title | Resolution |
|-----|-------|------------|
| Issue #37 | Identity reconciliation hardening | Closed — migration 0180, PR #54 |
| Issue #38 | 14 dependency vulnerabilities | Closed — `uuid ^11.1.1`, `bullmq ^5.81.4`, 0 vulns confirmed |
| Issue #42 | F1+F2 RLS isolation gaps | Closed — migrations 0173+0179 |
| Issue #43 | T1/T2 test defects | Closed — test file patched |
| Issue #48 | F5 audit_logs WITH CHECK (true) | Closed — migrations 0177+0182 |
| Issue #49 | F3 job_panel RLS | Closed — migrations 0175+0178 |
| Issue #50 | F4 quotation_line RLS | Closed — migrations 0175+0178 |
| Issue #53 | Retrospective — migration 0179 | Closed — PR #55 |
| PR #45 | v16.8.0 security hardening (0173+0174+0175) | Closed — superseded by PR #55 |
| PR #47 | 0176 medium-risk hardening | Closed — superseded by PR #55 |
| PR #52 | 0178 F3+F4 RLS hardening | Closed — superseded by PR #55 |
| PR #54 | 0180+0181 identity hardening + REVOKE sweep | Closed — superseded by PR #55 |
| PR #55 | v16.8.0 Complete — migration 0183 + release summary | **Merged** 2026-08-28 |

---

#### Files Changed (v16.8.0 cycle)

```
supabase/migrations/
  0173_rls_isolation_hardening.sql
  0174_secdef_rpc_hardening.sql
  0175_child_table_rls.sql
  0176_medium_risk_hardening.sql
  0177_audit_log_insert_hardening.sql
  0178_f3_f4_rls_hardening.sql
  0179_f1_full_fix_org_id_not_null.sql
  0180_identity_reconciliation_hardening.sql
  0181_revoke_execute_public_sweep.sql
  0182_audit_logs_org_id_not_null_fk_fix.sql
  0183_baseline_tables_org_id_not_null.sql
  0173_rollback.sql  0174_rollback.sql  0175_rollback.sql
  0176_rollback.sql  0177_rollback.sql  0178_rollback.sql
  0179_rollback.sql  0180_rollback.sql  0181_rollback.sql
  0182_rollback.sql  0183_rollback.sql

supabase/tests/
  0179_f1_full_fix.sql
  0179_not_null_sentinel_backfill.sql
  0180_identity_reconciliation.sql
  0181_revoke_sweep.sql
  0182_audit_logs_org_id_hardening.sql
  0183_baseline_org_id_not_null.sql
  0183_rollback_verification.sql

.github/workflows/
  pgtap-tests.yml

server/
  package.json
  package-lock.json

docs/
  security-posture-report.md
```

---

*Release authored: 2026-08-28 | Audit cycle: v16.8.0 | Migrations: 0173–0183 (11 total) | pgTAP: 110 forward tests + 12 rollback verification tests | npm vulnerabilities: 0*
