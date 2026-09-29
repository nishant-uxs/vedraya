import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  type AdverseEvent,
  type AeKpis,
  type CodingResultRow,
  type CodingTerm,
  type ConcomitantMedication,
  type Participant,
  type Study,
} from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

const AE_TRANSITIONS: Record<string, string[]> = {
  reported: ["investigator_review", "safety_review", "closed"],
  investigator_review: ["safety_review", "escalated", "closed"],
  safety_review: ["escalated", "closed"],
  escalated: ["closed", "safety_review"],
  closed: [],
};

type Props = {
  studies: Study[];
  onChanged?: () => void;
};

export function SafetyModule({ studies, onChanged }: Props) {
  const { can } = useAuth();
  const [rows, setRows] = useState<AdverseEvent[]>([]);
  const [kpis, setKpis] = useState<AeKpis | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<AdverseEvent | null>(null);
  const [codingResults, setCodingResults] = useState<CodingResultRow[]>([]);
  const [medications, setMedications] = useState<ConcomitantMedication[]>([]);
  const [termQuery, setTermQuery] = useState("");
  const [termHits, setTermHits] = useState<CodingTerm[]>([]);
  const [whodrugQuery, setWhodrugQuery] = useState("");
  const [whodrugHits, setWhodrugHits] = useState<CodingTerm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    studyId: "",
    participantId: "",
    description: "",
    isSerious: false,
    severity: "mild" as "mild" | "moderate" | "severe",
  });
  const [classify, setClassify] = useState<{
    causality: string;
    outcome: string;
    actionTaken: string;
  }>({
    causality: "not_assessed",
    outcome: "unknown",
    actionTaken: "none",
  });
  const [medForm, setMedForm] = useState({ freeText: "", dose: "", route: "" });
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [list, k, parts] = await Promise.all([
        api.adverseEvents(),
        api.aeKpis(),
        api.participants(),
      ]);
      setRows(list);
      setKpis(k);
      setParticipants(parts);
      if (!form.studyId && studies[0]) setForm((f) => ({ ...f, studyId: studies[0].id }));
      if (selected) {
        const fresh = list.find((r) => r.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load safety data");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(ae: AdverseEvent) {
    setDetailLoading(true);
    setError(null);
    try {
      const [results, meds] = await Promise.all([
        api.codingResults({ entityType: "adverse_event", entityId: ae.id }),
        api.listMedications(ae.id),
      ]);
      setCodingResults(results);
      setMedications(meds);
      setClassify({
        causality: ae.causality ?? "not_assessed",
        outcome: ae.outcome ?? "unknown",
        actionTaken: ae.actionTaken ?? "none",
      });
      setSelectedMedId(meds[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AE detail");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) void loadDetail(selected);
    else {
      setCodingResults([]);
      setMedications([]);
      setTermHits([]);
      setWhodrugHits([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!can("coding:view") || termQuery.trim().length < 2) {
      setTermHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .searchCodingTerms({ dictionary: "MEDDRA_DEMO", q: termQuery.trim(), limit: 15 })
        .then(setTermHits)
        .catch(() => setTermHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [termQuery, can]);

  useEffect(() => {
    if (!can("coding:view") || whodrugQuery.trim().length < 2) {
      setWhodrugHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .searchCodingTerms({ dictionary: "WHODRUG_DEMO", q: whodrugQuery.trim(), limit: 15 })
        .then(setWhodrugHits)
        .catch(() => setWhodrugHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [whodrugQuery, can]);

  const studyParts = participants.filter((p) => p.studyId === form.studyId);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!can("ae:create")) return;
    setBusy(true);
    try {
      await api.createAdverseEvent({
        studyId: form.studyId,
        participantId: form.participantId || undefined,
        description: form.description,
        isSerious: form.isSerious,
        severity: form.severity,
      });
      setForm((f) => ({ ...f, description: "", participantId: "" }));
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClassify(e: FormEvent) {
    e.preventDefault();
    if (!selected || !can("ae:update")) return;
    setBusy(true);
    try {
      const row = await api.classifyAe(selected.id, {
        causality: classify.causality as
          | "related"
          | "possibly_related"
          | "unlikely"
          | "not_related"
          | "not_assessed",
        outcome: classify.outcome as
          | "recovering"
          | "recovered"
          | "not_recovered"
          | "fatal"
          | "unknown",
        actionTaken: classify.actionTaken as
          | "none"
          | "dose_reduced"
          | "drug_interrupted"
          | "drug_withdrawn"
          | "other",
      });
      setSelected(row);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyAeCoding(term: CodingTerm) {
    if (!selected || !can("coding:apply")) return;
    setBusy(true);
    try {
      await api.applyCoding({
        entityType: "adverse_event",
        entityId: selected.id,
        termId: term.id,
        freeText: selected.description,
      });
      await loadDetail(selected);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coding failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAddMedication(e: FormEvent) {
    e.preventDefault();
    if (!selected || !can("coding:apply")) return;
    setBusy(true);
    try {
      const med = await api.createMedication({
        adverseEventId: selected.id,
        freeText: medForm.freeText,
        dose: medForm.dose || undefined,
        route: medForm.route || undefined,
      });
      setMedForm({ freeText: "", dose: "", route: "" });
      setSelectedMedId(med.id);
      await loadDetail(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Medication create failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyMedCoding(term: CodingTerm) {
    if (!selectedMedId || !can("coding:apply") || !selected) return;
    const med = medications.find((m) => m.id === selectedMedId);
    if (!med) return;
    setBusy(true);
    try {
      await api.applyCoding({
        entityType: "concomitant_medication",
        entityId: med.id,
        termId: term.id,
        freeText: med.freeText,
      });
      await loadDetail(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Medication coding failed");
    } finally {
      setBusy(false);
    }
  }

  async function transition(status: string) {
    if (!selected) return;
    if (status === "escalated" && !can("ae:escalate")) return;
    if (status !== "escalated" && !can("ae:update")) return;
    setBusy(true);
    try {
      const row = await api.updateAeStatus(selected.id, status);
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
          <p className="mono ops__eyebrow">Pharmacovigilance</p>
          <h3 className="ops__title">Adverse events</h3>
        </div>
        <div className="ops__kpis">
          <span className="ops__kpi-static">Open {kpis?.open ?? "—"}</span>
          <span className="ops__kpi-static">Serious {kpis?.serious ?? "—"}</span>
          <span className="ops__kpi-static">Escalated {kpis?.escalated ?? "—"}</span>
          <span className="ops__kpi-static">Pending review {kpis?.pendingReview ?? "—"}</span>
          <span className="ops__kpi-static">Pending coding {kpis?.pendingCoding ?? "—"}</span>
          <span className="ops__kpi-static">Coded {kpis?.coded ?? "—"}</span>
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
                <th>Case</th>
                <th>Study</th>
                <th>SAE</th>
                <th>Severity</th>
                <th>Coding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>{loading ? "…" : "No adverse events"}</td>
                </tr>
              )}
              {rows.map((ae) => (
                <tr
                  key={ae.id}
                  className={selected?.id === ae.id ? "is-selected" : ""}
                  onClick={() => setSelected(ae)}
                >
                  <td>{ae.caseCode}</td>
                  <td>{studyCode(ae.studyId)}</td>
                  <td>{ae.isSerious ? "Yes" : "No"}</td>
                  <td>{ae.severity}</td>
                  <td>{ae.codingStatus ?? "—"}</td>
                  <td>{ae.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops__panel">
          <h4>Detail</h4>
          {!selected && <p className="ops__muted">Select an adverse event</p>}
          {selected && detailLoading && <p className="ops__muted">Loading detail…</p>}
          {selected && !detailLoading && (
            <div className="ops__detail">
              <p>
                <strong>{selected.caseCode}</strong> · {studyCode(selected.studyId)}
              </p>
              <p className="mono">{selected.description}</p>
              <p className="mono">
                SAE: {selected.isSerious ? "yes" : "no"} · {selected.severity} · {selected.status}
                {selected.codingStatus ? ` · coding: ${selected.codingStatus}` : ""}
              </p>
              <div className="ops__actions">
                {(AE_TRANSITIONS[selected.status] ?? []).map((st) => {
                  const allowed =
                    st === "escalated" ? can("ae:escalate") : can("ae:update");
                  if (!allowed) return null;
                  return (
                    <button key={st} type="button" disabled={busy} onClick={() => void transition(st)}>
                      → {st}
                    </button>
                  );
                })}
              </div>

              {can("ae:update") && (
                <form className="ops__form" onSubmit={onClassify}>
                  <h4>Classify</h4>
                  <label>
                    Causality
                    <select
                      value={classify.causality}
                      onChange={(e) => setClassify((c) => ({ ...c, causality: e.target.value }))}
                    >
                      <option value="not_assessed">not_assessed</option>
                      <option value="related">related</option>
                      <option value="possibly_related">possibly_related</option>
                      <option value="unlikely">unlikely</option>
                      <option value="not_related">not_related</option>
                    </select>
                  </label>
                  <label>
                    Outcome
                    <select
                      value={classify.outcome}
                      onChange={(e) => setClassify((c) => ({ ...c, outcome: e.target.value }))}
                    >
                      <option value="unknown">unknown</option>
                      <option value="recovering">recovering</option>
                      <option value="recovered">recovered</option>
                      <option value="not_recovered">not_recovered</option>
                      <option value="fatal">fatal</option>
                    </select>
                  </label>
                  <label>
                    Action taken
                    <select
                      value={classify.actionTaken}
                      onChange={(e) => setClassify((c) => ({ ...c, actionTaken: e.target.value }))}
                    >
                      <option value="none">none</option>
                      <option value="dose_reduced">dose_reduced</option>
                      <option value="drug_interrupted">drug_interrupted</option>
                      <option value="drug_withdrawn">drug_withdrawn</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <button type="submit" disabled={busy}>
                    {busy ? "Saving…" : "Save classification"}
                  </button>
                </form>
              )}

              {can("coding:view") && (
                <div className="ops__form">
                  <h4>MedDRA-compatible coding prototype</h4>
                  <p className="ops__muted">Search MEDDRA_DEMO terms and apply to this AE.</p>
                  <label>
                    Search terms
                    <input
                      value={termQuery}
                      onChange={(e) => setTermQuery(e.target.value)}
                      placeholder="e.g. headache"
                    />
                  </label>
                  {termQuery.trim().length >= 2 && termHits.length === 0 && (
                    <p className="ops__muted">No matching demo terms</p>
                  )}
                  <ul className="ops__planned">
                    {termHits.map((t) => (
                      <li key={t.id}>
                        {t.preferredTerm} ({t.code})
                        {can("coding:apply") && (
                          <button type="button" disabled={busy} onClick={() => void applyAeCoding(t)}>
                            Apply
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {codingResults.length > 0 && (
                    <p className="mono">
                      Applied: {codingResults[0].preferredTerm} ({codingResults[0].code})
                    </p>
                  )}
                </div>
              )}

              {can("coding:apply") && (
                <form className="ops__form" onSubmit={onAddMedication}>
                  <h4>Concomitant medication (WHODrug-compatible coding prototype)</h4>
                  <label>
                    Free text
                    <input
                      value={medForm.freeText}
                      onChange={(e) => setMedForm((m) => ({ ...m, freeText: e.target.value }))}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Dose
                    <input value={medForm.dose} onChange={(e) => setMedForm((m) => ({ ...m, dose: e.target.value }))} />
                  </label>
                  <label>
                    Route
                    <input
                      value={medForm.route}
                      onChange={(e) => setMedForm((m) => ({ ...m, route: e.target.value }))}
                    />
                  </label>
                  <button type="submit" disabled={busy}>
                    Add medication
                  </button>
                </form>
              )}

              {medications.length > 0 && can("coding:view") && (
                <div className="ops__form">
                  <label>
                    Medication to code
                    <select
                      value={selectedMedId ?? ""}
                      onChange={(e) => setSelectedMedId(e.target.value || null)}
                    >
                      {medications.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.freeText} ({m.codingStatus})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Search WHODRUG_DEMO
                    <input
                      value={whodrugQuery}
                      onChange={(e) => setWhodrugQuery(e.target.value)}
                      placeholder="e.g. paracetamol"
                    />
                  </label>
                  <ul className="ops__planned">
                    {whodrugHits.map((t) => (
                      <li key={t.id}>
                        {t.preferredTerm} ({t.code})
                        {can("coding:apply") && (
                          <button type="button" disabled={busy} onClick={() => void applyMedCoding(t)}>
                            Apply
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {can("ae:create") && (
            <form className="ops__form" onSubmit={onCreate}>
              <h4>Report adverse event</h4>
              <label>
                Study
                <select
                  value={form.studyId}
                  onChange={(e) => setForm((f) => ({ ...f, studyId: e.target.value, participantId: "" }))}
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
                Subject (optional)
                <select value={form.participantId} onChange={(e) => setForm((f) => ({ ...f, participantId: e.target.value }))}>
                  <option value="">—</option>
                  {studyParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.subjectCode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                  minLength={5}
                />
              </label>
              <label>
                Severity
                <select
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as typeof form.severity }))}
                >
                  <option value="mild">mild</option>
                  <option value="moderate">moderate</option>
                  <option value="severe">severe</option>
                </select>
              </label>
              <label className="ops__checkbox">
                <input
                  type="checkbox"
                  checked={form.isSerious}
                  onChange={(e) => setForm((f) => ({ ...f, isSerious: e.target.checked }))}
                />
                Serious (SAE)
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create AE report"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
