# Limitations

1. Marketing landing sections remain **conceptual / static narrative** (labeled). Live ops are Command Center only.
2. **MedDRA / WHODrug**: synthetic `MEDDRA_DEMO` / `WHODRUG_DEMO` only — not official licensed dictionaries.
3. **SDTM-like AE** export is a transformation prototype — **not** CDISC certified. **ADaM** interface only. **Define-XML** not implemented. **CDASH** not implemented.
4. **FHIR R4**: ResearchStudy / ResearchSubject prototype reads — not certified.
5. **ABDM / HIS / EDC**: adapter shells only — **NOT CONNECTED**.
6. **CTRI / NDCT TRACKING** are internal status records — no external CTRI / CDSCO filing integration.
7. Study ACL: administration + regulator unrestricted; other roles require `study_memberships` (zero memberships = no study access). Sites/investigators catalogs remain global.
8. Rate limiter defaults to **in-memory**; set `RATE_LIMIT_STORE=db` for multi-instance.
9. CSRF is double-submit cookies — prototype hardening, not a full anti-forgery suite.
10. Audit is **application-level append-only with SHA-256 hash-chain verification** — not WORM / legal ALCOA+ attestation.
11. Protocol deviations & data queries are **PARTIAL** operational tracking — not full CAPA / EDC query management.
12. AE reporting timelines are demo clocks (e.g. 24h SAE) — not certified NDCT jurisdiction clocks.
13. GCP-ASU / ICMR / DPDP / ISO27001 / CERT-In: process support & docs only — **no compliance certification claim**.
14. Electronic signature: **not implemented**.
15. Always `npm run db:setup` in `server/` before demo to clear E2E pollution and restore deterministic seed.
