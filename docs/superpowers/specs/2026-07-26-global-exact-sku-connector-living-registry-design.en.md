# Global Exact-SKU Cabinet Connector Living Registry — Design Specification

**Date:** 26 July 2026  
**Status:** Approved design; implementation not yet authorized  
**Owners:** MONOLITH Platform Owner, Component Master Governance, Manufacturing Engineering, Structural Qualification, Procurement Data Stewardship  
**Consulted tenant:** Daph is one consulted pilot/customer company and has no canonical platform authority  
**Companion edition:** `2026-07-26-global-exact-sku-connector-living-registry-design.th.md`

## 1. Decision

MONOLITH will build a **Global Exact-SKU Cabinet Connector Living Registry** using an **Evidence Graph + Deterministic Qualification Engine** architecture.

The registry will:

- continuously discover connector brands and products worldwide;
- preserve the exact commercial identity of every discovered orderable item;
- model the complete system BOM, including connector bodies, mating hardware, caps, jigs, cutters, drill bits, machine adapters and service parts;
- accept arbitrary cabinet width, depth and height inputs;
- qualify each joint against exact material, thickness, load, geometry, tooling and evidence constraints;
- publish transparent coverage rather than making an unbounded claim that the world market is complete;
- fail closed when identity, compatibility, manufacturing or structural evidence is insufficient;
- keep canonical product facts separate from tenant-specific commercial overlays.

The initial release is a **registry specification, ingestion system and verified first cohort**, not a one-time static market spreadsheet and not an immediate production platform.

## 2. Why this design is required

The existing executive research identified useful connector-family coverage but explicitly described its market table as a family/model ledger rather than an all-SKU census. The approved requirement is materially deeper:

> Every brand worldwide as a living registry; every model and exact product code; every compatible component and tool; every cabinet width, depth and height; every applicable cabinet material and actual thickness; and configuration-specific qualification evidence.

A static list cannot satisfy that requirement because:

- global product catalogs change;
- order codes, finishes, packs and availability differ by region;
- the same geometry can have several commercial identities;
- an OEM product family page does not prove every orderable SKU;
- connector suitability depends on both mating panels, not a single nominal thickness;
- cabinet height alone does not determine joint demand;
- strength evidence is configuration-specific;
- OEM content rights may permit factual indexing but prohibit redistribution of drawings or CAD;
- discontinued and superseded products must remain reproducible for service work.

The design therefore treats completeness as a measured coverage contract over named sources, catalog editions, regions, product families and dates.

## 3. Approved scope

### 3.1 Global brand scope

The registry is an open-ended global living registry. It must support:

- active OEM brands;
- regional brands;
- contract-manufactured and white-label products;
- acquired, merged, renamed and dormant brands;
- region-specific order codes;
- discontinued products required for repair or historical project reproduction;
- newly discovered brands whose relevance is still pending.

“Every brand” means every brand discovered through the governed discovery process receives a recorded state and review date. It does not mean the market is treated as a closed or permanently complete set.

### 3.2 Complete System BOM

Coverage includes:

- connector body or housing;
- bolt, dowel, pin, anchor, sleeve and insert;
- screw and fastener;
- cap, cover and trim;
- adhesive or activation material when required;
- jig, template and gauge;
- drill bit, boring tool, router cutter and profiled cutter;
- spindle, collet, tool holder or machine adapter when product-specific;
- insertion, press, torque or activation tool;
- spare and replacement part;
- required consumable;
- compatible machine process and setup.

Every relationship must carry type, direction, cardinality, conditions, evidence and lifecycle.

### 3.3 All cabinet substrates

The material model includes:

- solid wood;
- particleboard;
- MDF and HDF;
- plywood;
- blockboard;
- OSB;
- lightweight and honeycomb panels;
- compact laminate;
- bamboo panels;
- wood-plastic composites;
- aluminium and steel frames;
- thin fronts and other connector-relevant surface systems;
- future substrate classes without schema replacement.

Qualification distinguishes core, grade, density, moisture, orientation, coating, nominal thickness, measured thickness and thickness tolerance.

### 3.4 Parametric cabinet scope

The engine accepts arbitrary cabinet W × D × H values within governed numeric precision. It covers standard and custom:

- base cabinets;
- wall cabinets;
- tall cabinets;
- wardrobes and closets;
- vanities;
- shelving and storage units;
- islands and peninsulas;
- freestanding, built-in, wall-mounted and mobile units;
- modular and transport-separated assemblies.

