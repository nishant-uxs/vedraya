# API overview (v1)

Base: `/api/v1` · Cookie session `vedraya_sid` · JSON unless noted.

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | Rate-limited; sets HTTP-only cookie |
| POST | `/auth/logout` | Clears session |
| GET | `/auth/me` | Current user + permissions |

## Core CTMS

| Area | Paths (summary) | Permissions |
|---|---|---|
| Studies | `GET/POST /studies`, `GET /studies/kpis`, `GET/PATCH /studies/:id`, `POST /studies/:id/archive` | `study:*` |
| Sites | `GET/POST /sites`, `PATCH /sites/:id`, `POST /sites/assign` | `site:*` |
| Investigators | `GET/POST /investigators`, `POST /investigators/assign`, `DELETE /investigators/assign/:id` | `investigator:*` |
| Participants | `GET/POST /participants`, `PATCH /participants/:id/status` | `participant:*` |
| Milestones | `GET /milestones` | `milestone:view` |
| Adverse events | `GET/POST /adverse-events`, `GET /adverse-events/kpis`, `PATCH /adverse-events/:id/status` | `ae:*` |
| Alerts | `GET /alerts` | authenticated + relevant view perms |
| Exports | `GET /exports` (history), `POST /exports` → CSV (`subjects_csv` \| `studies_csv`) | `export:*` — **Study Data Export prototype, not CDISC** |
| FHIR | `GET /fhir/ResearchStudy/:id`, `GET /fhir/ResearchSubject/:id` | `fhir:view` — **prototype** |

## Consents

| Method | Path | Permission |
|---|---|---|
| GET | `/consents` | `consent:view` |
| GET | `/consents/kpis` | `consent:view` |
| GET | `/consents/versions` | `consent:view` |
| POST | `/consents/versions` | `consent:create` |
| GET | `/consents/:id` | `consent:view` |
| POST | `/consents` | `consent:create` |
| PATCH | `/consents/:id/status` | `consent:update` (+ `consent:withdraw` for withdrawn) |
| POST | `/consents/:id/withdraw` | `consent:withdraw` |

Status machine: `pending → obtained|withdrawn|expired`; `obtained → withdrawn|expired`.

## Regulatory

| Method | Path | Permission |
|---|---|---|
| GET/POST/PATCH | `/regulatory/ethics-committees[/:id]` | `regulatory:view` / `manage` |
| GET | `/regulatory/kpis` | `regulatory:view` |
| GET/POST | `/regulatory/submissions` | `regulatory:view` / `manage` |
| PATCH | `/regulatory/submissions/:id/status` | `regulatory:manage` |
| PATCH | `/regulatory/submissions/:id/ctri` | `regulatory:manage` — **CTRI TRACKING only** |

Status machine: `draft → submitted → under_review → approved|rejected|registered → expired`.

## Audit

| Method | Path | Permission |
|---|---|---|
| GET | `/audit-events` | `audit:view` — filters: `limit`, `action`, `entityType`, `actorUserId`, `from`, `to` |
| GET | `/audit-events/verify` | `audit:view` — GLOBAL hash-chain check |
| PATCH/DELETE | `/audit-events/:id` | **405** always (append-only) |

See `docs/AUDIT.md` for hash-chain design.
