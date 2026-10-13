import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPOSITORY = "bofandra/terumbu";
const DEFAULT_BRANCH = "main";
const RETAIN_PREFIXES = ["ops/", "release/", "hotfix/", "deploy/", "production/", "prod/", "staging/", "backup/"];
const MAX_BRANCHES = 250;
const MAX_CHANGED_PATHS = 500;

export function candidateForContentCleanup(branch, activePullBranches = new Set()) {
  if (!branch || typeof branch.name !== "string" || !branch.name ||
      branch.name === DEFAULT_BRANCH || branch.protected || activePullBranches.has(branch.name)) {
    return false;
  }
  return !RETAIN_PREFIXES.some(prefix => branch.name.startsWith(prefix));
}

/**
 * Snapshot equivalence is deliberately stronger than "similar semantics".
 * All paths touched since the branch diverged must have exactly the same
 * content, mode and type on the branch and main. Keep anything ambiguous.
 */
export function contentEquivalent({ changedPaths, remainingDiffPaths }) {
  return Array.isArray(changedPaths) && changedPaths.length > 0 &&
    changedPaths.length <= MAX_CHANGED_PATHS &&
    Array.isArray(remainingDiffPaths) && remainingDiffPaths.length === 0;
}

export function splitGitPaths(stdout) {
  if (!stdout) return [];
  if (!stdout.endsWith("\0")) throw new Error("Malformed NUL-separated Git paths.");
  return stdout.slice(0, -1).split("\0");
}

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8", maxBuffer: 12 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error("Git " + args[0] + " failed (exit " + result.status + ").");
  }
  return result.stdout.trimEnd();
}
function sha(value) { return typeof value === "string" && /^[a-f0-9]{40}$/.test(value); }
function pathspec(path) { return ":(literal)" + path; }
function pathsChanged(base, head, scopedPaths = null) {
  const args = ["diff", "--no-ext-diff", "--no-renames", "--name-only", "-z", base, head];
  if (scopedPaths) args.push("--", ...scopedPaths.map(pathspec));
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error("Git diff failed.");
  return splitGitPaths(result.stdout);
}

