# Terumbu.eco Implementation Plan Comparison

Generated: 2026-07-03

This compares the attached "Terumbu.eco - Product Ecosystem Overview" implementation plan with the current application in this working tree. I also checked the matching reference notes in `references/`, especially `0. overall Plan.md`, `0. overall UI.md`, and the page-specific reference files.

## Executive Summary

The current implementation covers the main ecosystem shape from the plan: public discovery, campaigns, expeditions, academy, user dashboard, Impact Passport, and corporate ESG dashboard all exist as Next.js routes and are backed by PostgreSQL/Drizzle queries.

The strongest match is the end-to-end platform architecture. Users can discover campaigns and expeditions, donate through a demo checkout, book expeditions through a demo checkout, enroll in Academy courses, complete lessons/assessments, earn certificates, view a dashboard, and publish/share an Impact Passport. Corporate, partner, and admin workspaces also exist.

The largest remaining gaps are production depth rather than page coverage: real payment provider integration, automated recurring charge collection, deeper provider-grade map tooling, live learning/webinars, richer Academy assignment/live-session workflows, provider-grade report formats such as PDF/XLSX, and broader role-specific permission hardening beyond the implemented corporate report workflow.

## Priority 1 Implementation Update

Implemented on 2026-07-03, excluding real payment-provider integration by request:

- Added database support for saved payment methods, monthly donation subscriptions, payment operation records, idempotency keys, donation-linked sponsored ecosystems, and source-linked passport items.
- Added monthly giving creation from donation checkout. Monthly checkout now creates a subscription record and can attach a saved demo payment method.
- Added dashboard billing management for payment methods, default method selection, method archiving, monthly subscription cancellation, donation retry, donation refund requests, expedition payment retry, and expedition refund requests.
- Added admin reconciliation support for paid, failed, and refunded donation decisions, including pending refund requests.
- Added admin reconciliation support for pending expedition booking billing requests.
- Centralized payment status transitions so campaign totals, donor counts, receipts, coral sponsorship records, and passport items are applied once and reversed when a paid record becomes refunded/failed.
- Kept the existing demo gateway instead of replacing it with a real provider.

## Priority 2 Implementation Update

Implemented on 2026-07-03:

- Enriched impact map data so impact sites are backed by `project_evidence` records, not only site metadata.
- Added map filters for ecosystem type and evidence status, plus selected-site evidence popovers.
- Added before/after evidence display and monitoring history for impact sites on public maps and personal dashboard/passport maps.
- Added actual evidence comparison support on campaign detail using the existing before/after slider component.
- Added stable campaign evidence anchors so map, campaign, corporate, and passport links can point to the same evidence source record.
- Updated corporate dashboard/evidence center cards to link to source evidence records while still exposing raw files.
- Enriched seed data with before-stage evidence, monitoring-stage metadata, observations, dates, and metric labels/values.

## Priority 3 Implementation Update

Implemented on 2026-07-03:

- Added persistent saved campaigns through `user_saved_campaigns`.
- Added persisted campaign follow subscriptions through `campaign_follow_subscriptions`; campaign detail "Follow Updates" now creates/removes a real subscription.
- Added notification preferences through `notification_preferences`, exposed in dashboard settings.
- Added persisted user notifications through `user_notifications`, including read state and mark-read/mark-all-read actions.
- Added monthly impact summary records through `monthly_impact_reports`, with dashboard actions to save a current-month summary and queue an email summary.
- Added `/dashboard/saved` as a retention center for saved projects, followed campaigns, recent notifications, and generated monthly reports.
- Updated dashboard navigation notification badges to use unread notification records instead of hard-coded counts.
- Enriched seed data with demo saved/followed campaigns, a notification, notification preferences, and a monthly report.

## Priority 4 Implementation Update

Implemented on 2026-07-03:

