import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isIndonesianImpactSiteLocation, publicImpactCoordinate, summarizeImpactSites } from "../src/lib/impact-map-location";

test("the public impact map accepts Indonesian coordinates and rejects unlocated or out-of-region records", () => {
  assert.equal(isIndonesianImpactSiteLocation({ latitude: -0.2349, longitude: 130.5166 }), true);
  assert.equal(isIndonesianImpactSiteLocation({ latitude: -11, longitude: 94 }), true);
  assert.equal(isIndonesianImpactSiteLocation({ latitude: 0, longitude: 0 }), false);
  assert.equal(isIndonesianImpactSiteLocation({ latitude: Number.NaN, longitude: 120 }), false);
  assert.equal(isIndonesianImpactSiteLocation({ latitude: -15, longitude: 130 }), false);
});

test("verified evidence counts are derived from actual site records", () => {
  assert.deepEqual(summarizeImpactSites([]), { withVerifiedEvidence: 0, verifiedEvidenceCount: 0 });
  assert.deepEqual(summarizeImpactSites([
    { verifiedEvidenceCount: 3 }, { verifiedEvidenceCount: 0 }, { verifiedEvidenceCount: 2 }
  ]), { withVerifiedEvidence: 2, verifiedEvidenceCount: 5 });
});

test("public pages do not reuse the static impact map demo or allow manual evidence count entry", () => {
  const map = readFileSync("src/components/impact-map-preview.tsx", "utf8");
  const leaflet = readFileSync("src/components/impact-site-leaflet-map.tsx", "utf8");
  const admin = readFileSync("src/components/admin/admin-impact-site-form.tsx", "utf8");
  const homepage = readFileSync("src/app/(public)/page.tsx", "utf8");
  assert.doesNotMatch(map, /openstreetmap\.org\/export\/embed/);
  assert.match(leaflet, /import\("leaflet"\)/);
  assert.match(homepage, /getImpactStats\(\)/);
  assert.doesNotMatch(admin, /name="evidenceCount"/);
});

test("public impact pins use coarse precision and rejected evidence is not counted as pending", () => {
  assert.equal(publicImpactCoordinate(-0.2349), -0.2);
  assert.equal(publicImpactCoordinate(130.5166), 130.5);
  assert.equal(publicImpactCoordinate(-6.9175), -6.9);
  const queries = readFileSync("src/lib/queries.ts", "utf8");
  assert.ok(queries.includes("latitude: publicImpactCoordinate(toNumber(site.latitude))"));
  assert.ok(queries.includes('inArray(projectEvidence.verificationStatus, ["submitted", "in_review"])'));
  assert.doesNotMatch(queries, /site.metadata, "latestSurvey"/);
});
