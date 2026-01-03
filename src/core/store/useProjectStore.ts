/**
 * Project Store - Save/Load Project System
 * 
 * Features:
 * - Auto-save to localStorage
 * - Manual save/load
 * - Export/Import JSON files
 * - Project metadata (name, version, timestamps)
 */

import { create } from 'zustand';
import { useCabinetStore } from './useCabinetStore';

// ============================================
// TYPES
// ============================================

export interface ProjectMetadata {
  id: string;
  name: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  description?: string;
  author?: string;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  cabinet: any; // Cabinet state from useCabinetStore
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'iimos-current-project';
const PROJECTS_LIST_KEY = 'iimos-projects-list';
const AUTO_SAVE_DELAY = 2000; // 2 seconds

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultMetadata(name: string = 'Untitled Project'): ProjectMetadata {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// STORE
// ============================================

interface ProjectState {
  metadata: ProjectMetadata | null;
  isDirty: boolean; // Has unsaved changes
  lastSaved: number | null;
  autoSaveEnabled: boolean;
  savedProjects: SavedProject[];
}

interface ProjectActions {
  // Project lifecycle
  newProject: (name?: string) => void;
  saveProject: () => void;
  loadProject: (projectId?: string) => boolean;
  deleteProject: (projectId: string) => void;
  
  // Metadata
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  
  // Export/Import
  exportProject: () => string;
  importProject: (jsonString: string) => boolean;
  downloadProject: () => void;
  
  // Auto-save
  setAutoSave: (enabled: boolean) => void;
  markDirty: () => void;
  
  // Load saved projects list
  loadProjectsList: () => void;
  
  // Initialize (call on app start)
  initialize: () => void;
}

type ProjectStore = ProjectState & ProjectActions;

let autoSaveTimer: NodeJS.Timeout | null = null;

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  // Initial state
  metadata: null,
  isDirty: false,
  lastSaved: null,
  autoSaveEnabled: true,
  savedProjects: [],
  
  // ========== PROJECT LIFECYCLE ==========
  
  newProject: (name = 'Untitled Project') => {
    const metadata = createDefaultMetadata(name);
    
    // Create new cabinet
    useCabinetStore.getState().createCabinet('BASE', name);
    
    set({
      metadata,
      isDirty: false,
      lastSaved: null,
    });
    
    // Save immediately
    get().saveProject();
    
    console.log('[Project] New project created:', metadata.name);
  },
  
  saveProject: () => {
    const { metadata, autoSaveEnabled } = get();
    const cabinet = useCabinetStore.getState().cabinet;
    
    if (!metadata || !cabinet) {
      console.warn('[Project] Cannot save: no project or cabinet');
      return;
    }
    
    // Update metadata timestamp
    const updatedMetadata: ProjectMetadata = {
      ...metadata,
      updatedAt: Date.now(),
    };
    
    // Create project data
    const projectData: ProjectData = {
      metadata: updatedMetadata,
      cabinet: {
        ...cabinet,
        // Convert Map to object for JSON serialization
        materials: {
          ...cabinet.materials,
          overrides: cabinet.materials.overrides 
            ? Object.fromEntries(cabinet.materials.overrides)
            : {},
        },
      },
    };
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
      
      // Update projects list
      const projectsList = get().savedProjects.filter(p => p.id !== metadata.id);
      projectsList.unshift({
        id: updatedMetadata.id,
        name: updatedMetadata.name,
        updatedAt: updatedMetadata.updatedAt,
      });
      localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList.slice(0, 20))); // Keep last 20
      
      set({
        metadata: updatedMetadata,
        isDirty: false,
        lastSaved: Date.now(),
        savedProjects: projectsList,
      });
      
