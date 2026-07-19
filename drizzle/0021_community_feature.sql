CREATE TABLE "community_chapters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_by_user_id" uuid,
  "name" varchar(180) NOT NULL,
  "slug" varchar(180) NOT NULL,
  "region" varchar(160) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(80) DEFAULT 'published' NOT NULL,
  "image_url" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_chapters_slug_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_chapter_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chapter_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(80) DEFAULT 'member' NOT NULL,
  "status" varchar(80) DEFAULT 'active' NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_chapter_members_unique_idx" UNIQUE("chapter_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_user_id" uuid,
  "chapter_id" uuid,
  "campaign_id" uuid,
  "event_id" uuid,
  "challenge_id" uuid,
  "title" varchar(220) NOT NULL,
  "slug" varchar(220) NOT NULL,
  "body" text NOT NULL,
  "post_type" varchar(80) DEFAULT 'story' NOT NULL,
  "status" varchar(80) DEFAULT 'published' NOT NULL,
  "media_url" text,
  "published_at" timestamp with time zone,
  "hidden_at" timestamp with time zone,
  "hidden_by_user_id" uuid,
  "moderation_reason" text,
  "deleted_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_posts_slug_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_user_id" uuid,
  "chapter_id" uuid,
  "campaign_id" uuid,
  "expedition_id" uuid,
  "impact_site_id" uuid,
  "title" varchar(220) NOT NULL,
  "slug" varchar(220) NOT NULL,
  "summary" text NOT NULL,
  "description" text NOT NULL,
  "event_type" varchar(80) DEFAULT 'volunteer' NOT NULL,
  "status" varchar(80) DEFAULT 'published' NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "location" varchar(220) NOT NULL,
  "capacity" integer DEFAULT 40 NOT NULL,
  "waitlist_enabled" boolean DEFAULT true NOT NULL,
  "image_url" text,
  "published_at" timestamp with time zone,
  "hidden_at" timestamp with time zone,
  "hidden_by_user_id" uuid,
  "moderation_reason" text,
  "deleted_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_events_slug_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_event_registrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" varchar(80) DEFAULT 'registered' NOT NULL,
  "registered_at" timestamp with time zone DEFAULT now() NOT NULL,
  "checked_in_at" timestamp with time zone,
  "attendance_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_event_registrations_unique_idx" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "community_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_user_id" uuid,
  "chapter_id" uuid,
  "campaign_id" uuid,
  "course_id" uuid,
  "title" varchar(220) NOT NULL,
  "slug" varchar(220) NOT NULL,
  "summary" text NOT NULL,
  "description" text NOT NULL,
  "challenge_type" varchar(80) DEFAULT 'volunteer' NOT NULL,
  "status" varchar(80) DEFAULT 'open' NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "goal_metric" varchar(120) DEFAULT 'actions' NOT NULL,
  "goal_target" integer DEFAULT 1 NOT NULL,
  "unit" varchar(80) DEFAULT 'actions' NOT NULL,
  "image_url" text,
  "published_at" timestamp with time zone,
  "hidden_at" timestamp with time zone,
  "hidden_by_user_id" uuid,
  "moderation_reason" text,
  "deleted_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_challenges_slug_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_challenge_participations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" varchar(80) DEFAULT 'active' NOT NULL,
  "progress_total" integer DEFAULT 0 NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_challenge_participations_unique_idx" UNIQUE("challenge_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "community_challenge_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participation_id" uuid NOT NULL,
  "challenge_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "amount" integer DEFAULT 1 NOT NULL,
  "note" text,
  "evidence_url" text,
  "metadata" jsonb,
  "logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_type" varchar(40) NOT NULL,
  "target_id" uuid NOT NULL,
  "parent_comment_id" uuid,
  "author_user_id" uuid,
  "body" text NOT NULL,
  "status" varchar(80) DEFAULT 'published' NOT NULL,
  "hidden_at" timestamp with time zone,
  "hidden_by_user_id" uuid,
  "moderation_reason" text,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_type" varchar(40) NOT NULL,
  "target_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "reaction_type" varchar(40) DEFAULT 'celebrate' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_reactions_unique_idx" UNIQUE("user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_type" varchar(40) NOT NULL,
  "target_id" uuid NOT NULL,
  "reporter_user_id" uuid NOT NULL,
  "reason" varchar(120) NOT NULL,
  "detail" text,
  "status" varchar(80) DEFAULT 'open' NOT NULL,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamp with time zone,
  "action_taken" varchar(120),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_reports_unique_idx" UNIQUE("reporter_user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "community_score_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "source_type" varchar(80) NOT NULL,
  "source_id" uuid NOT NULL,
  "score" integer NOT NULL,
  "reason" varchar(160) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "community_score_events_unique_idx" UNIQUE("user_id","source_type","source_id")
);
--> statement-breakpoint
ALTER TABLE "community_chapters" ADD CONSTRAINT "community_chapters_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_chapter_memberships" ADD CONSTRAINT "community_chapter_memberships_chapter_id_community_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."community_chapters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_chapter_memberships" ADD CONSTRAINT "community_chapter_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_chapter_id_community_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."community_chapters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_chapter_id_community_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."community_chapters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_impact_site_id_impact_sites_id_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_event_registrations" ADD CONSTRAINT "community_event_registrations_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_event_registrations" ADD CONSTRAINT "community_event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_chapter_id_community_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."community_chapters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenge_participations" ADD CONSTRAINT "community_challenge_participations_challenge_id_community_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."community_challenges"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenge_participations" ADD CONSTRAINT "community_challenge_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenge_progress" ADD CONSTRAINT "community_challenge_progress_participation_id_community_challenge_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."community_challenge_participations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenge_progress" ADD CONSTRAINT "community_challenge_progress_challenge_id_community_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."community_challenges"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_challenge_progress" ADD CONSTRAINT "community_challenge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_score_events" ADD CONSTRAINT "community_score_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_chapters_status_idx" ON "community_chapters" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "community_chapter_members_user_idx" ON "community_chapter_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "community_chapter_members_status_idx" ON "community_chapter_memberships" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "community_posts_author_idx" ON "community_posts" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX "community_posts_chapter_idx" ON "community_posts" USING btree ("chapter_id");
--> statement-breakpoint
CREATE INDEX "community_posts_status_idx" ON "community_posts" USING btree ("status","hidden_at","deleted_at");
--> statement-breakpoint
CREATE INDEX "community_events_author_idx" ON "community_events" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX "community_events_chapter_idx" ON "community_events" USING btree ("chapter_id");
--> statement-breakpoint
CREATE INDEX "community_events_starts_at_idx" ON "community_events" USING btree ("starts_at");
--> statement-breakpoint
CREATE INDEX "community_events_status_idx" ON "community_events" USING btree ("status","hidden_at","deleted_at");
--> statement-breakpoint
CREATE INDEX "community_event_registrations_status_idx" ON "community_event_registrations" USING btree ("event_id","status");
--> statement-breakpoint
CREATE INDEX "community_event_registrations_user_idx" ON "community_event_registrations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "community_challenges_author_idx" ON "community_challenges" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX "community_challenges_chapter_idx" ON "community_challenges" USING btree ("chapter_id");
--> statement-breakpoint
CREATE INDEX "community_challenges_status_idx" ON "community_challenges" USING btree ("status","hidden_at","deleted_at");
--> statement-breakpoint
CREATE INDEX "community_challenge_participations_status_idx" ON "community_challenge_participations" USING btree ("challenge_id","status");
--> statement-breakpoint
CREATE INDEX "community_challenge_participations_user_idx" ON "community_challenge_participations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "community_challenge_progress_participation_idx" ON "community_challenge_progress" USING btree ("participation_id");
--> statement-breakpoint
CREATE INDEX "community_challenge_progress_challenge_idx" ON "community_challenge_progress" USING btree ("challenge_id");
--> statement-breakpoint
CREATE INDEX "community_challenge_progress_user_idx" ON "community_challenge_progress" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "community_comments_target_idx" ON "community_comments" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX "community_comments_parent_idx" ON "community_comments" USING btree ("parent_comment_id");
--> statement-breakpoint
CREATE INDEX "community_comments_author_idx" ON "community_comments" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX "community_comments_status_idx" ON "community_comments" USING btree ("status","hidden_at","deleted_at");
--> statement-breakpoint
CREATE INDEX "community_reactions_target_idx" ON "community_reactions" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX "community_reports_target_idx" ON "community_reports" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX "community_reports_status_idx" ON "community_reports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "community_score_events_user_idx" ON "community_score_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "community_score_events_source_idx" ON "community_score_events" USING btree ("source_type","source_id");
