import assert from "node:assert/strict";
import test from "node:test";

import {
  metadataString,
  validPrivateObjectKey
} from "../src/lib/private-media";

test("private media metadata only accepts non-empty string values", () => {
  assert.equal(metadataString({ storageObjectKey: "private-media/evidence/a.png" }, "storageObjectKey"), "private-media/evidence/a.png");
  assert.equal(metadataString({ storageObjectKey: "   " }, "storageObjectKey"), null);
  assert.equal(metadataString(null, "storageObjectKey"), null);
});

test("private media object validation enforces the expected namespace", () => {
  assert.equal(validPrivateObjectKey("private-media/evidence/2026/10/06/a.png", "evidence"), true);
  assert.equal(validPrivateObjectKey("private-media/payment-proof/2026/10/06/a.png", "evidence"), false);
  assert.equal(validPrivateObjectKey(null, "evidence"), false);
});
