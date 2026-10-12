import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  UAT_CASES, APPROVAL_ROLES, initialUatEvidence,
  assessUatEvidence, readOnlySandboxProbe
} from "../scripts/midtrans-uat-evidence.mjs";
import {
  REQUIRED_MIDTRANS_PRS, inspectMidtransStack, inspectRemoteMidtransStack
} from "../scripts/midtrans-pr-stack.mjs";

const now = new Date("2026-10-13T04:00:00.000Z");
const proofHash = "a".repeat(64);

function completeEvidence() {
  const doc = initialUatEvidence();
  doc.scenarios.forEach((row, i) => {
    row.status = "pass";
    row.evidenceRef = "SANDBOX-TEST-" + (i + 1);
    row.evidenceSha256 = proofHash;
    row.testerId = "engineer_01";
    row.observedAt = "2026-10-12T08:00:00.000Z";
  });
  doc.approvals.forEach((row, i) => {
    row.status = "approved";
    row.evidenceRef = "APPROVAL-TICKET-" + (i + 1);
    row.approverId = "reviewer_01";
    row.approvedAt = "2026-10-12T10:00:00.000Z";
  });
  return doc;
}

test("UAT template starts with twelve NOT RUN scenarios and six pending roles; always NO_GO", () => {
  const template = initialUatEvidence();
  assert.equal(UAT_CASES.length, 12);
  assert.equal(APPROVAL_ROLES.length, 6);
  assert.deepEqual(template.scenarios.map(row => row.id), UAT_CASES.map(row => row.id));
  assert.ok(template.scenarios.every(row => row.status === "not_run" && !row.evidenceRef));
  const summary = assessUatEvidence(template, now);
  assert.equal(summary.valid, true);
  assert.equal(summary.scenarioCounts.not_run, 12);
  assert.equal(summary.reviewReady, false);
  assert.equal(summary.decision, "NO_GO");
});

test("full human-entered evidence is review-ready only, never machine-authorized to go live", () => {
  const result = assessUatEvidence(completeEvidence(), now);
  assert.equal(result.valid, true);
  assert.equal(result.reviewReady, true);
  assert.equal(result.decision, "NO_GO");
  assert.equal(result.scenarioCounts.pass, 12);
  assert.equal(result.approvedRoles, 6);
  const incomplete = completeEvidence();
  incomplete.approvals[3] = { ...initialUatEvidence().approvals[3] };
  assert.equal(assessUatEvidence(incomplete, now).reviewReady, false);
});

test("a PASS without independently traceable evidence, wrong sources or duplicate scenarios is rejected", () => {
  const variants = [
    x => { x.scenarios[0].evidenceSha256 = ""; },
    x => { x.scenarios[0].evidenceRef = "customer@example.com"; },
    x => { x.scenarios[0].testerId = ""; },
    x => { x.scenarios[0].source = "mocked_unit_test"; },
    x => { x.scenarios[0].observedAt = "2038-01-01T01:00:00.000Z"; },
    x => { x.scenarios[0].rawOrderId = "TRB-DON-private"; },
    x => { x.scenarios[0].secretKey = "SB-Mid-secret"; },
    x => { x.scenarios[1].id = x.scenarios[0].id; },
    x => { x.scenarios.pop(); },
    x => { x.approvals[0].evidenceRef = ""; },
    x => { x.approvals[1].role = x.approvals[0].role; },
    x => { x.environment = "production"; },
    x => { x.merchantKey = "do-not-store"; }
  ];
  for (const mutate of variants) {
    const doc = completeEvidence();
    mutate(doc);
    assert.deepEqual(assessUatEvidence(doc, now), {
      valid: false, decision: "NO_GO", reason: "invalid_evidence_format"
    });
  }
});

test("FAIL and BLOCKED remain visible, never quietly counted as complete", () => {
  const doc = completeEvidence();
  doc.scenarios[0].status = "fail";
  doc.scenarios[1].status = "blocked";
  const summary = assessUatEvidence(doc, now);
  assert.equal(summary.valid, true);
  assert.equal(summary.reviewReady, false);
  assert.deepEqual(summary.scenarioCounts, { pass: 10, fail: 1, blocked: 1, not_run: 0 });
});

test("sandbox probe uses GET only, emits redacted observation and never declares PASS", async () => {
  let calls = 0;
  const secret = "SB-mid-sandbox-only";
  const env = {
    MIDTRANS_ENV: "sandbox",
    MIDTRANS_SERVER_KEY: secret,
    MIDTRANS_SANDBOX_ORDER_ID: "TRB-DON-test-order"
  };
  const fetcher = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.sandbox.midtrans.com/v2/TRB-DON-test-order/status");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization,
      "Basic " + Buffer.from(secret + ":").toString("base64"));
    return new Response(JSON.stringify({
      order_id: env.MIDTRANS_SANDBOX_ORDER_ID,
      transaction_status: "refund",
      refunds: [{ bank_confirmed_at: "2026-10-12 17:30:00",
        refund_key: "private-provider-key", transaction_id: "private-transaction" }],
      transaction_id: "private-record",
      customer_details: { email: "customer@example.org" }
    }), { status: 200 });
  };
  const result = await readOnlySandboxProbe(env, fetcher, now);
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    schemaVersion: 1, environment: "sandbox",
    observationType: "read_only_get_status",
    observedAt: now.toISOString(),
    orderMatched: true, transactionStatus: "refund",
    refundEntries: 1, bankConfirmationFieldPresent: true,
    scenarioVerdict: "not_assessed",
    note: "Observation only. Never treat GET Status alone as proof of full UAT scenario success or customer credit."
  });
  const str = JSON.stringify(result);
  for (const sensitive of [secret, env.MIDTRANS_SANDBOX_ORDER_ID,
    "private-provider-key", "private-transaction", "customer@example.org"]) {
    assert.equal(str.includes(sensitive), false);
  }
});

