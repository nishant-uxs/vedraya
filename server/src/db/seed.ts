import "dotenv/config";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "./client.js";
import {
  adverseEvents,
  investigators,
  participants,
  permissions,
  rolePermissions,
  roles,
  sites,
  studies,
  studyInvestigators,
  studyMilestones,
  studySites,
  userRoles,
  users,
  auditEvents,
  consents,
  consentVersions,
  regulatorySubmissions,
  ethicsCommittees,
} from "./schema.js";

const PERMS = [
  "study:view",
  "study:create",
  "study:update",
  "study:archive",
  "site:view",
  "site:manage",
  "investigator:view",
  "investigator:manage",
  "participant:view",
  "participant:manage",
  "milestone:view",
  "milestone:update",
  "ae:view",
  "ae:create",
  "ae:update",
  "ae:escalate",
  "consent:view",
  "consent:create",
  "consent:update",
  "consent:withdraw",
  "regulatory:view",
  "regulatory:manage",
  "audit:view",
  "export:create",
  "export:view",
  "fhir:view",
] as const;

const ROLE_DEFS: Record<string, { name: string; perms: string[] }> = {
  principal_investigator: {
    name: "Principal Investigator",
    perms: [
      "study:view",
      "study:update",
      "site:view",
      "investigator:view",
      "participant:view",
      "participant:manage",
      "milestone:view",
      "ae:view",
      "ae:create",
      "ae:update",
      "consent:view",
      "consent:create",
      "consent:update",
      "consent:withdraw",
      "regulatory:view",
      "audit:view",
      "export:view",
      "fhir:view",
    ],
  },
  study_coordinator: {
    name: "Study Coordinator",
    perms: [
      "study:view",
      "site:view",
      "site:manage",
      "investigator:view",
      "investigator:manage",
      "participant:view",
      "participant:manage",
      "milestone:view",
      "milestone:update",
      "ae:view",
      "ae:create",
      "consent:view",
      "consent:create",
      "consent:update",
      "consent:withdraw",
      "regulatory:view",
      "audit:view",
      "export:view",
    ],
  },
  monitor: {
    name: "Monitor",
    perms: [
      "study:view",
      "site:view",
      "investigator:view",
      "participant:view",
      "milestone:view",
      "ae:view",
      "consent:view",
      "regulatory:view",
      "audit:view",
      "export:view",
    ],
  },
  ethics_committee: {
    name: "Ethics Committee",
    perms: [
      "study:view",
      "consent:view",
      "regulatory:view",
      "regulatory:manage",
      "audit:view",
    ],
  },
  pharmacovigilance: {
    name: "Pharmacovigilance",
    perms: ["study:view", "ae:view", "ae:update", "ae:escalate", "participant:view", "audit:view"],
  },
  administration: {
    name: "Administration",
    perms: [...PERMS],
  },
  regulator: {
    name: "Read-only Regulator",
    perms: [
      "study:view",
      "site:view",
      "investigator:view",
      "participant:view",
      "milestone:view",
      "ae:view",
      "consent:view",
      "regulatory:view",
      "audit:view",
      "export:view",
      "fhir:view",
    ],
  },
};

const DEMO_PASSWORD = "Vedraya!Demo1";

