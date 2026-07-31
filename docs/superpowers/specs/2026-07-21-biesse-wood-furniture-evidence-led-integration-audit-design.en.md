# Biesse Wood/Furniture Evidence-Led Integration Audit — Design Specification

**Edition:** English  
**Design date:** 21 July 2026  
**Status:** Approved design contract  
**Approved approach:** B — Evidence-led integration audit  
**Decision owner:** Dave / MONOLITH owner  

> **Design decision:** audit the Biesse wood/furniture software and machine-integration stack against current official evidence and the actual MONOLITH product source. The audit must distinguish a vendor capability statement, a verified local implementation, and a production-qualified result. It must convert unresolved CIX, tooling, controller, data, and release questions into explicit fail-closed qualification gates.

## 1. Purpose

The audit must answer five decision questions:

1. What does the current Biesse wood/furniture stack publicly claim to do, and which official source supports each claim?
2. What Biesse/CIX/Biesse ISO integration is implemented in MONOLITH today, in which Git root, branch, revision, callers, tests, and release mode?
3. Which local paths are incomplete, ambiguous, unsafe, or unsupported by OEM evidence?
4. What should MONOLITH retain, refactor, integrate, build, or retire?
5. What evidence is required before any Biesse output may progress from shadow mode to an authorized machine run?

The audit is a decision and qualification instrument. It is not marketing copy, OEM certification, legal advice, or permission to cut a real workpiece.

## 2. Scope

### 2.1 Included Biesse wood/furniture stack

The audit covers the following functional chain where current evidence supports it:

`iX by imos -> B_NEST / B_OPTI / B_EDGE -> B_SOLID -> SmartConnection -> configured Biesse CNC cell -> Sophia / service and data feedback`

The chain is a functional model, not a claim that every named product is required, bundled, mutually compatible in every version, or deployed in MONOLITH.

Included topics are:

- parametric furniture design and process planning through iX by imos;
- 3D CAD/CAM, programming, simulation, virtual-machine checks, tool data, and time estimation through B_SOLID where officially documented;
- nesting through B_NEST and cutting optimization through B_OPTI;
- edgebanding preparation through B_EDGE/B_SUITE;
- job-order scheduling, machine linking, and production startup through SmartConnection;
- CIX and Biesse ISO boundaries, including provenance, grammar, controller, firmware, software version, and postprocessor selection;
- machine profile, work envelope, tool magazine, tools, feeds, speeds, faces, axes, coordinate frames, clamps, and no-cut zones;
- labels, part identity, BOM and operation reconciliation;
- Sophia/customer-care telemetry and the connected-product data contract;
- EU Data Act access, sharing, export, retention, and integration implications, without providing legal advice;
- MONOLITH code, tests, callers, release controls, and production-qualification gaps.

### 2.2 Excluded from this audit

The following are excluded from this first Biesse audit:

- glass and stone software, including IC, ICAM, and Easystone;
- unsupported assumptions about proprietary Biesse schemas or internal algorithms;
- a blanket certification for all Biesse machines or controllers;
- live machine configuration changes, CNC execution, or removal of `NOT_FOR_PRODUCTION` controls;
- purchasing, licensing, contractual, or legal conclusions not supported by the applicable documents and responsible authority;
- implementation fixes. Remediation will require a separate approved implementation plan.

## 3. Approved approach and deliverables

The selected approach is the middle of three considered levels:

| Level | Result | Decision |
|---|---|---|
| Catalog summary | Describes public product capabilities but cannot establish local integration or production safety. | Rejected as insufficient. |
| Evidence-led integration audit | Joins official sources, two-root source tracing, safety analysis, Data Act boundaries, and qualification gates. | **Approved for this phase.** |
| OEM qualification dossier | Adds licensed manuals, named controller/version evidence, B_SOLID fixtures, physical dry runs, coupons, first-article inspection, and OEM/factory sign-off. | Required later for production authority. |

The authoritative audit family will contain four aligned files:

