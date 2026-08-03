# MONOLITH Section 4 Standalone Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:subagent-driven-development only when the owner explicitly authorizes delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved bilingual, standalone, fixture-driven Section 4 recovery prototype without runtime authority, network access, persistence, download, or product integration.

**Architecture:** Two language-specific HTML entry files share one stylesheet, a deterministic fixture catalog, a pure projection/simulation layer, and a DOM controller. Classic scripts are used so the prototype opens directly through `file://`; all state stays in memory. Vitest and JSDOM verify the fixture contract, role projection, simulation semantics, artifact boundary, bilingual structure, and participant/evaluator flows.

**Tech Stack:** Standalone HTML5, CSS3, classic JavaScript, Vitest 3, JSDOM 27, Node `vm`, project `render_docs.py` for the implementation report only.

## Global Constraints

- Work only in the active nested product repository `determined-williams/`; preserve all existing dirty worktree entries.
- Follow [Section 4 Safe Recovery & Proof Design](../specs/2026-08-03-monolith-section-4-safe-recovery-proof-design.en.md), especially Sections 13–16.
- The prototype is test data and design validation only; it creates no new persisted contract, permission, receipt, grant, notification, or audit record.
- Keep the permanent banner exactly: `DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION`.
- Do not use `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, service workers, product/runtime imports, `localStorage`, `sessionStorage`, IndexedDB, cookies, downloads, object URLs, clipboard writes, or form actions.
- Do not create `.openai/hosting.json`, initialize a hosted Sites project, or publish the artifact. The approved deliverable is local-only.
- Both language editions consume identical fixture IDs, facts, action boundaries, coverage, and expected answers.
- Use text plus icon/shape for status; color alone never carries safety meaning.
- Keep NOT-FOR-PRODUCTION active and do not edit production, release, broker, schema, policy, or machine-control code.

---

## File Map

| File | Responsibility |
| --- | --- |
| `docs/prototypes/section-4-safe-recovery/prototype.en.html` | English participant and evaluator shell |
| `docs/prototypes/section-4-safe-recovery/prototype.th.html` | Thai participant and evaluator shell |
| `docs/prototypes/section-4-safe-recovery/styles.css` | Shared corporate-identity, responsive, focus, status-shape, print, and reduced-motion rules |
| `docs/prototypes/section-4-safe-recovery/fixtures.js` | Frozen role registry, 7 domain scenarios, 4 truth-pressure scenarios, fixture snapshots, coverage manifest, and bilingual copy |
| `docs/prototypes/section-4-safe-recovery/projection.js` | Pure role projection, fail-closed precedence, snapshot replacement, and simulate-only outcome logic |
| `docs/prototypes/section-4-safe-recovery/prototype.js` | DOM rendering, review/participant modes, inspector, simulation, and in-memory evaluator harness |
| `tests/section4-prototype/loadPrototype.ts` | Test-only loader for classic scripts and JSDOM shells |
| `tests/section4-prototype/fixtures.contract.test.ts` | Registry, scenario, coverage, bilingual fact, and immutability contract tests |
| `tests/section4-prototype/projection.behavior.test.ts` | Five-question mapping, precedence, role boundary, snapshot, and simulation tests |
| `tests/section4-prototype/artifact.boundary.test.ts` | Offline/no-authority static boundary and bilingual accessibility structure tests |
| `tests/section4-prototype/dom.integration.test.ts` | Participant/evaluator interaction and accessible announcement tests |
| `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.en.md` | English implementation evidence report |
| `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.th.md` | Thai implementation evidence report |
| Matching `.en.html` / `.th.html` report files | Standalone rendered report editions |

## Frozen Fixture Matrix

| Fixture ID | Covered roles | Starting truth | Simulated primary outcome |
| --- | --- | --- | --- |
| `SITE_EVIDENCE_MISSING` | client, designer, installer | CONTAINED; last safe `R-014`; site width missing | submit field evidence → REVERIFYING fixture |
| `STALE_REVISION_AFTER_REVIEW` | designer, reviewer, coordinator, estimator | CONTAINED; last safe `R-018`; priced basis invalidated | create corrected branch / reprice → RECOVERING fixture |
| `UNAUTHORIZED_SELF_APPROVAL` | designer, reviewer | CONTAINED; independent authority missing | request independent review; no approval created |
| `MISSING_VERIFICATION_REPORT` | reviewer, factory engineer | CONTAINED; report denominator incomplete | request required report; remains paused |
| `POST_RELEASE_DEFECT` | coordinator, factory engineer, CNC operator, installer | HOLD/CONTAINED; last safe `R-021` | acknowledge hold / isolate affected target |
| `OFFLINE_STALE_REVOCATION` | factory engineer, CNC operator | CONTAINED; policy stale | refresh simulation denied while offline |
| `NFP_QUALIFICATION_COUPON` | factory engineer, CNC operator | REVERIFYING; use limited to QUALIFICATION_COUPON | simulate restricted eligibility; never production |
| `PENDING_ASSIGNMENT` | designer, coordinator | CONTAINED; assignment requested, not accepted | simulate acceptance → ASSIGNED fixture |
| `SOURCE_UNAVAILABLE_OR_UNKNOWN` | client, coordinator, installer | CONTAINED; source unavailable / impact UNKNOWN | refresh remains paused; escalate allowed |
| `NEWER_HOLD_OVERRIDES_OLD_APPROVAL` | reviewer, factory engineer, CNC operator | CONTAINED; newer HOLD dominates old Approved | reveal current HOLD; no stale action |
| `STALE_ACTION_BROKER_DENIED` | factory engineer, CNC operator | CONTAINED; rendered version behind current version | simulate action → broker-denied fixture |

Registry IDs are exactly: `client`, `designer`, `reviewer`, `coordinator`, `estimator`, `factory_engineer`, `cnc_operator`, and `installer` under `V1-CASEWORK-KITCHEN-RECOVERY-01`.

---

### Task 1: Deterministic fixture catalog and coverage contract

**Files:**
- Create: `docs/prototypes/section-4-safe-recovery/fixtures.js`
- Create: `tests/section4-prototype/loadPrototype.ts`
- Create: `tests/section4-prototype/fixtures.contract.test.ts`

**Interfaces:**
- Produces: `globalThis.MONOLITH_SECTION4_FIXTURES`
- Produces fields: `schemaVersion`, `registryVersion`, `roles`, `scenarios`, `fixtures`, `coverageManifest`, `labels`
- Consumed later by: `projection.js`, participant shell, evaluator, and all other prototype tests

- [ ] **Step 1: Write the failing classic-script loader and fixture contract tests**

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

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/fixtures.contract.test.ts`

