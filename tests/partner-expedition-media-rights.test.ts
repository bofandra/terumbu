import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { expeditionMediaRightsValid, newExpeditionMediaUploadFields } from "../src/lib/partner-expedition-media-rights";

function image(name: string, body = "genuine field photo") {
  return new File([body], name, { type: "image/jpeg" });
}

test("partner expedition drafts without new photos do not require rights confirmation", () => {
  const form = new FormData();
  assert.equal(expeditionMediaRightsValid(form), true);
  form.set("imageFile", new File([], "", { type: "application/octet-stream" }));
  assert.equal(expeditionMediaRightsValid(form), true);
});

test("hero, gallery, and preparation uploads require a rights declaration", () => {
  for (const key of ["imageFile", "galleryImageFile", "preparationCourseImageFile"]) {
    const form = new FormData();
    form.set(key, image("reef.jpg"));
    assert.deepEqual(newExpeditionMediaUploadFields(form), [key]);
    assert.equal(expeditionMediaRightsValid(form), false);
    form.set("mediaRightsConfirmed", "on");
    assert.equal(expeditionMediaRightsValid(form), true);
  }
});

test("partner action and form UX protect both creation and updates", () => {
  const source = readFileSync("src/lib/portal-actions.ts", "utf8");
  const editor = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  assert.equal((source.match(/if \(!expeditionMediaRightsValid\(formData\)\)/g) ?? []).length, 2);
  assert.equal((editor.match(/<ExpeditionMediaRightsDeclaration \/>/g) ?? []).length, 2);
  assert.match(source, /mediaRightsAcknowledged: newExpeditionMediaUploadFields\(formData\)\.length > 0/);
});
