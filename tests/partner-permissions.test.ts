import assert from "node:assert/strict";
import test from "node:test";

import { normalizePartnerOrganizationRole, partnerCapabilitiesForRoles, partnerRoleAllows } from "../src/lib/partner-permissions";

test("partner organization roles normalize defensively", () => {
  assert.equal(normalizePartnerOrganizationRole("owner"), "owner");
  assert.equal(normalizePartnerOrganizationRole("manager"), "manager");
  assert.equal(normalizePartnerOrganizationRole("contributor"), "contributor");
  assert.equal(normalizePartnerOrganizationRole("viewer"), "viewer");
  assert.equal(normalizePartnerOrganizationRole("unknown"), "viewer");
  assert.equal(normalizePartnerOrganizationRole("unknown", "manager"), "manager");
});

test("partner organization permissions separate read-only, contributor, manager, and owner access", () => {
  assert.equal(partnerRoleAllows("viewer", "activity:create"), false);
  assert.equal(partnerRoleAllows("contributor", "activity:create"), true);
  assert.equal(partnerRoleAllows("contributor", "campaign:create"), false);
  assert.equal(partnerRoleAllows("manager", "campaign:update"), true);
  assert.equal(partnerRoleAllows("manager", "campaign:delete"), false);
  assert.equal(partnerRoleAllows("owner", "campaign:delete"), true);
  assert.equal(partnerRoleAllows("manager", "expedition:manage"), true);
  assert.equal(partnerRoleAllows("contributor", "expedition:manage"), false);
});

test("partner capabilities aggregate across memberships and admin bypass", () => {
  assert.deepEqual(partnerCapabilitiesForRoles(["viewer"]), {
    canCreateActivity: false,
    canCreateCampaign: false,
    canDeleteCampaign: false,
    canManageExpeditions: false,
    canReviseEvidence: false,
    canUpdateCampaign: false
  });

  assert.equal(partnerCapabilitiesForRoles(["viewer", "contributor"]).canCreateActivity, true);
  assert.equal(partnerCapabilitiesForRoles(["viewer", "contributor"]).canUpdateCampaign, false);
  assert.equal(partnerCapabilitiesForRoles(["manager"]).canManageExpeditions, true);
  assert.equal(partnerCapabilitiesForRoles(["manager"]).canDeleteCampaign, false);
  assert.equal(partnerCapabilitiesForRoles([], true).canDeleteCampaign, true);
});
