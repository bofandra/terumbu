# Midtrans Snap donation rollout (IDR only)

## Scope and safety

This implementation adds an **opt-in Midtrans Snap redirect checkout for one-time IDR donations**. It does not change existing manual bank-transfer proof workflows, and does **not** cover expedition bookings, scheduled/monthly collection, refunds initiated at provider, or non-IDR charges.

Do **not** activate real payments until sandbox tests, the official merchant account, reconciliation and on-call support have been reviewed.

## Configuration

The following variables must be configured on the server:

| Variable | Value |
| --- | --- |
| MIDTRANS_PAYMENT_ENABLED | false by default; set to true only after testing |
| MIDTRANS_ENV | sandbox (default) or production |
| MIDTRANS_SERVER_KEY | matching private server key for selected environment |

In GitHub, set MIDTRANS_PAYMENT_ENABLED and MIDTRANS_ENV as repository/environment variables; MIDTRANS_SERVER_KEY is a secret. Deployment propagates the values to web only. Do not publish the server key or use it client-side. An invalid/missing key or unknown mode disables online checkout.

Register this HTTPS notification URL in the Midtrans merchant dashboard:

\`https://<production-origin>/api/webhooks/midtrans\`

For local sandbox testing, expose an HTTPS callback URL using an approved tunnel. Do not point a production merchant at a sandbox callback.

## Donation lifecycle

1. User opens a published **IDR** campaign checkout. Online option appears only if explicitly enabled and configured.
2. User submits one-time/coral intent, amount, name, email. No uploaded proof is required for the online option.
3. Server validates campaign, currency, whole-IDR amount and idempotency key; inserts a pending donation and unique Midtrans provider reference **before** requesting a Snap session.
4. Server uses Basic auth and validates the Snap redirect hostname. The browser is sent to the official hosted payment page.
5. Midtrans sends a signed webhook; server enforces a 16 KiB body limit, verifies SHA-512 signature and checks the order against its own provider-linked transaction.
6. Server fetches the **current status** directly from the authenticated Midtrans status API. Both reported amount and official provider amount must match the database's IDR donation amount.
7. Under a database lock, the existing donation transition updates campaign totals, receipts and passport once. Duplicate and stale notifications do not cause duplicate accounting.

The browser redirect and success URL are **never** evidence of payment. Receipt/impact creation waits for a verified webhook.

## Manual reconciliation requirements

* A failed/timeout Snap initiation leaves an auditable pending donation because the provider may have accepted the order even if its response was lost. Do not reissue the same order automatically. The customer can return to manual flow or start a new checkout while operations reconcile the orphaned order.
* Partial refunds and partial chargebacks cannot be represented as a full refund in the existing donation model; they require operations review. They do not silently reverse a full donation.
* Final full refund and chargeback notices reverse previously credited impact; refund **initiation** through Midtrans remains out of scope.
* A settled-to-denied reversal is possible in some channels. Since provider status is fetched on receipt, an authoritative reversal removes previously credited amounts and impact.
* This is an **initial integration slice**. Add scheduled provider reconciliation for missing webhooks, operator alerting, consumer-facing polling/status, callback UAT, and a full refund ledger before general launch.

## Verification before enabling production

1. Run \`npm run typecheck && npm run lint && npm test && npm run build\` and critical E2E.
2. Enable with sandbox key and sandbox mode in an isolated environment.
3. Test creation, pending, settlement, duplicate notifications, wrong signatures, amount mismatch, deny, expire, rejected capture, chargeback/refund and delayed out-of-order notifications.
4. Verify exact campaign totals and receipts after webhook retries.
5. Validate security settings on Midtrans dashboard, supported payment channels, fees, payout/reconciliation, refund policy and data privacy notices.
6. Configure **production** key + MIDTRANS_ENV=production only after sign-off. Test a small live transaction and the independent merchant settlement report.

Official documentation:
- https://docs.midtrans.com/reference/backend-integration
- https://docs.midtrans.com/docs/https-notification-webhooks
- https://docs.midtrans.com/reference/transaction-status
