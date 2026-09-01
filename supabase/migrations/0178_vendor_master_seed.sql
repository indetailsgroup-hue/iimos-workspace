-- =============================================================================
-- Migration  : 0178_vendor_master_seed.sql
-- Description: Seed vendor master records for field-purchase subsystem
--              Source: skills/furniture-research/references/suppliers-thailand.md
--              Uses  : rpc_upsert_vendor (SECURITY DEFINER, idempotent)
-- Governance : Vendor codes and names may only be modified by a user holding
--              the `managing_director` or `system_admin` role.  tax_id values
--              MUST be verified against the Revenue-Department e-Tax portal
--              before being populated; leave NULL until verified.
-- Idempotency: Safe to re-run.  rpc_upsert_vendor performs INSERT … ON CONFLICT
--              (vendor_code) DO UPDATE, so re-runs are non-destructive.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Hardware / fittings suppliers
-- ---------------------------------------------------------------------------
SELECT rpc_upsert_vendor(
    p_vendor_code := 'HAFELE_TH',
    p_name        := 'Häfele Thailand',
    p_tax_id      := NULL,   -- pending Revenue-Department verification
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'HETTICH_TH',
    p_name        := 'Hettich Thailand',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'BLUM_TH',
    p_name        := 'Blum Thailand',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

-- ---------------------------------------------------------------------------
-- Retail / home-improvement chains
-- ---------------------------------------------------------------------------
SELECT rpc_upsert_vendor(
    p_vendor_code := 'HOMEPRO_TH',
    p_name        := 'HomePro',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'WATSADU_TH',
    p_name        := 'Thai Watsadu',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'GLOBALHOUSE_TH',
    p_name        := 'Global House',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'DOHOME_TH',
    p_name        := 'Do Home',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'BOONTHAVORN_TH',
    p_name        := 'Boonthavorn',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

-- ---------------------------------------------------------------------------
-- Specialist woodworking / trade suppliers
-- ---------------------------------------------------------------------------
SELECT rpc_upsert_vendor(
    p_vendor_code := 'WOODWORKINGSHOP_TH',
    p_name        := 'WoodWorkingShop.co.th',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'SIAMWOODWORKER_TH',
    p_name        := 'SiamWoodworker',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

-- ---------------------------------------------------------------------------
-- Building-materials manufacturers / distributors
-- ---------------------------------------------------------------------------
SELECT rpc_upsert_vendor(
    p_vendor_code := 'SCG_BUILDING',
    p_name        := 'SCG Building Materials',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'VANACHAI_TH',
    p_name        := 'Vanachai',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'PANELPLUS_TH',
    p_name        := 'Panel Plus',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'METROPLY_TH',
    p_name        := 'Metro Ply',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'SIAMFC_TH',
    p_name        := 'Siam Fiber Cement',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

SELECT rpc_upsert_vendor(
    p_vendor_code := 'ROBINWOOD_TH',
    p_name        := 'Robin Wood',
    p_tax_id      := NULL,
    p_address     := NULL,
    p_active      := true
);

-- =============================================================================
-- End of 0178_vendor_master_seed.sql
-- Total vendors seeded: 16
-- Next step: populate tax_id values after Revenue-Department e-Tax verification.
-- =============================================================================
