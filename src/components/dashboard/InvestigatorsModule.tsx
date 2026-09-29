import { useEffect, useState, type FormEvent } from "react";
import { api, type Investigator, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function InvestigatorsModule({ studies, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<Investigator[]>([]);
  const [selected, setSelected] = useState<Investigator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ code: "", displayName: "", specialty: "" });
  const [assign, setAssign] = useState({ studyId: "", investigatorId: "", roleTitle: "Investigator" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.investigators();
      setRows(list);
      if (!assign.studyId && studies[0]) setAssign((a) => ({ ...a, studyId: studies[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load investigators");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!can("investigator:manage")) return;
    setBusy(true);
    try {
      await api.createInvestigator({
        code: form.code,
        displayName: form.displayName,
        specialty: form.specialty || undefined,
      });
      setForm({ code: "", displayName: "", specialty: "" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    if (!can("investigator:manage")) return;
    setBusy(true);
    try {
      await api.assignInvestigator({
        studyId: assign.studyId,
        investigatorId: assign.investigatorId || selected?.id || "",
        roleTitle: assign.roleTitle,
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Investigator roster</p>
          <h3 className="ops__title">Investigators</h3>
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
                <th>Code</th>
                <th>Name</th>
                <th>Specialty</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3}>{loading ? "…" : "No investigators"}</td>
                </tr>
              )}
              {rows.map((inv) => (
                <tr
                  key={inv.id}
                  className={selected?.id === inv.id ? "is-selected" : ""}
                  onClick={() => setSelected(inv)}
                >
                  <td>{inv.code}</td>
                  <td>{inv.displayName}</td>
                  <td>{inv.specialty ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select an investigator</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.code}</strong> · {selected.displayName}
              </p>
              <p className="mono">Specialty: {selected.specialty ?? "—"}</p>
            </div>
          )}

          {can("investigator:manage") && (
            <>
              <form className="ops__form" onSubmit={onCreate}>
                <h4>Create investigator</h4>
                <label>
                  Code
                  <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
                </label>
                <label>
                  Display name
                  <input
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Specialty
                  <input value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} />
                </label>
                <button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Create investigator"}
                </button>
              </form>

              <form className="ops__form" onSubmit={onAssign}>
                <h4>Assign to study</h4>
                <label>
                  Study
                  <select value={assign.studyId} onChange={(e) => setAssign((a) => ({ ...a, studyId: e.target.value }))} required>
                    <option value="">Select…</option>
                    {studies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Investigator
                  <select
                    value={assign.investigatorId || selected?.id || ""}
                    onChange={(e) => setAssign((a) => ({ ...a, investigatorId: e.target.value }))}
                    required
                  >
                    <option value="">Select…</option>
                    {rows.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.code} — {inv.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Role title
                  <input value={assign.roleTitle} onChange={(e) => setAssign((a) => ({ ...a, roleTitle: e.target.value }))} />
                </label>
                <button type="submit" disabled={busy}>
                  {busy ? "Assigning…" : "Assign investigator"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
