import { useEffect, useRef, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./SafetyIntelligence.css";

const HIERARCHY = ["AE", "SAE", "ADR", "SAFETY SIGNAL"];
const WORKFLOW = ["REPORTED", "TRIAGED", "UNDER REVIEW", "CAUSALITY", "REGULATORY", "CLOSED"];

export function SafetyIntelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) {
      setStep(WORKFLOW.length - 1);
      return;
    }

    const ctx = gsap.context(() => {
      gsap.to({}, {
        scrollTrigger: {
          trigger: section,
          start: "top 55%",
          end: "bottom 45%",
          scrub: true,
          onUpdate: (self) => {
            setStep(Math.min(WORKFLOW.length - 1, Math.floor(self.progress * WORKFLOW.length)));
          },
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="safety"
      className="safety section"
      aria-labelledby="safety-heading"
    >
      <div className="container safety__inner">
        <div className="safety__copy">
          <span className="eyebrow">Pharmacovigilance</span>
          <h2 id="safety-heading" className="h1">
            Safety doesn&apos;t belong in another spreadsheet.
          </h2>
          <p className="body">
            Demonstrative operational workflow for adverse event handling — not a medical claim or
            diagnostic system.
          </p>
        </div>

        <div className="safety__hierarchy" aria-label="Safety event hierarchy">
          {HIERARCHY.map((item, i) => (
            <div key={item} className="safety__hier-item">
              <span>{item}</span>
              {i < HIERARCHY.length - 1 && <span className="safety__arrow" aria-hidden>→</span>}
            </div>
          ))}
        </div>

        <GlassPanel className="safety__board">
          <div className="safety__workflow" role="list">
            {WORKFLOW.map((stage, i) => (
              <div
                key={stage}
                role="listitem"
                className={`safety__step${i <= step ? " is-on" : ""}${i === step ? " is-current" : ""}`}
              >
                <StatusBadge
                  label={stage}
                  status={i < step ? "ok" : i === step ? "warn" : "neutral"}
                />
              </div>
            ))}
          </div>

          <div className="safety__panels">
            <div>
              <h3 className="ui-label">Severity distribution</h3>
              <div className="safety__bars" aria-hidden>
                <div style={{ height: "42%" }} data-label="Mild" />
                <div style={{ height: "28%" }} data-label="Moderate" />
                <div style={{ height: "18%" }} data-label="Severe" />
                <div style={{ height: "12%" }} data-label="SAE" />
              </div>
            </div>
            <div>
              <h3 className="ui-label">Case state</h3>
              <p className="h3">{WORKFLOW[step]}</p>
              <p className="body">
                Case PV-2041 · Site 07 · Under operational review with causality assessment queued.
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