Accepting an input does not imply approving it. Unsupported configurations return a refusal or insufficient-evidence verdict.

## 4. Non-goals

The first cohort will not:

- claim that every global brand or SKU has already been found;
- infer a product code from a family name;
- use marketplace listings as primary geometry evidence;
- infer structural performance from product tests alone;
- extrapolate a tested thickness or material without an approved rule;
- treat a distributor code as an OEM code;
- publish OEM drawings, CAD, photography or catalog text without rights;
- make Daph preferences canonical;
- authorize production from AI-extracted data without human review;
- replace physical testing with software tests;
- flatten historical or discontinued products into current replacements.

## 5. Authority and repository boundary

The governance/bootstrap root owns:

- ontology;
- evidence policy;
- canonical identity rules;
- registry releases;
- qualification governance;
- coverage reporting;
- tenant-overlay policy.

The nested active MONOLITH product consumes pinned, versioned registry releases and maps them into runtime connector operations. It must not maintain an independent competing product truth.

Daph and future tenants may own overlays such as:

- preferred supplier;
- contract price;
- local stock;
- approved substitution;
- lead time;
- tenant-specific procurement restriction.

Tenants may propose evidence and mappings. They may not mutate global identity, OEM geometry, qualification evidence or canonical lifecycle.

## 6. Hybrid architecture

### 6.1 OEM Evidence Vault

The vault stores immutable source snapshots and metadata:

- source URL and publisher;
- document title, edition and publication date;
- country, market and language;
- access timestamp;
- content hash;
- MIME type;
- extraction permission;
- redistribution and asset-rights constraints;
- superseding-source relationship;
- reviewer notes.

The vault preserves evidence. It does not automatically make extracted claims canonical.

### 6.2 Vendor ingestion adapters

Each vendor adapter translates vendor-native structures into candidate records. Adapters may parse:

- OEM web catalogs;
- PDF catalogs and datasheets;
- installation manuals;
- CAD metadata;
- product APIs or feeds;
- authorized-distributor availability sources.

Adapters produce `PENDING_CANDIDATE` records. They cannot publish `VERIFIED` facts.

### 6.3 Canonical Exact-SKU Registry

The canonical registry resolves:

- manufacturer and brand;
- family, series and model;
- OEM order code;
- GTIN, EAN, UPC or other public identifier;
- region and commercial offer;
- finish, colour, material, handedness and pack;
- revision and lifecycle;
- equivalence without identity collapse.

One orderable commercial identity is one record. Shared geometry is linked, not merged.

### 6.4 Complete System BOM and Compatibility Graph

Typed graph edges include:

- `REQUIRES`;
- `OPTIONALLY_USES`;
- `COMPATIBLE_WITH`;
- `INCOMPATIBLE_WITH`;
- `REPLACES`;
- `SUPERSEDES`;
- `REGION_VARIANT_OF`;
- `GEOMETRY_VARIANT_OF`;
- `TOOLED_BY`;
- `MACHINED_BY`;
- `INSTALLED_WITH`;
- `QUALIFIED_WITH`;
- `REQUIRES_MATERIAL_CONDITION`.

Edges include quantity, panel role, region, version, conditional expression, evidence reference and validity interval.

### 6.5 Deterministic Qualification Engine

The engine reads:

- cabinet configuration;
- material instances;
- exact SKU and complete BOM candidates;
- geometry and machining constraints;
- structural qualification envelopes;
- available machine and tool capabilities;
- region and lifecycle state;
- governing release policy.

It produces a deterministic verdict, trace and manufacturing proposal.

### 6.6 Coverage and Release Ledger

The ledger publishes:

- discovered brand denominator;
- expected family/model/SKU denominator by source edition;
- classified record counts;
- evidence completeness;
- source freshness;
- blocked sources;
- unresolved conflicts;
- qualification gaps;
- release version and hash.

## 7. Canonical data model

### 7.1 Brand universe

Required fields:

- global brand ID;
- legal manufacturer;
- trading brand;
- parent company;
- origin and operating regions;
- official domains;
- trademarks and aliases;
- OEM, white-label, acquisition and rebrand relationships;
- discovery source and date;
- last reviewed date;
- relevance state.

Allowed relevance states:

- `DISCOVERED`;
- `RELEVANCE_PENDING`;
- `CONNECTOR_OEM_CONFIRMED`;
- `NO_RELEVANT_PRODUCTS_FOUND`;
- `SOURCE_ACCESS_BLOCKED`;
- `DORMANT_OR_DEFUNCT`;
- `ACQUIRED_OR_REBRANDED`.

