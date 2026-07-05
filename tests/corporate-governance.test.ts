import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCorporateSecurityChecklist,
  configuredIntegrationCount,
  normalizeCorporateIntegrationStatus,
  normalizeCorporateIntegrationType,
  splitAllowedEmailDomains
} from "../src/lib/corporate-governance";

test("corporate governance normalization is defensive", () => {
  assert.equal(normalizeCorporateIntegrationType("sso"), "sso");
  assert.equal(normalizeCorporateIntegrationType("unknown"), "other");
  assert.equal(normalizeCorporateIntegrationStatus("connected"), "connected");
  assert.equal(normalizeCorporateIntegrationStatus("half_done"), "not_configured");
});

test("corporate settings derive checklist and counts from persisted rows", () => {
  assert.deepEqual(splitAllowedEmailDomains("bank.co.id\n subsidiary.co.id,TEAM.ID"), ["bank.co.id", "subsidiary.co.id", "team.id"]);
  assert.equal(configuredIntegrationCount([{ rawStatus: "connected" }, { rawStatus: "configured" }, { rawStatus: "error" }]), 2);

  const checklist = buildCorporateSecurityChecklist({
    id: "settings-id",
    mfaRequired: true,
    exportLoggingEnabled: true,
    sessionHistoryEnabled: false,
    retentionPolicyDays: 365,
    domainRestrictionEnabled: true,
    allowedEmailDomains: "bank.co.id\nsubsidiary.co.id"
  });

  assert.equal(checklist.find((item) => item.key === "mfa")?.status, "configured");
  assert.equal(checklist.find((item) => item.key === "session_history")?.status, "ready_to_configure");
  assert.equal(checklist.find((item) => item.key === "domain_restrictions")?.description, "Allowed domains: bank.co.id, subsidiary.co.id");
});