Expected: FAIL because `fixtures.js` does not exist.

- [ ] **Step 3: Implement the minimal frozen fixture catalog**

Use this publication shape and the exact registry/scenario/fixture matrix above:

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

`buildFixtures()` must create all 11 rows in the frozen matrix with canonical facts and complete `copy.en` / `copy.th`. `buildCoverageManifest()` must list only existing fixture IDs and cover all eight registry IDs. `buildBilingualLabels()` must contain the five universal question labels, prototype banner, proof/inspector labels, status labels, and evaluator labels in both languages.

The helper contract is exact:

- `buildFixtures(): Fixture[]`; every fixture contains `id`, `scenarioKind`, `coveredRoles`, `caseProjection`, `expectedAnswers`, `copy`, and `actionSimulation`. `caseProjection` contains `caseVersion`, `revisionId`, `statusKey`, `lastSafeRevisionId`, `impact`, `permittedUse`, `evidenceRefs`, `policyRefs`, `brokerDecision`, and `freshness`. `copy` and every visible action label contain both `en` and `th`.
- `buildCoverageManifest()` returns these exact memberships: `client` → `SITE_EVIDENCE_MISSING`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`; `designer` → `SITE_EVIDENCE_MISSING`, `STALE_REVISION_AFTER_REVIEW`, `UNAUTHORIZED_SELF_APPROVAL`, `PENDING_ASSIGNMENT`; `reviewer` → `STALE_REVISION_AFTER_REVIEW`, `UNAUTHORIZED_SELF_APPROVAL`, `MISSING_VERIFICATION_REPORT`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`; `coordinator` → `STALE_REVISION_AFTER_REVIEW`, `POST_RELEASE_DEFECT`, `PENDING_ASSIGNMENT`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`; `estimator` → `STALE_REVISION_AFTER_REVIEW`; `factory_engineer` → `MISSING_VERIFICATION_REPORT`, `POST_RELEASE_DEFECT`, `OFFLINE_STALE_REVOCATION`, `NFP_QUALIFICATION_COUPON`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`, `STALE_ACTION_BROKER_DENIED`; `cnc_operator` → `POST_RELEASE_DEFECT`, `OFFLINE_STALE_REVOCATION`, `NFP_QUALIFICATION_COUPON`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`, `STALE_ACTION_BROKER_DENIED`; `installer` → `SITE_EVIDENCE_MISSING`, `POST_RELEASE_DEFECT`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`.
- `buildBilingualLabels()` supplies these five question labels in order: `What is safe now?`, `What happened and why?`, `What exact scope and revision are affected?`, `What is the consequence and permitted use?`, `What is my next authorized action?`; and `ตอนนี้อะไรปลอดภัย?`, `เกิดอะไรขึ้นและเพราะเหตุใด?`, `ขอบเขตและ revision ใดได้รับผลกระทบ?`, `ผลที่ตามมาและการใช้งานที่อนุญาตคืออะไร?`, `การกระทำถัดไปที่ฉันมีสิทธิ์ทำคืออะไร?`.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `npm.cmd run test:run -- tests/section4-prototype/fixtures.contract.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit Task 1**

```powershell
git add docs/prototypes/section-4-safe-recovery/fixtures.js tests/section4-prototype/loadPrototype.ts tests/section4-prototype/fixtures.contract.test.ts
git commit -m "feat: add Section 4 prototype fixtures"
```

---

### Task 2: Pure role projection and simulate-only behavior

**Files:**
- Create: `docs/prototypes/section-4-safe-recovery/projection.js`
- Create: `tests/section4-prototype/projection.behavior.test.ts`

**Interfaces:**
- Consumes: `globalThis.MONOLITH_SECTION4_FIXTURES`
- Produces: `globalThis.MONOLITH_SECTION4_PROJECTION`
- Produces functions: `projectRoleView(input)`, `simulateAction(input)`, `validateCoverage()`

- [ ] **Step 1: Write failing projection behavior tests**

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

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/projection.behavior.test.ts`

