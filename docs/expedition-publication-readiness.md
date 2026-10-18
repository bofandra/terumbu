# Expedition publication readiness

Partner expedition editor now shows a checklist derived from **saved records**. The same `expeditionPublicationReadiness` function gates partner submission for platform review and admin publication.

## What is required
- Destination managed and published by an admin
- Related conservation campaign public (published, funded, or completed)
- Genuine hero image supplied by the partner
- At least one departure with capacity/dates
- Guide languages, participant requirements, safety and emergency plan
- Day-by-day itinerary, accommodation, arrival guidance
- Visa/insurance/timezone guidance, packing list and cancellation terms

Status **draft** can be saved with incomplete information. `review` is blocked until the requirements are satisfied. `published` remains subject to admin approval.

The checklist currently reflects the latest saved record. It is not a live unsaved-form validator. Partner changes should be saved before requesting review. Departure counts, not manually entered booked seats, drive the operational record: new departures start at zero booked seats.

## Boundaries
- A completed checklist means required fields were populated, not that the partner's assertions have been independently verified.
- Existing claims and SDG facts still require separately reviewed evidence.
- A future improvement should replace the “one departure” rule with an upcoming bookable departure policy, coordinated with existing booking and cancellation logic.
- Booking payments and production Midtrans flags remain unchanged and disabled.