- Expanded `corporate_report_exports` with report type, preview/data/evidence artifact URLs, approval and publish timestamps, approver, public slug, metadata, and updated timestamps.
- Added actual local report artifact generation for corporate reports: JSON report payload, HTML preview, and JSON evidence bundle.
- Added report workflow actions for generate, submit for review, approve, and publish, with role-gated capabilities for ESG managers/program managers and finance reviewers.
- Rebuilt `/corporate/reports` into a report workflow center with status badges, artifact links, public-page links, and action buttons based on report state and permission.
- Added a branded public corporate impact route at `/corporate-impact/[publicSlug]` for published reports, showing corporate identity, metrics, funded portfolio, evidence source records, and downloadable artifacts.
- Updated the corporate dashboard to link to the published public impact page when available and otherwise direct users back to report preparation.
- Updated demo seed data and static sample artifacts so the seeded Nusantara Bank report starts as a published public example.

## Plan Extracted From Attachment

The attached overview defines seven core product surfaces and their ecosystem links:

1. Home Page: hero entry point, featured campaigns and expeditions, live counters, impact-map preview, and gateway to donate, explore, and learn.
2. Campaign Detail: verified conservation campaign, donation and sponsor-a-coral flow, funding progress, impact calculator, budget transparency, updates, and post-donation tracking.
3. Expedition Detail: destination gallery, date/participant/booking sidebar, conservation impact, itinerary, safety, inclusions, and related campaign connection.
4. Academy: learning tracks, course progress, expedition preparation, webinars, certificates, and passport-linked records.
5. User Dashboard: central impact hub for donations, corals, expeditions, learning, project updates, personal map, and passport publishing.
6. Impact Passport: public or private verified profile, timeline, certificates, badges, ecosystem records, shareable identity, and advocacy layer.
7. Corporate ESG Dashboard: corporate funding, project portfolio, budget utilization, employee engagement, evidence center, ESG/CSR reporting, and employee activity records.

The planned journey is:

`Discover -> Donate / Book / Learn -> Track Impact -> Share / Report`

## Current Implementation Inventory

### Main Routes

| Product area | Current routes |
| --- | --- |
| Public homepage | `/` via `src/app/(public)/page.tsx` |
| Campaigns | `/campaigns`, `/campaigns/[slug]`, `/campaigns/[slug]/updates/[updateId]` |
| Expeditions | `/expeditions`, `/expeditions/[slug]` |
| Academy | `/academy`, `/academy/courses/[slug]` |
| Impact map | `/impact-map` |
| User dashboard | `/dashboard`, `/dashboard/impact`, `/dashboard/corals`, `/dashboard/donations`, `/dashboard/expeditions`, `/dashboard/academy`, `/dashboard/passport`, `/dashboard/certificates`, `/dashboard/settings` |
| Public passport | `/passport/[publicSlug]` |
| Corporate workspace | `/corporate/dashboard`, `/corporate/programs`, `/corporate/projects`, `/corporate/funding`, `/corporate/employees`, `/corporate/evidence`, `/corporate/reports`, `/corporate/settings` |
| Partner operations | `/partner`, `/partner/campaigns`, `/partner/campaigns/new`, `/partner/updates`, `/partner/evidence`, `/partner/evidence/submit` |
| Admin operations | `/admin`, `/admin/campaigns`, `/admin/evidence`, `/admin/partners`, `/admin/impact-sites`, `/admin/expeditions`, `/admin/users`, `/admin/reports`, `/admin/audit` |
| Checkout | `/checkout/donation`, `/checkout/expedition`, `/checkout/success` |
| Auth | `/login`, `/signup` |

### Data Model Coverage

The schema in `src/db/schema.ts` includes the major entities required by the plan:

