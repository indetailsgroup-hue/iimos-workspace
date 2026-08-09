/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBridgePayload, sendCutListToIimos } from '../fieldBridge';
import { FieldBridgeButton } from '../FieldBridgeButton';
import type { FactoryPacket } from '../../factory/packet/types';
import type { ProjectContextV1 } from '../../project-context/types';
import { useProjectStore } from '../../core/store/useProjectStore';

function activeContext(overrides: Partial<ProjectContextV1> = {}): ProjectContextV1 {
  return {
    schema_version: 'project-context.v1',
    work_item_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    workflow_version: 7,
    installation_project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    design_project_id: '11111111-1111-4111-8111-111111111111',
    site_code: 'BAY-HOTEL',
    project_display_name: 'BAY HOTEL',
    binding_version: 3,
    binding_state: 'ACTIVE',
    installation_status: 'active',
    issued_at: '2026-08-09T01:00:00.000Z',
    ...overrides,
  };
}

function fakePacket(): FactoryPacket {
  return {
    manifest: {
      jobId: 'JOB-1', projectId: activeContext().design_project_id, createdAt: '2026-07-09T00:00:00Z',
      toolVersion: 'test', files: [], contentHash: 'hash-abc',
      schema: 'factory-packet' as never, version: '1' as never,
    },
    drillMap: {} as never,
    connectors: {} as never,
    cutList: {
      version: 'cutlist.v1',
      rows: [
        { rowNo: 1, partId: 'p1', cabinetId: 'c1', materialId: 'HMR_15_WHITE', qty: 2, finishW: 600, finishH: 720, edgeBanding: [0, 0, 0, 0], premill: [0, 0, 0, 0] },
        { rowNo: 2, partId: 'p2', cabinetId: 'c1', materialId: 'HMR_15_WHITE', qty: 3, finishW: 400, finishH: 300, edgeBanding: [0, 0, 0, 0], premill: [0, 0, 0, 0] },
      ] as never,
      summary: { totalRows: 2, totalParts: 5, byMaterial: {} },
    } as never,
    gateResult: {} as never,
  } as FactoryPacket;
}

describe('tuple-bound Field Bridge v2', () => {
  it('builds the complete tuple exclusively from active ProjectContext', () => {
    const payload = buildBridgePayload(fakePacket(), activeContext(), 'mw-001', 'ตู้ครัว L');
    expect(payload).toMatchObject({
      p_work_item_id: activeContext().work_item_id,
      p_installation_project_id: activeContext().installation_project_id,
      p_design_project_id: activeContext().design_project_id,
      p_expected_binding_version: 3,
      p_package_code: 'MW-001',
      p_content_hash: 'hash-abc',
      p_client_key: 'JOB-1:hash-abc',
    });
  });

  it('calls v2 only and rejects an invalidated context before fetch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ imported: 2, skipped: 0, already: false }) });
    const context = activeContext();
    const payload = buildBridgePayload(fakePacket(), context, 'MW-001');
    await sendCutListToIimos(
      { url: 'https://demo.supabase.co', anonKey: 'anon', accessToken: 'tok' },
      context,
      payload,
      fetchImpl as unknown as typeof fetch,
    );
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://demo.supabase.co/rest/v1/rpc/rpc_bridge_import_cutlist_v2');
    expect(JSON.parse(init.body)).toEqual(payload);

    fetchImpl.mockClear();
    const invalidated = { ...context, binding_state: 'QUARANTINED' } as unknown as ProjectContextV1;
    await expect(sendCutListToIimos(
      { url: 'https://demo.supabase.co', anonKey: 'anon', accessToken: 'tok' },
      invalidated,
      payload,
      fetchImpl as unknown as typeof fetch,
    )).rejects.toThrow('project_context_');
    expect(fetchImpl).not.toHaveBeenCalled();

    const completed = { ...activeContext(), installation_status: 'completed' } as unknown as ProjectContextV1;
    const completedPayload = buildBridgePayload(fakePacket(), context, 'MW-001');
    await expect(sendCutListToIimos(
      { url: 'https://demo.supabase.co', anonKey: 'anon', accessToken: 'tok' },
      completed,
      completedPayload,
      fetchImpl as unknown as typeof fetch,
    )).rejects.toThrow('project_context_installation_status_invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('contains no editable, query, or session Work Item authority', () => {
    useProjectStore.setState({ projectScope: { kind: 'BOUND', context: activeContext() } });
    render(createElement(FieldBridgeButton));
    fireEvent.click(screen.getByRole('button', { name: /ส่งเข้าหน้างาน/ }));
    expect(screen.queryByPlaceholderText(/work item/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/วางเอง/)).not.toBeInTheDocument();

    const bridgeSource = readFileSync(join(process.cwd(), 'src/bridge/fieldBridge.ts'), 'utf8');
    const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(bridgeSource).not.toMatch(/readWorkItemFromUrl|FIELD_WORK_ITEM_KEY|rpc_bridge_import_cutlist['"`]/);
    expect(appSource).not.toMatch(/readWorkItemFromUrl|[?&]work_item/);
  });
});
