/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewProject } from '../NewProject';

const rpc = vi.fn();
vi.mock('../../lib/supabase', () => ({ supabase: () => ({ rpc }) }));

describe('Field App NewProject atomic customer-job opening', () => {
  beforeEach(() => rpc.mockReset());
  afterEach(() => cleanup());

  it('calls rpc_open_customer_job without client-supplied site authority', async () => {
    rpc.mockResolvedValue({ data: { schema_version: 'project-context.v1' }, error: null });
    const onDone = vi.fn();
    render(<NewProject onDone={onDone} />);
    fireEvent.change(screen.getByPlaceholderText(/บ้านคุณสมชาย/), { target: { value: 'BAY HOTEL' } });
    fireEvent.click(screen.getByRole('button', { name: /สร้างบ้าน/ }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('rpc_open_customer_job');
    expect(args.p_request).toEqual({ project_display_name: 'BAY HOTEL', project_type: 'new_build' });
    expect(args.p_idempotency_key).toEqual(expect.any(String));
    expect(JSON.stringify(args)).not.toContain('BKK-HQ-01');
    expect(JSON.stringify(args)).not.toContain('site_code');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows blocked/ambiguous server scope without partial UI success', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'caller site authority is ambiguous' } });
    const onDone = vi.fn();
    render(<NewProject onDone={onDone} />);
    fireEvent.change(screen.getByPlaceholderText(/บ้านคุณสมชาย/), { target: { value: 'BAY HOTEL' } });
    fireEvent.click(screen.getByRole('button', { name: /สร้างบ้าน/ }));

    expect(await screen.findByText(/ambiguous/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
