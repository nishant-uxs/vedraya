import { useEffect, useRef } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import "./AuditTimeline.css";

const EVENTS = [
  {
    time: "14:32:08",
    actor: "Dr. Ananya Sharma",
    action: "UPDATED",
    detail: "Recruitment Target",
    change: "200 → 250",
    reason: "Protocol Amendment v2.1",
  },
  {
    time: "14:32:11",
    actor: "SYSTEM",
    action: "VALIDATED",
    detail: "Change integrity check",
    change: "Hash verified",
    reason: "Automated policy engine",
  },
  {
    time: "15:01:44",
    actor: "Regulatory Officer",
    action: "REVIEWED",
    detail: "Amendment acknowledgment",
    change: "Accepted",
    reason: "Regulatory review complete",
  },
];

export function AuditTimeline() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from(".audit__item", {
        opacity: 0,
        y: 28,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 60%",
          end: "center center",
          scrub: 0.6,
        },
      });

      gsap.fromTo(
        ".audit__line-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 60%",
            end: "bottom 40%",
            scrub: true,
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="audit section" aria-labelledby="audit-heading">
      <div className="container audit__inner">
        <div className="audit__copy">
          <span className="eyebrow">Audit trail</span>
          <h2 id="audit-heading" className="h1">
            If it changed, we know who changed it.
          </h2>
        </div>

        <div className="audit__stream">
          <div className="audit__line" aria-hidden>
            <div className="audit__line-fill" />
          </div>
          <ol className="audit__list">
            {EVENTS.map((e) => (
              <li key={e.time + e.action} className="audit__item">
                <GlassPanel className="audit__card" interactive>
                  <div className="audit__meta">
                    <span className="mono">{e.time}</span>
                    <StatusBadge label={e.action} status="info" />
                  </div>
                  <h3 className="h3">{e.actor}</h3>
                  <p className="ui-label">{e.detail}</p>
                  <p className="audit__change mono">{e.change}</p>
                  <p className="body">Reason: {e.reason}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
