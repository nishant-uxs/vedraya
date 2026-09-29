import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { ethicsCommittees, regulatorySubmissions, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess, filterByStudyScope, resolveStudyScope } from "../../middleware/studyAccess.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const regulatoryRouter = Router();

/**
 * Shared status machine for IEC / CTRI / other kinds.
 * CTRI uses "registered" as a terminal success state (tracking, not external CTRI integration).
 */
const REG_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["approved", "rejected", "registered"],
  approved: ["expired"],
  registered: ["expired"],
  rejected: [],
  expired: [],
};

const committeeSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(255),
  city: z.string().max(128).optional(),
});

const createSubmissionSchema = z.object({
  studyId: z.string().uuid(),
  kind: z.enum(["IEC", "CTRI", "DCGI", "NDCT", "OTHER"]).or(z.string().min(2).max(64)),
  ethicsCommitteeId: z.string().uuid().optional(),
  referenceNumber: z.string().max(128).optional(),
  status: z
    .enum(["draft", "submitted", "under_review", "approved", "rejected", "registered", "expired"])
    .optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "registered",
    "expired",
  ]),
  decision: z.string().max(64).optional(),
  referenceNumber: z.string().max(128).optional(),
  reason: z.string().max(500).optional(),
});

const ctriSchema = z.object({
  referenceNumber: z.string().min(3).max(128).optional(),
  status: z
    .enum(["draft", "submitted", "under_review", "registered", "rejected", "expired"])
    .optional(),
  submittedAt: z.string().datetime().optional(),
  decidedAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(500).optional(),
});

// --- Ethics committees ---

