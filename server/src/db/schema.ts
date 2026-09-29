import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const studyStatusEnum = pgEnum("study_status", [
  "draft",
  "setup",
  "active",
  "recruiting",
  "follow_up",
  "completed",
  "archived",
]);

export const siteStatusEnum = pgEnum("site_status", [
  "pending",
  "activating",
  "active",
  "suspended",
  "closed",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "screened",
  "enrolled",
  "withdrawn",
  "completed",
]);

export const aeSeverityEnum = pgEnum("ae_severity", ["mild", "moderate", "severe"]);
export const aeStatusEnum = pgEnum("ae_status", [
  "reported",
  "investigator_review",
  "safety_review",
  "escalated",
  "closed",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "upcoming",
  "completed",
  "delayed",
  "at_risk",
]);

export const consentStatusEnum = pgEnum("consent_status", [
  "pending",
  "obtained",
  "withdrawn",
  "expired",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("role_perm_uidx").on(t.roleId, t.permissionId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("user_role_uidx").on(t.userId, t.roleId)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studies = pgTable("studies", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  status: studyStatusEnum("status").notNull().default("draft"),
  phase: varchar("phase", { length: 16 }),
  sponsor: varchar("sponsor", { length: 255 }),
  therapeuticArea: varchar("therapeutic_area", { length: 255 }),
  enrollmentTarget: integer("enrollment_target").notNull().default(0),
  enrollmentCurrent: integer("enrollment_current").notNull().default(0),
  riskScore: integer("risk_score").notNull().default(0),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sites = pgTable("sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 128 }),
  status: siteStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studySites = pgTable(
  "study_sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studyId: uuid("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    status: siteStatusEnum("status").notNull().default("pending"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("study_site_uidx").on(t.studyId, t.siteId)],
);

export const investigators = pgTable("investigators", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  specialty: varchar("specialty", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studyInvestigators = pgTable(
  "study_investigators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studyId: uuid("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    investigatorId: uuid("investigator_id")
      .notNull()
      .references(() => investigators.id, { onDelete: "cascade" }),
    roleTitle: varchar("role_title", { length: 128 }).notNull().default("Investigator"),
  },
  (t) => [uniqueIndex("study_inv_uidx").on(t.studyId, t.investigatorId)],
);

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectCode: varchar("subject_code", { length: 64 }).notNull().unique(),
  studyId: uuid("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => sites.id),
  status: participantStatusEnum("status").notNull().default("screened"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studyMilestones = pgTable("study_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  studyId: uuid("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: milestoneStatusEnum("status").notNull().default("upcoming"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adverseEvents = pgTable("adverse_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseCode: varchar("case_code", { length: 64 }).notNull().unique(),
  studyId: uuid("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id").references(() => participants.id),
  siteId: uuid("site_id").references(() => sites.id),
  isSerious: boolean("is_serious").notNull().default(false),
  severity: aeSeverityEnum("severity").notNull().default("mild"),
  status: aeStatusEnum("status").notNull().default("reported"),
  description: text("description").notNull(),
  onsetAt: timestamp("onset_at", { withTimezone: true }),
  /** Additive Phase 4 safety fields */
  causality: varchar("causality", { length: 64 }),
  outcome: varchar("outcome", { length: 64 }),
  actionTaken: varchar("action_taken", { length: 64 }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  codingStatus: varchar("coding_status", { length: 32 }).notNull().default("pending"),
  seriousnessCriteria: text("seriousness_criteria"),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  reportedBy: uuid("reported_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Demo coding dictionaries — NOT official MedDRA/WHODrug licensed content. */
export const codingDictionaries = pgTable("coding_dictionaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  version: varchar("version", { length: 32 }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const codingTerms = pgTable(
  "coding_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dictionaryId: uuid("dictionary_id")
      .notNull()
      .references(() => codingDictionaries.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    term: varchar("term", { length: 255 }).notNull(),
    preferredTerm: varchar("preferred_term", { length: 255 }).notNull(),
    systemOrganClass: varchar("system_organ_class", { length: 255 }),
    searchText: text("search_text").notNull(),
  },
  (t) => [uniqueIndex("coding_term_uidx").on(t.dictionaryId, t.code)],
);

export const codingResults = pgTable("coding_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  dictionaryId: uuid("dictionary_id")
    .notNull()
    .references(() => codingDictionaries.id),
  termId: uuid("term_id")
    .notNull()
    .references(() => codingTerms.id),
  freeText: text("free_text").notNull(),
  codedBy: uuid("coded_by").references(() => users.id),
  codedAt: timestamp("coded_at", { withTimezone: true }).notNull().defaultNow(),
  status: varchar("status", { length: 32 }).notNull().default("coded"),
});

export const concomitantMedications = pgTable("concomitant_medications", {
  id: uuid("id").defaultRandom().primaryKey(),
  adverseEventId: uuid("adverse_event_id")
    .notNull()
    .references(() => adverseEvents.id, { onDelete: "cascade" }),
  studyId: uuid("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  freeText: varchar("free_text", { length: 255 }).notNull(),
  dose: varchar("dose", { length: 128 }),
  route: varchar("route", { length: 64 }),
  codingStatus: varchar("coding_status", { length: 32 }).notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Optional study membership. Users with ZERO rows remain globally scoped (backward compatible).
 * Users with ≥1 row are restricted to those studies. Administration role always bypasses.
 */
export const studyMemberships = pgTable(
  "study_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studyId: uuid("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("study_membership_uidx").on(t.userId, t.studyId)],
);

/** Durable rate-limit buckets (DB-backed store; memory store used for local demo by default). */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: varchar("bucket_key", { length: 255 }).primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/** Study-scoped consent form versions (catalog). Historical rows are never deleted. */
export const consentVersions = pgTable(
  "consent_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studyId: uuid("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    versionLabel: varchar("version_label", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("consent_version_uidx").on(t.studyId, t.versionLabel)],
);

export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  studyId: uuid("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  /** Denormalized label for list views; source of truth is versionId when set. */
  version: varchar("version", { length: 32 }).notNull(),
  versionId: uuid("version_id").references(() => consentVersions.id),
  status: consentStatusEnum("status").notNull().default("pending"),
  obtainedAt: timestamp("obtained_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ethicsCommittees = pgTable("ethics_committees", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ethics / CTRI / other regulatory tracking records.
 * kind examples: IEC | CTRI | DCGI
 * status machine enforced in application layer.
 */
export const regulatorySubmissions = pgTable("regulatory_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  studyId: uuid("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  ethicsCommitteeId: uuid("ethics_committee_id").references(() => ethicsCommittees.id),
  kind: varchar("kind", { length: 64 }).notNull(),
  referenceNumber: varchar("reference_number", { length: 128 }),
  status: varchar("status", { length: 64 }).notNull().default("draft"),
  decision: varchar("decision", { length: 64 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only. Application code must never UPDATE/DELETE rows.
 * Integrity: GLOBAL hash chain via sequence + previousHash + eventHash.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequence: integer("sequence").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id"),
    previousState: jsonb("previous_state"),
    newState: jsonb("new_state"),
    reason: text("reason"),
    requestMeta: jsonb("request_meta"),
    previousHash: varchar("previous_hash", { length: 64 }).notNull(),
    eventHash: varchar("event_hash", { length: 64 }).notNull(),
  },
  (t) => [uniqueIndex("audit_events_sequence_uidx").on(t.sequence)],
);

export const dataExports = pgTable("data_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  studyId: uuid("study_id").references(() => studies.id),
  kind: varchar("kind", { length: 64 }).notNull(),
  format: varchar("format", { length: 32 }).notNull().default("csv"),
  createdBy: uuid("created_by").references(() => users.id),
  payloadPath: text("payload_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
