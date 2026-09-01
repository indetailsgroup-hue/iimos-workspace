# MONOLITH Manufacturing OS — Changelog

All notable changes to the Monolith Workspace are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v17.5.4] — AiSchedulerBoard UI + APS Store Tests + Culture Metrics Store Tests — 2027-01-26

### Added

#### UI Component — AI Production Scheduler
- `src/ai-scheduler/AiSchedulerBoard.tsx` — ENTERPRISE-gated production scheduler board
  - Two-panel layout: runs list (left) + selected-run detail (right)
  - `RunCard` sub-component with `run-approve-btn` / `run-cancel-btn` (READY state only)
  - `RunStatusTimeline` sub-component: linear DRAFT→GENERATING→READY→APPROVED→IN_PROGRESS→COMPLETED with CANCELLED/FAILED terminal branch; `data-active` / `data-done` attributes per step
  - Schedule items table with `item-override-badge` for overridden items
  - Props: `{ orgId, orgPlan, isAdmin? }` — 20 `data-testid` hooks
  - Plan gate wall renders for non-ENTERPRISE plans (`plan-gate-wall` testid)

#### Vitest Unit Tests — AI Production Scheduler Store
- `src/ai-scheduler/__tests__/aiSchedulerStore.test.ts` — 33 tests, all passing
  - Plan gate: all 9 write actions (createMachineConfig, updateMachineConfig, createProductionRun, approveRun, cancelRun, addScheduleItem, updateItemStatus, createConstraint, deactivateConstraint) throw `AiSchedulerPlanGateError` for FREE / STARTER / PROFESSIONAL; resolve for ENTERPRISE
  - `addScheduleItem` auto-sequence: empty run → order 1; 2-item run → order 3; explicit `sequenceOrder` override; cross-run isolation (other-run items not counted)
  - `approveRun` auth write: `getUser()` called; patch contains `status: 'APPROVED'`, `approved_by` (user id), `approved_at` (ISO timestamp within test window); store `productionRuns` updated in-place
  - `updateItemStatus` is_overridden: with `overrideReason` → patch has `is_overridden: true`; without → `is_overridden` absent; store `scheduleItems` updated
  - `setFilters` partial merge; `clearError` idempotent

#### Vitest Unit Tests — Culture Metrics Store
- `src/culture-metrics/__tests__/cultureMetricsStore.test.ts` — 36 tests, all passing
  - Plan gate PROFESSIONAL+: `createMetricDefinition` / `createEnpsSurvey` throw `CultureMetricsPlanGateError` for FREE / STARTER; resolve for PROFESSIONAL / ENTERPRISE; `updateMetricDefinition`, `recordSnapshot`, `activateEnpsSurvey`, `closeEnpsSurvey` all throw for FREE
  - `submitEnpsResponse` exemption: resolves without orgPlan; inserts to `cmd_enps_responses`; insert args include `anonymous_token`, `score`, `survey_id` but NO `user_id` / `employee_id`; `auth.getUser` NOT called
  - `fetchEnpsResults`: queries `cmd_enps_results_v`; empty data → empty store; populated → rows mapped via `mapEnpsResultsRow`; `npsScore: null` when view returns null (below min_responses threshold); error fallback message; `isEnpsLoading` resets to false
  - `setFilters` partial merge; `clearError` idempotent

---

## [v17.5.3] — AI Production Scheduler + Culture Metrics Dashboard + AiCostDashboard Tests — 2027-01-25

### Added

#### SQL Migration — AI Production Scheduler
- `supabase/migrations/20270125_ai_production_scheduler.sql` — ENTERPRISE-gated module
  - Tables: `aps_schedule_runs` (run header, status, ENTERPRISE gate check), `aps_schedule_items` (ordered line items, `depends_on UUID[]`, `ai_confidence_score 0–100`, `is_overridden`, `override_reason`), `aps_run_events` (audit log, `event_type`, `triggered_by`)
  - View: `aps_run_summary_v` — aggregates item counts, weighted confidence, override rate per run
  - Function: `aps_is_enterprise()` — plan gate helper
  - RLS: tenant isolation on all 3 tables; MANAGER+ create/approve runs; STAFF read own items; `aps_run_events` insert-only for authenticated users
  - Indexes: 6 covering tenant lookups, status filtering, item ordering
  - Assertion block: verifies table/view/function existence post-migration

