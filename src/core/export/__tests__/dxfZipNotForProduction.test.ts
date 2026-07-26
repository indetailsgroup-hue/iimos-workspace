/**
 * DXF ZIP — NOT-FOR-PRODUCTION labelling (F-11 / acceptance test 12)
 *
 * The factory packet has carried the shadow-mode notice since ADR-065 Q3:
 * `buildFactoryPacket.ts` pushes NOT_FOR_PRODUCTION_FILE into both the file
 * entries and the manifest. The per-panel DXF ZIP — the artifact most likely
 * to reach a machine — carried nothing: only the panel files and _manifest.json.
 *
 * That gap became more dangerous, not less, once the projected exporter landed.
 * Before, the sheets were obviously unusable (diameter-5 holes only) and any
 * reader could see it. Now they carry real joinery, in-file mirroring, per-panel
 * material and a cut-size definition stamp — they LOOK production-ready while
 * the governing scrutinize review still records:
 *
 *   "Current Designer -> factory packet -> release path: reject for production"
 *   (2026-07-20-monolith-kitchen-cabinet-full-scrutinize-review, section 9)
 *
 * and F-11 warns that operators may infer nesting, toolpath, post and NC have
 * been produced and governed when they have not.
 *
 * Required acceptance test 12: an NFP artifact cannot be promoted, downloaded
 * as production, or consumed by post/CNC paths. The minimum this file pins is
 * that the artifact declares its own status honestly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Capture what actually goes into the ZIP ───
const zipFiles = new Map<string, string>();

vi.mock('jszip', () => {
  class FakeZip {
    folder() {
      return {
        file: (name: string, content: string) => {
          zipFiles.set(name, content);
        },
      };
    }
    async generateAsync() {
      return { size: 1 } as unknown as Blob;
    }
  }
  return { default: FakeZip };
});

import { downloadDxfZipFromPacket } from '../dxfExportFromOperationGraph';
import {
  NOT_FOR_PRODUCTION_FILE,
  NOT_FOR_PRODUCTION_LABEL,
  NOT_FOR_PRODUCTION_NOTICE,
  SHADOW_MODE_NOT_FOR_PRODUCTION,
} from '../../config/shadowMode';

const packet = { manifest: { jobId: 'job-nfp' } } as never;

// Shaped to what the manifest builder actually reads off each panel.
const okResult = {
  ok: true as const,
  panels: [
    {
      panelId: 'p1',
      panelName: 'LEFT_SIDE',
      filename: 'LEFT_SIDE.dxf',
      content: '0\nEOF\n',
      operationCount: 12,
      projection: { mirroredInX: false, drawWidth: 560, drawHeight: 720 },
      skippedCount: 0,
      g10Result: { ok: true },
      provenance: { source: 'PACKET', packetId: 'job-nfp' },
      semanticResult: { valid: true, blocked: false, summary: { blockCount: 0, warnCount: 0 } },
      dialectResult: { ok: true, summary: { blockingIssues: 0, warningIssues: 0 } },
    },
  ],
  totalOperations: 12,
  machineId: 'GENERIC',
  warnings: [],
  skipped: [],
} as never;

let downloadName = '';

describe('DXF ZIP declares its NOT-FOR-PRODUCTION status (F-11)', () => {
  beforeEach(() => {
    zipFiles.clear();
    downloadName = '';

    // Minimal DOM for the download tail of the wrapper.
    const link = {
      href: '',
      set download(v: string) { downloadName = v; },
      get download() { return downloadName; },
      click: () => {},
    };
    vi.stubGlobal('document', {
      createElement: () => link,
      body: { appendChild: () => {}, removeChild: () => {} },
    });
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('precondition: shadow mode is on, so the notice is required', () => {
    expect(SHADOW_MODE_NOT_FOR_PRODUCTION).toBe(true);
  });

  it('writes NOT_FOR_PRODUCTION.txt into the ZIP, with the same notice the packet uses', async () => {
    await downloadDxfZipFromPacket(packet, {}, { preValidated: { packet, result: okResult } });

    expect(
      zipFiles.has(NOT_FOR_PRODUCTION_FILE),
      'the DXF ZIP must carry the same shadow-mode notice the factory packet has carried since ADR-065 Q3',
    ).toBe(true);
    expect(zipFiles.get(NOT_FOR_PRODUCTION_FILE)).toBe(NOT_FOR_PRODUCTION_NOTICE);
  });

  it('records the artifact status in the manifest, not only as a loose file', async () => {
    await downloadDxfZipFromPacket(packet, {}, { preValidated: { packet, result: okResult } });

    const manifestRaw = zipFiles.get('_manifest.json');
    expect(manifestRaw, '_manifest.json must exist').toBeTruthy();
    const manifest = JSON.parse(manifestRaw as string);

    expect(manifest.notForProduction).toBe(true);
    // A machine-readable class, so a downstream consumer can refuse it without
    // parsing prose. The chain is not qualified for execution: no nesting, post,
    // NC, simulation or first-article evidence travels with these sheets.
    expect(manifest.artifactClass).toBe('MACHINING_INTENT_NOT_QUALIFIED');
    expect(String(manifest.notice)).toContain(NOT_FOR_PRODUCTION_LABEL);
  });

  it('names the downloaded file so the status survives outside the ZIP', async () => {
    await downloadDxfZipFromPacket(packet, {}, { preValidated: { packet, result: okResult } });

    // A file sitting on a shop PC is read by its name long before anyone opens it.
    expect(downloadName).toContain(NOT_FOR_PRODUCTION_LABEL);
    expect(downloadName.endsWith('.zip')).toBe(true);
  });

  it('still writes the panel sheets themselves', async () => {
    await downloadDxfZipFromPacket(packet, {}, { preValidated: { packet, result: okResult } });
    expect(zipFiles.get('LEFT_SIDE.dxf')).toBe('0\nEOF\n');
  });
});
