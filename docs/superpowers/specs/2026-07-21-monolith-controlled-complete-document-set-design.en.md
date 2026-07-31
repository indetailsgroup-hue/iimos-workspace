# MONOLITH Controlled Complete Document Set — Design Specification

**Edition:** English  
**Design date:** 21 July 2026  
**Status:** Approved design contract  
**Approved approach:** B — Controlled Complete Set  
**Decision owner:** Dave / MONOLITH owner  

> **Design decision:** consolidate the decisions, corrections, research, engineering method, formulas, safety boundaries, and implementation gates discussed in this session into five authoritative document families. Each family has aligned English and Thai Markdown editions and matching standalone HTML editions.

## 1. Purpose

The document set must let an executive, architect, designer, production engineer, CNC programmer, verifier, installer, or auditor determine:

1. what MONOLITH is trying to become;
2. what is implemented now and in which repository;
3. what remains proposed, unknown, contradicted, or not production-qualified;
4. how a design becomes a BOM, nesting input, CNC output, verified part, and installed evidence record;
5. which vendor and standards claims are primary-source facts, vendor claims, owner decisions, or hypotheses;
6. what evidence is required before a capability or output may be trusted in production.

The set replaces the need to reconstruct current truth from a dated executive report plus later correction appendices.

## 2. Source corpus

The controlled set is derived from, but not limited to, these current artifacts:

- `docs/superpowers/specs/2026-07-21-design-to-cnc-engineering-playbook-design.en.md` and its Thai/HTML companions;
- `docs/research/competitors/homag-a1-a9-evidence-ledger.en.md` and its Thai/HTML companions;
- `docs/reports/2026-07-21-ima-schelling-monolith-executive-deep-audit.en.md` and its Thai/HTML companions;
- `docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.en.md`;
- `docs/research/2026-07-21-imos-ix-monolith-executive-deep-research.en.md` and its Thai/HTML companions;
- `docs/prd/monolith-complete-prd.en.md` and its Thai/HTML companions;
- parent-bootstrap governance, ADR, component-master, and verification artifacts;
- the active nested product repository source, tests, migrations, routes, factory packet, CNC, field, release, and shadow-mode controls;
- current official vendor, standards-body, and regulator sources cited by the research.

No source document is automatically authoritative merely because it is long, rendered, approved as a design, or stored in Git.

## 3. Chosen approach

The approved approach is a controlled modular set rather than one monolithic report or an unindexed rewrite of every historical file.

### 3.1 Why this approach

- Executive decisions stay readable without losing engineering traceability.
- Engineering formulas and examples can evolve under stronger verification controls than the narrative strategy.
- Vendor claims remain separated from MONOLITH runtime evidence.
- Repository state can be refreshed without rewriting the complete product strategy.
- Historical errors remain auditable while the authoritative current edition is unambiguous.

### 3.2 Document dependency flow

`Evidence Ledger -> Repository Baseline -> Engineering Playbook -> Executive Blueprint -> Implementation Roadmap`

The Executive Blueprint is the master index and decision view. It must link to the exact supporting family for every load-bearing claim.

## 4. Authoritative deliverable matrix

Exactly five authoritative document families will be produced. Every family has four files, for a total of twenty controlled deliverables.

| Family | English Markdown | Thai Markdown | Purpose |
|---|---|---|---|
| Executive Blueprint and master index | `docs/reports/2026-07-21-monolith-integrated-executive-blueprint.en.md` | `docs/reports/2026-07-21-monolith-integrated-executive-blueprint.th.md` | Board verdict, strategic position, decisions, rights, risks, metrics, and navigation to evidence. |
| Design-to-Production Engineering Playbook | `docs/engineering/2026-07-21-design-to-production-engineering-playbook.en.md` | `docs/engineering/2026-07-21-design-to-production-engineering-playbook.th.md` | Design -> BOM -> nesting -> CNC -> verification -> installation method, formulas, worked examples, gates, and deliverable contracts. |
| Vendor and Standards Evidence Ledger | `docs/research/2026-07-21-monolith-vendor-standards-evidence-ledger.en.md` | `docs/research/2026-07-21-monolith-vendor-standards-evidence-ledger.th.md` | HOMAG A1-A9, IMA Schelling, imos iX, standards, source provenance, contradictions, and applicability limits. |
| Repository and Production-Readiness Baseline | `docs/reports/2026-07-21-monolith-repository-production-readiness-baseline.en.md` | `docs/reports/2026-07-21-monolith-repository-production-readiness-baseline.th.md` | Two-repository topology, implementation evidence, current limitations, capability map, and readiness matrix. |
| Implementation and Qualification Roadmap | `docs/superpowers/plans/2026-07-21-monolith-implementation-qualification-roadmap.en.md` | `docs/superpowers/plans/2026-07-21-monolith-implementation-qualification-roadmap.th.md` | Retain/refactor/retire/integrate decisions, phased execution, qualification evidence, owners, acceptance, and stop conditions. |

Each Markdown path has a same-stem `.html` companion. English and Thai filenames use `.en` and `.th` consistently.

## 5. Authority and supersession model

### 5.1 Current authority

