/**
 * useExportGate - Gate Enforcement Hook for Export/Release
 *
 * Derives export permissions from Gate validation results.
 * Provides clear yes/no decisions for:
 * - canFreeze: Can transition DRAFT → FROZEN
 * - canRelease: Can transition FROZEN → RELEASED
 * - canExport: Can generate factory output (DXF, CNC, etc.)
 *
 * @version 1.0.0 - Phase B1: Gate Enforcement
 */

import { useCallback, useMemo } from 'react';
import { useGateStore, selectHasBlockers, isGateResultFresh } from './gateStore';
import { useDrillMapStore } from '../../core/store/useDrillMapStore';
import { openSafetyTab } from '../../designer/state/useIntentPanelStore';
import type { GateResult, GateFinding } from './gateTypes';

// ============================================
// TYPES
// ============================================

export interface ExportGateStatus {
  /** Can freeze spec (DRAFT → FROZEN) — requires a FRESH run with no blockers */
  canFreeze: boolean;

  /** Can release spec (FROZEN → RELEASED) — requires a FRESH run with no blockers */
  canRelease: boolean;

  /** Can export DXF/CNC output — requires a FRESH run with no blockers */
  canExport: boolean;

  /** Has gate been run at all */
  hasRun: boolean;

  /**
   * Did the run itself come back clean, ignoring freshness?
   *
   * Diagnostic only — never an authority. Lets a surface tell the user WHY it
   * is blocking: `passedWhenRun && !fresh` means "the cabinet changed, re-run
   * the gate", which is a different message from "fix your blockers".
   */
  passedWhenRun: boolean;

  /**
   * Is the stored verdict fresh for the CURRENT drill map?
   *
   * Freshness key = drill-map OBJECT IDENTITY: true only while the drillMap
   * object the verdict was validated against is still (===) the one held by
   * useDrillMapStore. Replacing or clearing the drill map flips this to
   * false while hasRun stays true. Fail-closed: false before any run.
   *
   * AUTHORITATIVE since T8a (owner ruling Q2 = O2+O3): canFreeze/canRelease/
   * canExport all require it. This is also what closes the vacuous PASS — the
   * three validators return PASS on a null drill map, but such a run records a
   * null validatedDrillMapRef, which is never fresh.
   */
  fresh: boolean;

  /** Is validation currently running */
  isRunning: boolean;

  /** Number of blockers */
  blockerCount: number;

  /** Number of warnings (non-blocking) */
  warningCount: number;

  /** Blockers list for display */
  blockers: GateFinding[];

  /** Full result for advanced use */
  result: GateResult | null;
}

export interface ExportGateActions {
  /** Open Safety tab and focus on first blocker */
  openFirstBlocker: () => void;

  /** Get reason why export is blocked */
  getBlockReason: () => string;
}

// ============================================
// HOOK
// ============================================

export function useExportGate(): ExportGateStatus & ExportGateActions {
  const result = useGateStore((s) => s.lastResult);
  const isRunning = useGateStore((s) => s.isRunning);
  const hasBlockers = useGateStore(selectHasBlockers);
  const selectFinding = useGateStore((s) => s.selectFinding);
  // Freshness inputs — subscribe to BOTH stores so consumers re-render the
  // moment the drill map object is replaced (setDrillMap always replaces).
  const validatedRef = useGateStore((s) => s.validatedDrillMapRef);
  const currentDrillMap = useDrillMapStore((s) => s.drillMap);

  // Derived values
  const status = useMemo<ExportGateStatus>(() => {
    const hasRun = result !== null;
    const blockers = result?.findings.blockers ?? [];
    const warnings = result?.findings.warnings ?? [];

    // The run's own verdict, ignoring freshness (diagnostic).
    const passedWhenRun = hasRun && blockers.length === 0;

    // Fresh = verdict exists AND was validated against the exact object the
    // drill map store currently holds (identity, fail-closed on null).
    const fresh = hasRun && validatedRef !== null && validatedRef === currentDrillMap;

    // Authority (T8a, owner ruling Q2 = O2+O3): a clean verdict only counts
    // while it still describes the cabinet in front of the user.
    const canProceed = passedWhenRun && fresh;

    return {
      canFreeze: canProceed,
      canRelease: canProceed,
      canExport: canProceed,
      hasRun,
      passedWhenRun,
      fresh,
      isRunning,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      blockers,
      result,
    };
  }, [result, isRunning, validatedRef, currentDrillMap]);

  // Actions
  const openFirstBlocker = useCallback(() => {
    const firstBlocker = status.blockers[0];
    if (firstBlocker) {
      // Select the finding and open Safety tab
      selectFinding(firstBlocker.key, firstBlocker.entityIds);
      openSafetyTab();
      console.log('[ExportGate] Opened Safety tab, selected:', firstBlocker.key);
    } else {
      // No blockers, just open Safety tab
      openSafetyTab();
    }
  }, [status.blockers, selectFinding]);

  const getBlockReason = useCallback((): string => {
    if (status.isRunning) {
      return 'Validation is running...';
    }
    if (!status.hasRun) {
      return 'Gate validation has not been run yet';
    }
    // A clean-but-stale verdict blocks for a different reason than a dirty one,
    // and the user needs the difference: re-run vs fix.
    if (status.blockerCount === 0 && !status.fresh) {
      return 'The cabinet changed since the last Safety Gate run — run the gate again';
    }
    if (status.blockerCount === 0) {
      return ''; // No block
    }
    if (status.blockerCount === 1) {
      return `1 blocker: ${status.blockers[0]?.message ?? 'Unknown issue'}`;
    }
    return `${status.blockerCount} blockers must be resolved`;
  }, [status]);

  return {
    ...status,
    openFirstBlocker,
    getBlockReason,
  };
}

// ============================================
// NON-REACT ACCESS
// ============================================

/**
 * Get export gate status outside React (for imperative code)
 */
export function getExportGateStatus(): ExportGateStatus {
  const state = useGateStore.getState();
  const result = state.lastResult;
  const hasRun = result !== null;
  const blockers = result?.findings.blockers ?? [];
  const warnings = result?.findings.warnings ?? [];
  const passedWhenRun = hasRun && blockers.length === 0;
  // Same authority as the hook (T8a): clean AND fresh.
  const fresh = isGateResultFresh();
  const canProceed = passedWhenRun && fresh;

  return {
    canFreeze: canProceed,
    canRelease: canProceed,
    canExport: canProceed,
    hasRun,
    passedWhenRun,
    fresh,
    isRunning: state.isRunning,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    blockers,
    result,
  };
}

/**
 * Check if export is allowed (simple boolean check)
 */
export function isExportAllowed(): boolean {
  const { canExport, hasRun } = getExportGateStatus();
  return hasRun && canExport;
}

/**
 * Check if freeze is allowed
 */
export function isFreezeAllowed(): boolean {
  const { canFreeze, hasRun } = getExportGateStatus();
  return hasRun && canFreeze;
}

/**
 * Check if release is allowed
 */
export function isReleaseAllowed(): boolean {
  const { canRelease, hasRun } = getExportGateStatus();
  return hasRun && canRelease;
}
