import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  type AdverseEvent,
  type AeKpis,
  type Participant,
  type Study,
} from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

const AE_TRANSITIONS: Record<string, string[]> = {
  reported: ["investigator_review", "safety_review", "closed"],
  investigator_review: ["safety_review", "escalated", "closed"],
  safety_review: ["escalated", "closed"],
  escalated: ["closed", "safety_review"],
  closed: [],
};

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function SafetyModule({ studies, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<AdverseEvent[]>([]);
  const [kpis, setKpis] = useState<AeKpis | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<AdverseEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    studyId: "",
    participantId: "",
    description: "",
    isSerious: false,
    severity: "mild" as "mild" | "moderate" | "severe",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [list, k, parts] = await Promise.all([
        api.adverseEvents(),
        api.aeKpis(),
        api.participants(),
      ]);
      setRows(list);
      setKpis(k);
      setParticipants(parts);
      if (!form.studyId && studies[0]) setForm((f) => ({ ...f, studyId: studies[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load safety data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studyParts = participants.filter((p) => p.studyId === form.studyId);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!can("ae:create")) return;
    setBusy(true);
    try {
      await api.createAdverseEvent({
        studyId: form.studyId,
        participantId: form.participantId || undefined,
        description: form.description,
        isSerious: form.isSerious,
        severity: form.severity,
      });
      setForm((f) => ({ ...f, description: "", participantId: "" }));
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function transition(status: string) {
    if (!selected) return;
    if (status === "escalated" && !can("ae:escalate")) return;
    if (status !== "escalated" && !can("ae:update")) return;
    setBusy(true);
    try {
      const row = await api.updateAeStatus(selected.id, status);
      setSelected(row);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const studyCode = (id: string) => studies.find((s) => s.id === id)?.code ?? id.slice(0, 8);

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Pharmacovigilance</p>
          <h3 className="ops__title">Adverse events</h3>
        </div>
        <div className="ops__kpis">
          <span className="ops__kpi-static">Open {kpis?.open ?? "—"}</span>
          <span className="ops__kpi-static">Serious {kpis?.serious ?? "—"}</span>
          <span className="ops__kpi-static">Escalated {kpis?.escalated ?? "—"}</span>
          <span className="ops__kpi-static">Pending review {kpis?.pendingReview ?? "—"}</span>
        </div>
      </header>

      {error && (
        <p className="ops__error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="ops__muted">Loading…</p>}

      <div className="ops__grid">
        <div className="ops__panel">
          <table className="ops__table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Study</th>
                <th>SAE</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? "…" : "No adverse events"}</td>
                </tr>
              )}
              {rows.map((ae) => (
                <tr
                  key={ae.id}
                  className={selected?.id === ae.id ? "is-selected" : ""}
                  onClick={() => setSelected(ae)}
                >
                  <td>{ae.caseCode}</td>
                  <td>{studyCode(ae.studyId)}</td>
                  <td>{ae.isSerious ? "Yes" : "No"}</td>
                  <td>{ae.severity}</td>
                  <td>{ae.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select an adverse event</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.caseCode}</strong> · {studyCode(selected.studyId)}
              </p>
              <p className="mono">{selected.description}</p>
              <p className="mono">
                SAE: {selected.isSerious ? "yes" : "no"} · {selected.severity} · {selected.status}
              </p>
              <div className="ops__actions">
                {(AE_TRANSITIONS[selected.status] ?? []).map((st) => {
                  const allowed =
                    st === "escalated" ? can("ae:escalate") : can("ae:update");
                  if (!allowed) return null;
                  return (
                    <button key={st} type="button" disabled={busy} onClick={() => void transition(st)}>
                      → {st}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {can("ae:create") && (
            <form className="ops__form" onSubmit={onCreate}>
              <h4>Report adverse event</h4>
              <label>
                Study
                <select
                  value={form.studyId}
                  onChange={(e) => setForm((f) => ({ ...f, studyId: e.target.value, participantId: "" }))}
                  required
                >
                  <option value="">Select…</option>
                  {studies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Subject (optional)
                <select value={form.participantId} onChange={(e) => setForm((f) => ({ ...f, participantId: e.target.value }))}>
                  <option value="">—</option>
                  {studyParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.subjectCode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                  minLength={5}
                />
              </label>
              <label>
                Severity
                <select
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as typeof form.severity }))}
                >
                  <option value="mild">mild</option>
                  <option value="moderate">moderate</option>
                  <option value="severe">severe</option>
                </select>
              </label>
              <label className="ops__checkbox">
                <input
                  type="checkbox"
                  checked={form.isSerious}
                  onChange={(e) => setForm((f) => ({ ...f, isSerious: e.target.checked }))}
                />
                Serious (SAE)
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create AE report"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
