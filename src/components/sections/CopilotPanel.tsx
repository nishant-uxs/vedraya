import { useEffect, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import { useReducedMotion } from "../../lib/useReducedMotion";
import "./CopilotPanel.css";

const RESPONSE_LINES = [
  "AYU-024 is currently classified as HIGH RISK.",
  "Recruitment is 31% below trajectory.",
  "Site 03 has had no recruitment activity for 18 days.",
  "Two monitoring visits are overdue.",
  "",
  "Recommended operational actions:",
  "• Review Site 03",
  "• Schedule monitoring visit",
  "• Resolve high-priority queries",
];

const SUGGESTIONS = [
  "What changed this week?",
  "Show overdue regulatory actions",
  "Which sites need attention?",
  "Summarize this study",
];

export function CopilotPanel() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    if (reduced) {
      setVisible(RESPONSE_LINES.length);
      return;
    }
    if (visible >= RESPONSE_LINES.length) return;
    const id = window.setTimeout(() => setVisible((v) => v + 1), 420);
    return () => window.clearTimeout(id);
  }, [started, visible, reduced]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("copilot");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.7) setStarted(true);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="copilot" className="copilot section" aria-labelledby="copilot-heading">
      <div className="container copilot__inner">
        <div className="copilot__copy">
          <span className="eyebrow">Research copilot</span>
          <h2 id="copilot-heading" className="h1">
            Ask the research system.
          </h2>
          <p className="body">
            An embedded intelligence layer grounded in operational study data — not a generic chat
            clone.
          </p>
        </div>

        <GlassPanel className="copilot__panel">
          <div className="copilot__query">
            <StatusBadge label="Grounded query" status="info" />
            <p className="h3">Why is AYU-024 high risk?</p>
          </div>

          <div className="copilot__response" aria-live="polite">
            {RESPONSE_LINES.slice(0, visible).map((line, i) =>
              line === "" ? <br key={i} /> : <p key={i}>{line}</p>,
            )}
            {started && visible < RESPONSE_LINES.length && (
              <span className="copilot__caret" aria-hidden />
            )}
          </div>

          <div className="copilot__suggestions">
            <p className="ui-label">Suggested questions</p>
            <div className="copilot__chips">
              {SUGGESTIONS.map((q) => (
                <button key={q} type="button" className="copilot__chip">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
