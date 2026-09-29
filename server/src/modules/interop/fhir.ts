import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { participants, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess } from "../../middleware/studyAccess.js";

export const fhirRouter = Router();

/**
 * FHIR R4–shaped read prototype — NOT certification or full R4 conformance.
 * Legacy paths preserved; R4-prefixed aliases added.
 */
async function researchStudyHandler(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  try {
    const [study] = await db.select().from(studies).where(eq(studies.id, req.params.id)).limit(1);
    if (!study) throw new AppError(404, "NOT_FOUND", "ResearchStudy not found");
    await assertStudyAccess(req.user!, study.id);

    const statusMap: Record<string, string> = {
      draft: "draft",
      setup: "active",
      active: "active",
      recruiting: "active",
      follow_up: "active",
      completed: "completed",
      archived: "completed",
    };

    res.json({
      resourceType: "ResearchStudy",
      id: study.id,
      meta: {
        versionId: "1",
        lastUpdated: study.updatedAt.toISOString(),
        tag: [
          { system: "https://vedraya.local/fhir", code: "PROTOTYPE" },
          { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "RESEARCH" },
        ],
        profile: ["http://hl7.org/fhir/StructureDefinition/ResearchStudy"],
      },
      identifier: [{ system: "urn:vedraya:study", value: study.code }],
      status: statusMap[study.status] ?? "active",
      title: study.title,
      phase: study.phase ? { text: study.phase } : undefined,
      description: `${study.therapeuticArea ?? "Ayurveda"} — synthetic CTMS ResearchStudy (FHIR R4 PROTOTYPE)`,
      sponsor: study.sponsor ? { display: study.sponsor } : undefined,
      extension: [
        {
          url: "https://vedraya.local/fhir/StructureDefinition/enrollment",
          valueString: `${study.enrollmentCurrent}/${study.enrollmentTarget}`,
        },
        {
          url: "https://vedraya.local/fhir/StructureDefinition/riskScore",
          valueInteger: study.riskScore,
        },
      ],
    });
  } catch (err) {
    next(err);
  }
}

async function researchSubjectHandler(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  try {
    const [p] = await db.select().from(participants).where(eq(participants.id, req.params.id)).limit(1);
    if (!p) throw new AppError(404, "NOT_FOUND", "ResearchSubject not found");
    await assertStudyAccess(req.user!, p.studyId);

    const statusMap: Record<string, string> = {
      screened: "screening",
      enrolled: "on-study",
      withdrawn: "withdrawn",
      completed: "off-study",
    };

    res.json({
      resourceType: "ResearchSubject",
      id: p.id,
      meta: {
        versionId: "1",
        lastUpdated: p.updatedAt.toISOString(),
        tag: [{ system: "https://vedraya.local/fhir", code: "PROTOTYPE" }],
        profile: ["http://hl7.org/fhir/StructureDefinition/ResearchSubject"],
      },
      identifier: [{ system: "urn:vedraya:subject", value: p.subjectCode }],
      status: statusMap[p.status] ?? p.status,
      study: { reference: `ResearchStudy/${p.studyId}` },
      period: p.enrolledAt
        ? { start: p.enrolledAt.toISOString() }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
}

fhirRouter.get("/ResearchStudy/:id", authenticate, requirePermission("fhir:view"), researchStudyHandler);
fhirRouter.get("/ResearchSubject/:id", authenticate, requirePermission("fhir:view"), researchSubjectHandler);
fhirRouter.get("/R4/ResearchStudy/:id", authenticate, requirePermission("fhir:view"), researchStudyHandler);
fhirRouter.get("/R4/ResearchSubject/:id", authenticate, requirePermission("fhir:view"), researchSubjectHandler);