### 7.2 Product and exact commercial identity

Required identity dimensions:

- manufacturer;
- brand;
- family;
- series;
- model;
- OEM order code;
- public barcode identifiers where available;
- commercial region;
- finish and colour;
- product material;
- handedness or orientation;
- pack quantity;
- unit of measure;
- revision;
- lifecycle state and dates.

Different OEM order codes are separate commercial records even when their geometry matches. Pack, finish or region variants are separate when they change the orderable code.

### 7.3 Connector geometry

Geometry records include:

- connector class and joint semantics;
- body envelope;
- bore, slot, profile and pocket geometry;
- coordinate datum;
- drilling/routing direction;
- edge and end distances;
- minimum ligament;
- tolerances;
- assembly vector;
- tool-access volume;
- visible and concealed state;
- disassembly and retightening attributes.

### 7.4 Material instance

Material records distinguish:

- substrate class;
- exact material product when known;
- grade and governing standard;
- core construction;
- density and tolerance;
- moisture and conditioning;
- grain or layer orientation;
- nominal thickness;
- measured thickness;
- thickness tolerance;
- coating, laminate or facing layers;
- edge treatment.

Panel A and Panel B always have independent material instances.

### 7.5 Tool and machine capability

Capability records include:

- process class;
- machine identity or capability class;
- spindle and axis limits;
- drill/cutter identity;
- diameter and cutting geometry;
- collet/tool-holder/adapter;
- feed, speed and depth rules when evidenced;
- insertion, press or torque requirements;
- jig and datum method;
- achievable tolerance;
- tool reach and access;
- inspection method.

### 7.6 Evidence record

Every verified field points to evidence containing:

- publisher and source identity;
- document/page/figure/table locator;
- region and language;
- publication and access date;
- content hash;
- extracted field;
- extraction method;
- reviewer and review date;
- confidence;
- rights state;
- contradiction and supersession links.

## 8. Independent verification dimensions

The design forbids a single undifferentiated `Verified` flag. Each SKU carries independent states for:

- identity verification;
- geometry verification;
- BOM compatibility verification;
- tooling and manufacturing verification;
- material/thickness applicability;
- structural configuration qualification;
- commercial orderability;
- field installation validation;
- lifecycle freshness;
- rights review.

A SKU may therefore be identity-verified but structurally unqualified, or geometrically verified but commercially unorderable.

## 9. Thickness model

The engine accepts any measured thickness representable under the governed precision policy. Evidence is represented as:

- exact OEM-declared points;
- exact OEM-declared ranges;
- tested configuration points;
- statistically qualified ranges;
- approved interpolation rules;
- prohibited extrapolation zones;
- unknown zones.

Rules:

- Panel A and Panel B thicknesses are evaluated separately;
- core thickness and facing thickness are not silently combined;
- a nominal thickness does not replace measured thickness where tolerances matter;
- passing 15 mm and 18 mm does not automatically qualify 16 mm;
- density, moisture and orientation constraints travel with the thickness envelope;
- unsupported points return `INSUFFICIENT_EVIDENCE` or `UNQUALIFIED`;
- no nearest-neighbour connector substitution is allowed for release.

## 10. Parametric Qualification Envelope

### 10.1 Inputs

The engine receives:

- external and internal W × D × H;
- every panel and joint geometry;
- cabinet topology;
- shelves, dividers, rails, stretchers, back and plinth;
- exact material instances;
- dead, live, point, eccentric, racking and dynamic loads;
- door and drawer mass and eccentricity;
- wall/floor/mobile condition;
- wall substrate and anchors;
- environment and corrosion conditions;
- service and repeated-assembly requirement;
- factory machines and tools;
- installation access and sequence;
- region and compliance policy.

### 10.2 Decision pipeline

1. Normalize units, precision and tolerances.
2. Generate the cabinet joint graph.
3. Filter by lifecycle, region and orderability.
4. Filter by Panel A and Panel B material/thickness.
5. Resolve the complete BOM.
6. Validate geometry, edge distance and collision.
7. Validate tool access, machine capability and assembly sequence.
8. Match exact structural qualification evidence.
9. calculate connector count, spacing and position from qualified rules.
10. Evaluate racking, overturning, wall attachment and anti-tip requirements.
11. Emit the verdict, trace, BOM, machining proposal and inspection plan.

### 10.3 Tall and large cabinet behavior

Height is not used as a single proxy for demand. The engine evaluates:

