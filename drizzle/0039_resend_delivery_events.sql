ALTER TABLE "email_logs" ADD COLUMN "provider_event_type" varchar(80);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "provider_event_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "email_logs_provider_message_idx" ON "email_logs" USING btree ("provider_message_id");
