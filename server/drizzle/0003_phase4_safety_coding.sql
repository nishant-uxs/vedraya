-- Phase 4: safety fields, coding dictionaries, study memberships, rate-limit buckets
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "causality" varchar(64);
--> statement-breakpoint
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "outcome" varchar(64);
--> statement-breakpoint
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "action_taken" varchar(64);
--> statement-breakpoint
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "coding_status" varchar(32) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "seriousness_criteria" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_dictionaries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(64) NOT NULL UNIQUE,
  "version" varchar(32) NOT NULL,
  "kind" varchar(32) NOT NULL,
  "label" varchar(255) NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dictionary_id" uuid NOT NULL REFERENCES "coding_dictionaries"("id") ON DELETE cascade,
  "code" varchar(64) NOT NULL,
  "term" varchar(255) NOT NULL,
  "preferred_term" varchar(255) NOT NULL,
  "system_organ_class" varchar(255),
  "search_text" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coding_term_uidx" ON "coding_terms" ("dictionary_id","code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(64) NOT NULL,
  "entity_id" uuid NOT NULL,
  "dictionary_id" uuid NOT NULL REFERENCES "coding_dictionaries"("id"),
  "term_id" uuid NOT NULL REFERENCES "coding_terms"("id"),
  "free_text" text NOT NULL,
  "coded_by" uuid REFERENCES "users"("id"),
  "coded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" varchar(32) DEFAULT 'coded' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concomitant_medications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "adverse_event_id" uuid NOT NULL REFERENCES "adverse_events"("id") ON DELETE cascade,
  "study_id" uuid NOT NULL REFERENCES "studies"("id") ON DELETE cascade,
  "free_text" varchar(255) NOT NULL,
  "dose" varchar(128),
  "route" varchar(64),
  "coding_status" varchar(32) DEFAULT 'pending' NOT NULL,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "study_id" uuid NOT NULL REFERENCES "studies"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "study_membership_uidx" ON "study_memberships" ("user_id","study_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "bucket_key" varchar(255) PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "reset_at" timestamp with time zone NOT NULL
);
