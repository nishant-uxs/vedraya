import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { investigators, studyInvestigators } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const investigatorsRouter = Router();

const createSchema = z.object({
  code: z.string().min(2).max(32),
  displayName: z.string().min(2).max(255),
  specialty: z.string().max(128).optional(),
});

const assignSchema = z.object({
  studyId: z.string().uuid(),
  investigatorId: z.string().uuid(),
  roleTitle: z.string().max(128).optional(),
});

investigatorsRouter.get(
  "/",
  authenticate,
  requirePermission("investigator:view"),
  async (_req, res, next) => {
    try {
      const rows = await db.select().from(investigators).orderBy(desc(investigators.createdAt));
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);

investigatorsRouter.post(
  "/",
  authenticate,
  requirePermission("investigator:manage"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const [row] = await db
        .insert(investigators)
        .values({
          code: body.code.toUpperCase(),
          displayName: body.displayName,
          specialty: body.specialty,
        })
        .returning();

      await writeAudit({
        req,
        action: "INVESTIGATOR_CREATE",
        entityType: "investigator",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

investigatorsRouter.post(
  "/assign",
  authenticate,
  requirePermission("investigator:manage"),
  validateBody(assignSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof assignSchema>;
      const [row] = await db
        .insert(studyInvestigators)
        .values({
          studyId: body.studyId,
          investigatorId: body.investigatorId,
          roleTitle: body.roleTitle ?? "Investigator",
        })
        .returning();

      await writeAudit({
        req,
        action: "INVESTIGATOR_ASSIGN",
        entityType: "study_investigator",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

investigatorsRouter.delete(
  "/assign/:id",
  authenticate,
  requirePermission("investigator:manage"),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(studyInvestigators)
        .where(eq(studyInvestigators.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Assignment not found");

      await db.delete(studyInvestigators).where(eq(studyInvestigators.id, req.params.id));

      await writeAudit({
        req,
        action: "INVESTIGATOR_UNASSIGN",
        entityType: "study_investigator",
        entityId: prev.id,
        previousState: prev,
      });

      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  },
);