regulatoryRouter.get(
  "/ethics-committees",
  authenticate,
  requirePermission("regulatory:view"),
  async (_req, res, next) => {
    try {
      const rows = await db.select().from(ethicsCommittees).orderBy(desc(ethicsCommittees.updatedAt));
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);

regulatoryRouter.post(
  "/ethics-committees",
  authenticate,
  requirePermission("regulatory:manage"),
  validateBody(committeeSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof committeeSchema>;
      const [row] = await db
        .insert(ethicsCommittees)
        .values({
          code: body.code.toUpperCase(),
          name: body.name,
          city: body.city,
        })
        .returning();

      await writeAudit({
        req,
        action: "ETHICS_COMMITTEE_CREATED",
        entityType: "ethics_committee",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

regulatoryRouter.patch(
  "/ethics-committees/:id",
  authenticate,
  requirePermission("regulatory:manage"),
  validateBody(committeeSchema.partial()),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(ethicsCommittees)
        .where(eq(ethicsCommittees.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Ethics committee not found");

      const body = req.body as z.infer<typeof committeeSchema>;
      const [row] = await db
        .update(ethicsCommittees)
        .set({
          ...(body.code ? { code: body.code.toUpperCase() } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ethicsCommittees.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "ETHICS_COMMITTEE_UPDATED",
        entityType: "ethics_committee",
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

regulatoryRouter.get(
  "/ethics-committees/:id",
  authenticate,
  requirePermission("regulatory:view"),
  async (req, res, next) => {
    try {
      const [row] = await db
        .select()
        .from(ethicsCommittees)
        .where(eq(ethicsCommittees.id, req.params.id))
        .limit(1);
      if (!row) throw new AppError(404, "NOT_FOUND", "Ethics committee not found");
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

// --- Submissions + KPIs ---

regulatoryRouter.get("/kpis", authenticate, requirePermission("regulatory:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
    const rows = await db
      .select({
        studyId: regulatorySubmissions.studyId,
        kind: regulatorySubmissions.kind,
        status: regulatorySubmissions.status,
        dueAt: regulatorySubmissions.dueAt,
      })
      .from(regulatorySubmissions);
    const scoped = filterByStudyScope(rows, scope);
    const now = Date.now();
    const pendingReview = scoped.filter((r) =>
      ["submitted", "under_review"].includes(r.status),
    ).length;
    const overdue = scoped.filter(
      (r) =>
        r.dueAt &&
        r.dueAt.getTime() < now &&
        !["approved", "registered", "rejected", "expired"].includes(r.status),
    ).length;
    const ctriRegistered = scoped.filter(
      (r) => r.kind === "CTRI" && r.status === "registered",
    ).length;
    const ctriPending = scoped.filter(
      (r) => r.kind === "CTRI" && !["registered", "rejected", "expired"].includes(r.status),
    ).length;

    res.json({
      data: {
        pendingEthicsReviews: pendingReview,
        overdueSubmissions: overdue,
        ctriRegistered,
        ctriPending,
        total: scoped.length,
        source: "postgresql",
        computedAt: new Date().toISOString(),
        note: "CTRI TRACKING only — no external CTRI API integration",
      },
    });
  } catch (err) {
    next(err);
  }
});

regulatoryRouter.get("/submissions", authenticate, requirePermission("regulatory:view"), async (req, res, next) => {
  try {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const studyId = typeof req.query.studyId === "string" ? req.query.studyId : undefined;
    if (studyId) await assertStudyAccess(req.user!, studyId);
    const scope = await resolveStudyScope(req.user!);
    const filters = [];
    if (kind) filters.push(eq(regulatorySubmissions.kind, kind));
    if (status) filters.push(eq(regulatorySubmissions.status, status));
    if (studyId) filters.push(eq(regulatorySubmissions.studyId, studyId));

    const rows = await db
      .select({
        id: regulatorySubmissions.id,
        studyId: regulatorySubmissions.studyId,
        ethicsCommitteeId: regulatorySubmissions.ethicsCommitteeId,
        kind: regulatorySubmissions.kind,
        referenceNumber: regulatorySubmissions.referenceNumber,
        status: regulatorySubmissions.status,
        decision: regulatorySubmissions.decision,
        submittedAt: regulatorySubmissions.submittedAt,
        decidedAt: regulatorySubmissions.decidedAt,
        dueAt: regulatorySubmissions.dueAt,
        notes: regulatorySubmissions.notes,
        createdAt: regulatorySubmissions.createdAt,
        updatedAt: regulatorySubmissions.updatedAt,
        studyCode: studies.code,
        committeeName: ethicsCommittees.name,
      })
      .from(regulatorySubmissions)
      .leftJoin(studies, eq(regulatorySubmissions.studyId, studies.id))
      .leftJoin(ethicsCommittees, eq(regulatorySubmissions.ethicsCommitteeId, ethicsCommittees.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(regulatorySubmissions.updatedAt));

    res.json({ data: filterByStudyScope(rows, scope) });
  } catch (err) {
    next(err);
  }
});

regulatoryRouter.get(
  "/submissions/:id",
  authenticate,
  requirePermission("regulatory:view"),
  async (req, res, next) => {
    try {
      const [row] = await db
        .select()
        .from(regulatorySubmissions)
        .where(eq(regulatorySubmissions.id, req.params.id))
        .limit(1);
      if (!row) throw new AppError(404, "NOT_FOUND", "Submission not found");
      await assertStudyAccess(req.user!, row.studyId);
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

regulatoryRouter.post(
  "/submissions",
  authenticate,
  requirePermission("regulatory:manage"),
  validateBody(createSubmissionSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSubmissionSchema>;
      await assertStudyAccess(req.user!, body.studyId);
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      if (body.ethicsCommitteeId) {
        const [ec] = await db
          .select()
          .from(ethicsCommittees)
          .where(eq(ethicsCommittees.id, body.ethicsCommitteeId))
          .limit(1);
        if (!ec) throw new AppError(404, "NOT_FOUND", "Ethics committee not found");
      }

      const status = body.status ?? "draft";
      const [row] = await db
        .insert(regulatorySubmissions)
        .values({
          studyId: body.studyId,
          kind: body.kind,
          ethicsCommitteeId: body.ethicsCommitteeId,
          referenceNumber: body.referenceNumber,
          status,
          submittedAt: status === "submitted" || status === "under_review" ? new Date() : null,
          dueAt: body.dueAt ? new Date(body.dueAt) : null,
          notes: body.notes,
          createdBy: req.user!.id,
        })
        .returning();

      await writeAudit({
        req,
        action: "REGULATORY_SUBMISSION_CREATED",
        entityType: "regulatory_submission",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

regulatoryRouter.patch(
  "/submissions/:id/status",
  authenticate,
  requirePermission("regulatory:manage"),
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(regulatorySubmissions)
        .where(eq(regulatorySubmissions.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Submission not found");
      await assertStudyAccess(req.user!, prev.studyId);

      const body = req.body as z.infer<typeof statusSchema>;
      const allowed = REG_TRANSITIONS[prev.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new AppError(400, "INVALID_TRANSITION", "Invalid regulatory status transition", {
          from: prev.status,
          to: body.status,
          allowed,
        });
      }

      const terminalSuccess = ["approved", "registered", "rejected"].includes(body.status);
      const [row] = await db
        .update(regulatorySubmissions)
        .set({
          status: body.status,
          decision: body.decision ?? (terminalSuccess ? body.status : prev.decision),
          referenceNumber: body.referenceNumber ?? prev.referenceNumber,
          submittedAt:
            body.status === "submitted" && !prev.submittedAt ? new Date() : prev.submittedAt,
          decidedAt: terminalSuccess ? new Date() : prev.decidedAt,
          updatedAt: new Date(),
        })
        .where(eq(regulatorySubmissions.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "REGULATORY_STATUS_CHANGED",
        entityType: "regulatory_submission",
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

/** CTRI TRACKING update — not an external CTRI integration */
regulatoryRouter.patch(
  "/submissions/:id/ctri",
  authenticate,
  requirePermission("regulatory:manage"),
  validateBody(ctriSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(regulatorySubmissions)
        .where(eq(regulatorySubmissions.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Submission not found");
      await assertStudyAccess(req.user!, prev.studyId);
      if (prev.kind !== "CTRI") {
        throw new AppError(400, "VALIDATION", "CTRI tracking only applies to kind=CTRI records");
      }

      const body = req.body as z.infer<typeof ctriSchema>;
      if (body.status && body.status !== prev.status) {
        const allowed = REG_TRANSITIONS[prev.status] ?? [];
        if (!allowed.includes(body.status)) {
          throw new AppError(400, "INVALID_TRANSITION", "Invalid CTRI status transition", {
            from: prev.status,
            to: body.status,
            allowed,
          });
        }
      }

      const nextStatus = body.status ?? prev.status;
      const [row] = await db
        .update(regulatorySubmissions)
        .set({
          referenceNumber: body.referenceNumber ?? prev.referenceNumber,
          status: nextStatus,
          submittedAt: body.submittedAt ? new Date(body.submittedAt) : prev.submittedAt,
          decidedAt: body.decidedAt
            ? new Date(body.decidedAt)
            : nextStatus === "registered" || nextStatus === "rejected"
              ? new Date()
              : prev.decidedAt,
          dueAt: body.dueAt ? new Date(body.dueAt) : prev.dueAt,
          notes: body.notes ?? prev.notes,
          decision: nextStatus === "registered" || nextStatus === "rejected" ? nextStatus : prev.decision,
          updatedAt: new Date(),
        })
        .where(eq(regulatorySubmissions.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "CTRI_TRACKING_UPDATED",
        entityType: "regulatory_submission",
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