The five controlled families become the current integrated interpretation after they pass all acceptance checks. Direct executable evidence and ratified normative records still outrank derived reports for their respective claim types.

### 5.2 Historical material

Existing source reports remain available as historical evidence. They are not silently deleted or rewritten to conceal the audit trail.

The original IMA Schelling executive audit must receive a visible supersession notice because its parent-root findings were generalized to MONOLITH as a whole. The repository-scope correction remains part of the historical chain, while the new baseline and blueprint incorporate the correction directly.

### 5.3 Conflict rule

When two artifacts conflict:

1. preserve both claims;
2. classify the contradiction;
3. identify the repository, revision, environment, and authority applicable to each;
4. select the stronger source for that claim type;
5. mark the losing claim `SUPERSEDED`, `STALE`, `DERIVED`, or `CONTRADICTED`;
6. never erase the losing claim from the evidence trail.

## 6. Evidence contract

Every material claim uses one of these exact classes:

- `VERIFIED FACT`: directly supported by current evidence;
- `OWNER DECISION`: explicitly decided, but not necessarily implemented or ratified;
- `INFERENCE`: a reasoned conclusion from evidence;
- `PROPOSAL`: a desired future state;
- `UNKNOWN`: not established;
- `CONTRADICTED`: incompatible with stronger current evidence.

Source authority and claim class are separate fields. A current primary vendor page can be authoritative evidence of what the vendor claims while the claim itself remains a `VENDOR CLAIM`, not a verified MONOLITH production result.

Every load-bearing claim must include, where applicable:

- source title and exact URL or clickable local path;
- section or line reference;
- publisher or repository identity;
- access date or source revision;
- claim class and confidence;
- scope and applicability;
- contradiction or supersession status;
- evidence required to upgrade the claim.

## 7. Repository baseline contract

No report may refer only to “the MONOLITH repository.” It must distinguish at least:

| Repository | Required description |
|---|---|
| Parent governance/bootstrap root | Governance, research, bilingual records, target package layout, component-master seed, and reports. |
| Nested active product repository | TypeScript/React/Supabase runtime, routes, migrations, workflows, factory packet, CNC/post-processors, field, release, tests, and CI history. |

Every new baseline records:

- absolute path;
- branch and full `HEAD` SHA;
- upstream when present;
- dirty and untracked state;
- observation date and timezone;
- inventory definition for every count;
- commands used to reproduce material counts;
- test command, environment, result, and limitation when tests are claimed.

Parent package placeholders cannot prove absence from the nested product. Nested source cannot prove deployment, customer use, machine qualification, or production safety without the corresponding evidence chain.

## 8. Engineering content contract

The engineering playbook covers the complete controlled path:

`Approved requirements -> canonical product contract -> derived geometry -> BOM -> manufacturing operations -> nesting/cutting plan -> machine-neutral operation graph -> post-processor output -> simulation -> coupon/first article -> production release -> inspection -> installation -> as-installed evidence`

### 8.1 Required calculation families

The playbook must provide definitions, units, coordinate frames, assumptions, domain limits, formulas, tolerances, worked values, failure conditions, and verification methods for:

- cabinet envelope and internal clearances;
- panel dimensions and offsets;
- reveals, gaps, overlays, setbacks, scribes, fillers, and installation allowances;
- grain direction and finish orientation;
- hardware selection and supplier-specific drilling rules;
- System 32 pitch semantics without treating generic values as universal supplier authority;
- hole diameter, depth, face, axis, breakthrough prevention, and tool reach;
- grooves, dados, rabbets, pockets, contours, and edge operations;
- BOM quantities, edge-band lengths, material yield, remnant policy, and costing;
- nesting constraints, kerf, trim, part spacing, clamp/no-cut zones, and rotation;
- coordinate transforms from design to part to machine coordinates;
- tool selection, feed/speed authority, post-processor mapping, and machine-profile constraints;
- dimensional tolerance budgets and inspection sampling;
- revision identity, checksum, traceability, and release authorization.

### 8.2 Mandatory worked chain

At least one parameterized cabinet example must travel end to end through formulas, panel schedule, BOM, operations, nesting input, machine-neutral graph, representative CNC/MPR output fields, verification, first article, and installed evidence.

The example is an engineering demonstration, not production authority. Any supplier, tool, material, or machine value that is not qualified remains blocked or explicitly hypothetical.

### 8.3 Safety doctrine

- Existing implementation is not the same as production qualification.
- CNC program generation is not proof of safe machining.
- A missing public parameter is not proof that the vendor product lacks the parameter internally.
- A negative capability claim requires search across documentation, source, production caller, schema, tests, runtime, and explicit vendor scope before it can be stated as absence.
- `NOT_FOR_PRODUCTION` or equivalent shadow mode remains active until machine, post-processor, security, coupon, first-article, and authority gates pass.
- Human release authority cannot be silently replaced by AI or optimization output.

## 9. Vendor and standards research contract

The evidence ledger integrates the session's HOMAG, IMA Schelling, and imos iX work without pretending that public material reveals proprietary internal schemas or every machine parameter.

### 9.1 HOMAG A1-A9 correction rule

