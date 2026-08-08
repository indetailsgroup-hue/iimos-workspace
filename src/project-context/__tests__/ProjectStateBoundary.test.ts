/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useCabinetStore } from '../../core/store/useCabinetStore';
import { useProjectStore } from '../../core/store/useProjectStore';
import { useSpecStore } from '../../core/store/useSpecStore';
import { useVerifyStatusStore } from '../../core/store/useVerifyStatusStore';
import {
  clearBoundProject,
  getBoundProjectStorageKey,
  loadBoundProject,
  newScratchProject,
} from '../projectState';
import type { ProjectContextV1 } from '../types';

const DESIGN_A = '11111111-1111-4111-8111-111111111111';
const DESIGN_B = '22222222-2222-4222-8222-222222222222';

function context(designProjectId: string, overrides: Partial<ProjectContextV1> = {}): ProjectContextV1 {
  return {
    schema_version: 'project-context.v1',
    work_item_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    workflow_version: 7,
    installation_project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    design_project_id: designProjectId,
    site_code: 'BAY-HOTEL',
    project_display_name: 'BAY HOTEL',
    binding_version: 3,
    binding_state: 'ACTIVE',
    installation_status: 'active',
    issued_at: '2026-08-09T01:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useProjectStore.setState({ metadata: null, isDirty: false, lastSaved: null });
  useCabinetStore.setState({ cabinets: [], cabinet: null, activeCabinetId: null, selectedPanelId: null });
  clearBoundProject();
});

describe('ProjectContext state boundary', () => {
  it('creates unbound scratch state without a cross-domain identity', () => {
    newScratchProject('Scratch');

    expect(useProjectStore.getState().metadata?.id).toMatch(/^proj-/);
    expect(useProjectStore.getState().projectScope).toEqual({ kind: 'SCRATCH' });
  });

  it('retains the server design ID and never overwrites scratch persistence', () => {
    localStorage.setItem('monolith-current-project', 'legacy-scratch-sentinel');

    expect(loadBoundProject(context(DESIGN_A))).toBe('CREATED');

    expect(useProjectStore.getState().metadata?.id).toBe(DESIGN_A);
    expect(useProjectStore.getState().projectScope).toMatchObject({
      kind: 'BOUND',
      context: { design_project_id: DESIGN_A },
    });
    expect(localStorage.getItem('monolith-current-project')).toBe('legacy-scratch-sentinel');
    expect(localStorage.getItem(getBoundProjectStorageKey(DESIGN_A))).toContain(DESIGN_A);
  });

  it('quarantines a cache whose server identity tuple does not match', () => {
    const expected = context(DESIGN_A);
    localStorage.setItem(getBoundProjectStorageKey(DESIGN_A), JSON.stringify({
      project_context: context(DESIGN_B),
      project: { metadata: { id: DESIGN_A } },
    }));

    expect(loadBoundProject(expected)).toBe('QUARANTINED');
    expect(localStorage.getItem(getBoundProjectStorageKey(DESIGN_A))).toBeNull();
    expect([...Array(localStorage.length)].map((_, index) => localStorage.key(index)))
      .toContainEqual(expect.stringContaining(`monolith-quarantine-bound-project:${DESIGN_A}:`));
    expect(useProjectStore.getState().metadata).toBeNull();
    expect(useCabinetStore.getState().cabinet).toBeNull();
  });

  it('clears the complete active project identity before a route switch', () => {
    expect(loadBoundProject(context(DESIGN_A))).toBe('CREATED');
    useSpecStore.setState({
      specState: 'RELEASED',
      pendingTransition: { type: 'REVOKE', queuedAt: '2026-08-09T02:00:00Z' },
      serverRevisionId: 'stale-revision',
    });
    useVerifyStatusStore.setState({ byJobId: { [DESIGN_A]: { loading: false } } });

    clearBoundProject();

    expect(useProjectStore.getState().metadata).toBeNull();
    expect(useProjectStore.getState().projectScope).toEqual({ kind: 'NONE' });
    expect(useCabinetStore.getState()).toMatchObject({ cabinets: [], cabinet: null, activeCabinetId: null });
    expect(useSpecStore.getState()).toMatchObject({
      specState: 'DRAFT',
      pendingTransition: null,
      serverRevisionId: null,
    });
    expect(useVerifyStatusStore.getState().byJobId).toEqual({});
  });
});
