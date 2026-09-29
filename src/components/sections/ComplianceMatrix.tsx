import { useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import "./ComplianceMatrix.css";

type Item = {
  label: string;
  status: "ok" | "warn";
  evidence?: {
    title: string;
    studies: string[];
    action: string;
  };
};

const MATRIX: Item[] = [
  { label: "ETHICS APPROVAL", status: "ok" },
  { label: "CTRI REGISTRATION", status: "ok" },
  { label: "CONSENT VERSION", status: "ok" },
  {
    label: "MONITORING",
    status: "warn",
    evidence: {
      title: "2 overdue monitoring reports",
      studies: ["AYU-024", "AYU-031"],
      action: "Schedule monitoring visit",
    },
  },
  { label: "SAFETY REPORTING", status: "ok" },
  { label: "AUDIT TRAIL", status: "ok" },
  {
    label: "DATA INTEGRITY",
    status: "warn",
    evidence: {
      title: "3 open query clusters above threshold",
      studies: ["AYU-024"],
      action: "Resolve high-priority queries",
    },
  },
];

export function ComplianceMatrix() {
  const [active, setActive] = useState<string | null>("MONITORING");
  const selected = MATRIX.find((m) => m.label === active);

  return (
    <section id="compliance" className="comp section" aria-labelledby="comp-heading">
      <div className="container comp__inner">
        <div className="comp__copy">
          <span className="eyebrow">Continuous compliance · conceptual visualization</span>
          <h2 id="comp-heading" className="h2">
            Compliance shouldn&apos;t be a report you generate.
          </h2>
          <p className="h3 comp__second">It should be a system that continuously checks itself.</p>
        </div>

        <div className="comp__layout">
          <ul className="comp__matrix" role="list">
            {MATRIX.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className={`comp__row${active === item.label ? " is-active" : ""}`}
                  onClick={() => setActive(item.label)}
                  aria-expanded={active === item.label}
                >
                  <span>{item.label}</span>
                  <StatusBadge
                    label={item.status === "ok" ? "Pass" : "Attention"}
                    status={item.status}
                  />
                </button>
              </li>
            ))}
          </ul>

          <GlassPanel className="comp__evidence" as="article">
            {selected?.evidence ? (
              <>
                <StatusBadge label="Evidence" status="warn" />
                <h3 className="h3">{selected.evidence.title}</h3>
                <p className="ui-label">Affected studies</p>
                <ul className="comp__studies">
                  {selected.evidence.studies.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className="ui-label">Recommended operational action</p>
                <p className="comp__action">{selected.evidence.action}</p>
              </>
            ) : (
              <>
                <StatusBadge label="Nominal" status="ok" />
                <h3 className="h3">{selected?.label}</h3>
                <p className="body">No open exceptions for this control in the demonstration set.</p>
              </>
            )}
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}
