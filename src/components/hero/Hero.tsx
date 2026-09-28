import { useEffect, useRef, useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { HeroNetwork } from "./HeroNetwork";
import { DashboardPreview } from "../dashboard/DashboardPreview";
import { registerGsap, ScrollTrigger, prefersReducedMotion } from "../../lib/motion";
import "./Hero.css";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    if (prefersReducedMotion()) {
      setProgress(0);
      return;
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=180%",
      scrub: 0.75,
      pin: stage,
      anticipatePin: 1,
      onUpdate: (self) => setProgress(self.progress),
    });

    return () => {
      st.kill();
    };
  }, []);

  const converge = Math.min(1, progress / 0.5);
  const morph = Math.max(0, (progress - 0.5) / 0.5);
  const textOpacity = 1 - Math.min(1, progress * 1.35);
  const textY = progress * -48;
  const networkScale = 0.94 + converge * 0.1 - morph * 0.28;
  const networkOpacity = 1 - morph;
  const networkY = morph * -20;
  const dashOpacity = Math.min(1, morph * 1.4);
  const dashScale = 0.78 + morph * 0.22;

  return (
    <section ref={sectionRef} id="top" className="hero" aria-label="VEDRAYA hero">
      <div ref={stageRef} className="hero__stage">
        <div className="hero__atmosphere" aria-hidden />
        <div className="grid-overlay" />
        <p className="hero__watermark" aria-hidden>
          VEDRAYA
        </p>

        <div className="hero__inner">
          <div
            className="hero__copy"
            style={{
              opacity: textOpacity,
              transform: `translate3d(0, ${textY}px, 0)`,
              pointerEvents: textOpacity < 0.12 ? "none" : "auto",
            }}
          >
            <p className="hero__status">
              <span className="hero__status-dot" aria-hidden />
              Clinical research intelligence
            </p>

            <h1 className="display hero__title">
              Clinical research,
              <br />
              finally operating
              <br />
              as one system.
            </h1>

            <p className="body hero__support">
              A real-time clinical research intelligence platform connecting trials, safety,
              compliance, sites and research data into one auditable system.
            </p>

            <div className="hero__cta">
              <MagneticButton href="#command-center">Enter Command Center</MagneticButton>
              <MagneticButton href="#platform" variant="secondary">
                Explore architecture
              </MagneticButton>
            </div>
          </div>

          <div className="hero__visual" aria-label="Research network morphing into command center">
            <div
              className="hero__network-wrap"
              style={{
                opacity: networkOpacity,
                transform: `translate3d(0, ${networkY}px, 0) scale(${networkScale})`,
              }}
            >
              <HeroNetwork progress={converge} />
            </div>

            <div
              className="hero__dash-wrap"
              style={{
                opacity: dashOpacity,
                transform: `scale(${dashScale})`,
                pointerEvents: dashOpacity > 0.6 ? "auto" : "none",
              }}
              aria-hidden={dashOpacity < 0.2}
            >
              <DashboardPreview focus="overview" interactive={dashOpacity > 0.85} />
            </div>
          </div>
        </div>

        <p
          className="hero__scroll-hint mono"
          style={{ opacity: Math.max(0, 1 - progress * 2) }}
        >
          Scroll
        </p>
      </div>
    </section>
  );
}
