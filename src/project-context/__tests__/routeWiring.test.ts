import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ProjectContext route boundary', () => {
  const source = readFileSync(new URL('../../routes/index.tsx', import.meta.url), 'utf8');

  it('keeps the root designer as an explicit unbound scratch workspace', () => {
    expect(source).toMatch(/path: '\/',[\s\S]*?<DesignerWorkspace \/>/);
  });

  it('gates only the bound project designer route through the server-derived provider', () => {
    expect(source).toContain("path: '/projects/:projectId/design'");
    expect(source).toContain('element: <BoundProjectDesignerPage />');
    expect(source).toMatch(/function BoundProjectDesignerPage\(\)[\s\S]*?<ProjectContextProvider designProjectId=\{projectId\}>[\s\S]*?<ProjectContextGate routeProjectId=\{projectId\}>/);
  });
});
