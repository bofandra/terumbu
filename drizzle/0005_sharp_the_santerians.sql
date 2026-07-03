ALTER TABLE "corporate_report_exports" ADD COLUMN "approved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "report_type" varchar(80) DEFAULT 'esg' NOT NULL;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "preview_url" text;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "evidence_bundle_url" text;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "public_slug" varchar(180);--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD CONSTRAINT "corporate_report_exports_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_report_exports_public_slug_idx" ON "corporate_report_exports" USING btree ("public_slug");