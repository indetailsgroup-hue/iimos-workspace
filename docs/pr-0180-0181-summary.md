# PR Summary: Migration 0180 + 0181 — Identity Reconciliation + REVOKE Sweep

**Branch:** security/0180-0181-identity-hardening  
**Date:** 2026-08-28  
**Closes:** #37  
**References:** #53  

## Migrations

### 0180 — Identity Reconciliation Hardening
- `fn_verify_org_claim()` — SECURITY INVOKER guard
- `fn_get_verified_org_id()` — convenience wrapper
- 6 patched RPCs: rpc_record_payment, rpc_job_board, rpc_approve_quotation,
  rpc_ledger_entries, rpc_ledger_summary, get_org_usage

### 0181 — REVOKE EXECUTE FROM PUBLIC Sweep
- 14 functions covered (0173–0180)
- validate_audit_log_insert: REVOKE only, no user GRANT (trigger-only)

## Test Coverage
- supabase/tests/0180_identity_reconciliation.sql — 17 pgTAP tests
- Rollback files: 0180_rollback.sql, 0181_rollback.sql

## Status
All 5 files pushed to main. This PR documents the changeset for review and CI gate tracking.
