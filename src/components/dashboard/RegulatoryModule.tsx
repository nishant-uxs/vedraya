import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  type EthicsCommittee,
  type RegulatoryKpis,
  type RegulatorySubmission,
  type Study,
} from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
  initialFilter?: string | null;
  onChanged?: () => void;
};

export function RegulatoryModule({ studies, initialFilter = null, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<RegulatorySubmission[]>([]);
  const [committees, setCommittees] = useState<EthicsCommittee[]>([]);
  const [kpis, setKpis] = useState<RegulatoryKpis | null>(null);
  const [filter, setFilter] = useState<string>(initialFilter ?? "all");
  const [selected, setSelected] = useState<RegulatorySubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    studyId: "",
    kind: "IEC",
    ethicsCommitteeId: "",
    referenceNumber: "",
    dueAt: "",
  });

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const query =
        filter === "pending"
          ? { status: "under_review" }
          : filter === "ctri"
            ? { kind: "CTRI" }
            : filter === "overdue"
              ? undefined
              : filter !== "all"
                ? { status: filter }
                : undefined;
      const [list, k, ecs] = await Promise.all([
        api.regulatorySubmissions(query),
        api.regulatoryKpis(),
        api.ethicsCommittees(),
      ]);
      let next = list;
      if (filter === "overdue") {
        const now = Date.now();
        next = list.filter(
          (r) =>
            r.dueAt &&
            new Date(r.dueAt).getTime() < now &&
            !["approved", "registered", "rejected", "expired"].includes(r.status),
        );
      }
      if (filter === "pending") {
        next = list.filter((r) => r.status === "submitted" || r.status === "under_review");
        // refetch without status if we only got under_review
        if (query?.status === "under_review") {
          const all = await api.regulatorySubmissions();
          next = all.filter((r) => r.status === "submitted" || r.status === "under_review");
        }
      }
      setRows(next);
      setKpis(k);
      setCommittees(ecs);
      if (!form.studyId && studies[0]) setForm((f) => ({ ...f, studyId: studies[0].id }));
      if (!form.ethicsCommitteeId && ecs[0]) setForm((f) => ({ ...f, ethicsCommitteeId: ecs[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regulatory data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!can("regulatory:manage")) return;
    setBusy(true);
    setError(null);
    try {
      await api.createRegulatorySubmission({
        studyId: form.studyId,
        kind: form.kind,
        ethicsCommitteeId: form.kind === "IEC" ? form.ethicsCommitteeId || undefined : undefined,
        referenceNumber: form.referenceNumber || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        status: "draft",
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function transition(id: string, status: string) {
    if (!can("regulatory:manage")) return;
    setBusy(true);
    try {
      await api.updateRegulatoryStatus(id, status);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  const nextActions: Record<string, string[]> = {
    draft: ["submitted"],
    submitted: ["under_review", "rejected"],
    under_review: ["approved", "rejected", "registered"],
    approved: ["expired"],
    registered: ["expired"],
  };

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Regulatory · Ethics · CTRI tracking</p>
          <h3 className="ops__title">Regulatory submissions</h3>
          <p className="ops__note">CTRI TRACKING only — no external CTRI API integration.</p>
        </div>
        <div className="ops__kpis">
          <button type="button" className={filter === "pending" ? "is-active" : ""} onClick={() => setFilter("pending")}>
            Pending {kpis?.pendingEthicsReviews ?? "—"}
          </button>
          <button type="button" className={filter === "overdue" ? "is-active" : ""} onClick={() => setFilter("overdue")}>
            Overdue {kpis?.overdueSubmissions ?? "—"}
          </button>
          <button type="button" className={filter === "ctri" ? "is-active" : ""} onClick={() => setFilter("ctri")}>
            CTRI {kpis?.ctriPending ?? "—"}/{kpis?.ctriRegistered ?? "—"}
          </button>
          <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>
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
                <th>Kind</th>
                <th>Ref</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? "…" : "No submissions"}</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={selected?.id === r.id ? "is-selected" : ""}
                  onClick={() => setSelected(r)}
                >
                  <td>{r.studyCode ?? "—"}</td>
                  <td>{r.kind}</td>
                  <td>{r.referenceNumber ?? "—"}</td>
                  <td>{r.status}</td>
                  <td>{r.dueAt ? new Date(r.dueAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select a submission</p>}
          {selected && (
            <div className="ops__detail">
              <p>
                <strong>{selected.kind}</strong> · {selected.studyCode} · {selected.referenceNumber ?? "no ref"}
              </p>
              <p className="mono">Status: {selected.status}</p>
              <p className="mono">Committee: {selected.committeeName ?? "—"}</p>
              <p className="mono">Decision: {selected.decision ?? "—"}</p>
              {can("regulatory:manage") && (
                <div className="ops__actions">
                  {(nextActions[selected.status] ?? []).map((s) => (
                    <button key={s} type="button" disabled={busy} onClick={() => void transition(selected.id, s)}>
                      → {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {can("regulatory:manage") && (
            <form className="ops__form" onSubmit={onCreate}>
              <h4>Create submission</h4>
              <label>
                Study
                <select
                  value={form.studyId}
                  onChange={(e) => setForm((f) => ({ ...f, studyId: e.target.value }))}
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
                Kind
                <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
                  <option value="IEC">IEC (ethics)</option>
                  <option value="CTRI">CTRI tracking</option>
                  <option value="DCGI">DCGI</option>
                </select>
              </label>
              {form.kind === "IEC" && (
                <label>
                  Ethics committee
                  <select
                    value={form.ethicsCommitteeId}
                    onChange={(e) => setForm((f) => ({ ...f, ethicsCommitteeId: e.target.value }))}
                  >
                    {committees.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Reference
                <input
                  value={form.referenceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={form.dueAt}
                  onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create draft"}
              </button>
            </form>
          )}

          <div className="ops__committees">
            <h4>Ethics committees</h4>
            <ul>
              {committees.map((c) => (
                <li key={c.id} className="mono">
                  {c.code} — {c.name}
                  {c.city ? ` · ${c.city}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
