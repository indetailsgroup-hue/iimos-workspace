# Scrutiny Report: MONOLITH Beloved Safe-Recovery UX Research

**Date:** 3 August 2026

**Review mode:** Outsider-perspective end-to-end scrutiny

**Reviewed artifact:** [MONOLITH Deep Research: Beloved Safe-Recovery UX](2026-08-03-monolith-beloved-safe-recovery-ux-deep-research.en.md)

**Approved baseline:** [MONOLITH Section 4 Design: Safe Recovery & Proof](../superpowers/specs/2026-08-03-monolith-section-4-safe-recovery-proof-design.en.md)

**Verdict:** **REWORK BEFORE INCORPORATION INTO SECTION 4**

## Intent in one sentence

Make failure recovery understandable and humane for each role without weakening exact-revision evidence, professional authority, containment, or controlled production egress.

## Simpler alternative — mandatory scope challenge

Do **not** add a separately named Recovery Presentation Contract or another authoritative view object.

Use the already-approved RecoveryCase as the single current projection and add only:

1. a deterministic RecoveryCase-to-role-view mapping;
2. freshness and fail-closed projection rules;
3. assignment-request versus assignment-acceptance semantics;
4. a notification budget;
5. operationally defined usability tests.

This achieves the research goal with a smaller vocabulary and lower divergence risk. Section 4 already specifies one current RecoveryCase, one primary action, last safe revision, owner, consequence, permitted use, role-specific views, Thai/English accessibility tests, and the 30-second/95% targets.

## End-to-end trace

### Claimed future path

The research proposes:

**RecoveryCase and proof state → role-aware Recovery Decision Card → one server-authorized action → server revalidation → governed effect or controlled egress**

### Approved design path

Section 4 already proposes:

**Failure detection → RecoveryCase projection → primary next action → expected case version and fencing token → CapabilityPolicy evaluation → DecisionReceipt or EgressGrant**

Evidence:

- Section 4 lines 19 and 102–119 already define the current projection and its user-facing fields.
- Section 4 lines 333–378 already define calm one-action role views and synchronized recovery/egress visualization.
- Section 4 lines 273–285 already require projection contracts, concurrency, failure injection, seeded defects, bypass tests, and Thai/English accessibility tests.

### Current product path

The intended objects are not current runtime contracts: an exact source search found zero references to RecoveryCase, RecoveryEvent, DecisionReceipt, CapabilityPolicy, EgressBroker, RecoveryCardView, or Recovery Decision Card under **src**, **server**, and **supabase**.

The active user-facing export path is currently fragmented:

1. **src/App.tsx:878–892** gives AppShell a direct export handler.
2. **src/components/layout/AppShell.tsx:176,221** enables “Export to CNC” from displayed local gate/spec state.
3. **src/App.tsx:717–724** calls generateFactoryPacketFromStores.
4. **src/factory/packet/useFactoryPacket.ts:341–365** builds and downloads the package in the browser.
5. **src/App.tsx:732–742** uploads the already-downloaded package afterward; upload failure only produces a warning.

Other release/export surfaces use different checks, including GateToolbar, ExportPanel, ReleaseWizardModal, ReleasePanel, and the factory JobDetail export path. The reviewed test inventory contains focused GateToolbar and ExportPanel export tests, but no Recovery contract test and no AppShell main-export test.

This confirms Section 4’s caution: existing primitives are reuse candidates, not verified canonical authority.

## Findings

### [BLOCKER 1] The proposed “missing layer” substantially duplicates Section 4

**Finding:** The research says the material missing layer is a Recovery Presentation Contract, but the proposed eight fields map almost one-for-one to the existing RecoveryCase and role-experience requirements.

**Why it matters:** Two names for the same projection will produce competing schemas, acceptance criteria, and UI interpretations. The simpler UX initiative would increase backstage conceptual complexity.

**Evidence:**

- Research lines 19 and 185–195 call the presentation contract an addition.
- Research lines 104–111 define status/safe state, cause, scope/revision, consequence, evidence gap, primary action, owner, and progress.
- Section 4 lines 106–119 already define failure/risk, scope/revision, impact targets, last safe state, owner, primary next action, policy reference, expected version, fencing token, and state.
- Section 4 lines 335–378 already require calm copy, one primary action, role projections, and the same scenario fields.

**Suggested change:** Keep the research as an evidence and microcopy appendix. Replace “add a Recovery Presentation Contract” with “tighten the existing RecoveryCase presentation mapping.” Add no new entity and no second source of truth.

### [BLOCKER 2] The card-first recommendation omits the required broker-first implementation order

**Finding:** The research says every card action is server-revalidated and only controlled egress may create a production-usable package, but it does not make convergence of existing release/export paths a prerequisite to implementing the card.

**Why it matters:** A calm, authoritative-looking card placed over fragmented client-side release paths could improve perceived trust while the actual authority boundary remains inconsistent.

**Evidence:**

