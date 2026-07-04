# Partner Role Guide

## Demo Account

- Email: `partner.demo@terumbu.eco`
- Temporary password: supplied separately by the deployment owner; rotate by rerunning `DEMO_ROLE_PASSWORD=... npm run db:seed-role-users`.
- Start URL: `/partner`

## What This Role Is For

Use this account to review the conservation partner portal. Partners can inspect campaign status, add campaign activity, and monitor verification progress.

## Suggested Walkthrough

1. Sign in from `/login?next=/partner`.
2. Open `/partner` to review campaign summaries, evidence status, recent updates, and partner submission forms.
3. Use the activity form to create a public update, evidence-only record, or combined public update and evidence submission.
4. Open the activity timeline to confirm verification status and public source links.
5. Open a public campaign page after publishing to confirm public activity appears in the campaign journey when appropriate.

## Validation Checklist

- `/partner` is accessible to this account.
- Admin-only pages under `/admin` remain blocked.
- Partner-created activity is attached to a campaign.
- Evidence starts in the correct review state before admin verification.
