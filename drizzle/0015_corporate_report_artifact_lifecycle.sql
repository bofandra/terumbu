ALTER TABLE "corporate_report_exports" ADD COLUMN "export_format" varchar(80) DEFAULT 'html_json' NOT NULL;
--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "artifact_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "scheduled_for" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "generated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "artifact_manifest" jsonb;
--> statement-breakpoint
UPDATE "corporate_report_exports" SET "generated_at" = "created_at" WHERE "generated_at" IS NULL AND "status" <> 'scheduled';
--> statement-breakpoint
CREATE INDEX "corporate_report_exports_schedule_idx" ON "corporate_report_exports" USING btree ("status","scheduled_for");
