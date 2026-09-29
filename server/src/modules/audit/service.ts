import { createHash, randomUUID } from "node:crypto";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../../db/client.js";
import { auditEvents } from "../../db/schema.js";

export const AUDIT_GENESIS_HASH = "0".repeat(64);
export const AUDIT_CHAIN_SCOPE = "GLOBAL" as const;

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

/** Deterministic JSON: sorted object keys, stable arrays, ISO dates. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortValue(obj[key]);
    }
    return out;
  }
  if (typeof value === "bigint") return value.toString();
  return value;
}

export function computeEventHash(payload: unknown, previousHash: string): string {
  const material = `${canonicalize(payload)}|${previousHash}`;
  return createHash("sha256").update(material, "utf8").digest("hex");
}

function buildHashPayload(row: {
  id: string;
  sequence: number;
  occurredAt: Date | string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  previousState: unknown;
  newState: unknown;
  reason: string | null;
  requestMeta: unknown;
}) {
  return {
    action: row.action,
    actorUserId: row.actorUserId,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    newState: row.newState ?? null,
    occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt,
    previousState: row.previousState ?? null,
    reason: row.reason ?? null,
    requestMeta: row.requestMeta ?? null,
    sequence: row.sequence,
  };
}

/** Normalize request meta so hash input matches JSONB round-trip (no undefined). */
function buildRequestMeta(req: Request) {
  return {
    ip: req.ip ?? null,
    method: req.method,
    path: req.path,
    userAgent: req.get("user-agent") ?? null,
  };
}

/** Server-side only. Never accept audit payloads from clients. GLOBAL hash chain. */
export async function writeAudit(input: AuditInput) {
  const meta = input.req ? buildRequestMeta(input.req) : null;

  const id = randomUUID();
  const occurredAt = new Date();
  const actorUserId = input.actorUserId ?? input.req?.user?.id ?? null;

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(88442201)`);

    const [last] = await tx
      .select({
        sequence: auditEvents.sequence,
        eventHash: auditEvents.eventHash,
      })
      .from(auditEvents)
      .orderBy(desc(auditEvents.sequence))
      .limit(1);

    const sequence = (last?.sequence ?? 0) + 1;
    const previousHash = last?.eventHash ?? AUDIT_GENESIS_HASH;

    const hashPayload = buildHashPayload({
      id,
      sequence,
      occurredAt,
      actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      previousState: input.previousState ?? null,
      newState: input.newState ?? null,
      reason: input.reason ?? null,
      requestMeta: meta,
    });

    const eventHash = computeEventHash(hashPayload, previousHash);

    const [row] = await tx
      .insert(auditEvents)
      .values({
        id,
        sequence,
        occurredAt,
        actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        previousState: input.previousState ?? null,
        newState: input.newState ?? null,
        reason: input.reason ?? null,
        requestMeta: meta,
        previousHash,
        eventHash,
      })
      .returning();

    return row;
  });
}

export type AuditVerifyResult = {
  valid: boolean;
  chainScope: typeof AUDIT_CHAIN_SCOPE;
  checkedEvents: number;
  firstInvalidEvent: string | null;
  reason: string | null;
  tip: string;
};

/** Verify GLOBAL audit hash chain integrity. */
export async function verifyAuditChain(): Promise<AuditVerifyResult> {
  const rows = await db.select().from(auditEvents).orderBy(asc(auditEvents.sequence));

  if (rows.length === 0) {
    return {
      valid: true,
      chainScope: AUDIT_CHAIN_SCOPE,
      checkedEvents: 0,
      firstInvalidEvent: null,
      reason: null,
      tip: "Empty chain is vacuously valid",
    };
  }

  let expectedPrev = AUDIT_GENESIS_HASH;
  let expectedSeq = 1;

  for (const row of rows) {
    if (row.sequence !== expectedSeq) {
      return {
        valid: false,
        chainScope: AUDIT_CHAIN_SCOPE,
        checkedEvents: expectedSeq - 1,
        firstInvalidEvent: row.id,
        reason: `Sequence gap/reorder: expected ${expectedSeq}, got ${row.sequence}`,
        tip: "Possible deleted or reordered audit event",
      };
    }
    if (row.previousHash !== expectedPrev) {
      return {
        valid: false,
        chainScope: AUDIT_CHAIN_SCOPE,
        checkedEvents: expectedSeq - 1,
        firstInvalidEvent: row.id,
        reason: `Broken previousHash at sequence ${row.sequence}`,
        tip: "Previous link does not match prior eventHash",
      };
    }

    const expectedHash = computeEventHash(
      buildHashPayload({
        id: row.id,
        sequence: row.sequence,
        occurredAt: row.occurredAt,
        actorUserId: row.actorUserId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        previousState: row.previousState,
        newState: row.newState,
        reason: row.reason,
        requestMeta: row.requestMeta,
      }),
      row.previousHash,
    );

    if (row.eventHash !== expectedHash) {
      return {
        valid: false,
        chainScope: AUDIT_CHAIN_SCOPE,
        checkedEvents: expectedSeq - 1,
        firstInvalidEvent: row.id,
        reason: `eventHash mismatch at sequence ${row.sequence}`,
        tip: "Payload or stored hash appears tampered",
      };
    }

    expectedPrev = row.eventHash;
    expectedSeq += 1;
  }

  return {
    valid: true,
    chainScope: AUDIT_CHAIN_SCOPE,
    checkedEvents: rows.length,
    firstInvalidEvent: null,
    reason: null,
    tip: "GLOBAL SHA-256 hash chain verified",
  };
}

/**
 * Rebuild GLOBAL chain hashes from stored payloads (admin/migration only).
 * Use after schema changes that affect canonicalize, or to repair mismatched hashes.
 */
export async function rebuildAuditChain() {
  const rows = await db.select().from(auditEvents).orderBy(asc(auditEvents.sequence), asc(auditEvents.occurredAt), asc(auditEvents.id));
  let previousHash = AUDIT_GENESIS_HASH;
  let sequence = 1;

  for (const row of rows) {
    const hashPayload = buildHashPayload({
      id: row.id,
      sequence,
      occurredAt: row.occurredAt,
      actorUserId: row.actorUserId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      previousState: row.previousState,
      newState: row.newState,
      reason: row.reason,
      requestMeta: row.requestMeta,
    });
    const eventHash = computeEventHash(hashPayload, previousHash);

    await db
      .update(auditEvents)
      .set({ sequence, previousHash, eventHash })
      .where(eq(auditEvents.id, row.id));

    previousHash = eventHash;
    sequence += 1;
  }
}

/** @deprecated Prefer rebuildAuditChain — skips rows that already have hashes. */
export async function backfillAuditChain() {
  const rows = await db.select().from(auditEvents).orderBy(asc(auditEvents.occurredAt), asc(auditEvents.id));
  let previousHash = AUDIT_GENESIS_HASH;
  let sequence = 1;

  for (const row of rows) {
    if (row.eventHash && row.previousHash && row.sequence) {
      previousHash = row.eventHash;
      sequence = row.sequence + 1;
      continue;
    }

    const hashPayload = buildHashPayload({
      id: row.id,
      sequence,
      occurredAt: row.occurredAt,
      actorUserId: row.actorUserId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      previousState: row.previousState,
      newState: row.newState,
      reason: row.reason,
      requestMeta: row.requestMeta,
    });
    const eventHash = computeEventHash(hashPayload, previousHash);

    await db
      .update(auditEvents)
      .set({ sequence, previousHash, eventHash })
      .where(eq(auditEvents.id, row.id));

    previousHash = eventHash;
    sequence += 1;
  }
}
