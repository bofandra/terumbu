# Terumbu.eco

Terumbu.eco is a conservation engagement platform for Indonesia's coastal ecosystems. It connects public fundraising, conservation expeditions, academy learning, verified impact tracking, and corporate sustainability reporting in one Next.js application.

## Features

- Public homepage with live impact stats, featured campaigns, expeditions, impact map preview, and Impact Passport preview.
- Campaign listing and campaign detail pages with donation progress, partner verification, field updates, impact sites, and evidence records.
- Donation checkout flow with demo payment webhook handling.
- Conservation expedition listing, trip detail pages, departure availability, and booking checkout flow.
- Terumbu Academy course catalog, course detail pages, lesson progress, assessments, certificates, and learn-to-action pathways.
- Impact Map pages for restoration sites, ecosystem metadata, project locations, and evidence visibility.
- User dashboard for personal impact, corals, donations, expeditions, academy progress, passport, and settings.
- Public Impact Passport profiles that collect donations, certificates, fieldwork, and other verified milestones.
- Corporate dashboard for program budget tracking, employee engagement, project portfolios, evidence center, and report exports.
- Partner and admin areas for project and platform operations.
- Email, audit log, authentication, session, role, and permission foundations.
- Docker-based production deployment with PostgreSQL, database migrations, and standalone Next.js build.

## Languages, Frameworks, And Tools

- TypeScript for application and database code.
- TSX and React 19 for UI components.
- Next.js 16 App Router for routing, server rendering, API routes, and standalone production output.
- Tailwind CSS for styling.
- Drizzle ORM and Drizzle Kit for PostgreSQL schema and migrations.
- PostgreSQL 16 for production database storage.
- Node.js 24 runtime.
- npm for dependency management.
- ESLint for linting.
- Node test runner with `tsx` for tests.
- Docker and Docker Compose for server deployment.
- lucide-react for UI icons.

## Code Structure

```text
.
|-- src/
|   |-- app/
|   |   |-- (public)/              Public site routes: home, campaigns, expeditions, academy, impact map, passport.
|   |   |-- (auth)/                Login and signup routes.
|   |   |-- api/                   API route handlers, including demo payment webhooks.
|   |   |-- checkout/              Donation and expedition checkout pages.
|   |   |-- corporate/             Corporate marketing and corporate dashboard routes.
|   |   |-- dashboard/             Authenticated user dashboard routes.
|   |   |-- admin/                 Admin page.
|   |   |-- globals.css            Global Tailwind styles.
|   |   `-- layout.tsx             Root application layout and metadata.
|   |-- components/                Shared UI and domain components.
|   |-- components/ui/             Lower-level reusable UI primitives.
|   |-- db/
|   |   |-- client.ts              Drizzle/Postgres client setup.
|   |   `-- schema.ts              Source database schema.
|   `-- lib/                       Auth, actions, queries, domain mapping, checkout, storage, and utilities.
|-- drizzle/                       Generated SQL migrations and Drizzle metadata.
|-- scripts/
|   |-- deploy-vps.sh             VPS deploy script used by GitHub Actions.
|   `-- seed.ts                   Demo/local seed data.
|-- deploy/
|   |-- Dockerfile                Multi-stage app and migrator image.
|   |-- docker-compose.yml        Web, migrator, and PostgreSQL services.
|   `-- .env.example             Deployment environment example.
|-- tests/                        Unit tests.
|-- references/                   Product and UI reference notes.
|-- screens/                      Reference screenshots.
|-- .github/workflows/deploy.yml  CI/CD workflow for main branch deploys.
|-- drizzle.config.ts             Drizzle Kit configuration.
|-- next.config.ts                Next.js configuration.
|-- tailwind.config.ts            Tailwind theme configuration.
`-- package.json                  npm scripts and dependencies.
```

## Database Structure

The database schema is defined in `src/db/schema.ts`, and generated migrations live in `drizzle/`.

### Enums

- `campaign_status`: `draft`, `review`, `published`, `funded`, `completed`, `archived`
- `payment_status`: `created`, `pending`, `paid`, `failed`, `expired`, `refunded`
- `booking_status`: `draft`, `pending_payment`, `confirmed`, `completed`, `cancelled`
- `enrollment_status`: `active`, `completed`, `expired`
- `evidence_status`: `submitted`, `in_review`, `verified`, `rejected`
- `verification_level`: `basic`, `document`, `field`

### Identity And Access