- `docs/research/2026-07-21-biesse-wood-furniture-monolith-evidence-led-integration-audit.en.md`
- `docs/research/2026-07-21-biesse-wood-furniture-monolith-evidence-led-integration-audit.th.md`
- matching `.en.html` and `.th.html` standalone editions.

After the standalone audit passes acceptance, a concise Biesse section will be integrated into the controlled Vendor and Standards Evidence Ledger. The shared ledger must not be overwritten while another process is modifying it; integration starts with a fresh status and diff check.

## 4. Evidence contract

### 4.1 Claim classification

Every material conclusion uses the controlled MONOLITH claim classes:

- `VERIFIED FACT`
- `OWNER DECISION`
- `INFERENCE`
- `PROPOSAL`
- `UNKNOWN`
- `CONTRADICTED`

Source authority is recorded separately. For example, an official Biesse page can verify the fact that **Biesse states** a capability, but it does not prove that the capability is licensed, configured, interoperable with MONOLITH, or production-qualified at the user's factory.

### 4.2 Source priority

Material vendor and regulatory claims use this order of preference:

1. current Biesse product pages, technical documents, release notes, manuals, and signed OEM/factory correspondence;
2. applicable legislation or official regulator text;
3. current local source, tests, schemas, runtime callers, configuration, generated fixtures, and release evidence;
4. independent technical sources used only where primary material is unavailable and clearly labelled;
5. search and Perplexity Research as discovery and adversarial synthesis, never as the final authority for a load-bearing claim.

Every load-bearing claim records the title, URL or local path, publisher or Git root, revision/access date, applicable product/version, claim class, confidence, limitation, contradiction status, and evidence required for upgrade.

### 4.3 Negative-claim rule

The audit must not repeat the earlier A4-style error of converting “not found in public documentation” into “does not exist.” A product capable of producing or executing CNC work necessarily obtains or derives machining parameters somewhere, but the public source may not reveal the storage model, formula, interface, or controller-specific representation.

Any absence claim requires a search across official documentation, licensed material when available, local schema, source, production caller, tests, generated artifact, runtime behavior, and explicit vendor scope. Otherwise the result is `UNKNOWN` or “not established in the reviewed evidence.”

## 5. Initial official source corpus

The audit begins with, but is not limited to, these current official sources:

