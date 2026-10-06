import assert from "node:assert/strict";
import test from "node:test";

import {
  publicMediaAppUrl,
  publicMediaObjectKey,
  publicR2ObjectUrl,
  r2StorageConfiguration,
  signedR2PutRequest
} from "../src/lib/r2-storage";

const configuredEnv = {
  CLOUDFLARE_R2_ACCOUNT_ID: "account123",
  CLOUDFLARE_R2_BUCKET: "terumbu-media",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "access-key",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret-key",
  CLOUDFLARE_R2_PUBLIC_BASE_URL: "https://media.terumbu.example/"
};

test("R2 configuration is disabled only when no R2 values are present", () => {
  assert.equal(r2StorageConfiguration({}).status, "disabled");

  const partial = r2StorageConfiguration({
    CLOUDFLARE_R2_ACCOUNT_ID: "account123"
  });
  assert.equal(partial.status, "incomplete");
  assert.ok(partial.missing.includes("CLOUDFLARE_R2_BUCKET"));
});

test("R2 configuration requires an HTTPS public base URL", () => {
  const invalid = r2StorageConfiguration({
    ...configuredEnv,
    CLOUDFLARE_R2_PUBLIC_BASE_URL: "http://media.example.test"
  });
  assert.equal(invalid.status, "incomplete");

  const configured = r2StorageConfiguration(configuredEnv);
  assert.equal(configured.status, "configured");
  if (configured.status === "configured") {
    assert.equal(configured.config.publicBaseUrl, "https://media.terumbu.example");
  }
});

test("public media keys and app URLs are stable and content-type aware", () => {
  const now = new Date("2026-10-06T16:30:00.000Z");
  const key = publicMediaObjectKey("image/webp", now, "abc123");

  assert.equal(key, "public-media/2026/10/06/abc123.webp");
  assert.equal(publicMediaAppUrl(key), "/media/public-media/2026/10/06/abc123.webp");
});

test("R2 public object URL uses the configured public domain", () => {
  const configured = r2StorageConfiguration(configuredEnv);
  assert.equal(configured.status, "configured");
  if (configured.status !== "configured") return;

  assert.equal(
    publicR2ObjectUrl(configured.config, "public-media/2026/10/06/abc123.webp"),
    "https://media.terumbu.example/public-media/2026/10/06/abc123.webp"
  );
});

test("R2 PUT signing is deterministic and does not expose the secret", () => {
  const configured = r2StorageConfiguration(configuredEnv);
  assert.equal(configured.status, "configured");
  if (configured.status !== "configured") return;

  const request = signedR2PutRequest(configured.config, {
    objectKey: "public-media/2026/10/06/abc123.png",
    bytes: new Uint8Array([137, 80, 78, 71]),
    contentType: "image/png",
    now: new Date("2026-10-06T16:30:00.000Z")
  });

  assert.equal(
    request.url,
    "https://account123.r2.cloudflarestorage.com/terumbu-media/public-media/2026/10/06/abc123.png"
  );
  assert.equal(request.headers["x-amz-date"], "20261006T163000Z");
  assert.match(request.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=access-key\/20261006\/auto\/s3\/aws4_request,/);
  assert.ok(!request.headers.Authorization.includes("secret-key"));
});
