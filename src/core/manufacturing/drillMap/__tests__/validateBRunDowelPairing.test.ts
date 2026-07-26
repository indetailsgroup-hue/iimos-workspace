/**
 * validateBRunDowelPairing — unit tests
 *
 * Tests the B-run dowel pair contract guard with SYNTHETIC fixtures only.
 *
 * NOTE (owner ruling Q6=A, 2026-07-26): the generator no longer emits
 * B-run points — generateBRunDowelPoints was retired (see B_RUN_RETIRED in
 * generateDrillMap.ts and __tests__/bRunDowelGeneration.test.ts). The
 * validator source is retained for HISTORICAL drill-map data that may still
 * carry '-B-' keys, so these pure unit tests stay as its contract.
 */

import { describe, it, expect } from 'vitest';
import { validateBRunDowelPairing, type BRunPointLike } from '../validateBRunDowelPairing';
import type { Vec3Tuple } from '../types';

function mkPoint(overrides: Partial<BRunPointLike> & { pairKeyV2: string }): BRunPointLike {
  return {
    purpose: 'DOWEL',
    position: [0, 0, 0] as Vec3Tuple,
    normal: [0, 1, 0] as Vec3Tuple,
    diameter: 8,
    ...overrides,
  };
}

describe('validateBRunDowelPairing', () => {
  // ---- Pass cases ----
  // Fixture coordinates follow the corrected B-run contract (owner ruling
  // Q4=A 2026-07-26): pairs at FIXED X = the SIDE panel's mid-thickness
  // plane (±291 on the 600-wide fixture), distributed along DEPTH
  // (worldZ ∈ {523, 37} from stations {37, 523}), ON the panel bodies.

  it('returns [] for a correct pair (opposing normals, same X/Z, same Ø)', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', position: [-291, 702, 523], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-side', position: [-291, 720, 523], normal: [0, -1, 0] }),
    ];
    expect(validateBRunDowelPairing(points)).toEqual([]);
  });

  it('returns [] for multiple correct pairs', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', position: [-291, 702, 523], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-side', position: [-291, 720, 523], normal: [0, -1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_RIGHT-B-523-dowel-brun-horiz', position: [291, 702, 37], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_RIGHT-B-523-dowel-brun-side', position: [291, 720, 37], normal: [0, -1, 0] }),
    ];
    expect(validateBRunDowelPairing(points)).toEqual([]);
  });

  it('ignores non-DOWEL points', () => {
    const points: BRunPointLike[] = [
      mkPoint({ purpose: 'BOLT', pairKeyV2: 'pair2-TOP_LEFT-B-37-bolt' }),
    ];
    expect(validateBRunDowelPairing(points)).toEqual([]);
  });

  it('ignores A-run DOWELs (no -B- in key)', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-37-dowel-side' }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-37-dowel-horiz' }),
    ];
    expect(validateBRunDowelPairing(points)).toEqual([]);
  });

  // ---- Fail: odd pair count ----

  it('flags odd pair count (1 member)', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', position: [-291, 702, 523], normal: [0, 1, 0] }),
      // missing side bore
    ];
    const issues = validateBRunDowelPairing(points);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('DRILLMAP:BRUN_ODD_PAIR_COUNT');
  });

  // ---- Fail: diameter mismatch ----

  it('flags diameter mismatch', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', diameter: 8, position: [-291, 702, 523], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-side', diameter: 10, position: [-291, 720, 523], normal: [0, -1, 0] }),
    ];
    const issues = validateBRunDowelPairing(points);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('DRILLMAP:BRUN_DIAMETER_MISMATCH');
  });

  // ---- Fail: normals not opposing ----

  it('flags parallel normals (same direction)', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', position: [-291, 702, 523], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-side', position: [-291, 720, 523], normal: [0, 1, 0] }), // WRONG: same direction
    ];
    const issues = validateBRunDowelPairing(points);
    expect(issues.some(i => i.code === 'DRILLMAP:BRUN_NORMALS_NOT_OPPOSING')).toBe(true);
  });

  // ---- Fail: position mismatch ----

  it('flags X position mismatch', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', position: [-291, 702, 523], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-side', position: [-251, 720, 523], normal: [0, -1, 0] }), // X off by 40mm
    ];
    const issues = validateBRunDowelPairing(points);
    expect(issues.some(i => i.code === 'DRILLMAP:BRUN_POSITION_MISMATCH')).toBe(true);
  });

  it('flags Z position mismatch', () => {
    const points: BRunPointLike[] = [
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-horiz', position: [-291, 702, 523], normal: [0, 1, 0] }),
      mkPoint({ pairKeyV2: 'pair2-TOP_LEFT-B-37-dowel-brun-side', position: [-291, 720, 387], normal: [0, -1, 0] }), // Z off by 136mm
    ];
    const issues = validateBRunDowelPairing(points);
    expect(issues.some(i => i.code === 'DRILLMAP:BRUN_POSITION_MISMATCH')).toBe(true);
  });
});
