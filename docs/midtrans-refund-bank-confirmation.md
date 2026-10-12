# Midtrans refund bank-confirmation and sandbox verification

**Rollout status: draft only. No production charge or refund feature flag is changed.**

## Why a third status is necessary

Midtrans can report `transaction_status=refund` before the acquiring bank
has acknowledged the refund request. Its documented GET Transaction Status
response can later include `refunds[].bank_confirmed_at` with
`refund_key`, `refund_amount`, and `refund_method`.

Terumbu distinguishes the following states:

| Source | Display / meaning | Customer received money? |
| --- | --- | --- |
| Merchant requests refund | `refund_requested`: provider is processing the request | Unknown |
| Midtrans GET Transaction Status reports full `refund` | `refunded`: full refund recorded, acquiring-bank acknowledgment pending | Unknown |
| A matching full refund entry includes `bank_confirmed_at` | `bank_confirmed`: acquiring bank has acknowledged the refund request | **Still not guaranteed** |

**Do not state that the customer's balance was credited solely because
`bank_confirmed_at` exists.** The field is documented as acquiring-bank
confirmation of the refund **request**. Wallet/bank posting can lag and
customer support may still need a receipt verification process.

## Safety and provenance

- Only authenticated Midtrans **GET Transaction Status** creates durable
  acquiring-bank evidence. Browser returns and inbound webhook payloads
  cannot insert this evidence directly.
- Evidence is accepted only when `order_id`, exact full original IDR
  amount, `transaction_status=refund`, the unique merchant `refund_key`,
  the matching individual `refund_amount`, and a correctly parsed WIB
  `bank_confirmed_at` all agree.
- Partial refunds, chargebacks without a matching refund record, mismatched
  keys, missing bank confirmation and malformed timestamps are not bank
  evidence for a full refund.
- Migration `0045_midtrans_refund_bank_confirmations.sql` stores exactly one
  evidence record per capacity-compensation operation. The uniqueness
  constraint and `ON CONFLICT DO NOTHING` prevent duplication across
  webhook, cron and status retry races.
- The compensation worker keeps polling provider-refunded incidents lacking
  bank evidence every 24 hours; never sends another POST refund in this state.
- Admin Operations displays the bank acknowledgment timestamp separately
  from the provider-refunded status; customer status is read-only and
  intentionally excludes provider references, PII and raw refund payloads.

## Sandbox operator smoke check (read-only)

Use a **real sandbox merchant server key** and an order created through the
Midtrans sandbox portal. These variables are placeholders and must not be
committed to GitHub or screenshots. Run locally or in an approved secret-
managed sandbox runner:

```bash
export MIDTRANS_ENV=sandbox
export MIDTRANS_SERVER_KEY='<sandbox-server-key>'
export MIDTRANS_SANDBOX_ORDER_ID='<existing-sandbox-order-id>'
node scripts/midtrans-sandbox-status-check.mjs
```

The probe uses GET only and rejects all non-sandbox environments. It does not
create orders, charge funds, or initiate a refund. It prints a minimal summary
without the order ID or credentials. No merchant credentials are present in CI,
so passing GitHub Actions **is not equivalent to a real merchant sandbox
certification**.

## Merchant sandbox acceptance matrix (manual UAT required)

| Scenario | Required observation |
| --- | --- |
| Full eligible refund after settlement | `refund_requested` then `provider_refunded`; no second refund POST |
| Bank confirmation not yet received | No bank evidence row; customer remains `refunded` (not bank-confirmed) |
| Midtrans GET later supplies full matching `bank_confirmed_at` | Exactly one bank evidence row; customer sees acquiring-bank acknowledgment |
| Repeat webhook and compensation cron concurrently | No duplicate bank evidence or refund request |
| Partial refund | Do not mark the entire order bank-confirmed |
| Different `refund_key` or unmatched amount | Discard as bank evidence; escalate if persistent |
| Expired seat hold and captured payment | No overbooking; keep compensation case open |
| Timeout / unavailable Midtrans GET Status | Do not mark paid, failed, refunded, or bank-confirmed without verification |
| Unsupported payment method | Manual refund route and operator acknowledgment; no automatic POST |
| Customer reports no credit after bank confirmation | Support tracks issuer/wallet posting and follows bank trace; never promise money arrived |

Do not close issue #114 until sandbox merchant UAT, operator escalation,
refund method coverage and evidence for end-customer receipt handling have
been reviewed and signed off.

References:
- https://docs.midtrans.com/reference/get-transaction-status
- https://docs.midtrans.com/reference/refund-transaction
