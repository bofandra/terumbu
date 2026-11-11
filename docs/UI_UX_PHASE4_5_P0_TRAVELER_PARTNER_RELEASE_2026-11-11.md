# Terumbu UI/UX Master Plan — Phase 4/5 P0 traveler + partner execution

Date: 11 November 2026  
Source: [Master Plan](UI_UX_MASTERPLAN_2026-11-11.md)  
Public domain: https://terumbu.world  
Status: **PR-level implementation; not a production sign-off**

## Baseline audit (do not duplicate)
- Public catalog already uses real published expedition/departure searches, party size, date and budget filters.
- Private traveler/host messaging, departure proposals, dashboard notifications, and booking-change/preparation workflows already exist.
- Partner-managed expedition draft, content, itinerary, departure and publication readiness screens already exist. Admin alone can approve review-state expeditions.
- Phase 1/2 SEO, safe map pins and translated route aliases were already merged on main (PRs #164–#166).
- Payments and live booking/payment approval are a separate gated stream.

## Delivered in this branch
### P0 traveler inquiry truth
- Public inquiry requires a **published** expedition and explicit consent to a contact follow-up.
- Party count is a real integer 1–12; it is never silently coerced into one traveler.
- Full / waitlist / open future departures may receive **interest** requests, not reserved seats. Cancelled, past and private-only departures cannot be signed up to a public waitlist.
- Linked question requests may ask about historical departures but cannot imply booking availability.
- Invalid future private-request date is rejected.
- Detail-page waitlist fields inherit the requested party size. URL query retains valid departure and participant context after inquiry/errors; messages explain stale departure states.
- Anonymous inquiry stays a request, not a booking or checkout session; no payment feature flag changes.

### P0 partner publication + media integrity
- For **new** expedition hero/gallery/preparation uploads, partners supply source credit, rights basis, evidence reference and explicit declaration.
- A structured private batch provenance record is stored in expedition metadata. Existing media can be edited without forcibly inventing historical rights evidence.
- Admin publication review shows hero/gallery previews, any private recorded media source and an explicit human review checkbox; server independently validates that checkbox before publish.
- Admin and partner ownership/approval boundaries are unchanged. This attestation is a review action, **not independent copyright proof**.
- Legacy rights data remains unknown, not implicitly verified.

## Regression verification
- Node tests: `tests/expedition-inquiry-guard.test.ts` and `tests/partner-expedition-media-rights.test.ts`.
- Playwright journey: `tests/e2e/traveler-core.spec.ts` tests a three-person full departure waitlist with contact consent and verifies **no booking** is created.
- Required CI: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` on PostgreSQL migrations/seed.
- Production release gates: PR CI green, manual responsive 390/768/1280/1440 visual checks, keyboard/reader checks, partner reviewer UAT, source-rights validation on real licensed images, real-data inquiry → partner inbox → email response, and verified production smoke.
- Verify all URLs, redirects and opt-in language in EN/ID. Do not include PII in screenshots, logs or public claims.

## Explicit remaining gaps (not declared done)
1. Full traveler search → exact departure → host reply E2E with real production-approved records; no-departure and out-of-capacity inventory, and mobile QA.
2. Full media license/revocation/consent attachments **per image**, not only per upload batch, and provenance coverage for all legacy campaign/community images.
3. Draft preview matching public exact layout, localized partner-owned descriptions/itineraries and reviewer change history across all content types.
4. Provenance-linked conservation claims and operator reviews; WCAG 2.2 AA/manual screen readers and international SEO Search Console confirmation.
5. Group inquiry intake and editorial SEO (P2). Payment is out of scope and remains gated.

## Release safety
Do not merge if CI, E2E, copyright/consent review or operator readiness are unverified.
Merging to main triggers the existing deploy workflow; no independent claim of production deployment may be made without a successful production run/smoke. Do not enable payment flags or modify payment provider configuration.
