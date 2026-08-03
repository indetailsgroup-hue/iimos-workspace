# แผนดำเนินงาน MONOLITH Cockpit Contract First — Wave 1

> **ทักษะที่ต้องใช้ระหว่างดำเนินงาน:** ใช้ `using-git-worktrees` ก่อนเริ่ม implementation, ใช้ `test-driven-development` สำหรับงานที่ 1–4, ใช้ `verification-before-completion` ก่อนกล่าวอ้างความสำเร็จทุกครั้ง และใช้ `requesting-code-review` ก่อนรวมงาน หากใช้ agent ใหม่แยกทำแต่ละงาน ให้ใช้ `subagent-driven-development`

**เป้าหมาย:** พิสูจน์ contract ของ Project Cockpit ที่ปลอดภัยและเข้าใจง่ายสำหรับเจ้าของสตูดิโอ ผู้จัดการโครงการ และดีไซเนอร์ โดยไม่สร้าง source of truth ใหม่ และไม่เชื่อมตัวตนโครงการหรือสิทธิ์ที่ยังไม่ได้ยืนยันเข้ากับการกระทำระดับ production

**สถาปัตยกรรม:** เริ่มจาก read model แบบ pure และ discriminated contract ซึ่งรับได้เฉพาะ project/job identity ที่ server ยืนยันแล้วหรือ context ที่ยัง resolve ไม่ได้ จากนั้นคำนวณการกระทำถัดไปที่ปลอดภัยที่สุดเพียงหนึ่งรายการ และแสดง Cockpit แบบ Calm + Human Action First โดยไม่อ่าน global store, URL alias, local storage หรือ role state รวมสถานะ `NOT-FOR-PRODUCTION` เดิมไว้เป็น component กลางแล้วติดตั้งบน application root ที่ runtime เข้าถึงจริง สาธิต contract เฉพาะใน preview สำหรับ development ที่ระบุชัดว่าไม่มี authority การเชื่อมเข้า production route จะยังถูกบล็อกจนกว่า Project Context Foundation จะมีจริงและ usability gate ผ่าน

**เทคโนโลยี:** TypeScript 5.2, React 18, React Router 6, Vitest 3, React Testing Library, Playwright 1.58, CSS custom properties และตัว render เอกสารของ repository

---

## ข้อจำกัดร่วมทั้งแผน

- ทำงานใน worktree แยกซึ่งสร้างจาก commit `66b0a38d` ของ nested product repository โดย parent repository เป็น governance/bootstrap และ `determined-williams/` ด้านในคือ source ของผลิตภัณฑ์
- ก่อนลงมือให้บันทึก `git status --short` แยกทั้งสอง repository และรักษาการเปลี่ยนแปลงเดิมทั้งหมด โดยเฉพาะ `dist/`, Daph exports, Supabase adapter, LINE tests, เอกสาร research และ Python caches
- ห้ามเชื่อม Project Cockpit เข้า `/projects/:projectId`, `/factory` หรือ route ที่ผู้ใช้ production เข้าถึงใน wave นี้
- Cockpit ใหม่ห้าม import `useCabinetStore`, `useSpecStore`, `useVerifyStatusStore`, `roles.ts` หรือ authority ใด ๆ จาก local storage
- เก็บ `projectId` และ `jobId` เป็นคนละ field ที่มี type ชัดเจน ห้าม derive ค่าหนึ่งจากอีกค่าหนึ่ง
- เฉพาะ `authoritySource: 'SERVER'` เท่านั้นที่สร้าง confirmed context ได้ สถานะ unresolved, ambiguous, missing, stale, loading, unknown หรือ error ต้อง fail closed
- ห้ามเพิ่ม Studio Brand configuration, field/customer profile, LINE integration, database migration, Supabase change, `shadowMode`, Tailwind configuration หรือ generated build artifact
- ต้องคง `NOT-FOR-PRODUCTION` ให้เห็นชัด แผนนี้ห้ามเพิ่ม Start Factory, Start Production, Release, Approve หรือ action ย้อนกลับไม่ได้ที่มีความหมายใกล้เคียงกัน
- Styling เพิ่มได้เฉพาะ invariant semantic safety token และ surface profile ของ prototype สองแบบคือ `calm` กับ `workspace` ส่วน brand customization ให้เลื่อนไปก่อน
- เป้าหมายแบบ interactive ต้องมีขนาดอย่างน้อย 44 × 44 CSS pixels, body text อย่างน้อย 14 px และใช้ 12 px ได้เฉพาะ metadata
- ห้ามกล่าวว่า experience เป็น “ที่รักของผู้ใช้” จากหลักฐาน implementation เพียงอย่างเดียว ต้องมีหลักฐานจากการสังเกตผู้ใช้จริง
- validation record ที่เป็น deliverable ของโครงการต้องมี Markdown อังกฤษและไทยที่เนื้อหาตรงกัน พร้อม HTML แบบ standalone ของทั้งสองภาษา

