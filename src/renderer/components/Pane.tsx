import { Suspense, lazy } from 'react';
import Tabs from './Tabs';
import MarkdownView from './MarkdownView';
import { useStore, type Pane as PaneModel, type ViewMode } from '../lib/store';
import { getElectron } from '../lib/electron';

// CodeMirror is heavy — load it only when an editor is actually shown.
const Editor = lazy(() => import('./Editor'));

interface PaneProps {
  pane: PaneModel;
}

const VIEWS: { mode: ViewMode; label: string; title: string }[] = [
  { mode: 'preview', label: 'Preview', title: 'Rendered preview only' },
  { mode: 'split', label: 'Split', title: 'Editor + preview' },
  { mode: 'editor', label: 'Editor', title: 'Editor only' },
];

function Breadcrumb({ path }: { path: string }) {
  const segments = path.split(/[\\/]/).filter(Boolean);
  const shown = segments.slice(-4);
  const truncated = segments.length > shown.length;
  return (
    <div className="breadcrumb" title={path}>
      {truncated && <span className="crumb-ellipsis">…</span>}
      {shown.map((seg, i) => (
        <span key={i} className="crumb">
          {i > 0 || truncated ? <span className="crumb-sep">›</span> : null}
          <span className={i === shown.length - 1 ? 'crumb-current' : ''}>{seg}</span>
        </span>
      ))}
    </div>
  );
}

export default function Pane({ pane }: PaneProps) {
  const doc = useStore((s) => (pane.activePath ? s.docs[pane.activePath] : undefined));
  const isActivePane = useStore((s) => s.activePaneId === pane.id);
  const panesCount = useStore((s) => s.panes.length);

  const setActivePane = useStore((s) => s.setActivePane);
  const setView = useStore((s) => s.setView);
  const splitPane = useStore((s) => s.splitPane);
  const closePane = useStore((s) => s.closePane);
  const saveDoc = useStore((s) => s.saveDoc);
  const revertDoc = useStore((s) => s.revertDoc);
  const openHistory = useStore((s) => s.openHistory);

  const dirty = !!doc && doc.content !== doc.saved;
  const showEditor = pane.view === 'editor' || pane.view === 'split';
  const showPreview = pane.view === 'preview' || pane.view === 'split';

  const lines = doc ? doc.content.split('\n').length : 0;
  const chars = doc ? doc.content.length : 0;

  const onTerminal = () => {
    if (pane.activePath) getElectron()?.openTerminal(pane.activePath);
  };
  const onReveal = () => {
    if (pane.activePath) getElectron()?.showInFolder(pane.activePath);
  };

  return (
    <section
      className={`pane ${isActivePane ? 'active-pane' : ''}`}
      onMouseDown={() => setActivePane(pane.id)}
    >
      <Tabs pane={pane} />

      <div className="pane-toolbar">
        {doc ? <Breadcrumb path={doc.path} /> : <span className="breadcrumb dim">No file open</span>}

        <div className="toolbar-spacer" />

        <div className="view-switch">
          {VIEWS.map((v) => (
            <button
              key={v.mode}
              className={pane.view === v.mode ? 'active' : ''}
              title={v.title}
              onClick={() => setView(pane.id, v.mode)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="toolbar-actions">
          <button onClick={() => doc && openHistory(doc.path)} disabled={!doc} title="Change history (Ctrl/Cmd+H)">
            History
          </button>
          <button onClick={onTerminal} disabled={!doc} title="Open a terminal in this file's folder">
            Console
          </button>
          <button onClick={onReveal} disabled={!doc} title="Reveal in file manager">
            Reveal
          </button>
          <button onClick={splitPane} title="Split right (Ctrl/Cmd+\\)">
            Split
          </button>
          {panesCount > 1 && (
            <button onClick={() => closePane(pane.id)} title="Close this pane">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="pane-content">
        {!doc && (
          <div className="pane-empty welcome">
            <div className="welcome-mark">◳</div>
            <h2>Open a Markdown or Mermaid file</h2>
            <p>Pick a file from the Explorer, or add a folder to get started.</p>
            <ul className="welcome-hints">
              <li>
                <kbd>Ctrl/Cmd+O</kbd> add folder
              </li>
              <li>
                <kbd>Ctrl/Cmd+\\</kbd> split pane
              </li>
              <li>
                <kbd>Ctrl/Cmd+E</kbd> toggle editor
              </li>
            </ul>
          </div>
        )}

        {doc && doc.loading && <div className="pane-empty">Loading…</div>}

        {doc && doc.error && (
          <div className="pane-error">
            <strong>Could not open file</strong>
            <pre>{doc.error}</pre>
          </div>
        )}

        {doc && !doc.loading && !doc.error && (
          <div className={`pane-split ${pane.view === 'split' ? 'is-split' : ''}`}>
            {showEditor && (
              <div className="pane-editor">
                <Suspense fallback={<div className="pane-empty">Loading editor…</div>}>
                  <Editor filePath={doc.path} />
                </Suspense>
              </div>
            )}
            {showPreview && (
              <div className="pane-preview">
                <MarkdownView
                  content={doc.content}
                  filePath={doc.path}
                  ext={doc.ext}
                  paneId={pane.id}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {doc && !doc.loading && (
        <div className={`pane-footer ${dirty ? 'dirty' : ''}`}>
          <span className="footer-status">
            {dirty ? (
              <>
                <span className="dot" /> Unsaved changes
              </>
            ) : (
              <>Saved</>
            )}
          </span>
          <span className="footer-meta">
            {lines} lines · {chars} chars · {doc.ext.replace('.', '').toUpperCase()}
          </span>
          <div className="toolbar-spacer" />
          {dirty && (
            <button className="ghost-btn" onClick={() => revertDoc(doc.path)} title="Discard unsaved changes">
              Revert
            </button>
          )}
          <button className="primary" onClick={() => saveDoc(doc.path)} disabled={!dirty} title="Save (Ctrl/Cmd+S)">
            Save
          </button>
        </div>
      )}
    </section>
  );
}
