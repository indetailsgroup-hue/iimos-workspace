-- ProjectContext identity reconciliation invariants.
-- Task 2 RED/GREEN suite: binding schema + exact fail-closed resolver.
-- Every fixture is rolled back; no state survives the suite.

begin;
create extension if not exists pgtap;
select plan(79);

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

select has_view('public', 'project_context_reconciliation_snapshot',
  'deterministic reconciliation snapshot exists');
select has_table('public', 'project_context_reconciliation_decision',
  'append-only reconciliation decision register exists');
select has_table('public', 'project_context_open_request',
  'atomic-open idempotency register exists');
select has_column('public', 'project_context_open_request', 'principal',
  'idempotency scope uses a stable server-derived principal');
select has_function('public', 'rpc_open_customer_job', array['jsonb', 'text'],
  'rpc_open_customer_job(jsonb,text) exists');

select lives_ok(
  $$insert into public.work_item(id, site_code, current_step, status, version, data)
      values
        ('21000000-0000-0000-0000-000000000101', 'SITE-A', 'Design', 'in_progress', 1, '{}'::jsonb),
        ('21000000-0000-0000-0000-000000000103', 'SITE-B', 'Design', 'in_progress', 1, '{}'::jsonb),
        ('21000000-0000-0000-0000-000000000104', 'SITE-A', 'Design', 'in_progress', 1,
          '{"project_display_name":"Similarity Is Not Authority"}'::jsonb);
    insert into public.installation_projects(id, site_code, work_item_id, name, status)
      values
        ('31000000-0000-0000-0000-000000000101', 'SITE-A',
          '21000000-0000-0000-0000-000000000101', 'Verified legacy', 'active'),
        ('31000000-0000-0000-0000-000000000102', 'SITE-A', null, 'Orphan legacy', 'active'),
        ('31000000-0000-0000-0000-000000000103', 'SITE-A',
          '21000000-0000-0000-0000-000000000103', 'Cross-site legacy', 'active'),
        ('31000000-0000-0000-0000-000000000104', 'SITE-A', null,
          'Similarity Is Not Authority', 'active')$$,
  'legacy reconciliation fixtures insert without assigning authority'
);
select results_eq(
  $$select installation_project_id, classification
      from public.project_context_reconciliation_snapshot
      where installation_project_id in (
        '31000000-0000-0000-0000-000000000101',
        '31000000-0000-0000-0000-000000000102',
        '31000000-0000-0000-0000-000000000103')
      order by installation_project_id$$,
  $$values
      ('31000000-0000-0000-0000-000000000101'::uuid, 'VERIFIED_BINDING'::text),
      ('31000000-0000-0000-0000-000000000102'::uuid, 'QUARANTINED_ORPHAN'::text),
      ('31000000-0000-0000-0000-000000000103'::uuid, 'CONFLICT'::text)$$,
  'reconciliation classification uses explicit Work Item and site evidence'
);
select is(
  (select classification from public.project_context_reconciliation_snapshot
    where installation_project_id = '31000000-0000-0000-0000-000000000104'),
  'QUARANTINED_ORPHAN',
  'matching name and nearby creation time never authorize an automatic binding'
);

select lives_ok(
  $$insert into public.project_context_reconciliation_decision(
      installation_project_id, classification, evidence, decided_by)
    values (
      '31000000-0000-0000-0000-000000000102', 'QUARANTINED_ORPHAN',
      '{"basis":"missing_work_item","source_ids":["31000000-0000-0000-0000-000000000102"]}'::jsonb,
      'test-governance')$$,
  'reconciliation evidence can be appended'
);
select throws_ok(
  $$update public.project_context_reconciliation_decision
      set evidence = '{"basis":"rewritten"}'::jsonb$$,
  '55000', null,
  'reconciliation evidence cannot be updated'
);
select throws_ok(
  $$delete from public.project_context_reconciliation_decision$$,
  '55000', null,
  'reconciliation evidence cannot be deleted'
);

