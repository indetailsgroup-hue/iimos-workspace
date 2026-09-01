-- ============================================================================
-- Rollback: 0176_rollback.sql
-- Created:   2026-08-28
-- Purpose:   Reverts 0176_secdef_medium_risk_hardening.sql for CI
--            forward-and-back idempotency testing.
--
-- Reverts the following changes made by 0176:
--
--   M1  get_org_usage      — removes auth.uid() + membership guard; restores
--                            original body from 20260828_audit_log_usage_metering.sql
--   M2  rpc_ledger_entries — converts back from SECURITY INVOKER to SECURITY DEFINER
--                            (original body from 0171_rpc_ledger_entries_bankfeed_realtime.sql)
--       rpc_ledger_summary — same as above
--   S1  Re-grant EXECUTE TO PUBLIC on functions that 0176 revoked:
--       has_app_role, fn_is_service_role, check_job_limit, check_member_limit
--   S2  fn_is_service_role — reverts to SECURITY DEFINER (was converted to SECURITY INVOKER)
--
-- WARNING:  This file is ONLY for CI idempotency testing in a fresh database
--           context.  Do NOT apply to production.  Applying this rollback to
--           production would re-introduce M1 and M2 medium-risk vulnerabilities.
-- ============================================================================

BEGIN;

-- ============================================================================
-- REVERT M1 — Restore get_org_usage without auth guard
--
-- Original body from 20260828_audit_log_usage_metering.sql.
-- No auth.uid() check, no membership verification.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_org_usage(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
  v_job_count INTEGER;
  v_member_count INTEGER;
  v_storage_bytes BIGINT;
  v_period_start TIMESTAMPTZ;
BEGIN
  v_period_start := date_trunc('month', NOW());

  SELECT COUNT(*) INTO v_job_count
  FROM jobs
  WHERE org_id = p_org_id
    AND created_at >= v_period_start;

  SELECT COUNT(*) INTO v_member_count
  FROM org_members
  WHERE org_id = p_org_id
    AND status = 'active';

  SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0) INTO v_storage_bytes
  FROM storage.objects
  WHERE bucket_id = 'org-files'
    AND (storage.foldername(name))[1] = p_org_id::TEXT;

  RETURN json_build_object(
    'jobs_created', v_job_count,
    'members_count', v_member_count,
    'storage_used_mb', ROUND(v_storage_bytes / 1048576.0, 2),
    'period', to_char(v_period_start, 'YYYY-MM')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore original grant state (PUBLIC could call this before 0176)
GRANT EXECUTE ON FUNCTION public.get_org_usage(UUID) TO PUBLIC;

COMMENT ON FUNCTION public.get_org_usage(UUID) IS
  'ROLLBACK of 0176 M1: restored to pre-hardening version (no auth guard). '
  'DO NOT use in production. See 0176_secdef_medium_risk_hardening.sql for the hardened version.';

-- ============================================================================
-- REVERT M2 — Restore rpc_ledger_entries as SECURITY DEFINER
--
-- Original body from 0171_rpc_ledger_entries_bankfeed_realtime.sql lines 14–75.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_ledger_entries(
  p_book_id   TEXT    DEFAULT NULL,
  p_from_date DATE    DEFAULT NULL,
  p_to_date   DATE    DEFAULT NULL,
  p_status    TEXT    DEFAULT 'posted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER                          -- ← restored from SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor  TEXT;
  v_result JSONB;
BEGIN
  -- Auth check
  v_actor := public.resolve_actor();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'rpc_ledger_entries: unauthenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Role check: must be governance (ADMIN) or finance role
  IF NOT (public.is_governance_role() OR public.has_app_role('finance')) THEN
    RAISE EXCEPTION 'rpc_ledger_entries: requires FINANCE or ADMIN role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Build result: array of { entry_id, book_id, lines[] }
  SELECT COALESCE(jsonb_agg(entry_row ORDER BY entry_row->>'book_id', entry_row->>'entry_date'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'entry_id',    je.id::text,
      'book_id',     je.book_id,
      'entry_date',  je.entry_date::text,
      'description', je.description,
      'lines', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'account_code', jl.account_code,
            'debit',        jl.base_debit,
            'credit',       jl.base_credit
          )
        ), '[]'::jsonb)
        FROM public.journal_line jl
        WHERE jl.journal_entry_id = je.id
      )
    ) AS entry_row
    FROM public.journal_entry je
    WHERE je.status::text = COALESCE(p_status, 'posted')
      AND (p_book_id   IS NULL OR je.book_id    = p_book_id)
      AND (p_from_date IS NULL OR je.entry_date >= p_from_date)
      AND (p_to_date   IS NULL OR je.entry_date <= p_to_date)
  ) sub;

  RETURN v_result;
END;
$$;

-- Restore original grant (authenticated users; 0171 grant state)
GRANT EXECUTE ON FUNCTION public.rpc_ledger_entries(TEXT, DATE, DATE, TEXT) TO authenticated;

COMMENT ON FUNCTION public.rpc_ledger_entries(TEXT, DATE, DATE, TEXT) IS
  'ROLLBACK of 0176 M2: restored to SECURITY DEFINER (pre-hardening). '
  'DO NOT use in production. See 0176_secdef_medium_risk_hardening.sql for SECURITY INVOKER version.';

