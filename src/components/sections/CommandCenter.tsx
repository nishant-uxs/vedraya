import { useEffect, useRef, useState } from "react";
import { DashboardPreview, type DashFocus } from "../dashboard/DashboardPreview";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./CommandCenter.css";

const FOCUS_STEPS: DashFocus[] = [
  "overview",
  "study",
  "risk",
  "safety",
  "compliance",
  "audit",
];

export function CommandCenter() {
  const sectionRef = useRef<HTMLElement>(null);
  const [focus, setFocus] = useState<DashFocus>("overview");

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const shell = section.querySelector<HTMLElement>(".cmd__shell");
    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=280%",
            scrub: 0.7,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              const idx = Math.min(
                FOCUS_STEPS.length - 1,
                Math.floor(self.progress * FOCUS_STEPS.length),
              );
              setFocus(FOCUS_STEPS[idx]);
            },
          },
        })
        .fromTo(
          shell,
          { scale: 0.88, y: 40, opacity: 0.7 },
          { scale: 1, y: 0, opacity: 1, ease: "none", duration: 0.25 },
        )
        .to(shell, {
          scale: 1.08,
          ease: "none",
          duration: 0.75,
        });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="command-center"
      className="cmd section"
      aria-labelledby="cmd-heading"
    >
      <div className="container cmd__inner">
        <div className="cmd__intro">
          <span className="eyebrow">Signature · network → operating system</span>
          <h2 id="cmd-heading" className="h2">
            The research command center
          </h2>
          <p className="body">
            One operational surface for studies, risk, safety, compliance, and audit — not a static
            screenshot.
          </p>
          <p className="mono cmd__focus" aria-live="polite">
            Focus: {focus.toUpperCase()}
          </p>
        </div>
        <div className="cmd__shell">
          <DashboardPreview focus={focus} />
        </div>
      </div>
    </section>
  );
}
