DO $$ BEGIN
  CREATE TYPE "public"."expedition_status" AS ENUM('draft', 'review', 'published', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "expeditions" ADD COLUMN IF NOT EXISTS "status" "expedition_status" DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "expeditions" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "expeditions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "expeditions"
SET "status" = 'published',
    "published_at" = COALESCE("published_at", "created_at"),
    "updated_at" = COALESCE("updated_at", now())
WHERE "status" = 'draft';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expeditions_status_idx" ON "expeditions" USING btree ("status");