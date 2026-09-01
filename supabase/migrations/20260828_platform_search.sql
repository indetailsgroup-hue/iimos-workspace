-- Platform-Wide Search RPC Functions for Super Admin
-- v16.5.0 (schema-corrected: job_code/invoice_code/member_id/org_id PK)

-- ─── Search Jobs ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION platform_search_jobs(
  search_query TEXT,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0,
  filter_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  org_id UUID,
  org_name TEXT,
  title TEXT,
  job_code TEXT,
  status TEXT,
  customer_name TEXT,
  match_field TEXT,
  match_snippet TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin access required';
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      j.job_id,
      j.org_id,
      o.name AS org_name,
      j.title,
      j.job_code,
      j.status::TEXT,
      coalesce(c.name, '') AS customer_name,
      CASE
        WHEN j.title    ILIKE '%' || search_query || '%' THEN 'title'
        WHEN j.job_code ILIKE '%' || search_query || '%' THEN 'job_code'
        WHEN c.name     ILIKE '%' || search_query || '%' THEN 'customer_name'
        ELSE 'notes'
      END AS match_field,
      CASE
        WHEN j.title    ILIKE '%' || search_query || '%' THEN j.title
        WHEN j.job_code ILIKE '%' || search_query || '%' THEN j.job_code
        WHEN c.name     ILIKE '%' || search_query || '%' THEN c.name
        ELSE LEFT(j.notes, 100)
      END AS match_snippet,
      j.created_at,
      COUNT(*) OVER() AS total_count
    FROM public.jobs j
    JOIN public.organizations o ON o.org_id = j.org_id
    LEFT JOIN public.customers c ON c.customer_id = j.customer_id
    WHERE (filter_org_id IS NULL OR j.org_id = filter_org_id)
      AND (
        j.title    ILIKE '%' || search_query || '%'
        OR j.job_code ILIKE '%' || search_query || '%'
        OR c.name  ILIKE '%' || search_query || '%'
        OR j.notes ILIKE '%' || search_query || '%'
      )
    ORDER BY j.created_at DESC
    LIMIT result_limit
    OFFSET result_offset
  )
  SELECT * FROM matches;
END;
$$;

-- ─── Search Members ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION platform_search_members(
  search_query TEXT,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0,
  filter_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  member_id UUID,
  org_id UUID,
  org_name TEXT,
  display_name TEXT,
  email TEXT,
  role TEXT,
  match_field TEXT,
  match_snippet TEXT,
  joined_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin access required';
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      m.member_id,
      m.org_id,
      o.name AS org_name,
      m.display_name,
      m.email,
      m.role::TEXT,
      CASE
        WHEN m.display_name ILIKE '%' || search_query || '%' THEN 'display_name'
        WHEN m.email        ILIKE '%' || search_query || '%' THEN 'email'
        ELSE 'role'
      END AS match_field,
      CASE
        WHEN m.display_name ILIKE '%' || search_query || '%' THEN m.display_name
        WHEN m.email        ILIKE '%' || search_query || '%' THEN m.email
        ELSE m.role::TEXT
      END AS match_snippet,
      m.joined_at,
      COUNT(*) OVER() AS total_count
    FROM public.org_members m
    JOIN public.organizations o ON o.org_id = m.org_id
    WHERE (filter_org_id IS NULL OR m.org_id = filter_org_id)
      AND (
        m.display_name ILIKE '%' || search_query || '%'
        OR m.email     ILIKE '%' || search_query || '%'
        OR m.role::TEXT ILIKE '%' || search_query || '%'
      )
    ORDER BY m.joined_at DESC NULLS LAST
    LIMIT result_limit
    OFFSET result_offset
  )
  SELECT * FROM matches;
END;
$$;

-- ─── Search Invoices ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION platform_search_invoices(
  search_query TEXT,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0,
  filter_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  invoice_id UUID,
  org_id UUID,
  org_name TEXT,
  invoice_code TEXT,
  status TEXT,
  total NUMERIC,
  customer_name TEXT,
  match_field TEXT,
  match_snippet TEXT,
  issued_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin access required';
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      i.invoice_id,
      i.org_id,
      o.name AS org_name,
      i.invoice_code,
      i.status::TEXT,
      i.total,
      coalesce(c.name, '') AS customer_name,
      CASE
        WHEN i.invoice_code ILIKE '%' || search_query || '%' THEN 'invoice_code'
        WHEN c.name         ILIKE '%' || search_query || '%' THEN 'customer_name'
        ELSE 'notes'
      END AS match_field,
      CASE
        WHEN i.invoice_code ILIKE '%' || search_query || '%' THEN i.invoice_code
        WHEN c.name         ILIKE '%' || search_query || '%' THEN c.name
        ELSE LEFT(i.notes, 100)
      END AS match_snippet,
      i.issued_at,
      COUNT(*) OVER() AS total_count
    FROM public.invoices i
    JOIN public.organizations o ON o.org_id = i.org_id
    LEFT JOIN public.customers c ON c.customer_id = i.customer_id
    WHERE (filter_org_id IS NULL OR i.org_id = filter_org_id)
      AND (
        i.invoice_code ILIKE '%' || search_query || '%'
        OR c.name      ILIKE '%' || search_query || '%'
        OR i.notes     ILIKE '%' || search_query || '%'
      )
    ORDER BY i.issued_at DESC NULLS LAST
    LIMIT result_limit
    OFFSET result_offset
  )
  SELECT * FROM matches;
END;
$$;

-- ─── Grant Execute to authenticated ─────────────────────────────────────────

GRANT EXECUTE ON FUNCTION platform_search_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION platform_search_members TO authenticated;
GRANT EXECUTE ON FUNCTION platform_search_invoices TO authenticated;

-- ─── Full-text search indexes for performance ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm   ON public.jobs     USING gin (title    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_code_trgm    ON public.jobs     USING gin (job_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_org_members_name_trgm  ON public.org_members USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_org_members_email_trgm ON public.org_members USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_invoices_code_trgm ON public.invoices USING gin (invoice_code gin_trgm_ops);
