import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("corporate report moves from generated to public through the portal with exact audit events", async ({ browser }) => {
  test.setTimeout(150_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const corporateContext = await browser.newContext();
  const regularContext = await browser.newContext();
  let reportId: string | null = null;
  let foreignAccountId: string | null = null;
  let foreignProgramId: string | null = null;

  try {
    const page = await corporateContext.newPage();
    await loginAs(page, "corporate.demo@terumbu.eco", "/corporate/donations");
    const generatePdf = page.locator('form:has(button:has-text("Generate PDF"))');
    await expect(generatePdf).toBeVisible();
    const programId = await generatePdf.locator('input[name="programId"]').inputValue();
    expect(programId).toBeTruthy();

    const [actor] = await sql<{ id: string }[]>`
      select id from users where email = 'corporate.demo@terumbu.eco' limit 1
    `;
    expect(actor?.id).toBeTruthy();
    const [existing] = await sql<{ total: number }[]>`
      select count(*)::int as total from corporate_report_exports
      where requested_by_user_id = ${actor.id} and program_id = ${programId}
        and report_type = 'donations'
    `;

    await Promise.all([
      page.waitForURL(/\/corporate\/donations\?saved=report/),
      generatePdf.getByRole("button", { name: "Generate PDF" }).click()
    ]);

    const [count] = await sql<{ total: number }[]>`
      select count(*)::int as total from corporate_report_exports
      where requested_by_user_id = ${actor.id} and program_id = ${programId}
        and report_type = 'donations'
    `;
    expect(count.total).toBe(existing.total + 1);
    const [report] = await sql<{ id: string; export_code: string; status: string }[]>`
      select id, export_code, status from corporate_report_exports
      where requested_by_user_id = ${actor.id} and program_id = ${programId}
        and report_type = 'donations'
      order by created_at desc limit 1
    `;
    expect(report?.status).toBe("generated");
    reportId = report.id;

    await page.goto(`/corporate/reports?programId=${programId}`);
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    const card = page.locator(`[data-testid="corporate-report-${reportId}"]`);
    await expect(card).toContainText(report.export_code);
    await expect(card.getByRole("link", { name: "Download PDF" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Submit for review" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/saved=review/),
      card.getByRole("button", { name: "Submit for review" }).click()
    ]);
    const inReview = page.locator(`[data-testid="corporate-report-${reportId}"]`);
    await expect(inReview).toContainText("In review");
    await expect(inReview.getByRole("button", { name: "Approve report" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/saved=approved/),
      inReview.getByRole("button", { name: "Approve report" }).click()
    ]);
    const approved = page.locator(`[data-testid="corporate-report-${reportId}"]`);
    await expect(approved).toContainText("approved");
    await expect(approved.getByRole("button", { name: "Publish report" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/saved=published/),
      approved.getByRole("button", { name: "Publish report" }).click()
    ]);
    const published = page.locator(`[data-testid="corporate-report-${reportId}"]`);
    await expect(published).toContainText("published");
    await expect(published.getByRole("link", { name: "Public report" })).toBeVisible();
    await expect(published.getByRole("button", { name: "Publish report" })).toHaveCount(0);

    const [state] = await sql<{ status: string; public_slug: string; approved_by_user_id: string }[]>`
      select status, public_slug, approved_by_user_id from corporate_report_exports where id = ${reportId}
    `;
    expect(state.status).toBe("published");
    expect(state.public_slug).toBeTruthy();
    expect(state.approved_by_user_id).toBe(actor.id);

    const [audit] = await sql<{ total: number; unique_steps: number }[]>`
      select count(*)::int as total, count(distinct action)::int as unique_steps
      from admin_audit_logs
      where entity_type = 'corporate_report_exports' and entity_id = ${reportId}
        and action in ('corporate.report.submitted','corporate.report.approved','corporate.report.published')
    `;
    expect(audit.total).toBe(3);
    expect(audit.unique_steps).toBe(3);

    // Corporate membership is tenant-scoped. Even an authenticated corporate
    // admin cannot choose a foreign corporate program via a forged GET param.
    const unique = randomUUID().slice(0, 10);
    const [foreignAccount] = await sql<{ id: string }[]>`
      insert into corporate_accounts (name, slug)
      values ('E2E Report Foreign Account', ${"e2e-report-foreign-" + unique}) returning id
    `;
    foreignAccountId = foreignAccount.id;
    const [foreignProgram] = await sql<{ id: string }[]>`
      insert into corporate_programs (corporate_account_id, name, slug, starts_at, ends_at, budget_amount, currency, status)
      values (${foreignAccountId}, 'E2E Foreign Reports', ${"e2e-report-foreign-program-" + unique},
        now(), now() + interval '1 year', 1000, 'USD', 'active')
      returning id
    `;
    foreignProgramId = foreignProgram.id;
    await page.goto(`/corporate/reports?programId=${foreignProgramId}`);
    await expect(page).toHaveURL(/\/forbidden\?next=/);

    const regular = await regularContext.newPage();
    await loginAs(regular, "user.demo@terumbu.eco", "/dashboard");
    await regular.goto("/corporate/reports");
    await expect(regular).toHaveURL(/\/forbidden\?next=/);
  } finally {
    await Promise.all([corporateContext.close(), regularContext.close()]);
    if (reportId) {
      await sql`delete from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id = ${reportId}`;
      await sql`delete from corporate_report_exports where id = ${reportId}`;
    }
    if (foreignProgramId) await sql`delete from corporate_programs where id = ${foreignProgramId}`;
    if (foreignAccountId) await sql`delete from corporate_accounts where id = ${foreignAccountId}`;
    await sql.end();
  }
});
