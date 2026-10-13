-- Append-only operational audit trail, separate from verified merchant/bank records.
CREATE TABLE "midtrans_compensation_case_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "operation_id" uuid NOT NULL REFERENCES "payment_operations"("id") ON DELETE RESTRICT,
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "event_type" varchar(50) NOT NULL,
  "evidence_channel" varchar(20) NOT NULL,
  "ticket_reference" varchar(64) NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "midtrans_compensation_case_event_type_check"
    CHECK ("event_type" IN ('contact_attempted','customer_reports_missing_credit','customer_reports_received','provider_trace_requested')),
  CONSTRAINT "midtrans_compensation_case_channel_check"
    CHECK ("evidence_channel" IN ('support_ticket','verified_email','verified_phone','provider_portal')),
  CONSTRAINT "midtrans_compensation_case_ticket_reference_check"
    CHECK ("ticket_reference" ~ '^[A-Za-z0-9_-]{3,64}$')
);
--> statement-breakpoint
CREATE INDEX "midtrans_compensation_case_events_operation_idx"
  ON "midtrans_compensation_case_events" ("operation_id", "recorded_at");
