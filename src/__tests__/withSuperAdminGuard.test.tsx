/**
 * withSuperAdminGuard.test.tsx
 * Unit tests for the withSuperAdminGuard HOC.
 *
 * Covers:
 *   T-SG-01  renders wrapped component when user IS in super_admins table
 *   T-SG-02  renders <SuperAdminDenied> when user is NOT in super_admins table
 *   T-SG-03  renders <SuperAdminLoading> while the async check is in-flight
 *   T-SG-04  renders <SuperAdminDenied> with reason when a Supabase error occurs
 *   T-SG-05  renders <SuperAdminDenied> when no authenticated user is present
 *   T-SG-06  forwards all props unchanged to the wrapped component
 *   T-SG-07  cleanup — cancels async check on unmount (no state-update-after-unmount)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import withSuperAdminGuard, { SuperAdminDenied } from '../../admin/withSuperAdminGuard';

// ─── Supabase mock ────────────────────────────────────────────────────────────

jest.mock('../../core/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from '../../core/auth/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGetUser = supabase.auth.getUser as jest.MockedFunction<
  typeof supabase.auth.getUser
>;

/**
 * Configures `supabase.from('super_admins').select(...).eq(...).maybeSingle()`
 * to return the given response.
 */
function mockSuperAdminsQuery(response: {
  data: { user_id: string } | null;
  error: { message: string } | null;
}): void {
  (supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue(response),
      }),
    }),
  });
}

/** A simple component used as the wrapped target in all HOC tests. */
interface TargetProps {
  label: string;
  count?: number;
}

function TargetComponent({ label, count = 0 }: TargetProps): React.ReactElement {
  return (
    <div data-testid="target-component">
      <span data-testid="target-label">{label}</span>
      <span data-testid="target-count">{count}</span>
    </div>
  );
}

const GuardedTarget = withSuperAdminGuard(TargetComponent);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('withSuperAdminGuard HOC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── T-SG-01 ──────────────────────────────────────────────────────────────
  it('T-SG-01: renders wrapped component when user IS in super_admins table', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-superadmin-001' } },
      error: null,
    } as never);

    mockSuperAdminsQuery({
      data: { user_id: 'user-superadmin-001' },
      error: null,
    });

    render(<GuardedTarget label="Analytics Panel" count={42} />);

    // Loading state shown first
    expect(screen.getByTestId('super-admin-loading')).toBeInTheDocument();

    // After async resolves, wrapped component should appear
    await waitFor(() => {
      expect(screen.getByTestId('target-component')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('super-admin-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('super-admin-denied')).not.toBeInTheDocument();
  });

  // ── T-SG-02 ──────────────────────────────────────────────────────────────
  it('T-SG-02: renders SuperAdminDenied when user is NOT in super_admins table', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-regular-001' } },
      error: null,
    } as never);

    mockSuperAdminsQuery({ data: null, error: null });

    render(<GuardedTarget label="Analytics Panel" />);

    await waitFor(() => {
      expect(screen.getByTestId('super-admin-denied')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('target-component')).not.toBeInTheDocument();
    expect(screen.queryByTestId('super-admin-loading')).not.toBeInTheDocument();
    // No error reason should be shown when it is purely a denial (no error)
    expect(
      screen.queryByTestId('super-admin-denied-reason'),
    ).not.toBeInTheDocument();
  });

  // ── T-SG-03 ──────────────────────────────────────────────────────────────
  it('T-SG-03: renders SuperAdminLoading while the async check is in-flight', async () => {
    // Return a promise that never resolves so the check stays pending
    mockGetUser.mockReturnValue(new Promise(() => {}) as never);

    render(<GuardedTarget label="Analytics Panel" />);

    expect(screen.getByTestId('super-admin-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('target-component')).not.toBeInTheDocument();
    expect(screen.queryByTestId('super-admin-denied')).not.toBeInTheDocument();
  });

  // ── T-SG-04 ──────────────────────────────────────────────────────────────
  it('T-SG-04: renders SuperAdminDenied with error reason on Supabase query error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    } as never);

    mockSuperAdminsQuery({
      data: null,
      error: { message: 'relation "super_admins" does not exist' },
    });

    render(<GuardedTarget label="Analytics Panel" />);

    await waitFor(() => {
      expect(screen.getByTestId('super-admin-denied')).toBeInTheDocument();
    });

    const reason = screen.getByTestId('super-admin-denied-reason');
    expect(reason).toHaveTextContent('relation "super_admins" does not exist');
    expect(screen.queryByTestId('target-component')).not.toBeInTheDocument();
  });

  // ── T-SG-05 ──────────────────────────────────────────────────────────────
  it('T-SG-05: renders SuperAdminDenied when no authenticated user is present', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    // from() should NOT be called when user is null
    const fromSpy = supabase.from as jest.Mock;

    render(<GuardedTarget label="Analytics Panel" />);

    await waitFor(() => {
      expect(screen.getByTestId('super-admin-denied')).toBeInTheDocument();
    });

    // Confirms we did not make a DB query for an unauthenticated user
    expect(fromSpy).not.toHaveBeenCalled();
  });

  // ── T-SG-06 ──────────────────────────────────────────────────────────────
  it('T-SG-06: forwards all props unchanged to the wrapped component', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-superadmin-002' } },
      error: null,
    } as never);

    mockSuperAdminsQuery({
      data: { user_id: 'user-superadmin-002' },
      error: null,
    });

    render(<GuardedTarget label="Forwarded Label" count={99} />);

    await waitFor(() => {
      expect(screen.getByTestId('target-component')).toBeInTheDocument();
    });

    expect(screen.getByTestId('target-label')).toHaveTextContent(
      'Forwarded Label',
    );
    expect(screen.getByTestId('target-count')).toHaveTextContent('99');
  });

  // ── T-SG-07 ──────────────────────────────────────────────────────────────
  it('T-SG-07: does not update state after unmount (no act() warning)', async () => {
    // Resolve slowly so we can unmount before it completes
    let resolveUser!: (val: unknown) => void;
    const slowPromise = new Promise((res) => {
      resolveUser = res;
    });
    mockGetUser.mockReturnValue(slowPromise as never);

    const spy = jest.spyOn(console, 'error');

    const { unmount } = render(<GuardedTarget label="Panel" />);

    // Unmount before the promise resolves
    unmount();

    // Now resolve — the `cancelled` flag in the effect should prevent setState
    resolveUser({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    // Wait a tick to let any queued microtasks run
    await Promise.resolve();

    // React 18 raises an act() / no-op setState warning if state is set after unmount
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning:'),
    );

    spy.mockRestore();
  });

  // ── displayName ──────────────────────────────────────────────────────────
  it('sets displayName to withSuperAdminGuard(TargetComponent)', () => {
    expect(GuardedTarget.displayName).toBe(
      'withSuperAdminGuard(TargetComponent)',
    );
  });
});

// ─── SuperAdminDenied unit tests ─────────────────────────────────────────────

describe('SuperAdminDenied component', () => {
  it('renders access-denied heading and description', () => {
    render(<SuperAdminDenied />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText(/restricted to super-administrators/i),
    ).toBeInTheDocument();
  });

  it('renders reason when provided', () => {
    render(<SuperAdminDenied reason="Token expired" />);
    expect(screen.getByTestId('super-admin-denied-reason')).toHaveTextContent(
      'Token expired',
    );
  });

  it('does not render reason element when reason is omitted', () => {
    render(<SuperAdminDenied />);
    expect(
      screen.queryByTestId('super-admin-denied-reason'),
    ).not.toBeInTheDocument();
  });
});
