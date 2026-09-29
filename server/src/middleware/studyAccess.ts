import { eq, inArray } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/client.js";
import { studyMemberships } from "../db/schema.js";
import type { AuthUser } from "./auth.js";
import { AppError } from "./errors.js";

/**
 * Study-level access (PS: strictly role-based + study scope):
 * - administration → unrestricted
 * - regulator → unrestricted portfolio read (still RBAC-gated writes)
 * - user with ≥1 study_memberships → those study IDs only
 * - user with 0 memberships → empty scope (no study access)
 */
export async function resolveStudyScope(user: AuthUser): Promise<string[] | null> {
  if (user.roles.includes("administration") || user.roles.includes("regulator")) return null;

  const rows = await db
    .select({ studyId: studyMemberships.studyId })
    .from(studyMemberships)
    .where(eq(studyMemberships.userId, user.id));

  return rows.map((r) => r.studyId);
}

export async function assertStudyAccess(user: AuthUser, studyId: string) {
  const scope = await resolveStudyScope(user);
  if (scope === null) return;
  if (!scope.includes(studyId)) {
    throw new AppError(403, "STUDY_FORBIDDEN", "No access to this study");
  }
}

export function filterByStudyScope<T extends { studyId: string }>(
  rows: T[],
  scope: string[] | null,
): T[] {
  if (scope === null) return rows;
  const set = new Set(scope);
  return rows.filter((r) => set.has(r.studyId));
}

export async function studyIdsInScope(scope: string[] | null, allIds: string[]) {
  if (scope === null) return allIds;
  return allIds.filter((id) => scope.includes(id));
}

/** Express middleware factory: load studyId from params/body/query and assert access. */
export function requireStudyAccess(getStudyId: (req: Request) => string | undefined) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
      const studyId = getStudyId(req);
      if (!studyId) return next();
      await assertStudyAccess(req.user, studyId);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export { inArray };
