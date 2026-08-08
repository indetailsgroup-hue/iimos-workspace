# ProjectContext Identity Reconciliation — Controlled Verification Report

**Evidence run:** 9 August 2026 (Asia/Bangkok)<br>
**Authorized base:** `3dc814f24343feee8ad131d62a43a2768fc8a0d9`<br>
**Verification source commit:** `00a5a2015f1d579f4d779f0e8b0f38d60c27abf1`<br>
**Branch:** `codex/project-context-identity-reconciliation`<br>
**Outcome:** `TASKS_1_TO_10_IMPLEMENTED — REVIEW_READY — DEPLOYMENT_NOT_AUTHORIZED`

## 1. Scope and authority boundary

This report verifies the ProjectContext identity-reconciliation implementation in an isolated worktree created from the authorized base only. It does not authorize deployment, production migration, production/staging data access, or Repair Operations activation. Repair Operations remains **G−0 = DISABLED** and **G−1 = BLOCKED**.

The pull-request target is restricted to `codex/repair-operations-phase-a-adr`. Direct merge to `main` or `fix/dxf-truth-chain` is prohibited.

## 2. Repository provenance

| Root | Branch / HEAD observed | Status at evidence collection |
|---|---|---|
| Governance/bootstrap root | `guardrails/claim-linters` / `aa1b30e509ece9d8efad3d68e949860aa79bdecf` | 538 pre-existing status entries; not modified by this implementation |
| Primary product root | `fix/dxf-truth-chain` / `3dc814f24343feee8ad131d62a43a2768fc8a0d9` | 73 pre-existing status entries; not included or modified |
| Isolated implementation worktree | `codex/project-context-identity-reconciliation` / `00a5a2015f1d579f4d779f0e8b0f38d60c27abf1` | Task 10 report files not yet committed at evidence collection; implementation commits isolated from both dirty roots |

No change from the concurrent `project-binding-v2` lane was incorporated.

## 3. Implemented contract

- `installation_projects` is the binding anchor; no `project_context_id` was added.
- The server issues and resolves the exact Work Item / installation project / design project / binding-version tuple.
- Atomic customer-job opening creates the canonical tuple with stable-principal idempotency.
- Bridge v2 locks and validates the full tuple before any package or material mutation.
- Browser route, stores, Factory packet, validation, upload, Field Bridge, and Field App consumers use the server-derived design identity.
- Scratch mode remains unbound and cross-domain actions fail closed.
- Active rows are commit-time constrained to a complete tuple; authenticated access to Bridge v1 and direct project creation is revoked.

## 4. Disposable database evidence

| Item | Verified value |
|---|---|
| Environment variable | `MONOLITH_TEST_DB_CONTAINER=monolith-project-context-db-20260808` |
| Container ID | `c1c699a3b20e9ebecb7809f47dfa7c2ed827e0de23176192bd795ac815bf7bee` |
| Image | `public.ecr.aws/supabase/postgres:17.6.1.158` |
| Image digest | `sha256:99b1729aeb0bac314445024fc149fbd39306170b61dd50800ccf180327ab3459` |
| Docker | `29.1.2` |
| psql / PostgreSQL | `17.6` |
| Network mode | `none` |
| Mount | Isolated worktree mounted read-only at `/workspace` |
| Database | `postgres`; installation-project rows `0`; unresolved active rows `0` |
| Production/staging imports | None |

Migration SHA-256 values:

- `0162_project_context_binding.sql` — `8c42c00173c11fa58a5f3216a5d58d6003707101adf206d4f0280f678a5918ee`
- `0163_project_context_reconciliation_and_open.sql` — `e5b1e06a99ce154a44c225207712bc374bf1f46b2a97aae831cae8654e905df2`
- `0164_project_context_bridge_v2.sql` — `70f709c9c0573811566d746193f28ea4b7c498603dc26ee1f1bdc6fe27ff31b6`
- `0165_project_context_enforcement.sql` — `a140be55de33295a3d7db049100a5c186abdad474a03e2ffd9197fc2a7ca0996`

Migration `0165` was re-applied successfully in the disposable database. The final trigger is deferrable and initially deferred; legacy authenticated privileges are false while approved atomic-open and Bridge v2 privileges remain true.

## 5. Verification results

| Gate | Command / evidence | Result |
|---|---|---|
| ProjectContext pgTAP | `supabase/tests/project_context_invariants.sql` | **79/79 PASS** |
| Workflow DB regression | `supabase/tests/workflow_db_invariants.sql` | **11/11 PASS** |
| Runtime legacy caller scan | Production/runtime paths, excluding tests and historical migrations | **0 callers** |
| Focused browser attack path | `npm.cmd run e2e -- e2e/project-context-cross-project-isolation.spec.ts --project=chromium` | **1/1 PASS** |
| Full Vitest | `npm.cmd run test:run -- --reporter=basic` | **290 files, 4,807/4,807 PASS** |
| TypeScript | `npm.cmd run typecheck:all` | **PASS** |
| Full Playwright | `npm.cmd run e2e` | **18 passed, 5 skipped, 0 unexpected failures** |
| Diff integrity | `git diff --check` / cached diff checks at each commit | **PASS** |

The A/B browser test delays project A, navigates to B, verifies that late A cannot replace B, sends one exact B tuple, attacks with mixed Work Item, mixed design ID, and stale binding version, receives three rejections, and proves both projects' package/material counts remain unchanged by rejected attempts.

## 6. Problems found during verification

1. The first full Vitest run could not resolve `yazl`. The dependency and lock entry were correct in `server/package.json` and `server/package-lock.json`; the isolated worktree lacked `server/node_modules`. `npm.cmd ci --prefix server --ignore-scripts` restored the locked test environment without changing tracked files. The fresh full suite then passed.
2. Full Playwright exposed a self-clearing expected-failure marker on an existing Select All / Deselect All test. The test passed, so its own comment required removal of the stale marker. No product behavior was changed.
3. The locked server dependency audit reported 14 dependency vulnerabilities (8 moderate, 5 high, 1 critical). No automated audit fix was run because dependency remediation is outside this plan and could introduce breaking changes.

## 7. Evidence limits and residual risks

- pgTAP exercised the real disposable PostgreSQL schema and functions through `psql`; it did not use a production Supabase network endpoint.
- Playwright exercised the real browser/provider/store/Bridge client path against deterministic local mock RPC responses. Server-side mutation isolation is separately proved by pgTAP, not by the mock itself.
- Five pre-existing Playwright cases remain skipped and one pre-existing checkbox case remains an expected failure; none is a ProjectContext test.
- No independent second-person review occurred inside this session. The branch is **review-ready**, not deployment-ready; PR review remains required.
- No production data, staging data, deployment credential, live migration, or cutover was used or authorized.

## 8. Verdict

**APPROVED FOR PULL-REQUEST REVIEW ONLY.** Tasks 1–10 are implemented and the controlled technical verification gates pass. This is not production-cutover authority and does not change Repair Operations G−0/G−1 status.
