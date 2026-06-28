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
const MAX_SCALE = 8;

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/**
 * A pan & zoom viewport for large content (used for Mermaid diagrams).
 * - Mouse wheel / trackpad: zoom toward the cursor.
 * - Drag: pan the camera.
 * - Toolbar: zoom in/out, fit to screen, reset (100%), fullscreen.
 * Auto-fits the content until the user interacts.
 */
export default function PanZoom({ children, resetKey, className }: PanZoomProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const interactedRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const cw = content.offsetWidth;
    const ch = content.offsetHeight;
    if (cw === 0 || ch === 0) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scale = clampScale(Math.min(vw / cw, vh / ch) * 0.95);
    const tx = (vw - cw * scale) / 2;
    const ty = (vh - ch * scale) / 2;
    setTransform({ scale, tx, ty });
  }, []);

  const reset = useCallback(() => {
    interactedRef.current = true;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const tx = (viewport.clientWidth - content.offsetWidth) / 2;
    setTransform({ scale: 1, tx: Math.max(tx, 0), ty: 20 });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    interactedRef.current = true;
    const viewport = viewportRef.current;
    if (!viewport) return;
    setTransform((t) => {
      const cx = viewport.clientWidth / 2;
      const cy = viewport.clientHeight / 2;
      const next = clampScale(t.scale * factor);
      const wx = (cx - t.tx) / t.scale;
      const wy = (cy - t.ty) / t.scale;
      return { scale: next, tx: cx - wx * next, ty: cy - wy * next };
    });
  }, []);

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

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    interactedRef.current = true;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setTransform((t) => {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next = clampScale(t.scale * factor);
      const wx = (px - t.tx) / t.scale;
      const wy = (py - t.ty) / t.scale;
      return { scale: next, tx: px - wx * next, ty: py - wy * next };
    });
  }, []);

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
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      viewport.requestFullscreen?.();
    }
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
        style={{
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
        }}
      >
        {children}
      </div>

      <div className="panzoom-toolbar" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(1 / 1.25)} title="Zoom out (scroll down)">
          −
        </button>
        <span className="panzoom-level" onClick={() => reset()} title="Reset to 100%">
          {Math.round(transform.scale * 100)}%
        </span>
        <button onClick={() => zoomBy(1.25)} title="Zoom in (scroll up)">
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