#### TypeScript Types — AI Production Scheduler
- `src/ai-scheduler/aiSchedulerTypes.ts` — complete type system (ENTERPRISE gate)
  - Union types: `ApsRunStatus` (DRAFT / PENDING_APPROVAL / APPROVED / RUNNING / COMPLETED / FAILED / CANCELLED), `ApsItemStatus`, `ApsEventType`
  - DB row types: `ApsScheduleRunRow`, `ApsScheduleItemRow`, `ApsRunEventRow`, `ApsRunSummaryRow`
  - App-layer types: `ApsScheduleRun`, `ApsScheduleItem`, `ApsRunEvent`, `ApsRunSummary`
  - Payload types: `CreateScheduleRunPayload`, `AddScheduleItemPayload`, `UpdateItemStatusPayload`, `ApproveRunPayload`
  - Plan gate: `AiSchedulerPlanGateError` (extends Error), `canAccessAiScheduler`, `AI_SCHEDULER_PLAN_GATE = 'ENTERPRISE'`
  - Label constants: `APS_RUN_STATUS_LABEL`, `APS_ITEM_STATUS_LABEL`, `APS_EVENT_TYPE_LABEL`
  - Mappers: `mapDbScheduleRun`, `mapDbScheduleItem`, `mapDbRunEvent`, `mapDbRunSummary`

#### Zustand Store — AI Production Scheduler
- `src/ai-scheduler/aiSchedulerStore.ts` — `useAiSchedulerStore`; ENTERPRISE gate on all write actions
  - State: `runs`, `currentRun`, `scheduleItems`, `runEvents`, `runSummaries`, `isLoading`, `error`
  - Fetch actions: `fetchRuns`, `fetchScheduleItems`, `fetchRunEvents`, `fetchRunSummaries`
  - Write actions (ENTERPRISE gate): `createRun`, `addScheduleItem` (auto-sets `sequence_order` to `currentItems.length + 1`), `updateItemStatus` (sets `is_overridden: true` when `overrideReason` provided), `approveRun` (writes `approved_by` from `supabase.auth.getUser()` + `approved_at: new Date().toISOString()`), `cancelRun`
  - Utility: `setFilters`, `clearError`

#### SQL Migration — Culture Metrics Dashboard
- `supabase/migrations/20270125_culture_metrics_dashboard.sql` — PROFESSIONAL+-gated module
  - Tables: `cmd_metric_definitions` (custom KPIs, hierarchy_level, weight), `cmd_metric_snapshots` (time-series values, `snapshot_date`, `recorded_by`), `cmd_enps_surveys` (eNPS survey lifecycle, `min_responses` default 3, `is_active`), `cmd_enps_responses` (anonymous — **no user_id column**)
  - Views: `cmd_org_health_v` (weighted composite score, last 30 days), `cmd_enps_results_v` (hides results until `total_responses >= min_responses`)
  - Function: `cmd_is_professional_plus()` — plan gate helper
  - RLS: tenant isolation; MANAGER+ create/update definitions and surveys; anonymous `cmd_enps_responses` INSERT allowed for any authenticated user (no ownership check); results view hidden until threshold met
  - Assertion block: verifies table/view/function existence post-migration

#### TypeScript Types — Culture Metrics Dashboard
- `src/culture-metrics/cultureMetricsTypes.ts` — complete type system (PROFESSIONAL+ gate)
  - Union types: `CmdMetricCategory`, `CmdSnapshotTrend`, `CmdSurveyStatus`, `CmdHealthTier`
  - DB row types: `CmdMetricDefinitionRow`, `CmdMetricSnapshotRow`, `CmdEnpsSurveyRow`, `CmdEnpsResponseRow`, `CmdOrgHealthRow`, `CmdEnpsResultRow`
  - App-layer types: `CmdMetricDefinition`, `CmdMetricSnapshot`, `CmdEnpsSurvey`, `CmdEnpsResponse`, `CmdOrgHealth`, `CmdEnpsResult`
  - Payload types: `CreateMetricDefinitionPayload`, `RecordSnapshotPayload`, `CreateEnpsSurveyPayload`, `SubmitEnpsResponsePayload`
  - Plan gate: `CultureMetricsPlanGateError` (extends Error), `canAccessCultureMetrics`, `CULTURE_METRICS_PLAN_GATE`
  - Constants: `DEFAULT_CMD_FILTERS`, `CMD_METRIC_CATEGORY_LABEL`, `CMD_SURVEY_STATUS_LABEL`, `CMD_HEALTH_TIER_LABEL`
  - Mappers: `mapDbMetricDefinition`, `mapDbMetricSnapshot`, `mapDbEnpsSurvey`, `mapDbEnpsResponse`, `mapDbOrgHealth`, `mapDbEnpsResult`