| Plan capability | Current database support |
| --- | --- |
| Users, sessions, roles | `users`, `accounts`, `sessions`, `roles`, `user_roles`, `profiles` |
| Partner organizations | `organizations`, `organization_users` |
| Campaign fundraising | `campaigns`, `donations`, `donation_receipts`, `payment_transactions` |
| Project updates and evidence | `campaign_updates`, `project_evidence`, `impact_sites` |
| Sponsor-a-coral / ecosystem units | `sponsored_ecosystems` |
| Expeditions and departures | `expeditions`, `expedition_departures`, `expedition_bookings`, `expedition_participants`, `expedition_booking_payments` |
| Academy and certificates | `courses`, `course_lessons`, `course_enrollments`, `lesson_progress`, `course_assessments`, `assessment_attempts`, `course_certificates` |
| Impact Passport | `impact_passports`, `impact_passport_items` |
| Corporate ESG | `corporate_accounts`, `corporate_programs`, `corporate_program_budgets`, `corporate_employees`, `corporate_project_portfolio`, `corporate_evidence_center`, `corporate_report_exports`, `corporate_permissions` |
| Operational audit/email | `email_logs`, `admin_audit_logs` |

## Page-by-Page Comparison

### 1. Home Page

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Cinematic ocean hero | Partial | Implemented with a full-screen image-based hero using a field-update image or fallback, not video. |
| CTAs for donate, expedition, impact | Implemented | `Donate Now`, `Join an Expedition`, and `Explore Impact` are present. |
| Live impact counters | Implemented | `getImpactStats()` computes corals, mangroves, users, and raised funds from database records. |
| Featured campaigns | Implemented | Pulls three published campaigns via `getCampaignCards(3)`. |
| Featured expeditions | Implemented | Pulls three expedition cards via `getExpeditionCards(3)`. |
| Impact map preview | Implemented | Uses `ImpactMapPreview` with database-backed impact sites, evidence-derived counts, filters, popovers, before/after records, and monitoring history. |
| How it works journey | Implemented | Four-step journey maps to fund, visit, learn, and track. |
| Personal Impact Passport preview | Implemented | Shows a real featured public passport or fallback. |
| Partner logos | Implemented | Pulls organization and corporate partner records. |
| Success stories/community | Partial | `HomeCommunitySection` exists, but the plan's richer story/social layer is lighter than the mockup. |

Overall: mostly implemented. Remaining polish is media depth, richer interaction, and animated/real-time presentation.

### 2. Campaign Detail

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Verified conservation campaign hero | Implemented | Detail page uses media gallery, category, location, organization, and verification explainer. |
| Sticky donation card | Implemented | `CampaignDonationCard` links into donation checkout. |
| Donation options, monthly giving, and sponsor-a-coral | Partial/Implemented | One-time donation, coral sponsorship, and monthly subscription records are supported through the demo gateway. Real recurring charge collection still needs a production provider. |
| Funding progress and impact calculator | Implemented | Progress strip and `CampaignImpactCalculator` are present. |
| Project story and public records | Implemented | Campaign story, location records, activity timeline, and sites are shown. |
| Updates and evidence gallery | Implemented | Uses `CampaignUpdatesEvidence` with database-backed updates/evidence, stable evidence anchors, stage labels, source links, and metric/observation metadata. |
| Transparency/budget section | Implemented | Governance, evidence counts, and funding record sections exist. |
| Donor community | Implemented | Recent paid donor activity appears on the page. |
| Related expedition/courses/campaigns | Implemented | Related expeditions, featured courses, and related campaigns are shown. |
| Save/share/follow project | Implemented | Campaign detail now supports saved projects and persisted follow subscriptions for logged-in users. |
| FAQ/final CTA | Partial | Strong CTAs exist; full FAQ depth is lighter than the reference plan. |

Overall: strong implementation for campaign conversion and evidence. Main gaps are production payments/subscriptions and persistent supporter engagement features.

### 3. Expedition Detail

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Photo/video gallery | Implemented | Multi-image gallery with provenance labels exists. Video/transcript support is not a real media workflow yet. |
| Trip summary and quick facts | Implemented | Region, duration, rating, group size, difficulty, language, age, and price are displayed. |
| Sticky booking card and mobile booking bar | Implemented | `ExpeditionBookingCard` and `ExpeditionMobileBookingBar` are present. |
| Date, participant, and booking flow | Implemented | Checkout records bookings, participants, payments, and seat counts through demo gateway. |
| Conservation impact and allocation | Implemented | Shows contribution amount, targets, allocation, and related campaign. |
| Itinerary, inclusions, stay, requirements, safety | Implemented | These sections are present in the detail page. |
| Reviews and FAQ | Partial | Review/FAQ presentation exists, but reviews appear static or derived rather than a full user-review system. |
| Preparation course connection | Implemented | Related Academy preparation course is linked. |
| Impact Passport record after completion | Partial | The UI promises passport recording, but automatic completed-fieldwork passport insertion is not as explicit as Academy certificate insertion. |

