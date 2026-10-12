# Midtrans expedition checkout — staged rollout

This is a **stacked draft PR**, based on the IDR donation gateway PR. It is not enabled in production.

## Scope
- IDR-only hosted Midtrans Snap checkout from expedition booking form.
- Preserve manual payment-proof submission for all departures, currencies, and account types.
- Respect existing booking checks: published expedition, departure date, capacity, required Academy certificate, corporate attribution, group participants and referral.
- Store booking, participants and the provider order before requesting Snap.
- Reuse the existing authenticated and signed **POST /api/webhooks/midtrans** endpoint.
- Reconcile exact booking IDR total against the provider's signed notification and independently fetched GET Status. No client redirect is trusted as proof.
- Confirm a booking and allocate departure seats only after verified payment. The existing PostgreSQL conditional seat update prevents concurrent overselling.
- An externally paid order that cannot claim seats remains **unconfirmed** and creates a deduplicated `midtrans_capacity_conflict` payment operation, requiring manual reconciliation and customer refund if appropriate. The webhook returns 503 so the provider retries. It must not misrepresent a capacity conflict as a successful booking.

## Explicit rollout flags
Both variables must be true:
- `MIDTRANS_PAYMENT_ENABLED=true`
- `MIDTRANS_EXPEDITION_ENABLED=true`

Plus `MIDTRANS_SERVER_KEY` and `MIDTRANS_ENV=sandbox|production`. Default `MIDTRANS_EXPEDITION_ENABLED=false` leaves expedition payment manual even if IDR donations have been switched on.

Do not enable until the merchant sandbox integration and a paid-but-no-capacity incident runbook have been signed off. The current workflow **does not hold seats before money is paid**. For public production launch, decide whether to implement expiring seat holds, or a robust automated compensation/refund path first.

## Required merchant sandbox test matrix
1. IDR success with one participant, including receipt or booking-email behavior.
2. Group booking / corporate attribution with per-person participants preserved.
3. Reject USD prices, zero, fractional rupiah and tampered amounts.
4. No booking confirmation from browser callback alone.
5. Duplicate and delayed webhook deliveries (idempotent seat allocation).
6. Two concurrent settled bookings for the final seat: exactly one booking may confirm; the other must be flagged for refund and operator attention.
7. Cancel, expire, fraud challenge, refund/chargeback and declined payment.
8. Provider POST succeeds but the response times out — durable order preserved without duplicate charge on retry.
9. Verify manual upload remains usable when both flags are false, and when only donation payments are enabled.
10. Verify an authenticated donation cannot be matched to an expedition provider transaction by reference alone.
11. Ensure resolved incidents can be traced to provider order ID and the original booking; investigate email provider delivery separately.

## Next engineering tasks before merchant production activation
- Introduce TTL-based seat holds or a guaranteed idempotent provider refund process for capacity conflicts.
- Add provider transaction polling reconciliation when webhooks are lost or stop retrying.
- Notify operators about `midtrans_capacity_conflict`, not only log an error.
- Implement cancellation/refund request policy, confirmed status delivery email and traveler-facing live order status view.
- Review legal/operational refund window, privacy policy, payment method availability and Midtrans merchant settings.

API references: https://docs.midtrans.com/docs/https-notification-webhooks and https://docs.midtrans.com/reference/transaction-status
