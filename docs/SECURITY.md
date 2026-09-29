# Security notes (prototype)

## Implemented

- Argon2id password hashing
- HTTP-only `vedraya_sid` session cookie (`SameSite=lax`, `Secure` in production)
- Server-side permission checks on protected routes
- Helmet, CORS with credentials, Zod body validation
- Audit immutability via API (405)
- No patient PII in seed schema beyond synthetic subject codes

## Findings / gaps (honest)

| Topic | Status |
|---|---|
| Auth bypass (unauthenticated `/studies`) | Blocked (401) — tested |
| Role escalation (regulator create study) | Blocked (403) — tested |
| Rate limiting on login | **Not implemented** |
| CSRF double-submit token | **Not implemented** (relies on SameSite) |
| IDOR exhaustive suite | **Partial** — needs broader tests |
| Secrets in repo | Use `server/.env` — do not commit |

## Do not claim

Full application security certification or production readiness.
