import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import {
  authenticate,
  clearSessionCookie,
  createSession,
  destroySession,
  loadUserAuth,
  setSessionCookie,
  verifyPassword,
  COOKIE,
} from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { validateBody } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { writeAudit } from "../audit/service.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    key: (req) => `login:${req.ip}:${String(req.body?.email ?? "").toLowerCase()}`,
  }),
  validateBody(loginSchema),
  async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    if (!user.isActive) throw new AppError(403, "USER_INACTIVE", "Account is inactive");

    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    const authUser = await loadUserAuth(user.id);

    await writeAudit({
      req,
      actorUserId: user.id,
      action: "LOGIN",
      entityType: "user",
      entityId: user.id,
      newState: { email: user.email },
    });

    res.json({ data: authUser });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE] as string | undefined;
    let actorId: string | undefined;
    if (token) {
      const { hashToken, loadUserAuth } = await import("../../middleware/auth.js");
      const { sessions } = await import("../../db/schema.js");
      const { and, eq, gt } = await import("drizzle-orm");
      const tokenHash = hashToken(token);
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
        .limit(1);
      if (session) {
        const u = await loadUserAuth(session.userId);
        actorId = u?.id;
      }
      await destroySession(token);
    }
    if (actorId) {
      await writeAudit({
        req,
        actorUserId: actorId,
        action: "LOGOUT",
        entityType: "user",
        entityId: actorId,
      });
    }
    clearSessionCookie(res);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ data: req.user });
});
