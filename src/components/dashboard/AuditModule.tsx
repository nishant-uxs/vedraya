import { useEffect, useState } from "react";
import { api, type AuditEvent, type AuditVerifyResult } from "../../lib/api";
import "./OpsModules.css";

function formatJson(v: unknown) {
  if (v == null) return "—";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function AuditModule() {
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [verify, setVerify] = useState<AuditVerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    limit: "50",
    action: "",
    entityType: "",
    actorUserId: "",
    from: "",
    to: "",
  });

  async function loadVerify() {
    setVerifyError(null);
    try {
      const result = await api.auditVerify();
      setVerify(result);
    } catch (err) {
      setVerify(null);
      setVerifyError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.auditEvents({
        limit: Number(filters.limit) || 50,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        actorUserId: filters.actorUserId || undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(filters.to).toISOString() : undefined,
      });
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVerify();
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    void loadEvents();
  }

  const integrityLabel =
    verifyError != null
      ? "VERIFICATION ERROR"
      : verify?.valid
        ? "AUDIT CHAIN: VERIFIED"
        : verify != null
          ? "AUDIT CHAIN: INTEGRITY FAILURE"
          : "VERIFYING…";

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Append-only audit trail</p>
          <h3 className="ops__title">Audit trail</h3>
          <p className="ops__note">
            Application-level append-only log with GLOBAL SHA-256 hash-chain integrity verification
            (tamper detection). Not WORM storage or legal ALCOA+ attestation.
          </p>
        </div>
        <button type="button" className="ops__verify-btn" onClick={() => void loadVerify()}>
          Re-verify SHA-256 chain
        </button>
      </header>

      <div
        className={
          verify?.valid && !verifyError
            ? "ops__integrity-ok"
            : verifyError || (verify && !verify.valid)
              ? "ops__integrity-fail"
              : "ops__integrity-pending"
        }
        role="status"
      >
        <strong>{integrityLabel}</strong>
        {verify && (
          <span className="mono">
            {" "}
            · {verify.checkedEvents} events · {verify.chainScope}
            {verify.reason ? ` · ${verify.reason}` : ""}
          </span>
        )}
        {verifyError && <span className="mono"> · {verifyError}</span>}
      </div>

      <div className="ops__filters">
        <label>
          Limit
          <input value={filters.limit} onChange={(e) => setFilters((f) => ({ ...f, limit: e.target.value }))} />
        </label>
        <label>
          Action
          <input value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} placeholder="STUDY_CREATE" />
        </label>
        <label>
          Entity type
          <input
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            placeholder="study"
          />
        </label>
        <label>
          Actor user id
          <input
            value={filters.actorUserId}
            onChange={(e) => setFilters((f) => ({ ...f, actorUserId: e.target.value }))}
          />
        </label>
        <label>
          From
          <input type="datetime-local" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </label>
        <label>
          To
          <input type="datetime-local" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </label>
        <button type="button" onClick={applyFilters}>
          Apply filters
        </button>
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
                <th>Seq</th>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? "…" : "No events"}</td>
                </tr>
              )}
              {rows.map((e) => (
                <tr
                  key={e.id}
                  className={selected?.id === e.id ? "is-selected" : ""}
                  onClick={() => setSelected(e)}
                >
                  <td>{e.sequence ?? "—"}</td>
                  <td>{new Date(e.occurredAt).toLocaleString()}</td>
                  <td>{e.actorName ?? e.actorEmail ?? "system"}</td>
                  <td>{e.action}</td>
                  <td>
                    {e.entityType}
                    {e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Event detail</h4>
          {!selected && <p className="ops__muted">Select an event</p>}
          {selected && (
            <div className="ops__detail">
              <p className="mono">
                #{selected.sequence ?? "—"} · {selected.action} · {selected.entityType}
              </p>
              <p className="mono">Reason: {selected.reason ?? "—"}</p>
              {selected.eventHash && (
                <p className="mono ops__hash">Hash: {selected.eventHash.slice(0, 24)}…</p>
              )}
              <h5>Previous state</h5>
              <pre className="ops__json">{formatJson(selected.previousState)}</pre>
              <h5>New state</h5>
              <pre className="ops__json">{formatJson(selected.newState)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
