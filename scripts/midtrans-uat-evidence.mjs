#!/usr/bin/env node
/**
 * Midtrans merchant sandbox UAT evidence helper.
 *
 * - init: generates a blank sanitized checklist; NEVER fabricates PASS results
 * - assess: verifies completeness of human attestations; NEVER authorizes go-live
 * - probe: authenticated READ-ONLY GET to sandbox Midtrans, returns redacted data
 *
 * Sensitive live credentials, order IDs, and unredacted provider responses must
 * never be written to the evidence package or committed to the repository.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const UAT_CASES = Object.freeze([
  { id: "UAT-01", name: "Donation settlement, signed webhook and provider GET", source: "merchant_sandbox" },
  { id: "UAT-02", name: "Expedition checkout, seat hold and settlement", source: "merchant_sandbox" },
  { id: "UAT-03", name: "Concurrent final-seat payments and compensation", source: "merchant_sandbox" },
  { id: "UAT-04", name: "Duplicate, reordered and missing webhook recovery", source: "merchant_sandbox" },
  { id: "UAT-05", name: "Denied, expired and cancelled checkout", source: "merchant_sandbox" },
  { id: "UAT-06", name: "Provider GET outage and refund retry protections", source: "merchant_sandbox" },
  { id: "UAT-07", name: "Full eligible and unsupported-method refund", source: "merchant_sandbox" },
  { id: "UAT-08", name: "Partial refund and chargeback distinction", source: "merchant_sandbox" },
  { id: "UAT-09", name: "Later acquiring-bank refund acknowledgment", source: "merchant_sandbox" },
  { id: "UAT-10", name: "Browser status privacy and guest device recovery", source: "staging_rehearsal" },
  { id: "UAT-11", name: "Admin follow-up, duplicate form and credit dispute", source: "staging_rehearsal" },
  { id: "UAT-12", name: "Worker interruption, migration and rollback rehearsal", source: "staging_rehearsal" }
]);
export const APPROVAL_ROLES = Object.freeze([
  "product_owner", "payment_engineer", "operations_support",
  "finance", "security_privacy", "release_engineer"
]);
const evidenceRef = /^[A-Za-z0-9][A-Za-z0-9._-]{5,79}$/;
const testerRef = /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/;
const sha256 = /^[a-f0-9]{64}$/;
const ALL_STATUSES = ["not_run", "pass", "fail", "blocked"];
const textId = (x, pattern) => typeof x === "string" && pattern.test(x);
const plain = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const strictKeys = (obj, keys) => Object.keys(obj).every(key => keys.includes(key));
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function validObservedAt(s, now) {
  if (typeof s !== "string" || !ISO_TIMESTAMP.test(s)) return false;
  const t = new Date(s).getTime();
  return Number.isFinite(t) && t >= Date.UTC(2025, 0, 1) && t <= now.getTime() + 300000;
}

export function initialUatEvidence() {
  return {
    schemaVersion: 1,
    environment: "sandbox",
    scenarios: UAT_CASES.map((row) => ({
      id: row.id,
      status: "not_run",
      source: row.source,
      evidenceRef: "",
      evidenceSha256: "",
      testerId: "",
      observedAt: ""
    })),
    approvals: APPROVAL_ROLES.map((role) => ({
      role,
      status: "pending",
      evidenceRef: "",
      approverId: "",
      approvedAt: ""
    }))
  };
}

/**
 * The tool validates evidence *format and coverage*, not provider authenticity.
 * A human can falsify a spreadsheet too; independent audit must verify the
 * underlying restricted evidence and approve release separately.
 */
export function assessUatEvidence(document, now = new Date()) {
  const rejected = () => ({ valid: false, decision: "NO_GO", reason: "invalid_evidence_format" });
  if (!plain(document) || !strictKeys(document, ["schemaVersion", "environment", "scenarios", "approvals"]) ||
      document.schemaVersion !== 1 || document.environment !== "sandbox" ||
      !Array.isArray(document.scenarios) || document.scenarios.length !== UAT_CASES.length ||
      !Array.isArray(document.approvals) || document.approvals.length !== APPROVAL_ROLES.length) return rejected();

  const cases = new Map(UAT_CASES.map(row => [row.id, row]));
  const seen = new Set();
  const counts = { pass: 0, fail: 0, blocked: 0, not_run: 0 };
  for (const row of document.scenarios) {
    if (!plain(row) ||
        !strictKeys(row, ["id", "status", "source", "evidenceRef", "evidenceSha256", "testerId", "observedAt"]) ||
        typeof row.id !== "string" || !cases.has(row.id) || seen.has(row.id) ||
        !ALL_STATUSES.includes(row.status) || row.source !== cases.get(row.id).source) return rejected();
    seen.add(row.id);
    if (row.status === "pass") {
      if (!textId(row.evidenceRef, evidenceRef) ||
          !textId(row.evidenceSha256, sha256) ||
          !textId(row.testerId, testerRef) ||
          !validObservedAt(row.observedAt, now)) return rejected();
    } else if (row.status === "not_run") {
      if (row.evidenceRef !== "" || row.evidenceSha256 !== "" ||
          row.testerId !== "" || row.observedAt !== "") return rejected();
    } else {
      // Failed/blocked cases also need traceable, restricted evidence; a
      // negative result cannot be silently discarded.
      if (!textId(row.evidenceRef, evidenceRef) || !textId(row.evidenceSha256, sha256) ||
          !textId(row.testerId, testerRef) || !validObservedAt(row.observedAt, now)) return rejected();
    }
    counts[row.status] += 1;
  }

  const roles = new Set();
  let approvals = 0;
  for (const row of document.approvals) {
    if (!plain(row) || !strictKeys(row, ["role", "status", "evidenceRef", "approverId", "approvedAt"]) ||
        typeof row.role !== "string" || !APPROVAL_ROLES.includes(row.role) ||
        roles.has(row.role) || !["pending", "approved", "rejected"].includes(row.status)) return rejected();
    roles.add(row.role);
    if (row.status === "approved" || row.status === "rejected") {
      if (!textId(row.evidenceRef, evidenceRef) || !textId(row.approverId, testerRef) ||
          !validObservedAt(row.approvedAt, now)) return rejected();
      if (row.status === "approved") approvals++;
    } else if (row.evidenceRef !== "" || row.approverId !== "" || row.approvedAt !== "") return rejected();
  }

  const reviewReady = counts.pass === UAT_CASES.length && approvals === APPROVAL_ROLES.length;
  return {
    valid: true,
    environment: "sandbox",
    decision: "NO_GO",
    reviewReady,
    scenarioCounts: counts,
    approvedRoles: approvals,
    requiredRoles: APPROVAL_ROLES.length,
    explanation: reviewReady
      ? "All scenarios and role approvals are documented. Independent evidence verification and an authorized go-live decision are still required."
      : "Incomplete, failed or blocked UAT and/or missing approvals. Live Midtrans payments must remain disabled."
  };
}

