# MONOLITH Smallest Lovable Experience Design

**Status:** OWNER DECISION — Approved 3 August 2026
**Product direction:** Studio-first, Powered by MONOLITH
**Experience direction:** Calm Editorial · Human Action First
**North Star:** MONOLITH makes the next right action obvious—and makes the complicated work behind it dependable.

## 1. Decision Summary

MONOLITH will be designed as a **Calm Decision & Exception OS** for interior-design studios, not as a feature-complete project-management dashboard. It wins studio owners/project managers and designers first, then extends trustworthy projections to factories, installers, craftspeople, and customers.

The smallest lovable product is an **Attention Cockpit followed by one authority-bound Client Decision Loop**. The implementation sequence remains strict:

1. Project Context Foundation establishes correct identity and authority.
2. Project Cockpit projects existing authoritative data and does not become a new source of truth.
3. One Decision Pipeline closes one client design-decision loop.
4. One Exception Projection shows one normalized factory blocker.
5. Effect Ledger/Outbox makes backstage effects reliable and recoverable.
6. Role Views and LINE are introduced only after authority gates pass.

The approved Wave 1 implementation remains narrower than the complete lovable-product wedge: presentation contract, safety invariants, and read-only Project Cockpit only. Decision mutation, runtime role adaptation, customer action, factory production action, and LINE remain deferred.

## 2. Evidence and Provenance

Research was conducted with Perplexity multi-source Search and high-context Reason. The single Deep Research endpoint timed out without returning content, so no result from that failed request was used. Perplexity results were filtered toward primary, peer-reviewed, official, and credible first-party sources.

| Finding | Evidence | Design implication | Classification |
| --- | --- | --- | --- |
| Usefulness, ease of use, and compatibility correlate strongly with technology adoption | Meta-analysis of digital-transformation and SME IT-adoption research | Fit the studio's real workflow before expanding features | EXTERNAL EVIDENCE |
| Progressive disclosure improves learnability, efficiency, and error prevention when the primary/secondary split is correct | Nielsen Norman Group | Show frequent actions and critical risk first; move rare technical detail behind explicit links | EXTERNAL EVIDENCE |
| Users need continuous, honest visibility into system state | Nielsen Norman Group | Distinguish saved, sending, pending, failed, stale, and partially complete states | EXTERNAL EVIDENCE |
| Transactional outbox and idempotent processing address dual writes, retries, and duplicate delivery | AWS guidance | Save business state and effect intent together; make retries safe and visible | EXTERNAL EVIDENCE |
| Explanations can increase trust even when a recommendation is wrong | Microsoft HAX research | Explain sources and limitations; never use explanation as a substitute for human authority | EXTERNAL EVIDENCE |
| Construction adoption is constrained by situation-awareness gaps, differing conventions, and field conditions | Construction UX research | Delay broad field rollout and use a field-specific presentation profile | EXTERNAL EVIDENCE |
| One primary action per attention item will reduce hesitation | Derived from progressive disclosure and Human Action First | Treat as a user-research hypothesis, not a universal rule | INFERENCE / TESTABLE HYPOTHESIS |

## 3. Repository and Product Boundary

This design describes the active product in the nested `determined-williams/` repository. The parent repository is the governance/bootstrap root. Substantial runtime implementation exists in the nested product, but source presence does not prove production readiness. Shadow mode and NOT-FOR-PRODUCTION remain active safety constraints.

This design does not authorize a new tenant model, production release, schema migration, external message delivery, or role-based permission implementation. Project Context and authority must be supplied by their canonical server-owned foundation before write actions are enabled.

## 4. Priority Users and Jobs

### 4.1 Studio owner / project manager

The cockpit must help them:

- know which project needs attention without checking several channels;
- confirm project, site, room, client, revision, freshness, and authority;
- understand consequence, deadline, and accountable owner;
- obtain a client decision without repeated chasing;
- see whether a factory blocker threatens schedule or scope;
- know whether an effect succeeded, remains pending, or needs recovery.

### 4.2 Designer

The experience must help them:

- protect uninterrupted design work from avoidable coordination overhead;
- identify the design consequence of a client decision or factory blocker;
- distinguish draft, ready for review, approved, released, and superseded states;
- compare relevant revisions and source evidence;
- prepare one clear decision without assembling context manually.

### 4.3 Downstream users

Factories and installers initially receive authoritative projections, not ownership of the studio's project model. Customers initially receive a narrow decision experience, not a general portal. This limits behavioral change and protects authority boundaries.

## 5. Experience Promise

Within ten seconds of opening a project, a common-case user should be able to answer:

1. Where am I—studio, project, site/room, and revision?
2. How fresh is this information and where did it come from?
3. Is the current state safe to act on?
4. What matters most now, and why?
5. What is the best next action available to me?

