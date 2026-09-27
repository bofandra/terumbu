ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "track_key" varchar(120);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "field_readiness" boolean DEFAULT false NOT NULL;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "related_expedition_id" uuid;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "related_campaign_id" uuid;

CREATE INDEX IF NOT EXISTS "courses_track_key_idx" ON "courses" USING btree ("track_key");
CREATE INDEX IF NOT EXISTS "courses_related_expedition_idx" ON "courses" USING btree ("related_expedition_id");
CREATE INDEX IF NOT EXISTS "courses_related_campaign_idx" ON "courses" USING btree ("related_campaign_id");