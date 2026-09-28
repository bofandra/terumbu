CREATE TABLE IF NOT EXISTS "campaign_impact_sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "impact_site_id" uuid NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expedition_impact_sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expedition_id" uuid NOT NULL,
  "impact_site_id" uuid NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "campaign_impact_sites" ADD CONSTRAINT "campaign_impact_sites_campaign_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "campaign_impact_sites" ADD CONSTRAINT "campaign_impact_sites_site_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "expedition_impact_sites" ADD CONSTRAINT "expedition_impact_sites_expedition_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "expedition_impact_sites" ADD CONSTRAINT "expedition_impact_sites_site_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_impact_sites_campaign_idx" ON "campaign_impact_sites" ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_impact_sites_site_idx" ON "campaign_impact_sites" ("impact_site_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_impact_sites_unique_idx" ON "campaign_impact_sites" ("campaign_id", "impact_site_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_impact_sites_expedition_idx" ON "expedition_impact_sites" ("expedition_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_impact_sites_site_idx" ON "expedition_impact_sites" ("impact_site_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "expedition_impact_sites_unique_idx" ON "expedition_impact_sites" ("expedition_id", "impact_site_id");
--> statement-breakpoint
INSERT INTO "campaign_impact_sites" ("campaign_id", "impact_site_id", "is_primary")
SELECT "campaign_id", "id", true FROM "impact_sites" WHERE "campaign_id" IS NOT NULL
ON CONFLICT ("campaign_id", "impact_site_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "expedition_impact_sites" ("expedition_id", "impact_site_id", "is_primary")
SELECT e."id", cis."impact_site_id", cis."is_primary"
FROM "expeditions" e
JOIN "campaign_impact_sites" cis ON cis."campaign_id" = e."related_campaign_id"
JOIN "impact_sites" s ON s."id" = cis."impact_site_id"
WHERE e."destination_id" IS NULL OR s."destination_id" IS NULL OR e."destination_id" = s."destination_id"
ON CONFLICT ("expedition_id", "impact_site_id") DO NOTHING;
