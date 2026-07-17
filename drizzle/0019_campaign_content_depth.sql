CREATE TABLE "campaign_media_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "title" varchar(220) NOT NULL,
  "media_type" varchar(80) DEFAULT 'image' NOT NULL,
  "file_url" text NOT NULL,
  "thumbnail_url" text,
  "alt_text" text,
  "caption" text,
  "provenance" varchar(220),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_media_items" ADD CONSTRAINT "campaign_media_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "campaign_media_items_campaign_idx" ON "campaign_media_items" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX "campaign_media_items_campaign_sort_idx" ON "campaign_media_items" USING btree ("campaign_id","sort_order");
--> statement-breakpoint
CREATE INDEX "campaign_media_items_featured_idx" ON "campaign_media_items" USING btree ("campaign_id","is_featured");
--> statement-breakpoint
CREATE TABLE "campaign_budget_line_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "category" varchar(160) NOT NULL,
  "description" text,
  "amount" numeric(14, 2) NOT NULL,
  "spent_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_budget_line_items" ADD CONSTRAINT "campaign_budget_line_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "campaign_budget_line_items_campaign_idx" ON "campaign_budget_line_items" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX "campaign_budget_line_items_campaign_sort_idx" ON "campaign_budget_line_items" USING btree ("campaign_id","sort_order");
--> statement-breakpoint
CREATE TABLE "campaign_timeline_phases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "title" varchar(220) NOT NULL,
  "description" text,
  "status" varchar(80) DEFAULT 'planned' NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "deliverable" text,
  "evidence_note" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_timeline_phases" ADD CONSTRAINT "campaign_timeline_phases_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "campaign_timeline_phases_campaign_idx" ON "campaign_timeline_phases" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX "campaign_timeline_phases_campaign_sort_idx" ON "campaign_timeline_phases" USING btree ("campaign_id","sort_order");
--> statement-breakpoint
CREATE INDEX "campaign_timeline_phases_status_idx" ON "campaign_timeline_phases" USING btree ("status");
--> statement-breakpoint
CREATE TABLE "organization_team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" varchar(160) NOT NULL,
  "role" varchar(160) NOT NULL,
  "bio" text,
  "image_url" text,
  "profile_url" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_public" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_team_members" ADD CONSTRAINT "organization_team_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "organization_team_members_organization_idx" ON "organization_team_members" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "organization_team_members_public_sort_idx" ON "organization_team_members" USING btree ("organization_id","is_public","sort_order");
