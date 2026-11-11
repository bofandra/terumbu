import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("partner inquiry list distinguishes anonymous email follow-up from authenticated offers", () => {
  const queries = readFileSync("src/lib/queries.ts", "utf8");
  const portal = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const journey = readFileSync("src/lib/expedition-journeys.ts", "utf8");
  assert.match(queries, /userId: expeditionInterestRequests\.userId/);
  assert.match(queries, /userId: row\.userId/);
  assert.match(portal, /request\.userId \? \(/);
  assert.match(portal, /Reply by email/);
  assert.match(portal, /encodeURIComponent\(request\.contactEmail\)/);
  assert.match(portal, /In-app departure offers require the traveler to sign in/);
  assert.match(journey, /workspace\.canHost && workspace\.request\.userId/);
});
