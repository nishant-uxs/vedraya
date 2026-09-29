-- Consent versions catalog + ethics committees + regulatory field extensions
CREATE TABLE IF NOT EXISTS "consent_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"version_label" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"effective_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consent_version_uidx" ON "consent_versions" USING btree ("study_id","version_label");
--> statement-breakpoint
ALTER TABLE "consent_versions" ADD CONSTRAINT "consent_versions_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ethics_committees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ethics_committees_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN IF NOT EXISTS "version_id" uuid;
--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consents" ADD CONSTRAINT "consents_version_id_consent_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."consent_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consents" ADD CONSTRAINT "consents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "regulatory_submissions" ADD COLUMN IF NOT EXISTS "ethics_committee_id" uuid;
--> statement-breakpoint
ALTER TABLE "regulatory_submissions" ADD COLUMN IF NOT EXISTS "decision" varchar(64);
--> statement-breakpoint
ALTER TABLE "regulatory_submissions" ADD COLUMN IF NOT EXISTS "due_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "regulatory_submissions" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "regulatory_submissions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_submissions" ADD CONSTRAINT "regulatory_submissions_ethics_committee_id_ethics_committees_id_fk" FOREIGN KEY ("ethics_committee_id") REFERENCES "public"."ethics_committees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_submissions" ADD CONSTRAINT "regulatory_submissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
