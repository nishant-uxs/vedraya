import { Router } from "express";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { adverseEvents, studyMilestones, studies } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";

export const alertsRouter = Router();

/** Computed operational alerts — not a fake static list. */
alertsRouter.get("/", authenticate, requirePermission("study:view"), async (_req, res, next) => {
  try {
    const now = new Date();
    const delayed = await db
      .select({
        id: studyMilestones.id,
        studyId: studyMilestones.studyId,
        title: studyMilestones.title,
        dueAt: studyMilestones.dueAt,
        status: studyMilestones.status,
      })
      .from(studyMilestones)
      .where(
        and(
          ne(studyMilestones.status, "completed"),
          lt(studyMilestones.dueAt, now),
        ),
      );

    const highRisk = await db
      .select({
        id: studies.id,
        code: studies.code,
        riskScore: studies.riskScore,
        enrollmentCurrent: studies.enrollmentCurrent,
        enrollmentTarget: studies.enrollmentTarget,
      })
      .from(studies)
      .where(and(sql`${studies.riskScore} >= 60`, ne(studies.status, "archived")));

    const openSae = await db
      .select({
        id: adverseEvents.id,
        caseCode: adverseEvents.caseCode,
        status: adverseEvents.status,
        studyId: adverseEvents.studyId,
      })
      .from(adverseEvents)
      .where(and(eq(adverseEvents.isSerious, true), ne(adverseEvents.status, "closed")));

    const alerts = [
      ...delayed.map((m) => ({
        level: "warn" as const,
        type: "milestone_overdue",
        message: `Overdue milestone: ${m.title}`,
        entityId: m.id,
        studyId: m.studyId,
      })),
      ...highRisk.map((s) => ({
        level: "crit" as const,
        type: "study_high_risk",
        message: `${s.code} — operational risk score ${s.riskScore}`,
        entityId: s.id,
        studyId: s.id,
      })),
      ...openSae.map((a) => ({
        level: "crit" as const,
        type: "open_sae",
        message: `${a.caseCode} — open serious AE (${a.status})`,
        entityId: a.id,
        studyId: a.studyId,
      })),
    ];

    res.json({ data: alerts, meta: { computedAt: now.toISOString(), count: alerts.length } });
  } catch (err) {
    next(err);
  }
});
