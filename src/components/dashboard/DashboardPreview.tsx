import { useEffect, useMemo, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import { MetricTicker } from "../ui/MetricTicker";
import type { AdverseEvent, AlertItem, AuditEvent, AuthUser, Kpis, Study } from "../../lib/api";
import "./DashboardPreview.css";

export type DashFocus = "overview" | "study" | "risk" | "safety" | "compliance" | "audit";

type Props = {
  focus?: DashFocus;
  interactive?: boolean;
  user?: AuthUser | null;
  studies?: Study[];
  kpis?: Kpis | null;
  alerts?: AlertItem[];
  auditEvents?: AuditEvent[];
  adverseEvents?: AdverseEvent[];
  loading?: boolean;
  error?: string | null;
  source?: "live" | "offline";
};

function riskTone(risk: number): "crit" | "warn" | "ok" {
  if (risk >= 60) return "crit";
  if (risk >= 40) return "warn";
  return "ok";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function DashboardPreview({
  focus = "overview",
  interactive = true,
  user = null,
  studies: liveStudies = [],
  kpis = null,
  alerts = [],
  auditEvents = [],
  adverseEvents = [],
  loading = false,
  error = null,
  source = "offline",
}: Props) {
  const [filter, setFilter] = useState<"all" | "high">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (liveStudies[0] && !expanded) setExpanded(liveStudies[0].code);
  }, [liveStudies, expanded]);

  const studies = useMemo(() => {
    const rows = liveStudies.map((s) => ({
      id: s.code,
      phase: s.phase ?? "—",
      risk: s.riskScore,
      status: riskTone(s.riskScore),
      enrolled: `${s.enrollmentCurrent}/${s.enrollmentTarget}`,
      sites: "—",
      title: s.title,
      dbStatus: s.status,
      enrollmentCurrent: s.enrollmentCurrent,
      enrollmentTarget: s.enrollmentTarget,
    }));
    return filter === "high" ? rows.filter((s) => s.risk >= 60) : rows;
  }, [liveStudies, filter]);

  const lead = studies[0];
  const enrollPct =
    lead && lead.enrollmentTarget > 0
      ? Math.min(100, (lead.enrollmentCurrent / lead.enrollmentTarget) * 100)
      : 0;

  const aeOpen = adverseEvents.filter((a) => a.status !== "closed");
  const saeCount = adverseEvents.filter((a) => a.isSerious).length;
  const aeCount = adverseEvents.length;

  return (
    <div className={`dash focus-${focus}`} role="region" aria-label="VEDRAYA command center">
      <aside className="dash__rail" aria-label="Modules">
        {["Overview", "Studies", "Sites", "Safety", "Regulatory", "Audit"].map((item, i) => (
          <span key={item} className={`dash__rail-item${i === 0 ? " is-active" : ""}`}>
            {item[0]}
          </span>
        ))}
      </aside>

      <div className="dash__main">
        <header className="dash__header">
          <div>
            <p className="mono dash__eyebrow">
              Command Center · {source === "live" ? "Live PostgreSQL" : "Session required"}
            </p>
            <h3 className="dash__title">Research Operations Overview</h3>
            <p className="mono dash__telemetry">
              {source === "live"
                ? `SOURCE ${kpis?.source ?? "postgresql"} · ${user?.name ?? "—"} · ${(user?.roles ?? []).join(", ")}`
                : "Sign in below to load studies, KPIs, safety, and audit from the API"}
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

        {error && (
          <p className="dash__banner dash__banner--error" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="dash__banner">Loading operational data…</p>}

        <div className="dash__kpis">
          <GlassPanel className="dash__kpi" interactive>
            <span className="ui-label">Active studies</span>
            <strong>
              <MetricTicker value={kpis?.activeStudies ?? 0} />
            </strong>
          </GlassPanel>
          <GlassPanel className="dash__kpi dash__kpi--crit" interactive>
            <span className="ui-label">High risk</span>
            <strong>
              <MetricTicker value={kpis?.atRiskStudies ?? 0} />
            </strong>
          </GlassPanel>
          <GlassPanel className="dash__kpi dash__kpi--warn" interactive>
            <span className="ui-label">Open alerts</span>
            <strong>
              <MetricTicker value={alerts.length} />
            </strong>
          </GlassPanel>
          <GlassPanel className="dash__kpi dash__kpi--ok" interactive>
            <span className="ui-label">Total studies</span>
            <strong>
              <MetricTicker value={kpis?.totalStudies ?? 0} />
            </strong>
          </GlassPanel>
        </div>

        <div className="dash__grid">
          <GlassPanel className="dash__panel dash__studies" interactive>
            <div className="dash__panel-head">
              <h4>Studies</h4>
              <StatusBadge
                label={source === "live" ? "Live" : "Offline"}
                status={source === "live" ? "ok" : "warn"}
                pulse={source === "live"}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Study</th>
                  <th>Phase</th>
                  <th>Risk</th>
                  <th>Enrollment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {studies.length === 0 && (
                  <tr>
                    <td colSpan={5}>{loading ? "Loading…" : "No studies loaded"}</td>
                  </tr>
                )}
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
                      <StatusBadge label={`${s.risk}`} status={s.status} />
                    </td>
                    <td>{s.enrolled}</td>
                    <td>{s.dbStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expanded && (
              <div className="dash__expand">
                <p>
                  <strong>{expanded}</strong> —{" "}
                  {studies.find((s) => s.id === expanded)?.title ?? "Study detail"} · risk{" "}
                  {studies.find((s) => s.id === expanded)?.risk ?? "—"}.
                </p>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="dash__panel dash__recruit" interactive>
            <div className="dash__panel-head">
              <h4>Recruitment</h4>
              <span className="mono ui-label">{lead?.id ?? "—"}</span>
            </div>
            <div className="dash__bar-wrap">
              <div className="dash__bar" style={{ width: `${enrollPct.toFixed(1)}%` }} />
            </div>
            <div className="dash__meta">
              <span>
                {lead
                  ? `${lead.enrollmentCurrent} / ${lead.enrollmentTarget} enrolled`
                  : "No study selected"}
              </span>
              <span>{enrollPct.toFixed(1)}%</span>
            </div>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__safety" interactive>
            <div className="dash__panel-head">
              <h4>Safety</h4>
              <StatusBadge
                label={`${aeOpen.filter((a) => a.isSerious).length} open SAE`}
                status={saeCount > 0 ? "warn" : "ok"}
              />
            </div>
            <ul className="dash__stats">
              <li>
                <span>AE</span>
                <strong>{aeCount}</strong>
              </li>
              <li>
                <span>SAE</span>
                <strong>{saeCount}</strong>
              </li>
              <li>
                <span>Open</span>
                <strong>{aeOpen.length}</strong>
              </li>
              <li>
                <span>Escalated</span>
                <strong>{adverseEvents.filter((a) => a.status === "escalated").length}</strong>
              </li>
            </ul>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__alerts" interactive>
            <div className="dash__panel-head">
              <h4>Alerts</h4>
            </div>
            <ul className="dash__alert-list">
              {alerts.length === 0 && <li className="dash__muted">No computed alerts</li>}
              {alerts.slice(0, 6).map((a) => (
                <li key={`${a.type}-${a.entityId}`}>
                  <StatusBadge
                    label={a.level.toUpperCase()}
                    status={a.level === "crit" ? "crit" : a.level === "ok" ? "ok" : "warn"}
                  />
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__quality" interactive>
            <div className="dash__panel-head">
              <h4>Portfolio</h4>
            </div>
            <div className="dash__quality-score">
              <strong>{kpis?.completedStudies ?? 0}</strong>
              <span className="ui-label">
                completed · {kpis?.openHighRisk ?? 0} open high-risk AE · computed{" "}
                {kpis?.computedAt ? formatTime(kpis.computedAt) : "—"}
              </span>
            </div>
          </GlassPanel>

          <GlassPanel className="dash__panel dash__activity" interactive>
            <div className="dash__panel-head">
              <h4>Audit trail</h4>
            </div>
            <ul className="dash__activity-list mono">
              {auditEvents.length === 0 && <li className="dash__muted">No audit events loaded</li>}
              {auditEvents.slice(0, 8).map((e) => (
                <li key={e.id}>
                  {formatTime(e.occurredAt)} {e.actorName ?? "system"} · {e.action} · {e.entityType}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
