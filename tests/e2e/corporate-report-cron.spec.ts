import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("authenticated corporate cron generates each due report once, records revoked access and backs off", async ({ request }) => {
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
  } finally {
    if (reports.length) {
      await sql`delete from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id in ${sql(reports)}`;
      await sql`delete from corporate_report_exports where id in ${sql(reports)}`;
    }
    await sql.end();
  }
});
