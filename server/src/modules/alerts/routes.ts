import { Router } from "express";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  adverseEvents,
  consents,
  dataQueries,
  protocolDeviations,
  regulatorySubmissions,
  studyMilestones,
  studies,
} from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { filterByStudyScope, resolveStudyScope } from "../../middleware/studyAccess.js";

export const alertsRouter = Router();

/** Computed operational alerts — not a fake static list. Scoped by study membership. */
alertsRouter.get("/", authenticate, requirePermission("study:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
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
      .where(and(ne(studyMilestones.status, "completed"), lt(studyMilestones.dueAt, now)));

    const highRisk = await db
      .select({
        id: studies.id,
        code: studies.code,
        riskScore: studies.riskScore,
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

    const pendingConsent = await db
      .select({
        id: consents.id,
        studyId: consents.studyId,
        status: consents.status,
      })
      .from(consents)
      .where(eq(consents.status, "pending"));

    const overdueReg = await db
      .select({
        id: regulatorySubmissions.id,
        studyId: regulatorySubmissions.studyId,
        kind: regulatorySubmissions.kind,
        referenceNumber: regulatorySubmissions.referenceNumber,
        dueAt: regulatorySubmissions.dueAt,
        status: regulatorySubmissions.status,
      })
      .from(regulatorySubmissions)
      .where(
        and(
          lt(regulatorySubmissions.dueAt, now),
          sql`${regulatorySubmissions.status} not in ('approved','registered','rejected','expired')`,
        ),
      );

    const pendingEthics = await db
      .select({
        id: regulatorySubmissions.id,
        studyId: regulatorySubmissions.studyId,
        kind: regulatorySubmissions.kind,
        status: regulatorySubmissions.status,
        referenceNumber: regulatorySubmissions.referenceNumber,
      })
      .from(regulatorySubmissions)
      .where(sql`${regulatorySubmissions.status} in ('submitted','under_review')`);

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
      ...pendingConsent.map((c) => ({
        level: "warn" as const,
        type: "consent_pending",
        message: `Pending consent record`,
        entityId: c.id,
        studyId: c.studyId,
      })),
      ...overdueReg.map((r) => ({
        level: "crit" as const,
        type: "regulatory_overdue",
        message: `Overdue ${r.kind} submission${r.referenceNumber ? ` (${r.referenceNumber})` : ""}`,
        entityId: r.id,
        studyId: r.studyId,
      })),
      ...pendingEthics.map((r) => ({
        level: "warn" as const,
        type: "ethics_pending",
        message: `Pending ${r.kind} decision (${r.status})`,
        entityId: r.id,
        studyId: r.studyId,
      })),
    ];

    const scoped = filterByStudyScope(alerts, scope);

    // Enrolment lag: recruiting/active studies under 70% of target
    const enrollStudies = await db
      .select({
        id: studies.id,
        code: studies.code,
        enrollmentCurrent: studies.enrollmentCurrent,
        enrollmentTarget: studies.enrollmentTarget,
        status: studies.status,
      })
      .from(studies)
      .where(sql`${studies.status} in ('active','recruiting')`);
    const enrollScoped = enrollStudies.filter(
      (s) => scope === null || scope.includes(s.id),
    );
    for (const s of enrollScoped) {
      if (s.enrollmentTarget > 0 && s.enrollmentCurrent / s.enrollmentTarget < 0.7) {
        scoped.push({
          level: "warn" as const,
          type: "enrolment_lag",
          message: `${s.code} — enrolment lag (${s.enrollmentCurrent}/${s.enrollmentTarget})`,
          entityId: s.id,
          studyId: s.id,
        });
      }
    }

    // SAE regulatory reporting overdue
    const overdueAe = await db
      .select({
        id: adverseEvents.id,
        caseCode: adverseEvents.caseCode,
        studyId: adverseEvents.studyId,
        reportingDueAt: adverseEvents.reportingDueAt,
      })
      .from(adverseEvents)
      .where(
        and(
          sql`${adverseEvents.reportingDueAt} is not null`,
          sql`${adverseEvents.authorityNotifiedAt} is null`,
          lt(adverseEvents.reportingDueAt, now),
          ne(adverseEvents.status, "closed"),
        ),
      );
    for (const a of filterByStudyScope(overdueAe, scope)) {
      scoped.push({
        level: "crit" as const,
        type: "sae_reporting_overdue",
        message: `${a.caseCode} — SAE reporting timeline overdue`,
        entityId: a.id,
        studyId: a.studyId,
      });
    }

    // Open protocol deviations / data queries
    const openDev = await db
      .select({
        id: protocolDeviations.id,
        studyId: protocolDeviations.studyId,
        code: protocolDeviations.code,
      })
      .from(protocolDeviations)
      .where(ne(protocolDeviations.status, "closed"));
    for (const d of filterByStudyScope(openDev, scope)) {
      scoped.push({
        level: "warn" as const,
        type: "protocol_deviation_open",
        message: `Open protocol deviation ${d.code}`,
        entityId: d.id,
        studyId: d.studyId,
      });
    }

    const openQ = await db
      .select({
        id: dataQueries.id,
        studyId: dataQueries.studyId,
        code: dataQueries.code,
      })
      .from(dataQueries)
      .where(sql`${dataQueries.status} in ('open','under_review')`);
    for (const q of filterByStudyScope(openQ, scope)) {
      scoped.push({
        level: "warn" as const,
        type: "data_query_open",
        message: `Open data query ${q.code}`,
        entityId: q.id,
        studyId: q.studyId,
      });
    }

    res.json({ data: scoped, meta: { computedAt: now.toISOString(), count: scoped.length } });
  } catch (err) {
    next(err);
  }
});
