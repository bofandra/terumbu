import assert from "node:assert/strict";
import test from "node:test";

import { hashAuthRateLimitIdentifier } from "../src/lib/auth-rate-limit";
import { verifiedProxyClientIdentifier } from "../src/lib/trusted-proxy-client";

const secret = "proxy-shared-secret-" + "a".repeat(32);
function request(values: Record<string, string>) {
  return new Headers(values);
}

test("only a trusted reverse proxy may specify the client IP for throttling", () => {
  const h = request({
    "x-terumbu-proxy-secret": secret,
    "x-terumbu-client-ip": "203.0.113.77",
    "x-forwarded-for": "198.51.100.3, 198.51.100.4",
    "cf-connecting-ip": "192.0.2.1",
    "x-real-ip": "192.0.2.22",
    "user-agent": "attacker-agent"
  });
  assert.equal(
    verifiedProxyClientIdentifier(h, secret),
    hashAuthRateLimitIdentifier("ip:203.0.113.77")
  );
  assert.notEqual(verifiedProxyClientIdentifier(h, secret),
    hashAuthRateLimitIdentifier("ip:198.51.100.3"));
});

test("spoofed forwarding headers alone never affect limiter identity", () => {
  for (const attackerHeaders of [
    { "x-forwarded-for": "8.8.8.8" },
    { "cf-connecting-ip": "8.8.4.4" },
    { "x-real-ip": "9.9.9.9", "user-agent": "arbitrary" },
    { "x-terumbu-client-ip": "203.0.113.55" },
    {
      "x-terumbu-proxy-secret": "incorrect-" + "0".repeat(48),
      "x-terumbu-client-ip": "203.0.113.55"
    }
  ]) {
    assert.equal(verifiedProxyClientIdentifier(request(attackerHeaders), secret), null);
  }
});

test("missing, empty or short proxy configuration disables trust", () => {
  const h = request({
    "x-terumbu-proxy-secret": secret,
    "x-terumbu-client-ip": "203.0.113.77"
  });
  assert.equal(verifiedProxyClientIdentifier(h, undefined), null);
  assert.equal(verifiedProxyClientIdentifier(h, ""), null);
  assert.equal(verifiedProxyClientIdentifier(h, "too-short"), null);
});

test("rejects forged chains, hostnames, ports, control text and empty addresses", () => {
  for (const invalid of [
    "203.0.113.1, 198.51.100.2", "203.0.113.1:8765",
    "example.com", "not-an-ip", "203.0.113.1\nspoofed", " ",
    "[2001:db8::1]", "203.0.113.999", "::1, 203.0.113.1"
  ]) {
    assert.equal(verifiedProxyClientIdentifier(request({
      "x-terumbu-proxy-secret": secret,
      "x-terumbu-client-ip": invalid
    }), secret), null, invalid);
  }
});

test("accepts normalized IPv6 sent by verified edge proxy", () => {
  assert.equal(verifiedProxyClientIdentifier(request({
    "x-terumbu-proxy-secret": secret,
    "x-terumbu-client-ip": "2001:DB8::5"
  }), secret), hashAuthRateLimitIdentifier("ip:2001:db8::5"));
});