Expected: FAIL because `projection.js` does not exist.

- [ ] **Step 3: Implement the pure projection API**

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

Implement `buildPrimaryCard`, `buildFiveQuestions`, and `buildInspector` as pure functions. Authority comes only from fixture facts; changing `roleId` changes presentation, never permission. Fail-closed views expose only `refresh`, `report`, and `escalate` action kinds.

The projection helper outputs are fixed: `buildPrimaryCard(...)` returns `statusKey`, `currentTruth`, `title`, `consequence`, `permittedUse`, `nextAction`, and `allowedActionKinds`; `buildFiveQuestions(...)` returns exactly five `{ key, label, value }` rows in the label order frozen above; `buildInspector(...)` returns `lifecycle`, `currentEvidence`, `supersededEvidence`, `policyBasis`, `brokerDecision`, and `freshness`. Missing, unavailable, or `UNKNOWN` authority inputs force `PAUSED_UPDATING` and restrict `allowedActionKinds` to `refresh`, `report`, and `escalate`.

- [ ] **Step 4: Run both contract suites and verify GREEN**

Run: `npm.cmd run test:run -- tests/section4-prototype/fixtures.contract.test.ts tests/section4-prototype/projection.behavior.test.ts`

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit Task 2**

```powershell
git add docs/prototypes/section-4-safe-recovery/projection.js tests/section4-prototype/projection.behavior.test.ts
git commit -m "feat: add Section 4 role projection"
```

---

### Task 3: Bilingual standalone shells, corporate identity, and static boundary

**Files:**
- Create: `docs/prototypes/section-4-safe-recovery/prototype.en.html`
- Create: `docs/prototypes/section-4-safe-recovery/prototype.th.html`
- Create: `docs/prototypes/section-4-safe-recovery/styles.css`
- Create: `tests/section4-prototype/artifact.boundary.test.ts`

