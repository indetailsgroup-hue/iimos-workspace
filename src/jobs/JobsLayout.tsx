/**
 * jobs/JobsLayout.tsx — Layout wrapper for all /jobs/* routes
 *
 * Provides:
 * - NotificationToastContainer (top-right)
 * - useJobStatusToast wired to useJobBoardRealtime events
 * - Shared toast context for all job pages
 *
 * @version 15.4.0
 */

import React, { useEffect, useRef } from 'react';
import { useToast, NotificationToastContainer } from '../core/ui/NotificationToast';
import { useJobBoardRealtime, type RealtimeJobEvent } from './useJobBoardRealtime';
import { useJobStatusToast } from './useJobStatusToast';
import { useJobStore } from './jobStore';

// ============================================================================
// Component
// ============================================================================

export interface JobsLayoutProps {
  children: React.ReactNode;
}

export function JobsLayout({ children }: JobsLayoutProps): React.ReactElement {
  const jobs = useJobStore((s) => s.jobs);
  const toast = useToast(5);
  const { handleEvent } = useJobStatusToast(toast);

  // Wire realtime events into toast system
  const realtime = useJobBoardRealtime(jobs);
  const prevEventCountRef = useRef(realtime.eventCount);

  // Subscribe to realtime store and detect new events
  useEffect(() => {
    // Subscribe to job store changes via realtime
    const unsub = useJobStore.subscribe((state, prevState) => {
      // Detect inserts
      if (state.jobs.length > prevState.jobs.length) {
        const newJobs = state.jobs.filter(
          (j) => !prevState.jobs.some((pj) => pj.jobId === j.jobId),
        );
        for (const job of newJobs) {
          handleEvent({
            eventType: 'INSERT',
            job: { jobId: job.jobId, jobCode: job.jobCode, status: job.status },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Detect status changes
      for (const job of state.jobs) {
        const prev = prevState.jobs.find((pj) => pj.jobId === job.jobId);
        if (prev && prev.status !== job.status) {
          handleEvent({
            eventType: 'UPDATE',
            job: { jobId: job.jobId, jobCode: job.jobCode, status: job.status },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Detect deletes
      if (state.jobs.length < prevState.jobs.length) {
        const deleted = prevState.jobs.filter(
          (pj) => !state.jobs.some((j) => j.jobId === pj.jobId),
        );
        for (const job of deleted) {
          handleEvent({
            eventType: 'DELETE',
            job: { jobId: job.jobId, jobCode: job.jobCode },
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    return unsub;
  }, [handleEvent]);

  return (
    <div data-testid="jobs-layout">
      {children}
      <NotificationToastContainer
        toasts={toast.toasts}
        onDismiss={toast.removeToast}
        position="top-right"
      />
    </div>
  );
}

export default JobsLayout;