## หลักฐานจาก Repository ที่กำหนดลำดับนี้

- route โครงการปัจจุบันแปลง project identifier จาก URL เป็น job identifier ก่อนอ่าน global store และ verification API จึงนำ job identifier นั้นไปประกอบ endpoint ต่อ วิธีนี้ยังไม่ใช่ authority ที่เพียงพอสำหรับ Cockpit ข้ามบทบาท
- ระหว่าง scrutinize ไม่พบ contract ชื่อ `ProjectContext`, `project_context`, `tenant_id` หรือ `organization_id` ใน product source หรือ migration ปัจจุบัน
- `FactoryLayout` มี definition แต่ factory runtime ปัจจุบันไม่ได้ mount; `FactoryApp` render `Dashboard` หรือ `JobDetail` โดยตรง
- การเข้า `/factory` ปัจจุบันถูก guard ด้วย role จาก local storage ดังนั้น wave นี้ห้ามถือว่าการเข้า route ได้คือหลักฐานว่า authority ถูกต้อง

ข้อค้นพบเหล่านี้ทำให้ Project Context Foundation เป็นเงื่อนไขก่อน runtime integration ดังนั้น wave นี้จะพิสูจน์ contract และความเข้าใจของ Cockpit ก่อนสร้าง foundation หรือแตะ production route

## ลำดับ Architecture ที่อนุมัติและขอบเขตของ Wave

| ลำดับ | Architecture layer | สิ่งที่แผนนี้ทำ |
|---:|---|---|
| 1 | **Project Context Foundation** | เป็น prerequisite ที่ต้องมี โดยแผนนี้แทนได้เพียง `CONFIRMED` หรือ `UNRESOLVED` และไม่สร้าง foundation สมมติขึ้นมา |
| 2 | **Project Cockpit Read Model** | ขอบเขต Wave 1: pure snapshot, safest-next-action contract, UI prototype และหลักฐาน usability โดยยังคงไม่มี authority |
| 3 | **One Decision Pipeline** | เลื่อนไปจนกว่า context authority ผ่าน โดย pipeline แรกคือ client design approval |
| 4 | **One Exception Projection** | เลื่อนออกไป โดย projection แรกคือ factory blocker หลัง decision pipeline มีฐาน authority ที่เชื่อถือได้ |
| 5 | **Effect Ledger/Outbox** | เลื่อนออกไป และต้องมีก่อน background effect หรือการจัดการ partial failure |
| 6 | **Role Views and LINE Channels** | เลื่อนไปจนกว่า authority, pipeline, exception และ effect จะเชื่อถือได้ |

ตารางนี้คือลำดับ dependency ไม่ใช่หก workstream ที่ทำพร้อมกัน การจบ Wave 1 ไม่ได้อนุญาตให้เริ่ม Layer 1 หรือ Layer 3–6 โดยอัตโนมัติ

## โครงสร้างไฟล์

