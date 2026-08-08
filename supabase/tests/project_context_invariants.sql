-- ProjectContext identity reconciliation invariants.
-- Task 2 RED/GREEN suite: binding schema + exact fail-closed resolver.
-- Every fixture is rolled back; no state survives the suite.

begin;
create extension if not exists pgtap;
select plan(27);

select has_column('public', 'installation_projects', 'design_project_id',
  'installation_projects has server-issued design_project_id');
select has_column('public', 'installation_projects', 'binding_version',
  'installation_projects has independent binding_version');
select has_column('public', 'installation_projects', 'binding_state',
  'installation_projects has controlled binding_state');
select has_column('public', 'installation_projects', 'binding_updated_at',
  'installation_projects records binding update time');
select has_column('public', 'installation_projects', 'binding_updated_by',
  'installation_projects records binding update actor');
select ok(
  (
    select count(*) = 5
      and bool_and(is_nullable = 'YES')
      and bool_and(column_default is null)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'installation_projects'
      and column_name in (
        'design_project_id', 'binding_version', 'binding_state',
        'binding_updated_at', 'binding_updated_by'
      )
  ),
  'all reconciliation binding fields start nullable without fabricated defaults'
);
select hasnt_column('public', 'installation_projects', 'project_context_id',
  'no fourth project_context_id identity is created');
select has_function('public', 'rpc_resolve_project_context', array['uuid'],
  'rpc_resolve_project_context(uuid) exists');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'installation_projects'
      and indexdef ilike '%unique%design_project_id%'
  ),
  'design_project_id has an exact unique index'
);

select lives_ok(
  $$insert into public.installation_projects(id, site_code, name, status)
    values ('30000000-0000-0000-0000-000000000000', 'SITE-A', 'Legacy unbound', 'active')$$,
  'legacy-shaped installation row remains insertable without a fabricated binding'
);
select results_eq(
  $$select design_project_id, binding_version, binding_state
      from public.installation_projects
      where id = '30000000-0000-0000-0000-000000000000'$$,
  $$values (null::uuid, null::bigint, null::text)$$,
  'legacy-shaped row remains unbound and unclassified'
);

select lives_ok(
  $$insert into public.work_item(id, site_code, current_step, status, version)
    values ('20000000-0000-0000-0000-000000000001', 'SITE-A', 'Design', 'in_progress', 7)$$,
  'canonical Work Item fixture inserts'
);
select lives_ok(
  $$insert into public.installation_projects(
      id, site_code, work_item_id, name, status, design_project_id, binding_version, binding_state)
    values (
      '30000000-0000-0000-0000-000000000001', 'SITE-A',
      '20000000-0000-0000-0000-000000000001', 'Project A', 'active',
      '40000000-0000-0000-0000-000000000001', 2, 'ACTIVE')$$,
  'canonical active binding fixture inserts'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"owner@example.test","app_metadata":{"roles":[],"site_codes":["SITE-A"]}}',
  true
);
select results_eq(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000001') - 'issued_at'$$,
  $$values (jsonb_build_object(
    'schema_version', 'project-context.v1',
    'work_item_id', '20000000-0000-0000-0000-000000000001'::uuid,
    'workflow_version', 7,
    'installation_project_id', '30000000-0000-0000-0000-000000000001'::uuid,
    'design_project_id', '40000000-0000-0000-0000-000000000001'::uuid,
    'site_code', 'SITE-A',
    'project_display_name', 'Project A',
    'binding_version', 2,
    'binding_state', 'ACTIVE',
    'installation_status', 'active',
    'issued_at', null
  ) - 'issued_at')$$,
  'resolver returns only the approved stable ProjectContext fields apart from issued_at'
);
select is(
  (public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000001') ->> 'issued_at')::timestamptz,
  statement_timestamp(),
  'issued_at is the stable resolver statement timestamp'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","app_metadata":{"roles":[],"site_codes":["SITE-B"]}}',
  true
);
select throws_ok(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'resolver rejects a caller without site, governance, or membership authority'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"owner@example.test","app_metadata":{"roles":[],"site_codes":["SITE-A"]}}',
  true
);

select lives_ok(
  $$insert into public.installation_projects(
      id, site_code, work_item_id, name, status, design_project_id, binding_version, binding_state)
    values (
      '30000000-0000-0000-0000-000000000002', 'SITE-A', null,
      'Quarantined', 'active', '40000000-0000-0000-0000-000000000002', 1, 'QUARANTINED')$$,
  'quarantined fixture inserts'
);
select throws_ok(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000002')$$,
  '55000', null,
  'resolver rejects quarantined binding'
);

select lives_ok(
  $$insert into public.work_item(id, site_code, current_step, status, version)
      values ('20000000-0000-0000-0000-000000000006', 'SITE-A', 'Design', 'in_progress', 1);
    insert into public.installation_projects(
      id, site_code, work_item_id, name, status, design_project_id, binding_version, binding_state)
    values (
      '30000000-0000-0000-0000-000000000006', 'SITE-A',
      '20000000-0000-0000-0000-000000000006', 'Null state', 'active',
      '40000000-0000-0000-0000-000000000006', 1, null)$$,
  'null-state fixture remains quarantined by absence of classification'
);
select throws_ok(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000006')$$,
  '55000', null,
  'resolver rejects a null binding state'
);

select lives_ok(
  $$insert into public.work_item(id, site_code, current_step, status, version)
      values ('20000000-0000-0000-0000-000000000003', 'SITE-A', 'Design', 'in_progress', 1);
    insert into public.installation_projects(
      id, site_code, work_item_id, name, status, design_project_id, binding_version, binding_state)
    values (
      '30000000-0000-0000-0000-000000000003', 'SITE-A',
      '20000000-0000-0000-0000-000000000003',
      'Cancelled', 'cancelled', '40000000-0000-0000-0000-000000000003', 1, 'ACTIVE')$$,
  'cancelled fixture inserts for resolver rejection'
);
select throws_ok(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000003')$$,
  '55000', null,
  'resolver rejects cancelled installation state'
);

select lives_ok(
  $$insert into public.work_item(id, site_code, current_step, status, version)
      values ('20000000-0000-0000-0000-000000000004', 'SITE-B', 'Design', 'in_progress', 1);
    insert into public.installation_projects(
      id, site_code, work_item_id, name, status, design_project_id, binding_version, binding_state)
    values (
      '30000000-0000-0000-0000-000000000004', 'SITE-A',
      '20000000-0000-0000-0000-000000000004', 'Cross-site', 'active',
      '40000000-0000-0000-0000-000000000004', 1, 'ACTIVE')$$,
  'cross-site fixture inserts so resolver must fail closed'
);
select throws_ok(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000004')$$,
  '23514', null,
  'resolver rejects cross-site Work Item and installation binding'
);

select throws_ok(
  $$insert into public.installation_projects(
      id, site_code, name, status, design_project_id, binding_version, binding_state)
    values (
      '30000000-0000-0000-0000-000000000005', 'SITE-A', 'Duplicate design', 'active',
      '40000000-0000-0000-0000-000000000001', 1, 'QUARANTINED')$$,
  '23505', null,
  'duplicate design_project_id is rejected in every binding state'
);
select throws_ok(
  $$update public.installation_projects
      set design_project_id = '40000000-0000-0000-0000-000000000099'
    where id = '30000000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'server-issued design_project_id is immutable once assigned'
);

select throws_ok(
  $$select public.rpc_resolve_project_context('40000000-0000-0000-0000-000000000099')$$,
  'P0002', null,
  'resolver rejects an unbound or missing design project'
);

select * from finish();
rollback;
