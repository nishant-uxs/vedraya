import { useEffect, useState, type FormEvent } from "react";
import { api, type Site, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function SitesModule({ studies, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<Site[]>([]);
  const [selected, setSelected] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", city: "" });
  const [assign, setAssign] = useState({ studyId: "", siteId: "", status: "pending" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.sites();
      setRows(list);
      if (!assign.studyId && studies[0]) setAssign((a) => ({ ...a, studyId: studies[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
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
    if (!can("site:manage")) return;
    setBusy(true);
    try {
      await api.createSite({
        code: form.code,
        name: form.name,
        city: form.city || undefined,
      });
      setForm({ code: "", name: "", city: "" });
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
    if (!can("site:manage")) return;
    setBusy(true);
    try {
      await api.assignSite({
        studyId: assign.studyId,
        siteId: assign.siteId || selected?.id || "",
        status: assign.status,
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
          <p className="mono ops__eyebrow">Site network</p>
          <h3 className="ops__title">Clinical sites</h3>
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
                <th>City</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>{loading ? "…" : "No sites"}</td>
                </tr>
              )}
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className={selected?.id === s.id ? "is-selected" : ""}
                  onClick={() => setSelected(s)}
                >
                  <td>{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.city ?? "—"}</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select a site</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.code}</strong> · {selected.name}
              </p>
              <p className="mono">Status: {selected.status}</p>
              <p className="mono">City: {selected.city ?? "—"}</p>
            </div>
          )}

          {can("site:manage") && (
            <>
              <form className="ops__form" onSubmit={onCreate}>
                <h4>Create site</h4>
                <label>
                  Code
                  <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
                </label>
                <label>
                  Name
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </label>
                <label>
                  City
                  <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </label>
                <button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Create site"}
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
                  Site
                  <select
                    value={assign.siteId || selected?.id || ""}
                    onChange={(e) => setAssign((a) => ({ ...a, siteId: e.target.value }))}
                    required
                  >
                    <option value="">Select…</option>
                    {rows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Link status
                  <select value={assign.status} onChange={(e) => setAssign((a) => ({ ...a, status: e.target.value }))}>
                    <option value="pending">pending</option>
                    <option value="activating">activating</option>
                    <option value="active">active</option>
                  </select>
                </label>
                <button type="submit" disabled={busy}>
                  {busy ? "Assigning…" : "Assign site"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
