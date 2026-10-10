CREATE TABLE "resend_webhook_events" (
  "event_id" varchar(256) PRIMARY KEY NOT NULL,
  "provider_message_id" varchar(255) NOT NULL,
  "event_type" varchar(80) NOT NULL,
  "event_at" timestamp with time zone NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "applied_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "resend_webhook_events_provider_idx" ON "resend_webhook_events" USING btree ("provider_message_id", "event_at");
--> statement-breakpoint
CREATE INDEX "resend_webhook_events_retention_idx" ON "resend_webhook_events" USING btree ("received_at");