#### Zustand Store — Culture Metrics Dashboard
- `src/culture-metrics/cultureMetricsStore.ts` — `useCultureMetricsStore`; PROFESSIONAL+ gate on all write actions except `submitEnpsResponse`
  - State: `metricDefinitions`, `snapshots`, `orgHealth`, `enpsSurveys`, `enpsResults`, `filters`, `isLoading`, `error`
  - Fetch actions: `fetchMetricDefinitions`, `fetchSnapshots`, `fetchOrgHealth`, `fetchEnpsSurveys`, `fetchEnpsResults`
  - Write actions (PROFESSIONAL+ gate): `createMetricDefinition`, `updateMetricDefinition`, `recordSnapshot`, `createEnpsSurvey`, `activateEnpsSurvey`, `closeEnpsSurvey`
  - Exempt from plan gate: `submitEnpsResponse` — anonymous employee survey submissions allowed on any authenticated plan
  - Utility: `setFilters`, `clearError`

#### Vitest Unit Tests — `AiCostDashboard.tsx`
- `src/ai-cost/__tests__/AiCostDashboard.test.tsx` — 10 Vitest tests; mocks `useAiCostEstimationStore` via `vi.mock('../aiCostEstimationStore')` + `vi.mocked(...).mockReturnValue({...} as any)` per test
  - FREE plan → `plan-gate-wall` visible
  - PROFESSIONAL plan → `plan-gate-wall` visible
  - ENTERPRISE + `isLoading=true` + empty data → `dashboard-loading` visible
  - ENTERPRISE + empty lists → `no-budget-data`, `no-trend-data`, `no-usage-data` all visible
  - Current-month summary rows → all 4 card testids visible + correct models count
  - Budget over-threshold: `totalCostThb=9000`, `budgetThb=10000`, `alertThreshold=0.8` → 90% ≥ 80% → `budget-over-threshold` visible
  - Budget under-threshold: `totalCostThb=3000` → 30% < 80% → `budget-over-threshold` absent
  - 3 distinct months (`'2026-07'`, `'2026-08'`, `'2026-09'`) → 3 `trend-bar` elements
  - Store error → `error-banner` with message text
  - FREE plan + `isAdmin=true` → admin upgrade copy visible

---

## [v17.5.2] — AI Cost Estimation: Tests + Dashboard + Stories — 2027-01-25

### Added

#### Vitest Unit Tests — `aiCostEstimationTypes.ts`
- `src/ai-cost/__tests__/aiCostEstimationTypes.test.ts` — pure unit tests (no Supabase mock required)
  - `AiCostEstimationPlanGateError` — constructor, message, name, plan field (5 tests)
  - `canAccessAiCostEstimation` — FREE/STARTER/PROFESSIONAL blocked; ENTERPRISE allowed (4 tests)
  - `AI_COST_PLAN_GATE` constant — equals `'ENTERPRISE'`
  - `computeTokenCostUsd` — all 4 CostUnit types (TOKEN_1K, TOKEN_1M, API_CALL, CUSTOM_UNIT) (4 tests)
  - `computeRoiPct` — zero cost guard, positive ROI, fractional ROI, large values (5 tests)
  - `usdToThb` — default rate 36 THB/USD, custom rate, zero cost (3 tests)
  - `DEFAULT_AI_COST_FILTERS` — dateRange, costUnit, minCostUsd, status, modelId (5 tests)
  - Label constants — `COST_UNIT_LABEL`, `COST_MODEL_STATUS_LABEL`, `TASK_ESTIMATE_STATUS_LABEL` completeness (3 describe blocks)
  - All 6 mappers — `mapDbCostModel`, `mapDbUsageLog`, `mapDbTaskEstimate`, `mapDbBudgetPeriod`, `mapDbUsageSummary`, `mapDbBudgetUtilization` (6 describe blocks)

