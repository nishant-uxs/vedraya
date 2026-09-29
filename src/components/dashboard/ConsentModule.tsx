import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type ConsentRecord, type ConsentKpis, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
  initialFilter?: string | null;
  onChanged?: () => void;
};

export function ConsentModule({ studies, initialFilter = null, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<ConsentRecord[]>([]);
  const [kpis, setKpis] = useState<ConsentKpis | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter ?? "all");
  const [selected, setSelected] = useState<ConsentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<{ id: string; subjectCode: string; studyId: string }[]>([]);
  const [versions, setVersions] = useState<{ id: string; versionLabel: string; studyId: string; title: string }[]>([]);
  const [form, setForm] = useState({ studyId: "", participantId: "", versionId: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);
  }, [initialFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [list, k, parts, vers] = await Promise.all([
        api.consents(statusFilter === "all" ? undefined : { status: statusFilter }),
        api.consentKpis(),
        api.participants(),
        api.consentVersions(),
      ]);
      setRows(list);
      setKpis(k);
      setParticipants(parts.map((p) => ({ id: p.id, subjectCode: p.subjectCode, studyId: p.studyId })));
      setVersions(vers);
      if (!form.studyId && studies[0]) {
        setForm((f) => ({ ...f, studyId: studies[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredParticipants = useMemo(
    () => participants.filter((p) => p.studyId === form.studyId),
    [participants, form.studyId],
  );
  const filteredVersions = useMemo(
    () => versions.filter((v) => v.studyId === form.studyId),
    [versions, form.studyId],
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!can("consent:create")) return;
    setBusy(true);
    setError(null);
    try {
      await api.createConsent({
        studyId: form.studyId,
        participantId: form.participantId,
        versionId: form.versionId || undefined,
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function markObtained(id: string) {
    if (!can("consent:update")) return;
    setBusy(true);
    try {
      await api.updateConsentStatus(id, "obtained");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    if (!can("consent:withdraw")) return;
    setBusy(true);
    try {
      await api.withdrawConsent(id, "Participant withdrew (demo)");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Consent operations</p>
          <h3 className="ops__title">Consent records</h3>
        </div>
        <div className="ops__kpis">
          <button type="button" className={statusFilter === "pending" ? "is-active" : ""} onClick={() => setStatusFilter("pending")}>
            Pending {kpis?.pending ?? "—"}
          </button>
          <button type="button" className={statusFilter === "obtained" ? "is-active" : ""} onClick={() => setStatusFilter("obtained")}>
            Obtained {kpis?.obtained ?? "—"}
          </button>
          <button type="button" className={statusFilter === "withdrawn" ? "is-active" : ""} onClick={() => setStatusFilter("withdrawn")}>
            Withdrawn {kpis?.withdrawn ?? "—"}
          </button>
          <button type="button" className={statusFilter === "all" ? "is-active" : ""} onClick={() => setStatusFilter("all")}>
            All {kpis?.total ?? "—"}
          </button>
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
                <th>Study</th>
                <th>Subject</th>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>{loading ? "…" : "No consent records"}</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={selected?.id === r.id ? "is-selected" : ""}
                  onClick={() => setSelected(r)}
                >
                  <td>{r.studyCode ?? r.studyId.slice(0, 8)}</td>
                  <td>{r.subjectCode ?? "—"}</td>
                  <td>{r.version}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select a consent record</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.subjectCode}</strong> · {selected.studyCode} · {selected.version}
                {selected.versionTitle ? ` (${selected.versionTitle})` : ""}
              </p>
              <p className="mono">Status: {selected.status}</p>
              <p className="mono">Obtained: {selected.obtainedAt ? new Date(selected.obtainedAt).toLocaleString() : "—"}</p>
              <p className="mono">Withdrawn: {selected.withdrawnAt ? new Date(selected.withdrawnAt).toLocaleString() : "—"}</p>
              <div className="ops__actions">
                {selected.status === "pending" && can("consent:update") && (
                  <button type="button" disabled={busy} onClick={() => void markObtained(selected.id)}>
                    Mark obtained
                  </button>
                )}
                {(selected.status === "pending" || selected.status === "obtained") && can("consent:withdraw") && (
                  <button type="button" className="ops__danger" disabled={busy} onClick={() => void withdraw(selected.id)}>
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          )}

          {can("consent:create") && (
            <form className="ops__form" onSubmit={onCreate}>
              <h4>Create consent</h4>
              <label>
                Study
                <select
                  value={form.studyId}
                  onChange={(e) => setForm({ studyId: e.target.value, participantId: "", versionId: "" })}
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
                Participant
                <select
                  value={form.participantId}
                  onChange={(e) => setForm((f) => ({ ...f, participantId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {filteredParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.subjectCode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Consent version
                <select
                  value={form.versionId}
                  onChange={(e) => setForm((f) => ({ ...f, versionId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {filteredVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.versionLabel} — {v.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create pending consent"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
