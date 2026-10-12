import type { MidtransConfiguration, MidtransStatusPayload } from "@/lib/midtrans";
import { midtransApiOrigin, midtransIdrAmount } from "@/lib/midtrans";

/**
 * Refunds are a separate, opt-in financial operation. Production also requires
 * its own second switch; payment enablement alone never enables refunds.
 */
export function midtransAutoRefundEnabled(
  config: MidtransConfiguration | null,
  env: Record<string, string | undefined> = process.env
) {
  return Boolean(config) && env.MIDTRANS_AUTO_REFUND_ENABLED === "true" &&
    (config?.mode === "sandbox" || env.MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED === "true");
}

export function midtransRefundKey(bookingId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new Error("Invalid compensation booking ID.");
  return "TRB-COMP-" + bookingId.replaceAll("-", "").toLowerCase();
}

// Refund API availability is channel-specific; unknown channels are manual.
// Actual merchant refund capabilities also require approval from Midtrans.
const REFUNDABLE_CHANNELS = new Set([
  "credit_card", "gopay", "shopeepay", "dana", "ovo", "qris", "kredivo", "akulaku"
]);

export function midtransRefundEligible(
  status: MidtransStatusPayload,
  storedAmount: number
) {
  return status.transaction_status === "settlement" &&
    typeof status.payment_type === "string" &&
    REFUNDABLE_CHANNELS.has(status.payment_type.toLowerCase()) &&
    midtransIdrAmount(status.gross_amount) === storedAmount &&
    Number.isSafeInteger(storedAmount) && storedAmount > 0 &&
    status.currency !== "USD";
}

export type MidtransRefundResponse = {
  order_id?: unknown;
  refund_key?: unknown;
  refund_amount?: unknown;
  transaction_status?: unknown;
  status_code?: unknown;
};

export async function requestMidtransFullRefund(
  config: MidtransConfiguration,
  input: { orderId: string; refundKey: string; amount: number },
  fetcher: typeof fetch = fetch
): Promise<MidtransRefundResponse> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.orderId) ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(input.refundKey) ||
      !Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Invalid refund request.");
  }
  const response = await fetcher(`${midtransApiOrigin(config)}/v2/${input.orderId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      refund_key: input.refundKey,
      amount: input.amount,
      reason: "Expedition seats unavailable after payment verification"
    }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Refund provider returned an unsuccessful HTTP response.");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid provider refund response.");
  }
  const value = payload as MidtransRefundResponse;
  if (value.status_code !== "200" || value.order_id !== input.orderId ||
      value.refund_key !== input.refundKey || value.transaction_status !== "refund" ||
      midtransIdrAmount(value.refund_amount) !== input.amount) {
    throw new Error("Refund response not verified as a full refund.");
  }
  // Provider acceptance is NOT bank settlement confirmation.
  return value;
}
