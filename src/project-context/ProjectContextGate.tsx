import type { PropsWithChildren } from 'react';
import { useProjectContextResolution } from './ProjectContextProvider';

function GatePanel({ testId, title, detail }: { testId: string; title: string; detail: string }) {
  return (
    <div data-testid={testId} role="status" className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-8">
      <div className="max-w-xl rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">{detail}</p>
      </div>
    </div>
  );
}

export function ProjectContextGate({ routeProjectId, children }: PropsWithChildren<{ routeProjectId: string }>) {
  const resolution = useProjectContextResolution();
  if (resolution.status === 'LOADING') {
    return <GatePanel testId="project-context-loading" title="Loading project context" detail="กำลังตรวจสอบขอบเขตโครงการจากเซิร์ฟเวอร์" />;
  }
  if (resolution.status === 'BLOCKED') {
    return <GatePanel testId="project-context-blocked" title="Project context blocked" detail={resolution.reason} />;
  }
  if (resolution.context.design_project_id !== routeProjectId) {
    return <GatePanel testId="project-context-blocked" title="Project context blocked" detail="route_context_mismatch" />;
  }
  return <>{children}</>;
}