      console.log('[Project] Saved:', updatedMetadata.name);
    } catch (error) {
      console.error('[Project] Save failed:', error);
    }
  },
  
  loadProject: (projectId?: string) => {
    try {
      // If no projectId, load current project
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('[Project] No saved project found');
        return false;
      }
      
      const projectData: ProjectData = JSON.parse(stored);
      
      // If projectId specified but doesn't match, return false
      if (projectId && projectData.metadata.id !== projectId) {
        console.log('[Project] Project ID mismatch');
        return false;
      }
      
      // Restore cabinet state
      const cabinetStore = useCabinetStore.getState();
      
      // Convert overrides back to Map
      const cabinet = {
        ...projectData.cabinet,
        materials: {
          ...projectData.cabinet.materials,
          overrides: new Map(Object.entries(projectData.cabinet.materials.overrides || {})),
        },
      };
      
      // Set cabinet directly (need to access set from store)
      useCabinetStore.setState({ cabinet });
      
      set({
        metadata: projectData.metadata,
        isDirty: false,
        lastSaved: projectData.metadata.updatedAt,
      });
      
      console.log('[Project] Loaded:', projectData.metadata.name);
      return true;
    } catch (error) {
      console.error('[Project] Load failed:', error);
      return false;
    }
  },
  
  deleteProject: (projectId: string) => {
    const { savedProjects, metadata } = get();
    
    // Remove from list
    const updatedList = savedProjects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(updatedList));
    
    // If deleting current project, clear it
    if (metadata?.id === projectId) {
      localStorage.removeItem(STORAGE_KEY);
      set({
        metadata: null,
        isDirty: false,
        lastSaved: null,
      });
    }
    
    set({ savedProjects: updatedList });
    console.log('[Project] Deleted:', projectId);
  },
  
  // ========== METADATA ==========
  
  setProjectName: (name: string) => {
    set((state) => ({
      metadata: state.metadata ? { ...state.metadata, name } : null,
      isDirty: true,
    }));
    get().markDirty();
  },
  
  setProjectDescription: (description: string) => {
    set((state) => ({
      metadata: state.metadata ? { ...state.metadata, description } : null,
      isDirty: true,
    }));
    get().markDirty();
  },
  
  // ========== EXPORT/IMPORT ==========
  
  exportProject: () => {
    const { metadata } = get();
    const cabinet = useCabinetStore.getState().cabinet;
    
    if (!metadata || !cabinet) {
      return '{}';
    }
    
    const projectData: ProjectData = {
      metadata,
      cabinet: {
        ...cabinet,
        materials: {
          ...cabinet.materials,
          overrides: cabinet.materials.overrides 
            ? Object.fromEntries(cabinet.materials.overrides)
            : {},
        },
      },
    };
    
    return JSON.stringify(projectData, null, 2);
  },
  
  importProject: (jsonString: string) => {
    try {
      const projectData: ProjectData = JSON.parse(jsonString);
      
      // Validate structure
      if (!projectData.metadata || !projectData.cabinet) {
        console.error('[Project] Invalid project file');
        return false;
      }
      
      // Generate new ID to avoid conflicts
      const newMetadata: ProjectMetadata = {
        ...projectData.metadata,
        id: generateId(),
        updatedAt: Date.now(),
      };
      
      // Restore cabinet
      const cabinet = {
        ...projectData.cabinet,
        materials: {
          ...projectData.cabinet.materials,
          overrides: new Map(Object.entries(projectData.cabinet.materials.overrides || {})),
        },
      };
      
      useCabinetStore.setState({ cabinet });
      
      set({
        metadata: newMetadata,
        isDirty: true,
      });
      
      // Save the imported project
      get().saveProject();
      
      console.log('[Project] Imported:', newMetadata.name);
      return true;
    } catch (error) {
      console.error('[Project] Import failed:', error);
      return false;
    }
  },
  
  downloadProject: () => {
    const { metadata } = get();
    const json = get().exportProject();
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata?.name || 'project'}.iimos.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[Project] Downloaded:', metadata?.name);
  },
  
  // ========== AUTO-SAVE ==========
  
  setAutoSave: (enabled: boolean) => {
    set({ autoSaveEnabled: enabled });
    if (!enabled && autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  },
  
  markDirty: () => {
    const { autoSaveEnabled } = get();
    set({ isDirty: true });
    
    if (autoSaveEnabled) {
      // Debounce auto-save
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      autoSaveTimer = setTimeout(() => {
        get().saveProject();
      }, AUTO_SAVE_DELAY);
    }
  },
  
  // ========== PROJECTS LIST ==========
  
  loadProjectsList: () => {
    try {
      const stored = localStorage.getItem(PROJECTS_LIST_KEY);
      if (stored) {
        const list: SavedProject[] = JSON.parse(stored);
        set({ savedProjects: list });
      }
    } catch (error) {
      console.error('[Project] Failed to load projects list:', error);
    }
  },
  
  // ========== INITIALIZE ==========
  
  initialize: () => {
    console.log('[Project] Initializing...');
    
    // Load projects list
    get().loadProjectsList();
    
    // Try to load last project
    const loaded = get().loadProject();
    
    if (!loaded) {
      // Create new project if none exists
      get().newProject('Kitchen Base Cabinet');
    }
    
    console.log('[Project] Initialized');
  },
}));

// Export helper hook
export const useProject = () => useProjectStore((s) => s.metadata);
export const useProjectDirty = () => useProjectStore((s) => s.isDirty);
