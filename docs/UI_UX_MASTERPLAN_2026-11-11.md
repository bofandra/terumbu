# TERUMBU — UI/UX master plan for international sustainable travel

**Updated:** 11 November 2026  
**Product:** Terumbu, public site `https://terumbu.world`  
**Scope:** Traveler-facing Homepage, Expeditions (listing + detail), Impact Map; related host/admin content operations.  
**Status:** Implementation plan and acceptance baseline; not an assertion that every feature is already shipped.  
**Input:** Client ZIP packages dated 8–10 November 2026. The Impact Map ZIP is archived byte-for-byte; the two larger originals are archived in ordered lossless parts and also offered as smaller browseable reference kits (with resized photo assets). Original source text is retained under `references/uiux/2026-11-11/source/`.  
**System of record:** Existing Terumbu Next.js / React / Tailwind / Drizzle / PostgreSQL application under `src/`. The client ZIPs are **visual and interaction references**, **not authoritative content or data fixtures**.

## 1. Product decision and non-negotiables

**North star:** Help an overseas visitor *discover a credible, suitable Indonesian nature experience, assess practical safety and logistics, contact a local host, and see independently traceable conservation outcomes*, before asking them to transact.

- **Primary:** International independent travelers (solo, couples, small groups) searching in English for Indonesia nature, marine ecology, community-led and conservation experiences. They need genuine photography, clear dates/length/effort, predictable transport, understandable prices, and trust in local operators.
- **Secondary:** Families and first-time nature travelers; educators/citizen-science volunteers; corporate/NGO group organizers. Each may need different physical/age/safety/accessibility and inquiry information.
- **Supply-side:** Indonesian community hosts, conservation partners and admins with varying digital skills and sometimes limited connectivity; structured, low-friction entry is part of the product, not a back-office afterthought.
- Keep **`terumbu.world`** as the canonical public domain. Legacy `Terumbu.eco` wording inside supplied references is historical; do not change public canonical URLs to `.eco`.
- **No payment rollout as part of UI/UX reference adoption.** Maintain existing production payment gates. Prioritize discovery, truthful availability, preparation, and host inquiry. Never imply funds or bookings are confirmed without the backend state.
- **No fabricated/uncurated public data:** campaign, price, trip, availability, rating, review, capacity, impact count, conservation status, imagery and coordinates must originate from an approved admin/partner record or a well-defined derivation thereof. No static examples from the ZIP may become production claims.
- Preserve existing permissions, legal/operational review, consent, audit events, authentication and supported live workflows.

## 2. Reference package mapping and known handoff risks

| Reference | Pages/components | What to retain | Verify before implementation |
| --- | --- | --- | --- |
| Homepage ZIP (8 Nov) | `/`, hero, discovery/search, expedition/campaign cards, social proof, impact preview, ID/EN, currency, blue/lime style | Strong visual hierarchy, simple trip-discovery entry, conservation proposition | ZIP defaults to ID/IDR while target acquisition is international; gallery/hero permissions; static imagery/prices; translated metadata and actual route behavior |
| Expeditions ZIP (10 Nov) | `/expeditions`, `/expeditions/pulau-pramuka`, filters, overview, detail itinerary, travel prep | Browse → shortlist → detail → inquiry path, card hierarchy | Some example cards redirect to Pulau Pramuka; date filters are UI-only in the ZIP; sample prices and WhatsApp contacts are **not verified**; must bind each card to its own published record/slug/departure |
| Impact Map ZIP (10 Nov) | `/impact-map`, Leaflet explorer, list fallback, field notes, verification labels, FAQ | Evidence-first story, list+map, source links, safe map locations | Static examples (e.g. `420 kg`), source links and site statuses are illustrative; three verification *levels* differ from evidence *review status*; coordinates rounded for sensitive sites; photo usage rights |

**Existing-app baseline:** The repository's public experience was redesigned on `main` in a 10 Nov 2026 merge (`e1d67f4880aac54914f1216e12e9c3ea49278316`, PR #162). Therefore this work is a *reference and acceptance plan*, not a request to replace live routes with the standalone exported Next.js packages. Use a gap-based implementation, preserve database queries, search, availability, locale and review controls already in place.

## 3. Competitive patterns to borrow (not clone)

