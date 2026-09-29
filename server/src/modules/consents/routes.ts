import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { consentVersions, consents, participants, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const consentsRouter = Router();

/** Existing domain enum: pending → obtained → withdrawn | expired */
const CONSENT_TRANSITIONS: Record<string, string[]> = {
  pending: ["obtained", "withdrawn", "expired"],
  obtained: ["withdrawn", "expired"],
  withdrawn: [],
  expired: [],
};

const createVersionSchema = z.object({
  studyId: z.string().uuid(),
  versionLabel: z.string().min(1).max(32),
  title: z.string().min(2).max(255),
  effectiveAt: z.string().datetime().optional(),
});

const createSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
  versionId: z.string().uuid().optional(),
  version: z.string().min(1).max(32).optional(),
  status: z.enum(["pending", "obtained"]).optional(),
});

const statusSchema = z.object({
  status: z.enum(["pending", "obtained", "withdrawn", "expired"]),
  reason: z.string().max(500).optional(),
});

consentsRouter.get("/kpis", authenticate, requirePermission("consent:view"), async (_req, res, next) => {
  try {
    const [agg] = await db
      .select({
        pending: sql<number>`count(*) filter (where ${consents.status} = 'pending')::int`,
        obtained: sql<number>`count(*) filter (where ${consents.status} = 'obtained')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consents.status} = 'withdrawn')::int`,
        expired: sql<number>`count(*) filter (where ${consents.status} = 'expired')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(consents);
    res.json({
      data: {
        pending: agg?.pending ?? 0,
        obtained: agg?.obtained ?? 0,
        withdrawn: agg?.withdrawn ?? 0,
        expired: agg?.expired ?? 0,
        total: agg?.total ?? 0,
        source: "postgresql",
        computedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

consentsRouter.get("/versions", authenticate, requirePermission("consent:view"), async (req, res, next) => {
  try {
    const studyId = typeof req.query.studyId === "string" ? req.query.studyId : undefined;
    const rows = studyId
      ? await db
          .select()
          .from(consentVersions)
          .where(eq(consentVersions.studyId, studyId))
          .orderBy(desc(consentVersions.createdAt))
      : await db.select().from(consentVersions).orderBy(desc(consentVersions.createdAt));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

consentsRouter.post(
  "/versions",
  authenticate,
  requirePermission("consent:create"),
  validateBody(createVersionSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createVersionSchema>;
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const [row] = await db
        .insert(consentVersions)
        .values({
          studyId: body.studyId,
          versionLabel: body.versionLabel,
          title: body.title,
          effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : null,
        })
        .returning();

      await writeAudit({
        req,
        action: "CONSENT_VERSION_CREATED",
        entityType: "consent_version",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

consentsRouter.get("/", authenticate, requirePermission("consent:view"), async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const studyId = typeof req.query.studyId === "string" ? req.query.studyId : undefined;
    const filters = [];
    if (status) filters.push(eq(consents.status, status as "pending" | "obtained" | "withdrawn" | "expired"));
    if (studyId) filters.push(eq(consents.studyId, studyId));

    const rows = await db
      .select({
        id: consents.id,
        studyId: consents.studyId,
        participantId: consents.participantId,
        version: consents.version,
        versionId: consents.versionId,
        status: consents.status,
        obtainedAt: consents.obtainedAt,
        withdrawnAt: consents.withdrawnAt,
        createdBy: consents.createdBy,
        createdAt: consents.createdAt,
        updatedAt: consents.updatedAt,
        studyCode: studies.code,
        subjectCode: participants.subjectCode,
        versionTitle: consentVersions.title,
      })
      .from(consents)
      .leftJoin(studies, eq(consents.studyId, studies.id))
      .leftJoin(participants, eq(consents.participantId, participants.id))
      .leftJoin(consentVersions, eq(consents.versionId, consentVersions.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(consents.updatedAt));

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

consentsRouter.get("/:id", authenticate, requirePermission("consent:view"), async (req, res, next) => {
  try {
    const [row] = await db
      .select({
        id: consents.id,
        studyId: consents.studyId,
        participantId: consents.participantId,
        version: consents.version,
        versionId: consents.versionId,
        status: consents.status,
        obtainedAt: consents.obtainedAt,
        withdrawnAt: consents.withdrawnAt,
        createdBy: consents.createdBy,
        createdAt: consents.createdAt,
        updatedAt: consents.updatedAt,
        studyCode: studies.code,
        subjectCode: participants.subjectCode,
        versionTitle: consentVersions.title,
      })
      .from(consents)
      .leftJoin(studies, eq(consents.studyId, studies.id))
      .leftJoin(participants, eq(consents.participantId, participants.id))
      .leftJoin(consentVersions, eq(consents.versionId, consentVersions.id))
      .where(eq(consents.id, req.params.id))
      .limit(1);
    if (!row) throw new AppError(404, "NOT_FOUND", "Consent not found");
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

consentsRouter.post(
  "/",
  authenticate,
  requirePermission("consent:create"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");
      const [participant] = await db
        .select()
        .from(participants)
        .where(eq(participants.id, body.participantId))
        .limit(1);
      if (!participant) throw new AppError(404, "NOT_FOUND", "Participant not found");
      if (participant.studyId !== body.studyId) {
        throw new AppError(400, "VALIDATION", "Participant does not belong to study");
      }

      let versionLabel = body.version;
      let versionId = body.versionId ?? null;
      if (body.versionId) {
        const [ver] = await db
          .select()
          .from(consentVersions)
          .where(eq(consentVersions.id, body.versionId))
          .limit(1);
        if (!ver) throw new AppError(404, "NOT_FOUND", "Consent version not found");
        if (ver.studyId !== body.studyId) {
          throw new AppError(400, "VALIDATION", "Consent version does not belong to study");
        }
        versionLabel = ver.versionLabel;
        versionId = ver.id;
      }
      if (!versionLabel) throw new AppError(400, "VALIDATION", "version or versionId required");

      const status = body.status ?? "pending";
      const [row] = await db
        .insert(consents)
        .values({
          studyId: body.studyId,
          participantId: body.participantId,
          version: versionLabel,
          versionId,
          status,
          obtainedAt: status === "obtained" ? new Date() : null,
          createdBy: req.user!.id,
        })
        .returning();

      await writeAudit({
        req,
        action: "CONSENT_CREATED",
        entityType: "consent",
        entityId: row.id,
        newState: row,
      });
      if (versionId) {
        await writeAudit({
          req,
          action: "CONSENT_VERSION_ASSOCIATED",
          entityType: "consent",
          entityId: row.id,
          newState: { versionId, version: versionLabel },
        });
      }

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

consentsRouter.patch(
  "/:id/status",
  authenticate,
  requirePermission("consent:update"),
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db.select().from(consents).where(eq(consents.id, req.params.id)).limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Consent not found");

      const body = req.body as z.infer<typeof statusSchema>;
      if (body.status === "withdrawn" && !req.user!.permissions.includes("consent:withdraw")) {
        throw new AppError(403, "FORBIDDEN", "Missing consent:withdraw permission");
      }

      const allowed = CONSENT_TRANSITIONS[prev.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new AppError(400, "INVALID_TRANSITION", "Invalid consent status transition", {
          from: prev.status,
          to: body.status,
          allowed,
        });
      }

      const [row] = await db
        .update(consents)
        .set({
          status: body.status,
          obtainedAt:
            body.status === "obtained" && !prev.obtainedAt ? new Date() : prev.obtainedAt,
          withdrawnAt: body.status === "withdrawn" ? new Date() : prev.withdrawnAt,
          updatedAt: new Date(),
        })
        .where(eq(consents.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: body.status === "withdrawn" ? "CONSENT_WITHDRAWN" : "CONSENT_STATUS_CHANGED",
        entityType: "consent",
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

/** Explicit withdraw shortcut — still requires consent:withdraw */
consentsRouter.post(
  "/:id/withdraw",
  authenticate,
  requirePermission("consent:withdraw"),
  validateBody(z.object({ reason: z.string().max(500).optional() })),
  async (req, res, next) => {
    try {
      const [prev] = await db.select().from(consents).where(eq(consents.id, req.params.id)).limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Consent not found");

      const allowed = CONSENT_TRANSITIONS[prev.status] ?? [];
      if (!allowed.includes("withdrawn")) {
        throw new AppError(400, "INVALID_TRANSITION", "Cannot withdraw from current status", {
          from: prev.status,
          allowed,
        });
      }

      const reason = (req.body as { reason?: string }).reason;
      const [row] = await db
        .update(consents)
        .set({
          status: "withdrawn",
          withdrawnAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(consents.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "CONSENT_WITHDRAWN",
        entityType: "consent",
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
