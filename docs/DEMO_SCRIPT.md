# Demo script (5–7 min)

Password for all accounts: `Vedraya!Demo1`

1. Open landing — keep cinematic hero (theme toggle if asked).
2. Scroll to **Command Center** → Sign in as `admin@vedraya.demo`.
3. Show **Live PostgreSQL** KPIs (active/high-risk/alerts/total) and study table (AYU-024…).
4. Show Safety panel counts and computed Alerts (risk + SAE).
5. Show Audit trail rows with actor/action/time (LOGIN/SEED).
6. Sign out → Sign in as `regulator@vedraya.demo`.
7. API proof (optional terminal): regulator `POST /studies` → **403**.
8. Create study as admin (API or upcoming form) → refresh KPIs → new audit row.
9. Create/escalate AE as `pv@vedraya.demo` → audit `AE_ESCALATE`.
10. Hit `GET /api/v1/fhir/ResearchStudy/:id` and CSV export; note **prototype** labels.
11. Close with limitations: landing narrative still static; no MedDRA/ABDM/full CDISC; audit is append-only API foundation, not legal ALCOA+.
