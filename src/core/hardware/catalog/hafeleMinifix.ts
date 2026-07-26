/**
 * Häfele Minifix® 15 — transcribed from the reference corpus, with citations.
 *
 * SOURCE (one document, one revision, two pages):
 *   Häfele, "Ixconnect Cabinet Connectors / Häfele Minifix® — Planning and
 *   Construction", revision line printed on every page:
 *     "DGH-M 2021, HDE-en, 11/20"
 *   Corpus file: Documents/blaetterkatalog (1).pdf
 *     page 22 — the system's minimum wood thickness and housing bore diameters
 *     page 24 — the per-wood-thickness housing table with catalogue numbers
 *
 * WHAT THIS SETTLES. The system previously refused every panel under 17.5mm
 * because the single hardcoded bolt bore did not fit, and the accompanying
 * report said no qualified Häfele thickness range existed. It does exist, it is
 * printed in this catalogue, and it starts at 12mm — so a 16mm carcass is not
 * unbuildable, it simply needs the article Häfele qualifies for 16mm instead of
 * the one for 18mm.
 *
 * WHAT THIS DOES NOT SETTLE, and must not be read as settling:
 *   - The BOLT side. Our config uses a 17.5mm deep Ø10 bore with an 11mm shaft.
 *     Neither 17.5 nor Ø10 appears in the housing table, and the S200/S300
 *     connecting bolts on page 27 print thread lengths of 7.5 and 12mm. Where
 *     17.5 comes from is UNRESOLVED and is recorded as such below rather than
 *     rationalised.
 *   - Residual wall adequacy. Häfele publishes a bore depth per thickness; it
 *     does not publish a minimum remaining ligament. Nothing here licenses a
 *     judgement about how little wall is enough.
 *   - Production qualification of this system's chain. Cited fastener geometry
 *     is not a validated post-processor, NC output or first article.
 *
 * Transcribed by reading the extracted page text directly. Rows marked
 * UNVERIFIED were transcribed but not independently re-checked at the time of
 * writing; the mining pass over the full corpus is the second reader.
 */

import type {
    ConnectorFamilyCatalog,
    ConnectorHousingVariant,
    HardwareCitation,
    HousingSelection,
} from './hardwareCatalogTypes';

const HAFELE_MINIFIX_DOC = {
    vendor: 'Häfele',
    catalogue: 'Ixconnect Cabinet Connectors — Häfele Minifix®, Planning and Construction',
    catalogueRevision: 'DGH-M 2021, HDE-en, 11/20',
    docFile: 'Documents/blaetterkatalog (1).pdf',
} as const;

const cite = (page: number, snippet: string): HardwareCitation => ({
    ...HAFELE_MINIFIX_DOC,
    page,
    snippet,
});

/**
 * Page 24, the housing table for SW4 hexagon socket drive. Seven rows, each
 * "For wood thickness / Drilling depth D / Dim. A" with a bright and a nickel
 * plated catalogue number. This table is clean in the extracted text — the
 * rows are sequential and each carries its own pair of article numbers — which
 * is why these are VERIFIED and the page 23 row (below) is not.
 *
 * The 18mm row corroborates the two numbers the drill map already used:
 * drilling depth 13.5 and dim A 9.
 */
