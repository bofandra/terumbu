import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin expedition editor never invents a trip hero image or dated weather update", () => {
  const source = readFileSync("src/lib/queries.ts", "utf8");
  const start = source.indexOf("export async function getAdminExpeditionWorkspaceData(");
  const end = source.indexOf("export async function getAdminEvidenceBoardData()", start);
  assert.ok(start >= 0 && end > start);
  const workspace = source.slice(start, end);

  assert.doesNotMatch(workspace, /images\.unsplash\.com/);
  assert.doesNotMatch(workspace, /Seasonal weather advisory/);
  assert.doesNotMatch(workspace, /2026-06-01T00:00:00\.000Z/);
  assert.match(workspace, /galleryImages: expeditionRow\.imageUrl/);
  assert.match(workspace, /tripUpdates: \[\]/);
});
