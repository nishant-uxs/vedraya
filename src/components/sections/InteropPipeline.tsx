import { useEffect, useRef, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./InteropPipeline.css";

const PIPE = ["EDC", "CTMS", "FHIR / CDISC", "ABDM / SDTM / ADaM"];
const TRANSFORM = [
  { stage: "SOURCE", value: "participant_id" },
  { stage: "TRANSFORM", value: "FHIR ResearchSubject.identifier" },
  { stage: "VALIDATION", value: "schema + code-system checks" },
  { stage: "DESTINATION", value: "SDTM USUBJID" },
];

export function InteropPipeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) {
      setStep(TRANSFORM.length - 1);
      return;
    }

    const ctx = gsap.context(() => {
      gsap.to({}, {
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "bottom 40%",
          scrub: true,
          onUpdate: (self) => {
            setStep(Math.min(TRANSFORM.length - 1, Math.floor(self.progress * TRANSFORM.length)));
          },
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="interop"
      className="interop section"
      aria-labelledby="interop-heading"
    >
      <div className="container interop__inner">
        <div className="interop__copy">
          <span className="eyebrow">Interoperability · conceptual visualization</span>
          <h2 id="interop-heading" className="h2">
            One research system.
            <br />
            Every standard.
          </h2>
          <p className="body">
            Illustrated pipeline only. Live FHIR R4 prototype and adapter status (
            <strong>ABDM / HIS / EDC = NOT CONNECTED</strong>) are in Command Center.
          </p>
        </div>

        <div className="interop__pipe" aria-label="Infrastructure pipeline">
          {PIPE.map((node, i) => (
            <div key={node} className="interop__node">
              <GlassPanel className="interop__node-card">{node}</GlassPanel>
              {i < PIPE.length - 1 && <span className="interop__down" aria-hidden>↓</span>}
            </div>
          ))}
        </div>

        <GlassPanel className="interop__transform">
          <p className="mono ui-label">Field transformation</p>
          <ol className="interop__steps">
            {TRANSFORM.map((t, i) => (
              <li key={t.stage} className={i <= step ? "is-on" : ""}>
                <span className="mono">{t.stage}</span>
                <code>{t.value}</code>
              </li>
            ))}
          </ol>
        </GlassPanel>
      </div>
    </section>
  );
}