```text
src/
  components/layout/
    SafetyStatusBanner.tsx                         # สถานะ NFP กลางที่เปลี่ยนไม่ได้
    __tests__/SafetyStatusBanner.test.tsx          # ทดสอบ component และ root ที่ runtime เข้าถึง
  features/project-cockpit/
    model.ts                                       # Pure read model และการหา safest action
    fixtures.ts                                    # Fixture แบบ non-authoritative สำหรับ dev เท่านั้น
    ProjectCockpit.tsx                             # มุมมอง Human Action First แบบ pure
    projectCockpit.css                             # Profile prototype แบบ calm/workspace
    CockpitPreviewPage.tsx                         # Preview เฉพาะ development
    __tests__/
      model.test.ts
      ProjectCockpit.test.tsx
  factory/FactoryApp.tsx                           # Mount NFP banner บน branch ที่เข้าถึงจริง
  components/layout/AppShell.tsx                   # แทน inline NFP ด้วย banner กลาง
  routes/index.tsx                                 # เพิ่ม route preview ที่ DEV-gated เท่านั้น
  index.css                                        # เพิ่ม invariant semantic alias เฉพาะเมื่อจำเป็น
e2e/
  cockpit-contract.spec.ts                         # ตรวจ rendered contract และ accessibility
docs/superpowers/reports/
  2026-08-03-monolith-cockpit-wave-1-validation.en.md
  2026-08-03-monolith-cockpit-wave-1-validation.en.html
  2026-08-03-monolith-cockpit-wave-1-validation.th.md
  2026-08-03-monolith-cockpit-wave-1-validation.th.html
```

## งานที่ 1: กำหนด Snapshot และ Safest-Next-Action Contract

**ไฟล์:**

- สร้าง: `src/features/project-cockpit/model.ts`
- สร้าง: `src/features/project-cockpit/__tests__/model.test.ts`

### ขั้นที่ 1: เขียน contract test ที่ยังไม่ผ่าน

สร้าง `model.test.ts` แบบ table-driven ให้ครอบคลุมทุก fail-closed boundary:

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

### ขั้นที่ 2: รันทดสอบและยืนยันว่าล้มเหลว

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/model.test.ts
```

ผลที่คาด: FAIL เพราะยังไม่มี `../model`

### ขั้นที่ 3: Implement pure contract

สร้าง `model.ts` ด้วย public type ต่อไปนี้และลำดับ precedence ที่ deterministic:

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

รักษาไฟล์นี้ให้เป็น pure function ห้ามเพิ่ม I/O, hook, เวลาจาก `Date.now()`, routing หรือ store

### ขั้นที่ 4: รัน targeted test

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/model.test.ts
```

ผลที่คาด: PASS ทุก contract case

### ขั้นที่ 5: Commit งานที่ 1

```powershell
git add src/features/project-cockpit/model.ts src/features/project-cockpit/__tests__/model.test.ts
git diff --cached --check
git commit -m "feat: define safe project cockpit contract"
```

## งานที่ 2: ใช้ NFP Banner ร่วมกันบน Root ที่ Runtime เข้าถึงจริง

**ไฟล์:**

- สร้าง: `src/components/layout/SafetyStatusBanner.tsx`
- สร้าง: `src/components/layout/__tests__/SafetyStatusBanner.test.tsx`
- แก้ไข: `src/components/layout/AppShell.tsx`
- แก้ไข: `src/factory/FactoryApp.tsx`

### ขั้นที่ 1: เขียน component test และ root-reachability test ที่ยังไม่ผ่าน

ทดสอบ shared component โดยตรง และ mock branch `Dashboard` กับ `JobDetail` ปัจจุบันเมื่อ render `FactoryApp`:

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

เพิ่ม case เฉพาะของ `FactoryApp` โดย render `<FactoryApp useMockApi={false} />` คลิก `dashboard branch` เพื่อเรียก path เดิม `handleSelectJob('job-872')` แล้ว assert ว่า banner แสดงทั้งก่อนและหลัง transition ห้ามนำทางผ่าน `/factory` และห้าม seed local storage

### ขั้นที่ 2: รัน focused test และยืนยันว่าล้มเหลว

```powershell
npm.cmd run test:run -- src/components/layout/__tests__/SafetyStatusBanner.test.tsx
```

ผลที่คาด: FAIL เพราะ shared component ยังไม่มี

### ขั้นที่ 3: Implement และ mount invariant กลาง

สร้าง:

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

ใน `AppShell.tsx` แทน inline NFP เดิมด้วย `<SafetyStatusBanner />` โดยรักษาตำแหน่งและ visibility เดิม

ใน `FactoryApp.tsx` ให้ครอบ branch selection เดิมหนึ่งครั้งเพื่อให้ banner อยู่เหนือผลลัพธ์ทั้งสองแบบ:

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

