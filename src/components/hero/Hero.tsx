import { useEffect, useRef, useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { HeroNetwork } from "./HeroNetwork";
import { DashboardPreview } from "../dashboard/DashboardPreview";
import { registerGsap, ScrollTrigger, prefersReducedMotion } from "../../lib/motion";
import "./Hero.css";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) {
      setProgress(0);
      return;
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=160%",
      scrub: 0.7,
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => setProgress(self.progress),
    });

    return () => {
      st.kill();
    };
  }, []);

  // Phase A: copy + network converge (0–0.55)
  // Phase B: network compresses into dashboard (0.55–1)
  const converge = Math.min(1, progress / 0.55);
  const morph = Math.max(0, (progress - 0.55) / 0.45);
  const textOpacity = 1 - Math.min(1, progress * 1.5);
  const textY = progress * -48;
  const networkScale = 1 - morph * 0.35;
  const networkOpacity = 1 - morph;
  const dashOpacity = Math.min(1, morph * 1.35);
  const dashScale = 0.72 + morph * 0.28;

  return (
    <section ref={sectionRef} id="top" className="hero" aria-label="VEDRAYA hero">
      <div className="grid-overlay" />
      <div className="hero__inner container">
        <div
          className="hero__copy"
          style={{
            opacity: textOpacity,
            transform: `translate3d(0, ${textY}px, 0)`,
            pointerEvents: textOpacity < 0.15 ? "none" : "auto",
          }}
        >
          <p className="hero__status">
            <span className="hero__status-dot" aria-hidden />
            System status · Nominal
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
              transform: `scale(${networkScale})`,
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
        style={{ opacity: Math.max(0, 1 - progress * 2.2) }}
      >
        Scroll — network becomes system
      </p>
    </section>
  );
}
