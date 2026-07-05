import assert from "node:assert/strict";
import test from "node:test";

import {
  canAcceptCorporateEmployeeInvite,
  corporateEvidenceVisibilityForStatus,
  corporateInviteExpiresAt,
  normalizeCorporateProgramStatus,
  shouldLinkEvidenceToCorporateProgram
} from "../src/lib/corporate-lifecycle";

test("corporate program statuses are normalized defensively", () => {
  assert.equal(normalizeCorporateProgramStatus("active"), "active");
  assert.equal(normalizeCorporateProgramStatus("paused"), "paused");
  assert.equal(normalizeCorporateProgramStatus("unexpected"), "active");
  assert.equal(normalizeCorporateProgramStatus(null), "active");
});

test("only verified evidence is automatically reportable for corporate programs", () => {
  assert.equal(shouldLinkEvidenceToCorporateProgram("verified"), true);
  assert.equal(shouldLinkEvidenceToCorporateProgram("submitted"), false);
  assert.equal(corporateEvidenceVisibilityForStatus("verified"), "reportable");
  assert.equal(corporateEvidenceVisibilityForStatus("rejected"), "internal");
});

test("corporate employee invite acceptance enforces status, email, and expiry", () => {
  const now = new Date("2026-07-05T00:00:00Z");
  const future = corporateInviteExpiresAt(now);

  assert.deepEqual(
    canAcceptCorporateEmployeeInvite({
      inviteEmail: "person@example.com",
      userEmail: "PERSON@example.com",
      inviteStatus: "pending",
      expiresAt: future,
      now
    }),
    { ok: true, reason: null }
  );

  assert.equal(
    canAcceptCorporateEmployeeInvite({
      inviteEmail: "person@example.com",
      userEmail: "other@example.com",
      inviteStatus: "pending",
      expiresAt: future,
      now
    }).reason,
    "email-mismatch"
  );

  assert.equal(
    canAcceptCorporateEmployeeInvite({
      inviteEmail: "person@example.com",
      userEmail: "person@example.com",
      inviteStatus: "accepted",
      expiresAt: future,
      now
    }).reason,
    "already-used"
  );

  assert.equal(
    canAcceptCorporateEmployeeInvite({
      inviteEmail: "person@example.com",
      userEmail: "person@example.com",
      inviteStatus: "pending",
      expiresAt: new Date("2026-07-01T00:00:00Z"),
      now
    }).reason,
    "expired"
  );
});