select lives_ok(
  $$insert into public.process_model(
      process_step, sub_process_group, canonical_order, approval_quorum, requires_approval)
    select 'Customer Intake', 'Customer Job', 1, null, false
    where not exists (select 1 from public.process_model)$$,
  'atomic-open fixture has one canonical first workflow step'
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000001","email":"project-owner@example.test","app_metadata":{"roles":[],"site_codes":["BKK-HQ-01"]}}',
  true
);

create temporary table task3_open_results(sequence_no int primary key, context jsonb) on commit drop;
select lives_ok(
  $$insert into task3_open_results(sequence_no, context)
    select 1, public.rpc_open_customer_job(
      '{"project_display_name":"Atomic Project","project_type":"new_build"}'::jsonb,
      'task3-open-001')$$,
  'atomic open creates and returns one ProjectContext'
);
select ok(
  (select
    context - 'issued_at' = jsonb_build_object(
      'schema_version', 'project-context.v1',
      'work_item_id', context ->> 'work_item_id',
      'workflow_version', 0,
      'installation_project_id', context ->> 'installation_project_id',
      'design_project_id', context ->> 'design_project_id',
      'site_code', 'BKK-HQ-01',
      'project_display_name', 'Atomic Project',
      'binding_version', 1,
      'binding_state', 'ACTIVE',
      'installation_status', 'active'
    )
    and jsonb_typeof(context -> 'issued_at') = 'string'
    from task3_open_results where sequence_no = 1),
  'atomic open returns exactly ProjectContext v1 with server-derived site'
);
select ok(
  (select
      (select count(*) from public.work_item wi
        where wi.id = (r.context ->> 'work_item_id')::uuid) = 1
      and (select count(*) from public.installation_projects ip
        where ip.id = (r.context ->> 'installation_project_id')::uuid
          and ip.work_item_id = (r.context ->> 'work_item_id')::uuid
          and ip.design_project_id = (r.context ->> 'design_project_id')::uuid) = 1
      and (select count(*) from public.installation_rooms room
        where room.project_id = (r.context ->> 'installation_project_id')::uuid) = 5
      and (select count(*) from public.installation_tasks task
        join public.installation_rooms room on room.id = task.room_id
        where room.project_id = (r.context ->> 'installation_project_id')::uuid) = 15
      and (select count(*) from public.workflow_audit_log audit
        where audit.work_item_id = (r.context ->> 'work_item_id')::uuid
          and audit.event_type = 'customer_job_opened') = 1
    from task3_open_results r where r.sequence_no = 1),
  'atomic open commits one canonical identity tuple, approved presets, and audit evidence'
);
select lives_ok(
  $$insert into task3_open_results(sequence_no, context)
    select 2, public.rpc_open_customer_job(
      '{"project_type":"new_build","project_display_name":"Atomic Project"}'::jsonb,
      'task3-open-001')$$,
  'same idempotency key and canonical request safely retries'
);
select ok(
  (select (a.context ->> 'work_item_id') = (b.context ->> 'work_item_id')
      and (a.context ->> 'installation_project_id') = (b.context ->> 'installation_project_id')
      and (a.context ->> 'design_project_id') = (b.context ->> 'design_project_id')
    from task3_open_results a cross join task3_open_results b
    where a.sequence_no = 1 and b.sequence_no = 2),
  'retry returns the original canonical identity tuple'
);
select is(
  (select count(*) from public.project_context_open_request
    where principal = '11000000-0000-0000-0000-000000000001'
      and idempotency_key = 'task3-open-001'),
  1::bigint,
  'retry stores one record under the stable authenticated principal'
);
select throws_ok(
  $$select public.rpc_open_customer_job(
      '{"project_display_name":"Different Request","project_type":"new_build"}'::jsonb,
      'task3-open-001')$$,
  '23505', null,
  'same idempotency key with different request is rejected'
);
select throws_ok(
  $$select public.rpc_open_customer_job(
      '{"project_display_name":"Free-form Site","site_code":"BKK-HQ-01"}'::jsonb,
      'task3-open-site')$$,
  '22023', null,
  'client payload cannot supply free-form site authority'
);
select throws_ok(
  $$select public.rpc_open_customer_job(
      '{"project_display_name":"Free-form Foreman","foreman_employee_id":"11000000-0000-0000-0000-000000000099"}'::jsonb,
      'task3-open-foreman')$$,
  '22023', null,
  'atomic-open v1 cannot accept unverified staffing authority'
);

