import { useStore, type Pane } from '../lib/store';
import { baseName } from '../lib/electron';
import { tabDrag } from '../lib/dragState';

interface TabsProps {
  pane: Pane;
}

export default function Tabs({ pane }: TabsProps) {
  const docs = useStore((s) => s.docs);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);

  if (pane.tabs.length === 0) return null;

  return (
    <div className="tab-bar">
      {pane.tabs.map((path) => {
        const doc = docs[path];
        const name = doc?.name || baseName(path);
        const dirty = doc && doc.content !== doc.saved;
        const active = pane.activePath === path;
        return (
          <div
            key={path}
            className={`tab ${active ? 'active' : ''}`}
            draggable
            onDragStart={(e) => {
              tabDrag.current = { path, fromPaneId: pane.id };
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', path);
            }}
            onDragEnd={() => {
              tabDrag.current = null;
            }}
            onClick={() => setActiveTab(pane.id, path)}
            title={path}
          >
            <span className="tab-name">{name}</span>
            {dirty ? (
              <span
                className="tab-dirty"
                title="Unsaved changes"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(pane.id, path);
                }}
              >
                ●
              </span>
            ) : (
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(pane.id, path);
                }}
              >
                ✕
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
