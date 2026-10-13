import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPO = "bofandra/terumbu";
const DEFAULT = "main";
const KEEP = ["ops/", "release/", "hotfix/", "deploy/", "production/", "prod/", "staging/", "backup/"];
const COMPLETED_CLEANUP_BRANCH = "ops/cleanup-merged-branches-20261013";

export function eligibleBranch(branch, openHeads = new Set()) {
  const name = branch?.name;
  if (!name || name === DEFAULT || branch.protected || openHeads.has(name)) return false;
  return name === COMPLETED_CLEANUP_BRANCH || !KEEP.some(prefix => name.startsWith(prefix));
}

// Git patch IDs prove identical changes exist in main. A unique merge commit
// could contain unrepresented conflict resolution, so is always retained.
export function classifyHistory({ ancestor, unmergedCommits, mergeCommits, cherryLines }) {
  if (ancestor === true) return "merged_ancestor";
  if (!Number.isSafeInteger(unmergedCommits) || unmergedCommits <= 0 ||
      !Number.isSafeInteger(mergeCommits) || mergeCommits !== 0 ||
      !Array.isArray(cherryLines) || cherryLines.length !== unmergedCommits) return "preserve";
  return cherryLines.every(line => /^- [0-9a-f]{40}$/.test(line))
    ? "patch_equivalent" : "preserve";
}

function git(args, allowFailure = false) {
  const p = spawnSync("git", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (p.error) throw p.error;
  if (p.status !== 0 && !allowFailure) throw new Error("Git command failed: " + args[0]);
  return p;
}
function output(args) { return git(args).stdout.trim(); }

function checkHistory(main, head) {
  const test = git(["merge-base", "--is-ancestor", head, main], true);
  if (test.status === 0) return { kind: "merged_ancestor", count: 0 };
  if (test.status !== 1) throw new Error("Git ancestry check failed.");
  const range = main + ".." + head;
  const count = Number(output(["rev-list", "--count", range]));
  const merges = Number(output(["rev-list", "--min-parents=2", "--count", range]));
  if (count > 150 || merges > 0) return { kind: "preserve", count };
  const raw = output(["cherry", main, head]);
  const cherryLines = raw ? raw.split("\n") : [];
  return { kind: classifyHistory({
    ancestor: false, unmergedCommits: count, mergeCommits: merges, cherryLines
  }), count };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if ((apply && process.argv.includes("--dry-run")) ||
      (!apply && !process.argv.includes("--dry-run"))) throw new Error("Specify --apply or --dry-run.");
  if (process.env.GITHUB_REPOSITORY !== REPO || !process.env.GITHUB_TOKEN) throw new Error("Invalid repository or missing token.");
  const headers = { Authorization: "Bearer " + process.env.GITHUB_TOKEN,
    Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "terumbu-safe-branch-cleanup" };
  const base = process.env.GITHUB_API_URL || "https://api.github.com";
  async function api(method, path) {
    const r = await fetch(new URL(path, base), { method, headers, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(method + " " + path.split("?")[0] + " HTTP " + r.status);
    return r.status === 204 ? null : r.json();
  }
  async function pages(path) {
    const all = [];
    for (let page = 1; page <= 10; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const batch = await api("GET", path + sep + "per_page=100&page=" + page);
      if (!Array.isArray(batch)) throw new Error("Invalid paginated response.");
      all.push(...batch);
      if (batch.length < 100) return all;
    }
    throw new Error("Pagination limit exceeded.");
  }
  const repo = await api("GET", "/repos/" + REPO);
  if (repo.default_branch !== DEFAULT) throw new Error("Default branch changed.");
  const main = (await api("GET", "/repos/" + REPO + "/branches/" + DEFAULT)).commit?.sha;
  if (!/^[a-f0-9]{40}$/.test(main ?? "")) throw new Error("Cannot confirm main.");
  if (apply && (process.env.GITHUB_SHA !== main || output(["rev-parse", "HEAD"]) !== main)) {
    throw new Error("Not running on the current immutable main commit.");
  }
  const branches = await pages("/repos/" + REPO + "/branches");
  if (branches.length > 250) throw new Error("Too many branches for reviewed cleanup scope.");
  const pulls = await pages("/repos/" + REPO + "/pulls?state=open");
  const active = new Set(pulls.filter(p => p.head?.repo?.full_name === REPO).map(p => p.head.ref));
  const result = { action: apply ? "apply" : "dry-run", main, inspected: branches.length,
    deleted: 0, patchEquivalentDeleted: 0, ancestorDeleted: 0, preserved: 0, failures: 0 };

  for (const branch of branches) {
    if (!eligibleBranch(branch, active)) { result.preserved++; console.log("KEEP restricted:", branch.name); continue; }
    const sha = branch.commit?.sha;
    if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new Error("Invalid branch commit SHA.");
    if (output(["rev-parse", "--verify", "refs/remotes/origin/" + branch.name]) !== sha) {
      result.preserved++; console.log("KEEP ref mismatch:", branch.name); continue;
    }
    const h = checkHistory(main, sha);
    if (h.kind === "preserve") {
      result.preserved++; console.log("KEEP unique changes:", branch.name, "commits=" + h.count); continue;
    }
    const path = "/repos/" + REPO + "/git/ref/heads/" +
      branch.name.split("/").map(encodeURIComponent).join("/");
    const current = await api("GET", path);
    if (current.object?.sha !== sha) {
      result.preserved++; console.log("KEEP branch moved:", branch.name); continue;
    }
    if ((await api("GET", "/repos/" + REPO + "/branches/" + DEFAULT)).commit?.sha !== main) {
      throw new Error("main changed while cleanup was running.");
    }
    if (!apply) { result.preserved++; console.log("WOULD_DELETE", h.kind, branch.name); continue; }
    try {
      await api("DELETE", "/repos/" + REPO + "/git/refs/heads/" +
        branch.name.split("/").map(encodeURIComponent).join("/"));
      result.deleted++;
      if (h.kind === "patch_equivalent") result.patchEquivalentDeleted++;
      else result.ancestorDeleted++;
      console.log("DELETED", h.kind, branch.name);
    } catch (error) {
      result.failures++;
      console.error("DELETE_FAILED", branch.name, String(error));
    }
  }
  console.log("FINAL_CLEANUP_SUMMARY=" + JSON.stringify(result));
  if (result.failures) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error("Patch-equivalent audit aborted:", String(error)); process.exitCode = 1; });
}
