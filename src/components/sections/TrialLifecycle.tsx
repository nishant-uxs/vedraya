import { useEffect, useRef, useState } from "react";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./TrialLifecycle.css";

type Stage = {
  name: string;
  summary: string;
  metrics: { label: string; value: string }[];
};

const STAGES: Stage[] = [
  {
    name: "PROTOCOL",
    summary: "Protocol drafted, versioned, and aligned to study objectives.",
    metrics: [
      { label: "Version", value: "v2.1" },
      { label: "Amendments", value: "1 open" },
    ],
  },
  {
    name: "ETHICS",
    summary: "Ethics review queued with consent and site approval tracking.",
    metrics: [
      { label: "Status", value: "Under review" },
      { label: "Queries", value: "3" },
    ],
  },
  {
    name: "CTRI",
    summary: "Registry submission and compliance checkpoints monitored.",
    metrics: [
      { label: "CTRI", value: "Submitted" },
      { label: "Next", value: "Ack pending" },
    ],
  },
  {
    name: "SITE ACTIVATION",
    summary: "Sites primed for initiation — readiness and docs verified.",
    metrics: [
      { label: "Sites ready", value: "8 / 12" },
      { label: "Blockers", value: "2" },
    ],
  },
  {
    name: "RECRUITMENT",
    summary: "Enrollment against target with trajectory and site velocity.",
    metrics: [
      { label: "Target", value: "500" },
      { label: "Enrolled", value: "327" },
      { label: "Progress", value: "65.4%" },
      { label: "Projected", value: "14 Aug 2027" },
    ],
  },
  {
    name: "MONITORING",
    summary: "Visit cadence, deviations, and query backlog under watch.",
    metrics: [
      { label: "Overdue", value: "2 visits" },
      { label: "Open queries", value: "41" },
    ],
  },
  {
    name: "DATA LOCK",
    summary: "Clean datasets prepared for lock with integrity checks.",
    metrics: [
      { label: "DQ score", value: "98.2%" },
      { label: "Lock window", value: "Q3" },
    ],
  },
  {
    name: "ANALYSIS",
    summary: "Statistical outputs and signal review for decision support.",
    metrics: [
      { label: "Tables", value: "124" },
      { label: "Signals", value: "2" },
    ],
  },
  {
    name: "CLOSEOUT",
    summary: "Archival, reporting, and study closeout obligations tracked.",
    metrics: [
      { label: "Closeout", value: "In progress" },
      { label: "Archive", value: "Queued" },
    ],
  },
];

export function TrialLifecycle() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(4);
  const [hovered, setHovered] = useState<number | null>(null);

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
            end: "+=140%",
            scrub: 0.85,
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
          <span className="eyebrow">Trial lifecycle · conceptual visualization</span>
          <h2 id="life-heading" className="h2">
            Every stage. One continuous path.
          </h2>
          <p className="body">
            Narrative stages with illustrative metrics — not live study data. Open Live Command
            Center for PostgreSQL-backed lifecycle and CTRI TRACKING.
          </p>
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
              <stop stopColor="var(--titanium)" />
              <stop offset="1" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="life__track" role="list">
          {STAGES.map((stage, i) => {
            const state =
              i === active ? "is-active" : i < active ? "is-past" : "is-next";
            const expanded = hovered === i || (hovered === null && i === active);
            const dimmed = hovered !== null && hovered !== i;
            return (
              <article
                key={stage.name}
                className={`life__stage ${state}${expanded ? " is-expanded" : ""}${dimmed ? " is-dimmed" : ""}`}
                role="listitem"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              >
                <p className="mono life__index">{String(i + 1).padStart(2, "0")}</p>
                <h3>{stage.name}</h3>
                <div className="life__detail" aria-hidden={!expanded}>
                  <p className="life__summary">{stage.summary}</p>
                  <ul className="life__metrics">
                    {stage.metrics.map((m) => (
                      <li key={m.label}>
                        <span>{m.label}</span>
                        <strong>{m.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
