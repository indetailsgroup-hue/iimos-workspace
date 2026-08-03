# MONOLITH Section 4 Interactive Visualization — Pre-build Scrutiny

**Status:** OWNER REVIEW — FIX-THEN-BUILD

**Date:** 3 August 2026

**Reviewed artifact:** [Section 4 Safe Recovery & Proof Design](../superpowers/specs/2026-08-03-monolith-section-4-safe-recovery-proof-design.en.md)

**Review boundary:** the approved next design deliverable—a bilingual, interactive, explicitly non-operational Section 4 visualization. This review does not authorize runtime, schema, policy, egress, release, or machine-control implementation.

## 1. Intent

The visualization should let any V1 role understand the current safe state, reason, affected scope, consequence, permitted use, and one next authorized action without exposing backstage complexity or creating apparent runtime authority.

## 2. Simpler alternative first

Do **not** begin by adding a new page to the product, integrating APIs, or reproducing the entire recovery state machine as a dashboard.

The smallest useful deliverable is a standalone, fixture-driven prototype with:

1. one role-aware **Recovery Decision Card** as the primary surface;
2. one progressive-disclosure **Why / Proof inspector** as the secondary surface;
3. deterministic role/scenario fixtures and an evaluation mode; and
4. no network calls, no product-store imports, no export/download path, and no authority-bearing action.

This reuses the approved `RecoveryCase` projection instead of creating a new presentation entity. It validates whether users understand the Decision Chain UX before any broker or runtime integration risk is introduced.

## 3. End-to-end trace

### Intended prototype path

**Role + seeded scenario → deterministic fixture → RecoveryCase-derived projection → role decision card → optional proof inspector → simulated response → measurement record**

### Trace against the approved contract

- The role view must answer five universal questions and fail closed on stale, missing, mismatched, unavailable, or UNKNOWN inputs: Section 4 lines 368–378.
- The denominator is the eight-role registry `V1-CASEWORK-KITCHEN-RECOVERY-01`: Section 4 lines 380–393.
- The current visualization contract instead begins with two system-oriented synchronized views and says “the reviewer” selects scenarios: Section 4 lines 431–446.
- The prototype must support role/scenario/language/device measurement cells: Section 4 lines 450–456.
- A visualization may exist before broker convergence only when clearly non-operational and unable to claim server authorization: Section 4 lines 350–360 and 523–525.

### Trace against current product source

- The current AppShell enables a real Export button from displayed gate/spec state: `src/components/layout/AppShell.tsx:176,213-221`.
- App wires that button to `handleExport`: `src/App.tsx:717-742,878-892`.
- The packet path creates and downloads a ZIP in the browser: `src/factory/packet/useFactoryPacket.ts:341-365`.
- An exact search found no current runtime `RecoveryCase`, `RecoveryEvent`, `DecisionReceipt`, `CapabilityPolicy`, or `EgressBroker` implementation under `src`, `server`, or `supabase`; these remain target contracts.
- No existing interactive Section 4 prototype was found under `docs`; the current artifacts are the specification and its research/scrutiny appendices.

**Verified consequence:** embedding the prototype in the current application would place simulated recovery controls next to reachable export behavior and could imply authority the runtime does not possess. The safe design-validation path is an isolated standalone artifact.

## 4. Findings

### [BLOCKER] 1. The prototype isolation boundary is not frozen

**Finding:** “Clearly labelled non-operational” does not specify whether the prototype can import product stores, call APIs, write state, download artifacts, or appear beside real export controls.

**Why it matters:** a convincing mock action inside the existing AppShell can be mistaken for an authorized action, while the current AppShell exposes a real Export path.

**Evidence:** Section 4 lines 350–360 and 523–525 permit a non-operational visualization; `src/components/layout/AppShell.tsx:176,221` and `src/factory/packet/useFactoryPacket.ts:341-365` show reachable export/download behavior.

**Suggested change:** require a standalone docs artifact using deterministic local fixtures, with no runtime imports, network, persistence, downloads, or egress. Add a permanent “DESIGN PROTOTYPE — NO AUTHORITY — NOT FOR PRODUCTION” banner.

### [MAJOR] 2. The information architecture is system-first rather than role-first

**Finding:** Section 14 makes the Recovery Case/Event Chain and Capability Gate/Egress the two primary views, while Section 13 promises calm role language and one primary action.

**Why it matters:** clients and non-technical roles would meet lifecycle, policy, quorum, and broker concepts before answering their immediate decision question.

**Evidence:** Section 4 lines 364–378 define the role experience; lines 431–434 define the current visualization entry surface.

**Suggested change:** make the role-aware Recovery Decision Card the primary screen. Put event chain, evidence, policy, and broker detail behind a “Why is work paused?” or “View proof” disclosure; expose the full inspector by default only in reviewer/test mode.

### [MAJOR] 3. Role coverage is contradicted by a reviewer-only scenario control

**Finding:** the frozen denominator contains eight roles, but Section 14 states only that “the reviewer” selects representative scenarios.

**Why it matters:** the artifact could be declared complete after proving the reviewer view while omitting client, estimator/procurement, installer/field, or factory comprehension.

