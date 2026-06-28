import { useState } from 'react';
import type { TreeNode } from '../lib/types';
import { useStore } from '../lib/store';
import { getElectron } from '../lib/electron';

function FileIcon({ ext }: { ext: string }) {
  const label = ext === '.mmd' ? 'M' : '#';
  const cls = ext === '.mmd' ? 'mmd' : 'md';
  return <span className={`file-icon icon-${cls}`}>{label}</span>;
}

/**
 * Returns a filtered copy of the tree containing only files whose name matches
 * `q`, keeping folders that still have matching descendants. Empty `q` returns
 * the node unchanged.
 */
function filterNode(node: TreeNode, q: string): TreeNode | null {
  if (!q) return node;
  const needle = q.toLowerCase();
  if (node.type === 'file') {
    return node.name.toLowerCase().includes(needle) ? node : null;
  }
  const children = node.children
    .map((c) => filterNode(c, q))
    .filter((c): c is TreeNode => c !== null);
  return children.length ? { ...node, children } : null;
}

function NodeRow({
  node,
  depth,
  forceOpen,
}: {
  node: TreeNode;
  depth: number;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(depth < 1);
  const openFile = useStore((s) => s.openFile);
  const activePath = useStore((s) => {
    const pane = s.panes.find((p) => p.id === s.activePaneId);
    return pane?.activePath;
  });

  const isOpen = forceOpen || open;
  const indent = { paddingLeft: 8 + depth * 14 } as const;

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className="tree-row folder-row"
          style={indent}
          onClick={() => setOpen((o) => !o)}
          title={node.path}
        >
          <span className={`chevron ${isOpen ? 'open' : ''}`}>▶</span>
          <span className="folder-name">{node.name}</span>
        </div>
        {isOpen &&
          node.children.map((child) => (
            <NodeRow key={child.path} node={child} depth={depth + 1} forceOpen={forceOpen} />
          ))}
      </div>
    );
  }

  const isActive = activePath === node.path;
  const onContext = (e: React.MouseEvent) => {
    e.preventDefault();
    getElectron()?.openTerminal(node.path);
  };

  return (
    <div
      className={`tree-row file-row ${isActive ? 'active' : ''}`}
      style={indent}
      onClick={() => openFile(node.path)}
      onContextMenu={onContext}
      title={`${node.path}\n(right-click: open terminal here)`}
    >
      <FileIcon ext={node.ext} />
      <span className="file-name">{node.name}</span>
    </div>
  );
}

export default function FileTree({ filter = '' }: { filter?: string }) {
  const folders = useStore((s) => s.folders);
  const removeFolder = useStore((s) => s.removeFolder);
  const rescanFolder = useStore((s) => s.rescanFolder);

  if (folders.length === 0) {
    return (
      <div className="tree-empty">
        No folders yet.
        <br />
        Use <kbd>Add Folder</kbd> to begin.
      </div>
    );
  }

  const trimmed = filter.trim();

  return (
    <div className="file-tree">
      {folders.map((folder) => {
        const filtered = filterNode(folder, trimmed);
        if (trimmed && !filtered) return null;
        const children =
          filtered && filtered.type === 'folder' ? filtered.children : [];
        return (
          <div key={folder.path} className="root-folder">
            <div className="root-folder-header" title={folder.path}>
              <span className="root-folder-name">{folder.name}</span>
              <span className="root-folder-actions">
                <button title="Rescan folder" onClick={() => rescanFolder(folder.path)}>
                  ⟳
                </button>
                <button title="Remove folder" onClick={() => removeFolder(folder.path)}>
                  ✕
                </button>
              </span>
            </div>
            {children.length === 0 ? (
              <div className="tree-empty small">
                {trimmed ? 'No matches.' : 'No .md / .mmd files found.'}
              </div>
            ) : (
              children.map((child) => (
                <NodeRow
                  key={child.path}
                  node={child}
                  depth={1}
                  forceOpen={trimmed.length > 0}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
