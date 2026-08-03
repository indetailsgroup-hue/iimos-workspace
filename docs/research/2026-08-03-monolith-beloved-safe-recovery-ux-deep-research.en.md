# MONOLITH Deep Research: Beloved Safe-Recovery UX

**Date:** 3 August 2026

**Status:** Research recommendation for scrutiny; not an implementation or production-readiness claim

**Research method:** Two scoped Perplexity Agent API deep-research passes, followed by a Perplexity evidence-grounded reasoning pass against the approved Section 4 design

**Scope:** Failure handling, recovery, governance, and testing gates across AI-assisted Interior Architecture from client intent to controlled factory/CNC use

## Executive answer

MONOLITH will be loved when a failure feels like a **calm, competent handoff**, not an accusation and not a technical incident console.

The user-facing promise should be:

> When something goes wrong, MONOLITH preserves my valid work, tells me what happened, shows what remains safe, gives me the one next action I can actually take, and handles the investigation, dependency impact, version control, evidence, authority, audit, retry, and containment backstage.

The approved Section 4 safety model is already structurally strong. The research does **not** justify another workflow, another authoritative recovery object, a trust score, or an AI recovery chatbot. The material missing layer is a thin, derived **Recovery Presentation Contract**: one role-aware Recovery Decision Card projected from the existing RecoveryCase, RecoveryEvent, DecisionReceipt, evidence, capability policy, authority, and egress state.

The emotional target is **relief with calibrated trust**. Users should feel helped, but never be encouraged to rely on an AI result beyond its evidence or permitted use. Microsoft’s [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf) emphasize capability boundaries, correction, dismissal, explanation, and user control. [NIST AI RMF](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf) connects transparency, accountability, monitoring, recourse, and human oversight. Research on [automation bias](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/) shows why polished recommendations and simple commands can produce both commission and omission errors.

## What the evidence supports

### 1. A recovery view must answer three temporal questions

People need to understand why the automation acted, what it is doing now, and what it will do next. For MONOLITH, this becomes:

1. What triggered the recovery case?
2. What is saved, paused, isolated, blocked, or still safe now?
3. What will happen automatically, what requires a person, and what remains prohibited?

This is more useful than exposing an internal error class or a lifecycle state alone. The lifecycle still governs the system; the card translates it into an actionable human state.

### 2. Appropriate reliance is safer than maximum trust

