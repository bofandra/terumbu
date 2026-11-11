# Terumbu UI/UX — Phase 2 SEO and international traveler routing

**Date:** 11 November 2026
**Depends on:** phase 1 merged on `main` as PR #164 (commit `260d6e83`).
**Scope of this branch:** bilingual crawlable entry points, canonical/hreflang/sitemap, public links and brand-domain consistency.

## Implemented (CI and production confirmation still required)
- Public SEO aliases: `/en`, `/id`, `/en/expeditions`, `/id/expeditions`, locale-prefixed published trip detail URLs and `/en/impact-map` / `/id/impact-map`.
- Existing public route handlers are internally rewritten rather than moved. Non-public protected/admin/auth/checkout/API routes are not rewritten.
- URL locale takes precedence over preference cookies for these indexable routes; the language selector navigates to the corresponding locale URL and retains the selected display currency.
- Per-page canonical, reciprocal `hreflang=en,id,x-default`, localized Open Graph URLs, and dual-locale sitemap entries for core pages and published expeditions.
- Expedition search, filters, sort, result cards, detail breadcrumb, hero featured rail, header/footer and Impact Map navigation retain the language prefix; search and departure context survive.
- Public footer now uses **Terumbu.world** rather than an obsolete historical **Terumbu.eco** label.
- Unit tests added for URL mapping, query retention, internal rewrites, and non-public route isolation.

## Outstanding before marking the SEO milestone complete
- Verify actual production-rendered `200` responses, `<html lang>`, canonical and alternate meta tags using real `terumbu.world` requests or Google URL Inspection.
- Validate Search Console indexing, sitemap publication, no duplicate crawl clusters, image licenses/credits and translated editorial content.
- The underlying expedition title, summary, itinerary and other partner-owned record fields are currently from a single authoritative record. **No automatic translations are invented.** Admin review and localized content model are future work before claiming fully translated detail pages.
- Legacy unprefixed paths stay functional for external backlinks and compatibility, but the sitemap now prioritizes language URLs. Evaluate redirect migration only after real traffic and Search Console verification.
- Confirm accessibility and mobile visual QA at 390/768/1280/1440; test guest search → published detail → request form → host inbox and consent.
- Implement structured partner/admin publication workflow separately. Do not activate payment.

## Rollout gate
- PR checks: typecheck, lint, unit tests, production build and critical-path E2E.
- Link traversal checks from `/en` and `/id`: search form, results filters, sort, detail and evidence map.
- No merge until CI passes. Main push triggers configured deployment pipeline; confirmation of production delivery is a separate step.
