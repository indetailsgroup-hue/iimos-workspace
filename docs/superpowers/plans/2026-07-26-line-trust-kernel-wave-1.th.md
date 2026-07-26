# แผน Implementation LINE Trust Kernel Wave 1

> **สำหรับ Agentic Workers:** REQUIRED SUB-SKILL: ใช้ superpowers:subagent-driven-development (แนะนำ) หรือ superpowers:executing-plans เพื่อลงมือตามแผนทีละ Task ทุก Step ใช้ checkbox (`- [ ]`) สำหรับติดตาม

**เป้าหมาย:** เพิ่ม canonical Trust Kernel contracts, additive tenant bridge, policy-decision record และ verified LINE shadow observer โดยไม่เปลี่ยน business outcome ของ Daph และไม่ส่งข้อความจริง

**สถาปัตยกรรม:** PostgreSQL ยังคงเป็น authoritative enforcement/audit boundary ส่วน pure TypeScript contracts ทำให้คำศัพท์การตัดสิน deterministic และทดสอบได้ Additive migrations เพิ่ม canonical Tenant–Organization–Site ไว้ข้าง `site_code` ปัจจุบัน ใน Wave 1 `rpc_ingest_line_webhook` เดิมยังเป็น authoritative path ขณะที่ observer ชุดที่สองตรวจ signature และบันทึกเฉพาะ shadow decision โดยไม่มีสิทธิ์เขียน domain state หรือ delivery intent

**Tech Stack:** TypeScript 5.2, Vitest 3, fast-check 4, Supabase Edge Functions บน Deno, PostgreSQL/PLpgSQL, Supabase CLI, Python 3 พร้อม pytest 8/Hypothesis 6/psycopg 3 และ Node.js ESM

## Global Constraints

- ลงมือใน isolated worktree ของ nested repository ที่สร้างด้วย `using-git-worktrees`; ห้ามทำใน dirty checkout ปัจจุบัน
- อ่าน parent `CONTEXT.md` และเอกสารแก้ไขขอบเขต repository วันที่ 21 กรกฎาคม 2026 ก่อนกล่าวถึง current state
- รักษา dirty worktree เดิมของ parent และ nested repository
- Baseline ของแผนคือ approved design commit `5ff835145d91fee403c3a19f1f01ef20459a052f`; rebase execution worktree ก่อน Task 1 หากเลือก base ใหม่
- Migration `0162`, `0163` และ `0164` สงวนให้ Wave นี้ หาก execution base มีเลขใดเลขหนึ่งแล้ว ให้หยุดก่อนแก้ไฟล์และออก plan correction เพื่อเปลี่ยนเลขทั้งสามพร้อมกัน
- LINE เป็น Human Surface ไม่ใช่ system of record หรือ authorization authority
- Daph เป็น pilot tenant หนึ่งราย ไม่ใช่เจ้าของแพลตฟอร์ม
- Wave 1 ยังอ่าน/เขียน `site_code` เพื่อ compatibility แต่ shadow decision ทุกตัวต้องบันทึก canonical tenant resolution
- Wave 1 เป็น shadow-only: ห้ามเปลี่ยน legacy business outcome, สร้าง outbound delivery intent หรือเปิด Tenant-2 live messaging
- Default policy คือ `DENY`; unknown actor ได้ `QUARANTINE` เฉพาะ `evidence.submit`
- Delegation ต้อง explicit, expiring, revocable, non-transitive และไม่เพิ่มอำนาจ
- ห้าม log channel secret, access token, bind token, authorization code, raw ID token หรือ PII ที่ไม่จำเป็น
- ใช้ TDD กับทุก behavior ใน code/SQL
- ทุก Task จบด้วย targeted verification และ focused commit
- Project-facing Markdown ต้องมี EN/TH และ standalone HTML ที่ตรงกัน

---

## File Map

### สร้าง

- `scripts/line-trust-baseline.mjs` — deterministic repository baseline generator
- `scripts/__tests__/lineTrustBaseline.test.ts` — baseline generator contract
- `supabase/functions/_shared/trust-kernel/types.ts` — canonical decision/envelope types
- `supabase/functions/_shared/trust-kernel/policy.ts` — pure fail-closed policy evaluator
- `supabase/functions/_shared/trust-kernel/policy.test.ts` — unit/table-driven policy tests
- `supabase/migrations/0162_line_trust_tenant_foundation.sql` — canonical tenant structures และ additive Daph mapping
- `supabase/migrations/0163_line_trust_policy_decision.sql` — action catalog, policy decision ledger และ authorization RPC
- `supabase/migrations/0164_line_trust_shadow_ingress.sql` — signature-verifying shadow inbox และ observer RPC
- `tests/line-oa-commerce/py/test_tenant_boundary_property.py`
- `tests/line-oa-commerce/py/test_trust_policy_property.py`
- `tests/line-oa-commerce/py/test_shadow_ingress_property.py`
- `supabase/functions/line-webhook/index.test.ts`
- `scripts/line-trust-shadow-report.mjs`
- `scripts/__tests__/lineTrustShadowReport.test.ts`
- `docs/runbooks/line-trust-foundation/wave-1-shadow.en.md`
- `docs/runbooks/line-trust-foundation/wave-1-shadow.th.md`
- `docs/runbooks/line-trust-foundation/wave-1-shadow.en.html`
- `docs/runbooks/line-trust-foundation/wave-1-shadow.th.html`

### แก้ไข

- `supabase/functions/line-webhook/index.ts:35-122` — inject/invoke shadow observer หลัง verified legacy acceptance เท่านั้น
- `package.json` — เพิ่ม `test:line-trust` และ `report:line-trust-shadow`

### Wave 1 ห้ามแก้

- `supabase/functions/approval-postback/index.ts`
- `supabase/functions/line-login/index.ts`
- `supabase/functions/line-outbound-sender/index.ts`
- Migration เดิม `00000000000000` ถึง `0161`
- LINE channel webhook configuration
- Live customer delivery configuration ทุกชนิด

---

### Task 1: Reproducible Trust Baseline

**Files:**
- Create: `scripts/line-trust-baseline.mjs`
- Create: `scripts/__tests__/lineTrustBaseline.test.ts`
- Modify: `package.json`

**Interfaces:**
- รับ tracked file paths จาก `git ls-files` และ UTF-8 source text
- สร้าง `summarizeTrustBaseline(entries: SourceEntry[]): TrustBaseline`
- CLI สร้าง `artifacts/line-trust/wave-1-baseline.json`

- [ ] **Step 1: ติดตั้ง dependency ตาม lockfile ใน isolated worktree**

Run:

```bash
npm ci
```

Expected: exit `0`; มี `node_modules/.bin/vitest` และ `node_modules/.bin/tsc` หลักฐานนี้พิสูจน์เฉพาะ dependency installation

- [ ] **Step 2: เขียน failing baseline contract test**

สร้าง `scripts/__tests__/lineTrustBaseline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeTrustBaseline } from "../line-trust-baseline.mjs";

describe("summarizeTrustBaseline", () => {
  it("separates tenant evidence, site aliases, and LINE mutation surfaces", () => {
    const entries = [
      { path: "a.sql", text: "tenant_id uuid" },
      { path: "b.sql", text: "site_code text" },
      { path: "supabase/functions/line-webhook/index.ts", text: "handleLineWebhook" },
      { path: "supabase/functions/approval-postback/index.ts", text: "handleApprovalPostback" },
      { path: "x.ts", text: "insert into public.line_oa_outbound_messages" },
    ];

    expect(summarizeTrustBaseline(entries)).toEqual({
      trackedFiles: 5,
      filesWithTenantId: ["a.sql"],
      filesWithSiteCode: ["b.sql"],
      lineIngressEntrypoints: [
        "supabase/functions/approval-postback/index.ts",
        "supabase/functions/line-webhook/index.ts",
      ],
      outboundMutationFiles: ["x.ts"],
    });
  });
});
```

- [ ] **Step 3: รันเพื่อยืนยัน Red State**

Run:

```bash
npm run test:run -- scripts/__tests__/lineTrustBaseline.test.ts
```

Expected: FAIL เพราะยังไม่มี `scripts/line-trust-baseline.mjs`

- [ ] **Step 4: Implement deterministic baseline generator**

สร้าง `scripts/line-trust-baseline.mjs`:

```js
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{ path: string; text: string }} SourceEntry */

/**
 * @param {SourceEntry[]} entries
 */
export function summarizeTrustBaseline(entries) {
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  const paths = (pattern) =>
    sorted.filter(({ text }) => pattern.test(text)).map(({ path }) => path);

  return {
    trackedFiles: sorted.length,
    filesWithTenantId: paths(/\btenant_id\b/i),
    filesWithSiteCode: paths(/\bsite_code\b/i),
    lineIngressEntrypoints: sorted
      .filter(({ path }) =>
        /^supabase\/functions\/(?:line-webhook|approval-postback)\/index\.ts$/.test(path)
      )
      .map(({ path }) => path),
    outboundMutationFiles: paths(/insert\s+into\s+public\.line_oa_outbound_messages/i),
  };
}

function runCli() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const tracked = execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  }).split(/\r?\n/).filter(Boolean);
  const entries = tracked.map((path) => ({
    path,
    text: readFileSync(resolve(root, path), "utf8"),
  }));
  const output = resolve(root, "artifacts/line-trust/wave-1-baseline.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(summarizeTrustBaseline(entries), null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
```

