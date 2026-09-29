-- Audit hash-chain columns (GLOBAL chain)
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "sequence" integer;
--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "previous_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "event_hash" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "audit_events_sequence_uidx" ON "audit_events" USING btree ("sequence");
