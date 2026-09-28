import { useEffect, useRef, useState } from "react";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./TrialLifecycle.css";

const STAGES = [
  "PROTOCOL",
  "ETHICS",
  "CTRI",
  "SITE ACTIVATION",
  "RECRUITMENT",
  "MONITORING",
  "DATA LOCK",
  "ANALYSIS",
  "CLOSEOUT",
];

export function TrialLifecycle() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(4);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const track = section.querySelector<HTMLElement>(".life__track");
    const path = section.querySelector<SVGPathElement>(".life__path");

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=220%",
            scrub: 0.65,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              const idx = Math.min(
                STAGES.length - 1,
                Math.floor(self.progress * STAGES.length),
              );
              setActive(idx);
            },
          },
        })
        .to(path, { strokeDashoffset: 0, ease: "none", duration: 1 }, 0)
        .to(
          track,
          {
            x: () => {
              const max = Math.max(0, (track?.scrollWidth ?? 0) - (section.clientWidth - 64));
              return -max;
            },
            ease: "none",
            duration: 1,
          },
          0,
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="life section" aria-labelledby="life-heading">
      <div className="container">
        <div className="life__intro">
          <span className="eyebrow">Trial lifecycle</span>
          <h2 id="life-heading" className="h2">
            Every stage. One continuous path.
          </h2>
        </div>
      </div>

      <div className="life__viewport">
        <svg className="life__svg" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden>
          <path
            className="life__path"
            d="M20 20 H1180"
            stroke="url(#lifeGrad)"
            strokeWidth="2"
            strokeDasharray="1160"
            strokeDashoffset="1160"
            fill="none"
          />
          <defs>
            <linearGradient id="lifeGrad" x1="0" y1="0" x2="1200" y2="0">
              <stop stopColor="#94a3b8" />
              <stop offset="1" stopColor="#0b8fbf" />
            </linearGradient>
          </defs>
        </svg>

        <div className="life__track" role="list">
          {STAGES.map((stage, i) => {
            const state =
              i === active ? "is-active" : i < active ? "is-past" : "is-next";
            return (
              <article key={stage} className={`life__stage ${state}`} role="listitem">
                <p className="mono life__index">{String(i + 1).padStart(2, "0")}</p>
                <h3>{stage}</h3>
                {stage === "RECRUITMENT" && i === active && (
                  <div className="life__detail">
                    <p>
                      Target <strong>500</strong>
                    </p>
                    <p>
                      Enrolled <strong>327</strong>
                    </p>
                    <p>
                      Progress <strong>65.4%</strong>
                    </p>
                    <p>
                      Projected <strong>14 Aug 2027</strong>
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
