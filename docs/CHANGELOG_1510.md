# CHANGELOG [15.1.0] — pg_notify Consumer, Partition Architecture & OpenAPI

**Release Date:** 2026-09-01
**Branch:** release/15.0.0
**Commits:** 3a72756f · e597e63b · 2cac7524 · a5d0505f

---

## What's New

### Edge Function: `etax-risk-notify` (pg_notify Consumer)
- New Edge Function `supabase/functions/etax-risk-notify/index.ts` (357 lines)
- **Trigger mode**: accepts HTTP POST with `RiskTierPayload` (9 fields) from `pg_net`
  invocation in `trg_etax_risk_tier_notify` (Migration 0195)
- **Poll mode**: fallback GET endpoint queries `etax_risk_tier_state` for orgs that
  transitioned in the last 10 minutes — for resilience if pg_net delivery fails
- **LINE Notify**: sends tier-specific sticker + message via `notify-api.line.me/api/notify`
  using per-org `line_notify_token` from `notification_settings` JSONB (or global `LINE_NOTIFY_TOKEN` env)
- **Webhook**: POST to per-org `webhook_url` with `X-Monolith-Event` and `X-Monolith-Org` headers
- **Alert gating**: honours `alert_on_critical`, `alert_on_warning`, `alert_channels` from `notification_settings`
- **Recovery notices**: HEALTHY transitions alert only when previous tier was CRITICAL or WARNING
- **FUNCTION_SECRET** shared-secret auth header guard
- **Audit**: every dispatch attempt written to `etax_submissions_audit_log` (non-fatal)

### Migration 0196 — Monthly Partitioning of `etax_submissions`
- Renames existing `etax_submissions` → `etax_submissions_pre_partition` (data preserved)
- Creates partitioned parent table `PARTITION BY RANGE (created_at)` with identical schema
- Provisions **39 explicit monthly partitions** (2024-01 → 2027-03) + `etax_submissions_default`
- Cross-partition uniqueness enforced via `trg_etax_submissions_cross_partition_unique` trigger
  (PostgreSQL partitioned tables cannot express `UNIQUE (invoice_id, document_type)` globally)
- Per-partition `UNIQUE (invoice_id, document_type)` constraint on each monthly shard
- Migrates all rows from backup table into correct partitions via INSERT … SELECT
- **6 performance indexes** recreated on partitioned table:
  `idx_etax_submissions_org_status`, `idx_etax_submissions_invoice_id`,
  `idx_etax_submissions_retry_queue`, `idx_etax_submissions_pdf_status`,
  `idx_etax_submissions_org_created`, `idx_etax_submissions_metadata` (GIN)
- `fn_create_etax_partition(year, month)` helper for on-demand partition creation
- `fn_auto_create_next_etax_partition()` creates next 2 months — registered as pg_cron
  `auto-create-etax-partition` running at 00:00 on the 20th of each month
- `rpc_etax_partition_health()` — returns partition name, date range, row count, size, is_default
- `v_etax_partition_retention` — flags partitions older than 24 months as `ARCHIVE_CANDIDATE`
- RLS re-applied: org isolation + service_role bypass
- **Guard**: idempotent `DO $$` block skips migration if table is already partitioned

### OpenAPI 3.0 Specification — `docs/openapi_monolith_rpcs.yaml`
- Comprehensive spec (795 lines) covering all RPCs from migrations 0176–0195 + 0196
- **10 paths** documented with full request/response schemas:
  - `POST /rpc_approve_invoice` — approve invoice + auto-journal (0176)
  - `POST /rpc_void_invoice` — void approved invoice + reversal entry (0176)
  - `POST /rpc_post_payment_receipt` — post payment receipt journal (0177)
  - `POST /rpc_check_overdue_invoices` — scan overdue + queue notifications (0180)
  - `POST /rpc_trigger_etax_submit` — queue eTax submission (0181)
  - `POST /rpc_etax_mark_submitted` — mark submission as submitted (0183)
  - `POST /rpc_etax_claim_pdf_batch` — claim PDF download batch, FOR UPDATE SKIP LOCKED (0183)
  - `POST /rpc_etax_mark_pdf_downloaded` — record PDF path in storage (0183)
  - `POST /rpc_etax_health_trend_cached` — 30-day trend from MV or live fallback (0192)
  - `POST /rpc_etax_risk_tier_state` — cross-org risk tier state, service_role only (0195)
  - `POST /rpc_etax_partition_health` — partition size + row count admin view (0196)
- **Webhooks** section documents `etax_risk_rank_changed` pg_notify payload schema
- Reusable `components/schemas` for all request/response types
- Security schemes: `BearerAuth` (JWT) + `ServiceRoleKey` (apikey header)
- Error code table: 400/403/404/409/422/500

### Test Suite — Migration 0196 (`0196_etax_partitioning.test.ts`)
- Groups A–G, **35 test cases** covering:
  - **A**: Partition table structure (relkind=p, monthly partitions, default partition, backup table)
  - **B**: Row routing — rows land in correct monthly shard; future rows go to default
  - **C**: Cross-partition unique enforcement — same-partition rejects, cross-partition trigger rejects, different document_type allowed
  - **D**: All 6 performance indexes present
  - **E**: RLS isolation — user sees only own org, service_role sees all, cross-org INSERT rejected
  - **F**: `fn_create_etax_partition` idempotency + `fn_auto_create_next_etax_partition`
  - **G**: `rpc_etax_partition_health` returns all partitions; non-service-role access denied; `v_etax_partition_retention` archive detection

---

## pg_cron Job Added

| Job Name | Schedule | Function |
|----------|----------|----------|
| `auto-create-etax-partition` | `0 0 20 * *` | `fn_auto_create_next_etax_partition()` |

Total pg_cron jobs: **6** (previously 5)

---

## Environment Variables (new)

| Variable | Required | Description |
|----------|----------|-------------|
| `LINE_NOTIFY_TOKEN` | Optional | Global fallback LINE Notify token |
| `ALERT_WEBHOOK_URL` | Optional | Global fallback webhook URL |
| `FUNCTION_SECRET` | Recommended | Shared secret for `etax-risk-notify` auth guard |

Per-org overrides via `organizations.notification_settings` JSONB take precedence.

---

## Migration Sequence (complete)

```
0000_multi_tenant_schema.sql
0176_auto_journal_on_invoice_approval.sql
0177_payment_receipt_posting.sql
0178_rls_multitenancy.sql
0179_multi_book_ledger.sql
0180_overdue_invoice_detection.sql
0181_etax_auto_submit.sql
0182_notification_settings.sql
0183_etax_pdf_download.sql
0184_etax_cron_jobs.sql
0185_etax_audit_log.sql
0186_etax_compliance_dashboard_view.sql
0187_etax_compliance_dashboard_mv.sql
0188_mv_refresh_lag_alert.sql
0189_mv_alert_history_view.sql
0190_etax_submission_health.sql
0191_etax_health_trend.sql
0192_mv_etax_health_trend.sql
0193_etax_full_health_summary.sql
0194_etax_org_risk_ranking.sql
0195_etax_risk_tier_notify.sql
0196_etax_submissions_partitioning.sql  ← NEW
```
