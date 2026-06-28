import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface PanZoomProps {
  children: ReactNode;
  /** Re-fit whenever this key changes (e.g. the diagram source). */
  resetKey?: string;
  className?: string;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 16;

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/**
 * A pan & zoom viewport for SVG content (Mermaid diagrams).
 *
 * Zoom is applied by resizing the SVG's own width/height (it carries a
 * viewBox), NOT via a CSS `transform: scale()`. Scaling a composited layer
 * would rasterize the SVG once and stretch the bitmap, blurring the text;
 * resizing the SVG makes the browser re-render it as vector, so it stays
 * crisp at any zoom. Panning still uses a CSS translate (movement doesn't
 * blur).
 */
export default function PanZoom({ children, resetKey, className }: PanZoomProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const interactedRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const naturalRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getSvg = () =>
    contentRef.current?.querySelector('svg') as SVGSVGElement | null;

  // Natural (scale-1) size of the diagram, taken from its viewBox so it stays
  // constant regardless of the inline width/height we set while zooming.
  const measureNatural = useCallback(() => {
    const svg = getSvg();
    if (!svg) {
      naturalRef.current = { w: 0, h: 0 };
      return naturalRef.current;
    }
    const vb = svg.viewBox?.baseVal;
    let w = vb && vb.width > 0 ? vb.width : 0;
    let h = vb && vb.height > 0 ? vb.height : 0;
    if (!w || !h) {
      const r = svg.getBoundingClientRect();
      w = w || r.width;
      h = h || r.height;
    }
    naturalRef.current = { w, h };
    return naturalRef.current;
  }, []);

  const applySvgSize = useCallback((scale: number) => {
    const svg = getSvg();
    const nat = naturalRef.current;
    if (!svg || !nat.w || !nat.h) return;
    svg.style.width = `${nat.w * scale}px`;
    svg.style.height = `${nat.h * scale}px`;
    svg.style.maxWidth = 'none';
  }, []);

  // Keep the SVG size in sync with the current scale.
  useLayoutEffect(() => {
    applySvgSize(transform.scale);
  }, [transform.scale, applySvgSize]);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const nat = measureNatural();
    if (!nat.w || !nat.h) return;
    const scale = clampScale(Math.min(vp.clientWidth / nat.w, vp.clientHeight / nat.h) * 0.95);
    applySvgSize(scale);
    setTransform({
      scale,
      tx: (vp.clientWidth - nat.w * scale) / 2,
      ty: (vp.clientHeight - nat.h * scale) / 2,
    });
  }, [measureNatural, applySvgSize]);

  const reset = useCallback(() => {
    interactedRef.current = true;
    const vp = viewportRef.current;
    const nat = measureNatural();
    if (!vp || !nat.w) return;
    setTransform({ scale: 1, tx: Math.max((vp.clientWidth - nat.w) / 2, 0), ty: 20 });
  }, [measureNatural]);

  const zoomToward = useCallback((px: number, py: number, factor: number) => {
    interactedRef.current = true;
    setTransform((t) => {
      const next = clampScale(t.scale * factor);
      const wx = (px - t.tx) / t.scale;
      const wy = (py - t.ty) / t.scale;
      return { scale: next, tx: px - wx * next, ty: py - wy * next };
    });
  }, []);

  const zoomCenter = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      zoomToward(vp.clientWidth / 2, vp.clientHeight / 2, factor);
    },
    [zoomToward]
  );

  // Auto-fit on mount and whenever the content changes, until the user interacts.
  useLayoutEffect(() => {
    interactedRef.current = false;
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (!interactedRef.current) fit();
    });
    observer.observe(content);
    fit();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, fit]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomToward(e.clientX - rect.left, e.clientY - rect.top, factor);
    },
    [zoomToward]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    interactedRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setTransform((t) => {
      panRef.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty };
      return t;
    });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan) return;
    const dx = e.clientX - pan.x;
    const dy = e.clientY - pan.y;
    setTransform((t) => ({ ...t, tx: pan.tx + dx, ty: pan.ty + dy }));
  }, []);

  const endPan = useCallback(() => {
    panRef.current = null;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else vp.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`panzoom-viewport ${panRef.current ? 'panning' : ''} ${className || ''}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerLeave={endPan}
    >
      <div
        ref={contentRef}
        className="panzoom-content"
        style={{ transform: `translate(${transform.tx}px, ${transform.ty}px)` }}
      >
        {children}
      </div>

      <div className="panzoom-toolbar" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomCenter(1 / 1.25)} title="Zoom out (scroll down)">
          −
        </button>
        <span className="panzoom-level" onClick={reset} title="Reset to 100%">
          {Math.round(transform.scale * 100)}%
        </span>
        <button onClick={() => zoomCenter(1.25)} title="Zoom in (scroll up)">
          +
        </button>
        <button onClick={fit} title="Fit to screen">
          ⤢
        </button>
        <button onClick={toggleFullscreen} title="Fullscreen">
          {isFullscreen ? '⤡' : '⛶'}
        </button>
      </div>
    </div>
  );
}
