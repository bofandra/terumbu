DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corporate_employees'::regclass
      AND conname = 'corporate_employees_corporate_account_id_corporate_accounts_id_'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corporate_employees'::regclass
      AND conname = 'corporate_employees_account_fk'
  ) THEN
    ALTER TABLE "corporate_employees"
      RENAME CONSTRAINT "corporate_employees_corporate_account_id_corporate_accounts_id_"
      TO "corporate_employees_account_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corporate_permissions'::regclass
      AND conname = 'corporate_permissions_corporate_account_id_corporate_accounts_i'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corporate_permissions'::regclass
      AND conname = 'corporate_permissions_account_fk'
  ) THEN
    ALTER TABLE "corporate_permissions"
      RENAME CONSTRAINT "corporate_permissions_corporate_account_id_corporate_accounts_i"
      TO "corporate_permissions_account_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corporate_programs'::regclass
      AND conname = 'corporate_programs_corporate_account_id_corporate_accounts_id_f'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corporate_programs'::regclass
      AND conname = 'corporate_programs_account_fk'
  ) THEN
    ALTER TABLE "corporate_programs"
      RENAME CONSTRAINT "corporate_programs_corporate_account_id_corporate_accounts_id_f"
      TO "corporate_programs_account_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.expedition_booking_payments'::regclass
      AND conname = 'expedition_booking_payments_booking_id_expedition_bookings_id_f'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.expedition_booking_payments'::regclass
      AND conname = 'expedition_booking_payments_booking_fk'
  ) THEN
    ALTER TABLE "expedition_booking_payments"
      RENAME CONSTRAINT "expedition_booking_payments_booking_id_expedition_bookings_id_f"
      TO "expedition_booking_payments_booking_fk";
  END IF;
END $$;