The ten-second target is a product hypothesis for validation, not an external benchmark.

## 6. Experience Architecture

```text
Project Context Foundation
        ↓ authoritative identity and capability
Project Cockpit Read Model
        ↓ attention-ranked projection
Human Action Card
        ↓ authority check before any write
Decision / Exception Pipeline
        ↓ committed business state + effect intent
Effect Ledger / Outbox
        ↓ delivery, retry, reconciliation
Receipt Projection
```

The front stage never reconstructs authority, infers a tenant from `site_code`, or treats a local role as permission. The backstage performs orchestration; the user sees clear states, receipts, and recovery choices.

## 7. Project Cockpit Contract

### 7.1 Information hierarchy

The default view answers questions in this order:

1. **Context:** project identity, site/room, revision, freshness, and viewing authority.
2. **Safety:** ready for review, blocked, draft, stale, or shadow/NFP.
3. **Attention:** a short ranked list of decisions and exceptions, not an activity feed.
4. **Consequence:** effect on design, schedule, cost, factory, or customer commitment.
5. **Action:** one primary human task.
6. **Evidence:** sources, history, receipts, and recovery through progressive disclosure.

### 7.2 Attention Card

Every card contains:

- plain-language event or need;
- why it matters;
- affected scope;
- accountable owner;
- due time when meaningful;
- one primary action;
- at most two visible secondary actions;
- source and freshness indicator.

Examples of primary actions are `Review decision`, `Confirm project`, `Inspect blocker`, and `Retry delivery`. The action is absent or disabled when identity, authority, revision, or safety state is unresolved.

### 7.3 Progressive disclosure

- **Level 1 — Attention:** state, consequence, owner, deadline, primary action.
- **Level 2 — Working context:** options, affected items, source files, revision comparison.
- **Level 3 — Authority and provenance:** capability used, actor, revision lineage, history.
- **Level 4 — Recovery:** attempts, provider response, effect ID, retry and reconciliation controls.

Links use predictable labels: `Why this is shown`, `Compare revisions`, `Delivery history`, and `Recovery details`.

## 8. One Client Decision Loop

This section defines the first post-authority action; it is not part of the read-only Wave 1 implementation.

An Authority-bound Decision Brief contains:

- immutable project and revision context;
- one question or decision scope;
- curated options;
- plain-language consequence of each option;
- studio recommendation clearly separated from the client's choice;
- affected items and source evidence;
- deadline and what happens next;
- authorized recipient and response capability;
- revocation or supersession state;
- durable receipt.

Client approval is not production release unless a separate, explicit authority rule says so. A new revision invalidates or supersedes stale decision briefs according to server policy.

## 9. One Factory Blocker Projection

The first factory experience is a projection into the studio cockpit. It includes:

- affected project, revision, location, and item;
- blocker category and evidence;
- consequence and latest safe decision time;
- reporter and accountable studio owner;
- freshness and reconciliation state;
- NFP/shadow status when applicable.

It does not authorize production, operate machines, schedule labor, or create a full factory workspace. During shadow mode, wording is evidence-oriented: `Inspect packet`, `Review blocker`, or `Run shadow verification`, never `Start work` or `Start production`.

## 10. Honest State and Recovery Model

| State | User-facing behavior | Required backstage behavior |
| --- | --- | --- |
| No attention | “Nothing needs your attention right now,” with scope and last refresh | Preserve query time and sources |
| Loading | Keep context visible; state what is being checked | Resolve authoritative context before projections |
| Refreshing | Show last known data with refreshing indicator | Do not silently replace versions |
| Stale | Identify old and current revisions | Block stale action unless explicitly authorized |
| Permission denied | Explain view/action boundary and access path | Enforce server-side and audit denial |
| Saved, delivery pending | Distinguish committed work from an incomplete external effect | Keep outbox pending and retries idempotent |
| Transient failure | Show last safe state and one retry action | Use bounded retry/backoff and correlation ID |
| Conflict | Preserve both facts and require authorized resolution | Halt the affected effect and reconcile explicitly |
| Shadow / NFP | Persistent non-themeable safety language | Block or sandbox production effects |

A receipt records project, revision, actor, authority, requested action, business object, effect ID, current state, timestamp, destination, attempts, provider response, retry eligibility, and recovery action. The normal UI summarizes this; technical detail remains available on demand.

## 11. Surface Profiles and One Semantic Language

The semantic states remain invariant: `Draft`, `Needs review`, `Approved`, `Released`, `Blocked`, `Delivery pending`, `Failed`, and `Shadow / NOT-FOR-PRODUCTION`.

