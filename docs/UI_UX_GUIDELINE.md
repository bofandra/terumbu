# Terumbu.eco UI/UX Guideline

Last updated: 2026-07-04

This guideline standardizes Terumbu.eco's visual theme, interaction patterns, page hierarchy, and quality bar across public pages, authenticated user dashboards, corporate workspaces, partner tools, and admin screens.

## References Checked

- `references/0. overall UI.md`
- `references/0. overall Plan.md`
- `references/1. homepage.md`
- `references/2. campaign_detail.md`
- `references/3. user_dashboard.md`
- `references/4. trip_detail.md`
- `references/5. impact_passport.md`
- `references/6. corporate_dashboard.md`
- `references/7. academy.md`
- `references/8. end-to-end-test-case.md`
- Page review files in `references/*review*.md`
- Screenshots in `screens/`
- Current implementation tokens and shared components in `tailwind.config.ts`, `src/app/globals.css`, `src/components/ui/button.tsx`, `src/components/site-header.tsx`, `src/components/dashboard-shell.tsx`, and related shared components.

## Experience North Star

Every screen must move through this sequence:

```text
Emotion -> Trust -> Action -> Impact -> Retention
```

Every page should answer these questions quickly:

1. Why should I care?
2. Can I trust this?
3. What should I do next?
4. What happened after I contributed?
5. Why should I come back?

Terumbu.eco is a conservation engagement platform, not only a donation website, travel marketplace, NGO brochure, or e-learning product. The UI must connect funding, field activity, learning, verified records, and reporting into one coherent experience.

## User Segments

Design for these primary audiences:

- General public: wants to help but needs clarity, trust, and easy next steps.
- Donors and supporters: need transparent funding, updates, receipts, and evidence.
- Expedition participants: need confidence, availability, safety, itinerary, and preparation.
- Learners and students: need clear progress, credentials, and a path from learning to action.
- Corporate stakeholders: need reliable ESG/CSR reporting, governance, evidence, and financial clarity.
- NGO and partner teams: need simple update/evidence workflows and clear moderation states.
- Admin operators: need dense, low-friction operational controls with auditability.

## Theme System

Use the existing Tailwind theme as the source of truth.

| Token | Hex | Role |
|---|---:|---|
| `ocean-900` | `#07343f` | Primary dark navy, navigation, headings, executive surfaces |
| `ocean-700` | `#0b5d64` | Secondary dark ocean, hover states |
| `ocean-500` | `#188f8a` | Ocean data, links, active environmental UI |
| `ocean-300` | `#78cfc7` | Turquoise highlight, map accents |
| `ocean-100` | `#d5f1ef` | Light aqua panels |
| `ocean-50` | `#eefafa` | Soft informational backgrounds |
| `ocean-950` | `#04252f` | Dark overlays, modal scrims |
| `coral-700` | `#b9362d` | Strong primary CTA hover, high-emphasis labels |
| `coral-500` | `#f45d48` | Primary CTA, donation/booking action |
| `coral-400` | `#ff785f` | Chart gradients and warm visual transitions |
| `coral-300` | `#ff9d83` | Warm highlights, selection |
| `coral-200` | `#ffc5b6` | Light warm text on dark backgrounds |
| `coral-100` | `#ffe2d7` | Soft warning/action background |
| `kelp-700` | `#285a37` | Verified/success text |
| `kelp-500` | `#4a8f57` | Confirmed, completed, on-track states |
| `kelp-400` | `#6daf77` | Progress fill on dark backgrounds |
| `kelp-300` | `#91c99a` | Success icon on dark backgrounds |
| `kelp-200` | `#bfe4bd` | Success text on dark public/corporate hero surfaces |
| `kelp-100` | `#dcefd8` | Success background |
| `sand-50` | `#fbf7ef` | Default public page background |
| `sand-100` | `#f4ead7` | Warm section or input background |
| `sand-300` | `#d8be86` | Gold/warm accent, premium passport detail |
| `mist-50` | `#f5f8fb` | Cool authenticated and corporate workspace background |
| `credential-700` | `#5f3dc4` | Academy certificate and credential accent |
| `credential-300` | `#cabdff` | Academy certificate border |
| `credential-50` | `#f7f3ff` | Academy certificate background |

