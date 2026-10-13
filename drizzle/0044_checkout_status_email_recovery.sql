-- Single-use email recovery links and revocable device-scoped status grants.
-- Only SHA-256 hashes of random tokens are ever stored in these tables.
CREATE TABLE "checkout_status_access_tokens" (
  "token_hash" varchar(64) PRIMARY KEY NOT NULL,
  "checkout_type" varchar(16) NOT NULL,
  "checkout_id" uuid NOT NULL,
  "purpose" varchar(16) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "checkout_status_access_kind_check"
    CHECK ("checkout_type" IN ('donation', 'expedition')
      AND "purpose" IN ('recovery', 'device_access'))
);
--> statement-breakpoint
CREATE INDEX "checkout_status_access_checkout_idx"
  ON "checkout_status_access_tokens" ("checkout_type", "checkout_id", "purpose", "expires_at");
--> statement-breakpoint
CREATE INDEX "checkout_status_access_expiry_idx"
  ON "checkout_status_access_tokens" ("expires_at");
--> statement-breakpoint
-- Database-backed request limits are atomic across stateless web replicas.
CREATE TABLE "checkout_status_request_limits" (
  "key_hash" varchar(64) PRIMARY KEY NOT NULL,
  "hits" integer DEFAULT 0 NOT NULL,
  "reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "checkout_status_request_limits_reset_idx"
  ON "checkout_status_request_limits" ("reset_at");
