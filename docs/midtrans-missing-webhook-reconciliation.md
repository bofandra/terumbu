# Midtrans missing-webhook reconciliation — rollout guide

Terumbu cannot rely solely on asynchronous payment notifications. This follow-on to PR #116 adds independent GET Status polling for both **IDR donations and IDR expedition bookings** without changing manual payments.

## Architecture

- Every five minutes an isolated `midtrans-reconciliation-worker` container POSTs `/api/cron/midtrans-reconciliation` with a private `CRON_SECRET`. The endpoint is not public.
- The worker considers Midtrans orders whose local payment status is `created`, `pending`, `failed`, or `expired`; created between 2 minutes and 7 days ago.
- Oldest **unchecked** provider references are chosen first; up to 20 donation and 20 expedition orders per cycle. The `midtrans_reconciliation_checks` table persists last check time, provider state, attempts, and failures. The index and join ensure a repeatedly failing order does not block every newer order.
- The worker always calls authenticated Midtrans **GET Transaction Status** using the server key, never the client browser return parameters. Its results use the **same transaction-locked settlement functions** as the signed webhook endpoint.
- Donation accounting, expedition seat allocation, refund status, and compensation for no seats stay idempotent across webhook/poller races.
- A GET failure never means the customer's payment has failed. After one hour of unresolved GET failures, or immediately on a provider/stored amount mismatch or unsupported state, Terumbu creates at most **one** `midtrans_reconciliation_attention` payment operation per provider order and notifies `SUPPORT_EMAIL` where configured.
- `midtrans_reconciliation` joins the monitored heartbeat list; the existing independent worker health monitor detects failures or missing runs.

## Database and deployment requirements

1. PRs #112, #113, #115 and #116 are dependencies of this stacked PR; merge in order or rebase safely.
2. Apply `drizzle/0043_midtrans_reconciliation_checks.sql` after prior migrations (notably `0042` for expedition holds).
3. Provision `CRON_SECRET` to both web and worker environments. In Docker Compose, escape the variable with **two dollar signs** in its worker-shell command to avoid host-side interpolation.
4. The scanner stays inert if `MIDTRANS_PAYMENT_ENABLED=false` or the server key is unset. This does **not** activate donation, expedition or refund charging.
5. Observe `/api/health/workers` and the Operations dashboard. The external endpoint returns only coarse health, not merchant references.
6. Use merchant **sandbox** credentials to verify provider GET Status, signed webhook delivery races, failure retries, amount mismatches, full and partial reversals and refund lead times.

## Operational limits

- A seven-day bounded window is intentional. Transactions older than seven days, and already paid orders with a missing later refund webhook, require a broader historical reconciliation/reporting process. Do not consider this an exhaustive financial ledger.
- Polling does not hold seats permanently. Midtrans expedition holds expire separately; if a settlement arrives too late and seats are full, a persistent compensation case is created and automation remains separately feature-gated.
- The worker does not automatically retry a refund POST on uncertain outcome, and a provider-accepted refund is not proof of bank completion.
- Real merchant settlement must be reconciled to provider payout reports before production activation. Keep both `MIDTRANS_EXPEDITION_ENABLED` and `MIDTRANS_AUTO_REFUND_ENABLED` at their defaults until operations sign off.

## Automated verification

- `tests/midtrans-reconciliation.test.ts` covers poll eligibility and alert thresholds.
- `tests/e2e/midtrans-reconciliation.spec.ts` exercises a missing settlement webhook, provider outage, deduplicated operator alert, and no double seat allocation against PostgreSQL.
- `tests/e2e/external-worker-probe.spec.ts` validates the fourth monitored worker and cron authorization.

References: https://docs.midtrans.com/reference/transaction-status and https://docs.midtrans.com/docs/https-notification-webhooks
