# Limitations

Be explicit in demos and pitches:

1. Marketing landing sections (lifecycle, risk story, compliance checklist, role tabs, copilot Q&A) still contain **static narrative/demo copy**.
2. Command Center KPIs/studies/alerts/AE/audit are **live** after login.
3. FHIR/CDISC are **prototype** surfaces — not certified implementations.
4. Consent/regulatory DB rows exist; dedicated operational UI/API coverage is incomplete.
5. No MedDRA/WHODrug coding dictionaries.
6. No ABDM / HIS / EDC connectors.
7. No production hardening (rate limits, CSRF tokens for cookie auth beyond SameSite, WAF, etc.) beyond basic helmet/cors/session cookies.
8. Tests cover auth/RBAC smoke paths — not full workflow Playwright suite yet.
