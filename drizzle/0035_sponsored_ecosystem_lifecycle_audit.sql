CREATE TABLE "sponsored_ecosystem_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sponsored_ecosystem_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "from_status" varchar(80) NOT NULL,
  "to_status" varchar(80) NOT NULL,
  "source" varchar(80) DEFAULT 'portal' NOT NULL,
  "reason" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sponsored_ecosystem_events" ADD CONSTRAINT "sponsored_ecosystem_events_ecosystem_fk" FOREIGN KEY ("sponsored_ecosystem_id") REFERENCES "public"."sponsored_ecosystems"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sponsored_ecosystem_events" ADD CONSTRAINT "sponsored_ecosystem_events_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sponsored_ecosystem_events_ecosystem_idx" ON "sponsored_ecosystem_events" USING btree ("sponsored_ecosystem_id");
--> statement-breakpoint
CREATE INDEX "sponsored_ecosystem_events_actor_idx" ON "sponsored_ecosystem_events" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "sponsored_ecosystem_events_created_at_idx" ON "sponsored_ecosystem_events" USING btree ("created_at");