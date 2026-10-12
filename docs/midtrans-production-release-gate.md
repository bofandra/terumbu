# Midtrans Production Release Gate — operator sign-off and go/no-go

**Current outcome: NO-GO for live Midtrans charging and automatic refunds.**
This document is a release procedure, not evidence of merchant certification.
Passing mock-based GitHub Actions does **not** show that the real Midtrans
merchant sandbox passed UAT. Never flip production flags as part of a draft PR.

## What the gate enforces

The deployment pipeline verifies the release settings before uploading its
environment file to the VPS. `scripts/deploy-vps.sh` checks the same trusted
VPS environment **after code checkout but before database startup, backups,
migrations or new application containers**. In addition, the application
runtime refuses to initialize a production Midtrans gateway without release
approval and a non-empty, validated evidence reference.

| Stage | Required condition | Failure behavior |
| --- | --- | --- |
| Disabled by default | All payment/expedition/automatic refund switches false | Application remains on manual payments |
| Midtrans sandbox only | Parent payment enabled, server/client keys and authenticated cron secret configured | Fail closed on missing credentials or cron |
| Expedition checkout | Parent payment also enabled | Fail if expedition enabled alone |
| Production payments | `MIDTRANS_ENV=production` plus UAT, release and operations approvals and internal evidence reference | Fail deployment and disable gateway at runtime |
| Production safety | HTTPS app URL, secure session cookies, support email and authenticated cron secret | Fail deployment |
| Automatic refunds in production | Two refund switches, refund-specific sandbox UAT and refund operations approvals | Fail deployment and refuse automatic refund at runtime |

The production variables (all **false/empty** by default) are:

```dotenv
MIDTRANS_PAYMENT_ENABLED=false
MIDTRANS_EXPEDITION_ENABLED=false
MIDTRANS_AUTO_REFUND_ENABLED=false
MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED=false
MIDTRANS_ENV=sandbox
MIDTRANS_PRODUCTION_RELEASE_APPROVED=false
MIDTRANS_SANDBOX_UAT_APPROVED=false
MIDTRANS_OPERATIONS_APPROVED=false
MIDTRANS_RELEASE_EVIDENCE_ID=
MIDTRANS_REFUND_UAT_APPROVED=false
MIDTRANS_REFUND_OPERATIONS_APPROVED=false
```

`MIDTRANS_RELEASE_EVIDENCE_ID` is an internal approved ticket/document
identifier (6–80 ASCII letters, digits, underscores and hyphens). It must point
to separately reviewable evidence; **the presence of a value is not proof
that UAT was actually conducted**. Configure these as protected deployment
environment variables only after sign-off. Do not put merchant keys into this
identifier, source code, test fixtures or GitHub issue comments.

## Gate behavior and checks

Run a dry configuration check locally using only placeholder values
(with actual merchant credentials managed in a protected environment):

```bash
bash scripts/validate-midtrans-release.sh deploy/.env.example
npm test
```

The first command must pass with Midtrans **disabled**, and CI exercises
known unsafe configurations that must fail. The test suite checks:

- production flags cannot activate without UAT, operations, release ticket,
  HTTPS URL, secure cookies and support contact;
- refund automation needs separately reviewed production settings;
- sandbox mode remains usable for UAT, without production override;
- migrations **0042 → 0043 → 0044 → 0045 → 0046** exist in Drizzle's journal;
- the deployed Compose starts both the hourly compensation scheduler and the
  five-minute missing-webhook reconciliation worker;
- rollback restores both workers when available in the target revision.

The deployment pre-migration database backup remains mandatory. Rollback
reverts application containers, **not forward-only database migrations**.
Review migration compatibility with the previous application revision before
approving deployment.

## Real merchant sandbox UAT matrix (human-operated; no funds in production)

| ID | Sandbox scenario | Evidence expected |
| --- | --- | --- |
| UAT-01 | Donation settlement, valid signed webhook, independent GET Status | Exactly one verified donation credit |
| UAT-02 | Expedition checkout and seat hold, accepted settlement | Exactly one confirmed booking within seat capacity |
| UAT-03 | Two simultaneous settled bookings for the last seat | Never oversell; second case created and handled |
| UAT-04 | Delayed/duplicate/reordered webhook, missing webhook | Poller converges without double-confirming |
| UAT-05 | Failed, denied, expired, cancelled transaction | No false "paid" state or allocated seat |
| UAT-06 | Provider API timeout/unavailable | No guessed payment status, no blind duplicate refund |
| UAT-07 | Eligible full refund and unsupported refund method | Deduplicated refund key or mandatory manual case |
| UAT-08 | Partial refund and chargeback | Never classified as full bank-confirmed refund |
| UAT-09 | Full refund first, acquiring-bank `bank_confirmed_at` later | Exact evidence match, one audit row, separate customer state |
| UAT-10 | Browser payment status and email recovery on another device | No URL-forged status, no other-customer access |
| UAT-11 | Admin follow-up, repeated submission and customer credit dispute | Append-only actions, no modification of payment status |
| UAT-12 | Worker stopped/restarted, failed migration, rollback rehearsal | Alerts surface; deployment and rollback procedures are documented |

For each scenario, retain in the restricted release ticket: tester,
merchant sandbox identity, timestamp, sanitized transaction references,
expected/observed outcomes, screenshots or provider logs with secrets and
personal data removed, and PASS/FAIL. A missing scenario is **not** a pass.

The included read-only smoke command can verify an already existing
sandbox order without creating charges or requesting refunds:

```bash
MIDTRANS_ENV=sandbox MIDTRANS_SERVER_KEY="<sandbox-key>" \
  MIDTRANS_SANDBOX_ORDER_ID="<sandbox-order-id>" \
  node scripts/midtrans-sandbox-status-check.mjs
```

## Human sign-off template

| Approver | Required decision |
| --- | --- |
| Product / accountable owner | Scope and customer experience approved |
| Payment integration engineer | All merchant sandbox UAT cases PASS |
| Operations and customer support | Refund and paid-without-seat escalation coverage approved |
| Finance / payment reconciliation | Provider payout reconciliation and refund ledger approved |
| Security / privacy reviewer | Tokens, payment status disclosure and environment setup approved |
| Release engineer | Migrations, backup, worker health and rollback rehearsed |

**Go / no-go decision:** remain **NO-GO** until approvals, merchant UAT,
documented provider-specific refund policy and issue #114 criteria are met.
The release flags are independent deployment controls, not a substitute for
actual human review. Production automatic refunds need an additional
refund-specific UAT and operations review; basic payment go-live does not
automatically approve refund automation.

## After release (once separately approved)

Monitor both worker heartbeats. Specifically verify that the
`midtrans-reconciliation-worker` container exists and runs the authenticated
five-minute poller; a successful web health check alone is inadequate.
Review payment operations for refunds, missed webhook reconciliation,
`manual_review`, confirmed seats vs. capacity and acquiring-bank acknowledgments.

**Do not mark issue #114 resolved or change PR status to ready based solely
on this automated release gate.**
