CREATE TABLE IF NOT EXISTS "destinations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(180) NOT NULL,
  "slug" varchar(180) NOT NULL,
  "province" varchar(120) NOT NULL,
  "island_group" varchar(120) NOT NULL,
  "eyebrow" varchar(220),
  "headline" varchar(260) NOT NULL,
  "summary" text NOT NULL,
  "hero_image_url" text,
  "conservation_focus" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "arrival_hubs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "best_months" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "travel_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "responsible_travel_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(40) DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "destinations_slug_idx" ON "destinations" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "destinations_status_idx" ON "destinations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "destinations_province_idx" ON "destinations" USING btree ("province");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "destinations_island_group_idx" ON "destinations" USING btree ("island_group");
--> statement-breakpoint

ALTER TABLE "expeditions" ADD COLUMN IF NOT EXISTS "destination_id" uuid;
--> statement-breakpoint
ALTER TABLE "impact_sites" ADD COLUMN IF NOT EXISTS "destination_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "impact_sites" ADD CONSTRAINT "impact_sites_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expeditions_destination_idx" ON "expeditions" USING btree ("destination_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "impact_sites_destination_idx" ON "impact_sites" USING btree ("destination_id");
--> statement-breakpoint

INSERT INTO "destinations" (
  "id", "name", "slug", "province", "island_group", "eyebrow", "headline", "summary",
  "conservation_focus", "arrival_hubs", "best_months", "travel_notes", "responsible_travel_notes",
  "status", "published_at", "updated_at"
) VALUES
(
  'f1000000-0000-4000-8000-000000000001',
  'Raja Ampat',
  'raja-ampat',
  'Southwest Papua',
  'Papua',
  'Southwest Papua conservation travel',
  'Conservation expeditions in Raja Ampat',
  'Explore Raja Ampat through conservation expeditions managed by Terumbu partners and linked to field impact records.',
  '["Coral restoration","Reef monitoring","Community conservation","Marine conservation"]'::jsonb,
  '[{"type":"airport","name":"Domine Eduard Osok Airport, Sorong","code":"SOQ"},{"type":"city","name":"Sorong","code":""}]'::jsonb,
  '[]'::jsonb,
  '["Confirm the expedition meeting point and transfer plan before arranging onward travel.","Remote island transfers can change with weather and sea conditions."]'::jsonb,
  '["Follow partner and protected-area guidance while visiting reef and community sites."]'::jsonb,
  'published',
  now(),
  now()
),
(
  'f1000000-0000-4000-8000-000000000002',
  'Bali',
  'bali',
  'Bali',
  'Bali & Nusa Tenggara',
  'Bali conservation travel',
  'Conservation expeditions in Bali',
  'Explore Bali through conservation expeditions managed by Terumbu partners and linked to field impact records.',
  '["Coral restoration","Marine debris reduction","Environmental education","Community conservation"]'::jsonb,
  '[{"type":"airport","name":"I Gusti Ngurah Rai International Airport","code":"DPS"}]'::jsonb,
  '[]'::jsonb,
  '["Confirm the transfer time from the arrival hub to the expedition meeting point."]'::jsonb,
  '["Use locally managed services and follow site-specific waste and wildlife guidance."]'::jsonb,
  'published',
  now(),
  now()
),
(
  'f1000000-0000-4000-8000-000000000003',
  'Komodo',
  'komodo',
  'East Nusa Tenggara',
  'Bali & Nusa Tenggara',
  'Flores and Komodo conservation travel',
  'Conservation expeditions around Komodo',
  'Explore Flores and Komodo through conservation expeditions managed by Terumbu partners and linked to field impact records.',
  '["Marine conservation","Coastal restoration","Community conservation","Wildlife monitoring"]'::jsonb,
  '[{"type":"airport","name":"Komodo Airport, Labuan Bajo","code":"LBJ"},{"type":"city","name":"Labuan Bajo","code":""}]'::jsonb,
  '[]'::jsonb,
  '["Boat routes and meeting points depend on the selected expedition and departure."]'::jsonb,
  '["Protected-area and wildlife rules take priority over itinerary convenience."]'::jsonb,
  'published',
  now(),
  now()
),
(
  'f1000000-0000-4000-8000-000000000004',
  'Wakatobi',
  'wakatobi',
  'Southeast Sulawesi',
  'Sulawesi',
  'Southeast Sulawesi conservation travel',
  'Conservation expeditions in Wakatobi',
  'Explore Wakatobi through conservation expeditions managed by Terumbu partners and linked to field impact records.',
  '["Reef monitoring","Coral restoration","Marine conservation","Environmental education"]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '["Check the selected expedition for its exact arrival route and meeting point."]'::jsonb,
  '["Respect local conservation rules and partner guidance in reef and community areas."]'::jsonb,
  'published',
  now(),
  now()
),
(
  'f1000000-0000-4000-8000-000000000005',
  'Lombok',
  'lombok',
  'West Nusa Tenggara',
  'Bali & Nusa Tenggara',
  'Lombok conservation travel',
  'Conservation expeditions in Lombok',
  'Explore Lombok and the Gilis through conservation expeditions managed by Terumbu partners and linked to field impact records.',
  '["Coral restoration","Reef monitoring","Waste reduction","Community conservation"]'::jsonb,
  '[{"type":"airport","name":"Zainuddin Abdul Madjid International Airport","code":"LOP"}]'::jsonb,
  '[]'::jsonb,
  '["Confirm whether the selected expedition starts on mainland Lombok or an offshore island."]'::jsonb,
  '["Follow local reef, waste, and community guidance provided by the expedition host."]'::jsonb,
  'published',
  now(),
  now()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = excluded."name",
  "province" = excluded."province",
  "island_group" = excluded."island_group",
  "eyebrow" = excluded."eyebrow",
  "headline" = excluded."headline",
  "summary" = excluded."summary",
  "conservation_focus" = excluded."conservation_focus",
  "arrival_hubs" = excluded."arrival_hubs",
  "travel_notes" = excluded."travel_notes",
  "responsible_travel_notes" = excluded."responsible_travel_notes",
  "updated_at" = now();
--> statement-breakpoint

UPDATE "expeditions"
SET "destination_id" = CASE
  WHEN lower("region") LIKE '%raja ampat%' OR lower("region") LIKE '%sorong%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'raja-ampat')
  WHEN lower("region") LIKE '%bali%' OR lower("region") LIKE '%denpasar%' OR lower("region") LIKE '%nusa penida%' OR lower("region") LIKE '%nusa lembongan%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'bali')
  WHEN lower("region") LIKE '%komodo%' OR lower("region") LIKE '%labuan bajo%' OR lower("region") LIKE '%flores%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'komodo')
  WHEN lower("region") LIKE '%wakatobi%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'wakatobi')
  WHEN lower("region") LIKE '%lombok%' OR lower("region") LIKE '%gili%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'lombok')
  ELSE "destination_id"
END
WHERE "destination_id" IS NULL;
--> statement-breakpoint

UPDATE "impact_sites"
SET "destination_id" = CASE
  WHEN lower("region") LIKE '%raja ampat%' OR lower("region") LIKE '%sorong%' OR lower("region") LIKE '%papua%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'raja-ampat')
  WHEN lower("region") LIKE '%bali%' OR lower("region") LIKE '%denpasar%' OR lower("region") LIKE '%nusa penida%' OR lower("region") LIKE '%nusa lembongan%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'bali')
  WHEN lower("region") LIKE '%komodo%' OR lower("region") LIKE '%labuan bajo%' OR lower("region") LIKE '%flores%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'komodo')
  WHEN lower("region") LIKE '%wakatobi%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'wakatobi')
  WHEN lower("region") LIKE '%lombok%' OR lower("region") LIKE '%gili%' THEN (SELECT "id" FROM "destinations" WHERE "slug" = 'lombok')
  ELSE "destination_id"
END
WHERE "destination_id" IS NULL;
