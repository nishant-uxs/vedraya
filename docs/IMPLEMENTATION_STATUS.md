# Implementation Status

Last updated: 2026-09-29 (Phase 4)

Honest status for SIH26046 CTMS prototype. Do not claim more than this table.

| Area | Status | Evidence |
|---|---|---|
| Backend modular monolith | **IMPLEMENTED** | `server/` Express `/api/v1` |
| PostgreSQL + Drizzle | **IMPLEMENTED** | schema + migrations through `0003_phase4_safety_coding` |
| Auth (HTTP-only cookie) | **IMPLEMENTED** | Argon2id + `vedraya_sid` |
| CSRF (double-submit) | **IMPLEMENTED** | `vedraya_csrf` + `X-CSRF-Token` |
| Rate limiter architecture | **IMPLEMENTED** | pluggable Memory/DB store; login limited |
| RBAC + study membership ACL | **IMPLEMENTED** | `requirePermission` + `study_memberships` (monitor scoped) |
| Study/Sites/Investigators/Participants | **IMPLEMENTED** | CRUD + transitions |
| KPIs / Alerts | **IMPLEMENTED** | DB-derived |
| AE/SAE + classify fields | **IMPLEMENTED** | causality/outcome/actionTaken/codingStatus |
| MedDRA-compatible coding prototype | **IMPLEMENTED** | `MEDDRA_DEMO` synthetic dictionary + apply API |
| WHODrug-compatible coding prototype | **IMPLEMENTED** | `WHODRUG_DEMO` + concomitant meds |
| Consent / Regulatory / CTRI TRACKING | **IMPLEMENTED** | tracking only for CTRI |
| GLOBAL SHA-256 audit chain | **IMPLEMENTED** | verify endpoint |
| SDTM-like AE export | **PARTIAL / PROTOTYPE** | `/exports/sdtm/ae` — not CDISC certified |
| ADaM | **PARTIAL** | documented interface only — no dataset |
| FHIR R4 ResearchStudy/Subject | **PARTIAL / PROTOTYPE** | `/fhir` + `/fhir/R4/*` |
| Interop adapters (ABDM/HIS/EDC) | **PLANNED** | status API — NOT CONNECTED |
| Command Center modules | **IMPLEMENTED** | incl. Safety coding + Exports SDTM + Interop honesty |
| Playwright E2E | **IMPLEMENTED** | critical path + Phase 4 safety/coding |
| Landing / GSAP / Lenis / theme | **PRESERVED** | marketing SPA intact |
| Official MedDRA/WHODrug licensed data | **NOT IMPLEMENTED** | demo dictionaries only |
| Full CDISC / ABDM / HIS / EDC | **NOT IMPLEMENTED** | — |
| WORM audit / legal ALCOA+ | **NOT CLAIMED** | — |

## Demo credentials

Password: `Vedraya!Demo1`  
Monitor is study-scoped to AYU-024 only (ACL demo).
