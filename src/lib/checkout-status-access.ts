import { cookies } from "next/headers";

import { shouldUseSecureSessionCookie } from "@/lib/session-cookie";
import { checkoutStatusTokenHash } from "@/lib/checkout-status-token";

export {
  newCheckoutStatusToken,
  checkoutStatusTokenHash,
  authorizedCheckoutStatusToken,
  mayReadCheckoutStatus,
  checkoutStatusPayload
} from "@/lib/checkout-status-token";

const COOKIE_PREFIX = "trb_midtrans_access_";
const ACCESS_SECONDS = 30 * 24 * 60 * 60;

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
