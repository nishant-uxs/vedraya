import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loginAs, withCsrf } from "./helpers.js";

const app = createApp();

describe("phase 6 — quality + strict ACL + reporting", () => {
  let admin: Awaited<ReturnType<typeof loginAs>>;
  let pi: Awaited<ReturnType<typeof loginAs>>;
  let ayuId: string;
  let otherId: string;

  beforeAll(async () => {
    admin = await loginAs(app, "admin@vedraya.demo");
    pi = await loginAs(app, "pi@vedraya.demo");
    const studies = (await admin.agent.get("/api/v1/studies")).body.data as Array<{
      id: string;
      code: string;
    }>;
    ayuId = studies.find((s) => s.code === "AYU-024")!.id;
    otherId = studies.find((s) => s.code === "NEU-007" || s.code === "AYU-041")!.id;
  });

  it("PI is membership-scoped (not global)", async () => {
    const res = await pi.agent.get("/api/v1/studies");
    expect(res.status).toBe(200);
    const codes = res.body.data.map((s: { code: string }) => s.code);
    expect(codes).toContain("AYU-024");
    expect(codes).not.toContain("AYU-041");
  });

  it("PI cannot access unscoped study", async () => {
    const res = await pi.agent.get(`/api/v1/studies/${otherId}`);
    expect(res.status).toBe(403);
  });

  it("creates protocol deviation and data query with audit", async () => {
    const dev = await withCsrf(admin.agent, admin.csrf)
      .post("/api/v1/quality/deviations")
      .send({ studyId: ayuId, description: "Phase6 test visit window deviation", severity: "minor" });
    expect(dev.status).toBe(201);
    expect(dev.body.data.code).toMatch(/^PD-/);

    const q = await withCsrf(admin.agent, admin.csrf)
      .post("/api/v1/quality/queries")
      .send({ studyId: ayuId, question: "Phase6 test data query on CRF field" });
    expect(q.status).toBe(201);

    const list = await admin.agent.get("/api/v1/quality/deviations");
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("sets SAE reporting due and can mark authority notified", async () => {
    const ae = await withCsrf(admin.agent, admin.csrf)
      .post("/api/v1/adverse-events")
      .send({
        studyId: ayuId,
        description: "Phase6 SAE reporting clock test case",
        isSerious: true,
        severity: "severe",
      });
    expect(ae.status).toBe(201);
    expect(ae.body.data.reportingDueAt).toBeTruthy();

    const notified = await withCsrf(admin.agent, admin.csrf)
      .patch(`/api/v1/adverse-events/${ae.body.data.id}/notify-authority`)
      .send({ reason: "demo notify" });
    expect(notified.status).toBe(200);
    expect(notified.body.data.authorityNotifiedAt).toBeTruthy();
  });

  it("alerts include enrolment_lag or quality types when applicable", async () => {
    const alerts = await admin.agent.get("/api/v1/alerts");
    expect(alerts.status).toBe(200);
    const types = alerts.body.data.map((a: { type: string }) => a.type);
    expect(types.some((t: string) =>
      ["enrolment_lag", "protocol_deviation_open", "data_query_open", "sae_reporting_overdue"].includes(t),
    )).toBe(true);
  });
});
