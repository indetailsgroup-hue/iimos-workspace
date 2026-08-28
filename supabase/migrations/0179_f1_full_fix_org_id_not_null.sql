-- =============================================================================
-- Migration: 0179_f1_full_fix_org_id_not_null.sql
-- Author:    Security Audit 2026-08-28
-- Purpose:   F1 Full Fix — Phase 2 (completes 0173 Phase 1)
--
--   Phase 1 (0173): Added org_id columns, backfill, org-scoped SELECT/INSERT/
--                   UPDATE policies, dropped USING (true) SELECT policies.
--   Phase 2 (this):
--     §0.5  Recovery backfill — handles any rows where 0173 backfill was
--           incomplete (customer.created_by does not exist in legacy schema;
--           customer.org_id is resolved via job relationship instead).
--     §1    Post-backfill NULL assertion — aborts if any org_id still NULL.
--     §2    SET NOT NULL on org_id for all 7 legacy tables.
--     §3    Add FK constraints to child tables (job_panel, quotation_line,
--           invoice_payment) — deferred in 0173 pending backfill verification.
--     §4    Drop unscoped write_* FOR ALL policies from 0172.
--           These combined with 0173 PERMISSIVE policies via OR-logic, allowing
--           a role-matching user in Tenant A to INSERT/UPDATE/DELETE rows in
--           Tenant B — the remaining cross-tenant write vector after 0173.
--     §5    Add org-scoped UPDATE policies for child tables missed by 0173.
--     §6    Add org-scoped DELETE policies for all 7 tables.
--     §7    Assertion block.
--
--   F2: org_invitations RLS already applied in 0173. No further action needed.
--   F6: supabase_realtime DROP TABLE already applied in 0173. No further
--       action needed. Re-add to realtime ONLY after Supabase Realtime channel
--       policies (row-level filters) are configured for org-scoped channels.
--
-- PR Gate:  Must pass CI (pg_prove + supabase db lint) before merge.
--           Repair Operations G-0 = DISABLED. Do NOT apply directly to prod.
-- Rollback: 0179_rollback.sql
-- Tests:    supabase/tests/0179_f1_full_fix.sql (10 tests: T-F1-01→T-F1-10)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 0 — Safety pre-checks
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    RAISE EXCEPTION 'ABORT: public.organizations does not exist — run 20260828_multi_tenant_schema.sql first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer'
      AND column_name = 'org_id'
  ) THEN
    RAISE EXCEPTION 'ABORT: customer.org_id column not found — run 0173_rls_isolation_hardening.sql first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_panel'
      AND column_name = 'org_id'
  ) THEN
    RAISE EXCEPTION 'ABORT: job_panel.org_id column not found — run 0173_rls_isolation_hardening.sql first';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 0.5 — Recovery backfill
-- Handles rows where 0173's backfill was incomplete.
-- 0173 used customer.created_by which does not exist in the 0172 schema;
-- customer.org_id rows are resolved here via the job relationship instead.
-- All UPDATE statements are idempotent (WHERE org_id IS NULL guard).
-- ---------------------------------------------------------------------------

-- customer → resolve via first job belonging to this customer that already has org_id
UPDATE customer c
   SET org_id = (
         SELECT j.org_id
           FROM job j
          WHERE j.customer_id = c.customer_id
            AND j.org_id IS NOT NULL
          ORDER BY j.created_at
          LIMIT 1
       )
 WHERE c.org_id IS NULL;

-- job_panel → inherit from parent job (re-run in case parent was backfilled after child)
UPDATE job_panel jp
   SET org_id = (
         SELECT j.org_id
           FROM job j
          WHERE j.job_id = jp.job_id
            AND j.org_id IS NOT NULL
       )
 WHERE jp.org_id IS NULL;

-- quotation_line → inherit from parent quotation
UPDATE quotation_line ql
   SET org_id = (
         SELECT q.org_id
           FROM quotation q
          WHERE q.quotation_id = ql.quotation_id
            AND q.org_id IS NOT NULL
       )
 WHERE ql.org_id IS NULL;

-- invoice_payment → inherit from parent invoice
UPDATE invoice_payment ip
   SET org_id = (
         SELECT i.org_id
           FROM invoice i
          WHERE i.invoice_id = ip.invoice_id
            AND i.org_id IS NOT NULL
       )
 WHERE ip.org_id IS NULL;

DO $$ BEGIN
  RAISE NOTICE 'Recovery backfill complete. Running NULL assertion...';
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 1 — Post-backfill NULL assertion
-- Aborts the migration if any legacy table row still has org_id IS NULL.
-- Resolve remaining orphan rows manually before re-running this migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_null_count   INT;
  v_detail       TEXT := '';
  v_tbl_count    INT;
