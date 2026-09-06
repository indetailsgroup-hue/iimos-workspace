-- =============================================================================
-- Migration: precise repairs for large legacy RPC bodies
--
-- These RPCs are hundreds of lines long. Rebuilding them by hand would create a
-- second source of truth and risk silently dropping workflow branches. Instead,
-- this migration reads PostgreSQL's canonical function definition, applies a
-- narrowly asserted token replacement, and installs the corrected definition.
-- It aborts if a target cannot be found, preventing a false-green repair.
-- =============================================================================

BEGIN;

DO $repair$
DECLARE
  r RECORD;
  v_definition TEXT;
  v_repaired TEXT;
  v_repair_count INT := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'rpc_bulk_cancel_field_purchase_request',
        'rpc_bulk_uncancel_field_purchase_request',
        'rpc_bulk_force_close_field_purchase_request',
        'rpc_confirm_fpr_receiving'
      )
      AND position(
        'ib.employee_id = v_req.requester' IN pg_get_functiondef(p.oid)
      ) > 0
  LOOP
    v_definition := pg_get_functiondef(r.oid);
    v_repaired := replace(
      v_definition,
      'ib.employee_id = v_req.requester',
      'ib.employee_id::text = v_req.requester'
    );
    EXECUTE v_repaired;
    v_repair_count := v_repair_count + 1;
  END LOOP;
  IF v_repair_count <> 4 THEN
    RAISE EXCEPTION 'expected 4 requester identity repairs, applied %', v_repair_count;
  END IF;
END;
$repair$;

DO $repair$
DECLARE
  v_oid REGPROCEDURE := 'public.rpc_force_close_field_purchase_request(uuid,text)'::regprocedure;
  v_definition TEXT;
  v_repaired TEXT;
BEGIN
  v_definition := pg_get_functiondef(v_oid);
  IF position('ib.employee_id = v_row.requester' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'force-close requester identity predicate not found in %', v_oid;
  END IF;
  v_repaired := replace(v_definition,
    'v_previous_status text;',
    'v_previous_status public.field_purchase_status;');
  v_repaired := replace(v_repaired,
    'v_previous_status := v_row.status::text;',
    'v_previous_status := v_row.status;');
  v_repaired := replace(v_repaired,
    'ib.employee_id = v_row.requester',
    'ib.employee_id::text = v_row.requester');
  IF v_repaired = v_definition THEN
    RAISE EXCEPTION 'force-close status repair did not change %', v_oid;
  END IF;
  EXECUTE v_repaired;
END;
$repair$;

-- Supabase installs pgcrypto in the extensions schema. Qualify HMAC in both
-- approval-token producers/validators without changing their control flow.
DO $repair$
DECLARE
  r RECORD;
  v_definition TEXT;
  v_repaired TEXT;
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'rpc_route_fpr_approval_notification',
        'rpc_handle_fpr_postback'
      )
  LOOP
    v_definition := pg_get_functiondef(r.oid);
    v_repaired := replace(v_definition, 'hmac(', 'extensions.hmac(');
    IF r.signature::text LIKE '%rpc_route_fpr_approval_notification(%' THEN
      v_repaired := replace(
        v_repaired,
        'ib.employee_id = v_employee_id',
        'ib.employee_id::text = v_employee_id'
      );
    END IF;
    IF v_repaired = v_definition THEN
      RAISE EXCEPTION 'expected HMAC call not found in %', r.signature;
    END IF;
    EXECUTE v_repaired;
  END LOOP;
END;
$repair$;

-- Use the shipped Culture Metrics table and timestamp names in the OHS scorer.
DO $repair$
DECLARE
  v_oid REGPROCEDURE :=
    'public.ohs_compute_health_score(uuid,date,uuid)'::regprocedure;
  v_definition TEXT;
  v_repaired TEXT;
BEGIN
  v_definition := pg_get_functiondef(v_oid);
  v_repaired := replace(v_definition,
    'FROM   enps_responses',
    'FROM   public.cmd_enps_responses');
  v_repaired := replace(v_repaired,
    'responded_at::date',
    'submitted_at::date');
  v_repaired := replace(v_repaired,
    'FROM   culture_metrics',
    'FROM   public.cmd_metric_snapshots');
  v_repaired := replace(v_repaired,
    'metric_date = p_snapshot_date',
    'snapshot_date = p_snapshot_date');
  IF v_repaired = v_definition THEN
    RAISE EXCEPTION 'OHS eNPS source repair did not change %', v_oid;
  END IF;
  EXECUTE v_repaired;
END;
$repair$;

-- Keep the optional forecasting dependency truly late-bound. Deriving the
-- cast names from to_regtype prevents the linter from trying to resolve absent
-- optional enums while retaining the same runtime contract once installed.
DO $repair$
DECLARE
  v_oid REGPROCEDURE :=
    'public.rpc_sync_line_forecast(text,text,text)'::regprocedure;
  v_definition TEXT;
  v_repaired TEXT;
BEGIN
  -- Older hosted copies of this function retain CRLF in prosrc. Normalize the
  -- definition before applying the narrowly-scoped repairs so the exact same
  -- migration covers both historical CRLF and clean-bootstrap LF definitions.
  v_definition := replace(pg_get_functiondef(v_oid), E'\r\n', E'\n');
  v_repaired := replace(v_definition,
    $old$'sync_source'$old$,
    $new$regexp_replace(
      to_regtype('public.sync_source')::text,
      '^.*\\.',
      ''
    )$new$);
  IF v_repaired = v_definition THEN
    RAISE EXCEPTION 'forecasting source-type repair did not change %', v_oid;
  END IF;
  v_definition := v_repaired;
  v_repaired := replace(v_definition,
    $old$'sync_status'$old$,
    $new$regexp_replace(
      to_regtype('public.sync_status')::text,
      '^.*\\.',
      ''
    )$new$);
  IF v_repaired = v_definition THEN
    RAISE EXCEPTION 'forecasting status-type repair did not change %', v_oid;
  END IF;
  EXECUTE v_repaired;
END;
$repair$;

COMMIT;
