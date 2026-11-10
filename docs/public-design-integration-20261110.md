# Public experience redesign — 10 November 2026

## Sources and boundaries
Reference packages: Homepage, Expeditions, and Impact Map (client ZIPs shared by the product owner). They are **visual/interaction references only**, not publication-ready records.

The existing Terumbu Next.js / Drizzle / Postgres stack remains the system of record. No static sample expedition, verified claim, campaign percentage, price, user, map pin, or fake review count from the references is migrated.

## What changed
- Homepage editorial hero, new blue / lime visual emphasis, real linked CTAs, and clearer section separation. The existing homepage queries drive every numeric stat, verified review summary, campaign, expedition, and field update.
- Expeditions catalogue and card layout. Existing marketplace search, pagination/filter state, departure availability, pricing conversion, partner-managed detail, booking, and Academy prerequisites are preserved.
- Impact Map uses browser-only Leaflet with OpenStreetMap tiles, coordinates and evidence from `getImpactMapSites`, keyboard-accessible site list, filterable markers, verified-vs-pending evidence distinction, source links, before/after and monitoring content already present.
- Impact Map editorial framing, record-backed site and evidence metrics, and bilingual reading guide / FAQ.
- Admin Impact Sites no longer asks operators for a redundant evidenceCount input; the public count is derived from evidence rows. Progress and latest survey remain fields until milestone/survey schemas can reliably derive them.
- Existing site header/footer, locale and display currency preferences, and publication/evidence controls remain in use.

## Important constraints
- Sites without geospatial coordinates in Indonesia are omitted from the interactive map; users can still select their text record in the list. The map never substitutes invented coordinates.
- "Verified" on map pins means at least one **verified public evidence record**, **not** certification of a full site or program.
- External OpenStreetMap tile availability is not guaranteed; a server-rendered site list and evidence details remain accessible if maps fail.
- No production payment switches changed.
- Canonical domain remains `terumbu.world`.
- A source-link's content is only rendered when linked evidence exists.
- Manual `progress` and `latestSurvey` still exist for operators when approved structured milestone/survey sources do not exist; do not auto-derive them from arbitrary counts.

## Before release
Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and critical Playwright tests. Spot-check /, /expeditions, an actually published expedition detail, /impact-map, and admin Impact Sites on phone and desktop. Confirm locale (id/en), currencies, zero-record states, coordinates, published-source links, and that payments remain disabled.
