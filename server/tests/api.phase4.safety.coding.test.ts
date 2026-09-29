import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { desc, eq } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { db } from "../src/db/client.js";
import { auditEvents, codingTerms } from "../src/db/schema.js";
import { loginAs, withCsrf } from "./helpers.js";

const app = createApp();

describe("phase 4 — safety, coding, SDTM, FHIR, ACL, CSRF", () => {
  let admin: Awaited<ReturnType<typeof loginAs>>;
  let regulator: Awaited<ReturnType<typeof loginAs>>;
  let monitor: Awaited<ReturnType<typeof loginAs>>;
  let studyAyu: string;
  let studyOther: string;
  let meddraTermId: string;

  beforeAll(async () => {
    admin = await loginAs(app, "admin@vedraya.demo");
    regulator = await loginAs(app, "regulator@vedraya.demo");
    monitor = await loginAs(app, "monitor@vedraya.demo");

    const studies = await admin.agent.get("/api/v1/studies");
    expect(studies.status).toBe(200);
    const ayu = studies.body.data.find((s: { code: string }) => s.code === "AYU-024");
    const other = studies.body.data.find((s: { code: string }) => s.code !== "AYU-024");
    expect(ayu?.id).toBeTruthy();
    expect(other?.id).toBeTruthy();
    studyAyu = ayu.id;
    studyOther = other.id;

    const terms = await admin.agent.get("/api/v1/coding/terms?dictionary=MEDDRA_DEMO&q=headache");
    expect(terms.status).toBe(200);
    expect(terms.body.data.length).toBeGreaterThan(0);
    meddraTermId = terms.body.data[0].id;
  });

  it("CSRF rejects mutation without token", async () => {
    const res = await admin.agent.post("/api/v1/adverse-events").send({
      studyId: studyAyu,
      description: "CSRF probe event",
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_REJECTED");
  });

  it("creates AE, applies coding, and audits CODING_APPLIED", async () => {
    const parts = await admin.agent.get("/api/v1/participants");
    const participantId = parts.body.data.find((p: { studyId: string }) => p.studyId === studyAyu)?.id;
    expect(participantId).toBeTruthy();

    const create = await withCsrf(admin.agent, admin.csrf).post("/api/v1/adverse-events").send({
      studyId: studyAyu,
      participantId,
      description: "Phase4 coding test headache",
      severity: "mild",
    });
    expect(create.status).toBe(201);
    const aeId = create.body.data.id as string;

    const apply = await withCsrf(admin.agent, admin.csrf).post("/api/v1/coding/apply").send({
      entityType: "adverse_event",
      entityId: aeId,
      termId: meddraTermId,
      freeText: create.body.data.description,
    });
    expect(apply.status).toBe(201);
    expect(apply.body.data.preferredTerm).toBeTruthy();

    const results = await admin.agent.get(
      `/api/v1/coding/results?entityType=adverse_event&entityId=${aeId}`,
    );
    expect(results.status).toBe(200);
    expect(results.body.data.length).toBeGreaterThan(0);

    const audits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.entityId, aeId))
      .orderBy(desc(auditEvents.occurredAt));
    expect(audits.some((a) => a.action === "CODING_APPLIED")).toBe(true);
  });

  it("medication coding workflow", async () => {
    const aes = await admin.agent.get("/api/v1/adverse-events");
    const ae = aes.body.data.find((r: { studyId: string }) => r.studyId === studyAyu);
    expect(ae?.id).toBeTruthy();

    const medCreate = await withCsrf(admin.agent, admin.csrf).post("/api/v1/coding/medications").send({
      adverseEventId: ae.id,
      freeText: "Paracetamol 500mg",
    });
    expect(medCreate.status).toBe(201);
    const medId = medCreate.body.data.id as string;

    const whodrug = await admin.agent.get("/api/v1/coding/terms?dictionary=WHODRUG_DEMO&q=paracetamol");
    expect(whodrug.status).toBe(200);
    const termId = whodrug.body.data[0]?.id as string;
    expect(termId).toBeTruthy();

    const apply = await withCsrf(admin.agent, admin.csrf).post("/api/v1/coding/apply").send({
      entityType: "concomitant_medication",
      entityId: medId,
      termId,
      freeText: "Paracetamol 500mg",
    });
    expect(apply.status).toBe(201);

    const meds = await admin.agent.get(`/api/v1/coding/medications?adverseEventId=${ae.id}`);
    expect(meds.status).toBe(200);
    expect(meds.body.data.some((m: { id: string; codingStatus: string }) => m.id === medId && m.codingStatus === "coded")).toBe(
      true,
    );
  });

  it("regulator cannot apply coding", async () => {
    const [term] = await db.select().from(codingTerms).limit(1);
    const aes = await regulator.agent.get("/api/v1/adverse-events");
    const aeId = aes.body.data[0]?.id as string;
    expect(aeId).toBeTruthy();

    const res = await withCsrf(regulator.agent, regulator.csrf).post("/api/v1/coding/apply").send({
      entityType: "adverse_event",
      entityId: aeId,
      termId: term.id,
      freeText: "blocked",
    });
    expect(res.status).toBe(403);
  });

  it("SDTM AE export success path", async () => {
    const res = await withCsrf(admin.agent, admin.csrf)
      .post("/api/v1/exports/sdtm/ae")
      .send({ studyId: studyAyu });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("STUDYID");
    expect(res.headers["x-vedraya-export-id"]).toBeTruthy();
  });

  it("FHIR R4 ResearchStudy 200 and 404", async () => {
    const ok = await admin.agent.get(`/api/v1/fhir/R4/ResearchStudy/${studyAyu}`);
    expect(ok.status).toBe(200);
    expect(ok.body.resourceType).toBe("ResearchStudy");

    const missing = await admin.agent.get(
      `/api/v1/fhir/R4/ResearchStudy/00000000-0000-0000-0000-000000000099`,
    );
    expect(missing.status).toBe(404);
  });

  it("monitor study ACL: first study OK, second forbidden", async () => {
    const ok = await monitor.agent.get(`/api/v1/studies/${studyAyu}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.code).toBe("AYU-024");

    const forbidden = await monitor.agent.get(`/api/v1/studies/${studyOther}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("STUDY_FORBIDDEN");
  });

  it("monitor without coding:apply gets 403 on apply", async () => {
    const aes = await monitor.agent.get("/api/v1/adverse-events");
    const aeId = aes.body.data[0]?.id as string;
    expect(aeId).toBeTruthy();

    const res = await withCsrf(monitor.agent, monitor.csrf).post("/api/v1/coding/apply").send({
      entityType: "adverse_event",
      entityId: aeId,
      termId: meddraTermId,
      freeText: "blocked",
    });
    expect(res.status).toBe(403);
  });
});
