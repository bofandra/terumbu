#!/usr/bin/env node
/**
 * Read-only integrity check of Terumbu's incremental Midtrans PR stack.
 *
 * All existing PRs intentionally target main for full GitHub Actions CI.
 * This check documents ancestry order rather than mutating bases/merging
 * anything. It cannot approve payment production releases.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const REQUIRED_MIDTRANS_PRS = Object.freeze([
  112, 113, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125
]);

const SHA = /^[a-f0-9]{40}$/;
const prName = /^[a-zA-Z0-9_.-]+$/;
export function inspectMidtransStack(prs, comparisons) {
  if (!Array.isArray(prs) || !Array.isArray(comparisons)) {
    return { valid: false, decision: "NO_GO", reason: "missing_pr_evidence" };
  }
  const byNumber = new Map();
  for (const row of prs) {
    if (!row || !Number.isInteger(row.number) || byNumber.has(row.number) ||
        !SHA.test(row.headSha || "") || !prName.test(row.headBranch || "") ||
        !["open", "closed"].includes(row.state) || typeof row.draft !== "boolean" ||
        !["main"].includes(row.baseBranch)) {
      return { valid: false, decision: "NO_GO", reason: "invalid_pr_metadata" };
    }
    byNumber.set(row.number, row);
  }
  const missing = REQUIRED_MIDTRANS_PRS.filter(id => !byNumber.has(id));
  if (missing.length) return { valid: false, decision: "NO_GO", reason: "missing_expected_pr", missing };

  const edges = new Map(comparisons.map(row =>
    [String(row.from) + ":" + String(row.to), row]));
  const badAncestry = [];
  for (let i = 1; i < REQUIRED_MIDTRANS_PRS.length; i++) {
    const first = REQUIRED_MIDTRANS_PRS[i - 1];
    const second = REQUIRED_MIDTRANS_PRS[i];
    const edge = edges.get(first + ":" + second);
    if (!edge || !["ahead", "identical"].includes(edge.status) ||
        edge.behindBy !== 0 || edge.aheadBy <= 0 ||
        !Number.isSafeInteger(edge.aheadBy)) badAncestry.push(first + "->" + second);
  }

  const pending = REQUIRED_MIDTRANS_PRS
    .filter(id => byNumber.get(id).state === "open" || byNumber.get(id).draft);
  return {
    valid: badAncestry.length === 0,
    decision: "NO_GO",
    readyForHumanMergeReview: missing.length === 0 && badAncestry.length === 0,
    readyForAutomaticMerge: false,
    mergeOrder: [...REQUIRED_MIDTRANS_PRS],
    awaitingReview: pending,
    badAncestry,
    note: "Correct ancestry is a prerequisite for review, not consent to merge, deploy, or enable production payments."
  };
}

async function githubJson(path, fetcher, token) {
  const r = await fetcher("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error("GitHub metadata unavailable (HTTP " + r.status + ")");
  return r.json();
}

/** Fetch ONLY public PR snapshots and compare endpoint; no writes. */
export async function inspectRemoteMidtransStack({
  repo = "bofandra/terumbu", fetcher = fetch, token = ""
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("Invalid GitHub repository.");
  }
  const prs = [];
  for (const id of REQUIRED_MIDTRANS_PRS) {
    const p = await githubJson("/repos/" + repo + "/pulls/" + id, fetcher, token);
    prs.push({
      number: p.number,
      state: p.state,
      draft: p.draft,
      headSha: p.head?.sha,
      headBranch: p.head?.ref,
      baseBranch: p.base?.ref
    });
  }
  const comparisons = [];
  for (let i = 1; i < prs.length; i++) {
    const left = prs[i - 1];
    const right = prs[i];
    if (!SHA.test(left.headSha || "") || !SHA.test(right.headSha || "")) {
      throw new Error("GitHub returned invalid commit identity.");
    }
    const comparison = await githubJson(
      "/repos/" + repo + "/compare/" + left.headSha + "..." + right.headSha,
      fetcher, token
    );
    comparisons.push({
      from: left.number,
      to: right.number,
      status: comparison.status,
      aheadBy: comparison.ahead_by,
      behindBy: comparison.behind_by
    });
  }
  return inspectMidtransStack(prs, comparisons);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  inspectRemoteMidtransStack({ token: process.env.GITHUB_TOKEN || "" })
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
      if (!report.valid) process.exitCode = 1;
    })
    .catch(() => {
      console.error("Unable to verify Midtrans PR ancestry and review sequence.");
      process.exitCode = 2;
    });
}
