import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("new departure form never fabricates operator capacity or minimum group size", () => {
  const source = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const start = source.indexOf("function DepartureForms(");
  const end = source.indexOf("function RequestList(", start);
  assert.ok(start >= 0 && end > start);
  const form = source.slice(start, end);
  assert.doesNotMatch(form, /name="capacity"[^>]*defaultValue=\{12\}/);
  assert.doesNotMatch(form, /name="minParticipants"[^>]*defaultValue=\{6\}/);
  assert.match(form, /name="meetingPoint" defaultValue=\{expedition\.detailMetadata\?\.travelInfo\.meetingPoint \?\? ""\}/);
});

test("trip leaders are suggested only from saved team members; not auto-assigned", () => {
  const form = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  assert.match(form, /expedition\.detailMetadata\?\.team \?\? \[\]/);
  assert.match(form, /<datalist id="managed-expedition-leaders">/);
  assert.match(form, /name="guide" list="managed-expedition-leaders"/);
  const q = readFileSync("src/lib/queries.ts", "utf8");
  const s=q.slice(q.indexOf("export async function getAdminExpeditionWorkspaceData("),q.indexOf("export async function getAdminEvidenceBoardData()"));
  assert.match(s, /getMetadataNumber\(row\.metadata, "minParticipants", 0\)/);
});
