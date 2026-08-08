-- ProjectContext identity reconciliation — final active-row enforcement and
-- legacy authenticated-entry-point revocation.
--
-- This migration never guesses or backfills identity. It aborts unless every
-- active installation already has one complete canonical ProjectContext tuple.

do $$
begin
  if exists (
    select 1
    from public.installation_projects ip
    where ip.status = 'active'
      and (
        ip.work_item_id is null
        or ip.design_project_id is null
        or ip.binding_version is null
        or ip.binding_version <= 0
        or ip.binding_state is distinct from 'ACTIVE'
        or nullif(btrim(ip.site_code), '') is null
      )
  ) then
    raise exception 'ProjectContext enforcement blocked: active installation identity is incomplete'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if exists (
    select ip.work_item_id
    from public.installation_projects ip
    where ip.work_item_id is not null
    group by ip.work_item_id
    having count(*) <> 1
  ) then
    raise exception 'ProjectContext enforcement blocked: Work Item identity is not unique'
      using errcode = 'unique_violation';
  end if;

  if exists (
    select ip.design_project_id
    from public.installation_projects ip
    where ip.design_project_id is not null
    group by ip.design_project_id
    having count(*) <> 1
  ) then
    raise exception 'ProjectContext enforcement blocked: design identity is not unique'
      using errcode = 'unique_violation';
  end if;
end;
$$;

create or replace function public.trg_assert_installation_project_context_complete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_row public.installation_projects%rowtype;
begin
  -- Read the row at constraint-check time, not the INSERT snapshot. The
  -- approved atomic wrapper may create and bind the row inside one transaction.
  select * into v_row
  from public.installation_projects ip
  where ip.id = coalesce(new.id, old.id);

  if not found then
    return null;
  end if;

  if v_row.status = 'active' and (
    v_row.work_item_id is null
    or v_row.design_project_id is null
    or v_row.binding_version is null
    or v_row.binding_version <= 0
    or v_row.binding_state is distinct from 'ACTIVE'
    or nullif(btrim(v_row.site_code), '') is null
  ) then
    raise exception 'active installation requires one complete ProjectContext tuple'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_installation_project_context_complete
  on public.installation_projects;
create constraint trigger trg_installation_project_context_complete
  after insert or update on public.installation_projects
  deferrable initially deferred
  for each row execute function public.trg_assert_installation_project_context_complete();

comment on function public.trg_assert_installation_project_context_complete() is
  'Deferred commit-time enforcement: every active installation must have an exact Work Item/design binding; no identity is inferred.';

-- The approved wrappers remain the authenticated boundary. Their SECURITY
-- DEFINER owners may call trusted internals; clients may not invoke legacy v1
-- or direct-create entry points themselves.
revoke execute on function public.rpc_bridge_import_cutlist(
  uuid, text, text, jsonb, text, text
) from public, anon, authenticated;
revoke execute on function public.rpc_field_create_project(
  text, text, uuid, uuid, boolean, text
) from public, anon, authenticated;