test("sandbox probe refuses production, wrong order or malformed status without leaking data", async () => {
  const env = {
    MIDTRANS_ENV: "production", MIDTRANS_SERVER_KEY: "sb-key",
    MIDTRANS_SANDBOX_ORDER_ID: "TRB-DON-test"
  };
  let calls = 0;
  await assert.rejects(readOnlySandboxProbe(env, async () => { calls++; }), /Sandbox-only/);
  assert.equal(calls, 0);
  await assert.rejects(readOnlySandboxProbe(
    { ...env, MIDTRANS_ENV: "sandbox" },
    async () => new Response('{"order_id":"someone-else","transaction_status":"settlement"}', { status: 200 })
  ), /validation failed/);
  await assert.rejects(readOnlySandboxProbe(
    { ...env, MIDTRANS_ENV: "sandbox" },
    async () => new Response("upstream credentials", { status: 503 })
  ), /GET Status unavailable \(HTTP 503\)/);
});

test("UAT CLI cannot overwrite evidence and a blank template returns NO_GO", () => {
  const directory = mkdtempSync(join(tmpdir(), "terumbu-sandbox-uat-"));
  const filename = join(directory, "private-evidence.json");
  const script = join(process.cwd(), "scripts/midtrans-uat-evidence.mjs");
  try {
    const created = spawnSync(process.execPath, [script, "init", filename], { encoding: "utf8" });
    assert.equal(created.status, 0);
    assert.equal(JSON.parse(readFileSync(filename, "utf8")).scenarios.length, 12);
    assert.equal(spawnSync(process.execPath, [script, "init", filename]).status, 2);
    const assessed = spawnSync(process.execPath, [script, "assess", filename], { encoding: "utf8" });
    assert.equal(assessed.status, 1);
    const json = JSON.parse(assessed.stdout);
    assert.equal(json.decision, "NO_GO");
    assert.match(json.evidenceDocumentSha256, /^[a-f0-9]{64}$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

const stack = REQUIRED_MIDTRANS_PRS.map((number, index) => ({
  number, headSha: String(index + 1).padStart(40, "a"),
  headBranch: "feature-" + number,
  state: "open", draft: true, baseBranch: "main"
}));
const edges = REQUIRED_MIDTRANS_PRS.slice(1).map((to, i) => ({
  from: REQUIRED_MIDTRANS_PRS[i], to, status: "ahead", aheadBy: 2, behindBy: 0
}));

test("PR stack validation yields review order but never approval to merge", () => {
  const assessment = inspectMidtransStack(stack, edges);
  assert.equal(assessment.valid, true);
  assert.equal(assessment.readyForHumanMergeReview, true);
  assert.equal(assessment.readyForAutomaticMerge, false);
  assert.equal(assessment.decision, "NO_GO");
  assert.deepEqual(assessment.mergeOrder, REQUIRED_MIDTRANS_PRS);
});

test("PR stack blocks missing PR, duplicate metadata, diverged commits and wrong base", () => {
  assert.equal(inspectMidtransStack(stack.slice(1), edges).valid, false);
  assert.equal(inspectMidtransStack([...stack, stack[0]], edges).valid, false);
  assert.equal(inspectMidtransStack(stack, [...edges.slice(0, 3),
    { ...edges[3], status: "diverged", behindBy: 3 },
    ...edges.slice(4)]).valid, false);
  assert.equal(inspectMidtransStack(stack.map((row, i) =>
    i === 3 ? { ...row, baseBranch: "production" } : row), edges).valid, false);
});

test("GitHub ancestry audit uses GET-only PR and compare endpoints, no credentials in output", async () => {
  const seen = [];
  const mock = async (url, options) => {
    seen.push(url);
    assert.equal(options.headers.Authorization, "Bearer unit-test-token");
    assert.equal(options.redirect, "error");
    const id = Number(url.split("/").at(-1));
    if (url.includes("/pulls/")) {
      const p = stack.find(row => row.number === id);
      return new Response(JSON.stringify({
        number: id,
        state: p.state, draft: p.draft,
        head: { sha: p.headSha, ref: p.headBranch },
        base: { ref: p.baseBranch }
      }));
    }
    if (url.includes("/compare/")) {
      return new Response(JSON.stringify({ status: "ahead", behind_by: 0, ahead_by: 2 }));
    }
    throw new Error("unexpected GitHub endpoint");
  };
  const result = await inspectRemoteMidtransStack({
    repo: "bofandra/terumbu", token: "unit-test-token", fetcher: mock
  });
  assert.equal(result.valid, true);
  assert.equal(seen.length, 2 * REQUIRED_MIDTRANS_PRS.length - 1);
  assert.ok(seen.every(url => url.startsWith("https://api.github.com/repos/bofandra/terumbu/")));
  assert.equal(JSON.stringify(result).includes("unit-test-token"), false);
});
