import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loginAs } from "./helpers.js";

const app = createApp();

describe("study ACL scoping (Phase 5 red-team)", () => {
  let admin: Awaited<ReturnType<typeof loginAs>>;
  let monitor: Awaited<ReturnType<typeof loginAs>>;
  let ayuId: string;
  let otherId: string;

  beforeAll(async () => {
    admin = await loginAs(app, "admin@vedraya.demo");
    monitor = await loginAs(app, "monitor@vedraya.demo");
    const studies = await admin.agent.get("/api/v1/studies");
    const list = studies.body.data as Array<{ id: string; code: string }>;
    const ayu = list.find((s) => s.code === "AYU-024");
    const other = list.find((s) => s.code !== "AYU-024");
    expect(ayu).toBeTruthy();
    expect(other).toBeTruthy();
    ayuId = ayu!.id;
    otherId = other!.id;
  });

  it("monitor can only list AYU-024 studies", async () => {
    const res = await monitor.agent.get("/api/v1/studies");
    expect(res.status).toBe(200);
    expect(res.body.data.every((s: { code: string }) => s.code === "AYU-024")).toBe(true);
  });

  it("monitor KPIs are scoped to membership", async () => {
    const res = await monitor.agent.get("/api/v1/studies/kpis");
    expect(res.status).toBe(200);
    expect(res.body.data.totalStudies).toBe(1);
  });

  it("monitor participants exclude other studies", async () => {
    const res = await monitor.agent.get("/api/v1/participants");
    expect(res.status).toBe(200);
    expect(res.body.data.every((p: { studyId: string }) => p.studyId === ayuId)).toBe(true);
  });

  it("monitor alerts exclude other studies", async () => {
    const res = await monitor.agent.get("/api/v1/alerts");
    expect(res.status).toBe(200);
    expect(res.body.data.every((a: { studyId: string }) => a.studyId === ayuId)).toBe(true);
  });

  it("monitor forbidden on other study detail", async () => {
    const res = await monitor.agent.get(`/api/v1/studies/${otherId}`);
    expect(res.status).toBe(403);
  });

  it("unauthenticated mutation returns 401 not CSRF 403", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app).post("/api/v1/studies").send({ code: "X", title: "Yyy" });
    expect(res.status).toBe(401);
  });

  it("invalid study uuid returns 400", async () => {
    const res = await admin.agent.get("/api/v1/studies/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID");
  });
});
