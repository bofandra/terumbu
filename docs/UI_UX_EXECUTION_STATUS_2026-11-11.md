# Terumbu UI/UX Master Plan — Execution Log (11 November 2026)

Source: [Master plan](UI_UX_MASTERPLAN_2026-11-11.md) · References: [ZIP reference library](../references/uiux/2026-11-11/README.md).

## Operating constraints
- Production source of truth remains the Terumbu PostgreSQL/Drizzle application, not static ZIP content.
- Canonical domain remains `https://terumbu.world`.
- Only publish admin/partner-approved records and derived data; no invented availability, prices, imagery, ratings, impact or bookings.
- Payment activation, monetary promises, and provider live checkout remain separately gated.

## Delivered in phase 1 (this PR)
| Master-plan gate | Change | Verification |
| --- | --- | --- |
| P0 — honest impact evidence status | Pending count includes only `submitted` and `in_review`, not `rejected`; do not expose unreviewed latest-survey metadata | Unit source assertion added; CI pending |
| P0 — sensitive site protection | Public map queries generalize latitude and longitude to a coarse 0.1-degree grid; exact values remain in the protected database | Unit tests cover rounding; CI pending |
| P0 — expedition inquiry path | Final catalog CTA navigates to real trip results instead of unrelated campaigns; users can choose a published trip and ask the host on its existing detail form | Manual E2E pending |
| P1 — evidence-first impact explorer | Region selector from actual sites, ecosystem/status filters, live result count, list-first fallback and keyboard map jump; no unsupported percentage progress bars | Browser/accessibility check pending |
| P1 — multilingual marketplace | Sidebar filter inputs, active chips and sort menus expose English/Indonesian copy, with a destination dropdown from published facets | Desktop/mobile visual QA pending |
| P1 — shortest duration sort | Real card duration is used for `duration_asc` ordering instead of static demo labels | Unit test added; CI pending |
| P1 — accessible navigation | Public skip-to-content and focus outlines; prefers-reduced-motion support | Manual keyboard/screen-reader test pending |

## Work intentionally not marked complete
- **P0 international SEO:** dedicated crawlable `/en/` and `/id/` page families, reciprocal hreflang, correct localized canonical and sitemap; current cookie-driven locale does not satisfy this.
- **P0 complete traveler funnel:** E2E search with dates and party size → exact published expedition → traveler inquiry → partner response; test genuine no-departure/sold-out outcomes.
- **P0 publication controls:** audit all imagery licensing, review provenance, data claims, admin/partner preview and moderation; confirm no unreviewed public metadata outside the pages touched here.
- **P1 admin forms:** structured destination/effort/itinerary/media rights, intelligent defaults, validation, review preview, audit and safer publish workflow.
- **P1 full visual validation:** compare reference vs production at 390/768/1280/1440 pixels with screenshots and WCAG 2.2 AA manual checks.
- **P2:** destination editorial SEO hub and multi-host group inquiry.
- **Excluded:** payment activation without separate SOP/UAT/security approvals.

## Release gate
1. `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` must pass.
2. Run keyboard and screen-reader tests for the list-first map, filter chips, skip-link and mobile navigation.
3. Verify real DB-backed published vs draft/rejected data, private coordinate redaction, and destinations/departure/capacity semantics.
4. Capture screenshots at 390/768/1280/1440, inspect overflow and contrast.
5. Only merge after CI and critical-path checks pass. Merge to `main` triggers the established production deployment pipeline; confirm successful production checks independently.

**Status:** Phase-1 implementation committed on feature branch; tests and deployment not yet certified in this log.
