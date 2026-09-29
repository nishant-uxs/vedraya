import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { COOKIE as SESSION_COOKIE } from "./auth.js";
import { AppError } from "./errors.js";

export const CSRF_COOKIE = "vedraya_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** Issue a double-submit CSRF cookie (readable by SPA JS). */
export function setCsrfCookie(res: Response, token = randomBytes(24).toString("hex")) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return token;
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(CSRF_COOKIE, { path: "/" });
}

/**
 * Double-submit CSRF for cookie sessions.
 * Exempt: safe methods, login, health, and requests with no session cookie
 * (so unauthenticated mutations reach authenticate → 401, not CSRF 403).
 * SPA must send X-CSRF-Token matching vedraya_csrf cookie when sessioned.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();

  const path = req.path;
  const url = req.originalUrl ?? path;
  if (url.includes("/auth/login") || url.endsWith("/health")) return next();

  // No session → skip CSRF; route authenticate middleware returns 401.
  if (!req.cookies?.[SESSION_COOKIE]) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = (req.get(CSRF_HEADER) ?? "").trim();

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError(403, "CSRF_REJECTED", "CSRF token missing or invalid"));
  }
  next();
}
