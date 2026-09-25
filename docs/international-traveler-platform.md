# International Traveler Platform — implementation guardrails

## Product goal
Terumbu is a traveler-first sustainable tourism marketplace for Indonesia. Conservation evidence is the differentiator; donations, Academy, corporate reporting, and payment-provider integration are secondary journeys.

## Public-data rule
A guest-facing fact MUST originate from an admin/partner-managed record or a deterministic calculation from managed records. Never add destination facts, logistics, badges, impact claims, inclusions, availability, prices, reviews, verification, or traveler requirements only in JSX/constants as public content.

If an optional field is empty, hide that public section/row. Do not invent fallback facts. Generic UI copy may be static; factual listing/destination content may not.

## Admin input principles
1. Store source facts once; derive presentation values.
2. Calculate values when deterministic: remaining seats = capacity - confirmed seats; trip duration from start/end when available; conservation contribution amount = base price × contribution percentage; review aggregates from reviews; availability from departures/bookings.
3. Use select/radio/checklist for bounded vocabularies. Free text is reserved for narrative copy, addresses, instructions, FAQ answers, and exceptional "Other" values.
4. Reuse managed entities: destination, partner, impact site, campaign, airport/arrival hub, accommodation, activity type, language, amenity, requirement, sustainability practice. Do not ask operators to retype canonical names.
5. Progressive disclosure: Basics → Experience → Itinerary/logistics → Safety/requirements → Impact → Availability → Preview/publish.
6. Repeatable structured builders for itinerary, route steps, team, gallery, inclusions, requirements and FAQ. Support duplicate/reorder where useful.
7. Draft completeness should show missing publish requirements and deep-link to the relevant section.
8. Preview must use the same public rendering rules as the guest page.
9. Preserve provenance for verification/impact claims and moderation state for partner-supplied evidence.
10. Payment-provider fields stay out of scope until the payment phase.

## Competitor patterns adopted
- Airbnb Experiences: a listing should quickly answer interest, differentiation, exact activity, logistics and cost; use sequenced itinerary and clear host expertise.
- Airbnb host tools: listing editor + calendar/availability as separate but connected workflows; required-action states before publishing.
- Worldpackers: structured discovery filters for destination, program type, availability, trip length, accommodation, meals and traveler fit.
- Responsible Travel: destination-led discovery with responsible-travel context around the trip rather than sustainability as an isolated report.

## Implementation sequence
### P0 — traveler acquisition and conversion
- Traveler-first homepage search and expedition-first hierarchy.
- Marketplace filters based only on structured expedition/departure data.
- Expedition international-readiness block; hide absent fields.
- Booking confirmation/voucher/pre-trip center using booking/departure data; payment remains pending/manual.
- Publish-readiness validation for required international traveler fields.

### P1 — destination CMS
Replace hard-coded public destination profiles with managed destination records. Admin fields: name, slug, province/island grouping, summary, hero media, conservation focus taxonomy, arrival hubs, best-month ranges, travel notes, responsible-travel notes, status. Derived: expedition count, impact-site count, starting price, next available departure. Guest pages only show published destination records.

### P1 — trip planning
Saved expeditions become "My Indonesia Trip": itinerary items reference expedition/departure/destination records. Dates and durations are derived where possible. Allow private notes without turning canonical facts into free text.

### P1 — trust
Verification checklist and evidence provenance. Public verification badges only render from approved verification records; never from descriptive text.

### P2 — retention
Post-trip verified impact → passport → media/review → share/referral. Aggregates are calculated from source records.

### Deferred
Real payment gateway/provider integration and settlement.
