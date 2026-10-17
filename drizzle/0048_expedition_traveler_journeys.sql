ALTER TABLE "expedition_interest_requests" ADD COLUMN "proposed_departure_id" uuid REFERENCES "expedition_departures"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "expedition_interest_requests" ADD COLUMN "accepted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "expedition_interest_requests" ADD COLUMN "booking_id" uuid REFERENCES "expedition_bookings"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "expedition_interest_requests_proposed_departure_idx" ON "expedition_interest_requests" ("proposed_departure_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_interest_requests_booking_idx" ON "expedition_interest_requests" ("booking_id");
--> statement-breakpoint
CREATE TABLE "expedition_request_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES "expedition_interest_requests"("id") ON DELETE CASCADE,
  "sender_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "sender_role" varchar(20) NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "expedition_request_messages_body_check" CHECK (length("body") BETWEEN 1 AND 4000),
  CONSTRAINT "expedition_request_messages_role_check" CHECK ("sender_role" IN ('traveler', 'host'))
);
--> statement-breakpoint
CREATE INDEX "expedition_request_messages_request_idx" ON "expedition_request_messages" ("request_id", "created_at");
--> statement-breakpoint
CREATE INDEX "expedition_request_messages_sender_idx" ON "expedition_request_messages" ("sender_user_id");
--> statement-breakpoint
CREATE TABLE "expedition_booking_changes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "expedition_bookings"("id") ON DELETE CASCADE,
  "requested_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "source_departure_id" uuid NOT NULL REFERENCES "expedition_departures"("id"),
  "target_departure_id" uuid NOT NULL REFERENCES "expedition_departures"("id"),
  "participants_count" integer NOT NULL,
  "participant_names" jsonb NOT NULL,
  "original_amount" numeric(14,2) NOT NULL,
  "quoted_amount" numeric(14,2) NOT NULL,
  "currency" varchar(8) NOT NULL,
  "reason" text NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "quote_accepted_at" timestamptz,
  "adjustment_confirmed_at" timestamptz,
  "adjustment_reference" varchar(160),
  "processed_by_user_id" uuid REFERENCES "users"("id"),
  "decision_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "expedition_booking_changes_count_check" CHECK ("participants_count" BETWEEN 1 AND 12 AND jsonb_array_length("participant_names") = "participants_count"),
  CONSTRAINT "expedition_booking_changes_amount_check" CHECK ("original_amount" >= 0 AND "quoted_amount" >= 0),
  CONSTRAINT "expedition_booking_changes_status_check" CHECK ("status" IN ('pending', 'approved', 'declined', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_booking_changes_pending_idx" ON "expedition_booking_changes" ("booking_id") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE INDEX "expedition_booking_changes_booking_idx" ON "expedition_booking_changes" ("booking_id", "created_at");
--> statement-breakpoint
CREATE INDEX "expedition_booking_changes_requester_idx" ON "expedition_booking_changes" ("requested_by_user_id");
--> statement-breakpoint
CREATE INDEX "expedition_booking_changes_source_idx" ON "expedition_booking_changes" ("source_departure_id");
--> statement-breakpoint
CREATE INDEX "expedition_booking_changes_target_idx" ON "expedition_booking_changes" ("target_departure_id");
--> statement-breakpoint
CREATE INDEX "expedition_booking_changes_processor_idx" ON "expedition_booking_changes" ("processed_by_user_id");
