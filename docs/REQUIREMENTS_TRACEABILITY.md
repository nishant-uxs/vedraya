# Requirements Traceability — SIH26046 → VEDRAYA

**Exact SIH26046 problem statement PDF/text is not in this repository.**  
This matrix audites against **project-documented** requirements (ARCHITECTURE / prior traceability / STATUS).  
It **cannot claim complete official PS coverage**.

Last red-team audit: 2026-09-29 (Phase 5).

Legend — **Status** is IMPLEMENTED only when UI → API → authz → logic → DB → audit (where applicable) → test evidence exist.

| ID | Requirement (project-documented) | Status | Evidence | Gap / Risk |
|----|----------------------------------|--------|----------|------------|
| A1 | Portfolio / CTMS view | **IMPLEMENTED** | Command Center + `/studies` + KPIs | Landing marketing sections remain MOCK |
| A2 | Study create/manage | **IMPLEMENTED** | CRUD + transitions + audit | Zero-membership roles still global ACL |
| B1 | Lifecycle tracking | **IMPLEMENTED** | Status machine server-side | — |
| C1 | Portfolio management | **IMPLEMENTED** | `studies` table | E2E leftover study codes pollute demo |
| D1 | Real-time KPIs | **IMPLEMENTED** | DB aggregations + ACL scope | — |
| E1 | Configurable alerts | **PARTIAL** | Computed from DB; not user-configurable rules | No alert rule engine |
| F1 | Role-based access (7 roles) | **IMPLEMENTED** | Seed `ROLE_DEFS` + middleware | Nested catalog routes (sites) still global |
| G1 | Immutable audit / ALCOA+ foundation | **PARTIAL** | Append-only API + GLOBAL hash chain | Not WORM; DB DBA can mutate (detectable) |
| H1 | Pharmacovigilance | **IMPLEMENTED** | Safety module + AE APIs | Demo coding dictionaries only |
| I1 | AE/SAE capture & route | **IMPLEMENTED** | Transitions + escalate perm | — |
| J1 | MedDRA / WHODrug | **PARTIAL / DEMO** | `MEDDRA_DEMO` / `WHODRUG_DEMO` | Official dictionaries unavailable |
| K1 | Regulatory tracking | **IMPLEMENTED** | Submissions + ethics | — |
| L1 | CTRI tracking | **PARTIAL** | Internal CTRI TRACKING | No external CTRI API |
| M1 | Ethics Committee | **IMPLEMENTED** | Ethics committees + IEC kind | — |
| N1 | Informed consent | **IMPLEMENTED** | Versions + withdraw | — |
| O1 | DPDP / privacy | **PARTIAL** | Synthetic seed + PRIVACY.md | No full DPDP controls |
| P–T | CDISC CDASH/SDTM/ADaM | **PARTIAL** | SDTM-like AE CSV; ADaM interface only | Not certified |
| U1 | HL7 FHIR R4 | **PARTIAL** | ResearchStudy / ResearchSubject reads | Prototype only |
| V1 | ABDM | **NOT IMPLEMENTED** | Adapter status NOT_CONNECTED | — |
| W1 | EDC / HIS interop | **NOT IMPLEMENTED** | Adapter status NOT_CONNECTED | — |
| X1 | e-signature / integrity | **PARTIAL** | Hash chain verify | No e-sign; not legal attestation |
| Y1 | Export submission-ready | **PARTIAL** | CSV + SDTM-like AE | Not submission-ready CDISC |
| Z1 | Role-specific dashboards | **PARTIAL** | Permission-gated CC modules | Landing RoleSwitcher is MOCK |
| AA1 | Cloud ISO27001 / CERT-In | **NOT IMPLEMENTED** | Docs only | — |
| AB1 | Synthetic data | **IMPLEMENTED** | Seed + demo password | — |
| AC1 | Submission readiness | **PARTIAL** | Export flags / labels | Incomplete |
| AD1 | Evaluable outcomes | **PARTIAL** | Vitest + Playwright | No outcome analytics suite |

## Seven roles (seeded)

See `docs/RBAC.md` and `server/src/db/seed.ts` `ROLE_DEFS` — **do not infer from role names**.

## Non-claims

Do **not** claim: full GCP / ALCOA+ / DPDP legal compliance; complete FHIR/CDISC; live ABDM/EDC/HIS; official MedDRA/WHODrug; WORM audit.
