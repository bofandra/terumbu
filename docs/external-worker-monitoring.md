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
- It uses the MONITOR_BASE_URL repository variable if present, otherwise NEXT_PUBLIC_APP_URL, otherwise https://terumbu.world. Verify this is the actual public HTTPS origin.
- It probes from GitHub-hosted infrastructure; on a failing first probe, it retries once after 15 seconds.
- On confirmed failure, it opens one GitHub Issue titled **[Terumbu Operations] External worker heartbeat incident**. Subsequent checks reuse the open incident instead of spamming duplicates.
- Upon recovery it closes existing open monitor incidents automatically.
- Confirmed outages mark the Actions run red as well.
- The workflow uses only GITHUB_TOKEN with issues: write; CRON_SECRET, SSH and database secrets are not passed to this monitoring workflow.
- Enable repository Watch → Issues notifications for the relevant operators. **Opening an Issue does not guarantee email, push, SMS, or paging delivery.**

## First deployment and recovery

The first scheduled check may alert before both hourly endpoints have executed at least once. Check the terumbu-reminder-worker service and allow normal scheduling. Do not manually invoke cron just to silence an incident without understanding side effects.

Use GitHub Actions → External Worker Watch → Run workflow to manually test its ability to reach the endpoint. If unhealthy, consult Admin → Operations and the deployment logs for specifics.

If Issues is disabled or organization policy prevents GITHUB_TOKEN issue writes, the workflow fails and cannot automatically create an incident. GitHub Actions schedules can be delayed, suspended or unavailable; higher uptime requirements warrant a second external monitoring provider.

## Operational acceptance

1. Confirm the public endpoint emits only one status field and never includes private details.
2. Confirm both hourly workers have recent heartbeats and the manual external monitor workflow is green.
3. In a **test environment**, simulate a stale worker and confirm the 503 status, a single deduplicated incident, and automatic closure after recovery.
4. Enable appropriate GitHub Issues notifications and review Actions execution logs.
5. Do not interpret worker health as confirmation of provider webhook subscription or inbox email delivery.
