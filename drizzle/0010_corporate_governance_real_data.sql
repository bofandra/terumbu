CREATE TABLE IF NOT EXISTS "corporate_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "corporate_account_id" uuid NOT NULL,
  "integration_type" varchar(80) NOT NULL,
  "provider_name" varchar(160) NOT NULL,
  "owner" varchar(160) NOT NULL,
  "status" varchar(80) DEFAULT 'not_configured' NOT NULL,
  "next_action" varchar(240) NOT NULL,
  "last_sync_at" timestamp with time zone,
  "metadata" jsonb,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "corporate_security_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "corporate_account_id" uuid NOT NULL,
  "mfa_required" boolean DEFAULT false NOT NULL,
  "export_logging_enabled" boolean DEFAULT true NOT NULL,
  "session_history_enabled" boolean DEFAULT false NOT NULL,
  "retention_policy_days" integer,
  "domain_restriction_enabled" boolean DEFAULT false NOT NULL,
  "allowed_email_domains" text,
  "updated_by_user_id" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "corporate_integrations" ADD CONSTRAINT "corporate_integrations_account_fk"
    FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "corporate_security_settings" ADD CONSTRAINT "corporate_security_settings_account_fk"
    FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "corporate_security_settings" ADD CONSTRAINT "corporate_security_settings_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_integrations_account_provider_idx"
  ON "corporate_integrations" ("corporate_account_id", "integration_type", "provider_name");

CREATE INDEX IF NOT EXISTS "corporate_integrations_account_idx"
  ON "corporate_integrations" ("corporate_account_id");

CREATE INDEX IF NOT EXISTS "corporate_integrations_status_idx"
  ON "corporate_integrations" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_security_settings_account_idx"
  ON "corporate_security_settings" ("corporate_account_id");