**Interfaces:**
- HTML IDs consumed by `prototype.js`: `review-shell`, `role-select`, `scenario-select`, `start-participant`, `prototype-banner`, `decision-card`, `five-questions`, `simulate-action`, `proof-inspector`, `open-proof`, `evaluator-panel`, `live-status`, `language-link`
- CSS tokens: `--ink`, `--paper`, `--surface`, `--sage`, `--amber`, `--hold`, `--line`, `--focus`

- [ ] **Step 1: Write failing boundary and accessibility tests**

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

- [ ] **Step 2: Run the boundary test and verify RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/artifact.boundary.test.ts`

Expected: FAIL because the bilingual shells, stylesheet, and controller do not exist.

- [ ] **Step 3: Create both HTML shells with identical structural IDs**

Each file must contain this structural order with localized visible copy:

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

The Thai edition changes `data-language`, visible strings, labels, skip link, inspector label, and sibling language link only. It keeps the same IDs and script order.

- [ ] **Step 4: Implement the shared corporate-identity stylesheet**

Use these exact tokens and rules:

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

Add semantic text labels next to every shape. Do not create green/red-only states. The review shell is visually secondary; participant mode removes it from layout.

- [ ] **Step 5: Add an empty local controller stub and rerun the boundary test**

Create `prototype.js` with only an IIFE, strict mode, and no external capability so all referenced files exist. Run:

`npm.cmd run test:run -- tests/section4-prototype/artifact.boundary.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit Task 3**

```powershell
git add docs/prototypes/section-4-safe-recovery/prototype.en.html docs/prototypes/section-4-safe-recovery/prototype.th.html docs/prototypes/section-4-safe-recovery/styles.css docs/prototypes/section-4-safe-recovery/prototype.js tests/section4-prototype/artifact.boundary.test.ts
git commit -m "feat: add bilingual Section 4 prototype shell"
```

---

### Task 4: Participant flow, proof inspector, simulation, and evaluator harness

**Files:**
- Modify: `docs/prototypes/section-4-safe-recovery/prototype.js`
- Modify only if an accessibility assertion requires it: both prototype HTML files and `styles.css`
- Create: `tests/section4-prototype/dom.integration.test.ts`
- Modify: `tests/section4-prototype/loadPrototype.ts`

**Interfaces:**
- Consumes: fixtures and projection globals plus the frozen DOM IDs from Task 3
- Produces no runtime global; controller state remains inside one IIFE
- Evaluator state shape: `{ fixtureId, registryVersion, roleId, scenarioId, risk, language, viewport, startedAt, completedAt, safeFirstAction, backtrackingCount, proofOpened, supportUsed, workload, unsafeAction }`

- [ ] **Step 1: Extend the test loader for JSDOM and write failing integration tests**

