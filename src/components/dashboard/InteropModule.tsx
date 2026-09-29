import { useEffect, useState } from "react";
import { api, type Participant, type Study } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import "./OpsModules.css";

type Props = {
  studies: Study[];
};

const PLANNED = ["ABDM Health ID linkage", "National FHIR gateway", "Full FHIR R4 conformance suite"];

export function InteropModule({ studies }: Props) {
  const { can } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [studyJson, setStudyJson] = useState<string | null>(null);
  const [subjectJson, setSubjectJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"study" | "subject" | null>(null);

  useEffect(() => {
    void api.participants().then((list) => {
      setParticipants(list);
      if (list[0]) setSubjectId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (studies[0] && !studyId) setStudyId(studies[0].id);
  }, [studies, studyId]);

  async function loadStudy() {
    if (!can("fhir:view") || !studyId) return;
    setLoading("study");
    setError(null);
    try {
      const data = await api.fhirResearchStudy(studyId);
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
      const data = await api.fhirResearchSubject(subjectId);
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
          <p className="mono ops__eyebrow">Interoperability prototype</p>
          <h3 className="ops__title">FHIR read MVP</h3>
          <p className="ops__note">ResearchStudy / ResearchSubject — PROTOTYPE tag, not full R4 certification.</p>
        </div>
      </header>

      {error && (
        <p className="ops__error" role="alert">
          {error}
        </p>
      )}

      <div className="ops__interop-grid">
        <div className="ops__panel">
          <h4>
            ResearchStudy <span className="ops__badge ops__badge--ok">SUPPORTED</span>
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
              {loading === "study" ? "Loading…" : "Load ResearchStudy"}
            </button>
          ) : (
            <p className="ops__muted">Requires fhir:view permission</p>
          )}
          {studyJson && <pre className="ops__json">{studyJson}</pre>}
        </div>

        <div className="ops__panel">
          <h4>
            ResearchSubject <span className="ops__badge ops__badge--ok">SUPPORTED</span>
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
              {loading === "subject" ? "Loading…" : "Load ResearchSubject"}
            </button>
          ) : (
            <p className="ops__muted">Requires fhir:view permission</p>
          )}
          {subjectJson && <pre className="ops__json">{subjectJson}</pre>}
        </div>

        <div className="ops__panel">
          <h4>Planned integrations</h4>
          <ul className="ops__planned">
            {PLANNED.map((item) => (
              <li key={item}>
                {item} <span className="ops__badge ops__badge--planned">PLANNED</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
