# Security notes (prototype)

Honest assessment for SIH26046. This is **not** a production security certification.

## Implemented

| Control | Detail |
|---|---|
| Password hashing | Argon2id |
| Session cookie | HTTP-only `vedraya_sid`; `SameSite=lax`; `Secure` when `NODE_ENV=production`; 7-day TTL |
| Auth middleware | Session lookup on protected routes; 401 if missing/invalid |
| RBAC | Server-side `requirePermission` — UI hiding is not authorization |
| CORS | Strict origin from `CORS_ORIGIN` (default `http://localhost:3000`) + `credentials: true` |
| Helmet | Default security headers |
| Body limits | `express.json({ limit: "1mb" })` |
| Input validation | Zod schemas on mutating routes |
| Login rate limit | In-memory: 30 attempts / 15 min per IP+email (`middleware/rateLimit.ts`) |
| Audit immutability (app) | No PATCH/DELETE handlers; `ALL /audit-events/:id` → 405 |
| Audit integrity | GLOBAL SHA-256 hash chain + `GET /audit-events/verify` |
| Safe errors | Structured `{ error: { code, message } }` — avoid leaking stack traces to clients in production path |
| Synthetic data | Seed uses subject codes, not real patient PII |

## CSRF evaluation (cookie sessions)

- SPA and API are same-site in the demo (`localhost:3000` → proxy `/api` → `:4000`).
- Cookie uses **`SameSite=lax`**, which blocks most cross-site POST cookie sends from third-party sites.
- **No double-submit CSRF token** is implemented.
- Cross-origin deployments that loosen SameSite or host API on a different site **must** add explicit CSRF protection before production.
- Relying only on SameSite is acceptable for this **local prototype**, not for multi-domain production.

## Gaps (remaining)

| Topic | Status |
|---|---|
| Distributed rate limiting | In-memory only — resets per process; not multi-instance safe |
| CSRF double-submit / Origin checks | **Not implemented** (see above) |
| IDOR exhaustive suite | **Partial** — study/participant ownership scoping is coarse (global per-permission, not per-study ACL) |
| Refresh-token rotation / session revocation UI | Sessions exist in DB; no admin revoke UI |
| WAF / bot protection | Not applicable at prototype scale |
| Secrets in repo | Use `server/.env` — never commit |

## Database vs application protection

Privileged DB operators / infra can still `UPDATE`/`DELETE` audit rows directly.
Application APIs cannot. Hash-chain verification detects payload/hash/reorder/gap tampering after the fact.

## Do not claim

- Production-hardened CTMS
- Penetration-test clearance
- DPDP / HIPAA / 21 CFR Part 11 certification
