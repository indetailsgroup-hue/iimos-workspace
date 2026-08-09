import type { ProjectScope } from '../core/store/useProjectStore';

export function requireBoundDesignProjectId(scope: ProjectScope): string {
  if (scope.kind !== 'BOUND') throw new Error('bound_project_context_required');
  if (scope.context.installation_status !== 'active') throw new Error('active_project_context_required');
  return scope.context.design_project_id;
}
