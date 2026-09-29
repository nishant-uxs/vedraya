# Audit trail (prototype)

## Chain scope

**GLOBAL** — one append-only hash chain for the entire database (no multi-tenant partitioning; the app does not implement tenancy).

Genesis previousHash: 64 zero hex chars (`0` × 64).

## Event fields

| Field | Role |
|---|---|
| `id` / `eventId` | UUID primary key |
| `sequence` | Monotonic GLOBAL sequence (unique) |
| `occurredAt` | Server timestamp |
| `actorUserId` | Authenticated user (nullable for system) |
| `action` | e.g. `STUDY_CREATE`, `AE_ESCALATE`, `LOGIN` |
| `entityType` / `entityId` | Target entity |
| `previousState` / `newState` | JSON snapshots |
| `reason` | Optional free text |
| `requestMeta` | `{ ip, method, path, userAgent }` (nulls normalized) |
| `previousHash` | Prior event's `eventHash` (or genesis) |
| `eventHash` | SHA-256 of canonical payload + `previousHash` |

## Hash algorithm

```
eventHash = SHA-256( canonicalize(payload) + "|" + previousHash )
```

`canonicalize` = JSON with **sorted object keys**, ISO dates, stable arrays. Do not hash unstable key order.

Payload includes: `id`, `sequence`, `occurredAt`, `actorUserId`, `action`, `entityType`, `entityId`, `previousState`, `newState`, `reason`, `requestMeta`.

Writes take a Postgres advisory transaction lock (`88442201`) so concurrent inserts keep sequence/hash links consistent.

## Implemented

- Server-side `writeAudit()` on study/site/investigator/participant/AE/export/consent/regulatory/auth mutations
- `GET /api/v1/audit-events` with filters (`action`, `entityType`, `actorUserId`, `from`, `to`, `limit`)
- `GET /api/v1/audit-events/verify` → `{ valid, chainScope, checkedEvents, firstInvalidEvent, reason, tip }`
- `verifyAuditChain()` detects modified payload/hash, broken previousHash, deleted/reordered sequences
- Explicit `405 AUDIT_IMMUTABLE` on PATCH/DELETE via `/api/v1/audit-events/:id` (admin and non-admin)
- Command Center **Audit** module: filters, before/after, live **AUDIT CHAIN: VERIFIED** / **INTEGRITY FAILURE**

## Guarantees (honest)

| Claim | Status |
|---|---|
| Mutations create audit rows | Yes (instrumented routes) |
| Users cannot edit/delete via application API | Yes (405) |
| Cryptographic GLOBAL hash chain | **Yes** |
| Tamper detection via verify | **Yes** |
| DB operators cannot touch rows | **No** — privileged SQL can still mutate; verify detects afterward |
| WORM / legal hold storage | **No** |
| ALCOA+ regulatory attestation | **Not claimed** |

## Not implemented

- Per-tenant / per-study chains
- SIEM export
- Hardware WORM / immutable storage tier
