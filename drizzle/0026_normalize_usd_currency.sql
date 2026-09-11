UPDATE "campaign_budget_line_items" AS "line"
SET
  "amount" = round("line"."amount" / 10000, 2),
  "spent_amount" = round("line"."spent_amount" / 10000, 2)
FROM "campaigns" AS "campaign"
WHERE "line"."campaign_id" = "campaign"."id"
  AND upper("campaign"."currency") = 'IDR';
--> statement-breakpoint
UPDATE "campaigns"
SET
  "goal_amount" = round("goal_amount" / 10000, 2),
  "raised_amount" = round("raised_amount" / 10000, 2),
  "impact_unit_cost" = CASE
    WHEN "impact_unit_cost" IS NULL THEN NULL
    ELSE round("impact_unit_cost" / 10000, 2)
  END,
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
UPDATE "project_evidence"
SET "metadata" = jsonb_set(
  jsonb_set("metadata", '{financeSpendCurrency}', '"USD"'::jsonb, true),
  '{financeSpendAmount}',
  to_jsonb(round((("metadata" ->> 'financeSpendAmount')::numeric / 10000), 2)),
  true
)
WHERE "metadata" ->> 'financeSpendCurrency' = 'IDR'
  AND "metadata" ->> 'financeSpendAmount' ~ '^[0-9]+(\.[0-9]+)?$';
--> statement-breakpoint
UPDATE "donations"
SET
  "amount" = round("amount" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
UPDATE "donation_receipts"
SET "payload" = jsonb_set(
  jsonb_set("payload", '{currency}', '"USD"'::jsonb, true),
  '{amount}',
  to_jsonb(round((("payload" ->> 'amount')::numeric / 10000), 2)),
  true
)
WHERE "payload" ->> 'currency' = 'IDR'
  AND "payload" ->> 'amount' ~ '^[0-9]+(\.[0-9]+)?$';
--> statement-breakpoint
UPDATE "donation_subscriptions"
SET
  "amount" = round("amount" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
ALTER TABLE "donation_subscriptions" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
UPDATE "expeditions"
SET
  "base_price" = round("base_price" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
UPDATE "expedition_bookings"
SET
  "total_amount" = round("total_amount" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
UPDATE "payment_operations"
SET
  "amount" = round("amount" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
UPDATE "corporate_program_budgets" AS "budget"
SET
  "allocated_amount" = round("budget"."allocated_amount" / 10000, 2),
  "spent_amount" = round("budget"."spent_amount" / 10000, 2)
FROM "corporate_programs" AS "program"
WHERE "budget"."program_id" = "program"."id"
  AND upper("program"."currency") = 'IDR';
--> statement-breakpoint
UPDATE "corporate_project_portfolio" AS "portfolio"
SET "allocation_amount" = round("portfolio"."allocation_amount" / 10000, 2)
FROM "corporate_programs" AS "program"
WHERE "portfolio"."program_id" = "program"."id"
  AND upper("program"."currency") = 'IDR';
--> statement-breakpoint
UPDATE "corporate_programs"
SET
  "budget_amount" = round("budget_amount" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
ALTER TABLE "corporate_programs" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
UPDATE "corporate_contributions"
SET
  "amount" = round("amount" / 10000, 2),
  "currency" = 'USD'
WHERE upper("currency") = 'IDR';
--> statement-breakpoint
ALTER TABLE "corporate_contributions" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
UPDATE "impact_passport_items"
SET
  "description" = replace("description", 'IDR 1.5M', 'USD 150'),
  "metadata" = jsonb_set(
    jsonb_set("metadata", '{currency}', '"USD"'::jsonb, true),
    '{amount}',
    to_jsonb(round((("metadata" ->> 'amount')::numeric / 10000), 2)),
    true
  )
WHERE "metadata" ->> 'currency' = 'IDR'
  AND "metadata" ->> 'amount' ~ '^[0-9]+(\.[0-9]+)?$';
