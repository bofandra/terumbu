import assert from "node:assert/strict";
import test from "node:test";

import {
  eligibleBranch, classifyHistory
} from "../scripts/cleanup-patch-equivalent-branches.mjs";

const branch = name => ({ name, protected: false });
const equivalent = [ "a".repeat(40), "b".repeat(40) ].map(sha => "- " + sha);

test("strictly preserve default, protected, operational and active branches", () => {
  assert.equal(eligibleBranch(branch("main")), false);
  assert.equal(eligibleBranch({ ...branch("feat/important"), protected: true }), false);
  assert.equal(eligibleBranch(branch("feat/current"), new Set(["feat/current"])), false);
  for (const prefix of ["ops/", "release/", "hotfix/", "deploy/", "production/", "prod/", "staging/", "backup/"]) {
    assert.equal(eligibleBranch(branch(prefix + "keep")), false, prefix);
  }
  assert.equal(eligibleBranch(branch("ops/cleanup-merged-branches-20261013")), true);
  assert.equal(eligibleBranch(branch("chore/patch-equivalent-branch-pruning-20261013")), true);
});

test("require exact patch equivalence for every divergent commit", () => {
  const input = { ancestor: false, unmergedCommits: 2, mergeCommits: 0, cherryLines: equivalent };
  assert.equal(classifyHistory(input), "patch_equivalent");
  assert.equal(classifyHistory({ ...input, cherryLines: ["+ " + "a".repeat(40), equivalent[1]] }), "preserve");
  assert.equal(classifyHistory({ ...input, cherryLines: equivalent.slice(0, 1) }), "preserve");
  assert.equal(classifyHistory({ ...input, cherryLines: [equivalent[0], "- untrusted"] }), "preserve");
  assert.equal(classifyHistory({ ...input, mergeCommits: 1 }), "preserve");
  assert.equal(classifyHistory({ ...input, unmergedCommits: 0 }), "preserve");
  assert.equal(classifyHistory({ ...input, cherryLines: null }), "preserve");
});

test("allow known merged branch tips, never invent equivalence from missing evidence", () => {
  assert.equal(classifyHistory({ ancestor: true }), "merged_ancestor");
  assert.equal(classifyHistory({ ancestor: false }), "preserve");
});
