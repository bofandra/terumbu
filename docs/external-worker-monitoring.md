# External worker heartbeat monitor

## Purpose

The hourly scheduler lives in the Terumbu VPS worker container. A completely stopped container cannot notify anyone through its own database heartbeat. The independent GitHub-hosted **External Worker Watch** workflow checks the production application every 30 minutes.

**Public endpoint:** GET /api/health/workers.

This is different from GET /api/health, which only confirms that the web server responds. The new endpoint reads the durable worker_heartbeats table and returns only:

- HTTP 200, status "ok" — both known schedulers have recent, noncritical heartbeat status.
- HTTP 503, status "unhealthy" — a known scheduler has no row, no run for over 150 minutes, or at least two consecutive failures.
- HTTP 503, status "unavailable" — the database or query failed.

The public endpoint does **not** expose worker names, timestamps, exception messages, users, email addresses, database IDs or secret tokens. More detailed diagnostics are only in **Admin → Operations**.

A currently running or single-failure/degraded worker is still externally considered available; review the admin dashboard for single-cycle errors.

## GitHub Actions behavior

- The workflow at .github/workflows/worker-health-watch.yml runs at minutes 13 and 43 of every UTC hour and via manual workflow_dispatch. GitHub's schedule can run later than planned.
- The main CI/CD workflow also runs the same monitoring script in a separate **External Worker Watch (post-deploy)** job after a successful VPS deployment and external production smoke check. This verifies the alert pipeline immediately after each release, without waiting for a scheduled run. The two workflows serialize incident operations.
- It uses the MONITOR_BASE_URL repository variable if present, otherwise NEXT_PUBLIC_APP_URL, otherwise https://terumbu.world. Verify this is the actual public HTTPS origin.
- It probes from GitHub-hosted infrastructure; on a failing first probe, it retries once after 15 seconds.
- On confirmed failure, it opens one GitHub Issue titled **[Terumbu Operations] External worker heartbeat incident**. Subsequent checks reuse the open incident instead of spamming duplicates.
- Upon recovery it closes existing open monitor incidents automatically.
- Confirmed outages mark the Actions run red as well.
- The workflow uses only GITHUB_TOKEN with issues: write; CRON_SECRET, SSH and database secrets are not passed to this monitoring workflow.
- New incidents are assigned by default to the repository owner (override with the GitHub Actions variable MONITOR_ASSIGNEE). The assignee must have issue assignment rights; GitHub may reject an invalid assignee. Enable notification settings for assigned issues or repository Watch → Issues for relevant operators. **Opening an Issue does not guarantee email, push, SMS, or paging delivery.**

## First execution after a deployment

Deployment force-recreates both the web and reminder-worker containers so rotated secrets are applied. Previously the reminder worker began by sleeping 3,600 seconds. Frequent deployments could therefore repeatedly postpone both cron endpoints before any durable heartbeat existed.

The worker now **waits until the web health endpoint is reachable**, immediately invokes authenticated expedition reminder and corporate report cron endpoints in their original order, then sleeps 3,600 seconds before the next cycle. Cron actions retain their existing idempotency/retry behavior; each deployment can initiate an extra normal cycle. If the web server does not become reachable, the worker remains in a short readiness retry loop, allowing the external monitor to keep reporting that no current heartbeat exists.

## First deployment and recovery

The first scheduled check may alert before both hourly endpoints have executed at least once. Check the terumbu-reminder-worker service and allow normal scheduling. Do not manually invoke cron just to silence an incident without understanding side effects.

Every normal deployment now runs the check automatically after smoke tests. Use GitHub Actions → External Worker Watch → Run workflow for an additional manual verification of its independent schedule workflow. If unhealthy, consult Admin → Operations and the deployment logs for specifics.

If Issues is disabled or organization policy prevents GITHUB_TOKEN issue writes, the workflow fails and cannot automatically create an incident. GitHub Actions schedules can be delayed, suspended or unavailable; higher uptime requirements warrant a second external monitoring provider.

## Operational acceptance

1. Confirm the public endpoint emits only one status field and never includes private details.
2. Confirm both hourly workers have recent heartbeats, the CI/CD **External Worker Watch (post-deploy)** job is green, and the standalone scheduled workflow is enabled (scheduled runs may be delayed).
3. In a **test environment**, simulate a stale worker and confirm the 503 status, a single deduplicated incident, and automatic closure after recovery.
4. Enable appropriate GitHub Issues notifications and review Actions execution logs.
5. Do not interpret worker health as confirmation of provider webhook subscription or inbox email delivery.
