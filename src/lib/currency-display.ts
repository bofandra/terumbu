import type { DisplayCurrency } from "@/lib/user-preferences";

type FxRates = Record<DisplayCurrency, number>;

const fallbackUsdRates: FxRates = {
  USD: 1,
  EUR: 0.85,
  IDR: 16750,
  JPY: 149
};

function envRate(currency: DisplayCurrency) {
  if (currency === "USD") return 1;

  const raw = process.env[`NEXT_PUBLIC_FX_USD_${currency}`];
  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackUsdRates[currency];
}

function rateToUsd(currency: string) {
  const normalized = currency.toUpperCase() as DisplayCurrency;
  const rate = supported(normalized) ? envRate(normalized) : 1;
  return 1 / rate;
}

function supported(value: string): value is DisplayCurrency {
  return value === "USD" || value === "EUR" || value === "IDR" || value === "JPY";
}

export function convertDisplayAmount(value: number, sourceCurrency: string, targetCurrency: DisplayCurrency) {
  const source = sourceCurrency.toUpperCase();

  if (source === targetCurrency) return value;

  const usdValue = value * rateToUsd(source);
  return usdValue * envRate(targetCurrency);
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

  const converted = convertDisplayAmount(value, sourceCurrency, targetCurrency);
  return `≈ ${formatDisplayCurrency(converted, targetCurrency, locale)}`;
}