- Research lines 113 and 217–224 require server authority, exact binding, and controlled egress.
- AppShell enables its main export from displayed state at **src/components/layout/AppShell.tsx:176,221**.
- That handler downloads before server upload at **src/App.tsx:717–742** and **src/factory/packet/useFactoryPacket.ts:341–365**.
- GateToolbar and ExportPanel have their own checks; the factory route has another execution path.

**Suggested change:** Make implementation order explicit:

1. inventory and classify every release/export/download surface;
2. converge all controlled paths on server-owned policy and egress decisions;
3. add contract tests for UI/API/worker/server agreement;
4. only then render the role-aware RecoveryCase view.

No card may label an action server-authorized while any user-facing controlled path still relies on local display state.

### [MAJOR 3] Projection truth precedence and freshness are unspecified

**Finding:** The card can be “recomputed” and stale actions are revalidated, but the research does not define what the view shows when RecoveryCase, latest event, receipt validity, policy, evidence, or egress state are temporarily inconsistent or unavailable.

**Why it matters:** The most dangerous recovery copy is a stale “safe,” “saved,” or “ready” statement. Server rejection after the user clicks is safe for the effect but still produces automation surprise and erodes trust.

**Evidence:**

- Research lines 104–113 require explicit safe state and say a stale card refreshes safely.
- Section 4 lines 117–118 already contain expectedVersion and fencingToken, but the research’s visible contract does not define projection version, policy version, evidence snapshot, or precedence.
- Current code already contains multiple local/server state seams; **src/core/store/useSpecStore.ts:616–713** has asynchronous server release, while **src/core/store/useSpecStore.ts:788–822** derives displayed gate status without server-sync status.

**Suggested change:** Define a deterministic presenter rule:

- bind every rendered action to caseVersion, latestEventId, policyVersion, evidenceSnapshotId, actor scope, and renderedAt;
- HOLD dominates all lower-priority states;
- revoked or invalidated proof dominates older approval;
- if any required source is unavailable, mismatched, or stale, show “status updating—work remains paused” and offer only refresh, report, or authorized escalation;
- never infer unaffected safe scope when impact discovery is UNKNOWN.

### [MAJOR 4] Handoff acknowledgement contradicts the approved eight-state lifecycle

**Finding:** The research says a handoff must not appear assigned until the recipient acknowledges it, while Section 4 transitions to ASSIGNED as soon as a named owner, deadline, and escalation path exist.

**Why it matters:** The same case can be “ASSIGNED” in lifecycle logic but “requested—not accepted” in the proposed card. That ambiguity recreates the handoff gap the feature is meant to eliminate.

**Evidence:**

- Research lines 192 and 204 add requested/acknowledged handoff and prohibit premature “assigned.”
- Section 4 line 139 defines CONTAINED → ASSIGNED without recipient acceptance.
- RecoveryCase currently has owner and escalationOwner but no assignment-request projection at Section 4 line 114.
- Existing **src/workflow/handoff/canonical.ts:35–57** validates process order and active site only; it does not model recipient acceptance.

**Suggested change:** Keep the eight states. Add policy-defined assignment acceptance:

- emit assignment-requested and assignment-accepted RecoveryEvents;
- keep the case CONTAINED until required acceptance arrives, or record an explicit incident-policy auto-assignment by authority;
- transition to ASSIGNED only when the policy’s acknowledgement condition holds;
- project requested owner, acceptance state, deadline, and escalation without creating a ninth lifecycle state.

### [MAJOR 5] “All roles” and cross-domain claims are not bounded by a role registry

**Finding:** The research adds estimator/procurement but says Section 4 should remain unchanged; Section 4 does not include that role, and neither document includes installer/field recovery despite the platform and post-release scenarios involving field work.

**Why it matters:** “Each role” becomes an untestable acceptance criterion. A shared card may appear complete while a role that receives, installs, measures, or reports a defect has no defined authority or view.

**Evidence:**

- Research lines 125–134 define six projections including estimator/procurement.
- Section 4 lines 337–359 define client, designer, reviewer, coordinator, factory engineer, and CNC operator, but no estimator/procurement.
- Research lines 272–276 claim applicability across every qualified Interior Architecture Domain Pack.
- The parent repository context explicitly states that MONOLITH serves installers as well as designers, factories, and customers.

**Suggested change:** Add a versioned V1 Role Registry that names:

- role and authority purpose;
- cases the role may see;
- permitted actions and prohibited decisions;
- required always-visible fields;
- handoff/acknowledgement responsibility;
- seeded test scenarios.

Either include estimator/procurement and installer/field roles in Section 4 V1, or explicitly mark them deferred. Do not say “all roles” until the registry denominator is frozen.

### [MAJOR 6] The eight-field hard cap can hide role-critical information

**Finding:** “No more than eight fields” is presented as a universal contract even though factory, security, revocation, and qualification contexts require different always-visible facts.

**Why it matters:** Progressive disclosure must not hide machine, permitted-use, expiry, active package identity, acknowledgement coverage, or HOLD. Combining many facts into one nominal field preserves the count but not cognitive simplicity.

