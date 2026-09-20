import assert from "node:assert/strict";
import test from "node:test";

import { adminFormFieldNames, withAdminFormOutcome } from "../src/lib/admin-form-state";

test("admin form outcome preserves existing query and hash", () => {
  assert.equal(
    withAdminFormOutcome("/admin/campaigns/new?returnTo=%2Fadmin%2Fcampaigns#project", "error", "campaign-invalid", ["title", "summary"]),
    "/admin/campaigns/new?returnTo=%2Fadmin%2Fcampaigns&error=campaign-invalid&field=title&field=summary#project"
  );
});

test("admin form outcome replaces stale field markers and deduplicates fields", () => {
  assert.equal(
    withAdminFormOutcome("/admin/partners/new?field=old", "error", "partner-invalid", ["name", "name", "type"]),
    "/admin/partners/new?error=partner-invalid&field=name&field=type"
  );
});

test("admin form field names reject malformed values", () => {
  assert.deepEqual(adminFormFieldNames(["title", " title ", "../../password", "", "goalAmount"]), ["title", "goalAmount"]);
});

test("admin form outcome rejects non-admin destinations", () => {
  assert.throws(() => withAdminFormOutcome("https://example.com/admin/users", "error", "invalid"));
  assert.throws(() => withAdminFormOutcome("/partner/campaigns", "error", "invalid"));
});
