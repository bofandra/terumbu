# Midtrans Integration PR Stack: Review and Merge Order

**Status as of 13 October 2026:** draft, not merged, not deployed and
**NO-GO** for real production transactions. This document is an integration
plan, not an instruction to merge immediately.

## Sequential ancestry and owner review

All PRs currently target `main` so their existing `pull_request: main`
GitHub Actions Verify + PostgreSQL Playwright CI continues to run.
Their commits are stacked on each previous feature branch: review/merge order
matters. PR #114 is **an issue**, not the missing fourth pull request.

| Order | PR | Capability | Primary acceptance |
| --- | --- | --- | --- |
| 1 | #112 | Opt-in donation Midtrans sandbox gateway | Signed webhook and provider GET |
| 2 | #113 | Opt-in expedition Midtrans checkout | No false booking confirmation |
| 3 | #115 | Transaction-safe expedition seat holds | No overbooked departures |
| 4 | #116 | Paid-without-seats compensation case | Idempotent refund/manual handling |
| 5 | #117 | Missing webhook reconciliation | Periodic provider polling and durable cursor |
| 6 | #118 | Customer's protected live status | Guest token privacy, no URL-forged status |
| 7 | #119 | Email-verified cross-device recovery | One-time grants, per-device cookie and redacted audit |
| 8 | #120 | Bank acknowledgment evidence | Refund not equated to customer funds received |
| 9 | #121 | Operator refund follow-up ledger | Append-only human action without financial mutation |
| 10 | #122 | Production release gate and worker deployment | Fail closed, migrations and rollback safety |
| 11 | #123 | Refund SLA and external monitoring | 20-minute heartbeat, 1h/24h/72h review alarms |
| 12 | #124 | Merchant sandbox UAT evidence and stack verifier | Real evidence must be collected, NO-GO by default |

Inspect relationship using the read-only command:

```bash
node scripts/midtrans-pr-stack.mjs
```

This calls GitHub's PR and commit-compare APIs and checks each previous
head commit is an ancestor of the next, and checks each PR's target branch.
It outputs the proposed merge order and any divergent pair, but **never
merges, rebases, closes an issue, deploys or switches on payments**.
It can be rerun after later changes; an outdated head or diverged branch
invalidates a prior inspection.

## Why *not* merge everything immediately

The current `.github/workflows/deploy.yml` deploys automatically after a
successful **push to main**, including DB migrations and app updates.
Consequently, **merging an intermediate PR is itself a production deployment
event**. A reviewer must not assume a green PR CI is permission to merge,
especially for payment/refund code.

Before any merge:

1. Confirm the proposed order and no force-push/rebase drift with the PR
   ancestry inspector. Review small incremental commit deltas from each
   previous head, not only the cumulative GitHub `main...head` diff.
2. Obtain an authorized deployment plan, migration review and rollback
   compatibility sign-off. Database migrations are forward-only during
   application rollback.
3. Check that payment/refund feature flags remain disabled, and that worker
   heartbeat, email and support safety do not regress in the deployed release.
4. Carry out real merchant sandbox UAT and record the private 12-case evidence
   bundle with six independent role approvals. The UAT script never issues
   an automated production GO decision.
5. Resolve the P0 customer-resolution acceptance issue #114 with documented
   proof. Do not close it solely because tests pass.
6. Decide, explicitly and separately, when code should be released and when
   production payment/refund functionality should be enabled.

## Squash vs merge commits

If the repository uses squash merging, later stacked branches can still
contain historical commits from earlier PRs. After each squash merge, the
next branch must be deliberately rebased or its PR diff inspected and updated
against the new main commit; never assume GitHub will automatically remove
all duplicates. Recheck database journal ordering and CI at the final SHA.

**Keep the entire chain draft for now.** The objective of this plan is
reviewability and safer deployment, not an automatic bypass of human checks.
