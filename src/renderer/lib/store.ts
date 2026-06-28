import { create } from 'zustand';
import type { FolderNode } from './types';
import { getElectron, baseName } from './electron';

export type ViewMode = 'preview' | 'editor' | 'split';

export type DropRegion = 'center' | 'left' | 'right';

export interface TabDropPayload {
  path: string;
  fromPaneId: string;
  targetPaneId: string;
  region: DropRegion;
}

export interface DocState {
  path: string;
  name: string;
  ext: string;
  content: string; // current (possibly edited) content
  saved: string; // last persisted content
  mtimeMs?: number;
  loading: boolean;
  error?: string;
}

export interface Pane {
  id: string;
  tabs: string[]; // document paths open in this pane
  activePath: string | null;
  view: ViewMode;
}

interface AppState {
  folders: FolderNode[];
  docs: Record<string, DocState>;
  panes: Pane[];
  activePaneId: string;

  sidebarOpen: boolean;
  historyOpen: boolean;
  historyTarget: string | null;

  // folders
  addFolders: (folders: FolderNode[]) => void;
  removeFolder: (path: string) => void;
  rescanFolder: (path: string) => Promise<void>;

  // documents / tabs
  createNewFile: () => Promise<void>;
  openFile: (filePath: string, paneId?: string) => Promise<void>;
  reloadFile: (filePath: string) => Promise<void>;
  closeTab: (paneId: string, filePath: string) => void;
  setActiveTab: (paneId: string, filePath: string) => void;
  setActivePane: (paneId: string) => void;
  updateContent: (filePath: string, content: string) => void;
  saveDoc: (filePath: string) => Promise<void>;
  revertDoc: (filePath: string) => void;

  // panes
  splitPane: () => void;
  dropTab: (payload: TabDropPayload) => void;
  closePane: (paneId: string) => void;
  setView: (paneId: string, view: ViewMode) => void;
  cycleView: (paneId?: string) => void;

  // ui
  toggleSidebar: () => void;
  openHistory: (filePath: string) => void;
  closeHistory: () => void;
}

let paneCounter = 1;
const newPaneId = () => `pane-${paneCounter++}`;
const initialPaneId = newPaneId();

function mergeTree(existing: FolderNode[], incoming: FolderNode[]): FolderNode[] {
  const byPath = new Map(existing.map((f) => [f.path, f]));
  for (const folder of incoming) byPath.set(folder.path, folder);
  return [...byPath.values()];
}

const VIEW_CYCLE: ViewMode[] = ['preview', 'split', 'editor'];

