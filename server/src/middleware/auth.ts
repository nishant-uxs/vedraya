import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { and, eq, gt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/client.js";
import {
  permissions,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
} from "../db/schema.js";
import { AppError } from "./errors.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

const COOKIE = "vedraya_sid";
const SESSION_DAYS = 7;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function loadUserAuth(userId: string): Promise<AuthUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.isActive) return null;

  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const roleKeys = roleRows.map((r) => r.key);
  const permRows =
    roleKeys.length === 0
      ? []
      : await db
          .select({ key: permissions.key })
          .from(userRoles)
          .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(userRoles.userId, userId));

  const permSet = [...new Set(permRows.map((p) => p.key))];

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: roleKeys,
    permissions: permSet,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const [row] = await db
    .insert(sessions)
    .values({ userId, tokenHash, expiresAt })
    .returning();
  return { sessionId: row.id, token, expiresAt };
}

export async function destroySession(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE] as string | undefined;
    if (!token) return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));

    const tokenHash = hashToken(token);
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!session) return next(new AppError(401, "UNAUTHENTICATED", "Session expired or invalid"));

    const user = await loadUserAuth(session.userId);
    if (!user) return next(new AppError(401, "UNAUTHENTICATED", "User inactive"));

    req.user = user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...needed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
    const ok = needed.every((p) => req.user!.permissions.includes(p));
    if (!ok) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient permissions", { needed }));
    }
    next();
  };
}

export { COOKIE };
