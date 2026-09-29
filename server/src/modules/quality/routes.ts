import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { dataQueries, protocolDeviations, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess, filterByStudyScope, resolveStudyScope } from "../../middleware/studyAccess.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const qualityRouter = Router();

const deviationSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  description: z.string().min(5).max(2000),
  severity: z.enum(["minor", "major", "critical"]).optional(),
});

const querySchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  question: z.string().min(5).max(2000),
});

const statusSchema = z.object({
  status: z.enum(["open", "under_review", "closed", "answered"]),
  reason: z.string().max(500).optional(),
});

qualityRouter.get(
  "/deviations",
  authenticate,
  requirePermission("study:view"),
  async (req, res, next) => {
    try {
      const scope = await resolveStudyScope(req.user!);
      const rows = await db.select().from(protocolDeviations).orderBy(desc(protocolDeviations.detectedAt));
      res.json({
        data: filterByStudyScope(rows, scope),
        meta: { note: "Protocol deviation tracking — operational partial (not full CAPA)" },
      });
    } catch (err) {
      next(err);
    }
  },
);

qualityRouter.post(
  "/deviations",
  authenticate,
  requirePermission("study:update"),
  validateBody(deviationSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof deviationSchema>;
      await assertStudyAccess(req.user!, body.studyId);
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const code = `PD-${Date.now().toString(36).toUpperCase()}`;
      const [row] = await db
        .insert(protocolDeviations)
        .values({
          code,
          studyId: body.studyId,
          participantId: body.participantId,
          siteId: body.siteId,
          description: body.description,
          severity: body.severity ?? "minor",
          status: "open",
          createdBy: req.user!.id,
        })
        .returning();

      await writeAudit({
        req,
        action: "PROTOCOL_DEVIATION_CREATED",
        entityType: "protocol_deviation",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

qualityRouter.patch(
  "/deviations/:id/status",
  authenticate,
  requirePermission("study:update"),
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(protocolDeviations)
        .where(eq(protocolDeviations.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Deviation not found");
      await assertStudyAccess(req.user!, prev.studyId);

      const body = req.body as z.infer<typeof statusSchema>;
      const status = body.status === "answered" ? "closed" : body.status;
      const [row] = await db
        .update(protocolDeviations)
        .set({ status, updatedAt: new Date() })
        .where(eq(protocolDeviations.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "PROTOCOL_DEVIATION_STATUS",
        entityType: "protocol_deviation",
        entityId: row.id,
        previousState: prev,
        newState: row,
        reason: body.reason,
      });

      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

qualityRouter.get("/queries", authenticate, requirePermission("study:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
    const rows = await db.select().from(dataQueries).orderBy(desc(dataQueries.raisedAt));
    res.json({
      data: filterByStudyScope(rows, scope),
      meta: { note: "Data query tracking — operational partial (not full EDC query mgmt)" },
    });
  } catch (err) {
    next(err);
  }
});

qualityRouter.post(
  "/queries",
  authenticate,
  requirePermission("study:update"),
  validateBody(querySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof querySchema>;
      await assertStudyAccess(req.user!, body.studyId);
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const code = `DQ-${Date.now().toString(36).toUpperCase()}`;
      const [row] = await db
        .insert(dataQueries)
        .values({
          code,
          studyId: body.studyId,
          participantId: body.participantId,
          question: body.question,
          status: "open",
          createdBy: req.user!.id,
        })
        .returning();

      await writeAudit({
        req,
        action: "DATA_QUERY_CREATED",
        entityType: "data_query",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

qualityRouter.patch(
  "/queries/:id/status",
  authenticate,
  requirePermission("study:update"),
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db.select().from(dataQueries).where(eq(dataQueries.id, req.params.id)).limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Query not found");
      await assertStudyAccess(req.user!, prev.studyId);

      const body = req.body as z.infer<typeof statusSchema>;
      const closed = body.status === "closed" || body.status === "answered";
      const [row] = await db
        .update(dataQueries)
        .set({
          status: body.status === "answered" ? "answered" : body.status,
          closedAt: closed ? new Date() : prev.closedAt,
          updatedAt: new Date(),
        })
        .where(eq(dataQueries.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "DATA_QUERY_STATUS",
        entityType: "data_query",
        entityId: row.id,
        previousState: prev,
        newState: row,
        reason: body.reason,
      });

      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);
