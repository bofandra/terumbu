UPDATE "project_evidence"
SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'financeCategory', 'Employee learning',
  'financeSpendAmount', 54000000,
  'financeSpendCurrency', 'IDR'
)
WHERE "evidence_code" = 'EVD-RAJA-AMPAT-REEF-000';
--> statement-breakpoint
UPDATE "project_evidence"
SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'financeCategory', 'Restoration portfolio',
  'financeSpendAmount', 238000000,
  'financeSpendCurrency', 'IDR'
)
WHERE "evidence_code" = 'EVD-RAJA-AMPAT-REEF-001';
--> statement-breakpoint
UPDATE "project_evidence"
SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'financeCategory', 'Verification and reports',
  'financeSpendAmount', 48000000,
  'financeSpendCurrency', 'IDR'
)
WHERE "evidence_code" = 'EVD-BALI-MANGROVE-001';
