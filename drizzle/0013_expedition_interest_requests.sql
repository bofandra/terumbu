CREATE TABLE "expedition_interest_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expedition_id" uuid NOT NULL,
  "departure_id" uuid,
  "user_id" uuid,
  "request_code" varchar(120) NOT NULL,
  "request_type" varchar(80) NOT NULL,
  "status" varchar(80) DEFAULT 'pending' NOT NULL,
  "contact_name" varchar(160) NOT NULL,
  "contact_email" varchar(255) NOT NULL,
  "participants_count" integer DEFAULT 1 NOT NULL,
  "preferred_start_at" timestamp with time zone,
  "message" text,
  "processed_by_user_id" uuid,
  "processed_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expedition_interest_requests" ADD CONSTRAINT "expedition_interest_requests_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expedition_interest_requests" ADD CONSTRAINT "expedition_interest_requests_departure_id_expedition_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."expedition_departures"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expedition_interest_requests" ADD CONSTRAINT "expedition_interest_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expedition_interest_requests" ADD CONSTRAINT "expedition_interest_requests_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_interest_requests_code_idx" ON "expedition_interest_requests" USING btree ("request_code");
--> statement-breakpoint
CREATE INDEX "expedition_interest_requests_expedition_idx" ON "expedition_interest_requests" USING btree ("expedition_id");
--> statement-breakpoint
CREATE INDEX "expedition_interest_requests_departure_idx" ON "expedition_interest_requests" USING btree ("departure_id");
--> statement-breakpoint
CREATE INDEX "expedition_interest_requests_user_idx" ON "expedition_interest_requests" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "expedition_interest_requests_status_idx" ON "expedition_interest_requests" USING btree ("status","request_type");
