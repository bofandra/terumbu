import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  expeditionMediaRightsValid,
  expeditionMediaProvenanceFromForm,
  appendExpeditionMediaProvenance,
  storedExpeditionMediaProvenanceHistory,
  newExpeditionMediaUploadFields,
  storedExpeditionMediaProvenance
} from "../src/lib/partner-expedition-media-rights";

function image(name: string, body = "genuine field photo") {
  return new File([body], name, { type: "image/jpeg" });
}

function withRights(fileField = "imageFile") {
  const form = new FormData();
  form.set(fileField, image("field.jpg"));
  form.set("mediaRightsConfirmed", "on");
  form.set("mediaCredit", "Local conservation team");
  form.set("mediaRightsBasis", "creator");
  form.set("mediaRightsReference", "Internal media archive TER-2026-42");
  return form;
}

test("unchanged drafts need no new rights declaration", () => {
  const form = new FormData();
  assert.equal(expeditionMediaRightsValid(form), true);
  form.set("imageFile", new File([], "empty.jpg"));
  assert.equal(expeditionMediaRightsValid(form), true);
  assert.deepEqual(newExpeditionMediaUploadFields(form), []);
});

test("new hero, gallery and preparation media need an attributed declaration", () => {
  for (const field of ["imageFile", "galleryImageFile", "preparationCourseImageFile"]) {
    const form = withRights(field);
    assert.deepEqual(newExpeditionMediaUploadFields(form), [field]);
    assert.equal(expeditionMediaRightsValid(form), true);
    assert.equal(expeditionMediaProvenanceFromForm(form)?.credit, "Local conservation team");
    form.delete("mediaRightsConfirmed");
    assert.equal(expeditionMediaRightsValid(form), false);
    form.set("mediaRightsConfirmed", "on");
    form.set("mediaRightsReference", "short");
    assert.equal(expeditionMediaRightsValid(form), false);
    form.set("mediaRightsReference", "Internal media archive TER-2026-42");
    form.set("mediaRightsBasis", "other");
    assert.equal(expeditionMediaRightsValid(form), false);
  }
});

test("private, structured provenance parses safely without declaring it verified", () => {
  const source = expeditionMediaProvenanceFromForm(withRights());
  assert.deepEqual(storedExpeditionMediaProvenance({ mediaProvenance: source }), source);
  assert.equal(storedExpeditionMediaProvenance(null), null);
  assert.equal(storedExpeditionMediaProvenance({ mediaProvenance: { rightsBasis: "invented" } }), null);
});

test("partner writes and admin publish gate both enforce review", () => {
  const actions = readFileSync("src/lib/portal-actions.ts", "utf8");
  const editor = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const admin = readFileSync("src/app/admin/expeditions/[expeditionId]/page.tsx", "utf8");

  assert.equal((actions.match(/if \(!expeditionMediaRightsValid\(formData\)\)/g) ?? []).length, 2);
  assert.equal((editor.match(/<ExpeditionMediaRightsDeclaration \/>/g) ?? []).length, 2);
  assert.match(actions, /metadataForStorage/);
  assert.match(actions, /formData.get\("reviewedMediaRights"\) !== "on"/);
  assert.match(admin, /name="reviewedMediaRights"/);
  assert.match(admin, /storedExpeditionMediaProvenanceHistory\(expedition.metadata\)/);
});

test("later photo uploads retain earlier rights evidence without reattestation on ordinary edits", () => {
  const first = expeditionMediaProvenanceFromForm(withRights("imageFile"))!;
  const firstRecord = { mediaProvenance: first };
  const second = expeditionMediaProvenanceFromForm(withRights("galleryImageFile"))!;
  const history = appendExpeditionMediaProvenance(firstRecord, second);
  assert.equal(history.length, 2);
  assert.deepEqual(history[0], first);
  assert.deepEqual(history[1], second);
  assert.deepEqual(appendExpeditionMediaProvenance({ mediaProvenance: second, mediaProvenanceHistory: history }, null), history);
  assert.deepEqual(storedExpeditionMediaProvenanceHistory({ mediaProvenance: second, mediaProvenanceHistory: history }), history);
});
