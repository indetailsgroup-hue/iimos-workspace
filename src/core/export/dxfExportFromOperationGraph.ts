/**
 * dxfExportFromOperationGraph.ts - DXF Export via OperationGraph
 *
 * AGENT-T008: DXF export MUST come from OperationGraph (manufacturing intent)
 * GATE10: All DXF exports are validated through G10 safety gate
 *
 * This module provides the bridge between:
 * - FactoryPacket → OperationGraph → DXF → G10 Validation
 *
 * Ensuring that DXF output exactly matches the G-code that will be generated.
 *
 * T3 (fix/dxf-truth-chain): per-panel DXF CONTENT is produced by projecting
 * the packet's drill map WORLD points into panel-local cut-drawing
 * coordinates (panelLocalProjection.ts) and rendering via
 * projectedPanelToDxf. The OperationGraph remains the gate/provenance spine
 * (G9/G10/G10.2/G10.3, operation counts) — ops keep world-truth positions;
 * projection happens at this presentation layer only.
 *
 * PLACEMENT CONTRACT: the packet drill map carries per panel role +
 * [finishWidth, finishHeight, realThickness] (buildDrillMap.ts:62-79) but NO
 * worldPosition (dropped by the packet builder). World placements therefore
 * come from the caller via DxfExportOptions.panelPlacements (store cabinet
 * panels: CabinetPanel.position — same convention the drill-map generator
 * uses via calculatePanelAABB). FAIL-CLOSED: points of panels without a
 * placement are surfaced in result.skipped and drawn NOWHERE — never at raw
 * world coordinates (S0 defect), never silently dropped.
 *
 * @version 1.2.0 - T3 panel-local projection wiring
 */

import JSZip from 'jszip';
// ADR-065 Q3 shadow mode — same constants the factory packet uses, so the
// DXF ZIP and the packet carry one consistent NOT-FOR-PRODUCTION marker.
import {
    SHADOW_MODE_NOT_FOR_PRODUCTION,
    NOT_FOR_PRODUCTION_FILE,
    NOT_FOR_PRODUCTION_LABEL,
    NOT_FOR_PRODUCTION_NOTICE,
} from '../config/shadowMode';
import { buildOperationGraph, hasBuildErrors } from '../../cnc/mapping/buildOperationGraph';
import { markPacketAsValidated } from '../../cnc/mapping/g9AssertValidPacket';
import { getMachineProfile } from '../../cnc/machine';
import type { MachineId, MachineProfile } from '../../cnc/machine';
import type { OperationGraph } from '../../cnc/operation/operationTypes';
import type { FactoryPacket } from '../../factory/packet/types';
import {
    projectedPanelToDxf,
    validateOperationGraphForDxf,
    type OperationGraphDxfOptions,
    type DxfValidationResult,
} from './operationGraphToDxf';
import {
    projectDrillPointsToPanelLocal,
    type PanelDrawingProjection,
    type ProjectionPanelInput,
    type ProjectionPointInput,
    type SkippedPointReport,
} from './panelLocalProjection';
import type { PanelRole } from '../types/Cabinet';
import {
    assertDxfSafety,
    createOperationGraphProvenance,
    type SafeDxf,
    type DxfProvenanceOperationGraph,
    type G10Result,
} from '../gate/gate10DxfSafety';
import {
    validateDxfSemantic,
    type SemanticValidationResult,
    type PanelContext,
} from '../gate/gate10_2DxfSemantic';
import {
    validateMachineDialect,
    type MachineDialectResult,
} from '../gate/gate10_3MachineDialect';

// ============================================
// TYPES
// ============================================

