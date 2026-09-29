# Security notes (prototype)

Honest assessment for SIH26046. **Not** a production security certification.

## Implemented

| Control | Detail |
|---|---|
| Password hashing | Argon2id |
| Session cookie | HTTP-only `vedraya_sid`; `SameSite=lax`; `Secure` in production |
| CSRF | Double-submit: readable `vedraya_csrf` cookie + required `X-CSRF-Token` on unsafe methods (login/health exempt) |
| Auth middleware | Session lookup; 401 if missing/invalid |
| RBAC | `requirePermission` |
| Study-level ACL | `study_memberships` — users with rows are scoped; admin bypass; zero rows = global (compat) |
| CORS | `CORS_ORIGIN` + credentials |
| Helmet | Default headers |
| Body limits | `express.json({ limit: "1mb" })` |
| Validation | Zod on mutations |
| Login rate limit | Pluggable store: Memory (default) or DB (`RATE_LIMIT_STORE=db`); 30 / 15 min |
| Audit | Append-only API + GLOBAL SHA-256 chain |
| Synthetic data | Subject codes only |

## CSRF notes

- SameSite=lax **plus** double-submit token.
- SPA must send `X-CSRF-Token` matching `vedraya_csrf` after login.
- Cross-site multi-domain deployments still need careful Origin policy review.

## Gaps (remaining)

| Topic | Status |
|---|---|
| Redis rate limiting | Interface ready; DB store available; Redis not wired |
| Exhaustive IDOR on every nested resource | Study ACL on studies/AE/export/FHIR; not every table yet |
| Session revoke UI | Not built |
| WORM audit storage | Not built |

## Do not claim

Production hardening certification, DPDP/HIPAA/21 CFR Part 11 compliance.