#### Vitest Unit Tests — `aiCostEstimationStore.ts`
- `src/ai-cost/__tests__/aiCostEstimationStore.test.ts` — thenable Proxy Supabase mock (mirrors `superEmployeeStore.test.ts` pattern)
  - Plan gate guard on all 8 write actions (createCostModel, updateCostModel, deactivateCostModel, logUsage, createTaskEstimate, updateActuals, createBudgetPeriod, updateBudgetPeriod) — each tested for FREE plan rejection
  - `clearError` — clears error field (2 tests)
  - `setFilters` — partial merge, full override, date range (3 tests)
  - `fetchCostModels` — populates store, handles empty result, handles DB error (5 tests)
  - `logUsage` cost auto-computation — all 5 CostUnit types including model-not-found fallback
  - `createTaskEstimate` ROI calculation — with/without `manualCostThb`; prepend to list
  - `updateActuals` — matching estimate updated; non-matching estimate unchanged

#### `AiCostDashboard.tsx` Component
- `src/ai-cost/AiCostDashboard.tsx` — ENTERPRISE plan gate; fetches costModels + usageSummary + budgetPeriods on mount
  - 4 summary cards (current-month totals): total cost THB, time saved hours, total requests, active models count
  - Budget utilization section: progress bar per period + over-80% threshold warning badge
  - Monthly cost trend: CSS percentage-height bar chart aggregated by `usageMonth`
  - Usage-by-tool table: tool name, request count, cost THB
  - 20 `data-testid` attributes: `ace-dashboard`, `plan-gate-wall`, `dashboard-loading`, `summary-cards`, `total-cost-card`, `time-saved-card`, `total-requests-card`, `models-count-card`, `budget-section`, `budget-period-item`, `budget-utilization-bar`, `budget-over-threshold`, `no-budget-data`, `monthly-trend`, `trend-bar`, `trend-bar-label`, `no-trend-data`, `usage-table`, `usage-table-row`, `no-usage-data`, `error-banner`

#### `AiCostDashboard.stories.tsx` Storybook Stories
- `src/ai-cost/AiCostDashboard.stories.tsx` — 8 CSF3 stories with `withDashboardStore` decorator (mirrors `withProgressStore` pattern)
  - `PlanGateWallFree` — orgPlan=FREE shows plan gate wall
  - `PlanGateWallProfessional` — orgPlan=PROFESSIONAL shows plan gate wall
  - `DashboardLoading` — loading skeleton state
  - `EmptyState` — zero records across all lists
  - `WithUsageData` — 3 months × 2–3 tools; play() asserts summary cards + trend bars visible
  - `WithBudgetUtilization` — under 80% threshold (no warning badge)
  - `BudgetOverThreshold` — 90% utilization (budget=200 THB, spend=180 THB); play() asserts `budget-over-threshold` visible
  - `AdminView` — isAdmin=true flag exposed
  - `StoreError` — error banner visible

---

## [v17.5.1] — SuperEmployeeProgressPanel Stories + AI Cost Estimation — 2027-01-20

### Added

#### Super Employee Tracker — Storybook Stories (Task 44)
- **`src/training/SuperEmployeeProgressPanel.stories.tsx`** — 11 CSF3 Storybook stories
  - `PlanGateWallFree` / `PlanGateWallStarter` — gate wall for FREE/STARTER plans
  - `LoadingSkeleton` — `isLoading=true, employeeReadiness=null` → `panel-loading` shown
  - `Default` / `StageAiAware` / `StageAiAssisted` / `StageAiPartner` / `StageSuperEmployee` — all 5 stages with correct `data-stage` + `data-status` attributes verified
  - `StageAiAssisted` / `StageAiPartner` / `StageSuperEmployee` — AI Readiness badge assertion (score ≥ 50)
  - `WithSkillGapsNonAdmin` — 2 open gaps visible, `isAdmin=false` → no resolve button
  - `AdminResolveInteraction` — play: click resolve → `resolveSkillGap` spy called with `(orgId, orgPlan, gapId)` + `fetchSkillGaps` re-fetch verified
  - `withProgressStore` decorator injects all 9 store fields via `useSuperEmployeeStore.setState()`

