import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionSponsoredEcosystem,
  normalizeSponsoredEcosystemOperationalStatus,
  sponsoredEcosystemTransitionRequiresReason
} from "../src/lib/sponsored-ecosystem-lifecycle";

test("sponsored ecosystem lifecycle only allows forward operational transitions", () => {
  assert.equal(canTransitionSponsoredEcosystem("sponsored", "growing"), true);
  assert.equal(canTransitionSponsoredEcosystem("growing", "planted"), true);
  assert.equal(canTransitionSponsoredEcosystem("planted", "monitored"), true);
  assert.equal(canTransitionSponsoredEcosystem("sponsored", "planted"), false);
  assert.equal(canTransitionSponsoredEcosystem("planted", "growing"), false);
  assert.equal(canTransitionSponsoredEcosystem("refunded", "growing"), false);
});

test("reported field transitions require an explicit reason", () => {
  assert.equal(sponsoredEcosystemTransitionRequiresReason("growing", "planted"), true);
  assert.equal(sponsoredEcosystemTransitionRequiresReason("planted", "monitored"), true);
  assert.equal(sponsoredEcosystemTransitionRequiresReason("sponsored", "growing"), false);
});

test("operational status normalization rejects payment lifecycle states", () => {
  assert.equal(normalizeSponsoredEcosystemOperationalStatus("monitored"), "monitored");
  assert.equal(normalizeSponsoredEcosystemOperationalStatus("payment_reversed"), null);
  assert.equal(normalizeSponsoredEcosystemOperationalStatus("refunded"), null);
});
