# Monolith Implementation Progress

## v18.0 — Interactive OrgChart, Role Network View, QC Anomaly Detection, AI Quotation Draft, Leadership Action Tracker (🔜 Active — Q2 2027)

### ✅ Completed (v18.0 — sprint 1: Interactive OrgChart schema + types + store)
- `supabase/migrations/20270201_interactive_orgchart.sql` — `org_chart_nodes`, `org_reporting_lines`, `org_chart_hierarchy_v` (recursive CTE), `oc_is_professional_plus()`, trigger, 6 indexes, 7 RLS policies, assertion block
- `src/orgchart/orgChartTypes.ts` — `OrgNodeType`/`OcLineType` unions; DB + app-layer types; 4 payloads; `OcFilters`/`DEFAULT_OC_FILTERS`; `canAccessOrgChart`/`OrgChartPlanGateError`; Thai label constants; `mapOcNodeRow`, `mapOcReportingLineRow`, `buildOcTree`, `flattenOcTree`
- `src/orgchart/orgChartStore.ts` — `useOrgChartStore`; 7 async actions (PROFESSIONAL+ gated writes); `moveNode` optimistic drag update; `fetchChart` parallel fetch + tree build; UI helpers: `selectNode`, `toggleExpand`, `setDragging`, `setFilters`, `clearError`

### ✅ Completed (v18.0 — sprint 2: OrgChartCanvas UI + orgChartTypes tests + Role Network View schema/types/store)
- `src/orgchart/OrgChartCanvas.tsx` — PROFESSIONAL+-gated canvas; `NodeCard`/`ReportingLinesSvg`/`NodeDetailPanel` sub-components; pointer-event drag with `dragState` useRef; `moveNode` on pointerUp; reporting line toggle; node detail panel with line type swap
- `src/orgchart/__tests__/orgChartTypes.test.ts` — 42 Vitest unit tests (all passing); 8 describe blocks: `canAccessOrgChart` plan gate, `buildOcTree` parent-child wiring, `flattenOcTree` depth-first order, `mapOcNodeRow` depth/path fields, and mappers/payloads/constants
- `supabase/migrations/20270205_role_network_view.sql` — `rnv_roles`, `rnv_role_relationships`, `rnv_employee_roles`; `rnv_role_network_v` view (current_headcount + relationship_count); `rnv_is_enterprise()` gate; full RLS; 8 indexes; assertion block
- `src/role-network/roleNetworkTypes.ts` — `RnvRelationshipType` (5 types) + `RnvSeniority` (5 levels); DB + app-layer types; payloads; `canAccessRoleNetwork`/`RoleNetworkPlanGateError` (ENTERPRISE only); Thai label constants; mappers
- `src/role-network/roleNetworkStore.ts` — `useRoleNetworkStore`; 8 ENTERPRISE-gated actions; `fetchNetwork` parallel fetch; `deleteRole` immediate local cleanup (cascades relationships/employeeRoles, resets selectedRoleId)

### ✅ Completed (v18.0 — sprint 3: OrgChartCanvas stories + orgChartStore tests + RoleNetworkCanvas UI)
- `src/orgchart/OrgChartCanvas.stories.tsx` — 10 CSF3 Storybook stories; `withOrgChartStore` decorator; stories cover plan gate, empty, node drag, reporting line toggle, node detail panel; `userEvent` play functions; `fn()` spies
- `src/orgchart/__tests__/orgChartStore.test.ts` — 34 Vitest unit tests (**all passing**); plan gate on all 6 write actions, `moveNode` optimistic update + rollback + error persistence, `fetchChart` tree build, `deleteNode` cascade
- `src/orgchart/orgChartStore.ts` — fix: `moveNode` catch block re-ordered (`fetchChart` → `set({error})`) to preserve error after rollback re-fetch
- `src/role-network/RoleNetworkCanvas.tsx` — ENTERPRISE-gated canvas; `computeNodePositions`/`computeCanvasSize` layout utils; sub-components: `RoleNodeCard` (seniority + headcount badges), `RelationshipEdgesSvg` (SVG arrowheads + dashed DEPENDS_ON + Thai labels), `RoleDetailPanel` (add/remove relationship controls); all data-testids; named + default export

### 📋 Remaining v18.0 tasks (sprint 4+)
- Storybook stories for `RoleNetworkCanvas.tsx`
- Vitest unit tests for `roleNetworkStore.ts`
- QC Anomaly Detection module (schema + types + store + UI)
- AI Quotation Draft module
- Leadership Action Tracker module

---

