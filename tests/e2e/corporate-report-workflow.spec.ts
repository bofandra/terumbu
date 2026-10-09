import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";
import { getPublicCorporateImpactReport } from "../../src/lib/queries";

test("corporate report moves from generated to public through the portal with exact audit events", async ({ browser }) => {
  test.setTimeout(150_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const corporateContext = await browser.newContext();
  const regularContext = await browser.newContext();
  const reviewerContext = await browser.newContext();
  let reviewerRoleAssignmentId: string | null = null;
  let reviewerPermissionAssignmentId: string | null = null;
  let modifiedProgramBudget: string | null = null;
  let modifiedProgramId: string | null = null;
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

    // Provision a second independent corporate admin just for this fixture.
    const [reviewer] = await sql<{ id: string }[]>`
      select id from users where email = 'user.demo@terumbu.eco' limit 1
    `;
    const [role] = await sql<{ id: string }[]>`
      select id from roles where key = 'corporate_admin' limit 1
    `;
    const [account] = await sql<{ corporate_account_id: string }[]>`
      select corporate_account_id from corporate_programs where id = ${programId}
    `;
    expect(reviewer?.id).toBeTruthy();
    expect(role?.id).toBeTruthy();
    expect(account?.corporate_account_id).toBeTruthy();
    const [assignedRole] = await sql<{ id: string }[]>`
      insert into user_roles (user_id, role_id)
      values (${reviewer.id}, ${role.id}) on conflict do nothing returning id
    `;
    reviewerRoleAssignmentId = assignedRole?.id ?? null;
    const [assignedPermission] = await sql<{ id: string }[]>`
      insert into corporate_permissions (corporate_account_id, user_id, permission)
      values (${account.corporate_account_id}, ${reviewer.id}, 'corporate_admin')
      on conflict do nothing returning id
    `;
    reviewerPermissionAssignmentId = assignedPermission?.id ?? null;

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
    await expect(inReview.getByRole("button", { name: "Approve report" })).toHaveCount(0);
    await expect(inReview.getByText(/Awaiting independent approval/)).toBeVisible();

    const reviewerPage = await reviewerContext.newPage();
    await loginAs(reviewerPage, "user.demo@terumbu.eco", `/corporate/reports?programId=${programId}`);
    const reviewerCard = reviewerPage.locator(`[data-testid="corporate-report-${reportId}"]`);
    await expect(reviewerCard.getByRole("button", { name: "Approve report" })).toBeVisible();
    await Promise.all([
      reviewerPage.waitForURL(/saved=approved/),
      reviewerCard.getByRole("button", { name: "Approve report" }).click()
    ]);
    await page.reload();
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
    expect(state.approved_by_user_id).toBe(reviewer.id);
    const publicPage = await browser.newPage();
    await publicPage.goto(`/corporate-impact/${state.public_slug}`);
    await expect(publicPage.getByText(report.export_code).first()).toBeVisible();
    const publicPdf = await publicPage.request.get(`/corporate-impact/${state.public_slug}/artifact/pdf`);
    expect(publicPdf.status()).toBe(200);
    expect(publicPdf.headers()["content-type"]).toContain("application/pdf");
    expect((await publicPage.request.get(`/corporate-impact/${state.public_slug}/artifact/data`)).status()).toBe(404);

    // The publicly published numbers must be fixed at the publication time.
    const frozenBefore = await getPublicCorporateImpactReport(state.public_slug);
    expect(frozenBefore).not.toBeNull();
    const [budgetBefore] = await sql<{ budget_amount: string }[]>`
      select budget_amount::text from corporate_programs where id = ${programId}
    `;
    modifiedProgramBudget = budgetBefore.budget_amount;
    modifiedProgramId = programId;
    await sql`update corporate_programs set budget_amount = budget_amount + 2000 where id = ${programId}`;
    const frozenAfter = await getPublicCorporateImpactReport(state.public_slug);
    expect(frozenAfter?.metrics.committedFunding).toBe(frozenBefore?.metrics.committedFunding);
    await publicPage.reload();
    await expect(publicPage.getByText(report.export_code).first()).toBeVisible();
    await publicPage.close();

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
    await loginAs(regular, "partner.demo@terumbu.eco", "/partner");
    await regular.goto("/corporate/reports");
    await expect(regular).toHaveURL(/\/forbidden\?next=/);
  } finally {
    await Promise.all([corporateContext.close(), regularContext.close(), reviewerContext.close()]);
    if (modifiedProgramId && modifiedProgramBudget !== null) {
      await sql`update corporate_programs set budget_amount = ${modifiedProgramBudget} where id = ${modifiedProgramId}`;
    }
    if (reviewerPermissionAssignmentId) {
      await sql`delete from corporate_permissions where id = ${reviewerPermissionAssignmentId}`;
    }
    if (reviewerRoleAssignmentId) {
      await sql`delete from user_roles where id = ${reviewerRoleAssignmentId}`;
    }
    if (reportId) {
      await sql`delete from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id = ${reportId}`;
      await sql`delete from corporate_report_exports where id = ${reportId}`;
    }
    if (foreignProgramId) await sql`delete from corporate_programs where id = ${foreignProgramId}`;
    if (foreignAccountId) await sql`delete from corporate_accounts where id = ${foreignAccountId}`;
    await sql.end();
  }
});