async function main() {
  console.log("Seeding VEDRAYA synthetic data...");

  // wipe in FK-safe order for idempotent reseed in dev
  await db.delete(auditEvents);
  await db.delete(consents);
  await db.delete(consentVersions);
  await db.delete(adverseEvents);
  await db.delete(participants);
  await db.delete(studyMilestones);
  await db.delete(regulatorySubmissions);
  await db.delete(ethicsCommittees);
  await db.delete(studyInvestigators);
  await db.delete(studySites);
  await db.delete(investigators);
  await db.delete(sites);
  await db.delete(studies);
  await db.delete(userRoles);
  await db.delete(rolePermissions);
  await db.delete(permissions);
  await db.delete(roles);
  await db.delete(users);

  const permRows = await db
    .insert(permissions)
    .values(PERMS.map((key) => ({ key, description: key })))
    .returning();
  const permByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

  const roleRows = await db
    .insert(roles)
    .values(Object.entries(ROLE_DEFS).map(([key, v]) => ({ key, name: v.name })))
    .returning();
  const roleByKey = Object.fromEntries(roleRows.map((r) => [r.key, r.id]));

  for (const [key, def] of Object.entries(ROLE_DEFS)) {
    await db.insert(rolePermissions).values(
      def.perms.map((p) => ({
        roleId: roleByKey[key],
        permissionId: permByKey[p],
      })),
    );
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const accounts = [
    { email: "pi@vedraya.demo", name: "Dr. Ananya Sharma", role: "principal_investigator" },
    { email: "coord@vedraya.demo", name: "Coordinator Mehta", role: "study_coordinator" },
    { email: "monitor@vedraya.demo", name: "Monitor Rao", role: "monitor" },
    { email: "ethics@vedraya.demo", name: "EC Member Iyer", role: "ethics_committee" },
    { email: "pv@vedraya.demo", name: "PV Officer Khan", role: "pharmacovigilance" },
    { email: "admin@vedraya.demo", name: "System Admin", role: "administration" },
    { email: "regulator@vedraya.demo", name: "Regulator Observer", role: "regulator" },
  ];

  const userRows = await db
    .insert(users)
    .values(accounts.map((a) => ({ email: a.email, name: a.name, passwordHash })))
    .returning();
  const userByEmail = Object.fromEntries(userRows.map((u) => [u.email, u]));

  for (const a of accounts) {
    await db.insert(userRoles).values({
      userId: userByEmail[a.email].id,
      roleId: roleByKey[a.role],
    });
  }

  const adminId = userByEmail["admin@vedraya.demo"].id;

  const studyRows = await db
    .insert(studies)
    .values([
      {
        code: "AYU-024",
        title: "Ashwagandha adjunct in metabolic syndrome",
        status: "recruiting",
        phase: "III",
        sponsor: "AIIA",
        therapeuticArea: "Metabolic",
        enrollmentTarget: 500,
        enrollmentCurrent: 327,
        riskScore: 78,
        createdBy: adminId,
      },
      {
        code: "AYU-031",
        title: "Guduchi immunomodulation observational cohort",
        status: "active",
        phase: "II",
        sponsor: "AIIA",
        therapeuticArea: "Immunology",
        enrollmentTarget: 200,
        enrollmentCurrent: 118,
        riskScore: 42,
        createdBy: adminId,
      },
      {
        code: "AYU-018",
        title: "Triphala GI tolerance multi-centre",
        status: "recruiting",
        phase: "III",
        sponsor: "AIIA",
        therapeuticArea: "Gastroenterology",
        enrollmentTarget: 500,
        enrollmentCurrent: 490,
        riskScore: 21,
        createdBy: adminId,
      },
      {
        code: "NEU-007",
        title: "Brahmi cognitive signal-finding",
        status: "setup",
        phase: "I",
        sponsor: "AIIA",
        therapeuticArea: "Neurology",
        enrollmentTarget: 40,
        enrollmentCurrent: 28,
        riskScore: 35,
        createdBy: adminId,
      },
      {
        code: "AYU-041",
        title: "Nasya protocol feasibility",
        status: "draft",
        phase: "II",
        sponsor: "AIIA",
        therapeuticArea: "ENT",
        enrollmentTarget: 120,
        enrollmentCurrent: 0,
        riskScore: 12,
        createdBy: adminId,
      },
    ])
    .returning();

  const siteRows = await db
    .insert(sites)
    .values(
      Array.from({ length: 10 }, (_, i) => ({
        code: `SITE-${String(i + 1).padStart(2, "0")}`,
        name: `Clinical Site ${i + 1}`,
        city: ["Delhi", "Jaipur", "Pune", "Bengaluru", "Chennai"][i % 5],
        status: i < 8 ? ("active" as const) : ("pending" as const),
      })),
    )
    .returning();

  const invRows = await db
    .insert(investigators)
    .values(
      Array.from({ length: 10 }, (_, i) => ({
        code: `INV-${String(i + 1).padStart(2, "0")}`,
        displayName: `Investigator ${i + 1}`,
        specialty: ["Ayurveda", "Internal Medicine", "Neurology"][i % 3],
      })),
    )
    .returning();

  for (const study of studyRows.slice(0, 4)) {
    for (const site of siteRows.slice(0, 4)) {
      await db.insert(studySites).values({
        studyId: study.id,
        siteId: site.id,
        status: "active",
        activatedAt: new Date(),
      });
    }
    await db.insert(studyInvestigators).values({
      studyId: study.id,
      investigatorId: invRows[0].id,
      roleTitle: "Principal Investigator",
    });
  }

  let p = 0;
  for (const study of studyRows.slice(0, 4)) {
    for (let i = 0; i < 8; i += 1) {
      p += 1;
      await db.insert(participants).values({
        subjectCode: `${study.code}-S${String(p).padStart(3, "0")}`,
        studyId: study.id,
        siteId: siteRows[i % siteRows.length].id,
        status: i % 7 === 0 ? "screened" : "enrolled",
        enrolledAt: i % 7 === 0 ? null : new Date(),
      });
    }
  }

  const partRows = await db.select().from(participants).limit(5);

  await db.insert(studyMilestones).values([
    {
      studyId: studyRows[0].id,
      key: "ethics_approval",
      title: "IEC Approval",
      status: "completed",
      completedAt: new Date("2025-11-01"),
    },
    {
      studyId: studyRows[0].id,
      key: "ctri",
      title: "CTRI Registration",
      status: "completed",
      completedAt: new Date("2025-11-20"),
    },
    {
      studyId: studyRows[0].id,
      key: "monitoring_visit",
      title: "Monitoring Visit Q2",
      status: "delayed",
      dueAt: new Date("2026-08-01"),
    },
    {
      studyId: studyRows[1].id,
      key: "site_activation",
      title: "Site Activation Wave 2",
      status: "at_risk",
      dueAt: new Date("2026-09-15"),
    },
  ]);

  await db.insert(adverseEvents).values([
    {
      caseCode: "AE-SEED-001",
      studyId: studyRows[0].id,
      participantId: partRows[0]?.id,
      siteId: siteRows[0].id,
      isSerious: true,
      severity: "severe",
      status: "escalated",
      description: "Synthetic SAE — hospitalization for evaluation (demo only)",
      reportedBy: adminId,
    },
    {
      caseCode: "AE-SEED-002",
      studyId: studyRows[0].id,
      participantId: partRows[1]?.id,
      isSerious: false,
      severity: "mild",
      status: "reported",
      description: "Mild headache after dose (synthetic)",
      reportedBy: adminId,
    },
    {
      caseCode: "AE-SEED-003",
      studyId: studyRows[1].id,
      isSerious: false,
      severity: "moderate",
      status: "safety_review",
      description: "GI discomfort (synthetic)",
      reportedBy: adminId,
    },
  ]);

  const [cv] = await db
    .insert(consentVersions)
    .values({
      studyId: studyRows[0].id,
      versionLabel: "v2.1",
      title: "ICF Ashwagandha metabolic syndrome",
      effectiveAt: new Date("2025-10-01"),
    })
    .returning();

  await db.insert(consentVersions).values({
    studyId: studyRows[0].id,
    versionLabel: "v2.0",
    title: "ICF prior version (historical)",
    effectiveAt: new Date("2025-06-01"),
  });

  if (partRows[0]) {
    await db.insert(consents).values({
      studyId: studyRows[0].id,
      participantId: partRows[0].id,
      version: "v2.1",
      versionId: cv.id,
      status: "obtained",
      obtainedAt: new Date(),
      createdBy: adminId,
    });
  }
  if (partRows[1]) {
    await db.insert(consents).values({
      studyId: studyRows[0].id,
      participantId: partRows[1].id,
      version: "v2.1",
      versionId: cv.id,
      status: "pending",
      createdBy: adminId,
    });
  }

  const [iec] = await db
    .insert(ethicsCommittees)
    .values({
      code: "IEC-AIIA",
      name: "AIIA Institutional Ethics Committee",
      city: "New Delhi",
    })
    .returning();

  await db.insert(ethicsCommittees).values({
    code: "IEC-DEMO-02",
    name: "Regional Ethics Board (synthetic)",
    city: "Bengaluru",
  });

  await db.insert(regulatorySubmissions).values([
    {
      studyId: studyRows[0].id,
      kind: "CTRI",
      referenceNumber: "CTRI/2025/DEMO/0001",
      status: "registered",
      decision: "registered",
      submittedAt: new Date("2025-11-18"),
      decidedAt: new Date("2025-11-20"),
      createdBy: adminId,
    },
    {
      studyId: studyRows[0].id,
      kind: "IEC",
      ethicsCommitteeId: iec.id,
      referenceNumber: "IEC-AIIA-2025-042",
      status: "approved",
      decision: "approved",
      submittedAt: new Date("2025-10-10"),
      decidedAt: new Date("2025-11-01"),
      createdBy: adminId,
    },
    {
      studyId: studyRows[1].id,
      kind: "IEC",
      ethicsCommitteeId: iec.id,
      referenceNumber: "IEC-PENDING-031",
      status: "under_review",
      submittedAt: new Date("2026-09-01"),
      dueAt: new Date("2026-09-20"),
      notes: "Synthetic overdue ethics decision for alert demo",
      createdBy: adminId,
    },
    {
      studyId: studyRows[1].id,
      kind: "CTRI",
      status: "submitted",
      submittedAt: new Date("2026-09-10"),
      dueAt: new Date("2026-09-25"),
      notes: "CTRI TRACKING — pending registration (no external API)",
      createdBy: adminId,
    },
  ]);

  await db.insert(auditEvents).values({
    actorUserId: adminId,
    action: "SEED",
    entityType: "system",
    newState: { note: "Synthetic dataset loaded" },
  });

  // sanity
  const [u] = await db.select().from(users).where(eq(users.email, "admin@vedraya.demo"));
  console.log("Seed complete.");
  console.log("Demo password for all accounts:", DEMO_PASSWORD);
  console.log("Admin user:", u?.email);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
