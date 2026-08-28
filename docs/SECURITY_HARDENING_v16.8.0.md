# Security Hardening Changeset — v16.8.0

> Release branch: `release/v16.8.0-security-hardening`
> Linked issues: #42 (RLS isolation gaps), #43 (test integrity defects)

## Migrations Included

| File | Scope |
|------|-------|
| `0173_rls_isolation_hardening.sql` | F1–F6 RLS fixes, SD-R1/R2 patches, REVOKE FROM PUBLIC, backfill |
| `0174_secdef_rpc_hardening.sql` | SD-R3 (rpc_approve_quotation), SD-R4 (get_search_suggestions), org_id columns + backfill |
| `0175_child_table_rls.sql` | RLS on job_panel, quotation_line, invoice_payment child tables |

## Source Files Changed

| File | Change |
|------|--------|
| `src/admin/withSuperAdminGuard.tsx` | New HOC — isSuperAdmin gate with loading/denied fallbacks |
| `src/admin/PlatformSearchPanel.tsx` | Added `GuardedPlatformSearchPanel` export |
| `src/admin/SearchAnalyticsDashboard.tsx` | Added `GuardedSearchAnalyticsDashboard` export |
| `src/admin/index.ts` | Re-exports all guarded components |
| `src/__tests__/withSuperAdminGuard.test.tsx` | 9 unit test cases (T-SG-01 through T-SG-07) |
| `src/__tests__/v16-8-search-integration.test.tsx` | T1 key fix + T2 mock shape fix |

## Linked Issues

- Closes #42 — F1+F2 multi-tenant RLS isolation gaps
- Closes #43 — T1 localStorage key mismatch, T2 mock shape mismatch
