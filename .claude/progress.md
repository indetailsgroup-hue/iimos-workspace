# Monolith Implementation Progress

## v17.0 — Process Templates Module (🚧 In Progress — Q4 2026)

### ✅ Completed this session
- `supabase/migrations/20261201_process_templates.sql` — schema: job_templates, job_template_stages, time_in_stage_log, bottleneck_heatmap_v view, RLS, 5 global seed templates
- `supabase/migrations/20261201_process_templates_rollback.sql` — full rollback (IF EXISTS, CASCADE)
- `src/jobs/processTemplateTypes.ts` — full TypeScript type system (PlanGate, meetsplanGate, BottleneckSeverity, etc.)
- `src/jobs/processTemplateStore.ts` — Zustand store with PlanGateError, CRUD, bottleneck analytics (PROFESSIONAL+ gated)
- `src/jobs/ProcessTemplateList.tsx` — template browser UI with category filter, plan gate badge, clone action
- `src/jobs/BottleneckHeatmap.tsx` — PROFESSIONAL+ heatmap with severity coloring, summary bar
- `src/jobs/__tests__/processTemplateTypes.test.ts` — 30 pure TS tests
- `src/jobs/__tests__/processTemplateStore.test.ts` — 28 Vitest tests (PlanGateError + store actions)
- `src/tenant/types.ts` — PLAN_LIMITS updated: process_templates (STARTER+), bottleneck_heatmap (PROFESSIONAL+)
- `CHANGELOG.md` — v17.0.0 section added

### 🔜 Remaining v17.0
- [ ] Storybook stories for ProcessTemplateList + BottleneckHeatmap
- [ ] E2E / Playwright tests for ProcessTemplateList
- [ ] supabase-db-lint CI green on 20261201_process_templates.sql
- [ ] PR + merge to main + release tag v17.0.0

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
