import { beforeAll, describe, expect, it } from "vitest";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { db } from "../src/db/client.js";
import { roles, sessions, userRoles, users } from "../src/db/schema.js";
import { verifyAuditChain } from "../src/modules/audit/service.js";
import { loginAs, withCsrf } from "./helpers.js";

const app = createApp();

describe("demo freeze — seed + ACL + integrity", () => {
  let admin: Awaited<ReturnType<typeof loginAs>>;
  let monitor: Awaited<ReturnType<typeof loginAs>>;
  let regulator: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    admin = await loginAs(app, "admin@vedraya.demo");
    monitor = await loginAs(app, "monitor@vedraya.demo");
    regulator = await loginAs(app, "regulator@vedraya.demo");
  });

  it("seed has no E2E pollution and KPIs match study list", async () => {
    const studies = await admin.agent.get("/api/v1/studies");
    expect(studies.status).toBe(200);
    const codes = studies.body.data.map((s: { code: string }) => s.code);
    expect(codes.some((c: string) => /^E2E-ST/.test(c))).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(["AYU-024", "AYU-031", "AYU-018", "NEU-007", "AYU-041"]));

    const kpis = await admin.agent.get("/api/v1/studies/kpis");
    expect(kpis.status).toBe(200);
    expect(kpis.body.data.totalStudies).toBe(studies.body.data.length);
    expect(kpis.body.data.source).toBe("postgresql");
  });

  it("audit chain verifies after seed", async () => {
    const v = await verifyAuditChain();
    expect(v.valid).toBe(true);
    expect(v.chainScope).toBe("GLOBAL");
  });

  it("monitor is scoped to AYU-024 only", async () => {
    const res = await monitor.agent.get("/api/v1/studies");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].code).toBe("AYU-024");
  });

  it("regulator mutation is forbidden (403)", async () => {
    const res = await withCsrf(regulator.agent, regulator.csrf)
      .post("/api/v1/studies")
      .send({ code: "REG-DENY", title: "Should be forbidden" });
    expect(res.status).toBe(403);
  });

  it("unauthenticated list is 401; missing CSRF on sessioned POST is 403", async () => {
    const { default: request } = await import("supertest");
    const unauth = await request(app).get("/api/v1/studies");
    expect(unauth.status).toBe(401);

    const noCsrf = await admin.agent.post("/api/v1/studies").send({
      code: "NOCSRFXX",
      title: "Missing CSRF should fail",
    });
    expect(noCsrf.status).toBe(403);
  });

  it("zero-membership user sees no studies", async () => {
    const email = `zero-member-${Date.now()}@vedraya.demo`;
    const passwordHash = await argon2.hash("Vedraya!Demo1", { type: argon2.argon2id });
    const [role] = await db.select().from(roles).where(eq(roles.key, "monitor")).limit(1);
    const [user] = await db
      .insert(users)
      .values({ email, name: "Zero Member", passwordHash })
      .returning();
    await db.insert(userRoles).values({ userId: user.id, roleId: role.id });

    try {
      const session = await loginAs(app, email);
      const res = await session.agent.get("/api/v1/studies");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    } finally {
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      await db.delete(userRoles).where(eq(userRoles.userId, user.id));
      // Soft-disable: LOGIN audit rows retain actor_user_id FK
      await db.update(users).set({ isActive: false, email: `disabled-${email}` }).where(eq(users.id, user.id));
    }
  });
});
