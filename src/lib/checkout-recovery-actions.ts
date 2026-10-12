"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  checkoutRecoveryThrottleKey,
  redeemGuestCheckoutRecovery,
  requestGuestCheckoutRecovery
} from "@/lib/checkout-status-recovery";

export async function requestCheckoutStatusEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().slice(0, 300);
  const requestHeaders = await headers();
  // Prefer a trusted edge-provided address. Untrusted client hints are not
  // authorization; the database-backed per-email limiter remains essential.
  const origin = requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("user-agent")?.slice(0, 150) ||
    "unknown";
  const clientKey = checkoutRecoveryThrottleKey("requester", origin);
  try {
    await requestGuestCheckoutRecovery(email, clientKey);
  } catch {
    console.error("Guest checkout recovery request failed.");
  }
  // Always use the same response regardless of account/transaction existence.
  redirect("/checkout/recover?sent=1");
}

export async function redeemCheckoutStatusEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  let record = null;
  try {
    record = await redeemGuestCheckoutRecovery(token);
  } catch {
    console.error("Guest checkout status verification failed.");
  }
  if (!record) redirect("/checkout/recover?error=expired");
  const next = new URLSearchParams({
    method: "midtrans", type: record.type, id: record.id
  });
  redirect("/checkout/success?" + next.toString());
}
