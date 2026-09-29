import { useEffect, useState } from "react";
import { api, type InteropAdapter, type Participant, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
};

function badgeClass(status: InteropAdapter["status"]) {
  if (status === "WORKING") return "ops__badge ops__badge--ok";
  if (status === "PROTOTYPE") return "ops__badge ops__badge--prototype";
  if (status === "NOT_CONNECTED") return "ops__badge ops__badge--planned";
  return "ops__badge ops__badge--planned";
}

export function InteropModule({ studies }: Props) {
  const { can } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [adapters, setAdapters] = useState<InteropAdapter[]>([]);
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [studyJson, setStudyJson] = useState<string | null>(null);
  const [subjectJson, setSubjectJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"study" | "subject" | "adapters" | null>(null);

  useEffect(() => {
    void api.participants().then((list) => {
      setParticipants(list);
      if (list[0]) setSubjectId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (studies[0] && !studyId) setStudyId(studies[0].id);
  }, [studies, studyId]);

  useEffect(() => {
    if (!can("fhir:view")) return;
    setLoading("adapters");
    void api
      .interopAdapters()
      .then(setAdapters)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load adapters"))
      .finally(() => setLoading(null));
  }, [can]);

  async function loadStudy() {
    if (!can("fhir:view") || !studyId) return;
    setLoading("study");
    setError(null);
    try {
      const data = await api.fhirResearchStudyR4(studyId);
      setStudyJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setStudyJson(null);
      setError(err instanceof Error ? err.message : "ResearchStudy load failed");
    } finally {
      setLoading(null);
    }
  }

  async function loadSubject() {
    if (!can("fhir:view") || !subjectId) return;
    setLoading("subject");
    setError(null);
    try {
      const data = await api.fhirResearchSubjectR4(subjectId);
      setSubjectJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setSubjectJson(null);
      setError(err instanceof Error ? err.message : "ResearchSubject load failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="ops">
      <header className="ops__head">
        <div>
          <p className="mono ops__eyebrow">Interoperability</p>
          <h3 className="ops__title">FHIR R4 ResearchStudy / ResearchSubject prototype</h3>
          <p className="ops__note">
            Prototype read paths only. ABDM / HIS / EDC adapters remain <strong>NOT CONNECTED</strong>.
          </p>
        </div>
      </header>

      {error && (
        <p className="ops__error" role="alert">
          {error}
        </p>
      )}

      <div className="ops__interop-grid">
        <div className="ops__panel">
          <h4>Adapter status</h4>
          {loading === "adapters" && <p className="ops__muted">Loading adapters…</p>}
          {!loading && adapters.length === 0 && can("fhir:view") && (
            <p className="ops__muted">No adapter metadata</p>
          )}
          <ul className="ops__planned">
            {adapters.map((a) => (
              <li key={a.id}>
                {a.name}{" "}
                <span className={badgeClass(a.status)}>{a.status}</span>
                <p className="ops__muted">{a.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="ops__panel">
          <h4>
            ResearchStudy (R4) <span className="ops__badge ops__badge--prototype">PROTOTYPE</span>
          </h4>
          <label>
            Study id
            <select value={studyId} onChange={(e) => setStudyId(e.target.value)}>
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {can("fhir:view") ? (
            <button type="button" disabled={loading === "study"} onClick={() => void loadStudy()}>
              {loading === "study" ? "Loading…" : "Load ResearchStudy (R4)"}
            </button>
          ) : (
            <p className="ops__muted">Requires fhir:view permission</p>
          )}
          {studyJson && <pre className="ops__json">{studyJson}</pre>}
        </div>

        <div className="ops__panel">
          <h4>
            ResearchSubject (R4) <span className="ops__badge ops__badge--prototype">PROTOTYPE</span>
          </h4>
          <label>
            Participant id
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.subjectCode} — {p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {can("fhir:view") ? (
            <button type="button" disabled={loading === "subject"} onClick={() => void loadSubject()}>
              {loading === "subject" ? "Loading…" : "Load ResearchSubject (R4)"}
            </button>
          ) : (
            <p className="ops__muted">Requires fhir:view permission</p>
          )}
          {subjectJson && <pre className="ops__json">{subjectJson}</pre>}
        </div>
      </div>
    </div>
  );
}
