// One-time exact merged-PR branch cleanup. Never touches main or open FX PR #156.
const repo = "bofandra/terumbu";
const names = [
  "ops/prune-obsolete-fx-20261029",
  "codex/seo-homepage-metadata",
  "ops/prune-completed-pr-branches-20261029"
];
const apply = process.argv.includes("--apply");
if (!apply && !process.argv.includes("--dry-run")) throw new Error("Pass --dry-run or --apply");
if (process.env.GITHUB_REPOSITORY !== repo || !process.env.GITHUB_TOKEN) {
  throw new Error("This cleanup requires the expected repository and GitHub token");
}
const origin = (process.env.GITHUB_API_URL || "https://api.github.com") + "/repos/" + repo + "/";
async function request(path, method = "GET") {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Authorization: "Bearer " + process.env.GITHUB_TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!response.ok) throw new Error(method + " " + path + ": " + response.status);
  return response.status === 204 ? null : response.json();
}
const current = await request("branches/main");
if (current.commit.sha !== process.env.GITHUB_SHA) throw new Error("main has moved since workflow start");
const [closed, open] = await Promise.all([
  request("pulls?state=closed&per_page=100"),
  request("pulls?state=open&per_page=100")
]);
if (closed.length >= 100 || open.length >= 100) throw new Error("PR result is truncated: abort");
const expectedPrNumbers = new Map([
  ["ops/prune-obsolete-fx-20261029", 159],
  ["codex/seo-homepage-metadata", 158]
]);
const verified = [];
for (const name of names) {
  const matches = closed.filter((pr) => pr.head.ref === name && pr.head.repo?.full_name === repo);
  if (matches.length !== 1) throw new Error("No unique merged PR for " + name);
  const pr = matches[0];
  if (expectedPrNumbers.has(name) && pr.number !== expectedPrNumbers.get(name)) throw new Error("Unexpected PR for " + name);
  if (!pr.merged_at || pr.base.ref !== "main") throw new Error("Not merged into main: " + name);
  if (open.some((entry) => entry.head.ref === name)) throw new Error("Branch in open PR: " + name);
  const branch = await request("branches/" + encodeURIComponent(name));
  if (pr.head.sha !== branch.commit.sha) throw new Error("Branch moved after merge: " + name);
  const comparison = await request("compare/main..." + encodeURIComponent(name));
  if (comparison.ahead_by !== 0) throw new Error("Branch has unmerged history: " + name);
  verified.push([name, branch.commit.sha]);
  console.log("Verified fully merged branch " + name + " at " + branch.commit.sha);
}
if (!apply) {
  console.log("Dry-run successful; no branches deleted.");
} else {
  for (const [name, sha] of verified) {
    const latest = await request("branches/" + encodeURIComponent(name));
    if (latest.commit.sha !== sha) throw new Error("Branch changed before delete: " + name);
    await request("git/refs/heads/" + name.split("/").map(encodeURIComponent).join("/"), "DELETE");
    console.log("Deleted fully merged branch: " + name);
  }
}
