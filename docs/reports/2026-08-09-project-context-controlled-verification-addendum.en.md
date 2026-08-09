# ProjectContext Controlled Verification Addendum

**Evidence run:** 9 August 2026, 09:37 ICT<br>
**PR:** [#37](https://github.com/indetailsgroup-hue/monolith-workspace/pull/37)<br>
**Verified functional SHA:** `4d4fa01de4c24815f5fcf47141243f98cc63b1bd`<br>
**Historical report SHA:** `00a5a2015f1d579f4d779f0e8b0f38d60c27abf1` — retained as historical evidence only; it is not evidence for the final merge candidate.<br>
**Verdict:** `TECHNICAL CLOSURE RECORDED — MERGE NOT AUTHORIZED`

## 1. Why this addendum exists

The prior Owner decision was withdrawn because acceptance of required closure could not turn uncommitted code into a verified fact. This addendum records a new evidence run after the fixes appeared in PR #37. It does not overwrite the earlier report.

## 2. Fix commits now present in the PR

- `7f8a8c48` — clears `useDrillMapStore` and `useGateStore` during runtime project clearing; adds an A→B regression proving project B receives neither project A drill-map nor gate-result evidence.
- `7f8a8c48` — makes `active` the only accepted ProjectContext installation lifecycle in the parser, Factory guard, and SQL resolver; adds `completed` and `customer_review` rejection/no-mutation tests.
- `4d4fa01d` — adds the required CI job named **ProjectContext PR Gate**.

## 3. Controlled verification results

| Gate | Command/scope | Result |
|---|---|---|
| Workflow DB regression | `supabase/tests/workflow_db_invariants.sql` | **PASS — 11/11** |
| ProjectContext pgTAP | `supabase/tests/project_context_invariants.sql` | **PASS — 83/83** |
| Focused Vitest | ProjectContext Gate/State/identifiers, Bridge, Factory/Field App | **PASS — 27/27** |
| State contamination | A→B drill-map and gate-result regression | **PASS** |
| Active-only lifecycle | parser, Factory guard, SQL resolver; `completed` and `customer_review` | **PASS** |
| Browser simulation | `e2e/project-context-cross-project-isolation.spec.ts` | **PASS — 1/1** |
| Full Vitest | entire root test suite | **PASS — 4,812/4,812; 0 failed; 0 pending** |
| Typecheck | `npm run typecheck:all` | **PASS** |
| Git hygiene | `git diff --check`, `git diff --exit-code` after restoring test-touched metadata | **PASS — clean** |

The browser result is a client simulation plus separate database verification. It is not represented as a full browser-to-database end-to-end test.

## 4. Test environment

- Node `v22.21.1`; npm `11.6.2`
- Docker client/server `29.1.2`
- psql `18.1`
- Disposable database container: `supabase_db_determined-williams` (`2e94240cb7c4`), image `public.ecr.aws/supabase/postgres:17.6.1.158`
- Database was reset from the current migration chain. No production or staging data was imported or accessed.

## 5. GitHub enforcement evidence

All checks on verified SHA `4d4fa01d` passed:

- [ProjectContext PR Gate](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/31290541465/job/93186789878) — PASS
- [apply migrations + pgTAP invariants](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/31290541417/job/93186789710) — PASS
- [playwright @smoke](https://github.com/indetailsgroup-hue/monolith-workspace/actions/runs/31290541413/job/93186789817) — PASS

Protection on `codex/repair-operations-phase-a-adr` now requires:

- status check `ProjectContext PR Gate`;
- one approving review;
- dismissal of stale approvals after a new commit;
- approval after the last push; and
- enforcement for administrators.

## 6. Vulnerability follow-up

[Issue #38](https://github.com/indetailsgroup-hue/monolith-workspace/issues/38) records all 14 vulnerable server packages, 18 unique advisories/CVEs, dependency paths, production/development classification, runtime reachability, temporary mitigations, owner, due dates, and closure evidence. The critical Vitest advisory is not reachable from the current API/worker production entrypoints, but remains scheduled for upgrade and validation.

## 7. Remaining merge gate

The addendum publication commit is a documentation-only descendant of the verified functional SHA. Because it is a later PR commit, required CI must pass again on that published HEAD. Only then may the PR be marked Ready and an independent human review requested. Approval must be made by a person other than the implementation session, after the final push and passing CI.

Until that approval is recorded, the correct status is:

`OWNER ACCEPTED THE REQUIRED CLOSURE — TECHNICAL CLOSURE RECORDED — INDEPENDENT HUMAN APPROVAL PENDING — MERGE NOT AUTHORIZED`

## 8. Authority boundary

- PR target remains `codex/repair-operations-phase-a-adr` only.
- Repair Operations remains **G−0 = DISABLED** and **G−1 = BLOCKED**.
- No merge, deployment, production/staging access, or live migration is authorized by this addendum.
