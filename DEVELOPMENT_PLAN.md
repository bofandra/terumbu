# Terumbu.eco Website Development Plan

## 1. Purpose

Build Terumbu.eco into a conservation engagement platform for Indonesia, connecting public donors, expedition participants, learners, NGOs, and corporate ESG teams in one trusted digital product.

The website should not feel like a simple NGO donation page. It should combine:

- Conservation crowdfunding
- Ecotourism and expedition booking
- Terumbu Academy learning
- Personal impact tracking
- Digital Impact Passport profiles
- Corporate CSR and ESG reporting
- Verified project evidence and transparency

Primary product principle:

```text
Emotion -> Trust -> Action -> Impact -> Retention
```

## 2. Current Repository State

The current workspace contains planning references and visual screens:

- `references/0. overall Plan.md`
- `references/0. overall UI.md`
- `references/1. homepage.md`
- `references/2. campaign_detail.md`
- `references/3. user_dashboard.md`
- `references/4. trip_detail.md`
- `references/5. impact_passport.md`
- `references/6. corporate_dashboard.md`
- `references/7. academy.md`
- `screens/`

No application source code is present yet, so the first engineering milestone is project scaffolding.

## 3. Recommended Technical Stack

### Frontend

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Component-first design system
- Server Components for content-heavy public pages, SEO pages, detail pages, dashboards, and database-backed page composition
- Client Components only where interactivity is required: maps, filters, forms, dashboards, booking flows, payment states, tabs, modals, and real-time UI

### Backend

MVP recommendation:

- Next.js full-stack backend using Server Actions and Route Handlers
- PostgreSQL for local development and VPS production
- Prisma or Drizzle for schema migrations, typed queries, and seed data
- Auth.js or a custom credential-based auth layer backed by PostgreSQL
- API routes for payment webhooks, file upload signatures, admin actions, and report exports
- Background jobs later for emails, report generation, payment reconciliation, and scheduled project updates

Later, if business logic grows:

- NestJS API
- Shared PostgreSQL database
- Queue worker for reports, emails, and verification jobs

### Infrastructure and Services

- Local database: PostgreSQL on developer machine
- Production database: PostgreSQL on VPS
- App hosting: VPS-hosted Next.js Node server behind Nginx or Caddy
- Deployment: Docker Compose or systemd-managed Node process
- Database backups: scheduled `pg_dump` to encrypted offsite storage
- Image and evidence storage: Cloudflare R2
- Maps: Mapbox
- Payments: Midtrans or Xendit
- Analytics: PostHog
- Email: Resend
- Error tracking: Sentry
- Optional alternate hosting: Vercel for the Next.js app only if the VPS PostgreSQL database is securely reachable over SSL

## 4. Product Areas

### Public Website

Purpose: convert visitors into donors, expedition participants, learners, and registered users.

Core pages:

- Home
- Campaign listing
- Campaign detail
- Expedition listing
- Expedition detail
- Academy home
- Impact map
- About
- Partner profiles

### Authenticated User Product

Purpose: help users see, grow, and share their conservation impact.

Core pages:

- Dashboard overview
- My donations
- My sponsored corals
- My expeditions
- My courses
- Certificates
- Impact Passport
- Account settings

### Corporate Product

Purpose: support B2B revenue through CSR, ESG, employee engagement, reporting, and evidence management.

Core pages:

- Corporate dashboard
- Program overview
- Project portfolio
- Funding utilization
- Employee engagement
- Evidence center
- Reports
- Team and permissions

### Admin and Partner Portal

Purpose: let Terumbu and verified partners manage campaigns, trips, impact data, updates, reports, and evidence.

Core pages:

- Admin dashboard
- Campaign management
- Expedition management
- Partner verification
- Donation reconciliation
- Impact site management
- Evidence upload
- User support
- Corporate account management

## 5. Route Map

Recommended initial routes:

```text
/
/campaigns
/campaigns/[slug]
/expeditions
/expeditions/[slug]
/academy
/academy/courses/[slug]
/impact-map
/about
/partners/[slug]

/login
/signup
/checkout/donation
/checkout/expedition
/checkout/success

/dashboard
/dashboard/impact
/dashboard/corals
/dashboard/donations
/dashboard/expeditions
/dashboard/academy
/dashboard/passport
/dashboard/certificates
/dashboard/settings

/corporate
/corporate/dashboard
/corporate/programs
/corporate/projects
/corporate/funding
/corporate/employees
/corporate/evidence
/corporate/reports
/corporate/settings

/admin
/admin/campaigns
/admin/expeditions
/admin/partners
/admin/impact-sites
/admin/evidence
/admin/reports
/admin/users
```

