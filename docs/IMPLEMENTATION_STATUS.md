# Implementation Status

Last updated: 2026-09-29

Honest status for SIH26046 CTMS prototype work. Do not claim more than this table.

| Area | Status | Evidence |
|---|---|---|
| Backend modular monolith | **IMPLEMENTED** | `server/` Express `/api/v1` |
| PostgreSQL + Drizzle schema | **IMPLEMENTED** | `server/src/db/schema.ts`, migrate/seed |
| Auth (HTTP-only cookie session) | **IMPLEMENTED** | login/logout/me + Argon2id |
| RBAC permission middleware | **IMPLEMENTED** | `requirePermission`, docs/RBAC.md |
| Study CRUD + lifecycle transitions | **IMPLEMENTED** | `/api/v1/studies` |
| Study KPIs from DB | **IMPLEMENTED** | `/api/v1/studies/kpis` |
| Sites + study-site assign | **IMPLEMENTED** | `/api/v1/sites` |
| Investigators + assign/unassign | **IMPLEMENTED** | `/api/v1/investigators` |
| Participants + status transitions | **IMPLEMENTED** | `/api/v1/participants` |
| Alerts computed from DB | **IMPLEMENTED** | includes consent + regulatory alerts |
| Append-only audit trail | **PARTIAL** | write on mutations; no DELETE/PATCH; no hash-chain |
| AE/SAE workflow | **IMPLEMENTED** | create + constrained status transitions |
| Consent records + versions | **IMPLEMENTED** | API + Command Center module + KPIs + audit |
| Regulatory / ethics / CTRI tracking | **IMPLEMENTED** | ethics committees, submissions, status machine, CTRI TRACKING (not integration) |
| FHIR-shaped MVP | **PARTIAL / PROTOTYPE** | ResearchStudy/ResearchSubject read endpoints |
| CSV export + audit | **PARTIAL** | `/api/v1/exports` prototype mapping |
| Command Center live data | **IMPLEMENTED** | overview + Consent + Regulatory + Audit modules |
| Landing / theme / GSAP / Lenis | **PRESERVED** | marketing SPA intact |
| MedDRA / WHODrug | **NOT IMPLEMENTED** | — |
| Full CDISC SDTM/ADaM | **NOT IMPLEMENTED** | CSV demo only |
| ABDM / HIS / EDC | **NOT IMPLEMENTED** | — |
| DPDP legal compliance | **NOT CLAIMED** | privacy foundations only |
| ALCOA+ legal compliance | **NOT CLAIMED** | audit log foundations only |
| Playwright E2E suite | **NOT IMPLEMENTED** | browser QA manual/MCP |
| Unit/API tests | **PARTIAL** | Vitest auth/RBAC + consent/regulatory (14 tests) |

## Demo credentials

All seeded accounts use password `Vedraya!Demo1`.

See `docs/RBAC.md` for emails/roles.