### Color Rules

- Use coral for primary conversion: donate, book, enroll, generate report, continue learning.
- Use ocean for navigation, data confidence, secondary actions, and serious professional surfaces.
- Use kelp for verified, completed, healthy, confirmed, and on-track states.
- Use amber/orange for attention, pending, limited seats, overdue, or needs-review states.
- Use red only for failed, invalid, revoked, unavailable, destructive, or urgent states.
- Use purple only for Academy certificates, credentials, and learning achievement accents.
- Never communicate status by color alone. Pair color with text and, when useful, an icon.
- Avoid random raw hex values. Add a named theme token when a new recurring color is needed.

### Typography

- Font family: Inter with system sans fallback.
- Headings: bold, direct, and outcome-oriented. Use `tracking-normal`.
- Body copy: readable line-height, generally `leading-6` or `leading-7`.
- Eyebrows: short, uppercase, bold, coral text. Do not overuse them inside dense dashboards.
- Dashboards: tighter type scale and compact metadata hierarchy.
- Academy: friendly headings, limited uppercase, strong lesson metadata.
- Corporate: precise labels, clear numerals, cautious reporting language.

### Shape, Borders, and Shadow

- Default public and dashboard cards may use rounded large corners when matching existing surfaces: `rounded-2xl`.
- Admin, partner, table, form, and dense operational panels should prefer `rounded-lg` or `rounded-xl`.
- Use thin borders: `border-ocean-900/10` or equivalent.
- Use `shadow-soft` for elevated white cards and floating panels.
- Do not stack decorative cards inside decorative cards. If a nested frame is necessary, make the inner element a functional control, table, form, media area, or clearly grouped record.

### Imagery

- Public and learning pages should use real conservation photography, field work, reef/mangrove/ocean imagery, instructor portraits, and course interface previews.
- Heroes need concrete visuals, not abstract gradients alone.
- Do not reuse the same underwater image across every campaign, expedition, or course.
- Evidence imagery needs useful alt text and should support trust, not decoration.
- Sensitive location imagery and exact restoration coordinates must respect privacy rules.

## Layout Standards

### Public Pages

- Use cinematic first impressions with real ocean/conservation imagery.
- Keep the first viewport focused on one primary narrative and a small number of actions.
- Recommended public hero order: context label, H1, supporting copy, primary CTA, secondary CTA, trust/social proof.
- Page sections should alternate between `sand-50`, white, and soft aqua backgrounds to avoid a one-note theme.
- Constrain content with `max-w-7xl` and responsive horizontal padding.

### Authenticated User Dashboard

- Use a dark ocean sidebar on desktop and bottom navigation on mobile.
- Prioritize personal progress, latest verified update, impact map, sponsored ecosystems, upcoming expedition preparation, Academy progress, timeline, notifications, and Impact Passport.
- Avoid permanent public donation CTAs in dashboard surfaces. Show contextual next actions based on the user's state.
- Support empty states for new users and partial data failures for individual widgets where possible.

### Corporate Dashboard

- Keep the experience professional, dense, and data-first.
- Use a persistent sidebar, sticky header, executive KPIs, project health, portfolio table, evidence/risk modules, report center, and governance cues.
- Corporate accent colors may appear in program headers, selected charts, report covers, and public microsites.
- Terumbu status colors and verification language must remain consistent across corporate clients.
- Complex work such as budget approval, evidence comparison, report editing, and team access management may guide mobile users toward desktop.

### Partner And Admin Workspaces

- Prefer utilitarian layouts with compact panels, tables, forms, filters, clear saved/error states, and audit-friendly actions.
- Use fewer decorative images and more operational clarity.
- Make destructive actions explicit, confirmable, and visually distinct.

## Responsive Standards

### Desktop

- Public campaign and expedition detail pages should use a two-column layout with sticky donation or booking cards.
- Dashboards should use dense grids, sidebars, charts, maps, and tables.
- Corporate pages should preserve table scanability and KPI hierarchy.

