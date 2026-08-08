/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectContextGate } from '../ProjectContextGate';
import { ProjectContextProvider, type ProjectContextResolver } from '../ProjectContextProvider';
import type { ProjectContextV1 } from '../types';
import { parseProjectContextV1 } from '../types';
import { useProjectStore } from '../../core/store/useProjectStore';

const PROJECT_A = '11111111-1111-4111-8111-111111111111';
const PROJECT_B = '22222222-2222-4222-8222-222222222222';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Harness({ projectId, resolveContext }: {
  projectId: string;
  resolveContext: ProjectContextResolver;
}) {
  return (
    <ProjectContextProvider designProjectId={projectId} resolveContext={resolveContext}>
      <ProjectContextGate routeProjectId={projectId}>
        <div>DESIGNER_MOUNTED</div>
      </ProjectContextGate>
    </ProjectContextProvider>
  );
}

afterEach(() => cleanup());

describe('ProjectContextGate', () => {
  it('mounts the designer only after an exact active server context resolves', async () => {
    render(<Harness projectId={PROJECT_A} resolveContext={vi.fn().mockResolvedValue(context(PROJECT_A))} />);

    expect(screen.queryByText('DESIGNER_MOUNTED')).not.toBeInTheDocument();
    expect(screen.getByTestId('project-context-loading')).toBeInTheDocument();
    expect(await screen.findByText('DESIGNER_MOUNTED')).toBeInTheDocument();
  });

  it('prevents a late A response from replacing the newer B route context', async () => {
    const a = deferred<ProjectContextV1>();
    const b = deferred<ProjectContextV1>();
    const signals: AbortSignal[] = [];
    const resolver: ProjectContextResolver = vi.fn((id, signal) => {
      signals.push(signal);
      return id === PROJECT_A ? a.promise : b.promise;
    });
    const view = render(<Harness projectId={PROJECT_A} resolveContext={resolver} />);

    view.rerender(<Harness projectId={PROJECT_B} resolveContext={resolver} />);
    b.resolve(context(PROJECT_B));
    expect(await screen.findByText('DESIGNER_MOUNTED')).toBeInTheDocument();

    a.resolve(context(PROJECT_A));
    await Promise.resolve();
    expect(screen.getByText('DESIGNER_MOUNTED')).toBeInTheDocument();
    expect(screen.queryByTestId('project-context-blocked')).not.toBeInTheDocument();
    expect(useProjectStore.getState().metadata?.id).toBe(PROJECT_B);
    expect(signals[0].aborted).toBe(true);
  });

  it.each([
    ['server unavailable', new Error('network unavailable')],
    ['unauthorized', new Error('insufficient project context authority')],
  ])('fails closed when %s', async (_label, error) => {
    render(<Harness projectId={PROJECT_A} resolveContext={vi.fn().mockRejectedValue(error)} />);

    expect(await screen.findByTestId('project-context-blocked')).toBeInTheDocument();
    expect(screen.queryByText('DESIGNER_MOUNTED')).not.toBeInTheDocument();
  });

  it('fails closed when the resolved context does not match the route', async () => {
    render(<Harness projectId={PROJECT_A} resolveContext={vi.fn().mockResolvedValue(context(PROJECT_B))} />);

    expect(await screen.findByTestId('project-context-blocked')).toHaveTextContent('route_context_mismatch');
    expect(screen.queryByText('DESIGNER_MOUNTED')).not.toBeInTheDocument();
  });

  it('fails closed for a quarantined binding', async () => {
    const quarantined = context(PROJECT_A, { binding_state: 'QUARANTINED' as ProjectContextV1['binding_state'] });
    render(<Harness projectId={PROJECT_A} resolveContext={vi.fn().mockResolvedValue(quarantined)} />);

    expect(await screen.findByTestId('project-context-blocked')).toBeInTheDocument();
    expect(screen.queryByText('DESIGNER_MOUNTED')).not.toBeInTheDocument();
  });

  it.each([
    ['cancelled installation', context(PROJECT_A, { installation_status: 'cancelled' })],
    ['unexpected field', { ...context(PROJECT_A), project_context_id: PROJECT_A }],
    ['missing authority field', (() => {
      const candidate = { ...context(PROJECT_A) } as Partial<ProjectContextV1>;
      delete candidate.site_code;
      return candidate;
    })()],
  ])('rejects malformed server contracts: %s', (_label, candidate) => {
    expect(() => parseProjectContextV1(candidate)).toThrow(/project_context_/);
  });

  it('aborts the active request when the guarded route unmounts', async () => {
    const request = deferred<ProjectContextV1>();
    let observedSignal: AbortSignal | undefined;
    const resolver: ProjectContextResolver = vi.fn((_id, signal) => {
      observedSignal = signal;
      return request.promise;
    });
    const view = render(<Harness projectId={PROJECT_A} resolveContext={resolver} />);

    view.unmount();
    await waitFor(() => expect(observedSignal?.aborted).toBe(true));
  });
});
