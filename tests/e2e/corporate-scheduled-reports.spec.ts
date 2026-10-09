import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { generateDueCorporateReport } from "../../src/lib/corporate-report-scheduler";
import { loginAs } from "./support";

test("scheduled corporate reports are scoped, serialized, retryable and manageable from the portal", async ({ browser }) => {
  test.setTimeout(150_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 3 });
  const context = await browser.newContext();
  const reportIds: string[] = [];
  try {
    const [actor] = await sql<{ user_id: string; program_id: string }[]> `
      select cp.user_id, p.id as program_id from corporate_permissions cp
      join corporate_programs p on p.corporate_account_id = cp.corporate_account_id
      join users u on u.id = cp.user_id
      where u.email = 'corporate.demo@terumbu.eco'
      order by p.created_at desc limit 1
    `;
    expect(actor).toBeTruthy();
    const insertReport = async (scheduledFor: Date) => {
      const [row] = await sql<{ id: string }[]> `
        insert into corporate_report_exports
          (program_id, requested_by_user_id, export_code, report_type, export_format,
           status, scheduled_for, metadata)
        values (${actor.program_id}, ${actor.user_id}, ${`E2E-SCHED-${randomUUID()}`},
          'esg', 'pdf', 'scheduled', ${scheduledFor}, ${sql.json({ scheduledByUserId: actor.user_id })})
        returning id
      `;
      reportIds.push(row.id);
      return row.id;
    };
    const due = await insertReport(new Date(Date.now() - 3_600_000));
    const future = await insertReport(new Date(Date.now() + 3_600_000));

    let calls = 0;
    const generate = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 60));
      return {
        fileUrl: "private://corporate-reports/e2e-scheduled.pdf",
        previewUrl: null,
        evidenceBundleUrl: null,
        generatedAt: new Date(),
        artifactManifest: { fileCount: 1 },
        metadata: { generationSnapshot: { snapshotVersion: 1, portfolio: [], evidence: [] } }
      };
    };
    const input = { reportId: due, programId: actor.program_id, actorUserId: actor.user_id, generate };

    expect(await generateDueCorporateReport({ ...input, programId: randomUUID() })).toBe(false);
    expect(await generateDueCorporateReport({ ...input, reportId: future })).toBe(false);
    expect(calls).toBe(0);

    const outcomes = await Promise.all([
      generateDueCorporateReport(input),
      generateDueCorporateReport(input)
    ]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(calls).toBe(1);
    const [stored] = await sql<{ status: string; metadata: Record<string, unknown> }[]> `
      select status, metadata from corporate_report_exports where id = ${due}
    `;
    expect(stored.status).toBe("generated");
    expect(stored.metadata.generatedFromSchedule).toBe(true);
    expect(stored.metadata.scheduledByUserId).toBe(actor.user_id);
    const [audit] = await sql<{ total: number }[]> `
      select count(*)::int as total from admin_audit_logs
      where entity_type = 'corporate_report_exports'
        and entity_id = ${due} and action = 'corporate.report.scheduled_generated'
    `;
    expect(audit.total).toBe(1);

    // A failure leaves the row in scheduled state and does not produce an audit.
    const retry = await insertReport(new Date(Date.now() - 3_600_000));
    await expect(generateDueCorporateReport({
      ...input,
      reportId: retry,
      generate: async () => { throw new Error("Simulated PDF storage outage"); }
    })).rejects.toThrow("Simulated PDF storage outage");
    const [pending] = await sql<{ status: string }[]> `
      select status from corporate_report_exports where id = ${retry}
    `;
    expect(pending.status).toBe("scheduled");
    expect(await generateDueCorporateReport({ ...input, reportId: retry })).toBe(true);

    // The UI's manual processing action operates only on the selected program.
    const page = await context.newPage();
    await loginAs(page, "corporate.demo@terumbu.eco", `/corporate/reports?programId=${actor.program_id}`);
    await expect(page.getByRole("button", { name: /Generate due reports/ })).toBeVisible();
    const futureForm = page.locator('form:has(button:has-text("Schedule PDF"))');
    await expect(futureForm).toBeVisible();
    await futureForm.locator('input[name="scheduledFor"]').fill("2099-12-31T12:30");
    await Promise.all([
      page.waitForURL(/saved=scheduled/),
      futureForm.getByRole("button", { name: "Schedule PDF" }).click()
    ]);
    await expect(page.getByText("Report scheduled.", { exact: false })).toBeVisible();

    // Clean newly created UI report(s), in addition to direct helper fixtures.
    const created = await sql<{ id: string }[]> `
      select id from corporate_report_exports
      where requested_by_user_id = ${actor.user_id} and program_id = ${actor.program_id}
        and status = 'scheduled'
        and scheduled_for = '2099-12-31T12:30:00Z'::timestamptz
      order by created_at desc
    `;
    for (const row of created) reportIds.push(row.id);
  } finally {
    await context.close();
    if (reportIds.length > 0) {
      await sql`delete from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id in ${sql(reportIds)}`;
      await sql`delete from corporate_report_exports where id in ${sql(reportIds)}`;
    }
    await sql.end();
  }
});
