# Limitations

Be explicit in demos and pitches:

1. Marketing landing sections (lifecycle, risk story, compliance checklist, role tabs, copilot Q&A) still contain **static narrative/demo copy**.
2. Command Center overview + Consent + Regulatory + Audit modules are **live** after login.
3. **CTRI TRACKING** records registration status/reference/dates in VEDRAYA — there is **no** external CTRI API integration.
4. FHIR/CDISC are **prototype** surfaces — not certified implementations.
5. Consent versions are study-scoped catalogs; no e-signature / cryptographic consent attestation.
6. No MedDRA/WHODrug coding dictionaries.
7. No ABDM / HIS / EDC connectors.
8. No production hardening (login rate limits, CSRF tokens beyond SameSite, WAF).
9. Automated API tests cover auth/RBAC/consent/regulatory — not a full Playwright suite yet.
10. Audit is append-only via API; not a cryptographic hash-chain / legal ALCOA+ attestation.
