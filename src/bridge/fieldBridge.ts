/**
 * Field Bridge (MONOLITH Designer → ระบบหน้างาน) — ProjectContext v2
 *
 * ส่ง cutlist จาก FactoryPacket เข้าระบบหน้างานผ่าน tuple-bound Bridge v2:
 *   - aggregate cutlist rows ตาม materialId (จำนวน = ชิ้นตัดรวม) — เป็นข้อมูลช่วยสั่งของ
 *   - แนบ manifest.contentHash (SHA-256) → ลง audit ฝั่ง IIMOS = ID-chain เริ่มต้น
 *   - idempotent: clientKey ต่อการส่งหนึ่งครั้ง (retry ปลอดภัย)
 *
 * ยังไม่ผูก UI ในเฟสนี้ (รอ auth story ฝั่ง MONOLITH — เฟส 2)
 * Complete identity tuple comes only from an active server-issued ProjectContext.
 */
import type { FactoryPacket } from '../factory/packet/types';
import { parseProjectContextV1, type ProjectContextV1 } from '../project-context/types';

export interface BridgeItem {
  name: string;
  qty: number;
  unit?: string;
}

export interface BridgePayload {
  p_work_item_id: string;
  p_installation_project_id: string;
  p_design_project_id: string;
  p_expected_binding_version: number;
  p_package_code: string;
  p_package_name: string | null;
  p_items: BridgeItem[];
  p_content_hash: string | null;
  p_client_key: string;
}

export interface BridgeTarget {
  /** Supabase project URL เช่น https://xxxx.supabase.co */
  url: string;
  /** anon key (public) */
  anonKey: string;
  /** access token ของผู้ใช้ที่ล็อกอิน Field App แล้ว */
  accessToken: string;
}

/** aggregate cutlist ตาม material → รายการวัสดุสำหรับ IIMOS (เฟส 2: รับ cutlist ตรง) */
export function buildPayloadFromCutList(
  cutList: Pick<FactoryPacket['cutList'], 'rows'>,
  projectContext: ProjectContextV1,
  packageCode: string,
  packageName: string | undefined,
  contentHash: string | null,
  clientKey: string,
): BridgePayload {
  const context = parseProjectContextV1(projectContext);
  const byMaterial = new Map<string, number>();
  for (const row of cutList.rows) {
    byMaterial.set(row.materialId, (byMaterial.get(row.materialId) ?? 0) + row.qty);
  }
  const items: BridgeItem[] = [...byMaterial.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, qty]) => ({ name, qty, unit: 'ชิ้น(ตัด)' }));
  return {
    p_work_item_id: context.work_item_id,
    p_installation_project_id: context.installation_project_id,
    p_design_project_id: context.design_project_id,
    p_expected_binding_version: context.binding_version,
    p_package_code: packageCode.trim().toUpperCase(),
    p_package_name: packageName?.trim() || null,
    p_items: items,
    p_content_hash: contentHash,
    p_client_key: clientKey,
  };
}

/** aggregate จาก FactoryPacket เต็มใบ (เฟส 1 — คง signature เดิม) */
export function buildBridgePayload(
  packet: FactoryPacket,
  projectContext: ProjectContextV1,
  packageCode: string,
  packageName?: string,
  clientKey?: string,
): BridgePayload {
  return buildPayloadFromCutList(
    packet.cutList,
    projectContext,
    packageCode,
    packageName,
    packet.manifest.contentHash ?? null,
    clientKey ?? `${packet.manifest.jobId}:${packet.manifest.contentHash}`,
  );
}

export interface FieldSession {
  accessToken: string;
  email: string;
  expiresAt: number | null;
}

/** อ่าน session ที่ Field App ล็อกอินไว้ (origin เดียวกันบน Pages → localStorage แชร์)
 *  คืน null เมื่อไม่มี/หมดอายุ — ให้ผู้ใช้ไปล็อกอิน Field App ก่อน */
export function readFieldSession(
  storage: Pick<Storage, 'getItem' | 'key' | 'length'> | null =
    typeof localStorage !== 'undefined' ? localStorage : null,
  now: number = Date.now(),
): FieldSession | null {
  if (!storage) return null;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const s = JSON.parse(raw) as {
        access_token?: string;
        expires_at?: number;
        user?: { email?: string };
      };
      if (!s.access_token) continue;
      if (s.expires_at && s.expires_at * 1000 < now) continue; // หมดอายุ
      return {
        accessToken: s.access_token,
        email: s.user?.email ?? 'ไม่ทราบอีเมล',
        expiresAt: s.expires_at ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** sha256 hex ของข้อความ (contentHash จริงของ cutlist — ID-chain) */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** ยิงเข้าระบบหน้างาน — คืน {package_id, imported, skipped, already} */
export async function sendCutListToIimos(
  target: BridgeTarget,
  projectContext: ProjectContextV1,
  payload: BridgePayload,
  fetchImpl: typeof fetch = fetch,
): Promise<{ package_id?: string; imported?: number; skipped?: number; already: boolean }> {
  const context = parseProjectContextV1(projectContext);
  if (context.installation_status !== 'active') {
    throw new Error('project_context_installation_not_active');
  }
  if (payload.p_work_item_id !== context.work_item_id
      || payload.p_installation_project_id !== context.installation_project_id
      || payload.p_design_project_id !== context.design_project_id
      || payload.p_expected_binding_version !== context.binding_version) {
    throw new Error('project_context_payload_mismatch');
  }
  const res = await fetchImpl(`${target.url}/rest/v1/rpc/rpc_bridge_import_cutlist_v2`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: target.anonKey,
      authorization: `Bearer ${target.accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `field_bridge_failed (${res.status})`);
  }
  return res.json();
}
