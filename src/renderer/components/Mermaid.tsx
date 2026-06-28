import { useEffect, useState } from 'react';

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
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

interface MermaidProps {
  chart: string;
}

/**
 * Renders a single Mermaid diagram — used both for fenced ```mermaid blocks
 * inside markdown and for standalone .mmd files.
 */
export default function Mermaid({ chart }: MermaidProps) {
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

  if (error) {
    return (
      <div className="mermaid-error">
        <strong>Mermaid render error</strong>
        <pre>{error}</pre>
        <details>
          <summary>Diagram source</summary>
          <pre>{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
