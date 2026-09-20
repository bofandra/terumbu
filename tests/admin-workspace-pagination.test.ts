import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const queriesSource = readFileSync(join(process.cwd(), "src", "lib", "queries.ts"), "utf8");

function functionSource(name: string, nextName: string) {
  const start = queriesSource.indexOf(`export async function ${name}`);
  const end = queriesSource.indexOf(`export async function ${nextName}`, start + 1);

  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must exist after ${name}`);

  return queriesSource.slice(start, end);
}

test("partner workspace paginates members instead of loading every assignment", () => {
  const source = functionSource("getAdminPartnerWorkspaceData", "getAdminExpeditionCreateOptions");

  assert.match(source, /membersPagination/);
  assert.match(source, /adminListOffset\(memberQuery, memberTotal\)/);
  assert.match(source, /\.limit\(memberQuery\.pageSize\)/);
});

test("expedition workspace paginates high-volume operational collections", () => {
  const source = functionSource("getAdminExpeditionWorkspaceData", "getAdminEvidenceBoardData");

  assert.match(source, /bookingsPagination/);
  assert.match(source, /requestsPagination/);
  assert.match(source, /reviewsPagination/);
  assert.doesNotMatch(source, /\.limit\((500|250)\)/);
});
