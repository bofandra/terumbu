# Midtrans expedition capacity-compensation runbook

This feature is **not production ready** until merchant sandbox certification, refund
permissions, operator approval and customer support procedures have been validated.

## Scope

When a verified Midtrans expedition settlement cannot be allocated to an
available departure seat, Terumbu must never falsely confirm that booking.
Instead:

1. A single durable `payment_operations` incident is created with
   `operation_type=midtrans_capacity_conflict` and `status=pending`.
   Its merchant `refundKey` is deterministically generated from the booking UUID.
2. The operator (via `SUPPORT_EMAIL`) and traveler are notified through the
   existing transactional email logs. Missing email delivery does not erase
   the compensation case.
3. The admin **Operations** page shows the newest compensation cases.
4. On the webhook and at each authenticated hourly worker run, Terumbu
   re-reads Midtrans GET Status. No browser return URL is trusted.
5. Automatic full-refund initiation is **off by default**. If explicitly
   enabled, it only sends a POST for settled, exact-IDR transactions on
   supported channels. Every request includes a stable refund_key, the
   original order ID and exact full amount.
6. `refund_submitted` means **provider accepted the request**, not that the
   customer's bank or issuer completed repayment. GET Status returning full
   `refund` or `chargeback` transitions the booking to refunded and marks the
   incident `provider_refunded`. These are provider statuses; separate
   settlement/bank-confirmation validation is required.
7. An uncertain API response, timeout, duplicate provider refund ID error,
   unsupported payment method or amount mismatch requires `manual_review`.
   Such POST requests are never blindly retried. Operators must check the
   Midtrans dashboard and refund ledger before retrying with the **same**
   refund key within its allowed time window.

## Rollout controls

| Variable | Default | Meaning |
| --- | --- | --- |
| MIDTRANS_PAYMENT_ENABLED | false | Master Midtrans flag |
| MIDTRANS_EXPEDITION_ENABLED | false | Enable checkout for IDR expeditions |
| MIDTRANS_AUTO_REFUND_ENABLED | false | Enable automated compensation requests |
| MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED | false | Additional gate required for production mode |
| MIDTRANS_ENV | sandbox | Merchant environment |
| MIDTRANS_SERVER_KEY | empty | Private merchant API key |
| SUPPORT_EMAIL | support@terumbu.eco | Operator escalation destination |

A merchant key does **not** enable refunds. Enabling these switches is a
separate financial/operations decision. Do not add the merchant key to public
client code. Production deployment must explicitly propagate and approve the
new variables in the authorized environment configuration; the default remains
disabled.

## Worker and operator workflow

- Internal endpoint: `POST /api/cron/midtrans-compensations`.
- Authorization: `CRON_SECRET` via `x-cron-secret` or Bearer.
- The existing VPS worker posts this endpoint hourly and records a
  `midtrans_compensations` heartbeat for monitoring.
- Admin: `/admin/operations`, section “Midtrans expedition compensation cases.”
- Query for unresolved cases: `payment_operations` where
  `operation_type='midtrans_capacity_conflict'` and
  `status in ('pending','requesting','refund_submitted','manual_review')`.
- `requesting` stranded for more than 15 minutes is converted to
  `manual_review` unless the provider is already refunded.
- A merchant `refund_key` must never be changed to work around an unclear
  previous response. Provider refund retry windows differ by channel.

## Required before general availability

- Confirm Midtrans refund API is enabled for the merchant and supported
  channels; bank transfers and unsupported methods must use an approved
  manual refund procedure.
- Sandbox simulate two simultaneous paid checkouts for the final seat,
  late settlement after 20-minute hold expiry, webhook delivery reordering,
  provider POST timeout, duplicate refund IDs and issuer refund rejection.
- Verify the bank-confirmed refund notification when available. Provider
  acceptance or transaction refund status is **not** proof of funds received
  by the traveler.
- Define staff acknowledgement/escalation targets for unresolved cases,
  customer communications and manual reconciliation after 7 days.
- Review merchant settlement and refund reports independently before
  setting the production auto-refund flag.

Authoritative references:
- https://docs.midtrans.com/reference/refund-transaction
- https://docs.midtrans.com/reference/transaction-status
- https://docs.midtrans.com/docs/https-notification-webhooks

Related engineering issue: #114 and draft PRs #112, #113, #115, #116.
