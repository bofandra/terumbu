import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("production smoke strips CRLF before matching security headers", () => {
  const script = readFileSync("scripts/smoke-production.sh", "utf8");
  assert.ok(script.includes("tr -d '\\\\r'"), "curl response headers must be normalized");
  assert.ok(!script.includes(String.raw`\\r?`), "do not use GNU grep ERE's ineffective \\r pattern");

  const crlf = "X-Content-Type-Options: nosniff\\r\\n";
  assert.match(crlf.replace(/\\r/g, ""), /^X-Content-Type-Options:[ \\t]*nosniff\\n$/i);
  assert.doesNotMatch(crlf, /^X-Content-Type-Options:[ \\t]*nosniff$/i);
});
