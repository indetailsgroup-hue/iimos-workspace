/**
 * SKU-bound hardware recipes with document provenance.
 *
 * WHY THIS EXISTS
 * ---------------
 * The drill map used to carry ONE hardcoded recipe — a 17.5mm bolt bore, a
 * 13.5mm cam bore, dim A 9 — applied to every panel regardless of thickness.
 * That is the 18mm-wood recipe. Two consequences, both found by review:
 *
 *  - A caller could pass `{ boltBoreDepth: 4 }` and the geometry check would
 *    accept it, because 4mm fits inside a 6mm panel. Nothing bound a depth to a
 *    real fastener, so "reduce the depth until it passes" — the one thing the
 *    scrutinize review forbids — was reachable from outside the module.
 *  - Any panel thinner than the bolt bore lost every corner connector, with a
 *    correct refusal and no path forward, even though 12/15/16mm cores are
 *    offered in the material system.
 *
 * Both are the same missing thing: a recipe is a VENDOR ARTICLE, not a number.
 * Häfele publishes a housing per wood thickness, each with its own drilling
 * depth, dim A and catalogue number. Once a recipe is bound to an article, the
 * question "is 12.5mm deep correct here?" has a citable answer instead of a
 * plausible-looking constant.
 *
 * WHAT A RECORD IN HERE IS, AND IS NOT
 * ------------------------------------
 * IS: a transcription of a printed vendor specification, with the document,
 *     page and a verbatim snippet, so any number can be traced to its source.
 * IS NOT: a production qualification of THIS system's chain. A cited fastener
 *     geometry says the fastener exists and what it needs. It says nothing
 *     about whether our nesting, post-processor, NC output or first article
 *     have been validated. Those remain separate and open.
 *
 * Every vendor page in this corpus also prints "Dimensional data not binding.
 * We reserve the right to alter specifications without notice." — which is why
 * `catalogueRevision` is part of the citation and not optional decoration.
 */

/** Where a number was read from. No numeric field may exist without one. */
export interface HardwareCitation {
    /** As printed, e.g. 'Häfele'. */
    vendor: string;
    /** Catalogue / document title as printed. */
    catalogue: string;
    /**
     * The catalogue's own revision line, e.g. 'DGH-M 2021, HDE-en, 11/20'.
     * Vendors reserve the right to change specifications, so a recipe without a
     * revision cannot be checked against the sheet a shop is holding.
     */
    catalogueRevision: string;
    /** Source file in the reference corpus (not committed to this repo). */
    docFile: string;
    /** 1-based page number in that file. */
    page: number;
    /** Short verbatim snippet containing the values, for traceability. */
    snippet: string;
}

/**
 * How much this row can be relied on.
 *
 * Catalogue text extracts with its columns interleaved, so binding an article
 * number to the right thickness row is the likeliest transcription error. A row
 * that is honestly marked UNVERIFIED is useful; a row that is silently wrong is
 * a hole drilled in the wrong place.
 */
export type RecipeConfidence =
    /** Transcribed from a clean, unambiguous table and re-checked. */
    | 'VERIFIED'
    /** Transcribed, but the row binding was not independently confirmed. */
    | 'UNVERIFIED'
    /** The source text is ambiguous about which value belongs to this row. */
    | 'AMBIGUOUS';

/**
 * One vendor housing variant: the connector body that sits in the panel and
 * needs a bore of a specific depth.
 */
export interface ConnectorHousingVariant {
    /**
     * Minimum wood thickness this article is qualified for, in mm, as the
     * vendor states it ("From 16" -> 16). It is a FLOOR, not an exact match:
     * the vendor publishes one article per range.
     */
    minWoodThicknessMm: number;
    /** Nominal bore depth for the housing, in mm. */
    drillDepthMm: number;
    /** Tolerance exactly as printed, e.g. '+0.5'. Never normalised away. */
    drillDepthTolerance: string;
    /** Dim. A — surface to bolt-axis centre, in mm. */
    dimAMm: number;
    /** Housing bore diameter in mm. */
    drillDiameterMm: number;
    /** Catalogue numbers for this row, verbatim including dots. */
    articleNos: string[];
    confidence: RecipeConfidence;
    /** Present when confidence is not VERIFIED: what exactly is unresolved. */
    ambiguity?: string;
    citation: HardwareCitation;
}

/** A connector family and the range of members it is qualified for. */
export interface ConnectorFamilyCatalog {
    /** Stable id used by code, e.g. 'hafele-minifix-15'. */
    id: string;
    vendor: string;
    /** Family name as printed, e.g. 'Häfele Minifix® 15'. */
    family: string;
    /**
     * The vendor's own statement of the minimum member thickness for the
     * SYSTEM, quoted verbatim, with its citation. This is the sentence that
     * decides whether a thin-panel cabinet is buildable at all.
     */
    systemMinThickness: {
        thicknessMm: number;
        statement: string;
        citation: HardwareCitation;
    };
    housings: ConnectorHousingVariant[];
    /**
     * Things this catalog does NOT answer. Kept in the data, not in a comment,
     * so a consumer can see the gap programmatically instead of assuming the
     * absence of a field means the absence of a constraint.
     */
    unknowns: string[];
}

/**
 * Result of asking the catalog for a recipe. Deliberately a discriminated
 * union: there is no "closest match" and no fallback, because a fallback is how
 * an 18mm recipe ended up in a 6mm panel.
 */
export type HousingSelection =
    | { ok: true; variant: ConnectorHousingVariant }
    | {
          ok: false;
          /** Machine-readable so a gate can branch without parsing prose. */
          reason: 'BELOW_SYSTEM_MINIMUM' | 'NO_QUALIFIED_ARTICLE' | 'THICKNESS_UNDECLARED';
          /** Human-facing, and it must carry the next action. */
          message: string;
      };
