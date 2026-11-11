# Terumbu UI/UX — Phase 3: partner expedition media rights

**Date:** 11 November 2026 · Master plan section 7 (admin/partner UX).

## Added
- The create and edit expedition forms include a clear declaration of ownership/publication permission when the partner uploads or replaces expedition imagery.
- Server actions enforce the declaration only if at least one new non-empty hero, gallery, or preparation image is uploaded; ordinary draft saves and unchanged existing images remain available.
- Validation happens after partner/organization permission checks and before the upload is stored.
- The audit log records whether the partner declared rights when a new file was uploaded. An acknowledgment is an assertion, **not independent evidence of legal ownership**.
- Action errors point to an actionable message and unit tests verify the conditional rule for each supported upload field.

## Remaining media and publication requirements
- Store photographer attribution, consent releases, licenses, image alt text and revocation in structured durable records (rather than treating the checkbox as final verification).
- Add a reviewer-facing gallery preview and explicit rights-evidence checklist before public approval. Verify each source; never present stock as field evidence.
- Expand the same provenance controls to campaign, community and other public media entry points separately.
- Preserve current publication and payment gates. No live transaction settings change.

## Release acceptance
Typecheck, lint, unit tests, build and critical-path E2E must all pass before merging to main, followed by a check of the partner form on narrow screens and an audit trail review.
