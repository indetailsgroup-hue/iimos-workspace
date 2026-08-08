-- ProjectContext identity reconciliation — deterministic legacy classification
-- and atomic customer-job opening. No legacy row is mutated by this migration.

create or replace view public.project_context_reconciliation_snapshot
with (security_invoker = true)
as
with candidates as (
  select
    ip.id as installation_project_id,
    ip.work_item_id,
    ip.site_code as installation_site_code,
    wi.site_code as workflow_site_code,
    ip.design_project_id,
    ip.binding_state,
    count(*) over (partition by ip.work_item_id) as work_item_candidate_count
  from public.installation_projects ip
  left join public.work_item wi on wi.id = ip.work_item_id
)
select
  installation_project_id,
  work_item_id,
  installation_site_code,
  workflow_site_code,
  design_project_id,
  binding_state,
  case
    when work_item_id is null then 'QUARANTINED_ORPHAN'
    when work_item_candidate_count <> 1 then 'CONFLICT'
    when workflow_site_code is null
      or installation_site_code is null
      or workflow_site_code is distinct from installation_site_code then 'CONFLICT'
    else 'VERIFIED_BINDING'
  end as classification,
  jsonb_build_object(
    'installation_project_id', installation_project_id,
    'work_item_id', work_item_id,
    'installation_site_code', installation_site_code,
    'workflow_site_code', workflow_site_code,
    'design_project_id', design_project_id,
    'binding_state', binding_state,
    'work_item_candidate_count', work_item_candidate_count,
    'matching_basis', 'EXPLICIT_IDENTIFIERS_AND_SITE_ONLY'
  ) as evidence
from candidates;

comment on view public.project_context_reconciliation_snapshot is
  'Read-only deterministic classification; names, timestamps, and customer similarity are never matching authority.';

create table if not exists public.project_context_reconciliation_decision (
  id uuid primary key default gen_random_uuid(),
  installation_project_id uuid not null references public.installation_projects(id),
  classification text not null check (
    classification in ('VERIFIED_BINDING', 'QUARANTINED_ORPHAN', 'CONFLICT')
  ),
  evidence jsonb not null check (
    jsonb_typeof(evidence) = 'object' and evidence <> '{}'::jsonb
  ),
  decided_by text not null check (nullif(btrim(decided_by), '') is not null),
  decided_at timestamptz not null default statement_timestamp()
);
create index if not exists ix_project_context_reconciliation_installation
  on public.project_context_reconciliation_decision (installation_project_id, decided_at);

create or replace function public.trg_project_context_reconciliation_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'project_context_reconciliation_decision is append-only: % is not permitted', tg_op
    using errcode = 'object_not_in_prerequisite_state';
end;
$$;

drop trigger if exists trg_project_context_reconciliation_append_only
  on public.project_context_reconciliation_decision;
create trigger trg_project_context_reconciliation_append_only
  before update or delete on public.project_context_reconciliation_decision
  for each row execute function public.trg_project_context_reconciliation_append_only();

create table if not exists public.project_context_open_request (
  principal text not null,
  actor text not null,
  idempotency_key text not null check (length(idempotency_key) between 1 and 255),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  normalized_request jsonb not null,
  site_code text not null,
  status text not null check (status in ('PENDING', 'COMPLETED')),
  work_item_id uuid null references public.work_item(id),
  installation_project_id uuid null references public.installation_projects(id),
  design_project_id uuid null,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz null,
  primary key (principal, idempotency_key),
  unique (design_project_id),
  constraint ck_project_context_open_completion check (
    (status = 'PENDING'
      and work_item_id is null
      and installation_project_id is null
      and design_project_id is null
      and completed_at is null)
    or
    (status = 'COMPLETED'
      and work_item_id is not null
      and installation_project_id is not null
      and design_project_id is not null
      and completed_at is not null)
  )
);