เพิ่ม key ต่อไปนี้ใน `scripts` object เดิมของ `package.json` โดยไม่แทนคำสั่งเดิม:

```json
{
  "scripts": {
    "report:line-trust-baseline": "node scripts/line-trust-baseline.mjs"
  }
}
```

- [ ] **Step 5: รัน test และสร้าง baseline**

Run:

```bash
npm run test:run -- scripts/__tests__/lineTrustBaseline.test.ts
npm run report:line-trust-baseline
```

Expected: Test PASS; report exit `0`; JSON ระบุ ingress entrypoint ทั้งสองและนับ `tenant_id`/`site_code` โดยไม่อ้าง production readiness

- [ ] **Step 6: Commit Task 1**

```bash
git add package.json scripts/line-trust-baseline.mjs scripts/__tests__/lineTrustBaseline.test.ts
git commit -m "test(line): add trust baseline inventory"
```

---

### Task 2: Canonical Trust Kernel TypeScript Contract

**Files:**
- Create: `supabase/functions/_shared/trust-kernel/types.ts`
- Create: `supabase/functions/_shared/trust-kernel/policy.ts`
- Create: `supabase/functions/_shared/trust-kernel/policy.test.ts`

**Interfaces:**
- รับ `TrustEnvelope` และ resolved `TrustContext`
- สร้าง `evaluateTrustPolicy(envelope, context): TrustDecisionResult`
- Stable decision values: `PERMIT | DENY | STEP_UP | QUARANTINE`

- [ ] **Step 1: เขียน failing policy tests**

สร้าง `supabase/functions/_shared/trust-kernel/policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateTrustPolicy } from "./policy";
import type { TrustContext, TrustEnvelope } from "./types";

const envelope: TrustEnvelope = {
  correlationId: "corr-1",
  channelIdentifier: "line-main",
  resolvedTenantId: "tenant-a",
  ownerTenantId: "tenant-a",
  transportActor: { provider: "line", subjectId: "U1" },
  action: "project.view",
  resource: { kind: "project", id: "project-1", expectedRevision: 4 },
  payloadDigest: "sha256:abc",
  risk: "low",
  occurredAt: "2026-07-26T00:00:00.000Z",
};

const context: TrustContext = {
  profileId: "profile-1",
  membershipActive: true,
  membershipKind: "employee",
  roleAllowsAction: true,
  grantAllowsAction: false,
  delegation: null,
  assurance: "bound",
};

describe("evaluateTrustPolicy", () => {
  it("denies a tenant mismatch", () => {
    expect(evaluateTrustPolicy(
      { ...envelope, ownerTenantId: "tenant-b" },
      context,
    )).toMatchObject({ decision: "DENY", reasonCodes: ["TENANT_MISMATCH"] });
  });

  it("quarantines unknown actors only for evidence submission", () => {
    const unknown = { ...context, profileId: null, membershipActive: false };
    expect(evaluateTrustPolicy(
      { ...envelope, action: "evidence.submit" },
      unknown,
    ).decision).toBe("QUARANTINE");
    expect(evaluateTrustPolicy(envelope, unknown).decision).toBe("DENY");
  });

  it("requires action-bound step-up for high risk", () => {
    expect(evaluateTrustPolicy(
      { ...envelope, action: "design.approve", risk: "high" },
      context,
    )).toMatchObject({ decision: "STEP_UP", requiredAssurance: "step_up" });
  });

  it("denies transitive or privilege-amplifying delegation", () => {
    expect(evaluateTrustPolicy(envelope, {
      ...context,
      delegation: {
        active: true,
        actionAllowed: true,
        resourceAllowed: true,
        nonTransitive: false,
        withinDelegatorAuthority: true,
      },
    })).toMatchObject({ decision: "DENY", reasonCodes: ["DELEGATION_TRANSITIVE"] });
  });

  it("permits an active employee role or a scoped guest grant", () => {
    expect(evaluateTrustPolicy(envelope, context).decision).toBe("PERMIT");
    expect(evaluateTrustPolicy(envelope, {
      ...context,
      membershipKind: "guest",
      roleAllowsAction: false,
      grantAllowsAction: true,
    }).decision).toBe("PERMIT");
  });
});
```

- [ ] **Step 2: รันเพื่อยืนยัน Red State**

Run:

```bash
npm run test:run -- supabase/functions/_shared/trust-kernel/policy.test.ts
```

Expected: FAIL เพราะยังไม่มี `policy.ts` และ `types.ts`

- [ ] **Step 3: Implement contract types**

สร้าง `supabase/functions/_shared/trust-kernel/types.ts`:

```ts
export type TrustDecision = "PERMIT" | "DENY" | "STEP_UP" | "QUARANTINE";
export type RiskTier = "low" | "medium" | "high" | "prohibited";
export type AssuranceLevel = "transport" | "bound" | "step_up";
export type MembershipKind = "employee" | "guest";

export interface TrustEnvelope {
  readonly correlationId: string;
  readonly channelIdentifier: string;
  readonly resolvedTenantId: string | null;
  readonly ownerTenantId: string | null;
  readonly transportActor: {
    readonly provider: "line";
    readonly subjectId: string | null;
  };
  readonly action: string;
  readonly resource: {
    readonly kind: string;
    readonly id: string | null;
    readonly expectedRevision: number | null;
  };
  readonly payloadDigest: string;
  readonly risk: RiskTier;
  readonly occurredAt: string;
}

export interface DelegationContext {
  readonly active: boolean;
  readonly actionAllowed: boolean;
  readonly resourceAllowed: boolean;
  readonly nonTransitive: boolean;
  readonly withinDelegatorAuthority: boolean;
}

export interface TrustContext {
  readonly profileId: string | null;
  readonly membershipActive: boolean;
  readonly membershipKind: MembershipKind | null;
  readonly roleAllowsAction: boolean;
  readonly grantAllowsAction: boolean;
  readonly delegation: DelegationContext | null;
  readonly assurance: AssuranceLevel;
}

export interface TrustDecisionResult {
  readonly decision: TrustDecision;
  readonly reasonCodes: readonly string[];
  readonly requiredAssurance: AssuranceLevel | null;
}
```

- [ ] **Step 4: Implement fail-closed evaluator**

สร้าง `supabase/functions/_shared/trust-kernel/policy.ts`:

```ts
import type {
  TrustContext,
  TrustDecisionResult,
  TrustEnvelope,
} from "./types";

const result = (
  decision: TrustDecisionResult["decision"],
  reasonCodes: readonly string[],
  requiredAssurance: TrustDecisionResult["requiredAssurance"] = null,
): TrustDecisionResult => ({ decision, reasonCodes, requiredAssurance });

export function evaluateTrustPolicy(
  envelope: TrustEnvelope,
  context: TrustContext,
): TrustDecisionResult {
  if (!envelope.resolvedTenantId || !envelope.ownerTenantId) {
    return result("DENY", ["TENANT_UNRESOLVED"]);
  }
  if (envelope.resolvedTenantId !== envelope.ownerTenantId) {
    return result("DENY", ["TENANT_MISMATCH"]);
  }
  if (!context.profileId) {
    return envelope.action === "evidence.submit"
      ? result("QUARANTINE", ["ACTOR_UNKNOWN_EVIDENCE_ONLY"])
      : result("DENY", ["ACTOR_UNKNOWN"]);
  }
  if (!context.membershipActive) {
    return result("DENY", ["MEMBERSHIP_INACTIVE"]);
  }
  if (context.delegation) {
    if (!context.delegation.nonTransitive) {
      return result("DENY", ["DELEGATION_TRANSITIVE"]);
    }
    if (!context.delegation.withinDelegatorAuthority) {
      return result("DENY", ["DELEGATION_AMPLIFIES_PRIVILEGE"]);
    }
    if (
      !context.delegation.active ||
      !context.delegation.actionAllowed ||
      !context.delegation.resourceAllowed
    ) {
      return result("DENY", ["DELEGATION_SCOPE_DENIED"]);
    }
  }
  if (envelope.risk === "prohibited") {
    return result("DENY", ["ACTION_PROHIBITED_ON_LINE"]);
  }
  if (envelope.risk === "high" && context.assurance !== "step_up") {
    return result("STEP_UP", ["ASSURANCE_INSUFFICIENT"], "step_up");
  }
  const allowed = context.membershipKind === "guest"
    ? context.grantAllowsAction
    : context.roleAllowsAction || context.grantAllowsAction;
  return allowed
    ? result("PERMIT", ["POLICY_ALLOWED"])
    : result("DENY", ["ACTION_NOT_GRANTED"]);
}
```

- [ ] **Step 5: รัน targeted tests และ type checking**

Run:

```bash
npm run test:run -- supabase/functions/_shared/trust-kernel/policy.test.ts
npx tsc --noEmit
```

Expected: Policy tests PASS; TypeScript exit `0`

- [ ] **Step 6: Commit Task 2**

```bash
git add supabase/functions/_shared/trust-kernel
git commit -m "feat(line): define trust kernel policy contract"
```

---

### Task 3: Additive Tenant–Organization–Site Foundation

