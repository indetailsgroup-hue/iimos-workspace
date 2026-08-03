# MONOLITH Cockpit Contract First — Wave 1 Implementation Plan

> **Required subskills for execution:** Use `using-git-worktrees` before implementation, `test-driven-development` for Tasks 1–4, `verification-before-completion` before every completion claim, and `requesting-code-review` before integration. If executing through fresh agents, use `subagent-driven-development`.

**Goal:** Prove a safe, comprehensible Project Cockpit contract for studio owners, project managers, and designers without creating a new source of truth or connecting an unverified project/role identity to production actions.

**Architecture:** Build a pure, discriminated read-model contract first. It accepts either an unresolved context or a server-confirmed project/job identity, derives exactly one safest next action, and renders a calm Human Action First cockpit without reading global stores, URL aliases, local storage, or role state. Share the existing NOT-FOR-PRODUCTION status through a component mounted on reachable application roots. Demonstrate the contract only through a development-only, visibly non-authoritative preview. Production route integration remains blocked until Project Context Foundation exists and the usability gate passes.

**Tech Stack:** TypeScript 5.2, React 18, React Router 6, Vitest 3, React Testing Library, Playwright 1.58, CSS custom properties, and the repository documentation renderer.

---

## Global Constraints

- Execute in an isolated worktree created from nested product repository commit `66b0a38d`. The parent repository is governance/bootstrap; the nested `determined-williams/` repository is the product source.
- Before implementation, record `git status --short` separately in both repositories. Preserve all pre-existing changes, especially generated `dist/` files, Daph exports, Supabase adapter work, LINE tests, research documents, and Python caches.
- Do not integrate Project Cockpit into `/projects/:projectId`, `/factory`, or any production-facing route in this wave.
- New Cockpit code must not import `useCabinetStore`, `useSpecStore`, `useVerifyStatusStore`, `roles.ts`, or any local-storage authority.
- Keep `projectId` and `jobId` as separate typed fields. Never derive one from the other.
- Only `authoritySource: 'SERVER'` may produce a confirmed context. Unresolved, ambiguous, missing, stale, loading, unknown, or error states must fail closed.
- Do not add Studio Brand configuration, field/customer profiles, LINE integration, database migrations, Supabase changes, `shadowMode`, Tailwind configuration, or generated build artifacts.
- Preserve visible `NOT-FOR-PRODUCTION` status. This plan must not add a Start Factory, Start Production, Release, Approve, or equivalent irreversible action.
- Styling may add only invariant semantic safety tokens and the two prototype surface profiles `calm` and `workspace`. Brand customization is deferred.
- Interactive targets must be at least 44 × 44 CSS pixels. Body text must be at least 14 px; 12 px is reserved for metadata.
- Do not claim that the experience is “beloved” from implementation evidence alone. That claim requires observed user evidence.
- Any project-facing validation record must be delivered as aligned English and Thai Markdown plus standalone English and Thai HTML.

## Repository Evidence Behind This Sequence

- The current project route converts the URL project identifier into a job identifier before reading global stores; verification APIs then construct endpoints from that job identifier. This is not sufficient authority for a cross-role cockpit.
- No current `ProjectContext`, `project_context`, `tenant_id`, or `organization_id` contract was found in product source or migrations during scrutiny.
- `FactoryLayout` is defined but not mounted by the current factory runtime; `FactoryApp` renders `Dashboard` or `JobDetail` directly.
- `/factory` access is currently guarded by a role read from local storage, so this wave must not treat route access as proof of authority.

These findings make Project Context Foundation a prerequisite for runtime integration. This wave therefore proves the Cockpit contract and comprehension before adding that foundation or touching production routes.

## Approved Architecture Sequence and Wave Boundary

| Order | Architecture layer | Treatment in this plan |
|---:|---|---|
| 1 | **Project Context Foundation** | Required prerequisite; represented only as `CONFIRMED` or `UNRESOLVED`. No foundation is invented here. |
| 2 | **Project Cockpit Read Model** | Wave 1 scope: pure snapshot, safest-next-action contract, UI prototype, and usability evidence. It remains non-authoritative. |
| 3 | **One Decision Pipeline** | Deferred until context authority passes; first pipeline will be client design approval. |
| 4 | **One Exception Projection** | Deferred; first projection will be a factory blocker after the decision pipeline has an authoritative base. |
| 5 | **Effect Ledger/Outbox** | Deferred; required before background effects or partial-failure operations. |
| 6 | **Role Views and LINE Channels** | Deferred until authority, pipeline, exception, and effects are trustworthy. |

This table is a dependency order, not six parallel workstreams. Completing Wave 1 does not authorize Layers 1 or 3–6.

## File Structure

