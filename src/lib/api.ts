const API_BASE = "/api/v1";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv")) {
    if (!res.ok) throw new ApiError(res.status, "EXPORT_FAILED", "Export failed");
    return (await res.text()) as T;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? "ERROR",
      json?.error?.message ?? res.statusText,
      json?.error?.details,
    );
  }
  return json.data as T;
}

function qs(params?: Record<string, string | undefined>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function fhirGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? "ERROR",
      json?.error?.message ?? res.statusText,
      json?.error?.details,
    );
  }
  return json as T;
}

async function createExportCsv(
  studyId: string,
  kind: "subjects_csv" | "studies_csv",
): Promise<{ csv: string; exportId: string | null }> {
  const res = await fetch(`${API_BASE}/exports`, {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studyId, kind }),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      json?.error?.code ?? "EXPORT_FAILED",
      json?.error?.message ?? "Export failed",
      json?.error?.details,
    );
  }
  if (!contentType.includes("text/csv")) {
    throw new ApiError(res.status, "EXPORT_FAILED", "Unexpected export response");
  }
  const csv = await res.text();
  const exportId = res.headers.get("X-Vedraya-Export-Id");
  return { csv, exportId };
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  login: (email: string, password: string) =>
    request<AuthUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<AuthUser>("/auth/me"),
  studies: () => request<Study[]>("/studies"),
  kpis: () => request<Kpis>("/studies/kpis"),
  alerts: () => request<AlertItem[]>("/alerts"),
  auditEvents: (params?: {
    limit?: number;
    action?: string;
    entityType?: string;
    actorUserId?: string;
    from?: string;
    to?: string;
  }) =>
    request<AuditEvent[]>(
      `/audit-events${qs({
        limit: params?.limit != null ? String(params.limit) : undefined,
        action: params?.action,
        entityType: params?.entityType,
        actorUserId: params?.actorUserId,
        from: params?.from,
        to: params?.to,
      })}`,
    ),
  auditVerify: () => request<AuditVerifyResult>("/audit-events/verify"),
  adverseEvents: () => request<AdverseEvent[]>("/adverse-events"),
  aeKpis: () => request<AeKpis>("/adverse-events/kpis"),
  createAdverseEvent: (body: {
    studyId: string;
    participantId?: string;
    siteId?: string;
    description: string;
    isSerious?: boolean;
    severity?: "mild" | "moderate" | "severe";
    onsetAt?: string;
  }) =>
    request<AdverseEvent>("/adverse-events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAeStatus: (id: string, status: string, reason?: string) =>
    request<AdverseEvent>(`/adverse-events/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),
  participants: () => request<Participant[]>("/participants"),
  createParticipant: (body: {
    subjectCode: string;
    studyId: string;
    siteId?: string;
    status?: "screened" | "enrolled" | "withdrawn" | "completed";
  }) =>
    request<Participant>("/participants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateParticipantStatus: (id: string, status: string, reason?: string) =>
    request<Participant>(`/participants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),

  studyById: (id: string) => request<StudyDetail>(`/studies/${id}`),
  createStudy: (body: {
    code: string;
    title: string;
    phase?: string;
    sponsor?: string;
    therapeuticArea?: string;
    enrollmentTarget?: number;
    riskScore?: number;
  }) =>
    request<StudyDetail>("/studies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateStudy: (
    id: string,
    body: Partial<{
      code: string;
      title: string;
      phase: string;
      sponsor: string;
      therapeuticArea: string;
      enrollmentTarget: number;
      enrollmentCurrent: number;
      riskScore: number;
      status: string;
      reason: string;
    }>,
  ) =>
    request<StudyDetail>(`/studies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  archiveStudy: (id: string) =>
    request<StudyDetail>(`/studies/${id}/archive`, { method: "POST" }),

  sites: () => request<Site[]>("/sites"),
  createSite: (body: { code: string; name: string; city?: string; status?: string }) =>
    request<Site>("/sites", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateSite: (id: string, body: Partial<{ code: string; name: string; city: string; status: string }>) =>
    request<Site>(`/sites/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  assignSite: (body: { studyId: string; siteId: string; status?: string }) =>
    request<{ id: string }>("/sites/assign", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  investigators: () => request<Investigator[]>("/investigators"),
  createInvestigator: (body: { code: string; displayName: string; specialty?: string }) =>
    request<Investigator>("/investigators", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  assignInvestigator: (body: { studyId: string; investigatorId: string; roleTitle?: string }) =>
    request<{ id: string }>("/investigators/assign", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  unassignInvestigator: (assignmentId: string) =>
    request<{ ok: boolean }>(`/investigators/assign/${assignmentId}`, { method: "DELETE" }),

  milestones: (studyId?: string) =>
    request<Milestone[]>(`/milestones${qs({ studyId })}`),

  exportHistory: () => request<ExportRecord[]>("/exports"),
  createExport: (studyId: string, kind: "subjects_csv" | "studies_csv" = "subjects_csv") =>
    createExportCsv(studyId, kind),

  fhirResearchStudy: (id: string) => fhirGet<Record<string, unknown>>(`/fhir/ResearchStudy/${id}`),
  fhirResearchSubject: (id: string) => fhirGet<Record<string, unknown>>(`/fhir/ResearchSubject/${id}`),

  consents: (params?: { status?: string; studyId?: string }) =>
    request<ConsentRecord[]>(`/consents${qs(params)}`),
  consentKpis: () => request<ConsentKpis>("/consents/kpis"),
  consentVersions: (studyId?: string) =>
    request<ConsentVersion[]>(`/consents/versions${qs({ studyId })}`),
  createConsent: (body: {
    studyId: string;
    participantId: string;
    versionId?: string;
    version?: string;
    status?: string;
  }) =>
    request<ConsentRecord>("/consents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateConsentStatus: (id: string, status: string, reason?: string) =>
    request<ConsentRecord>(`/consents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),
  withdrawConsent: (id: string, reason?: string) =>
    request<ConsentRecord>(`/consents/${id}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  regulatoryKpis: () => request<RegulatoryKpis>("/regulatory/kpis"),
  regulatorySubmissions: (params?: { kind?: string; status?: string; studyId?: string }) =>
    request<RegulatorySubmission[]>(`/regulatory/submissions${qs(params)}`),
  createRegulatorySubmission: (body: Record<string, unknown>) =>
    request<RegulatorySubmission>("/regulatory/submissions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRegulatoryStatus: (id: string, status: string, reason?: string) =>
    request<RegulatorySubmission>(`/regulatory/submissions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),
  updateCtri: (
    submissionId: string,
    body: {
      referenceNumber?: string;
      status?: string;
      submittedAt?: string;
      decidedAt?: string;
      dueAt?: string;
      notes?: string;
      reason?: string;
    },
  ) =>
    request<RegulatorySubmission>(`/regulatory/submissions/${submissionId}/ctri`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  ethicsCommittees: () => request<EthicsCommittee[]>("/regulatory/ethics-committees"),
  createEthicsCommittee: (body: { code: string; name: string; city?: string }) =>
    request<EthicsCommittee>("/regulatory/ethics-committees", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export type Study = {
  id: string;
  code: string;
  title: string;
  status: string;
  phase: string | null;
  enrollmentTarget: number;
  enrollmentCurrent: number;
  riskScore: number;
};

export type StudyDetail = Study & {
  sponsor?: string | null;
  therapeuticArea?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Site = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Investigator = {
  id: string;
  code: string;
  displayName: string;
  specialty: string | null;
  createdAt?: string;
};

export type Milestone = {
  id: string;
  studyId: string;
  key: string;
  title: string;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt?: string;
  studyCode?: string | null;
};

export type AeKpis = {
  open: number;
  serious: number;
  escalated: number;
  pendingReview: number;
};

export type ExportRecord = {
  id: string;
  studyId: string;
  kind: string;
  format: string;
  createdBy: string;
  createdAt: string;
  studyCode?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
};

export type AuditVerifyResult = {
  valid: boolean;
  chainScope: string;
  checkedEvents: number;
  firstInvalidEvent: string | null;
  reason: string | null;
  tip: string;
};

export type Kpis = {
  totalStudies: number;
  activeStudies: number;
  atRiskStudies: number;
  completedStudies: number;
  openHighRisk: number;
  source: string;
  computedAt: string;
};

export type AlertItem = {
  level: "crit" | "warn" | "ok";
  type: string;
  message: string;
  entityId: string;
  studyId?: string;
};

export type AuditEvent = {
  id: string;
  sequence?: number;
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  actorUserId?: string | null;
  actorName: string | null;
  actorEmail: string | null;
  previousHash?: string | null;
  eventHash?: string | null;
  previousState: unknown;
  newState: unknown;
};

export type AdverseEvent = {
  id: string;
  caseCode: string;
  studyId: string;
  isSerious: boolean;
  severity: string;
  status: string;
  description: string;
};

export type Participant = {
  id: string;
  subjectCode: string;
  studyId: string;
  siteId: string | null;
  status: string;
};

export type ConsentRecord = {
  id: string;
  studyId: string;
  participantId: string;
  version: string;
  versionId: string | null;
  status: string;
  obtainedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  studyCode?: string | null;
  subjectCode?: string | null;
  versionTitle?: string | null;
};

export type ConsentVersion = {
  id: string;
  studyId: string;
  versionLabel: string;
  title: string;
  effectiveAt: string | null;
};

export type ConsentKpis = {
  pending: number;
  obtained: number;
  withdrawn: number;
  expired: number;
  total: number;
  source: string;
  computedAt: string;
};

export type RegulatorySubmission = {
  id: string;
  studyId: string;
  ethicsCommitteeId: string | null;
  kind: string;
  referenceNumber: string | null;
  status: string;
  decision: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  dueAt: string | null;
  notes: string | null;
  studyCode?: string | null;
  committeeName?: string | null;
};

export type RegulatoryKpis = {
  pendingEthicsReviews: number;
  overdueSubmissions: number;
  ctriRegistered: number;
  ctriPending: number;
  total: number;
  source: string;
  computedAt: string;
  note?: string;
};

export type EthicsCommittee = {
  id: string;
  code: string;
  name: string;
  city: string | null;
};
