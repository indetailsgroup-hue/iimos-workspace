/**
 * Where every number in the live Minifix recipe actually comes from.
 *
 * This file exists because a two-vendor review asked "what binds a bore depth
 * to a real fastener?" and the answer was nothing. The config was a list of
 * plausible constants with a comment claiming a Häfele catalogue. Mining the
 * catalogue itself — Häfele Ixconnect / Minifix, DGH-M 2021, HDE-en, 11/20,
 * corpus file Documents/blaetterkatalog (1).pdf, 2768 pages — produced four
 * different answers, and they matter separately:
 *
 *   CITED         the number is printed in the catalogue, on a named page.
 *   DERIVED       not printed, but it follows from geometry the catalogue DOES
 *                 print. Legitimate — but it is OUR reasoning, not the vendor's
 *                 statement, and it must be labelled as ours.
 *   CONTRADICTED  the catalogue enumerates the permitted values for this field
 *                 and ours is not among them. A disagreement, not a gap.
 *   UNSOURCED     absent from the catalogue after a search whose scope is
 *                 recorded next to the claim.
 *
 * Nothing in this file changes an emitted coordinate. It makes the provenance
 * of each number inspectable, so "17.5mm because the config says so" can no
 * longer pass for "17.5mm per Häfele".
 *
 * VERIFICATION METHOD, so this can be re-run rather than trusted: the catalogue
 * was extracted to per-page UTF-8 text and searched literally, and each absence
 * claim below records the scope that was searched. This matters because the
 * FIRST draft of this file got one of them wrong: it asserted that 7.5 appears
 * nowhere, from a search of pages 16-52 only. 7.5 appears on at least six pages,
 * including a whole Häfele hole series at MB 4.121. The claim was corrected by
 * widening the search, which is the only thing that turns "I did not find it"
 * into "it is not there"
 */

import type { HardwareCitation } from './hardwareCatalogTypes';

const DOC = {
    vendor: 'Häfele',
    catalogue: 'Ixconnect Cabinet Connectors — Häfele Minifix®, Planning and Construction',
    catalogueRevision: 'DGH-M 2021, HDE-en, 11/20',
    docFile: 'Documents/blaetterkatalog (1).pdf',
} as const;

/**
 * Per-page revision stamp, where the page carries one.
 *
 * The running header says 11/20 on every page, but individual pages are
 * re-issued: page 27 carries "21.02.2024 / WS 577" and page 40 carries
 * "03.12.2021 / ID 5476". An effectivity record that captures only the
 * catalogue-level stamp mis-dates those pages, and every page also prints
 * "Dimensional data not binding. We reserve the right to alter specifications
 * without notice." — so the stamp is the only thing tying a number to a
 * specific issue of the sheet.
 */
export interface PageStamp {
    page: number;
    stamp: string;
}

export const HAFELE_MINIFIX_PAGE_STAMPS: PageStamp[] = [
    { page: 22, stamp: 'MB 4.8 (no page-level date printed)' },
    { page: 23, stamp: 'MB 4.9 (no page-level date printed)' },
    { page: 24, stamp: 'MB 4.10 (no page-level date printed)' },
    { page: 27, stamp: '21.02.2024 / WS 577 / MB 4.13' },
    { page: 40, stamp: '03.12.2021 / ID 5476' },
];

/**
 * CONTRADICTED is deliberately separate from UNSOURCED, because they call for
 * different actions. "The catalogue does not mention our number" is a gap in
 * the evidence. "The catalogue enumerates the permitted values and ours is not
 * among them" is a disagreement with the vendor. Collapsing the two into one
 * word is how a disagreement gets filed as a to-do.
 */
export type ProvenanceTier = 'CITED' | 'DERIVED' | 'CONTRADICTED' | 'UNSOURCED';

export interface NumberProvenance {
    /** Field name in MinifixConfig, or a described emitted quantity. */
    field: string;
    /** The value the system currently uses. */
    value: number | string;
    tier: ProvenanceTier;
    /** For CITED: the page and verbatim text. */
    citation?: HardwareCitation;
    /** For DERIVED: the reasoning, and which cited fact it rests on. */
    derivation?: string;
    /**
     * For UNSOURCED: what was searched, and — where the catalogue positively
     * disagrees — what it says instead. An absence claim without its search is
     * an opinion.
     */
    absenceEvidence?: string;
    /** What could go wrong if this number is wrong. Plain language. */
    consequence: string;
}

const cite = (page: number, snippet: string): HardwareCitation => ({ ...DOC, page, snippet });