-- ============================================================================
-- REVERT M2 — Restore rpc_ledger_summary as SECURITY DEFINER
--
-- Original body from 0171_rpc_ledger_entries_bankfeed_realtime.sql lines 81–123.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_ledger_summary(
  p_book_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER                          -- ← restored from SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor  TEXT;
  v_result JSONB;
BEGIN
  v_actor := public.resolve_actor();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'rpc_ledger_summary: unauthenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT (public.is_governance_role() OR public.has_app_role('finance')) THEN
    RAISE EXCEPTION 'rpc_ledger_summary: requires FINANCE or ADMIN role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(sub)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      je.book_id,
      COUNT(DISTINCT je.id)::INT                     AS entry_count,
      COALESCE(SUM(jl.base_debit),  0)::NUMERIC(15,2) AS total_debit,
      COALESCE(SUM(jl.base_credit), 0)::NUMERIC(15,2) AS total_credit
    FROM public.journal_entry je
    JOIN public.journal_line  jl ON jl.journal_entry_id = je.id
    WHERE je.status = 'posted'
      AND (p_book_id IS NULL OR je.book_id = p_book_id)
    GROUP BY je.book_id
  ) sub;

  RETURN v_result;
END;
$$;

-- Restore original grant
GRANT EXECUTE ON FUNCTION public.rpc_ledger_summary(TEXT) TO authenticated;

COMMENT ON FUNCTION public.rpc_ledger_summary(TEXT) IS
  'ROLLBACK of 0176 M2: restored to SECURITY DEFINER (pre-hardening). '
  'DO NOT use in production. See 0176_secdef_medium_risk_hardening.sql for SECURITY INVOKER version.';

-- ============================================================================
-- REVERT S2 — Restore fn_is_service_role() as SECURITY DEFINER
--
-- 0176 Section S2 converted this to SECURITY INVOKER. Rollback restores it.
-- Original body reads JWT claim — no data access.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_is_service_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER                          -- ← restored from SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN (
    (current_setting('request.jwt.claims', TRUE)::jsonb ->> 'role') = 'service_role'
    OR current_user = 'postgres'
  );
EXCEPTION
  WHEN others THEN
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.fn_is_service_role() IS
  'ROLLBACK of 0176 S2: restored to SECURITY DEFINER. '
  'Returns TRUE when the current session is executing as the Supabase service role or postgres superuser.';

-- ============================================================================
-- REVERT S1 — Re-grant EXECUTE TO PUBLIC on functions revoked by 0176
--
-- 0176 Section S1 revoked PUBLIC execute on the following functions.
-- This rollback restores those grants to match the pre-0176 state.
-- ============================================================================

-- has_app_role (0171) — was GRANT TO authenticated in 0176; re-grant to PUBLIC
GRANT EXECUTE ON FUNCTION public.has_app_role(TEXT) TO PUBLIC;

-- fn_is_service_role (0154/0176 S1) — was restricted to authenticated only
GRANT EXECUTE ON FUNCTION public.fn_is_service_role() TO PUBLIC;

-- check_job_limit / check_member_limit (audit_log_usage_metering / 0176 S1)
-- These are trigger functions; restore PUBLIC execute grant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'check_job_limit'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_job_limit() TO PUBLIC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'check_member_limit'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_member_limit() TO PUBLIC';
  END IF;
END $$;

-- ============================================================================
-- Rollback assertion block — verify key pre-conditions are restored
-- ============================================================================

DO $$
DECLARE
  v_get_org_usage_hardened BOOLEAN;
  v_ledger_entries_invoker BOOLEAN;
  v_ledger_summary_invoker BOOLEAN;
BEGIN
  -- Confirm get_org_usage no longer has auth guard text
  SELECT pg_get_functiondef(p.oid) ILIKE '%auth.uid() IS NULL%'
    INTO v_get_org_usage_hardened
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_org_usage';

  IF v_get_org_usage_hardened THEN
    RAISE WARNING '0176_ROLLBACK ASSERTION: get_org_usage still contains auth.uid() guard — rollback may not have applied';
  ELSE
    RAISE NOTICE '0176_ROLLBACK ✅: get_org_usage restored to pre-M1 (no auth guard)';
  END IF;

  -- Confirm rpc_ledger_entries is SECURITY DEFINER
  SELECT NOT p.prosecdef
    INTO v_ledger_entries_invoker
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'rpc_ledger_entries';

  IF v_ledger_entries_invoker THEN
    RAISE WARNING '0176_ROLLBACK ASSERTION: rpc_ledger_entries is not SECURITY DEFINER — rollback may not have applied';
  ELSE
    RAISE NOTICE '0176_ROLLBACK ✅: rpc_ledger_entries restored to SECURITY DEFINER';
  END IF;

  -- Confirm rpc_ledger_summary is SECURITY DEFINER
  SELECT NOT p.prosecdef
    INTO v_ledger_summary_invoker
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'rpc_ledger_summary';

  IF v_ledger_summary_invoker THEN
    RAISE WARNING '0176_ROLLBACK ASSERTION: rpc_ledger_summary is not SECURITY DEFINER — rollback may not have applied';
  ELSE
    RAISE NOTICE '0176_ROLLBACK ✅: rpc_ledger_summary restored to SECURITY DEFINER';
  END IF;

  RAISE NOTICE '0176_ROLLBACK: complete. M1+M2+S1+S2 reverted to pre-0176 state.';
END $$;

-- ============================================================================
-- END OF 0176_rollback.sql
-- ============================================================================
-- Closure criteria for CI idempotency test:
--   [ ] Apply 0176 → verify M1 auth guard present
--   [ ] Apply 0176_rollback → verify auth guard absent
--   [ ] Re-apply 0176 → verify M1 auth guard re-applies cleanly
--   [ ] rpc_ledger_entries prosecdef = TRUE after rollback
--   [ ] rpc_ledger_entries prosecdef = FALSE after re-apply of 0176
-- ============================================================================

COMMIT;
