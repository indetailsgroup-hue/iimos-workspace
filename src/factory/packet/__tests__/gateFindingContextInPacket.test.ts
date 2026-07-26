/**
 * `waivable: false` must survive into the packet.
 *
 * GPT-5.6 Sol, cross-vendor gate 2026-07-26: "`waivable: false` is dropped at
 * the packet boundary and is read by nothing — non-waivability is documentation,
 * not enforcement." Confirmed by reading buildGateResult.ts:24 — convertFinding
 * copies key/code/severity/message/entityIds and drops `context` entirely, and
 * PacketGateFinding has nowhere to put it.
 *
 * That matters because the packet is the archived, hashed record of WHY a job
 * was blocked. A reviewer reading gate-result.json six months later sees a
 * blocker message and no machine-readable evidence: not the required depth, not
 * the member thickness, and not the fact that this class of blocker cannot be
 * waived. The measured/expected pair is exactly what an auditor needs to check
 * the verdict instead of trusting the prose.
 */

import { describe, it, expect } from 'vitest';
import { buildGateResultData, buildGateResultJson } from '../builders/buildGateResult';
import type { GateResult } from '../../../gate/ui/gateTypes';

function resultWithNonWaivableBlocker(): GateResult {
  return {
    passed: false,
    runAt: new Date(0).toISOString(),
    policyVersion: 'test',
    findings: {
      blockers: [
        {
          key: 'B_G11_MANUFACTURABILITY_REFUSAL:back',
          code: 'B_G11_MANUFACTURABILITY_REFUSAL',
          message: '[R_BORE_EXITS_PANEL] BOLT Ø10 needs 17.5mm, BACK back extends 6mm.',
          severity: 'BLOCKER',
          entityIds: ['back'],
          context: {
            reason: 'R_BORE_EXITS_PANEL',
            measured: 17.5,
            expected: 6,
            waivable: false,
            recipeSource: 'MinifixConfig.boltBoreDepth',
          },
        },
      ],
      warnings: [],
      info: [],
    },
    metrics: { errors: 1, warnings: 0 },
  } as unknown as GateResult;
}

describe('packet gate-result keeps the evidence behind a blocker', () => {
  it('carries the finding context, including waivable: false', () => {
    const data = buildGateResultData(resultWithNonWaivableBlocker());
    const blocker = data.findings.blockers[0];

    expect(blocker.context, 'the evidence a later auditor needs').toBeDefined();
    expect(blocker.context!.waivable).toBe(false);
    expect(blocker.context!.measured, 'required depth, as-is').toBe(17.5);
    expect(blocker.context!.expected, 'the member it does not fit').toBe(6);
  });

  it('omits context when a finding has none — no invented fields', () => {
    const r = resultWithNonWaivableBlocker();
    delete (r.findings.blockers[0] as { context?: unknown }).context;

    expect(buildGateResultData(r).findings.blockers[0].context).toBeUndefined();
  });

  it('stays deterministic — same input, byte-identical JSON', () => {
    expect(buildGateResultJson(resultWithNonWaivableBlocker()))
      .toBe(buildGateResultJson(resultWithNonWaivableBlocker()));
  });
});
