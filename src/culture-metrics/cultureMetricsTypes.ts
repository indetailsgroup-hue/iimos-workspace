/**
 * src/culture-metrics/cultureMetricsTypes.ts
 *
 * MONOLITH v17.5 — Culture Metrics Dashboard Module: TypeScript types
 *
 * Tracks org-level culture health metrics, eNPS surveys, and engagement trends.
 * Aggregates data from ps_scores, anonymous_feedback, and SuperEmployee
 * stage distributions into a unified org health dashboard.
 *
 * Plan Gate: PROFESSIONAL+ (PROFESSIONAL or ENTERPRISE)
 *
 * Key design decisions:
 *  - cmd_enps_responses stores NO user_id — same anonymity model as anonymous_feedback
 *  - NPS results hidden until respondent_count >= min_responses (default 3)
 *  - metric_snapshots are immutable after creation (one row per metric per period)
 *  - health_weight per metric allows a configurable weighted org health score
 */

import type { OrgPlan } from '../tenant/types';

// ============================================================================
// ENUM UNIONS (mirror Postgres ENUM types)
// ============================================================================

export type CmdMetricCategory =
  | 'ENGAGEMENT'
  | 'PSYCHOLOGICAL_SAFETY'
  | 'COLLABORATION'
  | 'SATISFACTION'
  | 'PRODUCTIVITY'
  | 'LEADERSHIP'
  | 'AI_READINESS'
  | 'CUSTOM';

export type CmdMetricSource =
  | 'PS_SURVEY'
  | 'ENPS'
  | 'SUPER_EMPLOYEE'
  | 'MANUAL'
  | 'ATTENDANCE'
  | 'OTHER';

export type CmdSnapshotPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export type CmdEnpsStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

/** Derived from eNPS score: Promoter (9–10), Passive (7–8), Detractor (0–6) */
export type CmdEnpsCategory = 'PROMOTER' | 'PASSIVE' | 'DETRACTOR';

/** Derived health band from score vs thresholds */
export type CmdHealthStatus = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'ON_TARGET';

// ============================================================================
// DB ROW TYPES (snake_case — mirrors Supabase columns)
// ============================================================================

