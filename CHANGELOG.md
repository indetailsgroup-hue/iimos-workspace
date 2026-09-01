# MONOLITH Manufacturing OS — Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

## Prior Releases

| Version | Summary |
|---------|---------|
| v16.8.0 | withSuperAdminGuard HOC + migration 0174 |
| v16.7.0 | ... |
| v16.6.0 | ... |
| v16.5.0 | ... |
| v16.4.0 | ... |

> Full history: `git log --oneline`
