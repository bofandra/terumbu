import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsEventNames,
  isAnalyticsEventName,
  safeAnalyticsDistinctId,
  safeBrowserAnonymousId,
  sanitizePublicAnalyticsProperties
} from "../src/lib/analytics";

test("analytics event taxonomy includes the traveler funnel", () => {
  for (const event of [
    "destination_view",
    "expedition_view",
    "expedition_checkout_started",
    "expedition_interest_submitted",
    "expedition_booking_submitted"
  ]) {
    assert.equal(isAnalyticsEventName(event), true);
    assert.equal(analyticsEventNames.includes(event as never), true);
  }

  assert.equal(isAnalyticsEventName("arbitrary_event"), false);
});

test("public analytics properties drop pii and arbitrary fields", () => {
  assert.deepEqual(
    sanitizePublicAnalyticsProperties({
      expeditionSlug: "raja-ampat-coral-restoration",
      participantsCount: 2,
      authenticated: false,
      email: "traveler@example.com",
      contactName: "Traveler Name",
      message: "private note",
      arbitrary: "not allowed"
    }),
    {
      expeditionSlug: "raja-ampat-coral-restoration",
      participantsCount: 2,
      authenticated: false
    }
  );
});

test("analytics identifiers stay opaque", () => {
  assert.equal(safeAnalyticsDistinctId(" user:abc-123 ", "fallback"), "user:abc-123");
  assert.equal(safeAnalyticsDistinctId("", "fallback"), "fallback");
  assert.equal(safeBrowserAnonymousId("8f37f71a-7c4e-4b11-a70a-58461ea25a93"), "8f37f71a-7c4e-4b11-a70a-58461ea25a93");
  assert.equal(safeBrowserAnonymousId("person@example.com"), "browser");
  assert.equal(safeBrowserAnonymousId("short"), "browser");
});
