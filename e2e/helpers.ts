import type { APIRequestContext, Page } from "@playwright/test";
import { request as playwrightRequest } from "@playwright/test";

export const DEMO_PASSWORD = "Vedraya!Demo1";
export const ADMIN_EMAIL = "admin@vedraya.demo";
export const REGULATOR_EMAIL = "regulator@vedraya.demo";

/** Unique uppercase code within API max lengths (studies/sites/investigators). */
export function uniqueCode(prefix: string, maxLen = 32): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const base = `${prefix}-${stamp}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return base.length <= maxLen ? base : base.slice(0, maxLen);
}

export function uniqueSubjectCode(): string {
  return uniqueCode("SUBJ", 64);
}

/**
 * Login via API and return a request context that carries the session cookie.
 * Uses the Vite dev server so paths match the SPA proxy (`/api` → backend).
 */
export async function loginViaApi(
  baseURL: string,
  email: string,
  password = DEMO_PASSWORD,
): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Accept: "application/json" },
  });
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  return ctx;
}

export async function gotoCommandCenter(page: Page): Promise<void> {
  await page.goto("/#command-center");
  await page.locator("#command-center").waitFor({ state: "visible" });
}

export async function uiLoginAsAdmin(page: Page): Promise<void> {
  await gotoCommandCenter(page);
  const form = page.locator("form.cmd__login");
  await form.waitFor({ state: "visible", timeout: 30_000 });
  await form.getByLabel("Demo account").selectOption(ADMIN_EMAIL);
  await form.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await form.getByRole("button", { name: "Sign in" }).click();
  await page.getByText(/Signed in as/i).waitFor({ state: "visible", timeout: 30_000 });
}