**Evidence:** Section 4 lines 380–393 freeze eight roles; line 436 names only the reviewer; lines 452–454 require results per role/scenario cell.

**Suggested change:** provide separate Role and Scenario selectors plus a versioned coverage manifest. Do not force all 56 Cartesian combinations into the user interface; require at least one risk-relevant seeded scenario per role and explicit coverage for every registry role.

### [MAJOR] 4. “The same fields” conflicts with role-derived presentation

**Finding:** Section 14 says every scenario updates the same fields, but Section 13 requires five universal questions plus policy-critical role fields and progressive disclosure.

**Why it matters:** a fixed raw-field dashboard either overwhelms clients or hides evidence needed by reviewers, factory engineers, and field verifiers.

**Evidence:** Section 4 lines 368–378 define the derived role view; lines 384–393 define role-specific critical information; line 446 requires the same fields.

**Suggested change:** freeze the five universal questions as the shared skeleton, not a shared raw-field list. Each fixture must map additional role-critical fields and explicitly declare which details are hidden, summarized, or expanded.

### [MAJOR] 5. The scenario library does not pressure-test the new truth rules

**Finding:** the seven scenarios cover domain and control failures but do not explicitly cover pending assignment acceptance, temporarily unavailable truth, UNKNOWN impact, conflicting newer HOLD versus older Approved display, or broker denial after a stale action.

**Why it matters:** the prototype could validate only coherent snapshots and never demonstrate the fail-closed behaviors added by the approved corrections.

**Evidence:** Section 4 lines 438–444 list the scenarios; lines 378, 474–477, and 488–497 define the missing pressure states.

**Suggested change:** add four cross-cutting deterministic fixtures: `PENDING_ASSIGNMENT`, `SOURCE_UNAVAILABLE_OR_UNKNOWN`, `NEWER_HOLD_OVERRIDES_OLD_APPROVAL`, and `STALE_ACTION_BROKER_DENIED`.

### [MAJOR] 6. Simulated actions have no frozen outcome semantics

**Finding:** the visualization requires a next action but does not define what clicking it can do in a non-operational artifact.

**Why it matters:** a dead button cannot test Decision Chain comprehension, while a button that resembles a successful commit can falsely imply server authorization.

**Evidence:** Section 4 lines 364–378 require one next action and server revalidation; lines 350–360 forbid the visualization from issuing an `EgressGrant` or claiming authorization.

**Suggested change:** actions may transition only between deterministic fixture snapshots and must say “Simulate.” Every result shows the expected case version, simulated policy result, and whether runtime would require server revalidation. No success message may say Approved, Released, Resumed, or Downloaded without the visible “SIMULATED” qualifier.

### [MAJOR] 7. The measurement contract has no prototype harness

**Finding:** Section 15 defines clock boundaries, cell reporting, exclusions, confidence intervals, and stop conditions, but Section 14 does not define how the prototype exposes stable scenario identity or records test observations.

**Why it matters:** informal walkthroughs cannot establish the 30-second and 95% claims and can hide a failing role through selective scenarios.

**Evidence:** Section 4 lines 450–456 and 478–479 define the measurement obligations; no matching harness contract exists in lines 429–446.

**Suggested change:** add a separate evaluator mode with immutable fixture ID, role-registry version, scenario, risk, language, viewport, start/stop markers, answer rubric, support event, unsafe-action flag, and export-free local result summary. Keep this evaluator surface hidden from participants.

### [MAJOR] 8. Visual safety and bilingual accessibility semantics are under-specified

**Finding:** the specification requires Thai/English accessibility and a non-operational label but does not freeze how status, severity, proof type, mutable projection, and simulated action remain distinguishable without color or English jargon.

**Why it matters:** applying an approved corporate identity can make the prototype attractive while status meaning remains inaccessible or misleading.

**Evidence:** Section 4 line 303 requires role-specific accessibility tests in Thai and English; lines 364–378 require calm language and truth distinction; line 446 requires projection/proof separation.

**Suggested change:** require text + icon/shape semantics, keyboard navigation, visible focus, screen-reader announcements, Thai/English fixture parity, responsive layouts, and client-safe vocabulary. Corporate identity may style the surface but cannot carry safety meaning by color alone.

## 5. Minimum pre-build correction contract

Freeze these eight items before creating the visualization:

1. standalone fixture-only artifact boundary;
2. role decision card first, proof/system inspector second;
3. eight-role coverage manifest with separate role/scenario controls;
4. five universal questions plus role-critical fields, not one raw field set;
5. four truth-pressure fixtures in addition to the seven domain scenarios;
6. simulate-only action and outcome semantics;
7. evaluator harness matching the measurement protocol; and
8. persistent non-operational, bilingual, accessible visual semantics.

The fixture schema may reuse Section 4 names, but it is test data—not a new persisted contract or runtime authority.

## 6. Verdict

**FIX-THEN-BUILD.** The Section 4 architecture does not need rework. The visualization contract needs the eight bounded pre-build corrections above because its current reviewer/system-first framing does not yet guarantee a safe, role-first, measurable, non-operational prototype.