BEGIN
  SELECT COUNT(*) INTO v_tbl_count FROM customer WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('customer: %s null rows  ', v_tbl_count);
  END IF;

  SELECT COUNT(*) INTO v_tbl_count FROM job WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('job: %s null rows  ', v_tbl_count);
  END IF;

  SELECT COUNT(*) INTO v_tbl_count FROM job_panel WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('job_panel: %s null rows  ', v_tbl_count);
  END IF;

  SELECT COUNT(*) INTO v_tbl_count FROM quotation WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('quotation: %s null rows  ', v_tbl_count);
  END IF;

  SELECT COUNT(*) INTO v_tbl_count FROM quotation_line WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('quotation_line: %s null rows  ', v_tbl_count);
  END IF;

  SELECT COUNT(*) INTO v_tbl_count FROM invoice WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('invoice: %s null rows  ', v_tbl_count);
  END IF;

  SELECT COUNT(*) INTO v_tbl_count FROM invoice_payment WHERE org_id IS NULL;
  IF v_tbl_count > 0 THEN
    v_detail := v_detail || format('invoice_payment: %s null rows  ', v_tbl_count);
  END IF;

  v_null_count :=
    (SELECT COUNT(*) FROM customer         WHERE org_id IS NULL) +
    (SELECT COUNT(*) FROM job              WHERE org_id IS NULL) +
    (SELECT COUNT(*) FROM job_panel        WHERE org_id IS NULL) +
    (SELECT COUNT(*) FROM quotation        WHERE org_id IS NULL) +
    (SELECT COUNT(*) FROM quotation_line   WHERE org_id IS NULL) +
    (SELECT COUNT(*) FROM invoice          WHERE org_id IS NULL) +
    (SELECT COUNT(*) FROM invoice_payment  WHERE org_id IS NULL);

  IF v_null_count > 0 THEN
    RAISE EXCEPTION
      'ABORT: % row(s) across legacy tables still have org_id IS NULL after recovery backfill. '
      'Detail: % '
      'Resolve orphan rows manually (e.g. assign to correct org_id or DELETE orphans) before re-running.',
      v_null_count, v_detail;
  END IF;

  RAISE NOTICE 'NULL assertion passed — all % legacy table rows have org_id populated.', v_null_count;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — SET NOT NULL on org_id (Phase 2 of F1 fix)
-- Enforces at the DB constraint level; RLS alone is not sufficient since
-- SECURITY DEFINER RPCs bypass RLS and could insert NULL org_id rows.
-- ---------------------------------------------------------------------------
ALTER TABLE customer         ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE job              ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE job_panel        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE quotation        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE quotation_line   ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE invoice          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE invoice_payment  ALTER COLUMN org_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- SECTION 3 — Add FK constraints to child tables
-- 0173 deferred FKs on job_panel, quotation_line, invoice_payment to avoid
-- referential integrity failures during backfill. Backfill is now verified.
-- ON DELETE CASCADE ensures child rows are removed when the org is deleted.
-- ---------------------------------------------------------------------------
ALTER TABLE job_panel
  ADD CONSTRAINT fk_job_panel_org
  FOREIGN KEY (org_id)
  REFERENCES public.organizations(org_id)
  ON DELETE CASCADE;

ALTER TABLE quotation_line
  ADD CONSTRAINT fk_quotation_line_org
  FOREIGN KEY (org_id)
  REFERENCES public.organizations(org_id)
  ON DELETE CASCADE;

ALTER TABLE invoice_payment
  ADD CONSTRAINT fk_invoice_payment_org
  FOREIGN KEY (org_id)
  REFERENCES public.organizations(org_id)
  ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- SECTION 4 — Drop unscoped FOR ALL write_* policies from 0172
--
-- PostgreSQL PERMISSIVE policies on the same command are OR-combined.
-- The 0172 write_* policies use only USING (has_app_role(...)) without any
-- org_id scope. Combined with the 0173 org-scoped policies via OR logic, a
-- user from Tenant A with the correct role could INSERT/UPDATE/DELETE rows
-- in Tenant B:
--
--   write_customer: USING (has_app_role('finance') OR ...)   → allows cross-tenant
--   customer_tenant_insert: WITH CHECK (org_id = get_user_org_id())
--   Result for INSERT: allowed if EITHER policy passes → cross-tenant leak!
--
-- Dropping the 0172 policies leaves only the 0173 org-scoped policies active,
-- which enforce tenant isolation for INSERT/UPDATE. DELETE policies are added
-- in §6 below.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "write_customer"  ON customer;
DROP POLICY IF EXISTS "write_job"       ON job;
DROP POLICY IF EXISTS "write_panel"     ON job_panel;
DROP POLICY IF EXISTS "write_quotation" ON quotation;
DROP POLICY IF EXISTS "write_qt_line"   ON quotation_line;
DROP POLICY IF EXISTS "write_invoice"   ON invoice;
DROP POLICY IF EXISTS "write_payment"   ON invoice_payment;