const PAGE_24_HOUSINGS: ConnectorHousingVariant[] = [
    {
        minWoodThicknessMm: 15,
        drillDepthMm: 12.0,
        drillDepthTolerance: '+0.5',
        dimAMm: 7.5,
        drillDiameterMm: 15,
        articleNos: ['262.26.032', '262.26.532'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 15 | 12.0+0.5 | 7.5 | 262.26.032 | 262.26.532'),
    },
    {
        minWoodThicknessMm: 16,
        drillDepthMm: 12.5,
        drillDepthTolerance: '+0.5',
        dimAMm: 8,
        drillDiameterMm: 15,
        articleNos: ['262.26.033', '262.26.533'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 16 | 12.5+0.5 | 8 | 262.26.033 | 262.26.533'),
    },
    {
        minWoodThicknessMm: 18,
        drillDepthMm: 13.5,
        drillDepthTolerance: '+0.5',
        dimAMm: 9,
        drillDiameterMm: 15,
        articleNos: ['262.26.034', '262.26.534'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 18 | 13.5+0.5 | 9 | 262.26.034 | 262.26.534'),
    },
    {
        minWoodThicknessMm: 19,
        drillDepthMm: 14.0,
        drillDepthTolerance: '+0.5',
        dimAMm: 9.5,
        drillDiameterMm: 15,
        articleNos: ['262.26.035', '262.26.535'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 19 | 14.0+0.5 | 9.5 | 262.26.035 | 262.26.535'),
    },
    {
        minWoodThicknessMm: 23,
        drillDepthMm: 16.5,
        drillDepthTolerance: '+0.5',
        dimAMm: 11.5,
        drillDiameterMm: 15,
        articleNos: ['262.26.036', '262.26.536'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 23 | 16.5+0.5 | 11.5 | 262.26.036 | 262.26.536'),
    },
    {
        minWoodThicknessMm: 26,
        drillDepthMm: 18.0,
        // Printed with a comma decimal in the source ('18.0+0,5'); kept as the
        // vendor prints it rather than silently anglicised.
        drillDepthTolerance: '+0,5',
        dimAMm: 13,
        drillDiameterMm: 15,
        articleNos: ['262.26.037', '262.26.537'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 26 | 18.0+0,5 | 13 | 262.26.037 | 262.26.537'),
    },
    {
        minWoodThicknessMm: 29,
        drillDepthMm: 19.5,
        drillDepthTolerance: '+0.5',
        dimAMm: 14.5,
        drillDiameterMm: 15,
        articleNos: ['262.26.038', '262.26.538'],
        confidence: 'VERIFIED',
        citation: cite(24, 'From 29 | 19.5+0.5 | 14.5 | 262.26.038 | 262.26.538'),
    },
];

/**
 * Page 23 also prints a "From 12 / 9.5+0.2 / dim A 6" row with articles
 * 262.17.020 and 262.17.620. That page lists THREE products at once — Minifix®
 * 12 without rim, Minifix® 12 with rim, and Minifix® 15 without rim for wood
 * from 12mm — and the extracted text does not make clear which of them the row
 * belongs to. The article prefix (262.17) differs from the page 24 table
 * (262.26), which suggests a different housing rather than another Minifix 15
 * variant.
 *
 * Recorded, flagged, and deliberately NOT used for selection. A 12mm cabinet
 * therefore does not silently pick up a recipe whose product identity is
 * unresolved: the selector reports NO_QUALIFIED_ARTICLE and the operator is
 * told to confirm the article on the page.
 */
const PAGE_23_AMBIGUOUS: ConnectorHousingVariant = {
    minWoodThicknessMm: 12,
    drillDepthMm: 9.5,
    drillDepthTolerance: '+0.2',
    dimAMm: 6,
    // Page 22: "The drill hole Ø for the housing is 12 mm for Minifix® 12 and
    // 15 mm for Minifix® 15" — so the diameter depends on which product this
    // row is, which is exactly what is unresolved.
    drillDiameterMm: Number.NaN,
    articleNos: ['262.17.020', '262.17.620'],
    confidence: 'AMBIGUOUS',
    ambiguity:
        'Page 23 lists Minifix 12 (without rim, with rim) and Minifix 15 for wood from 12mm ' +
        'together. The extracted text does not bind this row to one product, and the 262.17 ' +
        'article prefix differs from the Minifix 15 table on page 24 (262.26). Housing bore ' +
        'diameter therefore unknown: 12mm for Minifix 12, 15mm for Minifix 15 (page 22). ' +
        'Needs a human read of page 23 before use.',
    citation: cite(23, 'From 12 | 9.5+0.2 | 6 | PZ2 cross slot or flat blade | 262.17.020 | 262.17.620'),
};

export const HAFELE_MINIFIX_15: ConnectorFamilyCatalog = {
    id: 'hafele-minifix-15',
    vendor: 'Häfele',
    family: 'Häfele Minifix® 15',
    systemMinThickness: {
        thicknessMm: 12,
        statement: 'The Minifix® system is suitable for wood thicknesses from 12 mm and above',
        citation: cite(
            22,
            'The Minifix® system is suitable for wood thicknesses from 12 mm and above. ' +
                'The drill hole Ø for the housing is 12 mm for Minifix® 12 and 15 mm for Minifix® 15',
        ),
    },
    housings: [...PAGE_24_HOUSINGS, PAGE_23_AMBIGUOUS],
    unknowns: [
        'BOLT side: our 17.5mm deep Ø10 bore and 11mm shaft length are not in this table. ' +
            'Page 27 prints S200/S300 connecting bolt thread lengths of 7.5 and 12mm and drilling ' +
            'dimension B of 24 or 34mm. The origin of 17.5 is UNRESOLVED.',
        'Residual wall / minimum remaining ligament after a housing bore: not stated on pages 22-24.',
        'Whether the 12mm row on page 23 is a Minifix 12 or a Minifix 15 article: unresolved.',
        'Edge-bore depth limits for the bolt passage: not covered by these pages.',
        'Nothing here is a production qualification of this system: no nesting, post-processor, ' +
            'NC or first-article evidence is implied by a cited fastener geometry.',
    ],
};

/**
 * Pick the housing Häfele qualifies for a given member thickness.
 *
 * Rules, all fail-closed:
 *  - Below the system minimum (12mm), there is no article. No "closest" match,
 *    no scaling. A fallback is exactly how an 18mm recipe reached a 6mm panel.
 *  - Only VERIFIED rows are selectable. An AMBIGUOUS row is reported as no
 *    qualified article, with its ambiguity in the message, because a recipe
 *    whose product identity is unresolved is not a recipe.
 *  - The chosen row is the LARGEST minWoodThicknessMm at or below the member,
 *    which is how the vendor's "From N" ranges work.
 */
export function selectMinifixHousing(memberThicknessMm: number): HousingSelection {
    if (!Number.isFinite(memberThicknessMm) || memberThicknessMm <= 0) {
        return {
            ok: false,
            reason: 'THICKNESS_UNDECLARED',
            message:
                'the panel declares no usable thickness, so no Minifix housing can be selected — ' +
                'set the panel material and thickness first',
        };
    }

    const min = HAFELE_MINIFIX_15.systemMinThickness;
    if (memberThicknessMm < min.thicknessMm) {
        return {
            ok: false,
            reason: 'BELOW_SYSTEM_MINIMUM',
            message:
                `a ${memberThicknessMm}mm panel is below the Minifix system minimum of ` +
                `${min.thicknessMm}mm ("${min.statement}", ${HAFELE_MINIFIX_15.vendor} ` +
                `${min.citation.catalogueRevision} p.${min.citation.page}) — this member needs a ` +
                'different construction, not a shallower hole',
        };
    }

    const candidates = HAFELE_MINIFIX_15.housings
        .filter((h) => h.confidence === 'VERIFIED' && h.minWoodThicknessMm <= memberThicknessMm)
        .sort((a, b) => b.minWoodThicknessMm - a.minWoodThicknessMm);

    const variant = candidates[0];
    if (!variant) {
        const flagged = HAFELE_MINIFIX_15.housings
            .filter((h) => h.confidence !== 'VERIFIED' && h.minWoodThicknessMm <= memberThicknessMm)
            .map((h) => `${h.articleNos.join('/')} (${h.confidence}: ${h.ambiguity ?? 'unspecified'})`);
        return {
            ok: false,
            reason: 'NO_QUALIFIED_ARTICLE',
            message:
                `no VERIFIED Minifix housing is recorded for a ${memberThicknessMm}mm member` +
                (flagged.length > 0
                    ? `. The catalogue does show ${flagged.join('; ')} — confirm the article against ` +
                      `${HAFELE_MINIFIX_15.vendor} ${min.citation.catalogueRevision} p.23 before using it`
                    : ''),
        };
    }

    return { ok: true, variant };
}
