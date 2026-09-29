# SIH26046 — Final Requirements Traceability

**Source of truth:** Official SIH Problem Statement ID **26046** (Ministry of Ayush / AIIA), as provided in the Phase 6 workspace brief.

**Product:** VEDRAYA CTMS prototype  
**Last updated:** 2026-09-29 (Phase 6)

Statuses: `IMPLEMENTED` | `PARTIAL` | `PROTOTYPE` | `MOCKED` | `NOT IMPLEMENTED` | `NOT APPLICABLE`

`IMPLEMENTED` requires (where applicable): UI → API → auth → RBAC/ACL → validation → business logic → PostgreSQL → audit → automated test. Missing layers → `PARTIAL` / `PROTOTYPE`.

---

## Exact PS requirements extracted

### Functional / product
1. Real-time, cloud-based CTMS + monitoring dashboard  
2. Single role-based, auditable portfolio view  
3. Per-study lifecycle: protocol & IEC approval, CTRI registration, site activation, screening, enrolment & randomization against target, visit & protocol-deviation compliance, data-query & data-quality status, milestones/timelines, close-out  
4. Real-time KPIs with configurable alerts (e.g. enrolment lag, ethics/CTRI due, overdue monitoring visit)  
5. Pharmacovigilance: ADR/AE/SAE capture & routing against regulatory reporting timelines; MedDRA & WHODrug coding; aggregate safety signals for DSMB / leadership  
6. CDISC: CDASH (collection), SDTM (tabulation), ADaM (analysis); Define-XML export  
7. HL7 FHIR R4 interoperability with EDC, HIS, ABDM building blocks  
8. ALCOA+ data integrity + immutable time-stamped audit trail  
9. Strict RBAC: PI, study coordinator, monitor, Ethics Committee, pharmacovigilance, administration, read-only regulator  
10. Informed-consent management  
11. Electronic-signature and data-integrity controls consistent with GCP  
12. Export submission-ready SDTM / ADaM / Define-XML  
13. Tailored dashboards: Investigators, Ethics Committee, PV, institutional leadership  
14. Hosting: data-resident cloud, ISO/IEC 27001 & CERT-In norms  

### Compliance / legal (claims vs implementation)
15. GCP-ASU compliance  
16. ICMR National Ethical Guidelines alignment  
17. NDCT Rules 2019 where applicable  
18. CTRI requirements  
19. DPDP Act 2023 & 2025 Rules (consent, minimisation, encryption, residency)  

### Data / evaluation
20. Synthetic / de-identified development data  
21. Evaluable on: data accuracy & integrity; timeliness of safety & regulatory reporting; interoperability conformance; access-control & audit completeness  

### Delivery note from PS
22. Staged build is acceptable: core study-tracking + KPI MVP → EDC/FHIR + PV → full CDISC submission export & advanced analytics  

---

## Traceability matrix

