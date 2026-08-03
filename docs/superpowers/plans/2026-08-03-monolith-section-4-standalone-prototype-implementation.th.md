# แผน Implementation: MONOLITH Section 4 Standalone Prototype

> **สำหรับ agentic workers:** REQUIRED SUB-SKILL: ใช้ superpowers:executing-plans เพื่อทำตามแผนทีละ task ใช้ superpowers:subagent-driven-development เฉพาะเมื่อเจ้าของอนุญาตให้แบ่งงานอย่างชัดเจน โดยใช้ checkbox (`- [ ]`) ติดตามความคืบหน้า

**เป้าหมาย:** สร้าง Section 4 recovery prototype สองภาษาที่เป็น standalone และ fixture-driven ตามที่อนุมัติ โดยไม่มี runtime authority, network, persistence, download หรือ product integration

**สถาปัตยกรรม:** HTML entry สองไฟล์แยกภาษา ใช้ stylesheet, deterministic fixture catalog, pure projection/simulation layer และ DOM controller ร่วมกัน ใช้ classic scripts เพื่อเปิดโดยตรงผ่าน `file://` และเก็บ state ใน memory เท่านั้น ใช้ Vitest/JSDOM ตรวจ fixture contract, role projection, simulation semantics, artifact boundary, bilingual structure และ participant/evaluator flows

**Tech Stack:** Standalone HTML5, CSS3, classic JavaScript, Vitest 3, JSDOM 27, Node `vm` และ `render_docs.py` ของโปรเจกต์สำหรับ implementation report เท่านั้น

## Global Constraints

- ทำงานเฉพาะใน active nested product repository `determined-williams/` และรักษา dirty worktree เดิมทั้งหมด
- ทำตาม [Section 4 Safe Recovery & Proof Design](../specs/2026-08-03-monolith-section-4-safe-recovery-proof-design.th.md) โดยเฉพาะ Sections 13–16
- Prototype เป็น test data และ design validation เท่านั้น ไม่สร้าง persisted contract, permission, receipt, grant, notification หรือ audit record ใหม่
- ใช้ permanent banner ตรงตามนี้: `DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION`
- ห้ามใช้ `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, service workers, product/runtime imports, `localStorage`, `sessionStorage`, IndexedDB, cookies, downloads, object URLs, clipboard writes หรือ form actions
- ห้ามสร้าง `.openai/hosting.json`, initialize hosted Sites project หรือ publish artifact โดย deliverable ที่อนุมัติเป็น local-only
- สองภาษาต้องใช้ fixture IDs, facts, action boundaries, coverage และ expected answers ชุดเดียวกัน
- Status ใช้ text พร้อม icon/shape โดยสีเพียงอย่างเดียวห้ามสื่อ safety meaning
- คง NOT-FOR-PRODUCTION และห้ามแก้ production, release, broker, schema, policy หรือ machine-control code

---

## File Map

| File | หน้าที่ |
| --- | --- |
| `docs/prototypes/section-4-safe-recovery/prototype.en.html` | English participant/evaluator shell |
| `docs/prototypes/section-4-safe-recovery/prototype.th.html` | Thai participant/evaluator shell |
| `docs/prototypes/section-4-safe-recovery/styles.css` | Corporate identity, responsive, focus, status-shape, print และ reduced-motion rules ที่ใช้ร่วมกัน |
| `docs/prototypes/section-4-safe-recovery/fixtures.js` | Frozen role registry, 7 domain scenarios, 4 truth-pressure scenarios, fixture snapshots, coverage manifest และ bilingual copy |
| `docs/prototypes/section-4-safe-recovery/projection.js` | Pure role projection, fail-closed precedence, snapshot replacement และ simulate-only outcome logic |
| `docs/prototypes/section-4-safe-recovery/prototype.js` | DOM rendering, review/participant modes, inspector, simulation และ in-memory evaluator harness |
| `tests/section4-prototype/loadPrototype.ts` | Test-only loader สำหรับ classic scripts และ JSDOM shells |
| `tests/section4-prototype/fixtures.contract.test.ts` | Registry, scenario, coverage, bilingual fact และ immutability tests |
| `tests/section4-prototype/projection.behavior.test.ts` | Five-question mapping, precedence, role boundary, snapshot และ simulation tests |
| `tests/section4-prototype/artifact.boundary.test.ts` | Offline/no-authority static boundary และ bilingual accessibility structure tests |
| `tests/section4-prototype/dom.integration.test.ts` | Participant/evaluator interaction และ accessible announcement tests |
| `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.en.md` | English implementation evidence report |
| `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.th.md` | Thai implementation evidence report |
| Matching `.en.html` / `.th.html` report files | Standalone rendered report editions |

## Frozen Fixture Matrix

| Fixture ID | บทบาทที่ครอบคลุม | Starting truth | Simulated primary outcome |
| --- | --- | --- | --- |
| `SITE_EVIDENCE_MISSING` | client, designer, installer | CONTAINED; last safe `R-014`; site width missing | ส่ง field evidence → REVERIFYING fixture |
| `STALE_REVISION_AFTER_REVIEW` | designer, reviewer, coordinator, estimator | CONTAINED; last safe `R-018`; priced basis invalidated | สร้าง corrected branch / reprice → RECOVERING fixture |
| `UNAUTHORIZED_SELF_APPROVAL` | designer, reviewer | CONTAINED; independent authority missing | ขอ independent review โดยไม่สร้าง approval |
| `MISSING_VERIFICATION_REPORT` | reviewer, factory engineer | CONTAINED; report denominator incomplete | ขอ required report และยังคง paused |
| `POST_RELEASE_DEFECT` | coordinator, factory engineer, CNC operator, installer | HOLD/CONTAINED; last safe `R-021` | acknowledge hold / isolate affected target |
| `OFFLINE_STALE_REVOCATION` | factory engineer, CNC operator | CONTAINED; policy stale | จำลอง refresh ถูกปฏิเสธเมื่อ offline |
| `NFP_QUALIFICATION_COUPON` | factory engineer, CNC operator | REVERIFYING; use จำกัดที่ QUALIFICATION_COUPON | จำลอง restricted eligibility โดยไม่เป็น production |
| `PENDING_ASSIGNMENT` | designer, coordinator | CONTAINED; assignment requested, not accepted | จำลอง acceptance → ASSIGNED fixture |
| `SOURCE_UNAVAILABLE_OR_UNKNOWN` | client, coordinator, installer | CONTAINED; source unavailable / impact UNKNOWN | refresh แล้วยัง paused; escalate ได้ |
| `NEWER_HOLD_OVERRIDES_OLD_APPROVAL` | reviewer, factory engineer, CNC operator | CONTAINED; newer HOLD dominates old Approved | แสดง current HOLD โดยไม่มี stale action |
| `STALE_ACTION_BROKER_DENIED` | factory engineer, CNC operator | CONTAINED; rendered version เก่ากว่า current version | จำลอง action → broker-denied fixture |

Registry IDs ต้องเป็น `client`, `designer`, `reviewer`, `coordinator`, `estimator`, `factory_engineer`, `cnc_operator` และ `installer` ภายใต้ `V1-CASEWORK-KITCHEN-RECOVERY-01`

---

### Task 1: Deterministic Fixture Catalog และ Coverage Contract

**Files:**
- Create: `docs/prototypes/section-4-safe-recovery/fixtures.js`
- Create: `tests/section4-prototype/loadPrototype.ts`
- Create: `tests/section4-prototype/fixtures.contract.test.ts`

**Interfaces:**
- Produces: `globalThis.MONOLITH_SECTION4_FIXTURES`
- Fields: `schemaVersion`, `registryVersion`, `roles`, `scenarios`, `fixtures`, `coverageManifest`, `labels`
- ใช้ต่อโดย: `projection.js`, participant shell, evaluator และ prototype tests ที่เหลือ

- [ ] **Step 1: เขียน failing classic-script loader และ fixture contract tests**

```ts
// tests/section4-prototype/loadPrototype.ts
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const prototypeRoot = path.resolve('docs/prototypes/section-4-safe-recovery');

