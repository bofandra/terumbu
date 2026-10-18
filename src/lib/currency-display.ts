import referenceSnapshot from "@/data/fx-rates.json";
import type { DisplayCurrency } from "@/lib/user-preferences";

export type RateSnapshot = {
  asOf: string;
  source: string;
  usdRates: Record<DisplayCurrency, number>;
};

const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

/** Validate both manually supplied snapshots and the reviewed, generated reference file. */
export function validateDisplayFxSnapshot(input: unknown, now = new Date()): RateSnapshot | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const asOf = typeof record.asOf === "string" ? record.asOf : "";
  const source = typeof record.source === "string" ? record.source.trim() : "";
  const date = validDate(asOf);
  if (!date || !source || source.length > 160) return null;

  const age = now.getTime() - date.getTime();
  if (!Number.isFinite(age) || age < 0 || age > MAX_RATE_AGE_MS) return null;

  const rates = record.usdRates;
  if (!rates || typeof rates !== "object" || Array.isArray(rates)) return null;
  const values = rates as Record<string, unknown>;
  const usd = Number(values.USD);
  const eur = Number(values.EUR);
  const idr = Number(values.IDR);
  const jpy = Number(values.JPY);
  if (usd !== 1 || ![eur, idr, jpy].every((value) => Number.isFinite(value) && value > 0)) return null;

  return { asOf, source, usdRates: { USD: 1, EUR: eur, IDR: idr, JPY: jpy } };
}

/** No made-up rates. Explicit deployment config overrides the reviewed snapshot file. */
export function getDisplayFxSnapshot(now = new Date()): RateSnapshot | null {
  const asOf = process.env.NEXT_PUBLIC_FX_AS_OF?.trim() ?? "";
  const source = process.env.NEXT_PUBLIC_FX_SOURCE?.trim() ?? "";
  const eurRaw = process.env.NEXT_PUBLIC_FX_USD_EUR?.trim() ?? "";
  const idrRaw = process.env.NEXT_PUBLIC_FX_USD_IDR?.trim() ?? "";
  const jpyRaw = process.env.NEXT_PUBLIC_FX_USD_JPY?.trim() ?? "";
  const overrideRequested = Boolean(asOf || source || eurRaw || idrRaw || jpyRaw);

  return validateDisplayFxSnapshot(overrideRequested
    ? { asOf, source, usdRates: { USD: 1, EUR: Number(eurRaw), IDR: Number(idrRaw), JPY: Number(jpyRaw) } }
    : referenceSnapshot, now);
}

function supported(value: string): value is DisplayCurrency {
  return value === "USD" || value === "EUR" || value === "IDR" || value === "JPY";
}

/** null means unsupported currency or unavailable/stale quote, never zero. */
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