```text
src/
  components/layout/
    SafetyStatusBanner.tsx                         # Shared invariant NFP status
    __tests__/SafetyStatusBanner.test.tsx          # Shared and reachable-root assertions
  features/project-cockpit/
    model.ts                                       # Pure read-model and safest-action derivation
    fixtures.ts                                    # Dev-only non-authoritative fixtures
    ProjectCockpit.tsx                             # Pure Human Action First view
    projectCockpit.css                             # Calm/workspace prototype profiles
    CockpitPreviewPage.tsx                         # Development-only preview surface
    __tests__/
      model.test.ts
      ProjectCockpit.test.tsx
  factory/FactoryApp.tsx                           # Mount shared NFP banner on reachable branches
  components/layout/AppShell.tsx                   # Replace inline NFP markup with shared banner
  routes/index.tsx                                 # Add DEV-gated preview route only
  index.css                                        # Add invariant semantic aliases only if required
e2e/
  cockpit-contract.spec.ts                         # Rendered contract and accessibility checks
docs/superpowers/reports/
  2026-08-03-monolith-cockpit-wave-1-validation.en.md
  2026-08-03-monolith-cockpit-wave-1-validation.en.html
  2026-08-03-monolith-cockpit-wave-1-validation.th.md
  2026-08-03-monolith-cockpit-wave-1-validation.th.html
```

## Task 1: Define the Snapshot and Safest-Next-Action Contract

**Files:**

- Create: `src/features/project-cockpit/model.ts`
- Create: `src/features/project-cockpit/__tests__/model.test.ts`

### Step 1: Write failing contract tests

Create `model.test.ts` with table-driven cases for every fail-closed boundary:

```ts
import { describe, expect, it } from 'vitest';
import {
  deriveProjectCockpitSnapshot,
  type CockpitProjectionInput,
} from '../model';

const confirmed = {
  status: 'CONFIRMED' as const,
  authoritySource: 'SERVER' as const,
  projectId: 'project-24',
  jobId: 'job-872',
  projectName: 'Sukhumvit Residence',
  siteLabel: 'Bangkok',
  revision: 'R07',
  fetchedAtMs: 1_786_000_000_000,
};

function input(
  overrides: Partial<CockpitProjectionInput> = {},
): CockpitProjectionInput {
  return {
    context: confirmed,
    specState: 'DRAFT',
    verifyState: 'UNKNOWN',
    shadowNfp: true,
    stale: false,
    ...overrides,
  };
}

describe('deriveProjectCockpitSnapshot', () => {
  it('blocks all actions when project authority is unresolved', () => {
    const snapshot = deriveProjectCockpitSnapshot(input({
      context: { status: 'UNRESOLVED', reason: 'FOUNDATION_UNAVAILABLE' },
    }));

    expect(snapshot.primaryAction).toEqual(expect.objectContaining({
      kind: 'CONTEXT_BLOCKED',
      enabled: false,
    }));
    expect(snapshot.context.status).toBe('UNRESOLVED');
  });

  it('keeps projectId and jobId distinct', () => {
    const snapshot = deriveProjectCockpitSnapshot(input());

    expect(snapshot.context.status).toBe('CONFIRMED');
    if (snapshot.context.status !== 'CONFIRMED') throw new Error('expected confirmed context');
    expect(snapshot.context).toEqual(expect.objectContaining({
      projectId: 'project-24',
      jobId: 'job-872',
    }));
    expect(snapshot.context.projectId).not.toBe(snapshot.context.jobId);
  });

  it.each(['UNKNOWN', 'LOADING', 'ERROR'] as const)(
    'offers refresh, never a production action, for %s verification',
    (verifyState) => {
      const snapshot = deriveProjectCockpitSnapshot(input({ verifyState }));
      expect(snapshot.primaryAction.kind).toBe('REFRESH_STATUS');
      expect(snapshot.primaryAction.label).not.toMatch(/factory|production|release/i);
    },
  );

  it('offers verification inspection when verification fails', () => {
    const snapshot = deriveProjectCockpitSnapshot(input({ verifyState: 'FAIL' }));
    expect(snapshot.primaryAction.kind).toBe('INSPECT_VERIFICATION');
  });

  it('offers evidence inspection after a shadow pass', () => {
    const snapshot = deriveProjectCockpitSnapshot(input({
      specState: 'FROZEN',
      verifyState: 'PASS',
    }));
    expect(snapshot.primaryAction.kind).toBe('INSPECT_PACKET');
    expect(snapshot.primaryAction.label).not.toMatch(/start|release|approve/i);
  });

  it('fails closed when the projection is stale', () => {
    const snapshot = deriveProjectCockpitSnapshot(input({ stale: true }));
    expect(snapshot.primaryAction.kind).toBe('REFRESH_STATUS');
  });

  it('derives exactly one attention item', () => {
    expect(deriveProjectCockpitSnapshot(input()).attentionItems).toHaveLength(1);
  });
});
```