**Files:**
- Create: `supabase/migrations/0162_line_trust_tenant_foundation.sql`
- Create: `tests/line-oa-commerce/py/test_tenant_boundary_property.py`

**Interfaces:**
- สร้าง canonical tables: `tenants`, `organizations`, `sites`, `auth_subjects`, `tenant_profiles`, `tenant_memberships`, `project_parties`, `access_grants`, `trust_delegations`, `line_identity_bindings`, `site_code_mappings`
- เพิ่ม nullable bridge columns ให้ LINE/project rows ปัจจุบัน; Wave 1 ยังไม่ลบ `site_code`
- สร้าง `resolve_tenant_from_site_code(text)` และ `current_tenant_id()`

- [ ] **Step 1: เขียน failing database property test**

สร้าง `tests/line-oa-commerce/py/test_tenant_boundary_property.py`:

```py
from __future__ import annotations

import json
import os
import uuid
import uuid

import pytest

from harness import get_connection


pytestmark = pytest.mark.skipif(
    not os.getenv("LINE_OA_TEST_DATABASE_URL"),
    reason="LINE_OA_TEST_DATABASE_URL is required",
)


def test_daph_bridge_resolves_existing_active_site_codes() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("""
          select a.site_code, public.resolve_tenant_from_site_code(a.site_code)
          from public.get_active_site_codes() a
        """)
        rows = cur.fetchall()
        assert rows
        assert all(site_code and tenant_id for site_code, tenant_id in rows)


def test_project_party_cannot_cross_owner_tenant() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()
        org_a, org_b = uuid.uuid4(), uuid.uuid4()
        project_id = uuid.uuid4()
        cur.execute(
            "insert into public.tenants(id, slug, display_name) values (%s,%s,%s),(%s,%s,%s)",
            (tenant_a, f"a-{tenant_a}", "A", tenant_b, f"b-{tenant_b}", "B"),
        )
        cur.execute(
            "insert into public.organizations(id, tenant_id, slug, display_name, organization_type) "
            "values (%s,%s,%s,%s,'studio'),(%s,%s,%s,%s,'contractor')",
            (org_a, tenant_a, f"a-{org_a}", "A", org_b, tenant_b, f"b-{org_b}", "B"),
        )
        cur.execute(
            "insert into public.installation_projects(id, name, owner_tenant_id, owner_organization_id) "
            "values (%s,'isolation-test',%s,%s)",
            (project_id, tenant_a, org_a),
        )
        with pytest.raises(Exception):
            cur.execute(
                "insert into public.project_parties(project_id, owner_tenant_id, organization_id, party_role) "
                "values (%s,%s,%s,'contractor')",
                (project_id, tenant_a, org_b),
            )
        conn.rollback()


def test_authenticated_tenant_cannot_read_another_tenant() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()
        org_a, org_b = uuid.uuid4(), uuid.uuid4()
        cur.execute(
            "insert into public.tenants(id, slug, display_name) values (%s,%s,'A'),(%s,%s,'B')",
            (tenant_a, f"a-{tenant_a}", tenant_b, f"b-{tenant_b}"),
        )
        cur.execute(
            "insert into public.organizations(id, tenant_id, slug, display_name, organization_type) "
            "values (%s,%s,%s,'A','studio'),(%s,%s,%s,'B','studio')",
            (org_a, tenant_a, f"a-{org_a}", org_b, tenant_b, f"b-{org_b}"),
        )
        claims = json.dumps({"app_metadata": {"tenant_id": str(tenant_a)}})
        cur.execute("select set_config('request.jwt.claims', %s, true)", (claims,))
        cur.execute("set role authenticated")
        try:
            cur.execute(
                "select id from public.organizations where id in (%s,%s) order by id",
                (org_a, org_b),
            )
            assert [row[0] for row in cur.fetchall()] == [org_a]
        finally:
            cur.execute("reset role")
            conn.rollback()
```

- [ ] **Step 2: Reset local database และยืนยัน Red State**

Run:

```bash
supabase db reset --local
cd tests/line-oa-commerce/py
python -m pytest -q test_tenant_boundary_property.py
```

Expected: FAIL เพราะ canonical tables และ resolver ยังไม่มี

- [ ] **Step 3: สร้าง additive foundation migration**

สร้าง `supabase/migrations/0162_line_trust_tenant_foundation.sql` ด้วย invariant ต่อไปนี้:

```sql
create extension if not exists pgcrypto;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'suspended', 'closed')),
  policy_version text not null default 'line-trust-v1',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  slug text not null,
  display_name text not null,
  organization_type text not null,
  lifecycle_status text not null default 'active',
  unique (tenant_id, slug),
  unique (id, tenant_id)
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  organization_id uuid not null,
  code text not null,
  display_name text not null,
  lifecycle_status text not null default 'active',
  foreign key (organization_id, tenant_id)
    references public.organizations(id, tenant_id),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

create table public.auth_subjects (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  lifecycle_status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.tenant_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  auth_subject_id uuid references public.auth_subjects(id),
  display_name text,
  lifecycle_status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, tenant_id)
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  profile_id uuid not null,
  organization_id uuid,
  membership_kind text not null check (membership_kind in ('employee', 'guest')),
  role_codes text[] not null default '{}',
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  foreign key (profile_id, tenant_id)
    references public.tenant_profiles(id, tenant_id),
  foreign key (organization_id, tenant_id)
    references public.organizations(id, tenant_id)
);

alter table public.installation_projects
  add column if not exists owner_tenant_id uuid references public.tenants(id),
  add column if not exists owner_organization_id uuid,
  add column if not exists canonical_site_id uuid;

create or replace function public.guard_installation_project_tenant()
returns trigger language plpgsql as $$
declare
  v_org_tenant uuid;
  v_site_tenant uuid;
  v_site_org uuid;
begin
  if new.owner_organization_id is not null then
    select tenant_id into v_org_tenant
    from public.organizations where id = new.owner_organization_id;
    if new.owner_tenant_id is null or v_org_tenant <> new.owner_tenant_id then
      raise exception 'project_owner_tenant_mismatch' using errcode = '23514';
    end if;
  end if;
  if new.canonical_site_id is not null then
    select tenant_id, organization_id into v_site_tenant, v_site_org
    from public.sites where id = new.canonical_site_id;
    if v_site_tenant <> new.owner_tenant_id
       or v_site_org <> new.owner_organization_id then
      raise exception 'project_site_tenant_mismatch' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_installation_project_tenant
before insert or update on public.installation_projects
for each row execute function public.guard_installation_project_tenant();

create table public.project_parties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.installation_projects(id) on delete cascade,
  owner_tenant_id uuid not null references public.tenants(id),
  organization_id uuid not null references public.organizations(id),
  party_role text not null,
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  unique (project_id, organization_id, party_role)
);

create or replace function public.guard_project_party_tenant()
returns trigger language plpgsql as $$
declare
  v_project_tenant uuid;
  v_org_tenant uuid;
begin
  select owner_tenant_id into v_project_tenant
  from public.installation_projects where id = new.project_id;
  select tenant_id into v_org_tenant
  from public.organizations where id = new.organization_id;
  if v_project_tenant is null
     or new.owner_tenant_id <> v_project_tenant
     or v_org_tenant <> v_project_tenant then
    raise exception 'project_party_tenant_mismatch'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_project_party_tenant
before insert or update on public.project_parties
for each row execute function public.guard_project_party_tenant();

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  profile_id uuid not null,
  resource_kind text not null,
  resource_id uuid not null,
  actions text[] not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  issued_by_profile_id uuid,
  revoked_at timestamptz,
  reason text not null,
  foreign key (profile_id, tenant_id)
    references public.tenant_profiles(id, tenant_id),
  foreign key (issued_by_profile_id, tenant_id)
    references public.tenant_profiles(id, tenant_id)
);

create table public.trust_delegations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  delegator_profile_id uuid not null,
  delegate_profile_id uuid not null,
  resource_kind text not null,
  resource_id uuid not null,
  actions text[] not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  reason text not null,
  non_transitive boolean not null default true check (non_transitive),
  revoked_at timestamptz,
  check (delegator_profile_id <> delegate_profile_id),
  foreign key (delegator_profile_id, tenant_id)
    references public.tenant_profiles(id, tenant_id),
  foreign key (delegate_profile_id, tenant_id)
    references public.tenant_profiles(id, tenant_id)
);

create table public.line_identity_bindings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  profile_id uuid not null,
  channel_identifier text not null references public.line_oa_channels(channel_identifier),
  line_subject_id text not null,
  assurance text not null check (assurance in ('transport', 'bound', 'step_up')),
  lifecycle_status text not null default 'active'
    check (lifecycle_status in ('pending', 'active', 'suspended', 'revoked')),
  verified_at timestamptz,
  revoked_at timestamptz,
  unique (tenant_id, channel_identifier, line_subject_id),
  foreign key (profile_id, tenant_id)
    references public.tenant_profiles(id, tenant_id)
);

create table public.site_code_mappings (
  site_code text primary key,
  tenant_id uuid not null references public.tenants(id),
  organization_id uuid not null,
  site_id uuid not null,
  valid_from timestamptz not null default timezone('utc', now()),
  valid_until timestamptz,
  migration_status text not null default 'mapped'
    check (migration_status in ('mapped', 'ambiguous', 'retired')),
  unique (site_code, tenant_id),
  foreign key (organization_id, tenant_id)
    references public.organizations(id, tenant_id),
  foreign key (site_id, tenant_id)
    references public.sites(id, tenant_id)
);

alter table public.line_oa_channels
  add column if not exists tenant_id uuid references public.tenants(id);
alter table public.line_groups
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists canonical_site_id uuid references public.sites(id);

insert into public.tenants(id, slug, display_name)
values ('00000000-0000-4000-8000-000000000001', 'daph', 'Daph')
on conflict (id) do nothing;

insert into public.organizations(
  id, tenant_id, slug, display_name, organization_type
) values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'daph',
  'Daph',
  'studio'
) on conflict (id) do nothing;

insert into public.sites(tenant_id, organization_id, code, display_name)
select
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  a.site_code,
  a.site_code
from public.get_active_site_codes() a
on conflict (tenant_id, code) do nothing;

insert into public.site_code_mappings(site_code, tenant_id, organization_id, site_id)
select s.code, s.tenant_id, s.organization_id, s.id
from public.sites s
where s.tenant_id = '00000000-0000-4000-8000-000000000001'
on conflict (site_code) do update
set tenant_id = excluded.tenant_id,
    organization_id = excluded.organization_id,
    site_id = excluded.site_id,
    migration_status = 'mapped';

update public.line_oa_channels
set tenant_id = '00000000-0000-4000-8000-000000000001'
where tenant_id is null;

create or replace function public.guard_line_binding_tenant()
returns trigger language plpgsql as $$
declare
  v_channel_tenant uuid;
begin
  select tenant_id into v_channel_tenant
  from public.line_oa_channels
  where channel_identifier = new.channel_identifier;
  if v_channel_tenant is null or v_channel_tenant <> new.tenant_id then
    raise exception 'line_binding_tenant_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_line_binding_tenant
before insert or update on public.line_identity_bindings
for each row execute function public.guard_line_binding_tenant();

update public.installation_projects p
set owner_tenant_id = m.tenant_id,
    owner_organization_id = m.organization_id,
    canonical_site_id = m.site_id
from public.site_code_mappings m
where p.site_code = m.site_code
  and p.owner_tenant_id is null;

update public.line_groups g
set tenant_id = coalesce(p.owner_tenant_id, m.tenant_id),
    canonical_site_id = coalesce(p.canonical_site_id, m.site_id)
from public.installation_projects p
left join public.site_code_mappings m on m.site_code = p.site_code
where g.project_id = p.id and g.tenant_id is null;

create or replace function public.resolve_tenant_from_site_code(p_site_code text)
returns uuid language sql stable as $$
  select m.tenant_id
  from public.site_code_mappings m
  where m.site_code = p_site_code
    and m.migration_status = 'mapped'
    and (m.valid_until is null or m.valid_until > timezone('utc', now()));
$$;

create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid;
$$;

alter table public.tenants enable row level security;
create policy tenants_read_own on public.tenants
for select to authenticated using (id = public.current_tenant_id());

alter table public.organizations enable row level security;
create policy organizations_read_own on public.organizations
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.sites enable row level security;
create policy sites_read_own on public.sites
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.auth_subjects enable row level security;

alter table public.tenant_profiles enable row level security;
create policy tenant_profiles_read_own on public.tenant_profiles
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.tenant_memberships enable row level security;
create policy tenant_memberships_read_own on public.tenant_memberships
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.project_parties enable row level security;
create policy project_parties_read_own on public.project_parties
for select to authenticated using (owner_tenant_id = public.current_tenant_id());

alter table public.access_grants enable row level security;
create policy access_grants_read_own on public.access_grants
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.trust_delegations enable row level security;
create policy trust_delegations_read_own on public.trust_delegations
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.line_identity_bindings enable row level security;
create policy line_identity_bindings_read_own on public.line_identity_bindings
for select to authenticated using (tenant_id = public.current_tenant_id());

alter table public.site_code_mappings enable row level security;
create policy site_code_mappings_read_own on public.site_code_mappings
for select to authenticated using (tenant_id = public.current_tenant_id());
```

