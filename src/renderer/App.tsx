import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PaneGrid from './components/PaneGrid';
import HistoryPanel from './components/HistoryPanel';
import { useStore } from './lib/store';
import { getElectron } from './lib/electron';
import type { MenuAction } from './lib/types';

export default function App() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const addFolders = useStore((s) => s.addFolders);
  const openFile = useStore((s) => s.openFile);
  const splitPane = useStore((s) => s.splitPane);
  const cycleView = useStore((s) => s.cycleView);

  // Wire native-menu actions to store operations.
  useEffect(() => {
    const api = getElectron();
    if (!api) return;

    const handle = async (action: MenuAction) => {
      const state = useStore.getState();
      switch (action) {
        case 'add-folder': {
          const folders = await api.openFolderDialog();
          if (folders.length) addFolders(folders);
          break;
        }
        case 'open-file': {
          const files = await api.openFilesDialog();
          for (const f of files) await openFile(f);
          break;
        }
        case 'save': {
          const pane = state.panes.find((p) => p.id === state.activePaneId);
          if (pane?.activePath) state.saveDoc(pane.activePath);
          break;
        }
        case 'toggle-editor':
          cycleView();
          break;
        case 'split-pane':
          splitPane();
          break;
        case 'toggle-history': {
          const pane = state.panes.find((p) => p.id === state.activePaneId);
          if (pane?.activePath) state.openHistory(pane.activePath);
          break;
        }
        case 'toggle-sidebar':
          toggleSidebar();
          break;
      }
    };

    const unsubscribe = api.onMenuAction(handle);
    return unsubscribe;
  }, [addFolders, openFile, splitPane, cycleView, toggleSidebar]);

  const onNewWindow = () => getElectron()?.newWindow();

  return (
    <div className="app">
      <div className="titlebar">
        <button className="icon-btn" title="Toggle sidebar (Ctrl/Cmd+B)" onClick={toggleSidebar}>
          ☰
        </button>
        <span className="titlebar-title">MDReader</span>
        <div className="titlebar-spacer" />
        <button className="icon-btn" title="Split right (Ctrl/Cmd+\\)" onClick={splitPane}>
          ▥
        </button>
        <button className="icon-btn" title="New window (Ctrl/Cmd+Shift+N)" onClick={onNewWindow}>
          ⧉
        </button>
      </div>

      <div className="workspace">
        {sidebarOpen && <Sidebar />}
        <PaneGrid />
      </div>

      <HistoryPanel />
    </div>
  );
}
