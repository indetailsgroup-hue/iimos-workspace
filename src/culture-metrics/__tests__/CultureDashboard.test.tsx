/**
 * src/culture-metrics/__tests__/CultureDashboard.test.tsx
 *
 * MONOLITH v17.5 — Vitest unit tests for CultureDashboard component
 *
 * Coverage:
 *   Plan gate        — FREE/STARTER blocked; PROFESSIONAL/ENTERPRISE pass
 *   Loading          — isLoading / isEnpsLoading → dashboard-loading
 *   Error banner     — error string → error-banner shown
 *   Surveys section  — no-surveys empty state; survey-card count;
 *                      survey-activate-btn (admin + DRAFT only);
 *                      survey-close-btn (admin + ACTIVE only);
 *                      activateEnpsSurvey / closeEnpsSurvey called correctly
 *   eNPS results     — nps-score-display above threshold; nps-hidden below
 *   Org health       — no-health-data empty state; health-metric-row count
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CultureDashboard from '../CultureDashboard';
import { useCultureMetricsStore } from '../cultureMetricsStore';
import type { CmdEnpsSurvey, CmdEnpsResults, CmdOrgHealth } from '../cultureMetricsTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Auto-mock the Zustand store
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../cultureMetricsStore');

// ─────────────────────────────────────────────────────────────────────────────
// Store factory
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeStore = (overrides: Record<string, any> = {}) => ({
  metricDefinitions:      [],
  snapshots:              [],
  orgHealth:              [] as CmdOrgHealth[],
  enpsSurveys:            [] as CmdEnpsSurvey[],
  enpsResults:            [] as CmdEnpsResults[],
  filters:                { metricCategory: 'ALL', periodType: 'ALL', fromDate: null, toDate: null },
  isLoading:              false,
  isSnapshotLoading:      false,
  isEnpsLoading:          false,
  error:                  null,
  fetchMetricDefinitions: vi.fn(),
  createMetricDefinition: vi.fn(),
  updateMetricDefinition: vi.fn(),
  recordSnapshot:         vi.fn(),
  fetchSnapshots:         vi.fn(),
  fetchOrgHealth:         vi.fn(),
  createEnpsSurvey:       vi.fn(),
  activateEnpsSurvey:     vi.fn(),
  closeEnpsSurvey:        vi.fn(),
  submitEnpsResponse:     vi.fn(),
  fetchEnpsSurveys:       vi.fn(),
  fetchEnpsResults:       vi.fn(),
  setFilters:             vi.fn(),
  clearError:             vi.fn(),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Sample data
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_SURVEY: CmdEnpsSurvey = {
  id:               'survey-draft',
  orgId:            'org-1',
  title:            'Q1 2027 eNPS Survey',
  titleTh:          'แบบสำรวจ eNPS Q1 2027',
  status:           'DRAFT',
  questionText:     'How likely are you to recommend working here?',
  followupQuestion: 'Why?',
  opensAt:          null,
  closesAt:         null,
  minResponses:     3,
  notes:            null,
  createdBy:        'user-1',
  createdAt:        '2027-01-01T00:00:00Z',
  updatedAt:        '2027-01-01T00:00:00Z',
};

const ACTIVE_SURVEY: CmdEnpsSurvey = {
  ...DRAFT_SURVEY,
  id:       'survey-active',
  status:   'ACTIVE',
  opensAt:  '2026-12-01T00:00:00Z',
  closesAt: '2026-12-31T00:00:00Z',
};

const CLOSED_SURVEY: CmdEnpsSurvey = {
  ...DRAFT_SURVEY,
  id:       'survey-closed',
  status:   'CLOSED',
  opensAt:  '2026-09-01T00:00:00Z',
  closesAt: '2026-09-30T00:00:00Z',
};

/** totalResponses (10) >= minResponses (3) → score revealed */
const RESULT_ABOVE: CmdEnpsResults = {
  surveyId:       'survey-closed',
  orgId:          'org-1',
  title:          'Q3 2026 eNPS',
  status:         'CLOSED',
  closesAt:       '2026-09-30T00:00:00Z',
  minResponses:   3,
  totalResponses: 10,
  promoterCount:  6,
  passiveCount:   2,
  detractorCount: 2,
  npsScore:       40,
  avgScore:       7.8,
};

