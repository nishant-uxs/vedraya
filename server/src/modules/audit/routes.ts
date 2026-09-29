import { Router } from "express";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { auditEvents, users } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { verifyAuditChain } from "./service.js";

export const auditRouter = Router();

auditRouter.get(
  "/verify",
  authenticate,
  requirePermission("audit:view"),
  async (_req, res, next) => {
    try {
      const result = await verifyAuditChain();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

auditRouter.get("/", authenticate, requirePermission("audit:view"), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const actorUserId = typeof req.query.actorUserId === "string" ? req.query.actorUserId : undefined;
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;

    const filters = [];
    if (action) filters.push(eq(auditEvents.action, action));
    if (entityType) filters.push(eq(auditEvents.entityType, entityType));
    if (actorUserId) filters.push(eq(auditEvents.actorUserId, actorUserId));
    if (from && !Number.isNaN(from.getTime())) filters.push(gte(auditEvents.occurredAt, from));
    if (to && !Number.isNaN(to.getTime())) filters.push(lte(auditEvents.occurredAt, to));

    const rows = await db
      .select({
        id: auditEvents.id,
        sequence: auditEvents.sequence,
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
        previousHash: auditEvents.previousHash,
        eventHash: auditEvents.eventHash,
      })
      .from(auditEvents)
      .leftJoin(users, eq(auditEvents.actorUserId, users.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(auditEvents.sequence))
      .limit(limit);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Explicitly reject mutation attempts on audit log (including admin via API)
auditRouter.all("/:id", authenticate, (req, res) => {
  if (req.params.id === "verify") {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
    return;
  }
  res.status(405).json({
    error: {
      code: "AUDIT_IMMUTABLE",
      message: "Audit events are append-only and cannot be modified via API",
    },
  });
});
