import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loginAs, withCsrf } from "./helpers.js";

const app = createApp();

describe("auth + RBAC", () => {
  let adminAgent: Awaited<ReturnType<typeof loginAs>>["agent"];
  let adminCsrf: string;

  beforeAll(async () => {
    const health = await request(app).get("/api/v1/health");
    expect(health.status).toBe(200);
    const admin = await loginAs(app, "admin@vedraya.demo");
    adminAgent = admin.agent;
    adminCsrf = admin.csrf;
  });

  it("rejects unauthenticated study list", async () => {
    const res = await request(app).get("/api/v1/studies");
    expect(res.status).toBe(401);
  });

  it("logs in admin and returns permissions", async () => {
    const fresh = await loginAs(app, "admin@vedraya.demo");
    expect(fresh.agent).toBeTruthy();
    const me = await fresh.agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("admin@vedraya.demo");
    expect(me.body.data.permissions).toContain("study:create");
  });

  it("admin can list studies and kpis", async () => {
    const studies = await adminAgent.get("/api/v1/studies");
    expect(studies.status).toBe(200);
    expect(studies.body.data.length).toBeGreaterThanOrEqual(5);

    const kpis = await adminAgent.get("/api/v1/studies/kpis");
    expect(kpis.status).toBe(200);
    expect(kpis.body.data.source).toBe("postgresql");
    expect(kpis.body.data.totalStudies).toBeGreaterThanOrEqual(5);
  });

  it("regulator cannot create studies", async () => {
    const reg = await loginAs(app, "regulator@vedraya.demo");
    const create = await withCsrf(reg.agent, reg.csrf).post("/api/v1/studies").send({
      code: "FORBID-1",
      title: "Should Fail",
    });
    expect(create.status).toBe(403);
  });

  it("audit events are readable and not deletable via API", async () => {
    const events = await adminAgent.get("/api/v1/audit-events?limit=5");
    expect(events.status).toBe(200);
    expect(Array.isArray(events.body.data)).toBe(true);

    const del = await withCsrf(adminAgent, adminCsrf).delete("/api/v1/audit-events/anything");
    expect([404, 405]).toContain(del.status);
  });
});

describe("sites + participants", () => {
  it("lists sites for admin session", async () => {
    const { agent } = await loginAs(app, "admin@vedraya.demo");
    const res = await agent.get("/api/v1/sites");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("lists participants for admin session", async () => {
    const { agent } = await loginAs(app, "admin@vedraya.demo");
    const res = await agent.get("/api/v1/participants");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
