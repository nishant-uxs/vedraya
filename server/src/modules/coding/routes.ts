import { Router } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  adverseEvents,
  codingDictionaries,
  codingResults,
  codingTerms,
  concomitantMedications,
} from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess } from "../../middleware/studyAccess.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const codingRouter = Router();

codingRouter.get(
  "/dictionaries",
  authenticate,
  requirePermission("coding:view"),
  async (_req, res, next) => {
    try {
      const rows = await db.select().from(codingDictionaries).orderBy(codingDictionaries.key);
      res.json({
        data: rows,
        meta: {
          note: "DEMO dictionaries only — MedDRA-compatible / WHODrug-compatible prototypes, not official licensed data",
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

codingRouter.get(
  "/terms",
  authenticate,
  requirePermission("coding:view"),
  async (req, res, next) => {
    try {
      const dictionaryKey =
        typeof req.query.dictionary === "string" ? req.query.dictionary : "MEDDRA_DEMO";
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const limit = Math.min(Number(req.query.limit ?? 20), 50);

      const [dict] = await db
        .select()
        .from(codingDictionaries)
        .where(eq(codingDictionaries.key, dictionaryKey))
        .limit(1);
      if (!dict) throw new AppError(404, "NOT_FOUND", "Dictionary not found");

      const filters = [eq(codingTerms.dictionaryId, dict.id)];
      if (q) {
        const pattern = `%${q}%`;
        filters.push(
          or(
            ilike(codingTerms.searchText, pattern),
            ilike(codingTerms.term, pattern),
            ilike(codingTerms.code, pattern),
            ilike(codingTerms.preferredTerm, pattern),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(codingTerms)
        .where(and(...filters))
        .orderBy(codingTerms.preferredTerm)
        .limit(limit);

      res.json({
        data: rows.map((t) => ({
          ...t,
          dictionaryKey: dict.key,
          dictionaryVersion: dict.version,
        })),
        meta: {
          dictionary: dict.key,
          version: dict.version,
          label: dict.label,
          note: dict.note,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

const applySchema = z.object({
  entityType: z.enum(["adverse_event", "concomitant_medication"]),
  entityId: z.string().uuid(),
  termId: z.string().uuid(),
  freeText: z.string().min(1).max(1000),
});

codingRouter.post(
  "/apply",
  authenticate,
  requirePermission("coding:apply"),
  validateBody(applySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof applySchema>;
      const [term] = await db.select().from(codingTerms).where(eq(codingTerms.id, body.termId)).limit(1);
      if (!term) throw new AppError(404, "NOT_FOUND", "Coding term not found");

      const [dict] = await db
        .select()
        .from(codingDictionaries)
        .where(eq(codingDictionaries.id, term.dictionaryId))
        .limit(1);
      if (!dict) throw new AppError(404, "NOT_FOUND", "Dictionary not found");

      let studyId: string | null = null;

      if (body.entityType === "adverse_event") {
        const [ae] = await db
          .select()
          .from(adverseEvents)
          .where(eq(adverseEvents.id, body.entityId))
          .limit(1);
        if (!ae) throw new AppError(404, "NOT_FOUND", "Adverse event not found");
        studyId = ae.studyId;
        await assertStudyAccess(req.user!, ae.studyId);
        if (dict.kind !== "meddra_demo") {
          throw new AppError(400, "INVALID_DICTIONARY", "AE coding requires MEDDRA_DEMO dictionary");
        }
        await db
          .update(adverseEvents)
          .set({ codingStatus: "coded", updatedAt: new Date() })
          .where(eq(adverseEvents.id, ae.id));
      } else {
        const [med] = await db
          .select()
          .from(concomitantMedications)
          .where(eq(concomitantMedications.id, body.entityId))
          .limit(1);
        if (!med) throw new AppError(404, "NOT_FOUND", "Medication not found");
        studyId = med.studyId;
        await assertStudyAccess(req.user!, med.studyId);
        if (dict.kind !== "whodrug_demo") {
          throw new AppError(400, "INVALID_DICTIONARY", "Medication coding requires WHODRUG_DEMO");
        }
        await db
          .update(concomitantMedications)
          .set({ codingStatus: "coded", updatedAt: new Date() })
          .where(eq(concomitantMedications.id, med.id));
      }

      const [row] = await db
        .insert(codingResults)
        .values({
          entityType: body.entityType,
          entityId: body.entityId,
          dictionaryId: dict.id,
          termId: term.id,
          freeText: body.freeText,
          codedBy: req.user!.id,
          status: "coded",
        })
        .returning();

      await writeAudit({
        req,
        action: "CODING_APPLIED",
        entityType: body.entityType,
        entityId: body.entityId,
        newState: {
          codingResultId: row.id,
          dictionary: dict.key,
          version: dict.version,
          code: term.code,
          preferredTerm: term.preferredTerm,
          studyId,
        },
      });

      res.status(201).json({
        data: {
          ...row,
          dictionaryKey: dict.key,
          dictionaryVersion: dict.version,
          code: term.code,
          preferredTerm: term.preferredTerm,
          systemOrganClass: term.systemOrganClass,
        },
        meta: { note: `${dict.label} — prototype coding, not official licensed dictionary` },
      });
    } catch (err) {
      next(err);
    }
  },
);

codingRouter.get(
  "/results",
  authenticate,
  requirePermission("coding:view"),
  async (req, res, next) => {
    try {
      const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
      const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
      const filters = [];
      if (entityType) filters.push(eq(codingResults.entityType, entityType));
      if (entityId) filters.push(eq(codingResults.entityId, entityId));

      const rows = await db
        .select({
          id: codingResults.id,
          entityType: codingResults.entityType,
          entityId: codingResults.entityId,
          freeText: codingResults.freeText,
          codedAt: codingResults.codedAt,
          status: codingResults.status,
          codedBy: codingResults.codedBy,
          dictionaryKey: codingDictionaries.key,
          dictionaryVersion: codingDictionaries.version,
          code: codingTerms.code,
          preferredTerm: codingTerms.preferredTerm,
          systemOrganClass: codingTerms.systemOrganClass,
        })
        .from(codingResults)
        .innerJoin(codingDictionaries, eq(codingResults.dictionaryId, codingDictionaries.id))
        .innerJoin(codingTerms, eq(codingResults.termId, codingTerms.id))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(codingResults.codedAt))
        .limit(100);

      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);

const medSchema = z.object({
  adverseEventId: z.string().uuid(),
  freeText: z.string().min(2).max(255),
  dose: z.string().max(128).optional(),
  route: z.string().max(64).optional(),
});

codingRouter.post(
  "/medications",
  authenticate,
  requirePermission("coding:apply"),
  validateBody(medSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof medSchema>;
      const [ae] = await db
        .select()
        .from(adverseEvents)
        .where(eq(adverseEvents.id, body.adverseEventId))
        .limit(1);
      if (!ae) throw new AppError(404, "NOT_FOUND", "Adverse event not found");
      await assertStudyAccess(req.user!, ae.studyId);

      const [row] = await db
        .insert(concomitantMedications)
        .values({
          adverseEventId: ae.id,
          studyId: ae.studyId,
          freeText: body.freeText,
          dose: body.dose,
          route: body.route,
          codingStatus: "pending",
        })
        .returning();

      await writeAudit({
        req,
        action: "MEDICATION_CREATE",
        entityType: "concomitant_medication",
        entityId: row.id,
        newState: { freeText: row.freeText, adverseEventId: ae.id, studyId: ae.studyId },
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

codingRouter.get(
  "/medications",
  authenticate,
  requirePermission("coding:view"),
  async (req, res, next) => {
    try {
      const aeId = typeof req.query.adverseEventId === "string" ? req.query.adverseEventId : undefined;
      const rows = await db
        .select()
        .from(concomitantMedications)
        .where(aeId ? eq(concomitantMedications.adverseEventId, aeId) : undefined)
        .orderBy(desc(concomitantMedications.createdAt));
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);