Wave 1 ห้ามเพิ่ม `NOT NULL` ให้ bridge columns แถวที่ unresolved ต้องมองเห็นใน shadow report และ block enforcement

- [ ] **Step 4: Reset database และรัน tenant test**

Run:

```bash
supabase db reset --local
cd tests/line-oa-commerce/py
python -m pytest -q test_tenant_boundary_property.py
```

Expected: PASS; active site code เดิม resolve เป็น Daph pilot tenant ที่กำหนดไว้ และ cross-tenant project-party insert ล้มเหลว

- [ ] **Step 5: รัน existing schema/RLS regression tests**

Run จาก `tests/line-oa-commerce/py`:

```bash
python -m pytest -q test_schema_structure_smoke.py test_rls_read_scoping_property.py
```

Expected: PASS หรือมีเฉพาะ documented skips จาก external prerequisite; ไม่มี failed test

- [ ] **Step 6: Commit Task 3**

```bash
git add supabase/migrations/0162_line_trust_tenant_foundation.sql tests/line-oa-commerce/py/test_tenant_boundary_property.py
git commit -m "feat(line): add canonical tenant compatibility bridge"
```

---

### Task 4: Database Policy Decision และ Immutable Decision Record

**Files:**
- Create: `supabase/migrations/0163_line_trust_policy_decision.sql`
- Create: `tests/line-oa-commerce/py/test_trust_policy_property.py`

**Interfaces:**
- รับ `rpc_authorize_business_action(p_envelope jsonb)`
- สร้าง JSON keys: `decision`, `reason_codes`, `required_assurance`, `decision_id`, `policy_version`
- เขียน `policy_decisions` หนึ่งแถวต่อหนึ่ง call

- [ ] **Step 1: เขียน failing decision property tests**

สร้าง `tests/line-oa-commerce/py/test_trust_policy_property.py`:

```py
from __future__ import annotations

import json
import os

import pytest

from harness import get_connection


pytestmark = pytest.mark.skipif(
    not os.getenv("LINE_OA_TEST_DATABASE_URL"),
    reason="LINE_OA_TEST_DATABASE_URL is required",
)


def ensure_channel(cur) -> None:
    cur.execute("""
      insert into public.line_oa_channels(
        channel_identifier, vertical_context, channel_secret_ref,
        channel_access_token_ref, is_active, tenant_id
      ) values (
        'test-line-channel', 'monolith', 'test-secret-ref',
        'test-token-ref', true, '00000000-0000-4000-8000-000000000001'
      )
      on conflict (channel_identifier) do update
      set tenant_id = excluded.tenant_id, is_active = true
    """)


def bind_profile(cur, line_user: str, kind: str, roles: list[str]):
    auth_subject_id, profile_id = uuid.uuid4(), uuid.uuid4()
    cur.execute(
        "insert into public.auth_subjects(id) values (%s)",
        (auth_subject_id,),
    )
    cur.execute(
        "insert into public.tenant_profiles(id, tenant_id, auth_subject_id) "
        "values (%s,'00000000-0000-4000-8000-000000000001',%s)",
        (profile_id, auth_subject_id),
    )
    cur.execute(
        "insert into public.tenant_memberships(tenant_id, profile_id, membership_kind, role_codes) "
        "values ('00000000-0000-4000-8000-000000000001',%s,%s,%s)",
        (profile_id, kind, roles),
    )
    cur.execute(
        "insert into public.line_identity_bindings("
        "tenant_id, profile_id, channel_identifier, line_subject_id, assurance"
        ") values ('00000000-0000-4000-8000-000000000001',%s,"
        "'test-line-channel',%s,'bound')",
        (profile_id, line_user),
    )
    return profile_id


def authorize(cur, **overrides):
    envelope = {
        "correlation_id": "policy-test",
        "channel_identifier": "test-line-channel",
        "line_subject_id": "unknown",
        "owner_tenant_id": "00000000-0000-4000-8000-000000000001",
        "action": "project.view",
        "resource_kind": "project",
        "resource_id": None,
        "expected_revision": 1,
        "payload_digest": "sha256:test",
    }
    envelope.update(overrides)
    cur.execute(
        "select public.rpc_authorize_business_action(%s::jsonb)",
        (json.dumps(envelope),),
    )
    return cur.fetchone()[0]


def test_unknown_actor_is_quarantine_only_for_evidence() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        ensure_channel(cur)
        assert authorize(cur, action="evidence.submit")["decision"] == "QUARANTINE"
        assert authorize(cur, action="project.view")["decision"] == "DENY"
        conn.rollback()


def test_tenant_mismatch_is_denied_and_audited() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        ensure_channel(cur)
        result = authorize(
            cur,
            owner_tenant_id="00000000-0000-4000-8000-000000000099",
        )
        assert result["decision"] == "DENY"
        assert "TENANT_MISMATCH" in result["reason_codes"]
        cur.execute(
            "select decision from public.policy_decisions where id = %s",
            (result["decision_id"],),
        )
        assert cur.fetchone()[0] == "DENY"
        conn.rollback()


def test_employee_role_permits_low_risk_and_high_risk_requires_step_up() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        ensure_channel(cur)
        bind_profile(cur, "employee-1", "employee", ["admin"])
        assert authorize(cur, line_subject_id="employee-1")["decision"] == "PERMIT"
        assert authorize(
            cur,
            line_subject_id="employee-1",
            action="design.approve",
        )["decision"] == "STEP_UP"
        conn.rollback()


def test_guest_grant_and_delegation_are_scoped_and_revocable() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        ensure_channel(cur)
        resource_id = uuid.uuid4()
        guest = bind_profile(cur, "guest-1", "guest", [])
        delegator = bind_profile(cur, "employee-2", "employee", ["admin"])

        assert authorize(
            cur,
            line_subject_id="guest-1",
            resource_id=str(resource_id),
        )["decision"] == "DENY"

        cur.execute(
            "insert into public.access_grants("
            "tenant_id,profile_id,resource_kind,resource_id,actions,"
            "starts_at,expires_at,reason"
            ") values ('00000000-0000-4000-8000-000000000001',%s,"
            "'project',%s,array['project.view'],now()-interval '1 minute',"
            "now()+interval '1 hour','test') returning id",
            (guest, resource_id),
        )
        grant_id = cur.fetchone()[0]
        assert authorize(
            cur,
            line_subject_id="guest-1",
            resource_id=str(resource_id),
        )["decision"] == "PERMIT"
        cur.execute(
            "update public.access_grants set revoked_at=now() where id=%s",
            (grant_id,),
        )

        cur.execute(
            "insert into public.trust_delegations("
            "tenant_id,delegator_profile_id,delegate_profile_id,resource_kind,"
            "resource_id,actions,starts_at,expires_at,reason"
            ") values ('00000000-0000-4000-8000-000000000001',%s,%s,"
            "'project',%s,array['project.view'],now()-interval '1 minute',"
            "now()+interval '1 hour','test') returning id",
            (delegator, guest, resource_id),
        )
        delegation_id = cur.fetchone()[0]
        assert authorize(
            cur,
            line_subject_id="guest-1",
            resource_id=str(resource_id),
        )["decision"] == "PERMIT"
        cur.execute(
            "update public.trust_delegations set revoked_at=now() where id=%s",
            (delegation_id,),
        )
        assert authorize(
            cur,
            line_subject_id="guest-1",
            resource_id=str(resource_id),
        )["decision"] == "DENY"
        conn.rollback()
```

