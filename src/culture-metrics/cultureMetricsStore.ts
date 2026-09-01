/**
 * src/culture-metrics/cultureMetricsStore.ts
 *
 * MONOLITH v17.5 — Culture Metrics Dashboard Module: Zustand store
 *
 * Manages org culture metric definitions, historical snapshots, org health
 * aggregations, eNPS surveys, and anonymous eNPS response submission.
 *
 * Plan Gate: PROFESSIONAL+ (PROFESSIONAL or ENTERPRISE)
 *   - submitEnpsResponse is exempt from plan gate (anonymous survey responses
 *     from any authenticated employee)
 *
 * Actions:
 *   fetchMetricDefinitions  — load active metric definitions for the org
 *   createMetricDefinition  — PROFESSIONAL+ — add a custom metric definition
 *   updateMetricDefinition  — PROFESSIONAL+ — update metric config
 *
 *   recordSnapshot          — PROFESSIONAL+ — record a new metric snapshot
 *   fetchSnapshots          — load historical snapshots (filterable)
 *   fetchOrgHealth          — load cmd_org_health_v aggregated view
 *
 *   createEnpsSurvey        — PROFESSIONAL+ — create a new eNPS survey (DRAFT)
 *   activateEnpsSurvey      — PROFESSIONAL+ — transition DRAFT → ACTIVE
 *   closeEnpsSurvey         — PROFESSIONAL+ — transition ACTIVE → CLOSED
 *   submitEnpsResponse      — no plan gate — anonymous response submission
 *   fetchEnpsSurveys        — load all eNPS surveys for the org
 *   fetchEnpsResults        — load cmd_enps_results_v (hidden until min_responses met)
 *
 *   setFilters              — update filter state (no DB call)
 *   clearError              — reset error state
 */

