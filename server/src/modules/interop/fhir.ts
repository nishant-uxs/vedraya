import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { participants, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";

export const fhirRouter = Router();

/**
 * FHIR-shaped read MVP — NOT a claim of full FHIR R4 conformance.
 * Returns JSON approximating ResearchStudy / ResearchSubject resources.
 */
fhirRouter.get(
  "/ResearchStudy/:id",
  authenticate,
  requirePermission("fhir:view"),
  async (req, res, next) => {
    try {
      const [study] = await db.select().from(studies).where(eq(studies.id, req.params.id)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "ResearchStudy not found");

      res.json({
        resourceType: "ResearchStudy",
        id: study.id,
        status: study.status === "archived" ? "completed" : "active",
        title: study.title,
        identifier: [{ system: "urn:vedraya:study", value: study.code }],
        phase: study.phase ? { text: study.phase } : undefined,
        description: `${study.therapeuticArea ?? "Ayurveda"} — synthetic CTMS record`,
        extension: [
          {
            url: "https://vedraya.local/fhir/StructureDefinition/enrollment",
            valueString: `${study.enrollmentCurrent}/${study.enrollmentTarget}`,
          },
        ],
        meta: {
          tag: [{ system: "https://vedraya.local/fhir", code: "PROTOTYPE" }],
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

fhirRouter.get(
  "/ResearchSubject/:id",
  authenticate,
  requirePermission("fhir:view"),
  async (req, res, next) => {
    try {
      const [p] = await db
        .select()
        .from(participants)
        .where(eq(participants.id, req.params.id))
        .limit(1);
      if (!p) throw new AppError(404, "NOT_FOUND", "ResearchSubject not found");

      res.json({
        resourceType: "ResearchSubject",
        id: p.id,
        status: p.status === "enrolled" ? "on-study" : p.status,
        identifier: [{ system: "urn:vedraya:subject", value: p.subjectCode }],
        study: { reference: `ResearchStudy/${p.studyId}` },
        meta: {
          tag: [{ system: "https://vedraya.local/fhir", code: "PROTOTYPE" }],
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
