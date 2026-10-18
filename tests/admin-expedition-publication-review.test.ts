import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin review shows shared missing-data requirements and disables approval until ready", () => {
  const page = readFileSync("src/app/admin/expeditions/[expeditionId]/page.tsx", "utf8");
  assert.match(page, /const publication = expeditionPublicationReadiness\(\{/);
  assert.match(page, /publication\.missing\.map/);
  assert.match(page, /disabled=\{!publication\.ready\}/);
  assert.match(page, /value="request_changes"/);
});

test("admin expedition loader obtains destination publication status from managed destination", () => {
  const source = readFileSync("src/lib/queries.ts", "utf8");
  const start = source.indexOf("export async function getAdminExpeditionWorkspaceData(");
  const end = source.indexOf("export async function getAdminEvidenceBoardData()", start);
  assert.ok(start >= 0 && end > start);
  const loader = source.slice(start, end);
  assert.match(loader, /destinationStatus: destinations\.status/);
  assert.match(loader, /leftJoin\(destinations, eq\(expeditions\.destinationId, destinations\.id\)\)/);
});
