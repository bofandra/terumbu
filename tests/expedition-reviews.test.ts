import assert from "node:assert/strict";
import test from "node:test";

import {
  expeditionReviewStatusLabel,
  normalizeExpeditionReviewStatus,
  safeAdminExpeditionReturnPath
} from "../src/lib/expedition-reviews";

test("expedition review statuses normalize into the moderation lifecycle", () => {
  assert.equal(normalizeExpeditionReviewStatus("pending"), "pending");
  assert.equal(normalizeExpeditionReviewStatus("published"), "published");
  assert.equal(normalizeExpeditionReviewStatus("approved"), "published");
  assert.equal(normalizeExpeditionReviewStatus("rejected"), "rejected");
  assert.equal(normalizeExpeditionReviewStatus("unknown"), "pending");
  assert.equal(normalizeExpeditionReviewStatus("unknown", "rejected"), "rejected");
});

test("expedition review status labels stay user-facing", () => {
  assert.equal(expeditionReviewStatusLabel("pending"), "Pending review");
  assert.equal(expeditionReviewStatusLabel("published"), "Approved");
  assert.equal(expeditionReviewStatusLabel("rejected"), "Rejected");
});

test("admin expedition return paths stay inside expedition management", () => {
  assert.equal(safeAdminExpeditionReturnPath("/admin/expeditions"), "/admin/expeditions");
  assert.equal(safeAdminExpeditionReturnPath("/admin/expeditions/exp-1?saved=1"), "/admin/expeditions/exp-1?saved=1");
  assert.equal(safeAdminExpeditionReturnPath("/admin/expeditions-archive"), "/admin/expeditions");
  assert.equal(safeAdminExpeditionReturnPath("/admin/users"), "/admin/expeditions");
  assert.equal(safeAdminExpeditionReturnPath("https://example.com/admin/expeditions"), "/admin/expeditions");
});
