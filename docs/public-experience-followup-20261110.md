# Terumbu public experience — follow-up implementation (10 November 2026)

## Purpose
Complete the unfinished items from PR #162 while preserving Terumbu's existing live marketplace, partner approval workflow, payment gating and evidence integrity.

## Data entry and audit
- Partner Impact Site records now derive evidence counts from linked `project_evidence` records, scoped to the appropriate campaign and site.
- The Partner UI no longer asks for a redundant manual evidence count; the backend ignores the old manual parameter and uses zero only for legacy metadata compatibility on newly created sites.
- The original internal coordinates remain available to authorized partner/admin views. Partner operators can type them or click the optional map picker.
- The structured milestone `progress` is not calculable from arbitrary evidence counts; it remains an operator-provided measurement until reliable milestone definitions exist.
- The last-survey date is still a legacy optional field, because unverified activity records must not be interpreted as verified surveys automatically.

## Public location privacy
- `publicLocationPrecision` is stored in Impact Site metadata as `approximate` or `precise`.
- All existing sites without explicit metadata default to **approximate**, rounded to one decimal degree (around 10 km granularity).
- Only an explicit `precise` selection by an authorized partner exposes exact coordinates; public data loaders apply the privacy transform on the server.
- These display values are not intended for navigating to protected restoration locations.

## Presentation & international SEO
- A shared public shell unifies public typography, navigation and footer branding around Terumbu.world, ocean blue and lime accent, without changing admin styles.
- Homepage, Impact Map, catalogue and detail gallery use the same public design language. Gallery supports Escape to close and focuses the close control while open.
- Language aliases are available at `/en`, `/id`, `/en/expeditions`, `/id/expeditions`, `/en/impact-map`, `/id/impact-map`, and each published expedition detail path.
- The localized route aliases set the rendering locale in the request, while all authenticated and transaction endpoints retain their original unprefixed paths.
- Canonical metadata, `hreflang` alternates and sitemap entries advertise the localized public routes.
- Unprefixed old links remain backwards compatible.

## QA
GitHub Actions runs `npm ci`, TypeScript, lint, unit tests, build and critical Playwright journeys. The new responsive E2E suite checks language, canonical/alternate link coherence, no horizontal overflow at a 390px viewport, plus captures visual screenshots in the CI artifacts for follow-up human review.

## Deliberately unchanged
- No payment activation.
- No invented public expedition, partner claims, imagery, prices, field evidence or impact statistics.
- No fake supporting contact address; configured `SUPPORT_EMAIL` stays authoritative.
- Audit/operator verification level remains an admin-governance control.
