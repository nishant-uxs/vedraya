import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  ADMIN_EMAIL,
  REGULATOR_EMAIL,
  applyApiSessionToContext,
  gotoCommandCenter,
  loginViaApi,
  uiLoginAsAdmin,
  uniqueCode,
  uniqueSubjectCode,
} from "./helpers.js";

test.describe.configure({ mode: "serial" });

test.describe("CTMS critical path (admin)", () => {
  test.beforeEach(async ({ context, baseURL }, testInfo) => {
    if (testInfo.title.startsWith("1 —")) return;
    const api = await loginViaApi(baseURL!, ADMIN_EMAIL);
    await applyApiSessionToContext(context, api);
    await api.dispose();
  });
  let studyId: string;
  let studyCode: string;
  let siteId: string;
  let investigatorId: string;
  let participantId: string;
  let aeId: string;
  let consentId: string;
  let consentVersionId: string;
  let regulatorySubId: string;
  let ctriSubId: string;

  test("1 — admin signs in via Command Center UI", async ({ page }) => {
    await uiLoginAsAdmin(page);
    await expect(page.getByText(/Signed in as/i)).toBeVisible();
  });

  test("2 — dashboard KPIs load (API + overview UI)", async ({ page }) => {
    await gotoCommandCenter(page);
    await expect(page.getByText(/Signed in as/i)).toBeVisible();

    const kpis = await page.request.get("/api/v1/studies/kpis");
    expect(kpis.ok()).toBeTruthy();
    const body = (await kpis.json()) as { data: { source: string; totalStudies: number } };
    expect(body.data.source).toBe("postgresql");
    expect(body.data.totalStudies).toBeGreaterThanOrEqual(1);

    await expect(page.getByText("Total studies", { exact: true })).toBeVisible();
    await expect(page.locator(".dash__kpis").first()).toBeVisible();
  });

  test("3 — create study", async ({ page }) => {
    studyCode = uniqueCode("E2E-ST");
    const res = await page.request.post("/api/v1/studies", {
      data: {
        code: studyCode,
        title: `E2E study ${studyCode}`,
        phase: "II",
        enrollmentTarget: 10,
      },
    });
    expect(res.status()).toBe(201);
    const row = (await res.json()) as { data: { id: string; code: string } };
    studyId = row.data.id;
    expect(row.data.code).toBe(studyCode);
  });

  test("4 — study persists after reload", async ({ page }) => {
    const res = await page.request.get(`/api/v1/studies/${studyId}`);
    expect(res.ok()).toBeTruthy();
    const row = (await res.json()) as { data: { code: string; title: string } };
    expect(row.data.code).toBe(studyCode);
  });

  test("5 — create site and assign to study", async ({ page }) => {
    const siteRes = await page.request.post("/api/v1/sites", {
      data: {
        code: uniqueCode("E2E-SITE", 32),
        name: "E2E Clinical Site",
        city: "Mumbai",
        status: "active",
      },
    });
    expect(siteRes.status()).toBe(201);
    siteId = ((await siteRes.json()) as { data: { id: string } }).data.id;

    const assign = await page.request.post("/api/v1/sites/assign", {
      data: { studyId, siteId, status: "active" },
    });
    expect(assign.status()).toBe(201);
  });

  test("6 — create investigator and assign to study", async ({ page }) => {
    const invRes = await page.request.post("/api/v1/investigators", {
      data: {
        code: uniqueCode("E2E-INV", 32),
        displayName: "Dr. E2E Investigator",
        specialty: "Oncology",
      },
    });
    expect(invRes.status()).toBe(201);
    investigatorId = ((await invRes.json()) as { data: { id: string } }).data.id;

    const assign = await page.request.post("/api/v1/investigators/assign", {
      data: { studyId, investigatorId, roleTitle: "Principal Investigator" },
    });
    expect(assign.status()).toBe(201);
  });

  test("7 — enroll participant", async ({ page }) => {
    const subjectCode = uniqueSubjectCode();
    const res = await page.request.post("/api/v1/participants", {
      data: {
        subjectCode,
        studyId,
        siteId,
        status: "enrolled",
      },
    });
    expect(res.status()).toBe(201);
    const row = (await res.json()) as { data: { id: string; status: string } };
    participantId = row.data.id;
    expect(row.data.status).toBe("enrolled");
  });

  test("8 — create adverse event", async ({ page }) => {
    const res = await page.request.post("/api/v1/adverse-events", {
      data: {
        studyId,
        participantId,
        siteId,
        description: "E2E test adverse event — mild headache",
        isSerious: true,
        severity: "moderate",
      },
    });
    expect(res.status()).toBe(201);
    aeId = ((await res.json()) as { data: { id: string; status: string } }).data.id;
  });

  test("9 — escalate AE to SAE (escalated status)", async ({ page }) => {
    for (const status of ["investigator_review", "safety_review", "escalated"] as const) {
      const res = await page.request.patch(`/api/v1/adverse-events/${aeId}/status`, {
        data: { status, reason: `E2E transition to ${status}` },
      });
      expect(res.ok()).toBeTruthy();
    }
    const check = await page.request.get("/api/v1/adverse-events");
    expect(check.ok()).toBeTruthy();
    const list = (await check.json()) as { data: Array<{ id: string; status: string }> };
    const ae = list.data.find((r) => r.id === aeId);
    expect(ae?.status).toBe("escalated");
  });

  test("10 — create consent version and consent record", async ({ page }) => {
    const ver = await page.request.post("/api/v1/consents/versions", {
      data: {
        studyId,
        versionLabel: "v1.0-e2e",
        title: "E2E ICF",
      },
    });
    expect(ver.status()).toBe(201);
    consentVersionId = ((await ver.json()) as { data: { id: string } }).data.id;

    const create = await page.request.post("/api/v1/consents", {
      data: { studyId, participantId, versionId: consentVersionId },
    });
    expect(create.status()).toBe(201);
    const created = (await create.json()) as { data: { id: string; status: string } };
    consentId = created.data.id;
    expect(created.data.status).toBe("pending");
  });

  test("11 — withdraw consent", async ({ page }) => {
    await page.request
      .patch(`/api/v1/consents/${consentId}/status`, { data: { status: "obtained", reason: "Signed" } })
      .then((r) => expect(r.ok()).toBeTruthy());

    const withdraw = await page.request.post(`/api/v1/consents/${consentId}/withdraw`, {
      data: { reason: "E2E subject withdrawal" },
    });
    expect(withdraw.ok()).toBeTruthy();
    const body = (await withdraw.json()) as { data: { status: string } };
    expect(body.data.status).toBe("withdrawn");
  });

  test("12 — regulatory submission and CTRI tracking", async ({ page }) => {
    const ec = await page.request.post("/api/v1/regulatory/ethics-committees", {
      data: {
        code: uniqueCode("IEC", 32),
        name: "E2E Ethics Committee",
        city: "Pune",
      },
    });
    expect(ec.status()).toBe(201);
    const ecId = ((await ec.json()) as { data: { id: string } }).data.id;

    const sub = await page.request.post("/api/v1/regulatory/submissions", {
      data: {
        studyId,
        kind: "IEC",
        ethicsCommitteeId: ecId,
      },
    });
    expect(sub.status()).toBe(201);
    regulatorySubId = ((await sub.json()) as { data: { id: string } }).data.id;

    await page.request
      .patch(`/api/v1/regulatory/submissions/${regulatorySubId}/status`, { data: { status: "submitted" } })
      .then((r) => expect(r.ok()).toBeTruthy());

    const ctri = await page.request.post("/api/v1/regulatory/submissions", {
      data: { studyId, kind: "CTRI", status: "draft" },
    });
    expect(ctri.status()).toBe(201);
    ctriSubId = ((await ctri.json()) as { data: { id: string } }).data.id;

    await page.request
      .patch(`/api/v1/regulatory/submissions/${ctriSubId}/status`, { data: { status: "submitted" } })
      .then((r) => expect(r.ok()).toBeTruthy());
    await page.request
      .patch(`/api/v1/regulatory/submissions/${ctriSubId}/status`, { data: { status: "under_review" } })
      .then((r) => expect(r.ok()).toBeTruthy());

    const track = await page.request.patch(`/api/v1/regulatory/submissions/${ctriSubId}/ctri`, {
      data: {
        referenceNumber: `CTRI/E2E/${Date.now()}`,
        status: "registered",
        reason: "E2E CTRI registration",
      },
    });
    expect(track.ok()).toBeTruthy();
    const tracked = (await track.json()) as { data: { status: string } };
    expect(tracked.data.status).toBe("registered");
  });

  test("13 — alerts and audit events include workflow activity", async ({ page }) => {
    const alerts = await page.request.get("/api/v1/alerts");
    expect(alerts.ok()).toBeTruthy();
    const alertsBody = (await alerts.json()) as { data: unknown[] };
    expect(Array.isArray(alertsBody.data)).toBe(true);

    const audit = await page.request.get("/api/v1/audit-events?limit=50");
    expect(audit.ok()).toBeTruthy();
    const events = (await audit.json()) as { data: Array<{ action: string; entityId: string | null }> };
    const actions = events.data.map((e) => e.action);
    expect(actions).toContain("STUDY_CREATE");
    expect(actions.some((a) => a.startsWith("CONSENT") || a === "CONSENT_WITHDRAWN")).toBe(true);
  });

  test("14 — verify audit hash chain", async ({ page }) => {
    const res = await page.request.get("/api/v1/audit-events/verify");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: { valid: boolean; chainScope: string; checkedEvents: number } };
    expect(body.data.valid).toBe(true);
    expect(body.data.chainScope).toBe("GLOBAL");
    expect(body.data.checkedEvents).toBeGreaterThan(0);
  });

  test("15 — export subjects CSV dataset", async ({ page }) => {
    const res = await page.request.post("/api/v1/exports", {
      data: { studyId, kind: "subjects_csv" },
    });
    expect(res.ok()).toBeTruthy();
    const csv = await res.text();
    expect(csv).toContain("USUBJID");
    expect(res.headers()["x-vedraya-export-id"]).toBeTruthy();
  });

  test("18 — admin signs out via UI", async ({ page }) => {
    await gotoCommandCenter(page);
    await expect(page.getByText(/Signed in as/i)).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.locator("form.cmd__login")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Regulator RBAC (read-only)", () => {
  let regulatorCtx: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    regulatorCtx = await loginViaApi(baseURL!, REGULATOR_EMAIL);
  });

  test.afterAll(async () => {
    await regulatorCtx.dispose();
  });

  test("regulator session is active", async () => {
    const me = await regulatorCtx.get("/api/v1/auth/me");
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as { data: { email: string } };
    expect(body.data.email).toBe(REGULATOR_EMAIL);
  });

  test("POST /studies returns 403", async () => {
    const res = await regulatorCtx.post("/api/v1/studies", {
      data: { code: uniqueCode("FORBID"), title: "Regulator forbidden study" },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /participants returns 403", async () => {
    const studies = await regulatorCtx.get("/api/v1/studies");
    expect(studies.ok()).toBeTruthy();
    const studyId = ((await studies.json()) as { data: Array<{ id: string }> }).data[0]?.id;
    expect(studyId).toBeTruthy();

    const res = await regulatorCtx.post("/api/v1/participants", {
      data: {
        subjectCode: uniqueSubjectCode(),
        studyId,
        status: "screened",
      },
    });
    expect(res.status()).toBe(403);
  });
});
