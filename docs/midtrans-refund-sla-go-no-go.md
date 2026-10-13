# Terumbu Midtrans Refund SLA & Release Readiness (13 October 2026)

**Decision: NO-GO for production payment enablement.**
This assessment documents **engineering evidence only**. It does not certify
the merchant sandbox or substitute for finance, security, customer support and
release-owner approval. Draft PR dependencies remain unmerged.

## Implemented operator review indicators

| Indicator | Trigger | Where seen | Meaning |
| --- | --- | --- | --- |
| Missed 5-minute reconciliation worker | Last start more than 20 minutes ago | Public coarse worker health + Admin Operations + GitHub external worker incident | Worker may not be checking missed payment webhooks |
| Missing initial operator follow-up | Unresolved paid-without-seat case created at least 1 hour ago, no follow-up ledger event | Admin Operations + separate external refund SLA incident | Customer case needs operator attention |
| Unresolved paid-without-seat refund | Case not `provider_refunded` at least 24 hours after creation | Admin Operations + external refund SLA incident | Captured funds may still require an approved compensation path |
| Missing acquiring-bank acknowledgment | `provider_refunded` case has no verified bank evidence 72 hours after the provider-refunded timestamp | Admin Operations + external refund SLA incident | Refund confirmation requires provider investigation |

These are **internal escalation thresholds**, not provider/issuer guarantees or
a promise that a customer's funds will arrive within a specific time.

The public endpoints return only coarse status:

- `GET /api/health/workers`: 200 `{"status":"ok"}` when all scheduled
  workers meet their respective heartbeat and failure thresholds; 503
  otherwise. The five-minute Midtrans reconciliation worker uses 20 minutes,
  while hourly workers retain a 150-minute threshold.
- `GET /api/health/midtrans-refunds`: 200 `{"status":"ok"}` when no refund
  review threshold has been breached, 503 `{"status":"unhealthy"}` if any
  threshold is breached, 503 `{"status":"unavailable"}` if PostgreSQL cannot
  be queried. No monetary amounts, counts, case identifiers or PII are exposed.

The authenticated Admin Operations page provides aggregated SLA counts,
totals, case links and operational context. The independent GitHub workflow
polls both endpoints twice hourly and synchronizes **distinct, deduplicated**
GitHub incident issues using separate hidden markers. When the signal recovers,
the corresponding incident is closed. GitHub's scheduled jobs can be delayed,
and GitHub issue notifications depend on each operator's notification settings:
this is NOT an immediate paging service.

## Financial correctness and safeguards

- A recorded follow-up means a human action was logged, **not** that a provider
  refund or bank transfer succeeded.
- A provider-refunded status remains separate from acquiring-bank refund
  acknowledgment, and neither alone proves end-customer account credit.
- A 24-hour unresolved threshold must not initiate a blind refund POST.
  Original idempotent refund-key handling and manual-review safeguards remain.
- First-contact SLA checks only apply to unresolved capacity-conflict cases.
- Time-based bank evidence checks use `processed_at` where available,
  falling back to case creation time. Repeated polling must not reset this
  clock.
- External alerts contain no customer email, amount, transaction or provider
  order ID; operators review protected internal case pages.
- Fail-closed payment production release gate in PR #122 remains in force,
  and all automatic refund flags still default to false.

## Go / No-Go evidence checklist

| Check | Evidence / result | Status |
| --- | --- | --- |
| App CI, migrations, mocked payment E2E | GitHub Actions required | Verify PR's latest run |
| Five-minute worker detection | Unit and PostgreSQL external health E2E | Implemented; review latest CI |
| Financial SLA aggregation and recovery | PostgreSQL E2E for overdue pending, customer follow-up, provider-refunded, bank evidence | Implemented; review latest CI |
| External GitHub issue deduplication | Network-mocked unit tests and distinct incident marker | Implemented; review latest CI |
| Midtrans merchant sandbox capture/settlement/expiry | Requires actual merchant sandbox credentials and controlled test orders | **NOT VERIFIED** |
| Full / partial / unsupported refunds and provider late bank confirmation | Real sandbox test matrix and evidence | **NOT VERIFIED** |
| Refund receipt/customer reporting and payout reconciliation | Independent finance + customer support procedure | **NOT SIGNED OFF** |
| Security/privacy, alert routing and on-call response | Restricted evidence and operator notification tests | **NOT SIGNED OFF** |
| Rehearsed VPS rollback, scheduler failover and migration compatibility | Production-like staging deployment evidence | **NOT VERIFIED** |

## Required operator actions before a real release

1. Apply database migrations in order as specified in PR #122 and retain a
   verified pre-migration PostgreSQL backup. Validate rollback compatibility.
2. Confirm both worker containers start and survive restart/rollback;
   observe heartbeat rows for at least a full hourly cycle. Deliberately stop
   the five-minute worker in staging to verify external alarm after 20 minutes.
3. Inject a synthetic 25-hour unresolved **sandbox-only** compensation case
   and verify a distinct refund SLA GitHub issue opens; record support
   follow-up, correct financial state only via verified provider transitions,
   verify alert recovery and deduplication.
4. Exercise the **12-case real merchant sandbox UAT matrix** in
   `docs/midtrans-production-release-gate.md` with signed and redacted
   evidence, focusing on the final seat + captured funds hazard (#114).
5. Obtain independent release, payment operations, finance and security
   signoff; populate guarded release attestation variables only afterward.
6. Keep `MIDTRANS_PAYMENT_ENABLED=false` and
   `MIDTRANS_EXPEDITION_ENABLED=false` until every required safeguard is
   certified and issue #114 acceptance criteria are reviewed.

**Important:** A green CI run verifies only code and simulated PostgreSQL/
provider behavior, not actual merchant sandbox certification or bank payouts.
