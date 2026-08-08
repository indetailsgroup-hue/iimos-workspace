import { expect, test } from '@playwright/test';

const A = {
  work_item_id: '10000000-0000-4000-8000-00000000000a',
  installation_project_id: '20000000-0000-4000-8000-00000000000a',
  design_project_id: '30000000-0000-4000-8000-00000000000a',
  binding_version: 4,
  project_display_name: 'Project A',
};
const B = {
  work_item_id: '10000000-0000-4000-8000-00000000000b',
  installation_project_id: '20000000-0000-4000-8000-00000000000b',
  design_project_id: '30000000-0000-4000-8000-00000000000b',
  binding_version: 7,
  project_display_name: 'Project B',
};

function context(project: typeof A) {
  return {
    schema_version: 'project-context.v1',
    workflow_version: 3,
    site_code: 'E2E-SITE',
    binding_state: 'ACTIVE',
    installation_status: 'active',
    issued_at: '2026-08-09T01:00:00.000Z',
    ...project,
  };
}

test('delayed A cannot overwrite B and mixed/stale Bridge tuples cannot mutate either project', async ({ page }) => {
  const packageCounts = new Map([[A.design_project_id, 0], [B.design_project_id, 0]]);
  const materialCounts = new Map([[A.design_project_id, 0], [B.design_project_id, 0]]);
  const bridgeBodies: Record<string, unknown>[] = [];

  await page.addInitScript(() => {
    localStorage.setItem('sb-e2e-auth-token', JSON.stringify({
      access_token: 'e2e-access-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'project-owner@example.test' },
    }));
  });

  await page.route('**/rest/v1/rpc/rpc_resolve_project_context', async (route) => {
    const body = route.request().postDataJSON() as { p_design_project_id?: string };
    const selected = body.p_design_project_id === A.design_project_id ? A : B;
    if (selected === A) await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(context(selected)) });
  });

  await page.route('**/rest/v1/rpc/rpc_bridge_import_cutlist_v2', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bridgeBodies.push(body);
    const exactB = body.p_work_item_id === B.work_item_id
      && body.p_installation_project_id === B.installation_project_id
      && body.p_design_project_id === B.design_project_id
      && body.p_expected_binding_version === B.binding_version;
    if (!exactB) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'project_context_payload_mismatch' }),
      });
      return;
    }
    packageCounts.set(B.design_project_id, packageCounts.get(B.design_project_id)! + 1);
    materialCounts.set(B.design_project_id, materialCounts.get(B.design_project_id)! + 1);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ package_id: '40000000-0000-4000-8000-00000000000b', imported: 1, skipped: 0, already: false }),
    });
  });

  await page.goto(`/projects/${A.design_project_id}/design`);
  await expect(page.getByTestId('project-context-loading')).toBeVisible();
  await page.goto(`/projects/${B.design_project_id}/design`);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /ส่งเข้าหน้างาน/ }).click();
  await expect(page.getByText(/ProjectContext: Project B · binding v7/)).toBeVisible();
  await page.getByRole('button', { name: 'ส่ง cutlist เข้าระบบหน้างาน' }).click();
  await expect(page.getByText(/ส่งเข้าหน้างานแล้ว/)).toBeVisible();

  const accepted = bridgeBodies.at(-1)!;
  expect(accepted).toMatchObject({
    p_work_item_id: B.work_item_id,
    p_installation_project_id: B.installation_project_id,
    p_design_project_id: B.design_project_id,
    p_expected_binding_version: B.binding_version,
  });
  expect(packageCounts.get(A.design_project_id)).toBe(0);
  expect(materialCounts.get(A.design_project_id)).toBe(0);
  expect(packageCounts.get(B.design_project_id)).toBe(1);
  expect(materialCounts.get(B.design_project_id)).toBe(1);

  const attackBaseline = {
    aPackages: packageCounts.get(A.design_project_id),
    aMaterials: materialCounts.get(A.design_project_id),
    bPackages: packageCounts.get(B.design_project_id),
    bMaterials: materialCounts.get(B.design_project_id),
  };
  const attackStatuses = await page.evaluate(async ({ a, b }) => {
    const attack = async (body: Record<string, unknown>) => (await fetch(
      '/rest/v1/rpc/rpc_bridge_import_cutlist_v2',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
    )).status;
    const base = {
      p_installation_project_id: b.installation_project_id,
      p_design_project_id: b.design_project_id,
      p_expected_binding_version: b.binding_version,
      p_package_code: 'MW-E2E',
      p_package_name: 'Attack',
      p_items: [{ name: 'Plywood', qty: 1 }],
      p_content_hash: 'a'.repeat(64),
      p_client_key: 'e2e-attack',
    };
    return [
      await attack({ ...base, p_work_item_id: a.work_item_id }),
      await attack({ ...base, p_work_item_id: b.work_item_id, p_design_project_id: a.design_project_id }),
      await attack({ ...base, p_work_item_id: b.work_item_id, p_expected_binding_version: b.binding_version - 1 }),
    ];
  }, { a: A, b: B });
  expect(attackStatuses).toEqual([409, 409, 409]);
  expect({
    aPackages: packageCounts.get(A.design_project_id),
    aMaterials: materialCounts.get(A.design_project_id),
    bPackages: packageCounts.get(B.design_project_id),
    bMaterials: materialCounts.get(B.design_project_id),
  }).toEqual(attackBaseline);

  await page.waitForTimeout(700);
  await expect(page.getByText(/ProjectContext: Project B · binding v7/)).toBeVisible();
  expect(await page.evaluate((id) => localStorage.getItem(`monolith-bound-project:${id}`), B.design_project_id)).toContain(B.design_project_id);
});
