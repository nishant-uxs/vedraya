import { useEffect, useRef, useState, type ReactNode } from "react";
import { SEQUENCE_CONFIG, resolveProductStage, frameUrl } from "./vedrayaSequence.config";
import "./VedrayaScrollSequence.css";

type Props = {
  onProgress?: (progress: number) => void;
  children?: ReactNode;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileViewport(): boolean {
  return window.innerWidth < SEQUENCE_CONFIG.MOBILE_BREAKPOINT;
}

function isDebugEnabled(): boolean {
  if (import.meta.env.PROD) return false;
  return new URLSearchParams(window.location.search).has("sequenceDebug");
}

/** Offscreen buffer for soft circular product matte */
let matteCanvas: HTMLCanvasElement | null = null;
let matteCtx: CanvasRenderingContext2D | null = null;

function getMatteContext(w: number, h: number) {
  if (!matteCanvas) {
    matteCanvas = document.createElement("canvas");
    matteCtx = matteCanvas.getContext("2d");
  }
  if (!matteCtx) return null;
  if (matteCanvas.width !== w || matteCanvas.height !== h) {
    matteCanvas.width = w;
    matteCanvas.height = h;
  }
  return matteCtx;
}

/**
 * Draw the research core floating on the dark stage.
 * Original-quality frames + soft circular matte (no white rectangle card).
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  progress: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return false;

  const stage = resolveProductStage(progress, w, h, isMobileViewport());
  const side = Math.min(iw, ih);
  const sx = (iw - side) / 2;
  const sy = (ih - side) / 2;

  const contain = Math.min(stage.w / side, stage.h / side);
  const scale = contain * stage.fit;
  const dw = side * scale;
  const dh = side * scale;
  const dx = stage.x + (stage.w - dw) * 0.42;
  const dy = stage.y + (stage.h - dh) * 0.5;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#070809";
  ctx.fillRect(0, 0, w, h);

  if (!SEQUENCE_CONFIG.USE_SOFT_PRODUCT_MATTE) {
    ctx.drawImage(img, sx, sy, side, side, dx, dy, dw, dh);
    return true;
  }

  const mctx = getMatteContext(Math.ceil(dw), Math.ceil(dh));
  if (!mctx || !matteCanvas) {
    ctx.drawImage(img, sx, sy, side, side, dx, dy, dw, dh);
    return true;
  }

  const mw = matteCanvas.width;
  const mh = matteCanvas.height;
  mctx.clearRect(0, 0, mw, mh);
  mctx.drawImage(img, sx, sy, side, side, 0, 0, mw, mh);

  const cx = mw / 2;
  const cy = mh / 2;
  // Keep nearly the full inscribed circle so expanded network nodes stay visible
  const r = Math.min(mw, mh) * 0.5;
  const grad = mctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 0.995);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.88, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  mctx.globalCompositeOperation = "destination-in";
  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, mw, mh);
  mctx.globalCompositeOperation = "source-over";

  ctx.drawImage(matteCanvas, dx, dy);
  return true;
}

/** Nearest loaded frame at or before index */
function nearestFrame(
  frames: (HTMLImageElement | null)[],
  index: number,
): HTMLImageElement | null {
  if (frames[index]?.complete && frames[index]!.naturalWidth) return frames[index];
  for (let i = index - 1; i >= 0; i -= 1) {
    if (frames[i]?.complete && frames[i]!.naturalWidth) return frames[i];
  }
  for (let i = index + 1; i < frames.length; i += 1) {
    if (frames[i]?.complete && frames[i]!.naturalWidth) return frames[i];
  }
  return null;
}

export function VedrayaScrollSequence({ onProgress, children }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const targetRef = useRef(0);
  const drawnKeyRef = useRef("");
  const rafRef = useRef(0);
  const progressRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const showDebug = isDebugEnabled();
  const totalFrames = SEQUENCE_CONFIG.FRAME_COUNT;

  const [ready, setReady] = useState(false);
  const [loadCount, setLoadCount] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [progress, setProgress] = useState(0);
  const [debug, setDebug] = useState({
    frame: 0,
    progress: 0,
    loaded: 0,
    canvas: "—",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    let cancelled = false;
    const frames: (HTMLImageElement | null)[] = new Array(totalFrames).fill(null);
    framesRef.current = frames;

    const step = isMobileViewport()
      ? SEQUENCE_CONFIG.MOBILE_FRAME_STEP
      : SEQUENCE_CONFIG.DESKTOP_FRAME_STEP;

    const indices: number[] = [];
    for (let i = 0; i < totalFrames; i += step) indices.push(i);
    if (indices[indices.length - 1] !== totalFrames - 1) {
      indices.push(totalFrames - 1);
    }

    const size = { w: 0, h: 0, dpr: 1 };

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, SEQUENCE_CONFIG.MAX_DPR);
      const w = Math.max(1, window.innerWidth | 0);
      const h = Math.max(1, window.innerHeight | 0);
      size.w = w;
      size.h = h;
      size.dpr = dpr;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawnKeyRef.current = "";
    };

    const paintNow = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !size.w) return;
      const idx = targetRef.current;
      const p = progressRef.current;
      const stage = resolveProductStage(p, size.w, size.h, isMobileViewport());
      const key = `${idx}:${Math.round(stage.x)}:${Math.round(stage.w)}:${Math.round(stage.fit * 100)}`;
      if (key === drawnKeyRef.current) return;

      const img = nearestFrame(framesRef.current, idx);
      if (!img) return;
      if (!drawFrame(ctx, img, size.w, size.h, p)) return;
      drawnKeyRef.current = key;

      if (showDebug) {
        setDebug({
          frame: idx + 1,
          progress: Math.round(p * 1000) / 10,
          loaded: framesRef.current.filter((f) => f?.complete).length,
          canvas: `${size.w} × ${size.h}`,
        });
      }
    };

    const requestPaint = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        paintNow();
      });
    };

    const syncProgress = () => {
      const reduced = prefersReducedMotion();
      const rect = section.getBoundingClientRect();
      const total = Math.max(section.offsetHeight - window.innerHeight, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = reduced ? 1 : scrolled / total;
      progressRef.current = p;

      const rounded = Math.round(p * 200) / 200;
      setProgress((prev) => (prev === rounded ? prev : rounded));
      onProgressRef.current?.(p);

      targetRef.current = reduced
        ? totalFrames - 1
        : Math.min(
            totalFrames - 1,
            Math.max(0, Math.floor(p * (totalFrames - 1))),
          );
      requestPaint();
    };

    const loadOne = (zeroIndex: number) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (cancelled) return resolve(false);
          frames[zeroIndex] = img;
          framesRef.current = frames;
          resolve(true);
        };
        img.onerror = () => {
          if (!cancelled) {
            console.warn(
              `[VEDRAYA] Failed frame: ${frameUrl(zeroIndex + 1)}`,
            );
          }
          resolve(false);
        };
        img.src = frameUrl(zeroIndex + 1);
      });

    applySize();

    (async () => {
      const priority = [
        0,
        Math.floor((totalFrames - 1) * 0.25),
        Math.floor((totalFrames - 1) * 0.5),
        Math.floor((totalFrames - 1) * 0.75),
        totalFrames - 1,
      ].filter((v, i, a) => a.indexOf(v) === i);

      const firstOk = await loadOne(0);
      if (cancelled) return;

      if (!firstOk || !frames[0]) {
        console.warn("[VEDRAYA] Sequence unavailable — static fallback.");
        setFallback(true);
        setReady(true);
        return;
      }

      setLoadCount(1);
      setReady(true);
      applySize();
      drawnKeyRef.current = "";
      paintNow();
      syncProgress();

      await Promise.all(priority.filter((i) => i !== 0).map(loadOne));
      if (cancelled) return;
      setLoadCount(frames.filter(Boolean).length);
      drawnKeyRef.current = "";
      paintNow();

      const rest = indices.filter((i) => !frames[i]);
      const BATCH = 10;
      for (let i = 0; i < rest.length; i += BATCH) {
        if (cancelled) return;
        await Promise.all(rest.slice(i, i + BATCH).map(loadOne));
        setLoadCount(frames.filter(Boolean).length);
      }

      let last: HTMLImageElement | null = frames[0];
      for (let i = 0; i < totalFrames; i += 1) {
        if (frames[i]) last = frames[i];
        else if (last) frames[i] = last;
      }
      framesRef.current = frames;
      setLoadCount(frames.filter(Boolean).length);
      drawnKeyRef.current = "";
      paintNow();
    })();

    const onScroll = () => syncProgress();
    const onResize = () => {
      applySize();
      requestPaint();
      syncProgress();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalFrames, showDebug]);

  const handoff = progress >= SEQUENCE_CONFIG.COMMAND_HANDOFF_START;

  return (
    <section
      ref={sectionRef}
      className={`vseq${handoff ? " vseq--handoff" : ""}`}
      style={{ height: `${SEQUENCE_CONFIG.SCROLL_HEIGHT}vh` }}
      aria-label="VEDRAYA research core sequence"
    >
      <div className="vseq__sticky">
        {!ready && (
          <div className="vseq__loading" aria-live="polite">
            <span className="vseq__mark">VEDRAYA</span>
            <span className="vseq__loading-text">Initializing research core</span>
          </div>
        )}

        {fallback ? (
          <div className="vseq__fallback">
            <img
              src={frameUrl(totalFrames)}
              alt="VEDRAYA Research Core"
              className="vseq__fallback-img"
            />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="vseq__canvas"
            role="img"
            aria-label="VEDRAYA Research Core activating through scroll: isolated core, research network, system assembly, convergence, command center."
          />
        )}

        {showDebug && ready && (
          <div className="vseq__debug">
            <div>
              Frame: {debug.frame} / {totalFrames}
            </div>
            <div>Progress: {debug.progress}%</div>
            <div>
              Loaded: {debug.loaded || loadCount} / {totalFrames}
            </div>
            <div>Canvas: {debug.canvas}</div>
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