Overall: very close to the planned expedition detail experience, with demo checkout standing in for production booking/payment infrastructure.

### 4. Academy

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Academy hero and search | Implemented | Search form and topic links filter course catalog. |
| Continue learning | Implemented | Logged-in summary and continue-learning sections use enrollment/progress data. |
| Learning tracks | Implemented | Track cards and progress are rendered. |
| Featured courses and catalog | Implemented | Course catalog filters by query, topic, and level. |
| Course detail, enrollment, lessons | Implemented | Course detail route and actions for enrollment and lesson completion exist. |
| Assessments and certificates | Implemented | Assessment submission can issue certificates and add passport items. |
| Expedition preparation panel | Partial | Academy home includes a preparation card and expedition detail links a preparation course; a mandatory pre-trip compliance workflow is not complete. |
| Live webinars/classes | Partial | A live-learning section exists, but there is no full scheduling/registration/backend workflow. |
| Corporate assigned learning | Partial | Corporate employee concept exists in schema; full assigned-learning management is not obvious in current routes. |

Overall: a functional Academy foundation exists, including progress and certificates. Live sessions and role-specific learning programs are still shallow.

### 5. User Dashboard

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Dashboard shell with sidebar/header | Implemented | `DashboardShell` includes sidebar, mobile bottom nav, search, notifications, and profile menu. |
| Ocean Hero progress | Implemented | Hero level, XP, and progress bar are shown. |
| Impact summary cards | Implemented | Donations, corals, expeditions, courses, certificates, and monthly deltas are summarized. |
| Latest impact update | Implemented | Pulls campaign update/evidence data into dashboard. |
| Personal impact map | Implemented | `DashboardPersonalImpactMap` is present. |
| Sponsored corals | Implemented | Dashboard shows coral cards and links to coral details. |
| Upcoming expedition management | Implemented | Upcoming booking and checklist are shown. |
| Academy progress | Implemented | Dashboard has Academy summary/subpage support. |
| Timeline, achievements, recommendations | Implemented | Timeline, achievements, and next actions are represented in dashboard/passport data. |
| Billing management | Implemented | Donation dashboard now includes saved demo payment methods, monthly subscriptions, cancellation, retries, refund requests, and operation history. |
| Notifications/search | Partial/Implemented | Persisted notifications, preferences, unread badges, read state, and a saved-project retention center are implemented. Global search remains mostly presentational. |

Overall: implemented as the central impact hub envisioned in the plan, with some dashboard controls still presentation-heavy.

### 6. Impact Passport

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Private dashboard passport view | Implemented | `/dashboard/passport` shows identity, metrics, visibility, QR/share link, categories, map, records, certificates, and methodology. |
| Public passport view | Implemented | `/passport/[publicSlug]` renders public-safe profile, metrics, timeline, approximate map, records, certificate vault, and methodology. |
| Private/public/link-only visibility | Implemented | `updatePassportVisibilityAction()` supports `private`, `link`, and `public`. |
| Shareable profile and QR | Implemented | Copy button and QR generation are present. |
| Timeline and category records | Implemented | `impact_passport_items` and derived activity records power timeline/category sections. |
| Certificates and badges | Implemented | Certificates can be issued from Academy and displayed in passport views. |
| Evidence and methodology | Implemented | Public evidence links, campaign evidence-source links, and methodology copy are included. |
| Export/download | Partial | Download-style UI/icons exist in places, but no full PDF/export artifact pipeline is obvious for individual passports. |
| Endorsements/external records | Missing/Partial | The planned endorsements and richer external volunteer/professional validation layer are not clearly implemented. |

