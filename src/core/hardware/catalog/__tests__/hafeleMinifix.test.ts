/**
 * The catalog exists so a bore depth can be traced to a printed vendor article
 * instead of a plausible-looking constant. These tests pin the two properties
 * that make it worth having: every number carries a citation, and selection
 * fails closed rather than falling back.
 */

import { describe, it, expect } from 'vitest';
import { HAFELE_MINIFIX_15, selectMinifixHousing } from '../hafeleMinifix';

describe('Häfele Minifix catalog — provenance', () => {
  it('every housing row cites a document, revision, page and verbatim snippet', () => {
    for (const h of HAFELE_MINIFIX_15.housings) {
      const c = h.citation;
      expect(c.vendor, 'vendor').toBeTruthy();
      expect(c.catalogueRevision, `revision for ${h.articleNos.join('/')}`).toMatch(/\S/);
      expect(c.docFile).toMatch(/\.pdf$/);
      expect(c.page).toBeGreaterThan(0);
      expect(c.snippet.length, `snippet for ${h.articleNos.join('/')}`).toBeGreaterThan(10);
      // The snippet must actually contain the depth it is cited for, otherwise
      // the citation is decoration.
      expect(c.snippet).toContain(String(h.drillDepthMm));
      expect(h.articleNos.length, 'a recipe without an article number is a constant').toBeGreaterThan(0);
    }
  });

  it('states the system minimum thickness as a quote, not a paraphrase', () => {
    const m = HAFELE_MINIFIX_15.systemMinThickness;
    expect(m.thicknessMm).toBe(12);
    expect(m.statement).toContain('12 mm and above');
    expect(m.citation.snippet).toContain(m.statement);
  });

  it('keeps its own gaps in the data, not only in comments', () => {
    // A consumer must be able to see that the bolt side is unresolved without
    // reading prose. Absence of a field must never read as absence of a limit.
    expect(HAFELE_MINIFIX_15.unknowns.join(' ')).toMatch(/17\.5/);
    expect(HAFELE_MINIFIX_15.unknowns.join(' ')).toMatch(/residual wall/i);
  });

  it('corroborates the 18mm numbers the drill map already used', () => {
    const r = selectMinifixHousing(18);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.variant.drillDepthMm, 'camDepth 13.5 was right for 18mm').toBe(13.5);
    expect(r.variant.dimAMm, 'dim A 9 was right for 18mm').toBe(9);
    expect(r.variant.articleNos).toContain('262.26.034');
  });
});

describe('selection fails closed — no fallback, no closest match', () => {
  it('gives 16mm its OWN article, not the 18mm recipe', () => {
    // The dead end this removes: a 16mm carcass used to lose every corner
    // connector because the single 18mm recipe did not fit.
    const r = selectMinifixHousing(16);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.variant.minWoodThicknessMm).toBe(16);
    expect(r.variant.drillDepthMm).toBe(12.5);
    expect(r.variant.articleNos).toContain('262.26.033');
  });

  it('picks the largest qualifying range, the way "From N" works', () => {
    const r = selectMinifixHousing(17);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.variant.minWoodThicknessMm, '17mm uses the From-16 article').toBe(16);
  });

  it('REFUSES below the system minimum and quotes the vendor', () => {
    const r = selectMinifixHousing(6);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('BELOW_SYSTEM_MINIMUM');
    expect(r.message).toContain('12 mm and above');
    expect(r.message, 'the refusal must carry the next action').toMatch(/different construction/);
    expect(r.message, 'and must not suggest shallowing the hole').toMatch(/not a shallower hole/);
  });

  it('REFUSES a 12mm member rather than using the AMBIGUOUS page-23 row', () => {
    // The row exists in the catalogue but its product identity is unresolved,
    // and an unresolved recipe is not a recipe.
    const r = selectMinifixHousing(12);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('NO_QUALIFIED_ARTICLE');
    expect(r.message).toContain('262.17.020');
    expect(r.message).toMatch(/confirm the article/i);
  });

  it('REFUSES an undeclared thickness instead of defaulting', () => {
    for (const bad of [Number.NaN, 0, -18, Number.POSITIVE_INFINITY]) {
      const r = selectMinifixHousing(bad as number);
      expect(r.ok, `thickness ${bad}`).toBe(false);
    }
  });

  it('never returns an AMBIGUOUS row from selection at any thickness', () => {
    for (let t = 1; t <= 60; t++) {
      const r = selectMinifixHousing(t);
      if (r.ok) expect(r.variant.confidence, `t=${t}`).toBe('VERIFIED');
    }
  });
});