| Profile | Primary need | Presentation behavior |
| --- | --- | --- |
| Calm — Owner/PM | Confidence and prioritization | Spacious, consequence-led, attention-ranked, minimal visible controls |
| Workspace — Designer | Context and comparison | Denser, source- and revision-aware, preserves creative workspace |
| Field — Factory/Installer | Fast comprehension under adverse conditions | High contrast, short language, large targets, connectivity state, evidence capture |
| Customer | Confident decision | Studio-first, plain language, one decision, consequence, receipt, next step |

Presentation profiles never grant permission or hide required safety information.

## 12. Controlled Brand Kit

The hierarchy is **Studio-first, Powered by MONOLITH**.

A server-resolved studio profile may control:

- studio name and logo;
- approved accessible accent;
- greeting and client-facing tone;
- approved imagery;
- bounded terminology aliases.

MONOLITH always controls:

- project and revision identity;
- authority and permission language;
- draft/approval/release semantics;
- warning, error, pending, and recovery meaning;
- audit receipts;
- NFP and production-safety language;
- minimum typography, contrast, focus, and target-size rules.

Brand styling may soften the experience but must never soften risk.

## 13. Accessibility and Field Physics

WCAG 2.2 AA is the baseline, not the ceiling. Status is communicated with text and programmatic semantics, not color alone. Thai body copy is at least 14px with line-height at least 1.5; metadata is at least 12px; general interactive targets are at least 44px; field controls remain at least 48px. Field physics wins when brand styling conflicts with sunlight readability, gloved use, latency, or safety.

## 14. Explicit Non-goals

The smallest lovable product does not include:

- a universal dashboard or general-purpose project-management suite;
- a general customer portal;
- a complete factory or installer operating system;
- chat replacement;
- LINE before authority and effect reliability;
- automatic production release or customer commitment;
- AI decisions presented as authority;
- silent project-state mutation;
- exactly-once delivery claims;
- unrestricted workflow or brand customization;
- retrospective analytics without a next action.

## 15. Success Measures

These are initial hypotheses to validate, not external benchmarks:

| Measure | Initial gate |
| --- | ---: |
| Confirm project context in common cases | ≤10 seconds |
| Identify the most important attention item | ≤15 seconds |
| Complete intended primary action without facilitation | ≥80% |
| Correctly describe success, pending, or failure state | ≥90% |
| Critical wrong-project/revision actions | 0 |
| Partial failures presented as complete | 0 |
| Production effects allowed in shadow mode | 0 |
| Pilot users voluntarily return for a real task | ≥60% |

Failure of identity, state comprehension, or shadow safety is a stop-and-redesign signal even if aesthetic preference is high.

## 16. Four-week Validation Protocol

### Week 1 — Understand real work

Interview and observe 3–4 owners/PMs, 3–4 designers, 2 factory/installer contacts, and 2 recent decision-making customers. Reconstruct real decisions, blockers, artifacts, authority, and terminology.

### Week 2 — Test the cockpit

With 6–8 primary users, test context confirmation, attention discovery, consequence comprehension, progressive disclosure, NFP recognition, and partial-failure recovery.

### Week 3 — Non-production vertical slice

Exercise Project Context, read-only Cockpit, a non-live decision object, authority denial, effect ledger/outbox, fake delivery, duplicate events, stale revisions, timeouts, and shadow guards.

### Week 4 — Controlled pilot

Use 2–3 studios on non-production or low-risk work. Observe voluntary return, parallel use of existing channels, trust in receipts, vocabulary failures, and whether MONOLITH reduces chasing instead of adding another place to check.

## 17. Acceptance Criteria

This design is satisfied only when:

- Project Context is visible before every meaningful action;
- Project Cockpit remains a read model;
- attention is ranked by consequence rather than recency alone;
- every attention item has one clear primary human action or an explicit reason no action is available;
- write actions fail closed on identity, authority, revision, or safety ambiguity;
- asynchronous effects expose honest receipt and recovery states;
- semantic and safety meaning is invariant across profiles and brands;
- NFP cannot be hidden or restyled into production readiness;
- role views and LINE remain blocked until authority and effect gates pass;
- user testing validates task comprehension, not aesthetic preference alone.

## 18. Sources

- Nielsen Norman Group, [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- Nielsen Norman Group, [Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/)
- Nielsen Norman Group, [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)
- W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- AWS Prescriptive Guidance, [Transactional Outbox Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- AWS Builders' Library, [Making Retries Safe with Idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- Microsoft Research, [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/)
- Chalmers University, [Enabling Connected Construction Sites](https://odr.chalmers.se/items/b7339ddc-796b-495a-a2a8-0607699beeb3)
- Santini et al., [Drivers of Digital Transformation Adoption](https://pmc.ncbi.nlm.nih.gov/articles/PMC8841366/)