- [ ] **Step 2: ยืนยัน Red State**

Run จาก `tests/line-oa-commerce/py`:

```bash
python -m pytest -q test_trust_policy_property.py
```

Expected: FAIL เพราะยังไม่มี `rpc_authorize_business_action` และ `policy_decisions`

- [ ] **Step 3: Implement action catalog, decision ledger และ RPC**

สร้าง `supabase/migrations/0163_line_trust_policy_decision.sql`:

```sql
create table public.trust_action_catalog (
  action text primary key,
  risk_tier text not null check (risk_tier in ('low', 'medium', 'high', 'prohibited')),
  allowed_roles text[] not null default '{}',
  unknown_evidence_allowed boolean not null default false,
  policy_version text not null default 'line-trust-v1'
);

insert into public.trust_action_catalog(
  action, risk_tier, allowed_roles, unknown_evidence_allowed
) values
  ('message.receive', 'low', array['admin','operations','branch_manager','branch_operator'], false),
  ('evidence.submit', 'low', array['admin','operations','branch_manager','branch_operator','installer'], true),
  ('project.view', 'low', array['admin','operations','branch_manager','branch_operator','designer','installer'], false),
  ('design.approve', 'high', array['admin','operations','customer_approver'], false),
  ('order.bind', 'high', array['admin','operations','finance','customer_approver'], false)
on conflict (action) do update
set risk_tier = excluded.risk_tier,
    allowed_roles = excluded.allowed_roles,
    unknown_evidence_allowed = excluded.unknown_evidence_allowed,
    policy_version = excluded.policy_version;

create table public.policy_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  profile_id uuid references public.tenant_profiles(id),
  transport_provider text not null,
  transport_subject text,
  action text not null,
  resource_kind text not null,
  resource_id uuid,
  expected_revision int,
  payload_digest text not null,
  decision text not null check (decision in ('PERMIT','DENY','STEP_UP','QUARANTINE')),
  reason_codes text[] not null,
  required_assurance text,
  policy_version text not null,
  correlation_id text not null,
  decided_at timestamptz not null default timezone('utc', now())
);

create or replace function public.policy_decisions_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'policy_decisions is append-only'
    using errcode = '55000';
end;
$$;

create trigger trg_policy_decisions_immutable
before update or delete on public.policy_decisions
for each row execute function public.policy_decisions_immutable();

alter table public.policy_decisions enable row level security;
create policy policy_decisions_read_own on public.policy_decisions
for select to authenticated using (tenant_id = public.current_tenant_id());
revoke insert, update, delete on public.policy_decisions from anon, authenticated;

create or replace function public.rpc_authorize_business_action(p_envelope jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_channel_tenant uuid;
  v_owner_tenant uuid := nullif(p_envelope ->> 'owner_tenant_id', '')::uuid;
  v_profile uuid;
  v_membership public.tenant_memberships%rowtype;
  v_action public.trust_action_catalog%rowtype;
  v_decision text := 'DENY';
  v_reasons text[] := array['ACTION_NOT_GRANTED'];
  v_required text := null;
  v_decision_id uuid;
  v_resource_id uuid := nullif(p_envelope ->> 'resource_id', '')::uuid;
begin
  select c.tenant_id into v_channel_tenant
  from public.line_oa_channels c
  where c.channel_identifier = p_envelope ->> 'channel_identifier'
    and c.is_active;

  select a.* into v_action
  from public.trust_action_catalog a
  where a.action = p_envelope ->> 'action';

  select b.profile_id into v_profile
  from public.line_identity_bindings b
  where b.tenant_id = v_channel_tenant
    and b.channel_identifier = p_envelope ->> 'channel_identifier'
    and b.line_subject_id = p_envelope ->> 'line_subject_id'
    and b.lifecycle_status = 'active';

  if v_channel_tenant is null or v_owner_tenant is null then
    v_reasons := array['TENANT_UNRESOLVED'];
  elsif v_channel_tenant <> v_owner_tenant then
    v_reasons := array['TENANT_MISMATCH'];
  elsif v_action.action is null then
    v_reasons := array['ACTION_UNKNOWN'];
  elsif v_profile is null then
    if v_action.unknown_evidence_allowed
       and v_action.action = 'evidence.submit' then
      v_decision := 'QUARANTINE';
      v_reasons := array['ACTOR_UNKNOWN_EVIDENCE_ONLY'];
    else
      v_reasons := array['ACTOR_UNKNOWN'];
    end if;
  else
    select m.* into v_membership
    from public.tenant_memberships m
    where m.tenant_id = v_channel_tenant
      and m.profile_id = v_profile
      and m.starts_at <= timezone('utc', now())
      and (m.expires_at is null or m.expires_at > timezone('utc', now()))
      and m.revoked_at is null
    order by m.starts_at desc
    limit 1;

    if v_membership.id is null then
      v_reasons := array['MEMBERSHIP_INACTIVE'];
    elsif v_action.risk_tier = 'prohibited' then
      v_reasons := array['ACTION_PROHIBITED_ON_LINE'];
    elsif v_action.risk_tier = 'high' then
      v_decision := 'STEP_UP';
      v_reasons := array['ASSURANCE_INSUFFICIENT'];
      v_required := 'step_up';
    elsif v_membership.membership_kind = 'guest' and exists (
      select 1 from public.access_grants g
      where g.tenant_id = v_channel_tenant
        and g.profile_id = v_profile
        and g.resource_kind = p_envelope ->> 'resource_kind'
        and g.resource_id = v_resource_id
        and p_envelope ->> 'action' = any(g.actions)
        and g.starts_at <= timezone('utc', now())
        and g.expires_at > timezone('utc', now())
        and g.revoked_at is null
    ) then
      v_decision := 'PERMIT';
      v_reasons := array['SCOPED_GRANT_ALLOWED'];
    elsif v_membership.membership_kind = 'employee'
       and v_membership.role_codes && v_action.allowed_roles then
      v_decision := 'PERMIT';
      v_reasons := array['ROLE_ALLOWED'];
    elsif exists (
      select 1
      from public.trust_delegations d
      join public.tenant_memberships dm
        on dm.tenant_id = d.tenant_id
       and dm.profile_id = d.delegator_profile_id
       and dm.starts_at <= timezone('utc', now())
       and (dm.expires_at is null or dm.expires_at > timezone('utc', now()))
       and dm.revoked_at is null
      where d.tenant_id = v_channel_tenant
        and d.delegate_profile_id = v_profile
        and d.resource_kind = p_envelope ->> 'resource_kind'
        and d.resource_id = v_resource_id
        and p_envelope ->> 'action' = any(d.actions)
        and d.non_transitive
        and d.starts_at <= timezone('utc', now())
        and d.expires_at > timezone('utc', now())
        and d.revoked_at is null
        and (
          (dm.membership_kind = 'employee' and dm.role_codes && v_action.allowed_roles)
          or exists (
            select 1 from public.access_grants dg
            where dg.tenant_id = d.tenant_id
              and dg.profile_id = d.delegator_profile_id
              and dg.resource_kind = d.resource_kind
              and dg.resource_id = d.resource_id
              and p_envelope ->> 'action' = any(dg.actions)
              and dg.starts_at <= timezone('utc', now())
              and dg.expires_at > timezone('utc', now())
              and dg.revoked_at is null
          )
        )
    ) then
      v_decision := 'PERMIT';
      v_reasons := array['DELEGATION_ALLOWED'];
    else
      v_reasons := case
        when v_membership.membership_kind = 'guest'
          then array['GUEST_GRANT_REQUIRED']
        else array['ACTION_NOT_GRANTED']
      end;
    end if;
  end if;

  insert into public.policy_decisions(
    tenant_id, profile_id, transport_provider, transport_subject,
    action, resource_kind, resource_id, expected_revision,
    payload_digest, decision, reason_codes, required_assurance,
    policy_version, correlation_id
  ) values (
    v_channel_tenant, v_profile, 'line', p_envelope ->> 'line_subject_id',
    coalesce(v_action.action, p_envelope ->> 'action'),
    coalesce(p_envelope ->> 'resource_kind', 'unknown'),
    v_resource_id,
    nullif(p_envelope ->> 'expected_revision', '')::int,
    coalesce(p_envelope ->> 'payload_digest', 'sha256:missing'),
    v_decision, v_reasons, v_required,
    coalesce(v_action.policy_version, 'line-trust-v1'),
    coalesce(p_envelope ->> 'correlation_id', gen_random_uuid()::text)
  ) returning id into v_decision_id;

  return jsonb_build_object(
    'decision', v_decision,
    'reason_codes', to_jsonb(v_reasons),
    'required_assurance', v_required,
    'decision_id', v_decision_id,
    'policy_version', coalesce(v_action.policy_version, 'line-trust-v1')
  );
end;
$$;

revoke all on function public.rpc_authorize_business_action(jsonb) from public;
grant execute on function public.rpc_authorize_business_action(jsonb) to service_role;
```

