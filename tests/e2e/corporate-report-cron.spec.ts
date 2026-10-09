import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { getCorporateReportExecutionMonitor } from "../../src/lib/corporate-report-execution-monitor";
import { loginAs } from "./support";

test("authenticated corporate cron generates each due report once, records revoked access and backs off", async ({ request, browser }) => {
  test.skip(!process.env.CRON_SECRET, "CRON_SECRET is required for cron integration test");
  test.setTimeout(120_000);

  const sql = postgres(process.env.DATABASE_URL!, { max: 2 });
  const reports: string[] = [];
  try {
    const [actor] = await sql<{ user_id: string; program_id: string }[]> `
      select cp.user_id, p.id as program_id from corporate_permissions cp
      join corporate_programs p on p.corporate_account_id = cp.corporate_account_id
      join users u on u.id = cp.user_id
      where u.email = 'corporate.demo@terumbu.eco'
      order by p.created_at desc limit 1
    `;
    const [outsider] = await sql<{ id: string }[]> `
      select id from users where email = 'user.demo@terumbu.eco' limit 1
    `;
    expect(actor).toBeTruthy();
    expect(outsider).toBeTruthy();
    const insert = async (requestedBy: string) => {
      const [report] = await sql<{ id: string }[]> `
        insert into corporate_report_exports
          (program_id, requested_by_user_id, export_code, report_type, export_format, status, scheduled_for, metadata)
        values (${actor.program_id}, ${requestedBy}, ${`E2E-AUTO-${randomUUID()}`},
          'csr', 'pdf', 'scheduled', now() - interval '10 minutes', ${sql.json({ scheduledByUserId: requestedBy })})
        returning id
      `;
      reports.push(report.id);
      return report.id;
    };
    const authorizedReportId = await insert(actor.user_id);
    const revokedReportId = await insert(outsider.id);

    expect((await request.get("/api/cron/corporate-reports")).status()).toBe(405);
    expect((await request.post("/api/cron/corporate-reports")).status()).toBe(401);
    expect((await request.post("/api/cron/corporate-reports", {
      headers: { authorization: "Bearer definitely-not-the-secret" }
    })).status()).toBe(401);

    const headers = { "x-cron-secret": process.env.CRON_SECRET! };
    const first = await request.post("/api/cron/corporate-reports", { headers });
    expect(first.status()).toBe(200);
    const summary = await first.json();
    expect(summary.ok).toBe(true);
    expect(summary.generated).toBeGreaterThanOrEqual(1);
    expect(summary.failed).toBeGreaterThanOrEqual(1);

    const [good] = await sql<{ status: string; file_url: string; metadata: Record<string, unknown> }[]> `
      select status, file_url, metadata from corporate_report_exports where id = ${authorizedReportId}
    `;
    expect(good.status).toBe("generated");
    expect(good.file_url).toMatch(/^private:\/\/corporate-reports\//);
    expect(good.metadata.generationSnapshot).toBeTruthy();
    expect(good.metadata.generatedFromSchedule).toBe(true);

    const [bad] = await sql<{ status: string; metadata: Record<string, unknown> }[]> `
      select status, metadata from corporate_report_exports where id = ${revokedReportId}
    `;
    expect(bad.status).toBe("scheduled");
    expect(bad.metadata.scheduleLastFailure).toBe("requester_not_authorized");
    expect(bad.metadata.scheduleFailureCount).toBe(1);
    expect(Date.parse(String(bad.metadata.nextRetryAt))).toBeGreaterThan(Date.now());

    // The first failure creates a durable, account-scoped admin alert.
    const alertCode = `corporate-report-failure-${revokedReportId}-1`;
    const notices = await sql<{ user_id: string; notification_code: string; href: string }[]> `
      select user_id, notification_code, href from user_notifications
      where source_type = 'corporate_report_export' and source_id = ${revokedReportId}
    `;
    expect(notices).toEqual([{
      user_id: actor.user_id,
      notification_code: alertCode,
      href: `/corporate/reports?programId=${actor.program_id}`
    }]);
    expect(notices.some((item) => item.user_id === outsider.id)).toBe(false);

    // The alert is transactionally enqueued exactly once for delivery.
    const queued = await sql<{ delivery_key: string; status: string; recipient_email: string }[]> `
      select delivery_key, status, recipient_email from email_logs
      where template = 'corporate_report_failure' and payload->>'reportId' = ${revokedReportId}
    `;
    expect(queued).toHaveLength(1);
    expect(queued[0].delivery_key).toMatch(/^corporate-report-alert-[0-9a-f-]+$/);
    expect(["queued", "retry", "sending", "failed"]).toContain(queued[0].status);
    expect(queued[0].recipient_email).toBe("corporate.demo@terumbu.eco");

    // The scoped report library must show failure state and chronological audit activity.
    const page = await browser.newPage();
    try {
      await loginAs(page, "corporate.demo@terumbu.eco", `/corporate/reports?programId=${actor.program_id}`);
      const overview = page.getByRole("region", { name: "Scheduled generation overview" });
      await expect(overview).toContainText("Needs attention");

      const failedMonitor = page.locator(`[data-testid="corporate-report-monitor-${revokedReportId}"]`);
      await expect(failedMonitor).toContainText("Waiting for retry");
      await expect(failedMonitor).toContainText("Failed attempts: 1");
      await expect(failedMonitor).toContainText("Next automatic retry:");
      await expect(failedMonitor).toContainText("original requester no longer has permission");
      await failedMonitor.locator("summary").click();
      await expect(failedMonitor).toContainText("Generation failed");
      await expect(failedMonitor).toContainText("Automatic worker");

      const generatedMonitor = page.locator(`[data-testid="corporate-report-monitor-${authorizedReportId}"]`);
      await expect(generatedMonitor).toContainText("Generated from schedule");
      await generatedMonitor.locator("summary").click();
      await expect(generatedMonitor).toContainText("PDF generated");
      await expect(generatedMonitor).toContainText("Automatic worker");

      // Alert is discoverable from the corporate sidebar and leads back to
      // this selected program; it is not restricted to the report monitor.
      await expect(page.getByRole("link", { name: "Notifications" })).toHaveAttribute(
        "href", "/dashboard/notifications"
      );
      await page.goto("/dashboard/notifications");
      await expect(page.getByRole("link", {
        name: /PDF report E2E-AUTO-.* could not be generated \(attempt 1\)/
      })).toHaveAttribute("href", `/corporate/reports?programId=${actor.program_id}`);

    } finally {
      await page.close();
    }

    // An unauthorized or unselected program cannot expose the run history.
    const unauthorized = await getCorporateReportExecutionMonitor(
      actor.user_id,
      randomUUID(),
      [{ id: revokedReportId, status: bad.status, metadata: bad.metadata, scheduledFor: new Date() }]
    );
    expect(unauthorized.summary.scheduled).toBe(0);
    expect(Object.keys(unauthorized.byReportId)).toHaveLength(0);

    const repeat = await request.post("/api/cron/corporate-reports", { headers });
    expect(repeat.status()).toBe(200);
    const [audits] = await sql<{ generated: number; failed: number }[]> `
      select
        count(*) filter (where action = 'corporate.report.scheduled_generated' and entity_id = ${authorizedReportId})::int as generated,
        count(*) filter (where action = 'corporate.report.scheduled_failed' and entity_id = ${revokedReportId})::int as failed
      from admin_audit_logs
      where entity_type = 'corporate_report_exports' and entity_id in (${authorizedReportId}, ${revokedReportId})
    `;
    expect(audits.generated).toBe(1);
    expect(audits.failed).toBe(1);

    const [notificationCount] = await sql<{ total: number }[]> `
      select count(*)::int as total from user_notifications
      where source_type = 'corporate_report_export' and source_id = ${revokedReportId}
    `;
    expect(notificationCount.total).toBe(1);

    // Recovery auto-resolves stale alerts and cancels unsent deliveries.
    // Make the previously revoked requester eligible and advance the retry.
    await sql`
      update corporate_report_exports
      set requested_by_user_id = ${actor.user_id},
          metadata = jsonb_set(metadata, '{nextRetryAt}', to_jsonb((now() - interval '1 minute')::text))
      where id = ${revokedReportId}
    `;
    const recovered = await request.post("/api/cron/corporate-reports", { headers });
    expect(recovered.status()).toBe(200);
    const [recoveredReport] = await sql<{ status: string }[]> `
      select status from corporate_report_exports where id = ${revokedReportId}
    `;
    expect(recoveredReport.status).toBe("generated");

    const [resolved] = await sql<{ read_at: Date; message: string }[]> `
      select read_at, message from user_notifications
      where source_type = 'corporate_report_export' and source_id = ${revokedReportId}
    `;
    expect(resolved.read_at).toBeTruthy();
    expect(resolved.message).toContain("generated successfully");
    const [delivery] = await sql<{ status: string }[]> `
      select status from email_logs
      where template = 'corporate_report_failure' and payload->>'reportId' = ${revokedReportId}
    `;
    expect(delivery.status).toBe("cancelled");
  } finally {
    if (reports.length) {
      await sql`delete from email_logs where template = 'corporate_report_failure' and payload->>'reportId' in ${sql(reports)}`;
      await sql`delete from user_notifications where source_type = 'corporate_report_export' and source_id in ${sql(reports)}`;
      await sql`delete from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id in ${sql(reports)}`;
      await sql`delete from corporate_report_exports where id in ${sql(reports)}`;
    }
    await sql.end();
  }
});