export interface PanelDxfResult {
    panelId: string;
    panelName: string;
    filename: string;
    content: string;
    /** G10-verified safe DXF content (same as content when G10 passes) */
    safeDxf: SafeDxf;
    operationCount: number;
    validation: DxfValidationResult;
    /** G10 provenance tracking */
    provenance: DxfProvenanceOperationGraph;
    /** G10 gate result */
    g10Result: G10Result;
    /** G10.2 semantic validation result */
    semanticResult: SemanticValidationResult;
    /** G10.3 machine dialect validation result */
    dialectResult: MachineDialectResult;
    /**
     * Panel-local projection summary (T3). `null` = no world placement was
     * available for this panel → drawing fail-closed to outline+annotations
     * only, with every point surfaced in the export-level skipped[] channel.
     */
    projection: {
        drawWidth: number;
        drawHeight: number;
        /** Q5=A machining-face view: true for RIGHT_SIDE and TOP (mirrored in-file). */
        mirroredInX: boolean;
        faceBoreCount: number;
        edgeBoreCount: number;
    } | null;
    /** Number of this panel's drill points NOT drawn (fail-closed reports in result.skipped). */
    skippedCount: number;
}

export interface DxfExportResult {
    ok: true;
    panels: PanelDxfResult[];
    totalOperations: number;
    machineId: string;
    warnings: string[];
    /**
     * FAIL-CLOSED SURFACING (T3): every packet drill point that was NOT drawn,
     * with a machine-readable reason. Never silently dropped. Empty on the
     * default cabinet with placements provided (Q6=A B-run retired).
     */
    skipped: SkippedPointReport[];
    /** G10 gate overall status */
    g10Status: {
        /** All panels passed G10 */
        allPassed: boolean;
        /** Count of panels that passed G10 */
        passedCount: number;
        /** Total panel count */
        totalCount: number;
    };
}

export interface DxfExportError {
    ok: false;
    error: string;
    details?: string[];
}

export type DxfExportFromPacketResult = DxfExportResult | DxfExportError;

/**
 * World placement for one packet panel (T3). The packet drill map carries the
 * panel's role + finish dims + real thickness but NOT its world position —
 * the caller supplies it (store convention: CabinetPanel.position = panel
 * CENTER; same input calculatePanelAABB / the drill-map generator use).
 */
export interface PanelWorldPlacement {
    panelId: string;
    /** Panel CENTER world position [x, y, z] in mm (store convention). */
    position?: [number, number, number];
    /** Direct world AABB alternative (wins over position when both given). */
    aabb?: { min: [number, number, number]; max: [number, number, number] };
}