The prior A4-style claim “there is no hole diameter or depth anywhere” is prohibited unless complete absence is proven. A product that outputs executable CNC necessarily obtains or derives machining parameters somewhere, but public documentation may not expose the exact storage location, formula, or interface.

### 9.2 Vendor claims

Throughput, utilization, availability, service prediction, optimization yield, and productivity figures remain vendor claims until independently reproduced under a named workload, configuration, environment, and measurement method.

### 9.3 Standards applicability

The ledger separates:

- publication/version verification;
- legal or contractual applicability;
- test method;
- acceptance criterion;
- licensed normative text required for implementation;
- MONOLITH conformance evidence.

A test-method standard does not automatically supply a pass/fail threshold. A voluntary standard does not automatically outrank law or become mandatory without an applicability basis.

## 10. Executive blueprint contract

The executive document includes:

- a one-page decision;
- verified current-state summary split by repository;
- vendor-neutral positioning and integrate-before-replicate boundary;
- owner decisions separated from evidence;
- customer data and portability rights;
- platform IP, tenant data, OEM data, jointly derived rules, and aggregated benchmark rights;
- privacy-compatible tamper evidence rather than undefined literal immutability;
- business-case formulas with measured inputs and uncertainty;
- risks, kill/continue gates, and independent demonstration requirements;
- links to the four supporting controlled families.

Language such as “make every role love the system” is replaced with measurable usability, trust, safety, portability, and task-success outcomes.

## 11. Roadmap contract

The roadmap does not fund greenfield rebuilding merely because the parent bootstrap lacks code. Each capability receives one disposition:

- `RETAIN`: current implementation is suitable to preserve pending verification;
- `REFACTOR`: current implementation is valuable but requires boundary or quality correction;
- `RETIRE`: current implementation is obsolete, duplicative, unsafe, or superseded;
- `INTEGRATE`: specialist vendor or external capability should be connected rather than rebuilt;
- `BUILD`: a verified gap requires new implementation.

Every roadmap item names:

- evidence-backed current state;
- intended outcome;
- files or systems affected;
- owner and approving authority;
- dependency and prerequisite;
- acceptance artifact;
- stop/rollback condition;
- readiness dimension affected;
- claim that becomes supportable after completion.

## 12. Bilingual and HTML requirements

- English and Thai editions must carry equivalent decisions, tables, formulas, warnings, and evidence status.
- Translation may adapt sentence order for clarity but may not change scope or authority.
- Every Markdown file has a matching same-stem standalone HTML file.
- HTML includes UTF-8 metadata, responsive layout, printable styling, readable tables, code blocks, and working links.
- No API key, credential, personal secret, or unredacted sensitive operational data may appear in any edition.

## 13. Production workflow for the documents

1. Freeze the evidence baseline and record both repositories.
2. Build the private claim ledger and resolve duplicate/stale sources.
3. Draft the Repository Baseline and Evidence Ledger first.
4. Draft the Engineering Playbook from the approved design and verified implementation evidence.
5. Draft the Executive Blueprint from those three sources.
6. Draft the Roadmap only after retain/refactor/retire/integrate/build decisions are evidence-backed.
7. Translate each English source into an aligned Thai edition.
8. Render standalone HTML from each Markdown source.
9. run link, parity, placeholder, contradiction, secret, and supersession checks;
10. inspect representative HTML pages visually;
11. record hashes and final verification results.

## 14. Acceptance criteria

The set is complete only when all conditions below pass:

1. all twenty expected files exist;
2. every Markdown file has its same-language HTML companion;
3. English and Thai headings, tables, formulas, decision states, and warnings are materially aligned;
4. no unresolved placeholder marker, invented citation, empty section, or silent omission remains;
5. every current-state claim states its repository scope;
6. no design artifact is presented as runtime fact;
7. no runtime implementation is presented as production qualification;
8. vendor performance numbers are visibly classified as vendor claims;
9. standards entries distinguish version, applicability, method, and acceptance criteria;
10. the A4 contradiction is explicitly corrected and converted into a durable negative-claim rule;
11. the active CNC/MPR path is acknowledged with exact source evidence;
12. machine safety and release gates remain fail-closed;
13. the Executive Blueprint links to every supporting family;
14. legacy IMA current-state language is visibly superseded;
15. no secret or API key is present;
16. HTML files open independently and preserve the Markdown's substantive content;
17. final file hashes and verification commands are recorded.

## 15. Non-goals

This documentation project does not:

- certify any CNC program, machine, material, hardware item, or cabinet for production;
- ratify proposed ADRs or the 15-context architecture;
- migrate the tenant/site schema;
- change active product runtime or nested dirty-tree files;
- claim vendor certification or standards conformance;
- expose or store the Perplexity API key;
- commit unrelated user changes.

## 16. Design self-review result

- Placeholder scan: no unresolved placeholder is permitted by the design.
- Internal consistency: five families x four editions equals twenty controlled deliverables.
- Scope: documentation consolidation and qualification planning are included; runtime implementation is excluded.
- Ambiguity: authoritative current editions, historical retention, repository split, evidence classes, and production-safety limits are explicit.