export interface MetricDefinitionRow {
  id: string;
  org_id: string;
  metric_category: CmdMetricCategory;
  metric_source: CmdMetricSource;
  display_name: string;
  display_name_th: string | null;
  min_score: number;
  max_score: number;
  target_score: number | null;
  warning_threshold: number | null;
  critical_threshold: number | null;
  health_weight: number;
  is_active: boolean;
  is_system: boolean;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricSnapshotRow {
  id: string;
  org_id: string;
  metric_id: string;
  period_type: CmdSnapshotPeriod;
  period_label: string;
  snapshot_date: string;
  score: number;
  respondent_count: number;
  notes: string | null;
  source_ref_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface EnpsSurveyRow {
  id: string;
  org_id: string;
  title: string;
  title_th: string | null;
  status: CmdEnpsStatus;
  question_text: string;
  followup_question: string | null;
  opens_at: string | null;
  closes_at: string | null;
  min_responses: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnpsResponseRow {
  id: string;
  org_id: string;
  survey_id: string;
  score: number;
  followup_text: string | null;
  anonymous_token: string;
  department_label: string | null;
  submitted_at: string;
}

export interface OrgHealthRow {
  org_id: string;
  metric_id: string;
  display_name: string;
  display_name_th: string | null;
  metric_category: CmdMetricCategory;
  metric_source: CmdMetricSource;
  target_score: number | null;
  warning_threshold: number | null;
  critical_threshold: number | null;
  health_weight: number;
  latest_score: number;
  latest_respondent_count: number;
  latest_period: string;
  latest_snapshot_date: string;
  health_status: CmdHealthStatus;
}

export interface EnpsResultsRow {
  survey_id: string;
  org_id: string;
  title: string;
  status: CmdEnpsStatus;
  closes_at: string | null;
  min_responses: number;
  total_responses: number;
  promoter_count: number | null;
  passive_count: number | null;
  detractor_count: number | null;
  nps_score: number | null;
  avg_score: number | null;
}

// ============================================================================
// APP-LAYER TYPES (camelCase for React/Zustand layer)
// ============================================================================

export interface CmdMetricDefinition {
  id: string;
  orgId: string;
  metricCategory: CmdMetricCategory;
  metricSource: CmdMetricSource;
  displayName: string;
  displayNameTh: string | null;
  minScore: number;
  maxScore: number;
  targetScore: number | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  healthWeight: number;
  isActive: boolean;
  isSystem: boolean;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmdMetricSnapshot {
  id: string;
  orgId: string;
  metricId: string;
  periodType: CmdSnapshotPeriod;
  periodLabel: string;
  snapshotDate: string;
  score: number;
  respondentCount: number;
  notes: string | null;
  sourceRefId: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface CmdEnpsSurvey {
  id: string;
  orgId: string;
  title: string;
  titleTh: string | null;
  status: CmdEnpsStatus;
  questionText: string;
  followupQuestion: string | null;
  opensAt: string | null;
  closesAt: string | null;
  minResponses: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmdEnpsResponse {
  id: string;
  orgId: string;
  surveyId: string;
  score: number;
  followupText: string | null;
  anonymousToken: string;
  departmentLabel: string | null;
  submittedAt: string;
}

export interface CmdOrgHealth {
  orgId: string;
  metricId: string;
  displayName: string;
  displayNameTh: string | null;
  metricCategory: CmdMetricCategory;
  metricSource: CmdMetricSource;
  targetScore: number | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  healthWeight: number;
  latestScore: number;
  latestRespondentCount: number;
  latestPeriod: string;
  latestSnapshotDate: string;
  healthStatus: CmdHealthStatus;
  minScore?: number;
  maxScore?: number;
}

export interface CmdEnpsResults {
  surveyId: string;
  orgId: string;
  title: string;
  status: CmdEnpsStatus;
  closesAt: string | null;
  minResponses: number;
  totalResponses: number;
  promoterCount: number | null;
  passiveCount: number | null;
  detractorCount: number | null;
  npsScore: number | null;
  avgScore: number | null;
}

// ============================================================================
// PAYLOADS (for store actions)
// ============================================================================

export interface CreateMetricDefinitionPayload {
  metricCategory: CmdMetricCategory;
  metricSource: CmdMetricSource;
  displayName: string;
  displayNameTh?: string;
  minScore?: number;
  maxScore?: number;
  targetScore?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  healthWeight?: number;
  description?: string;
}

export interface RecordSnapshotPayload {
  metricId: string;
  periodType: CmdSnapshotPeriod;
  periodLabel: string;
  snapshotDate: string;
  score: number;
  respondentCount?: number;
  notes?: string;
  sourceRefId?: string;
}

export interface CreateEnpsSurveyPayload {
  title: string;
  titleTh?: string;
  questionText?: string;
  followupQuestion?: string;
  opensAt?: string;
  closesAt?: string;
  minResponses?: number;
  notes?: string;
}

export interface SubmitEnpsResponsePayload {
  surveyId: string;
  score: number;
  followupText?: string;
  anonymousToken: string;
  departmentLabel?: string;
}

// ============================================================================
// PLAN GATE
// ============================================================================

/**
 * Returns true if the org plan grants access to Culture Metrics Dashboard.
 * PROFESSIONAL+ — available to PROFESSIONAL and ENTERPRISE plans.
 */
export function canAccessCultureMetrics(orgPlan: OrgPlan | string): boolean {
  return orgPlan === 'PROFESSIONAL' || orgPlan === 'ENTERPRISE';
}

export class CultureMetricsPlanGateError extends Error {
  public readonly plan: string | undefined;

  constructor(orgPlan?: string) {
    super(
      `Culture Metrics Dashboard requires PROFESSIONAL or ENTERPRISE plan${orgPlan ? ` (current: ${orgPlan})` : ''}`
    );
    this.name = 'CultureMetricsPlanGateError';
    this.plan = orgPlan;
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CMD_PLAN_GATE_PLANS: OrgPlan[] = ['PROFESSIONAL', 'ENTERPRISE'];

/** Minimum responses before eNPS results are revealed */
export const CMD_ENPS_MIN_RESPONSES = 3;

/** Display labels for metric category (Thai) */
export const CMD_METRIC_CATEGORY_LABEL_TH: Record<CmdMetricCategory, string> = {
  ENGAGEMENT:           'ความผูกพันของพนักงาน',
  PSYCHOLOGICAL_SAFETY: 'ความปลอดภัยทางจิตใจ',
  COLLABORATION:        'การทำงานร่วมกัน',
  SATISFACTION:         'ความพึงพอใจในงาน',
  PRODUCTIVITY:         'ประสิทธิภาพการผลิต',
  LEADERSHIP:           'ประสิทธิผลของผู้นำ',
  AI_READINESS:         'ความพร้อมด้าน AI',
  CUSTOM:               'ตัวชี้วัดกำหนดเอง',
};

/** Display labels for snapshot period (Thai) */
export const CMD_SNAPSHOT_PERIOD_LABEL_TH: Record<CmdSnapshotPeriod, string> = {
  WEEKLY:    'รายสัปดาห์',
  MONTHLY:   'รายเดือน',
  QUARTERLY: 'รายไตรมาส',
  ANNUAL:    'รายปี',
};

/** Display labels for eNPS status (Thai) */
export const CMD_ENPS_STATUS_LABEL_TH: Record<CmdEnpsStatus, string> = {
  DRAFT:  'แบบร่าง',
  ACTIVE: 'เปิดรับคำตอบ',
  CLOSED: 'ปิดการสำรวจ',
};

/** Display labels for health status (Thai) */
export const CMD_HEALTH_STATUS_LABEL_TH: Record<CmdHealthStatus, string> = {
  CRITICAL:  'วิกฤต',
  WARNING:   'ต้องระวัง',
  NORMAL:    'ปกติ',
  ON_TARGET: 'ผ่านเป้าหมาย',
};

/** Colour class per health status (Tailwind) */
export const CMD_HEALTH_STATUS_COLOR: Record<CmdHealthStatus, string> = {
  CRITICAL:  'text-red-600 bg-red-50',
  WARNING:   'text-amber-600 bg-amber-50',
  NORMAL:    'text-gray-600 bg-gray-50',
  ON_TARGET: 'text-emerald-600 bg-emerald-50',
};

/** eNPS score category classifier */
export function classifyEnpsScore(score: number): CmdEnpsCategory {
  if (score >= 9) return 'PROMOTER';
  if (score >= 7) return 'PASSIVE';
  return 'DETRACTOR';
}

/**
 * Computes the weighted org health score from a set of CmdOrgHealth metrics.
 * Scores are normalised to 0–100, weighted by health_weight.
 * Returns null if no active metrics.
 */
export function computeWeightedHealthScore(metrics: CmdOrgHealth[]): number | null {
  if (metrics.length === 0) return null;
  const totalWeight = metrics.reduce((s, m) => s + m.healthWeight, 0);
  if (totalWeight <= 0) return null;
  const weightedSum = metrics.reduce((s, m) => {
    const range = m.healthWeight > 0 ? m.healthWeight : 0;
    // Normalise each score to 0–100 range
    const metricRange = (m.maxScore ?? 100) - (m.minScore ?? 0);
    const normalised = metricRange > 0
      ? ((m.latestScore - (m.minScore ?? 0)) / metricRange) * 100
      : m.latestScore;
    return s + (normalised * range);
  }, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

// ============================================================================
// FILTERS
// ============================================================================

export interface CmdFilters {
  metricCategory: CmdMetricCategory | 'ALL';
  periodType: CmdSnapshotPeriod | 'ALL';
  fromDate: string | null;
  toDate: string | null;
}

export const DEFAULT_CMD_FILTERS: CmdFilters = {
  metricCategory: 'ALL',
  periodType:     'ALL',
  fromDate:       null,
  toDate:         null,
};

// ============================================================================
// MAPPERS (DB row → app type)
// ============================================================================

export function mapMetricDefinitionRow(row: MetricDefinitionRow): CmdMetricDefinition {
  return {
    id: row.id,
    orgId: row.org_id,
    metricCategory: row.metric_category,
    metricSource: row.metric_source,
    displayName: row.display_name,
    displayNameTh: row.display_name_th,
    minScore: Number(row.min_score),
    maxScore: Number(row.max_score),
    targetScore: row.target_score != null ? Number(row.target_score) : null,
    warningThreshold: row.warning_threshold != null ? Number(row.warning_threshold) : null,
    criticalThreshold: row.critical_threshold != null ? Number(row.critical_threshold) : null,
    healthWeight: Number(row.health_weight),
    isActive: row.is_active,
    isSystem: row.is_system,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMetricSnapshotRow(row: MetricSnapshotRow): CmdMetricSnapshot {
  return {
    id: row.id,
    orgId: row.org_id,
    metricId: row.metric_id,
    periodType: row.period_type,
    periodLabel: row.period_label,
    snapshotDate: row.snapshot_date,
    score: Number(row.score),
    respondentCount: row.respondent_count,
    notes: row.notes,
    sourceRefId: row.source_ref_id,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

export function mapEnpsSurveyRow(row: EnpsSurveyRow): CmdEnpsSurvey {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    titleTh: row.title_th,
    status: row.status,
    questionText: row.question_text,
    followupQuestion: row.followup_question,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    minResponses: row.min_responses,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEnpsResponseRow(row: EnpsResponseRow): CmdEnpsResponse {
  return {
    id: row.id,
    orgId: row.org_id,
    surveyId: row.survey_id,
    score: row.score,
    followupText: row.followup_text,
    anonymousToken: row.anonymous_token,
    departmentLabel: row.department_label,
    submittedAt: row.submitted_at,
  };
}

export function mapOrgHealthRow(row: OrgHealthRow): CmdOrgHealth {
  return {
    orgId: row.org_id,
    metricId: row.metric_id,
    displayName: row.display_name,
    displayNameTh: row.display_name_th,
    metricCategory: row.metric_category,
    metricSource: row.metric_source,
    targetScore: row.target_score != null ? Number(row.target_score) : null,
    warningThreshold: row.warning_threshold != null ? Number(row.warning_threshold) : null,
    criticalThreshold: row.critical_threshold != null ? Number(row.critical_threshold) : null,
    healthWeight: Number(row.health_weight),
    latestScore: Number(row.latest_score),
    latestRespondentCount: Number(row.latest_respondent_count),
    latestPeriod: row.latest_period,
    latestSnapshotDate: row.latest_snapshot_date,
    healthStatus: row.health_status,
  };
}

export function mapEnpsResultsRow(row: EnpsResultsRow): CmdEnpsResults {
  return {
    surveyId: row.survey_id,
    orgId: row.org_id,
    title: row.title,
    status: row.status,
    closesAt: row.closes_at,
    minResponses: row.min_responses,
    totalResponses: Number(row.total_responses),
    promoterCount: row.promoter_count != null ? Number(row.promoter_count) : null,
    passiveCount: row.passive_count != null ? Number(row.passive_count) : null,
    detractorCount: row.detractor_count != null ? Number(row.detractor_count) : null,
    npsScore: row.nps_score != null ? Number(row.nps_score) : null,
    avgScore: row.avg_score != null ? Number(row.avg_score) : null,
  };
}
