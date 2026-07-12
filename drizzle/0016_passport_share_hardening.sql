ALTER TABLE "impact_passports" ADD COLUMN "share_token" varchar(160);
ALTER TABLE "impact_passports" ADD COLUMN "share_expires_at" timestamp with time zone;
ALTER TABLE "impact_passports" ADD COLUMN "share_access_hash" text;
ALTER TABLE "impact_passports" ADD COLUMN "category_visibility" jsonb;
ALTER TABLE "impact_passports" ADD COLUMN "evidence_consent" varchar(40) DEFAULT 'show_evidence' NOT NULL;
ALTER TABLE "impact_passports" ADD COLUMN "share_updated_at" timestamp with time zone;

CREATE INDEX "impact_passports_share_token_idx" ON "impact_passports" ("share_token");