export const MINIFIX_CONFIG_PROVENANCE: NumberProvenance[] = [
    // ─── CITED ────────────────────────────────────────────────────────────────
    {
        field: 'camDia',
        value: 15,
        tier: 'CITED',
        citation: cite(
            22,
            'The drill hole Ø for the housing is 12 mm for Minifix® 12 and 15 mm for Minifix® 15',
        ),
        consequence: 'A wrong housing bore Ø leaves the cam loose or unable to seat.',
    },
    {
        field: 'camDepth',
        value: 13.5,
        tier: 'CITED',
        citation: cite(24, 'From 18 | 13.5+0.5 | 9 | 262.26.034 | 262.26.534'),
        consequence:
            'Too deep breaks through an 18mm panel; too shallow and the housing stands proud.',
    },
    {
        field: 'camHeight (dim A)',
        value: 9,
        tier: 'CITED',
        citation: cite(24, 'From 18 | 13.5+0.5 | 9 | 262.26.034 | 262.26.534'),
        consequence: 'Dim A off-centre means the bolt head misses the cup and the joint gaps.',
    },
    {
        field: 'shaftDia',
        value: 5,
        tier: 'CITED',
        citation: cite(23, '> Bolt hole: Ø 5, 7 or 8 mm, depending on choice of connecting bolt'),
        consequence: 'Ø5 is one of the three diameters Häfele lists for a Minifix bolt hole.',
    },
    {
        field: 'shaftLength (thread length L)',
        value: 11,
        tier: 'CITED',
        citation: cite(27, 'S300 connecting bolt | thread length 11 | B 24 = 262.27.462 | B 34 = 262.28.462'),
        consequence:
            'CAUTION: Häfele calls this "thread length L" — the threaded portion driven into ' +
            'the side panel. Whether our "shaftLength" means the same quantity has NOT been ' +
            'confirmed against our own geometry. The number matches; the definition is unverified.',
    },
    {
        field: 'drillingDistanceB',
        value: 24,
        tier: 'CITED',
        citation: cite(
            23,
            '> Drilling dim. B: Distance from centre of Minifix® housing to shelf front edge ' +
                '(24 or 34 mm), depending on choice of connecting bolt',
        ),
        consequence:
            'CITED AS A DISTANCE, NOT A DEPTH. This is the in-plane distance from the panel ' +
            'edge to the housing axis. See the BOLT_ENTRY entry below: the code also uses this ' +
            'value as a bore DEPTH, which the catalogue does not license on its own.',
    },

    // ─── DERIVED ──────────────────────────────────────────────────────────────
    {
        field: 'BOLT_ENTRY bore depth (emitted, = drillingDistanceB)',
        value: 24,
        tier: 'DERIVED',
        derivation:
            'Häfele publishes NO bolt-side bore depth for standard Minifix connecting bolts: ' +
            'bolt rows carry only "Thread length L" and "Drilling dim. B". Our entry bore runs ' +
            'in from the panel edge to reach the bolt axis, and that axis sits at distance B ' +
            'from the edge (p.23), so the bore must span B. The NUMBER therefore follows from a ' +
            'cited fact — but reading "drilling dim. B" as a depth is OUR inference, and the ' +
            'code does it in four places (generateDrillMap.ts depth: effectiveDistanceB) with no ' +
            'note saying so. Labelled DERIVED so it is never quoted as a Häfele depth.',
        consequence:
            'If the derivation is wrong, an edge bore is drilled to the wrong depth along the ' +
            'panel — either not reaching the bolt, or running past the housing.',
    },
    {
        field: 'dowel Ø8 × 30 split (12 face + 18 edge)',
        value: '12 + 18',
        tier: 'DERIVED',
        derivation:
            'Häfele lists an 8 × 30 fluted dowel (267.83.232 / 267.83.234, US sheet FC 11.64). ' +
            'The 30mm length is cited; splitting it 12 into the face member and 18 into the edge ' +
            'member is our joint design, not a published figure.',
        consequence: 'A wrong split under-seats one half of the dowel.',
    },

    // ─── UNSOURCED ────────────────────────────────────────────────────────────
    {
        field: 'boltBoreDepth / sleeveLength',
        value: 17.5,
        tier: 'UNSOURCED',
        absenceEvidence:
            'Searched ALL 2768 pages of the volume for "17.5" and "17,5", then filtered to hits ' +
            'sitting within 70 characters of "depth", "deep", "drill" or "bore". Exactly ONE ' +
            'survives, on p.364, and it belongs to a screw table where 17.5 is a screw LENGTH ' +
            'paired with an 18.0mm drill bit — a different product family, not a Minifix bore. ' +
            'The Minifix connector section (pages 16-52) has ZERO hits of any kind. The sleeve ' +
            'and T-nut sections the first pass had not read (MB 14.60-14.65, pages 2756-2762) ' +
            'also have ZERO hits, which closes the "maybe it is in the sleeve pages" hypothesis. ' +
            'The nearest printed value in the connector section is Dim. A = 17.0 on p.24, which ' +
            'belongs to a "From 34" housing for a 34mm panel and is a surface-to-axis distance, ' +
            'not a depth. Häfele publishes no bolt-side bore depth for standard Minifix ' +
            'connecting bolts at all — bolt rows carry only "Thread length L" and "Drilling ' +
            'dim. B" — so there is no row this could have come from.',
        consequence:
            'This is the deepest bore the system emits and the one that decides whether a panel ' +
            'is refused: every thin-panel refusal in the drill map is triggered by it. If 17.5 ' +
            'is wrong, both the hole AND the refusals computed from it are wrong.',
    },
    {
        field: 'sleeveDia (bolt hole Ø)',
        value: 10,
        tier: 'CONTRADICTED',
        absenceEvidence:
            'p.23 states categorically "> Bolt hole: Ø 5, 7 or 8 mm, depending on choice of ' +
            'connecting bolt", and every "Bolt hole" line printed on pages 16-52 reads 5, 7, 8 ' +
            'or 9 (Maxifix). Ø10 does appear in the section, but never as a bolt hole: it is a ' +
            'drill hole for M4/M6/M8 SLEEVES (p.26/27/33/43), an optional "from above" hole ' +
            '(p.43), or a drill-bit / tool-shaft diameter (p.31/38). The catalogue does not ' +
            'merely omit a Ø10 Minifix bolt hole — it lists the alternatives and Ø10 is not ' +
            'among them.',
        consequence:
            'An oversized bolt hole loses grip: the bolt is meant to bite into the panel. This ' +
            'is a joint-strength question, not a cosmetic one.',
    },
    {
        field: 'boltEntryDia',
        value: 7.5,
        tier: 'UNSOURCED',
        absenceEvidence:
            'CORRECTION TO AN EARLIER DRAFT OF THIS FILE, which claimed 7.5 appears nowhere. It ' +
            'does appear, repeatedly — the first claim was written from too narrow a search and ' +
            'was false. What the volume actually prints: 7.5 as Dim. A for the "From 15" housing ' +
            '(p.24); 7.5 as a bolt THREAD LENGTH (p.26, p.27); a formula "Drilling dim. A = B - ' +
            '9 + 7.5 mm" for a different corner connector (p.52); and — the closest match — a ' +
            'whole Häfele drilled-hole SERIES at MB 4.121 (p.147), titled "Ixconnect Shelf ' +
            'Supports / For 5 mm / 7 mm / 7.5 mm series drilled holes". So Ø7.5 is a standard ' +
            'Häfele hole series, NOT an invented diameter. What is still missing is any page ' +
            'prescribing Ø7.5 for a MINIFIX BOLT PASSAGE: p.23 enumerates the Minifix bolt holes ' +
            'as Ø5, 7 or 8, and MB 4.121 is a shelf-support series, a different function. The ' +
            'number is defensible as a standard series; its application here is uncited.',
        consequence:
            'The entry bore guides the bolt to the housing. A wrong Ø either binds the bolt or ' +
            'lets it wander off the cup centre.',
    },
];

