import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const verifyScript = join(root, "scripts/validate-manual-deploy.sh");
const headResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(headResult.status, 0, "Git HEAD must be available in CI");
const sha = headResult.stdout.trim();

const clean = Object.fromEntries(Object.entries(process.env)
  .filter(([key]) => !key.startsWith("GITHUB_") &&
    !["REQUESTED_SHA", "REQUESTED_CONFIRM", "CHANGE_TICKET"].includes(key)));
const approved = {
  GITHUB_EVENT_NAME: "workflow_dispatch",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: sha,
  REQUESTED_SHA: sha,
  REQUESTED_CONFIRM: "true",
  CHANGE_TICKET: "TERUMBU-RELEASE-2026-10"
};

function probe(overrides = {}) {
  return spawnSync("bash", [verifyScript], {
    cwd: root,
    env: { ...clean, ...approved, ...overrides },
    encoding: "utf8",
    timeout: 5000
  });
}

test("manual production gate permits an exact SHA, approval and an optional release reference", () => {
  assert.match(sha, /^[a-f0-9]{40}$/);
  const result = probe();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Production deployment authorization passed/);
  assert.ok(!result.stdout.includes("MIDTRANS_SERVER_KEY"));
});

test("main push authorizes automatic release without manual confirmation", () => {
  const result = probe({ GITHUB_EVENT_NAME: "push", REQUESTED_CONFIRM: "" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Trigger: push/);
});

test("pull requests, schedules, tags and non-main pushes never deploy", () => {
  for (const eventName of ["pull_request", "schedule", "workflow_run", ""]) {
    assert.equal(probe({ GITHUB_EVENT_NAME: eventName }).status, 1, eventName);
  }
  assert.equal(probe({ GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/feature" }).status, 1);
  assert.equal(probe({ GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/tags/v1" }).status, 1);
});

test("dispatch is main-only and demands an explicitly checked confirmation", () => {
  for (const ref of ["refs/heads/feature", "refs/tags/v1", "", "main"]) {
    assert.equal(probe({ GITHUB_REF: ref }).status, 1, ref);
  }
  for (const value of ["false", "", "1", "yes", "TRUE"]) {
    assert.equal(probe({ REQUESTED_CONFIRM: value }).status, 1, value);
  }
});

test("push and manual releases reject stale, malformed or mismatched commit SHA", () => {
  const different = (sha[0] === "a" ? "b" : "a") + sha.slice(1);
  for (const eventName of ["push", "workflow_dispatch"]) {
    for (const flags of [
      { REQUESTED_SHA: different },
      { GITHUB_SHA: different },
      { REQUESTED_SHA: sha.slice(1) },
      { REQUESTED_SHA: "" },
      { REQUESTED_SHA: sha.toUpperCase() }
    ]) {
      assert.equal(probe({ GITHUB_EVENT_NAME: eventName, ...flags }).status, 1, `${eventName}: ${JSON.stringify(flags)}`);
    }
  }
});

test("direct approval can use a generated reference without an internal release ticket", () => {
  const result = probe({ CHANGE_TICKET: "" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`Release reference: release-${sha.slice(0, 12)}`));
});

test("unsafe supplied release references are rejected before SSH or migration", () => {
  for (const ticket of [
    "issue", "finance@example.com", "contains spaces",
    "../release", "$(echo unsafe)", "a".repeat(81)
  ]) {
    assert.equal(probe({ CHANGE_TICKET: ticket }).status, 1, ticket);
  }
});

test("workflow auto-deploys main after CI and permits confirmed manual recovery", () => {
  const workflow = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
  assert.match(workflow, /on:\s*\n\s+push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(workflow, /workflow_dispatch:\s*\n\s+inputs:/);
  for (const key of ["release_sha", "release_ticket", "confirm_prod_deploy"]) {
    assert.ok(workflow.includes(key + ":"), "missing dispatch input " + key);
  }
  assert.match(workflow, /release_ticket:\s*\n\s+description: [^\n]+\n\s+required: false/);
  assert.match(workflow, /CHANGE_TICKET: \$\{\{ inputs\.release_ticket \|\| format\('github-run-\{0\}', github\.run_id\) \}\}/);
  assert.match(workflow, /confirm_prod_deploy:[\s\S]*?type: boolean[\s\S]*?default: false/);
  const deploySection = workflow.split(/\n  deploy:\s*\n/)[1]?.split(/\n  external_worker_watch:\s*\n/)[0];
  assert.ok(deploySection, "deploy job missing");
  assert.match(deploySection, /needs: \[verify, e2e\]/);
  assert.match(deploySection, /if: github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.confirm_prod_deploy == true\)\)/);
  assert.match(deploySection, /environment: production/);
  const manualGuard = deploySection.indexOf("bash scripts/validate-manual-deploy.sh");
  const ssh = deploySection.indexOf("- name: Configure SSH");
  assert.ok(manualGuard >= 0 && ssh > manualGuard, "manual guard must precede SSH access");
  const upload = deploySection.indexOf("- name: Upload production env");
  const migration = deploySection.indexOf("- name: Deploy");
  assert.ok(upload > ssh && migration > upload);
  assert.match(deploySection, /DEPLOY_VERSION: \$\{\{ github\.event_name == 'push' && github\.sha \|\| inputs\.release_sha \}\}/);
  assert.match(deploySection, /REQUESTED_SHA: \$\{\{ github\.event_name == 'push' && github\.sha \|\| inputs\.release_sha \}\}/);
  const observer = workflow.split(/\n  external_worker_watch:\s*\n/)[1];
  assert.match(observer, /needs: \[deploy\]/);
  assert.equal((observer.match(/^\s+permissions:/gm) || []).length, 1,
    "GitHub Actions rejects duplicate YAML permissions keys");
  assert.match(observer, /permissions:\s*\n\s+contents: read\s*\n\s+issues: write/);
  assert.match(observer, /if: github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)/);
  assert.match(observer, /node scripts\/monitor-midtrans-refund-sla\.mjs/);
  assert.match(workflow, /bash -n [^\n]*scripts\/validate-manual-deploy\.sh/);
});