| Product and live reference | Observed pattern | Terumbu adaptation | Avoid |
| --- | --- | --- | --- |
| [Intrepid Travel — Indonesia trip](https://www.intrepidtravel.com/en/indonesia/best-indonesia-168352) | Trip highlights, day-by-day itinerary, physical rating, inclusions and practical pre-booking information | Expedition detail with activity difficulty, exact logistics, day schedule and exclusions | Copying large-tour positioning or promising services the local host cannot deliver |
| [Much Better Adventures — discovery](https://www.muchbetteradventures.com/explore/) | Filters for place, activity, date/duration, difficulty and travel style; highly legible adventure cards | Simple prominent search with good defaults and filter chips, solo/small-group suitability, mobile-first results | Showing filters without real data or false availability |
| [Responsible Travel — locally run holidays](https://www.responsibletravel.com/holidays/locally-run) | Locally operated context, reviews, dates, duration and trip-style discovery | Named local host and community benefit, verified traveler feedback, provenance | Blanket “community-benefiting” claims without evidence |
| [Earthwatch — expeditions](https://earthwatch.org/expeditions/browse) | Conservation participation with research lead, expedition duration, activity intensity, dates and outcomes | Clear “what you'll do in the field”, responsible participation, named project steward and measured evidence | Treating tourists as scientists or claiming measured impact absent documentation |
| [GSTC Tour Operator Standard](https://www.gstc.org/gstc-criteria/gstc-tour-operator-standard/) | Four pillars: management, community, culture, environment; documented and accurate claims | Partner review checklist and public evidence provenance; accessibility and conservation integrity | Presenting Terumbu as GSTC-certified without accreditation |

Competitor observations are **design benchmarks as checked November 2026**, not endorsements, certifications or a claim that Terumbu offers every competitor feature.

## 4. Information architecture and priority user journeys

**Public navigation (≤ 5 primary destinations):** `Explore Expeditions`, `Impact Map`, `Conservation Projects`, `Learn`, `About / How It Works`. Contextual `Contact a Local Host` / `Plan a Group Trip`. Header has accessible language/currency selectors and login/account entry. On narrow screens, one primary CTA; avoid multiple competing hero buttons.

1. **Discover:** search engine or social card → **English landing page** about authentic Indonesia + conservation → destination/activity suggestion → results.
2. **Evaluate:** results with true future departure matches, duration, physical level, group size, verified price and host → trip detail with date/meeting point, inclusions, itinerary, conservation activity, accessibility and cancellation terms → inquiry. Anonymous visitors can inquire; account only where required to keep private conversations secure.
3. **Trust:** operator identity and review provenance → real images licensed for public use → evidence-linked impact section → field status (submitted/in review/verified) with timestamps and original source; never infer “verified project” from a single verified activity.
4. **Prepare:** after an actual accepted departure/booking: equipment, age/health/accessibility constraints, emergency and local transport guidance, preparation status. **Do not simulate payment/confirmed booking.**
5. **Organize groups:** enquiry for corporate, school, NGO trips with date range, size, program goals; host/admin respond with feasible options and evidence requirements.
6. **Partner publish:** authenticated partner/admin creates *structured* expedition, departure, site and evidence → server validates → reviewer approves → published only when required records complete; public site reads the same records.

## 5. Page-by-page requirements

### 5.1 Homepage (`/`, localized English equivalent)

- Hero: authentic single photo, short plain-English promise (“Explore Indonesia, help protect its coast”), **one prominent “Find an Expedition”** action. Show geography, not general environmental jargon; use alt text and source/permission metadata.
- Compact search (destination/activity, dates/date flexibility, travelers); advanced filters on results page. Carry selections across listing → detail → inquiry, including back navigation.
- Three-to-six published expedition cards only if records exist. Dynamic states: loading, zero results, draft unavailable, date sold out, inquiry-only; no dummy cards to fill empty grids.
- Visible **why trust Terumbu**: published partner profile, supported field activities, verification process, link to real evidence. Avoid unexplained numbers, badges, generic marketing superlatives or unsubstantiated reviews.
- “How it works” in 3 steps (choose, travel responsibly, follow field evidence), supporting editorial destination stories, realistic FAQ, organic SEO landing pages, contact help.
- No pop-up newsletter on first interaction; optional opt-in with explicit consent.

### 5.2 Expedition listing (`/expeditions`)

- Card contract: image, **real destination**, title, type, length, effort/required skill, group format, next **actual** departure (or “Ask about dates”), verified per-person price (`from` only if price floor is defensible), host name, and honest availability/inquiry status.
- Filters: date window, destination, activity, effort, duration, party size, budget; only show filters which map to searchable records. Multi-select chips/dropdown instead of free text where taxonomy exists. Query URL is shareable and browser back works.
- Sorting: relevance, soonest genuine departure, price, duration. Search must apply **departure capacity** to whole requested party, not only expedition metadata.
- Compact mobile filter sheet, clear results count, `Clear filters`, skeleton loading, empty-state suggestions; accessible focus and keyboard operation.
- Separate one-off expeditions, scheduled departures, and request-only trips. Do **not** redirect unrelated cards to one detail page.

### 5.3 Expedition detail (`/expeditions/[slug]`)

- Above the fold: trip title, region/country, duration, activity level, season/dates, actual starting price + currency basis, lead host, primary `Ask about this trip` / `Check departures`, and authentic gallery with captions.
- Content: Who it's for; day-by-day itinerary; conservation activity and limitations; meeting and end point; transfers/boats; inclusions and exclusions; accommodation; meals; age/fitness/medical and mobility constraints; guide language; safety/weather contingency; responsible conduct; cancellation and refund policy; insurance/visa advice **only with dated verified content**.
- The price/capacity/date section is database-backed. Date selector must not imply booked/paid; persist inquiry context when contacted. Existing traveler preparation and booking-change workflows remain functional.
- Partner and community benefit statements link to reviewed source records rather than generic badges.

### 5.4 Impact Map (`/impact-map`)

- **List-first accessible experience**; interactive Leaflet map is progressive enhancement. Text cards remain usable when map tiles/JavaScript fail or user navigates with keyboard/screen reader.
- Show only published and approved impact-site records. Filters: location/region, ecosystem, project/activity type, evidence status; show count based on actual filtered records.
- Distinguish explicitly: **partner verification level** (`basic` / `document` / `field`) from **individual evidence review** (`submitted` / `in_review` / `verified` / `rejected`) and **project outcomes**. None can be silently substituted for another.
- Evidence card: activity date, observation period, unit/denominator, geographic scope, data owner, verification date/reviewer where publishable, source/evidence link, and limitations. Unknown => “Not yet verified”, not zero. Count evidence rows automatically; no manual duplicate tally.
- Sensitive habitats: round/generalize public pins; preserve exact coordinates only in secured admin records. Honor photography permissions and avoid publicizing endangered species/culturally sensitive locations.
- Avoid misleading cumulative impact graphs; show before/after only when methodology, comparable dates, and comparable locations exist. **No “carbon saved” without defined calculation methodology.**

## 6. Internationalization, trust and accessibility

- **P0 SEO:** Google recommends separate, crawlable URLs per language. Proposed route decision: `/en/...` and `/id/...` with reciprocal `hreflang="en"`, `"id"`, `"x-default"` and per-locale canonical; preserve old paths via intentional redirects/canonical migration. Do not treat a client-only ID/EN toggle as SEO-equivalent. English is the primary international acquisition funnel; Indonesian is equally first-class for hosts/local audiences.
- Currency selector (`IDR`, `USD`, `EUR`, `JPY`) is display convenience only. Show FX timestamp and “approximate”; use source price currency for business logic. No promised exchange rate until checkout/provider confirmation.
- Dates, time zone (`Asia/Jakarta` or actual region), group sizes, inclusions, age limits and weather conditions must be unambiguous. Explain visa, guide language and meeting point where known, and show “contact host” when not.
- WCAG **2.2 AA** target: keyboard map alternatives, skip link, focus states, logical headings, accessible form errors, 4.5:1 text contrast (except qualifying large text), ≥24 CSS px pointer targets where applicable, text resizing, reduced motion and image descriptions. Run automated + manual screen-reader checks.
- Ship optimized media (responsive `srcset`, AVIF/WebP where useful, consent/credit data). Hero image uses real work, never stock presented as participant evidence.
- Privacy by design: never disclose host private contact, traveler identity, exact sensitive map coordinates or unapproved media via anonymous pages. Protect inquiry spam and honor delete/consent requests.

## 7. Admin / partner UX: minimum fields, maximum data quality

**Principles:** One source of truth, prefer dropdown/tags/checklists to free-text for controlled lists, derive calculations on the server, context-aware defaults, simple progressive forms, review queue and audit trail.

| Entity | Admin enters (only if needed) | System derives / validates | Publication requirement |
| --- | --- | --- | --- |
| Expedition | Localized title/summary, category, destination, host, difficulty, duration, itinerary, included/excluded, policy, photos + rights, accessibility notes | Slug, card summaries, available activities, search facets | Approved host, valid route, localized content, usable photo or explicit fallback |
| Departure | Start/end/local TZ, capacity, price source currency, meeting point, status | Remaining seats from bookings/holds, next departure, date-valid filters, budget display conversion | Future real date, non-negative remaining capacity, price verified or inquiry-only |
| Campaign/site | Area, ecosystem, partner, verification level, safe public centroid, review status | Public count and aggregate only from approved linked evidence | Reviewer authorization, privacy-safe public geography |
| Field evidence | Activity and measurement dates, measured value/unit, method, source/document, rights, validator | Evidence count, applicable verified sums, latest dated record, status timeline | Evidence review completed for “verified”; no unsupported derived claims |
| Traveler inquiries | Dates, number of participants, preferences, email/contact with consent | Confirmation reference, conversation permissions, notifications | Consent and anti-spam validation |

Form best practices: 1 screen/step per mental task (overview → logistics → activities → evidence/review); persistent draft autosave; only required fields by status; address/location structured selections; multilingual content side-by-side preview; bulk upload with duplicate detection; dynamic previews of public card/detail; precise inline field errors; media rights and image alt required; reviewer comments; change history; publish/unpublish and rollback controls.

**Critical acceptance rule:** Changing/admin approving a record must visibly update all downstream consumer pages/aggregates. No “manual counter” fields when the correct value can be calculated. Avoid seeding attractive but false reference content into production.

## 8. Execution backlog and acceptance gates

| Priority | Work package | Completion gate |
| --- | --- | --- |
| **P0** | Catalog current `/`, `/expeditions`, `/expeditions/[slug]`, `/impact-map` against refs; screenshot desktop/mobile; preserve deployed behavior | Gap inventory with owner, screenshots, regression list |
| **P0** | Data-truth and placeholder audit (price, review, departure, campaign, photos, coordinates, evidence links, CTAs) | No published reference-only values or dead/misdirected CTAs; seeded records only in test environments |
| **P0** | English indexable routes, bilingual SEO, canonicals, sitemap, hreflang, translated core content | Google URL inspection and reciprocal hreflang checks; no `.eco` canonicals |
| **P0** | Expedition detail essentials, actual departure/search continuity, host contact and trip suitability | E2E: overseas guest → search dates/party → correct trip → inquiry; sold-out/invalid dates handled correctly |
| **P0** | Impact verification UI, rounded public map pins, source linking and accessible list fallback | Review-state tests; keyboard map alternative; no unsupported impact count |
| **P1** | Full visual tokens, responsive polish, content hierarchy, mobile filter UX, accessibility | Screenshots at 390/768/1280/1440; WCAG 2.2 AA checks; no horizontal scroll |
| **P1** | Partner/admin simplified structured entry + evidence-review preview | E2E draft → review → publish → public → update; computed counters match DB |
| **P1** | Trust content: published operator pages, traveler verified reviews (when real), FAQ, safety and seasonal info | Every claim links to authorized record or an explicit editorial source |
| **P2** | Destination editorial SEO hub, group experience inquiry, multilingual expansion | Search Console discovery, assisted inquiry, qualified lead tracking |
| **Later / gated** | Transactional payments, live checkout UI, payment claims | Explicit separate approved SOP/UAT/security/payment production gate; **out of scope here** |

## 9. Measurement (define baseline before targeting)

- **Acquisition:** organic non-Indonesia English impressions and qualified landing visits (Search Console, privacy-conscious analytics).
- **Discovery:** search-to-results, result-to-detail, no-results rate, filter abandonment and mobile task success.
- **Inquiry:** detail-to-host inquiry conversion, response time, qualified inquiry rate (exclude spam).
- **Trust:** share of published trips with complete operator/logistics/rights/policies; percentage of impact claims with verifiable provenance; age of last field observation.
- **Supply UX:** time-to-publish for partner, validation error count, publish rejection reasons, duplicate entry effort.
- **Experience:** Core Web Vitals LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at p75 as *targets*, not measured facts; WCAG audit pass rates.

## 10. Definition of done and verification checklist

- [ ] Pages linked from navigation and direct routes; no false placeholder journeys.
- [ ] All UI copy EN/ID, SEO metadata, `hreflang` and canonical use **terumbu.world**.
- [ ] Every visible expedition/price/date/map site/metric has a real published record or labeled empty state.
- [ ] Impact verification levels vs evidence statuses are explained independently.
- [ ] Private locations and personal data are not exposed to anonymous visitors.
- [ ] Mobile screens, keyboard-only use, screen reader, reduced motion and offline-map fallback checked.
- [ ] Admin supplies only non-derivable fields, has quick review/publish flow, and public metrics are derived once.
- [ ] Existing search, conversation, preparation, permission, audit, booking and payment gates have regression tests.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and critical Playwright tests pass before any runtime UI merge.
- [ ] Deploy is limited to approved runtime changes; **these archived references are not production assets**.

## 11. Sources and design constraints

- Intrepid Travel Indonesia trip: https://www.intrepidtravel.com/en/indonesia/best-indonesia-168352
- Much Better Adventures catalog and filters: https://www.muchbetteradventures.com/explore/
- Responsible Travel locally-run discovery: https://www.responsibletravel.com/holidays/locally-run
- Earthwatch expeditions: https://earthwatch.org/expeditions/browse
- GSTC Tour Operator Standard (2026): https://www.gstc.org/gstc-criteria/gstc-tour-operator-standard/
- W3C WCAG 2.2: https://www.w3.org/TR/wcag/
- Google multilingual URLs/hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions
- Current repo product foundations: `README.md`, `docs/traveler-journeys.md`, existing `src/` routes, PR #162.

**Governance:** Product owner approves copy, program and visual claims; local host confirms travel logistics; conservation partner supplies evidence; reviewer validates public evidence and sustainability claims; engineering maps the approved references onto the existing application—not the reverse.
