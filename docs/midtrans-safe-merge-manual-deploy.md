# Terumbu — Safe Merge and Manual Production Deployment

## Decision and scope

Code deployment and activation of production payments are separate decisions.
An explicit owner-approved release can deploy the selected `main` commit with
payment and refund switches disabled. Production payment activation still needs
its own merchant UAT and financial release approvals.

The owner-approved policy accepts direct release approval. An internal ticket
and an additional environment reviewer are optional. The workflow records the
selected commit, requesting actor, explicit confirmation and release reference;
when a reference is omitted, it uses the workflow run ID.

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
| Explicit workflow dispatch on `main`, with exact SHA and confirmation | Automatic | Automatic | After successful CI and explicit release approval | After successful deploy |
| Dispatch from another branch or with missing confirmation | CI can run | CI can run | **Denied** | **Never** |

A GitHub `production` environment is used and its deployment branch policy is
restricted to `main`. The workflow also checks the branch before deploying.
Additional environment reviewers may be configured when the owner wants a
second approval; direct owner approval is sufficient under the current policy.

## Approved deployment procedure

1. Finish code review, merging, migration compatibility and rollback plan.
   Confirm that merging feature code with flags off will not create sensitive
   side effects in the existing production environment.
2. Confirm the payment configuration passes `validate-midtrans-release.sh`.
   For a release that enables production payments, complete the merchant UAT
   and independent financial approvals in `docs/midtrans-sandbox-uat-evidence.md`.
3. Optionally supply a reference of 6–80 ASCII letters, digits, hyphens or
   underscores. The workflow run ID becomes the reference when omitted.
   Never embed PII, credentials, order IDs or bank details in reference inputs.
4. In GitHub → Actions → **CI/CD** → **Run workflow**, select **main**.
5. Supply the complete 40-character **current main SHA** as `release_sha`,
   optionally fill `release_ticket`, and explicitly check `confirm_prod_deploy`
   after obtaining the owner's release approval. Green CI alone is insufficient.
6. Review the deployment authorization and CI results. If the environment has
   additional reviewers configured, obtain that review before proceeding.
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
  unsafe supplied release references are rejected.
- Direct confirmation without an internal ticket is accepted and produces a
  generated release reference.
- The deployment workflow preserves automatic CI for PRs and pushes,
  requires `workflow_dispatch` on `main`, includes `needs: [verify,e2e]`,
  and places a production environment and authorization step
  **ahead of SSH and the VPS**.
- The selected SHA is used as `DEPLOY_VERSION`.
- Post-deployment worker and refund SLA checks cannot run without a
  successful manual deployment.

All negative tests use local simulated environment variables and the Git
commit of the CI runner; they do not access the production VPS or credentials.

## Operational limitations

The script validates the **format and consistency** of the explicit approval
and selected commit. The GitHub workflow log records who initiated the release.
It does not authenticate optional external references or certify merchant UAT.
Independent financial release review remains required for activating production
payments; it is separate from code-only deployment with those switches disabled.

Application rollback does not undo forward-only Drizzle migrations. Take
and verify a database backup and confirm compatibility with the previous
application image before approving any deployment.

The public merchant sandbox probe is GET-only and does not prove a
transaction/refund journey. Maintain **NO-GO** until Issue #114, real merchant
UAT, safe compensation and customer refund resolution are signed off.

## SSH host identity: required for any production VPS release

The deploy workflow will now **reject** production SSH unless the GitHub
`production` environment has an independently validated secret named
`VPS_SSH_KNOWN_HOSTS`. It must contain exactly one OpenSSH known-hosts
entry for the exact DNS hostname or IPv4 address in `VPS_HOST`, in the form:

```text
vps.example.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...replace-with-real-public-host-key...
```

The example is intentionally not a usable host key. To enroll the real VPS:

1. Through the hosting provider's authenticated VPS console (not via an
   unverified initial SSH connection), an authorized operator reads
   `/etc/ssh/ssh_host_ed25519_key.pub`. Record the complete public host
   key and its SHA-256 fingerprint in the restricted change ticket.
2. Independently verify the fingerprint and hostname with the VPS owner.
   Copy the complete `VPS_HOST ssh-ed25519 BASE64KEY` entry to the
   `VPS_SSH_KNOWN_HOSTS` secret scoped to GitHub's protected
   **production** environment; do not store the private host key or
   use the public client/deploy key in its place.
3. Restrict production environment deployment branches to `main`; additional
   reviewers are optional under the owner-approved policy. Maintain the separate
   manual exact-SHA and Midtrans UAT/release approvals.
4. If the key is absent, changes, fails validation, or the hostname differs,
   the workflow **fails before writing the deployment private key or
   opening a connection to the VPS**. Investigate unexpected changes out
   of band rather than accepting a new key from the network.
5. During an authorized VPS host-key rotation, update and independently
   verify this pin using the provider console before the next deployment.
   A missing pin is a failed deployment, **not** a reason to disable SSH
   host verification.

Only one Ed25519 host key and a DNS hostname/IPv4 address are supported by
this guarded workflow. Custom SSH ports, IPv6 literal hostnames and alternate
host-key types require a separately reviewed change. The existing worker
monitoring schedule is unaffected.
