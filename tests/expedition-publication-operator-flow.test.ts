import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("partner workspace displays the same publication requirements enforced by the actions", () => {
  const workspace = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const actions = readFileSync("src/lib/portal-actions.ts", "utf8");

  assert.match(workspace, /expeditionPublicationReadiness\(\{/);
  assert.match(workspace, /aria-label="Publication readiness"/);
  assert.match(workspace, /publication\.missing\.map/);
  assert.match(actions, /const publication = expeditionPublicationReadiness\(\{/);
  assert.match(actions, /if \(!publication\.ready\)/);
});

test("new departure booking count comes from bookings, not manual form input", () => {
  const actions = readFileSync("src/lib/portal-actions.ts", "utf8");
  const workspace = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const creationStart = actions.indexOf("export async function createPartnerExpeditionDepartureAction");
  const updateStart = actions.indexOf("export async function updatePartnerExpeditionDepartureAction");
  assert.ok(creationStart >= 0 && updateStart > creationStart);
  const creationAction = actions.slice(creationStart, updateStart);

  assert.equal(creationAction.includes('formData.get("seatsBooked")'), false);
  assert.match(creationAction, /seatsBooked: 0/);
  assert.equal(workspace.includes('name="seatsBooked"'), false);
});
