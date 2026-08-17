CREATE UNIQUE INDEX IF NOT EXISTS "monthly_impact_reports_user_month_idx" ON "monthly_impact_reports" USING btree ("user_id","report_month");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_notifications_code_idx" ON "user_notifications" USING btree ("user_id","notification_code");