## v17.5 — Training Tracker + Super Employee Tracker + AI Cost Estimation (✅ v17.5.0 Released 2027-01-15 | v17.5.1 Released 2027-01-20)

**Tag v17.5.0:** `3a819c17` | **Tag v17.5.1:** `8a7a6be8`
**PR #76:** merged (squash `3a819c17`) | **PR #77:** merged (squash `af6f329b`)

### ✅ All completed (v17.5.0 — Tasks 1–40 via PR #76 + PR #77)
- `supabase/migrations/20270101_training_tracker.sql` — 3 tables, `tt_is_professional_plus()`, 2 triggers, 2 views, RLS, 10 seed courses
- `src/training/trainingTypes.ts` — full type system (8 categories, 4 statuses, plan gate, all interfaces)
- `src/training/trainingStore.ts` — Zustand store; `TrainingPlanGateError`; fetchCourses, enroll, logCompletion (optimistic), bulkEnroll, CRUD
- `src/training/__tests__/trainingTypes.test.ts` — 50+ Vitest tests
- `src/training/__tests__/trainingStore.test.ts` — 55 Vitest tests; plan gate FREE/STARTER/PROFESSIONAL/ENTERPRISE; optimistic rollbacks
- `src/training/TrainingCourseList.tsx` — PROFESSIONAL+ gate, debounced search, category/stage/isActive filters, enroll button
- `src/training/TrainingEnrollmentPanel.tsx` — bulk enroll; employee tag add/remove; due date picker; status timeline; 15 data-testids
- `src/training/__tests__/TrainingEnrollmentPanel.test.tsx` — ~30 Vitest tests; plan gate wall, tag add/remove, bulkEnroll error path, timeline
- `src/training/TrainingCourseList.stories.tsx` — 10 Storybook stories incl. AdminEnrollFlow interaction test
- `src/training/superEmployeeTypes.ts` — AI Readiness types; `SuperEmployeeTrackerPlanGateError`; `STAGE_PROGRESSION_ORDER`; mappers ×5
- `src/training/superEmployeeStore.ts` — `useSuperEmployeeStore`; 9 actions; PROFESSIONAL+ gated writes; `resolveSkillGap` optimistic update
- `supabase/migrations/20270115_super_employee_tracker.sql` — `employee_ai_assessments`, `employee_stage_history`, `employee_skill_gaps`; 2 views; RLS; assertion block
- `src/jobs/ProcessTemplateList.stories.tsx` — `CloneFlowInteraction` story appended (12 total)
- `.github/ISSUE_TEMPLATE/v17-process-templates-bug.yml` — bug report template (labels: bug, v17-process-templates)

### ✅ All completed (v17.5.1 — Tasks 41–45, merged PR #77 + direct to main)
- `src/training/__tests__/superEmployeeStore.test.ts` — ~95 Vitest tests; 11 describe blocks; plan gate guard, recordStageTransition, resolveSkillGap (no pre-mutation), fetchStageHistory, fetchSkillGaps, clearError; thenable Proxy mock + auth.getUser stub
- `src/training/SuperEmployeeProgressPanel.tsx` — 5-step stage timeline; AI Readiness badge at AI_ASSISTED+; admin resolve gap; plan gate wall; loading skeleton; 14 data-testids
- `src/training/TrainingEnrollmentPanel.stories.tsx` — 8 CSF3 stories; `withEnrollmentStore` decorator; BulkEnrollSuccess + BulkEnrollErrorPath play interactions
- `src/training/SuperEmployeeProgressPanel.stories.tsx` — 11 CSF3 stories; `withProgressStore` decorator; all 5 stage timeline states verified; AdminResolveInteraction play test
- `supabase/migrations/20270120_ai_cost_estimation.sql` — 4 tables, 2 views, `ace_is_enterprise()`, full RLS, 6 indexes, assertion block (ENTERPRISE plan)
- `src/ai-cost/aiCostEstimationTypes.ts` — complete type system; 6 union types; 6 DB row + 6 app-layer types; 5 payloads; plan gate + error; constants + utilities + 6 mappers
- `src/ai-cost/aiCostEstimationStore.ts` — `useAiCostEstimationStore`; 16 actions across 4 domains; auto-compute cost in logUsage + createTaskEstimate; ENTERPRISE gate

