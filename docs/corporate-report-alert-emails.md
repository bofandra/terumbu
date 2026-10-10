# Corporate scheduled-report failure emails

Report generation remains controlled by the authenticated hourly `POST /api/cron/corporate-reports`
endpoint (`CRON_SECRET`). It generates up to 10 due reports and then processes up to
5 pending corporate failure alert emails on each invocation. The bundled Docker Compose
`reminder-worker` invokes this endpoint hourly. Non-Compose deployments must supply
an equivalent authenticated hourly schedule.

- Failure notifications are created for authorized corporate admins on attempts
  1, 3, 6, 12, …, scoped to the same corporate account and program.
- For verified email addresses only, the failure transaction creates one `email_logs`
  outbox job per new notification. Both the notification and the outgoing job have unique
  identities, so concurrent cron instances cannot enqueue duplicate messages.
- The worker claims jobs with row locks and `SKIP LOCKED`, leases in-progress jobs,
  and rechecks the report, user's current permission, and unresolved notification before
  sending. Email is sent using Resend's `Idempotency-Key`; a successful provider response
  with an email ID marks the job `sent` (accepted by provider, not delivered to inbox).
- Retryable HTTP errors (409, 429, 5xx), network failures, and missing Resend
  configuration retry with backoff (5, 15, 45, 135, then 240 minutes), at most
  7 attempts. Permanent HTTP errors end in `failed`. The 23-hour safety window
  is deliberate: Resend retains idempotency keys for 24 hours, so resending an
  ambiguous prior acceptance after expiry could duplicate a notification.
- When generation eventually succeeds, the previously failing report's in-app
  notifications become read and clearly state that the failure was resolved; all
  queued/retry email jobs are cancelled in the same report transaction. A send already
  in flight is not revocable; the email text tells the recipient to ignore a recovered
  report. There is no implicit report approval or publication.
- Existing synchronous use of `sendTransactionalEmail` is unchanged. Only the
  `corporate_report_failure` template is consumed by this outbox processor.

## Production prerequisites

1. Apply Drizzle migration `0038_corporate_report_alert_outbox` before deployment.
2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for corporate failure email delivery.
   Without both, in-app alerts still work but outbox jobs retry and eventually fail.
3. Keep the hourly `reminder-worker` (or equivalent authenticated cron) enabled with `CRON_SECRET`. It now
   returns an `emails` count summary alongside report processing counts.
4. Review `email_logs` filtered by `template = 'corporate_report_failure'`,
   especially `status = 'failed'`, `delivery_error`, `attempt_count`, and
   `next_retry_at`. Avoid logging recipient addresses or API credentials.

The outbox is **at-most-once when provider state is ambiguous after the safe window**,
not a guarantee of exactly-once inbox delivery. Provider webhooks or manual requeue
would be a separate feature with its own authorization and monitoring.

## Corporate report email visibility

Corporate users with report-management permission can open the program-scoped
**Corporate → Reports** PDF generation monitor to see aggregate queued, sending,
retry, provider-accepted, failed and cancelled email counts for each report.
The program summary also surfaces pending and failed counts. No recipient emails,
email payloads, or provider IDs are exposed in this UI. Counts only reflect
reports currently included in the report library, not an all-time account total.

`Provider accepted` records Resend acceptance only and does **not** prove delivery
to an inbox. A terminal `failed` record is visible for operator follow-up;
the portal deliberately does not allow resending or bypassing delivery permissions.
