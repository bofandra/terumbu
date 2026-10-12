-- Independent immutable evidence that an acquiring bank confirmed a refund
-- request as reported by an authenticated Midtrans GET Transaction Status.
-- This is NOT evidence that funds have reached the customer's bank account.
CREATE TABLE "midtrans_refund_bank_confirmations" (
  "operation_id" uuid PRIMARY KEY NOT NULL REFERENCES "payment_operations"("id") ON DELETE RESTRICT,
  "provider_reference" varchar(255) NOT NULL,
  "refund_key" varchar(80) NOT NULL,
  "refund_amount" numeric(14,2) NOT NULL,
  "bank_confirmed_at" timestamp with time zone NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source" varchar(40) DEFAULT 'midtrans_get_status' NOT NULL,
  CONSTRAINT "midtrans_refund_bank_evidence_amount_positive"
    CHECK ("refund_amount" > 0)
);
--> statement-breakpoint
CREATE INDEX "midtrans_refund_bank_confirmations_provider_idx"
  ON "midtrans_refund_bank_confirmations" ("provider_reference");