### ✅ All completed (v17.5.2 — AI Cost Estimation tests + dashboard + stories)
- `src/ai-cost/__tests__/aiCostEstimationTypes.test.ts` — pure unit tests; plan gate, canAccess, computeTokenCostUsd, computeRoiPct, usdToThb, DEFAULT_AI_COST_FILTERS, label constants, all 6 mappers
- `src/ai-cost/__tests__/aiCostEstimationStore.test.ts` — thenable Proxy mock; plan gate on all 8 write actions, clearError, setFilters, fetchCostModels, logUsage cost computation (all 5 CostUnit types), createTaskEstimate ROI, updateActuals
- `src/ai-cost/AiCostDashboard.tsx` — ENTERPRISE-gated; summary cards, budget utilization (progress bar + over-threshold warning), monthly trend (CSS bar chart), usage-by-tool table; 20 data-testids
- `src/ai-cost/AiCostDashboard.stories.tsx` — 8 CSF3 stories; withDashboardStore decorator; PlanGateWallFree, PlanGateWallProfessional, DashboardLoading, EmptyState, WithUsageData (play assertions), WithBudgetUtilization, BudgetOverThreshold (play assertion), AdminView, StoreError

### ✅ All completed (v17.5.5 — AiSchedulerBoard Stories & Tests + CultureDashboard UI)
- `src/ai-scheduler/AiSchedulerBoard.stories.tsx` — 12 CSF3 stories: PlanGateWallFree, PlanGateWallProfessional, EmptyRuns, 8×Timeline (all statuses), WithApproveAction, WithCancelAction; fn() spies; play functions with userEvent.click + dataset assertions
- `src/ai-scheduler/__tests__/AiSchedulerBoard.test.tsx` — 16 tests (plan gate ×4, timeline attributes ×5, approve btn ×7); all passing; vi.mock auto-mock + fireEvent pattern
- `src/culture-metrics/CultureDashboard.tsx` — PROFESSIONAL+-gated dashboard; surveys/eNPS-results/org-health sections; SurveyCard/EnpsResultCard/HealthMetricRow sub-components; 13 data-testids

### ✅ All completed (v17.5.4 — AiSchedulerBoard + APS Store Tests + Culture Metrics Store Tests)
- `src/ai-scheduler/AiSchedulerBoard.tsx` — ENTERPRISE-gated board; two-panel layout; `RunCard` with approve/cancel; `RunStatusTimeline` (6 steps + terminal CANCELLED/FAILED branch); items table + override badge; 20 data-testids
- `src/ai-scheduler/__tests__/aiSchedulerStore.test.ts` — 33 tests (plan gate ×27, auto-sequence ×4, approveRun auth write ×3, updateItemStatus is_overridden ×3, setFilters ×2, clearError ×2); all passing
- `src/culture-metrics/__tests__/cultureMetricsStore.test.ts` — 36 tests (plan gate ×12, submitEnpsResponse exemption ×5, fetchEnpsResults ×6, setFilters ×2, clearError ×2); all passing

### ✅ All completed (v17.5.3 — AI Production Scheduler + Culture Metrics Dashboard + AiCostDashboard tests)
- `supabase/migrations/20270125_ai_production_scheduler.sql` — `aps_schedule_runs`, `aps_schedule_items` (`depends_on UUID[]`, `ai_confidence_score`), `aps_run_events`; `aps_run_summary_v`; ENTERPRISE gate; RLS; 6 indexes
- `src/ai-scheduler/aiSchedulerTypes.ts` — `ApsRunStatus` (7 states), `ApsItemStatus`, `ApsEventType`; DB + app-layer types; payloads; `AiSchedulerPlanGateError`; label constants; 4 mappers
- `src/ai-scheduler/aiSchedulerStore.ts` — `useAiSchedulerStore`; 5 fetch + 5 write actions (ENTERPRISE gate); `addScheduleItem` auto-sets `sequence_order`; `approveRun` writes `approved_by`/`approved_at`; `updateItemStatus` sets `is_overridden` when `overrideReason` provided
- `supabase/migrations/20270125_culture_metrics_dashboard.sql` — `cmd_metric_definitions`, `cmd_metric_snapshots`, `cmd_enps_surveys`, `cmd_enps_responses` (no user_id); `cmd_org_health_v`, `cmd_enps_results_v` (hides until `min_responses`); PROFESSIONAL+ gate; RLS
- `src/culture-metrics/cultureMetricsTypes.ts` — `CmdMetricCategory`, `CmdSnapshotTrend`, `CmdSurveyStatus`, `CmdHealthTier`; DB + app-layer types; payloads; `CultureMetricsPlanGateError`; `DEFAULT_CMD_FILTERS`; 6 mappers
- `src/culture-metrics/cultureMetricsStore.ts` — `useCultureMetricsStore`; 14 actions; PROFESSIONAL+ gate on writes; `submitEnpsResponse` exempt (anonymous survey); queries 4 tables + 2 views
- `src/ai-cost/__tests__/AiCostDashboard.test.tsx` — 10 Vitest tests: plan gate (FREE/PROFESSIONAL), loading, empty states, 4 summary cards, budget over-threshold (90% ≥ 80%), budget under-threshold, 3 trend bars, error banner, admin upgrade copy