**Evidence:**

- Research lines 100–111 set the hard cap.
- Section 4 lines 353–359 require factory users to see candidate identity, machine context, permitted use, last ACTIVE comparison, acknowledgement, qualification restriction, procedure, and expiry.
- Research line 274 extends the same contract to multiple domains with different risk evidence.

**Suggested change:** Replace the field-count cap with:

- five universal questions: status/safe state, what happened, affected scope, consequence, next action;
- a policy-defined set of always-visible critical fields for the actor and capability;
- an evidence/detail drawer for noncritical depth;
- usability testing that measures orientation and error, not the number of visual fields.

### [MAJOR 7] Notification tiers and assignment acceptance are not reconciled with current workflow semantics

**Finding:** The research proposes immediate/action-queue/digest/activity-only tiers, but current routing only distinguishes direct push from group message and sends FYI to a group message.

**Why it matters:** A new recovery card cannot reduce alert fatigue if the backstage router continues broadcasting non-actionable FYI messages or treats delivery as assignment.

**Evidence:**

- Research lines 193 and 204 propose tiering and acknowledgement.
- **src/workflow/notification/routing.ts:4–23** maps personal responsibility/approval to direct push and cross-team handoff/FYI to group message.
- **src/workflow/handoff/canonical.ts:35–57** has no acknowledgement.

**Suggested change:** Define recovery notification intent from severity, actor capability, required response, deadline, and acknowledgement mode. Default non-actionable information to digest or activity log. Delivery, read, acceptance, and containment acknowledgement must remain distinct events.

### [MAJOR 8] The usability targets are not yet operationally falsifiable

**Finding:** The 30-second, 95%, and 100% targets do not define the clock start, denominator, sample, task mix, baseline, confidence interval, or whether results are evaluated per role and risk class.

**Why it matters:** A pooled result can hide a failing CNC or reviewer workflow behind easy client tasks. “100% in qualification testing” with a small sample does not prove a safety property.

**Evidence:**

- Research lines 243–257 define targets without measurement protocol.
- Section 4 lines 396–397 also use median 30 seconds and 95% without a frozen test protocol.
- Research lines 232–241 mix routine comprehension, professional review, handoff, manufacturing, replay, and accessibility scenarios.

**Suggested change:** Freeze a measurement protocol:

- define event-based clock start and successful end state;
- report each role, language, device, risk class, and scenario separately;
- define sample size and confidence interval before the pilot;
- measure safe first action, completion, backtracking, evidence opening, support escape, and NASA-TLX against a baseline;
- enforce safety invariants with automated/property/failure-injection tests; treat human studies as usability evidence, not proof of impossibility.

## What survives scrutiny

The following research contributions should be retained:

- the emotional target of relief rather than amazement;
- why / now / next temporal explanation;
- blame-free, state-based microcopy;
- explicit saved-work and safe-state language;
- preview/diff before consequential commitment;
- appropriate reliance rather than a trust score;
- notification discipline;
- Thai/English and assistive-technology requirements;
- role-specific seeded recovery scenarios;
- bounded revocation language and independent physical machine safeguards.

These strengthen the existing Section 4 presentation and validation clauses. They do not require a new authoritative object.

## Minimal correction set before owner approval

1. Reclassify the research as an evidence and UX guidance appendix to Section 4.
2. Remove the claim that a separately named Recovery Presentation Contract is the material missing layer.
3. Add a RecoveryCase-to-role-view mapping and fail-closed freshness/precedence rules to Section 4.
4. Resolve requested versus accepted assignment without adding a lifecycle state.
5. Freeze the V1 Role Registry and explicitly decide estimator/procurement and installer/field scope.
6. Replace the eight-field hard cap with universal questions plus policy-critical role fields.
7. Define notification intent, acknowledgement semantics, and the measurement protocol.
8. Make broker-first convergence of every current export/release path a prerequisite to UI implementation.

## Repository boundary and evidence classification

- **VERIFIED FACT — parent root:** the parent repository is the governance/bootstrap root and identifies installers among the platform constituencies.
- **VERIFIED FACT — nested root:** substantial release, workflow, factory, and export source exists, with multiple current UI entry paths and no exact implementation of the newly named Recovery contracts.
- **OWNER DECISION:** Section 4’s RecoveryCase, RecoveryEvent, DecisionReceipt, CapabilityPolicy, lifecycle, and EgressBroker model.
- **PRODUCT-DESIGN INFERENCE:** the card layout, field budget, role projections, microcopy, and notification tiers.
- **UNKNOWN / not established:** deployed behavior, production readiness, user love, machine qualification, or real-job recovery performance.

No production code or approved Section 4 file was changed during this scrutiny.

## Final verdict

**FIX-THEN-SHIP as Section 4 input.**

The evidence and human-factors guidance are useful, but the current recommendation duplicates the approved projection model and does not yet resolve the actual authority-path, projection-freshness, assignment-acknowledgement, role-denominator, and measurement seams.