export function assessBranchSnapshot(mainSha, headSha) {
  if (!sha(mainSha) || !sha(headSha)) throw new Error("Cannot audit untrusted commit SHA.");
  const mergeBase = git(["merge-base", mainSha, headSha]);
  if (!sha(mergeBase)) throw new Error("No trusted merge base.");
  const changedPaths = pathsChanged(mergeBase, headSha);
  if (changedPaths.length === 0 || changedPaths.length > MAX_CHANGED_PATHS) {
    return { equivalent: false, reason: "empty_or_large_diff", changedPaths: changedPaths.length, novelPaths: [] };
  }
  const novelPaths = pathsChanged(mainSha, headSha, changedPaths);
  return {
    equivalent: contentEquivalent({ changedPaths, remainingDiffPaths: novelPaths }),
    changedPaths: changedPaths.length,
    novelPaths,
    reason: novelPaths.length ? "unique_content" : "content_already_in_main"
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply === dryRun) throw new Error("Specify exactly --apply or --dry-run.");
  if (process.env.GITHUB_REPOSITORY !== REPOSITORY ||
      !process.env.GITHUB_TOKEN) throw new Error("Repository identity or token missing.");
  const headers = {
    Authorization: "Bearer " + process.env.GITHUB_TOKEN,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "terumbu-content-equivalence-cleanup"
  };
  const base = process.env.GITHUB_API_URL || "https://api.github.com";
  async function api(method, path) {
    const response = await fetch(new URL(path, base), {
      method, headers, signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(method + " " + path.split("?")[0] + " HTTP " + response.status);
    return response.status === 204 ? null : response.json();
  }
  async function pages(path) {
    const all = [];
    for (let page = 1; page <= 10; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const batch = await api("GET", path + sep + "per_page=100&page=" + page);
      if (!Array.isArray(batch)) throw new Error("GitHub returned invalid branch page.");
      all.push(...batch);
      if (batch.length < 100) return all;
    }
    throw new Error("Unbounded GitHub API pagination.");
  }

  const repo = await api("GET", "/repos/" + REPOSITORY);
  if (repo.default_branch !== DEFAULT_BRANCH) throw new Error("Unexpected default branch.");
  const mainSha = (await api("GET", "/repos/" + REPOSITORY + "/branches/" + DEFAULT_BRANCH)).commit?.sha;
  if (!sha(mainSha)) throw new Error("Invalid default branch commit.");
  const localHead = git(["rev-parse", "HEAD"]);
  if (localHead !== mainSha || process.env.GITHUB_SHA !== mainSha) {
    throw new Error("Require checkout at exactly the current main SHA.");
  }

  const branches = await pages("/repos/" + REPOSITORY + "/branches");
  if (branches.length > MAX_BRANCHES) throw new Error("Too many branches for this cleanup.");
  const openPulls = await pages("/repos/" + REPOSITORY + "/pulls?state=open");
  const openHeads = new Set(openPulls
    .filter(pr => pr.head?.repo?.full_name === REPOSITORY)
    .map(pr => pr.head.ref));

  const report = {
    repository: REPOSITORY, mainSha, action: apply ? "apply" : "dry-run",
    auditedAt: new Date().toISOString(), inspected: branches.length,
    deleted: 0, preserved: 0, failures: 0, entries: []
  };

  function remember(name, action, reason, extra = {}) {
    report.entries.push({ name, action, reason, ...extra });
    console.log(action + " " + name + " " + reason);
  }

  for (const branch of branches) {
    if (!candidateForContentCleanup(branch, openHeads)) {
      report.preserved++;
      remember(branch.name, "KEEP", "main/protected/open-PR/operations");
      continue;
    }
    const headSha = branch.commit?.sha;
    if (!sha(headSha)) throw new Error("Invalid branch commit.");
    const localSha = git(["rev-parse", "--verify", "refs/remotes/origin/" + branch.name]);
    if (localSha !== headSha) {
      report.preserved++;
      remember(branch.name, "KEEP", "stale local ref");
      continue;
    }
    const audit = assessBranchSnapshot(mainSha, headSha);
    if (!audit.equivalent) {
      report.preserved++;
      remember(branch.name, "KEEP", audit.reason, {
        changedPaths: audit.changedPaths, novelPaths: audit.novelPaths.slice(0, 30),
        novelPathCount: audit.novelPaths.length
      });
      continue;
    }
    const refPath = "/repos/" + REPOSITORY + "/git/ref/heads/" +
      branch.name.split("/").map(encodeURIComponent).join("/");
    const remote = await api("GET", refPath);
    if (remote.object?.sha !== headSha) {
      report.preserved++;
      remember(branch.name, "KEEP", "branch moved since audit");
      continue;
    }
    const currentMain = (await api("GET", "/repos/" + REPOSITORY + "/branches/" + DEFAULT_BRANCH)).commit?.sha;
    if (currentMain !== mainSha) throw new Error("main changed; refusing further deletion.");

    if (!apply) {
      report.preserved++;
      remember(branch.name, "WOULD_DELETE", "identical_content_for_all_changed_paths", {
        changedPaths: audit.changedPaths
      });
      continue;
    }
    try {
      await api("DELETE", "/repos/" + REPOSITORY + "/git/refs/heads/" +
        branch.name.split("/").map(encodeURIComponent).join("/"));
      report.deleted++;
      remember(branch.name, "DELETED", "identical_content_for_all_changed_paths", {
        changedPaths: audit.changedPaths
      });
    } catch (error) {
      report.failures++;
      remember(branch.name, "FAILED", String(error));
    }
  }
  const { entries, ...summary } = report;
  console.log("CONTENT_BRANCH_AUDIT_SUMMARY=" + JSON.stringify(summary));
  writeFileSync("terumbu-content-branch-audit.json", JSON.stringify(report, null, 2) + "\n");
  if (report.failures) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error("Content-equivalence cleanup aborted:", String(error));
    process.exitCode = 1;
  });
}
