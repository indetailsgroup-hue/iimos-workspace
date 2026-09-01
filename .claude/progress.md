# Monolith Implementation Progress

## v17.5 — Training Tracker + Super Employee Tracker (✅ Released 2027-01-15 | Tasks 41–43 in PR #77)

**Branch:** `feature/v17-5-training-tracker-stories` (merged) | **PR:** #76 (merged, squash `3a819c17`) | **Tag:** v17.5.0
**PR #77:** `feature/v17-5-super-employee-panel` → main | Commit: `f685dbd6` | Status: pending merge

### ✅ All completed (Tasks 1–40 via PR #76)
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
- `CHANGELOG.md` — v17.5.0 released entry

### 🔄 In PR #77 (Tasks 41–43, committed `f685dbd6`)
- `src/training/__tests__/superEmployeeStore.test.ts` — ~95 Vitest tests; 11 describe blocks; plan gate guard, recordStageTransition, resolveSkillGap (no pre-mutation), fetchStageHistory, fetchSkillGaps, clearError; thenable Proxy mock + auth.getUser stub
- `src/training/SuperEmployeeProgressPanel.tsx` — 5-step stage timeline; AI Readiness badge at AI_ASSISTED+; admin resolve gap; plan gate wall; loading skeleton; 14 data-testids
- `src/training/TrainingEnrollmentPanel.stories.tsx` — 8 CSF3 stories; `withEnrollmentStore` decorator; BulkEnrollSuccess + BulkEnrollErrorPath play interactions

### 📋 Next (optional)
- Storybook stories for `SuperEmployeeProgressPanel.tsx` (plan gate wall, loading, stage timeline states, skill gap list with resolve)

**Last updated:** 2027-01-16

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

*Last updated: 2027-01-15*