- [ ] **Step 4: Reset และรัน policy tests**

Run:

```bash
supabase db reset --local
cd tests/line-oa-commerce/py
python -m pytest -q test_tenant_boundary_property.py test_trust_policy_property.py
```

Expected: PASS; unknown actor quarantine ได้เฉพาะ evidence; tenant mismatch ถูก deny และบันทึก immutable decision หนึ่งรายการ

- [ ] **Step 5: Commit Task 4**

```bash
git add supabase/migrations/0163_line_trust_policy_decision.sql tests/line-oa-commerce/py/test_trust_policy_property.py
git commit -m "feat(line): add default-deny policy decision ledger"
```

---

### Task 5: Signature-Verified Shadow Inbox

**Files:**
- Create: `supabase/migrations/0164_line_trust_shadow_ingress.sql`
- Create: `tests/line-oa-commerce/py/test_shadow_ingress_property.py`

**Interfaces:**
- รับ `rpc_line_shadow_observe_webhook(channel_identifier, raw_body, signature)`
- สร้าง `{accepted, received, duplicate, unresolved, decisions}`
- เขียนได้เฉพาะ `line_inbound_events`, `policy_decisions` และ `line_shadow_observations`
- ห้ามเขียน `line_oa_outbound_messages`, `notification`, order, approval, workflow state หรือ project state

- [ ] **Step 1: เขียน failing no-side-effect property test**

สร้าง `tests/line-oa-commerce/py/test_shadow_ingress_property.py`:

```py
from __future__ import annotations

import json
import os

import pytest

from harness import get_connection


pytestmark = pytest.mark.skipif(
    not os.getenv("LINE_OA_TEST_DATABASE_URL"),
    reason="LINE_OA_TEST_DATABASE_URL is required",
)


def test_duplicate_shadow_observation_is_idempotent_and_never_delivers() -> None:
    channel = os.getenv("LINE_OA_TEST_CHANNEL")
    signature = os.getenv("LINE_OA_TEST_SIGNATURE")
    if not channel or not signature:
        pytest.skip("signed LINE test fixture is required")
    body = json.dumps({
        "destination": channel,
        "events": [{
            "webhookEventId": "shadow-event-1",
            "type": "message",
            "source": {"type": "user", "userId": "unknown-user"},
            "message": {"id": "m1", "type": "image"},
        }],
    }, separators=(",", ":"))

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("select count(*) from public.line_oa_outbound_messages")
        before = cur.fetchone()[0]
        cur.execute(
            "select public.rpc_line_shadow_observe_webhook(%s,%s,%s)",
            (channel, body, signature),
        )
        first = cur.fetchone()[0]
        cur.execute(
            "select public.rpc_line_shadow_observe_webhook(%s,%s,%s)",
            (channel, body, signature),
        )
        second = cur.fetchone()[0]
        cur.execute("select count(*) from public.line_oa_outbound_messages")
        after = cur.fetchone()[0]

        assert first["received"] == 1
        assert second["duplicate"] == 1
        assert before == after
```

- [ ] **Step 2: ยืนยัน Red State**

Run จาก `tests/line-oa-commerce/py`:

```bash
python -m pytest -q test_shadow_ingress_property.py
```

Expected: FAIL เพราะยังไม่มี shadow observer RPC หรือ SKIP เฉพาะเมื่อไม่มี signed fixture variables

- [ ] **Step 3: Implement shadow-only inbox และ observer**

สร้าง `supabase/migrations/0164_line_trust_shadow_ingress.sql`:

```sql
create table public.line_inbound_events (
  id uuid primary key default gen_random_uuid(),
  channel_identifier text not null references public.line_oa_channels(channel_identifier),
  tenant_id uuid references public.tenants(id),
  event_key text not null,
  event_type text not null,
  source_type text,
  source_id text,
  payload_digest text not null,
  raw_event jsonb not null,
  processing_state text not null default 'RECEIVED'
    check (processing_state in ('RECEIVED','OBSERVED','UNRESOLVED','RETRYABLE','DEAD_LETTER')),
  attempts int not null default 0,
  last_error_code text,
  received_at timestamptz not null default timezone('utc', now()),
  observed_at timestamptz,
  unique (channel_identifier, event_key)
);

create table public.line_shadow_observation_runs (
  id uuid primary key default gen_random_uuid(),
  channel_identifier text not null references public.line_oa_channels(channel_identifier),
  outbound_before bigint not null,
  outbound_after bigint,
  side_effect_detected boolean,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz
);

create table public.line_shadow_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.line_shadow_observation_runs(id),
  inbound_event_id uuid not null unique references public.line_inbound_events(id),
  policy_decision_id uuid not null references public.policy_decisions(id),
  legacy_outcome text not null default 'not_compared',
  shadow_outcome text not null,
  mismatch_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.line_inbound_events enable row level security;
alter table public.line_shadow_observation_runs enable row level security;
alter table public.line_shadow_observations enable row level security;
revoke all on public.line_inbound_events from anon, authenticated;
revoke all on public.line_shadow_observation_runs from anon, authenticated;
revoke all on public.line_shadow_observations from anon, authenticated;

create or replace function public.rpc_line_shadow_observe_webhook(
  p_channel_identifier text,
  p_raw_body text,
  p_signature text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_body jsonb;
  v_event jsonb;
  v_index int := 0;
  v_event_key text;
  v_event_id uuid;
  v_tenant uuid;
  v_action text;
  v_result jsonb;
  v_run_id uuid;
  v_outbound_before bigint;
  v_outbound_after bigint;
  v_received int := 0;
  v_duplicate int := 0;
  v_unresolved int := 0;
  v_decisions int := 0;
begin
  if not public.line_oa_verify_signature(
    p_channel_identifier, p_raw_body, p_signature
  ) then
    return jsonb_build_object(
      'accepted', false, 'reason', 'signature_invalid',
      'received', 0, 'duplicate', 0, 'unresolved', 0, 'decisions', 0
    );
  end if;

  select tenant_id into v_tenant
  from public.line_oa_channels
  where channel_identifier = p_channel_identifier and is_active;

  select count(*) into v_outbound_before
  from public.line_oa_outbound_messages;
  insert into public.line_shadow_observation_runs(
    channel_identifier, outbound_before
  ) values (
    p_channel_identifier, v_outbound_before
  ) returning id into v_run_id;

  v_body := p_raw_body::jsonb;
  for v_event in select value from jsonb_array_elements(
    coalesce(v_body -> 'events', '[]'::jsonb)
  ) loop
    v_index := v_index + 1;
    v_event_key := coalesce(
      nullif(v_event ->> 'webhookEventId', ''),
      encode(digest(convert_to(v_event::text || ':' || v_index, 'UTF8'), 'sha256'), 'hex')
    );

    insert into public.line_inbound_events(
      channel_identifier, tenant_id, event_key, event_type,
      source_type, source_id, payload_digest, raw_event
    ) values (
      p_channel_identifier, v_tenant, v_event_key,
      coalesce(v_event ->> 'type', 'unknown'),
      v_event #>> '{source,type}',
      coalesce(v_event #>> '{source,userId}', v_event #>> '{source,groupId}', v_event #>> '{source,roomId}'),
      encode(digest(convert_to(v_event::text, 'UTF8'), 'sha256'), 'hex'),
      v_event
    )
    on conflict (channel_identifier, event_key) do nothing
    returning id into v_event_id;

    if v_event_id is null then
      v_duplicate := v_duplicate + 1;
      continue;
    end if;
    v_received := v_received + 1;

    v_action := case
      when v_event ->> 'type' = 'message'
       and v_event #>> '{message,type}' in ('image','video','file')
        then 'evidence.submit'
      when v_event ->> 'type' = 'message' then 'message.receive'
      when v_event ->> 'type' = 'postback' then 'event.observe'
      else 'event.observe'
    end;

    v_result := public.rpc_authorize_business_action(jsonb_build_object(
      'correlation_id', v_event_key,
      'channel_identifier', p_channel_identifier,
      'line_subject_id', v_event #>> '{source,userId}',
      'owner_tenant_id', v_tenant,
      'action', v_action,
      'resource_kind', coalesce(v_event #>> '{source,type}', 'unknown'),
      'resource_id', null,
      'expected_revision', null,
      'payload_digest', encode(digest(convert_to(v_event::text, 'UTF8'), 'sha256'), 'hex')
    ));

    insert into public.line_shadow_observations(
      run_id, inbound_event_id, policy_decision_id, shadow_outcome
    ) values (
      v_run_id, v_event_id,
      (v_result ->> 'decision_id')::uuid,
      v_result ->> 'decision'
    );

    update public.line_inbound_events
    set processing_state = case
          when v_tenant is null then 'UNRESOLVED'
          else 'OBSERVED'
        end,
        observed_at = timezone('utc', now())
    where id = v_event_id;

    if v_tenant is null then
      v_unresolved := v_unresolved + 1;
    end if;
    v_decisions := v_decisions + 1;
  end loop;

  select count(*) into v_outbound_after
  from public.line_oa_outbound_messages;
  update public.line_shadow_observation_runs
  set outbound_after = v_outbound_after,
      side_effect_detected = v_outbound_after <> v_outbound_before,
      finished_at = timezone('utc', now())
  where id = v_run_id;

  return jsonb_build_object(
    'accepted', true,
    'received', v_received,
    'duplicate', v_duplicate,
    'unresolved', v_unresolved,
    'decisions', v_decisions
  );
exception
  when others then
    raise exception 'line_shadow_observation_failed'
      using errcode = 'P0001';
end;
$$;

revoke all on function public.rpc_line_shadow_observe_webhook(text,text,text) from public;
grant execute on function public.rpc_line_shadow_observe_webhook(text,text,text) to service_role;
```