The target is not “users trust the AI.” The target is that users accept correct assistance, reject incorrect assistance, and know when direct evidence or professional review is required. NIST’s [AI RMF Playbook](https://airc.nist.gov/docs/AI_RMF_Playbook.pdf) recommends explicit human roles, overrides, recourse, version history, monitoring, and post-alert action. Trust therefore must be measured against actual correctness, not only satisfaction.

MONOLITH should:

- state whether a claim was provided, observed, inferred, calculated, verified, contradicted, stale, or missing;
- show evidence and unchecked scope for consequential decisions;
- use plain evidence states instead of one project-level AI confidence percentage;
- preserve manual and last-verified paths when AI is unavailable;
- prevent AI from approving, waiving, releasing, closing incidents, or starting machines.

### 3. Blame-free language improves reporting and recovery

Google’s [blameless postmortem guidance](https://sre.google/sre-book/postmortem-culture/) treats people as having acted reasonably with the information available and looks for system conditions that made the action understandable. Applied to product copy:

- describe the state, not the person’s fault;
- say what MONOLITH preserved or stopped;
- name the affected object and exact revision;
- give a concrete recovery action;
- make “ask for review” feel like normal professional work, not failure.

Use “The ceiling-height evidence is not available yet.” Avoid “You failed to provide the ceiling height.”

### 4. Progressive disclosure must hide machinery, not truth

[GOV.UK validation guidance](https://design-system.service.gov.uk/patterns/validation/) recommends concise corrective messages, preserved input, a clear summary, and direct paths to the affected information. The first layer should therefore show only the information needed to orient and act. Evidence, diffs, receipts, policy, audit history, raw identifiers, and technical diagnostics remain available in a detail drawer.

Always visible:

- current safe state;
- affected scope and revision;
- consequence;
- missing or conflicting evidence;
- one primary action;
- owner and acknowledgement state;
- production or commitment eligibility.

Hidden until requested or needed:

- internal event taxonomy;
- model prompts and inference bookkeeping;
- dependency-graph traversal;
- policy evaluation trace;
- retry/outbox mechanics;
- raw telemetry and stack traces.

### 5. Accessible status is part of safety

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) requires errors to be identified in text, correction suggestions where known, status messages available to assistive technology, and consequential submissions to be reviewable, correctable, confirmable, or reversible. Status cannot depend on color alone. Thai and English content need correct language metadata, and Thai layouts must support real word segmentation and combining marks as described by the [W3C Thai Layout Requirements](https://www.w3.org/TR/thai-lreq/).

## Three product approaches

| Approach | Strength | Risk | Decision |
|---|---|---|---|
| **A. One Recovery Decision Card with expandable detail** | Fast orientation, one visible truth, role-specific action, compatible with the 30-second target | Requires disciplined action ranking and careful projection | **Recommended front door** |
| **B. Guided recovery wizard** | Useful when correction genuinely needs ordered evidence collection or cross-role handoff | More navigation; users may mistake completing steps for authority to commit | Invoke only from the card for complex recovery |
| **C. Role dashboards and notification inboxes** | Scales to queues, teams, and many concurrent cases | Fragments context and can create stale or competing apparent states | Secondary navigation only |

The Recovery Decision Card should be the authoritative **presentation**, not a new authority. A wizard may execute a multi-step correction. Dashboards, LINE, email, or other notifications may deep-link to the same case, but they must not become separate decision surfaces.

## Recommended experience: the Recovery Decision Card

### Minimum lovable recovery contract

The first view contains no more than eight fields:

| Visible field | Required content |
|---|---|
| **1. Status and safe state** | Plain-language state plus whether valid work is saved, isolated, paused, blocked, or reversible |
| **2. What happened and why** | One bounded explanation; distinguish known cause, probable cause, and unknown |
| **3. Affected scope and revision** | Project, room/object/job, exact revision or package identity, and destination where relevant |
| **4. Consequence** | What stopped, what remains available, and what waiting or proceeding would affect |
| **5. Evidence gap** | Missing, conflicting, stale, or insufficient evidence; required level/cardinality; unknown is never shown as pass |
| **6. Primary next action** | One safest server-authorized action for this role, labelled by outcome |
| **7. Alternatives and accountability** | At most two safe alternatives, current owner, requested role, and acknowledgement state |
| **8. Progress and detail** | Current step, last update, retry/reversal state, plus links to diff, evidence, receipts, and activity history |

The card may be recomputed from authoritative state. It must not independently authorize, approve, waive, revoke, release, or change the recovery lifecycle. Every action is revalidated by the server at execution time. A stale card causes a safe refresh, not a commitment.

### Three recovery intensities

| Mode | User experience | Backstage behavior |
|---|---|---|
| **Routine recovery** | MONOLITH preserves input, explains the issue, suggests one correction, and allows retry or undo | Validation, deduplication, idempotent retry, dependency refresh, event logging |
| **Expert recovery** | A role-qualified person receives the exact revision, diff, evidence gap, assumptions, and bounded decision | Impact analysis, evidence assembly, authority check, receipt binding, handoff acknowledgement |
| **Incident containment** | A prominent safe-state card shows HOLD, affected jobs, required acknowledgement, and replacement status | Stop new egress, fence affected capabilities, invalidate controlled authorization, trace destinations, record acknowledgements, preserve append-only timeline |

Routine failures should not look like incidents. Incidents should never look like ordinary warnings.

## Role-specific projections over one truth

| Role | First question to answer | Recovery moment the user should love | Work MONOLITH handles backstage |
|---|---|---|---|
| **Client / homeowner** | Is my design saved, and what decision is affected? | “Your option is saved. We still need a measured ceiling height before technical approval.” | Source classification, ambiguity detection, downstream impact, routing to designer |
| **Interior designer** | Which objects changed and can I correct them without restarting? | Compare the stale base against the current revision, keep the draft, update only affected objects, undo safely | Stable object mapping, diff, invalidation, regeneration, provenance |
| **Architect / technical reviewer** | What exact scope, evidence, assumptions, and unchecked areas require judgment? | See risk-ranked exceptions and coverage for the exact revision; record a purpose-specific decision | Requirement applicability, evidence cardinality, independent-review ordering, receipt creation |
| **Coordinator** | Who owns the blocker, has the handoff been accepted, and what does it block? | See one blocking decision rather than every open issue; escalate only when acknowledgement or deadline fails | Dependency graph, SLA, notification deduplication, acknowledgement tracking |
| **Estimator / procurement** | Which quantity, price, supplier, or commitment changed? | Preserve the priced snapshot and show the exact cost/lead-time delta before changing any order | BOM reconciliation, quote age, substitution impact, reopening affected technical gates |
| **Factory / CNC operator** | Can this exact job run on this machine now? | Scan and see one unambiguous ACTIVE or HOLD state, the verified fallback, and a safe-stop action | Point-of-use identity check, destination policy, replay prevention, egress fencing, run audit |

## Frontstage and backstage boundary

| User sees | MONOLITH does backstage |
|---|---|
| One calm recovery card | Failure classification and case correlation |
| Exact affected revision and scope | Dependency reachability and derivative inventory |
| What is saved, safe, paused, or blocked | Snapshot preservation, quarantine, fencing, and last-verified selection |
| Missing evidence and unchecked scope | Evidence collection, applicability, cardinality, freshness, and provenance checks |
| One next action and at most two alternatives | Capability policy, role/tenant authority, separation-of-duties, and server revalidation |
| Owner, acknowledgement, and progress | Routing, notification deduplication, SLA, retry/outbox, and audit assembly |
| Preview or diff before commitment | Impact computation across geometry, BOM, cost, procurement, shop drawing, and CNC |
| Purpose-specific confirmation | Immutable receipt, manifest binding, controlled egress, and point-of-use verification |

## Microcopy contract

Every recovery message should follow this order:

1. neutral status;
2. affected object and revision;
3. preserved or safe state;
4. consequence;
5. next action.

| Situation | Good | Avoid |
|---|---|---|
| Missing site evidence | “Technical review needed. We could not verify the ceiling height from A-14. Your design is saved; production remains paused. Add a measured drawing or assign a reviewer.” | “Inference failed: insufficient geometric context.” |
| Stale designer base | “This layout was created before the column changed in A-15. Compare the two affected items, then update or keep your draft.” | “Your design is out of date.” |
| Review evidence gap | “The fire-rating source for partition P-12 is missing. No technical approval has been recorded.” | “AI confidence low. Approve anyway?” |
| Unacknowledged handoff | “Review requested from Arun at 14:20. It has not been accepted; procurement remains paused.” | “Waiting for team.” |
| BOM change | “A-15 changes panel PX-04 from 18 to 22. The purchase order is unchanged until you review the cost difference.” | “Estimate recalculated successfully.” |
| CNC revision mismatch | “Do not run K07-R18. It was generated from superseded A-14. Load verified K07-R17 or request a new release.” | “Possible mismatch. Continue?” |

Thai translation must be authored as Thai, not assembled from translated fragments. Prefer “ยังไม่มีข้อมูลความสูงฝ้าเพดาน” over “คุณใส่ข้อมูลไม่ครบ”.

## Fit against the approved Section 4

### Keep unchanged

- RecoveryCase as mutable current projection.
- RecoveryEvent as append-only lifecycle fact.
- DecisionReceipt as immutable purpose-specific proof.
- CapabilityPolicy and server-owned EgressBroker.
- Eight-state lifecycle and containment acknowledgements.
- Permitted-use classes: PREVIEW, SHADOW_SIMULATION, QUALIFICATION_COUPON, QUALIFICATION_FIRST_ARTICLE, and PRODUCTION.
- Incident-specific authority matrix, separation of duties, and tenant-authority prerequisite.
- Evidence levels and cardinality proof.
- Exact-revision binding, controlled egress, truthful offline-revocation limits, audit trail, and no-bypass enforcement.
- Existing user targets: correct orientation within 30 seconds and at least 95% correction or reversal without support.

### Add as a presentation and communication contract

- the eight-field Recovery Decision Card;
- explicit safe-state and saved-work wording;
- role-specific projections over the same RecoveryCase;
- one primary authorized action plus at most two safe alternatives;
- preview/diff before consequential commitment;
- owner plus requested/acknowledged handoff state;
- notification tiers: immediate interruption, action queue, digest, activity log only;
- Thai/English and assistive-technology behavior;
- recovery-specific instrumentation and seeded user tests.

### Avoid or simplify

- do not expose all lifecycle states, policies, evidence, or authority matrices in the first view;
- do not use raw error codes, stack traces, or model telemetry as primary copy;
- do not show a global confidence score or “AI approved” badge;
- do not create several competing banners, retry buttons, or notification streams;
- do not offer a visually normal “Proceed anyway” action beside the safe action;
- do not mark a handoff “assigned” until the recipient acknowledges it;
- do not describe a remote or offline copy as erased when only future controlled access is blocked.

### Defer

- a new recovery-orchestration entity or universal workflow engine;
- conversational recovery as the primary interface;
- automatic approval, waiver, release, incident closure, or machine start;
- customizable card builders, gamification, omnichannel decision-making, and predictive incident prevention;
- fully automatic rollback initiated from the presentation layer.

## Non-negotiable safety invariants

1. A recovery card is a projection; the server remains the authority.
2. Every consequential action binds to exact scope, revision/package identity, purpose, actor, authority, evidence, and time.
3. Any material change creates a new revision and invalidates affected approvals; no silent approval inheritance.
4. Unknown, timed out, stale, missing, or parser-error evidence is never converted to pass.
5. “All passed” requires a cardinality proof over the frozen applicable requirement population.
6. Only the controlled egress path can create a production-usable package.
7. A production HOLD dominates any lower-priority Approved or ACTIVE display.
8. Retry and replay cannot create duplicate approvals, orders, exports, jobs, or machine-start authority.
9. Revocation claims are bounded to systems under MONOLITH control; retrieved copies require recipient inventory and acknowledgement.
10. Platform checks, AI, simulation, and safe-stop workflow never replace physical guarding, interlocks, emergency controls, or qualified operator judgment. [OSHA machine-guarding guidance](https://www.osha.gov/machine-guarding) makes this boundary essential.

## Testing designed to disprove the recommendation

### Seeded role scenarios

| Role | Seeded failure | Evidence of success |
|---|---|---|
| Client | AI cannot verify ceiling height from an image | Understands that design is saved, technical approval is blocked, and a measured source is needed |
| Designer | Column location changed after the draft base revision | Finds affected objects, compares revisions, corrects or preserves the draft without restart |
| Reviewer | Fire-rating evidence is stale and belongs to an earlier revision | Rejects silent inheritance, identifies missing current evidence, records a bounded decision |
| Coordinator | Review request was delivered but not acknowledged | Distinguishes requested from accepted, identifies the sole blocker, escalates correctly |
| Estimator/procurement | Hardware substitution changes cost and technical compatibility | Keeps the old priced snapshot, reviews delta, and reopens affected gates before commitment |
| Factory/CNC | Cached package is superseded while the job is queued | Stops use, selects the verified fallback or requests a new release, never bypasses HOLD |
| All roles | Double-click, refresh, timeout, and action replay | No duplicate side effect; final status is truthful and auditable |
| Accessibility/localization | Async state change in Thai and English, keyboard and screen reader | Status is announced, usable without color, wraps correctly, and preserves technical identifiers |

### Measures

| Outcome | Target or interpretation |
|---|---|
| Correct next-action orientation | Existing Section 4 target: within 30 seconds |
| Correction or reversal without support | Existing Section 4 target: at least 95% |
| Safe first action in critical production scenario | 100% in qualification testing; any unsafe action is a stop condition |
| Stale revision or approval accepted as current | 0 |
| Unauthorized or non-ACTIVE egress | 0 |
| Duplicate consequential side effect after retry/replay | 0 |
| Evidence cardinality or unknown misrepresented as complete/pass | 0 |
| Appropriate reliance | Report accept-correct and reject-incorrect rates separately; do not replace them with a trust score |
| Workload | Improve role-specific [NASA-TLX](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/) dimensions against the existing workflow without worse defect escape |
| Notification quality | Measure actionable interruptions, duplicates, acknowledgement time, and ignored urgent notices |
| Psychological safety | Users can report uncertainty and request review without feeling blamed |

### Stop conditions

Stop and redesign if any of these occurs:

- the UI claims safe, approved, complete, active, or revoked without server-verifiable evidence;
- a user or manipulated client can bypass authority, evidence, lifecycle, tenant, or egress policy;
- stale revision, stale approval, unknown evidence, or revoked acknowledgement is treated as valid;
- replay creates a duplicate commitment or production action;
- the visible scope or revision differs from the committed receipt;
- any critical role cannot identify the safe state and next authorized action within the agreed threshold;
- less than 95% can correct or reverse without support;
- critical meaning depends on color, is not exposed to assistive technology, or is materially mistranslated.

## Cross-domain applicability

The Recovery Presentation Contract is domain-neutral and should apply to every qualified Interior Architecture Domain Pack: casework and millwork; doors and partitions; ceilings and lighting coordination; wall and floor finishes; sanitary and wet areas; loose furniture and FF&E; soft furnishings; signage; specialist equipment; and MEP interfaces.

The card contract can be shared, but each domain must supply its own affected-object language, evidence requirements, risk taxonomy, qualified reviewer role, deterministic checks, safe output adapter, and release authority. A shared UX must never imply shared qualification.

## Research method and limitations

This note used Perplexity in three stages:

1. A broad single deep-research request was attempted but exceeded the five-minute API timeout and produced no usable result.
2. Two narrower Perplexity deep-research passes completed: human factors/recovery UX and safety governance/design-to-manufacturing.
3. A Perplexity reasoning pass compared those findings against the approved Section 4 model and was restricted to primary or official domains.

The synthesis preserves a strict distinction:

- **Evidence-backed principle:** supported by a cited official, standards-body, or peer-reviewed source.
- **Product-design inference:** the proposed Recovery Decision Card, eight-field contract, role projections, and frontstage/backstage allocation.
- **Existing owner decision:** the approved Section 4 objects, lifecycle, authority, evidence, qualification, and egress model.

The parent repository was inspected as the governance/bootstrap root. The nested **determined-williams/** repository was inspected as the active product source. This note makes no claim that the proposed Recovery Presentation Contract is implemented, deployed, machine-qualified, or production-ready.

## Principal sources

| Source | Organization / date | Evidence type | Supports |
|---|---|---|---|
| [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf) | Microsoft Research, 2019 | Research-derived guidance | Capability boundaries, uncertainty, correction, dismissal, explanation, controls |
| [HAX Toolkit AI Guidelines](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) | Microsoft | Official design toolkit | Human-AI interaction patterns |
| [AI Risk Management Framework 1.0](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf) | NIST, 2023 | Government framework | Governance, accountability, validity, monitoring, human oversight |
| [AI RMF Playbook](https://airc.nist.gov/docs/AI_RMF_Playbook.pdf) | NIST | Government playbook | Recourse, override, version history, incident response, measurement |
| [Automation Bias: A Systematic Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/) | JAMIA, 2012 | Peer-reviewed systematic review | Commission/omission errors and mitigations |
| [Trust in Automation: Designing for Appropriate Reliance](https://pubmed.ncbi.nlm.nih.gov/15151155/) | Human Factors, 2004 | Peer-reviewed review | Calibrated trust and appropriate reliance |
| [Blameless Postmortem Culture](https://sre.google/sre-book/postmortem-culture/) | Google SRE | Official operational guidance | System-focused, psychologically safe failure learning |
| [Managing Incidents](https://sre.google/sre-book/managing-incidents/) | Google SRE | Official operational guidance | Explicit roles, handoff, communication, timeline |
| [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) | Google SRE | Official operational guidance | Actionable symptom-first alerts and noise control |
| [Validation Pattern](https://design-system.service.gov.uk/patterns/validation/) | GOV.UK Design System | Government service pattern | Preserved input, error summary, corrective recovery |
| [Error Message Component](https://design-system.service.gov.uk/components/error-message/) | GOV.UK Design System | Government service pattern | Concise, specific, non-blaming error copy |
| [Check Answers Pattern](https://design-system.service.gov.uk/patterns/check-answers/) | GOV.UK Design System | Government service pattern | Review and correction before commitment |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C, 2023 | Web standard | Error identification, correction, prevention, language, color, focus |
| [Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | W3C WAI | Normative-supporting guidance | Accessible asynchronous status and progress |
| [Thai Layout Requirements](https://www.w3.org/TR/thai-lreq/) | W3C Internationalization | Language layout guidance | Thai segmentation, combining marks, typography |
| [Common Data Environment Guidance](https://ukbimframework.org/wp-content/uploads/2020/02/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf) | UK BIM Framework, 2020 | Industry guidance | Information state, revision, suitability, archive |
| [BIM Collaboration Format](https://www.buildingsmart.org/standards/bsi-standards/bim-collaboration-format/) | buildingSMART | Open standard | Structured, object-linked issue exchange |
| [Information Delivery Specification](https://technical.buildingsmart.org/projects/information-delivery-specification-ids/) | buildingSMART | Open standard | Machine-readable information requirements and checking |
| [Zero Trust Architecture SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final) | NIST, 2020 | Government security standard | Per-session authorization and least privilege |
| [Security and Privacy Controls SP 800-53 Rev. 5](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-53r5.pdf) | NIST, 2020 | Government security controls | Separation of duties, audit protection, information flow |
| [Guide to Operational Technology Security SP 800-82 Rev. 3](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-82r3.pdf) | NIST, 2023 | Government OT guidance | OT segmentation, allowlisting, controlled conduits |
| [Deployment Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) | GitHub | Official product documentation | Protected deployment approvals and anti-self-approval precedent |
| [Track and Revoke Documents](https://learn.microsoft.com/en-us/purview/track-and-revoke-admin) | Microsoft Purview | Official product documentation | Limits of revocation for downloaded and offline copies |
| [Machine Guarding](https://www.osha.gov/machine-guarding) | OSHA | Government safety guidance | Software does not replace physical safeguards |
| [EC2 API Idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html) | AWS | Official product documentation | Retry without duplicate side effects |
| [NASA Task Load Index](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/) | NASA | Validated workload method | Multidimensional workload measurement |

## Final research recommendation

Keep the Section 4 truth, authority, evidence, qualification, and egress model intact. Add only the thin **Recovery Presentation Contract**:

**One case → one role-aware Recovery Decision Card → one safest action → expandable proof → server-validated commitment.**

That is the smallest change most likely to make recovery feel easy and humane without weakening professional responsibility or manufacturing safety.
