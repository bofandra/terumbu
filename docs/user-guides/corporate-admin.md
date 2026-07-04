# Corporate Admin Role Guide

## Demo Account

- Email: `corporate.demo@terumbu.eco`
- Temporary password: supplied separately by the deployment owner; rotate by rerunning `DEMO_ROLE_PASSWORD=... npm run db:seed-role-users`.
- Start URL: `/corporate`

## What This Role Is For

Use this account to review the corporate ESG workspace for a company sustainability, CSR, or finance stakeholder. The account is attached to the Nusantara Bank corporate program with `program.manage` access.

## Suggested Walkthrough

1. Sign in from `/login?next=/corporate`.
2. Open `/corporate` to review executive KPIs, annual goals, portfolio map, project health, project table, employee engagement, evidence, risks, reports, and quick actions.
3. Visit `/corporate/projects` to review funded project portfolio summaries.
4. Visit `/corporate/funding` to inspect allocation and utilization views.
5. Visit `/corporate/evidence` to inspect evidence available for reporting.
6. Visit `/corporate/reports` and queue a report export.
7. Visit `/corporate/settings` to review workspace-access copy and future team-management areas.

## Validation Checklist

- The corporate shell shows company/program context and a role label.
- `/corporate` loads for this account without redirecting away.
- Corporate reporting and evidence views use the same program context.
- Public supporter-only workflows remain accessible but are not the primary workspace.
