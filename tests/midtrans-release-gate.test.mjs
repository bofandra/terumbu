import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const script = join(root, "scripts/validate-midtrans-release.sh");
const clean = Object.fromEntries(Object.entries(process.env)
  .filter(([key]) => !key.startsWith("MIDTRANS_") &&
    !["NEXT_PUBLIC_APP_URL", "CRON_SECRET", "SESSION_COOKIE_SECURE", "SUPPORT_EMAIL"].includes(key)));
const sandbox = {
  MIDTRANS_PAYMENT_ENABLED: "true",
  MIDTRANS_ENV: "sandbox",
  MIDTRANS_SERVER_KEY: "sandbox-test-only",
  MIDTRANS_CLIENT_KEY: "sandbox-client-test",
  CRON_SECRET: "sandbox-cron-test"
};
const production = {
  ...sandbox,
  MIDTRANS_ENV: "production",
  MIDTRANS_PRODUCTION_RELEASE_APPROVED: "true",
  MIDTRANS_SANDBOX_UAT_APPROVED: "true",
  MIDTRANS_OPERATIONS_APPROVED: "true",
  MIDTRANS_RELEASE_EVIDENCE_ID: "UAT-2026-10-reviewed",
  SESSION_COOKIE_SECURE: "true",
  NEXT_PUBLIC_APP_URL: "https://terumbu.example.test",
  SUPPORT_EMAIL: "support@example.test"
};

function check(values = {}, envFile) {
  const args = [script, ...(envFile ? [envFile] : [])];
  return spawnSync("bash", args, {
    cwd: root,
    env: { ...clean, ...values },
    encoding: "utf8",
    timeout: 6000
  });
}

test("default flags pass safely disabled; invalid or dependent flag combinations fail", () => {
  assert.equal(check().status, 0);
  assert.equal(check({ MIDTRANS_EXPEDITION_ENABLED: "true" }).status, 1);
  assert.equal(check({ MIDTRANS_AUTO_REFUND_ENABLED: "true" }).status, 1);
  assert.equal(check({ MIDTRANS_PAYMENT_ENABLED: "yes" }).status, 1);
  assert.equal(check({ MIDTRANS_ENV: "unknown" }).status, 1);
  assert.equal(check({ MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: "true" }).status, 1);
});

test("sandbox remains possible without live-production signoff but requires credentials and cron", () => {
  assert.equal(check(sandbox).status, 0);
  assert.equal(check({ ...sandbox, MIDTRANS_EXPEDITION_ENABLED: "true" }).status, 0);
  assert.equal(check({ ...sandbox, MIDTRANS_AUTO_REFUND_ENABLED: "true" }).status, 0);
  assert.equal(check({ ...sandbox, CRON_SECRET: "" }).status, 1);
  assert.equal(check({ ...sandbox, MIDTRANS_SERVER_KEY: "" }).status, 1);
  assert.equal(check({ ...sandbox, MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: "true",
    MIDTRANS_AUTO_REFUND_ENABLED: "true" }).status, 1);
});

test("production requires separate release, UAT, operations and evidence attestation", () => {
  assert.equal(check({ ...sandbox, MIDTRANS_ENV: "production" }).status, 1);
  assert.equal(check(production).status, 0);
  for (const name of [
    "MIDTRANS_PRODUCTION_RELEASE_APPROVED", "MIDTRANS_SANDBOX_UAT_APPROVED",
    "MIDTRANS_OPERATIONS_APPROVED", "MIDTRANS_RELEASE_EVIDENCE_ID",
    "SESSION_COOKIE_SECURE", "NEXT_PUBLIC_APP_URL", "SUPPORT_EMAIL"
  ]) {
    assert.equal(check({ ...production, [name]: "" }).status, 1, name);
  }
  assert.equal(check({ ...production, NEXT_PUBLIC_APP_URL: "http://terumbu.example.test" }).status, 1);
});

test("production automatic refunds require second switch and both refund signoffs", () => {
  const refunds = { ...production, MIDTRANS_AUTO_REFUND_ENABLED: "true" };
  assert.equal(check(refunds).status, 1);
  assert.equal(check({ ...refunds, MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: "true" }).status, 1);
  assert.equal(check({ ...refunds, MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: "true",
    MIDTRANS_REFUND_UAT_APPROVED: "true" }).status, 1);
  assert.equal(check({ ...refunds, MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: "true",
    MIDTRANS_REFUND_UAT_APPROVED: "true",
    MIDTRANS_REFUND_OPERATIONS_APPROVED: "true" }).status, 0);
});

test("uploaded env-file values are checked before VPS deployment or migration", () => {
  const temp = mkdtempSync(join(tmpdir(), "terumbu-release-gate-"));
  const envPath = join(temp, ".env");
  try {
    writeFileSync(envPath, [
      "MIDTRANS_PAYMENT_ENABLED='true'",
      "MIDTRANS_ENV='production'",
      "MIDTRANS_SERVER_KEY='key-from-trusted-env'",
      "MIDTRANS_CLIENT_KEY='client'",
      "CRON_SECRET='cron-secret'"
    ].join("\n") + "\n");
    assert.equal(check({}, envPath).status, 1);
    writeFileSync(envPath, Object.entries(production).map(([key, value]) =>
      `${key}='${value}'`).join("\n") + "\n");
    assert.equal(check({}, envPath).status, 0);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("release package includes ordered migrations and both authenticated workers in deployed Compose", () => {
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
  const tags = journal.entries.map(row => row.tag);
  const order = [
    "0042_expedition_seat_holds",
    "0043_midtrans_reconciliation_checks",
    "0044_checkout_status_email_recovery",
    "0045_midtrans_refund_bank_confirmations",
    "0046_midtrans_compensation_case_events"
  ];
  let last = -1;
  for (const tag of order) {
    const pos = tags.indexOf(tag);
    assert.ok(pos > last, "required migration out of order: " + tag);
    assert.ok(existsSync(join("drizzle", tag + ".sql")));
    last = pos;
  }
  const deploy = readFileSync("scripts/deploy-vps.sh", "utf8");
  const compose = readFileSync("deploy/docker-compose.yml", "utf8");
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
  assert.match(deploy, /validate-midtrans-release\.sh.*ENV_FILE/);
  assert.match(deploy, /up -d --no-build --force-recreate web reminder-worker midtrans-reconciliation-worker/);
  assert.match(deploy, /rollback_compose_file[\s\S]*midtrans-reconciliation-worker/);
  assert.match(compose, /midtrans-reconciliation-worker:/);
  assert.match(compose, /\/api\/cron\/midtrans-reconciliation/);
  assert.match(compose, /\/api\/cron\/midtrans-compensations/);
  assert.match(workflow, /validate-midtrans-release\.sh terumbu\.production\.env/);
  for (const name of [
    "MIDTRANS_AUTO_REFUND_ENABLED", "MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED",
    "MIDTRANS_PRODUCTION_RELEASE_APPROVED", "MIDTRANS_SANDBOX_UAT_APPROVED",
    "MIDTRANS_OPERATIONS_APPROVED", "MIDTRANS_RELEASE_EVIDENCE_ID",
    "MIDTRANS_REFUND_UAT_APPROVED", "MIDTRANS_REFUND_OPERATIONS_APPROVED"
  ]) {
    assert.ok(compose.includes(name + ":"), "missing Compose runtime variable: " + name);
    assert.ok(workflow.includes("write_env_value " + name), "missing workflow env export: " + name);
  }
});
