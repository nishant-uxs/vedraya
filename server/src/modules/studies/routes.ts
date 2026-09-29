import { Router } from "express";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess, resolveStudyScope } from "../../middleware/studyAccess.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const studiesRouter = Router();

const createSchema = z.object({
  code: z.string().min(3).max(32),
  title: z.string().min(3).max(512),
  phase: z.string().max(16).optional(),
  sponsor: z.string().max(255).optional(),
  therapeuticArea: z.string().max(255).optional(),
  enrollmentTarget: z.number().int().nonnegative().optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z
    .enum(["draft", "setup", "active", "recruiting", "follow_up", "completed", "archived"])
    .optional(),
  enrollmentCurrent: z.number().int().nonnegative().optional(),
  reason: z.string().max(500).optional(),
});

const TRANSITIONS: Record<string, string[]> = {
  draft: ["setup", "archived"],
  setup: ["active", "recruiting", "archived"],
  active: ["recruiting", "follow_up", "completed", "archived"],
  recruiting: ["active", "follow_up", "completed", "archived"],
  follow_up: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

studiesRouter.get("/", authenticate, requirePermission("study:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
    const rows =
      scope === null
        ? await db.select().from(studies).orderBy(desc(studies.updatedAt))
        : await db
            .select()
            .from(studies)
            .where(inArray(studies.id, scope.length ? scope : ["00000000-0000-0000-0000-000000000000"]))
            .orderBy(desc(studies.updatedAt));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

studiesRouter.get("/kpis", authenticate, requirePermission("study:view"), async (_req, res, next) => {
  try {
    const [agg] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${studies.status} in ('active','recruiting','follow_up'))::int`,
        atRisk: sql<number>`count(*) filter (where ${studies.riskScore} >= 60 and ${studies.status} <> 'archived')::int`,
        completed: sql<number>`count(*) filter (where ${studies.status} = 'completed')::int`,
        highAlerts: sql<number>`count(*) filter (where ${studies.riskScore} >= 60 and ${studies.status} in ('active','recruiting'))::int`,
      })
      .from(studies);

    res.json({
      data: {
        totalStudies: agg?.total ?? 0,
        activeStudies: agg?.active ?? 0,
        atRiskStudies: agg?.atRisk ?? 0,
        completedStudies: agg?.completed ?? 0,
        openHighRisk: agg?.highAlerts ?? 0,
        source: "postgresql",
        computedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

studiesRouter.get("/:id", authenticate, requirePermission("study:view"), async (req, res, next) => {
  try {
    const [row] = await db.select().from(studies).where(eq(studies.id, req.params.id)).limit(1);
    if (!row) throw new AppError(404, "NOT_FOUND", "Study not found");
    await assertStudyAccess(req.user!, row.id);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

studiesRouter.post(
  "/",
  authenticate,
  requirePermission("study:create"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const [row] = await db
        .insert(studies)
        .values({
          code: body.code.toUpperCase(),
          title: body.title,
          phase: body.phase,
          sponsor: body.sponsor,
          therapeuticArea: body.therapeuticArea,
          enrollmentTarget: body.enrollmentTarget ?? 0,
          riskScore: body.riskScore ?? 0,
          createdBy: req.user!.id,
        })
        .returning();

      await writeAudit({
        req,
        action: "STUDY_CREATE",
        entityType: "study",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

studiesRouter.patch(
  "/:id",
  authenticate,
  requirePermission("study:update"),
  validateBody(updateSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db.select().from(studies).where(eq(studies.id, req.params.id)).limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Study not found");

      const body = req.body as z.infer<typeof updateSchema>;
      if (body.status && body.status !== prev.status) {
        const allowed = TRANSITIONS[prev.status] ?? [];
        if (!allowed.includes(body.status)) {
          throw new AppError(400, "INVALID_TRANSITION", "Invalid study status transition", {
            from: prev.status,
            to: body.status,
            allowed,
          });
        }
      }

      const { reason, ...fields } = body;
      const [row] = await db
        .update(studies)
        .set({ ...fields, code: fields.code?.toUpperCase(), updatedAt: new Date() })
        .where(eq(studies.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: body.status && body.status !== prev.status ? "STUDY_STATUS_CHANGE" : "STUDY_UPDATE",
        entityType: "study",
        entityId: row.id,
        previousState: prev,
        newState: row,
        reason,
      });

      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

studiesRouter.post(
  "/:id/archive",
  authenticate,
  requirePermission("study:archive"),
  async (req, res, next) => {
    try {
      const [prev] = await db.select().from(studies).where(eq(studies.id, req.params.id)).limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Study not found");
      if (prev.status === "archived") {
        throw new AppError(400, "ALREADY_ARCHIVED", "Study already archived");
      }
      const allowed = TRANSITIONS[prev.status] ?? [];
      if (!allowed.includes("archived")) {
        throw new AppError(400, "INVALID_TRANSITION", "Cannot archive from current status");
      }

      const [row] = await db
        .update(studies)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(studies.id, req.params.id), ne(studies.status, "archived")))
        .returning();

      await writeAudit({
        req,
        action: "STUDY_ARCHIVE",
        entityType: "study",
        entityId: row.id,
        previousState: prev,
        newState: row,
      });

      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);