Overall: Impact Passport is one of the better-aligned parts of the implementation. Export, endorsements, and richer external verification remain future work.

### 7. Corporate ESG Dashboard

| Planned feature | Current status | Notes |
| --- | --- | --- |
| Corporate dashboard shell | Implemented | `CorporateShell` has sidebar, program selector, reporting period selector, search, notifications, user role label, and account summary. |
| Executive KPIs | Implemented | Committed funds, disbursed funds, projects, employees, hours, and similar metrics are shown. |
| Project portfolio | Implemented | Funded projects table shows partner, location, funding, utilization, impact, status, milestone, and actions. |
| Budget utilization | Implemented | Budget/funding/utilization data exists in schema and dashboard views. |
| Employee engagement | Implemented | Aggregate employee and volunteer-hour trend is shown. |
| Evidence center | Implemented | Evidence widgets and `/corporate/evidence` route link back to campaign evidence source records and expose stage/metric context. |
| Reports center | Implemented | `/corporate/reports` now generates report files, shows preview/data/evidence links, and supports generated -> review -> approved -> published workflow states. |
| Public impact page | Implemented | Published reports expose a branded `/corporate-impact/[publicSlug]` route with corporate identity, metrics, portfolio, evidence links, and artifact downloads. |
| Role-based access | Partial/Implemented | Report actions are role-gated for program/ESG managers and finance reviewers. Wider corporate CRUD and partner/admin permissions still need deeper hardening. |
| Program/project creation and approval | Partial | Routes exist, but many corporate flows appear view/report oriented rather than full CRUD/approval workflows. |

Overall: corporate dashboard is structurally implemented and data-backed, and the core report generation, approval, publishing, and public reporting workflow now exists. Remaining depth is mostly richer corporate CRUD, broader permission enforcement, and production-grade report formats/storage.

## Ecosystem Flow Comparison

| Planned ecosystem link | Current status | Evidence |
| --- | --- | --- |
| Home -> discover campaigns | Implemented | Homepage links to `/campaigns` and displays featured campaign cards. |
| Home -> explore expeditions | Implemented | Homepage links to `/expeditions` and displays expedition rail. |
| Home -> start learning | Implemented | Public nav and homepage journey connect to Academy. |
| Campaign donation -> dashboard impact | Implemented | Donation checkout creates donation/payment/receipt records and updates campaign totals. Dashboard queries paid donations. |
| Coral sponsorship -> tracked ecosystem | Partial/Implemented | Coral intent creates `sponsored_ecosystems`; production sponsor selection and recurring care workflow are still light. |
| Expedition booking -> dashboard participation | Implemented | Expedition checkout creates booking, participant, payment, and seat records; dashboard surfaces upcoming trips. |
| Academy completion -> certificate/passport | Implemented | Passing assessments can create `course_certificates` and `impact_passport_items`. |
| Dashboard -> publish/share passport | Implemented | Visibility controls, share URL, QR, and public passport route exist. |
| Corporate funding -> project portfolio | Implemented | Corporate portfolio tables connect programs to campaigns and evidence. |
| Corporate employee activity -> learning/activity records | Partial | Corporate employee and engagement metrics exist, but individual employee learning/activity-to-passport linkage is not fully visible. |

## Implementation Strengths

- The planned product is implemented as a real multi-route Next.js application, not just static mockups.
- The database schema is broad and maps well to the product ecosystem.
- The public and authenticated user journeys are connected through actual server actions and queries.
- Donation, expedition, Academy, certificate, and passport workflows have end-to-end demo behavior.
- Partner and admin workspaces go beyond the attached overview and support operational needs like campaign creation, evidence submission, evidence verification, and audit tracking.
- The code uses clear domain components for repeated surfaces such as campaign cards, expedition cards, passport previews, map previews, dashboard shells, and corporate shells.

## Major Gaps Against The Plan

1. Production payment provider and automated recurring charges
   - Current checkout uses a demo gateway.
   - Monthly contributions now create subscription records and can be cancelled from the dashboard.
   - Saved demo payment methods, retry flows, refund requests, admin reconciliation, and idempotent status transitions are implemented.
   - Real provider tokenization, automated monthly collection, refunds through a provider API, retries, payment-method updates, and provider webhooks still need production implementation.

