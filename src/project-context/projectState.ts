import { parseAndValidateSafe } from '../core/gate/validateExternalState';
import { ProjectDataSchema } from '../core/schema/project.schema';
import { useCabinetStore } from '../core/store/useCabinetStore';
import { useDrillMapStore } from '../core/store/useDrillMapStore';
import { useSpecStore } from '../core/store/useSpecStore';
import { useVerifyStatusStore } from '../core/store/useVerifyStatusStore';
import { useGateStore } from '../gate/ui/gateStore';
import {
  hydrateProjectData,
  useProjectStore,
  type ProjectData,
} from '../core/store/useProjectStore';
import { parseProjectContextV1, type ProjectContextV1 } from './types';

export type BoundProjectLoadResult = 'CREATED' | 'LOADED' | 'QUARANTINED';

export function getBoundProjectStorageKey(designProjectId: string): string {
  return `monolith-bound-project:${designProjectId}`;
}

function identityMatches(left: ProjectContextV1, right: ProjectContextV1): boolean {
  return left.schema_version === right.schema_version
    && left.work_item_id === right.work_item_id
    && left.workflow_version === right.workflow_version
    && left.installation_project_id === right.installation_project_id
    && left.design_project_id === right.design_project_id
    && left.site_code === right.site_code
    && left.binding_version === right.binding_version
    && left.binding_state === right.binding_state
    && left.installation_status === right.installation_status;
}

function clearRuntimeProject(): void {
  useProjectStore.setState({
    metadata: null,
    isDirty: false,
    lastSaved: null,
    projectScope: { kind: 'NONE' },
  });
  useCabinetStore.setState({
    cabinets: [],
    cabinet: null,
    activeCabinetId: null,
    selectedPanelId: null,
  });
  useSpecStore.setState({
    specState: 'DRAFT',
    validation: null,
    gateStatus: {
      canFreeze: false,
      canRelease: false,
      canExport: false,
      blockers: ['Run validation first'],
    },
    syncStatus: 'pending',
    lastServerResponse: null,
    serverRevisionId: null,
    pendingTransition: null,
    releaseRecords: [],
    currentReleaseId: null,
  });
  useVerifyStatusStore.setState({ byJobId: {} });
  useDrillMapStore.getState().clearDrillMap();
  useGateStore.getState().reset();
}

function quarantine(designProjectId: string, raw: string): BoundProjectLoadResult {
  localStorage.setItem(`monolith-quarantine-bound-project:${designProjectId}:${Date.now()}`, raw);
  localStorage.removeItem(getBoundProjectStorageKey(designProjectId));
  clearRuntimeProject();
  return 'QUARANTINED';
}

export function clearBoundProject(): void {
  clearRuntimeProject();
}

export function newScratchProject(name = 'Untitled Project'): void {
  clearRuntimeProject();
  useProjectStore.getState().newProject(name);
}

export function loadBoundProject(candidate: ProjectContextV1): BoundProjectLoadResult {
  clearRuntimeProject();
  const expected = parseProjectContextV1(candidate);
  const key = getBoundProjectStorageKey(expected.design_project_id);
  const raw = localStorage.getItem(key);

  if (raw) {
    try {
      const envelope = JSON.parse(raw) as { project_context?: unknown; project?: unknown };
      const cachedContext = parseProjectContextV1(envelope.project_context);
      const serializedProject = JSON.stringify(envelope.project);
      const validation = parseAndValidateSafe(serializedProject, ProjectDataSchema, 'bound-project-cache');
      if (!identityMatches(expected, cachedContext) || !validation.ok) return quarantine(expected.design_project_id, raw);
      const project = envelope.project as ProjectData;
      if (project.metadata.id !== expected.design_project_id) return quarantine(expected.design_project_id, raw);
      hydrateProjectData(project);
      useProjectStore.setState({
        metadata: project.metadata,
        isDirty: false,
        lastSaved: project.metadata.updatedAt,
        projectScope: { kind: 'BOUND', context: expected },
      });
      return 'LOADED';
    } catch {
      return quarantine(expected.design_project_id, raw);
    }
  }

  useCabinetStore.getState().createCabinet('BASE', expected.project_display_name);
  const now = Date.now();
  useProjectStore.setState({
    metadata: {
      id: expected.design_project_id,
      name: expected.project_display_name,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
    },
    isDirty: false,
    lastSaved: null,
    projectScope: { kind: 'BOUND', context: expected },
  });
  useProjectStore.getState().saveProject();
  return 'CREATED';
}
