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
- `consent:view|manage`
- `regulatory:view|manage`
- `audit:view`
- `export:create|view`
- `fhir:view`

## Role → capabilities (summary)

### Administration
- Full permission set
- Can create/update/archive studies, manage sites/investigators/participants, escalate AE, export, view FHIR/audit

### Principal Investigator
- View/update studies; manage participants/consent; create/update AE; view audit/export
- **Cannot** create studies, manage sites, escalate SAE without PV role, or archive

### Study Coordinator
- Operational CRUD for sites/investigators/participants/milestones/consent
- Can create AE; cannot escalate; cannot create studies

### Monitor
- Read-mostly operational visibility (studies, sites, participants, AE, audit, export view)
- **No** write mutations

### Pharmacovigilance
- AE view/update/escalate; limited study/participant view; audit view
- **No** study create

### Ethics Committee
- Study view + consent view + regulatory view/manage + audit view

### Regulator
- Broad read access including FHIR/export view
- **No** creates/updates/archives/escalations

## Prohibited for all normal users

- Edit or delete `audit_events`
- Bypass session cookie authentication
- Call protected `/api/v1/*` without a valid session

## Enforcement evidence

- Middleware: `server/src/middleware/auth.ts`
- Seed matrix: `server/src/db/seed.ts` (`ROLE_DEFS`)
- Integration tests: `server/tests/api.auth.rbac.test.ts`
