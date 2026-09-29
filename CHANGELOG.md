# Changelog

## 2026-09-29 (later)

- Consent management: versions catalog, CRUD/status/withdraw APIs, Command Center module, KPIs, alerts, audit
- Regulatory/ethics: ethics committees, submission status machine, CTRI TRACKING (not integration), KPIs, alerts, Command Center module
- Migration `0001_consent_regulatory`; Vitest consent/regulatory suite (14 tests total)

## 2026-09-29

- Backend modular monolith: auth, RBAC, studies, sites, investigators, participants, AE, audit, alerts, FHIR prototype, CSV export
- PostgreSQL schema + migrate/seed with 7 demo roles and synthetic CTMS dataset
- Frontend: AuthProvider + Command Center login wired to live `/api/v1` data
- Docs: architecture, plan, RBAC, audit, privacy, limitations, implementation status
- Tests: Vitest API auth/RBAC integration smoke suite (7 passing)
