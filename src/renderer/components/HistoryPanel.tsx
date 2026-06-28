import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { getElectron } from '../lib/electron';
import { lineDiff } from '../lib/diff';
import type { FileHistory, HistoryVersion } from '../lib/types';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function HistoryPanel() {
  const open = useStore((s) => s.historyOpen);
  const target = useStore((s) => s.historyTarget);
  const close = useStore((s) => s.closeHistory);
  const updateContent = useStore((s) => s.updateContent);
  const currentContent = useStore((s) => (target ? s.docs[target]?.content ?? '' : ''));

  const [history, setHistory] = useState<FileHistory | null>(null);
  const [selected, setSelected] = useState<HistoryVersion | null>(null);

  useEffect(() => {
    if (!open || !target) return;
    const api = getElectron();
    if (!api) return;
    let active = true;
    api.getHistory(target).then((h) => {
      if (!active) return;
      setHistory(h);
      setSelected(h.versions.length ? h.versions[h.versions.length - 1] : null);
    });
    return () => {
      active = false;
    };
  }, [open, target]);

  if (!open) return null;

  const versions = history ? [...history.versions].reverse() : [];

  const restore = () => {
    if (selected && target) {
      updateContent(target, selected.content);
      close();
    }
  };

  const diff = selected ? lineDiff(selected.content, currentContent) : [];

  return (
    <div className="history-overlay" onClick={close}>
      <div className="history-panel" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <span>Change history</span>
          <button className="history-close" onClick={close}>
            ✕
          </button>
        </div>

        <div className="history-body">
          <div className="history-list">
            {versions.length === 0 && (
              <div className="history-empty">
                No saved versions yet. Snapshots are created each time you save.
              </div>
            )}
            {versions.map((v, idx) => (
              <div
                key={v.id}
                className={`history-item ${selected?.id === v.id ? 'active' : ''}`}
                onClick={() => setSelected(v)}
              >
                <div className="history-item-title">
                  {idx === 0 ? 'Latest save' : `Version ${versions.length - idx}`}
                </div>
                <div className="history-item-meta">
                  {formatTime(v.timestamp)} · {v.size} bytes
                </div>
              </div>
            ))}
          </div>

          <div className="history-detail">
            {selected ? (
              <>
                <div className="history-detail-head">
                  <span>Diff: selected version → current</span>
                  <button className="primary" onClick={restore}>
                    Restore into editor
                  </button>
                </div>
                <pre className="diff-view">
                  {diff.map((line, i) => (
                    <div key={i} className={`diff-line ${line.type}`}>
                      <span className="diff-sign">
                        {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                      </span>
                      <span className="diff-text">{line.text || ' '}</span>
                    </div>
                  ))}
                  {diff.length === 0 && (
                    <div className="diff-line same">Identical to current content.</div>
                  )}
                </pre>
              </>
            ) : (
              <div className="history-empty">Select a version to compare.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
