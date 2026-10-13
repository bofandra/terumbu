# Guest checkout history recovery — merchant sandbox rollout

This draft builds on #118 and earlier Midtrans payments PRs. Payment and refund
automation remain **off by default**. Do not activate before merchant sandbox UAT.

## Customer experience
1. From the Midtrans checkout success page, choose "Using another device?
   Verify your checkout email" or visit `/checkout/recover`.
2. Enter the same email used when making guest Midtrans payments. The form
   ALWAYS returns the same generic "if matching" message, including for
   invalid/nonexistent addresses. Do not enumerate customer emails or payments.
3. If matching guest payments exist, Terumbu emails up to ten recent donation
   or expedition checkout links to that address. It does not expose this list
   in the browser, search logs, or audit payload.
4. Every email link goes to `/checkout/access?token=...`, which only **shows**
   a confirmation form on GET. Email link scanners cannot use the link without
   POST confirmation.
5. On explicit POST, Terumbu atomically marks the one-time link as used,
   creates a separate per-checkout device capability, and sets a 30-day
   HttpOnly, SameSite=Lax cookie scoped to the read-only payment-status API.
   The browser is redirected to the verified checkout status page without
   the email token in the URL.

## Security model
- Email recovery tokens: cryptographically random 256 bits, 15 minute expiry,
  one-use atomic redemption in PostgreSQL.
- Device credentials: independently generated 256-bit random values, valid
  30 days; only SHA-256 hashes are stored.
- Authenticated accounts must sign in; email recovery **only lists guest**
  donations and expedition bookings (`user_id IS NULL`).
- Checkout identifiers and emails alone do not authorize reading the API.
  Existing original-browser token access still works after a second device
  is granted access.
- Every status request checks checkout type, checkout ID, expiry, token hash,
  purpose, and owner account as appropriate. No grant applies to a different
  checkout. A link to the success page alone does not contain a credential.
- Request throttling is stored in PostgreSQL and works across stateless
  replicas: at most three requests per email and twenty per client identity
  per hour. Additional rate limiting at the trusted load balancer/WAF is
  recommended; direct client IP headers must not be treated as proof.
- Transactional mail includes raw URLs **only in the provider-bound email
  payload**. The ordinary `email_logs` payload records a redacted audit
  summary instead. Avoid forwarding raw provider requests to public logging.
- Strict `Referrer-Policy: no-referrer` meta hint on the one-time access
  confirmation page. No tracking pixel, URL prefetch or social-sharing link
  should expose access tokens.
- Tokens and rate-limit windows are garbage-collected by the scheduled
  `midtrans-reconciliation` worker. Apply migration
  `drizzle/0044_checkout_status_email_recovery.sql` first.

## Limitations and support
- The recovery email contains at most ten most-recent guest checkouts. Older
  orders require operator support, although backend reconciliation continues.
- This flow does not create a full user account, authorize booking
  modification, change provider payment state, or initiate a refund.
- Delivery depends on `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; an
  unavailable email provider still returns the same browser response.
- Provider-recorded refunds and chargebacks are NOT the same as the
  traveler's bank-confirmed receipt of funds.
- Cross-browser/cross-device UAT, mailbox link scanner testing, merchant
  sandbox payment and refund scenarios, and security review are required
  before deployment.

## Automated checks
- `tests/checkout-status-recovery.test.ts`: privacy keys and expiry.
- `tests/e2e/checkout-status-email-recovery.spec.ts`: email audit redaction,
  original guest privacy, explicit one-time redemption and scoped device grant.
- Existing payment concurrency, refund, webhook reconciliation and account
  authorization tests remain in the complete GitHub Actions pipeline.
