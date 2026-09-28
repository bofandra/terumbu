CREATE TABLE "restoration_batches" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "campaign_id" uuid NOT NULL,
 "impact_site_id" uuid NOT NULL,
 "code" varchar(100) NOT NULL,
 "title" varchar(220) NOT NULL,
 "status" varchar(40) DEFAULT 'planned' NOT NULL,
 "planned_at" timestamp with time zone,
 "planted_at" timestamp with time zone,
 "monitored_at" timestamp with time zone,
 "created_by_user_id" uuid,
 "metadata" jsonb,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restoration_batch_allocations" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "batch_id" uuid NOT NULL,
 "sponsored_ecosystem_id" uuid NOT NULL,
 "unit_count" numeric(14,2) NOT NULL,
 "allocated_by_user_id" uuid,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN "restoration_batch_id" uuid;
--> statement-breakpoint
ALTER TABLE "restoration_batches" ADD CONSTRAINT "restoration_batches_campaign_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "restoration_batches" ADD CONSTRAINT "restoration_batches_site_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "restoration_batches" ADD CONSTRAINT "restoration_batches_creator_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "restoration_batch_allocations" ADD CONSTRAINT "restoration_batch_allocations_batch_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."restoration_batches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "restoration_batch_allocations" ADD CONSTRAINT "restoration_batch_allocations_ecosystem_fk" FOREIGN KEY ("sponsored_ecosystem_id") REFERENCES "public"."sponsored_ecosystems"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "restoration_batch_allocations" ADD CONSTRAINT "restoration_batch_allocations_actor_fk" FOREIGN KEY ("allocated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_restoration_batch_fk" FOREIGN KEY ("restoration_batch_id") REFERENCES "public"."restoration_batches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "restoration_batches_code_idx" ON "restoration_batches" USING btree ("code");
--> statement-breakpoint
CREATE INDEX "restoration_batches_campaign_idx" ON "restoration_batches" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX "restoration_batches_site_idx" ON "restoration_batches" USING btree ("impact_site_id");
--> statement-breakpoint
CREATE INDEX "restoration_batches_status_idx" ON "restoration_batches" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "restoration_batch_allocations_batch_idx" ON "restoration_batch_allocations" USING btree ("batch_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "restoration_batch_allocations_ecosystem_idx" ON "restoration_batch_allocations" USING btree ("sponsored_ecosystem_id");
--> statement-breakpoint
CREATE INDEX "project_evidence_restoration_batch_idx" ON "project_evidence" USING btree ("restoration_batch_id");