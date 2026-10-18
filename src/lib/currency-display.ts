import type { DisplayCurrency } from "@/lib/user-preferences";

type RateSnapshot = {
  asOf: string;
  source: string;
  usdRates: Record<DisplayCurrency, number>;
};

const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Rates are never invented: a dated, sourced and complete operator-provided snapshot is required. */
export function getDisplayFxSnapshot(now = new Date()): RateSnapshot | null {
  const asOf = process.env.NEXT_PUBLIC_FX_AS_OF?.trim() ?? "";
  const source = process.env.NEXT_PUBLIC_FX_SOURCE?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !source || source.length > 160) return null;

  const observed = new Date(`${asOf}T00:00:00.000Z`);
  if (!Number.isFinite(observed.getTime()) || observed.toISOString().slice(0, 10) !== asOf) return null;
  const ageMs = now.getTime() - observed.getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_RATE_AGE_MS) return null;

  // Explicit env members are required for Next.js public-variable compilation.
  const eur = Number(process.env.NEXT_PUBLIC_FX_USD_EUR);
  const idr = Number(process.env.NEXT_PUBLIC_FX_USD_IDR);
  const jpy = Number(process.env.NEXT_PUBLIC_FX_USD_JPY);
  if (![eur, idr, jpy].every((rate) => Number.isFinite(rate) && rate > 0)) return null;

  return { asOf, source, usdRates: { USD: 1, EUR: eur, IDR: idr, JPY: jpy } };
}

function supported(value: string): value is DisplayCurrency {
  return value === "USD" || value === "EUR" || value === "IDR" || value === "JPY";
}

/** null means an unsupported currency or unavailable/stale reference quote, never zero. */
export function convertDisplayAmount(
  value: number,
  sourceCurrency: string,
  targetCurrency: DisplayCurrency,
  now = new Date()
): number | null {
  const source = sourceCurrency.toUpperCase();
  if (!Number.isFinite(value) || !supported(source)) return null;
  if (source === targetCurrency) return value;
  const snapshot = getDisplayFxSnapshot(now);
  if (!snapshot) return null;
  return (value / snapshot.usdRates[source]) * snapshot.usdRates[targetCurrency];
}

export function formatDisplayCurrency(value: number, currency: DisplayCurrency, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" || currency === "JPY" ? 0 : 2
  }).format(value);
}

export function secondaryPriceLabel(value: number, sourceCurrency: string, targetCurrency: DisplayCurrency, locale = "en-US") {
  if (sourceCurrency.toUpperCase() === targetCurrency) return null;
  const snapshot = getDisplayFxSnapshot();
  const converted = convertDisplayAmount(value, sourceCurrency, targetCurrency);
  if (converted === null || !snapshot) return null;
  return `≈ ${formatDisplayCurrency(converted, targetCurrency, locale)} (FX ${snapshot.asOf})`;
}
