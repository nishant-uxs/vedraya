import { Router } from "express";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { auditEvents, users } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { eq } from "drizzle-orm";

export const auditRouter = Router();

auditRouter.get(
  "/",
  authenticate,
  requirePermission("audit:view"),
  async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const rows = await db
        .select({
          id: auditEvents.id,
          occurredAt: auditEvents.occurredAt,
          action: auditEvents.action,
          entityType: auditEvents.entityType,
          entityId: auditEvents.entityId,
          previousState: auditEvents.previousState,
          newState: auditEvents.newState,
          reason: auditEvents.reason,
          actorUserId: auditEvents.actorUserId,
          actorEmail: users.email,
          actorName: users.name,
        })
        .from(auditEvents)
        .leftJoin(users, eq(auditEvents.actorUserId, users.id))
        .orderBy(desc(auditEvents.occurredAt))
        .limit(limit);

      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);

// Explicitly reject mutation attempts on audit log
auditRouter.all("/:id", authenticate, (_req, res) => {
  res.status(405).json({
    error: {
      code: "AUDIT_IMMUTABLE",
      message: "Audit events are append-only and cannot be modified via API",
    },
  });
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().optional(),
});
