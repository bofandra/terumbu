CREATE TABLE "campaign_follow_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"email" varchar(255),
	"status" varchar(80) DEFAULT 'active' NOT NULL,
	"frequency" varchar(80) DEFAULT 'weekly' NOT NULL,
	"last_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_impact_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_month" varchar(7) NOT NULL,
	"status" varchar(80) DEFAULT 'ready' NOT NULL,
	"label" varchar(160) NOT NULL,
	"contributions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"campaign_updates" integer DEFAULT 0 NOT NULL,
	"new_evidence" integer DEFAULT 0 NOT NULL,
	"corals_monitored" integer DEFAULT 0 NOT NULL,
	"academy_progress" integer DEFAULT 0 NOT NULL,
	"emailed_at" timestamp with time zone,
	"metadata" jsonb,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_updates" boolean DEFAULT true NOT NULL,
	"evidence_alerts" boolean DEFAULT true NOT NULL,
	"expedition_reminders" boolean DEFAULT true NOT NULL,
	"academy_updates" boolean DEFAULT true NOT NULL,
	"monthly_impact_email" boolean DEFAULT true NOT NULL,
	"monthly_impact_report" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_code" varchar(180) NOT NULL,
	"category" varchar(120) NOT NULL,
	"title" varchar(220) NOT NULL,
	"message" text NOT NULL,
	"href" text NOT NULL,
	"source_type" varchar(80),
	"source_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"status" varchar(80) DEFAULT 'active' NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_follow_subscriptions" ADD CONSTRAINT "campaign_follow_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_follow_subscriptions" ADD CONSTRAINT "campaign_follow_subscriptions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_impact_reports" ADD CONSTRAINT "monthly_impact_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_campaigns" ADD CONSTRAINT "user_saved_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_campaigns" ADD CONSTRAINT "user_saved_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_follow_subscriptions_user_idx" ON "campaign_follow_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_follow_subscriptions_campaign_idx" ON "campaign_follow_subscriptions" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_follow_subscriptions_unique_idx" ON "campaign_follow_subscriptions" USING btree ("user_id","campaign_id");--> statement-breakpoint
CREATE INDEX "monthly_impact_reports_user_idx" ON "monthly_impact_reports" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_impact_reports_user_month_idx" ON "monthly_impact_reports" USING btree ("user_id","report_month");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_notifications_user_idx" ON "user_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_notifications_source_idx" ON "user_notifications" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notifications_code_idx" ON "user_notifications" USING btree ("user_id","notification_code");--> statement-breakpoint
CREATE INDEX "user_saved_campaigns_user_idx" ON "user_saved_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_saved_campaigns_campaign_idx" ON "user_saved_campaigns" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_saved_campaigns_unique_idx" ON "user_saved_campaigns" USING btree ("user_id","campaign_id");