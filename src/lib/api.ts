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
  auditEvents: (limit = 40) => request<AuditEvent[]>(`/audit-events?limit=${limit}`),
  adverseEvents: () => request<AdverseEvent[]>("/adverse-events"),
  participants: () => request<Participant[]>("/participants"),

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
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  actorName: string | null;
  actorEmail: string | null;
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
