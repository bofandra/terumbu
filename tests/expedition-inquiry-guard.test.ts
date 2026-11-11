import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { departureAllowsInterest, validFutureInquiryDate, validInquiryParticipantCount } from "../src/lib/expedition-inquiry-guard";

const now = new Date("2026-11-11T10:00:00.000Z");
const future = { status: "full", startsAt: new Date("2026-12-04T02:00:00.000Z"), endsAt: new Date("2026-12-06T02:00:00.000Z") };

test("inquiry party size is validated rather than silently coerced", () => {
  for (const value of ["1", "4", "12", 1, 12]) assert.equal(validInquiryParticipantCount(value), Number(value));
  for (const value of ["0", "13", "-4", "1.5", "2cats", "", "Infinity", null, undefined]) {
    assert.equal(validInquiryParticipantCount(value), null);
  }
});

test("waitlists accept only future public departures and never imply reserved seats", () => {
  assert.equal(departureAllowsInterest(future, "waitlist", now), true);
  assert.equal(departureAllowsInterest({ ...future, status: "waitlist" }, "waitlist", now), true);
  assert.equal(departureAllowsInterest({ ...future, status: "open" }, "waitlist", now), true);
  for (const status of ["private_group", "cancelled"]) {
    assert.equal(departureAllowsInterest({ ...future, status }, "waitlist", now), false);
  }
  assert.equal(departureAllowsInterest({ ...future, startsAt: new Date("2026-10-01") }, "waitlist", now), false);
  assert.equal(departureAllowsInterest({ ...future, endsAt: new Date("2026-11-30") }, "waitlist", now), false);
  assert.equal(departureAllowsInterest(future, "private_departure", now), false);
  assert.equal(departureAllowsInterest({ ...future, status: "cancelled" }, "question", now), true);
});

test("private-trip preferred dates are real future calendar dates", () => {
  assert.equal(validFutureInquiryDate("2026-12-20", now), true);
  for (const date of ["2026-11-10", "2026-02-30", "2026-13-01", "invalid", "2026-11-11"]) {
    assert.equal(validFutureInquiryDate(date, now), false);
  }
});

test("public form and server action both enforce the journey contract", () => {
  const detail = readFileSync("src/app/(public)/expeditions/[slug]/page.tsx", "utf8");
  const action = readFileSync("src/lib/expedition-interest-actions.ts", "utf8");
  assert.match(detail, /defaultValue=\{requestedParticipants\} aria-label=\{labels.participants\}/);
  assert.match(detail, /departureAllowsInterest\(departure, "waitlist"\)/);
  assert.match(action, /expedition.status !== "published"/);
  assert.match(action, /departureAllowsInterest\(departure, requestType\)/);
  assert.match(action, /validInquiryParticipantCount\(formData.get\("participantsCount"\)\)/);
  assert.match(action, /formData.get\("contactConsent"\) !== "on"/);
  assert.match(action, /\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$/);
  assert.equal((detail.match(/<InquiryContactConsent isIndonesian/g) ?? []).length, 4);
  assert.match(detail, /inquiryQuery.toString\(\)/);
});
