# Public domain and content integrity (Terumbu)

## Canonical public origin

**https://terumbu.world** is the live public domain supplied by the product owner.

- Production configuration should set `NEXT_PUBLIC_APP_URL=https://terumbu.world`.
- The production deployment and worker-monitor configuration already use `terumbu.world`.
- Default links in sitemap, robots, metadata, password recovery, certificates, public shares, and reports now fall back to `terumbu.world` rather than a different domain.
- The historical `Terumbu.eco` product name and `@terumbu.eco` mailbox identifiers have **not** been changed. Branding and mailbox/domain provisioning are separate decisions.
- CI success or an external smoke check alone does not establish current DNS/routing status. Verify public production ingress separately.

## Content rules

- Display destination, journey, pricing, evidence, safety and sustainability facts only from an admin/partner-managed record or deterministic calculation.
- Hide optional public content when no approved source record exists. The homepage hero does not use an externally hardcoded photograph when managed field updates are missing.
- Obsolete phrases `Sustainable project`, `Higher approval`, and `Higher chance of approval` have been removed from operator-selectable options and demo seed content. The public marketplace normalizer still suppresses these in legacy stored rows.
- Separate future work: require explicit reviewed provenance for SDG labels, partner verification badges and quantified environmental impact, rather than deriving such claims from descriptive keywords.

## Read-only production checks

1. Inspect `https://terumbu.world/api/health` and match its version to the approved release SHA.
2. Verify `/expeditions`, `/destinations`, `/sitemap.xml`, and `/robots.txt` on the public domain.
3. Check canonical, Open Graph and share URLs on a published expedition, destination, passport and certificate.
4. Verify TLS certificate, reverse-proxy configuration, relevant DNS records and `NEXT_PUBLIC_APP_URL` on the actual VPS before changing routing.
5. Confirm that any payment-related production feature flags remain off until separate UAT and approved release.
