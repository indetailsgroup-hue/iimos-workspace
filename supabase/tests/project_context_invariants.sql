-- ProjectContext identity reconciliation invariants.
-- Task 2 RED/GREEN suite: binding schema + exact fail-closed resolver.
-- Every fixture is rolled back; no state survives the suite.

begin;
create extension if not exists pgtap;
select plan(51);

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

select * from finish();
rollback;
