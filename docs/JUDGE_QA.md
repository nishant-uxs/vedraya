# Judge Q&A — VEDRAYA / SIH26046

Answers match the **current** implementation. Do not improvise beyond this sheet.

## 1. Is MedDRA official?

**No.** We use `MEDDRA_DEMO` — a MedDRA-compatible coding prototype with a synthetic demo dictionary. Not licensed MedDRA.

## 2. Is WHODrug official?

**No.** `WHODRUG_DEMO` only — WHODrug-compatible coding prototype. Not licensed WHODrug.

## 3. Is this CDISC compliant?

**No certification claim.** We provide an **SDTM-like AE transformation prototype** and CSV exports. CDASH, full SDTM, ADaM datasets, and Define-XML are not implemented.

## 4. Is ABDM connected?

**No.** Adapter status is **NOT CONNECTED**.

## 5. Is CTRI integrated?

**No external CTRI API.** We implement **CTRI TRACKING** (internal regulatory status records). Same honesty for NDCT tracking.

## 6. Is the audit WORM?

**No.** Application-level **append-only** audit trail with **GLOBAL SHA-256 hash-chain integrity verification** (tamper detection). Direct DB mutation is not prevented by WORM storage; verify can detect hash mismatches.

## 7. Is this ALCOA+ compliant?

**We do not claim legal ALCOA+ compliance.** The audit supports attributable, contemporaneous, original-ish snapshots and integrity checks as a prototype foundation.

## 8. How does RBAC work?

Seven seeded roles (PI, coordinator, monitor, ethics, PV, administration, regulator) with permission keys enforced by server middleware `requirePermission`. UI hiding is not authorization.

## 9. How is study-level isolation enforced?

Table `study_memberships`. Administration and regulator: unrestricted study scope. Other roles: only membership studies. **Zero memberships → empty study list (deny).** Enforced in API handlers via `resolveStudyScope` / `assertStudyAccess`.

## 10. What happens to unauthorized API requests?

- No session → **401**
- Session without permission → **403**
- Session without study membership for that resource → **403**
- Sessioned mutation without CSRF → **403**

## 11. Where is the data stored?

**PostgreSQL** via Drizzle ORM. Command Center shows `SOURCE postgresql` when live.

## 12. Does refresh preserve changes?

**Yes** for persisted mutations (studies, AE, consent, etc.). After create/update, refresh or re-login and data remains. Demo seed is restored with `npm run demo:seed`.

## 13. How does SAE reporting work?

AE workflow with status transitions; serious/escalated cases get a `reportingDueAt` clock (demo 24h). `authorityNotifiedAt` records notification. Overdue cases surface in computed alerts. **Not** a certified NDCT jurisdictional filing integration.

## 14. How are alerts generated?

Server computes alerts from DB state (overdue milestones, high risk, open SAE, pending consent/ethics, enrolment lag, SAE reporting overdue, open deviations/queries). Fixed rules in code — **not** end-user configurable yet.

## 15. What is currently prototype-only?

MedDRA/WHODrug demo coding; SDTM-like AE; ADaM placeholder; FHIR R4 ResearchStudy/Subject; quality deviations/queries (partial); interop adapters NOT_CONNECTED; landing cinematic narrative (MOCK/conceptual).

## 16. What would be required for production deployment?

Licensed dictionaries; full CDISC + Define-XML; real EDC/HIS/ABDM integration; external CTRI; WORM/attested audit; e-signature; hardened hosting (ISO27001/CERT-In); DPDP operational controls; user-configurable alerts; IWRS/randomization; full visit/eCRF; penetration testing and compliance assessment. Staged delivery is aligned with the PS.
