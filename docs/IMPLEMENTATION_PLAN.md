# VEDRAYA Implementation Plan

> Incremental build from marketing SPA → working SIH26046 CTMS prototype  
> Rule: preserve UI; make backend real.

## Baseline (audit)

| Metric | Estimate |
|--------|----------|
| Technical PS implementation | ~5% |
| Demo readiness | ~28% |
| Genuine implementation | ~5% |
| UI/mock surface | ~80%+ |

## Principles

1. Inspect before rewrite.
2. Do not destroy landing/hero/theme/motion.
3. No fake APIs.
4. Server-side authorization mandatory.
5. Every mutation audited server-side.
6. Label DEMO/PROTOTYPE when incomplete.
7. Atomic meaningful git commits.

---

## Phase checklist

### Phase 0 — Forensics ✅ (this doc set)

- [x] Map frontend sections
- [x] Map hardcoded data
- [x] Map fake claims → backend features
- [x] `ARCHITECTURE.md`
- [x] `IMPLEMENTATION_PLAN.md`
- [x] `REQUIREMENTS_TRACEABILITY.md`

### Phase 1 — Backend foundation

- [ ] `/server` Express + TypeScript
- [ ] Config / env validation (Zod)
- [ ] PostgreSQL + Drizzle
- [ ] Logging + error middleware
- [ ] Vite proxy `/api` → server
- [ ] Health: `GET /api/v1/health`

### Phase 2 — Schema + seed

- [ ] Migrations: users/roles/permissions, studies, sites, investigators, participants, milestones, AEs, consents, regulatory, audit_events, exports, notifications
- [ ] Synthetic seed (5 studies, 10 sites, 10 investigators, 30 participants, AEs, audits)
- [ ] Demo accounts for 7 roles

### Phase 3–4 — Auth + RBAC

- [ ] Login / logout / me
- [ ] Session cookie
- [ ] `authenticate` + `requirePermission`
- [ ] `docs/RBAC.md` + tests (401/403/200)

### Phase 5–7 — Core CTMS

- [ ] Study CRUD + archive
- [ ] Sites + study_sites
- [ ] Investigators + assignments
- [ ] Participants (de-identified)
- [ ] Wire Command Center lists/KPIs to API

### Phase 8–9 — Lifecycle + milestones

- [ ] Valid study status transitions
- [ ] Milestone CRUD + delayed/at-risk computation
- [ ] Alerts derived from DB

### Phase 10 — Audit

- [ ] Append-only `audit_events`
- [ ] Auto-instrument mutations
- [ ] `/api/v1/audit-events` read
- [ ] Replace fake AuditTimeline / Command Center audit panel
- [ ] `docs/AUDIT.md` integrity limits

### Phase 11–13 — Safety / consent / regulatory

- [ ] AE create + workflow states
- [ ] SAE escalation path
- [ ] Consent records version-aware
- [ ] Ethics/regulatory submission records

### Phase 14–15 — Interop + export

- [ ] FHIR-shaped GET for ResearchStudy / ResearchSubject / Patient (synthetic)
- [ ] CSV export job + download + audit
- [ ] Document PROTOTYPE boundaries

### Phase 16–19 — Privacy, FE integration, Command Center UX

- [ ] `docs/PRIVACY.md`
- [ ] React Router `/app/*` for ops shell (landing stays `/`)
- [ ] API hooks; loading/error/empty states
- [ ] Remove fake telemetry claims

### Phase 20–22 — Tests, browser QA, security

- [ ] Vitest + Supertest
- [ ] Playwright critical path
- [ ] Authz/IDOR checks
- [ ] Live browser verification

### Phase 23–24 — De-mock + docs

- [ ] Grep/remove silent mocks
- [ ] Full `/docs` set + README + DEMO_SCRIPT + LIMITATIONS
- [ ] Re-audit scores

---

## Fake UI → backend replacement map

| UI claim / mock | Backend replacement |
|-----------------|---------------------|
| `STUDIES` array | `GET/POST/PATCH /api/v1/studies` |
| KPI tickers | `GET /api/v1/kpis/overview` |
| `ALERTS` | `GET /api/v1/alerts` (computed) |
| `EVENTS` audit | `GET /api/v1/audit-events` + writers |
| Role tabs | Session user + permissions; login required |
| Safety workflow labels | `POST/PATCH /api/v1/adverse-events` |
| Compliance matrix | Regulatory submissions + milestone queries |
| Interop pipeline | FHIR-shaped reads + export CSV |
| Copilot canned text | Keep as DEMO or remove AI claim |
| `RBAC active` badge | Show only when authenticated with roles |
| LATENCY/FEDERATED/IMMUTABLE | Remove or compute honestly |

---

## Near-term execution order (this session)

1. Scaffold `/server` + Drizzle + health  
2. Schema migration + seed  
3. Auth + RBAC middleware  
4. Studies CRUD + KPIs  
5. Frontend API client + Command Center live data  
6. Audit instrumentation  
7. AE MVP  
8. Docs updates + CHANGELOG + status  

Landing page remains intact throughout.
