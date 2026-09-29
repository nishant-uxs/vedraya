import { expect } from "vitest";
import request from "supertest";
import type { Test } from "supertest";
import type { createApp } from "../src/app.js";

export const DEMO_PASSWORD = "Vedraya!Demo1";
export const CSRF_HEADER = "x-csrf-token";

type App = ReturnType<typeof createApp>;
export type TestAgent = ReturnType<typeof request.agent>;

export function parseCsrfFromSetCookie(setCookie: string | string[] | undefined): string {
  const lines = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const line of lines) {
    const match = line.match(/vedraya_csrf=([^;]+)/);
    if (match) return match[1];
  }
  return "";
}

export async function loginAs(app: App, email: string) {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/v1/auth/login")
    .send({ email, password: DEMO_PASSWORD });
  expect(res.status).toBe(200);
  const csrf = parseCsrfFromSetCookie(res.headers["set-cookie"]);
  expect(csrf.length).toBeGreaterThan(0);
  return { agent, csrf };
}

/** Attach double-submit CSRF header for mutating supertest calls. */
export function withCsrf(agent: TestAgent, csrf: string) {
  const set = (req: Test) => req.set(CSRF_HEADER, csrf);
  return {
    post: (url: string) => set(agent.post(url)),
    patch: (url: string) => set(agent.patch(url)),
    delete: (url: string) => set(agent.delete(url)),
    put: (url: string) => set(agent.put(url)),
  };
}
