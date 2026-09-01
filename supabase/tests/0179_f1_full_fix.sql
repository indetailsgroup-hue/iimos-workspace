-- =============================================================================
-- pgTAP Test Suite: 0179_f1_full_fix.sql
-- Tests: T-F1-01 → T-F1-10 (10 tests)
-- Covers:
--   T-F1-01..07  col_not_null — org_id is NOT NULL on all 7 legacy tables
--   T-F1-08      hasnt_policy — write_customer (unscoped) is gone
--   T-F1-09      hasnt_policy — write_job (unscoped) is gone
--   T-F1-10      has_policy   — customer_tenant_delete exists
--   T-F1-11      has_policy   — job_panel_tenant_update exists
--   T-F1-12      fk_ok        — fk_job_panel_org FK constraint exists
--   T-F1-13      fk_ok        — fk_quotation_line_org FK constraint exists
--   T-F1-14      fk_ok        — fk_invoice_payment_org FK constraint exists
--
-- Run: pg_prove -U postgres supabase/tests/0179_f1_full_fix.sql
-- =============================================================================

BEGIN;

SELECT plan(14);

-- ---------------------------------------------------------------------------
-- T-F1-01..07: org_id NOT NULL on all 7 legacy tables
-- col_not_null(schema, table, column, description)
-- ---------------------------------------------------------------------------

SELECT col_not_null(
  'public', 'customer', 'org_id',
  'T-F1-01: customer.org_id must be NOT NULL after 0179'
);

SELECT col_not_null(
  'public', 'job', 'org_id',
  'T-F1-02: job.org_id must be NOT NULL after 0179'
);

SELECT col_not_null(
  'public', 'job_panel', 'org_id',
  'T-F1-03: job_panel.org_id must be NOT NULL after 0179'
);

SELECT col_not_null(
  'public', 'quotation', 'org_id',
  'T-F1-04: quotation.org_id must be NOT NULL after 0179'
);

SELECT col_not_null(
  'public', 'quotation_line', 'org_id',
  'T-F1-05: quotation_line.org_id must be NOT NULL after 0179'
);

SELECT col_not_null(
  'public', 'invoice', 'org_id',
  'T-F1-06: invoice.org_id must be NOT NULL after 0179'
);

SELECT col_not_null(
  'public', 'invoice_payment', 'org_id',
  'T-F1-07: invoice_payment.org_id must be NOT NULL after 0179'
);

-- ---------------------------------------------------------------------------
-- T-F1-08..09: Unscoped write_* policies from 0172 must be gone
-- hasnt_policy(schema, table, policy, description)
-- ---------------------------------------------------------------------------

SELECT hasnt_policy(
  'public', 'customer', 'write_customer',
  'T-F1-08: write_customer unscoped FOR ALL policy must be dropped by 0179'
);

SELECT hasnt_policy(
  'public', 'job', 'write_job',
  'T-F1-09: write_job unscoped FOR ALL policy must be dropped by 0179'
);

-- ---------------------------------------------------------------------------
-- T-F1-10..11: Org-scoped policies added by 0179 must exist
-- has_policy(schema, table, policy, description)
-- ---------------------------------------------------------------------------

SELECT has_policy(
  'public', 'customer', 'customer_tenant_delete',
  'T-F1-10: customer_tenant_delete org-scoped DELETE policy must exist'
);

SELECT has_policy(
  'public', 'job_panel', 'job_panel_tenant_update',
  'T-F1-11: job_panel_tenant_update org-scoped UPDATE policy must exist (missed by 0173)'
);

-- ---------------------------------------------------------------------------
-- T-F1-12..14: FK constraints to organizations(org_id) on child tables
-- Implemented via direct pg_constraint query (pgtap fk_ok variant)
-- ---------------------------------------------------------------------------

SELECT ok(
  EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints tc
    WHERE  tc.table_schema    = 'public'
      AND  tc.table_name      = 'job_panel'
      AND  tc.constraint_name = 'fk_job_panel_org'
      AND  tc.constraint_type = 'FOREIGN KEY'
  ),
  'T-F1-12: fk_job_panel_org FK constraint must exist on job_panel'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints tc
    WHERE  tc.table_schema    = 'public'
      AND  tc.table_name      = 'quotation_line'
      AND  tc.constraint_name = 'fk_quotation_line_org'
      AND  tc.constraint_type = 'FOREIGN KEY'
  ),
  'T-F1-13: fk_quotation_line_org FK constraint must exist on quotation_line'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints tc
    WHERE  tc.table_schema    = 'public'
      AND  tc.table_name      = 'invoice_payment'
      AND  tc.constraint_name = 'fk_invoice_payment_org'
      AND  tc.constraint_type = 'FOREIGN KEY'
  ),
  'T-F1-14: fk_invoice_payment_org FK constraint must exist on invoice_payment'
);

SELECT * FROM finish();

ROLLBACK;
