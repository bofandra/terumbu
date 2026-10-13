import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assessBranchSnapshot,
  candidateForContentCleanup,
  contentEquivalent,
  splitGitPaths
} from "../scripts/cleanup-content-equivalent-branches.mjs";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

test("main, protected, active PR and operational branches cannot be cleaned", () => {
  const b = name => ({ name, protected: false });
  assert.equal(candidateForContentCleanup(b("main")), false);
  assert.equal(candidateForContentCleanup({ ...b("feat/keep"), protected: true }), false);
  assert.equal(candidateForContentCleanup(b("feat/open"), new Set(["feat/open"])), false);
  for (const prefix of ["ops/", "release/", "hotfix/", "deploy/", "production/", "prod/", "staging/", "backup/"]) {
    assert.equal(candidateForContentCleanup(b(prefix + "retain")), false, prefix);
  }
  assert.equal(candidateForContentCleanup(b("fix/resend-webhook-bounded-body-20261011")), true);
});

test("content equivalence requires all exact paths, not a heuristic or partial match", () => {
  assert.equal(contentEquivalent({ changedPaths: ["a"], remainingDiffPaths: [] }), true);
  assert.equal(contentEquivalent({ changedPaths: ["a", "b"], remainingDiffPaths: ["b"] }), false);
  assert.equal(contentEquivalent({ changedPaths: [], remainingDiffPaths: [] }), false);
  assert.equal(contentEquivalent({ changedPaths: Array.from({ length: 501 }, (_, i) => String(i)), remainingDiffPaths: [] }), false);
  assert.deepEqual(splitGitPaths("a\0dir/b\0"), ["a", "dir/b"]);
  assert.throws(() => splitGitPaths("unterminated"), /Malformed/);
});

test("real Git history: independently committed identical files can be removed, unique files must remain", () => {
  const dir = mkdtempSync(join(tmpdir(), "terumbu-content-audit-"));
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    git("init", "-b", "main");
    git("config", "user.email", "ci@example.invalid");
    git("config", "user.name", "Terumbu CI");
    writeFileSync("a.txt", "initial\n");
    writeFileSync("b.txt", "initial\n");
    git("add", ".");
    git("commit", "-m", "base");
    const base = git("rev-parse", "HEAD");

    git("switch", "-c", "equivalent");
    writeFileSync("a.txt", "shared change\n");
    git("add", ".");
    git("commit", "-m", "apply same change from feature");
    const equivalentSha = git("rev-parse", "HEAD");

    git("switch", "-c", "unique", base);
    writeFileSync("a.txt", "shared change\n");
    writeFileSync("b.txt", "branch only data\n");
    git("add", ".");
    git("commit", "-m", "change two files");
    const uniqueSha = git("rev-parse", "HEAD");

    git("switch", "main");
    writeFileSync("a.txt", "shared change\n");
    git("add", ".");
    git("commit", "-m", "land shared change independently");
    const mainSha = git("rev-parse", "HEAD");
    const same = assessBranchSnapshot(mainSha, equivalentSha);
    assert.equal(same.equivalent, true);
    assert.equal(same.changedPaths, 1);
    assert.deepEqual(same.novelPaths, []);

    const different = assessBranchSnapshot(mainSha, uniqueSha);
    assert.equal(different.equivalent, false);
    assert.deepEqual(different.novelPaths, ["b.txt"]);
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
});