-- ---------------------------------------------------------------------------
-- SECTION 5 — Add org-scoped UPDATE policies for child tables
-- 0173 added UPDATE for customer, job, quotation, invoice.
-- job_panel, quotation_line, invoice_payment were not covered.
-- ---------------------------------------------------------------------------
CREATE POLICY "job_panel_tenant_update" ON job_panel
  FOR UPDATE
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "quotation_line_tenant_update" ON quotation_line
  FOR UPDATE
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "invoice_payment_tenant_update" ON invoice_payment
  FOR UPDATE
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---------------------------------------------------------------------------
-- SECTION 6 — Add org-scoped DELETE policies for all 7 tables
-- No DELETE policy existed before (only via SECURITY DEFINER RPCs that bypass
-- RLS). Without explicit DELETE policies, authenticated direct DELETEs would
-- be DENIED after §4 drops the write_* FOR ALL policies.
-- These policies allow direct authenticated DELETEs scoped to the caller's org
-- with appropriate role restrictions.
-- Note: ON DELETE CASCADE FKs (e.g. job_panel → job) handle cascading deletes;
--       these policies cover the case of direct DELETE on the parent table.
-- ---------------------------------------------------------------------------

-- customer: ADMIN or governance role only
CREATE POLICY "customer_tenant_delete" ON customer
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('admin') OR is_governance_role())
  );

-- job: ADMIN, FACTORY, DESIGNER can remove draft/cancelled jobs
CREATE POLICY "job_tenant_delete" ON job
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('admin') OR has_app_role('factory') OR has_app_role('designer') OR is_governance_role())
  );

-- job_panel: ADMIN, FACTORY, DESIGNER (panel-level edits during production)
CREATE POLICY "job_panel_tenant_delete" ON job_panel
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('admin') OR has_app_role('factory') OR has_app_role('designer') OR is_governance_role())
  );

-- quotation: FINANCE or ADMIN (draft cleanup / expired quotation removal)
CREATE POLICY "quotation_tenant_delete" ON quotation
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('finance') OR has_app_role('admin') OR is_governance_role())
  );

-- quotation_line: cascades from quotation; FINANCE or ADMIN
CREATE POLICY "quotation_line_tenant_delete" ON quotation_line
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('finance') OR has_app_role('admin') OR is_governance_role())
  );

-- invoice: FINANCE or ADMIN (cancellation / void use-case)
CREATE POLICY "invoice_tenant_delete" ON invoice
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('finance') OR has_app_role('admin') OR is_governance_role())
  );

-- invoice_payment: cascades from invoice; FINANCE or ADMIN
CREATE POLICY "invoice_payment_tenant_delete" ON invoice_payment
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (has_app_role('finance') OR has_app_role('admin') OR is_governance_role())
  );

-- ---------------------------------------------------------------------------
-- SECTION 7 — Assertion block
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_issues TEXT := '';
  v_count  INT;
BEGIN
  -- 7.1  Check org_id is NOT NULL on all 7 tables
  SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name IN ('customer','job','job_panel','quotation','quotation_line','invoice','invoice_payment')
     AND column_name  = 'org_id'
     AND is_nullable  = 'YES';
  IF v_count > 0 THEN
    v_issues := v_issues || format('%s org_id column(s) still nullable. ', v_count);
  END IF;

  -- 7.2  Check unscoped write_* policies are gone
  SELECT COUNT(*) INTO v_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname IN ('write_customer','write_job','write_panel',
                        'write_quotation','write_qt_line','write_invoice','write_payment');
  IF v_count > 0 THEN
    v_issues := v_issues || format('%s unscoped write_* policy(ies) still exist. ', v_count);
  END IF;

  -- 7.3  Check org-scoped SELECT policy exists on customer (canary for 0173)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'customer'
       AND policyname = 'customer_tenant_isolation'
  ) THEN
    v_issues := v_issues || 'Missing customer_tenant_isolation SELECT policy. ';
  END IF;

  -- 7.4  Check new delete policies exist (spot-check 3 tables)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'customer' AND policyname = 'customer_tenant_delete'
  ) THEN
    v_issues := v_issues || 'Missing customer_tenant_delete policy. ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'invoice' AND policyname = 'invoice_tenant_delete'
  ) THEN
    v_issues := v_issues || 'Missing invoice_tenant_delete policy. ';
  END IF;

  -- 7.5  Check child table FK constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema      = 'public'
       AND table_name        = 'job_panel'
       AND constraint_name   = 'fk_job_panel_org'
       AND constraint_type   = 'FOREIGN KEY'
  ) THEN
    v_issues := v_issues || 'Missing fk_job_panel_org FK constraint. ';
  END IF;

  IF v_issues <> '' THEN
    RAISE EXCEPTION '0179 assertion failed: %', v_issues;
  END IF;

  RAISE NOTICE '0179 assertions passed — F1 full fix complete (Phase 2 of 2).';
END $$;

COMMIT;
