import assert from "node:assert/strict";
import test from "node:test";

import {
  departureStatusAfterSeatChange,
  expeditionDepartureAvailability,
  normalizeExpeditionDepartureStatus
} from "../src/lib/expedition-booking-lifecycle";

test("departure statuses normalize defensively", () => {
  assert.equal(normalizeExpeditionDepartureStatus("private_group"), "private_group");
  assert.equal(normalizeExpeditionDepartureStatus("WAITLIST"), "waitlist");
  assert.equal(normalizeExpeditionDepartureStatus("unknown"), "open");
});

test("departure availability blocks non-bookable statuses", () => {
  assert.equal(expeditionDepartureAvailability({ status: "cancelled", capacity: 10, seatsBooked: 0 }).canBook, false);
  assert.equal(expeditionDepartureAvailability({ status: "private_group", capacity: 10, seatsBooked: 0 }).code, "private_group");
  assert.equal(expeditionDepartureAvailability({ status: "waitlist", capacity: 10, seatsBooked: 0 }).code, "waitlist");
  assert.equal(expeditionDepartureAvailability({ status: "open", capacity: 10, seatsBooked: 10 }).code, "full");
});

test("departure availability respects requested seats and minimum participants", () => {
  const lowMinimum = expeditionDepartureAvailability({ status: "open", capacity: 10, seatsBooked: 1, minParticipants: 6 }, 2);
  const confirmed = expeditionDepartureAvailability({ status: "open", capacity: 10, seatsBooked: 5, minParticipants: 6 }, 1);
  const insufficientSeats = expeditionDepartureAvailability({ status: "open", capacity: 10, seatsBooked: 8, minParticipants: 6 }, 3);

  assert.equal(lowMinimum.canBook, true);
  assert.equal(lowMinimum.code, "minimum_not_reached");
  assert.equal(confirmed.canBook, true);
  assert.equal(confirmed.code, "bookable");
  assert.equal(insufficientSeats.canBook, false);
  assert.equal(insufficientSeats.code, "full");
});

test("departure status follows seat changes without overriding operator statuses", () => {
  assert.equal(departureStatusAfterSeatChange("open", 10, 10), "full");
  assert.equal(departureStatusAfterSeatChange("full", 10, 9), "open");
  assert.equal(departureStatusAfterSeatChange("waitlist", 10, 4), "waitlist");
  assert.equal(departureStatusAfterSeatChange("cancelled", 10, 4), "cancelled");
});
