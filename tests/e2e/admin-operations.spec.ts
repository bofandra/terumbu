import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("operations monitoring is admin-only and never leaks recipient/provider details", async ({ browser }) => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const context = await browser.newContext();
  const outsiderContext = await browser.newContext();
  const unique = randomUUID();
  let emailId: string | null = null;
  try {
    const [fixture] = await sql<{ id: string }[]> `
      insert into email_logs
        (recipient_email, subject, template, status, delivery_key, delivery_error)
      values
        (${"private-" + unique + "@example.invalid"}, 'E2E operations secret subject',
         'corporate_report_failure', 'failed', ${"ops-e2e-" + unique}, 'fixture_error')
      returning id
    `;
    emailId = fixture.id;

    const page = await context.newPage();
    await loginAs(page, "admin.demo@terumbu.eco", "/admin/operations");
    await expect(page.getByRole("heading", { name: "Operational health" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Operations" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Scheduled corporate reports" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Corporate failure-alert email outbox" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verified webhook journal" })).toBeVisible();
    await expect(page.getByTestId("operations-alerts")).toContainText("Failed alert emails");
    await expect(page.locator("body")).not.toContainText("private-" + unique);
    await expect(page.locator("body")).not.toContainText("E2E operations secret subject");
    await expect(page.locator("body")).not.toContainText("fixture_error");

    const outsider = await outsiderContext.newPage();
    await loginAs(outsider, "user.demo@terumbu.eco", "/dashboard");
    await outsider.goto("/admin/operations");
    await expect(outsider).toHaveURL(/\/access-denied\?next=/);
    await expect(outsider.getByRole("heading", { name: "Operational health" })).toHaveCount(0);
  } finally {
    await context.close();
    await outsiderContext.close();
    if (emailId) await sql`delete from email_logs where id = ${emailId}`;
    await sql.end();
  }
});
