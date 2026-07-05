# Corporate Portal Flow

This phase keeps real payment integration out of scope. Corporate funding is represented as a structured contribution ledger that can be reviewed, reported, and optionally counted toward public campaign progress.

## Product distinction

Individual users contribute as people:

```txt
Campaign donation / expedition booking / course completion
→ personal dashboard
→ personal impact passport
→ receipt, booking, or certificate
```

Corporate users contribute as organizations:

```txt
Corporate account
→ corporate program
→ project portfolio allocation
→ corporate contribution record
→ evidence center
→ ESG/CSR report
→ public corporate impact page
```

## Corporate contribution ledger

Corporate contribution records live in `corporate_contributions` and are separate from `donations`.

Contribution statuses:

- `pledged`: planned support; does not count toward public campaign goal
- `committed`: approved commitment; can count toward public campaign goal
- `disbursed`: funds released; can count toward public campaign goal
- `verified`: verified utilization; can count toward public campaign goal
- `cancelled`: removed from contribution totals and public campaign goal

Contribution types:

- `csr`
- `grant`
- `sponsorship`
- `employee_matching`
- `in_kind`

Each contribution has a `countsTowardCampaignGoal` flag. When enabled and the status is `committed`, `disbursed`, or `verified`, the corporate contribution updates `campaigns.raisedAmount`. When later cancelled or toggled off, the public campaign raised amount is adjusted back by the correct delta.

## Admin setup flow

```txt
Admin opens /admin/corporate
→ creates corporate account and program
→ assigns an existing user to the corporate account
→ user can open /corporate
```

If a logged-in user opens `/corporate` without corporate permissions, the app now shows a corporate empty/no-access state instead of a confusing 404.

## Corporate user flow

```txt
Corporate user opens /corporate/projects
→ selects a published/funded/completed campaign
→ records contribution amount, type, status, and notes
→ chooses whether it counts toward public campaign goal
→ app upserts project portfolio row
→ app upserts contribution ledger row
→ app links existing campaign evidence into corporate evidence center
→ app writes an audit log
```

## Reporting behavior

Corporate reports include:

- project portfolio
- evidence bundle
- financial metrics
- contribution ledger data

The existing local generated-report storage remains unchanged in this phase.

## Out of scope

- Midtrans/Xendit or other real payment gateway integration
- invoice issuance
- bank reconciliation
- object-storage migration for report artifacts
- employee matching automation

## Making Governance Data Non-Seed

The Corporate Settings page now reads governance data from real workspace records instead of hardcoded placeholders:

- `corporate_integrations` stores SSO, HR, finance, ESG reporting, webhook, and storage integration readiness rows.
- `corporate_security_settings` stores MFA expectations, export logging, session history, retention policy, and allowed email domains.
- `admin_audit_logs` is queried for `corporate.*` events scoped to the current account/program so the audit timeline reflects real server actions.

Real setup flow:

```txt
Admin creates corporate account/program
→ Admin assigns a corporate user
→ Corporate ESG manager opens Settings
→ ESG manager saves security controls and integrations
→ Actions write audit logs
→ Settings cards, integration count, checklist, and audit timeline update from persisted DB records
```

This keeps the portal usable without real payment integration and removes dependency on seed-only governance values.

## Corporate lifecycle closure additions

This phase closes three remaining corporate lifecycle gaps without adding real payment integration.

### Corporate-managed programs

Corporate users with `program.manage` or `esg_manager` permission can manage ESG/CSR program records from `/corporate/programs`:

```txt
Corporate manager opens /corporate/programs
→ creates a program with name, period, budget, currency, and status
→ updates existing programs when the reporting period or budget changes
→ audit logs record `corporate.program.created` and `corporate.program.updated`
```

This keeps program names, periods, budgets, and status values driven by real workspace actions instead of seed-only data.

### Employee invite acceptance

Corporate employee rows now have a lightweight invite acceptance flow:

```txt
Corporate manager opens /corporate/employees
→ adds employee with status `invited`
→ app creates a pending invite token and acceptance link
→ invited user signs in with the invited email
→ user opens /corporate/invite/[token]
→ app validates email, token status, and expiry
→ employee becomes active and corporate permission is granted
```

The invite link is displayed in the employee roster so it can be copied into an email or chat message in this phase. A production email delivery worker can be attached later.

### Verified evidence auto-linking

When an admin verifies partner evidence, the app now links that evidence into every corporate program that funds the same campaign:

```txt
Partner submits evidence for campaign
→ Admin verifies evidence
→ app finds corporate project portfolio rows for that campaign
→ app inserts corporate evidence center rows for the funded programs
→ corporate evidence/report pages can use the verified evidence automatically
```

This removes the previous workaround where corporate users had to re-save a project contribution to pull newly verified evidence into their evidence center.
