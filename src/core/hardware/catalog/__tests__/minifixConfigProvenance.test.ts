/**
 * The provenance table is only useful if it stays honest and stays in sync with
 * the numbers the generator actually emits. These tests pin both.
 *
 * They are deliberately assertive about the UNSOURCED entries. It would be very
 * easy for a later change to quietly "resolve" 17.5mm by adding a comment that
 * says Häfele, which is exactly the state this file was written to end.
 */

import { describe, it, expect } from 'vitest';
import {
  MINIFIX_CONFIG_PROVENANCE,
  auditMinifixConfigProvenance,
  HAFELE_MINIFIX_PAGE_STAMPS,
} from '../minifixConfigProvenance';
import { DEFAULT_MINIFIX_S200_CONFIG } from '../../../manufacturing/drillMap/minifixDefaults';

describe('every recipe number declares where it came from', () => {
  it('CITED entries carry a page and a snippet that contains the value', () => {
    for (const p of MINIFIX_CONFIG_PROVENANCE.filter((x) => x.tier === 'CITED')) {
      expect(p.citation, `${p.field} claims CITED`).toBeDefined();
      expect(p.citation!.page, p.field).toBeGreaterThan(0);
      expect(p.citation!.snippet, p.field).toContain(String(p.value));
    }
  });

  it('DERIVED entries state the reasoning and what cited fact it rests on', () => {
    const derived = MINIFIX_CONFIG_PROVENANCE.filter((x) => x.tier === 'DERIVED');
    expect(derived.length).toBeGreaterThan(0);
    for (const p of derived) {
      expect(p.derivation, `${p.field} claims DERIVED`).toBeTruthy();
      expect(p.derivation!.length, p.field).toBeGreaterThan(80);
      expect(p.citation, 'a derivation is our reasoning, not a citation').toBeUndefined();
    }
  });

  it('UNSOURCED entries state what was SEARCHED, not just that it is missing', () => {
    // An absence claim without its search is an opinion. This is the discipline
    // that was missing when the branch reported "no cited Häfele range exists".
    for (const p of MINIFIX_CONFIG_PROVENANCE.filter((x) => x.tier === 'UNSOURCED')) {
      expect(p.absenceEvidence, `${p.field} claims UNSOURCED`).toBeTruthy();
      expect(p.absenceEvidence!, `${p.field} must name the search scope`).toMatch(/16-52|every|search/i);
    }
  });

  it('every entry says what goes wrong if the number is wrong', () => {
    for (const p of MINIFIX_CONFIG_PROVENANCE) {
      expect(p.consequence.length, p.field).toBeGreaterThan(30);
    }
  });
});

describe('the table describes the recipe the generator actually uses', () => {
  const byField = (f: string) => MINIFIX_CONFIG_PROVENANCE.find((p) => p.field.startsWith(f));

  it('tracks the live config values, so drift shows up here as a failure', () => {
    // If someone changes a config number without revisiting its provenance,
    // this fails — which is the whole point.
    expect(byField('camDia')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.camDia);
    expect(byField('camDepth')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.camDepth);
    expect(byField('camHeight')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.camHeight);
    expect(byField('shaftDia')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.shaftDia);
    expect(byField('shaftLength')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.shaftLength);
    expect(byField('drillingDistanceB')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.drillingDistanceB);
    expect(byField('boltBoreDepth')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.boltBoreDepth);
    expect(byField('sleeveDia')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.sleeveDia);
    expect(byField('boltEntryDia')!.value).toBe(DEFAULT_MINIFIX_S200_CONFIG.boltEntryDia);
  });

  it('holds 17.5 as UNSOURCED after a WHOLE-VOLUME search, not a partial one', () => {
    const depth = byField('boltBoreDepth')!;
    expect(depth.tier).toBe('UNSOURCED');
    // The scope is the load-bearing part of an absence claim.
    expect(depth.absenceEvidence).toMatch(/ALL 2768 pages/);
    expect(depth.absenceEvidence, 'the sleeve pages were the obvious hiding place')
      .toMatch(/MB 14\.60-14\.65/);
    // It is the number every thin-panel refusal is computed from, and that has
    // to be said out loud next to it.
    expect(depth.consequence).toMatch(/refus/i);
  });

  it('holds Ø10 as CONTRADICTED, which is a stronger claim than UNSOURCED', () => {
    const dia = byField('sleeveDia')!;
    // The catalogue does not merely omit Ø10 — it enumerates the permitted
    // Minifix bolt holes and Ø10 is not among them. Filing that as a gap would
    // turn a disagreement with the vendor into a to-do item.
    expect(dia.tier).toBe('CONTRADICTED');
    expect(dia.absenceEvidence).toContain('Ø 5, 7 or 8 mm');
  });

  it('records the CORRECTION to its own false absence claim about 7.5', () => {
    // The first draft asserted 7.5 appeared nowhere, from a search of pages
    // 16-52 only. It appears on at least six pages. Keeping the correction in
    // the data is the point: this file is about not repeating that mistake.
    const entry = byField('boltEntryDia')!;
    expect(entry.absenceEvidence).toMatch(/CORRECTION/);
    expect(entry.absenceEvidence, 'and it names the series it really belongs to')
      .toMatch(/MB 4\.121/);
  });

  it('keeps drilling dim B labelled as a DISTANCE, and the entry depth as OUR inference', () => {
    const b = byField('drillingDistanceB')!;
    expect(b.tier).toBe('CITED');
    expect(b.citation!.snippet).toContain('Distance from centre');
    expect(b.consequence, 'must warn that the code reuses it as a depth').toMatch(/NOT A DEPTH/);

    const entry = byField('BOLT_ENTRY')!;
    expect(entry.tier).toBe('DERIVED');
    expect(entry.derivation).toMatch(/NO bolt-side bore depth/i);
  });

  it('records per-page revision stamps, not just the catalogue-level one', () => {
    // Pages are re-issued individually; an effectivity record built only on the
    // running header mis-dates them.
    const p27 = HAFELE_MINIFIX_PAGE_STAMPS.find((s) => s.page === 27);
    expect(p27!.stamp).toContain('21.02.2024');
    expect(p27!.stamp).toContain('WS 577');
  });
});

describe('the audit reports the truth, without pretending to be a gate', () => {
  it('reports what the recipe cannot defend, and names it in the summary', () => {
    const a = auditMinifixConfigProvenance();
    expect(a.fullySourced, 'the recipe cannot currently cite itself in full').toBe(false);
    expect(a.contradicted.length, 'Ø10 bolt hole').toBe(1);
    expect(a.unsourced.length, '17.5 depth and the Ø7.5 entry application').toBe(2);
    expect(a.summary).toMatch(/boltBoreDepth.*17\.5.*UNSOURCED/);
    expect(a.summary).toMatch(/sleeveDia.*10.*CONTRADICTED/);
  });

  it('partitions every entry into exactly one tier', () => {
    const a = auditMinifixConfigProvenance();
    expect(a.cited.length + a.derived.length + a.contradicted.length + a.unsourced.length)
      .toBe(MINIFIX_CONFIG_PROVENANCE.length);
  });
});
