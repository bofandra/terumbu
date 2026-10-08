import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "../src/proxy";
import { securityHeaders } from "../src/lib/security-headers";

test("runtime proxy applies all security headers to application responses", () => {
  const response = proxy(new NextRequest("https://terumbu.world/"));

  for (const header of securityHeaders) {
    assert.equal(response.headers.get(header.key), header.value, `${header.key} must be applied by runtime proxy`);
  }
});
