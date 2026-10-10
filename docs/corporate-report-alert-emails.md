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
not a guarantee of exactly-once inbox delivery. An authenticated provider webhook
records delivery outcomes separately; manual requeue remains out of scope.

## Corporate report email visibility

Corporate users with report-management permission can open the program-scoped
**Corporate → Reports** PDF generation monitor to see aggregate queued, sending,
retry, provider-accepted, failed and cancelled email counts for each report.
The program summary also surfaces pending and failed counts. No recipient emails,
email payloads, or provider IDs are exposed in this UI. Counts only reflect
reports currently included in the report library, not an all-time account total.

`Provider accepted` records Resend acceptance only. `Delivered` means the
recipient's mail server accepted the message; it does **not** prove placement
in an inbox, opening, or reading. A terminal `failed` record is visible for operator follow-up;
the portal deliberately does not allow resending or bypassing delivery permissions.

## Resend delivery webhook

Migration `0039_resend_delivery_events` adds two optional outbox fields,
`provider_event_type` and `provider_event_at`, plus a provider ID lookup
index. Existing email delivery records remain valid.

1. In the Resend dashboard, register an HTTPS POST webhook pointing at
   `https://terumbu.world/api/webhooks/resend`, using the actual public
   production domain. Subscribe to `email.delivered`,
   `email.delivery_delayed`, `email.bounced`, `email.complained`,
   `email.failed` and `email.suppressed`.
2. Save the webhook signing secret (starting with `whsec_`) as
   `RESEND_WEBHOOK_SECRET` in GitHub Actions' **production secrets**.
   It is passed to the server container only, not to browser bundles.
3. Deploy after the database migration, then test a provider-generated
   webhook in the Resend dashboard. The signed webhook requires raw
   payload bytes and `svix-id`, `svix-timestamp`, and `svix-signature`
   headers; invalid signatures are rejected, and old timestamps outside
   a five-minute window are not accepted.
4. Confirm the corresponding report alert in **Corporate → Reports**
   transitions from `Provider accepted` to `Delivered` or a specific
   delivery problem. Confirm that the sender domain and email API key are
   validated in Resend's dashboard before using production recipients.

The webhook is fail-closed with HTTP 503 when its signing secret is not
configured. Unknown/unrelated email IDs and unsubscribed event types are
acknowledged without changing Terumbu records. Only `email_logs` rows with
`template = 'corporate_report_failure'` and a matching provider message ID
can be updated. The event timestamp guard makes duplicate and out-of-order
events idempotent and does not reactivate cancelled/unsent jobs.

**Status meanings:** `sent` (Resend accepted), `delivered` (receiving
mail server accepted), `delivery_delayed`, `bounced`, `complained`,
`provider_failed`, `suppressed`. `failed` still means the original
outbox send attempt failed before provider acceptance. Provider failures are
not automatically resent, to avoid duplicate messages or repeated sends to
invalid/suppressed addresses. An operator should investigate the provider
dashboard, validate the address and permission, and only then consider
a separately authorized manual remediation process.

## Early webhook recovery and retention (migration 0040)

Migration `0040_resend_webhook_event_journal` adds
`resend_webhook_events`, a small, private database journal containing only
the signed `svix-id` event ID, provider message ID, event type, timestamps
and whether the event was processed. It stores **no** addresses, recipients,
raw webhook bodies, error descriptions or API credentials.

- Webhook handling first verifies the original raw-body Svix signature and
  timestamp, then transactionally records the event with `svix-id` as a
  unique key. A duplicate event is acknowledged but cannot be applied twice.
- If the email is already accepted by Resend, the same transaction applies
  the latest event using its provider ID and event timestamp.
- If the event arrives while its email remains `sending`, the journal
  retains the event. Immediately after the send worker saves the accepted
  provider ID, it replays the most recent matching event. Any interruption
  in that inline reconciliation is recovered by the authenticated hourly
  corporate report cron, with a maximum of 200 matching pending events per
  pass. Unknown provider IDs are not reprocessed in a tight loop.
- Cron also removes up to 200 journal entries per invocation once they are
  older than **72 hours**. This keeps storage bounded while exceeding the
  23-hour at-most-once send retry window. Events outside this retention
  period are not guaranteed to be recoverable. A sufficiently large
  backlog can require multiple hourly cleanup passes.
- Original send retry and permission checks remain unchanged. Webhook
  delivery problems **never** trigger an automatic resend.

The production service must apply migration 0040 before enabling this version.
The status remains a record of mail-server outcomes, **not** proof of inbox
placement, opening, or reading.
