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
  const runner = read("src/lib/corporate-cron-runner.ts");
  assert.match(compose, /\/api\/cron\/corporate-reports/);
  assert.match(compose, /x-cron-secret: \$\$\{CRON_SECRET\}/);
  assert.match(cronRoute, /runCorporateCronStages\(/);
  assert.match(cronRoute, /reports: processDueCorporateReports/);
  assert.match(cronRoute, /emails: processCorporateReportAlertEmails/);
  assert.match(cronRoute, /deliveryEvents: reconcilePendingResendCorporateDeliveryEvents/);
  assert.match(cronRoute, /prune: pruneResendCorporateDeliveryEvents/);
  assert.match(runner, /await attempt\("reports", tasks\.reports/);
  assert.match(runner, /await attempt\("emails", tasks\.emails/);
  assert.match(runner, /await attempt\("deliveryEvents", tasks\.deliveryEvents/);
  assert.match(runner, /await attempt\("prune", tasks\.prune/);
  assert.match(cronRoute, /status: 401/);
  assert.match(cronRoute, /status: 503/);
  assert.match(cronRoute, /status: 500/);
});

test("post-deploy external worker watch runs only after explicitly authorized production deployment", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const scheduled = read(".github/workflows/worker-health-watch.yml");
  const script = read("scripts/monitor-worker-heartbeats.mjs");

  const postDeploy = workflow.split("  external_worker_watch:")[1];
  assert.ok(postDeploy, "post-deploy monitor job must exist");
  assert.match(postDeploy, /needs: \[deploy\]/);
  assert.match(postDeploy, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(postDeploy, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(postDeploy, /group: terumbu-external-worker-watch/);
  assert.match(postDeploy, /issues: write/);
  assert.match(postDeploy, /MONITOR_ASSIGNEE:/);
  assert.match(postDeploy, /node scripts\/monitor-worker-heartbeats\.mjs/);
  assert.doesNotMatch(postDeploy, /(?:CRON_SECRET|DATABASE_URL|VPS_SSH_KEY)/);

  assert.match(scheduled, /group: terumbu-external-worker-watch/);
  assert.match(scheduled, /MONITOR_ASSIGNEE:/);
  assert.match(scheduled, /issues: write/);
  assert.match(script, /assignees: \[assignee\]/);
});
 
test("recreated hourly worker probes readiness and runs both crons before its initial one-hour sleep", () => {
  const compose = read("deploy/docker-compose.yml");
  const workerSection = compose.split("  reminder-worker:")[1]?.split("\n  migrate:")[0];
  assert.ok(workerSection, "reminder-worker definition must exist");
  assert.match(workerSection, /until curl --fail --silent --max-time 5 http:\/\/web:3000\/api\/health/);
  assert.match(workerSection, /sleep 5/);
  const reminder = workerSection.indexOf("http://web:3000/api/cron/expedition-reminders");
  const corporate = workerSection.indexOf("http://web:3000/api/cron/corporate-reports");
  const hourlySleep = workerSection.indexOf("sleep 3600");
  assert.ok(reminder > 0 && corporate > reminder && hourlySleep > corporate,
    "first hourly sleep must come only after both cron endpoints were invoked");
  assert.equal(workerSection.match(/sleep 3600/g)?.length, 1);
  assert.match(workerSection, /x-cron-secret: \$\$\{CRON_SECRET\}/);
  assert.match(read("scripts/deploy-vps.sh"), /--force-recreate web reminder-worker/,
    "preserve required secret rotation behavior while preventing restart starvation");
});