### Step 2: Run the test and confirm it fails

Run:

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/model.test.ts
```

Expected: FAIL because `../model` does not exist.

### Step 3: Implement the pure contract

Create `model.ts` with these public types and a deterministic precedence order:

```ts
export type ProjectContextSnapshot =
  | {
      status: 'UNRESOLVED';
      reason: 'FOUNDATION_UNAVAILABLE' | 'AMBIGUOUS' | 'MISSING';
    }
  | {
      status: 'CONFIRMED';
      authoritySource: 'SERVER';
      projectId: string;
      jobId: string;
      projectName: string;
      siteLabel?: string;
      revision: string;
      fetchedAtMs: number;
    };

export type CockpitVerifyState =
  | 'UNKNOWN' | 'LOADING' | 'PASS' | 'PASS_WITH_WARN' | 'FAIL' | 'ERROR';
export type CockpitSpecState = 'DRAFT' | 'FROZEN' | 'RELEASED';
export type CockpitPrimaryActionKind =
  | 'CONTEXT_BLOCKED'
  | 'CONTINUE_DESIGN'
  | 'REFRESH_STATUS'
  | 'INSPECT_VERIFICATION'
  | 'INSPECT_PACKET';

export interface CockpitProjectionInput {
  context: ProjectContextSnapshot;
  specState: CockpitSpecState;
  verifyState: CockpitVerifyState;
  shadowNfp: true;
  stale: boolean;
}

export interface CockpitPrimaryAction {
  kind: CockpitPrimaryActionKind;
  label: string;
  enabled: boolean;
  href?: string;
  reason?: string;
}

export interface CockpitAttentionItem {
  id: string;
  title: string;
  consequence: string;
  nextStep: string;
  tone: 'neutral' | 'warning' | 'critical';
}

export interface ProjectCockpitSnapshot {
  context: ProjectContextSnapshot;
  safety: { label: 'NOT-FOR-PRODUCTION'; shadowNfp: true };
  status: { spec: CockpitSpecState; verification: CockpitVerifyState; stale: boolean };
  primaryAction: CockpitPrimaryAction;
  attentionItems: [CockpitAttentionItem];
  provenance: { authority: 'SERVER' | 'UNRESOLVED'; fetchedAtMs?: number };
}

export function deriveProjectCockpitSnapshot(
  input: CockpitProjectionInput,
): ProjectCockpitSnapshot {
  if (input.context.status === 'UNRESOLVED') {
    return blockedSnapshot(input, 'Project identity is not confirmed.');
  }

  if (input.stale || ['UNKNOWN', 'LOADING', 'ERROR'].includes(input.verifyState)) {
    return snapshotWith(input, {
      kind: 'REFRESH_STATUS',
      label: 'Refresh project status',
      enabled: true,
      reason: 'Current evidence is incomplete or stale.',
    });
  }

  if (input.verifyState === 'FAIL' || input.verifyState === 'PASS_WITH_WARN') {
    return snapshotWith(input, {
      kind: 'INSPECT_VERIFICATION',
      label: 'Inspect verification',
      enabled: true,
    });
  }

  if (input.verifyState === 'PASS' && input.specState !== 'DRAFT') {
    return snapshotWith(input, {
      kind: 'INSPECT_PACKET',
      label: 'Review evidence packet',
      enabled: true,
    });
  }

  return snapshotWith(input, {
    kind: 'CONTINUE_DESIGN',
    label: 'Continue design work',
    enabled: true,
  });
}

function blockedSnapshot(
  input: CockpitProjectionInput,
  reason: string,
): ProjectCockpitSnapshot {
  return snapshotWith(input, {
    kind: 'CONTEXT_BLOCKED',
    label: 'Confirm project context',
    enabled: false,
    reason,
  });
}

function snapshotWith(
  input: CockpitProjectionInput,
  primaryAction: CockpitPrimaryAction,
): ProjectCockpitSnapshot {
  return {
    context: input.context,
    safety: { label: 'NOT-FOR-PRODUCTION', shadowNfp: true },
    status: {
      spec: input.specState,
      verification: input.verifyState,
      stale: input.stale,
    },
    primaryAction,
    attentionItems: [attentionFor(primaryAction)],
    provenance: input.context.status === 'CONFIRMED'
      ? { authority: 'SERVER', fetchedAtMs: input.context.fetchedAtMs }
      : { authority: 'UNRESOLVED' },
  };
}

