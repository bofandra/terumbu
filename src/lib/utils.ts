import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency = "USD") {
  const normalizedCurrency = (currency || "USD").toUpperCase();

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: normalizedCurrency,
    currencyDisplay: "code",
    maximumFractionDigits: normalizedCurrency === "IDR" ? 0 : 2
  }).format(value);
}

export function formatCurrencyText(value: string) {
  return value.replace(/\bRp\s*(?=\d)/g, "IDR ");
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
