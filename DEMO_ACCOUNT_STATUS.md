# Terumbu Demo Account and Status

Updated: 2026-06-20

## Demo Account

Seeded demo user:

- Email: `demo@terumbu.eco`
- Password: `TerumbuDemo2026!`
- Name: `Raka Demo`
- Roles: `user`, `corporate_admin`
- Public Impact Passport slug: `raka-demo-ocean-hero`

Important: the account is now part of the seed data, but the current `/login` and `/signup` pages are still static forms. Login with this account will work only after credential authentication and session handling are implemented.

## How To Seed

From the project root:

```bash
cp .env.example .env
npm run db:push
npm run db:seed
```

Optional password override:

```bash
DEMO_ACCOUNT_PASSWORD="your-local-password" npm run db:seed
```

The seed script is idempotent, so it can be run more than once without creating duplicate demo rows.

## Local Seed Verification

Verified on this machine on 2026-06-20:

- Created local PostgreSQL database `terumbu` using the `.env.example` credentials.
- Pushed the Drizzle schema to `postgresql://postgres:postgres@localhost:5432/terumbu`.
- Ran `npm run db:seed` with `DATABASE_URL` set to the local database.
- Ran the seed a second time to confirm it stays idempotent.
- Created a local ignored `.env` from `.env.example`, then confirmed `npm run db:seed` works without extra env flags.
- Confirmed row counts: `users = 1`, `campaigns = 3`, `donations = 3`, `impact_passport_items = 4`.

## Seeded Dummy Data

The seed now inserts or updates:

- Demo account, credential account row, user profile, roles, and user-role links.
- Three partner organizations: `Yayasan Bahari Lestari`, `Koperasi Pesisir Hijau`, and `Komodo Ocean Watch`.
- Three public campaigns: Raja Ampat coral restoration, North Bali mangroves, and Komodo coastline cleanup.
- Three impact sites with coordinates, progress metadata, and verification metadata.
- Three campaign updates.
- Three paid demo donations and matching demo payment transactions.
- Three sponsored ecosystem records connected to the demo user.
- Two expeditions.
- Three Academy courses.
- One public Impact Passport with four timeline items.
- One corporate account for `Nusantara Bank`.
- One admin audit log showing that demo data was seeded.

## Already Working

- Next.js App Router project is scaffolded with TypeScript, Tailwind CSS, linting, typecheck, Docker deployment files, and Drizzle configuration.
- Public pages render: home, campaign listing, campaign detail, expedition listing, expedition detail, Academy, course detail placeholder, and impact map.
- User dashboard and corporate dashboard routes render with polished static demo content.
- Auth pages render for login and signup.
- Checkout routes render for donation, expedition booking, and success states.
- Shared UI components exist for header, footer, buttons, cards, stat strips, campaign cards, expedition cards, impact map preview, and passport preview.
- PostgreSQL schema exists for users, roles, organizations, campaigns, donations, payment transactions, impact sites, sponsored ecosystems, expeditions, courses, impact passports, corporate accounts, and audit logs.
- Deployment notes and Docker Compose setup exist for running the app and PostgreSQL on the VPS without disturbing existing services.
- Demo seed data is now implemented in `scripts/seed.ts`.

## Still Needs Development

- Wire `/login` and `/signup` to real authentication, password verification, sessions, protected routes, logout, and account settings.
- Replace static page data from `src/lib/data.ts` with database queries backed by the seeded PostgreSQL tables.
- Add donation checkout integration with Midtrans or Xendit, payment webhooks, receipt records, failed-payment states, and dashboard updates.
- Add expedition availability, booking records, participant details, payment flow, and booking confirmation emails.
- Build real dashboard data views for donations, sponsored ecosystems, expeditions, courses, certificates, and Impact Passport records.
- Add a public Impact Passport page for `publicSlug` profiles.
- Add Academy lesson, enrollment, progress, assessment, and certificate models.
- Add admin and partner portals for campaign management, evidence uploads, donation reconciliation, project updates, and verification workflows.
- Add corporate program models beyond the current `corporate_accounts` table: budgets, employees, project portfolio, evidence center, report export, and permissions.
- Add maps integration using Mapbox or another provider instead of the static impact map preview.
- Add file storage for project evidence and images, likely Cloudflare R2.
- Add automated tests for seed behavior, database queries, auth, checkout flows, and dashboards.
- Generate and commit Drizzle migrations for repeatable production database setup.
