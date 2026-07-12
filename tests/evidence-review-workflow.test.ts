import assert from "node:assert/strict";
import test from "node:test";

import {
  evidenceCanBeRevisedByPartner,
  evidenceReviewActionForTransition,
  evidenceReviewNoteRequired,
  evidenceReviewStage,
  evidenceStatusLabel,
  normalizeEvidenceVerificationStatus
} from "../src/lib/evidence-review-workflow";

test("evidence review statuses normalize and label the workflow", () => {
  assert.equal(normalizeEvidenceVerificationStatus("needs_clarification"), "needs_clarification");
  assert.equal(normalizeEvidenceVerificationStatus("unexpected", "in_review"), "in_review");
  assert.equal(evidenceStatusLabel("needs_clarification"), "Needs clarification");
  assert.equal(evidenceReviewStage("verified"), "Approved");
  assert.equal(evidenceReviewStage("rejected"), "Rejected");
});

test("evidence review transition actions preserve review intent", () => {
  assert.equal(evidenceReviewActionForTransition({ toStatus: "submitted" }), "submitted");
  assert.equal(evidenceReviewActionForTransition({ fromStatus: "submitted", toStatus: "in_review", assignedReviewerChanged: true }), "assigned");
  assert.equal(evidenceReviewActionForTransition({ fromStatus: "in_review", toStatus: "needs_clarification" }), "clarification_requested");
  assert.equal(evidenceReviewActionForTransition({ fromStatus: "needs_clarification", toStatus: "submitted" }), "clarification_resolved");
  assert.equal(evidenceReviewActionForTransition({ fromStatus: "in_review", toStatus: "verified" }), "verified");
  assert.equal(evidenceReviewActionForTransition({ fromStatus: "in_review", toStatus: "rejected" }), "rejected");
});

test("evidence review note and partner revision rules stay explicit", () => {
  assert.equal(evidenceReviewNoteRequired("needs_clarification"), true);
  assert.equal(evidenceReviewNoteRequired("rejected"), true);
  assert.equal(evidenceReviewNoteRequired("verified"), false);
  assert.equal(evidenceCanBeRevisedByPartner("needs_clarification"), true);
  assert.equal(evidenceCanBeRevisedByPartner("rejected"), true);
  assert.equal(evidenceCanBeRevisedByPartner("in_review"), false);
});
