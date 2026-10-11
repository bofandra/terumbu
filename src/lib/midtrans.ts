import { createHash, timingSafeEqual } from "node:crypto";

import type { ManagedPaymentStatus } from "@/lib/payment-workflows";

/**
 * Midtrans donation rollout is opt-in. Never infer production mode from
 * the presence of a server key.
 */
export type MidtransConfiguration = {
  serverKey: string;
  mode: "sandbox" | "production";
};

export function midtransConfiguration(env: Record<string, string | undefined> = process.env): MidtransConfiguration | null {
  if (env.MIDTRANS_PAYMENT_ENABLED !== "true") return null;
  const serverKey = env.MIDTRANS_SERVER_KEY?.trim();
  const mode = env.MIDTRANS_ENV || "sandbox";
  if (!serverKey || (mode !== "sandbox" && mode !== "production")) return null;
  return { serverKey, mode };
}

export function midtransSnapOrigin(config: MidtransConfiguration) {
  return config.mode === "production" ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
}

export function midtransApiOrigin(config: MidtransConfiguration) {
  return config.mode === "production" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

export type MidtransStatusPayload = {
  order_id?: unknown;
  gross_amount?: unknown;
  status_code?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
  currency?: unknown;
  payment_type?: unknown;
  transaction_id?: unknown;
};

function signedFields(value: MidtransStatusPayload) {
  return (
    typeof value.order_id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value.order_id) &&
    typeof value.status_code === "string" && /^\d{3}$/.test(value.status_code) &&
    typeof value.gross_amount === "string" && /^\d+(?:\.\d{1,2})?$/.test(value.gross_amount) &&
    typeof value.signature_key === "string" && /^[0-9a-f]{128}$/i.test(value.signature_key)
  );
}

export function verifyMidtransSignature(value: MidtransStatusPayload, serverKey: string) {
  if (!serverKey || !signedFields(value)) return false;
  const signedText = `${value.order_id}${value.status_code}${value.gross_amount}${serverKey}`;
  const actual = Buffer.from(value.signature_key as string, "hex");
  const expected = createHash("sha512").update(signedText).digest();
  return timingSafeEqual(actual, expected);
}

export function midtransIdrAmount(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(?:\.0{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function midtransPaymentState(payload: MidtransStatusPayload): ManagedPaymentStatus | null {
  if (payload.currency !== undefined && payload.currency !== "IDR") return null;
  const fraud = payload.fraud_status;
  if (fraud === "deny") return "failed";
  switch (payload.transaction_status) {
    case "settlement":
      return "paid";
    case "capture":
      return fraud === "accept" ? "paid" : "pending";
    case "pending":
    case "authorize":
      return "pending";
    case "deny":
    case "cancel":
    case "failure":
      return "failed";
    case "expire":
      return "expired";
    case "refund":
    case "chargeback":
      return "refunded";
    // Partial reversals require a separate financial reconciliation
    // model. Never mark the full donation refunded on a partial event.
    default:
      return null;
  }
}

type Fetcher = typeof fetch;

export async function createMidtransSnapPayment(
  config: MidtransConfiguration,
  input: { orderId: string; amount: number; donorName: string; donorEmail: string },
  fetcher: Fetcher = fetch
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.orderId) || !Number.isSafeInteger(input.amount) || input.amount < 1) {
    throw new Error("Invalid Midtrans payment request.");
  }
  const response = await fetcher(`${midtransSnapOrigin(config)}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      customer_details: { first_name: input.donorName.slice(0, 160), email: input.donorEmail }
    }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Midtrans Snap initiation failed.");
  const payload: unknown = await response.json();
  const redirectUrl = payload && typeof payload === "object" && "redirect_url" in payload
    ? (payload as { redirect_url: unknown }).redirect_url
    : null;
  if (typeof redirectUrl !== "string") throw new Error("Midtrans Snap response did not include a redirect URL.");
  const parsed = new URL(redirectUrl);
  if (parsed.protocol !== "https:" || parsed.origin !== midtransSnapOrigin(config) || parsed.username || parsed.password) {
    throw new Error("Midtrans Snap returned an invalid redirect destination.");
  }
  return parsed.toString();
}

export async function fetchMidtransTransactionStatus(
  config: MidtransConfiguration,
  orderId: string,
  fetcher: Fetcher = fetch
): Promise<MidtransStatusPayload> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) throw new Error("Invalid Midtrans order id.");
  const response = await fetcher(`${midtransApiOrigin(config)}/v2/${orderId}/status`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Midtrans transaction status could not be verified.");
  const status: unknown = await response.json();
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new Error("Invalid Midtrans transaction status.");
  }
  const payload = status as MidtransStatusPayload;
  if (payload.order_id !== orderId || midtransIdrAmount(payload.gross_amount) == null || typeof payload.transaction_status !== "string") {
    throw new Error("Invalid Midtrans order or amount.");
  }
  return payload;
}
