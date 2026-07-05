CREATE TABLE IF NOT EXISTS "assessment_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "assessment_id" uuid NOT NULL,
  "question_text" text NOT NULL,
  "position" integer NOT NULL,
  "points" integer DEFAULT 1 NOT NULL,
  "status" varchar(80) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "assessment_choices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL,
  "choice_text" text NOT NULL,
  "is_correct" boolean DEFAULT false NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "corporate_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "corporate_account_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "campaign_id" uuid NOT NULL,
  "created_by_user_id" uuid,
  "reference_code" varchar(160) NOT NULL,
  "contribution_type" varchar(80) DEFAULT 'csr' NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(8) DEFAULT 'IDR' NOT NULL,
  "status" varchar(80) DEFAULT 'committed' NOT NULL,
  "counts_toward_campaign_goal" boolean DEFAULT false NOT NULL,
  "contribution_date" timestamp with time zone DEFAULT now() NOT NULL,
  "notes" text,
  "metadata" jsonb,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "campaign_updates" ADD COLUMN IF NOT EXISTS "status" varchar(80) DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "is_preview" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "status" varchar(80) DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "project_evidence" ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_course_assessments_id_fk"
    FOREIGN KEY ("assessment_id") REFERENCES "course_assessments"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "assessment_choices" ADD CONSTRAINT "assessment_choices_question_id_assessment_questions_id_fk"
    FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_account_fk"
    FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_program_id_corporate_programs_id_fk"
    FOREIGN KEY ("program_id") REFERENCES "corporate_programs"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_campaign_id_campaigns_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "campaign_updates" ADD CONSTRAINT "campaign_updates_reviewed_by_user_id_users_id_fk"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_reviewed_by_user_id_users_id_fk"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "assessment_questions_assessment_idx" ON "assessment_questions" ("assessment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_questions_position_idx" ON "assessment_questions" ("assessment_id", "position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_choices_question_idx" ON "assessment_choices" ("question_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_choices_position_idx" ON "assessment_choices" ("question_id", "position");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_contributions_reference_idx" ON "corporate_contributions" ("reference_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_contributions_program_campaign_type_idx" ON "corporate_contributions" ("program_id", "campaign_id", "contribution_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contributions_account_idx" ON "corporate_contributions" ("corporate_account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contributions_program_idx" ON "corporate_contributions" ("program_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contributions_campaign_idx" ON "corporate_contributions" ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contributions_status_idx" ON "corporate_contributions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_updates_status_idx" ON "campaign_updates" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses" ("status");
