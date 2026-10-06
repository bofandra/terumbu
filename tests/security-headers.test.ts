import assert from "node:assert/strict";
import test from "node:test";

import { securityHeaders } from "../src/lib/security-headers";

function headerValue(name: string) {
  return securityHeaders.find((header) => header.key === name)?.value ?? null;
}

test("security headers prevent framing and MIME sniffing", () => {
  assert.equal(headerValue("X-Frame-Options"), "DENY");
  assert.equal(headerValue("X-Content-Type-Options"), "nosniff");
  assert.match(headerValue("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.match(headerValue("Content-Security-Policy") ?? "", /object-src 'none'/);
});

test("security headers keep external providers compatible while restricting sensitive browser capabilities", () => {
  const csp = headerValue("Content-Security-Policy") ?? "";
  const permissions = headerValue("Permissions-Policy") ?? "";

  assert.equal(csp.includes("default-src"), false);
  assert.match(csp, /form-action 'self'/);
  assert.match(permissions, /camera=\(\)/);
  assert.match(permissions, /microphone=\(\)/);
  assert.match(permissions, /geolocation=\(self\)/);
});

test("transport and referrer policies are explicit", () => {
  assert.equal(headerValue("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(headerValue("Referrer-Policy"), "strict-origin-when-cross-origin");
});
