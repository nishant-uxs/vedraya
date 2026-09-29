import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { dataExports, participants, studies, users } from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess, filterByStudyScope, resolveStudyScope } from "../../middleware/studyAccess.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";
import { sdtmRouter } from "./sdtm.js";

export const exportsRouter = Router();

exportsRouter.use("/sdtm", sdtmRouter);

const bodySchema = z.object({
  studyId: z.string().uuid(),
  kind: z.enum(["subjects_csv", "studies_csv"]).default("subjects_csv"),
});

exportsRouter.get("/", authenticate, requirePermission("export:view"), async (req, res, next) => {
  try {
    const scope = await resolveStudyScope(req.user!);
    const rows = await db
      .select({
        id: dataExports.id,
        studyId: dataExports.studyId,
        kind: dataExports.kind,
        format: dataExports.format,
        createdBy: dataExports.createdBy,
        createdAt: dataExports.createdAt,
        studyCode: studies.code,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(dataExports)
      .leftJoin(studies, eq(dataExports.studyId, studies.id))
      .leftJoin(users, eq(dataExports.createdBy, users.id))
      .orderBy(desc(dataExports.createdAt))
      .limit(100);
    res.json({
      data: filterByStudyScope(
        rows.filter((r): r is typeof r & { studyId: string } => Boolean(r.studyId)),
        scope,
      ),
      meta: { note: "Study Data Export history — PROTOTYPE CSV, not full CDISC SDTM/ADaM" },
    });
  } catch (err) {
    next(err);
  }
});

/** Study Data Export prototype — not full CDISC SDTM/ADaM. */
exportsRouter.post(
  "/",
  authenticate,
  requirePermission("export:create"),
  validateBody(bodySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof bodySchema>;
      await assertStudyAccess(req.user!, body.studyId);
      const [study] = await db.select().from(studies).where(eq(studies.id, body.studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      let csv = "";
      if (body.kind === "subjects_csv") {
        const rows = await db
          .select()
          .from(participants)
          .where(eq(participants.studyId, body.studyId));
        csv = "USUBJID,STUDYID,SITEID,STATUS,ENROLLED_AT\n";
        csv += rows
          .map((r) =>
            [r.subjectCode, study.code, r.siteId ?? "", r.status, r.enrolledAt?.toISOString() ?? ""].join(
              ",",
            ),
          )
          .join("\n");
      } else {
        csv = "STUDYID,TITLE,STATUS,PHASE,ENROLL_CUR,ENROLL_TGT,RISK\n";
        csv += [
          study.code,
          JSON.stringify(study.title),
          study.status,
          study.phase ?? "",
          study.enrollmentCurrent,
          study.enrollmentTarget,
          study.riskScore,
        ].join(",");
      }

      const [exp] = await db
        .insert(dataExports)
        .values({
          studyId: study.id,
          kind: body.kind,
          format: "csv",
          createdBy: req.user!.id,
          payloadPath: "inline",
        })
        .returning();

      await writeAudit({
        req,
        action: "EXPORT_CREATE",
        entityType: "data_export",
        entityId: exp.id,
        newState: { kind: body.kind, studyId: study.id, rows: csv.split("\n").length - 1 },
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${study.code}-${body.kind}.csv"`);
      res.setHeader("X-Vedraya-Export-Id", exp.id);
      res.setHeader("X-Vedraya-Export-Note", "PROTOTYPE-CSV-NOT-FULL-CDISC");
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);
