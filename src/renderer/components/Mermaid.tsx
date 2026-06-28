import { useEffect, useState } from 'react';
import PanZoom from './PanZoom';

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
let idCounter = 0;

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        maxTextSize: 200000,
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

function useMermaidSvg(chart: string) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const source = chart.trim();
    if (!source) {
      setSvg('');
      setError(null);
      return;
    }
    (async () => {
      try {
        const mermaid = await getMermaid();
        const id = `mmd-${idCounter++}`;
        const { svg: out } = await mermaid.render(id, source);
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return { svg, error };
}

interface MermaidProps {
  chart: string;
  /** Render inside a pan/zoom viewport (used for standalone .mmd files). */
  interactive?: boolean;
}

function ErrorBox({ message, chart }: { message: string; chart: string }) {
  return (
    <div className="mermaid-error">
      <strong>Mermaid render error</strong>
      <pre>{message}</pre>
      <details>
        <summary>Diagram source</summary>
        <pre>{chart}</pre>
      </details>
    </div>
  );
}

/**
 * Renders a single Mermaid diagram.
 * - `interactive` (standalone .mmd files): full pan & zoom viewport.
 * - default (inline ```mermaid blocks): static, with an "Expand" button that
 *   opens the diagram in a fullscreen pan/zoom overlay — handy for big graphs
 *   without hijacking the document's scroll.
 */
export default function Mermaid({ chart, interactive }: MermaidProps) {
  const { svg, error } = useMermaidSvg(chart);
  const [expanded, setExpanded] = useState(false);

  if (error) return <ErrorBox message={error} chart={chart} />;

  const diagram = (
    <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
  );

  if (interactive) {
    return (
      <PanZoom resetKey={chart} className="mermaid-panzoom">
        {diagram}
      </PanZoom>
    );
  }

  return (
    <div className="mermaid-inline">
      {diagram}
      <button
        className="mermaid-expand"
        onClick={() => setExpanded(true)}
        title="Open in pan & zoom view"
      >
        ⛶ Expand
      </button>

      {expanded && (
        <div className="diagram-overlay" onClick={() => setExpanded(false)}>
          <div className="diagram-modal" onClick={(e) => e.stopPropagation()}>
            <div className="diagram-modal-head">
              <span>Diagram viewer</span>
              <button className="history-close" onClick={() => setExpanded(false)}>
                ✕
              </button>
            </div>
            <PanZoom resetKey={chart} className="mermaid-panzoom">
              <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
            </PanZoom>
          </div>
        </div>
      )}
    </div>
  );
}
