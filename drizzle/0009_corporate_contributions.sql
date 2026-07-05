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

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_account_fk"
    FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_program_id_corporate_programs_id_fk"
    FOREIGN KEY ("program_id") REFERENCES "corporate_programs"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_campaign_id_campaigns_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "corporate_contributions" ADD CONSTRAINT "corporate_contributions_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_contributions_reference_idx" ON "corporate_contributions" ("reference_code");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_contributions_program_campaign_type_idx" ON "corporate_contributions" ("program_id", "campaign_id", "contribution_type");
CREATE INDEX IF NOT EXISTS "corporate_contributions_account_idx" ON "corporate_contributions" ("corporate_account_id");
CREATE INDEX IF NOT EXISTS "corporate_contributions_program_idx" ON "corporate_contributions" ("program_id");
CREATE INDEX IF NOT EXISTS "corporate_contributions_campaign_idx" ON "corporate_contributions" ("campaign_id");
CREATE INDEX IF NOT EXISTS "corporate_contributions_status_idx" ON "corporate_contributions" ("status");
