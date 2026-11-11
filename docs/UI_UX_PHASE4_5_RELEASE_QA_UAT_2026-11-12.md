# Terumbu — Phase 4/5 Release QA and UAT Evidence

**Date:** 12 November 2026  
**Target:** PR #167, `feat/uiux-phase4-5-p0-inquiry-provenance-20261111`  
**Environment:** Ephemeral PostgreSQL + Playwright CI; production must not be used for synthetic data or unapproved test images.  
**Release decision:** **HOLD** until the gates below have evidence and a named operator sign-off. Passing CI does not establish human copyright consent or accessibility compliance.

## A. Automated QA (CI reproducible)

| Area | Acceptance | Automation / evidence |
|---|---|---|
| Public routes | `/en`, `/id`, Expeditions and Impact Map return 200 with an `h1`, main landmark and correct language | `tests/e2e/uiux-release-visual.spec.ts` |
| Responsive widths | No document-level horizontal overflow at 390, 768, 1280, 1440 px for the six public routes | Same test, HTML checks |
| Visual evidence | Full page screenshots, stable reduced-motion, EN/ID and all four widths | Action artifact `uiux-responsive-evidence`, retained 14 days; inspect manually before release |
| Keyboard | Skip-to-content link is first keyboard focus target and leads to main | Same test |
| SEO | Crawlable EN/ID URLs, correct canonical/hreflang | `tests/e2e/localized-public-seo.spec.ts` |
| Inquiry | Valid future date, real party count, explicit contact consent, published trip, sold-out waitlist does not create booking | Node + `tests/e2e/traveler-core.spec.ts` |
| Partner actions | Anonymous guest uses email follow-up; in-app departure offer only for registered traveler | `tests/expedition-partner-guest-actions.test.ts` and existing journey authorization tests |
| Media trust | New upload needs credit, rights basis, reference; prior batches remain reviewable; admin publication checkbox is enforced | `tests/partner-expedition-media-rights.test.ts` + server action |

The uploaded screenshots are **QA artifacts**, not verified product images or user-research evidence. Avoid using them to support conservation claims.

## B. Manual visual/accessible review — incomplete

A reviewer must open GitHub Actions' `uiux-responsive-evidence` artifact and compare screenshots against reference packages, focusing on content hierarchy, cropped hero/gallery, single primary CTA, filter usability, legible controls, form validation and consistent footer/header. Record failures as issues/PR commits. Then conduct:

- [ ] 390 px small smartphone: menu, landing search, result cards, detail waitlist, long titles, consent checkbox, focus.
- [ ] 768 px tablet: no clipped form controls, gallery, carousel or map cards.
- [ ] 1280 px desktop: columns, hero balance, sticky booking card and partner/admin layout.
- [ ] 1440 px large desktop: max-width and whitespace consistency.
- [ ] Manual keyboard-only walkthrough across header/mobile menu, filters, inquiry and review forms.
- [ ] NVDA/VoiceOver/TalkBack with real devices; reduced-motion and zoom at 200%.
- [ ] Content author checks real EN/ID copy, practical risk guidance and support emails.

## C. Partner/admin UAT — incomplete

Use a **sandbox partner organization** with actual permitted imagery or the product owner's explicit test-only assets; never insert example images or claims into live public records.

- [ ] Partner saves draft and uploads image with truthful source credit, rights basis and supporting reference.
- [ ] Partner uploads a **second** image: earlier provenance remains available in admin review.
- [ ] Partner submits to review; readiness refuses missing safety/logistics/valid departure details.
- [ ] Admin (not unrelated partner) can inspect media, permission history, photo captions and reviewer checklist; verify actual releases, attribution, image subjects' consent and location safety.
- [ ] Admin without checkbox cannot publish, even via forged POST. Admin with valid evidence approves a sandbox expedition; public page matches record and numbers.
- [ ] Admin requests changes; partner revises; audit and publication transitions remain correct.
- [ ] Anonymous traveler sends inquiry with valid contact consent and 3-person party size, receives no booking/payment confirmation; host replies by email **manually** and records contact status. For signed-in traveler, verify private conversation/offer path and authorized user scope.
- [ ] Verify privacy policy covers contact purpose, retention and sharing with host; test email deliverability and abuse-rate limit with authorized test addresses.

Record reviewer, date, environment, record IDs (no personal secrets), outcome and screenshots securely in the release ticket.

## D. Production deployment gate

Do **not** merge PR #167 until Verify + E2E are green **and** B/C are independently signed off. Merging main automatically triggers VPS deployment; do not override the release safety gate. After approved merge, verify deployment GitHub Actions, production smoke for `https://terumbu.world/en`, `/id`, `/en/expeditions`, `/en/impact-map`, canonical/hreflang, guest inquiry without writing test data, and operational rollback readiness. Confirm payment provider production settings are unchanged. Document release SHA, deploy run ID and smoke status.

### Sign-off (explicit, not prefilled)

| Role | Name | Date | Evidence | Decision |
|---|---|---|---|---|
| Engineering QA | Pending | Pending | CI + screenshot manual review | HOLD |
| Partner/operator | Pending | Pending | Realistic inquiry + publishing UAT | HOLD |
| Content/privacy reviewer | Pending | Pending | Licensed imagery and contact text | HOLD |
| Release owner | Pending | Pending | Merge/deploy approval | HOLD |
