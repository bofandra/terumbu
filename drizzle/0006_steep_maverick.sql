CREATE TABLE "campaign_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"source_update_id" uuid,
	"source_evidence_id" uuid,
	"impact_site_id" uuid,
	"created_by_user_id" uuid,
	"activity_code" varchar(120) NOT NULL,
	"title" varchar(220) NOT NULL,
	"body" text,
	"activity_type" varchar(80) DEFAULT 'field_note' NOT NULL,
	"media_url" text,
	"evidence_type" varchar(80),
	"visibility_status" varchar(80) DEFAULT 'published' NOT NULL,
	"verification_status" "evidence_status",
	"storage_provider" varchar(80),
	"published_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_source_update_id_campaign_updates_id_fk" FOREIGN KEY ("source_update_id") REFERENCES "public"."campaign_updates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_source_evidence_id_project_evidence_id_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."project_evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_impact_site_id_impact_sites_id_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_activity_code_idx" ON "campaign_activity" USING btree ("activity_code");--> statement-breakpoint
CREATE INDEX "campaign_activity_campaign_idx" ON "campaign_activity" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_activity_update_idx" ON "campaign_activity" USING btree ("source_update_id");--> statement-breakpoint
CREATE INDEX "campaign_activity_evidence_idx" ON "campaign_activity" USING btree ("source_evidence_id");--> statement-breakpoint
CREATE INDEX "campaign_activity_status_idx" ON "campaign_activity" USING btree ("visibility_status","verification_status");--> statement-breakpoint
INSERT INTO "campaign_activity" (
	"campaign_id",
	"source_update_id",
	"activity_code",
	"title",
	"body",
	"activity_type",
	"media_url",
	"visibility_status",
	"published_at",
	"metadata",
	"created_at"
)
SELECT
	"campaign_id",
	"id",
	'ACT-UPD-' || substr(replace("id"::text, '-', ''), 1, 16),
	"title",
	"body",
	'field_note',
	"image_url",
	'published',
	"published_at",
	jsonb_build_object('migratedFrom', 'campaign_updates'),
	"created_at"
FROM "campaign_updates"
ON CONFLICT ("activity_code") DO NOTHING;--> statement-breakpoint
INSERT INTO "campaign_activity" (
	"campaign_id",
	"source_evidence_id",
	"impact_site_id",
	"created_by_user_id",
	"activity_code",
	"title",
	"body",
	"activity_type",
	"media_url",
	"evidence_type",
	"visibility_status",
	"verification_status",
	"storage_provider",
	"verified_at",
	"metadata",
	"created_at"
)
SELECT
	"campaign_id",
	"id",
	"impact_site_id",
	"uploaded_by_user_id",
	'ACT-EVD-' || substr(replace("id"::text, '-', ''), 1, 16),
	"title",
	coalesce("metadata"->>'observation', "metadata"->>'summary'),
	"evidence_type",
	"file_url",
	"evidence_type",
	'evidence_only',
	"verification_status",
	"storage_provider",
	"verified_at",
	coalesce("metadata", '{}'::jsonb) || jsonb_build_object('migratedFrom', 'project_evidence', 'evidenceCode', "evidence_code"),
	"created_at"
FROM "project_evidence"
ON CONFLICT ("activity_code") DO NOTHING;
