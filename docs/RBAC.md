# VEDRAYA RBAC Matrix (Prototype)

This matrix is enforced **server-side** via `authenticate` + `requirePermission(...)`.
Frontend UI may hide controls for UX, but that is **not** authorization.

## Roles (seeded)

| Role key | Display name | Demo account |
|---|---|---|
| `administration` | Administration | `admin@vedraya.demo` |
| `principal_investigator` | Principal Investigator | `pi@vedraya.demo` |
| `study_coordinator` | Study Coordinator | `coord@vedraya.demo` |
| `monitor` | Monitor | `monitor@vedraya.demo` |
| `pharmacovigilance` | Pharmacovigilance | `pv@vedraya.demo` |
| `ethics_committee` | Ethics Committee | `ethics@vedraya.demo` |
| `regulator` | Read-only Regulator | `regulator@vedraya.demo` |

Demo password (development only): `Vedraya!Demo1`

## Permission catalog

- `study:view|create|update|archive`
- `site:view|manage`
- `investigator:view|manage`
- `participant:view|manage`
- `milestone:view|update`
- `ae:view|create|update|escalate`
- `coding:view|apply`
- `consent:view|create|update|withdraw`
- `regulatory:view|manage`
- `audit:view`
- `export:create|view`
- `fhir:view`

## Study-level ACL

Table `study_memberships (userId, studyId)`:

- **administration** → unrestricted
- **regulator** → unrestricted portfolio read (writes still RBAC-denied)
- User with **≥1 membership** → only those studies
- User with **0 memberships** → **empty scope** (no study access)

Demo seed memberships: PI → AYU-024/031; coordinator → AYU-024/031/018; monitor → AYU-024; ethics → AYU-024/031; PV → AYU-024/031/018.

Enforced on: studies list/detail/KPIs/update/archive, alerts, participants, milestones, AE, quality (deviations/queries), consent, regulatory submissions/KPIs, exports history, FHIR reads, coding apply.

**Not study-scoped:** sites and investigators catalog endpoints (global reference data).


## Consent matrix

| Role | view | create | update | withdraw |
|---|---|---|---|---|
| administration | ✓ | ✓ | ✓ | ✓ |
| principal_investigator | ✓ | ✓ | ✓ | ✓ |
| study_coordinator | ✓ | ✓ | ✓ | ✓ |
| monitor | ✓ | — | — | — |
| pharmacovigilance | — | — | — | — |
| ethics_committee | ✓ | — | — | — |
| regulator | ✓ | — | — | — |

## Regulatory matrix

| Role | view | manage (ethics committees + submissions + CTRI tracking) |
|---|---|---|
| administration | ✓ | ✓ |
| ethics_committee | ✓ | ✓ |
| principal_investigator | ✓ | — |
| study_coordinator | ✓ | — |
| monitor | ✓ | — |
| regulator | ✓ | — |
| pharmacovigilance | — | — |

## Other role summaries

### Administration
Full permission set.

### Principal Investigator
Study view/update; participants; consent create/update/withdraw; AE create/update; audit/export view.

### Study Coordinator
Sites/investigators/participants/milestones/consent writes; AE create; no study create; no regulatory manage.

### Monitor
Read-mostly (including consent/regulatory view).

### Pharmacovigilance
AE view/update/escalate; limited study/participant view; audit view.

### Ethics Committee
Consent view + regulatory view/manage + study view + audit view.

### Regulator
Broad read including consent/regulatory/FHIR/export view. **No** writes.

## Prohibited for all normal users

- Edit or delete `audit_events`
- Bypass session cookie authentication
- Call protected `/api/v1/*` without a valid session

## Enforcement evidence

- Middleware: `server/src/middleware/auth.ts`
- Seed matrix: `server/src/db/seed.ts` (`ROLE_DEFS`)
- Tests: `server/tests/api.auth.rbac.test.ts`, `server/tests/api.consent.regulatory.test.ts`
