-- =============================================================================
-- Rollback: 0179_rollback.sql
-- Reverts: 0179_f1_full_fix_org_id_not_null.sql
--
-- FOR CI IDEMPOTENCY TESTING ONLY — never apply to production.
-- This rollback is designed for a fresh database context where 0179 was just
-- applied and the database has no live tenant data in legacy tables.
--
-- Reverts in reverse order:
--   §6  DROP delete policies added by 0179
--   §5  DROP update policies for child tables added by 0179
--   §4  Re-create unscoped write_* FOR ALL policies from 0172
--   §3  DROP FK constraints on job_panel, quotation_line, invoice_payment
--   §2  DROP NOT NULL constraints on org_id (all 7 legacy tables)
--
-- §0.5 (recovery backfill) and §1 (assertion) are not reversible —
-- they affect row data not schema, so they are left as-is. A fresh CI
-- database has no rows and these are effectively no-ops.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- REVERT §6 — Drop org-scoped DELETE policies added by 0179
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_tenant_delete"        ON customer;
DROP POLICY IF EXISTS "job_tenant_delete"             ON job;
DROP POLICY IF EXISTS "job_panel_tenant_delete"       ON job_panel;
DROP POLICY IF EXISTS "quotation_tenant_delete"       ON quotation;
DROP POLICY IF EXISTS "quotation_line_tenant_delete"  ON quotation_line;
DROP POLICY IF EXISTS "invoice_tenant_delete"         ON invoice;
DROP POLICY IF EXISTS "invoice_payment_tenant_delete" ON invoice_payment;

-- ---------------------------------------------------------------------------
-- REVERT §5 — Drop child-table UPDATE policies added by 0179
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "job_panel_tenant_update"       ON job_panel;
DROP POLICY IF EXISTS "quotation_line_tenant_update"  ON quotation_line;
DROP POLICY IF EXISTS "invoice_payment_tenant_update" ON invoice_payment;

-- ---------------------------------------------------------------------------
-- REVERT §4 — Re-create unscoped write_* FOR ALL policies from 0172
-- (CI forward-back test only — restores the intentionally-removed policies)
-- ---------------------------------------------------------------------------

-- customer
CREATE POLICY "write_customer" ON customer
  FOR ALL USING (
    has_app_role('sales') OR has_app_role('admin') OR is_governance_role()
  );

-- job
CREATE POLICY "write_job" ON job
  FOR ALL USING (
    has_app_role('production') OR has_app_role('admin') OR is_governance_role()
  );

-- job_panel
CREATE POLICY "write_panel" ON job_panel
  FOR ALL USING (
    has_app_role('production') OR has_app_role('admin') OR is_governance_role()
  );

-- quotation
CREATE POLICY "write_quotation" ON quotation
  FOR ALL USING (
    has_app_role('sales') OR has_app_role('admin') OR is_governance_role()
  );

-- quotation_line
CREATE POLICY "write_qt_line" ON quotation_line
  FOR ALL USING (
    has_app_role('sales') OR has_app_role('admin') OR is_governance_role()
  );

-- invoice
CREATE POLICY "write_invoice" ON invoice
  FOR ALL USING (
    has_app_role('finance') OR has_app_role('admin') OR is_governance_role()
  );

-- invoice_payment
CREATE POLICY "write_payment" ON invoice_payment
  FOR ALL USING (
    has_app_role('finance') OR has_app_role('admin') OR is_governance_role()
  );

-- ---------------------------------------------------------------------------
-- REVERT §3 — Drop FK constraints on child tables
-- ---------------------------------------------------------------------------
ALTER TABLE job_panel       DROP CONSTRAINT IF EXISTS fk_job_panel_org;
ALTER TABLE quotation_line  DROP CONSTRAINT IF EXISTS fk_quotation_line_org;
ALTER TABLE invoice_payment DROP CONSTRAINT IF EXISTS fk_invoice_payment_org;

-- ---------------------------------------------------------------------------
-- REVERT §2 — Drop NOT NULL constraints on org_id (all 7 legacy tables)
-- ---------------------------------------------------------------------------
ALTER TABLE customer        ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE job             ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE job_panel       ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE quotation       ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE quotation_line  ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE invoice         ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE invoice_payment ALTER COLUMN org_id DROP NOT NULL;

RAISE NOTICE '0179 rollback complete — NOT NULL + FK constraints removed, write_* policies restored.';

COMMIT;
