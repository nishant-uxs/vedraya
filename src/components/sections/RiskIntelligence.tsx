import { useEffect, useRef, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./RiskIntelligence.css";

const FACTORS = [
  { label: "Recruitment delay", points: 24 },
  { label: "Site inactivity", points: 15 },
  { label: "Open queries", points: 12 },
  { label: "Protocol deviations", points: 10 },
  { label: "SAE deadline", points: 17 },
];

export function RiskIntelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) {
      setScore(78);
      setRevealed(FACTORS.length);
      return;
    }

    const obj = { n: 0 };
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 60%",
          end: "bottom 40%",
          scrub: 0.5,
        },
      });

      FACTORS.forEach((_, i) => {
        tl.to(obj, {
          n: FACTORS.slice(0, i + 1).reduce((a, f) => a + f.points, 0),
          duration: 0.2,
          ease: "none",
          onUpdate: () => setScore(Math.round(obj.n)),
          onStart: () => setRevealed(i + 1),
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="intelligence"
      className="risk section"
      aria-labelledby="risk-heading"
      style={{ background: "#000" }}
    >
      <div className="container risk__inner">
        <div className="risk__copy">
          <span className="eyebrow">Operational monitoring</span>
          <h2 id="risk-heading" className="h1">
            See the risk before it becomes critical.
          </h2>
          <p className="body">
            VEDRAYA computes an <strong>Operational Risk Score</strong> from measurable study
            operations signals — not a clinically validated prediction model.
          </p>
        </div>

        <GlassPanel className="risk__card">
          <div className="risk__top">
            <div>
              <p className="mono ui-label">Study</p>
              <p className="h3">AYU-024</p>
            </div>
            <StatusBadge label="High risk" status="crit" pulse />
          </div>

          <div className="risk__score-wrap" aria-live="polite">
            <span className="risk__score">{score}</span>
            <span className="ui-label">Operational Risk Score</span>
          </div>

          <ul className="risk__factors">
            {FACTORS.map((f, i) => (
              <li key={f.label} className={i < revealed ? "is-on" : ""}>
                <span>{f.label}</span>
                <strong>+{f.points}</strong>
              </li>
            ))}
          </ul>

          <div className={`risk__why${revealed >= FACTORS.length ? " is-visible" : ""}`}>
            <h3 className="h3">Why is this study high risk?</h3>
            <p className="body">
              Recruitment is 31% below trajectory. Site 03 has had no recruitment activity for 18
              days. Two monitoring visits are overdue. These operational factors sum to the current
              score.
            </p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
