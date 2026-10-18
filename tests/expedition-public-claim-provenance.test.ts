import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("expedition listing and share text do not claim verification without evidence", () => {
  const card = readFileSync("src/components/expedition-card.tsx", "utf8");
  const sharing = readFileSync("src/components/expedition-share-buttons.tsx", "utf8");
  for(const s of [card, sharing]) {
    assert.doesNotMatch(s, /Verified trip|Perjalanan terverifikasi|verified conservation purpose|tujuan konservasi terverifikasi/);
  }
});

test("featured expedition summaries are host-managed instead of inferred from keywords", () => {
  const featured = readFileSync("src/components/featured-expedition-rail.tsx", "utf8");
  assert.doesNotMatch(featured, /function activityLabel/);
  assert.doesNotMatch(featured, /Plant corals \+ diving/);
  assert.match(featured, />\{expedition\.summary\}<\/p>/);
});
