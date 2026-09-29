import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { sites, studySites } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const sitesRouter = Router();

const createSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(255),
  city: z.string().max(128).optional(),
  status: z.enum(["pending", "activating", "active", "suspended", "closed"]).optional(),
});

const updateSchema = createSchema.partial();

const assignSchema = z.object({
  studyId: z.string().uuid(),
  siteId: z.string().uuid(),
  status: z.enum(["pending", "activating", "active", "suspended", "closed"]).optional(),
});

sitesRouter.get("/", authenticate, requirePermission("site:view"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(sites).orderBy(desc(sites.updatedAt));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

sitesRouter.post(
  "/",
  authenticate,
  requirePermission("site:manage"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const [row] = await db
        .insert(sites)
        .values({
          code: body.code.toUpperCase(),
          name: body.name,
          city: body.city,
          status: body.status ?? "pending",
        })
        .returning();

      await writeAudit({
        req,
        action: "SITE_CREATE",
        entityType: "site",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

sitesRouter.patch(
  "/:id",
  authenticate,
  requirePermission("site:manage"),
  validateBody(updateSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db.select().from(sites).where(eq(sites.id, req.params.id)).limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Site not found");

      const body = req.body as z.infer<typeof updateSchema>;
      const [row] = await db
        .update(sites)
        .set({
          ...(body.code ? { code: body.code.toUpperCase() } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(sites.id, req.params.id))
        .returning();

      await writeAudit({
        req,
        action: "SITE_UPDATE",
        entityType: "site",
        entityId: row.id,
        previousState: prev,
        newState: row,
      });

      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

sitesRouter.post(
  "/assign",
  authenticate,
  requirePermission("site:manage"),
  validateBody(assignSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof assignSchema>;
      const [row] = await db
        .insert(studySites)
        .values({
          studyId: body.studyId,
          siteId: body.siteId,
          status: body.status ?? "pending",
          activatedAt: body.status === "active" ? new Date() : null,
        })
        .returning();

      await writeAudit({
        req,
        action: "SITE_ASSIGN_STUDY",
        entityType: "study_site",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);