เพิ่ม `event.observe` ใน `trust_action_catalog` ภายใน migration เดียวกัน:

```sql
insert into public.trust_action_catalog(
  action, risk_tier, allowed_roles, unknown_evidence_allowed
) values ('event.observe', 'low', '{}', false)
on conflict (action) do nothing;
```

- [ ] **Step 4: Reset และรัน Shadow tests พร้อม existing ingestion properties**

Run:

```bash
supabase db reset --local
cd tests/line-oa-commerce/py
python -m pytest -q \
  test_shadow_ingress_property.py \
  test_signature_verification_property.py \
  test_idempotent_processing_property.py \
  test_failure_handling_property.py
```

Expected: PASS หรือ explicit signed-fixture SKIP; ไม่มี failure; Shadow observation ไม่เปลี่ยน outbound row count

- [ ] **Step 5: Commit Task 5**

```bash
git add supabase/migrations/0164_line_trust_shadow_ingress.sql tests/line-oa-commerce/py/test_shadow_ingress_property.py
git commit -m "feat(line): add signature-verified shadow inbox"
```

---

### Task 6: Wire Shadow Observation หลัง Legacy Acceptance

**Files:**
- Create: `supabase/functions/line-webhook/index.test.ts`
- Modify: `supabase/functions/line-webhook/index.ts:35-122`

**Interfaces:**
- เพิ่ม `ShadowObserveFn(args: IngestArgs): Promise<ShadowObserveResult>`
- เพิ่ม `ShadowLogger.error(message: string): void`
- `handleLineWebhook(req, ingest, observe, logger)` ต้องรักษา HTTP status/body เดิม

- [ ] **Step 1: เขียน failing transport tests**

สร้าง `supabase/functions/line-webhook/index.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { handleLineWebhook } from "./index";

const body = JSON.stringify({ destination: "channel-a", events: [] });
const request = () => new Request("https://x/line-webhook/channel-a", {
  method: "POST",
  headers: { "x-line-signature": "signed" },
  body,
});

describe("line-webhook Wave 1 shadow observer", () => {
  it("observes the exact raw body only after legacy acceptance", async () => {
    const observe = vi.fn(async () => ({ accepted: true }));
    const response = await handleLineWebhook(
      request(),
      async () => ({ data: { accepted: true, reason: null }, error: null }),
      observe,
      { error: vi.fn() },
    );
    expect(response.status).toBe(200);
    expect(observe).toHaveBeenCalledWith({
      raw_body: body,
      signature: "signed",
      channel_identifier: "channel-a",
    });
  });

  it("does not observe a rejected legacy delivery", async () => {
    const observe = vi.fn(async () => ({ accepted: true }));
    const response = await handleLineWebhook(
      request(),
      async () => ({
        data: { accepted: false, reason: "signature_invalid" },
        error: null,
      }),
      observe,
      { error: vi.fn() },
    );
    expect(response.status).toBe(401);
    expect(observe).not.toHaveBeenCalled();
  });

  it("keeps legacy success when shadow observation fails and records a scrubbed error", async () => {
    const logger = { error: vi.fn() };
    const response = await handleLineWebhook(
      request(),
      async () => ({ data: { accepted: true, reason: null }, error: null }),
      async () => { throw new Error("shadow unavailable"); },
      logger,
    );
    expect(response.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith("line-webhook: shadow_observation_failed");
  });
});
```

- [ ] **Step 2: รันและยืนยัน Red State**

Run:

```bash
npm run test:run -- supabase/functions/line-webhook/index.test.ts
```

Expected: FAIL เพราะ `handleLineWebhook` ยังไม่รับ observer/logger dependencies

- [ ] **Step 3: เพิ่ม injected observer contract**

เพิ่มหลัง `IngestFn` ใน `supabase/functions/line-webhook/index.ts`:

```ts
export interface ShadowObserveResult {
  readonly accepted: boolean;
}

export type ShadowObserveFn = (
  args: IngestArgs,
) => Promise<ShadowObserveResult>;

export interface ShadowLogger {
  error(message: string): void;
}

const defaultShadowLogger: ShadowLogger = {
  error: (message) => console.error(message),
};
```

เปลี่ยน handler signature:

```ts
export async function handleLineWebhook(
  req: Request,
  ingest: IngestFn = defaultIngest,
  observe: ShadowObserveFn = defaultShadowObserve,
  logger: ShadowLogger = defaultShadowLogger,
): Promise<Response> {
```

แทน accepted branch ด้วย:

```ts
if (data.accepted) {
  try {
    await observe({
      raw_body: rawBody,
      signature,
      channel_identifier: channelIdentifier,
    });
  } catch {
    logger.error("line-webhook: shadow_observation_failed");
  }
  return json(200, { status: "accepted" });
}
```

เพิ่ม default observer ข้าง `defaultIngest`:

```ts
const defaultShadowObserve: ShadowObserveFn = async (args) => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/rpc_line_shadow_observe_webhook`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_channel_identifier: args.channel_identifier,
        p_raw_body: args.raw_body,
        p_signature: args.signature,
      }),
    },
  );
  if (!res.ok) throw new Error("shadow_observation_failed");
  const data = await res.json() as { accepted?: unknown };
  return { accepted: data.accepted === true };
};
```

ห้าม expose shadow detail ใน LINE response และห้ามใส่ raw database error ใน log

- [ ] **Step 4: รัน transport และ existing LINE tests**

Run:

```bash
npm run test:run -- \
  supabase/functions/line-webhook/index.test.ts \
  supabase/functions/approval-postback/index.test.ts \
  tests/workflow/ts/approvalPostback.integration.test.ts \
  tests/line-oa-commerce/ts/harness.smoke.test.ts
```

Expected: PASS; approval handler เดิมไม่เปลี่ยน; legacy response mapping ยังเหมือนเดิม

- [ ] **Step 5: Commit Task 6**

```bash
git add supabase/functions/line-webhook/index.ts supabase/functions/line-webhook/index.test.ts
git commit -m "feat(line): observe verified webhook events in shadow mode"
```

---

### Task 7: Shadow Gate Report และ Bilingual Runbook

**Files:**
- Create: `scripts/line-trust-shadow-report.mjs`
- Create: `scripts/__tests__/lineTrustShadowReport.test.ts`
- Modify: `package.json`
- Create: Runbook 4 ฉบับตาม File Map

**Interfaces:**
- สร้าง `buildShadowReport(rows): ShadowReport`
- CLI เขียน `artifacts/line-trust/wave-1-shadow-report.json`
- Gate fields: unresolved mappings, observed events, tenant mismatches, outcome counts, outbound side effects และ pass/fail

- [ ] **Step 1: เขียน failing report test**

สร้าง `scripts/__tests__/lineTrustShadowReport.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildShadowReport } from "../line-trust-shadow-report.mjs";

