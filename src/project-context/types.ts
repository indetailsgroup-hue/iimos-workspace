export interface ProjectContextV1 {
  schema_version: 'project-context.v1';
  work_item_id: string;
  workflow_version: number;
  installation_project_id: string;
  design_project_id: string;
  site_code: string;
  project_display_name: string;
  binding_version: number;
  binding_state: 'ACTIVE';
  installation_status: 'active';
  issued_at: string;
}

const PROJECT_CONTEXT_KEYS = [
  'binding_state',
  'binding_version',
  'design_project_id',
  'installation_project_id',
  'installation_status',
  'issued_at',
  'project_display_name',
  'schema_version',
  'site_code',
  'work_item_id',
  'workflow_version',
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

export function parseProjectContextV1(value: unknown): ProjectContextV1 {
  if (!isPlainRecord(value)) throw new Error('project_context_invalid_shape');
  const keys = Object.keys(value).sort();
  if (keys.length !== PROJECT_CONTEXT_KEYS.length
      || keys.some((key, index) => key !== PROJECT_CONTEXT_KEYS[index])) {
    throw new Error('project_context_invalid_schema');
  }
  if (value.schema_version !== 'project-context.v1') throw new Error('project_context_schema_version_invalid');
  if (!hasText(value.work_item_id) || !UUID.test(value.work_item_id)) throw new Error('project_context_work_item_invalid');
  if (!hasText(value.installation_project_id) || !UUID.test(value.installation_project_id)) throw new Error('project_context_installation_project_invalid');
  if (!hasText(value.design_project_id) || !UUID.test(value.design_project_id)) throw new Error('project_context_design_project_invalid');
  if (!isPositiveInteger(value.workflow_version)) throw new Error('project_context_workflow_version_invalid');
  if (!isPositiveInteger(value.binding_version)) throw new Error('project_context_binding_version_invalid');
  if (value.binding_state !== 'ACTIVE') throw new Error('project_context_binding_not_active');
  if (!hasText(value.site_code)) throw new Error('project_context_site_invalid');
  if (!hasText(value.project_display_name)) throw new Error('project_context_display_name_invalid');
  if (value.installation_status !== 'active') {
    throw new Error('project_context_installation_status_invalid');
  }
  if (!hasText(value.issued_at) || !Number.isFinite(Date.parse(value.issued_at))) {
    throw new Error('project_context_issued_at_invalid');
  }
  return Object.freeze({ ...value }) as unknown as ProjectContextV1;
}
