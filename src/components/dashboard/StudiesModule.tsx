import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Study, type StudyDetail } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["setup", "archived"],
  setup: ["active", "recruiting", "archived"],
  active: ["recruiting", "follow_up", "completed", "archived"],
  recruiting: ["active", "follow_up", "completed", "archived"],
  follow_up: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function StudiesModule({ studies: initialStudies, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<Study[]>(initialStudies);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<"all" | "high">("all");
  const [selected, setSelected] = useState<StudyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    phase: "",
    enrollmentTarget: "50",
    riskScore: "0",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.studies();
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRows(initialStudies);
  }, [initialStudies]);

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (riskFilter === "high" && s.riskScore < 60) return false;
      if (!q) return true;
      return s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter, riskFilter]);

  async function selectStudy(s: Study) {
    try {
      const detail = await api.studyById(s.id);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load study");
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!can("study:create")) return;
    setBusy(true);
    setError(null);
    try {
      await api.createStudy({
        code: form.code,
        title: form.title,
        phase: form.phase || undefined,
        enrollmentTarget: Number(form.enrollmentTarget) || 0,
        riskScore: Number(form.riskScore) || 0,
      });
      setForm({ code: "", title: "", phase: "", enrollmentTarget: "50", riskScore: "0" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function transition(status: string) {
    if (!selected || !can("study:update")) return;
    setBusy(true);
    try {
      const row = await api.updateStudy(selected.id, { status });
      setSelected(row);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!selected || !can("study:archive")) return;
    setBusy(true);
    try {
      const row = await api.archiveStudy(selected.id);
      setSelected(row);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  }

  const statuses = ["draft", "setup", "active", "recruiting", "follow_up", "completed", "archived"];

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Study lifecycle</p>
          <h3 className="ops__title">Studies</h3>
        </div>
        <div className="ops__kpis">
          <button type="button" className={riskFilter === "all" ? "is-active" : ""} onClick={() => setRiskFilter("all")}>
            All risk
          </button>
          <button type="button" className={riskFilter === "high" ? "is-active" : ""} onClick={() => setRiskFilter("high")}>
            High risk (≥60)
          </button>
        </div>
      </header>

      <label className="ops__search">
        <span className="ui-label">Search</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code or title…" />
      </label>

      <div className="ops__kpis">
        <button type="button" className={statusFilter === "all" ? "is-active" : ""} onClick={() => setStatusFilter("all")}>
          All statuses
        </button>
        {statuses.map((st) => (
          <button
            key={st}
            type="button"
            className={statusFilter === st ? "is-active" : ""}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

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
                <th>Code</th>
                <th>Phase</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Enrollment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? "…" : "No studies"}</td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={selected?.id === s.id ? "is-selected" : ""}
                  onClick={() => void selectStudy(s)}
                >
                  <td>{s.code}</td>
                  <td>{s.phase ?? "—"}</td>
                  <td>{s.status}</td>
                  <td>{s.riskScore}</td>
                  <td>
                    {s.enrollmentCurrent}/{s.enrollmentTarget}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select a study</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.code}</strong> · {selected.title}
              </p>
              <p className="mono">Status: {selected.status}</p>
              <p className="mono">Phase: {selected.phase ?? "—"}</p>
              <p className="mono">
                Enrollment: {selected.enrollmentCurrent}/{selected.enrollmentTarget}
              </p>
              <p className="mono">Risk score: {selected.riskScore}</p>
              {selected.sponsor && <p className="mono">Sponsor: {selected.sponsor}</p>}
              {selected.therapeuticArea && <p className="mono">Area: {selected.therapeuticArea}</p>}
              {can("study:update") && (
                <div className="ops__actions">
                  {(STATUS_TRANSITIONS[selected.status] ?? []).map((st) => (
                    <button key={st} type="button" disabled={busy} onClick={() => void transition(st)}>
                      → {st}
                    </button>
                  ))}
                </div>
              )}
              {can("study:archive") && selected.status !== "archived" && (
                <div className="ops__actions">
                  <button type="button" className="ops__danger" disabled={busy} onClick={() => void archive()}>
                    Archive study
                  </button>
                </div>
              )}
            </div>
          )}

          {can("study:create") && (
            <form className="ops__form" onSubmit={onCreate}>
              <h4>Create study</h4>
              <label>
                Code
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required minLength={3} />
              </label>
              <label>
                Title
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required minLength={3} />
              </label>
              <label>
                Phase
                <input value={form.phase} onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))} placeholder="Optional" />
              </label>
              <label>
                Enrollment target
                <input
                  type="number"
                  min={0}
                  value={form.enrollmentTarget}
                  onChange={(e) => setForm((f) => ({ ...f, enrollmentTarget: e.target.value }))}
                />
              </label>
              <label>
                Risk score (0–100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.riskScore}
                  onChange={(e) => setForm((f) => ({ ...f, riskScore: e.target.value }))}
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create draft study"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