## 6. Development Phases

### Phase 0 - Foundation

Goal: create the application base and design system.

Deliverables:

- Initialize Next.js, TypeScript, Tailwind, linting, and formatting
- Configure environment variables
- Configure local PostgreSQL connection
- Add ORM and migration tooling
- Create the first database schema and seed data
- Add local development scripts for database migration, reset, and seed
- Create route groups for public, auth, dashboard, corporate, and admin areas
- Build shared layout primitives
- Build design tokens for color, spacing, typography, radius, shadows, and motion
- Build reusable components:
  - Header
  - Footer
  - Button
  - Card
  - Badge
  - Progress bar
  - Stat card
  - Tabs
  - Modal
  - Form inputs
  - Empty states
  - Loading states
- Add responsive layout rules for desktop, tablet, and mobile
- Add sample data fixtures for campaigns, trips, impact sites, users, and corporate programs

Acceptance criteria:

- App runs locally
- Local PostgreSQL database can be migrated and seeded from a clean state
- All primary route shells exist
- Shared components are documented in a simple internal component page
- Design matches the visual direction in `screens/`

### Phase 1 - Public MVP and Donation Conversion

Goal: launch the public website experience with a credible donation journey.

Pages:

- Home
- Campaign listing
- Campaign detail
- Donation checkout
- Donation success
- About

Key features:

- Cinematic homepage hero
- Live impact counters
- Featured campaigns
- Featured expedition preview
- Impact map preview
- Campaign filters
- Campaign progress bars
- Verified campaign badges
- Sticky donation card
- Donation amounts and custom amount
- Donor details form
- Payment gateway integration
- Donation confirmation email
- Basic analytics events

Acceptance criteria:

- A visitor can find a campaign, understand it, donate, and receive confirmation
- Campaign detail page explains problem, partner, timeline, impact, funding, and updates
- Payment status is stored and visible in admin data
- Core mobile layouts are polished

### Phase 2 - User Accounts and Impact Dashboard

Goal: close the loop after donation with visible personal impact.

Pages:

- Login
- Signup
- Dashboard overview
- My donations
- My sponsored corals
- My impact
- Account settings

Key features:

- Auth.js or custom PostgreSQL-backed authentication
- Secure password hashing if email and password login is used
- Session handling through secure HTTP-only cookies
- User profile setup
- Donation history
- Receipts
- Impact summary cards
- Latest project updates
- Sponsored coral preview
- Personal impact map
- Achievement and level system foundation
- Notification model foundation

Acceptance criteria:

- A user can sign up, log in, and view their donation history
- A donation is linked to a user profile when the donor is authenticated
- Dashboard clearly shows total contribution, campaigns supported, and impact updates

### Phase 3 - Expedition Marketplace and Academy

Goal: expand beyond donations into experiences and learning.

Pages:

- Expedition listing
- Expedition detail
- Expedition checkout
- Academy home
- Course detail
- My courses
- Certificates

Key features:

- Expedition search and filters
- Trip gallery
- Trip itinerary
- Availability and date selection
- Participant requirements
- Booking checkout
- Academy learning tracks
- Course catalog
- Course progress
- Basic assessments
- Certificate issuance
- Required preparation modules for expedition participants

Acceptance criteria:

- A visitor can browse and book a conservation expedition
- A user can start and complete a course
- Course completion appears in the user dashboard and Impact Passport data model

### Phase 4 - Digital Impact Layer

Goal: make verified impact the strongest product differentiator.

Pages:

- Impact Passport
- Public Impact Passport
- Impact map
- Sponsored coral detail
- Project update detail

Key features:

- Impact Passport identity hero
- Visibility controls: private, public, link-only
- Shareable profile link
- QR code
- Impact categories:
  - Donations
  - Sponsored corals
  - Expeditions
  - Courses
  - Certificates
  - Volunteering
- Conservation timeline
- Evidence gallery
- Before and after photos
- Methodology notes
- Exportable impact summary

Acceptance criteria:

- A user can publish a privacy-safe public impact profile
- Each visible impact item has traceable evidence or methodology
- Sponsored ecosystem data can include location, status, photos, and update history

### Phase 5 - Corporate ESG Platform

Goal: unlock B2B revenue and reporting workflows.

Pages:

- Corporate dashboard
- Program detail
- Project portfolio
- Funding utilization
- Employee engagement
- Evidence center
- Reports
- Team access

Key features:

