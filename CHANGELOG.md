# Changelog

All notable changes to the Monolith Workspace are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v16.8.0] — 2026-08-28

### Security — Multi-Tenant RLS Hardening & Identity Reconciliation

This release closes the complete v16.8.0 security audit cycle.
Six RLS isolation findings (F1–F6), four SECURITY DEFINER privilege-escalation
findings (SD-R1–SD-R4), four medium-risk input-validation gaps (M1–M4),
and fourteen npm dependency vulnerabilities (issue #38) have all been resolved.

---

#### Migrations

| # | File | Scope | Findings Closed |
|---|------|-------|-----------------|
| 1 | `0173_rls_isolation_hardening.sql` | RLS policies + backfill on `customer`, `job`, `quotation`, `invoice` | F1, F2 |
| 2 | `0174_secdef_rpc_hardening.sql` | SECURITY INVOKER guards on `get_search_suggestions`, `rpc_approve_quotation`; org_id scoping | SD-R3, SD-R4 |
| 3 | `0175_child_table_rls.sql` | RLS policies on `job_panel`, `quotation_line` child tables | F3 (partial) |
| 4 | `0176_medium_risk_hardening.sql` | M1 auth guard on `get_org_usage`; M2 SECURITY INVOKER on `rpc_ledger_entries`; M3/M4 input-validation guards | SD-R1, SD-R2 (M1–M4) |
| 5 | `0177_audit_log_insert_hardening.sql` | `validate_audit_log_insert` trigger; spoofed actor_id / org_id rejection in `rpc_write_audit_log` | F5 |
| 6 | `0178_f3_f4_rls_hardening.sql` | Full org-scoped SELECT/INSERT/UPDATE/DELETE RLS on `job_panel`, `quotation_line` | F3, F4 |
| 7 | `0179_f1_full_fix_org_id_not_null.sql` | NOT NULL org_id constraints on singular tables (`job`, `quotation`, `invoice`, `invoice_payment`, `ledger_entry`, `job_panel`, `quotation_line`) + sentinel backfill | F1 (full close) |
| 8 | `0180_identity_reconciliation_hardening.sql` | `fn_verify_org_claim()` JWT ↔ org_id reconciliation guard; backfill sentinel where NULL | SD-R (identity) |
| 9 | `0181_revoke_execute_public_sweep.sql` | REVOKE EXECUTE FROM PUBLIC on all 14 public-schema RPCs | F6 + privilege sweep |
| 10 | `0182_audit_logs_org_id_not_null_fk_fix.sql` | NOT NULL org_id on `audit_logs`; FK corrected from broken `organizations(id)` → `organizations(org_id)` | F5 (full close) |
| 11 | `0183_baseline_tables_org_id_not_null.sql` | NOT NULL org_id on plural baseline tables (`jobs`, `quotations`, `invoices`, `ledger_entries`) + sentinel backfill | F1/F2 (baseline close) |

All migrations include a corresponding rollback file (`*_rollback.sql`) for CI forward-and-back idempotency testing.

---

#### pgTAP Test Coverage

| Suite file | Migration | Tests | What is verified |
|------------|-----------|-------|-----------------|
| `0179_f1_full_fix.sql` | 0179 | 14 | col_not_null on singular tables, zero NULL rows, sentinel FK |
| `0179_not_null_sentinel_backfill.sql` | 0179 | 35 | Sentinel backfill correctness across all 7 singular tables |
| `0180_identity_reconciliation.sql` | 0180 | 17 | `fn_verify_org_claim` caller-auth, mismatched claim rejection, NULL org_id guard |
| `0181_revoke_sweep.sql` | 0181 | 18 | No EXECUTE grant to PUBLIC on each of the 14 RPCs |
| `0182_audit_logs_org_id_hardening.sql` | 0182 | 13 | NOT NULL on `audit_logs.org_id`, FK to `organizations(org_id)`, spoofed insert rejection |
| `0183_baseline_org_id_not_null.sql` | 0183 | 13 | NOT NULL on `jobs`/`quotations`/`invoices`/`ledger_entries`, sentinel backfill, FK, zero NULL rows |
| **Total (forward migrations)** | | **110** | |

**Rollback verification suites (CI forward-and-back, not counted in production total):**

| Suite file | Migration | Tests | What is verified |
|------------|-----------|-------|-----------------|
| `0183_rollback_verification.sql` | 0183 rollback | 12 | `information_schema` nullable=YES, `pg_catalog` attnotnull=false, `lives_ok` NULL UPDATE on all 4 tables |

---

#### Dependency Vulnerabilities (issue #38)

| Package | Previous version | Patched version | CVEs resolved |
|---------|-----------------|-----------------|---------------|
| `uuid` (server) | `^8.3.2` | `^11.1.1` | 14 transitive vulnerabilities |
| `bullmq` (server) | `^4.x` | `^5.81.4` | Transitive uuid chain |

`npm audit` result as of 2026-08-28: **0 vulnerabilities** (0 high, 0 moderate, 0 low).

---

#### CI Integration

| File | Description |
|------|-------------|
| `.github/workflows/pgtap-tests.yml` | Runs `pg_prove` on all `supabase/tests/*.sql` against a fresh Supabase local stack on every push to `main` and every PR targeting `main`. Requires `SUPABASE_ACCESS_TOKEN` secret. |

---

#### Findings Resolution Matrix

| ID | Description | Migration(s) | Status |
|----|-------------|-------------|--------|
| F1 | Missing NOT NULL org_id — singular tables | 0173, 0179, 0183 | ✅ FIXED |
| F2 | RLS isolation gaps — singular tables | 0173 | ✅ FIXED |
| F3 | Missing RLS — `job_panel` child table | 0175, 0178 | ✅ FIXED |
| F4 | Missing RLS — `quotation_line` child table | 0175, 0178 | ✅ FIXED |
| F5 | `audit_logs` `WITH CHECK (true)` + broken FK | 0177, 0182 | ✅ FIXED |
| F6 | EXECUTE granted to PUBLIC on all RPCs | 0181 | ✅ FIXED |
| SD-R1 | `get_org_usage` — missing caller auth check | 0176 | ✅ FIXED |
| SD-R2 | `rpc_ledger_entries` — SECURITY DEFINER without invoker guard | 0176 | ✅ FIXED |
| SD-R3 | `rpc_approve_quotation` — missing org_id scope | 0174 | ✅ FIXED |
| SD-R4 | `get_search_suggestions` — missing org_id scope | 0174 | ✅ FIXED |
| M1 | `get_org_usage` — missing auth guard | 0176 | ✅ FIXED |
| M2 | `rpc_ledger_entries` — SECURITY DEFINER | 0176 | ✅ FIXED |
| M3 | Input validation gap — ledger RPC | 0176 | ✅ FIXED |
| M4 | Input validation gap — usage RPC | 0176 | ✅ FIXED |
| #38 | 14 npm dependency vulnerabilities | `package.json` bump | ✅ FIXED |
| Identity | JWT org_id claim not reconciled against DB | 0180 | ✅ FIXED |

---

#### GitHub Issues & PRs Closed

| Ref | Title | Resolution |
|-----|-------|------------|
| Issue #37 | Identity reconciliation hardening | Closed — migration 0180, PR #54 |
| Issue #38 | 14 dependency vulnerabilities | Closed — `uuid ^11.1.1`, `bullmq ^5.81.4`, 0 vulns confirmed |
| Issue #42 | F1+F2 RLS isolation gaps | Closed — migrations 0173+0179 |
| Issue #43 | T1/T2 test defects | Closed — test file patched |
| Issue #48 | F5 audit_logs WITH CHECK (true) | Closed — migrations 0177+0182 |
| Issue #49 | F3 job_panel RLS | Closed — migrations 0175+0178 |
| Issue #50 | F4 quotation_line RLS | Closed — migrations 0175+0178 |
| Issue #53 | Retrospective — migration 0179 | Closed — PR #55 |
| PR #45 | v16.8.0 security hardening (0173+0174+0175) | Closed — superseded by PR #55 |
| PR #47 | 0176 medium-risk hardening | Closed — superseded by PR #55 |
| PR #52 | 0178 F3+F4 RLS hardening | Closed — superseded by PR #55 |
| PR #54 | 0180+0181 identity hardening + REVOKE sweep | Closed — superseded by PR #55 |
| PR #55 | v16.8.0 Complete — migration 0183 + release summary | **Merged** 2026-08-28 |

---

#### Files Changed (v16.8.0 cycle)

```
supabase/migrations/
  0173_rls_isolation_hardening.sql
  0174_secdef_rpc_hardening.sql
  0175_child_table_rls.sql
  0176_medium_risk_hardening.sql
  0177_audit_log_insert_hardening.sql
  0178_f3_f4_rls_hardening.sql
  0179_f1_full_fix_org_id_not_null.sql
  0180_identity_reconciliation_hardening.sql
  0181_revoke_execute_public_sweep.sql
  0182_audit_logs_org_id_not_null_fk_fix.sql
  0183_baseline_tables_org_id_not_null.sql
  0173_rollback.sql  0174_rollback.sql  0175_rollback.sql
  0176_rollback.sql  0177_rollback.sql  0178_rollback.sql
  0179_rollback.sql  0180_rollback.sql  0181_rollback.sql
  0182_rollback.sql  0183_rollback.sql

supabase/tests/
  0179_f1_full_fix.sql
  0179_not_null_sentinel_backfill.sql
  0180_identity_reconciliation.sql
  0181_revoke_sweep.sql
  0182_audit_logs_org_id_hardening.sql
  0183_baseline_org_id_not_null.sql
  0183_rollback_verification.sql

.github/workflows/
  pgtap-tests.yml

server/
  package.json
  package-lock.json

docs/
  security-posture-report.md
```

---

*Release authored: 2026-08-28 | Audit cycle: v16.8.0 | Migrations: 0173–0183 (11 total) | pgTAP: 110 forward tests + 12 rollback verification tests | npm vulnerabilities: 0*
