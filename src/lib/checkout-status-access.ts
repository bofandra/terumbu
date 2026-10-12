import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { shouldUseSecureSessionCookie } from "@/lib/session-cookie";

const COOKIE_PREFIX = "trb_midtrans_access_";
const ACCESS_SECONDS = 30 * 24 * 60 * 60;

/** An independent capability per checkout. Never put the raw token in URLs or provider metadata. */
export function newCheckoutStatusToken() {
  return randomBytes(32).toString("hex");
}

export function checkoutStatusTokenHash(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error("Invalid checkout status token.");
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function authorizedCheckoutStatusToken(token: string | null, storedHash: unknown) {
  if (!token || !/^[0-9a-f]{64}$/.test(token) ||
      typeof storedHash !== "string" || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const given = Buffer.from(checkoutStatusTokenHash(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return timingSafeEqual(given, expected);
}

function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function setCheckoutStatusCookie(id: string, token: string) {
  if (!validId(id)) throw new Error("Invalid checkout id.");
  checkoutStatusTokenHash(token);
  const jar = await cookies();
  jar.set(COOKIE_PREFIX + id, token, {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    sameSite: "lax",
    path: "/api/checkout/midtrans-status",
    maxAge: ACCESS_SECONDS
  });
}

export async function readCheckoutStatusCookie(id: string) {
  if (!validId(id)) return null;
  const jar = await cookies();
  return jar.get(COOKIE_PREFIX + id)?.value ?? null;
}

export function mayReadCheckoutStatus(input: {
  ownerId: string | null;
  currentUserId: string | null;
  guestToken: string | null;
  storedHash: unknown;
}) {
  if (input.ownerId) return input.ownerId === input.currentUserId;
  return authorizedCheckoutStatusToken(input.guestToken, input.storedHash);
}

export function checkoutStatusPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