export const useStore = create<AppState>((set, get) => ({
  folders: [],
  docs: {},
  panes: [{ id: initialPaneId, tabs: [], activePath: null, view: 'preview' }],
  activePaneId: initialPaneId,

  sidebarOpen: true,
  historyOpen: false,
  historyTarget: null,

  addFolders: (folders) => set((s) => ({ folders: mergeTree(s.folders, folders) })),

  removeFolder: (path) =>
    set((s) => ({ folders: s.folders.filter((f) => f.path !== path) })),

  rescanFolder: async (path) => {
    const api = getElectron();
    if (!api) return;
    const tree = await api.rescanFolder(path);
    if (!tree) return;
    set((s) => ({ folders: s.folders.map((f) => (f.path === path ? tree : f)) }));
  },

  createNewFile: async () => {
    const api = getElectron();
    if (!api) return;
    const { folders } = get();
    const res = await api.newFileDialog(folders[0]?.path);
    if (!res.ok || !res.path) return;

    // If the new file lives inside an added folder, refresh that folder so it
    // shows up in the tree.
    const root = get().folders.find((f) => res.path!.startsWith(f.path));
    if (root) await get().rescanFolder(root.path);

    await get().openFile(res.path);
  },

  openFile: async (filePath, paneId) => {
    const state = get();
    const targetPane = paneId || state.activePaneId;

    set((s) => ({
      activePaneId: targetPane,
      panes: s.panes.map((p) =>
        p.id === targetPane
          ? {
              ...p,
              tabs: p.tabs.includes(filePath) ? p.tabs : [...p.tabs, filePath],
              activePath: filePath,
            }
          : p
      ),
    }));

    // Already loaded? Just focus it.
    const existing = get().docs[filePath];
    if (existing && !existing.loading) return;

    set((s) => ({
      docs: {
        ...s.docs,
        [filePath]: {
          path: filePath,
          name: baseName(filePath),
          ext: '',
          content: '',
          saved: '',
          loading: true,
        },
      },
    }));

    const api = getElectron();
    if (!api) {
      set((s) => ({
        docs: {
          ...s.docs,
          [filePath]: {
            ...s.docs[filePath],
            loading: false,
            error: 'File access is only available in the desktop app.',
          },
        },
      }));
      return;
    }

    const res = await api.readFile(filePath);
    set((s) => ({
      docs: {
        ...s.docs,
        [filePath]: {
          path: filePath,
          name: res.name || baseName(filePath),
          ext: res.ext || '',
          content: res.ok ? res.content ?? '' : '',
          saved: res.ok ? res.content ?? '' : '',
          mtimeMs: res.mtimeMs,
          loading: false,
          error: res.ok ? undefined : res.error,
        },
      },
    }));
  },

  reloadFile: async (filePath) => {
    const api = getElectron();
    if (!api) return;
    const res = await api.readFile(filePath);
    if (!res.ok) return;
    set((s) => ({
      docs: {
        ...s.docs,
        [filePath]: {
          ...s.docs[filePath],
          content: res.content ?? '',
          saved: res.content ?? '',
          mtimeMs: res.mtimeMs,
          error: undefined,
        },
      },
    }));
  },

  closeTab: (paneId, filePath) =>
    set((s) => ({
      panes: s.panes.map((p) => {
        if (p.id !== paneId) return p;
        const tabs = p.tabs.filter((t) => t !== filePath);
        let activePath = p.activePath;
        if (activePath === filePath) {
          activePath = tabs.length ? tabs[tabs.length - 1] : null;
        }
        return { ...p, tabs, activePath };
      }),
    })),

  setActiveTab: (paneId, filePath) =>
    set((s) => ({
      activePaneId: paneId,
      panes: s.panes.map((p) =>
        p.id === paneId ? { ...p, activePath: filePath } : p
      ),
    })),

  setActivePane: (paneId) => set({ activePaneId: paneId }),

  updateContent: (filePath, content) =>
    set((s) => {
      const doc = s.docs[filePath];
      if (!doc) return {};
      return { docs: { ...s.docs, [filePath]: { ...doc, content } } };
    }),

  saveDoc: async (filePath) => {
    const api = getElectron();
    const doc = get().docs[filePath];
    if (!api || !doc) return;
    const res = await api.writeFile(filePath, doc.content);
    set((s) => ({
      docs: {
        ...s.docs,
        [filePath]: res.ok
          ? { ...s.docs[filePath], saved: doc.content, mtimeMs: res.mtimeMs, error: undefined }
          : { ...s.docs[filePath], error: res.error },
      },
    }));
  },

  revertDoc: (filePath) =>
    set((s) => {
      const doc = s.docs[filePath];
      if (!doc) return {};
      return { docs: { ...s.docs, [filePath]: { ...doc, content: doc.saved } } };
    }),

  splitPane: () => {
    const id = newPaneId();
    set((s) => {
      const active = s.panes.find((p) => p.id === s.activePaneId);
      const activePath = active?.activePath || null;
      return {
        panes: [
          ...s.panes,
          {
            id,
            tabs: activePath ? [activePath] : [],
            activePath,
            view: 'preview' as ViewMode,
          },
        ],
        activePaneId: id,
      };
    });
  },

  dropTab: ({ path, fromPaneId, targetPaneId, region }) =>
    set((s) => {
      // Work on shallow clones so we can mutate tabs freely.
      let panes = s.panes.map((p) => ({ ...p, tabs: [...p.tabs] }));
      const from = panes.find((p) => p.id === fromPaneId);
      if (!from) return {};

      // Dropping onto the same pane's center is a no-op beyond focusing.
      if (region === 'center' && fromPaneId === targetPaneId) {
        return {
          activePaneId: targetPaneId,
          panes: panes.map((p) =>
            p.id === targetPaneId ? { ...p, activePath: path } : p
          ),
        };
      }

      const removeFromSource = () => {
        from.tabs = from.tabs.filter((t) => t !== path);
        if (from.activePath === path) {
          from.activePath = from.tabs[from.tabs.length - 1] ?? null;
        }
      };

      let activePaneId = s.activePaneId;

      if (region === 'left' || region === 'right') {
        removeFromSource();
        const id = newPaneId();
        const newPane: Pane = { id, tabs: [path], activePath: path, view: 'preview' };
        let targetIndex = panes.findIndex((p) => p.id === targetPaneId);
        if (targetIndex < 0) targetIndex = panes.length - 1;
        panes.splice(region === 'left' ? targetIndex : targetIndex + 1, 0, newPane);
        activePaneId = id;
      } else {
        const target = panes.find((p) => p.id === targetPaneId);
        if (!target) return {};
        removeFromSource();
        if (!target.tabs.includes(path)) target.tabs.push(path);
        target.activePath = path;
        activePaneId = target.id;
      }

      // Drop empty panes, but always keep at least one.
      panes = panes.filter((p) => p.tabs.length > 0 || p.id === activePaneId);
      if (panes.length === 0) {
        const id = newPaneId();
        panes = [{ id, tabs: [], activePath: null, view: 'preview' }];
        activePaneId = id;
      }

      return { panes, activePaneId };
    }),

  closePane: (paneId) =>
    set((s) => {
      if (s.panes.length <= 1) return {};
      const panes = s.panes.filter((p) => p.id !== paneId);
      return {
        panes,
        activePaneId: s.activePaneId === paneId ? panes[0].id : s.activePaneId,
      };
    }),

  setView: (paneId, view) =>
    set((s) => ({
      panes: s.panes.map((p) => (p.id === paneId ? { ...p, view } : p)),
    })),

  cycleView: (paneId) =>
    set((s) => {
      const target = paneId || s.activePaneId;
      return {
        panes: s.panes.map((p) => {
          if (p.id !== target) return p;
          const idx = VIEW_CYCLE.indexOf(p.view);
          const next = VIEW_CYCLE[(idx + 1) % VIEW_CYCLE.length];
          return { ...p, view: next };
        }),
      };
    }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  openHistory: (filePath) => set({ historyOpen: true, historyTarget: filePath }),

  closeHistory: () => set({ historyOpen: false }),
}));