#### AI Cost Estimation Module — Schema, Types & Store (Task 45)
- **`supabase/migrations/20270120_ai_cost_estimation.sql`** — AI Cost Estimation schema (ENTERPRISE plan)
  - Enum types: `ace_ai_tool` (8 values), `ace_cost_unit` (5 values), `ace_task_category` (8 values), `ace_period_type` (3 values)
  - `ace_cost_models` — per-org AI tool cost configurations; input/output separate rates for PER_TOKEN models; THB exchange rate snapshot
  - `ace_usage_logs` — append-only AI tool usage events; cost snapshotted at log time; no UPDATE/DELETE policies
  - `ace_task_estimates` — pre-task cost + time estimates with actuals fill-in and ROI tracking
  - `ace_budget_periods` — monthly/quarterly/annual AI spend budgets with configurable alert threshold
  - `ace_usage_summary_v` — monthly aggregated cost + usage per org per tool (SECURITY INVOKER)
  - `ace_task_roi_v` — per-task ROI view with cost variance between estimate and actual (SECURITY INVOKER)
  - `ace_is_enterprise()` plan gate SECURITY DEFINER function (used in all RLS policies)
  - Full RLS: employee sees own logs; ADMIN+ sees all; ADMIN+ only for cost model/budget writes; append-only log enforcement
  - 6 indexes; `ace_set_updated_at` trigger on 3 tables; assertion block (4 tables + 2 views + RLS)
- **`src/ai-cost/aiCostEstimationTypes.ts`** — Complete TypeScript type system
  - Union types: `AiTool`, `CostUnit`, `AceTaskCategory`, `AcePeriodType`
  - DB row types: `CostModelRow`, `UsageLogRow`, `TaskEstimateRow`, `BudgetPeriodRow`, `UsageSummaryRow`, `TaskRoiRow`
  - App-layer types: `AiCostModel`, `AiUsageLog`, `AiTaskEstimate`, `AiBudgetPeriod`, `AiUsageSummary`, `AiTaskRoi`
  - Payloads: `CreateCostModelPayload`, `LogUsagePayload`, `CreateTaskEstimatePayload`, `UpdateActualsPayload`, `CreateBudgetPeriodPayload`
  - Plan gate: `canAccessAiCostEstimation` + `AiCostEstimationPlanGateError` (ENTERPRISE only)
  - Constants: `AI_TOOL_LABEL_TH`, `COST_UNIT_LABEL_TH`, `TASK_CATEGORY_LABEL_TH`, `DEFAULT_THB_EXCHANGE_RATE = 35.0`
  - Filters: `AiCostFilters`, `DEFAULT_AI_COST_FILTERS`
  - Utilities: `computeTokenCostUsd` (separate input/output rates), `computeRoiPct`, `usdToThb`
  - 6 mappers (DB row → app type)
- **`src/ai-cost/aiCostEstimationStore.ts`** — `useAiCostEstimationStore` Zustand store
  - 16 actions across 4 domains; ENTERPRISE plan gate on all write actions
  - Cost Models: `fetchCostModels`, `createCostModel`, `updateCostModel`, `deactivateCostModel`
  - Usage Logs: `logUsage` (auto-computes cost from active model), `fetchUsageLogs` (with filter support), `fetchUsageSummary`
  - Task Estimates: `createTaskEstimate` (auto-computes multi-model cost + ROI), `fetchTaskEstimates`, `updateActuals`, `fetchTaskRoi`
  - Budget Periods: `fetchBudgetPeriods`, `createBudgetPeriod`, `updateBudgetPeriod`
  - UI: `setFilters`, `clearError`; separate loading flags per domain

### Merged
- **PR #77** — `feature/v17-5-super-employee-panel` → `main` (squash merge `af6f329b`)
- **Tag:** `v17.5.1` → `8a7a6be8`

---

## [v17.5.0] — Training Tracker + Super Employee Tracker — 2027-01-15

