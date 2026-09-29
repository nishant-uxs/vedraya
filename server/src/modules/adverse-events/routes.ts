import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { adverseEvents, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const aeRouter = Router();

const createSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  description: z.string().min(5),
  isSerious: z.boolean().optional(),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  onsetAt: z.string().datetime().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "reported",
    "investigator_review",
    "safety_review",
    "escalated",
    "closed",
  ]),
  reason: z.string().max(500).optional(),
});

const AE_TRANSITIONS: Record<string, string[]> = {
  reported: ["investigator_review", "safety_review", "closed"],
  investigator_review: ["safety_review", "escalated", "closed"],
  safety_review: ["escalated", "closed"],
  escalated: ["closed", "safety_review"],
  closed: [],
};

aeRouter.get("/", authenticate, requirePermission("ae:view"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(adverseEvents).orderBy(desc(adverseEvents.reportedAt));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

aeRouter.get("/kpis", authenticate, requirePermission("ae:view"), async (_req, res, next) => {
  try {
    const [agg] = await db
      .select({
        open: sql<number>`count(*) filter (where ${adverseEvents.status} <> 'closed')::int`,
        serious: sql<number>`count(*) filter (where ${adverseEvents.isSerious} = true and ${adverseEvents.status} <> 'closed')::int`,
        escalated: sql<number>`count(*) filter (where ${adverseEvents.status} = 'escalated')::int`,
        pendingReview: sql<number>`count(*) filter (where ${adverseEvents.status} in ('reported','investigator_review','safety_review'))::int`,
      })
      .from(adverseEvents);
    res.json({ data: agg });
  } catch (err) {
    next(err);
  }
});

aeRouter.post(
  "/",
  authenticate,
  requirePermission("ae:create"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const caseCode = `AE-${Date.now().toString(36).toUpperCase()}`;
      const [row] = await db
        .insert(adverseEvents)
        .values({
          caseCode,
          studyId: body.studyId,
          participantId: body.participantId,
          siteId: body.siteId,
          description: body.description,
          isSerious: body.isSerious ?? false,
          severity: body.severity ?? "mild",
          onsetAt: body.onsetAt ? new Date(body.onsetAt) : null,
          reportedBy: req.user!.id,
          status: "reported",
        })
        .returning();

      await writeAudit({
        req,
        action: "AE_CREATE",
        entityType: "adverse_event",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

aeRouter.patch(
  "/:id/status",
  authenticate,
  requirePermission("ae:update"),
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(adverseEvents)
        .where(eq(adverseEvents.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Adverse event not found");

      const body = req.body as z.infer<typeof statusSchema>;
      if (body.status === "escalated" && !req.user!.permissions.includes("ae:escalate")) {
        throw new AppError(403, "FORBIDDEN", "Missing ae:escalate permission");
      }

      const allowed = AE_TRANSITIONS[prev.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new AppError(400, "INVALID_TRANSITION", "Invalid AE status transition", {
          from: prev.status,
          to: body.status,
          allowed,
        });
      }

      const [row] = await db
        .update(adverseEvents)
        .set({
          status: body.status,
          isSerious: body.status === "escalated" ? true : prev.isSerious,
          updatedAt: new Date(),
        })
        .where(eq(adverseEvents.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: body.status === "escalated" ? "AE_ESCALATE" : "AE_STATUS_CHANGE",
        entityType: "adverse_event",
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
