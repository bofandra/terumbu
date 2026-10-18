import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("partner and admin new-record forms leave URL slugs optional", () => {
  const partnerForm = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const destinationForm = readFileSync("src/components/admin-destination-form.tsx", "utf8");
  const portalActions = readFileSync("src/lib/portal-actions.ts", "utf8");

  assert.match(partnerForm, /<Field label="URL slug \(optional\)">\s*<input name="slug"[^>]*\/>/);
  const createSlugInput = partnerForm.match(/<input name="slug"[^>]*\/>/)?.[0] ?? "";
  assert.ok(createSlugInput, "new expedition slug input exists");
  assert.doesNotMatch(createSlugInput, /required/);
  assert.match(destinationForm, /label="URL slug \(optional\)"/);
  assert.match(portalActions, /const slug = slugifyExpedition\(formText\(formData, "slug"\) \|\| title\);/);
  assert.match(portalActions, /const slug = slugifyDestination\(formText\(formData, "slug"\) \|\| name\);/);
});
