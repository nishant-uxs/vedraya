# Requirements Traceability — SIH26046 → VEDRAYA

Source: SIH26046 (Ministry of Ayush / AIIA CTMS).  
Baseline audit: ~5% technical implementation (marketing SPA).

Legend for **Target MVP column**: planned for prototype stages A–D (see ARCHITECTURE.md).

| ID | PS requirement | Current (evidence) | Target MVP | Replacement |
|----|----------------|--------------------|------------|-------------|
| A1 | Portfolio / CTMS view | UI ONLY — CommandCenter mock | A | Live studies + KPIs API |
| A2 | Study create/manage | NOT IMPLEMENTED | A | Study CRUD |
| B1 | Lifecycle tracking | MOCKED — TrialLifecycle cards | B | Status machine + history |
| C1 | Portfolio management | MOCKED — hardcoded STUDIES | A | Studies table |
| D1 | Real-time KPIs | MOCKED — MetricTicker literals | A | Aggregations from DB |
| E1 | Configurable alerts | MOCKED — ALERTS const | B | Computed alerts |
| F1 | Role-based access (7 roles) | UI ONLY — RoleSwitcher | A | Auth + permissions |
| G1 | Immutable audit / ALCOA+ foundation | MOCKED — 3 EVENTS | A | audit_events append-only |
| H1 | Pharmacovigilance | UI ONLY — SafetyIntelligence | C | AE module |
| I1 | AE/SAE capture & route | NOT IMPLEMENTED | C | AE workflow API |
| J1 | MedDRA / WHODrug | NOT IMPLEMENTED | Later / stub | Dictionary stub labeled PROTOTYPE |
| K1 | Regulatory tracking | MOCKED — ComplianceMatrix | C | regulatory_submissions |
| L1 | CTRI tracking | MOCKED — labels | B/C | Milestone type CTRI |
| M1 | Ethics Committee | MOCKED — role labels | C | ethics records |
| N1 | Informed consent | NOT IMPLEMENTED | C | consents |
| O1 | DPDP / privacy | NOT IMPLEMENTED | A foundations | minimization + docs |
| P–T | CDISC CDASH/SDTM/ADaM/Define-XML | UI ONLY | D CSV prototype | Mapping + CSV; Define-XML later |
| U1 | HL7 FHIR R4 | UI ONLY | D FHIR-shaped GETs | Document limits |
| V1 | ABDM | UI ONLY | Not in MVP | Document as planned |
| W1 | EDC / HIS interop | UI ONLY | Not in MVP | Planned |
| X1 | e-signature / integrity | MOCKED — “Hash verified” | Partial | Audit + optional hash; no false e-sign claim |
| Y1 | Export submission-ready | NOT IMPLEMENTED | D | CSV export + audit |
| Z1 | Role-specific dashboards | PARTIAL — module names | A/B | Permission-gated views |
| AA1 | Cloud ISO27001 / CERT-In host | NOT IMPLEMENTED | Docs only | Deployment guidance |
| AB1 | Synthetic / de-identified data | MOCKED static | A | Seed synthetic DB |
| AC1 | Submission readiness | NOT IMPLEMENTED | D partial | Export completeness flags |
| AD1 | Evaluable outcomes | NOT IMPLEMENTED | B | KPI accuracy tests |

## Seven roles (PS)

| Role | Seed account (planned) | Core permissions |
|------|------------------------|------------------|
| Principal Investigator | `pi@vedraya.demo` | study:view/update own, participant:*, ae:create |
| Study Coordinator | `coord@vedraya.demo` | study:view, site:*, participant:*, milestone:update |
| Monitor | `monitor@vedraya.demo` | study:view, site:view, ae:view, audit:view |
| Ethics Committee | `ethics@vedraya.demo` | ethics:*, study:view, consent:view |
| Pharmacovigilance | `pv@vedraya.demo` | ae:*, safety:review, study:view |
| Administration | `admin@vedraya.demo` | * (except audit delete) |
| Read-only Regulator | `regulator@vedraya.demo` | *:view only |

Exact permission strings live in `docs/RBAC.md` (created with auth implementation).

## Non-claims (presentation)

Until evidenced, **do not claim**:

- Full GCP / ALCOA+ / DPDP legal compliance  
- Complete FHIR R4 or CDISC suite  
- Live ABDM / EDC / HIS integration  
- MedDRA/WHODrug production coding  
- Real-time federated multi-node infrastructure  