create temporary table task3_failure_baseline on commit drop as
select
  (select count(*) from public.project_context_open_request) as open_requests,
  (select count(*) from public.work_item) as work_items,
  (select count(*) from public.installation_projects) as installation_projects,
  (select count(*) from public.installation_projects where design_project_id is not null) as design_identities;

create or replace function pg_temp.task3_force_installation_failure()
returns trigger language plpgsql as $$
begin
  if new.name = 'Force rollback' then
    raise exception 'task3 forced failure';
  end if;
  return new;
end;
$$;
select lives_ok(
  $$create trigger task3_force_installation_failure
    before insert on public.installation_projects
    for each row execute function pg_temp.task3_force_installation_failure()$$,
  'forced-failure fixture installs after Work Item creation boundary'
);
select throws_ok(
  $$select public.rpc_open_customer_job(
      '{"project_display_name":"Force rollback","project_type":"new_build"}'::jsonb,
      'task3-open-failure')$$,
  'P0001', null,
  'forced failure aborts atomic customer-job opening'
);
select ok(
  (select
    baseline.open_requests = (select count(*) from public.project_context_open_request)
    and baseline.work_items = (select count(*) from public.work_item)
    and baseline.installation_projects = (select count(*) from public.installation_projects)
    and baseline.design_identities = (
      select count(*) from public.installation_projects where design_project_id is not null
    )
    from task3_failure_baseline baseline),
  'forced failure leaves no idempotency, Work Item, installation, or design identity residue'
);

select has_table('public', 'project_context_bridge_import',
  'Bridge v2 has a binding-scoped idempotency register');
select has_function(
  'public', 'rpc_bridge_import_cutlist_v2',
  array['uuid','uuid','uuid','bigint','text','text','jsonb','text','text'],
  'rpc_bridge_import_cutlist_v2 has the complete ProjectContext tuple signature'
);

select lives_ok(
  $$insert into task3_open_results(sequence_no, context)
    select 3, public.rpc_open_customer_job(
      '{"project_display_name":"Atomic Project B","project_type":"new_build"}'::jsonb,
      'task4-open-project-b')$$,
  'Bridge v2 fixture opens independent project B'
);

create temporary table task4_rejection_baseline on commit drop as
select
  (select count(*) from public.work_packages) as packages,
  (select count(*) from public.package_materials) as materials,
  (select count(*) from public.project_context_bridge_import) as imports;

select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 1),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'binding_version')::bigint from task3_open_results where sequence_no = 3),
      'MW-201', 'Mixed Work Item', '[{"name":"Plywood","qty":2}]'::jsonb,
      repeat('a',64), 'task4-reject-mixed-work')$$,
  '23514', null,
  'Bridge v2 rejects a mixed Work Item and project tuple'
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 1),
      (select (context ->> 'binding_version')::bigint from task3_open_results where sequence_no = 3),
      'MW-201', 'Mixed Design', '[{"name":"Plywood","qty":2}]'::jsonb,
      repeat('a',64), 'task4-reject-mixed-design')$$,
  '23514', null,
  'Bridge v2 rejects a mixed design and installation tuple'
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'binding_version')::bigint + 1 from task3_open_results where sequence_no = 3),
      'MW-201', 'Stale Version', '[{"name":"Plywood","qty":2}]'::jsonb,
      repeat('a',64), 'task4-reject-stale')$$,
  '40001', null,
  'Bridge v2 rejects a stale binding version'
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'binding_version')::bigint from task3_open_results where sequence_no = 3),
      'MW-201', 'Malformed Array', '{}'::jsonb,
      repeat('a',64), 'task4-reject-array')$$,
  '22023', null,
  'Bridge v2 rejects non-array items'
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'binding_version')::bigint from task3_open_results where sequence_no = 3),
      'MW-201', 'Malformed Item', '[{"name":"Plywood","qty":0}]'::jsonb,
      repeat('a',64), 'task4-reject-item')$$,
  '22023', null,
  'Bridge v2 rejects malformed material items before mutation'
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'binding_version')::bigint from task3_open_results where sequence_no = 3),
      'MW-201', 'Bad Hash', '[{"name":"Plywood","qty":2}]'::jsonb,
      'not-a-sha256', 'task4-reject-hash')$$,
  '22023', null,
  'Bridge v2 rejects malformed content hash before mutation'
);

