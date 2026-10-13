import { createHash } from "node:crypto";

export type AuthRateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export type AuthRateLimitStatus = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/** Shared DB bucket identifiers. Never persist raw emails or remote addresses. */
export function hashAuthRateLimitIdentifier(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function authRateLimitKey(scope: string, ...identifiers: string[]) {
  return createHash("sha256")
    .update([scope, ...identifiers].join("\u0000"))
    .digest("hex");
}
