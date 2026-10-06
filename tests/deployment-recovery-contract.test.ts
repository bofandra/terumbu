import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const deployScript = readFileSync(path.join(process.cwd(), "scripts", "deploy-vps.sh"), "utf8");

test("deployment creates a protected PostgreSQL backup before migrations", () => {
  const backupIndex = deployScript.indexOf("pg_dump");
  const migrateIndex = deployScript.indexOf("run --rm -T migrate");

  assert.ok(backupIndex >= 0, "deploy script must create a pg_dump backup");
  assert.ok(migrateIndex >= 0, "deploy script must run database migrations");
  assert.ok(backupIndex < migrateIndex, "database backup must complete before migrations start");
  assert.match(deployScript, /chmod 700 "\$\{BACKUP_DIR\}"/);
  assert.match(deployScript, /chmod 600 "\$\{BACKUP_FILE\}"/);
  assert.match(deployScript, /BACKUP_RETENTION=7/);
});

test("deployment can roll the application back after post-switch failures", () => {
  assert.match(deployScript, /PREVIOUS_REVISION=/);
  assert.match(deployScript, /rollback_application\(\)/);
  assert.match(deployScript, /rollback_application "container recreation failure"/);
  assert.match(deployScript, /rollback_application "revision mismatch"/);
  assert.match(deployScript, /rollback_application "health check failure"/);
  assert.match(deployScript, /rollback_application "production smoke failure"/);
  assert.match(deployScript, /Database migrations were not rolled back/);
});

test("production smoke suite verifies baseline security headers", () => {
  const smokeScript = readFileSync(path.join(process.cwd(), "scripts", "smoke-production.sh"), "utf8");

  assert.match(smokeScript, /X-Content-Type-Options: nosniff/);
  assert.match(smokeScript, /X-Frame-Options: DENY/);
  assert.match(smokeScript, /frame-ancestors 'none'/);
  assert.match(smokeScript, /object-src 'none'/);
});
