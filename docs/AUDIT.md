# Audit trail (prototype)

## Implemented

- Server-side `audit_events` table
- `writeAudit()` called from study/site/investigator/participant/AE/export/consent/regulatory mutations
- Consent actions: `CONSENT_CREATED`, `CONSENT_STATUS_CHANGED`, `CONSENT_WITHDRAWN`, `CONSENT_VERSION_CREATED`, `CONSENT_VERSION_ASSOCIATED`
- Regulatory actions: `ETHICS_COMMITTEE_CREATED`, `ETHICS_COMMITTEE_UPDATED`, `REGULATORY_SUBMISSION_CREATED`, `REGULATORY_STATUS_CHANGED`, `CTRI_TRACKING_UPDATED`
- `GET /api/v1/audit-events` (permission `audit:view`)
- Explicit `405 AUDIT_IMMUTABLE` on mutation attempts via `/api/v1/audit-events/:id`
- Command Center Audit panel reads live events after login

## Guarantees (honest)

| Claim | Status |
|---|---|
| Mutations create audit rows | Yes (for instrumented routes) |
| Users cannot edit/delete via API | Yes (405) |
| Cryptographic hash chain | **No** |
| WORM / legal hold storage | **No** |
| ALCOA+ regulatory attestation | **Not claimed** |

## Not implemented

- Client-submitted audit forging protection beyond server writes
- Tamper-evident hashing
- SIEM export