### Tablet

- Collapse sidebars where needed.
- Use two-column summary layouts.
- Make tables horizontally scrollable when the data cannot be responsibly collapsed.
- Replace complex full-page drilldowns with drawers when appropriate.

### Mobile

- Use one-column page flow with sticky bottom actions only when they directly support the current task.
- Minimum touch target: 44 x 44 px.
- Do not let sticky bars cover content or create duplicate competing CTAs.
- Maps must always provide a text/list alternative.
- Long tables require a card/list alternative, a horizontal scroll container, or a "view on desktop" affordance when functionality is too complex.

Recommended mobile task orders:

- Campaign detail: hero image, verification, title, organization, progress, sticky donate CTA, key stats, tabs, story, calculator, timeline, map/list, updates, transparency, FAQ, final CTA.
- Expedition detail: gallery, title/verification, rating, quick facts, price/availability, sticky booking bar, overview, impact, itinerary, inclusions, requirements, map/list, team, reviews, FAQ.
- Academy: greeting/progress, continue learning, required preparation, search, tracks, recommended courses, catalog, live sessions, certificates, learning-to-action journey.
- Corporate: program selector, status, executive KPIs, alerts, goal progress, map preview, project health, utilization, employee participation, reports, quick actions.

## Navigation Standards

### Public Header

- Required top-level items: Donate, Explore, Academy, Impact Map, Community/About when routes exist, Login, Sign Up/Join.
- Use dark ocean navigation over hero or sticky top navigation with sufficient contrast.
- Search is icon-first on compact layouts and full input where there is real searchable content.

### Dashboard Navigation

- Desktop: persistent sidebar with clear active state, icon, label, and account/support grouping.
- Mobile: bottom navigation for the most common destinations only.
- Use `aria-current="page"` on active links.

### Corporate Navigation

- Group business navigation from management/governance navigation.
- Keep program selector and reporting period visible near the top.
- Do not hide urgent alerts behind menus.

## Component Standards

### Buttons And Links

Use `Button` and `ButtonLink` from `src/components/ui/button.tsx` where possible.

| Tone | Use |
|---|---|
| `primary` | Main conversion action, coral background |
| `secondary` | Serious secondary action, ocean background |
| `ghost` | Low-emphasis action, inline utility, tertiary action |
| `light` | Primary action on dark hero/nav surfaces |

Rules:

- One primary CTA per decision area.
- Avoid multiple equally strong buttons.
- Text links are acceptable for tertiary actions such as share, view all, report history, or details.
- Icon buttons need accessible labels.
- Disabled buttons must explain why the action is unavailable.

### Cards

Cards should contain one clear object or task: campaign, expedition, KPI, course, certificate, evidence record, project row, report, or next action.

Required card anatomy where relevant:

- Image or icon
- Status/trust label
- Title
- Short summary
- Key metric or progress
- Action

Avoid cards that only restate page features without enabling a decision.

### Progress Bars

- Always expose a readable text label and accessible progress attributes when interactive/semantic.
- Pair percentage with real values where possible, for example "Rp250M raised of Rp350M goal".
- Use kelp for completed/healthy progress, coral for funding emphasis, ocean for neutral progress, and amber for attention.

### Badges And Status Labels

Status labels must include text:

- Verified
- Activity verified
- Certificate verified
- On track
- Needs attention
- Awaiting verification
- Private
- Link only
- Full
- Paused
- Funding goal reached

Do not rely on icon or color alone.

### Forms

- Labels must be visible or have a clear screen-reader label.
- Use concise helper text for consequences, requirements, and privacy.
- Errors must be next to the field and describe the correction.
- Donation, booking, report-generation, and evidence-review forms must preserve entered data after validation errors.

### Maps

- Use maps to support discovery and trust, not as the only source of information.
- Every map needs a list alternative.
- Public maps should use approximate locations when restoration-site safety or privacy matters.
- Pin detail should include location, project type, progress/status, latest update, and evidence count when available.

### Charts And Tables

