import { useEffect, useMemo, useState } from "react";
import { api, type Milestone, type Study } from "../../lib/api";
import "./OpsModules.css";

type Bucket = "upcoming" | "completed" | "overdue" | "at_risk";

function bucketFor(m: Milestone): Bucket {
  if (m.status === "completed") return "completed";
  if (m.status === "at_risk") return "at_risk";
  if (m.status === "delayed") return "overdue";
  if (m.dueAt && m.status === "upcoming" && new Date(m.dueAt).getTime() < Date.now()) return "overdue";
  return "upcoming";
}

type Props = {
  studies: Study[];
};

export function MilestonesModule({ studies }: Props) {
  const [rows, setRows] = useState<Milestone[]>([]);
  const [studyFilter, setStudyFilter] = useState<string>("all");
  const [bucket, setBucket] = useState<Bucket | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(studyId?: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await api.milestones(studyId);
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load milestones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(studyFilter === "all" ? undefined : studyFilter);
  }, [studyFilter]);

  const counts = useMemo(() => {
    const c = { upcoming: 0, completed: 0, overdue: 0, at_risk: 0 };
    for (const m of rows) c[bucketFor(m)] += 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (bucket === "all") return rows;
    return rows.filter((m) => bucketFor(m) === bucket);
  }, [rows, bucket]);

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Study timeline</p>
          <h3 className="ops__title">Milestones</h3>
        </div>
        <div className="ops__kpis">
          <button type="button" className={bucket === "upcoming" ? "is-active" : ""} onClick={() => setBucket("upcoming")}>
            Upcoming {counts.upcoming}
          </button>
          <button type="button" className={bucket === "completed" ? "is-active" : ""} onClick={() => setBucket("completed")}>
            Completed {counts.completed}
          </button>
          <button type="button" className={bucket === "overdue" ? "is-active" : ""} onClick={() => setBucket("overdue")}>
            Overdue {counts.overdue}
          </button>
          <button type="button" className={bucket === "at_risk" ? "is-active" : ""} onClick={() => setBucket("at_risk")}>
            At risk {counts.at_risk}
          </button>
          <button type="button" className={bucket === "all" ? "is-active" : ""} onClick={() => setBucket("all")}>
            All {rows.length}
          </button>
        </div>
      </header>

      <div className="ops__kpis">
        <button type="button" className={studyFilter === "all" ? "is-active" : ""} onClick={() => setStudyFilter("all")}>
          All studies
        </button>
        {studies.map((s) => (
          <button
            key={s.id}
            type="button"
            className={studyFilter === s.id ? "is-active" : ""}
            onClick={() => setStudyFilter(s.id)}
          >
            {s.code}
          </button>
        ))}
      </div>

      {error && (
        <p className="ops__error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="ops__muted">Loading…</p>}

      <div className="ops__panel">
        <table className="ops__table">
          <thead>
            <tr>
              <th>Study</th>
              <th>Key</th>
              <th>Title</th>
              <th>Status</th>
              <th>Due</th>
              <th>Bucket</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>{loading ? "…" : "No milestones"}</td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>{m.studyCode ?? "—"}</td>
                <td>{m.key}</td>
                <td>{m.title}</td>
                <td>{m.status}</td>
                <td>{m.dueAt ? new Date(m.dueAt).toLocaleDateString() : "—"}</td>
                <td>{bucketFor(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