- [Biesse software catalog](https://biesse.com/th/th/software/)
- [B_SOLID](https://biesse.com/th/th/software/b_solid/)
- [B_NEST](https://biesse.com/th/th/software/b_nest/)
- [B_EDGE](https://biesse.com/th/th/software/b_edge/)
- [SmartConnection](https://biesse.com/th/th/software/smartconnection/)
- [iX by imos](https://biesse.com/us/en/software/ix-by-imos/)
- [B_SOLID digital-replica simulation article](https://biesse.com/it/it/novita/il-software-di-simulazione-della-replica-digitale-assicura-vantaggi-concreti-agli-utenti-cnc/)
- [B_NEST optimization article](https://biesse.com/th/th/news/b-nest-software-for-the-optimisation-of-nesting-projects/)
- [Biesse Customer Care and Sophia](https://biesse.com/ww/en/customer-care/)
- [Biesse Data Act page](https://biesse.com/us/en/data-act/)
- the Biesse connected-product information document linked from the Data Act page, observed as updated December 2025;
- [Regulation (EU) 2023/2854 — Data Act](https://eur-lex.europa.eu/eli/reg/2023/2854/oj).

Public pages are discovery anchors. The audit must identify any required licensed Biesse technical documentation, machine-specific manuals, controller references, postprocessor specifications, and sample files that are not publicly available.

## 6. Repository and runtime audit contract

### 6.1 Mandatory two-root baseline

Every current-state statement distinguishes:

| Root | Observed role | Design-time snapshot |
|---|---|---|
| `C:\Users\thai3\determined-williams (2)` | Governance/bootstrap, research, controlled evidence, reports, and specifications. | `master`, HEAD `acdbc36f5ecaeb63ef192da108cd2185b13711f3`; dirty with pre-existing and concurrent work. |
| `C:\Users\thai3\determined-williams (2)\determined-williams` | Active MONOLITH TypeScript/React/Supabase product and CNC/factory implementation. | `fix/drillmap-bolt-and-brun-dowels`, HEAD `59f61e5785d2a1215a74687fe0def91e9400c75d`; pre-existing modified Daph exports and untracked temporary trace tests. |

This is a volatile observation at design time, not a permanent product metric. The implementation audit must record a fresh branch, full SHA, upstream, status, test environment, and observation timestamp.

### 6.2 Required local trace

The audit must trace the actual execution and data path, not only filenames:

1. canonical design/BOM/part and drilling inputs;
2. operation-graph construction and validation;
3. machine-profile selection;
4. postprocessor resolution and dialect normalization;
5. CIX and Biesse ISO emitters;
6. production callers, bundle construction, status propagation, warnings, filenames, checksums, and release packet;
7. factory export paths that may implement a competing Biesse output;
8. tests for supported, unsupported, invalid, and unknown-tool cases;
9. shadow-mode and release-authority controls;
10. any runtime route, API, import, simulator, or machine feedback path.

The initial trace must include at least:

- `src/cnc/machine/presets/biesse.ts`
- `src/cnc/post/postProcessor.ts`
- `src/cnc/post/dialects/cix.ts`
- `src/cnc/post/dialects/biesseIso.ts`
- `src/cnc/buildGcodeBundle.ts`
- `src/cnc/mapping/validateOperationGraph.ts`
- `src/factory/cnc/generateGcodeForJob.ts`
- `src/factory/server/export/zipBundle.ts`
- `src/cnc/post/dialects/__tests__/cix.test.ts`
- `src/cnc/__tests__/buildGcodeBundle.test.ts`
- `src/core/config/shadowMode.ts`
- `src/factory/packet/__tests__/notForProduction.test.ts`.

Source presence proves implementation, not deployment, machine compatibility, factory acceptance, or safe production.

## 7. Safety findings that the audit must resolve

The following are preliminary `VERIFIED FACT` findings about the reviewed source snapshot. The audit must reproduce, bound, and grade them; it must not silently normalize them.

### B0 — unsupported operations can be omitted while output remains OK

The current CIX emitter handles `DRILL` and `BORE`; unsupported types add a warning and return no operation element. The existing POCKET test expects `status` to remain `OK` with `operationCount` equal to zero. The bundle builder aggregates warnings and can return `status: 'OK'` after postprocessing.

Required production rule:

`input manufacturing operations = emitted operations + explicitly authorized non-machining operations`

Any unexplained difference must fail the release. Warning-only omission is prohibited for production-authority output.

### B0 — unknown tools can default to tool number 1

The current CIX emitter warns and defaults an unknown tool to `TNO=1`; the test asserts the OK path. Production output must never guess a physical tool. Tool identity, magazine position, diameter, usable cutting length, holder, rotation, speed/feed authority, life state, and machine/controller applicability must be resolved and signed, or the output must fail closed.

### B1 — CIX conformance and provenance are not established

The local source describes its output as Biesse-compatible CIX XML and cites a third-party Autodesk forum. Current official Biesse material confirms that CIX files can participate in Biesse workflows, but the reviewed public evidence does not establish the grammar implemented by MONOLITH. The audit must not label the emitter OEM-conformant without a versioned OEM specification, accepted golden fixture, or equivalent signed evidence.

### B1 — two Biesse output paths may represent different contracts

The postprocessor registry normalizes generic `BIESSE` to CIX while retaining `BIESSE_ISO`; a separate factory ZIP path emits a Biesse ISO-style program. The audit must identify every caller and decide whether these are controller-specific adapters, legacy paths, test fixtures, or competing sources of truth.

### B1 — the generic Biesse machine preset is not production authority

The local Rover B FT preset contains numeric envelope, axis, spindle, magazine, tool, and process values. Each value must be tied to the exact machine model, serial/configuration, controller, firmware, installed options, tooling, material, setup, and approved source. A generic preset cannot authorize a real machine run.

Because the nested product is explicitly in `NOT_FOR_PRODUCTION` shadow mode, these B0 items are production-release blockers, not evidence that an unsafe real cut occurred.

## 8. Target integration boundary

MONOLITH should own canonical business and manufacturing intent while Biesse software and controllers retain OEM-native responsibilities.

`Approved MONOLITH job/revision -> canonical BOM and part identity -> machine-neutral operation graph -> versioned Biesse adapter package -> CIX or controller-specific output -> B_SOLID import/simulation -> human release -> configured machine cell -> inspection and feedback -> MONOLITH evidence record`

The adapter package must name and bind:

- machine model and asset identity;
- controller and firmware;
- B_SOLID/B_NEST/other relevant software versions;
- output dialect and grammar revision;
- coordinate frame, faces, datum, units, and orientation;
- tool library and magazine snapshot;
- clamps, pods, vacuum zones, spoilboard, work envelope, and no-cut zones;
- supported operation matrix and explicit rejection rules;
- material/process recipe authority;
- postprocessor version and checksum;
- test-fixture, simulator, coupon, and first-article evidence;
- signer, validity period, and revocation state.

MONOLITH must not replicate proprietary machine control, safety PLC logic, or opaque OEM optimization where a governed integration provides the required outcome. Biesse-native identifiers and payloads must be retained losslessly alongside canonical mappings.

## 9. Error handling and release doctrine

A production-candidate Biesse package must fail closed when any of these conditions occurs:

- an operation has no qualified mapping;
- a tool or tool position is unknown, inferred, stale, or incompatible;
- controller, firmware, software, machine, or adapter version is missing or mismatched;
- coordinate frame, face, datum, units, thickness, or orientation is ambiguous;
- tool reach, holder clearance, clamp/vacuum zone, envelope, or collision evidence is absent;
- the output cannot be parsed or imported by the named Biesse software/version;
- operation reconciliation, checksum, revision, signature, or human authorization fails;
- required simulator, dry-run, coupon, or first-article evidence has expired or is absent.

Warnings may inform engineering review, but a warning must not silently downgrade a mandatory release failure. Every override must name the authorized role, reason, scope, evidence, timestamp, and expiry; safety-critical unknowns are non-overridable.

## 10. Qualification and test design

The audit must define a staged evidence ladder:

1. **Source and contract review:** official versioned documents, supported-operation matrix, controller/software compatibility, and data rights.
2. **Static conformance:** schemas, parsers, units, coordinate frames, deterministic output, operation reconciliation, tool resolution, and fail-closed tests.
3. **Golden fixtures:** representative drill, bore, groove, pocket, profile, edge, aggregate, and orientation cases with expected artifacts and rejection cases.
4. **Differential import:** import the exact artifact into the named B_SOLID environment and reconcile geometry, tools, operations, warnings, and estimated sequence.
5. **Virtual-machine simulation:** collision, travel, tool/holder, setup, clamp/vacuum, and time checks with retained evidence.
6. **Controlled dry run:** named machine/controller/configuration, no cutting, authorized operator, and recorded results.
7. **Material coupon:** controlled tool/material/setup, metrology plan, acceptance limits, NCR handling, and traceability.
8. **First article:** released job revision, full dimensional/feature inspection, sign-off, and rollback criteria.
9. **Production authorization:** time-limited adapter/machine/material envelope with monitoring, change control, and revocation.

The audit must include a qualification matrix keyed by machine asset, controller/firmware, software version, postprocessor, operation family, tool library, material class, thickness range, setup, evidence artifact, owner, result, validity, and expiry.

The previous attempt to run the focused CIX tests did not execute because `vitest` was unavailable in that environment. The audit must record this as an environment limitation, install or resolve dependencies only with authorization, and rerun the exact tests before making a passing or failing test claim.

## 11. Data, Sophia, and EU Data Act contract

The audit must separate:

- raw connected-product data;
- user/business data and personal data;
- Biesse service data and derived analytics;
- MONOLITH canonical operational evidence;
- export format, semantics, frequency, latency, access method, retention, and deletion;
- first-party access and third-party sharing rights;
- cybersecurity, trade-secret, contract, and competitive-use restrictions;
- the difference between legal rights, contractual rights, technical availability, and implemented MONOLITH ingestion.

The reviewed Biesse information document indicates, among other items, user access through Sophia for two years, Biesse storage for five years, export in at least TXT, and potentially continuous or real-time generation depending on product/service. These are inputs to be reverified against the exact current document and applicable configuration; they are not proof of a deployed MONOLITH data connector or legal advice.

The target data contract must define stable identifiers, timestamps and timezone, units, quality flags, schema/version, pagination/stream behavior, retry and idempotency, consent/authority, retention, export, deletion, audit, and fallback when Sophia or a direct protocol is unavailable.

## 12. Audit document structure

The final audit must contain:

1. executive verdict and decision summary;
2. scope, method, evidence classes, snapshot, and limitations;
3. Biesse wood/furniture stack map;
4. product capability and claim ledger;
5. CIX/Biesse ISO/interface and provenance analysis;
6. two-root MONOLITH current-state trace with exact callers and tests;
7. findings graded B0 through B3;
8. target integration architecture and system-of-record boundaries;
9. Sophia/Data Act/data-governance assessment;
10. qualification ladder, matrix, stop conditions, and evidence templates;
11. `Retain / Refactor / Integrate / Build / Retire` decision table;
12. prioritized remediation and dependency sequence;
13. source register, contradictions, unknowns, and evidence-request list.

## 13. Acceptance criteria

The audit family is acceptable only when:

- English and Thai Markdown editions are semantically aligned;
- each Markdown edition has a readable standalone HTML companion;
- every material Biesse claim cites a current official source or is explicitly bounded as non-primary;
- every MONOLITH implementation claim names the correct Git root, branch, full SHA, file, caller, and relevant line or symbol;
- source presence is never promoted into deployment, compatibility, qualification, or production evidence;
- the operation-loss and unknown-tool B0 findings are reproduced, bounded, and not softened into ordinary warnings;
- CIX and Biesse ISO are mapped to explicit controller/software/version contracts or remain blocked as `UNKNOWN`;
- every numeric machine or process value carries a source and applicability envelope or is excluded from production authority;
- official vendor claims and independently demonstrated results are visibly distinct;
- the Data Act section cites the exact current Biesse and EU sources and clearly states its non-legal-advice boundary;
- test commands, environment, output, and limitations are recorded without inventing a result;
- no secret, API key, credential, licensed manual text, personal data, or proprietary customer payload is committed;
- the nested dirty worktree and unrelated parent changes remain untouched;
- the audit does not authorize production and keeps shadow-mode gates intact.

## 14. Implementation sequence after written-spec approval

After the owner reviews this written specification, the implementation plan will sequence:

1. refresh official Biesse and EU sources, using Perplexity Research for discovery/adversarial checking and primary sources for final authority;
2. freeze a reproducible two-root snapshot and evidence inventory;
3. trace the complete local Biesse path and reproduce safety findings;
4. build the claim, compatibility, operation-coverage, and qualification matrices;
5. draft and self-review the English audit;
6. produce the aligned Thai edition;
7. render and verify both standalone HTML editions;
8. run citation, link, parity, secret, contradiction, and Git-scope checks;
9. integrate the accepted summary into the shared Vendor and Standards Evidence Ledger without overwriting concurrent changes.

No runtime remediation begins under this document-writing authorization.

## 15. Design self-review result

- **Placeholder scan:** no unresolved `TBD` or `TODO` remains.
- **Consistency:** scope, evidence rules, architecture, findings, test design, and acceptance gates all preserve the distinction between public capability, local implementation, and production qualification.
- **Scope:** wood/furniture is included; glass/stone is explicitly excluded.
- **Ambiguity:** generic “Biesse compatibility” is prohibited. Compatibility must be a versioned machine/controller/software/adapter contract.
- **Safety:** unsupported operations and unknown tools are fail-closed production blockers; shadow mode remains in force.