- unsupported span;
- joint-line length;
- panel slenderness and bow risk;
- door/drawer eccentricity;
- center of gravity and overturning;
- back-panel contribution;
- fixed shelf and divider contribution;
- rail and stretcher contribution;
- wall-anchor capacity and position;
- transport and handling;
- module splitting;
- installation access.

If increasing connector count is insufficient, the engine requires reinforcement, fixed structure, anchoring, module division or refusal.

### 10.4 Verdicts

- `QUALIFIED`;
- `CONDITIONALLY_QUALIFIED`;
- `UNQUALIFIED`;
- `INSUFFICIENT_EVIDENCE`;
- `DISCONTINUED_OR_UNORDERABLE`.

Every verdict includes reason codes and evidence references.

### 10.5 Mandatory refusal gates

Release is refused when:

- exact identity is unresolved;
- a required mating part is unresolved;
- material or thickness is outside the qualified envelope;
- an unapproved extrapolation is required;
- BOM compatibility is incomplete;
- geometry collides or violates a governed distance;
- required machine or tool capability is unavailable;
- assembly access is impossible;
- wall substrate or anchor evidence is incomplete where required;
- lifecycle replacement has not been qualified;
- the evidence chain is incomplete;
- the result cannot be reproduced from a pinned registry version.

## 11. Ingestion and publication workflow

1. Discover a brand or new source.
2. Register the brand and source denominator.
3. Snapshot the source in the Evidence Vault.
4. Hash and classify the source.
5. Extract candidate products, SKUs, geometry and BOM.
6. Validate schema and units.
7. Resolve identity, duplicates, regional variants and rebrands.
8. Validate compatibility edges.
9. Review field-level citations.
10. Separate geometry review from structural review.
11. Review rights.
12. Publish a signed/versioned registry release.

AI extraction never promotes its own output beyond pending candidate state.

## 12. Change monitoring and lifecycle

The system monitors:

- OEM catalog indexes;
- source content hashes;
- document editions;
- new and removed order codes;
- geometry changes;
- installation-instruction changes;
- regional offer changes;
- discontinuation and replacement notices;
- authorized-distributor orderability.

Commercial freshness is evaluated independently from geometry freshness.

Historical records are tombstoned or superseded, never destructively replaced. A released project pins a registry version so its BOM and machining plan remain reproducible.

## 13. Conflict and error handling

Candidates enter quarantine when:

- units are ambiguous;
- inch and metric data conflict;
- OEM documents disagree;
- PDF and CAD geometry disagree;
- regional order codes collide;
- distributor and OEM identity disagree;
- a required mating part is absent from the candidate graph;
- pack or finish identity is ambiguous;
- source rights are unclear;
- a newer installation instruction changes a released constraint.

Quarantine prevents manufacturing release and records owner, reason, evidence, opened date and resolution.

## 14. Coverage contract

Coverage is reported by:

- brand;
- legal manufacturer;
- region;
- catalog edition;
- product family;
- model;
- exact SKU;
- evidence dimension;
- lifecycle;
- review date.

A release may state:

> 1,284 of 1,331 expected orderable SKUs classified across 42 confirmed OEMs and 18 regions, against the named source editions as of the release date.

It may not state “all global products complete” without a defined denominator.

Every discovered item must be assigned one of:

- `VERIFIED`;
- `PENDING`;
- `REGION_ONLY`;
- `SUPERSEDED`;
- `DISCONTINUED`;
- `OUT_OF_SCOPE_WITH_REASON`;
- `SOURCE_BLOCKED`.

## 15. Verified first cohort

The proposed first cohort is:

1. Häfele;
2. Hettich;
3. Titus;
4. Lamello;
5. Italiana Ferramenta;
6. OVVO;
7. Lockdowel;
8. Välinge Innovation / Threespine;
9. KNAPP;
10. Festool DOMINO;
11. Hoffmann Machine Company;
12. Blum, limited to its actual connector role rather than being generalized as a carcass connector supplier.

The first denominator covers:

- OEM global/EU sources;
- United States regional sources;
- Thailand/ASEAN orderability;
- any other region with different geometry or order codes discovered during source review.

Existing MONOLITH Minifix, Target J10, Rastex intent and dowel seeds are reconciled against this cohort. Existing implementation does not automatically outrank newer primary evidence.

## 16. Validation strategy

### 16.1 Data and graph validation