create or replace function public.rpc_open_customer_job(
  p_request jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_principal text;
  v_actor text;
  v_site text;
  v_site_count bigint;
  v_name text;
  v_project_type text;
  v_normalized jsonb;
  v_hash text;
  v_claimed boolean;
  v_existing public.project_context_open_request%rowtype;
  v_work_item_id uuid;
  v_installation_project_id uuid;
  v_design_project_id uuid;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    raise exception 'customer-job request must be a JSON object'
      using errcode = 'invalid_parameter_value';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_request) as supplied(key)
    where supplied.key not in ('project_display_name', 'project_type')
  ) then
    raise exception 'customer-job request contains an unsupported or authority-bearing field'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_idempotency_key is null
     or length(p_idempotency_key) < 1
     or length(p_idempotency_key) > 255 then
    raise exception 'idempotency key length must be between 1 and 255'
      using errcode = 'invalid_parameter_value';
  end if;

  v_name := nullif(btrim(p_request ->> 'project_display_name'), '');
  if v_name is null then
    raise exception 'project_display_name is required'
      using errcode = 'check_violation';
  end if;

  v_project_type := coalesce(nullif(btrim(p_request ->> 'project_type'), ''), 'new_build');
  if v_project_type not in ('new_build', 'renovation') then
    raise exception 'project_type must be new_build or renovation'
      using errcode = 'check_violation';
  end if;

  select count(*), min(active.site_code)
    into v_site_count, v_site
  from public.get_active_site_codes() active
  where public.is_governance_role() or public.has_site_access(active.site_code);

  if v_site_count = 0 then
    raise exception 'caller has no server-resolved active site authority'
      using errcode = 'insufficient_privilege';
  elsif v_site_count <> 1 then
    raise exception 'caller site authority is ambiguous; select no site in the payload'
      using errcode = 'cardinality_violation';
  end if;

  v_actor := nullif(btrim(public.resolve_actor()), '');
  if v_actor is null then
    raise exception 'caller identity is unresolved'
      using errcode = 'insufficient_privilege';
  end if;
  v_principal := coalesce(
    auth.uid()::text,
    nullif(btrim(auth.jwt() ->> 'sub'), ''),
    v_actor
  );

  v_normalized := jsonb_build_object(
    'project_display_name', v_name,
    'project_type', v_project_type
  );
  v_hash := encode(
    extensions.digest(convert_to(v_site || ':' || v_normalized::text, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.project_context_open_request(
    principal, actor, idempotency_key, request_hash, normalized_request, site_code, status
  ) values (
    v_principal, v_actor, p_idempotency_key, v_hash, v_normalized, v_site, 'PENDING'
  )
  on conflict (principal, idempotency_key) do nothing
  returning true into v_claimed;

  if not coalesce(v_claimed, false) then
    select * into strict v_existing
    from public.project_context_open_request request
    where request.principal = v_principal
      and request.idempotency_key = p_idempotency_key;

    if v_existing.request_hash is distinct from v_hash then
      raise exception 'idempotency key is already bound to a different request'
        using errcode = 'unique_violation';
    end if;
    if v_existing.status <> 'COMPLETED'
       or v_existing.design_project_id is null then
      raise exception 'idempotency request is not in a completed state'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
    return public.rpc_resolve_project_context(v_existing.design_project_id);
  end if;

  v_work_item_id := public.rpc_create_work_item(
    v_site,
    v_normalized || jsonb_build_object('source', 'project_context_open')
  );

  v_installation_project_id := public.rpc_field_create_project(
    v_name,
    v_site,
    null,
    v_work_item_id,
    true,
    v_project_type
  );

  v_design_project_id := gen_random_uuid();
  update public.installation_projects
  set design_project_id = v_design_project_id,
      binding_version = 1,
      binding_state = 'ACTIVE'
  where id = v_installation_project_id;

  if not found then
    raise exception 'installation project disappeared during atomic open'
      using errcode = 'no_data_found';
  end if;

  insert into public.workflow_audit_log(
    event_type, work_item_id, process_step, site_code, performed_by, detail
  )
  select
    'customer_job_opened', wi.id, wi.current_step, wi.site_code, v_actor,
    jsonb_build_object(
      'installation_project_id', v_installation_project_id,
      'design_project_id', v_design_project_id,
      'idempotency_key', p_idempotency_key,
      'request_hash', v_hash
    )
  from public.work_item wi
  where wi.id = v_work_item_id;

  update public.project_context_open_request
  set status = 'COMPLETED',
      work_item_id = v_work_item_id,
      installation_project_id = v_installation_project_id,
      design_project_id = v_design_project_id,
      completed_at = statement_timestamp()
  where principal = v_principal and idempotency_key = p_idempotency_key;

  return public.rpc_resolve_project_context(v_design_project_id);
end;
$$;

comment on function public.rpc_open_customer_job(jsonb, text) is
  'Atomically opens Work Item + installation + server-issued design identity; site authority is server-derived and retries are stable-principal-scoped.';

revoke all on table public.project_context_reconciliation_decision from public, anon, authenticated;
revoke all on table public.project_context_open_request from public, anon, authenticated;
revoke all on public.project_context_reconciliation_snapshot from public, anon, authenticated;
revoke all on function public.rpc_open_customer_job(jsonb, text) from public, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.rpc_open_customer_job(jsonb, text) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.rpc_open_customer_job(jsonb, text) to service_role;
  end if;
end;
$$;