describe("buildShadowReport", () => {
  it("fails closed on unresolved tenant or outbound side effect", () => {
    expect(buildShadowReport({
      observed: 4,
      unresolved: 1,
      tenantMismatches: 0,
      outcomes: { PERMIT: 1, DENY: 2, STEP_UP: 0, QUARANTINE: 1 },
      outboundSideEffects: 0,
    }).pass).toBe(false);
    expect(buildShadowReport({
      observed: 4,
      unresolved: 0,
      tenantMismatches: 0,
      outcomes: { PERMIT: 1, DENY: 2, STEP_UP: 0, QUARANTINE: 1 },
      outboundSideEffects: 1,
    }).pass).toBe(false);
  });

  it("passes only with observed events and zero trust violations", () => {
    expect(buildShadowReport({
      observed: 4,
      unresolved: 0,
      tenantMismatches: 0,
      outcomes: { PERMIT: 1, DENY: 2, STEP_UP: 0, QUARANTINE: 1 },
      outboundSideEffects: 0,
    }).pass).toBe(true);
  });
});
```

- [ ] **Step 2: ยืนยัน Red State**

Run:

```bash
npm run test:run -- scripts/__tests__/lineTrustShadowReport.test.ts
```

Expected: FAIL เพราะ report module ยังไม่มี

- [ ] **Step 3: Implement report builder และ CLI**

สร้าง `scripts/line-trust-shadow-report.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function buildShadowReport(input) {
  const pass = input.observed > 0 &&
    input.unresolved === 0 &&
    input.tenantMismatches === 0 &&
    input.outboundSideEffects === 0;
  return {
    schemaVersion: "line-trust-shadow-report.v1",
    generatedAt: new Date().toISOString(),
    ...input,
    pass,
  };
}

async function runCli() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const client = createClient(url, key, { auth: { persistSession: false } });

  const { data: events, error: eventError } = await client
    .from("line_inbound_events")
    .select("processing_state");
  if (eventError) throw new Error("shadow_event_query_failed");

  const { data: observations, error: observationError } = await client
    .from("line_shadow_observations")
    .select("shadow_outcome,mismatch_reason");
  if (observationError) throw new Error("shadow_observation_query_failed");

  const { data: runs, error: runError } = await client
    .from("line_shadow_observation_runs")
    .select("side_effect_detected");
  if (runError) throw new Error("shadow_run_query_failed");

  const outcomes = { PERMIT: 0, DENY: 0, STEP_UP: 0, QUARANTINE: 0 };
  for (const row of observations ?? []) {
    if (row.shadow_outcome in outcomes) outcomes[row.shadow_outcome] += 1;
  }

  const report = buildShadowReport({
    observed: observations?.length ?? 0,
    unresolved: (events ?? []).filter((row) => row.processing_state === "UNRESOLVED").length,
    tenantMismatches: (observations ?? []).filter(
      (row) => row.mismatch_reason === "TENANT_MISMATCH",
    ).length,
    outcomes,
    outboundSideEffects: (runs ?? []).filter(
      (row) => row.side_effect_detected === true,
    ).length,
  });

  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const output = resolve(root, "artifacts/line-trust/wave-1-shadow-report.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
```

เพิ่มใน `package.json`:

```json
{
  "scripts": {
    "test:line-trust": "vitest run supabase/functions/_shared/trust-kernel supabase/functions/line-webhook/index.test.ts scripts/__tests__/lineTrustBaseline.test.ts scripts/__tests__/lineTrustShadowReport.test.ts tests/line-oa-commerce/ts",
    "report:line-trust-shadow": "node scripts/line-trust-shadow-report.mjs"
  }
}
```

- [ ] **Step 4: เขียน Runbook สองภาษาที่เนื้อหาตรงกัน**

สร้าง Markdown ทั้งสองภาษาด้วย section ต่อไปนี้:

```markdown
# LINE Trust Foundation Wave 1 Shadow Runbook

## Purpose
Observe verified LINE events and policy decisions without changing legacy outcomes or creating delivery intents.

## Start
1. Confirm the execution commit and migrations 0162–0164.
2. Confirm live Tenant-2 delivery is blocked.
3. Run the baseline, database reset, targeted tests, and build commands from this plan.
4. Enable only the line-webhook shadow observer.

## Monitor
- shadow observation failures;
- unresolved tenant count;
- tenant mismatch count;
- decision counts by reason and policy version;
- outbound side effects, which must remain zero.

## Stop
Disable the shadow observer when unresolved tenant, tenant mismatch, secret leakage, unexpected outbound intent, or Critical/High finding is non-zero.

## Rollback
Return line-webhook to the pre-Wave-1 commit. Retain additive mappings, inbox rows, decisions, and evidence for review.
```

แปลเนื้อหาทั้งหมดเป็นไทยใน `wave-1-shadow.th.md` สร้าง standalone HTML จาก Markdown แต่ละภาษา และตรวจ headings/body text ให้ตรงกับ source

- [ ] **Step 5: รัน report tests และ render verification**

Run:

```bash
npm run test:run -- scripts/__tests__/lineTrustShadowReport.test.ts
npm run report:line-trust-shadow
```

Expected: Report test PASS; report command exit `0` เฉพาะเมื่อ observed events มากกว่า 0 และ unresolved, mismatch, outbound side effects เป็น 0 ทั้งหมด

- [ ] **Step 6: Commit Task 7**

```bash
git add \
  package.json \
  scripts/line-trust-shadow-report.mjs \
  scripts/__tests__/lineTrustShadowReport.test.ts \
  docs/runbooks/line-trust-foundation/wave-1-shadow.en.md \
  docs/runbooks/line-trust-foundation/wave-1-shadow.th.md \
  docs/runbooks/line-trust-foundation/wave-1-shadow.en.html \
  docs/runbooks/line-trust-foundation/wave-1-shadow.th.html
git commit -m "docs(line): add wave one shadow gate runbook"
```

---

### Task 8: Wave 1 Complete Verification และ Review Gate

**Files:**
- Verify ทุกไฟล์จาก Task 1–7
- Task นี้ห้ามสร้างหรือแก้ production code

**Interfaces:**
- รับ complete Wave 1 diff และ machine-readable reports
- สร้าง verification record ที่ review ได้; ไม่เปิด enforcement

- [ ] **Step 1: ตรวจ Git root ทั้งสองและ exact Wave 1 scope**

Run ใน parent root และ isolated nested worktree:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

Expected: Wave 1 ไม่แก้ parent root; isolated nested worktree มีเฉพาะ intentional Wave 1 changes

- [ ] **Step 2: รัน complete targeted TypeScript suite**

Run:

```bash
npm run test:line-trust
```

Expected: exit `0` และ final Vitest summary แสดง failed tests เป็น 0 ถ้า output partial/truncated ให้สถานะ UNKNOWN

- [ ] **Step 3: Reset database และรัน complete Wave 1 database suite**

Run:

```bash
supabase db reset --local
cd tests/line-oa-commerce/py
python -m pytest -q \
  test_tenant_boundary_property.py \
  test_trust_policy_property.py \
  test_shadow_ingress_property.py \
  test_signature_verification_property.py \
  test_idempotent_processing_property.py \
  test_failure_handling_property.py \
  test_rls_read_scoping_property.py \
  test_secret_non_exposure_property.py
```

Expected: exit `0`, failure เป็น 0 และมีเฉพาะ prerequisite-specific skip ที่ระบุใน final pytest summary

- [ ] **Step 4: รัน Type Checking และ Production Build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected: ทั้งสองคำสั่ง exit `0`; complete output มี compiler/build summary ตอนท้าย

- [ ] **Step 5: สร้างและตรวจ Evidence**

Run:

```bash
npm run report:line-trust-baseline
npm run report:line-trust-shadow
git diff --check
git status --short
```

Expected:

- Baseline JSON ระบุ pre-existing ingress path ทั้งสอง
- Shadow report มี `pass: true`
- Unresolved mappings, tenant mismatches และ outbound side effects เท่ากับ `0`
- `git diff --check` exit `0`
- ไม่มี unrelated file ถูก stage

- [ ] **Step 6: ขอ Code Review**

ใช้ `requesting-code-review` พร้อม approved design, แผนนี้, complete diff, test output, migration reset output, build output และ JSON reports ทั้งสอง

Expected: ไม่มี unresolved Critical/High review finding

- [ ] **Step 7: Commit Review Corrections และหยุดที่ Wave 1 Gate**

Commit accepted correction แยกตาม concern และห้าม squash evidence-bearing commits ก่อน review

Wave 1 เสร็จเมื่อ:

1. ทุกคำสั่งใน Task 8 มี fresh complete successful output
2. Shadow report ผ่าน
3. Review ไม่มี Critical/High finding ค้าง
4. Live behavior และ Tenant-2 live delivery ไม่เปลี่ยน
5. Owner อนุมัติการเปลี่ยนผ่านไป Wave 2 plan ที่ review แยกแล้ว

---

## Execution Handoff

แผนเสร็จและบันทึกที่ `docs/superpowers/plans/2026-07-26-line-trust-kernel-wave-1.th.md`

มีสองทางเลือกในการลงมือ:

1. **Subagent-Driven (แนะนำ):** ใช้ `subagent-driven-development` ให้ fresh implementation worker ทำทีละ Task พร้อม specification/quality review ระหว่าง Task
2. **Inline Execution:** ใช้ `executing-plans` ทำเป็น batch พร้อม explicit checkpoints

ยังไม่เริ่ม execution จนกว่าผู้ใช้จะเลือกแนวทาง
