// One-time conservative cleanup of six superseded FX snapshot branches.
// Must retain the 2026-10-28 PR #156 until independently reviewed.
const repo = "bofandra/terumbu";
const expected = [
  ["automation/fx-reference-20261020", "0fbe4d17562e91bc6e58a9f2bf10f3eaf2db4581"],
  ["automation/fx-reference-20261021", "c83f60a7729aa2d2406ae717bae1d1b57f2e543d"],
  ["automation/fx-reference-20261022", "02d237559fa2e72d4c17ffd22ab1da84af3dae78"],
  ["automation/fx-reference-20261023", "16657042ae8a9e0ed88df2905be913c7f8cb6dd5"],
  ["automation/fx-reference-20261026", "4b2bdefed21449d00d0c9442d5b85fc0b0e73667"],
  ["automation/fx-reference-20261027", "465a291508e5d67a2cdf83f5062050afd87a299a"]
];
const apply = process.argv.includes("--apply");
if (!apply && !process.argv.includes("--dry-run")) {
  throw new Error("Specify --dry-run or --apply");
}
if (process.env.GITHUB_REPOSITORY !== repo || !process.env.GITHUB_TOKEN) {
  throw new Error("Requires the target repository and GitHub Actions token");
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
  if (!response.ok) throw new Error(method + " " + path + ": HTTP " + response.status);
  return response.status === 204 ? null : response.json();
}
const prs = await request("pulls?state=open&per_page=100");
if (!Array.isArray(prs) || prs.length >= 100) {
  throw new Error("Cannot safely verify all open pull requests");
}
const currentMain = await request("branches/main");
if (currentMain.commit.sha !== process.env.GITHUB_SHA) {
  throw new Error("main moved; reject stale cleanup run");
}
for (const [name, sha] of expected) {
  const branch = await request("branches/" + encodeURIComponent(name));
  if (branch.commit.sha !== sha) throw new Error("SHA changed: " + name);
  if (prs.some((pr) => pr.head.ref === name)) throw new Error("Open PR exists: " + name);
  const diff = await request("compare/main..." + encodeURIComponent(name));
  if (diff.ahead_by !== 1 || diff.files.length !== 1 || diff.files[0].filename !== "src/data/fx-rates.json") {
    throw new Error("Branch has non-FX changes or unexpected history: " + name);
  }
  console.log("Verified obsolete FX-only branch: " + name + " at " + sha);
}
if (!apply) {
  console.log("Dry run complete: all six exact refs are eligible, no deletion.");
} else {
  for (const [name, sha] of expected) {
    const current = await request("branches/" + encodeURIComponent(name));
    if (current.commit.sha !== sha) throw new Error("Branch moved before deletion: " + name);
    await request("git/refs/heads/" + name.split("/").map(encodeURIComponent).join("/"), "DELETE");
    console.log("Deleted obsolete FX branch: " + name);
  }
}
