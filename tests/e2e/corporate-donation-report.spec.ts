import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("corporate admin generates a donation report and a regular user cannot access the workspace", async ({ browser }) => {
  test.setTimeout(120_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const corporateContext = await browser.newContext();
  const userContext = await browser.newContext();
  let generatedReportId: string | null = null;

  try {
    const corporatePage = await corporateContext.newPage();
    await loginAs(corporatePage, "corporate.demo@terumbu.eco", "/corporate/donations");
    await expect(corporatePage.getByRole("heading", { name: "Add donation" })).toBeVisible();
    await expect(corporatePage.getByRole("heading", { name: "Donation report" })).toBeVisible();

    const [corporate] = await sql<{ id: string }[]>`
      select u.id from users u where u.email = 'corporate.demo@terumbu.eco' limit 1
    `;
    expect(corporate?.id).toBeTruthy();

    const [before] = await sql<{ total: number }[]>`
      select count(*)::int as total from corporate_report_exports
      where requested_by_user_id = ${corporate.id} and report_type = 'donations'
    `;

    const reportForm = corporatePage.locator('form:has(button:has-text("Generate PDF"))');
    await expect(reportForm).toBeVisible();
    await Promise.all([
      corporatePage.waitForURL(/\/corporate\/donations\?saved=report/),
      reportForm.getByRole("button", { name: "Generate PDF" }).click()
    ]);
    await expect(corporatePage.getByText("PDF report generated.")).toBeVisible();

    const [after] = await sql<{ total: number }[]>`
      select count(*)::int as total from corporate_report_exports
      where requested_by_user_id = ${corporate.id} and report_type = 'donations'
    `;
    expect(after.total).toBe(before.total + 1);

    const [report] = await sql<{ id: string; status: string }[]>`
      select id, status from corporate_report_exports
      where requested_by_user_id = ${corporate.id} and report_type = 'donations'
      order by generated_at desc limit 1
    `;
    expect(report.status).toBe("generated");
    generatedReportId = report.id;
    await expect(corporatePage.getByRole("link", { name: /download pdf/i }).first()).toBeVisible();

    const regularPage = await userContext.newPage();
    await loginAs(regularPage, "user.demo@terumbu.eco", "/dashboard");
    await regularPage.goto("/corporate/donations");
    await expect(regularPage).toHaveURL(/\/forbidden\?next=/);
    await expect(regularPage.getByRole("heading", { name: "Add donation" })).toHaveCount(0);
  } finally {
    await Promise.all([corporateContext.close(), userContext.close()]);
    if (generatedReportId) {
      await sql`delete from corporate_report_exports where id = ${generatedReportId}`;
    }
    await sql.end();
  }
});