update public.installation_projects
set binding_state = 'QUARANTINED'
where id = (select (context ->> 'installation_project_id')::uuid
            from task3_open_results where sequence_no = 3);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 3)),
      'MW-201', 'Quarantined', '[{"name":"Plywood","qty":2}]'::jsonb,
      repeat('a',64), 'task4-reject-quarantine')$$,
  '55000', null,
  'Bridge v2 rejects a quarantined binding'
);
update public.installation_projects
set binding_state = 'ACTIVE'
where id = (select (context ->> 'installation_project_id')::uuid
            from task3_open_results where sequence_no = 3);

update public.installation_projects
set status = 'cancelled'
where id = (select (context ->> 'installation_project_id')::uuid
            from task3_open_results where sequence_no = 3);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 3)),
      'MW-201', 'Cancelled', '[{"name":"Plywood","qty":2}]'::jsonb,
      repeat('a',64), 'task4-reject-cancelled')$$,
  '55000', null,
  'Bridge v2 rejects a cancelled installation'
);
update public.installation_projects
set status = 'active'
where id = (select (context ->> 'installation_project_id')::uuid
            from task3_open_results where sequence_no = 3);

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000002","email":"unauthorized@example.test","app_metadata":{"roles":[],"site_codes":["OTHER-SITE"]}}',
  true
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 3)),
      'MW-201', 'Unauthorized', '[{"name":"Plywood","qty":2}]'::jsonb,
      repeat('a',64), 'task4-reject-authority')$$,
  '42501', null,
  'Bridge v2 rejects a caller outside site and membership authority'
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000001","email":"project-owner@example.test","app_metadata":{"roles":[],"site_codes":["BKK-HQ-01"]}}',
  true
);

select ok(
  (select
    baseline.packages = (select count(*) from public.work_packages)
    and baseline.materials = (select count(*) from public.package_materials)
    and baseline.imports = (select count(*) from public.project_context_bridge_import)
    from task4_rejection_baseline baseline),
  'every rejected Bridge v2 case leaves package, material, and import state unchanged'
);