แทน early return เดิมทั้งสองจุดด้วย reachable return เดียวนี้ และเพิ่มเฉพาะ import ของ `SafetyStatusBanner` ห้ามเปลี่ยน branch behavior หรือเพิ่ม `FactoryLayout`

### ขั้นที่ 4: รัน focused test และ safety test เดิม

```powershell
npm.cmd run test:run -- src/components/layout/__tests__/SafetyStatusBanner.test.tsx
npm.cmd run test:run -- src/factory/packet/__tests__/notForProduction.test.ts src/core/export/__tests__/dxfZipNotForProduction.test.ts
```

ผลที่คาด: shared-banner test PASS และ NFP packet/export test เดิมทั้งสองไฟล์ PASS

### ขั้นที่ 5: Commit งานที่ 2

```powershell
git add src/components/layout/SafetyStatusBanner.tsx src/components/layout/__tests__/SafetyStatusBanner.test.tsx src/components/layout/AppShell.tsx src/factory/FactoryApp.tsx
git diff --cached --check
git commit -m "refactor: share reachable NFP status banner"
```

## งานที่ 3: สร้าง Cockpit แบบ Pure และ Human Action First

**ไฟล์:**

- สร้าง: `src/features/project-cockpit/ProjectCockpit.tsx`
- สร้าง: `src/features/project-cockpit/projectCockpit.css`
- สร้าง: `src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx`
- แก้เฉพาะเมื่อจำเป็น: `src/index.css`

### ขั้นที่ 1: เขียน interaction และ hierarchy test ที่ยังไม่ผ่าน

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

ห้ามเพิ่ม hard-coded content width; rendered gate ในงานที่ 4 จะตรวจ responsive behavior

### ขั้นที่ 2: รัน focused test และยืนยันว่าล้มเหลว

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx
```

ผลที่คาด: FAIL เพราะยังไม่มี `ProjectCockpit`

### ขั้นที่ 3: Implement pure component

ใช้ public boundary นี้:

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

ใน `projectCockpit.css` ให้กำหนด invariant semantic variable และ surface profile เพียงสองแบบ:

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

คงคำ tone ที่มองเห็นได้ใน component เพื่อไม่ให้สื่อสถานะด้วยสีอย่างเดียว ห้ามเพิ่ม brand profile type หรือ Tailwind token แก้ `src/index.css` เฉพาะเมื่อมี semantic alias ที่ทั้ง Cockpit และ shared banner ต้องใช้ร่วมกัน มิฉะนั้นไม่แตะไฟล์นี้

### ขั้นที่ 4: รัน focused test

```powershell
npm.cmd run test:run -- src/features/project-cockpit/__tests__/model.test.ts src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx
```

ผลที่คาด: PASS

### ขั้นที่ 5: Commit งานที่ 3

```powershell
git add src/features/project-cockpit/ProjectCockpit.tsx src/features/project-cockpit/projectCockpit.css src/features/project-cockpit/__tests__/ProjectCockpit.test.tsx
git add src/index.css
git diff --cached --check
git commit -m "feat: render human action first cockpit"
```

หาก `src/index.css` ไม่เปลี่ยน ให้ละเว้นไฟล์นี้จาก `git add`

## งานที่ 4: เพิ่ม Development-Only Non-Authoritative Preview และ Rendered Gate

**ไฟล์:**

- สร้าง: `src/features/project-cockpit/fixtures.ts`
- สร้าง: `src/features/project-cockpit/CockpitPreviewPage.tsx`
- สร้าง: `e2e/cockpit-contract.spec.ts`
- แก้ไข: `src/routes/index.tsx`

### ขั้นที่ 1: เขียน rendered contract test ที่ยังไม่ผ่าน

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

เก็บทั้งสอง case ไว้ใน rendered contract file เดียวกัน เพื่อทดสอบ computed style และ keyboard behavior จริง แทนการค้นหาเพียงข้อความใน CSS source

### ขั้นที่ 2: รัน E2E test และยืนยันว่าล้มเหลว

เปิด preview server ตาม config ของ repository แล้วรัน:

```powershell
npm.cmd run e2e -- e2e/cockpit-contract.spec.ts
```

ผลที่คาด: FAIL ด้วย 404 หรือไม่พบ preview content

### ขั้นที่ 3: เพิ่ม deterministic fixture และหน้า non-authoritative ที่เห็นชัด

`fixtures.ts` ต้อง export เฉพาะ static input ห้าม import store หรือเรียก API:

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

`CockpitPreviewPage.tsx` ต้องแสดงป้าย `DEMO · NON-AUTHORITATIVE` ที่อยู่ตลอดเวลา derive snapshot จาก static fixture และใช้ in-memory callback เพื่อแสดง action ที่เลือกโดยไม่มี navigation หรือ mutation

โหลดและเพิ่ม route ใน `src/routes/index.tsx` ผ่าน development-only boundary ที่ชัดเจน:

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

ห้ามวาง preview ไว้ใต้ `RequireRole`, ห้ามเรียกมันว่า project route และห้ามนำ fixture นี้ไปใช้ใน production runtime

### ขั้นที่ 4: ผ่าน rendered, unit และ production-build gate

```powershell
npm.cmd run test:run -- src/features/project-cockpit src/components/layout/__tests__/SafetyStatusBanner.test.tsx
npm.cmd run e2e -- e2e/cockpit-contract.spec.ts
npm.cmd run build -- --outDir C:\tmp\monolith-cockpit-wave1-build
rg -n "/diagnostics/cockpit-preview|DEMO · NON-AUTHORITATIVE" C:\tmp\monolith-cockpit-wave1-build
```

ผลที่คาด: ทุก test PASS, production build สำเร็จ และ `rg` บรรทัดสุดท้ายไม่พบ match (exit code 1) หากพบ match ให้ถือว่างานล้มเหลวและแก้ development boundary ลบเฉพาะ `C:\tmp\monolith-cockpit-wave1-build` หลังตรวจเสร็จ คำสั่งนี้ต้องไม่เปลี่ยนหรือ stage `dist/` ใน repository

### ขั้นที่ 5: Commit งานที่ 4

```powershell
git add src/features/project-cockpit/fixtures.ts src/features/project-cockpit/CockpitPreviewPage.tsx e2e/cockpit-contract.spec.ts src/routes/index.tsx
git diff --cached --check
git commit -m "test: add non-authoritative cockpit preview"
```

## งานที่ 5: ทำ Usability Gate กับผู้ใช้หลักและบันทึกคำตัดสิน

**ไฟล์:**

- สร้าง: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.md`
- สร้าง: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.html`
- สร้าง: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.md`
- สร้าง: `docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.html`

