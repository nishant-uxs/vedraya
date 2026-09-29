import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { db } from "../src/db/client.js";
import { auditEvents } from "../src/db/schema.js";
import { computeEventHash, verifyAuditChain, writeAudit } from "../src/modules/audit/service.js";
import { loginAs, withCsrf } from "./helpers.js";

const app = createApp();

describe("audit hash chain integrity", () => {
  let admin: ReturnType<typeof request.agent>;
  let adminCsrf: string;

  beforeAll(async () => {
    const session = await loginAs(app, "admin@vedraya.demo");
    admin = session.agent;
    adminCsrf = session.csrf;
  });

  it("writeAudit appends sequenced hashed events", async () => {
    const row = await writeAudit({
      action: "TEST_CHAIN",
      entityType: "system",
      newState: { ok: true, z: 1, a: 2 },
      actorUserId: (await admin.get("/api/v1/auth/me")).body.data.id,
    });
    expect(row.sequence).toBeGreaterThan(0);
    expect(row.eventHash).toHaveLength(64);
    expect(row.previousHash).toHaveLength(64);
  });

  it("verify endpoint reports valid GLOBAL chain", async () => {
    const res = await admin.get("/api/v1/audit-events/verify");
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.chainScope).toBe("GLOBAL");
    expect(res.body.data.checkedEvents).toBeGreaterThan(0);
  });

  it("rejects audit mutation via API for admin", async () => {
    const list = await admin.get("/api/v1/audit-events?limit=1");
    const id = list.body.data[0].id;
    const patch = await withCsrf(admin, adminCsrf)
      .patch(`/api/v1/audit-events/${id}`)
      .send({ action: "HACKED" });
    expect(patch.status).toBe(405);
    const del = await withCsrf(admin, adminCsrf).delete(`/api/v1/audit-events/${id}`);
    expect(del.status).toBe(405);
  });

  it("rejects audit mutation via API for non-admin user", async () => {
    const regulator = await loginAs(app, "regulator@vedraya.demo");
    const list = await regulator.agent.get("/api/v1/audit-events?limit=1");
    expect(list.status).toBe(200);
    const id = list.body.data[0]?.id ?? "00000000-0000-0000-0000-000000000001";
    const patch = await withCsrf(regulator.agent, regulator.csrf)
      .patch(`/api/v1/audit-events/${id}`)
      .send({ action: "HACKED" });
    expect(patch.status).toBe(405);
    const del = await withCsrf(regulator.agent, regulator.csrf).delete(`/api/v1/audit-events/${id}`);
    expect(del.status).toBe(405);
  });

  it("detects tampered event payload", async () => {
    const [row] = await db.select().from(auditEvents).limit(1);
    expect(row).toBeTruthy();

    // Direct DB tamper (simulates privileged infra bypass of app API)
    await db
      .update(auditEvents)
      .set({ action: "TAMPERED_ACTION" })
      .where(eq(auditEvents.id, row.id));

    const result = await verifyAuditChain();
    expect(result.valid).toBe(false);
    expect(result.firstInvalidEvent).toBeTruthy();
    expect(result.reason).toMatch(/eventHash mismatch|Broken previousHash|Sequence/);

    // restore by recomputing hash for that row only is hard — re-seed chain tip via rewrite of action+hash
    // Restore original action and correct hash from previousHash
    const restoredHash = computeEventHash(
      {
        action: row.action,
        actorUserId: row.actorUserId,
        entityId: row.entityId,
        entityType: row.entityType,
        id: row.id,
        newState: row.newState ?? null,
        occurredAt: row.occurredAt.toISOString(),
        previousState: row.previousState ?? null,
        reason: row.reason ?? null,
        requestMeta: row.requestMeta ?? null,
        sequence: row.sequence,
      },
      row.previousHash,
    );
    await db
      .update(auditEvents)
      .set({ action: row.action, eventHash: restoredHash })
      .where(eq(auditEvents.id, row.id));

    const fixed = await verifyAuditChain();
    expect(fixed.valid).toBe(true);
  });

  it("canonicalize is order-independent for object keys", () => {
    const a = computeEventHash({ b: 1, a: 2 }, "00");
    const b = computeEventHash({ a: 2, b: 1 }, "00");
    expect(a).toBe(b);
    expect(createHash("sha256").update("x").digest("hex")).toHaveLength(64);
  });
});
