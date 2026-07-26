/**
 * SafetyPanel
 *
 * Left sidebar panel content for Safety Gate validation.
 * Shows all Gate findings with Focus, Apply Fix, and Copy actions.
 *
 * @version 1.0.0 - Phase A: Gate → UI Integration
 */

import React from 'react';
import { useGateStore } from './gateStore';
import { focusAndSelectFinding, clearEntityFocus } from './focusEntity';
import { applyFindingFixDetailed, toGatePatches } from './applyGatePatch';
import type { GateFinding, GateResult, Severity } from './gateTypes';
import type { MinifixGateFinding } from '../rules/connectors/minifixConstraintTypes';
import { SEVERITY_COLORS, SEVERITY_BG, countBySeverity } from './gateTypes';
import { useDrillMapStore } from '../../core/store/useDrillMapStore';
import type { DrillMap } from '../../core/manufacturing/drillMap/types';
import type { ConnectorDensity } from '../../core/manufacturing/drillMap/generateDrillMap';
import type { Cabinet } from '../../core/types/Cabinet';
import { validateMinifixGate } from '../rules/connectors/validateMinifixConnector';
import { validateG11FromDrillMap } from '../rules/gateG11_minifixSystem32';
import { runConnectorOsAudit, type ConnectorAuditIssue } from '../rules/gateG11_connectorAudit';
import { runShadowCompare } from '../../core/connector/shadowCompare';
import { compareWorldParity } from '../../core/connector/worldSynthesis';
import { useCabinetStore } from '../../core/store/useCabinetStore';

// ============================================
// ICONS
// ============================================

const FocusIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const WrenchIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// ============================================
// FINDING CARD
// ============================================

interface FindingCardProps {
  finding: GateFinding;
  isSelected: boolean;
  onFocus: () => void;
  onApplyFix: () => void;
  onCopy: () => void;
}