- `users`: account identity, email, password hash, profile image, and verification timestamps.
- `accounts`: external auth provider accounts linked to users.
- `sessions`: user sessions and expiry.
- `verification_tokens`: one-time verification tokens.
- `roles`: named roles.
- `user_roles`: many-to-many user role assignments.
- `profiles`: public user profile, location, bio, hero level, XP, and visibility.

### Organizations, Campaigns, And Evidence

- `organizations`: conservation partners, corporate partners, and verification level.
- `campaigns`: fundraising campaigns, goals, raised amount, impact target, status, and publishing dates.
- `impact_sites`: project or ecosystem locations with latitude, longitude, ecosystem type, and metadata.
- `campaign_updates`: public field updates attached to campaigns.
- `project_evidence`: evidence files, verification status, uploader, site, campaign, and metadata.
- `sponsored_ecosystems`: user-linked or campaign-linked sponsored corals, mangroves, or other ecosystem units.

### Donations And Payments

- `donations`: campaign donations, donor data, amount, currency, status, and message.
- `donation_receipts`: receipt numbers, issued timestamps, email status, and payloads.
- `payment_transactions`: payment provider references, status, and raw provider payloads.

### Expeditions

- `expeditions`: conservation trip catalog, region, price, duration, summary, and related campaign.
- `expedition_departures`: dated trip departures, capacity, seats booked, and metadata.
- `expedition_bookings`: booking codes, contact details, participant count, amount, and status.
- `expedition_participants`: participant information for each booking.
- `expedition_booking_payments`: payment provider records for expedition bookings.

### Academy

- `courses`: learning tracks with level, duration, summary, and image.
- `course_lessons`: ordered course lessons and lesson body.
- `course_enrollments`: user enrollment status and completion.
- `lesson_progress`: per-lesson progress, scores, and metadata.
- `course_assessments`: course assessments and passing scores.
- `assessment_attempts`: user assessment submissions and scores.
- `course_certificates`: certificate numbers, public slugs, and issued dates.

### Impact Passport

- `impact_passports`: one passport per user with public slug and visibility.
- `impact_passport_items`: passport milestones such as donations, certificates, fieldwork, and evidence links.

### Corporate Programs

- `corporate_accounts`: corporate customer accounts.
- `corporate_programs`: corporate sustainability programs, budgets, dates, currency, and status.
- `corporate_program_budgets`: budget allocation and spend by category.
- `corporate_employees`: employees invited or attached to a corporate account.
- `corporate_project_portfolio`: campaigns funded by a corporate program.
- `corporate_evidence_center`: evidence records visible inside a corporate program.
- `corporate_report_exports`: generated or queued report exports.
- `corporate_permissions`: user permissions within corporate accounts.

### Operations

- `email_logs`: outbound email template, recipient, payload, status, and sent time.
- `admin_audit_logs`: admin actions, entity references, and metadata.

## How To Run It

### Prerequisites

- Node.js 24
- npm
- PostgreSQL
- Docker and Docker Compose, only if you want the Docker workflow

### Local Development

1. Install dependencies:

```bash
npm ci
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL connection string:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/terumbu"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Run database migrations:

```bash
npm run db:migrate
```

5. Optionally seed demo data:

```bash
npm run db:seed
```

6. Start the development server:

```bash
npm run dev
```

7. Open the app:

```text
http://localhost:3000
```

### Useful Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
```

Use `db:generate` after changing `src/db/schema.ts`, then commit the generated files under `drizzle/`.

### Docker Compose

Use the deployment compose file to run the production-shaped stack locally:

```bash
docker compose --env-file deploy/.env.example -f deploy/docker-compose.yml up -d postgres
docker compose --env-file deploy/.env.example -f deploy/docker-compose.yml run --rm migrate
docker compose --env-file deploy/.env.example -f deploy/docker-compose.yml up -d --build web
```

By default the Docker app is exposed on:

```text
http://localhost:3100
```

### Production Deploy

The GitHub Actions workflow deploys on pushes to `main`.

On every `main` push it:

1. Installs dependencies.
2. Runs typecheck, lint, and build.
3. Uploads production environment variables to the VPS.
4. SSHes into the server.
5. Updates the server checkout.
6. Starts PostgreSQL.
7. Builds and runs the migration container.
8. Builds and restarts the web container.
9. Health-checks the running app.

The server deploy entrypoint is:

```bash
bash scripts/deploy-vps.sh
```
