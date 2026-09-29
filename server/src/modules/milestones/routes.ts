import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { studyMilestones, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";

export const milestonesRouter = Router();

milestonesRouter.get("/", authenticate, requirePermission("milestone:view"), async (req, res, next) => {
  try {
    const studyId = typeof req.query.studyId === "string" ? req.query.studyId : undefined;
    const rows = await db
      .select({
        id: studyMilestones.id,
        studyId: studyMilestones.studyId,
        key: studyMilestones.key,
        title: studyMilestones.title,
        status: studyMilestones.status,
        dueAt: studyMilestones.dueAt,
        completedAt: studyMilestones.completedAt,
        createdAt: studyMilestones.createdAt,
        studyCode: studies.code,
      })
      .from(studyMilestones)
      .leftJoin(studies, eq(studyMilestones.studyId, studies.id))
      .where(studyId ? eq(studyMilestones.studyId, studyId) : undefined)
      .orderBy(desc(studyMilestones.createdAt));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});
