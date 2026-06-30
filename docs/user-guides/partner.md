# Partner Role Guide

## Demo Account

- Email: `partner.demo@terumbu.eco`
- Temporary password: supplied separately by the deployment owner; rotate by rerunning `DEMO_ROLE_PASSWORD=... npm run db:seed-role-users`.
- Start URL: `/partner`

## What This Role Is For

Use this account to review the conservation partner portal. Partners can inspect campaign status, publish field updates, submit evidence, and monitor verification progress.

## Suggested Walkthrough

1. Sign in from `/login?next=/partner`.
2. Open `/partner` to review campaign summaries, evidence status, recent updates, and partner submission forms.
3. Use the publish-update form to create a campaign update with a title, field update text, and optional image URL.
4. Use the submit-evidence form to add a field photo, document, or field report URL.
5. Open a public campaign page after publishing to confirm updates and evidence are visible in the public-facing journey when appropriate.

## Validation Checklist

- `/partner` is accessible to this account.
- Admin-only pages under `/admin` remain blocked.
- Partner-created updates and evidence are attached to a campaign.
- Evidence starts in the correct review state before admin verification.
