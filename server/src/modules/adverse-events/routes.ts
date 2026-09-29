import { Router } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { adverseEvents, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess, filterByStudyScope, resolveStudyScope } from "../../middleware/studyAccess.js";
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
  causality: z.string().max(64).optional(),
  outcome: z.string().max(64).optional(),
  actionTaken: z.string().max(64).optional(),
  seriousnessCriteria: z.string().max(500).optional(),
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

const classifySchema = z.object({
  causality: z
    .enum(["related", "possibly_related", "unlikely", "not_related", "not_assessed"])
    .optional(),
  outcome: z
    .enum(["recovering", "recovered", "not_recovered", "fatal", "unknown"])
    .optional(),
  actionTaken: z
    .enum(["none", "dose_reduced", "drug_interrupted", "drug_withdrawn", "other"])
    .optional(),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  isSerious: z.boolean().optional(),
  seriousnessCriteria: z.string().max(500).optional(),
  onsetAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  reason: z.string().max(500).optional(),
});

const notifySchema = z.object({
  authorityNotifiedAt: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

const AE_TRANSITIONS: Record<string, string[]> = {
  reported: ["investigator_review", "safety_review", "closed"],
  investigator_review: ["safety_review", "escalated", "closed"],
  safety_review: ["escalated", "closed"],
  escalated: ["closed", "safety_review"],
  closed: [],
};

aeRouter.get("/", authenticate, requirePermission("ae:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
    const rows = await db.select().from(adverseEvents).orderBy(desc(adverseEvents.reportedAt));
    res.json({ data: filterByStudyScope(rows, scope) });
  } catch (err) {
    next(err);
  }
});

aeRouter.get("/kpis", authenticate, requirePermission("ae:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
    const base = db
      .select({
        open: sql<number>`count(*) filter (where ${adverseEvents.status} <> 'closed')::int`,
        serious: sql<number>`count(*) filter (where ${adverseEvents.isSerious} = true and ${adverseEvents.status} <> 'closed')::int`,
        escalated: sql<number>`count(*) filter (where ${adverseEvents.status} = 'escalated')::int`,
        pendingReview: sql<number>`count(*) filter (where ${adverseEvents.status} in ('reported','investigator_review','safety_review'))::int`,
        pendingCoding: sql<number>`count(*) filter (where ${adverseEvents.codingStatus} = 'pending')::int`,
        coded: sql<number>`count(*) filter (where ${adverseEvents.codingStatus} = 'coded')::int`,
        overdueReporting: sql<number>`count(*) filter (where ${adverseEvents.reportingDueAt} is not null and ${adverseEvents.authorityNotifiedAt} is null and ${adverseEvents.reportingDueAt} < now() and ${adverseEvents.status} <> 'closed')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(adverseEvents);

    const [agg] =
      scope === null
        ? await base
        : await base.where(inArray(adverseEvents.studyId, scope.length ? scope : ["00000000-0000-0000-0000-000000000000"]));

    res.json({
      data: {
        open: agg?.open ?? 0,
        serious: agg?.serious ?? 0,
        escalated: agg?.escalated ?? 0,
        pendingReview: agg?.pendingReview ?? 0,
        pendingCoding: agg?.pendingCoding ?? 0,
        coded: agg?.coded ?? 0,
        overdueReporting: agg?.overdueReporting ?? 0,
        total: agg?.total ?? 0,
        note: "Aggregate safety signal counts for leadership/PV — not a certified DSMB workspace",
      },
    });
  } catch (err) {
    next(err);
  }
});

aeRouter.get("/:id", authenticate, requirePermission("ae:view"), async (req, res, next) => {
  try {
    const [row] = await db
      .select()
      .from(adverseEvents)
      .where(eq(adverseEvents.id, req.params.id))
      .limit(1);
    if (!row) throw new AppError(404, "NOT_FOUND", "Adverse event not found");
    await assertStudyAccess(req.user!, row.studyId);
    res.json({ data: row });
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
      await assertStudyAccess(req.user!, body.studyId);
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const isSerious = body.isSerious ?? false;
      const reportedAt = new Date();
      // Demo SAE reporting clock: 24h from report — tracking aid, not NDCT-certified timeline.
      const reportingDueAt = isSerious
        ? new Date(reportedAt.getTime() + 24 * 60 * 60 * 1000)
        : null;
      const caseCode = `AE-${Date.now().toString(36).toUpperCase()}`;
      const [row] = await db
        .insert(adverseEvents)
        .values({
          caseCode,
          studyId: body.studyId,
          participantId: body.participantId,
          siteId: body.siteId,
          description: body.description,
          isSerious,
          severity: body.severity ?? "mild",
          onsetAt: body.onsetAt ? new Date(body.onsetAt) : null,
          causality: body.causality,
          outcome: body.outcome,
          actionTaken: body.actionTaken,
          seriousnessCriteria: body.seriousnessCriteria,
          codingStatus: "pending",
          reportedAt,
          reportingDueAt,
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
  "/:id/classify",
  authenticate,
  requirePermission("ae:update"),
  validateBody(classifySchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(adverseEvents)
        .where(eq(adverseEvents.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Adverse event not found");
      await assertStudyAccess(req.user!, prev.studyId);

      const body = req.body as z.infer<typeof classifySchema>;
      const [row] = await db
        .update(adverseEvents)
        .set({
          ...(body.causality !== undefined ? { causality: body.causality } : {}),
          ...(body.outcome !== undefined ? { outcome: body.outcome } : {}),
          ...(body.actionTaken !== undefined ? { actionTaken: body.actionTaken } : {}),
          ...(body.severity !== undefined ? { severity: body.severity } : {}),
          ...(body.isSerious !== undefined ? { isSerious: body.isSerious } : {}),
          ...(body.seriousnessCriteria !== undefined
            ? { seriousnessCriteria: body.seriousnessCriteria }
            : {}),
          ...(body.onsetAt !== undefined
            ? { onsetAt: body.onsetAt ? new Date(body.onsetAt) : null }
            : {}),
          ...(body.resolvedAt !== undefined
            ? { resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(adverseEvents.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "AE_CLASSIFY",
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
      await assertStudyAccess(req.user!, prev.studyId);

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

      const reportingDueAt =
        body.status === "escalated" && !prev.reportingDueAt
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : prev.reportingDueAt;

      const [row] = await db
        .update(adverseEvents)
        .set({
          status: body.status,
          isSerious: body.status === "escalated" ? true : prev.isSerious,
          reportingDueAt,
          resolvedAt: body.status === "closed" ? prev.resolvedAt ?? new Date() : prev.resolvedAt,
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

/** Mark authority notification for regulatory reporting timeline tracking. */
aeRouter.patch(
  "/:id/notify-authority",
  authenticate,
  requirePermission("ae:update"),
  validateBody(notifySchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(adverseEvents)
        .where(eq(adverseEvents.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Adverse event not found");
      await assertStudyAccess(req.user!, prev.studyId);

      const body = req.body as z.infer<typeof notifySchema>;
      const [row] = await db
        .update(adverseEvents)
        .set({
          authorityNotifiedAt: body.authorityNotifiedAt
            ? new Date(body.authorityNotifiedAt)
            : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(adverseEvents.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "AE_AUTHORITY_NOTIFIED",
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
