# Traveler journeys

## Discovery

The homepage and expedition catalog accept a travel window and party size (1–12).
The catalog also accepts a maximum price per person and budget currency.
One future, open departure must satisfy the entire date window and have enough
capacity for the whole party after confirmed seats and active checkout holds.
Budget conversion follows the existing approximate display rates; payment remains
in the expedition's listed currency. Search links preserve the matched departure
and party size through trip details into checkout.

## Host conversations and offers

Signed-in travelers find their questions and requests under Dashboard → Expeditions.
Hosts open a conversation from the Requests tab of their expedition workspace.
Both parties can send messages; hosts can offer an available departure. The
traveler accepts the proposal and continues to checkout. A proposal does not
reserve inventory. Checkout validates ownership, accepted departure and party
size again, then atomically links the new booking to the request.

Requests submitted without an account retain the existing email-contact workflow;
their email address alone never grants access to private conversations.
Only the request owner, the expedition's active owner/manager, and platform admins
can read a conversation. Messages and offers produce in-app notifications.

## Preparation

Dashboard → Expeditions → Prepare & manage booking opens a private booking workspace.
The lead traveler provides an emergency contact for each participant and records
acknowledgement of participation requirements and review of the equipment list.
The host confirms the briefing after it has taken place. These acknowledgements
are preparation records, not a generated legal waiver or proof of attendance at
the expedition. Preparation is available for paid, confirmed bookings before departure.

## Booking changes

A traveler can request another departure of the same expedition, change party
size, or replace participant names. One pending change is allowed per booking.
The current booking stays valid until approval. Party-size changes use the
historical unit price; travelers explicitly accept non-zero price differences.
Only platform admins can record verified external payment/refund adjustments,
with a reconciliation reference and a separate payment-operation audit record.
This action records verification and does not initiate gateway charges/refunds.
Hosts approve only after any adjustment has been verified, or decline with a reason.
Travelers can cancel a request before a financial adjustment has been recorded.
If capacity disappears after an external adjustment, a platform admin can record
its verified reversal with a new reconciliation reference; the original financial
entry is retained, and cancellation or rejection becomes available again.

Approval locks the booking, change request and both departure rows. It rechecks
capacity including active holds, moves confirmed seats atomically and records
the decision. Duplicate approval cannot allocate seats twice. Existing contact
details are retained for unchanged participants. Updated trips require renewed
preparation; the host briefing must be confirmed again.

## Database and validation

Apply migration `0048_expedition_traveler_journeys` through the normal migration
process before deploying this application revision. It adds conversation messages,
departure proposals and booking-change records with foreign keys, indexes and a
unique pending-change constraint. No production payment switches are changed.

`npm test` covers parsing, date/capacity matching, budgets and historical pricing.
`tests/e2e/traveler-core.spec.ts` exercises PostgreSQL authorization, conversations,
preparation, finance gates, simultaneous reschedules, active holds, mobile forms,
catalog matching and the host-offer-to-checkout journey using isolated fixtures.
After building, `PLAYWRIGHT_USE_PRODUCTION=true npm run test:e2e` runs the same
browser suite against `next start` instead of the development server. Use a
separate migrated/seeded test database and disabled external delivery credentials.