create temporary table task4_import_results(sequence_no int primary key, result jsonb) on commit drop;
select lives_ok(
  $$insert into task4_import_results(sequence_no, result)
    select 1, public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 3)),
      'MW-201', 'Project B Package',
      '[{"name":"Plywood","qty":2,"unit":"sheet"},{"name":"Edge Band","qty":5,"unit":"m"}]'::jsonb,
      repeat('a',64), 'task4-import-shared')$$,
  'exact active project B tuple imports one cut list'
);
select ok(
  (select
    result ->> 'already' = 'false'
    and (result ->> 'imported')::int = 2
    and (select count(*) from public.work_packages where id = (result ->> 'package_id')::uuid) = 1
    and (select count(*) from public.package_materials where package_id = (result ->> 'package_id')::uuid) = 2
    from task4_import_results where sequence_no = 1),
  'successful Bridge v2 import returns exact mutation evidence'
);
select lives_ok(
  $$insert into task4_import_results(sequence_no, result)
    select 2, public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 3)),
      'MW-201', 'Project B Package',
      '[{"name":"Plywood","qty":2,"unit":"sheet"},{"name":"Edge Band","qty":5,"unit":"m"}]'::jsonb,
      repeat('a',64), 'task4-import-shared')$$,
  'same canonical binding and client key retries safely'
);
select ok(
  (select retry.result ->> 'already' = 'true'
    and retry.result ->> 'package_id' = original.result ->> 'package_id'
    and (select count(*) from public.package_materials
      where package_id = (original.result ->> 'package_id')::uuid) = 2
    from task4_import_results original cross join task4_import_results retry
    where original.sequence_no = 1 and retry.sequence_no = 2),
  'Bridge v2 retry returns the original package without duplicate material mutation'
);
select lives_ok(
  $$insert into task4_import_results(sequence_no, result)
    select 3, public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 1),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 1),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 1),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 1)),
      'MW-202', 'Project A Package', '[{"name":"Plywood","qty":2,"unit":"sheet"}]'::jsonb,
      repeat('a',64), 'task4-import-shared')$$,
  'same content hash and client key remain independent in project A scope'
);
select ok(
  (select count(*) = 2 from public.project_context_bridge_import
    where client_key = 'task4-import-shared' and content_hash = repeat('a',64))
  and (select count(distinct installation_project_id) = 2
    from public.project_context_bridge_import where client_key = 'task4-import-shared'),
  'Bridge v2 idempotency never deduplicates across project bindings'
);
select throws_ok(
  $$select public.rpc_bridge_import_cutlist_v2(
      (select (context ->> 'work_item_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'installation_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select (context ->> 'design_project_id')::uuid from task3_open_results where sequence_no = 3),
      (select binding_version from public.installation_projects
        where id = (select (context ->> 'installation_project_id')::uuid
                    from task3_open_results where sequence_no = 3)),
      'MW-203', 'Changed Request', '[{"name":"Plywood","qty":3}]'::jsonb,
      repeat('b',64), 'task4-import-shared')$$,
  '23505', null,
  'same project and client key cannot be rebound to different content'
);
select ok(
  (select count(*) = 2 from public.package_materials
    where package_id = (select (result ->> 'package_id')::uuid
                        from task4_import_results where sequence_no = 1)),
  'idempotency conflict leaves the successful package unchanged'
);

-- Task 9 final enforcement: validate exact identity constraints and remove
-- authenticated access to the two legacy entry points.
select has_trigger(
  'public', 'installation_projects',
  'trg_installation_project_context_complete',
  'active installation projects have a deferred complete-context constraint'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'installation_projects'
      and indexname = 'ux_installation_projects_design_project'
      and indexdef ilike 'create unique index%design_project_id%'
  ),
  'design_project_id retains exact uniqueness'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'installation_projects'
      and indexname = 'ux_installation_projects_work_item'
      and indexdef ilike 'create unique index%work_item_id%'
  ),
  'work_item_id retains exact uniqueness'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_bridge_import_cutlist(uuid,text,text,jsonb,text,text)',
    'EXECUTE'
  ),
  'authenticated cannot execute legacy Bridge v1'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_field_create_project(text,text,uuid,uuid,boolean,text)',
    'EXECUTE'
  ),
  'authenticated cannot execute direct project creation'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_open_customer_job(jsonb,text)',
    'EXECUTE'
  ) and has_function_privilege(
    'authenticated',
    'public.rpc_bridge_import_cutlist_v2(uuid,uuid,uuid,bigint,text,text,jsonb,text,text)',
    'EXECUTE'
  ),
  'authenticated retains only the approved atomic-open and Bridge v2 entry points'
);

-- Earlier expand/reconciliation fixtures intentionally include incomplete active
-- rows. Retire only those transaction-local fixtures before proving the final
-- deferred constraint; no production row is backfilled or guessed.
update public.installation_projects
set status = 'cancelled'
where status = 'active'
  and (
    work_item_id is null
    or design_project_id is null
    or binding_version is null
    or binding_state is distinct from 'ACTIVE'
  );

insert into public.installation_projects(id, site_code, name, status)
values (
  '39000000-0000-0000-0000-000000000009',
  'SITE-A',
  'Task 9 incomplete active fixture',
  'active'
);
select throws_ok(
  $$set constraints trg_installation_project_context_complete immediate$$,
  '23514', null,
  'an active installation cannot commit without Work Item and design identity'
);
delete from public.installation_projects
where id = '39000000-0000-0000-0000-000000000009';
set constraints all deferred;

select * from finish();
rollback;
