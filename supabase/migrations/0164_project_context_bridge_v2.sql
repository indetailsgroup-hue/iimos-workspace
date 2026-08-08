-- ProjectContext-bound Bridge v2. The legacy v1 RPC remains dormant and is not
-- called as fallback. Every consequential write validates one locked tuple.

create table if not exists public.project_context_bridge_import (
  installation_project_id uuid not null references public.installation_projects(id),
  client_key text not null check (length(client_key) between 1 and 255),
  principal text not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  work_item_id uuid not null references public.work_item(id),
  design_project_id uuid not null,
  binding_version bigint not null check (binding_version > 0),
  status text not null check (status in ('PENDING', 'COMPLETED')),
  package_id uuid null references public.work_packages(id),
  result jsonb null,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz null,
  primary key (installation_project_id, client_key),
  constraint ck_project_context_bridge_completion check (
    (status = 'PENDING' and package_id is null and result is null and completed_at is null)
    or
    (status = 'COMPLETED' and package_id is not null and result is not null and completed_at is not null)
  )
);

create or replace function public.rpc_bridge_import_cutlist_v2(
  p_work_item_id uuid,
  p_installation_project_id uuid,
  p_design_project_id uuid,
  p_expected_binding_version bigint,
  p_package_code text,
  p_package_name text,
  p_items jsonb,
  p_content_hash text,
  p_client_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_binding record;
  v_actor text;
  v_principal text;
  v_code text;
  v_package_name text;
  v_content_hash text;
  v_item jsonb;
  v_name text;
  v_qty numeric;
  v_unit text;
  v_names text[] := array[]::text[];
  v_normalized_items jsonb := '[]'::jsonb;
  v_request_hash text;
  v_claimed boolean;
  v_existing public.project_context_bridge_import%rowtype;
  v_package_id uuid;
  v_imported int := 0;
  v_skipped int := 0;
  v_result jsonb;
begin
  if p_work_item_id is null
     or p_installation_project_id is null
     or p_design_project_id is null
     or p_expected_binding_version is null then
    raise exception 'complete ProjectContext tuple is required'
      using errcode = 'null_value_not_allowed';
  end if;

  select
    ip.id,
    ip.work_item_id,
    ip.design_project_id,
    ip.binding_version,
    ip.binding_state,
    ip.status as installation_status,
    ip.site_code,
    wi.site_code as workflow_site_code
  into strict v_binding
  from public.installation_projects ip
  join public.work_item wi on wi.id = ip.work_item_id
  where ip.id = p_installation_project_id
  for update of ip, wi;

  if not (
    public.is_governance_role()
    or public.has_site_access(v_binding.site_code)
    or public.fn_installation_is_member(v_binding.id)
  ) then
    raise exception 'insufficient project binding authority'
      using errcode = 'insufficient_privilege';
  end if;

  if v_binding.work_item_id is distinct from p_work_item_id
     or v_binding.design_project_id is distinct from p_design_project_id
     or v_binding.workflow_site_code is distinct from v_binding.site_code then
    raise exception 'ProjectContext tuple conflicts with the locked binding'
      using errcode = 'check_violation';
  end if;

  if v_binding.binding_state is distinct from 'ACTIVE' then
    raise exception 'ProjectContext binding is not active'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_binding.installation_status is distinct from 'active' then
    raise exception 'installation is not active'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_binding.binding_version is distinct from p_expected_binding_version then
    raise exception 'binding version is stale'
      using errcode = 'serialization_failure';
  end if;

  v_code := upper(btrim(coalesce(p_package_code, '')));
  if v_code !~ '^MW-[0-9]{3}$' then
    raise exception 'package_code must match MW-xxx'
      using errcode = 'invalid_parameter_value';
  end if;
  v_package_name := coalesce(nullif(btrim(p_package_name), ''), v_code || ' (MONOLITH)');

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty JSON array'
      using errcode = 'invalid_parameter_value';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) item(value) loop
    if jsonb_typeof(v_item) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(v_item) supplied(key)
         where supplied.key not in ('name', 'qty', 'unit')
       )
       or jsonb_typeof(v_item -> 'name') <> 'string'
       or jsonb_typeof(v_item -> 'qty') <> 'number'
       or (v_item ? 'unit' and jsonb_typeof(v_item -> 'unit') <> 'string') then
      raise exception 'each item must contain only name, positive numeric qty, and optional string unit'
        using errcode = 'invalid_parameter_value';
    end if;

    v_name := nullif(btrim(v_item ->> 'name'), '');
    v_qty := (v_item ->> 'qty')::numeric;
    v_unit := coalesce(nullif(btrim(v_item ->> 'unit'), ''), 'ชิ้น(ตัด)');
    if v_name is null or v_qty <= 0 then
      raise exception 'each item requires nonblank name and qty greater than zero'
        using errcode = 'invalid_parameter_value';
    end if;
    if lower(v_name) = any(v_names) then
      raise exception 'duplicate material name in one cut list: %', v_name
        using errcode = 'invalid_parameter_value';
    end if;
    v_names := array_append(v_names, lower(v_name));
    v_normalized_items := v_normalized_items || jsonb_build_array(jsonb_build_object(
      'name', v_name,
      'qty', v_qty,
      'unit', v_unit
    ));
  end loop;

  v_content_hash := lower(btrim(coalesce(p_content_hash, '')));
  if v_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'content_hash must be a SHA-256 hex digest'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_client_key is null
     or length(p_client_key) < 1
     or length(p_client_key) > 255 then
    raise exception 'client_key length must be between 1 and 255'
      using errcode = 'invalid_parameter_value';
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

  v_request_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'work_item_id', p_work_item_id,
    'installation_project_id', p_installation_project_id,
    'design_project_id', p_design_project_id,
    'binding_version', p_expected_binding_version,
    'package_code', v_code,
    'package_name', v_package_name,
    'items', v_normalized_items,
    'content_hash', v_content_hash
  )::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.project_context_bridge_import(
    installation_project_id, client_key, principal, request_hash, content_hash,
    work_item_id, design_project_id, binding_version, status
  ) values (
    p_installation_project_id, p_client_key, v_principal, v_request_hash, v_content_hash,
    p_work_item_id, p_design_project_id, p_expected_binding_version, 'PENDING'
  )
  on conflict (installation_project_id, client_key) do nothing
  returning true into v_claimed;

  if not coalesce(v_claimed, false) then
    select * into strict v_existing
    from public.project_context_bridge_import import
    where import.installation_project_id = p_installation_project_id
      and import.client_key = p_client_key;
    if v_existing.request_hash is distinct from v_request_hash then
      raise exception 'client key is already bound to different Bridge content'
        using errcode = 'unique_violation';
    end if;
    if v_existing.status <> 'COMPLETED' or v_existing.result is null then
      raise exception 'Bridge idempotency record is not completed'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
    return v_existing.result || jsonb_build_object('already', true);
  end if;

  select id into v_package_id
  from public.work_packages
  where project_id = p_installation_project_id and code = v_code;
  if v_package_id is null then
    v_package_id := (public.rpc_field_create_package(
      p_installation_project_id, v_code, v_package_name
    ) ->> 'package_id')::uuid;
  end if;

  for v_item in select value from jsonb_array_elements(v_normalized_items) item(value) loop
    v_name := v_item ->> 'name';
    v_qty := (v_item ->> 'qty')::numeric;
    v_unit := v_item ->> 'unit';
    if exists (
      select 1 from public.package_materials material
      where material.package_id = v_package_id and lower(material.name) = lower(v_name)
    ) then
      v_skipped := v_skipped + 1;
    else
      perform public.rpc_factory_add_material(v_package_id, v_name, v_qty, v_unit);
      v_imported := v_imported + 1;
    end if;
  end loop;

  v_result := jsonb_build_object(
    'package_id', v_package_id,
    'imported', v_imported,
    'skipped', v_skipped,
    'already', false,
    'content_hash', v_content_hash,
    'binding_version', p_expected_binding_version
  );

  insert into public.installation_audit_log(event_type, project_id, site_code, performed_by, detail)
  values (
    'bridge_cutlist_imported_v2', p_installation_project_id, v_binding.site_code, v_actor,
    jsonb_build_object(
      'work_item_id', p_work_item_id,
      'installation_project_id', p_installation_project_id,
      'design_project_id', p_design_project_id,
      'binding_version', p_expected_binding_version,
      'package_id', v_package_id,
      'package_code', v_code,
      'imported', v_imported,
      'skipped', v_skipped,
      'content_hash', v_content_hash,
      'client_key', p_client_key,
      'request_hash', v_request_hash
    )
  );

  update public.project_context_bridge_import
  set status = 'COMPLETED',
      package_id = v_package_id,
      result = v_result,
      completed_at = statement_timestamp()
  where installation_project_id = p_installation_project_id
    and client_key = p_client_key;

  return v_result;
end;
$$;

comment on function public.rpc_bridge_import_cutlist_v2(
  uuid, uuid, uuid, bigint, text, text, jsonb, text, text
) is 'Locks and validates one complete active ProjectContext tuple before any package/material mutation; never falls back to Bridge v1.';

revoke all on table public.project_context_bridge_import from public, anon, authenticated;
revoke all on function public.rpc_bridge_import_cutlist_v2(
  uuid, uuid, uuid, bigint, text, text, jsonb, text, text
) from public, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.rpc_bridge_import_cutlist_v2(
      uuid, uuid, uuid, bigint, text, text, jsonb, text, text
    ) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.rpc_bridge_import_cutlist_v2(
      uuid, uuid, uuid, bigint, text, text, jsonb, text, text
    ) to service_role;
  end if;
end;
$$;