| PS Requirement | VEDRAYA Implementation | Status | Evidence | Gap | Priority |
|---|---|---|---|---|---|
| Real-time cloud CTMS dashboard | Command Center + Express/Postgres API | **IMPLEMENTED** | CC UI, `/api/v1/*`, seed | Cloud hosting / CERT-In not productized | P2 |
| Role-based auditable portfolio | Studies list + KPIs + RBAC + audit | **IMPLEMENTED** | roles seed, ACL, audit | Zero-membership fixed Phase 6 | P0 |
| Protocol / IEC approval tracking | Milestones + regulatory IEC submissions | **PARTIAL** | milestones `ethics_approval`, regulatory kind IEC | No separate protocol-document workflow | P1 |
| CTRI registration tracking | Regulatory CTRI TRACKING + milestone | **PARTIAL** | `/regulatory/.../ctri` | No external CTRI API | P1 |
| Site activation | Sites + study_sites activatedAt | **IMPLEMENTED** | sites/studySites APIs | — | — |
| Screening / enrolment | Participants statuses screened/enrolled | **IMPLEMENTED** | participants module | Randomization not modeled | P1 |
| Randomization against target | Enrollment current vs target only | **PARTIAL** | studies.enrollment* | No randomization arm/IWRS | P1 |
| Visit compliance | Milestone type monitoring_visit | **PARTIAL** | milestones + overdue alerts | No visit schedule / eCRF visits | P1 |
| Protocol-deviation compliance | protocol_deviations table + Quality module | **PARTIAL** | Phase 6 API/UI | Not full CAPA | P1 |
| Data-query / data-quality | data_queries table + Quality module | **PARTIAL** | Phase 6 API/UI | Not full CDMS query mgmt | P1 |
| Study milestones / timelines / close-out | Milestones + study status → completed/archived | **IMPLEMENTED** | milestones, study transitions | — | — |
| Real-time KPIs | DB aggregations (studies/AE/consent/reg) | **IMPLEMENTED** | `/studies/kpis` etc. | — | — |
| Configurable alerts | Computed alerts (rules fixed in code) | **PARTIAL** | `/alerts` | Not user-configurable rule engine | P1 |
| Enrolment-lag alert | Computed when enroll << target & recruiting | **IMPLEMENTED** | alerts Phase 6 | — | — |
| Ethics / CTRI due alerts | Pending ethics + overdue regulatory | **IMPLEMENTED** | alerts | — | — |
| Overdue monitoring visit alert | Milestone overdue | **IMPLEMENTED** | alerts | — | — |
| AE/ADR/SAE capture & route | AE workflow + escalate | **IMPLEMENTED** | AE module | ADR label alias only | — |
| Regulatory reporting timelines | reportingDueAt / authorityNotifiedAt | **PARTIAL** | AE fields + overdue alert | Not jurisdiction-specific NDCT clocks | P1 |
| MedDRA coding | MEDDRA_DEMO dictionary | **PROTOTYPE** | coding module | Official MedDRA unavailable | — |
| WHODrug coding | WHODRUG_DEMO dictionary | **PROTOTYPE** | coding module | Official WHODrug unavailable | — |
| Aggregate safety signals (DSMB/leadership) | AE KPIs + overdue reporting counts | **PARTIAL** | AE kpis | No DSMB workspace | P2 |
| CDASH | — | **NOT IMPLEMENTED** | — | Collection standard | P2 |
| SDTM | SDTM-like AE CSV transform | **PROTOTYPE** | `/exports/sdtm/ae` | Not CDISC certified | — |
| ADaM | Interface/docs only | **PROTOTYPE** | docs | No analysis dataset | — |
| Define-XML | — | **NOT IMPLEMENTED** | — | Submission package | P2 |
| FHIR R4 | ResearchStudy / ResearchSubject reads | **PROTOTYPE** | `/fhir/R4/*` | Limited resources | — |
| EDC / HIS / ABDM interop | Adapter status NOT_CONNECTED | **NOT IMPLEMENTED** | `/interop/adapters` | External systems | — |
| ALCOA+ / immutable audit | Append-only API + GLOBAL SHA-256 chain | **PARTIAL** | audit verify | Not WORM; not legal ALCOA+ | P0 claim honesty |
| Strict RBAC (7 roles) | Seeded ROLE_DEFS + middleware | **IMPLEMENTED** | seed + tests | — | — |
| Study/resource ACL | memberships; admin+regulator global; others require membership | **IMPLEMENTED** | studyAccess Phase 6 | Catalogs sites/inv global | P2 |
| Informed consent | Versions + obtain/withdraw | **IMPLEMENTED** | consents module | — | — |
| Electronic signature | — | **NOT IMPLEMENTED** | — | eSign | P2 |
| GCP-ASU / ICMR / NDCT legal compliance | Process support only; NDCT as reg kind | **NOT IMPLEMENTED** (compliance claim) | regulatory kind NDCT | Certification absent | — |
| CTRI requirements (process) | Internal tracking | **PARTIAL** | CTRI TRACKING | External registry | — |
| DPDP legal compliance | Synthetic data + PRIVACY.md + consent | **PARTIAL** | docs | Encryption-at-rest/hosting not productized | P2 |
| ISO27001 / CERT-In hosting | Docs guidance only | **NOT IMPLEMENTED** | SECURITY.md | Ops/deployment | P3 |
| Tailored role dashboards | Permission-gated CC modules + role login | **PARTIAL** | CC | Not fully distinct layouts | P2 |
| Submission-ready export | CSV + SDTM-like AE | **PARTIAL** | exports | Not submission-ready CDISC | — |
| Synthetic / de-identified data | Seed synthetic only | **IMPLEMENTED** | seed | Re-seed before demo | P2 |
| Landing cinematic narrative | Marketing sections | **MOCKED** | landing sections | Must stay labeled conceptual | P2 |
| Evaluability (accuracy, timeliness, ACL, audit) | Vitest/Playwright + verify | **PARTIAL** | test suites | Interop conformance limited | — |

---

## Honest non-claims (PS language we will NOT assert as certified)

- GCP-ASU / ICMR / NDCT / DPDP **legal compliance** or certification  
- Official MedDRA / WHODrug  
- CDISC certified / submission-ready full suite  
- Connected ABDM / HIS / EDC  
- WORM / legal ALCOA+ attestation  
- External live CTRI integration  
