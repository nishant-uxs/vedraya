import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { participants, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const participantsRouter = Router();

const createSchema = z.object({
  subjectCode: z.string().min(3).max(64),
  studyId: z.string().uuid(),
  siteId: z.string().uuid().optional(),
  status: z.enum(["screened", "enrolled", "withdrawn", "completed"]).optional(),
});

const statusSchema = z.object({
  status: z.enum(["screened", "enrolled", "withdrawn", "completed"]),
  reason: z.string().max(500).optional(),
});

const PARTICIPANT_TRANSITIONS: Record<string, string[]> = {
  screened: ["enrolled", "withdrawn"],
  enrolled: ["withdrawn", "completed"],
  withdrawn: [],
  completed: [],
};

participantsRouter.get(
  "/",
  authenticate,
  requirePermission("participant:view"),
  async (_req, res, next) => {
    try {
      const rows = await db.select().from(participants).orderBy(desc(participants.updatedAt));
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);

participantsRouter.post(
  "/",
  authenticate,
  requirePermission("participant:manage"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const status = body.status ?? "screened";
      const [row] = await db
        .insert(participants)
        .values({
          subjectCode: body.subjectCode.toUpperCase(),
          studyId: body.studyId,
          siteId: body.siteId,
          status,
          enrolledAt: status === "enrolled" ? new Date() : null,
        })
        .returning();

      if (status === "enrolled") {
        await db
          .update(studies)
          .set({
            enrollmentCurrent: study.enrollmentCurrent + 1,
            updatedAt: new Date(),
          })
          .where(eq(studies.id, study.id));
      }

      await writeAudit({
        req,
        action: "PARTICIPANT_CREATE",
        entityType: "participant",
        entityId: row.id,
        newState: row,
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

participantsRouter.patch(
  "/:id/status",
  authenticate,
  requirePermission("participant:manage"),
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const [prev] = await db
        .select()
        .from(participants)
        .where(eq(participants.id, req.params.id))
        .limit(1);
      if (!prev) throw new AppError(404, "NOT_FOUND", "Participant not found");

      const body = req.body as z.infer<typeof statusSchema>;
      const allowed = PARTICIPANT_TRANSITIONS[prev.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new AppError(400, "INVALID_TRANSITION", "Invalid participant status transition", {
          from: prev.status,
          to: body.status,
          allowed,
        });
      }

      const [row] = await db
        .update(participants)
        .set({
          status: body.status,
          enrolledAt:
            body.status === "enrolled" && !prev.enrolledAt ? new Date() : prev.enrolledAt,
          updatedAt: new Date(),
        })
        .where(eq(participants.id, req.params.id))
        .returning();

      if (prev.status !== "enrolled" && body.status === "enrolled") {
        const [study] = await db.select().from(studies).where(eq(studies.id, prev.studyId)).limit(1);
        if (study) {
          await db
            .update(studies)
            .set({
              enrollmentCurrent: study.enrollmentCurrent + 1,
              updatedAt: new Date(),
            })
            .where(eq(studies.id, study.id));
        }
      }

      await writeAudit({
        req,
        action: "PARTICIPANT_STATUS_CHANGE",
        entityType: "participant",
        entityId: row.id,
        previousState: prev,
        newState: row,
        reason: body.reason,
      });

      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);
