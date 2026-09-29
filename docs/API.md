# API overview (v1)

Base: `/api/v1` · Cookie session `vedraya_sid` · CSRF: cookie `vedraya_csrf` + header `X-CSRF-Token` on mutations · JSON unless noted.

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | Rate-limited; sets session + CSRF cookies |
| POST | `/auth/logout` | Clears session + CSRF |
| GET | `/auth/me` | Current user + permissions |

## Core CTMS

| Area | Paths (summary) | Permissions |
|---|---|---|
| Studies | `GET/POST /studies`, `GET /studies/kpis`, `GET/PATCH /studies/:id`, archive | `study:*` + study ACL |
| Sites / Investigators / Participants / Milestones | existing routes | unchanged |
| Adverse events | `GET/POST /`, `GET /kpis`, `GET /:id`, `PATCH /:id/status`, `PATCH /:id/classify`, `PATCH /:id/notify-authority` | `ae:*` + study ACL |
| Quality | `GET/POST /quality/deviations`, `PATCH /quality/deviations/:id/status`, `GET/POST /quality/queries`, `PATCH /quality/queries/:id/status` | `study:view` / `study:update` + ACL — **PARTIAL** |
| Coding | `GET /coding/dictionaries`, `GET /coding/terms`, `POST /coding/apply`, `GET /coding/results`, `POST/GET /coding/medications` | `coding:view` / `coding:apply` |
| Exports | `GET /exports`, `POST /exports` (subjects/studies CSV) | `export:*` |
| SDTM-like AE | `POST /exports/sdtm/ae`, `GET /exports/sdtm/ae/validate` | `export:create` / `view` — **prototype** |
| FHIR | `GET /fhir/ResearchStudy/:id`, `/ResearchSubject/:id`, and `/fhir/R4/...` aliases | `fhir:view` — **prototype** |
| Interop | `GET /interop/adapters`, `GET /interop/adapters/:id` | `fhir:view` |
| Alerts / Audit | existing | unchanged |

## Coding dictionaries (demo only)

- `MEDDRA_DEMO` / `DEMO-1` — MedDRA-compatible coding prototype
- `WHODRUG_DEMO` / `DEMO-1` — WHODrug-compatible coding prototype

## Consents / Regulatory

Unchanged status machines. CTRI TRACKING remains internal only.

## Audit

| Method | Path | Notes |
|---|---|---|
| GET | `/audit-events` | filters |
| GET | `/audit-events/verify` | GLOBAL hash chain |
| PATCH/DELETE | `/audit-events/:id` | **405** |

Coding/export mutations emit `CODING_APPLIED`, `MEDICATION_CREATE`, `EXPORT_CREATE`, `AE_CLASSIFY` via `writeAudit()`.
