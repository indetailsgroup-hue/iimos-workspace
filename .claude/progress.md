# Monolith Implementation Progress

## v17.5 — Training Tracker Module (🚧 In Progress — Q1 2027)

**Branch:** `feature/v17-5-training-tracker-stories` | **PR:** #76 (open) | **Commit:** d7a56e91

### ✅ Committed to branch
- `supabase/migrations/20270101_training_tracker.sql` — 3 tables (`training_courses`, `training_enrollments`, `training_completions`), `tt_is_professional_plus()` plan gate helper, 2 triggers, 2 views, RLS, 10 global seed courses
- `src/training/trainingTypes.ts` — full type system: `TrainingCourseCategory` (8), `TrainingStatus` (4), `TRAINING_PLAN_GATE`, all interfaces + filters + `TrainingTrackerState`
- `src/jobs/ProcessTemplateList.stories.tsx` — appended `CloneFlowInteraction` story (now 12 stories); module-level `cloneGlobalTemplateSpy = fn(...)`
- `.github/ISSUE_TEMPLATE/v17-process-templates-bug.yml` — bug report template; labels: `bug`, `v17-process-templates`

### 🔜 Pending
- [ ] `src/training/trainingStore.ts` — Zustand store
- [ ] `src/training/TrainingCourseList.tsx` — course browser UI
- [ ] `src/training/TrainingEnrollmentPanel.tsx` — enrollment UI
- [ ] Vitest unit tests for trainingTypes + trainingStore
- [ ] Storybook stories for Training Tracker components
- [ ] Merge PR #76 → main + release tag v17.5.0

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
