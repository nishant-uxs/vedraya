# Privacy foundations (not DPDP compliance)

## Implemented controls

- Synthetic demo identities only (`*.vedraya.demo`)
- Participants use `subjectCode` — no unnecessary PII fields in schema
- Session auth + RBAC restricts data access
- Controlled CSV export behind permissions + audit logging
- Secrets expected via environment variables

## Planned / not implemented

- Formal retention job + deletion workflows
- Subject access / erasure request portal
- Encryption-at-rest beyond database defaults
- DPIA / legal opinion

## Claims

**Do not** claim DPDP Act compliance based on this prototype.
