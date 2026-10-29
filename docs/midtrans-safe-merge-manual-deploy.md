# Terumbu — Automatic Main-Branch Production Deployment

## Current policy (2026-10-29)

Pushes and merged PRs to `main` automatically deploy after successful Verify
(typecheck, lint, unit tests, build) and PostgreSQL Playwright critical-path
E2E tests. PRs targeting `main` run tests but never deploy. Manual workflow
dispatch remains available for recovery with explicit confirmation and
an exact commit SHA.

Application code deployment does **not** enable production payment or refunds.
Merchant sandbox UAT, release, finance and operational approvals remain separate.
The existing fail-closed Midtrans gate remains mandatory.

## Trigger matrix

| Event | CI/E2E | VPS deploy | Post-deploy monitor |
| --- | --- | --- | --- |
| Pull request targeting `main` | Automatic | Never | Never |
| Push/merge to `main` | Automatic | After successful checks | After successful deploy |
| Confirmed manual dispatch on `main` | Automatic | After successful checks | After successful deploy |
| Non-main push, PR, unconfirmed dispatch, schedule | CI as applicable | Denied | Never |

## Production safeguards

1. Production deployment requires `refs/heads/main` and checks an exact
   lowercase 40-character event SHA against checked-out Git code before
   SSH, migrations or production secrets are used.
2. A queued push whose commit is no longer the VPS's fetched current `main`
   fails safely; releases are serialized and ongoing migrations are not
   interrupted by GitHub's concurrency cancellation.
3. Production uses pinned SSH known-hosts, an environment-scoped secret
   configuration, separate payment release gates, pre-migration PostgreSQL
   backup, commit-matching local/public smoke checks, and application rollback.
4. Database migrations are forward-only. Automatic application rollback
   does not automatically restore database writes or schema.
5. External worker and refund SLA monitoring starts after a successful deploy.

## GitHub environment configuration

Keep the `production` environment restricted to branch `main` and preserve
all required secrets. If GitHub `production` Required reviewers are enabled,
GitHub will still request human approval before automatic deployments.
To fully automate releases, remove Required reviewers in GitHub repository
Settings → Environments → production. Workflow code cannot override this
setting. The workflow still enforces `main`, CI/E2E success, pinned SSH
host verification and the separate payment safety gate.

Manual recovery uses GitHub Actions → CI/CD → Run workflow, selects `main`,
supplies the current 40-character `release_sha`, optionally sets a
`release_ticket` (safe characters only), and checks `confirm_prod_deploy`.
Ordinary pushes need no inputs, confirmation or separate release step.

## Automated regression tests

`tests/manual-production-deploy-gate.test.mjs` covers a successful main
push without manual confirmation, denied PR and non-main triggers, SHA
mismatches, invalid references and manual recovery restrictions.
`tests/deployment-env-contract.test.ts` checks the post-deploy monitor gate.

## Payment and incident boundaries

Never enable production payments/refunds merely because a code change
deployed successfully. Maintain NO-GO until genuine merchant UAT and
finance/operations approvals have been recorded. Investigate any failed
CI, deployment or smoke run rather than weakening safety checks.

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
3. Restrict production environment deployments to `main`. Disable Required
   reviewers only if unattended automatic deployment is intended. Maintain
   exact-SHA validation and the separate Midtrans UAT/release approvals.
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
