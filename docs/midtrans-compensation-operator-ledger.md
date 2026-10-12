# Midtrans compensation operations: customer follow-up ledger

**Draft feature; payment and refund production flags remain disabled.**

## Intent

A Midtrans `refund` event is evidence that the provider reports a refund.
A matching `refunds[].bank_confirmed_at` is evidence of acquiring-bank
acknowledgement of the refund request. Neither alone proves a refund has
appeared in the customer's bank or wallet.

This extension equips the Terumbu platform administrator to follow up with
customers without falsifying or overwriting financial evidence.

## Operator workflow

1. Open **Admin → Operations → Midtrans expedition compensation cases**.
2. Select **Review refund follow-up** to open the individual case. The page
   shows only a booking reference, IDR amount, provider case status, and
   acquiring-bank acknowledgement timestamp; no bank details or customer PII.
3. Record one of: contact attempted, customer reports credit missing,
   customer reports funds received **(unverified)**, or provider trace requested.
4. Select the verified communication channel and supply an internal support
   ticket code (3–64 characters, only ASCII letters/numbers/dashes/underscores).
   Store any screenshots or confidential details solely within the approved
   restricted support system; **never** in the Terumbu case event.
5. Review the append-only event timeline. Replaying the same submission UUID
   with the same data is idempotent; reuse of that UUID with different data is
   rejected. Each record stores the acting administrator's user ID.
6. A customer-reported receipt can be logged only after the Midtrans operation
   has reached `provider_refunded`. A `provider_portal` observation cannot
   masquerade as a customer report.

**The case event does not change `payment_operations.status`, expedition
booking/payment status, refund requests, capacity or bank evidence.**
There is intentionally no "mark funds received" switch. This is a record
of correspondence, not a payment-state transition. Any formal proof of
customer funds received or staff approval process requires separately
reviewed financial evidence and potentially two-person reconciliation.

## Persistence and authorization

- `drizzle/0046_midtrans_compensation_case_events.sql` adds a dedicated
  operation-indexed event table. The application only inserts; no edit or
  delete route/action exists.
- Every mutation and case detail route independently requires the global
  **admin** role, not mere account login or a booking reference.
- PostgreSQL parent row locking serializes the operation check with each
  event write, and a unique event UUID prevents duplicate browser POSTs.
- Server input validation and database CHECK constraints reject unsupported
  event kinds, unsupported channels and arbitrary sensitive free-form notes.
- New cases are created by the existing verified-payment capacity-conflict
  workflow; this UI does not generate fake financial incidents.
- An audit administrator can recover the stored actor UUID, support reference,
  event type and timestamp. Events cannot be edited from the UI.

## Sandbox / release acceptance

- Run Playwright E2E against a production-equivalent migrated PostgreSQL
  sandbox database to check admin access, prevented premature receipt reports,
  append-only audit behavior and unchanged payment states.
- Execute a **real Midtrans merchant sandbox** acceptance matrix before any
  live payments: paid/no seat, expired, partial refund, repeated webhook,
  GET Status failure, acquiring-bank acknowledgement, and bank/customer
  reporting disagreement.
- Merchant credentials are not available to CI. Passing mocked E2E tests is
  **not** real Midtrans certification.
- Keep #114 open until merchant sandbox validation and a documented
  customer funds receipt dispute process are completed.

Related: PRs #112, #113, #115, #116, #117, #118, #119, #120.
