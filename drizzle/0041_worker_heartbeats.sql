CREATE TABLE "worker_heartbeats" (
  "worker_name" varchar(80) PRIMARY KEY NOT NULL,
  "run_id" uuid NOT NULL,
  "last_started_at" timestamp with time zone NOT NULL,
  "last_finished_at" timestamp with time zone,
  "last_succeeded_at" timestamp with time zone,
  "last_failed_at" timestamp with time zone,
  "last_status" varchar(16) NOT NULL,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