```ts
// add to loadPrototype.ts
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

Add three English-only evaluator assertions: session starts from immutable fixture identity; support/unsafe flags update only in memory; summary contains no export/download control. Final expected total is 11 tests across both languages and evaluator behavior.

- [ ] **Step 2: Run the DOM integration test and verify RED**

Run: `npm.cmd run test:run -- tests/section4-prototype/dom.integration.test.ts`

Expected: FAIL because the controller stub does not populate or operate the shell.

- [ ] **Step 3: Implement the in-memory controller**

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

Implement the named render/populate/bind helpers without inline handlers. Selector changes replace the complete fixture snapshot. `startParticipant` hides review controls, creates the evaluator record with `performance.now()`, and focuses `decision-card`. `openProof` toggles `hidden` and `aria-expanded`. The evaluator panel is available only from review mode, never participant mode, and shows an on-screen summary with no link, file, copy, export, or network action. Add an integration assertion that a second `DOMContentLoaded` event does not duplicate options or event bindings.

- [ ] **Step 4: Run all prototype tests and verify GREEN**

Run: `npm.cmd run test:run -- tests/section4-prototype`

Expected: PASS, 4 test files and 28 tests (6 fixture + 6 projection + 5 boundary + 11 DOM integration).

- [ ] **Step 5: Run the existing documentation boundary checks**

Run: `git diff --check -- docs/prototypes/section-4-safe-recovery tests/section4-prototype`

Expected: exit 0, no whitespace errors.

- [ ] **Step 6: Commit Task 4**

```powershell
git add docs/prototypes/section-4-safe-recovery tests/section4-prototype
git commit -m "feat: complete Section 4 recovery prototype"
```

---

### Task 5: Final contract verification and bilingual implementation report

**Files:**
- Create: `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.en.md`
- Create: `docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.th.md`
- Generate: matching `.en.html` and `.th.html`
- Modify only if verification finds a defect: prototype or test files from Tasks 1–4

**Interfaces:**
- Report links to both prototype HTML editions, Section 4 spec, pre-build scrutiny, commit IDs, and fresh verification evidence.
- Report makes no production-readiness claim.

- [ ] **Step 1: Run the complete targeted verification suite**

Run: `npm.cmd run test:run -- tests/section4-prototype`

Expected: PASS, 4 test files, 28 tests, 0 failures.

- [ ] **Step 2: Run a final forbidden-capability scan**

Run:

```powershell
rg -n "fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker|localStorage|sessionStorage|indexedDB|document\.cookie|createObjectURL|clipboard\.write|download\s*=|<form[^>]+action=|(?:src|server|supabase)/" docs/prototypes/section-4-safe-recovery
```

Expected: no matches; `rg` exit code 1 is the passing result for this absence check.

- [ ] **Step 3: Verify the exact artifact inventory and bilingual parity**

Run a read-only check that reports:

- exactly 2 HTML, 1 CSS, and 3 JavaScript prototype files;
- eight roles, seven domain scenarios, four truth-pressure scenarios;
- both `lang` attributes and the permanent banner;
- matching structural IDs in both HTML files;
- no replacement characters;
- SHA-256 for all six prototype files.

Expected summary: `FAIL=0`.

- [ ] **Step 4: Write the bilingual implementation reports**

Each report must include:

1. scope and non-operational boundary;
2. delivered files and primary links;
3. eight corrections implemented;
4. fixture/role/scenario coverage;
5. test command, counts, and hashes;
6. known boundary: JSDOM/contract evidence validates prototype behavior, not production authority or field usability;
7. next gate: owner visual review, then facilitated pilot planning—still no runtime integration.

- [ ] **Step 5: Render and verify report HTML**

Run:

```powershell
python ..\tools\render_docs.py docs\reports\2026-08-03-monolith-section-4-standalone-prototype-implementation.en.md docs\reports\2026-08-03-monolith-section-4-standalone-prototype-implementation.th.md
git diff --check -- docs/prototypes/section-4-safe-recovery tests/section4-prototype docs/reports/2026-08-03-monolith-section-4-standalone-prototype-implementation.*
```

Expected: both HTML files generated; diff check exits 0.

- [ ] **Step 6: Verify staged scope and commit Task 5**

Stage only the two Markdown and two HTML implementation reports plus any explicitly verified prototype/test correction from this task. Confirm `git diff --cached --name-status` contains no unrelated dirty file, then commit:

```powershell
git commit -m "docs: report Section 4 prototype verification"
```

---

## Plan Self-review Checklist

- [ ] Every requirement in Section 4 Sections 14–16 maps to a task or assertion above.
- [ ] No task adds runtime imports, network, persistence, download, hosted deployment, or authority.
- [ ] All eight V1 roles and all 11 required scenario IDs have explicit coverage.
- [ ] English and Thai use identical canonical facts and structural IDs.
- [ ] Every simulated outcome is visibly qualified and version-checked.
- [ ] Evaluator data remains in memory and participant-hidden.
- [ ] No `TBD`, `TODO`, “implement later,” or unspecified error-handling step remains.
- [ ] Every task has a RED test, minimal implementation, GREEN verification, and scoped commit.

## Execution Handoff

After this plan is approved, choose one execution mode:

1. **Inline execution (recommended here):** use `executing-plans`, TDD, and the checkpoints above in this task. This is the default because delegation has not been requested.
2. **Subagent-driven execution:** use `subagent-driven-development` only after the owner explicitly authorizes delegation.
