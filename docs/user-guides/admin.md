# Admin Role Guide

## Demo Account

- Email: `admin.demo@terumbu.eco`
- Temporary password: supplied separately by the deployment owner; rotate by rerunning `DEMO_ROLE_PASSWORD=... npm run db:seed-role-users`.
- Start URL: `/admin`

## What This Role Is For

Use this account to review platform operations: campaign oversight, expedition management, partner verification, impact-site records, evidence moderation, reports, users, audit logs, and donation reconciliation.

## Suggested Walkthrough

1. Sign in from `/login?next=/admin`.
2. Open `/admin` to review campaign management, evidence verification, and donation reconciliation.
3. Visit `/admin/campaigns`, `/admin/expeditions`, `/admin/partners`, `/admin/impact-sites`, `/admin/evidence`, `/admin/reports`, `/admin/operations`, `/admin/users`, and `/admin/audit`.
4. Use evidence verification controls to change submitted evidence to verified or rejected.
5. Use donation reconciliation controls to mark payment records paid or failed.
6. Check public campaign and passport pages after moderation changes to confirm public-facing records still read correctly.

## Validation Checklist

- `/admin` and all admin subsections load for this account.
- Admin actions create or preserve audit-log records where implemented.
- Partner and corporate pages can be inspected, but admin review should happen from `/admin`.
- Operational changes do not expose private user dashboard data publicly.

## Operations dashboard

The admin-only `/admin/operations` page summarizes corporate PDF schedules, failure-alert email outbox and signed Resend delivery events. Results are global aggregate counts; it intentionally excludes personal identifiers and raw payloads. Overdue means at least two hours after the scheduled time; email backlog ignores retries that are not yet due. An empty alert list does not prove that the hourly worker or external Resend webhooks are running; check the deployment scheduler and provider separately. No manual sending or publishing is offered on this dashboard.
