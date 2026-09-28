import { useEffect, useRef, useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { StatusBadge } from "../ui/StatusBadge";
import { HeroNetwork } from "./HeroNetwork";
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
      end: "+=120%",
      scrub: 0.65,
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => setProgress(self.progress),
    });

    return () => {
      st.kill();
    };
  }, []);

  const textOpacity = 1 - Math.min(1, progress * 1.4);
  const textY = progress * -40;

  return (
    <section ref={sectionRef} id="top" className="hero" aria-label="VEDRAYA hero">
      <div className="grid-overlay" />
      <div className="hero__inner container">
        <div
          className="hero__copy"
          style={{
            opacity: textOpacity,
            transform: `translate3d(0, ${textY}px, 0)`,
          }}
        >
          <StatusBadge label="System status: nominal" status="info" pulse />
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

        <div className="hero__visual" aria-label="Research network visualization">
          <HeroNetwork progress={progress} />
        </div>
      </div>

      <p className="hero__scroll-hint mono" style={{ opacity: Math.max(0, 1 - progress * 2) }}>
        Scroll to converge
      </p>
    </section>
  );
}