- schema and unit validation;
- required-field validation;
- duplicate identity detection;
- regional-code collision detection;
- dangling BOM edge detection;
- incompatible-edge contradiction detection;
- lifecycle graph validation;
- field-level citation enforcement;
- rights-state enforcement.

### 16.2 Qualification-engine validation

- boundary tests at every min/max constraint;
- property tests across W × D × H and unit conversions;
- golden configurations for base, wall, tall, wardrobe and custom cabinets;
- collision and edge-distance cases;
- machine-capability negative cases;
- absent-tool and absent-mating-part negative cases;
- lifecycle and region negative cases;
- deterministic replay from pinned releases;
- mutation tests proving refusal gates fail closed.

### 16.3 Tenant-boundary validation

- Daph overlays cannot mutate canonical facts;
- tenant prices and stock remain tenant-local;
- tenant substitutions require governed approval;
- deletion of a tenant overlay does not delete canonical or historical registry evidence.

### 16.4 Physical qualification

Where applicable, the physical matrix covers:

- static strength;
- cyclic durability;
- racking;
- pull-out and withdrawal;
- repeated assembly;
- transport and impact;
- environmental conditioning;
- misuse and repair;
- wall suspension and anti-tip.

Each result records specimen material, actual thickness, density, moisture, connector lot, machining tolerance, torque or insertion state, sample size, statistical treatment and failure mode.

Software tests do not substitute for these physical results.

## 17. First-cohort acceptance criteria

The first cohort is accepted only when:

- the named source denominator for all 12 brands is published;
- every discovered connector-relevant family, model and SKU is classified;
- every identity-verified SKU has primary OEM evidence;
- every verified field has a field-level source locator;
- released BOMs have no missing or dangling required parts;
- geometry and structural qualification states are independent;
- no qualification relies on unapproved extrapolation;
- unsupported configurations are deterministically refused;
- source freshness and blocked-source gaps are visible;
- registry releases are reproducible and hash-addressed;
- parent canonical identity and nested runtime mappings do not conflict;
- production release remains blocked until all applicable evidence gates pass.

## 18. First-cohort deliverables

Project-facing outputs must be provided in aligned Thai and English editions with standalone HTML companions.

Machine-readable outputs will include logically separate datasets for:

- brands;
- sources;
- product families;
- models;
- exact SKUs;
- regional commercial offers;
- BOM edges;
- compatibility edges;
- geometries;
- material instances;
- tools and machines;
- qualification envelopes;
- evidence records;
- lifecycle events;
- coverage snapshots.

Exact filenames and migration sequencing belong in the implementation plan, not this design.

## 19. Operational ownership

Required roles:

- Brand Discovery Steward;
- OEM Evidence Curator;
- Identity and SKU Reviewer;
- Manufacturing Geometry Reviewer;
- Structural Qualification Authority;
- Tooling and Machine Capability Owner;
- Rights and Licensing Reviewer;
- Procurement Data Steward;
- Registry Release Manager;
- Tenant Overlay Approver.

No role may self-approve every stage of a safety-relevant record.

## 20. Success measures

The program measures:

- classified SKUs divided by expected SKUs for each declared denominator;
- percentage of verified fields with field-level primary evidence;
- percentage of released BOMs with complete compatible parts;
- percentage of qualified configurations with exact test evidence;
- stale source rate;
- unresolved conflict age;
- source-blocked coverage;
- deterministic replay rate;
- refusal-gate escape count;
- field defect and repair outcomes by exact configuration;
- time to incorporate an OEM catalog change;
- tenant-overlay isolation failures.

The target user outcome is trust and repeatable value, not dependency through lock-in.

## 21. Implementation transition

After user review and approval of this written specification, the next step is a separate implementation plan. That plan must:

- reconcile existing parent and nested connector records before introducing a new authority;
- isolate the first cohort into bounded ingestion waves;
- preserve all current dirty-worktree changes;
- define migrations, schemas, tests and release gates;
- keep NOT-FOR-PRODUCTION controls active until evidence gates pass;
- avoid claiming global completeness at any intermediate release.

## 22. Approval record

The user approved:

- Global Living Registry;
- Complete System BOM;
- Parametric Qualification Envelope;
- all cabinet substrates;
- primary-source evidence hierarchy;
- registry specification + ingestion system + verified first cohort;
- Evidence Graph + Deterministic Qualification architecture in hybrid form;
- architecture and authority model;
- exact-SKU master schema and thickness rules;
- qualification engine and refusal gates;
- ingestion, lifecycle and transparent coverage design;
- first cohort, validation and acceptance criteria.

