-- Migration 0219: Debug version of rpc_bulk_record_fpr_payment
-- Purpose: Raise an exception showing the actual column list of fpr_payment
--          and field_purchase_request at runtime, to identify which table
--          is missing "status" at CI run time.
-- This migration replaces the function created in 0215.
-- TO BE REVERTED once root cause is identified.

CREATE OR REPLACE FUNCTION public.rpc_bulk_record_fpr_payment(p_args jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fpr_cols  text;
  v_pay_cols  text;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO v_fpr_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'field_purchase_request';

  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO v_pay_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'fpr_payment';

  RAISE EXCEPTION 'DEBUG field_purchase_request=[%] fpr_payment=[%]',
    COALESCE(v_fpr_cols, 'TABLE_NOT_FOUND'),
    COALESCE(v_pay_cols, 'TABLE_NOT_FOUND');
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_bulk_record_fpr_payment(jsonb) TO authenticated, service_role;
