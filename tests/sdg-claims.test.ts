import assert from "node:assert/strict";
import test from "node:test";
import { approvedSdgCodesFromEvidence, normalizeApprovedSdgCodes } from "../src/lib/sdg-claims";

const reviewTime = new Date("2026-10-18T00:00:00.000Z");
const valid = {
  verificationStatus: "verified",
  reviewedByUserId: "reviewer-a",
  reviewedAt: reviewTime,
  verifiedAt: reviewTime,
  metadata: {
    sdgApproval: {
      reviewedByUserId: "reviewer-a",
      reviewedAt: reviewTime.toISOString(),
      codes: ["14", "8"]
    }
  }
};

test("SDG options accept only exact allowed codes", () => {
  assert.deepEqual(normalizeApprovedSdgCodes(["14", "14", "8", "marine", "999", 14]), ["14", "8"]);
});

test("SDG themes require verified evidence and a current matching reviewer approval", () => {
  assert.deepEqual(approvedSdgCodesFromEvidence(valid), ["14", "8"]);
  assert.deepEqual(approvedSdgCodesFromEvidence({ ...valid, verificationStatus: "in_review" }), []);
  assert.deepEqual(approvedSdgCodesFromEvidence({ ...valid, reviewedByUserId: "reviewer-b" }), []);
  assert.deepEqual(approvedSdgCodesFromEvidence({ ...valid, reviewedAt: new Date("2026-10-18T01:00:00.000Z") }), []);
  assert.deepEqual(approvedSdgCodesFromEvidence({ ...valid, metadata: { tags: ["SDG 14"] } }), []);
  assert.deepEqual(approvedSdgCodesFromEvidence({ ...valid, verifiedAt: null }), []);
});
