import { expect, test } from "@playwright/test";

import {
  activityVisibilityByTitle,
  campaignFixture,
  evidenceByTitle,
  loginAs,
  publicUpdateCountByTitle,
  tinyPng
} from "./support";

test("partner evidence stays private until admin verifies it, then appears publicly", async ({ browser }) => {
  const fixture = await campaignFixture();
  const evidenceTitle = `E2E Private Evidence ${Date.now()}`;

  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();
  const partnerPath = `/partner/campaigns/${fixture.campaign_id}?tab=activity`;
  await loginAs(partnerPage, "partner.demo@terumbu.eco", partnerPath);

  const activityForm = partnerPage.locator('[data-testid="partner-activity-form"]');
  await expect(activityForm).toBeVisible();
  await activityForm.locator('select[name="activityUse"]').selectOption("evidence");
  await activityForm.locator('select[name="impactSiteId"]').selectOption(fixture.site_id);
  await activityForm.locator('input[name="title"]').fill(evidenceTitle);
  await activityForm.locator('textarea[name="body"]').fill("Automated evidence submission that must remain private until verification.");
  await activityForm.locator('select[name="evidenceType"]').selectOption("field_photo");
  await activityForm.locator('input[name="imageFile"]').setInputFiles(tinyPng);

  await activityForm.getByRole("button", { name: "Save campaign activity" }).click();
  await partnerPage.waitForURL(/saved=activity/);

  const submitted = await evidenceByTitle(evidenceTitle);
  expect(submitted?.verification_status).toBe("submitted");
  expect(submitted?.file_url).toBeTruthy();
  expect(await publicUpdateCountByTitle(evidenceTitle)).toBe(0);

  const activity = await activityVisibilityByTitle(evidenceTitle);
  expect(activity?.visibility_status).toBe("evidence_only");
  expect(activity?.source_update_id).toBeNull();
  expect(activity?.source_evidence_id).toBe(submitted?.id);

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto("/campaigns/restore-raja-ampat-reefs");
  await expect(publicPage.getByText(evidenceTitle, { exact: true })).toHaveCount(0);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const queuePath = `/admin/campaigns/evidence?q=${encodeURIComponent(evidenceTitle)}`;
  await loginAs(adminPage, "admin.demo@terumbu.eco", queuePath);

  await adminPage.getByRole("link", { name: evidenceTitle }).click();
  await expect(adminPage.getByRole("heading", { name: evidenceTitle })).toBeVisible();
  await adminPage.locator('select[name="status"]').selectOption("verified");
  await adminPage.getByRole("button", { name: "Save review decision" }).click();
  await adminPage.waitForURL(/saved=evidence/);

  const verified = await evidenceByTitle(evidenceTitle);
  expect(verified?.verification_status).toBe("verified");

  await publicPage.reload();
  await expect(publicPage.getByText(evidenceTitle, { exact: true }).first()).toBeVisible();

  await adminContext.close();
  await publicContext.close();
  await partnerContext.close();
});