### Added

#### Training Tracker — Types & Schema (`src/training/`, `supabase/migrations/`)
- **`src/training/trainingTypes.ts`** — complete TypeScript type system for Training Tracker module
  - `TrainingCourseCategory` union (8 values): `AI_LITERACY`, `SAFETY`, `QUALITY`, `MACHINE_OPERATION`, `SOFT_SKILLS`, `COMPLIANCE`, `LEADERSHIP`, `TECHNICAL`
  - `TrainingStatus` union (4 values): `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `EXPIRED`
  - `TRAINING_PLAN_GATE = 'PROFESSIONAL'` — PROFESSIONAL+ gated feature
  - `TrainingCourse`, `TrainingEnrollment`, `TrainingCompletion` interfaces
  - `TrainingCourseFilters`, `DEFAULT_TRAINING_FILTERS`, `TrainingTrackerState`
  - `SuperEmployeeStage`-linked seed courses (AI Literacy ×3 covering AI_UNAWARE → SUPER_EMPLOYEE progression)
- **`supabase/migrations/20270101_training_tracker.sql`** — Training Tracker schema
  - `training_courses`, `training_enrollments`, `training_completions` tables
  - `tt_is_professional_plus()` plan gate helper, `tt_set_completion_passed` + `tt_sync_enrollment_completed` triggers
  - `training_progress_v` + `org_training_summary_v` views (SECURITY INVOKER)
  - RLS policies — tenant isolation; ADMIN+ for course management; employees see own records
  - 10 global seed courses (AI Literacy ×3 mapped to SuperEmployeeStage progression)

#### Training Tracker — Store & Components
- **`src/training/trainingStore.ts`** — Zustand store with `fetchCourses`, `enroll`, `logCompletion`, `bulkEnroll` actions
  - `TrainingPlanGateError` class — thrown when org plan < PROFESSIONAL
  - `logCompletion` — optimistic update reverted on error
- **`src/training/TrainingCourseList.tsx`** — course list UI with PROFESSIONAL+ plan gate wall, `SuperEmployeeStage` filter, isAdmin enroll button
- **`src/training/TrainingEnrollmentPanel.tsx`** — bulk enrollment panel with employee tag add/remove, due date picker, status timeline, and error banner
  - 15 `data-testid` attributes for full test coverage

#### Training Tracker — Tests & Stories
- **`src/training/__tests__/trainingTypes.test.ts`** — type system unit tests
- **`src/training/__tests__/trainingStore.test.ts`** — 55 Vitest tests covering all actions, `TrainingPlanGateError` guard, and `logCompletion` optimistic update rollback
- **`src/training/__tests__/TrainingEnrollmentPanel.test.tsx`** — ~30 Vitest tests across 6 describe blocks: plan gate wall, employee tag add, employee tag remove, submit button disabled state, bulkEnroll error path, enrollment timeline
- **`src/training/TrainingCourseList.stories.tsx`** — 10 Storybook stories: plan gate wall, loading, empty, PROFESSIONAL plan, isAdmin enroll flow, stage filter states

#### Super Employee Tracker — Types, Store & Schema
- **`src/training/superEmployeeTypes.ts`** — TypeScript types for AI Readiness stage progression
  - DB row interfaces: `AiAssessmentRow`, `StageHistoryRow`, `SkillGapRow`, `EmployeeReadinessRow`, `OrgReadinessSummaryRow`
  - App-layer interfaces: `AiAssessment`, `StageHistoryEntry`, `SkillGap`, `EmployeeAiReadiness`, `OrgAiReadinessSummary`
  - Plan gate: `canAccessSuperEmployeeTracker`, `SuperEmployeeTrackerPlanGateError`
  - Constants: `STAGE_SCORE_MAP`, `STAGE_PROGRESSION_ORDER`, `AI_READINESS_THRESHOLD_STAGE` = `AI_ASSISTED`, `AI_READINESS_SCORE_THRESHOLD` = 50
  - Utilities: `getNextStage`, `isStageAdvancement`; mappers for all 5 row types
- **`src/training/superEmployeeStore.ts`** — Zustand store `useSuperEmployeeStore` with 9 actions
  - `fetchStageHistory`, `fetchAssessments`, `fetchSkillGaps`, `fetchEmployeeReadiness`, `fetchOrgReadiness`
  - `recordStageTransition`, `createAssessment`, `addSkillGap`, `resolveSkillGap` — PROFESSIONAL+ gated, optimistic updates
  - `clearError`
- **`supabase/migrations/20270115_super_employee_tracker.sql`** — Super Employee Tracker schema
  - `employee_ai_assessments`, `employee_stage_history` (append-only), `employee_skill_gaps` tables
  - `employee_ai_readiness_v` (DISTINCT ON latest stage per employee) + `org_ai_readiness_summary_v` (stage distribution + AI readiness rate) views
  - RLS policies mirror training_tracker pattern; OWNER-only DELETE on stage_history for audit preservation
  - 5 indexes; ASSERTION block verifies 3 tables + 2 views + RLS enabled

#### Super Employee Tracker — Tests & Components (Tasks 41–43)
- **`src/training/__tests__/superEmployeeStore.test.ts`** — ~95 Vitest tests across 11 describe blocks
  - `SuperEmployeeTrackerPlanGateError` guard (4 tests), `canAccessSuperEmployeeTracker` via `it.each` (4 tests), `STAGE_SCORE_MAP` constants (2 tests)
  - Plan gate enforcement on `recordStageTransition`, `createAssessment`, `addSkillGap`, `resolveSkillGap` (9 tests)
  - `recordStageTransition` success (5 tests) + error (1 test)
  - `resolveSkillGap` success with state update (4 tests) + error — no pre-mutation to roll back (2 tests)
  - `clearError` (2 tests), `fetchStageHistory` (4 tests), `fetchSkillGaps` (3 tests)
  - Thenable Proxy mock + `supabase.auth.getUser` stub; uses `useSuperEmployeeStore.setState(INITIAL_STATE)` for reset
- **`src/training/SuperEmployeeProgressPanel.tsx`** — stage progression timeline UI component
  - Props: `orgId`, `orgPlan`, `employeeId`, `employeeName?`, `isAdmin?`
  - Plan gate wall for < PROFESSIONAL; fetches `employeeReadiness`, `stageHistory`, `skillGaps` on mount
  - 5-step stage timeline using `STAGE_PROGRESSION_ORDER` + `STAGE_SCORE_MAP` with `data-stage` + `data-status` attributes
  - AI Readiness badge rendered at `AI_ASSISTED` threshold (score ≥ 50)
  - Admin-only `resolve-gap-btn`; `no-gaps-message` empty state
  - Loading skeleton (`panel-loading`); full set of 14 `data-testid` attributes
- **`src/training/TrainingEnrollmentPanel.stories.tsx`** — 8 CSF3 Storybook stories
  - `withEnrollmentStore` decorator injects store state via `useTrainingStore.setState()`
  - `Default`, `PlanGateWallFree`, `PlanGateWallStarter`, `WithExistingEnrollments`, `TimelineLoading`, `StoreError`
  - `BulkEnrollSuccess` — play interaction: type employee ID → Enter → submit → spy assertion
  - `BulkEnrollErrorPath` — play interaction: submit with rejected mock → verify error banner text

#### Storybook (Process Templates — v17.0 enhancement)
- **`CloneFlowInteraction`** story added to `src/jobs/ProcessTemplateList.stories.tsx` (now 12 stories)
  - Interaction test: click clone button → await spy called with correct `templateId` → verify toast visible

#### GitHub Issue Templates
- **`.github/ISSUE_TEMPLATE/v17-process-templates-bug.yml`** — bug report template for v17.0 Process Templates
  - Labels: `bug`, `v17-process-templates`; 8 fields including affected component (ProcessTemplateList / BottleneckHeatmap / Both)

### Merged
- **PR #76** — `feature/v17-5-training-tracker-stories` → `main` (squash merge `3a819c17`)
- **PR #77** — `feature/v17-5-super-employee-panel` → `main` (Super Employee tests + ProgressPanel + EnrollmentPanel stories) — pending
- **Tag:** `v17.5.0` → `3a819c17d70d1c399a6a336a1cd2df5708b9a40a`

---

## [v17.0.0] — Process Templates Module — 2026-12-01

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
