# Limitations

1. Marketing landing sections remain **static narrative** (intentionally).
2. **MedDRA / WHODrug**: synthetic `MEDDRA_DEMO` / `WHODRUG_DEMO` only — **not** official licensed dictionaries. UI must say “MedDRA-compatible / WHODrug-compatible coding prototype”.
3. **SDTM-like AE** export is a transformation prototype with validation — **not** CDISC certified. **ADaM** is PARTIAL (no analysis dataset).
4. **FHIR R4**: ResearchStudy / ResearchSubject prototype reads — **not** certified.
5. **ABDM / HIS / EDC**: adapter shells only — status **PLANNED / NOT CONNECTED**. Never show fake CONNECTED.
6. **CTRI TRACKING** is internal status tracking — no external CTRI API.
7. Study ACL: users with memberships are restricted; users with zero memberships remain globally scoped (backward compatible). Administration bypasses.
8. Rate limiter defaults to **in-memory**; set `RATE_LIMIT_STORE=db` for DB-backed buckets.
9. CSRF uses double-submit cookies — still not a full browser anti-forgery suite for cross-site SPA splits.
10. Audit hash chain is application-level GLOBAL integrity — not WORM storage / ALCOA+ attestation.
11. Playwright mutates shared seed DB — re-seed before Vitest if collisions appear.
