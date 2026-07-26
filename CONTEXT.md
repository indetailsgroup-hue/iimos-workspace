# MONOLITH Repository Context

## Purpose

This repository is the governed bootstrap for MONOLITH, a multi-tenant platform serving kitchen brands, studios, dealers, designers, factories, installers, customers, and customers-of-customers. Daph is one pilot tenant and does not own platform governance or shared canonical data.

## Repository topology — mandatory discovery

- This directory is the **governance/bootstrap root**.
- The active MONOLITH product source is in **determined-williams/**, which is a separate nested Git repository for **monolith-workspace**.
- Every current-state, maturity, gap, test, migration, runtime, or roadmap audit must inspect both Git roots and state explicitly which root each finding describes.
- Never infer that MONOLITH has no runtime or domain implementation from the parent **apps/** or **packages/** directories alone.
- Preserve the nested repository's dirty worktree. Check Git status separately in both roots before any edit, test, commit, or cleanup.
- Read the [21 July 2026 repository-scope correction](docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.en.md) before using the IMA Schelling audit's MONOLITH current-state section.

## Current authority

- Parent-root state: governed bootstrap; this statement does not describe the nested product runtime.
- Nested product state: substantial runtime, database, workflow, manufacturing, and test source exists. Source presence does not by itself prove deployment or production readiness; verify its current branch, dirty state, tests, release mode, security, and operational evidence.
- Governance records: Proposed until their evidence and ratification gates pass.
- Runtime claims from this parent root: none. Contracts, schemas, and reference engines here do not prove deployed isolation, manufacturing safety, or field use.
- Canonical shared knowledge: writable only through MONOLITH governance.
- Tenant policy: ADR-001 records the target Bridge model. Conformance of the nested product schema and runtime must be audited independently before a multi-tenant claim is made.

## Source evidence

The original kitchen encyclopedia and reference implementation remain under `All aboute kitchen/`. Governed bootstrap artifacts live under `docs/`, `packages/`, `data/`, and `tests/`. The active product source lives in the separate nested repository `determined-williams/`. Original evidence is copied into governed structures only when provenance is retained.

## Working rules

1. Distinguish `VERIFIED FACT`, `OWNER DECISION`, `INFERENCE`, `PROPOSAL`, `UNKNOWN`, and `CONTRADICTED`.
2. Never promote a passing unit test into a production-readiness claim.
3. Keep supplier-native codes lossless; canonical mappings must retain provenance and rights metadata.
4. Treat `MON-BS-001` as an internal interoperability profile, never an ISO/EN standard.
5. Produce project-facing deliverables in English and Thai, with standalone HTML aligned to Markdown.
