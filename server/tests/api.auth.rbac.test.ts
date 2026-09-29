import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();
const agent = request.agent(app);

describe("auth + RBAC", () => {
  beforeAll(async () => {
    // health proves app boots; DB must already be migrated+seeded for these tests
    const health = await request(app).get("/api/v1/health");
    expect(health.status).toBe(200);
  });

  it("rejects unauthenticated study list", async () => {
    const res = await request(app).get("/api/v1/studies");
    expect(res.status).toBe(401);
  });

  it("logs in admin and returns permissions", async () => {
    const res = await agent
      .post("/api/v1/auth/login")
      .send({ email: "admin@vedraya.demo", password: "Vedraya!Demo1" });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("admin@vedraya.demo");
    expect(res.body.data.permissions).toContain("study:create");
  });

  it("admin can list studies and kpis", async () => {
    const studies = await agent.get("/api/v1/studies");
    expect(studies.status).toBe(200);
    expect(studies.body.data.length).toBeGreaterThanOrEqual(5);

    const kpis = await agent.get("/api/v1/studies/kpis");
    expect(kpis.status).toBe(200);
    expect(kpis.body.data.source).toBe("postgresql");
    expect(kpis.body.data.totalStudies).toBeGreaterThanOrEqual(5);
  });

  it("regulator cannot create studies", async () => {
    const reg = request.agent(app);
    const login = await reg
      .post("/api/v1/auth/login")
      .send({ email: "regulator@vedraya.demo", password: "Vedraya!Demo1" });
    expect(login.status).toBe(200);

    const create = await reg.post("/api/v1/studies").send({
      code: "FORBID-1",
      title: "Should Fail",
    });
    expect(create.status).toBe(403);
  });

  it("audit events are readable and not deletable via API", async () => {
    const events = await agent.get("/api/v1/audit-events?limit=5");
    expect(events.status).toBe(200);
    expect(Array.isArray(events.body.data)).toBe(true);

    const del = await agent.delete("/api/v1/audit-events/anything");
    expect([404, 405]).toContain(del.status);
  });
});

describe("sites + participants", () => {
  it("lists sites for admin session", async () => {
    const res = await agent.get("/api/v1/sites");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("lists participants for admin session", async () => {
    const res = await agent.get("/api/v1/participants");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