/** totalResponses (2) < minResponses (3) → score hidden */
const RESULT_BELOW: CmdEnpsResults = {
  surveyId:       'survey-active',
  orgId:          'org-1',
  title:          'Q4 2026 eNPS',
  status:         'ACTIVE',
  closesAt:       '2026-12-31T00:00:00Z',
  minResponses:   3,
  totalResponses: 2,
  promoterCount:  1,
  passiveCount:   1,
  detractorCount: 0,
  npsScore:       0,
  avgScore:       6.0,
};

const HEALTH_ROWS: CmdOrgHealth[] = [
  {
    orgId:                 'org-1',
    metricId:              'metric-engagement',
    displayName:           'Employee Engagement',
    displayNameTh:         'ความผูกพันพนักงาน',
    metricCategory:        'ENGAGEMENT',
    metricSource:          'SURVEY',
    targetScore:           80,
    warningThreshold:      60,
    criticalThreshold:     40,
    healthWeight:          0.3,
    latestScore:           72,
    latestRespondentCount: 45,
    latestPeriod:          '2026-Q3',
    latestSnapshotDate:    '2026-09-30',
    healthStatus:          'HEALTHY',
  },
  {
    orgId:                 'org-1',
    metricId:              'metric-training',
    displayName:           'Training Completion',
    displayNameTh:         'อัตราการเรียนรู้สำเร็จ',
    metricCategory:        'TRAINING',
    metricSource:          'SYSTEM',
    targetScore:           90,
    warningThreshold:      70,
    criticalThreshold:     50,
    healthWeight:          0.2,
    latestScore:           65,
    latestRespondentCount: 50,
    latestPeriod:          '2026-Q3',
    latestSnapshotDate:    '2026-09-30',
    healthStatus:          'WARNING',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Re-bind the mock before each test with a fresh store state */
function seedStore(overrides: Record<string, unknown> = {}) {
  vi.mocked(useCultureMetricsStore).mockReturnValue(
    makeStore(overrides) as ReturnType<typeof useCultureMetricsStore>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CultureDashboard', () => {
  beforeEach(() => {
    seedStore();
  });

  // ── Plan gate ──────────────────────────────────────────────────────────────
  describe('plan gate', () => {
    it('shows plan-gate-wall and hides culture-dashboard for FREE plan', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'FREE' as any} />);
      expect(screen.getByTestId('plan-gate-wall')).toBeInTheDocument();
      expect(screen.queryByTestId('culture-dashboard')).not.toBeInTheDocument();
    });

    it('shows plan-gate-wall and hides culture-dashboard for STARTER plan', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'STARTER' as any} />);
      expect(screen.getByTestId('plan-gate-wall')).toBeInTheDocument();
      expect(screen.queryByTestId('culture-dashboard')).not.toBeInTheDocument();
    });

    it('shows culture-dashboard and hides plan-gate-wall for PROFESSIONAL plan', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('culture-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('plan-gate-wall')).not.toBeInTheDocument();
    });

    it('shows culture-dashboard and hides plan-gate-wall for ENTERPRISE plan', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'ENTERPRISE' as any} />);
      expect(screen.getByTestId('culture-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('plan-gate-wall')).not.toBeInTheDocument();
    });
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  describe('loading state', () => {
    it('shows dashboard-loading when isLoading is true', () => {
      seedStore({ isLoading: true });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('shows dashboard-loading when isEnpsLoading is true', () => {
      seedStore({ isEnpsLoading: true });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('does not show dashboard-loading when both isLoading and isEnpsLoading are false', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });
  });

  // ── Error banner ───────────────────────────────────────────────────────────
  describe('error banner', () => {
    it('renders error-banner when store has an error', () => {
      seedStore({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('does not render error-banner when error is null', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
    });
  });

  // ── Surveys section ────────────────────────────────────────────────────────
  describe('surveys section', () => {
    it('shows no-surveys when enpsSurveys is empty', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('no-surveys')).toBeInTheDocument();
    });

    it('renders the correct number of survey-card elements', () => {
      seedStore({ enpsSurveys: [DRAFT_SURVEY, ACTIVE_SURVEY, CLOSED_SURVEY] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getAllByTestId('survey-card')).toHaveLength(3);
    });

    it('shows survey-activate-btn for admin with a DRAFT survey', () => {
      seedStore({ enpsSurveys: [DRAFT_SURVEY] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin />);
      expect(screen.getByTestId('survey-activate-btn')).toBeInTheDocument();
    });

    it('hides survey-activate-btn for non-admin with a DRAFT survey', () => {
      seedStore({ enpsSurveys: [DRAFT_SURVEY] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin={false} />);
      expect(screen.queryByTestId('survey-activate-btn')).not.toBeInTheDocument();
    });

    it('shows survey-close-btn for admin with an ACTIVE survey', () => {
      seedStore({ enpsSurveys: [ACTIVE_SURVEY] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin />);
      expect(screen.getByTestId('survey-close-btn')).toBeInTheDocument();
    });

    it('hides survey-close-btn for admin with a DRAFT survey', () => {
      seedStore({ enpsSurveys: [DRAFT_SURVEY] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin />);
      expect(screen.queryByTestId('survey-close-btn')).not.toBeInTheDocument();
    });

    it('hides survey-close-btn for admin with a CLOSED survey', () => {
      seedStore({ enpsSurveys: [CLOSED_SURVEY] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin />);
      expect(screen.queryByTestId('survey-close-btn')).not.toBeInTheDocument();
    });

    it('calls activateEnpsSurvey(orgId, orgPlan, surveyId) when activate btn is clicked', () => {
      const activateEnpsSurvey = vi.fn();
      seedStore({ enpsSurveys: [DRAFT_SURVEY], activateEnpsSurvey });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin />);
      fireEvent.click(screen.getByTestId('survey-activate-btn'));
      expect(activateEnpsSurvey).toHaveBeenCalledWith('org-1', 'PROFESSIONAL', 'survey-draft');
    });

    it('calls closeEnpsSurvey(orgId, orgPlan, surveyId) when close btn is clicked', () => {
      const closeEnpsSurvey = vi.fn();
      seedStore({ enpsSurveys: [ACTIVE_SURVEY], closeEnpsSurvey });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} isAdmin />);
      fireEvent.click(screen.getByTestId('survey-close-btn'));
      expect(closeEnpsSurvey).toHaveBeenCalledWith('org-1', 'PROFESSIONAL', 'survey-active');
    });
  });

  // ── eNPS results ───────────────────────────────────────────────────────────
  describe('eNPS results', () => {
    it('shows nps-score-display when totalResponses >= minResponses', () => {
      seedStore({ enpsResults: [RESULT_ABOVE] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('nps-score-display')).toBeInTheDocument();
      expect(screen.queryByTestId('nps-hidden')).not.toBeInTheDocument();
    });

    it('shows nps-hidden when totalResponses < minResponses', () => {
      seedStore({ enpsResults: [RESULT_BELOW] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('nps-hidden')).toBeInTheDocument();
      expect(screen.queryByTestId('nps-score-display')).not.toBeInTheDocument();
    });

    it('shows both nps-score-display and nps-hidden when results have mixed threshold states', () => {
      seedStore({ enpsResults: [RESULT_ABOVE, RESULT_BELOW] });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('nps-score-display')).toBeInTheDocument();
      expect(screen.getByTestId('nps-hidden')).toBeInTheDocument();
    });
  });

  // ── Org health section ─────────────────────────────────────────────────────
  describe('org health section', () => {
    it('shows no-health-data when orgHealth is empty', () => {
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getByTestId('no-health-data')).toBeInTheDocument();
    });

    it('renders the correct number of health-metric-row elements', () => {
      seedStore({ orgHealth: HEALTH_ROWS });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.getAllByTestId('health-metric-row')).toHaveLength(2);
    });

    it('does not show no-health-data when orgHealth rows are present', () => {
      seedStore({ orgHealth: HEALTH_ROWS });
      render(<CultureDashboard orgId="org-1" orgPlan={'PROFESSIONAL' as any} />);
      expect(screen.queryByTestId('no-health-data')).not.toBeInTheDocument();
    });
  });
});
