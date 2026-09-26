import assert from "node:assert/strict";
import test from "node:test";

import {
  destinationArrivalHubs,
  destinationMonthArray,
  destinationMonthLabels,
  destinationStatus,
  destinationStringArray
} from "../src/lib/destination-content";

test("destination structured arrays remove blanks and duplicates", () => {
  assert.deepEqual(destinationStringArray(["Coral restoration", "", "Coral restoration", " Reef monitoring "]), [
    "Coral restoration",
    "Reef monitoring"
  ]);
});

test("destination months keep only valid calendar months", () => {
  assert.deepEqual(destinationMonthArray([12, "1", 0, 13, 6, 6, "bad"]), [1, 6, 12]);
  assert.deepEqual(destinationMonthLabels([1, 6, 12]), ["January", "June", "December"]);
});

test("destination arrival hubs require a managed name and normalize codes", () => {
  assert.deepEqual(
    destinationArrivalHubs([
      { type: "airport", name: "Example Airport", code: "abc" },
      { type: "port", name: " Example Port ", code: "" },
      { type: "other", name: "Town", code: "town" },
      { type: "city", name: "", code: "NONE" }
    ]),
    [
      { type: "airport", name: "Example Airport", code: "ABC" },
      { type: "port", name: "Example Port", code: "" },
      { type: "city", name: "Town", code: "TOWN" }
    ]
  );
});

test("unknown destination publication state is never treated as published", () => {
  assert.equal(destinationStatus("published"), "published");
  assert.equal(destinationStatus("archived"), "archived");
  assert.equal(destinationStatus("unexpected"), "draft");
});
