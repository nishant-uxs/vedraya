# VEDRAYA — Clinical Research Intelligence (CTMS Prototype)

SIH26046 AIIA Clinical Trial Management System prototype.

The marketing landing experience (GSAP, Lenis, themes, hero) is preserved.
The Command Center and `/api/v1` stack provide a **working** CTMS MVP against PostgreSQL.

> Honest scope: this is a demonstrable prototype, not a validated production CTMS.
> Do not claim full FHIR R4, CDISC, ALCOA+, DPDP, MedDRA, ABDM, or regulatory certification.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite (existing UI) |
| Backend | Node.js + Express + Zod |
| DB | PostgreSQL + Drizzle ORM |
| Auth | HTTP-only session cookie (`vedraya_sid`) + Argon2id |

## Quick start

### 1. PostgreSQL

Example Docker (host port `55432` if `5432` is busy):

```bash
docker run --name vedraya-pg -e POSTGRES_PASSWORD=vedraya -e POSTGRES_USER=vedraya -e POSTGRES_DB=vedraya -p 55432:5432 -d postgres:16
```

### 2. Server

```bash
cd server
cp .env.example .env   # or edit .env with DATABASE_URL
npm install
npm run db:setup       # migrate + seed
npm run dev            # http://127.0.0.1:4000
```

### 3. Frontend

```bash
# repo root
npm install
npm run dev            # http://localhost:3000 — proxies /api → :4000
```

## Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Session signing/entropy (≥16 chars) |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Frontend origin (default `http://localhost:3000`) |
| `NODE_ENV` | `development` \| `test` \| `production` |

Never commit real secrets.

## Demo credentials

Password for all seeded accounts: `Vedraya!Demo1`

| Email | Role |
|---|---|
| `admin@vedraya.demo` | Administration |
| `pi@vedraya.demo` | Principal Investigator |
| `coord@vedraya.demo` | Study Coordinator |
| `monitor@vedraya.demo` | Monitor |
| `pv@vedraya.demo` | Pharmacovigilance |
| `ethics@vedraya.demo` | Ethics Committee |
| `regulator@vedraya.demo` | Regulator (read-only writes blocked) |

Synthetic clinical data only — no real patient information.

## API surface (v1)

- `POST /api/v1/auth/login|logout` · `GET /api/v1/auth/me`
- `GET|POST /api/v1/studies` · lifecycle transitions · `GET /studies/kpis`
- `GET|POST /api/v1/sites` · assign
- `GET|POST /api/v1/investigators` · assign
- `GET|POST /api/v1/participants` · status transitions
- `GET|POST /api/v1/adverse-events` · status / escalate
- `GET /api/v1/audit-events` (append-only; mutations → 405)
- `GET /api/v1/alerts` (computed)
- `GET /api/v1/fhir/...` (prototype-shaped resources)
- `GET /api/v1/exports/...` (CSV prototype)

## Tests

```bash
cd server
npm test
```

## Documentation

See `/docs`:

- `ARCHITECTURE.md` · `IMPLEMENTATION_PLAN.md` · `REQUIREMENTS_TRACEABILITY.md`
- `RBAC.md` · `IMPLEMENTATION_STATUS.md`
- Additional domain docs are being expanded (`AUDIT`, `PRIVACY`, `LIMITATIONS`, etc.)

## Limits (do not over-claim)

- Audit is append-only via API; not a cryptographic hash-chain / legal ALCOA+ attestation
- FHIR endpoints are shaped prototypes, not certified R4 servers
- CDISC export is a transparent CSV mapping demo, not full SDTM/ADaM
- Consent/regulatory tables are seeded; full UI workflows still partial
- MedDRA/WHODrug, ABDM, EDC/HIS integrations are **not** implemented
