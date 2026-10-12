# Terumbu — Safe Merge and Manual Production Deployment

## Decision and scope

**Production payments: NO-GO.** Midtrans PRs #112–#125 remain **draft**.
This change separates **merging reviewed code into `main`** from
**running a production deployment**. No real merchant sandbox testing,
production credentials, deploy, database migration, or payment flag change
is performed by this PR.

## Why the change is necessary

The previous `.github/workflows/deploy.yml` triggered a `deploy` job on
every successful `push` to `main`. Thus a single reviewed PR merge could
replace application containers, apply forward-only database migrations and
start/stop workers without a separate operational release decision.

After this change:

| Event | Typecheck, lint, tests, build | PostgreSQL Playwright E2E | VPS deploy | Post-deploy monitoring |
| --- | --- | --- | --- | --- |
| PR targeting `main` | Automatic | Automatic | **Never** | **Never** |
| Push/merge to `main` | Automatic | Automatic | **Never** | **Never** |
| Explicit workflow dispatch on `main`, with correct authorization | Automatic | Automatic | After human environment approval | After successful deploy |
| Dispatch from another branch or with missing confirmation | CI can run | CI can run | **Denied** | **Never** |

A GitHub `production` environment is still used. **Repository
administrators must configure its required reviewers and restrict deployment
branches to `main`**. The workflow code cannot set or verify those GitHub
account-level controls by itself. Ideally, exclude the individual who
requested the release from approving their own deployment.

## Approved deployment procedure

1. Finish code review, merging, migration compatibility and rollback plan.
   Confirm that merging feature code with flags off will not create sensitive
   side effects in the existing production environment.
2. Run the 12 real Midtrans sandbox scenarios and six independent sign-offs
   using `docs/midtrans-sandbox-uat-evidence.md`. This tooling does not
   certify production GO; obtain an independent human release decision.
3. Log the approved release in the restricted change-management system with
   a safe reference of 6–80 ASCII letters, digits, hyphens or underscores.
   Never embed PII, credentials, order IDs or bank details in ticket inputs.
4. In GitHub → Actions → **CI/CD** → **Run workflow**, select **main**.
5. Supply the complete 40-character **current main SHA** as `release_sha`,
   the approved ticket reference as `release_ticket`, and explicitly check
   `confirm_prod_deploy`. Do not run the workflow merely because CI is green.
6. Review the deployment authorization/CI results and have an authorized
   reviewer approve the protected `production` environment.
7. The workflow checks the exact SHA against the GitHub event and checked-out
   tree **before SSH configuration**. Then it renders the production env,
   verifies Midtrans's separate fail-closed release gate **before uploading
   credentials**, and deploys that exact version to the VPS.
8. Confirm production smoke tests, migration compatibility and both worker
   heartbeats. Post-deploy external checks cover the worker monitor and a
   separate refund-SLA monitor. Any alert requires operator follow-up.
9. Keep payment/refund production flags disabled until a separate,
   explicitly approved payment product go-live decision. Deploying code
   alone does not authorize live payments.

The exact SHA check ensures someone cannot manually choose an arbitrary
commit while retaining a different approved release reference. If `main`
changes after the workflow starts and the VPS fetches a newer revision,
`scripts/deploy-vps.sh` refuses a mismatched revision.

## Negative checks, run automatically in CI

`tests/manual-production-deploy-gate.test.mjs` verifies:

- A push to `main`, PR event, scheduled event, or any other event **cannot**
  satisfy the deployment authorization.
- Manual dispatch from a feature branch is denied.
- Missing/false confirmation, partial SHA, wrong SHA, stale SHA and
  unrecognized change ticket format are rejected.
- The deployment workflow preserves automatic CI for PRs and pushes,
  requires `workflow_dispatch` on `main`, includes `needs: [verify,e2e]`,
  and places a protected production environment and authorization step
  **ahead of SSH and the VPS**.
- The selected SHA is used as `DEPLOY_VERSION`.
- Post-deployment worker and refund SLA checks cannot run without a
  successful manual deployment.

All negative tests use local simulated environment variables and the Git
commit of the CI runner; they do not access the production VPS or credentials.

## Operational limitations

The script validates the **format and consistency** of approval inputs, not
the authenticity of underlying UAT evidence or a ticket's authorizations.
Requiring GitHub protected-environment reviewers and independent financial
release review is mandatory.

Application rollback does not undo forward-only Drizzle migrations. Take
and verify a database backup and confirm compatibility with the previous
application image before approving any deployment.

The public merchant sandbox probe is GET-only and does not prove a
transaction/refund journey. Maintain **NO-GO** until Issue #114, real merchant
UAT, safe compensation and customer refund resolution are signed off.