function FindingCard({ finding, isSelected, onFocus, onApplyFix, onCopy }: FindingCardProps) {
  const severity = finding.severity;
  const hasFix = finding.patch && finding.patch.length > 0;

  return (
    <div
      className={`p-2 rounded-lg border transition-all ${
        isSelected
          ? 'border-white/30 bg-white/5'
          : 'border-[#333] bg-surface-2 hover:border-gray-500'
      }`}
      style={{ borderLeftColor: SEVERITY_COLORS[severity], borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-medium"
          style={{
            backgroundColor: SEVERITY_BG[severity],
            color: SEVERITY_COLORS[severity],
          }}
        >
          {severity}
        </span>
        <span className="text-[10px] text-white font-mono">{finding.code}</span>
      </div>

      {/* Message */}
      <p className="text-[10px] text-gray-400 mb-2 line-clamp-2">{finding.message}</p>

      {/* Affected entities */}
      {finding.entityIds.length > 0 && (
        <div className="text-[9px] text-gray-500 mb-2">
          {finding.entityIds.length} affected {finding.entityIds.length === 1 ? 'point' : 'points'}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFocus}
          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium
            bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          title="Focus camera on affected entities"
        >
          <FocusIcon />
          Focus
        </button>

        {hasFix && (
          <button
            onClick={onApplyFix}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium
              bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            title="Apply automatic fix"
          >
            <WrenchIcon />
            Fix
          </button>
        )}

        <button
          onClick={onCopy}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors ml-auto"
          title="Copy finding details"
        >
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

// ============================================
// PRODUCER → CONSUMER MAPPING
// ============================================

/**
 * Convert a Minifix gate finding (producer shape) into a UI GateFinding.
 *
 * Exported so the producer → consumer → applier chain can be tested end to end
 * without rendering React: this is the EXACT mapping runGateValidation uses.
 *
 * The patch path is NOT rewritten here. The producer
 * (rules/connectors/drillMapIndex.ts:151-161) already emits a fully-qualified
 * `/useDrillMapStore/drillMap/...` path; this used to prepend that prefix a
 * SECOND time, which made every "Apply fix" a silent no-op that reported
 * success. `toGatePatches` passes the path through and refuses anything that
 * is not already correctly rooted.
 */
export function minifixFindingToGateFinding(f: MinifixGateFinding, severity: Severity): GateFinding {
  return {
    key: `${f.code}:${f.entityIds.join(',')}`,
    code: f.code,
    message: f.message,
    severity,
    entityIds: f.entityIds,
    patch: toGatePatches(f.suggestedFix?.patch),
    context: {
      ...(f.measured || {}),
      ...(f.tolerance || {}),
    },
  };
}

/** ERROR → BLOCKER. Thin wrapper kept for the existing call sites and tests. */
export function minifixFindingToBlockerFinding(f: MinifixGateFinding): GateFinding {
  return minifixFindingToGateFinding(f, 'BLOCKER');
}

/**
 * INFO → INFO, through the SAME mapper the blocker path uses.
 *
 * Before this existed, every INFO finding `validateMinifixGate` produced was
 * dropped before display: `findings.info` was assembled from shadowInfo + G11 +
 * the connector audit only. That silently swallowed
 * `MONO_MINIFIX_BALL_AUTOCORRECTED_TO_POCKET` — the ONLY bolt/cam alignment
 * report a production user can see, because BALL_TO_POCKET pins the ball centre
 * onto the pocket centre so MONO_MINIFIX_Y_MISMATCH / MONO_MINIFIX_NOT_COAXIAL
 * both measure exactly zero and can never fire — and
 * `MONO_MINIFIX_POINT_STATUS_PROPAGATED`.
 *
 * The whole worth of that diagnostic is its `measured` payload
 * (y_deviation_mm / radial_deviation_mm / axial_deviation_mm /
 * auto_correction_distance_mm) and the `tolerance` it is judged against, so it
 * goes through `minifixFindingToGateFinding`, which folds both into `context`
 * exactly as the blocker path does. A finding that reaches the UI without its
 * numbers is noise, not a surfaced finding.
 *
 * NOT de-duplicated: an OVERLAY cabinet emits one instance per cam/bolt pair
 * (12 on the 4-corner + back fixture). The messages are byte-identical but the
 * `entityIds` are not — each names a different pair and is what Focus acts on,
 * and each carries that pair's own measured numbers. Collapsing them would have
 * to pick ONE pair's measurements to display and discard eleven others, i.e.
 * report numbers that are not the ones for the row shown. The `key` already
 * embeds the entityIds, so the 12 rows have 12 distinct keys and React's list
 * renders all of them; nothing is hidden by the renderer.
 */
export function minifixFindingToInfoFinding(f: MinifixGateFinding): GateFinding {
  return minifixFindingToGateFinding(f, 'INFO');
}

/**
 * Build the UI GateResult for a drill map.
 *
 * Extracted from `runGateValidation` for the same reason d38dbde2 extracted
 * `minifixFindingToBlockerFinding`: this IS the conversion the panel performs,
 * and it must be testable without rendering React (component tests in this
 * repo have a known-flaky environment). `runGateValidation` now does nothing
 * but read the two stores, call this, and store the verdict.
 *
 * Pure: no store reads, no clock beyond `runAt`.
 */
export function buildGateResult(
  drillMap: DrillMap | null,
  ctx: { cabinet: Cabinet | null; connectorDensity: ConnectorDensity },
): GateResult {
  const gateResult = validateMinifixGate(drillMap);
  // Connector OS เป็นผู้ตรวจชั้นที่สอง (G11 rules + catalog/placer/compiler audit)
  const g11Result = validateG11FromDrillMap(drillMap);
  // ADR-061: severity ของ spacing ตาม density profile ที่ผู้ใช้เลือก
  const connectorAudit = runConnectorOsAudit(drillMap, 'STANDARD', ctx.connectorDensity);
  // ADR-061 ขั้น shadow: compiler สังเคราะห์คู่ขนาน เทียบ parity (ยังไม่สลับตัวสร้าง)
  const shadow = runShadowCompare(drillMap);
  // ADR-061(c): world-coordinate parity — synthesis จาก cabinet geometry ล้วน เทียบ drill map จริง
  const world = ctx.cabinet
    ? compareWorldParity(ctx.cabinet, drillMap, { density: ctx.connectorDensity })
    : null;

  const g11ToFinding = (i: (typeof g11Result.issues)[number]): GateFinding => ({
    key: `${i.code}:${(i.drillPointIds ?? i.panelIds ?? []).join(',')}`,
    code: i.code,
    message: i.message,
    severity: (i.severity === 'BLOCKER' ? 'BLOCKER' : i.severity === 'WARNING' ? 'WARNING' : 'INFO') as Severity,
    entityIds: i.drillPointIds ?? i.panelIds ?? [],
    context: i.context as Record<string, unknown> | undefined,
  });
  const auditToFinding = (i: ConnectorAuditIssue): GateFinding => ({
    key: `${i.code}:${i.entityIds.slice(0, 4).join(',')}`,
    code: i.code,
    message: i.message,
    severity: i.severity as Severity,
    entityIds: i.entityIds,
    context: i.measured,
  });

  const extraBlockers = [
    ...g11Result.issues.filter(i => i.severity === 'BLOCKER').map(g11ToFinding),
    ...connectorAudit.issues.filter(i => i.severity === 'BLOCKER').map(auditToFinding),
  ];
  const extraWarnings = [
    ...g11Result.issues.filter(i => i.severity === 'WARNING').map(g11ToFinding),
    ...connectorAudit.issues.filter(i => i.severity === 'WARNING').map(auditToFinding),
  ];
  const shadowInfo: GateFinding[] = shadow.jointsCompared > 0 ? [{
    key: 'CONNECTOR_OS_SHADOW',
    code: 'CONNECTOR_OS_SHADOW',
    message: `Shadow compiler parity: ${shadow.jointsMatched}/${shadow.jointsCompared} joints ตรง` +
      (world ? ` · world-coord: ${world.matched}/${world.compared} bores (Δmax ${world.maxDeltaMm.toFixed(2)}mm${world.skippedCorners.length > 0 ? `, skip ${world.skippedCorners.length} corner` : ''})` : '') +
      ' — สลับตัวสร้างได้เมื่อเต็มทุกตู้',
    severity: 'INFO' as Severity,
    entityIds: [],
    context: { jointsMatched: shadow.jointsMatched, jointsCompared: shadow.jointsCompared },
  }] : [];

  const extraInfo = [
    ...shadowInfo,
    ...g11Result.issues.filter(i => i.severity !== 'BLOCKER' && i.severity !== 'WARNING').map(g11ToFinding),
    ...connectorAudit.issues.filter(i => i.severity === 'INFO').map(auditToFinding),
  ];

  // Convert MinifixGateResult to GateResult format
  return {
    passed: gateResult.status === 'PASS' && g11Result.status === 'PASS' && connectorAudit.status === 'PASS',
    runAt: new Date().toISOString(),
    policyVersion: 'minifix-v1.0+g11-connector-os-v1.1',
    findings: {
      blockers: [
        ...gateResult.findings
          .filter(f => f.severity === 'ERROR')
          .map(minifixFindingToBlockerFinding),
        ...extraBlockers,
      ],
      warnings: [
        ...gateResult.findings
          .filter(f => f.severity === 'WARNING')
          .map(f => ({
            key: `${f.code}:${f.entityIds.join(',')}`,
            code: f.code,
            message: f.message,
            severity: 'WARNING' as Severity,
            entityIds: f.entityIds,
            context: f.measured,
          })),
        ...extraWarnings,
      ],
      // Minifix INFO first, mirroring the blockers/warnings buckets above
      // (producer findings, then the second-layer extras).
      info: [
        ...gateResult.findings
          .filter(f => f.severity === 'INFO')
          .map(minifixFindingToInfoFinding),
        ...extraInfo,
      ],
    },
    metrics: {
      errors: gateResult.summary.errors + g11Result.summary.blockers + connectorAudit.summary.blockers,
      warnings: gateResult.summary.warnings + g11Result.summary.warnings + connectorAudit.summary.warnings,
      connectorJointsAudited: connectorAudit.summary.jointsAudited,
      // Coverage of this run — a verdict over zero points proves nothing.
      pointsValidated: g11Result.summary.pointsValidated,
    },
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Run Gate validation on the current drill map and update the store.
 * Converts validateMinifixGate result to GateResult format.
 */
export function runGateValidation(): Promise<void> {
  const { setRunning, setResult } = useGateStore.getState();
  const drillMap = useDrillMapStore.getState().drillMap;

  // Set running state
  setRunning(true);

  // T8b: awaitable so a surface (e.g. the Freeze button) can auto-run the gate
  // and then act on the verdict. Resolves after setResult/setRunning settle —
  // never rejects, because the catch path already records the failure state.
  let settle: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });

  // DEBUG: version marker to ensure HMR reloads this code
  console.log('[SafetyPanel v2] Starting validation with debug logging...');

  // Run validation (synchronous, but we use setTimeout to allow UI to update)
  setTimeout(() => {
    try {
      const result = buildGateResult(drillMap, {
        cabinet: useCabinetStore.getState().cabinet,
        connectorDensity: useDrillMapStore.getState().connectorDensity,
      });

      // T8a: hand the store the EXACT map this verdict was computed from.
      // `drillMap` was captured before this setTimeout; the store's legacy
      // fallback would read whatever the store holds NOW, so an edit landing
      // inside the ~50ms window would stamp a stale verdict as fresh —
      // fail-open in the wrong direction for a safety gate.
      setResult(result, drillMap);
      console.log('[SafetyPanel] Gate validation completed:', result.passed ? 'PASS' : 'FAIL',
        `| blockers: ${result.findings.blockers.length}`,
        `| warnings: ${result.findings.warnings.length}`,
        `| info: ${result.findings.info.length}`,
        `| joints audited: ${result.metrics?.connectorJointsAudited ?? 0}`);
    } catch (error) {
      console.error('[SafetyPanel] Gate validation error:', error);
      // Fail closed (G2): a crashed run must NOT leave the previous verdict
      // standing as authority — that verdict would still read clean+fresh and
      // would authorize freeze/export off a validation that never completed.
      // Record the crash AS the verdict, validated against this map.
      setResult(
        {
          passed: false,
          runAt: new Date().toISOString(),
          policyVersion: 'error',
          findings: {
            blockers: [{
              key: 'GATE_RUN_FAILED',
              code: 'B_GATE_RUN_FAILED',
              message: `Safety Gate did not complete: ${error instanceof Error ? error.message : String(error)}`,
              severity: 'BLOCKER' as Severity,
              entityIds: [],
            }],
            warnings: [],
            info: [],
          },
          metrics: { errors: 1, warnings: 0, pointsValidated: 0 },
        },
        drillMap,
      );
      setRunning(false);
    } finally {
      settle();
    }
  }, 50);

  return done;
}

export function SafetyPanel() {
  const lastResult = useGateStore(s => s.lastResult);
  const isRunning = useGateStore(s => s.isRunning);
  const selectedFindingKey = useGateStore(s => s.selectedFindingKey);
  // A refused "Apply fix" must be visible in the UI, not only in the console.
  const [fixError, setFixError] = React.useState<string | null>(null);

  // ────────────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────────────

  const handleFocus = (finding: GateFinding) => {
    focusAndSelectFinding(finding.key, finding.entityIds);
  };

  const handleApplyFix = (finding: GateFinding) => {
    const outcome = applyFindingFixDetailed(finding);
    if (outcome.ok) {
      setFixError(null);
      // Re-run validation after fix to verify the issue is resolved.
      // Required, not cosmetic: applyGatePatches replaced the drill map object,
      // so the stored verdict is now STALE (gateStore.isGateResultFresh) and
      // freeze/export refuse until this run completes.
      runGateValidation();
      console.log('[SafetyPanel] Fix applied successfully, re-running validation');
    } else {
      // Never report a phantom success: the store was left untouched.
      setFixError(`${finding.code}: fix NOT applied — ${outcome.failure.reason}`);
      console.error('[SafetyPanel] Fix refused:', outcome.failure);
    }
  };

  const handleCopy = (finding: GateFinding) => {
    const text = `${finding.severity}: ${finding.code}\n${finding.message}\nEntities: ${finding.entityIds.join(', ')}`;
    navigator.clipboard.writeText(text);
    console.log('[SafetyPanel] Copied finding to clipboard');
  };

  const handleRunGate = () => {
    // Trigger Gate validation
    runGateValidation();
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render: No result
  // ────────────────────────────────────────────────────────────────────────

  if (!lastResult) {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-white flex items-center gap-1.5">
            <span>🛡️</span>
            Safety Gate
          </h3>
          <button
            onClick={handleRunGate}
            disabled={isRunning}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
              bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
          >
            <RefreshIcon />
            {isRunning ? 'Running...' : 'Run Gate'}
          </button>
        </div>

        <div className="p-4 bg-surface-2 rounded-lg border border-[#333] text-center">
          <div className="text-[10px] text-gray-500">
            No validation run yet.
          </div>
          <div className="text-[9px] text-gray-600 mt-1">
            Click "Run Gate" to validate drill patterns.
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render: Has result
  // ────────────────────────────────────────────────────────────────────────

  const counts = countBySeverity(lastResult);
  const allFindings = [
    ...lastResult.findings.blockers,
    ...lastResult.findings.warnings,
    ...lastResult.findings.info,
  ];

  return (
    <div className="p-2 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-white flex items-center gap-1.5">
          <span>🛡️</span>
          Safety Gate
        </h3>
        <button
          onClick={handleRunGate}
          disabled={isRunning}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
            bg-surface-3 text-gray-400 hover:text-white hover:bg-surface-4 disabled:opacity-50 transition-colors"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Status Summary */}
      <div
        className={`p-2 rounded-lg mb-2 flex items-center justify-between ${
          lastResult.passed ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}
      >
        <span
          className={`text-[10px] font-medium ${
            lastResult.passed ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {lastResult.passed ? '✓ PASSED' : '✗ FAILED'}
        </span>
        <div className="flex items-center gap-2 text-[9px]">
          {counts.BLOCKER > 0 && (
            <span className="text-red-400">{counts.BLOCKER} blocker</span>
          )}
          {counts.WARNING > 0 && (
            <span className="text-amber-400">{counts.WARNING} warn</span>
          )}
          {counts.INFO > 0 && (
            <span className="text-blue-400">{counts.INFO} info</span>
          )}
        </div>
      </div>

      {/* Fix refusal — a fix that did not apply must say so */}
      {fixError && (
        <div className="p-2 rounded-lg mb-2 bg-red-500/10 border border-red-500/30">
          <div className="text-[10px] text-red-400 font-medium mb-0.5">Fix not applied</div>
          <div className="text-[9px] text-red-300 break-words">{fixError}</div>
        </div>
      )}

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {allFindings.length === 0 ? (
          <div className="p-4 bg-green-500/10 rounded-lg text-center">
            <div className="text-[10px] text-green-400">
              All checks passed
            </div>
          </div>
        ) : (
          allFindings.map((finding) => (
            <FindingCard
              key={finding.key}
              finding={finding}
              isSelected={finding.key === selectedFindingKey}
              onFocus={() => handleFocus(finding)}
              onApplyFix={() => handleApplyFix(finding)}
              onCopy={() => handleCopy(finding)}
            />
          ))
        )}
      </div>

      {/* Clear Selection Button */}
      {selectedFindingKey && (
        <button
          onClick={() => clearEntityFocus()}
          className="mt-2 w-full py-1.5 rounded text-[10px] font-medium
            bg-surface-3 text-gray-400 hover:text-white transition-colors"
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}

export default SafetyPanel;