### ขั้นที่ 1: เตรียม validation record สองภาษาก่อนเริ่ม session

สร้าง Markdown อังกฤษและไทยที่ตรงกัน โดยมีหัวข้อ:

1. ขอบเขตและ safety statement
2. บทบาทผู้เข้าร่วมและบันทึก consent
3. Scenario และ task script
4. ตาราง observation รายคน
5. ผลเชิงปริมาณ
6. Critical failure และความเข้าใจผิด
7. คำตัดสิน: `PROCEED`, `NARROW` หรือ `STOP`
8. สิ่งที่ต้องแก้ก่อนเชื่อมกับ Project Context Foundation
9. ลิงก์หลักฐานและวันที่ session

รายงานต้องระบุว่า preview ไม่มี authority และแบบฝึกนี้ไม่ได้ยืนยันความถูกต้องของ production data

### ขั้นที่ 2: ทดสอบกับผู้ใช้หลัก 6–8 คน

คัดเฉพาะกลุ่มเป้าหมาย wave แรก: เจ้าของสตูดิโอ ผู้จัดการโครงการ และดีไซเนอร์ ให้ทุกคนทำงานชุดเดียวกันโดยไม่ coach:

1. ระบุโครงการและ revision ปัจจุบัน
2. ระบุสิ่งที่ต้องสนใจก่อน
3. อธิบายผลกระทบหากไม่ทำอะไร
4. ระบุการกระทำถัดไปที่ปลอดภัยที่สุด
5. ค้นหาหลักฐานประกอบของโครงการ
6. อธิบายความหมายของ NOT-FOR-PRODUCTION และ DEMO · NON-AUTHORITATIVE
7. ตอบสนองต่อ unresolved-context state และ stale/error state

