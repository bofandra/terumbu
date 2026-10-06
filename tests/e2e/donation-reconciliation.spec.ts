import { expect, test } from "@playwright/test";

import {
  donationPassportItem,
  donationState,
  enableDonationPaymentInstructions,
  loginAs,
  tinyPng
} from "./support";

test.describe("donation critical path", () => {
  test.beforeAll(async () => {
    await enableDonationPaymentInstructions();
  });

  test("user submits proof, admin verifies payment, Impact Passport records contribution", async ({ browser }) => {
    const uniqueDonor = `E2E Donor ${Date.now()}`;
    const checkoutPath = "/checkout/donation?campaign=restore-raja-ampat-reefs&intent=coral&amount=25";

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await loginAs(userPage, "user.demo@terumbu.eco", checkoutPath);

    await expect(userPage).toHaveURL(/\/checkout\/donation/);
    await userPage.locator('input[name="donorName"]').fill(uniqueDonor);
    await userPage.locator('input[name="donorEmail"]').fill("user.demo@terumbu.eco");
    await userPage.locator('input[name="paymentReference"]').fill(`E2E-${Date.now()}`);
    await userPage.locator('input[name="paymentProofFile"]').setInputFiles(tinyPng);

    await Promise.all([
      userPage.waitForURL(/\/checkout\/success\?status=pending&type=donation&id=/),
      userPage.getByRole("button", { name: "Submit payment proof" }).click()
    ]);

    const donationId = new URL(userPage.url()).searchParams.get("id");
    expect(donationId).toBeTruthy();

    const pending = await donationState(donationId!);
    expect(pending?.status).toBe("pending");
    expect(pending?.user_id).toBeTruthy();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const adminPaymentsPath = `/admin/campaigns/payments?donationQ=${encodeURIComponent(uniqueDonor)}`;
    await loginAs(adminPage, "admin.demo@terumbu.eco", adminPaymentsPath);

    const donationCard = adminPage.locator("article").filter({ hasText: uniqueDonor });
    await expect(donationCard).toBeVisible();
    await expect(donationCard.getByRole("link", { name: "Open payment proof" })).toBeVisible();

    await donationCard.getByRole("button", { name: "Verify payment" }).click();
    await adminPage.waitForURL(/saved=donation/);

    const paid = await donationState(donationId!);
    expect(paid?.status).toBe("paid");

    const passportItem = await donationPassportItem(donationId!);
    expect(passportItem?.title).toBe("Supported Restore Raja Ampat Reefs");

    await userPage.goto("/dashboard/impact");
    await expect(userPage.getByText("Contribution verified", { exact: false }).first()).toBeVisible();
    await expect(userPage.getByText("Restore Raja Ampat Reefs", { exact: true }).first()).toBeVisible();

    await adminContext.close();
    await userContext.close();
  });
});