2. Provider-grade impact map depth
   - Map surfaces now include ecosystem/status filters, evidence popovers, before/after media, and monitoring history backed by `project_evidence`.
   - Remaining depth is mostly provider-grade polish: Mapbox-style clustering, drawing/viewport controls, advanced geospatial filtering, privacy-radius controls, and richer evidence media workflows.

3. Real-time engagement features
   - Persistent saved projects, campaign follow subscriptions, notification preferences, notification read/unread state, and monthly summary records are implemented.
   - Remaining depth is global search behavior, richer notification delivery scheduling, and broader saved/follow affordances across listing cards.

4. Academy live and assigned learning
   - Course, lesson, assessment, and certificate foundations exist.
   - Live webinars, instructors, scheduled events, corporate assignments, and mandatory expedition-prep compliance need more backend workflow.

5. Corporate reporting output
   - Report export records now generate downloadable JSON report payloads, HTML previews, and evidence bundle JSON files.
   - Approval, publish, public slug, branded public report pages, and report workflow actions are implemented.
   - Remaining depth is production file storage, PDF/XLSX exports, scheduled report generation, richer report templates, and formal audit/versioning workflows.

6. Role-specific corporate/partner permissions
   - Roles and corporate permissions exist.
   - More granular enforcement of what executive viewers, finance reviewers, employee-engagement managers, auditors, partners, and admins can do should be tightened.

7. Impact Passport export and endorsements
   - Public/private/link visibility is implemented.
   - Passport PDF/export, endorsements, external volunteer validation, and professional/academic credential workflows are not fully present.

## Suggested Priority Roadmap

### Priority 1: Make contribution flows production-grade

- Remaining: replace demo donation and expedition payment handling with a real payment provider.
- Done: add subscription tables/actions for monthly giving.
- Done: add payment method, cancellation, retry, refund, and reconciliation workflows.
- Done: ensure donation, coral sponsorship, receipt, campaign total, dashboard, and passport side effects remain idempotent.

### Priority 2: Deepen evidence and map trust

- Done: upgrade impact maps with ecosystem/status filters and evidence popovers.
- Done: add before/after photo support and monitoring history for impact sites.
- Done: link campaign, passport, corporate, and map surfaces back to the same campaign evidence source anchors.
- Remaining: replace the iframe/provider-preview base with provider-grade map clustering, geospatial controls, and richer media review workflows if needed.

### Priority 3: Complete retention mechanics

- Done: implement saved projects, followed campaigns, notification preferences, and notification read state.
- Done: add monthly impact report records and email-summary queueing.
- Done: make "Follow Updates" a persisted campaign subscription.
- Remaining: expand global search, scheduled/background notification delivery, and saved/follow controls on campaign listing cards.

### Priority 4: Finish corporate reporting

- Done: generate actual report artifacts from `corporate_report_exports`.
- Done: add report preview, approval, publish, download, and evidence bundle workflows.
- Done: add a branded public corporate impact page route.
- Done: enforce report workflow actions by corporate role.
- Remaining: add production PDF/XLSX outputs, durable object storage, scheduled report generation, richer audit/version history, and broader corporate permission enforcement outside reports.

### Priority 5: Expand Academy beyond self-paced courses

- Add live session/event models and registration.
- Add corporate assigned-learning programs.
- Add expedition-preparation requirements that gate or flag bookings.
- Improve course player UX if longer lessons or rich media are needed.

## Bottom Line

The current implementation is a strong functional foundation for the attached Terumbu.eco ecosystem plan. The planned pages mostly exist, the core data model is in place, and several end-to-end demo flows already connect user actions to dashboard/passport/corporate surfaces.

The next phase should focus less on adding new top-level pages and more on productionizing the workflows that make the ecosystem credible: payments, recurring giving, evidence review operations, provider-grade map polish, reporting outputs, notifications, and role-specific operations.
