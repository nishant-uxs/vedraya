import { useMemo, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import { MetricTicker } from "../ui/MetricTicker";
import "./DashboardPreview.css";

export type DashFocus = "overview" | "study" | "risk" | "safety" | "compliance" | "audit";

type Props = {
  focus?: DashFocus;
  interactive?: boolean;
};

const STUDIES = [
  { id: "AYU-024", phase: "III", risk: 78, status: "crit" as const, enrolled: "327/500", sites: 12 },
  { id: "AYU-031", phase: "II", risk: 42, status: "warn" as const, enrolled: "118/200", sites: 8 },
  { id: "AYU-018", phase: "III", risk: 21, status: "ok" as const, enrolled: "490/500", sites: 15 },
  { id: "NEU-007", phase: "I", risk: 35, status: "ok" as const, enrolled: "28/40", sites: 4 },
];

const ALERTS = [
  { t: "14:32", text: "AYU-024 — SAE reporting window approaching", level: "crit" as const },
  { t: "13:08", text: "Site 03 — no recruitment activity 18 days", level: "warn" as const },
  { t: "11:44", text: "Monitoring visit overdue — AYU-031", level: "warn" as const },
  { t: "09:15", text: "Data integrity check passed — batch 214", level: "ok" as const },
];

export function DashboardPreview({ focus = "overview", interactive = true }: Props) {
  const [filter, setFilter] = useState<"all" | "high">("all");
  const [expanded, setExpanded] = useState<string | null>("AYU-024");

  const studies = useMemo(
    () => (filter === "high" ? STUDIES.filter((s) => s.risk >= 60) : STUDIES),
    [filter],
  );

  return (
    <div className={`dash focus-${focus}`} role="region" aria-label="VEDRAYA command center preview">
      <aside className="dash__rail" aria-label="Modules">
        {["Overview", "Studies", "Sites", "Safety", "Regulatory", "Audit", "Copilot"].map(
          (item, i) => (
            <span key={item} className={`dash__rail-item${i === 0 ? " is-active" : ""}`}>
              {item[0]}
            </span>
          ),
        )}
      </aside>

      <div className="dash__main">
        <header className="dash__header">
          <div>
            <p className="mono dash__eyebrow">Command Center · Node 01</p>
            <h3 className="dash__title">Research Operations Overview</h3>
            <p className="mono dash__telemetry">
              LATENCY 14ms · FEDERATED 148 · AUDIT IMMUTABLE
            </p>
          </div>
          <div className="dash__filters" role="group" aria-label="Study filters">
            <button
              type="button"
              className={filter === "all" ? "is-active" : ""}
              onClick={() => interactive && setFilter("all")}
            >
              All studies
            </button>
            <button
              type="button"
              className={filter === "high" ? "is-active" : ""}
              onClick={() => interactive && setFilter("high")}
            >
              High risk
            </button>
          </div>
        </header>

        <div className="dash__kpis">
          <GlassPanel className="dash__kpi" interactive>
            <span className="ui-label">Active studies</span>
            <strong>
              <MetricTicker value={27} />
            </strong>
          </GlassPanel>
          <GlassPanel className="dash__kpi dash__kpi--crit" interactive>
            <span className="ui-label">High risk</span>
            <strong>
              <MetricTicker value={4} />
            </strong>
          </GlassPanel>
          <GlassPanel className="dash__kpi dash__kpi--warn" interactive>
            <span className="ui-label">Open alerts</span>
            <strong>
              <MetricTicker value={12} />
            </strong>
          </GlassPanel>
          <GlassPanel className="dash__kpi dash__kpi--ok" interactive>
            <span className="ui-label">Data integrity</span>
            <strong>
              <MetricTicker value={98.2} decimals={1} suffix="%" />
            </strong>
          </GlassPanel>
        </div>

        <div className="dash__grid">
          <GlassPanel className="dash__panel dash__studies" interactive>
            <div className="dash__panel-head">
              <h4>Active studies</h4>
              <StatusBadge label="Live" status="info" pulse />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Study</th>
                  <th>Phase</th>
                  <th>Risk</th>
                  <th>Enrollment</th>
                  <th>Sites</th>
                </tr>
              </thead>
              <tbody>
                {studies.map((s) => (
                  <tr
                    key={s.id}
                    className={expanded === s.id ? "is-expanded" : ""}
                    onClick={() => interactive && setExpanded(expanded === s.id ? null : s.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!interactive) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(expanded === s.id ? null : s.id);
                      }
                    }}
                  >
                    <td>{s.id}</td>
                    <td>{s.phase}</td>
                    <td>
                      <StatusBadge
                        label={`${s.risk}`}
                        status={s.status}
                      />
                    </td>
                    <td>{s.enrolled}</td>
                    <td>{s.sites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expanded && (
              <div className="dash__expand">
                <p>
                  <strong>{expanded}</strong> — Operational monitoring score elevated. Recruitment
                  below trajectory. Site inactivity and overdue monitoring contributing.
                </p>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="dash__panel dash__recruit" interactive>
            <div className="dash__panel-head">
              <h4>Recruitment</h4>
              <span className="mono ui-label">AYU-024</span>
            </div>
            <div className="dash__bar-wrap">
              <div className="dash__bar" style={{ width: "65.4%" }} />
            </div>
            <div className="dash__meta">
              <span>327 / 500 enrolled</span>
              <span>65.4%</span>
            </div>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__safety" interactive>
            <div className="dash__panel-head">
              <h4>Safety</h4>
              <StatusBadge label="4 open SAE" status="warn" />
            </div>
            <ul className="dash__stats">
              <li>
                <span>AE</span>
                <strong>148</strong>
              </li>
              <li>
                <span>SAE</span>
                <strong>12</strong>
              </li>
              <li>
                <span>ADR</span>
                <strong>6</strong>
              </li>
              <li>
                <span>Signals</span>
                <strong>2</strong>
              </li>
            </ul>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__alerts" interactive>
            <div className="dash__panel-head">
              <h4>Alerts</h4>
            </div>
            <ul className="dash__alert-list">
              {ALERTS.map((a) => (
                <li key={a.t + a.text}>
                  <StatusBadge label={a.t} status={a.level} />
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__quality" interactive>
            <div className="dash__panel-head">
              <h4>Data quality</h4>
            </div>
            <div className="dash__quality-score">
              <strong>98.2%</strong>
              <span className="ui-label">integrity across federated sources</span>
            </div>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__activity" interactive>
            <div className="dash__panel-head">
              <h4>Recent activity</h4>
            </div>
            <ul className="dash__activity-list mono">
              <li>14:32 Dr. Sharma updated recruitment target</li>
              <li>14:32 System validated change</li>
              <li>15:01 Regulatory officer reviewed</li>
            </ul>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