export function loadClassicScripts(files: string[]) {
  const sandbox: Record<string, unknown> = {};
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of files) {
    const source = fs.readFileSync(path.join(prototypeRoot, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return context as Record<string, any>;
}
```

```ts
// tests/section4-prototype/fixtures.contract.test.ts
import { describe, expect, it } from 'vitest';
import { loadClassicScripts } from './loadPrototype';

const pressureIds = [
  'PENDING_ASSIGNMENT',
  'SOURCE_UNAVAILABLE_OR_UNKNOWN',
  'NEWER_HOLD_OVERRIDES_OLD_APPROVAL',
  'STALE_ACTION_BROKER_DENIED',
];

describe('Section 4 prototype fixture contract', () => {
  const data = loadClassicScripts(['fixtures.js']).MONOLITH_SECTION4_FIXTURES;

  it('freezes the exact V1 registry of eight roles', () => {
    expect(data.registryVersion).toBe('V1-CASEWORK-KITCHEN-RECOVERY-01');
    expect(data.roles.map((role: any) => role.id)).toEqual([
      'client', 'designer', 'reviewer', 'coordinator',
      'estimator', 'factory_engineer', 'cnc_operator', 'installer',
    ]);
  });

  it('contains seven domain and four truth-pressure scenarios', () => {
    expect(data.scenarios.filter((item: any) => item.kind === 'domain')).toHaveLength(7);
    expect(data.scenarios.filter((item: any) => item.kind === 'truth-pressure').map((item: any) => item.id)).toEqual(pressureIds);
  });

  it('covers every V1 role with at least one fixture', () => {
    for (const role of data.roles) expect(data.coverageManifest[role.id]?.length).toBeGreaterThan(0);
  });

  it('keeps canonical facts language-neutral and copy bilingual', () => {
    for (const fixture of data.fixtures) {
      expect(fixture.copy.en).toBeTruthy();
      expect(fixture.copy.th).toBeTruthy();
      expect(fixture.expectedAnswers).toHaveLength(5);
      expect(fixture.caseProjection.revisionId).toMatch(/^R-/);
    }
  });

  it('declares immutable version and simulated action outcomes', () => {
    for (const fixture of data.fixtures) {
      expect(Number.isInteger(fixture.caseProjection.caseVersion)).toBe(true);
      expect(fixture.actionSimulation.label.en).toContain('Simulate');
      expect(fixture.actionSimulation.label.th).toContain('จำลอง');
    }
  });

  it('deep-freezes the published fixture catalog', () => {
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.isFrozen(data.roles)).toBe(true);
    expect(Object.isFrozen(data.fixtures)).toBe(true);
  });
});
```

- [ ] **Step 2: รัน targeted test เพื่อยืนยัน RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/fixtures.contract.test.ts`

Expected: FAIL เพราะยังไม่มี `fixtures.js`

- [ ] **Step 3: Implement frozen fixture catalog ขั้นต่ำ**

ใช้ publication shape นี้พร้อม exact registry/scenario matrix ด้านบน:

```js
(function publishSection4Fixtures(global) {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  const roles = [
    ['client', 'Client / homeowner', 'ลูกค้า / เจ้าของบ้าน'],
    ['designer', 'Interior designer', 'นักออกแบบภายใน'],
    ['reviewer', 'Architect / technical reviewer', 'สถาปนิก / ผู้ตรวจเทคนิค'],
    ['coordinator', 'Coordinator / information manager', 'ผู้ประสานงาน / ผู้จัดการข้อมูล'],
    ['estimator', 'Estimator / procurement', 'ประมาณราคา / จัดซื้อ'],
    ['factory_engineer', 'Factory engineer', 'วิศวกรโรงงาน'],
    ['cnc_operator', 'CNC operator', 'ผู้ควบคุม CNC'],
    ['installer', 'Installer / field verifier', 'ผู้ติดตั้ง / ผู้ตรวจหน้างาน'],
  ].map(([id, en, th]) => ({ id, label: { en, th } }));

  const scenarios = [
    ['SITE_EVIDENCE_MISSING', 'domain'],
    ['STALE_REVISION_AFTER_REVIEW', 'domain'],
    ['UNAUTHORIZED_SELF_APPROVAL', 'domain'],
    ['MISSING_VERIFICATION_REPORT', 'domain'],
    ['POST_RELEASE_DEFECT', 'domain'],
    ['OFFLINE_STALE_REVOCATION', 'domain'],
    ['NFP_QUALIFICATION_COUPON', 'domain'],
    ['PENDING_ASSIGNMENT', 'truth-pressure'],
    ['SOURCE_UNAVAILABLE_OR_UNKNOWN', 'truth-pressure'],
    ['NEWER_HOLD_OVERRIDES_OLD_APPROVAL', 'truth-pressure'],
    ['STALE_ACTION_BROKER_DENIED', 'truth-pressure'],
  ].map(([id, kind]) => ({ id, kind }));

  const data = {
    schemaVersion: 'section4-prototype-fixture/v1',
    registryVersion: 'V1-CASEWORK-KITCHEN-RECOVERY-01',
    roles,
    scenarios,
    fixtures: buildFixtures(),
    coverageManifest: buildCoverageManifest(),
    labels: buildBilingualLabels(),
  };

  global.MONOLITH_SECTION4_FIXTURES = deepFreeze(data);
})(globalThis);
```

`buildFixtures()` ต้องสร้างครบ 11 rows พร้อม canonical facts และ `copy.en` / `copy.th` ที่สมบูรณ์ `buildCoverageManifest()` ต้องอ้างเฉพาะ fixture IDs ที่มีจริงและครอบคลุม registry ทั้งแปด `buildBilingualLabels()` ต้องมี five universal questions, prototype banner, inspector/status/evaluator labels ครบสองภาษา

Helper contract ต้องเป็นดังนี้:

- `buildFixtures(): Fixture[]`; fixture ทุกตัวมี `id`, `scenarioKind`, `coveredRoles`, `caseProjection`, `expectedAnswers`, `copy` และ `actionSimulation` โดย `caseProjection` มี `caseVersion`, `revisionId`, `statusKey`, `lastSafeRevisionId`, `impact`, `permittedUse`, `evidenceRefs`, `policyRefs`, `brokerDecision` และ `freshness` ส่วน `copy` และ action label ที่มองเห็นได้ต้องมีทั้ง `en` และ `th`
- `buildCoverageManifest()` คืน membership ตรงตามนี้: `client` → `SITE_EVIDENCE_MISSING`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`; `designer` → `SITE_EVIDENCE_MISSING`, `STALE_REVISION_AFTER_REVIEW`, `UNAUTHORIZED_SELF_APPROVAL`, `PENDING_ASSIGNMENT`; `reviewer` → `STALE_REVISION_AFTER_REVIEW`, `UNAUTHORIZED_SELF_APPROVAL`, `MISSING_VERIFICATION_REPORT`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`; `coordinator` → `STALE_REVISION_AFTER_REVIEW`, `POST_RELEASE_DEFECT`, `PENDING_ASSIGNMENT`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`; `estimator` → `STALE_REVISION_AFTER_REVIEW`; `factory_engineer` → `MISSING_VERIFICATION_REPORT`, `POST_RELEASE_DEFECT`, `OFFLINE_STALE_REVOCATION`, `NFP_QUALIFICATION_COUPON`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`, `STALE_ACTION_BROKER_DENIED`; `cnc_operator` → `POST_RELEASE_DEFECT`, `OFFLINE_STALE_REVOCATION`, `NFP_QUALIFICATION_COUPON`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`, `STALE_ACTION_BROKER_DENIED`; `installer` → `SITE_EVIDENCE_MISSING`, `POST_RELEASE_DEFECT`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`
- `buildBilingualLabels()` ต้องให้ label ห้าคำถามตามลำดับนี้: `What is safe now?`, `What happened and why?`, `What exact scope and revision are affected?`, `What is the consequence and permitted use?`, `What is my next authorized action?`; และ `ตอนนี้อะไรปลอดภัย?`, `เกิดอะไรขึ้นและเพราะเหตุใด?`, `ขอบเขตและ revision ใดได้รับผลกระทบ?`, `ผลที่ตามมาและการใช้งานที่อนุญาตคืออะไร?`, `การกระทำถัดไปที่ฉันมีสิทธิ์ทำคืออะไร?`

- [ ] **Step 4: รัน targeted test เพื่อยืนยัน GREEN**

Run: `npm.cmd run test:run -- tests/section4-prototype/fixtures.contract.test.ts`

Expected: PASS, 6 tests

- [ ] **Step 5: Commit Task 1**

```powershell
git add docs/prototypes/section-4-safe-recovery/fixtures.js tests/section4-prototype/loadPrototype.ts tests/section4-prototype/fixtures.contract.test.ts
git commit -m "feat: add Section 4 prototype fixtures"
```

---

### Task 2: Pure Role Projection และ Simulate-only Behavior

**Files:**
- Create: `docs/prototypes/section-4-safe-recovery/projection.js`
- Create: `tests/section4-prototype/projection.behavior.test.ts`

**Interfaces:**
- Consumes: `globalThis.MONOLITH_SECTION4_FIXTURES`
- Produces: `globalThis.MONOLITH_SECTION4_PROJECTION`
- Functions: `projectRoleView(input)`, `simulateAction(input)`, `validateCoverage()`

- [ ] **Step 1: เขียน failing projection tests**

```ts
import { describe, expect, it } from 'vitest';
import { loadClassicScripts } from './loadPrototype';

const context = loadClassicScripts(['fixtures.js', 'projection.js']);
const api = context.MONOLITH_SECTION4_PROJECTION;

describe('Section 4 role projection', () => {
  it('answers exactly five universal questions', () => {
    const view = api.projectRoleView({ fixtureId: 'SITE_EVIDENCE_MISSING', roleId: 'client', language: 'en' });
    expect(view.questions).toHaveLength(5);
  });

  it('keeps client copy free of policy, quorum, broker, and lifecycle jargon', () => {
    const view = api.projectRoleView({ fixtureId: 'SITE_EVIDENCE_MISSING', roleId: 'client', language: 'en' });
    expect(JSON.stringify(view.primaryCard)).not.toMatch(/quorum|EgressBroker|CapabilityPolicy|REVERIFYING/);
  });

  it('fails closed when source status is unavailable or UNKNOWN', () => {
    const view = api.projectRoleView({ fixtureId: 'SOURCE_UNAVAILABLE_OR_UNKNOWN', roleId: 'coordinator', language: 'en' });
    expect(view.primaryCard.statusKey).toBe('PAUSED_UPDATING');
    expect(view.primaryCard.allowedActionKinds).toEqual(['refresh', 'report', 'escalate']);
  });

  it('lets newer HOLD dominate old approval', () => {
    const view = api.projectRoleView({ fixtureId: 'NEWER_HOLD_OVERRIDES_OLD_APPROVAL', roleId: 'reviewer', language: 'en' });
    expect(view.primaryCard.currentTruth).toBe('HOLD');
    expect(view.inspector.supersededTruth).toBe('APPROVED');
  });

  it('denies stale simulated actions by expected case version', () => {
    const result = api.simulateAction({ fixtureId: 'STALE_ACTION_BROKER_DENIED', actionId: 'simulate_export', expectedCaseVersion: 14 });
    expect(result.outcome).toBe('SIMULATED_DENIED');
    expect(result.reason).toBe('STALE_CASE_VERSION');
  });

  it('replaces whole snapshots and never merges fixture facts', () => {
    const first = api.projectRoleView({ fixtureId: 'PENDING_ASSIGNMENT', roleId: 'coordinator', language: 'en' });
    const second = api.projectRoleView({ fixtureId: 'POST_RELEASE_DEFECT', roleId: 'coordinator', language: 'en' });
    expect(first.snapshotId).not.toBe(second.snapshotId);
    expect(second.sourceFixtureIds).toEqual(['POST_RELEASE_DEFECT']);
  });
});
```

- [ ] **Step 2: รัน targeted test เพื่อยืนยัน RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/projection.behavior.test.ts`

Expected: FAIL เพราะยังไม่มี `projection.js`

- [ ] **Step 3: Implement pure projection API**

```js
(function publishSection4Projection(global) {
  'use strict';
  const data = global.MONOLITH_SECTION4_FIXTURES;
  if (!data) throw new Error('MONOLITH_SECTION4_FIXTURES is required');

  function findFixture(fixtureId) {
    const fixture = data.fixtures.find((item) => item.id === fixtureId);
    if (!fixture) throw new Error(`Unknown fixture: ${fixtureId}`);
    return fixture;
  }

  function projectRoleView({ fixtureId, roleId, language }) {
    const fixture = findFixture(fixtureId);
    if (!data.coverageManifest[roleId]?.includes(fixtureId)) throw new Error('ROLE_FIXTURE_NOT_COVERED');
    const failClosed = fixture.sourceStatus !== 'FRESH' || fixture.impactCoverage === 'UNKNOWN';
    return Object.freeze({
      snapshotId: `${fixture.id}@${fixture.fixtureVersion}`,
      sourceFixtureIds: [fixture.id],
      primaryCard: buildPrimaryCard(fixture, roleId, language, failClosed),
      questions: buildFiveQuestions(fixture, roleId, language),
      inspector: buildInspector(fixture, language),
      simulatedAction: fixture.actionSimulation,
    });
  }

  function simulateAction({ fixtureId, actionId, expectedCaseVersion }) {
    const fixture = findFixture(fixtureId);
    if (expectedCaseVersion !== fixture.caseProjection.caseVersion) {
      return Object.freeze({ outcome: 'SIMULATED_DENIED', reason: 'STALE_CASE_VERSION', simulated: true });
    }
    if (actionId !== fixture.actionSimulation.id) {
      return Object.freeze({ outcome: 'SIMULATED_DENIED', reason: 'ACTION_NOT_ALLOWED', simulated: true });
    }
    return Object.freeze({ ...fixture.actionSimulation.result, simulated: true });
  }

  function validateCoverage() {
    return data.roles.every((role) => data.coverageManifest[role.id]?.length > 0);
  }

  global.MONOLITH_SECTION4_PROJECTION = Object.freeze({ projectRoleView, simulateAction, validateCoverage });
})(globalThis);
```

Implement `buildPrimaryCard`, `buildFiveQuestions` และ `buildInspector` เป็น pure functions โดย authority มาจาก fixture facts เท่านั้น การเปลี่ยน `roleId` เปลี่ยน presentation แต่ไม่เปลี่ยน permission และ fail-closed view มีเฉพาะ `refresh`, `report`, `escalate`

Projection helper outputs ถูกล็อกไว้ดังนี้: `buildPrimaryCard(...)` คืน `statusKey`, `currentTruth`, `title`, `consequence`, `permittedUse`, `nextAction` และ `allowedActionKinds`; `buildFiveQuestions(...)` คืน `{ key, label, value }` ห้า rows ตามลำดับ label ที่ freeze ไว้ข้างต้น; `buildInspector(...)` คืน `lifecycle`, `currentEvidence`, `supersededEvidence`, `policyBasis`, `brokerDecision` และ `freshness` หาก authority input ขาดหาย, unavailable หรือเป็น `UNKNOWN` ต้องบังคับ `PAUSED_UPDATING` และจำกัด `allowedActionKinds` เหลือ `refresh`, `report`, `escalate`

- [ ] **Step 4: รัน contract suites เพื่อยืนยัน GREEN**

Run: `npm.cmd run test:run -- tests/section4-prototype/fixtures.contract.test.ts tests/section4-prototype/projection.behavior.test.ts`

Expected: PASS, 12 tests

- [ ] **Step 5: Commit Task 2**

```powershell
git add docs/prototypes/section-4-safe-recovery/projection.js tests/section4-prototype/projection.behavior.test.ts
git commit -m "feat: add Section 4 role projection"
```

---

### Task 3: Bilingual Standalone Shells, Corporate Identity และ Static Boundary

**Files:**
- Create: `docs/prototypes/section-4-safe-recovery/prototype.en.html`
- Create: `docs/prototypes/section-4-safe-recovery/prototype.th.html`
- Create: `docs/prototypes/section-4-safe-recovery/styles.css`
- Create: `tests/section4-prototype/artifact.boundary.test.ts`

**Interfaces:**
- DOM IDs: `review-shell`, `role-select`, `scenario-select`, `start-participant`, `prototype-banner`, `decision-card`, `five-questions`, `simulate-action`, `proof-inspector`, `open-proof`, `evaluator-panel`, `live-status`, `language-link`
- CSS tokens: `--ink`, `--paper`, `--surface`, `--sage`, `--amber`, `--hold`, `--line`, `--focus`

- [ ] **Step 1: เขียน failing boundary/accessibility tests**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { prototypeRoot } from './loadPrototype';

const files = ['prototype.en.html', 'prototype.th.html', 'styles.css', 'fixtures.js', 'projection.js', 'prototype.js'];
const forbidden = /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker|localStorage|sessionStorage|indexedDB|document\.cookie|createObjectURL|clipboard\.write|download\s*=|<form[^>]+action=|(?:src|server|supabase)\//i;

describe('Section 4 standalone artifact boundary', () => {
  it('contains no forbidden runtime, network, persistence, or download surface', () => {
    for (const file of files) {
      const source = fs.readFileSync(path.join(prototypeRoot, file), 'utf8');
      expect(source).not.toMatch(forbidden);
    }
  });

  it.each([['prototype.en.html', 'en'], ['prototype.th.html', 'th']])('%s declares language and permanent banner', (file, language) => {
    const html = fs.readFileSync(path.join(prototypeRoot, file), 'utf8');
    expect(html).toContain(`<html lang="${language}">`);
    expect(html).toContain('DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION');
    expect(html).toContain('id="live-status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('uses classic relative scripts in the same order for both languages', () => {
    for (const file of ['prototype.en.html', 'prototype.th.html']) {
      const html = fs.readFileSync(path.join(prototypeRoot, file), 'utf8');
      expect(html.indexOf('fixtures.js')).toBeLessThan(html.indexOf('projection.js'));
      expect(html.indexOf('projection.js')).toBeLessThan(html.indexOf('prototype.js'));
      expect(html).not.toContain('type="module"');
    }
  });

  it('defines visible focus, reduced motion, reflow, and non-color status shapes', () => {
    const css = fs.readFileSync(path.join(prototypeRoot, 'styles.css'), 'utf8');
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/@media\s*\(max-width:/);
    expect(css).toMatch(/\.status-shape/);
  });
});
```

- [ ] **Step 2: รัน boundary test เพื่อยืนยัน RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/artifact.boundary.test.ts`

Expected: FAIL เพราะยังไม่มี bilingual shells, stylesheet และ controller

- [ ] **Step 3: สร้าง HTML shells สองภาษาด้วย structural IDs ชุดเดียวกัน**

แต่ละไฟล์ต้องใช้ structural order นี้และแปล visible copy ตามภาษา:

```html
<body data-language="en">
  <a class="skip-link" href="#decision-card">Skip to recovery decision</a>
  <div id="prototype-banner" role="note">DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION</div>
  <header class="masthead">
    <div><p class="eyebrow">MONOLITH · SAFE RECOVERY</p><h1>Recovery Decision Prototype</h1></div>
    <a id="language-link" href="prototype.th.html" hreflang="th">ไทย</a>
  </header>
  <main class="prototype-layout">
    <aside id="review-shell" aria-label="Design review controls">
      <label for="role-select">Role</label><select id="role-select"></select>
      <label for="scenario-select">Scenario</label><select id="scenario-select"></select>
      <button id="start-participant" type="button">Start participant view</button>
    </aside>
    <article id="decision-card" tabindex="-1" aria-labelledby="decision-title">
      <div class="status-line"><span class="status-shape" aria-hidden="true"></span><strong id="decision-title"></strong></div>
      <div id="five-questions"></div>
      <button id="simulate-action" type="button"></button>
      <button id="open-proof" type="button" aria-expanded="false" aria-controls="proof-inspector">Why is work paused?</button>
    </article>
    <aside id="proof-inspector" hidden aria-label="Why and proof inspector"></aside>
    <aside id="evaluator-panel" hidden aria-label="Evaluator harness"></aside>
  </main>
  <p id="live-status" class="sr-only" aria-live="polite"></p>
  <script src="fixtures.js"></script><script src="projection.js"></script><script src="prototype.js"></script>
</body>
```

English ใช้ `lang="en"` และลิงก์ไป `prototype.th.html`; Thai ใช้ `lang="th"` และลิงก์กลับ `prototype.en.html` IDs, script order และ semantic structure ต้องเหมือนกัน ห้ามใช้ `type="module"`

- [ ] **Step 4: Implement corporate-identity stylesheet ร่วมกัน**

ใช้ exact CSS tokens และ base rules ต่อไปนี้:

```css
:root {
  --ink: #1f2a2d; --paper: #f4f0e8; --surface: #fffdf8; --sage: #61756a;
  --amber: #9b6b22; --hold: #9e3e36; --line: #d7d0c5; --focus: #155eef;
  --shadow: 0 18px 48px rgba(31, 42, 45, .12); --radius: 20px;
}
* { box-sizing: border-box; }
body { margin: 0; color: var(--ink); background: var(--paper); font: 16px/1.55 "Noto Sans Thai", "Segoe UI", sans-serif; }
#prototype-banner { background: var(--ink); color: white; padding: .7rem 1rem; text-align: center; font-weight: 800; letter-spacing: .04em; }
.prototype-layout { display: grid; grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr) minmax(18rem, 24rem); gap: 1rem; padding: 1rem; }
#decision-card, #review-shell, #proof-inspector, #evaluator-panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 1.25rem; }
.status-shape { width: .9rem; height: .9rem; display: inline-block; border: 3px solid currentColor; transform: rotate(45deg); margin-inline-end: .65rem; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
@media (max-width: 860px) { .prototype-layout { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
```

ให้มี text label ข้าง status shape เสมอ ห้ามสร้าง green/red-only state และให้ review shell เป็น visual secondary โดย participant mode ต้องเอาออกจาก layout

- [ ] **Step 5: เพิ่ม empty controller stub และรัน boundary test ให้ GREEN**

สร้าง `prototype.js` เป็น IIFE strict mode ที่ยังไม่มี external capability จากนั้นรัน:

`npm.cmd run test:run -- tests/section4-prototype/artifact.boundary.test.ts`

Expected: PASS, 5 tests

- [ ] **Step 6: Commit Task 3**

```powershell
git add docs/prototypes/section-4-safe-recovery/prototype.en.html docs/prototypes/section-4-safe-recovery/prototype.th.html docs/prototypes/section-4-safe-recovery/styles.css docs/prototypes/section-4-safe-recovery/prototype.js tests/section4-prototype/artifact.boundary.test.ts
git commit -m "feat: add bilingual Section 4 prototype shell"
```

---

### Task 4: Participant Flow, Proof Inspector, Simulation และ Evaluator Harness

**Files:**
- Modify: `docs/prototypes/section-4-safe-recovery/prototype.js`
- Modify เฉพาะเมื่อ accessibility assertion ต้องการ: HTML สองไฟล์และ `styles.css`
- Create: `tests/section4-prototype/dom.integration.test.ts`
- Modify: `tests/section4-prototype/loadPrototype.ts`

**Interfaces:**
- Consumes: fixture/projection globals และ DOM IDs จาก Task 3
- Controller state อยู่ภายใน IIFE ไม่ publish runtime global
- Evaluator shape: `{ fixtureId, registryVersion, roleId, scenarioId, risk, language, viewport, startedAt, completedAt, safeFirstAction, backtrackingCount, proofOpened, supportUsed, workload, unsafeAction }`

- [ ] **Step 1: เพิ่ม JSDOM loader และเขียน failing integration tests**

```ts
// เพิ่มใน tests/section4-prototype/loadPrototype.ts
import { JSDOM } from 'jsdom';

export function loadPrototypeDom(language: 'en' | 'th') {
  const html = fs.readFileSync(path.join(prototypeRoot, `prototype.${language}.html`), 'utf8');
  const dom = new JSDOM(html, { url: `file://${path.join(prototypeRoot, `prototype.${language}.html`)}`, runScripts: 'outside-only' });
  for (const file of ['fixtures.js', 'projection.js', 'prototype.js']) {
    dom.window.eval(fs.readFileSync(path.join(prototypeRoot, file), 'utf8'));
  }
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}
```

```ts
// tests/section4-prototype/dom.integration.test.ts
import { describe, expect, it } from 'vitest';
import { loadPrototypeDom } from './loadPrototype';

describe.each(['en', 'th'] as const)('Section 4 %s participant flow', (language) => {
  it('renders eight roles and covered scenarios', () => {
    const { window } = loadPrototypeDom(language);
    expect(window.document.querySelectorAll('#role-select option')).toHaveLength(8);
    expect(window.document.querySelectorAll('#scenario-select option').length).toBeGreaterThan(0);
  });

  it('hides review selectors after participant mode starts', () => {
    const { window } = loadPrototypeDom(language);
    (window.document.querySelector('#start-participant') as HTMLButtonElement).click();
    expect(window.document.querySelector('#review-shell')?.hasAttribute('hidden')).toBe(true);
    expect(window.document.activeElement?.id).toBe('decision-card');
  });

  it('opens proof on demand and announces the change', () => {
    const { window } = loadPrototypeDom(language);
    (window.document.querySelector('#open-proof') as HTMLButtonElement).click();
    expect(window.document.querySelector('#proof-inspector')?.hasAttribute('hidden')).toBe(false);
    expect(window.document.querySelector('#open-proof')?.getAttribute('aria-expanded')).toBe('true');
    expect(window.document.querySelector('#live-status')?.textContent).not.toBe('');
  });

  it('marks every action outcome as simulated', () => {
    const { window } = loadPrototypeDom(language);
    (window.document.querySelector('#simulate-action') as HTMLButtonElement).click();
    expect(window.document.querySelector('#live-status')?.textContent).toMatch(/SIMULATED|จำลอง/);
  });
});
```

เพิ่ม evaluator assertions ภาษาอังกฤษอีกสามข้อ: session เริ่มจาก immutable fixture identity, support/unsafe flags update เฉพาะ in-memory และ summary ไม่มี export/download control รวม expected 11 tests

- [ ] **Step 2: รัน integration test เพื่อยืนยัน RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/dom.integration.test.ts`

Expected: FAIL เพราะ controller stub ยังไม่ populate/operate shell

- [ ] **Step 3: Implement in-memory controller**

```js
(function startSection4Prototype(global) {
  'use strict';
  const data = global.MONOLITH_SECTION4_FIXTURES;
  const projection = global.MONOLITH_SECTION4_PROJECTION;
  if (!data || !projection) throw new Error('Section 4 prototype dependencies are missing');

  function initialize() {
    if (document.documentElement.dataset.prototypeReady === 'true') return;
    document.documentElement.dataset.prototypeReady = 'true';
    const language = document.body.dataset.language === 'th' ? 'th' : 'en';
    const state = {
      language,
      roleId: 'client',
      fixtureId: data.coverageManifest.client[0],
      participantMode: false,
      proofOpened: false,
      evaluator: null,
    };

    populateRoleOptions(state);
    populateScenarioOptions(state);
    bindEvents(state);
    render(state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  function render(state) {
    const view = projection.projectRoleView({ fixtureId: state.fixtureId, roleId: state.roleId, language: state.language });
    renderDecisionCard(view, state);
    renderFiveQuestions(view, state);
    renderInspector(view, state);
    renderEvaluator(state);
  }

  function announce(message) {
    document.getElementById('live-status').textContent = message;
  }

  function simulate(state) {
    const view = projection.projectRoleView({ fixtureId: state.fixtureId, roleId: state.roleId, language: state.language });
    const result = projection.simulateAction({
      fixtureId: state.fixtureId,
      actionId: view.simulatedAction.id,
      expectedCaseVersion: view.simulatedAction.expectedCaseVersion,
    });
    announce(formatSimulatedOutcome(result, state.language));
    if (result.nextFixtureId) state.fixtureId = result.nextFixtureId;
    render(state);
  }
})(globalThis);
```

Implement named render/populate/bind helpers โดยไม่มี inline handlers Selector change ต้องแทน whole fixture snapshot `startParticipant` ซ่อน review controls สร้าง evaluator record ด้วย `performance.now()` และ focus `decision-card` ส่วน `openProof` toggle `hidden`/`aria-expanded` Evaluator panel เปิดได้จาก review mode เท่านั้นและมี on-screen summary โดยไม่มี link, file, copy, export หรือ network action เพิ่ม integration assertion ว่า `DOMContentLoaded` ครั้งที่สองไม่สร้าง option หรือ event binding ซ้ำ

- [ ] **Step 4: รัน prototype tests ทั้งหมดให้ GREEN**

Run: `npm.cmd run test:run -- tests/section4-prototype`

Expected: PASS, 4 test files, 28 tests

- [ ] **Step 5: รัน documentation boundary check**

Run: `git diff --check -- docs/prototypes/section-4-safe-recovery tests/section4-prototype`

Expected: exit 0 ไม่มี whitespace error

- [ ] **Step 6: Commit Task 4**

```powershell
git add docs/prototypes/section-4-safe-recovery tests/section4-prototype
git commit -m "feat: complete Section 4 recovery prototype"
```

---

### Task 5: Final Contract Verification และ Bilingual Implementation Report

**Files:**
- Create: `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.en.md`
- Create: `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.th.md`
- Generate: matching `.en.html` และ `.th.html`
- Modify prototype/test files เฉพาะเมื่อ verification พบ defect

**Interfaces:**
- Report link ไป prototype HTML สองภาษา, Section 4 spec, pre-build scrutiny, commit IDs และ fresh verification evidence
- Report ห้าม claim production readiness

- [ ] **Step 1: รัน complete targeted verification suite**

Run: `npm.cmd run test:run -- tests/section4-prototype`

Expected: PASS, 4 test files, 28 tests, 0 failures

- [ ] **Step 2: รัน final forbidden-capability scan**

```powershell
rg -n "fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker|localStorage|sessionStorage|indexedDB|document\.cookie|createObjectURL|clipboard\.write|download\s*=|<form[^>]+action=|(?:src|server|supabase)/" docs/prototypes/section-4-safe-recovery
```

Expected: ไม่พบ match; `rg` exit code 1 คือผลผ่านของ absence check

- [ ] **Step 3: ตรวจ exact inventory และ bilingual parity**

Read-only check ต้องรายงาน: 2 HTML + 1 CSS + 3 JavaScript, roles 8, domain scenarios 7, truth-pressure scenarios 4, `lang`/banner สองไฟล์, structural IDs ตรงกัน, ไม่มี replacement character และ SHA-256 ของ prototype ทั้ง 6 ไฟล์ โดย summary ต้องเป็น `FAIL=0`

- [ ] **Step 4: เขียน implementation reports สองภาษา**

แต่ละ report ต้องมี scope/non-operational boundary, delivered files/links, 8 corrections, fixture/role/scenario coverage, test command/count/hashes, ข้อจำกัดว่าหลักฐาน JSDOM/contract ไม่ใช่ production authority หรือ field usability และ next gate คือ owner visual review ตามด้วย facilitated pilot planning โดยยังไม่ runtime integration

- [ ] **Step 5: Render และ verify report HTML**

```powershell
python ..\tools\render_docs.py docs\reports\2026-08-03-monolith-section-4-standalone-prototype-implementation.en.md docs\reports\2026-08-03-monolith-section-4-standalone-prototype-implementation.th.md
git diff --check -- docs/prototypes/section-4-safe-recovery tests/section4-prototype docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.*
```

Expected: สร้าง HTML สองไฟล์และ diff check exit 0

- [ ] **Step 6: ตรวจ staged scope และ Commit Task 5**

Stage เฉพาะ implementation reports 4 ไฟล์และ prototype/test correction ที่ตรวจยืนยันใน task นี้ ตรวจ `git diff --cached --name-status` ว่าไม่มี unrelated dirty file แล้ว commit:

```powershell
git commit -m "docs: report Section 4 prototype verification"
```

---

## Plan Self-review Checklist

- [ ] Requirement ทุกข้อใน Section 4 Sections 14–16 map ไปยัง task หรือ assertion ด้านบน
- [ ] ไม่มี task ใดเพิ่ม runtime import, network, persistence, download, hosted deployment หรือ authority
- [ ] V1 roles ทั้งแปดและ scenario IDs ที่บังคับทั้ง 11 มี coverage ชัดเจน
- [ ] English/Thai ใช้ canonical facts และ structural IDs ชุดเดียวกัน
- [ ] Simulated outcome ทุกผลมี qualifier ที่เห็นชัดและตรวจ case version
- [ ] Evaluator data อยู่ใน memory และซ่อนจาก participant
- [ ] ไม่มี `TBD`, `TODO`, “implement later” หรือ unspecified error-handling step
- [ ] ทุก task มี RED test, minimal implementation, GREEN verification และ scoped commit

## การส่งต่อเพื่อดำเนินการ

หลังแผนนี้ได้รับอนุมัติ ให้เลือก execution mode หนึ่งทาง:

1. **Inline execution (แนะนำสำหรับรอบนี้):** ใช้ `executing-plans`, TDD และ checkpoints ด้านบนใน task นี้ เป็นค่าเริ่มต้นเพราะยังไม่ได้รับคำสั่งให้แบ่งงาน
2. **Subagent-driven execution:** ใช้ `subagent-driven-development` เฉพาะเมื่อเจ้าของอนุญาตให้แบ่งงานอย่างชัดเจน
