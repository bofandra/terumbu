import assert from "node:assert/strict";
import test from "node:test";

import { safeEmbedUrl, safeImageUrl, safeNavigationUrl } from "../src/lib/safe-url";

test("navigation URLs allow same-origin paths and HTTPS destinations", () => {
  assert.equal(safeNavigationUrl("/partners/reef-team"), "/partners/reef-team");
  assert.equal(safeNavigationUrl("https://example.com/path?q=1"), "https://example.com/path?q=1");
  assert.equal(safeNavigationUrl("//evil.example/path"), "");
});

test("dangerous navigation and embed schemes are rejected", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "http://insecure.example/map"
  ]) {
    assert.equal(safeEmbedUrl(value), "");
  }

  assert.equal(safeNavigationUrl("javascript:alert(1)"), "");
  assert.equal(safeNavigationUrl("data:text/html,hello"), "");
  assert.equal(safeEmbedUrl("https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"), "https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4");
});

test("image URLs allow HTTPS, same-origin paths, and image data URLs only", () => {
  assert.equal(safeImageUrl("/private-media/evidence/TRB-001"), "/private-media/evidence/TRB-001");
  assert.equal(safeImageUrl("https://cdn.example.com/reef.webp"), "https://cdn.example.com/reef.webp");
  assert.equal(safeImageUrl("data:image/png;base64,aGVsbG8="), "data:image/png;base64,aGVsbG8=");
  assert.equal(safeImageUrl("data:text/html;base64,aGVsbG8="), null);
  assert.equal(safeImageUrl("javascript:alert(1)"), null);
});
