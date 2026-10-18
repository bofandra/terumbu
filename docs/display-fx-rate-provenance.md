# Display FX estimates: fail closed without provenance

**Authoritative price** is the expedition's stored price and currency. No conversion changes booking or settlement amounts.

Optional cross-currency estimates require `NEXT_PUBLIC_FX_SOURCE`, `NEXT_PUBLIC_FX_AS_OF=YYYY-MM-DD` and all three positive rates `NEXT_PUBLIC_FX_USD_EUR`, `NEXT_PUBLIC_FX_USD_IDR`, `NEXT_PUBLIC_FX_USD_JPY`, quoted as units of each currency per USD. Every displayed estimate includes the quote date. The quote must be no more than seven days old; missing, invalid, future, or stale quotes suppress conversion rather than substituting hardcoded rates.

Budget filtering returns no match for a cross-currency amount that cannot be converted reliably. The marketplace filter explicitly warns the traveler when the FX snapshot is unavailable. Same-currency prices continue to filter without a rate snapshot.

The snapshot is build-time configuration for the browser and requires a trusted source and a rebuild when refreshed. **Not yet automated**: obtaining, validating and publishing updated quotes; this should be added as a separate operational feed before marketing the conversion as a current live FX service.

Production payment remains disabled; no database or payment changes.
