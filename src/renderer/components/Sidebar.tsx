import { useState } from 'react';
import FileTree from './FileTree';
import { useStore } from '../lib/store';
import { getElectron } from '../lib/electron';

export default function Sidebar() {
  const addFolders = useStore((s) => s.addFolders);
  const openFile = useStore((s) => s.openFile);
  const createNewFile = useStore((s) => s.createNewFile);
  const folders = useStore((s) => s.folders);
  const [query, setQuery] = useState('');

  const onAddFolder = async () => {
    const api = getElectron();
    if (!api) return;
    const result = await api.openFolderDialog();
    if (result.length) addFolders(result);
  };

  const onOpenFiles = async () => {
    const api = getElectron();
    if (!api) return;
    const files = await api.openFilesDialog();
    for (const f of files) await openFile(f);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">
        <span>Explorer</span>
        <button className="ghost-btn" title="New file (Ctrl/Cmd+N)" onClick={createNewFile}>
          ✎
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="primary" onClick={createNewFile} title="Create a new .md / .mmd file (Ctrl/Cmd+N)">
          New File
        </button>
        <button onClick={onAddFolder} title="Add a folder of .md / .mmd files (Ctrl/Cmd+O)">
          Add Folder
        </button>
        <button onClick={onOpenFiles} title="Open individual files (Ctrl/Cmd+Shift+O)">
          Open
        </button>
      </div>

      {folders.length > 0 && (
        <div className="sidebar-search">
          <span className="search-icon">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files…"
            spellCheck={false}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} title="Clear">
              ✕
            </button>
          )}
        </div>
      )}

      <div className="sidebar-tree">
        <FileTree filter={query} />
      </div>
    </aside>
  );
}
