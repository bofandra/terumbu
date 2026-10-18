import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage does not present fictional reviewer initials or unconditional verification promises", () => {
  const source = readFileSync("src/app/(public)/page.tsx", "utf8");
  assert.doesNotMatch(source, /\["RA", "WK", "LB"\]/);
  assert.doesNotMatch(source, /messages\.home\.verifiedPartners/);
  assert.doesNotMatch(source, /messages\.home\.evidenceAfterTrip/);
  assert.doesNotMatch(source, /messages\.home\.flexibleDates/);
  // Real approved review aggregate is still rendered when available.
  assert.match(source, /\{reviewSummary\.label\}/);
});
