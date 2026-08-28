/**
 * RULPredictionService
 * Phase 3 — Predictive Maintenance
 *
 * Estimates Remaining Useful Life (RUL) for CNC spindle bearings
 * using a Weibull proportional hazards survival model.
 *
 * The Weibull distribution models time-to-failure:
 *   h(t) = (β/η) * (t/η)^(β-1)     — hazard function
 *   S(t) = exp(-(t/η)^β)            — survival function
 *   F(t) = 1 - S(t)                  — cumulative failure probability
 *
 * Covariates shift the scale parameter (η) via proportional hazards:
 *   h(t|x) = h₀(t) * exp(β·x)
 *
 * Where:
 *   β (shape) > 1: wear-out failure (bearing degradation)
 *   η (scale): characteristic life
 *   x: covariate vector (vibration, temperature, current features)
 *
 * Reference:
 *   - Weibull (1951) "A statistical distribution function of wide applicability"
 *   - ISO 281:2007 for bearing life estimation
 *   - NASA Bearing Dataset run-to-failure benchmarks
 */

import { Logger } from 'pino';

import {
  ComponentType,
  ComponentHealth,
  HealthStatus,
  MaintenanceUrgency,
  MaintenanceRecommendation,
  ContributingFactor,
} from '../types/maintenance';

// ─── Configuration ───────────────────────────────────────────────────

export interface WeibullParameters {
  /** Shape parameter (β). β > 1 indicates wear-out */
  shape: number;
  /** Scale parameter (η) — characteristic life in hours */
  scale: number;
}

export interface CovariateWeights {
  /** Mapping from feature name to regression coefficient */
  weights: Record<string, number>;
  /** Baseline hazard multiplier */
  baselineMultiplier: number;
}

export interface RULPredictionConfig {
  /** Weibull distribution parameters per component type */
  weibullParams: Record<string, WeibullParameters>;
  /** Covariate regression weights per component type */
  covariateWeights: Record<string, CovariateWeights>;
  /** Confidence interval percentiles */
  lowerPercentile: number; // default 0.10
  upperPercentile: number; // default 0.90
  /** Minimum credible RUL (hours) — floor to avoid zero predictions */
  minRULHours: number;
  /** Maximum RUL cap (hours) — ceiling for newly serviced components */
  maxRULHours: number;
  /** Health score thresholds */
  healthThresholds: {
    healthy: number;    // above = HEALTHY
    degrading: number;  // above = DEGRADING
    warning: number;    // above = WARNING
    // below warning = CRITICAL
  };
}

/** Default parameters derived from ISO 281 L10 bearing life + DAPH Decor historical data */
export const DEFAULT_RUL_CONFIG: RULPredictionConfig = {
  weibullParams: {
    [ComponentType.SPINDLE]: { shape: 2.5, scale: 8000 },         // ~8000h characteristic life
    [ComponentType.BALL_SCREW_X]: { shape: 2.2, scale: 12000 },
    [ComponentType.BALL_SCREW_Y]: { shape: 2.2, scale: 12000 },
    [ComponentType.BALL_SCREW_Z]: { shape: 2.0, scale: 10000 },
    [ComponentType.LINEAR_GUIDE_X]: { shape: 1.8, scale: 15000 },
    [ComponentType.LINEAR_GUIDE_Y]: { shape: 1.8, scale: 15000 },
    [ComponentType.LINEAR_GUIDE_Z]: { shape: 1.8, scale: 12000 },
    [ComponentType.TOOL_HOLDER]: { shape: 3.5, scale: 2000 },     // More deterministic wear
    [ComponentType.VACUUM_PUMP]: { shape: 1.5, scale: 6000 },
    [ComponentType.ATC_MAGAZINE]: { shape: 2.0, scale: 10000 },
  },
  covariateWeights: {
    [ComponentType.SPINDLE]: {
      weights: {
        vibration_rms: 0.35,
        kurtosis: 0.25,
        temperature_delta: 0.15,
        current_deviation: 0.12,
        trend_slope: 0.08,
        bpfo_energy: 0.05,
      },
      baselineMultiplier: 1.0,
    },
    [ComponentType.BALL_SCREW_X]: {
      weights: {
        position_error: 0.40,
        vibration_rms: 0.20,
        temperature_delta: 0.20,
        current_deviation: 0.10,
        trend_slope: 0.10,
      },
      baselineMultiplier: 1.0,
    },
  },
  lowerPercentile: 0.10,
  upperPercentile: 0.90,
  minRULHours: 1,
  maxRULHours: 20000,
  healthThresholds: {
    healthy: 0.80,
    degrading: 0.50,
    warning: 0.25,
  },
};

