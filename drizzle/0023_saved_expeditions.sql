CREATE TABLE "user_saved_expeditions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "expedition_id" uuid NOT NULL,
  "status" varchar(80) DEFAULT 'active' NOT NULL,
  "saved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_saved_expeditions" ADD CONSTRAINT "user_saved_expeditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_saved_expeditions" ADD CONSTRAINT "user_saved_expeditions_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "user_saved_expeditions_user_idx" ON "user_saved_expeditions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "user_saved_expeditions_expedition_idx" ON "user_saved_expeditions" USING btree ("expedition_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_saved_expeditions_unique_idx" ON "user_saved_expeditions" USING btree ("user_id","expedition_id");
