import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePassportCategoryVisibility,
  normalizePassportEvidenceConsent,
  normalizePassportVisibility,
  passportItemCategory,
  passportItemIsVisible,
  passportShareAccessProof,
  passportShareAccessStatus,
  passportShareExpiresAtFromDateInput,
  publicPassportShareUrl
} from "../src/lib/passport-sharing";

test("passport sharing inputs normalize defensively", () => {
  assert.equal(normalizePassportVisibility("public"), "public");
  assert.equal(normalizePassportVisibility("LINK"), "private");
  assert.equal(normalizePassportEvidenceConsent("hide_evidence"), "hide_evidence");
  assert.equal(normalizePassportEvidenceConsent("unknown"), "show_evidence");

  const visibility = normalizePassportCategoryVisibility({
    donation: false,
    ecosystem: true,
    volunteer: "yes"
  });

  assert.equal(visibility.donation, false);
  assert.equal(visibility.ecosystem, true);
  assert.equal(visibility.volunteer, true);
  assert.equal(visibility.certificate, true);
});

test("passport item categories drive public record filtering", () => {
  const visibility = normalizePassportCategoryVisibility({
    donation: true,
    ecosystem: false,
    expedition: true,
    certificate: true,
    badge: true,
    volunteer: false,
    other: true
  });

  assert.equal(passportItemCategory("coral"), "ecosystem");
  assert.equal(passportItemCategory("field_activity"), "expedition");
  assert.equal(passportItemIsVisible("donation", visibility), true);
  assert.equal(passportItemIsVisible("ecosystem", visibility), false);
  assert.equal(passportItemIsVisible("volunteer", visibility), false);
});

test("link-only passport access requires a valid token before access code", () => {
  const now = new Date("2026-07-12T00:00:00.000Z");

  assert.deepEqual(
    passportShareAccessStatus({
      visibility: "link",
      isPublic: true,
      shareToken: "share-token",
      providedToken: "wrong",
      now
    }),
    { ok: false, reason: "token" }
  );
  assert.deepEqual(
    passportShareAccessStatus({
      visibility: "link",
      isPublic: true,
      shareToken: "share-token",
      providedToken: "share-token",
      shareExpiresAt: new Date("2026-07-11T23:59:59.999Z"),
      now
    }),
    { ok: false, reason: "expired" }
  );
  assert.deepEqual(
    passportShareAccessStatus({
      visibility: "link",
      isPublic: true,
      shareToken: "share-token",
      providedToken: "share-token",
      requiresAccessCode: true,
      accessCodeValid: false,
      now
    }),
    { ok: false, reason: "access_code" }
  );
  assert.deepEqual(
    passportShareAccessStatus({
      visibility: "link",
      isPublic: true,
      shareToken: "share-token",
      providedToken: "share-token",
      requiresAccessCode: true,
      accessCodeValid: true,
      now
    }),
    { ok: true, reason: "link" }
  );
});

test("public passports ignore share token gates while private passports remain hidden", () => {
  assert.deepEqual(
    passportShareAccessStatus({
      visibility: "public",
      isPublic: true,
      requiresAccessCode: true,
      accessCodeValid: false
    }),
    { ok: true, reason: "public" }
  );
  assert.deepEqual(
    passportShareAccessStatus({
      visibility: "private",
      isPublic: true
    }),
    { ok: false, reason: "private" }
  );
});

test("passport share URLs and unlock proofs are stable", () => {
  assert.equal(publicPassportShareUrl({ publicSlug: "raka", visibility: "public" }), "https://terumbu.eco/passport/raka");
  assert.equal(publicPassportShareUrl({ publicSlug: "raka", visibility: "link", shareToken: "abc 123" }), "https://terumbu.eco/passport/raka?token=abc%20123");
  assert.equal(passportShareAccessProof("raka", "token", "hash"), passportShareAccessProof("raka", "token", "hash"));
  assert.notEqual(passportShareAccessProof("raka", "token", "hash"), passportShareAccessProof("raka", "other", "hash"));
});

test("share expiry accepts future date input only", () => {
  const now = new Date("2026-07-12T00:00:00.000Z");

  assert.equal(passportShareExpiresAtFromDateInput("", now), null);
  assert.equal(passportShareExpiresAtFromDateInput("2026-07-11", now), null);
  assert.equal(passportShareExpiresAtFromDateInput("2026-07-13", now)?.toISOString(), "2026-07-13T23:59:59.999Z");
});
