import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  CSRF_HEADER,
  MONITOR_EMAIL,
  REGULATOR_EMAIL,
  applyApiSessionToContext,
  csrfFromStorage,
  loginViaApi,
  uiLoginAsAdmin,
} from "./helpers.js";

test.describe.configure({ mode: "serial" });

test.describe("Phase 4 — safety, coding, SDTM, FHIR, ACL", () => {
  let studyAyuId: string;
  let studyOtherId: string;
  let aeId: string;
  let meddraTermId: string;

  test.beforeEach(async ({ context, baseURL }, testInfo) => {
    if (testInfo.title.startsWith("1 —")) return;
    const api = await loginViaApi(baseURL!, ADMIN_EMAIL);
    await applyApiSessionToContext(context, api);
    await api.dispose();
  });

  test("1 — admin signs in via Command Center UI", async ({ page }) => {
    await uiLoginAsAdmin(page);
    await expect(page.getByText(/Signed in as/i)).toBeVisible();
  });

  test("2 — resolve AYU-024 and coding term", async ({ page }) => {
    const studies = await page.request.get("/api/v1/studies");
    expect(studies.ok()).toBeTruthy();
    const list = (await studies.json()) as { data: { id: string; code: string }[] };
    studyAyuId = list.data.find((s) => s.code === "AYU-024")!.id;
    studyOtherId = list.data.find((s) => s.code !== "AYU-024")!.id;

    const terms = await page.request.get("/api/v1/coding/terms?dictionary=MEDDRA_DEMO&q=headache");
    expect(terms.ok()).toBeTruthy();
    const tBody = (await terms.json()) as { data: { id: string }[] };
    meddraTermId = tBody.data[0].id;
  });

  test("3 — create AE and apply MedDRA demo coding", async ({ page }) => {
    const parts = await page.request.get("/api/v1/participants");
    const partBody = (await parts.json()) as { data: { id: string; studyId: string }[] };
    const participantId = partBody.data.find((p) => p.studyId === studyAyuId)?.id;

    const create = await page.request.post("/api/v1/adverse-events", {
      data: {
        studyId: studyAyuId,
        participantId,
        description: "E2E phase4 headache event",
        severity: "moderate",
      },
    });
    expect(create.status()).toBe(201);
    const created = (await create.json()) as { data: { id: string } };
    aeId = created.data.id;

    const apply = await page.request.post("/api/v1/coding/apply", {
      data: {
        entityType: "adverse_event",
        entityId: aeId,
        termId: meddraTermId,
        freeText: "E2E phase4 headache event",
      },
    });
    expect(apply.status()).toBe(201);

    const results = await page.request.get(
      `/api/v1/coding/results?entityType=adverse_event&entityId=${aeId}`,
    );
    expect(results.ok()).toBeTruthy();
    const rBody = (await results.json()) as { data: unknown[] };
    expect(rBody.data.length).toBeGreaterThan(0);
  });

  test("4 — SDTM AE export and FHIR R4 ResearchStudy", async ({ page }) => {
    const sdtm = await page.request.post("/api/v1/exports/sdtm/ae", {
      data: { studyId: studyAyuId },
    });
    expect(sdtm.status()).toBe(200);
    expect(sdtm.headers()["content-type"]).toMatch(/text\/csv/);
    const csv = await sdtm.text();
    expect(csv).toContain("STUDYID");

    const fhir = await page.request.get(`/api/v1/fhir/R4/ResearchStudy/${studyAyuId}`);
    expect(fhir.ok()).toBeTruthy();
    const bundle = (await fhir.json()) as { resourceType: string };
    expect(bundle.resourceType).toBe("ResearchStudy");
  });

  test("5 — monitor forbidden on second study", async ({ baseURL }) => {
    const monitor = await loginViaApi(baseURL!, MONITOR_EMAIL);
    const ok = await monitor.get(`/api/v1/studies/${studyAyuId}`);
    expect(ok.ok()).toBeTruthy();
    const forbidden = await monitor.get(`/api/v1/studies/${studyOtherId}`);
    expect(forbidden.status()).toBe(403);
    await monitor.dispose();
  });

  test("6 — regulator cannot apply coding", async ({ baseURL }) => {
    const reg = await loginViaApi(baseURL!, REGULATOR_EMAIL);
    const apply = await reg.post("/api/v1/coding/apply", {
      data: {
        entityType: "adverse_event",
        entityId: aeId,
        termId: meddraTermId,
        freeText: "blocked",
      },
    });
    expect(apply.status()).toBe(403);
    await reg.dispose();
  });

  test("7 — logout clears session", async ({ page, baseURL }) => {
    const state = await page.context().storageState();
    const csrf = csrfFromStorage(state.cookies);
    expect(csrf).toBeTruthy();

    const logout = await page.request.post("/api/v1/auth/logout", {
      headers: csrf ? { [CSRF_HEADER]: csrf } : {},
    });
    expect(logout.ok()).toBeTruthy();

    const me = await page.request.get("/api/v1/auth/me");
    expect(me.status()).toBe(401);

    const fresh = await loginViaApi(baseURL!, ADMIN_EMAIL);
    await fresh.dispose();
  });
});
