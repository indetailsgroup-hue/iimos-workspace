/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCabinetStore } from '../../core/store/useCabinetStore';
import { useDrillMapStore } from '../../core/store/useDrillMapStore';
import { useProjectStore } from '../../core/store/useProjectStore';
import { generateFactoryPacketPreviewFromStores } from '../../factory/packet/useFactoryPacket';
import { useGateStore } from '../../gate/ui/gateStore';
import { loadBoundProject } from '../projectState';
import type { ProjectContextV1 } from '../types';

const DESIGN_ID = '11111111-1111-4111-8111-111111111111';

function context(designProjectId = DESIGN_ID): ProjectContextV1 {
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
  };
}

beforeEach(() => {
  useCabinetStore.setState({ cabinets: [], cabinet: null, activeCabinetId: null });
  useDrillMapStore.setState({ drillMap: null });
  useGateStore.getState().reset();
  useCabinetStore.getState().createCabinet('BASE', 'Packet cabinet');
});

describe('ProjectContext identifier consumers', () => {
  it('uses server design_project_id for FactoryPacket.projectId while jobId remains a packet instance', async () => {
    useProjectStore.setState({
      metadata: { id: 'drifted-browser-id', name: 'drift', version: '1', createdAt: 1, updatedAt: 1 },
      projectScope: { kind: 'BOUND', context: context() },
    });

    const preview = await generateFactoryPacketPreviewFromStores();
    expect(preview.manifest.projectId).toBe(DESIGN_ID);
    expect(preview.manifest.jobId).toMatch(/^job-/);
    expect(preview.manifest.jobId).not.toBe(DESIGN_ID);
  });

  it('blocks packet generation from an unbound scratch workspace', async () => {
    useProjectStore.setState({ projectScope: { kind: 'SCRATCH' } });
    await expect(generateFactoryPacketPreviewFromStores()).rejects.toThrow('bound_project_context_required');
  });

  it.each(['completed', 'customer_review'])('blocks Factory packet generation for %s installation context', async (status) => {
    useProjectStore.setState({
      projectScope: {
        kind: 'BOUND',
        context: { ...context(), installation_status: status } as unknown as ProjectContextV1,
      },
    });

    await expect(generateFactoryPacketPreviewFromStores()).rejects.toThrow('active_project_context_required');
  });

  it('never carries project A drill-map or gate evidence into project B packet', async () => {
    const projectB = '22222222-2222-4222-8222-222222222222';
    loadBoundProject(context(DESIGN_ID));

    const staleDrillMap = {
      panels: [{
        panelId: 'PROJECT-A-PANEL',
        cabinetId: 'PROJECT-A-CABINET',
        role: 'SIDE',
        dimensions: { width: 600, height: 720, thickness: 18 },
        points: [],
      }],
      tools: [],
    };
    useDrillMapStore.setState({ drillMap: staleDrillMap as never });
    useGateStore.setState({
      lastResult: {
        policyVersion: 'project-a-policy',
        passed: true,
        runAt: '2026-08-09T01:00:00.000Z',
        findings: { blockers: [], warnings: [], info: [] },
      },
      validatedDrillMapRef: staleDrillMap as never,
    });

    loadBoundProject(context(projectB));
    const preview = await generateFactoryPacketPreviewFromStores();

    expect(useDrillMapStore.getState().drillMap).toBeNull();
    expect(useGateStore.getState().lastResult).toBeNull();
    expect(preview.manifest.projectId).toBe(projectB);
    expect(preview.parsed.drillmap?.panels).toEqual([]);
    expect(preview.parsed.gateResult).toMatchObject({
      policyVersion: '0.0.0',
      passed: false,
    });
  });

  it('binds validation routing to ProjectContext without renaming project keys as packet jobs', () => {
    const routes = readFileSync(join(process.cwd(), 'src/routes/index.tsx'), 'utf8');
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(routes).toContain('BoundProjectValidationPage');
    expect(routes).toMatch(/ProjectContextProvider designProjectId=\{projectId\}[\s\S]*ProjectValidationPage designProjectId=\{projectId\}/);
    expect(routes).not.toContain("const jobId = projectId || 'current'");
    expect(app).toContain('requireBoundDesignProjectId');
  });
});