export interface ProvenanceAudit {
    cited: NumberProvenance[];
    derived: NumberProvenance[];
    /** The vendor enumerates the permitted values and ours is not among them. */
    contradicted: NumberProvenance[];
    unsourced: NumberProvenance[];
    /** True when nothing in the live recipe is CONTRADICTED or UNSOURCED. */
    fullySourced: boolean;
    /** One-line summary suitable for a gate finding or a report header. */
    summary: string;
}

/**
 * Audit the recipe's provenance.
 *
 * Deliberately NOT a pass/fail gate. An UNSOURCED number is not proof the
 * geometry is wrong — 17.5mm may well be correct and simply undocumented here,
 * possibly living in a Häfele CAD/CAM dataset the corpus does not contain. What
 * it IS proof of is that the system cannot currently defend the number, and a
 * manufacturing chain that cannot cite its own recipe cannot be audited.
 * Turning any of this into a blocker is an owner decision.
 */
export function auditMinifixConfigProvenance(): ProvenanceAudit {
    const cited = MINIFIX_CONFIG_PROVENANCE.filter((p) => p.tier === 'CITED');
    const derived = MINIFIX_CONFIG_PROVENANCE.filter((p) => p.tier === 'DERIVED');
    const contradicted = MINIFIX_CONFIG_PROVENANCE.filter((p) => p.tier === 'CONTRADICTED');
    const unsourced = MINIFIX_CONFIG_PROVENANCE.filter((p) => p.tier === 'UNSOURCED');
    const unsupported = [...contradicted, ...unsourced];

    return {
        cited,
        derived,
        contradicted,
        unsourced,
        fullySourced: unsupported.length === 0,
        summary:
            `Minifix recipe provenance: ${cited.length} cited, ${derived.length} derived, ` +
            `${contradicted.length} CONTRADICTED by the vendor, ${unsourced.length} unsourced` +
            (unsupported.length > 0
                ? ` (${unsupported.map((p) => `${p.field}=${p.value} [${p.tier}]`).join(', ')})`
                : ''),
    };
}