- Corporate and admin charts need text summaries.
- Tables need clear columns, visible filters, status text, and row actions.
- Avoid charts without labels, units, or explanation.
- Forecasts must label assumptions and avoid overstating certainty.

### Modals, Drawers, And Sheets

- Use bottom sheets for mobile donation amount selection, date selection, and booking choices.
- Use drawers for corporate project detail inspection.
- Dialogs need keyboard focus management, escape/close behavior, and accessible titles.

## Page-Level Standards

### Homepage

Goal: establish product identity and route users into donation, expedition, Academy, impact tracking, or community.

Required:

- Cinematic ocean/conservation hero.
- Three primary journeys: Donate Now, Join an Expedition, Explore Impact.
- Live impact counters.
- Three featured campaigns.
- Featured expedition destinations.
- Interactive impact-map preview.
- How Terumbu.eco works journey.
- Impact Passport preview.
- Partner logo strip.
- Minimal footer.

Quality bar:

- First viewport must feel like a conservation engagement platform, not a generic landing page.
- Add real video only with poster/fallback and reduced-motion support.
- Partner logos should use real assets when available, with clean fallback marks.

### Campaign Listing And Detail

Goal: convert donation intent through trust and transparent impact.

Required on listing:

- Search and filters by impact type, region, partner, and status when data exists.
- Campaign cards with image, verification, progress, amount raised, donor/remaining-time context, and Donate CTA.
- One-column mobile grid.

Required on detail:

- Campaign media gallery.
- Partner/NGO verification.
- Funding progress and statistics.
- Sticky donation card on desktop.
- Mobile sticky donate CTA with bottom-sheet amount selection.
- Impact calculator.
- Story, outputs/outcomes, timeline, location, updates, evidence, financial transparency, FAQ.
- Clear states for fully funded, ended, paused, failed load, and related campaigns.

Trust language:

- Say "supported", "funded", "reported", or "verified by partner" when outcomes are indirect.
- Avoid implying a user's donation alone caused a total environmental outcome unless the data proves it.

### Expedition Detail

Goal: convert visitors into confirmed expedition participants.

Required:

- Gallery or carousel.
- Title, destination, verification, rating, quick facts.
- Price, date availability, capacity, and departure status.
- Sticky booking sidebar on desktop.
- Mobile sticky booking bar and bottom-sheet date selection.
- Impact allocation, itinerary, inclusions/exclusions, requirements, safety, cancellation, team, reviews, map/list, FAQ.

Rules:

- Never show a bookable CTA until date and price data are validated.
- Availability labels must be textual, for example "4 of 12 places remain".
- Do not expose participant names, medical information, private guide contacts, or exact sensitive restoration coordinates.

### User Dashboard

Goal: retain users by making their impact visible and actionable.

Required:

- Greeting and Ocean Hero level progress.
- Summary metrics for donation, sponsored corals, expeditions, courses/certificates.
- Latest impact update.
- Personal impact map with list fallback.
- Sponsored ecosystems/corals.
- Upcoming expedition preparation.
- Academy progress.
- Contributions table/list.
- Impact timeline.
- Impact Passport preview and visibility prompts.
- Notifications, recommendations, profile completeness, monthly report state.

Rules:

- The dashboard should not behave like a public donation page.
- Actions must be contextual: prepare for trip, continue course, view evidence, update privacy, share passport, review report.
- Privacy controls must be visible when public sharing is involved.

### Impact Passport

Goal: provide a clear, credible record of a user's conservation journey.

Core message:

```text
This is not just what I donated. This is what I helped make possible.
```

Required:

- Private dashboard view, public view, and link-only behavior.
- Identity hero with level, verification, issued/member date, share controls.
- Passport ID and QR/public link where appropriate.
- Verification status with careful limitations.
- Impact summary metrics.
- Personal impact story.
- Map/list with privacy control.
- Categories, timeline, milestones, sponsored ecosystems, field activity, certificates, badges, methodology.

Privacy defaults:

- Financial records and private documents hidden by default.
- Public location should default to region/province unless exact location is safe.
- Public visitors must not see private profile statistics when the passport is private.

### Corporate Dashboard