export interface DxfExportOptions extends OperationGraphDxfOptions {
    /** Machine ID to build OperationGraph for */
    machineId?: string;
    /** Selected panel IDs (if empty, exports all) */
    selectedPanelIds?: string[];
    /** Progress callback */
    onPanelProgress?: (panelId: string, panelName: string, index: number, total: number) => void;
    /**
     * World placements for the packet's panels (T3 projection stage). Panels
     * without a placement FAIL CLOSED: their points are surfaced in
     * result.skipped and are never drawn at raw world coordinates.
     */
    panelPlacements?: PanelWorldPlacement[];
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

/**
 * Export DXF files from FactoryPacket via OperationGraph
 *
 * THIS IS THE SOURCE OF TRUTH FOR DXF EXPORT.
 * - Uses OperationGraph (manufacturing intent)
 * - NOT Cabinet geometry or 3D mesh data
 * - Ensures DXF matches G-code output exactly
 *
 * @param packet - Verified FactoryPacket from buildFactoryPacket
 * @param options - Export options
 * @returns DXF export result or error
 */
export async function exportDxfFromPacket(
    packet: FactoryPacket,
    options: DxfExportOptions = {}
): Promise<DxfExportFromPacketResult> {
    // ─────────────────────────────────────────────────────────────────────────
    // FAIL CLOSED ON A MANUFACTURABILITY REFUSAL (F-07 follow-up)
    // ─────────────────────────────────────────────────────────────────────────
    // Both review vendors found the same hole independently on 2026-07-26: the
    // Safety Gate on GateToolbar was the ONLY thing stopping a refused joint
    // from becoming a shop drawing, and it is one door among several —
    // ExportPanel.handleExport (ExportPanel.tsx:837) had no gate check at all,
    // and a direct caller has none by definition.
    //
    // The invariant belongs HERE, at the single point every caller passes
    // through. Same principle as the packet carrying its own NOT_FOR_PRODUCTION
    // notice: the artifact and the function that makes it are authoritative,
    // not whichever screen happens to be in front of them.
    //
    // A refusal means the generator declined to emit machining because the
    // fastener recipe cannot physically exist in the owning panel. Drawing the
    // remainder would ship a part with holes for a joint that was never built.
    // Optional-chain the packet itself: the null-packet contract is validated
    // further down, and this guard must not pre-empt it with a TypeError.
    const refusals = packet?.drillMap?.manufacturabilityRefusals ?? [];
    if (refusals.length > 0) {
        return {
            ok: false,
            error:
                `DXF BLOCKED: ${refusals.length} manufacturability refusal(s) stand on this ` +
                `drill map. The generator declined to emit machining that cannot physically ` +
                `exist in the owning panel, so no sheets are produced. These are NOT waivable ` +
                `— the fix is a compatible fastener recipe or a different construction, never ` +
                `a shallower hole. No files delivered.`,
            details: refusals.map(
                (r) =>
                    `[${r.reasonCode}] ${r.ownerPanelRole} ${r.ownerPanelId}: ${r.purpose} ` +
                    `Ø${r.diameterMm} needs ${r.requiredDepthMm}mm, member is ` +
                    `${r.ownerThicknessMm}mm (source: ${r.recipeSource}, waivable: false)`,
            ),
        };
    }

    const {
        // T4: default must be a REAL preset. 'KDT-6000' is not in the machine
        // preset table (KDT/BIESSE/HOMAG/SCM/GENERIC), so the old default made
        // every no-options call die on getMachineProfile (fail-fast trap,
        // T3 reviewer note). Callers with a machine selection still pass it.
        machineId = 'GENERIC',
        selectedPanelIds,
        onPanelProgress,
        panelPlacements,
        ...dxfOptions
    } = options;

    // 1. Validate packet
    if (!packet) {
        return { ok: false, error: 'No packet provided' };
    }

    if (!packet.drillMap) {
        return { ok: false, error: 'Packet has no drill map - cannot generate operations' };
    }

    // 2. Get machine profile
    const machine = getMachineProfile(machineId as MachineId);
    if (!machine) {
        return { ok: false, error: `Unknown machine: ${machineId}` };
    }

    // 3. Build OperationGraph from packet
    // G9: Mark packet as validated (trusted internal path)
    const validatedPacket = markPacketAsValidated(packet);
    const buildResult = buildOperationGraph(validatedPacket, machine);

    if (hasBuildErrors(buildResult)) {
        return {
            ok: false,
            error: 'Failed to build OperationGraph',
            details: buildResult.errors,
        };
    }

    const graph = buildResult.graph;
    const warnings = [...buildResult.warnings];

    // 3b. T3 PROJECTION STAGE: WORLD → PANEL-LOCAL cut-drawing coordinates.
    // Packet mapping (documented, feeds T4 label work):
    //   PacketDrillPanel.role          → ProjectionPanelInput.role
    //   PacketDrillPanel.dimensions[0] → finishWidth  (drill-map generator fills
    //   PacketDrillPanel.dimensions[1] → finishHeight  these from the panel's own
    //   PacketDrillPanel.dimensions[2] → thickness     finishWidth/finishHeight/
    //                                                  computed.realThickness —
    //                                                  generateDrillMap.ts:2252-2256)
    //   placement (position | aabb)    → caller-supplied (NOT in the packet)
    // Points are the packet's drill-map points verbatim (same drill map the
    // 3D/Safety Gate use — buildDrillMap copies them 1:1, world coords).
    const placementById = new Map<string, PanelWorldPlacement>();
    for (const pl of panelPlacements ?? []) placementById.set(pl.panelId, pl);

    const skipped: SkippedPointReport[] = [];
    const projectionPanels: ProjectionPanelInput[] = [];
    const placedPanelIds = new Set<string>();

    for (const p of packet.drillMap.panels) {
        const [finishW, finishH, realT] = p.dimensions;
        const placement = placementById.get(p.panelId);
        if (placement?.aabb) {
            projectionPanels.push({
                panelId: p.panelId,
                role: p.role as PanelRole,
                thickness: realT,
                aabb: placement.aabb,
            });
            placedPanelIds.add(p.panelId);
        } else if (placement?.position) {
            projectionPanels.push({
                panelId: p.panelId,
                role: p.role as PanelRole,
                thickness: realT,
                position: placement.position,
                finishWidth: finishW,
                finishHeight: finishH,
            });
            placedPanelIds.add(p.panelId);
        } else {
            // FAIL CLOSED: no placement → no drawing frame → every point of this
            // panel is reported, none is drawn at raw world coordinates.
            for (const pt of p.points) {
                skipped.push({
                    pointId: pt.id,
                    panelId: p.panelId,
                    reason: 'UNKNOWN_PANEL',
                    detail:
                        `no world placement for panel '${p.panelId}' — the packet drill map ` +
                        `carries role+dims but no worldPosition; pass DxfExportOptions.panelPlacements`,
                });
            }
        }
    }

    const projectionPoints: ProjectionPointInput[] = packet.drillMap.panels
        .filter((p) => placedPanelIds.has(p.panelId))
        .flatMap((p) =>
            p.points.map((pt) => ({
                id: pt.id,
                panelId: pt.panelId,
                position: pt.position,
                normal: pt.normal,
                diameter: pt.diameter,
                depth: pt.depth,
                purpose: pt.purpose,
            })),
        );

    const projectionResult = projectDrillPointsToPanelLocal({
        panels: projectionPanels,
        points: projectionPoints,
    });
    skipped.push(...projectionResult.skipped);

    const projectionByPanel = new Map<string, PanelDrawingProjection>(
        projectionResult.panels.map((p) => [p.panelId, p]),
    );

    for (const s of skipped) {
        warnings.push(
            `[PROJECTION SKIP] ${s.panelId}${s.pointId ? `/${s.pointId}` : ''}: ${s.reason} — ${s.detail}`,
        );
    }

    // 4. Filter panels if selectedPanelIds is provided
    const panelIds = packet.drillMap.panels.map(p => p.panelId);
    const targetPanelIds = selectedPanelIds && selectedPanelIds.length > 0
        ? panelIds.filter(id => selectedPanelIds.includes(id))
        : panelIds;

    if (targetPanelIds.length === 0) {
        return { ok: false, error: 'No panels to export' };
    }

    // 5. Generate DXF for each panel
    const panels: PanelDxfResult[] = [];
    let totalOperations = 0;

    for (let i = 0; i < targetPanelIds.length; i++) {
        const panelId = targetPanelIds[i];
        const panelData = packet.drillMap.panels.find(p => p.panelId === panelId);
        if (!panelData) continue;

        // Use role or panelId as display name (PacketDrillPanel has no panelName)
        const panelName = panelData.role || panelId;

        // Filter operations for this panel
        const panelOperations = graph.operations.filter(op => {
            return op.workpieceContext?.panelId === panelId;
        });

        // Create panel-specific graph
        const panelGraph: OperationGraph = {
            ...graph,
            operations: panelOperations,
            metadata: {
                ...graph.metadata,
                panelId,
            },
        };

        // Validate panel graph
        const validation = validateOperationGraphForDxf(panelGraph);

        // G10.3: Machine dialect validation
        const dialectResult = validateMachineDialect(panelGraph, machine);

        // Collect G10.3 warnings and errors
        for (const issue of dialectResult.issues) {
            const prefix = issue.severity === 'BLOCK' ? '[G10.3 BLOCK]' : '[G10.3 WARN]';
            warnings.push(`${prefix} ${panelId}: ${issue.message}`);
        }

        // G10.2: Semantic validation
        // PacketDrillPanel.dimensions is [w, h, t] tuple
        const [panelWidth, panelHeight, panelThickness] = panelData.dimensions;
        const panelContext: PanelContext = {
            panelId,
            width: panelWidth,
            height: panelHeight,
            thickness: panelThickness,
        };
        const semanticResult = validateDxfSemantic(panelGraph, { panel: panelContext });

        // Collect semantic warnings and errors
        for (const issue of semanticResult.issues) {
            const prefix = issue.severity === 'BLOCK' ? '[G10.2 BLOCK]' : '[G10.2 WARN]';
            warnings.push(`${prefix} ${panelId}: ${issue.message}`);
        }

        // Look up edge banding data from cut list
        const cutListRow = packet.cutList?.rows?.find(
            (row) => row.partId === panelId || row.partId === panelId.slice(0, 8)
        );
        const edgeBandingOption = cutListRow?.edgeBanding
            ? {
                includeEdgeBanding: true,
                edgeBanding: {
                    left: cutListRow.edgeBanding[0] > 0 ? { thickness: cutListRow.edgeBanding[0] } : undefined,
                    right: cutListRow.edgeBanding[1] > 0 ? { thickness: cutListRow.edgeBanding[1] } : undefined,
                    top: cutListRow.edgeBanding[2] > 0 ? { thickness: cutListRow.edgeBanding[2] } : undefined,
                    bottom: cutListRow.edgeBanding[3] > 0 ? { thickness: cutListRow.edgeBanding[3] } : undefined,
                },
            }
            : {};

        // T3: render the MANUFACTURABLE per-panel drawing from the projection.
        // Bores carry FINAL drawing coordinates (Q5 mirror + Face-B already
        // applied by the projection — the writer adds NO extra mirror).
        // No placement → fail-closed drawing frame from packet dims:
        // outline + annotations only, zero bores, points surfaced in skipped[].
        const projection = projectionByPanel.get(panelId) ?? null;
        const drawingProjection: PanelDrawingProjection = projection ?? {
            panelId,
            role: panelData.role as PanelRole,
            drawWidth: panelWidth,
            drawHeight: panelHeight,
            mirroredInX: false,
            bores: [],
        };
        const panelSkippedCount = skipped.filter((s) => s.panelId === panelId).length;

        // Q3=A dims: panel cut size = finish − edge band, NO premill.
        // (The cut-list row's cutW/cutH include premill and are NOT used here.)
        const eb = cutListRow?.edgeBanding ?? [0, 0, 0, 0];
        const cutWidth = panelWidth - eb[0] - eb[1];
        const cutHeight = panelHeight - eb[2] - eb[3];

        // Generate DXF even with warnings (but not errors)
        const dxfContent = projectedPanelToDxf(drawingProjection, {
            panelName,
            role: panelData.role,
            thickness: panelThickness,
            cutWidth,
            cutHeight,
            materialId: cutListRow?.materialId,
            includeAnnotations: dxfOptions.includeAnnotations,
            includeMetadata: dxfOptions.includeMetadata,
            ...edgeBandingOption,
            machineId,
            operationCount: panelOperations.length,
            toolsUsed: graph.toolsUsed,
            skippedCount: panelSkippedCount,
        });

        // G10: Create provenance tracking
        const provenance = createOperationGraphProvenance(packet, panelGraph, panelId);

        // G10: Validate DXF safety
        const g10Result = assertDxfSafety(dxfContent, provenance);

        // G10: Get safe DXF (will be branded if G10 passes)
        const safeDxf = g10Result.ok ? g10Result.dxf : dxfContent as SafeDxf;

        // Collect G10 warnings
        if (g10Result.ok && g10Result.warnings.length > 0) {
            for (const warn of g10Result.warnings) {
                warnings.push(`[G10] ${panelId}: ${warn.message}`);
            }
        }

        const filename = `${panelName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${machineId}.dxf`;

        panels.push({
            panelId,
            panelName,
            filename,
            content: dxfContent,
            safeDxf,
            operationCount: panelOperations.length,
            validation,
            provenance,
            g10Result,
            semanticResult,
            dialectResult,
            projection: projection
                ? {
                    drawWidth: projection.drawWidth,
                    drawHeight: projection.drawHeight,
                    mirroredInX: projection.mirroredInX,
                    faceBoreCount: projection.bores.filter((b) => b.boreType === 'FACE').length,
                    edgeBoreCount: projection.bores.filter((b) => b.boreType === 'EDGE').length,
                }
                : null,
            skippedCount: panelSkippedCount,
        });

        totalOperations += panelOperations.length;

        // Progress callback
        if (onPanelProgress) {
            onPanelProgress(panelId, panelName, i + 1, targetPanelIds.length);
        }
    }

    // Calculate G10 overall status (includes G10.1, G10.2, and G10.3)
    const g10Status = {
        allPassed: panels.every(p => p.g10Result.ok && !p.semanticResult.blocked && p.dialectResult.ok),
        passedCount: panels.filter(p => p.g10Result.ok && !p.semanticResult.blocked && p.dialectResult.ok).length,
        totalCount: panels.length,
    };

    return {
        ok: true,
        panels,
        totalOperations,
        machineId,
        warnings,
        skipped,
        g10Status,
    };
}

// ============================================
// ZIP DOWNLOAD
// ============================================

/**
 * Export DXF files as ZIP archive
 *
 * @param packet - Verified FactoryPacket
 * @param options - Export options
 */
export async function downloadDxfZipFromPacket(
    packet: FactoryPacket,
    options: DxfExportOptions = {},
    /**
     * Fail-closed controls (T8b, from the T4 review).
     *
     * Before this, the wrapper threw only on `!ok` and never inspected
     * `skipped`, so the "never deliver sheets with undrawn drill points"
     * guarantee lived entirely in the two UI callers — a third caller would
     * have shipped bore-less DXF silently. The guarantee now lives here.
     *
     * `preValidated` lets a caller that already inspected the export hand the
     * result back instead of paying for a second identical run — but it must
     * hand back the PACKET it validated too. Accepting a bare result would let
     * packet B be zipped from result A (or from a fabricated one), which is a
     * substitution hole in exactly the guarantee this function exists to keep
     * (G2 finding). Identity is the binding: same object, same export.
     */
    guards: {
        failOnSkipped?: boolean;
        preValidated?: { packet: FactoryPacket; result: DxfExportResult };
    } = {}
): Promise<void> {
    const { failOnSkipped = true, preValidated } = guards;

    if (preValidated && preValidated.packet !== packet) {
        throw new Error(
            'DXF BLOCKED: preValidated result does not belong to the packet being exported ' +
            '(result/packet substitution). No files delivered.'
        );
    }

    const result = preValidated?.result ?? (await exportDxfFromPacket(packet, options));

    if (!result.ok) {
        throw new Error(result.error);
    }

    if (failOnSkipped && result.skipped && result.skipped.length > 0) {
        const first = result.skipped[0];
        throw new Error(
            `DXF BLOCKED: ${result.skipped.length} drill point(s) could not be drawn ` +
            `(${first.reason}${first.panelId ? ` on ${first.panelId}` : ''}). No files delivered.`
        );
    }

    // Create ZIP
    const zip = new JSZip();
    const folder = zip.folder('DXF');

    if (!folder) {
        throw new Error('Failed to create ZIP folder');
    }

    for (const panel of result.panels) {
        folder.file(panel.filename, panel.content);
    }

    // F-11 / acceptance test 12: the artifact must declare its own status.
    // The factory packet has carried this notice since ADR-065 Q3
    // (buildFactoryPacket.ts) while this ZIP — the artifact most likely to
    // reach a machine — carried nothing. That gap got MORE dangerous once the
    // projected exporter landed: the sheets used to be obviously unusable, and
    // now they look production-ready while the governing scrutinize review
    // still records "Designer -> factory packet -> release path: reject for
    // production" (2026-07-20 review, section 9). Same notice, same filename
    // as the packet, so a shop sees one consistent marker.
    if (SHADOW_MODE_NOT_FOR_PRODUCTION) {
        folder.file(NOT_FOR_PRODUCTION_FILE, NOT_FOR_PRODUCTION_NOTICE);
    }

    // Add manifest with G10 verification status
    const manifest = {
        generatedAt: new Date().toISOString(),
        machineId: result.machineId,
        // Machine-readable status so a downstream consumer can refuse this
        // artifact without parsing prose. These sheets carry machining INTENT;
        // no nesting, post, NC, simulation or first-article evidence travels
        // with them, so they are not qualified for execution.
        notForProduction: SHADOW_MODE_NOT_FOR_PRODUCTION,
        artifactClass: 'MACHINING_INTENT_NOT_QUALIFIED',
        notice: `${NOT_FOR_PRODUCTION_LABEL} — see ${NOT_FOR_PRODUCTION_FILE}`,
        totalOperations: result.totalOperations,
        panels: result.panels.map(p => ({
            panelId: p.panelId,
            panelName: p.panelName,
            filename: p.filename,
            operationCount: p.operationCount,
            projection: p.projection,
            skippedCount: p.skippedCount,
            g10: {
                ok: p.g10Result.ok,
                source: p.provenance.source,
                packetId: p.provenance.packetId,
            },
            g10_2: {
                valid: p.semanticResult.valid,
                blocked: p.semanticResult.blocked,
                blockCount: p.semanticResult.summary.blockCount,
                warnCount: p.semanticResult.summary.warnCount,
            },
            g10_3: {
                ok: p.dialectResult.ok,
                blockCount: p.dialectResult.summary.blockingIssues,
                warnCount: p.dialectResult.summary.warningIssues,
            },
        })),
        warnings: result.warnings,
        // T3 fail-closed surfacing: every drill point NOT drawn, with reason.
        // Never silently dropped — the factory sees exactly what is missing.
        projection: {
            skippedCount: result.skipped.length,
            skipped: result.skipped,
        },
        source: 'OperationGraph (AGENT-T008)',
        gate10: {
            allPassed: result.panels.every(p => p.g10Result.ok && !p.semanticResult.blocked),
            verifiedCount: result.panels.filter(p => p.g10Result.ok && !p.semanticResult.blocked).length,
            totalCount: result.panels.length,
        },
        gate10_2: {
            allValid: result.panels.every(p => p.semanticResult.valid),
            noneBlocked: result.panels.every(p => !p.semanticResult.blocked),
            totalBlockIssues: result.panels.reduce((sum, p) => sum + p.semanticResult.summary.blockCount, 0),
            totalWarnIssues: result.panels.reduce((sum, p) => sum + p.semanticResult.summary.warnCount, 0),
        },
        gate10_3: {
            allPassed: result.panels.every(p => p.dialectResult.ok),
            passedCount: result.panels.filter(p => p.dialectResult.ok).length,
            totalBlockIssues: result.panels.reduce((sum, p) => sum + p.dialectResult.summary.blockingIssues, 0),
            totalWarnIssues: result.panels.reduce((sum, p) => sum + p.dialectResult.summary.warningIssues, 0),
        },
    };

    folder.file('_manifest.json', JSON.stringify(manifest, null, 2));

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    // A file on a shop PC is read by its name long before anyone opens it.
    const nfpPrefix = SHADOW_MODE_NOT_FOR_PRODUCTION ? `${NOT_FOR_PRODUCTION_LABEL}_` : '';
    link.download = `${nfpPrefix}DXF_${result.machineId}_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// INTEGRATION HELPER
// ============================================

/**
 * Check if DXF export from OperationGraph is available
 *
 * @param packet - FactoryPacket to check
 * @returns Availability status
 */
export function canExportDxfFromOperationGraph(
    packet: FactoryPacket | null
): { available: boolean; reason?: string } {
    if (!packet) {
        return { available: false, reason: 'No packet available' };
    }

    if (!packet.drillMap) {
        return { available: false, reason: 'Packet has no drill map' };
    }

    if (packet.drillMap.panels.length === 0) {
        return { available: false, reason: 'Packet has no panels' };
    }

    return { available: true };
}
