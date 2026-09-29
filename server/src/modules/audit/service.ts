import type { Request } from "express";
import { db } from "../../db/client.js";
import { auditEvents } from "../../db/schema.js";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
  actorUserId?: string | null;
  req?: Request;
};

/** Server-side only. Never accept audit payloads from clients. */
export async function writeAudit(input: AuditInput) {
  const meta = input.req
    ? {
        ip: input.req.ip,
        userAgent: input.req.get("user-agent"),
        path: input.req.path,
        method: input.req.method,
      }
    : undefined;

  await db.insert(auditEvents).values({
    actorUserId: input.actorUserId ?? input.req?.user?.id ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    previousState: input.previousState ?? null,
    newState: input.newState ?? null,
    reason: input.reason ?? null,
    requestMeta: meta ?? null,
  });
}
