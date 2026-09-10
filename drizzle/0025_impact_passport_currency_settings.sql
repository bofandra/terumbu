ALTER TABLE "campaigns" ADD COLUMN "currency" varchar(8);
--> statement-breakpoint
UPDATE "campaigns" SET "currency" = 'IDR' WHERE "currency" IS NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "currency" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "impact_unit_cost" numeric(14, 2);
--> statement-breakpoint
UPDATE "campaigns"
SET "impact_unit_cost" = round("goal_amount" / nullif("impact_target", 0), 2)
WHERE "impact_target" > 0 AND "impact_unit_cost" IS NULL;
--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "expeditions" ADD COLUMN "currency" varchar(8);
--> statement-breakpoint
UPDATE "expeditions" SET "currency" = 'IDR' WHERE "currency" IS NULL;
--> statement-breakpoint
ALTER TABLE "expeditions" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "expeditions" ALTER COLUMN "currency" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "expedition_bookings" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "payment_operations" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "impact_passports" ADD COLUMN "passport_number" varchar(32);
--> statement-breakpoint
UPDATE "impact_passports"
SET "passport_number" = 'TRB-PASS-' || to_char("created_at", 'YYYY') || '-' || upper(right(replace("id"::text, '-', ''), 8))
WHERE "passport_number" IS NULL;
--> statement-breakpoint
ALTER TABLE "impact_passports" ALTER COLUMN "passport_number" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "impact_passports_number_idx" ON "impact_passports" USING btree ("passport_number");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(120) NOT NULL,
  "value" jsonb,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_settings_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_settings_key_idx" ON "platform_settings" USING btree ("key");
--> statement-breakpoint
UPDATE "impact_passport_items" AS "item"
SET "metadata" = coalesce("item"."metadata", '{}'::jsonb) || jsonb_build_object(
  'hours',
  coalesce("registration"."attendance_hours", 0),
  'verificationStatus',
  'Verified by Terumbu.eco'
)
FROM "impact_passports" AS "passport"
INNER JOIN "community_event_registrations" AS "registration"
  ON "registration"."user_id" = "passport"."user_id"
WHERE "item"."passport_id" = "passport"."id"
  AND "item"."source_type" = 'community_event'
  AND "item"."source_id" = "registration"."event_id"
  AND coalesce("registration"."attendance_hours", 0) > 0;
