import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { resolveProjectContext } from './api';
import { parseProjectContextV1, type ProjectContextV1 } from './types';
import { clearBoundProject, loadBoundProject } from './projectState';

export type ProjectContextResolver = (
  designProjectId: string,
  signal: AbortSignal,
) => Promise<ProjectContextV1>;

type ResolutionState =
  | { status: 'LOADING'; context: null; reason: null }
  | { status: 'RESOLVED'; context: ProjectContextV1; reason: null }
  | { status: 'BLOCKED'; context: null; reason: string };

const ProjectContextState = createContext<ResolutionState | null>(null);

export function ProjectContextProvider({
  designProjectId,
  resolveContext = resolveProjectContext,
  children,
}: PropsWithChildren<{ designProjectId: string; resolveContext?: ProjectContextResolver }>) {
  const generation = useRef(0);
  const [state, setState] = useState<ResolutionState>({ status: 'LOADING', context: null, reason: null });

  useEffect(() => {
    const requestGeneration = generation.current + 1;
    generation.current = requestGeneration;
    const controller = new AbortController();
    clearBoundProject();
    setState({ status: 'LOADING', context: null, reason: null });

    resolveContext(designProjectId, controller.signal)
      .then((candidate) => {
        if (controller.signal.aborted || generation.current !== requestGeneration) return;
        const parsed = parseProjectContextV1(candidate);
        const loadResult = loadBoundProject(parsed);
        if (loadResult === 'QUARANTINED') throw new Error('project_context_cache_quarantined');
        setState({ status: 'RESOLVED', context: parsed, reason: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation.current !== requestGeneration) return;
        const reason = error instanceof Error ? error.message : 'project_context_resolution_failed';
        setState({ status: 'BLOCKED', context: null, reason });
      });

    return () => {
      controller.abort();
      clearBoundProject();
    };
  }, [designProjectId, resolveContext]);

  const value = useMemo(() => state, [state]);
  return <ProjectContextState.Provider value={value}>{children}</ProjectContextState.Provider>;
}

export function useProjectContextResolution(): ResolutionState {
  const state = useContext(ProjectContextState);
  if (!state) throw new Error('ProjectContextProvider is required');
  return state;
}
