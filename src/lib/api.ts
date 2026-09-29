const API_BASE = "/api/v1";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
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