import { create } from 'zustand';
import { supabase } from '../core/supabase';
import type { OrgPlan } from '../tenant/types';
import {
  canAccessCultureMetrics,
  CultureMetricsPlanGateError,
  mapMetricDefinitionRow,
  mapMetricSnapshotRow,
  mapEnpsSurveyRow,
  mapOrgHealthRow,
  mapEnpsResultsRow,
  DEFAULT_CMD_FILTERS,
} from './cultureMetricsTypes';
import type {
  CmdMetricDefinition,
  CmdMetricSnapshot,
  CmdEnpsSurvey,
  CmdOrgHealth,
  CmdEnpsResults,
  CmdFilters,
  CreateMetricDefinitionPayload,
  RecordSnapshotPayload,
  CreateEnpsSurveyPayload,
  SubmitEnpsResponsePayload,
} from './cultureMetricsTypes';

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface CultureMetricsState {
  // ── Data ──────────────────────────────────────────────────────────────────
  metricDefinitions: CmdMetricDefinition[];
  snapshots: CmdMetricSnapshot[];
  orgHealth: CmdOrgHealth[];
  enpsSurveys: CmdEnpsSurvey[];
  enpsResults: CmdEnpsResults[];

  // ── UI state ──────────────────────────────────────────────────────────────
  filters: CmdFilters;

  // ── Loading flags ─────────────────────────────────────────────────────────
  isLoading: boolean;
  isSnapshotLoading: boolean;
  isEnpsLoading: boolean;

  // ── Error ─────────────────────────────────────────────────────────────────
  error: string | null;

  // ── Actions: Metric Definitions ───────────────────────────────────────────
  fetchMetricDefinitions: (orgId: string) => Promise<void>;
  createMetricDefinition: (
    orgId: string,
    orgPlan: OrgPlan | string,
    payload: CreateMetricDefinitionPayload
  ) => Promise<CmdMetricDefinition>;
  updateMetricDefinition: (
    orgId: string,
    orgPlan: OrgPlan | string,
    metricId: string,
    updates: Partial<CreateMetricDefinitionPayload>
  ) => Promise<CmdMetricDefinition>;

  // ── Actions: Snapshots & Org Health ──────────────────────────────────────
  recordSnapshot: (
    orgId: string,
    orgPlan: OrgPlan | string,
    payload: RecordSnapshotPayload
  ) => Promise<CmdMetricSnapshot>;
  fetchSnapshots: (
    orgId: string,
    filters?: Partial<CmdFilters>
  ) => Promise<void>;
  fetchOrgHealth: (orgId: string) => Promise<void>;

  // ── Actions: eNPS Surveys ─────────────────────────────────────────────────
  createEnpsSurvey: (
    orgId: string,
    orgPlan: OrgPlan | string,
    payload: CreateEnpsSurveyPayload
  ) => Promise<CmdEnpsSurvey>;
  activateEnpsSurvey: (
    orgId: string,
    orgPlan: OrgPlan | string,
    surveyId: string
  ) => Promise<CmdEnpsSurvey>;
  closeEnpsSurvey: (
    orgId: string,
    orgPlan: OrgPlan | string,
    surveyId: string
  ) => Promise<CmdEnpsSurvey>;
  submitEnpsResponse: (
    orgId: string,
    payload: SubmitEnpsResponsePayload
  ) => Promise<void>;
  fetchEnpsSurveys: (orgId: string) => Promise<void>;
  fetchEnpsResults: (orgId: string) => Promise<void>;

  // ── Actions: UI ───────────────────────────────────────────────────────────
  setFilters: (updates: Partial<CmdFilters>) => void;
  clearError: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useCultureMetricsStore = create<CultureMetricsState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  metricDefinitions: [],
  snapshots: [],
  orgHealth: [],
  enpsSurveys: [],
  enpsResults: [],
  filters: { ...DEFAULT_CMD_FILTERS },
  isLoading: false,
  isSnapshotLoading: false,
  isEnpsLoading: false,
  error: null,

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),

  // ── setFilters ─────────────────────────────────────────────────────────────
  setFilters: (updates) =>
    set((state) => ({ filters: { ...state.filters, ...updates } })),

  // ══════════════════════════════════════════════════════════════════════════
  // METRIC DEFINITIONS
  // ══════════════════════════════════════════════════════════════════════════

  fetchMetricDefinitions: async (orgId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('cmd_metric_definitions')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('display_name', { ascending: true });
      if (error) throw error;
      set({ metricDefinitions: (data ?? []).map(mapMetricDefinitionRow) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load metric definitions' });
    } finally {
      set({ isLoading: false });
    }
  },

  createMetricDefinition: async (orgId, orgPlan, payload) => {
    if (!canAccessCultureMetrics(orgPlan)) {
      throw new CultureMetricsPlanGateError(orgPlan as string);
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('cmd_metric_definitions')
      .insert({
        org_id: orgId,
        metric_category: payload.metricCategory,
        metric_source: payload.metricSource,
        display_name: payload.displayName,
        display_name_th: payload.displayNameTh ?? null,
        min_score: payload.minScore ?? 0,
        max_score: payload.maxScore ?? 100,
        target_score: payload.targetScore ?? null,
        warning_threshold: payload.warningThreshold ?? null,
        critical_threshold: payload.criticalThreshold ?? null,
        health_weight: payload.healthWeight ?? 1.0,
        description: payload.description ?? null,
        is_active: true,
        is_system: false,
        created_by: userData?.user?.id ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    const definition = mapMetricDefinitionRow(data);
    set((state) => ({ metricDefinitions: [...state.metricDefinitions, definition] }));
    return definition;
  },

  updateMetricDefinition: async (orgId, orgPlan, metricId, updates) => {
    if (!canAccessCultureMetrics(orgPlan)) {
      throw new CultureMetricsPlanGateError(orgPlan as string);
    }
    const patch: Record<string, unknown> = {};
    if (updates.displayName !== undefined) patch.display_name = updates.displayName;
    if (updates.displayNameTh !== undefined) patch.display_name_th = updates.displayNameTh;
    if (updates.targetScore !== undefined) patch.target_score = updates.targetScore;
    if (updates.warningThreshold !== undefined) patch.warning_threshold = updates.warningThreshold;
    if (updates.criticalThreshold !== undefined) patch.critical_threshold = updates.criticalThreshold;
    if (updates.healthWeight !== undefined) patch.health_weight = updates.healthWeight;
    if (updates.description !== undefined) patch.description = updates.description;

    const { data, error } = await supabase
      .from('cmd_metric_definitions')
      .update(patch)
      .eq('id', metricId)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    const definition = mapMetricDefinitionRow(data);
    set((state) => ({
      metricDefinitions: state.metricDefinitions.map((d) =>
        d.id === metricId ? definition : d
      ),
    }));
    return definition;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SNAPSHOTS & ORG HEALTH
  // ══════════════════════════════════════════════════════════════════════════

  recordSnapshot: async (orgId, orgPlan, payload) => {
    if (!canAccessCultureMetrics(orgPlan)) {
      throw new CultureMetricsPlanGateError(orgPlan as string);
    }
    set({ isSnapshotLoading: true, error: null });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('cmd_metric_snapshots')
        .insert({
          org_id: orgId,
          metric_id: payload.metricId,
          period_type: payload.periodType,
          period_label: payload.periodLabel,
          snapshot_date: payload.snapshotDate,
          score: payload.score,
          respondent_count: payload.respondentCount ?? 0,
          notes: payload.notes ?? null,
          source_ref_id: payload.sourceRefId ?? null,
          recorded_by: userData?.user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      const snapshot = mapMetricSnapshotRow(data);
      set((state) => ({ snapshots: [snapshot, ...state.snapshots] }));
      return snapshot;
    } finally {
      set({ isSnapshotLoading: false });
    }
  },

  fetchSnapshots: async (orgId, filters) => {
    set({ isSnapshotLoading: true, error: null });
    try {
      const activeFilters = { ...get().filters, ...filters };
      let query = supabase
        .from('cmd_metric_snapshots')
        .select('*')
        .eq('org_id', orgId)
        .order('snapshot_date', { ascending: false })
        .limit(500);

      if (activeFilters.periodType !== 'ALL') {
        query = query.eq('period_type', activeFilters.periodType);
      }
      if (activeFilters.fromDate) {
        query = query.gte('snapshot_date', activeFilters.fromDate);
      }
      if (activeFilters.toDate) {
        query = query.lte('snapshot_date', activeFilters.toDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ snapshots: (data ?? []).map(mapMetricSnapshotRow) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load snapshots' });
    } finally {
      set({ isSnapshotLoading: false });
    }
  },

  fetchOrgHealth: async (orgId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('cmd_org_health_v')
        .select('*')
        .eq('org_id', orgId)
        .order('metric_category', { ascending: true });
      if (error) throw error;
      set({ orgHealth: (data ?? []).map(mapOrgHealthRow) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load org health' });
    } finally {
      set({ isLoading: false });
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // eNPS SURVEYS
  // ══════════════════════════════════════════════════════════════════════════

  createEnpsSurvey: async (orgId, orgPlan, payload) => {
    if (!canAccessCultureMetrics(orgPlan)) {
      throw new CultureMetricsPlanGateError(orgPlan as string);
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('cmd_enps_surveys')
      .insert({
        org_id: orgId,
        title: payload.title,
        title_th: payload.titleTh ?? null,
        status: 'DRAFT',
        question_text:
          payload.questionText ??
          'คุณมีแนวโน้มแนะนำองค์กรนี้แก่คนรู้จักมากน้อยแค่ไหน? (0–10)',
        followup_question: payload.followupQuestion ?? null,
        opens_at: payload.opensAt ?? null,
        closes_at: payload.closesAt ?? null,
        min_responses: payload.minResponses ?? 3,
        notes: payload.notes ?? null,
        created_by: userData?.user?.id ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    const survey = mapEnpsSurveyRow(data);
    set((state) => ({ enpsSurveys: [survey, ...state.enpsSurveys] }));
    return survey;
  },

  activateEnpsSurvey: async (orgId, orgPlan, surveyId) => {
    if (!canAccessCultureMetrics(orgPlan)) {
      throw new CultureMetricsPlanGateError(orgPlan as string);
    }
    const { data, error } = await supabase
      .from('cmd_enps_surveys')
      .update({ status: 'ACTIVE' })
      .eq('id', surveyId)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    const survey = mapEnpsSurveyRow(data);
    set((state) => ({
      enpsSurveys: state.enpsSurveys.map((s) => (s.id === surveyId ? survey : s)),
    }));
    return survey;
  },

  closeEnpsSurvey: async (orgId, orgPlan, surveyId) => {
    if (!canAccessCultureMetrics(orgPlan)) {
      throw new CultureMetricsPlanGateError(orgPlan as string);
    }
    const { data, error } = await supabase
      .from('cmd_enps_surveys')
      .update({ status: 'CLOSED' })
      .eq('id', surveyId)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    const survey = mapEnpsSurveyRow(data);
    set((state) => ({
      enpsSurveys: state.enpsSurveys.map((s) => (s.id === surveyId ? survey : s)),
    }));
    return survey;
  },

  submitEnpsResponse: async (orgId, payload) => {
    // No plan gate — anonymous survey responses from any authenticated employee
    const { error } = await supabase
      .from('cmd_enps_responses')
      .insert({
        org_id: orgId,
        survey_id: payload.surveyId,
        score: payload.score,
        followup_text: payload.followupText ?? null,
        anonymous_token: payload.anonymousToken,
        department_label: payload.departmentLabel ?? null,
      });
    if (error) throw new Error(error.message);
  },

  fetchEnpsSurveys: async (orgId) => {
    set({ isEnpsLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('cmd_enps_surveys')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ enpsSurveys: (data ?? []).map(mapEnpsSurveyRow) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load eNPS surveys' });
    } finally {
      set({ isEnpsLoading: false });
    }
  },

  fetchEnpsResults: async (orgId) => {
    set({ isEnpsLoading: true, error: null });
    try {
      // View hides results until total_responses >= min_responses (RLS-enforced)
      const { data, error } = await supabase
        .from('cmd_enps_results_v')
        .select('*')
        .eq('org_id', orgId)
        .order('closes_at', { ascending: false });
      if (error) throw error;
      set({ enpsResults: (data ?? []).map(mapEnpsResultsRow) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load eNPS results' });
    } finally {
      set({ isEnpsLoading: false });
    }
  },
}));

export default useCultureMetricsStore;