### ✅ Completed (v17.5.5)
- AI Production Scheduler UI (AiSchedulerBoard stories + component tests)
- Culture Metrics Dashboard UI (CultureDashboard.tsx)

### ✅ Completed (v17.5.6) — v17.5 FULLY COMPLETE
- `src/culture-metrics/CultureDashboard.stories.tsx` — 11 CSF3 Storybook stories; `withCultureStore` decorator; `activateSpy`/`closeSpy` fn() spies; play functions for ActivateSurveyAction + CloseSurveyAction
- `src/culture-metrics/__tests__/CultureDashboard.test.tsx` — 24 Vitest tests all passing; covers plan gate, loading, error, surveys, eNPS results, org health

**Last updated:** 2027-02-10

---

## v17.0 — Process Templates Module (✅ Released 2026-12-01)

**Release tag:** v17.0.0 | **PR:** #75 (merged) | **Merge SHA:** 7d9e0467

### ✅ All completed
- `supabase/migrations/20261201_process_templates.sql` — 3 tables, 1 view, 3 fn, 12 RLS, 5 seed templates
- `supabase/migrations/20261201_process_templates_rollback.sql` — full rollback
- `src/jobs/processTemplateTypes.ts` — PlanGate, meetsplanGate, BottleneckSeverity, all interfaces
- `src/jobs/processTemplateStore.ts` — Zustand store, PlanGateError, CRUD, PROFESSIONAL+ analytics
- `src/jobs/ProcessTemplateList.tsx` — template browser (search, category, global filter, plan gate)
- `src/jobs/BottleneckHeatmap.tsx` — PROFESSIONAL+ heatmap, severity coloring, summary bar
- `src/jobs/__tests__/processTemplateTypes.test.ts` — 30 tests
- `src/jobs/__tests__/processTemplateStore.test.ts` — 28 tests
- `src/jobs/ProcessTemplateList.stories.tsx` — 11 Storybook stories
- `src/jobs/BottleneckHeatmap.stories.tsx` — 11 Storybook stories
- `src/jobs/__tests__/ProcessTemplateList.visual.spec.ts` — 12 Playwright visual snapshots
- `src/jobs/__tests__/BottleneckHeatmap.visual.spec.ts` — 14 Playwright visual snapshots
- `src/tenant/types.ts` — PLAN_LIMITS updated (process_templates + bottleneck_heatmap)
- `CHANGELOG.md` — v17.0.0 released
- PR #75 merged, release tag v17.0.0 published ✅

---

## v16.0.0 — People & Culture Foundation (✅ Released 2026-08-28)

## Completed Systems (Summary)

- **Key Management v0.4–v0.10**: Ed25519 import, scope enforcement, admin override, signed revocation policy, policy precedence, auto requirePolicy in FACTORY
- **Release Workflow**: Spec state machine, snapshot, gate report, manifest signing, artifact bundles
- **Cabinet System**: Parametric calculations, panels, compartments, materials, 3D viz, construction type selector, BIM classification
- **3D Scene Tools**: Transform controls, snap system, Plasticity-style hotkeys
- **Manufacturing Calculators**: CNC tool panel, kerf bending, hidden door hinge, wainscoting, slat
- **Safety Gates**: G4 geometry, G11 minifix/system32 (36 tests), v4.1 bolt position fix (PRODUCTION-READY)
- **Gate UI**: GateStatusIndicator, SafetyPanel, RightInspector, GateSceneHighlights
- **DXF Export v0.11**: CAD-ready DXF with drilling patterns
- **Spec Lineage P9/P9.1**: FE + server-anchored append-only audit trail
- **CNC Pipeline v2.1.0**: DrillMap→OpGraph→G-code, ZIP bundles, cache, re-verify, tool wear D6/D6.1
- **Export**: Cut list CSV, manifest JSON, trust chain viewer
- **Connector OS v1.1**: NCenterPolicy, G11.6-8, EdgeBandMap, Gems catalog (24 new tests)

## Pending

- [ ] v0.12 TBD
- [ ] Drawer system, Door/hinge system
- [ ] Label generation
- [ ] Multi-signature release approval
- [ ] Push to GitHub (auth pending)

*Last updated: 2026-02-16*
