import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("partners can select precise internal coordinates without manually entering evidence counts", () => {
  const ui = readFileSync("src/components/partner-portal-ui.tsx", "utf8");
  const picker = readFileSync("src/components/partner-impact-site-coordinate-picker.tsx", "utf8");
  const actions = readFileSync("src/lib/portal-actions.ts", "utf8");
  assert.match(ui, /PartnerImpactSiteCoordinatePicker/);
  assert.doesNotMatch(ui, /name="evidenceCount"/);
  assert.match(picker, /name="latitude"/);
  assert.match(picker, /name="longitude"/);
  assert.match(picker, /instance\.on\("click"/);
  assert.match(actions, /publicLocationPrecision/);
  assert.match(ui, /Last survey \(fallback only\)/);
  assert.match(actions, /parseCoordinate\(formData\.get\("latitude"\), -11, 6\)/);
});
