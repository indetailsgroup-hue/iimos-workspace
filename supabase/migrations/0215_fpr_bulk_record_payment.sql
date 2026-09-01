-- =============================================================================
-- Migration 0215 — rpc_bulk_record_fpr_payment
--
-- Adds a batch payment-recording RPC that processes an array of fpr_payment
-- records in a single call.  Each row is handled atomically inside a sub-block:
--   • idempotency_key dedup → SKIP (no error)
--   • business-rule validation → per-row error object (no transaction abort)
--   • successful insert      → audit entry + ok=true result
--
-- Depends on: 0176_field_purchase_core, 0212_fpr_vendor_payment_flow
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — RPC rpc_bulk_record_fpr_payment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_bulk_record_fpr_payment(
  p_payments JSONB           -- JSON array of payment objects (see below)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
/*
  Input shape (one element of p_payments):
  {
    "request_id"        : "<uuid>",           -- required
    "payment_method"    : "cash|transfer|cheque|card|other",  -- required
    "amount"            : 1500.00,            -- required, > 0
    "vendor_id"         : "<uuid>",           -- optional
    "payment_reference" : "REF-001",          -- optional
    "currency"          : "THB",              -- optional, default THB
    "paid_at"           : "2026-09-01T09:00:00Z",  -- optional, default now()
    "paid_by"           : "actor-id",         -- optional, default resolve_actor()
    "idempotency_key"   : "unique-client-key" -- optional; skip if already exists
  }

  Return shape:
  {
    "total"    : 3,
    "recorded" : 2,
    "skipped"  : 1,
    "errors"   : 0,
    "results"  : [
      { "index": 0, "ok": true,  "skipped": false, "payment_id": "<uuid>" },
      { "index": 1, "ok": true,  "skipped": true,  "payment_id": "<uuid>", "reason": "idempotency_key already recorded" },
      { "index": 2, "ok": false, "skipped": false, "error": "..." }
    ]
  }
*/
DECLARE
  v_actor            text;
  v_idx              int;
  v_row              JSONB;
  v_result           JSONB;
  v_results          JSONB  := '[]'::jsonb;

  -- per-row extracted fields
  v_payment_id       uuid;
  v_request_id       uuid;
  v_vendor_id        uuid;
  v_payment_method   text;
  v_payment_ref      text;
  v_amount           numeric;
  v_currency         text;
  v_paid_at          timestamptz;
  v_paid_by          text;
  v_idem_key         text;
  v_existing_id      uuid;

  -- running counters
  v_cnt_recorded     int := 0;
  v_cnt_skipped      int := 0;
  v_cnt_errors       int := 0;
BEGIN

  -- ── Security gate ─────────────────────────────────────────────────────────
  IF NOT has_any_app_role(ARRAY['governance', 'finance', 'site_admin']) THEN
    RAISE EXCEPTION 'Access denied: finance, governance or site_admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_actor := resolve_actor();

  -- ── Input type guard ──────────────────────────────────────────────────────
  IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array' THEN
    RAISE EXCEPTION 'p_payments must be a non-null JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF jsonb_array_length(p_payments) = 0 THEN
    RETURN jsonb_build_object(
      'total', 0, 'recorded', 0, 'skipped', 0, 'errors', 0,
      'results', '[]'::jsonb
    );
  END IF;

  -- ── Process each payment row ───────────────────────────────────────────────
  FOR v_idx IN 0 .. (jsonb_array_length(p_payments) - 1) LOOP
    v_row    := p_payments -> v_idx;
    v_result := jsonb_build_object('index', v_idx, 'ok', false, 'skipped', false);

    <<row_block>>
    BEGIN

      -- Extract fields (with type coercions)
      v_request_id    := (v_row ->>'request_id')::uuid;
      v_vendor_id     := (v_row ->>'vendor_id')::uuid;
      v_payment_method := v_row ->>'payment_method';
      v_payment_ref   := v_row ->>'payment_reference';
      v_amount        := (v_row ->>'amount')::numeric;
      v_currency      := COALESCE(v_row ->>'currency', 'THB');
      v_paid_at       := COALESCE((v_row ->>'paid_at')::timestamptz, now());
      v_paid_by       := COALESCE(v_row ->>'paid_by', v_actor);
      v_idem_key      := v_row ->>'idempotency_key';

      -- Required-field validation ────────────────────────────────────────────
      IF v_request_id IS NULL THEN
        v_result := v_result
          || jsonb_build_object('error', 'request_id is required');
        v_cnt_errors := v_cnt_errors + 1;
        EXIT row_block;
      END IF;

      IF v_payment_method IS NULL
         OR v_payment_method NOT IN ('cash','transfer','cheque','card','other')
      THEN
        v_result := v_result
          || jsonb_build_object('error',
               'payment_method must be one of: cash, transfer, cheque, card, other');
        v_cnt_errors := v_cnt_errors + 1;
        EXIT row_block;
      END IF;

      IF v_amount IS NULL OR v_amount <= 0 THEN
        v_result := v_result
          || jsonb_build_object('error', 'amount must be a positive number');
        v_cnt_errors := v_cnt_errors + 1;
        EXIT row_block;
      END IF;

      -- Idempotency dedup ────────────────────────────────────────────────────
      IF v_idem_key IS NOT NULL THEN
        SELECT id INTO v_existing_id
          FROM fpr_payment
         WHERE idempotency_key = v_idem_key
         LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
          v_result := v_result || jsonb_build_object(
            'ok',         true,
            'skipped',    true,
            'payment_id', v_existing_id,
            'reason',     'idempotency_key already recorded'
          );
          v_cnt_skipped := v_cnt_skipped + 1;
          EXIT row_block;
        END IF;
      END IF;

      -- Business-rule: request must be in a payable state ───────────────────
      IF NOT EXISTS (
        SELECT 1 FROM field_purchase_request
         WHERE id = v_request_id
           AND status IN ('approved', 'purchased', 'closed')
      ) THEN
        v_result := v_result || jsonb_build_object(
          'error',
          'request not found or not in a payable state (approved / purchased / closed)'
        );
        v_cnt_errors := v_cnt_errors + 1;
        EXIT row_block;
      END IF;

      -- Insert payment record ────────────────────────────────────────────────
      v_payment_id := gen_random_uuid();

      INSERT INTO fpr_payment (
        id,
        request_id,
        vendor_id,
        payment_method,
        payment_reference,
        amount,
        currency,
        paid_at,
        paid_by,
        status,
        idempotency_key
      ) VALUES (
        v_payment_id,
        v_request_id,
        v_vendor_id,
        v_payment_method,
        v_payment_ref,
        v_amount,
        v_currency,
        v_paid_at,
        v_paid_by,
        'paid',
        v_idem_key
      );

      -- Append-only audit entry ─────────────────────────────────────────────
      INSERT INTO fpr_audit_log (
        request_id,
        action,
        actor,
        details
      ) VALUES (
        v_request_id,
        'bulk_payment_recorded',
        v_actor,
        jsonb_build_object(
          'payment_id',       v_payment_id,
          'payment_method',   v_payment_method,
          'amount',           v_amount,
          'currency',         v_currency,
          'bulk_batch_index', v_idx
        )
      );

      v_result := v_result || jsonb_build_object(
        'ok',        true,
        'payment_id', v_payment_id
      );
      v_cnt_recorded := v_cnt_recorded + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Surface per-row exceptions without aborting the outer transaction
      v_result := v_result || jsonb_build_object(
        'error',    SQLERRM,
        'sqlstate', SQLSTATE
      );
      v_cnt_errors := v_cnt_errors + 1;
    END row_block;

    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  -- ── Summary envelope ──────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'total',    jsonb_array_length(p_payments),
    'recorded', v_cnt_recorded,
    'skipped',  v_cnt_skipped,
    'errors',   v_cnt_errors,
    'results',  v_results
  );

END;
$$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — Permissions
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION rpc_bulk_record_fpr_payment(JSONB) FROM PUBLIC;

-- Authenticated users can call; row-level access enforced inside via has_any_app_role
GRANT EXECUTE ON FUNCTION rpc_bulk_record_fpr_payment(JSONB)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- SECTION 3 — Comment
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION rpc_bulk_record_fpr_payment(JSONB) IS
  'Batch-records fpr_payment rows from a JSON array.  Each element is processed '
  'independently: idempotency_key collisions are silently skipped; validation '
  'failures and unexpected errors are captured per-row without aborting the '
  'batch.  Returns a summary envelope with total/recorded/skipped/errors counts '
  'and a per-row results array.  Requires finance, governance or site_admin role.';

