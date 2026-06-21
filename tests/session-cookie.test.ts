import assert from "node:assert/strict";
import test from "node:test";

import { shouldUseSecureSessionCookie } from "../src/lib/session-cookie";

test("session cookie is not secure for an HTTP public app URL", () => {
  assert.equal(
    shouldUseSecureSessionCookie({
      appUrl: "http://43.157.242.98:3100",
      nodeEnv: "production"
    }),
    false
  );
});

test("session cookie is secure for an HTTPS public app URL", () => {
  assert.equal(
    shouldUseSecureSessionCookie({
      appUrl: "https://terumbu.eco",
      nodeEnv: "production"
    }),
    true
  );
});

test("session cookie secure override wins over app URL", () => {
  assert.equal(
    shouldUseSecureSessionCookie({
      appUrl: "http://43.157.242.98:3100",
      nodeEnv: "production",
      override: "true"
    }),
    true
  );

  assert.equal(
    shouldUseSecureSessionCookie({
      appUrl: "https://terumbu.eco",
      nodeEnv: "production",
      override: "false"
    }),
    false
  );
});
