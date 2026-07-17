import assert from "node:assert/strict";
import test from "node:test";

import {
  canAcceptCorporateEmployeeInvite,
  corporateEventRegistrationAvailability,
  corporateEvidenceVisibilityForStatus,
  corporateInviteExpiresAt,
  normalizeCorporateEmployeeEventStatus,
  normalizeCorporateEmployeeEventType,
  normalizeCorporateEventRegistrationStatus,
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
  assert.equal(shouldLinkEvidenceToCorporateProgram("needs_clarification"), false);
  assert.equal(corporateEvidenceVisibilityForStatus("verified"), "reportable");
  assert.equal(corporateEvidenceVisibilityForStatus("needs_clarification"), "internal");
  assert.equal(corporateEvidenceVisibilityForStatus("rejected"), "internal");
});

test("corporate employee event statuses and registration availability are normalized", () => {
  assert.equal(normalizeCorporateEmployeeEventStatus("registration_open"), "registration_open");
  assert.equal(normalizeCorporateEmployeeEventStatus("surprise"), "draft");
  assert.equal(normalizeCorporateEmployeeEventType("challenge"), "challenge");
  assert.equal(normalizeCorporateEmployeeEventType("unknown"), "volunteer");
  assert.equal(normalizeCorporateEventRegistrationStatus("attended"), "attended");
  assert.equal(normalizeCorporateEventRegistrationStatus("maybe"), "registered");

  assert.deepEqual(
    corporateEventRegistrationAvailability({
      status: "registration_open",
      capacity: 20,
      registeredCount: 12,
      waitlistEnabled: true
    }),
    {
      code: "available",
      label: "8 seats available",
      canRegister: true,
      willWaitlist: false,
      availableSeats: 8
    }
  );

  assert.deepEqual(
    corporateEventRegistrationAvailability({
      status: "registration_open",
      capacity: 20,
      registeredCount: 20,
      waitlistEnabled: true
    }),
    {
      code: "waitlist",
      label: "Waitlist open",
      canRegister: true,
      willWaitlist: true,
      availableSeats: 0
    }
  );

  assert.equal(
    corporateEventRegistrationAvailability({
      status: "waitlist",
      capacity: 20,
      registeredCount: 12,
      waitlistEnabled: true
    }).willWaitlist,
    true
  );

  assert.equal(
    corporateEventRegistrationAvailability({
      status: "closed",
      capacity: 20,
      registeredCount: 10,
      waitlistEnabled: true
    }).canRegister,
    false
  );
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
