/**
 * jobs/index.ts — Barrel export for jobs module
 */
export { type Job, type JobStatus, type CreateJobInput, type JobPanel, type JobCustomer } from './types';
export { JOB_STATUSES, JOB_STATUS_LABELS, JOB_STATUS_COLORS, canTransition, getNextStatuses, isTerminal, isActive } from './types';
export { useJobStore } from './jobStore';
export { CreateJobWizard } from './CreateJobWizard';
export { JobBoard } from './JobBoard';
