import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type DataQueryRow, type ProtocolDeviation, type Study } from "../../lib/api";
import "./OpsModules.css";

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function QualityModule({ studies, onChanged }: Props) {
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([]);
  const [queries, setQueries] = useState<DataQueryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [devText, setDevText] = useState("");
  const [queryText, setQueryText] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, q] = await Promise.all([api.listDeviations(), api.listDataQueries()]);
      setDeviations(d);
      setQueries(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quality data");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!studyId && studies[0]) setStudyId(studies[0].id);
  }, [studies, studyId]);

  async function createDeviation(e: FormEvent) {
    e.preventDefault();
    if (!studyId || !devText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createDeviation({ studyId, description: devText.trim(), severity: "minor" });
      setDevText("");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create deviation failed");
    } finally {
      setBusy(false);
    }
  }

  async function createQuery(e: FormEvent) {
    e.preventDefault();
    if (!studyId || !queryText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createDataQuery({ studyId, question: queryText.trim() });
      setQueryText("");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create query failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops">
      <p className="ops__note">
        Protocol deviations &amp; data queries — <strong>PARTIAL</strong> operational tracking for SIH26046
        (not full CAPA / EDC query management).
      </p>
      {error && <p className="ops__error">{error}</p>}

      <div className="ops__kpi-row">
        <span className="ops__kpi-static">Open deviations {deviations.filter((d) => d.status !== "closed").length}</span>
        <span className="ops__kpi-static">
          Open queries {queries.filter((q) => q.status === "open" || q.status === "under_review").length}
        </span>
      </div>

      <form className="ops__form" onSubmit={createDeviation}>
        <h4 className="ops__subhead">Log protocol deviation</h4>
        <select value={studyId} onChange={(e) => setStudyId(e.target.value)} required>
          {studies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code}
            </option>
          ))}
        </select>
        <textarea
          value={devText}
          onChange={(e) => setDevText(e.target.value)}
          placeholder="Deviation description"
          rows={2}
          required
        />
        <button type="submit" disabled={busy}>
          Create deviation
        </button>
      </form>

      <form className="ops__form" onSubmit={createQuery}>
        <h4 className="ops__subhead">Raise data query</h4>
        <textarea
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Query question"
          rows={2}
          required
        />
        <button type="submit" disabled={busy}>
          Create query
        </button>
      </form>

      <div className="ops__table-wrap">
        <table className="ops__table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {deviations.map((d) => (
              <tr key={d.id}>
                <td className="mono">{d.code}</td>
                <td>Deviation · {d.severity}</td>
                <td>{d.status}</td>
                <td>{d.description}</td>
              </tr>
            ))}
            {queries.map((q) => (
              <tr key={q.id}>
                <td className="mono">{q.code}</td>
                <td>Data query</td>
                <td>{q.status}</td>
                <td>{q.question}</td>
              </tr>
            ))}
            {deviations.length === 0 && queries.length === 0 && (
              <tr>
                <td colSpan={4} className="ops__muted">
                  No quality records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