- Corporate workspace model
- Role-based access
- Program and reporting-period selectors
- Executive KPI cards
- Portfolio map
- Budget utilization
- Employee participation
- Evidence review
- Risk and delay tracking
- CSR and ESG report export
- Branded public impact page

Acceptance criteria:

- Corporate users can review funded projects, budget, impact, evidence, and employee activity
- Reports can be exported with clear methodology and source evidence
- Role permissions separate executives, ESG managers, finance reviewers, employee engagement managers, and auditors

### Phase 6 - PWA, Mobile, and Future Intelligence

Goal: improve retention and field usability.

Key features:

- PWA installability
- Offline-friendly course and expedition preparation content
- Push notifications
- Mobile-first impact updates
- Field evidence upload improvements
- AI conservation guide
- AI trip planner
- AI impact story generator

Acceptance criteria:

- Core dashboard and learning experiences are comfortable on mobile
- Users can receive timely project, trip, and certificate notifications
- AI features only use verified Terumbu data and clearly cite their sources

## 7. Data Model Draft

Core tables:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`
- `profiles`
- `roles`
- `user_roles`
- `organizations`
- `organization_verifications`
- `campaigns`
- `campaign_updates`
- `campaign_categories`
- `impact_sites`
- `impact_evidence`
- `donations`
- `payment_transactions`
- `sponsored_ecosystems`
- `expeditions`
- `expedition_departures`
- `expedition_bookings`
- `courses`
- `course_lessons`
- `course_enrollments`
- `certificates`
- `impact_passports`
- `impact_passport_items`
- `badges`
- `user_badges`
- `corporate_accounts`
- `corporate_programs`
- `corporate_projects`
- `corporate_employees`
- `corporate_reports`
- `admin_audit_logs`

Important relationships:

- A user has one profile and may have one or more roles
- A campaign belongs to an organization and may have one or more impact sites
- A donation belongs to a campaign and optionally to an authenticated user
- A sponsored ecosystem belongs to a user, campaign, and impact site
- An expedition can be connected to a campaign, academy preparation course, and impact passport item
- A course completion can create a certificate and impact passport item
- A corporate program can fund multiple campaigns, projects, expeditions, and employee activities

Database environment plan:

- Development uses local PostgreSQL with seeded sample data
- Staging and production use PostgreSQL on the VPS
- Migrations are committed to the repository and applied during deployment
- Production backups run automatically and are tested with restore drills
- Application database users should have least-privilege permissions per environment

## 8. Design System Direction

Visual tone:

- Trustworthy
- Oceanic
- Evidence-driven
- Warm and human
- Premium enough for corporate partners
- Approachable enough for students and first-time donors

Core UI patterns:

- Full-bleed visual hero on public pages
- Sticky conversion cards for campaign and trip detail pages
- Dense but calm dashboard layouts for authenticated and corporate users
- Verified badges for trusted entities and evidence
- Maps and timelines as core navigation devices
- Clear progress indicators for funding, learning, coral growth, and ESG targets

Primary responsive rules:

- Public pages should preserve emotional visuals on mobile without hiding the primary CTA
- Dashboards should prioritize scannable cards, bottom navigation, and compact filters on mobile
- Sticky sidebars should collapse into drawers or bottom navigation
- Tables should convert to cards or horizontally scrollable data grids

## 9. Integration Plan

### Database and Deployment

Use local and VPS PostgreSQL as the main persistence layer:

- Local PostgreSQL for development
- VPS PostgreSQL for staging and production
- Migration command included in deployment
- Seed command for local demo data only
- Connection pooling configured for production traffic
- SSL enabled for remote database connections when the app and database are not on the same private network

Recommended VPS layout:

- Nginx or Caddy handles HTTPS and reverse proxy
- Next.js runs as a Node server
- PostgreSQL runs as a managed VPS service or Docker container with persistent volume
- Backups run on a schedule and are copied outside the VPS
- Deployment logs and application logs are retained for debugging

### Payments

Use Midtrans or Xendit for:

- One-time donations
- Coral sponsorship payments
- Expedition bookings
- Corporate invoices or payment tracking

Payment events to handle:

- Created
- Pending
- Paid
- Failed
- Expired
- Refunded

### Maps

Use Mapbox for:

- Impact map pins
- Campaign locations
- Expedition routes
- Sponsored ecosystem locations
- Corporate portfolio map

### Email

Use Resend for:

- Signup verification
- Donation receipts
- Booking confirmation
- Course completion
- Certificate delivery
- Project update summaries
- Corporate report delivery

### Analytics

Use PostHog for:

- Homepage CTA clicks
- Campaign detail engagement
- Donation funnel drop-off
- Checkout completion
- Dashboard return rate
- Academy course completion
- Expedition booking conversion
- Passport share clicks

## 10. Admin Requirements

Admin tools are required before the product can scale beyond static content.

Admin capabilities:

- Create and edit campaigns
- Publish or unpublish campaigns
- Upload campaign media
- Verify partner organizations
- Review financial records
- Add project updates
- Upload evidence
- Manage impact site data
- Manage expeditions and departures
- Manage academy courses
- Issue certificates
- Manage corporate accounts
- Export reports
- View audit logs

Admin acceptance criteria:

- Every public campaign, trip, course, and impact update can be managed without code changes
- Sensitive edits are recorded in audit logs
- Evidence files are linked to a project, campaign, site, or report

## 11. Quality Plan

### Automated checks

- Type checking
- Linting
- Unit tests for business logic
- Component tests for shared UI
- Integration tests for payments and auth flows
- End-to-end tests for donation, signup, dashboard, and booking flows

### Manual QA

Test these viewports:

- 390px mobile
- 768px tablet
- 1280px laptop
- 1440px desktop

Critical flows:

- Guest donates to a campaign
- Authenticated user donates and sees impact in dashboard
- User sponsors a coral
- User books an expedition
- User completes an academy course
- User publishes an Impact Passport
- Corporate user exports a report
- Admin publishes a campaign update

Accessibility requirements:

- Keyboard navigation for all forms and menus
- Visible focus states
- Alt text for campaign, trip, and evidence images
- Color contrast that passes WCAG AA
- Captions or transcripts for videos
- Accessible map alternatives for key location data

## 12. Security and Trust Requirements

Security:

- Enforce user-owned data access in server-side authorization checks
- Use database constraints, indexes, and foreign keys to protect data integrity
- Use separate database credentials for development, staging, production, and backups
- Consider PostgreSQL Row Level Security later for highly sensitive tables if direct database clients are introduced
- Separate public, authenticated, corporate, and admin permissions
- Never expose private donation, booking, or receipt data in public profiles
- Store payment provider callbacks securely
- Validate webhook signatures
- Hash passwords with a modern password hashing algorithm if credential login is used
- Store sessions in secure HTTP-only cookies
- Require SSL for production database and payment traffic
- Keep admin actions auditable

Trust:

- Show campaign verification levels
- Separate verified evidence from illustrative media
- Disclose impact methodology
- Show partner organization profiles
- Show financial breakdowns where available
- Avoid exaggerated impact claims

## 13. MVP Launch Scope

The first public MVP should include:

- Homepage
- Campaign listing
- Campaign detail
- Donation checkout
- Donation success page
- Login and signup
- Basic user dashboard
- Donation history
- Admin campaign management
- Payment integration
- Email receipts
- Basic analytics

Defer until after MVP:

- Full expedition booking
- Full academy course player
- Public Impact Passport
- Corporate dashboard
- AI features
- Native mobile app

## 14. Launch Checklist

Before launch:

- Production environment configured
- VPS firewall and SSH access configured
- HTTPS reverse proxy configured with Nginx or Caddy
- Production PostgreSQL database created
- Production database user permissions reviewed
- Database migrations tested against a staging database
- Production backup schedule configured
- Backup restore tested at least once
- Database connection pooling configured if needed
- Payment provider tested in sandbox and production mode
- Email domain verified
- Analytics events reviewed
- SEO metadata added to public pages
- Open Graph images added
- Sitemap and robots configured
- Error tracking enabled
- Admin roles created
- Backup policy confirmed
- Legal pages added:
  - Terms of service
  - Privacy policy
  - Donation policy
  - Refund policy
- Accessibility pass completed
- Mobile QA completed
- Content reviewed by Terumbu team

## 15. Success Metrics

MVP metrics:

- Homepage CTA click-through rate
- Campaign detail conversion rate
- Donation checkout completion rate
- Average donation amount
- New user signup rate after donation
- Returning dashboard users
- Campaign update engagement
- Payment failure rate

Year 1 target metrics from the product plan:

- 10,000 users
- Rp2B donations
- 1,000 travelers
- 100,000 coral fragments
- 20 NGO partners
- 10 corporate partners

## 16. Suggested Build Order

Recommended order:

1. Project scaffolding and design system
2. Homepage
3. Campaign listing
4. Campaign detail
5. Donation checkout
6. Admin campaign management
7. Auth
8. User dashboard
9. Sponsored coral data model
10. Expedition detail
11. Academy home
12. Impact Passport
13. Corporate dashboard

This order follows the product references and prioritizes the fastest route to a credible, fundable public experience.
