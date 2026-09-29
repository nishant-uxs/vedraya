import { Router } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  adverseEvents,
  codingDictionaries,
  codingResults,
  codingTerms,
  dataExports,
  participants,
  studies,
} from "../../db/schema.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { assertStudyAccess, resolveStudyScope } from "../../middleware/studyAccess.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAudit } from "../audit/service.js";

export const sdtmRouter = Router();

type ValidationIssue = { level: "error" | "warning"; code: string; message: string; row?: number };

type AeSdtmRow = {
  STUDYID: string;
  DOMAIN: string;
  USUBJID: string;
  AESEQ: number;
  AETERM: string;
  AEDECOD: string;
  AEBODSYS: string;
  AESEV: string;
  AESER: string;
  AEACN: string;
  AEREL: string;
  AEOUT: string;
  AESTDTC: string;
  AEENDTC: string;
  AESTAT: string;
};

function mapSeverity(s: string) {
  if (s === "mild") return "MILD";
  if (s === "moderate") return "MODERATE";
  if (s === "severe") return "SEVERE";
  return s.toUpperCase();
}

function validateAeRows(rows: AeSdtmRow[]): { validRows: number; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  let validRows = 0;

  rows.forEach((r, i) => {
    const row = i + 1;
    let ok = true;
    if (!r.STUDYID) {
      issues.push({ level: "error", code: "REQ_STUDYID", message: "STUDYID required", row });
      ok = false;
    }
    if (!r.AETERM) {
      issues.push({ level: "error", code: "REQ_AETERM", message: "AETERM required", row });
      ok = false;
    }
    if (!["Y", "N"].includes(r.AESER)) {
      issues.push({ level: "error", code: "CTRL_AESER", message: "AESER must be Y or N", row });
      ok = false;
    }
    if (!r.USUBJID) {
      issues.push({
        level: "warning",
        code: "MISS_USUBJID",
        message: "USUBJID blank — AE not linked to participant",
        row,
      });
    }
    if (!r.AEDECOD) {
      issues.push({
        level: "warning",
        code: "UNCOded",
        message: "AEDECOD blank — MedDRA-compatible coding not applied",
        row,
      });
    }
    if (r.AESTDTC && r.AEENDTC && r.AEENDTC < r.AESTDTC) {
      issues.push({
        level: "error",
        code: "DATE_ORDER",
        message: "AEENDTC before AESTDTC",
        row,
      });
      ok = false;
    }
    const key = `${r.STUDYID}|${r.USUBJID}|${r.AESEQ}`;
    if (seen.has(key)) {
      issues.push({ level: "error", code: "DUP", message: "Duplicate AESEQ for subject", row });
      ok = false;
    }
    seen.add(key);
    if (ok) validRows += 1;
  });

  return { validRows, issues };
}

