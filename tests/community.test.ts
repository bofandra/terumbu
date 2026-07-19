import assert from "node:assert/strict";
import test from "node:test";

import {
  communityChallengeProgressStatus,
  communityEventRegistrationAvailability,
  communityScoreForReason,
  communitySlug,
  normalizeCommunityChallengeStatus,
  normalizeCommunityReactionType,
  normalizeCommunityTargetType,
  shapeCommunityCommentTree
} from "../src/lib/community";

test("community inputs normalize defensively", () => {
  assert.equal(normalizeCommunityTargetType("EVENT"), "event");
  assert.equal(normalizeCommunityTargetType("unknown"), "post");
  assert.equal(normalizeCommunityChallengeStatus("ACTIVE"), "active");
  assert.equal(normalizeCommunityChallengeStatus("unknown"), "open");
  assert.equal(normalizeCommunityReactionType("learned"), "learned");
  assert.equal(normalizeCommunityReactionType("wow"), "celebrate");
  assert.equal(communitySlug(" Plastic-Free Week! "), "plastic-free-week");
});

test("community event availability handles capacity and waitlists", () => {
  assert.deepEqual(
    communityEventRegistrationAvailability({ status: "published", capacity: 10, registeredCount: 9, waitlistEnabled: true }),
    { canRegister: true, nextStatus: "registered", label: "Register" }
  );
  assert.deepEqual(
    communityEventRegistrationAvailability({ status: "published", capacity: 10, registeredCount: 10, waitlistEnabled: true }),
    { canRegister: true, nextStatus: "waitlisted", label: "Join waitlist" }
  );
  assert.deepEqual(
    communityEventRegistrationAvailability({ status: "cancelled", capacity: 10, registeredCount: 0, waitlistEnabled: true }),
    { canRegister: false, nextStatus: null, label: "Closed" }
  );
});

test("community challenge progress completes idempotently at the goal", () => {
  assert.deepEqual(communityChallengeProgressStatus({ currentTotal: 4, amount: 2, goalTarget: 7 }), {
    nextTotal: 6,
    completed: false,
    percent: 86
  });
  assert.deepEqual(communityChallengeProgressStatus({ currentTotal: 6, amount: 1, goalTarget: 7 }), {
    nextTotal: 7,
    completed: true,
    percent: 100
  });
  assert.equal(communityScoreForReason("challenge_completed"), 50);
  assert.equal(communityScoreForReason("reaction"), 0);
});

test("community comments shape into capped threaded trees", () => {
  const comments = [
    { id: "root", parentCommentId: null, createdAt: new Date("2026-07-01T00:00:00.000Z") },
    { id: "reply", parentCommentId: "root", createdAt: new Date("2026-07-01T00:01:00.000Z") },
    { id: "nested", parentCommentId: "reply", createdAt: new Date("2026-07-01T00:02:00.000Z") },
    { id: "deep", parentCommentId: "nested", createdAt: new Date("2026-07-01T00:03:00.000Z") }
  ];
  const tree = shapeCommunityCommentTree(comments, 3);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].id, "reply");
  assert.equal(tree[0].children[0].children[0].id, "nested");
  assert.equal(tree[0].children[0].children[0].children[0].id, "deep");
  assert.equal(tree[0].children[0].children[0].children[0].depth, 2);
});
