import { useCallback, useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { VedrayaScrollSequence } from "./VedrayaScrollSequence";
import { SEQUENCE_CONFIG } from "./vedrayaSequence.config";
import "./Hero.css";
import "./HeroSequence.css";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function Hero() {
  const [progress, setProgress] = useState(0);

  const onProgress = useCallback((p: number) => {
    const stepped = Math.round(p * 40) / 40;
    setProgress((prev) => (prev === stepped ? prev : stepped));
  }, []);

  const T = SEQUENCE_CONFIG.TEXT;
  const p = progress;

  const headlineOpacity =
    p <= T.headlineFullUntil
      ? 1
      : p <= T.typographyLiftEnd
        ? lerp(1, 0.4, (p - T.headlineFullUntil) / (T.typographyLiftEnd - T.headlineFullUntil))
        : lerp(0.4, 0, (p - T.typographyLiftEnd) / (T.canvasDominantAt - T.typographyLiftEnd));

  const headlineY =
    p <= T.headlineFullUntil
      ? 0
      : lerp(0, -48, (p - T.headlineFullUntil) / (1 - T.headlineFullUntil));

  const supportOpacity =
    p <= T.headlineFullUntil
      ? 1
      : lerp(1, 0, (p - T.headlineFullUntil) / (T.typographyLiftEnd - T.headlineFullUntil));

  const ctaOpacity =
    p <= T.typographyLiftEnd
      ? supportOpacity
      : lerp(supportOpacity, 0, (p - T.typographyLiftEnd) / 0.12);

  const handoffOpacity = clamp01(
    (p - SEQUENCE_CONFIG.COMMAND_HANDOFF_START) / (1 - SEQUENCE_CONFIG.COMMAND_HANDOFF_START),
  );

  return (
    <section id="top" className="hero hero--sequence" aria-label="VEDRAYA hero">
      <VedrayaScrollSequence onProgress={onProgress}>
        <div
          className="hero__copy hero__copy--overlay"
          style={{
            ["--headline-op" as string]: String(Math.max(headlineOpacity, 0)),
            ["--headline-y" as string]: `${headlineY}px`,
            ["--support-op" as string]: String(Math.max(supportOpacity, 0)),
            ["--cta-op" as string]: String(Math.max(ctaOpacity, 0)),
            ["--badge-op" as string]: String(Math.max(supportOpacity, 0)),
            ["--scrim-op" as string]: String(Math.max(supportOpacity, 0)),
            pointerEvents: p > T.canvasDominantAt ? "none" : "auto",
          }}
        >
          <div className="hero__copy-inner">
            <span className="hero__badge">Clinical research intelligence</span>

            <h1 className="hero__title">
              Clinical research,
              <br />
              finally operating
              <br />
              as one system.
            </h1>

            <p className="hero__support">
              The VEDRAYA Research Core connects trials, safety, compliance, sites, and data into
              one auditable intelligence layer.
            </p>

            <div className="hero__cta">
              <MagneticButton href="#command-center">Enter Live Command Center</MagneticButton>
              <MagneticButton href="#platform" variant="secondary">
                Explore the system
              </MagneticButton>
            </div>
          </div>
        </div>

        {handoffOpacity > 0.05 ? (
          <div
            className="hero__handoff"
            style={{
              opacity: handoffOpacity,
              pointerEvents: handoffOpacity > 0.45 ? "auto" : "none",
            }}
            aria-hidden={handoffOpacity < 0.45}
          >
            <a
              href="#command-center"
              className="hero__handoff-link"
              tabIndex={handoffOpacity > 0.45 ? 0 : -1}
            >
              Continue into Live Command Center
              <span aria-hidden> →</span>
            </a>
          </div>
        ) : null}
      </VedrayaScrollSequence>
    </section>
  );
}
