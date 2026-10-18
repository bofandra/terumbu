# Display FX estimates: fail closed without provenance

**Authoritative price** is the expedition's stored price and currency. No conversion changes booking or settlement amounts.

Optional cross-currency estimates require `NEXT_PUBLIC_FX_SOURCE`, `NEXT_PUBLIC_FX_AS_OF=YYYY-MM-DD` and all three positive rates `NEXT_PUBLIC_FX_USD_EUR`, `NEXT_PUBLIC_FX_USD_IDR`, `NEXT_PUBLIC_FX_USD_JPY`, quoted as units of each currency per USD. Every displayed estimate includes the quote date. The quote must be no more than seven days old; missing, invalid, future, or stale quotes suppress conversion rather than substituting hardcoded rates.

Budget filtering returns no match for a cross-currency amount that cannot be converted reliably. The marketplace filter explicitly warns the traveler when the FX snapshot is unavailable. Same-currency prices continue to filter without a rate snapshot.

The snapshot is build-time configuration for the browser and requires a trusted source and a rebuild when refreshed. **Not yet automated**: obtaining, validating and publishing updated quotes; this should be added as a separate operational feed before marketing the conversion as a current live FX service.

Production payment remains disabled; no database or payment changes.

## Scheduled reviewed reference update

`.github/workflows/refresh-fx-reference.yml` requests official-source-blended reference quotes from <https://frankfurter.dev/> every weekday (and on manual dispatch). `scripts/refresh-fx-rates.mjs` validates that USD→EUR, IDR and JPY quotes all exist, use one date, are less than seven days old and fall inside broad defensive bounds. Invalid API responses fail the workflow without changing repository data. The workflow proposes a PR to update `src/data/fx-rates.json`, rather than writing directly to `main` or deploying.

The app uses the reviewed JSON snapshot if **no** `NEXT_PUBLIC_FX_*` overrides are supplied. An explicitly configured environment snapshot takes precedence, and a partial/invalid override fails closed instead of falling back silently. The JSON initially carries blank provenance and zero rates, so it cannot produce fake prices before its first accepted update. The observation date is displayed with each alternative quote.

**Operational dependency:** to reflect an accepted FX PR on `terumbu.world`, merge it after review and deploy a separately approved production release. The JSON asset is bundled in Next.js; the refresh workflow does not cause a production deployment and cannot guarantee daily updates to a running build. The seven-day runtime expiry prevents outdated quotes from continuing indefinitely. GitHub Actions must permit PR creation via `GITHUB_TOKEN`; if repository policy blocks PR creation, the workflow reports an error and remains manual.
