import { useEffect, useState, type FormEvent } from "react";
import { api, type Participant, type Site, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

const TRANSITIONS: Record<string, string[]> = {
  screened: ["enrolled", "withdrawn"],
  enrolled: ["withdrawn", "completed"],
  withdrawn: [],
  completed: [],
};

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function ParticipantsModule({ studies, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<Participant[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState<Participant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    subjectCode: "",
    studyId: "",
    siteId: "",
    status: "screened" as "screened" | "enrolled",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [list, siteList] = await Promise.all([api.participants(), api.sites()]);
      setRows(list);
      setSites(siteList);
      if (!form.studyId && studies[0]) setForm((f) => ({ ...f, studyId: studies[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load participants");
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
    if (!can("participant:manage")) return;
    setBusy(true);
    try {
      await api.createParticipant({
        subjectCode: form.subjectCode,
        studyId: form.studyId,
        siteId: form.siteId || undefined,
        status: form.status,
      });
      setForm((f) => ({ ...f, subjectCode: "" }));
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function transition(status: string) {
    if (!selected || !can("participant:manage")) return;
    setBusy(true);
    try {
      const row = await api.updateParticipantStatus(selected.id, status);
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
          <p className="mono ops__eyebrow">Subject enrollment</p>
          <h3 className="ops__title">Participants</h3>
          <p className="ops__note">Synthetic subject codes only — no participant PII in this demo.</p>
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
                <th>Subject</th>
                <th>Study</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3}>{loading ? "…" : "No participants"}</td>
                </tr>
              )}
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className={selected?.id === p.id ? "is-selected" : ""}
                  onClick={() => setSelected(p)}
                >
                  <td>{p.subjectCode}</td>
                  <td>{studyCode(p.studyId)}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select a participant</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.subjectCode}</strong> · {studyCode(selected.studyId)}
              </p>
              <p className="mono">Status: {selected.status}</p>
              <p className="mono">Site: {selected.siteId ? selected.siteId.slice(0, 8) : "—"}</p>
              {can("participant:manage") && (
                <div className="ops__actions">
                  {(TRANSITIONS[selected.status] ?? []).map((st) => (
                    <button key={st} type="button" disabled={busy} onClick={() => void transition(st)}>
                      → {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {can("participant:manage") && (
            <form className="ops__form" onSubmit={onCreate}>
              <h4>Enroll / screen subject</h4>
              <label>
                Subject code
                <input
                  value={form.subjectCode}
                  onChange={(e) => setForm((f) => ({ ...f, subjectCode: e.target.value }))}
                  required
                  minLength={3}
                  placeholder="SYN-001"
                />
              </label>
              <label>
                Study
                <select value={form.studyId} onChange={(e) => setForm((f) => ({ ...f, studyId: e.target.value }))} required>
                  <option value="">Select…</option>
                  {studies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Site (optional)
                <select value={form.siteId} onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}>
                  <option value="">—</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Initial status
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "screened" | "enrolled" }))}>
                  <option value="screened">screened</option>
                  <option value="enrolled">enrolled</option>
                </select>
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create participant"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
