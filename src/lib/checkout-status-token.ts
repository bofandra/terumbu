import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Pure, request-independent token primitives for server code and tests. */
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
