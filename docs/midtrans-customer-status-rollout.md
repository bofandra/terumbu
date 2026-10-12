# Customer-visible Midtrans payment and refund status

This is a stacked draft on PR #117, **not a production activation**.

## Customer journey
- After hosted Midtrans Snap checkout, the customer returns to
  `/checkout/success?type=donation|expedition&id=...&method=midtrans`.
- The page never trusts `status=paid` / `status=failed` from the browser URL.
  A small status panel calls the read-only, no-cache
  `GET /api/checkout/midtrans-status?type=...&id=...` endpoint every 15 seconds
  until the verified local record reaches a terminal state.
- Displays one of: awaiting verification, confirmed, not completed, operator
  review, refund requested, and provider refund recorded.
- **"Refund requested" does not mean refund received by the traveler.**
  A provider-reported refund/chargeback is also not proof of bank/issuer payout.
  Manual support follow-up is still required.

## Authorization, privacy and security
- Checkout UUID alone **does not grant permission** to read financial state.
- Authenticated checkout owners can read only their own booking/donation.
- Guest checkouts receive an independent cryptographically random 256-bit
  capability in an HttpOnly cookie. Only the SHA-256 hash is stored in the
  payment transaction payload. The cookie has SameSite=Lax and a narrow
  `/api/checkout/midtrans-status` path.
- Raw secrets are never added to provider request payloads or return URLs.
  A copy of a success-page URL does **not** give access to the status API.
- Response includes only the settlement stage, generic explanation, and
  timestamp; no email, name, provider order number, amount or merchant token.
- An unrelated account is not authorized by someone else's guest token for
  an authenticated checkout. Guests returning on another browser or device
  cannot use the status API without the original cookie; email support and
  login remain the fallback. The capability cookie expires after 30 days.
- Never cache this endpoint through a CDN or share account status in logs.

## Historical reconciliation beyond 7 days
- PR #117's five-minute reconciliation now continues **indefinitely for unresolved
  Midtrans payments**, rather than dropping them after seven days.
- Recent orders (under seven days old) are due every five minutes.
  Older unresolved orders are due once per 24 hours.
- The durable provider reference cursor ensures the bounded worker can
  eventually progress through historical orders; a failed GET does not mark
  payment as failed.
- Compensation incidents marked manual review are rechecked daily for a
  subsequent provider-confirmed full refund, without issuing another refund
  request.
- A server-side provider refund result still needs independent bank/issuer
  settlement reconciliation and merchant sandbox certification.

## Validation and rollout
- `tests/checkout-payment-status.test.ts`: token authorization, operator/refund
  messages and lack of false payment confirmations.
- `tests/e2e/midtrans-customer-status.spec.ts`: anonymous forbidden,
  unrelated capability forbidden, original cookie access, no sensitive fields,
  and pending-to-paid status changes.
- `tests/e2e/midtrans-reconciliation.spec.ts`: a ten-day-old unresolved
  order remains polled and alerts are not duplicated.
- Payment, expedition booking, and automatic refund feature flags remain
  disabled by default. Review all stacked PRs and test Midtrans sandbox
  settlement/expiry/refund cases before enabling any live payment flow.

Related: #112 #113 #115 #116 #117, Issue #114.