function toCsv(rows: AeSdtmRow[]) {
  const headers = [
    "STUDYID",
    "DOMAIN",
    "USUBJID",
    "AESEQ",
    "AETERM",
    "AEDECOD",
    "AEBODSYS",
    "AESEV",
    "AESER",
    "AEACN",
    "AEREL",
    "AEOUT",
    "AESTDTC",
    "AEENDTC",
    "AESTAT",
  ] as const;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = r[h] ?? "";
          const s = String(v);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

const exportSchema = z.object({
  studyId: z.string().uuid(),
});

/** SDTM-like AE transformation prototype — not CDISC certified. */
sdtmRouter.post(
  "/ae",
  authenticate,
  requirePermission("export:create"),
  validateBody(exportSchema),
  async (req, res, next) => {
    try {
      const { studyId } = req.body as z.infer<typeof exportSchema>;
      await assertStudyAccess(req.user!, studyId);

      const [study] = await db.select().from(studies).where(eq(studies.id, studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const aes = await db
        .select()
        .from(adverseEvents)
        .where(eq(adverseEvents.studyId, studyId))
        .orderBy(adverseEvents.reportedAt);

      const partIds = [...new Set(aes.map((a) => a.participantId).filter(Boolean))] as string[];
      const parts =
        partIds.length === 0
          ? []
          : await db.select().from(participants).where(inArray(participants.id, partIds));
      const partById = Object.fromEntries(parts.map((p) => [p.id, p]));

      const aeIds = aes.map((a) => a.id);
      const codes =
        aeIds.length === 0
          ? []
          : await db
              .select({
                entityId: codingResults.entityId,
                codedAt: codingResults.codedAt,
                code: codingTerms.code,
                preferredTerm: codingTerms.preferredTerm,
                soc: codingTerms.systemOrganClass,
                dictKey: codingDictionaries.key,
              })
              .from(codingResults)
              .innerJoin(codingTerms, eq(codingResults.termId, codingTerms.id))
              .innerJoin(codingDictionaries, eq(codingResults.dictionaryId, codingDictionaries.id))
              .where(
                and(
                  eq(codingResults.entityType, "adverse_event"),
                  inArray(codingResults.entityId, aeIds),
                ),
              )
              .orderBy(codingResults.codedAt);

      const latestCode = new Map<string, (typeof codes)[0]>();
      for (const c of codes) latestCode.set(c.entityId, c);

      const seqBySubject = new Map<string, number>();
      const rows: AeSdtmRow[] = aes.map((ae) => {
        const subj = ae.participantId ? partById[ae.participantId]?.subjectCode ?? "" : "";
        const seqKey = subj || ae.id;
        const seq = (seqBySubject.get(seqKey) ?? 0) + 1;
        seqBySubject.set(seqKey, seq);
        const coded = latestCode.get(ae.id);
        return {
          STUDYID: study.code,
          DOMAIN: "AE",
          USUBJID: subj,
          AESEQ: seq,
          AETERM: ae.description.slice(0, 200),
          AEDECOD: coded?.preferredTerm ?? "",
          AEBODSYS: coded?.soc ?? "",
          AESEV: mapSeverity(ae.severity),
          AESER: ae.isSerious ? "Y" : "N",
          AEACN: (ae.actionTaken ?? "").toUpperCase(),
          AEREL: (ae.causality ?? "").toUpperCase(),
          AEOUT: (ae.outcome ?? "").toUpperCase(),
          AESTDTC: ae.onsetAt?.toISOString().slice(0, 10) ?? "",
          AEENDTC: ae.resolvedAt?.toISOString().slice(0, 10) ?? "",
          AESTAT: ae.status.toUpperCase(),
        };
      });

      const { validRows, issues } = validateAeRows(rows);
      const errors = issues.filter((i) => i.level === "error");
      const warnings = issues.filter((i) => i.level === "warning");

      if (errors.length > 0) {
        await writeAudit({
          req,
          action: "EXPORT_CREATE",
          entityType: "data_export",
          newState: {
            kind: "sdtm_ae_prototype",
            studyId,
            status: "failed_validation",
            rows: rows.length,
            errors: errors.length,
            warnings: warnings.length,
          },
        });
        throw new AppError(422, "SDTM_VALIDATION_FAILED", "Critical SDTM-like validation errors", {
          rows: rows.length,
          validRows,
          errors,
          warnings,
          note: "SDTM-like transformation prototype — not CDISC certified",
        });
      }

      const csv = toCsv(rows);
      const [exp] = await db
        .insert(dataExports)
        .values({
          studyId,
          kind: "sdtm_ae_prototype",
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
        newState: {
          kind: "sdtm_ae_prototype",
          studyId,
          rows: rows.length,
          validRows,
          warnings: warnings.length,
          status: "ok",
        },
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${study.code}-AE-SDTM-PROTOTYPE.csv"`);
      res.setHeader("X-Vedraya-Export-Id", exp.id);
      res.setHeader("X-Vedraya-Export-Note", "SDTM-LIKE-PROTOTYPE-NOT-CDISC-CERTIFIED");
      res.setHeader("X-Vedraya-Validation-Warnings", String(warnings.length));
      res.setHeader("X-Vedraya-Row-Count", String(rows.length));
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

/** Preview validation without downloading. */
sdtmRouter.get(
  "/ae/validate",
  authenticate,
  requirePermission("export:view"),
  async (req, res, next) => {
    try {
      const studyId = typeof req.query.studyId === "string" ? req.query.studyId : "";
      if (!studyId) throw new AppError(400, "BAD_REQUEST", "studyId required");
      await assertStudyAccess(req.user!, studyId);

      const [study] = await db.select().from(studies).where(eq(studies.id, studyId)).limit(1);
      if (!study) throw new AppError(404, "NOT_FOUND", "Study not found");

      const count = await db
        .select({ n: adverseEvents.id })
        .from(adverseEvents)
        .where(eq(adverseEvents.studyId, studyId));

      const scope = await resolveStudyScope(req.user!);
      void scope;

      res.json({
        data: {
          studyId,
          studyCode: study.code,
          sourceRows: count.length,
          targetDomain: "AE",
          mapping: "VEDRAYA adverse_events (+ optional demo coding) → SDTM-like AE columns",
          note: "SDTM-like transformation prototype — not CDISC certified. ADaM not implemented (insufficient analysis variables).",
          adamStatus: "PARTIAL — interface only; no ADaM dataset generated",
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