function attentionFor(action: CockpitPrimaryAction): CockpitAttentionItem {
  switch (action.kind) {
    case 'CONTEXT_BLOCKED':
      return {
        id: 'confirm-context',
        title: 'Project context is not confirmed',
        consequence: 'Continuing could show or change the wrong project.',
        nextStep: 'Stop and confirm the project identity.',
        tone: 'critical',
      };
    case 'REFRESH_STATUS':
      return {
        id: 'refresh-status',
        title: 'Project evidence needs refreshing',
        consequence: 'The current status may no longer be reliable.',
        nextStep: 'Refresh before making a decision.',
        tone: 'warning',
      };
    case 'INSPECT_VERIFICATION':
      return {
        id: 'inspect-verification',
        title: 'Verification needs attention',
        consequence: 'An issue or warning may affect the design packet.',
        nextStep: 'Inspect the verification evidence.',
        tone: 'warning',
      };
    case 'INSPECT_PACKET':
      return {
        id: 'inspect-packet',
        title: 'Evidence packet is ready for review',
        consequence: 'It remains non-authoritative and cannot start production.',
        nextStep: 'Review the packet evidence.',
        tone: 'neutral',
      };
    case 'CONTINUE_DESIGN':
      return {
        id: 'continue-design',
        title: 'Design work is the safest next step',
        consequence: 'The specification is not ready for downstream use.',
        nextStep: 'Continue the current design work.',
        tone: 'neutral',
      };
  }
}
```

Keep this file pure. Do not add I/O, hooks, dates from `Date.now()`, routing, or stores.

### Step 4: Run the targeted test

Run:

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/model.test.ts
```

Expected: PASS with all contract cases green.

### Step 5: Commit Task 1

```powershell
git add src/features/project-cockpit/model.ts src/features/project-cockpit/__tests__/model.test.ts
git diff --cached --check
git commit -m "feat: define safe project cockpit contract"
```

## Task 2: Share the NFP Banner Across Reachable Roots

**Files:**

- Create: `src/components/layout/SafetyStatusBanner.tsx`
- Create: `src/components/layout/__tests__/SafetyStatusBanner.test.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/factory/FactoryApp.tsx`

### Step 1: Write failing component and root-reachability tests

Test the shared component directly and mock the current `Dashboard` and `JobDetail` branches when rendering `FactoryApp`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SafetyStatusBanner } from '../SafetyStatusBanner';

vi.mock('../../../factory/pages/Dashboard', () => ({
  Dashboard: ({ onSelectJob }: { onSelectJob: (jobId: string) => void }) => (
    <button type="button" onClick={() => onSelectJob('job-872')}>dashboard branch</button>
  ),
}));
vi.mock('../../../factory/pages/JobDetail', () => ({
  JobDetail: () => <div>job detail branch</div>,
}));