// ─── RUL Estimate Result ─────────────────────────────────────────────

export interface RULEstimate {
  /** Median (50th percentile) remaining life in hours */
  median: number;
  /** Lower confidence bound (10th percentile) */
  lowerBound: number;
  /** Upper confidence bound (90th percentile) */
  upperBound: number;
  /** Current survival probability */
  survivalProbability: number;
  /** Current hazard rate (instantaneous failure probability) */
  hazardRate: number;
  /** Confidence in the estimate [0, 1] */
  confidence: number;
  /** Method used */
  method: 'weibull_proportional_hazards';
}

// ─── Degradation Indicator ───────────────────────────────────────────

export interface DegradationIndicator {
  name: string;
  currentValue: number;
  normalRange: [number, number];
  warningThreshold: number;
  criticalThreshold: number;
  /** Normalized deviation: 0 = perfectly normal, 1 = at critical */
  normalizedDeviation: number;
}

// ─── Service ─────────────────────────────────────────────────────────

export class RULPredictionService {
  private config: RULPredictionConfig;
  private logger: Logger;

  /** Cache of operating hours per machine-component pair */
  private operatingHours: Map<string, number> = new Map();

  constructor(deps: { config?: Partial<RULPredictionConfig>; logger: Logger }) {
    this.config = { ...DEFAULT_RUL_CONFIG, ...deps.config };
    this.logger = deps.logger.child({ service: 'RULPrediction' });
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Predict RUL for a given component based on its feature vector
   * and accumulated operating hours.
   */
  predictRUL(
    machineId: string,
    componentType: ComponentType,
    operatingHours: number,
    degradationIndicators: DegradationIndicator[],
  ): RULEstimate {
    const params = this.getWeibullParams(componentType);
    const covariates = this.getCovariateWeights(componentType);

    // Compute covariate multiplier from degradation indicators
    const hazardMultiplier = this.computeHazardMultiplier(
      degradationIndicators,
      covariates,
    );

    // Adjusted scale parameter: η_adj = η / exp(β·x)
    const adjustedScale = params.scale / hazardMultiplier;

    // Current survival probability: S(t) = exp(-(t/η_adj)^β)
    const survivalProbability = this.survivalFunction(
      operatingHours,
      params.shape,
      adjustedScale,
    );

    // Hazard rate at current time: h(t) = (β/η)(t/η)^(β-1) * exp(β·x)
    const hazardRate = this.hazardFunction(
      operatingHours,
      params.shape,
      adjustedScale,
    );

    // RUL = time until failure percentile - current time
    // Median RUL: S(t + RUL) = 0.5 → RUL = quantile(0.5) - t
    const medianFailureTime = this.quantileFunction(0.5, params.shape, adjustedScale);
    const lowerFailureTime = this.quantileFunction(
      this.config.lowerPercentile,
      params.shape,
      adjustedScale,
    );
    const upperFailureTime = this.quantileFunction(
      this.config.upperPercentile,
      params.shape,
      adjustedScale,
    );

    const medianRUL = Math.max(this.config.minRULHours, medianFailureTime - operatingHours);
    const lowerRUL = Math.max(this.config.minRULHours, lowerFailureTime - operatingHours);
    const upperRUL = Math.min(this.config.maxRULHours, upperFailureTime - operatingHours);

    // Confidence based on data quality and how far into life we are
    const confidence = this.computeConfidence(
      operatingHours,
      params,
      degradationIndicators.length,
    );

    // Cache operating hours
    this.operatingHours.set(`${machineId}:${componentType}`, operatingHours);

    return {
      median: Math.min(medianRUL, this.config.maxRULHours),
      lowerBound: Math.max(this.config.minRULHours, lowerRUL),
      upperBound: Math.min(this.config.maxRULHours, Math.max(upperRUL, medianRUL * 1.5)),
      survivalProbability,
      hazardRate,
      confidence,
      method: 'weibull_proportional_hazards',
    };
  }

  /**
   * Compute full ComponentHealth from RUL estimate + anomaly score.
   */
  assessComponentHealth(
    machineId: string,
    componentType: ComponentType,
    rulEstimate: RULEstimate,
    anomalyScore: number,
    degradationIndicators: DegradationIndicator[],
  ): ComponentHealth {
    // Health score combines survival probability + anomaly inverse
    const rulHealthFactor = Math.min(1, rulEstimate.median / 720); // normalize to 30 days
    const anomalyHealthFactor = 1 - anomalyScore;
    const degradationFactor = this.computeDegradationHealth(degradationIndicators);

    // Weighted combination
    const healthScore =
      0.40 * rulHealthFactor +
      0.30 * anomalyHealthFactor +
      0.30 * degradationFactor;

    const status = this.classifyHealthStatus(healthScore);

    const contributingFactors: ContributingFactor[] = degradationIndicators
      .filter((ind) => ind.normalizedDeviation > 0.3)
      .map((ind) => ({
        feature: ind.name,
        value: ind.currentValue,
        threshold: ind.warningThreshold,
        severity: ind.normalizedDeviation > 0.8
          ? 'high' as const
          : ind.normalizedDeviation > 0.5
            ? 'medium' as const
            : 'low' as const,
      }));

    return {
      machineId,
      componentType,
      healthScore,
      status,
      remainingUsefulLife: rulEstimate.median,
      confidence: rulEstimate.confidence,
      lastUpdated: new Date(),
      contributingFactors,
    };
  }

  /**
   * Generate maintenance recommendation from component health assessment.
   */
  generateRecommendation(
    health: ComponentHealth,
  ): MaintenanceRecommendation | null {
    if (health.healthScore > this.config.healthThresholds.healthy) {
      return null; // No maintenance needed
    }

    const urgency = this.classifyUrgency(health.remainingUsefulLife);

    return {
      id: `rec-${health.machineId}-${health.componentType}-${Date.now()}`,
      machineId: health.machineId,
      componentType: health.componentType,
      urgency,
      action: this.recommendAction(health),
      estimatedDowntimeMinutes: this.estimateDowntime(health.componentType, urgency),
      healthScore: health.healthScore,
      remainingUsefulLife: health.remainingUsefulLife,
      confidence: health.confidence,
      createdAt: new Date(),
    };
  }

  /**
   * Batch predict RUL for all tracked components on a machine.
   */
  batchPredict(
    machineId: string,
    componentData: Array<{
      componentType: ComponentType;
      operatingHours: number;
      degradationIndicators: DegradationIndicator[];
    }>,
  ): Map<ComponentType, RULEstimate> {
    const results = new Map<ComponentType, RULEstimate>();

    for (const { componentType, operatingHours, degradationIndicators } of componentData) {
      const estimate = this.predictRUL(
        machineId,
        componentType,
        operatingHours,
        degradationIndicators,
      );
      results.set(componentType, estimate);
    }

    return results;
  }

  /**
   * Update operating hours for a machine-component pair.
   */
  updateOperatingHours(machineId: string, componentType: ComponentType, hours: number): void {
    this.operatingHours.set(`${machineId}:${componentType}`, hours);
  }

  /**
   * Get cached operating hours.
   */
  getOperatingHours(machineId: string, componentType: ComponentType): number | undefined {
    return this.operatingHours.get(`${machineId}:${componentType}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // WEIBULL DISTRIBUTION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Weibull survival function: S(t) = exp(-(t/η)^β)
   * Probability that component survives beyond time t.
   */
  survivalFunction(t: number, shape: number, scale: number): number {
    if (t <= 0) return 1;
    return Math.exp(-Math.pow(t / scale, shape));
  }

  /**
   * Weibull hazard function: h(t) = (β/η)(t/η)^(β-1)
   * Instantaneous failure rate at time t.
   */
  hazardFunction(t: number, shape: number, scale: number): number {
    if (t <= 0) return 0;
    return (shape / scale) * Math.pow(t / scale, shape - 1);
  }

  /**
   * Weibull cumulative distribution function: F(t) = 1 - exp(-(t/η)^β)
   * Probability of failure by time t.
   */
  cdf(t: number, shape: number, scale: number): number {
    if (t <= 0) return 0;
    return 1 - Math.exp(-Math.pow(t / scale, shape));
  }

  /**
   * Weibull quantile function (inverse CDF):
   * t(p) = η * (-ln(1-p))^(1/β)
   * Time at which cumulative failure probability = p
   */
  quantileFunction(p: number, shape: number, scale: number): number {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    return scale * Math.pow(-Math.log(1 - p), 1 / shape);
  }

  /**
   * Weibull mean (expected value): E[T] = η * Γ(1 + 1/β)
   */
  weibullMean(shape: number, scale: number): number {
    return scale * this.gamma(1 + 1 / shape);
  }

  /**
   * Weibull PDF: f(t) = (β/η)(t/η)^(β-1) * exp(-(t/η)^β)
   */
  pdf(t: number, shape: number, scale: number): number {
    if (t <= 0) return 0;
    const normalized = t / scale;
    return (shape / scale) * Math.pow(normalized, shape - 1) * Math.exp(-Math.pow(normalized, shape));
  }

  // ═══════════════════════════════════════════════════════════════════
  // COVARIATE HAZARD MODEL
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Compute proportional hazard multiplier from degradation indicators.
   * exp(Σ wᵢ × xᵢ) where wᵢ = covariate weight, xᵢ = normalized deviation
   */
  computeHazardMultiplier(
    indicators: DegradationIndicator[],
    covariates: CovariateWeights,
  ): number {
    let linearPredictor = 0;

    for (const indicator of indicators) {
      const weight = covariates.weights[indicator.name] ?? 0;
      linearPredictor += weight * indicator.normalizedDeviation;
    }

    // exp(β·x) — the proportional hazard multiplier
    const multiplier = covariates.baselineMultiplier * Math.exp(linearPredictor);

    // Cap multiplier to avoid extreme predictions
    return Math.max(0.1, Math.min(multiplier, 50));
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private getWeibullParams(componentType: ComponentType): WeibullParameters {
    const params = this.config.weibullParams[componentType];
    if (!params) {
      // Default fallback for unconfigured components
      this.logger.warn({ componentType, msg: 'Using default Weibull params' });
      return { shape: 2.0, scale: 8000 };
    }
    return params;
  }

  private getCovariateWeights(componentType: ComponentType): CovariateWeights {
    const weights = this.config.covariateWeights[componentType];
    if (!weights) {
      return { weights: {}, baselineMultiplier: 1.0 };
    }
    return weights;
  }

  private computeConfidence(
    operatingHours: number,
    params: WeibullParameters,
    numIndicators: number,
  ): number {
    // Confidence increases with:
    // 1. More operating hours (better statistical basis)
    // 2. More degradation indicators available
    // 3. Being in the well-characterized region of the Weibull curve

    const ageFactor = Math.min(1, operatingHours / (params.scale * 0.3));
    const indicatorFactor = Math.min(1, numIndicators / 5);
    const regionFactor = operatingHours < params.scale * 1.5 ? 0.9 : 0.6; // less confident past characteristic life

    return Math.min(0.95, 0.3 + 0.3 * ageFactor + 0.2 * indicatorFactor + 0.2 * regionFactor);
  }

  private computeDegradationHealth(indicators: DegradationIndicator[]): number {
    if (indicators.length === 0) return 1;

    // Average health contribution from all indicators
    const healthValues = indicators.map((ind) => 1 - ind.normalizedDeviation);
    return healthValues.reduce((sum, v) => sum + v, 0) / healthValues.length;
  }

  private classifyHealthStatus(score: number): HealthStatus {
    if (score >= this.config.healthThresholds.healthy) return HealthStatus.HEALTHY;
    if (score >= this.config.healthThresholds.degrading) return HealthStatus.DEGRADING;
    if (score >= this.config.healthThresholds.warning) return HealthStatus.WARNING;
    return HealthStatus.CRITICAL;
  }

  private classifyUrgency(rulHours: number): MaintenanceUrgency {
    if (rulHours < 24) return MaintenanceUrgency.IMMEDIATE;
    if (rulHours < 168) return MaintenanceUrgency.URGENT;
    if (rulHours < 720) return MaintenanceUrgency.SOON;
    return MaintenanceUrgency.PLANNED;
  }

  private recommendAction(health: ComponentHealth): string {
    const type = health.componentType;
    const score = health.healthScore;

    if (type === ComponentType.SPINDLE) {
      if (score < 0.25) return 'Replace spindle bearings — advanced degradation detected';
      if (score < 0.50) return 'Inspect spindle bearings — vibration anomaly; schedule grease replenishment';
      return 'Monitor spindle — early degradation signs detected';
    }

    if (type === ComponentType.TOOL_HOLDER) {
      if (score < 0.30) return 'Replace tool — wear exceeded safe limit';
      return 'Inspect tool wear — approaching replacement threshold';
    }

    if (type.startsWith('BALL_SCREW')) {
      if (score < 0.25) return 'Replace ball screw assembly — backlash/wear exceeds tolerance';
      return 'Lubricate ball screw — increased friction detected';
    }

    if (type.startsWith('LINEAR_GUIDE')) {
      if (score < 0.30) return 'Replace linear guide blocks';
      return 'Inspect and lubricate linear guides';
    }

    return `Inspect ${type} — health score below threshold`;
  }

  private estimateDowntime(componentType: ComponentType, urgency: MaintenanceUrgency): number {
    // Estimated downtime in minutes based on component type
    const baseDowntime: Record<string, number> = {
      [ComponentType.SPINDLE]: 480,          // 8 hours
      [ComponentType.TOOL_HOLDER]: 15,       // 15 minutes
      [ComponentType.BALL_SCREW_X]: 360,     // 6 hours
      [ComponentType.BALL_SCREW_Y]: 360,
      [ComponentType.BALL_SCREW_Z]: 360,
      [ComponentType.LINEAR_GUIDE_X]: 240,   // 4 hours
      [ComponentType.LINEAR_GUIDE_Y]: 240,
      [ComponentType.LINEAR_GUIDE_Z]: 240,
      [ComponentType.VACUUM_PUMP]: 120,      // 2 hours
      [ComponentType.ATC_MAGAZINE]: 180,     // 3 hours
    };

    const base = baseDowntime[componentType] ?? 120;

    // Urgent repairs take longer (less preparation time)
    if (urgency === MaintenanceUrgency.IMMEDIATE) return Math.ceil(base * 1.5);
    if (urgency === MaintenanceUrgency.URGENT) return Math.ceil(base * 1.2);
    return base;
  }

  /**
   * Lanczos approximation of the Gamma function
   * Used for Weibull mean calculation: E[T] = η * Γ(1 + 1/β)
   */
  gamma(z: number): number {
    if (z < 0.5) {
      // Reflection formula: Γ(z) = π / (sin(πz) * Γ(1-z))
      return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
    }

    z -= 1;
    const g = 7;
    const c = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7,
    ];

    let x = c[0]!;
    for (let i = 1; i < g + 2; i++) {
      x += c[i]! / (z + i);
    }

    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
}
