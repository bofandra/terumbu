-- Reconciliation poll cursor/attempt journal. Never store provider credentials.
CREATE TABLE "midtrans_reconciliation_checks" (
  "provider_reference" varchar(100) PRIMARY KEY NOT NULL,
  "last_checked_at" timestamp with time zone NOT NULL,
  "last_provider_status" varchar(40),
  "attempts" integer DEFAULT 0 NOT NULL,
  "failures" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "midtrans_reconciliation_checks_due_idx"
  ON "midtrans_reconciliation_checks" ("last_checked_at");
