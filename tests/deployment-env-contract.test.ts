import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const forwardedRuntimeKeys = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_PUBLIC_BASE_URL",
  "DEMO_GATEWAY_WEBHOOK_SECRET",
  "RESEND_WEBHOOK_SECRET",
  "SUPPORT_EMAIL",
  "NEXT_PUBLIC_SUPPORT_WHATSAPP_URL",
  "ADMIN_QUERY_WARN_MS"
] as const;

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("production env contract forwards storage and support settings end-to-end", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const compose = read("deploy/docker-compose.yml");
  const deployExample = read("deploy/.env.example");

  for (const key of forwardedRuntimeKeys) {
    assert.match(deployExample, new RegExp(`^${escaped(key)}=`, "m"), `${key} must be documented in deploy/.env.example`);
    assert.match(compose, new RegExp(`^\\s+${escaped(key)}:`, "m"), `${key} must be passed to the web container`);
    assert.match(workflow, new RegExp(`write_env_value\\s+${escaped(key)}(?:\\s|$)`), `${key} must be written to the production env file`);
  }
});

test("production workflow rejects partially configured R2 storage", () => {
  const workflow = read(".github/workflows/deploy.yml");

  assert.match(workflow, /R2_CONFIGURED_COUNT=0/);
  assert.match(workflow, /R2_CONFIGURED_COUNT.*-ne 0/);
  assert.match(workflow, /R2_CONFIGURED_COUNT.*-ne 5/);
  assert.match(workflow, /Cloudflare R2 production configuration must provide all five R2 values or none of them/);
});

test("hourly worker invokes authenticated corporate report generation", () => {
  const compose = read("deploy/docker-compose.yml");
  const cronRoute = read("src/app/api/cron/corporate-reports/route.ts");
  assert.match(compose, /\/api\/cron\/corporate-reports/);
  assert.match(compose, /x-cron-secret: \$\$\{CRON_SECRET\}/);
  assert.match(cronRoute, /processDueCorporateReports\(\)/);
  assert.match(cronRoute, /status: 401/);
  assert.match(cronRoute, /status: 503/);
});