export async function readOnlySandboxProbe(env = process.env, fetcher = fetch, now = new Date()) {
  if (env.MIDTRANS_ENV !== "sandbox" || typeof env.MIDTRANS_SERVER_KEY !== "string" ||
      env.MIDTRANS_SERVER_KEY.length < 3 || !textId(env.MIDTRANS_SANDBOX_ORDER_ID, /^[A-Za-z0-9_-]{1,100}$/)) {
    throw new Error("Sandbox-only probe requires MIDTRANS_ENV=sandbox and merchant sandbox credentials/order ID.");
  }
  const url = "https://api.sandbox.midtrans.com/v2/" +
    encodeURIComponent(env.MIDTRANS_SANDBOX_ORDER_ID) + "/status";
  const response = await fetcher(url, {
    method: "GET",
    headers: {
      Authorization: "Basic " + Buffer.from(env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
      Accept: "application/json"
    },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error("Sandbox GET Status unavailable (HTTP " + response.status + ").");
  const raw = await response.text();
  if (raw.length > 32768) throw new Error("Sandbox response too large.");
  let status;
  try { status = JSON.parse(raw); }
  catch { throw new Error("Invalid sandbox provider response."); }
  const allowed = ["pending", "settlement", "capture", "deny", "expire", "cancel",
    "failure", "refund", "partial_refund", "chargeback", "authorize"];
  if (!plain(status) || status.order_id !== env.MIDTRANS_SANDBOX_ORDER_ID ||
      !allowed.includes(status.transaction_status)) {
    throw new Error("Sandbox provider order/status validation failed.");
  }
  return {
    schemaVersion: 1,
    environment: "sandbox",
    observationType: "read_only_get_status",
    observedAt: now.toISOString(),
    orderMatched: true,
    transactionStatus: status.transaction_status,
    refundEntries: Array.isArray(status.refunds) ? Math.min(50, status.refunds.length) : 0,
    bankConfirmationFieldPresent: Array.isArray(status.refunds) &&
      status.refunds.some(x => plain(x) && typeof x.bank_confirmed_at === "string"),
    scenarioVerdict: "not_assessed",
    note: "Observation only. Never treat GET Status alone as proof of full UAT scenario success or customer credit."
  };
}

async function run() {
  const [operation, filename] = process.argv.slice(2);
  if (operation === "init" && filename) {
    // Refuse to overwrite an existing file; file has no secrets and is blank
    // until restricted evidence references are entered by the tester.
    await writeFile(filename, JSON.stringify(initialUatEvidence(), null, 2) + "\n",
      { flag: "wx", mode: 0o600 });
    console.log("Blank UAT checklist created; every scenario is NOT RUN. NO-GO.");
    return;
  }
  if (operation === "assess" && filename) {
    const raw = await readFile(filename, "utf8");
    if (raw.length > 256000) throw new Error("Evidence document too large.");
    const assessment = assessUatEvidence(JSON.parse(raw));
    const digest = createHash("sha256").update(raw).digest("hex");
    console.log(JSON.stringify({ ...assessment, evidenceDocumentSha256: digest }, null, 2));
    if (!assessment.valid || !assessment.reviewReady) process.exitCode = 1;
    return;
  }
  if (operation === "probe" && !filename) {
    console.log(JSON.stringify(await readOnlySandboxProbe(), null, 2));
    return;
  }
  throw new Error("Usage: midtrans-uat-evidence.mjs init <local-evidence.json> | assess <local-evidence.json> | probe");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  run().catch(() => {
    // Never echo untrusted provider payloads, paths or environment secrets.
    console.error("Midtrans UAT tool failed: check command, sandbox prerequisites and sanitized evidence format.");
    process.exitCode = 2;
  });
}
