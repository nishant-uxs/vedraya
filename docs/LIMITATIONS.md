# Limitations

Be explicit in demos and pitches:

1. Marketing landing sections (lifecycle, risk story, compliance checklist, role tabs, copilot Q&A) still contain **static narrative/demo copy**.
2. Command Center modules are **live** after login (Overview through Interop) — numbers come from PostgreSQL/API.
3. **CTRI TRACKING** records registration status/reference/dates in VEDRAYA — there is **no** external CTRI API integration.
4. FHIR/CDISC are **prototype** surfaces — not certified. Exports are labeled **Study Data Export**, not SDTM/ADaM.
5. Consent versions are study-scoped catalogs; no e-signature / cryptographic consent attestation.
6. No MedDRA/WHODrug coding dictionaries.
7. No ABDM / HIS / EDC connectors.
8. Security hardening is prototype-grade: in-memory login rate limit; CSRF relies on SameSite (no double-submit token); no per-study ACL / full IDOR suite.
9. Audit hash chain is **GLOBAL application-level** integrity — privileged DB operators can still mutate rows; verification detects tampering after the fact. Not WORM / ALCOA+ attestation.
10. Milestone module is **read-oriented** (no dedicated milestone mutation API beyond seed/data already in DB).
11. Playwright E2E mutates the shared seeded database — re-run `npm run db:seed` in `server/` before Vitest if data collisions appear.
