-- ProjectContext identity reconciliation — expand binding schema and resolver.
-- Authorized base: 3dc814f24343feee8ad131d62a43a2768fc8a0d9
-- Expands first; legacy rows remain QUARANTINED with no fabricated design identity.

alter table public.installation_projects
  add column if not exists design_project_id uuid null;
alter table public.installation_projects
  alter column design_project_id drop default;

alter table public.installation_projects
  add column if not exists binding_version bigint null;
alter table public.installation_projects
  alter column binding_version drop default;

alter table public.installation_projects
  add column if not exists binding_state text null;
alter table public.installation_projects
  alter column binding_state drop not null,
  alter column binding_state drop default;

alter table public.installation_projects
  add column if not exists binding_updated_at timestamptz null;
alter table public.installation_projects
  alter column binding_updated_at drop default;

alter table public.installation_projects
  add column if not exists binding_updated_by text null;
alter table public.installation_projects
  alter column binding_updated_by drop default;

alter table public.installation_projects
  drop constraint if exists ck_installation_projects_binding_state;
alter table public.installation_projects
  add constraint ck_installation_projects_binding_state
  check (binding_state in ('ACTIVE', 'QUARANTINED', 'SUPERSEDED'));

alter table public.installation_projects
  drop constraint if exists ck_installation_projects_binding_version;
alter table public.installation_projects
  add constraint ck_installation_projects_binding_version
  check (binding_version is null or binding_version > 0);

alter table public.installation_projects
  drop constraint if exists ck_installation_projects_active_binding_complete;
alter table public.installation_projects
  add constraint ck_installation_projects_active_binding_complete
  check (
    binding_state <> 'ACTIVE'
    or (
      design_project_id is not null
      and work_item_id is not null
      and binding_version is not null
      and binding_version > 0
      and nullif(btrim(site_code), '') is not null
    )
  );

create unique index if not exists ux_installation_projects_design_project
  on public.installation_projects (design_project_id)
  where design_project_id is not null;

create or replace function public.trg_installation_project_binding_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_user in ('anon', 'authenticated') and (
      new.design_project_id is not null
      or new.binding_version is not null
      or new.binding_state is not null
      or new.binding_updated_at is not null
      or new.binding_updated_by is not null
    ) then
      raise exception 'binding identity may be assigned only by a trusted server path'
        using errcode = 'insufficient_privilege';
    end if;

    if new.design_project_id is not null
       or new.binding_version is not null
       or new.binding_state is not null then
      new.binding_updated_at := statement_timestamp();
      new.binding_updated_by := coalesce(auth.uid()::text, current_user);
    end if;
    return new;
  end if;

  if old.design_project_id is not null
     and new.design_project_id is distinct from old.design_project_id then
    raise exception 'design_project_id is immutable once assigned'
      using errcode = 'check_violation';
  end if;

  if old.design_project_id is null
     and new.design_project_id is not null
     and current_user in ('anon', 'authenticated') then
    raise exception 'design_project_id may be assigned only by a trusted server path'
      using errcode = 'insufficient_privilege';
  end if;

  if new.design_project_id is distinct from old.design_project_id
     or new.work_item_id is distinct from old.work_item_id
     or new.site_code is distinct from old.site_code
     or new.binding_state is distinct from old.binding_state
     or new.status is distinct from old.status
     or new.name is distinct from old.name then
    new.binding_version := coalesce(old.binding_version, 0) + 1;
    new.binding_updated_at := statement_timestamp();
    new.binding_updated_by := coalesce(auth.uid()::text, current_user);
  else
    -- Callers cannot manufacture a version change without a binding change.
    new.binding_version := old.binding_version;
    new.binding_updated_at := old.binding_updated_at;
    new.binding_updated_by := old.binding_updated_by;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_installation_project_binding_identity
  on public.installation_projects;
create trigger trg_installation_project_binding_identity
  before insert or update on public.installation_projects
  for each row execute function public.trg_installation_project_binding_identity();

create or replace function public.rpc_resolve_project_context(p_design_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
  v record;
begin
  if p_design_project_id is null then
    raise exception 'design_project_id is required'
      using errcode = 'null_value_not_allowed';
  end if;

  select count(*) into v_count
  from public.installation_projects ip
  where ip.design_project_id = p_design_project_id;

  if v_count = 0 then
    raise exception 'project context is unbound or missing'
      using errcode = 'no_data_found';
  elsif v_count <> 1 then
    raise exception 'project context identity is ambiguous'
      using errcode = 'cardinality_violation';
  end if;

  select
    ip.id as installation_project_id,
    ip.work_item_id,
    ip.design_project_id,
    ip.site_code,
    ip.name as project_display_name,
    ip.binding_version,
    ip.binding_state,
    ip.status as installation_status,
    wi.version as workflow_version,
    wi.site_code as workflow_site_code
  into strict v
  from public.installation_projects ip
  left join public.work_item wi on wi.id = ip.work_item_id
  where ip.design_project_id = p_design_project_id;

  if nullif(btrim(v.site_code), '') is null then
    raise exception 'project context has no authoritative site'
      using errcode = 'check_violation';
  end if;

  if not (
    public.is_governance_role()
    or public.has_site_access(v.site_code)
    or public.fn_installation_is_member(v.installation_project_id)
  ) then
    raise exception 'insufficient project context authority'
      using errcode = 'insufficient_privilege';
  end if;

  if v.binding_state is distinct from 'ACTIVE' then
    raise exception 'project context binding is not active: %', v.binding_state
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v.installation_status = 'cancelled' then
    raise exception 'cancelled installation cannot issue an active project context'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v.work_item_id is null
     or v.workflow_version is null
     or v.binding_version is null
     or v.binding_version <= 0 then
    raise exception 'project context binding is incomplete'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v.workflow_site_code is distinct from v.site_code then
    raise exception 'Work Item and installation project sites conflict'
      using errcode = 'check_violation';
  end if;

  return jsonb_build_object(
    'schema_version', 'project-context.v1',
    'work_item_id', v.work_item_id,
    'workflow_version', v.workflow_version,
    'installation_project_id', v.installation_project_id,
    'design_project_id', v.design_project_id,
    'site_code', v.site_code,
    'project_display_name', v.project_display_name,
    'binding_version', v.binding_version,
    'binding_state', v.binding_state,
    'installation_status', v.installation_status,
    'issued_at', statement_timestamp()
  );
end;
$$;

comment on function public.rpc_resolve_project_context(uuid) is
  'Resolves project-context.v1 from design_project_id; no project_context_id exists.';

revoke all on function public.rpc_resolve_project_context(uuid) from public, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.rpc_resolve_project_context(uuid) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.rpc_resolve_project_context(uuid) to service_role;
  end if;
end;
$$;
