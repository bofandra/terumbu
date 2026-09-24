CREATE TABLE IF NOT EXISTS "expedition_reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "expedition_id" uuid NOT NULL,
  "departure_id" uuid,
  "remind_at" timestamp with time zone NOT NULL,
  "channel" varchar(40) DEFAULT 'in_app_email' NOT NULL,
  "status" varchar(40) DEFAULT 'scheduled' NOT NULL,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_reminders" ADD CONSTRAINT "expedition_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_reminders" ADD CONSTRAINT "expedition_reminders_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_reminders" ADD CONSTRAINT "expedition_reminders_departure_id_expedition_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."expedition_departures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_reminders_user_idx" ON "expedition_reminders" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_reminders_due_idx" ON "expedition_reminders" USING btree ("status","remind_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_reminders_expedition_idx" ON "expedition_reminders" USING btree ("expedition_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "expedition_reminders_unique_idx" ON "expedition_reminders" USING btree ("user_id","expedition_id","remind_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "expedition_media_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expedition_id" uuid NOT NULL,
  "booking_id" uuid NOT NULL,
  "user_id" uuid,
  "media_type" varchar(40) DEFAULT 'photo' NOT NULL,
  "media_url" text NOT NULL,
  "caption" text,
  "status" varchar(40) DEFAULT 'pending' NOT NULL,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamp with time zone,
  "rejection_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_media_submissions" ADD CONSTRAINT "expedition_media_submissions_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_media_submissions" ADD CONSTRAINT "expedition_media_submissions_booking_id_expedition_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."expedition_bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_media_submissions" ADD CONSTRAINT "expedition_media_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expedition_media_submissions" ADD CONSTRAINT "expedition_media_submissions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_media_submissions_expedition_idx" ON "expedition_media_submissions" USING btree ("expedition_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_media_submissions_booking_idx" ON "expedition_media_submissions" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_media_submissions_user_idx" ON "expedition_media_submissions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expedition_media_submissions_status_idx" ON "expedition_media_submissions" USING btree ("status");
