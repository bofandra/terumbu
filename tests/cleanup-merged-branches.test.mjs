import assert from "node:assert/strict";
import test from "node:test";

import { safeToDeleteMergedBranch } from "../scripts/cleanup-merged-branches.mjs";

const merged = { status: "ahead", behind_by: 0 };
const diverged = { status: "diverged", behind_by: 1 };
const branch = name => ({ name, protected: false });

test("cleanup only accepts fully merged Git history, never divergent or unknown ancestry", () => {
  assert.equal(safeToDeleteMergedBranch(branch("feat/merged"), merged), true);
  assert.equal(safeToDeleteMergedBranch(branch("feat/merged"), { status: "identical", behind_by: 0 }), true);
  assert.equal(safeToDeleteMergedBranch(branch("feat/has-extra-commit"), diverged), false);
  assert.equal(safeToDeleteMergedBranch(branch("feat/has-extra-commit"), { status: "behind", behind_by: 2 }), false);
  assert.equal(safeToDeleteMergedBranch(branch("feat/unverified"), null), false);
});

test("never delete main, protected, operational or active PR branches", () => {
  assert.equal(safeToDeleteMergedBranch(branch("main"), merged), false);
  assert.equal(safeToDeleteMergedBranch({ ...branch("feat/protected"), protected: true }, merged), false);
  for (const prefix of ["ops/", "release/", "hotfix/", "deploy/", "production/", "prod/", "staging/", "backup/"]) {
    assert.equal(safeToDeleteMergedBranch(branch(prefix + "preserved"), merged), false, prefix);
  }
  assert.equal(safeToDeleteMergedBranch(branch("feat/active"), merged, new Set(["feat/active"])), false);
  assert.equal(safeToDeleteMergedBranch(branch("feat/inactive"), merged, new Set(["feat/active"])), true);
});
