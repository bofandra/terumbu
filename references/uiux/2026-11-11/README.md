# Terumbu UI/UX source references — 11 November 2026

This directory preserves the uploaded **Homepage**, **Expeditions**, and **Impact Map** reference packages alongside browseable Next.js source. They are design/handoff references; the production app remains under `src/`.

| Reference | Easy-download kit / archive | Browseable source | Reference routes |
| --- | --- | --- | --- |
| Homepage (8 Nov) | [`archives/terumbu-homepage-reference-kit.zip`](archives/terumbu-homepage-reference-kit.zip) | [`source/homepage/`](source/homepage/) | `/` |
| Expeditions (10 Nov) | [`archives/terumbu-expeditions-reference-kit.zip`](archives/terumbu-expeditions-reference-kit.zip) | [`source/expeditions/`](source/expeditions/) | `/expeditions`, `/expeditions/pulau-pramuka` |
| Impact Map (10 Nov) | [`archives/terumbu-impact-map-original.zip`](archives/terumbu-impact-map-original.zip) | [`source/impact-map/`](source/impact-map/) | `/impact-map` |

**Implementation plan:** [UI/UX Master Plan — 11 November 2026](../../../docs/UI_UX_MASTERPLAN_2026-11-11.md).

## Original files vs optimized reference kits

- `terumbu-impact-map-original.zip` is the **exact byte-for-byte upload**, including static export, source, photos, prototype and SEO docs.
- The original **Homepage** and **Expeditions** ZIPs are preserved **byte-for-byte as ordered 1 MiB binary chunks** in `archives/original-parts/`. GitHub’s upload connection did not accept the two large ZIPs as single objects. Reassemble with [`reassemble-originals.sh`](reassemble-originals.sh) (download this directory or clone the repo first). Do not treat individual `.partNN` files as ZIPs.
- The two **reference-kit** ZIPs are *repackaged for convenient GitHub use*: Next.js source, handoff documentation, key static HTML snapshots, and image assets compressed/resized to reduce storage. Unlike the original-part reconstruction they are **not binary-identical** to the uploads, and intentionally omit build-generated JavaScript chunks. They are for design reference, not production deployment.
- `source/` offers browseable text source/SEO documents. Open `nextjs-*/README.md` and `SEO-Handoff.md` for the handoff caveats. Some `.html` files in packages need the surrounding exported `_next` assets to render as originally built.

### Reconstructing and verifying original ZIP files

```bash
bash references/uiux/2026-11-11/reassemble-originals.sh
sha256sum references/uiux/2026-11-11/archives/reassembled/*.zip
```

Expected SHA-256 hashes:

| Original uploaded package | SHA-256 |
| --- | --- |
| `Terumbu - Homepage .zip` | `b0ccb0c920506a3ee2d63ee4c93011fccb43272d37bd3ad0ec0f5eb905eba57c` |
| `Terumbu - Expeditions.zip` | `c86c9b24d2cfc4373319dd56ec287969ceb5ea69e817ead11911aa1869639bd2` |
| `Terumbu - Impact Map.zip` | `c3e271d4b2e5a89d96321af1505b059490c255f820add0d7b8cb10a64012826d` |

## How to use

1. Compare reference layout and interaction patterns with the existing live routes before changing production code. The public UI redesign was already merged on 10 Nov 2026 (`e1d67f4880aac54914f1216e12e9c3ea49278316`, PR #162); avoid blindly replacing its working components.
2. Treat package copy, sample prices, static field counts, geographic pins, reviews, campaign links, WhatsApp destinations and sample availability as **unverified reference content**. Production content must come from approved partner/admin data; derived values must be calculated once from their source records.
3. Keep real search, inventory capacity, host conversation, permission, audit, evidence and payment release gates in the existing app. The UI/UX plan intentionally **defers payment rollout**.
4. Canonical domain is `https://terumbu.world` even where source text says `Terumbu.eco`. Plan English-indexable `/en/` pages and Indonesian equivalent with proper `hreflang`; client-only locale switch is not enough for international SEO.
5. Do not make sensitive conservation coordinates public; partner verification level, activity evidence review state and outcome metrics are separate concepts.

## Reference-to-production map

| Runtime app path (indicative) | Source inspiration | Must keep |
| --- | --- | --- |
| `src/app/(public)/page.tsx` | Blue/lime editorial hero, discovery controls, trip and impact storytelling | Real published stats, genuine assets and recorded CTA destinations |
| `src/app/(public)/expeditions/...` | Search filters, clear catalog cards, rich trip detail | Actual departures, travel window + party size, real prices, host inquiry |
| `src/app/(public)/impact-map/...` | Leaflet, text-first fallback, verification language and FAQ | Approved real sites and evidence, derived metrics, safe public location |

These references are **documentation assets**. They do not alter production routes, Next.js runtime configuration or GitHub deployment rules.
