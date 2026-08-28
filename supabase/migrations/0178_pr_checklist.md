# PR Checklist — 0178 F3/F4 RLS Hardening

## Migration Forward
- [x] `supabase/migrations/0178_notification_platform_metrics_rls.sql`

## Migration Rollback (CI only)
- [x] `supabase/migrations/0178_rollback.sql`

## pgTAP Tests
- [x] `supabase/tests/0178_notification_platform_metrics_rls.sql` (10 tests: T-F3-01→T-F3-05, T-F4-01→T-F4-05)

## Documentation
- [x] `docs/rls-audit-report.md` updated — F3 and F4 marked FIXED

## Issues
- Closes #49 (F3 — notification_digest_queue no RLS)
- Closes #50 (F4 — platform_metrics_snapshots no RLS)

## CI Gate
- [ ] `pg_prove` passes
- [ ] `supabase db lint` passes
- [ ] Security team review
