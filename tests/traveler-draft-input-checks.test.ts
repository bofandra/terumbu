import assert from "node:assert/strict";
import test from "node:test";

import { travelerDraftInputChecks } from "../src/lib/traveler-draft-input-checks";

test("live draft checks remain incomplete without entered form values", () => {
  const checks = travelerDraftInputChecks(new FormData());
  assert.equal(checks.length, 9);
  assert.equal(checks.filter((item) => item.ready).length, 0);
});

test("live draft checks recognize repeated inputs while distinguishing empty fields", () => {
  const data = new FormData();
  const values: Record<string, string[]> = {
    languages: ["", "English", "Bahasa Indonesia"],
    requirements: ["Swim competency"],
    safety: ["Guide briefing"],
    emergencyPlanSummary: ["Emergency contacts given on arrival"],
    itineraryDayTitle: ["Arrival"],
    accommodationType: ["Eco-lodge"],
    accommodationDetails: ["Twin room"],
    travelMeetingPoint: ["Airport"],
    travelNearestAirport: ["SOQ"],
    travelArrivalGuidance: ["Pick-up at baggage claim"],
    travelVisaGuidance: ["Check immigration rules"],
    travelInsuranceGuidance: ["Travel insurance recommended"],
    travelLocalTimeZone: ["WIT (UTC+9)"],
    travelPackingHighlights: ["Reusable bottle"],
    cancellationLabel: ["30-day policy"]
  };
  for(const [key, items] of Object.entries(values))for(const value of items)data.append(key,value);
  assert.ok(travelerDraftInputChecks(data).every((check) => check.ready));
  data.set("emergencyPlanSummary", "  ");
  assert.equal(travelerDraftInputChecks(data).find((check) => check.id === "safety")?.ready, false);
});
