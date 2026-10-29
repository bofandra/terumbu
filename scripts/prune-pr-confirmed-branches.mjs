// One-time conservative cleanup. Only branches whose exact heads were merged through named PRs.
const repo = "bofandra/terumbu";
const expected = [
  {
    "pr": 136,
    "branch": "audit/public-origin-content-integrity-20261018",
    "sha": "5cb04493b19c12f00ea621a28b36234f7fc72412"
  },
  {
    "pr": 141,
    "branch": "feature/evidence-reviewed-sdg-20261018",
    "sha": "53dce3fd4be72f063a35b819596acd0230085c10"
  },
  {
    "pr": 142,
    "branch": "feature/admin-generated-slugs-20261018",
    "sha": "772f0a118bc0830781971c74f4b0ab0e7d2b2f3e"
  },
  {
    "pr": 143,
    "branch": "feature/expedition-publish-readiness-20261018",
    "sha": "b94417947cbe63fa8389f7f81642f16dc9d0d991"
  },
  {
    "pr": 144,
    "branch": "fix/admin-expedition-data-provenance-20261018",
    "sha": "2c854c293f183fe19cb792668fa6b7357c906b81"
  },
  {
    "pr": 145,
    "branch": "feature/admin-expedition-publication-checklist-20261018",
    "sha": "99260599a11f7d5ab6682c984ccee4de4d825c7c"
  },
  {
    "pr": 146,
    "branch": "feature/bookable-departure-readiness-20261018",
    "sha": "e20859b09cbc4e5ab79fec7785bb38324d819fa7"
  },
  {
    "pr": 147,
    "branch": "feature/managed-arrival-language-fields-20261018",
    "sha": "ebab1e1c3e6c7a28ef90aa20ba887e939c00c26c"
  },
  {
    "pr": 148,
    "branch": "feature/live-partner-draft-checks-20261018",
    "sha": "da00cd9721558980c716cf4b4ff13f2254afb5f3"
  },
  {
    "pr": 149,
    "branch": "fix/remove-unsourced-traveler-claims-20261018",
    "sha": "770a4bb642f7c1611f41d8af4fe700c8818df5b6"
  },
  {
    "pr": 150,
    "branch": "fix/auditable-fx-estimates-20261018",
    "sha": "c6e5be552b889ea89510b2bc41201fdb83bb039d"
  },
  {
    "pr": 151,
    "branch": "fix/include-held-seats-in-publication-readiness-20261018",
    "sha": "d4b299e21cb2d9a3c9343e4c69733190ee4f38d0"
  },
  {
    "pr": 152,
    "branch": "feature/scheduled-sourced-fx-reviews-20261018",
    "sha": "6097f63e5a1a69dd5c616e929d39eba61d7d1b59"
  },
  {
    "pr": 153,
    "branch": "feature/managed-departure-defaults-20261018",
    "sha": "34adc50eca0c1db9b34ace1c978492cda99ac11d"
  },
  {
    "pr": 154,
    "branch": "fix/homepage-factual-trust-20261018",
    "sha": "0e75cf56112fce27318c3f4a07f90f02474882f9"
  },
  {
    "pr": 155,
    "branch": "ops/one-time-approved-production-release-20261018",
    "sha": "ffbbbb433fa6b8b0136f654039693a06844e0a5a"
  },
  {
    "pr": 157,
    "branch": "ops/pr-confirmed-branch-pruning-20261029",
    "sha": "69f00cb1952c6e537d8a5a069df19feced26b0ae"
  }
];
const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run");
if (apply === dryRun) throw new Error("Choose exactly --apply or --dry-run");
if (process.env.GITHUB_REPOSITORY !== repo || !/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||"") || !process.env.GITHUB_TOKEN) {
  throw new Error("Missing or invalid GitHub Actions identity");
}
const apiRoot = process.env.GITHUB_API_URL || "https://api.github.com";
async function request(method,path,allow404=false) {
  const res = await fetch(new URL(path,apiRoot), {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"terumbu-pr-confirmed-cleanup"
    },
    signal:AbortSignal.timeout(20000)
  });
  if (res.status === 404 && allow404) return null;
  if (!res.ok) throw new Error(`${method} ${path} HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}
const uri = name => name.split("/").map(encodeURIComponent).join("/");
async function getMain() {
  return (await request("GET", `/repos/${repo}/branches/main`)).commit.sha;
}
if ((await getMain()) !== process.env.GITHUB_SHA) throw new Error("main moved or wrong workflow SHA");
const allOpen = await request("GET",`/repos/${repo}/pulls?state=open&per_page=100`);
if (allOpen.length >= 100) throw new Error("Open PR list may be truncated");
const openBranches = new Set(allOpen.filter(p=>p.head?.repo?.full_name===repo).map(p=>p.head.ref));
const approved = [];
let absent = 0;
for (const item of expected) {
  const pr = await request("GET",`/repos/${repo}/pulls/${item.pr}`);
  if (pr.state !== "closed" || !pr.merged_at || pr.base?.ref !== "main" ||
      pr.head?.repo?.full_name !== repo || pr.head?.ref !== item.branch || pr.head?.sha !== item.sha ||
      openBranches.has(item.branch)) throw new Error(`PR evidence mismatch: #${item.pr}`);
  const branch = await request("GET",`/repos/${repo}/branches/${uri(item.branch)}`,true);
  if (!branch) { absent++; console.log("ALREADY_REMOVED",item.branch); continue; }
  if (branch.name !== item.branch || branch.commit?.sha !== item.sha || branch.protected) {
    throw new Error(`Branch protected or changed: ${item.branch}`);
  }
  approved.push(item);
}
console.log(`PRECHECK OK: ${approved.length} eligible, ${absent} already removed, mode=${apply?"APPLY":"DRY_RUN"}`);
let deleted=0;
for (const item of approved) {
  if ((await getMain()) !== process.env.GITHUB_SHA) throw new Error("main moved during cleanup");
  const ref = await request("GET",`/repos/${repo}/git/ref/heads/${uri(item.branch)}`,true);
  if (!ref) { console.log("ALREADY_REMOVED",item.branch); continue; }
  if (ref.object?.sha !== item.sha) throw new Error(`Branch moved: ${item.branch}`);
  if (!apply) { console.log("WOULD_DELETE",item.branch); continue; }
  await request("DELETE",`/repos/${repo}/git/refs/heads/${uri(item.branch)}`);
  deleted++;
  console.log("DELETED",item.branch);
}
console.log(JSON.stringify({mode:apply?"apply":"dry-run",eligible:approved.length,alreadyRemoved:absent,deleted}));
