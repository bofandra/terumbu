import { pathToFileURL } from "node:url";

const REPOSITORY = "bofandra/terumbu";
const DEFAULT_BRANCH = "main";
const RETAIN_BRANCH_PREFIXES = ["ops/", "release/", "hotfix/", "deploy/", "production/", "prod/", "staging/", "backup/"];
const MAX_BRANCHES = 250;

export function safeToDeleteMergedBranch(branch, compare, openPullBranches = new Set()) {
  if (!branch || !branch.name || branch.name === DEFAULT_BRANCH || branch.protected) return false;
  if (RETAIN_BRANCH_PREFIXES.some(prefix => branch.name.startsWith(prefix))) return false;
  if (openPullBranches.has(branch.name)) return false;
  return compare?.behind_by === 0 && ["ahead", "identical"].includes(compare.status);
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply && !process.argv.includes("--dry-run")) {
    throw new Error("Explicit --dry-run or --apply argument required.");
  }
  if (process.env.GITHUB_REPOSITORY !== REPOSITORY) {
    throw new Error("Repository mismatch; refusing to delete any branches.");
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required.");
  const apiBase = process.env.GITHUB_API_URL || "https://api.github.com";
  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "terumbu-merged-branch-cleanup"
  };

  async function api(method, path) {
    const response = await fetch(new URL(path, apiBase), { method, headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(method + " " + path.split("?")[0] + " returned HTTP " + response.status);
    if (response.status === 204) return null;
    return response.json();
  }
  async function allPages(path, property) {
    const result = [];
    for (let page = 1; page <= 10; page++) {
      const separator = path.includes("?") ? "&" : "?";
      const data = await api("GET", path + separator + "per_page=100&page=" + page);
      const batch = property ? data[property] : data;
      if (!Array.isArray(batch)) throw new Error("Malformed GitHub pagination response.");
      result.push(...batch);
      if (batch.length < 100) return result;
    }
    throw new Error("Too many pages; aborting cleanup.");
  }

  const repo = await api("GET", "/repos/" + REPOSITORY);
  if (repo.default_branch !== DEFAULT_BRANCH) throw new Error("Unexpected default branch, aborting.");
  const main = await api("GET", "/repos/" + REPOSITORY + "/branches/" + DEFAULT_BRANCH);
  const initialMainSha = main.commit?.sha;
  if (!/^[a-f0-9]{40}$/.test(initialMainSha ?? "")) throw new Error("Could not confirm main SHA.");
  if (apply && process.env.GITHUB_SHA !== initialMainSha) {
    throw new Error("GitHub Actions checkout is not current main HEAD. Refusing cleanup.");
  }

  const branches = await allPages("/repos/" + REPOSITORY + "/branches");
  if (branches.length > MAX_BRANCHES) throw new Error("Unexpected branch count; aborting cleanup.");
  const openPulls = await allPages("/repos/" + REPOSITORY + "/pulls?state=open");
  const openHeads = new Set(openPulls.filter(pr => pr.head?.repo?.full_name === REPOSITORY).map(pr => pr.head.ref));

  let removed = 0;
  let preserved = 0;
  let failures = 0;
  for (const branch of branches) {
    if (branch.name === DEFAULT_BRANCH || branch.protected ||
        RETAIN_BRANCH_PREFIXES.some(prefix => branch.name.startsWith(prefix)) ||
        openHeads.has(branch.name)) {
      preserved++;
      console.log("KEEP protected, active, default, or operations branch:", branch.name);
      continue;
    }
    const sha = branch.commit?.sha;
    if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Invalid branch SHA for " + branch.name);
    // Compare *immutable commit IDs*, not mutable branch names, to establish ancestry.
    const compare = await api("GET",
      "/repos/" + REPOSITORY + "/compare/" + encodeURIComponent(sha) + "..." + initialMainSha);
    if (!safeToDeleteMergedBranch(branch, compare, openHeads)) {
      preserved++;
      console.log("KEEP unmerged/diverged branch:", branch.name, "unmerged_commits=" + compare.behind_by);
      continue;
    }

    // Validate the ref has not moved since it was listed. A concurrent writer
    // after this check is still theoretically possible; don't run during active branch work.
    const refPath = "/repos/" + REPOSITORY + "/git/ref/heads/" +
      branch.name.split("/").map(encodeURIComponent).join("/");
    const current = await api("GET", refPath);
    if (current.object?.sha !== sha) {
      preserved++;
      console.log("KEEP branch changed during audit:", branch.name);
      continue;
    }
    if (!apply) {
      console.log("WOULD_DELETE fully merged branch:", branch.name);
    } else {
      try {
        await api("DELETE", "/repos/" + REPOSITORY + "/git/refs/heads/" +
          branch.name.split("/").map(encodeURIComponent).join("/"));
        removed++;
        console.log("DELETED fully merged branch:", branch.name);
      } catch (error) {
        failures++;
        console.error("FAILED deleting branch:", branch.name, String(error));
      }
    }
  }
  console.log(JSON.stringify({
    action: apply ? "apply" : "dry-run", main: initialMainSha,
    inspected: branches.length, deleted: removed, preserved, failures
  }));
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error("Merged branch cleanup aborted:", String(error));
    process.exitCode = 1;
  });
}
