import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsEventNames,
  isAnalyticsEventName,
  safeAnalyticsDistinctId,
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

test("analytics distinct ids are bounded and stripped of email punctuation", () => {
  assert.equal(safeAnalyticsDistinctId(" user:abc-123 ", "fallback"), "user:abc-123");
  assert.equal(safeAnalyticsDistinctId("person@example.com", "fallback"), "personexamplecom");
  assert.equal(safeAnalyticsDistinctId("", "fallback"), "fallback");
});
