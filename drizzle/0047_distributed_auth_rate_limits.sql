-- Cross-instance, durable authentication request counters. Only SHA-256
-- bucket identifiers are stored; no raw email, IP, or user-agent.
CREATE TABLE "auth_rate_limit_buckets" (
  "bucket_key" varchar(64) PRIMARY KEY NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "auth_rate_limit_buckets_key_check" CHECK ("bucket_key" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "auth_rate_limit_buckets_attempts_check" CHECK ("attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "auth_rate_limit_buckets_expires_idx"
  ON "auth_rate_limit_buckets" ("expires_at");
