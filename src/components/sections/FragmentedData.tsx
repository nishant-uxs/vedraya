import { useEffect, useRef } from "react";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./FragmentedData.css";

const FRAGMENTS = [
  "SPREADSHEETS",
  "DISCONNECTED TOOLS",
  "MISSED DEADLINES",
  "SAFETY DELAYS",
  "DATA SILOS",
];

export function FragmentedData() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(".frag__item");
      const line = section.querySelector<SVGPathElement>(".frag__path");
      const finale = section.querySelector<HTMLElement>(".frag__finale");

      gsap.set(items, {
        x: (i) => (i - 2) * 140,
        y: (i) => ((i % 2 === 0 ? -1 : 1) * 60),
        rotate: (i) => (i - 2) * 4,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=180%",
          scrub: 0.7,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.to(items, {
        x: 0,
        y: 0,
        rotate: 0,
        stagger: 0.04,
        ease: "none",
      })
        .to(
          items,
          {
            scale: 0.85,
            opacity: 0.35,
            ease: "none",
          },
          "-=0.2",
        )
        .to(
          line,
          {
            strokeDashoffset: 0,
            ease: "none",
          },
          "<",
        )
        .to(
          finale,
          {
            opacity: 1,
            scale: 1,
            ease: "none",
          },
          "-=0.15",
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="platform"
      className="frag section"
      aria-labelledby="frag-heading"
    >
      <div className="container frag__inner">
        <div className="frag__copy">
          <h2 id="frag-heading" className="h1">
            Clinical research doesn&apos;t fail because there isn&apos;t enough data.
          </h2>
          <p className="h3 frag__second">It fails when the data is fragmented.</p>
        </div>

        <div className="frag__stage" aria-hidden>
          <svg className="frag__svg" viewBox="0 0 400 200" fill="none">
            <path
              className="frag__path"
              d="M40 100 H360"
              stroke="url(#fragGrad)"
              strokeWidth="2"
              strokeDasharray="320"
              strokeDashoffset="320"
            />
            <defs>
              <linearGradient id="fragGrad" x1="0" y1="0" x2="400" y2="0">
                <stop stopColor="#94a3b8" />
                <stop offset="1" stopColor="#0b8fbf" />
              </linearGradient>
            </defs>
          </svg>

          <div className="frag__items">
            {FRAGMENTS.map((label) => (
              <div key={label} className="frag__item mono">
                {label}
              </div>
            ))}
          </div>

          <div className="frag__finale">
            <span className="eyebrow">Convergence complete</span>
            <p className="h2">ONE RESEARCH SYSTEM</p>
          </div>
        </div>
      </div>
    </section>
  );
}
