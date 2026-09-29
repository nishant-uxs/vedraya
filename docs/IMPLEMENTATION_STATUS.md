# Implementation Status

Last updated: 2026-09-29 (Phase 3)

Honest status for SIH26046 CTMS prototype work. Do not claim more than this table.

| Area | Status | Evidence |
|---|---|---|
| Backend modular monolith | **IMPLEMENTED** | `server/` Express `/api/v1` |
| PostgreSQL + Drizzle schema | **IMPLEMENTED** | `server/src/db/schema.ts`, migrate/seed |
| Auth (HTTP-only cookie session) | **IMPLEMENTED** | login/logout/me + Argon2id |
| RBAC permission middleware | **IMPLEMENTED** | `requirePermission`, docs/RBAC.md |
| Study CRUD + lifecycle transitions | **IMPLEMENTED** | `/api/v1/studies` + Studies module |
| Study KPIs from DB | **IMPLEMENTED** | `/api/v1/studies/kpis` |
| Sites + study-site assign | **IMPLEMENTED** | `/api/v1/sites` + Sites module |
| Investigators + assign/unassign | **IMPLEMENTED** | `/api/v1/investigators` + module |
| Participants + status transitions | **IMPLEMENTED** | `/api/v1/participants` + module |
| Milestones (read) | **IMPLEMENTED** | `/api/v1/milestones` + module (no separate write API) |
| Alerts computed from DB | **IMPLEMENTED** | consent + regulatory + safety + milestones |
| Append-only audit + hash chain | **IMPLEMENTED** | GLOBAL SHA-256 chain + `/audit-events/verify` |
| AE/SAE workflow | **IMPLEMENTED** | create + constrained transitions + Safety module |
| Consent records + versions | **IMPLEMENTED** | API + Consent module + KPIs + audit |
| Regulatory / ethics / CTRI tracking | **IMPLEMENTED** | ethics, submissions, CTRI TRACKING (not integration) |
| FHIR-shaped MVP | **PARTIAL / PROTOTYPE** | ResearchStudy + ResearchSubject reads; Interop module labeled |
| CSV Study Data Export + history | **PARTIAL / PROTOTYPE** | `/api/v1/exports` + Exports module — **not** CDISC |
| Command Center operational modules | **IMPLEMENTED** | Overview, Studies, Sites, Investigators, Participants, Milestones, Safety, Consent, Regulatory, Audit, Exports, Interop |
| Landing / theme / GSAP / Lenis | **PRESERVED** | marketing SPA intact |
| Login rate limiting | **IMPLEMENTED** | in-memory 30/15min (not distributed) |
| MedDRA / WHODrug | **NOT IMPLEMENTED** | — |
| Full CDISC SDTM/ADaM | **NOT IMPLEMENTED** | CSV demo only |
| ABDM / HIS / EDC | **NOT IMPLEMENTED** | — |
| DPDP legal compliance | **NOT CLAIMED** | privacy foundations only |
| ALCOA+ legal compliance | **NOT CLAIMED** | hash-chain foundations only |
| Playwright E2E suite | **IMPLEMENTED** | `e2e/ctms-critical-path.spec.ts` |
| Unit/API tests | **IMPLEMENTED** | Vitest auth/RBAC + consent/regulatory + audit integrity |

## Demo credentials

All seeded accounts use password `Vedraya!Demo1`.

See `docs/RBAC.md` for emails/roles.
