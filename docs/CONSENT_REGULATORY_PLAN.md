# Consent & Regulatory — Implementation Status Notes

## Forensics summary (pre-change)

| Asset | Status before |
|---|---|
| `consents` table | Seeded only |
| `consent_versions` | Missing |
| `ethics_committees` | Missing |
| `regulatory_submissions` | Seeded only |
| Routes | None |
| UI modules | None |
| Alerts | Milestones/AE/risk only |
| Perms | `consent:manage` (coarse) |

## After this phase

Consent and regulatory are operational end-to-end (API + RBAC + DB + audit + Command Center modules + tests).

See `IMPLEMENTATION_STATUS.md` for the status flip to **IMPLEMENTED**.