describe('SafetyStatusBanner', () => {
  it('announces the invariant safety state', () => {
    render(<SafetyStatusBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('NOT-FOR-PRODUCTION');
    expect(screen.getByRole('status')).not.toHaveTextContent(/start production/i);
  });
});
```

Add focused `FactoryApp` cases that render `<FactoryApp useMockApi={false} />`, click `dashboard branch` to trigger the existing `handleSelectJob('job-872')` path, and assert the banner before and after the transition. Do not navigate through `/factory` and do not seed local storage.

### Step 2: Run the focused test and confirm it fails

```powershell
npm.cmd run test:run -- src/components/layout/__tests__/SafetyStatusBanner.test.tsx
```

Expected: FAIL because the shared component does not exist.

### Step 3: Implement and mount the shared invariant

Create:

```tsx
import {
  NOT_FOR_PRODUCTION_LABEL,
  SHADOW_MODE_NOT_FOR_PRODUCTION,
} from '../../core/config/shadowMode';

export function SafetyStatusBanner() {
  if (!SHADOW_MODE_NOT_FOR_PRODUCTION) return null;

  return (
    <div
      className="safety-status-banner px-2 py-1 border border-amber-500/50 bg-amber-500/10 text-amber-700"
      role="status"
      aria-live="polite"
    >
      <strong>{NOT_FOR_PRODUCTION_LABEL}</strong>
      <span> Evidence preview only. No production authority is granted.</span>
    </div>
  );
}
```

In `AppShell.tsx`, replace the existing inline NFP markup with `<SafetyStatusBanner />` while preserving its location and visibility.

In `FactoryApp.tsx`, wrap the existing branch selection once so the banner renders above both reachable outcomes:

```tsx
return (
  <>
    <SafetyStatusBanner />
    {view === 'job-detail' && selectedJobId ? (
      <JobDetail jobId={selectedJobId} onBack={handleBack} />
    ) : (
      <Dashboard onSelectJob={handleSelectJob} />
    )}
  </>
);
```

Replace the two existing early returns with this single reachable return and add only the `SafetyStatusBanner` import. Do not change branch behavior or introduce `FactoryLayout`.

### Step 4: Run focused and existing safety tests

```powershell
npm.cmd run test:run -- src/components/layout/__tests__/SafetyStatusBanner.test.tsx
npm.cmd run test:run -- src/factory/packet/__tests__/notForProduction.test.ts src/core/export/__tests__/dxfZipNotForProduction.test.ts
```

Expected: shared-banner test PASS and both existing NFP packet/export tests PASS.

### Step 5: Commit Task 2

```powershell
git add src/components/layout/SafetyStatusBanner.tsx src/components/layout/__tests__/SafetyStatusBanner.test.tsx src/components/layout/AppShell.tsx src/factory/FactoryApp.tsx
git diff --cached --check
git commit -m "refactor: share reachable NFP status banner"
```

## Task 3: Build the Pure Human Action First Cockpit

**Files:**

- Create: `src/features/project-cockpit/ProjectCockpit.tsx`
- Create: `src/features/project-cockpit/projectCockpit.css`
- Create: `src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx`
- Modify only if required: `src/index.css`

### Step 1: Write failing interaction and hierarchy tests

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCockpit } from '../ProjectCockpit';
import { deriveProjectCockpitSnapshot } from '../model';

const confirmedSnapshot = deriveProjectCockpitSnapshot({
  context: {
    status: 'CONFIRMED',
    authoritySource: 'SERVER',
    projectId: 'project-24',
    jobId: 'job-872',
    projectName: 'Sukhumvit Residence',
    revision: 'R07',
    fetchedAtMs: 1_786_000_000_000,
  },
  specState: 'DRAFT',
  verifyState: 'PASS',
  shadowNfp: true,
  stale: false,
});

describe('ProjectCockpit', () => {
  it('shows identity before attention and one primary action', () => {
    render(<ProjectCockpit snapshot={confirmedSnapshot} />);
    const cockpit = screen.getByRole('main', { name: /project cockpit/i });
    expect(within(cockpit).getByText('Sukhumvit Residence')).toBeVisible();
    expect(within(cockpit).getByText('R07')).toBeVisible();
    expect(within(cockpit).getAllByTestId('primary-action')).toHaveLength(1);
    expect(within(cockpit).getByText('NOT-FOR-PRODUCTION')).toBeVisible();
    expect(cockpit.textContent).not.toMatch(/start factory|start production|release/i);
  });

  it('does not invoke a blocked action', () => {
    const onPrimaryAction = vi.fn();
    const blocked = deriveProjectCockpitSnapshot({
      context: { status: 'UNRESOLVED', reason: 'AMBIGUOUS' },
      specState: 'DRAFT',
      verifyState: 'UNKNOWN',
      shadowNfp: true,
      stale: true,
    });
    render(<ProjectCockpit snapshot={blocked} onPrimaryAction={onPrimaryAction} />);
    fireEvent.click(screen.getByTestId('primary-action'));
    expect(onPrimaryAction).not.toHaveBeenCalled();
  });

  it('states the consequence and next step before progressive evidence', () => {
    render(<ProjectCockpit snapshot={confirmedSnapshot} />);
    const attention = screen.getByRole('article');
    expect(within(attention).getByText(/Consequence:/)).toBeVisible();
    expect(within(attention).getByText(/Next step:/)).toBeVisible();
    const summary = screen.getByText('Project evidence');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
  });

  it('accepts Thai project identity without a separate component', () => {
    if (confirmedSnapshot.context.status !== 'CONFIRMED') throw new Error('expected confirmed context');
    const thaiSnapshot = {
      ...confirmedSnapshot,
      context: {
        ...confirmedSnapshot.context,
        projectName: 'บ้านสุขุมวิท',
      },
    };
    render(<ProjectCockpit snapshot={thaiSnapshot} />);
    expect(screen.getByText('บ้านสุขุมวิท')).toBeVisible();
  });
});
```

Do not add hard-coded content widths; the rendered gate in Task 4 checks responsive behavior.

### Step 2: Run the focused test and confirm it fails

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx
```

Expected: FAIL because `ProjectCockpit` does not exist.

### Step 3: Implement the pure component

Use this public boundary:

```tsx
import type { CockpitPrimaryAction, ProjectCockpitSnapshot } from './model';
import './projectCockpit.css';

export interface ProjectCockpitProps {
  snapshot: ProjectCockpitSnapshot;
  surfaceProfile?: 'calm' | 'workspace';
  onPrimaryAction?: (action: CockpitPrimaryAction) => void;
}

export function ProjectCockpit({
  snapshot,
  surfaceProfile = 'calm',
  onPrimaryAction,
}: ProjectCockpitProps) {
  const action = snapshot.primaryAction;
  const contextConfirmed = snapshot.context.status === 'CONFIRMED';

  return (
    <main
      className={`project-cockpit project-cockpit--${surfaceProfile}`}
      aria-label="Project cockpit"
    >
      <header className="project-cockpit__identity">
        <p className="project-cockpit__eyebrow">Current project</p>
        <h1>{contextConfirmed ? snapshot.context.projectName : 'Project context required'}</h1>
        <p className="project-cockpit__metadata">
          {contextConfirmed
            ? `${snapshot.context.revision} · ${snapshot.context.projectId}`
            : snapshot.context.reason}
        </p>
      </header>

      <div className="project-cockpit__safety" role="status">
        {snapshot.safety.label}
      </div>

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading">Needs your attention</h2>
        {snapshot.attentionItems.map((item) => (
          <article key={item.id} className={`attention-card attention-card--${item.tone}`}>
            <p className="attention-card__tone">
              {item.tone === 'neutral' ? 'Information' : item.tone}
            </p>
            <h3>{item.title}</h3>
            <p><strong>Consequence:</strong> {item.consequence}</p>
            <p><strong>Next step:</strong> {item.nextStep}</p>
          </article>
        ))}
      </section>

      <button
        data-testid="primary-action"
        type="button"
        disabled={!action.enabled}
        onClick={() => action.enabled && onPrimaryAction?.(action)}
      >
        {action.label}
      </button>

      <details>
        <summary>Project evidence</summary>
        <dl>
          <dt>Specification</dt><dd>{snapshot.status.spec}</dd>
          <dt>Verification</dt><dd>{snapshot.status.verification}</dd>
          <dt>Authority</dt><dd>{snapshot.provenance.authority}</dd>
        </dl>
      </details>
    </main>
  );
}
```

In `projectCockpit.css`, define invariant semantic variables and only two surface profiles:

```css
.project-cockpit {
  --cockpit-bg: #f3f0e9;
  --cockpit-surface: #fffdf8;
  --cockpit-text: #24231f;
  --cockpit-muted: #69665f;
  --cockpit-accent: #355c4d;
  --cockpit-warning: #8a5a22;
  color: var(--cockpit-text);
  background: var(--cockpit-bg);
  font-size: 14px;
  line-height: 1.5;
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(16px, 4vw, 48px);
}

.project-cockpit--workspace { --cockpit-bg: #ecebe7; }
.project-cockpit__identity,
.project-cockpit section,
.project-cockpit details {
  background: var(--cockpit-surface);
  border: 1px solid #d8d3c8;
  border-radius: 12px;
  padding: clamp(16px, 3vw, 28px);
}
.project-cockpit__eyebrow,
.attention-card__tone {
  color: var(--cockpit-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.project-cockpit__metadata { color: var(--cockpit-muted); font-size: 12px; }
.project-cockpit__safety {
  margin: 16px 0;
  border-left: 4px solid var(--cockpit-warning);
  padding: 12px 16px;
  font-weight: 700;
}
.attention-card { border-left: 4px solid var(--cockpit-accent); padding: 16px; }
.attention-card--warning { border-left-color: var(--cockpit-warning); }
.attention-card--critical { border-left-color: #8f302a; }
.project-cockpit button,
.project-cockpit summary {
  min-width: 44px;
  min-height: 44px;
}
.project-cockpit button {
  margin: 20px 0;
  border: 0;
  border-radius: 8px;
  padding: 10px 18px;
  background: var(--cockpit-accent);
  color: #fff;
  font: inherit;
  font-weight: 700;
}
.project-cockpit button:disabled { opacity: 0.55; cursor: not-allowed; }
.project-cockpit summary { display: flex; align-items: center; cursor: pointer; }
.project-cockpit :focus-visible { outline: 3px solid #2f6fed; outline-offset: 3px; }

@media (max-width: 640px) {
  .project-cockpit { padding: 12px; }
  .project-cockpit__identity,
  .project-cockpit section,
  .project-cockpit details { border-radius: 8px; padding: 16px; }
  .project-cockpit button { width: 100%; }
}
```

Keep the visible tone word in the component so status is not encoded by color alone. Do not add brand profile types or Tailwind tokens. Modify `src/index.css` only if a semantic alias is required by both the Cockpit and shared banner; otherwise leave it untouched.

### Step 4: Run focused tests

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/model.test.ts src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx
```

Expected: PASS.

### Step 5: Commit Task 3

```powershell
git add src/features/project-cockpit/ProjectCockpit.tsx src/features/project-cockpit/projectCockpit.css src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx
git add src/index.css
git diff --cached --check
git commit -m "feat: render human action first cockpit"
```

If `src/index.css` is unchanged, omit it from `git add`.

## Task 4: Add a Development-Only Non-Authoritative Preview and Rendered Gate

**Files:**

- Create: `src/features/project-cockpit/fixtures.ts`
- Create: `src/features/project-cockpit/CockpitPreviewPage.tsx`
- Create: `e2e/cockpit-contract.spec.ts`
- Modify: `src/routes/index.tsx`

### Step 1: Write the failing rendered contract test

```ts
import { expect, test } from '@playwright/test';

test('cockpit preview communicates context, action, and safety', async ({ page }) => {
  await page.goto('/diagnostics/cockpit-preview');

  await expect(page.getByText('DEMO · NON-AUTHORITATIVE')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sukhumvit Residence' })).toBeVisible();
  await expect(page.getByText('R07')).toBeVisible();
  await expect(page.getByText('NOT-FOR-PRODUCTION')).toBeVisible();
  await expect(page.getByTestId('primary-action')).toHaveCount(1);
  await expect(page.getByRole('main')).not.toContainText(/start factory|start production|release/i);

  const actionBox = await page.getByTestId('primary-action').boundingBox();
  expect(actionBox?.height).toBeGreaterThanOrEqual(44);
  expect(actionBox?.width).toBeGreaterThanOrEqual(44);

  const bodySize = await page.getByRole('main').evaluate(
    (node) => Number.parseFloat(getComputedStyle(node).fontSize),
  );
  expect(bodySize).toBeGreaterThanOrEqual(14);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test('cockpit preview preserves keyboard focus and explicit status', async ({ page }) => {
  await page.goto('/diagnostics/cockpit-preview');

  await page.keyboard.press('Tab');
  const action = page.getByTestId('primary-action');
  await expect(action).toBeFocused();
  const outlineWidth = await action.evaluate(
    (node) => Number.parseFloat(getComputedStyle(node).outlineWidth),
  );
  expect(outlineWidth).toBeGreaterThan(0);

  await page.keyboard.press('Tab');
  const evidence = page.getByText('Project evidence');
  await expect(evidence).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('PASS_WITH_WARN')).toBeVisible();
  await expect(page.getByText('warning', { exact: true })).toBeVisible();
});
```

Keep both cases in the same rendered contract file. They verify actual computed styles and keyboard behavior rather than searching CSS source text.

### Step 2: Run the E2E test and confirm it fails

Run the repository's configured preview server, then:

```powershell
npm.cmd run e2e -- e2e/cockpit-contract.spec.ts
```

Expected: FAIL with a 404 or missing preview content.

### Step 3: Add deterministic fixtures and a visibly non-authoritative page

`fixtures.ts` must export static inputs only; it must not import stores or call APIs:

```ts
import type { CockpitProjectionInput } from './model';

export const cockpitPreviewInput: CockpitProjectionInput = {
  context: {
    status: 'CONFIRMED',
    authoritySource: 'SERVER',
    projectId: 'demo-project-24',
    jobId: 'demo-job-872',
    projectName: 'Sukhumvit Residence',
    siteLabel: 'Bangkok',
    revision: 'R07',
    fetchedAtMs: 1_786_000_000_000,
  },
  specState: 'FROZEN',
  verifyState: 'PASS_WITH_WARN',
  shadowNfp: true,
  stale: false,
};
```

`CockpitPreviewPage.tsx` must render a persistent top label `DEMO · NON-AUTHORITATIVE`, derive the snapshot from the static fixture, and use an in-memory callback that displays the selected action without navigation or mutation.

Load and add the route in `src/routes/index.tsx` through an explicit development-only boundary:

```tsx
const CockpitPreviewPage = import.meta.env.DEV
  ? lazy(() => import('../features/project-cockpit/CockpitPreviewPage').then(
      (module) => ({ default: module.CockpitPreviewPage }),
    ))
  : null;

const developmentRoutes = import.meta.env.DEV && CockpitPreviewPage
  ? [
      {
        path: '/diagnostics/cockpit-preview',
        element: (
          <Suspense fallback={<PageLoadingFallback message="Loading Cockpit Preview…" />}>
            <CockpitPreviewPage />
          </Suspense>
        ),
      },
    ]
  : [];

// Spread developmentRoutes before the wildcard route.
```

Do not place the preview under `RequireRole`, do not call it a project route, and do not reuse this fixture in production runtime.

### Step 4: Pass rendered, unit, and production-build gates

```powershell
npm.cmd run test:run -- src/features/project-cockpit src/components/layout/__tests__/SafetyStatusBanner.test.tsx
npm.cmd run e2e -- e2e/cockpit-contract.spec.ts
npm.cmd run build -- --outDir C:\tmp\monolith-cockpit-wave1-build
rg -n "/diagnostics/cockpit-preview|DEMO · NON-AUTHORITATIVE" C:\tmp\monolith-cockpit-wave1-build
```

Expected: all tests PASS, production build succeeds, and the final `rg` returns no matches (exit code 1). If it returns a match, fail the task and fix the development boundary. Remove only `C:\tmp\monolith-cockpit-wave1-build` after inspection. This command must not change or stage repository `dist/` files.

### Step 5: Commit Task 4

```powershell
git add src/features/project-cockpit/fixtures.ts src/features/project-cockpit/CockpitPreviewPage.tsx e2e/cockpit-contract.spec.ts src/routes/index.tsx
git diff --cached --check
git commit -m "test: add non-authoritative cockpit preview"
```

## Task 5: Run the Primary-User Usability Gate and Record the Decision

**Files:**

- Create: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.md`
- Create: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.html`
- Create: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.md`
- Create: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.html`

### Step 1: Prepare the bilingual validation record before sessions

Create aligned English and Thai Markdown with these sections:

1. Scope and safety statement
2. Participant roles and consent record
3. Scenario and task script
4. Per-participant observation table
5. Quantitative results
6. Critical failures and misunderstandings
7. Decision: `PROCEED`, `NARROW`, or `STOP`
8. Required changes before Project Context Foundation integration
9. Evidence links and session date

The report must state that the preview is non-authoritative and that the exercise does not validate production data correctness.

### Step 2: Test with 6–8 primary users

Recruit only the first-wave audience: studio owners, project managers, and designers. Ask every participant to complete the same tasks without coaching:

1. Identify the current project and revision.
2. Identify what needs attention first.
3. Explain the consequence of doing nothing.
4. State the safest next action.
5. Discover supporting project evidence.
6. Explain what NOT-FOR-PRODUCTION and DEMO · NON-AUTHORITATIVE mean.
7. Respond to an unresolved-context state and a stale/error state.

Record completion, time, errors, confidence, verbatim misunderstanding notes limited to what is needed, and facilitator interventions.

### Step 3: Apply the exit thresholds

The gate may be `PROCEED` only when all conditions are met:

- Median project/revision identification time ≤ 10 seconds.
- Median first-attention identification time ≤ 15 seconds.
- Primary task completion ≥ 80% without coaching.
- Safety/state comprehension ≥ 90%.
- Wrong-project or wrong-revision continuation = 0.
- False-success interpretation = 0.
- Production-authority misunderstanding = 0.
- Every unresolved/stale state causes participants to stop or refresh rather than continue production work.

Set `STOP` for any identity or safety critical failure. Set `NARROW` when safety holds but comprehension or completion misses a threshold. Do not average away critical failures.

### Step 4: Render and verify all four reports

From the nested product repository:

```powershell
python ..\tools\render_docs.py docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.html
python ..\tools\render_docs.py docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.html
```

Verify:

```powershell
Select-String -Path docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.* -Pattern 'PROCEED|NARROW|STOP|NOT-FOR-PRODUCTION|NON-AUTHORITATIVE'
```

Open both HTML files and confirm headings, tables, Thai text, and decision state render correctly and match their Markdown sources.

### Step 5: Commit Task 5

```powershell
git add docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.html docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.html
git diff --cached --check
git commit -m "docs: record cockpit wave 1 usability gate"
```

## Final Verification Gate

Run from the isolated nested product worktree:

```powershell
npm.cmd run test:run
npm.cmd run e2e -- e2e/cockpit-contract.spec.ts
npm.cmd run build -- --outDir C:\tmp\monolith-cockpit-wave1-final-build
rg -n "/diagnostics/cockpit-preview|DEMO · NON-AUTHORITATIVE" C:\tmp\monolith-cockpit-wave1-final-build
git status --short
```

Expected:

- Unit/component suite passes.
- Rendered Cockpit contract passes.
- Production build passes and excludes the development preview route.
- No generated `dist/` artifacts are staged.
- The only runtime change is a pure read-model prototype plus a shared NFP banner; no production Project Cockpit route exists.
- Validation report contains a signed gate decision and evidence, not an aspirational claim.

Before integration, request code review focused on authority boundaries, fail-closed behavior, reachable NFP rendering, route gating, accessibility, and accidental production actions.

## Explicitly Deferred

- Project Context Foundation implementation and server-authoritative identity resolution
- Production Project Cockpit route integration
- One Decision Pipeline for client design approval
- One Exception Projection for factory blockers
- Effect Ledger/Outbox and partial-failure operations
- Role-specific views and LINE channels
- Controlled Studio Brand Kit and any customer/field visual profiles
- Factory execution, release, approval, or irreversible calls to action

The next implementation plan may begin only after Task 5 records `PROCEED` or an explicitly accepted `NARROW`, and Project Context Foundation has its own approved authority design and tests.
