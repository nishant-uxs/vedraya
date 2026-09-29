-- Phase 6: PS alignment — quality + AE reporting timelines
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "reporting_due_at" timestamp with time zone;
ALTER TABLE "adverse_events" ADD COLUMN IF NOT EXISTS "authority_notified_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocol_deviations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "study_id" uuid NOT NULL,
  "participant_id" uuid,
  "site_id" uuid,
  "code" varchar(64) NOT NULL,
  "description" text NOT NULL,
  "severity" varchar(32) DEFAULT 'minor' NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "detected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_queries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "study_id" uuid NOT NULL,
  "participant_id" uuid,
  "code" varchar(64) NOT NULL,
  "question" text NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "raised_at" timestamp with time zone DEFAULT now() NOT NULL,
  "closed_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "protocol_deviations" ADD CONSTRAINT "protocol_deviations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "data_queries" ADD CONSTRAINT "data_queries_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "data_queries" ADD CONSTRAINT "data_queries_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "protocol_deviations_code_uidx" ON "protocol_deviations" ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_queries_code_uidx" ON "data_queries" ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "protocol_deviations_study_idx" ON "protocol_deviations" ("study_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_queries_study_idx" ON "data_queries" ("study_id");