บันทึกความสำเร็จ เวลา ความผิดพลาด ความมั่นใจ note ความเข้าใจผิดแบบ verbatim เฉพาะที่จำเป็น และการแทรกแซงของ facilitator

### ขั้นที่ 3: ใช้เกณฑ์ออกจาก wave

ให้ gate เป็น `PROCEED` ได้ต่อเมื่อครบทุกข้อ:

- Median เวลาในการระบุ project/revision ≤ 10 วินาที
- Median เวลาในการระบุ first attention ≤ 15 วินาที
- Primary task completion ≥ 80% โดยไม่ coach
- ความเข้าใจ safety/state ≥ 90%
- เดินหน้าด้วย project หรือ revision ผิด = 0
- ตีความ false success = 0
- เข้าใจผิดว่า preview มี production authority = 0
- ทุก unresolved/stale state ทำให้ผู้เข้าร่วมหยุดหรือ refresh แทนการทำ production work ต่อ

ตั้งเป็น `STOP` เมื่อพบ critical failure ด้าน identity หรือ safety ตั้งเป็น `NARROW` เมื่อ safety ยังถูกต้องแต่ comprehension หรือ completion ต่ำกว่า threshold ห้ามใช้ค่าเฉลี่ยกลบ critical failure

### ขั้นที่ 4: Render และตรวจรายงานทั้งสี่ไฟล์

จาก nested product repository:

```powershell
python ..\tools\render_docs.py docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.html
python ..\tools\render_docs.py docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.html
```

ตรวจ:

```powershell
Select-String -Path docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.* -Pattern 'PROCEED|NARROW|STOP|NOT-FOR-PRODUCTION|NON-AUTHORITATIVE'
```

เปิด HTML ทั้งสองไฟล์และยืนยันว่า heading, table, ภาษาไทย และ decision state render ถูกต้องและตรงกับ Markdown คู่กัน

### ขั้นที่ 5: Commit งานที่ 5

```powershell
git add docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.en.html docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.md docs/superpowers/reports/2026-08-03-monolith-cockpit-wave-1-validation.th.html
git diff --cached --check
git commit -m "docs: record cockpit wave 1 usability gate"
```

## Final Verification Gate

รันจาก isolated nested product worktree:

```powershell
npm.cmd run test:run
npm.cmd run e2e -- e2e/cockpit-contract.spec.ts
npm.cmd run build -- --outDir C:\tmp\monolith-cockpit-wave1-final-build
rg -n "/diagnostics/cockpit-preview|DEMO · NON-AUTHORITATIVE" C:\tmp\monolith-cockpit-wave1-final-build
git status --short
```

ผลที่คาด:

- Unit/component suite ผ่าน
- Rendered Cockpit contract ผ่าน
- Production build ผ่านและไม่รวม development preview route
- ไม่มี generated `dist/` ถูก stage
- runtime change มีเพียง pure read-model prototype กับ shared NFP banner และยังไม่มี production Project Cockpit route
- validation report มี gate decision พร้อมหลักฐาน ไม่ใช่คำกล่าวอ้างเชิงความหวัง

ก่อน integration ให้ขอ code review ที่เน้น authority boundary, fail-closed behavior, การ render NFP บน runtime path จริง, route gating, accessibility และการหลุดเข้ามาของ production action โดยไม่ตั้งใจ

## สิ่งที่เลื่อนออกไปอย่างชัดเจน

- การ implement Project Context Foundation และ server-authoritative identity resolution
- การเชื่อม Project Cockpit เข้า production route
- One Decision Pipeline สำหรับ client design approval
- One Exception Projection สำหรับ factory blocker
- Effect Ledger/Outbox และการจัดการ partial failure
- Role-specific view และช่องทาง LINE
- Controlled Studio Brand Kit และ visual profile สำหรับ customer/field
- Factory execution, release, approval หรือ call to action ที่ย้อนกลับไม่ได้

แผน implementation ถัดไปเริ่มได้ต่อเมื่อ Task 5 บันทึกผล `PROCEED` หรือ `NARROW` ที่ได้รับการยอมรับอย่างชัดเจน และ Project Context Foundation มี authority design กับ test ที่อนุมัติแล้วเป็นของตัวเอง
