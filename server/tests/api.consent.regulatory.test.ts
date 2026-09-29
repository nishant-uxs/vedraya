import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { db } from "../src/db/client.js";
import { auditEvents, consents, regulatorySubmissions } from "../src/db/schema.js";
import { desc, eq } from "drizzle-orm";

const app = createApp();

async function loginAs(email: string) {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/v1/auth/login")
    .send({ email, password: "Vedraya!Demo1" });
  expect(res.status).toBe(200);
  return agent;
}

describe("consent + regulatory workflows", () => {
  let admin: ReturnType<typeof request.agent>;
  let regulator: ReturnType<typeof request.agent>;
  let studyId: string;
  let participantId: string;
  let versionId: string;

  beforeAll(async () => {
    admin = await loginAs("admin@vedraya.demo");
    regulator = await loginAs("regulator@vedraya.demo");

    const studies = await admin.get("/api/v1/studies");
    expect(studies.status).toBe(200);
    studyId = studies.body.data[0].id;

    const parts = await admin.get("/api/v1/participants");
    expect(parts.status).toBe(200);
    participantId = parts.body.data.find((p: { studyId: string }) => p.studyId === studyId)?.id;
    expect(participantId).toBeTruthy();

    const versions = await admin.get(`/api/v1/consents/versions?studyId=${studyId}`);
    expect(versions.status).toBe(200);
    versionId = versions.body.data[0].id;
    expect(versionId).toBeTruthy();
  });

  it("rejects unauthenticated consent list", async () => {
    const res = await request(app).get("/api/v1/consents");
    expect(res.status).toBe(401);
  });

  it("regulator cannot create consent", async () => {
    const res = await regulator.post("/api/v1/consents").send({
      studyId,
      participantId,
      versionId,
    });
    expect(res.status).toBe(403);
  });

  it("creates consent, transitions, withdraws, and audits", async () => {
    const freeParticipant = (
      await admin.get("/api/v1/participants")
    ).body.data.find(
      (p: { studyId: string; id: string }) =>
        p.studyId === studyId && p.id !== participantId,
    );
    expect(freeParticipant).toBeTruthy();

    const create = await admin.post("/api/v1/consents").send({
      studyId,
      participantId: freeParticipant.id,
      versionId,
    });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe("pending");
    const consentId = create.body.data.id as string;

    const [dbRow] = await db.select().from(consents).where(eq(consents.id, consentId)).limit(1);
    expect(dbRow?.status).toBe("pending");
    expect(dbRow?.versionId).toBe(versionId);

    const obtained = await admin
      .patch(`/api/v1/consents/${consentId}/status`)
      .send({ status: "obtained", reason: "Signed ICF" });
    expect(obtained.status).toBe(200);
    expect(obtained.body.data.status).toBe("obtained");

    const bad = await admin
      .patch(`/api/v1/consents/${consentId}/status`)
      .send({ status: "pending" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_TRANSITION");

    const withdraw = await admin
      .post(`/api/v1/consents/${consentId}/withdraw`)
      .send({ reason: "Subject withdrew" });
    expect(withdraw.status).toBe(200);
    expect(withdraw.body.data.status).toBe("withdrawn");
    expect(withdraw.body.data.withdrawnAt).toBeTruthy();

    const audits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.entityId, consentId))
      .orderBy(desc(auditEvents.occurredAt));
    const actions = audits.map((a) => a.action);
    expect(actions).toContain("CONSENT_CREATED");
    expect(actions).toContain("CONSENT_STATUS_CHANGED");
    expect(actions).toContain("CONSENT_WITHDRAWN");
  });

  it("regulator cannot create regulatory submission", async () => {
    const res = await regulator.post("/api/v1/regulatory/submissions").send({
      studyId,
      kind: "IEC",
    });
    expect(res.status).toBe(403);
  });

  it("creates ethics committee, submission, transitions, CTRI tracking, and audits", async () => {
    const ec = await admin.post("/api/v1/regulatory/ethics-committees").send({
      code: `IEC-T${Date.now().toString(36).slice(-4)}`,
      name: "Test Ethics Committee",
      city: "Pune",
    });
    expect(ec.status).toBe(201);

    const create = await admin.post("/api/v1/regulatory/submissions").send({
      studyId,
      kind: "IEC",
      ethicsCommitteeId: ec.body.data.id,
      dueAt: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe("draft");
    const subId = create.body.data.id as string;

    const submit = await admin
      .patch(`/api/v1/regulatory/submissions/${subId}/status`)
      .send({ status: "submitted" });
    expect(submit.status).toBe(200);

    const review = await admin
      .patch(`/api/v1/regulatory/submissions/${subId}/status`)
      .send({ status: "under_review" });
    expect(review.status).toBe(200);

    const approve = await admin
      .patch(`/api/v1/regulatory/submissions/${subId}/status`)
      .send({ status: "approved", decision: "approved" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe("approved");

    const invalid = await admin
      .patch(`/api/v1/regulatory/submissions/${subId}/status`)
      .send({ status: "draft" });
    expect(invalid.status).toBe(400);

    const ctri = await admin.post("/api/v1/regulatory/submissions").send({
      studyId,
      kind: "CTRI",
      status: "draft",
    });
    expect(ctri.status).toBe(201);
    const ctriId = ctri.body.data.id as string;

    await admin.patch(`/api/v1/regulatory/submissions/${ctriId}/status`).send({ status: "submitted" });
    await admin
      .patch(`/api/v1/regulatory/submissions/${ctriId}/status`)
      .send({ status: "under_review" });

    const track = await admin.patch(`/api/v1/regulatory/submissions/${ctriId}/ctri`).send({
      referenceNumber: "CTRI/2026/TEST/0099",
      status: "registered",
      reason: "Demo registration recorded",
    });
    expect(track.status).toBe(200);
    expect(track.body.data.referenceNumber).toBe("CTRI/2026/TEST/0099");
    expect(track.body.data.status).toBe("registered");

    const [dbCtri] = await db
      .select()
      .from(regulatorySubmissions)
      .where(eq(regulatorySubmissions.id, ctriId))
      .limit(1);
    expect(dbCtri?.status).toBe("registered");

    const audits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.entityId, ctriId));
    expect(audits.some((a) => a.action === "CTRI_TRACKING_UPDATED")).toBe(true);
    expect(audits.some((a) => a.action === "REGULATORY_SUBMISSION_CREATED")).toBe(true);
  });

  it("computes regulatory and consent alerts from DB", async () => {
    const alerts = await admin.get("/api/v1/alerts");
    expect(alerts.status).toBe(200);
    const types = alerts.body.data.map((a: { type: string }) => a.type);
    expect(types.some((t: string) => t === "regulatory_overdue" || t === "ethics_pending" || t === "consent_pending")).toBe(
      true,
    );
  });

  it("exposes consent and regulatory KPIs from postgres", async () => {
    const ck = await admin.get("/api/v1/consents/kpis");
    expect(ck.status).toBe(200);
    expect(ck.body.data.source).toBe("postgresql");
    expect(ck.body.data.total).toBeGreaterThanOrEqual(1);

    const rk = await admin.get("/api/v1/regulatory/kpis");
    expect(rk.status).toBe(200);
    expect(rk.body.data.source).toBe("postgresql");
    expect(rk.body.data.note).toMatch(/CTRI TRACKING/);
  });
});
