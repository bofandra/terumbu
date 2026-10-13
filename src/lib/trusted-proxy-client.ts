import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import { hashAuthRateLimitIdentifier } from "@/lib/auth-rate-limit";

/**
 * The edge proxy MUST replace both custom headers (never forward user input)
 * and connect directly to the application's trusted origin.
 *
 * If a shared proxy secret is missing, mismatched, or the IP is malformed,
 * never use spoofable forwarding headers or User-Agent for rate-limit identity.
 */
export function verifiedProxyClientIdentifier(
  requestHeaders: Pick<Headers, "get">,
  configuredSecret: string | undefined = process.env.AUTH_TRUSTED_PROXY_SECRET
): string | null {
  const suppliedSecret = requestHeaders.get("x-terumbu-proxy-secret");
  const suppliedIp = requestHeaders.get("x-terumbu-client-ip");

  if (!configuredSecret || configuredSecret.length < 32 ||
      !suppliedSecret || suppliedSecret.length !== configuredSecret.length ||
      suppliedSecret.length > 256) {
    return null;
  }

  const trusted = timingSafeEqual(
    Buffer.from(configuredSecret, "utf8"),
    Buffer.from(suppliedSecret, "utf8")
  );
  if (!trusted || !suppliedIp) return null;

  // Do not accept comma-separated forwarded chains or IP:port strings. The
  // trusted edge proxy must inject exactly one syntactically valid IP address.
  const address = suppliedIp.trim();
  if (address.length > 45 || isIP(address) === 0) return null;

  return hashAuthRateLimitIdentifier(`ip:${address.toLowerCase()}`);
}
