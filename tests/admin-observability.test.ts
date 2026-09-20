import assert from "node:assert/strict";
import test from "node:test";

import { adminQueryWarnThresholdMs, shouldWarnAdminQuery } from "../src/lib/admin-observability";

test("admin query warning threshold uses a safe default", () => {
  assert.equal(adminQueryWarnThresholdMs(undefined), 750);
  assert.equal(adminQueryWarnThresholdMs("not-a-number"), 750);
});

test("admin query warning threshold is clamped", () => {
  assert.equal(adminQueryWarnThresholdMs("1"), 50);
  assert.equal(adminQueryWarnThresholdMs("500"), 500);
  assert.equal(adminQueryWarnThresholdMs("999999"), 60_000);
});

test("slow query decision uses the configured threshold", () => {
  assert.equal(shouldWarnAdminQuery(499, 500), false);
  assert.equal(shouldWarnAdminQuery(500, 500), true);
  assert.equal(shouldWarnAdminQuery(Number.NaN, 500), false);
});
