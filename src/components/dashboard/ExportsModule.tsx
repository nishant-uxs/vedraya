import { useEffect, useState } from "react";
import { api, type ExportRecord, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
};

export function ExportsModule({ studies }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<ExportRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [studyId, setStudyId] = useState("");
  const [kind, setKind] = useState<"subjects_csv" | "studies_csv">("subjects_csv");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.exportHistory();
      setRows(list);
      if (!studyId && studies[0]) setStudyId(studies[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load export history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onExport() {
    if (!can("export:create") || !studyId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { csv, exportId } = await api.createExport(studyId, kind);
      const code = studies.find((s) => s.id === studyId)?.code ?? "study";
      downloadCsv(`${code}-${kind}.csv`, csv);
      setMessage(exportId ? `Export recorded (${exportId.slice(0, 8)}…)` : "Export downloaded");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Data export</p>
          <h3 className="ops__title">Study Data Export</h3>
          <p className="ops__note">Prototype CSV mapping — not full CDISC SDTM/ADaM.</p>
        </div>
      </header>

      {error && (
        <p className="ops__error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="ops__muted">{message}</p>}
      {loading && <p className="ops__muted">Loading…</p>}

      {can("export:create") && (
        <div className="ops__export-bar">
          <label>
            Study
            <select value={studyId} onChange={(e) => setStudyId(e.target.value)}>
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="subjects_csv">Subjects CSV</option>
              <option value="studies_csv">Study summary CSV</option>
            </select>
          </label>
          <button type="button" disabled={busy || !studyId} onClick={() => void onExport()}>
            {busy ? "Exporting…" : "Create export & download"}
          </button>
        </div>
      )}

      <div className="ops__panel">
        <h4>Export history</h4>
        <table className="ops__table">
          <thead>
            <tr>
              <th>When</th>
              <th>Study</th>
              <th>Kind</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>{loading ? "…" : "No exports yet"}</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.studyCode ?? r.studyId.slice(0, 8)}</td>
                <td>{r.kind}</td>
                <td>{r.actorName ?? r.actorEmail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
