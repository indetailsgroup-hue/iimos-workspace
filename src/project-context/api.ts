import { parseProjectContextV1, type ProjectContextV1 } from './types';

const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

function readAccessToken(storage: Pick<Storage, 'getItem' | 'key' | 'length'> | null): string | null {
  if (!storage) return null;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
    try {
      const session = JSON.parse(storage.getItem(key) ?? '') as { access_token?: unknown; expires_at?: unknown };
      if (typeof session.access_token !== 'string' || session.access_token.length === 0) continue;
      if (typeof session.expires_at === 'number' && session.expires_at * 1000 <= Date.now()) continue;
      return session.access_token;
    } catch {
      continue;
    }
  }
  return null;
}

export async function resolveProjectContext(
  designProjectId: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContextV1> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('project_context_server_unavailable');
  const accessToken = readAccessToken(typeof localStorage === 'undefined' ? null : localStorage);
  if (!accessToken) throw new Error('project_context_unauthorized');

  const response = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/rpc_resolve_project_context`, {
    method: 'POST',
    signal,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_design_project_id: designProjectId }),
  });
  if (!response.ok) throw new Error(`project_context_resolution_failed:${response.status}`);
  return parseProjectContextV1(await response.json());
}
