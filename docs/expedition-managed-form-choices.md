# Admin/partner managed expedition choices

- Guide languages are now checkboxes for common values, with a free-entry option for uncommon languages.
- Existing saved languages are rendered as preselected options even when they are not among the common values. The server continues to parse repeated `languages` fields.
- The nearest airport/arrival hub input suggests entries from the expedition's current **published** destination as managed by the admin. Those entries are not fabricated from a destination name or inferred from an expedition title. Other verified arrivals can still be entered.
- Changing the destination requires saving before the new destination's hub suggestions appear. Existing saved arrival content is never silently overwritten.
- This is an incremental reduction in free-text entry; itinerary, safety, and policy fields remain intentionally authored by a human operator, and a blank verified arrival remains blank.

Payments and production configuration are unchanged.