Goal: give corporate stakeholders a trustworthy view of funding usage, delivered activities, evidence, and ESG/CSR readiness.

Required:

- Program selector and reporting-period selector.
- Executive KPIs.
- Goal progress.
- Portfolio map/list.
- Project portfolio table.
- Health status.
- Funding/utilization overview.
- Impact metric framework.
- SDG/ESG alignment.
- Employee engagement.
- Evidence center and risk alerts.
- Report center and export/publishing entry points.
- Team/access and governance cues.

Rules:

- Use cautious language for ESG claims.
- Separate inputs, activities, outputs, outcomes, and long-term impact.
- Sensitive employee-level data must not appear in executive dashboards unless explicitly authorized.
- Export, report, approval, and evidence workflows must be auditable.

### Academy

Goal: help users learn conservation, prepare for field activity, and earn verified credentials.

Required:

- Hero with search and topic prompts.
- Course, instructor, partner, learner, track, and certificate indicators.
- Continue learning module.
- Learning tracks: Ocean Explorer, Coral Guardian, Ocean Hero.
- Course catalog with filters.
- Expedition preparation panel when relevant.
- Live sessions/webinars when available.
- Certificate preview/vault.
- Instructor cards.
- Learning-to-action journey.

Rules:

- Academy should feel lighter and more educational than corporate surfaces.
- Use purple only for certificate/credential accents.
- Course progress needs text, percentage, completed modules, and accessible labels.
- Do not use timers unless educationally necessary.

### Partner Portal

Goal: let partners maintain campaign updates and evidence with minimal friction.

Required:

- Campaign list with status.
- Recent updates.
- Evidence submission form.
- Saved/error states.
- Clear distinction between submitted, under review, verified, rejected, and needs clarification.

Rules:

- Partner actions should never expose admin-only moderation controls.
- Evidence submission should explain what will become public.

### Admin

Goal: support platform operations, moderation, reconciliation, audit, and data quality.

Required:

- Dense tables and filters.
- Clear operational states.
- Evidence review queue.
- Donation/payment reconciliation.
- Campaign, partner, user, report, and audit management.
- Confirmation for destructive or irreversible actions.

Rules:

- Prioritize scanability and correctness over marketing visuals.
- Every moderation or reconciliation action should leave an audit trail.

## State Standards

### Loading

Use skeletons for the specific content being loaded instead of full blank screens.

Load critical identity and decision data first:

- Campaign: core details, stats, donation widget, updates, map.
- Expedition: core details, price/availability, booking card, itinerary, reviews.
- Passport: identity, verification, metrics, timeline, map/media, documents.
- Corporate: company/program identity, KPIs, alerts, financial/project status, map/employee data, evidence/reports.
- Academy: user progress, active course, required prep, tracks, catalog, secondary content.

### Empty States

Empty states must include:

- What is missing.
- Why it matters.
- One to three next actions.

Examples:

- New passport: Explore Campaigns, Start a Free Course, Find an Expedition.
- No departures: Join Waitlist, Request Private Trip, View Similar Expeditions.
- New corporate account: Create Program, Browse Verified Projects, Contact Partnership Team.
- No evidence: Explain whether evidence is not submitted or awaiting verification.

### Error And Partial Failure

- Keep verified/core records visible when secondary services fail.
- Explain what failed and what still remains reliable.
- Provide retry or resolution action.
- Do not mark records invalid because a verification service failed to load.
- Failed payment, report generation, evidence review, and data sync errors need specific copy.

### Success

Success states should confirm the completed action and show the next useful destination:

- Donation paid: view dashboard, receipt, related evidence/campaign update.
- Expedition booked: view booking, preparation guide, calendar/email confirmation.
- Course completed: certificate status, passport milestone, next course/field action.
- Evidence verified: public campaign visibility, audit state, next review item.

## Accessibility Standards

Minimum standard: WCAG AA.

Required across all surfaces:

- Visible focus states.
- Keyboard-accessible navigation, tabs, accordions, filters, cards, dialogs, booking/donation controls, tables, and charts.
- 44 x 44 px minimum touch targets on mobile.
- Screen-reader labels for progress bars, icon buttons, maps, QR codes, charts, and status badges.
- Alt text for meaningful campaign, expedition, evidence, course, and profile images.
- Captions/transcripts for video/audio.
- Reduced-motion support for counters, videos, carousels, charts, and map animations.
- Text/list alternatives for maps and charts.
- Error messages linked to fields.
- Proper heading hierarchy.

Example accessible labels:

```text
Campaign is 72 percent funded, with Rp250 million raised toward a Rp350 million goal.
12 October 2026 departure: four of twelve places remain.
Coral Restoration Fundamentals is 68 percent complete. Four of six modules completed.
Verified budget utilization increased from 54 percent in March to 67 percent in June 2026.
```

## Privacy, Trust, And Governance

- Public pages must never expose private dashboard data, admin controls, personal documents, medical information, participant names, private emergency procedures, or exact sensitive restoration coordinates.
- Impact Passport public visibility must respect per-category privacy as product support expands.
- Corporate data requires role-based access, approval workflows, export logging, audit trails, retention rules, and clear permission boundaries.
- Verification language must be precise. If data is partner-reported, say so. If it is Terumbu-verified, say what Terumbu verified.
- ESG and SDG claims must identify whether they are inputs, activities, outputs, outcomes, or long-term impact.
- Public trust elements should include partner identity, evidence count, latest update, methodology, and limitations.

## Content And Copy Standards

Use direct, concrete copy.

Preferred:

- "Fund verified reef restoration"
- "Sponsor 5 coral fragments"
- "45 coral fragments financially supported"
- "Evidence submitted, awaiting verification"
- "Public locations are approximate to protect restoration sites"

Avoid:

- Vague claims like "save the ocean" without mechanism.
- Overstated causality like "your donation restored the reef" unless verified at that granularity.
- Multiple competing CTAs in the same decision area.
- Decorative copy that explains the UI instead of helping the user decide.

Currency and locale:

- Use Indonesian Rupiah formatting for money, for example `Rp3.2M`, `Rp250,000`, or `Rp12.5B` depending on density.
- Dates should be clear and unambiguous, especially for departures, reporting periods, certificate issue dates, and evidence timestamps.

## Implementation Guardrails

- Prefer shared components before creating new one-off UI patterns.
- Use `Button` and `ButtonLink` for action consistency.
- Use `SectionHeading` for public marketing section titles.
- Use lucide icons where an icon is needed and already fits the concept.
- Prefer semantic HTML and accessible native controls before custom interaction code.
- Use theme tokens from `tailwind.config.ts`; avoid raw hex values except for one-off external brand assets or temporary migration cases.
- Add list alternatives for every map-like experience.
- Add text summaries for every chart-like experience.
- Use route-level loading/error files plus component-level empty/partial states for data-heavy dashboards.
- Keep page-specific styles close to the page only when they cannot be represented by shared components.

## Pre-Ship UI/UX Checklist

Use this checklist before merging a page or major component.

- The page has one clear primary user goal.
- The first screen answers why the user should care and what they should do next.
- Trust evidence is visible before high-commitment actions.
- Primary, secondary, and tertiary actions are visually distinct.
- Theme colors follow the token roles above.
- Status does not rely on color alone.
- Cards, spacing, shadows, and border radii match neighboring surfaces.
- Desktop, tablet, and mobile layouts have been reviewed.
- Sticky CTAs do not cover content or duplicate another visible primary action.
- Text fits in buttons, cards, tabs, badges, and table cells at mobile width.
- Images are meaningful, correctly cropped, and not repeated without reason.
- Loading, empty, error, success, disabled, paused, full, and private states are handled.
- Maps have list alternatives.
- Charts have text summaries.
- Forms have labels, helper text, validation copy, and recovery behavior.
- Keyboard navigation and focus states work.
- Touch targets are at least 44 x 44 px on mobile.
- Public pages do not expose private data.
- Verification, ESG, and impact claims are precise and defensible.
- The page supports the end-to-end role flow defined in `references/8. end-to-end-test-case.md`.
