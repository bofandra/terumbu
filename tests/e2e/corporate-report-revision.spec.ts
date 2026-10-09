import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("revising a published corporate ESG report creates a new independent PDF and preserves the old version", async ({ browser }) => {
  test.setTimeout(150_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const context = await browser.newContext();
  const reportIds: string[] = [];

  try {
    const page = await context.newPage();
    await loginAs(page, "corporate.demo@terumbu.eco", "/corporate/reports");
    const form = page.locator('form:has(button:has-text("Generate ESG report"))');
    await expect(form).toBeVisible();
    const programId = await form.locator('input[name="programId"]').inputValue();
    const [actor] = await sql<{ id: string }[]>`
      select id from users where email = 'corporate.demo@terumbu.eco' limit 1
    `;
    expect(actor?.id).toBeTruthy();

    await Promise.all([
      page.waitForURL(/saved=export/),
      form.getByRole("button", { name: "Generate ESG report" }).click()
    ]);
    const [source] = await sql<{ id: string; export_code: string; artifact_version: number; metadata: Record<string, unknown> }[]>`
      select id, export_code, artifact_version, metadata
      from corporate_report_exports
      where requested_by_user_id = ${actor.id} and program_id = ${programId}
        and report_type = 'esg'
      order by created_at desc limit 1
    `;
    expect(source?.id).toBeTruthy();
    reportIds.push(source.id);
    expect(source.metadata.generationSnapshot).toBeTruthy();
    const slug = `e2e-version-source-${source.id}`;
    await sql`
      update corporate_report_exports
      set status = 'published', public_slug = ${slug}, published_at = now(),
        metadata = coalesce(metadata,'{}'::jsonb) ||
          jsonb_build_object('publicSnapshot', metadata->'generationSnapshot')
      where id = ${source.id}
    `;

    await page.goto(`/corporate/reports?programId=${programId}`);
    const original = page.locator(`[data-testid="corporate-report-${source.id}"]`);
    await expect(original.getByRole("button", { name: "Create revision" })).toBeVisible();
    await Promise.all([
      page.waitForURL(/saved=export/),
      original.getByRole("button", { name: "Create revision" }).click()
    ]);
    const [newReport] = await sql<{
      id: string;
      export_code: string;
      artifact_version: number;
      status: string;
      metadata: { revisionOfReportId: string; revisionOfExportCode: string; generationSnapshot: unknown; pdfUrl: string };
    }[]>`
      select id, export_code, artifact_version, status, metadata
      from corporate_report_exports where program_id = ${programId}
        and (metadata->>'revisionOfReportId') = ${source.id}
      order by created_at desc limit 1
    `;
    expect(newReport?.id).toBeTruthy();
    reportIds.push(newReport.id);
    expect(newReport.id).not.toBe(source.id);
    expect(newReport.export_code).not.toBe(source.export_code);
    expect(newReport.artifact_version).toBeGreaterThan(source.artifact_version);
    expect(newReport.status).toBe("generated");
    expect(newReport.metadata.revisionOfReportId).toBe(source.id);
    expect(newReport.metadata.revisionOfExportCode).toBe(source.export_code);
    expect(newReport.metadata.generationSnapshot).toBeTruthy();

    const newCard = page.locator(`[data-testid="corporate-report-${newReport.id}"]`);
    await expect(newCard).toContainText(`New version of ${source.export_code}`);
    await expect(newCard.getByRole("button", { name: "Submit for review" })).toBeVisible();
    const newPdf = await page.request.get(`/corporate/reports/${newReport.id}/artifact/pdf`);
    expect(newPdf.status()).toBe(200);
    expect(newPdf.headers()["content-type"]).toContain("application/pdf");

    // Creating a revision is never a rewrite of the previously published row.
    const [unchanged] = await sql<{ status: string; public_slug: string; export_code: string }[]>`
      select status, public_slug, export_code from corporate_report_exports where id = ${source.id}
    `;
    expect(unchanged).toEqual({ status: "published", public_slug: slug, export_code: source.export_code });
    const oldPublic = await page.request.get(`/corporate-impact/${slug}`);
    expect(oldPublic.status()).toBe(200);
  } finally {
    await context.close();
    if (reportIds.length) {
      await sql`
        delete from admin_audit_logs where entity_type = 'corporate_report_exports'
        and entity_id in ${sql(reportIds)}
      `;
      await sql`delete from corporate_report_exports where id in ${sql(reportIds)}`;
    }
    await sql.end();
  }
});
