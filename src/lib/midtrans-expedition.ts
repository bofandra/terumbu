import { normalizeCurrency } from "@/lib/impact-calculations";
import { midtransConfiguration } from "@/lib/midtrans";

/** This second opt-in prevents enabling expedition charges when only donations have been approved. */
export function midtransExpeditionEnabled(env: Record<string, string | undefined> = process.env) {
  return env.MIDTRANS_EXPEDITION_ENABLED === "true" && midtransConfiguration(env) !== null;
}

/**
 * Whole-IDR only; do not charge using formatted/display FX conversions.
 * The amount must be derived from the authoritative departure price.
 */
export function validMidtransExpeditionTotal(currency: unknown, total: number): total is number {
  return normalizeCurrency(currency) === "IDR" &&
    Number.isSafeInteger(total) && total >= 1 && total < 1_000_000_000_000;
}

export function verifiedExpeditionGrossMatches(currency: unknown, storedAmount: number, providerAmount: number | null) {
  return validMidtransExpeditionTotal(currency, storedAmount) && providerAmount === storedAmount;
}
