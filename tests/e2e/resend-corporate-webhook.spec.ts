import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("signed Resend events update only accepted corporate emails and remain replay/order safe", async ({ request, browser }) => {
  test.skip(!process.env.RESEND_WEBHOOK_SECRET || !process.env.DATABASE_URL,
    "Signed Resend webhook E2E requires a fixture secret and database");
  const sql = postgres(process.env.DATABASE_URL!, { max: 2 });
  let reportId: string | null = null;
  let logId: string | null = null;
  const providerEmailId = randomUUID();
  const secret = process.env.RESEND_WEBHOOK_SECRET!;
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const endpoint = "/api/webhooks/resend";

  const webhook = async (type: string, createdAt: Date, signedWith = key) => {
    const id = `msg_${randomUUID()}`;
    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      type, created_at: createdAt.toISOString(),
      data: { email_id: providerEmailId }
    });
    const signature = createHmac("sha256", signedWith)
      .update(`${id}.${ts}.${body}`).digest("base64");
    return request.post(endpoint, {
      data: body,
      headers: {
        "content-type": "application/json",
        "svix-id": id,
        "svix-timestamp": ts,
        "svix-signature": `v1,${signature}`
      }
    });
  };

  try {
    const [actor] = await sql<{ user_id: string; program_id: string }[]>`
      select cp.user_id, cp2.id as program_id
      from corporate_permissions cp
      join corporate_programs cp2 on cp2.corporate_account_id = cp.corporate_account_id
      join users u on u.id = cp.user_id
      where u.email = 'corporate.demo@terumbu.eco'
      order by cp2.created_at desc limit 1
    `;
    expect(actor).toBeTruthy();

    const [report] = await sql<{ id: string }[]>`
      insert into corporate_report_exports
        (program_id, requested_by_user_id, export_code, report_type, export_format, status, scheduled_for, metadata)
      values (${actor.program_id}, ${actor.user_id}, ${`E2E-WEBHOOK-${randomUUID()}`},
        'csr', 'pdf', 'scheduled', now() + interval '7 days', ${sql.json({})})
      returning id
    `;
    reportId = report.id;
    const [log] = await sql<{ id: string }[]>`
      insert into email_logs (user_id, recipient_email, subject, template, status, delivery_key,
        provider_message_id, sent_at, payload)
      values (${actor.user_id}, 'corporate.demo@terumbu.eco', 'Webhook delivery E2E',
        'corporate_report_failure', 'sent', ${`e2e-wh-${randomUUID()}`},
        ${providerEmailId}, now(), ${sql.json({reportId, programId: actor.program_id})})
      returning id
    `;
    logId = log.id;

    const original = new Date(Date.now() - 15_000);
    const older = new Date(Date.now() - 20_000);
    const newer = new Date(Date.now() - 5_000);

    const invalid = await webhook("email.bounced", original, Buffer.from("incorrect-signing-key"));
    expect(invalid.status()).toBe(401);

    const ignored = await webhook("email.opened", original);
    expect(ignored.status()).toBe(200);
    const [before] = await sql<{ status: string }[]>`
      select status from email_logs where id = ${logId}
    `;
    expect(before.status).toBe("sent");

    expect((await webhook("email.delivered", original)).status()).toBe(200);
    const [received] = await sql<{ status: string; provider_event_type: string; provider_event_at: Date }[]>`
      select status, provider_event_type, provider_event_at from email_logs where id = ${logId}
    `;
    expect(received.status).toBe("delivered");
    expect(received.provider_event_type).toBe("email.delivered");
    expect(new Date(received.provider_event_at).toISOString()).toBe(original.toISOString());

    // Replayed and out-of-order callbacks cannot downgrade the latest delivery state.
    expect((await webhook("email.delivered", original)).status()).toBe(200);
    expect((await webhook("email.delivery_delayed", older)).status()).toBe(200);
    const [unchanged] = await sql<{ status: string; provider_event_type: string }[]>`
      select status, provider_event_type from email_logs where id = ${logId}
    `;
    expect(unchanged.status).toBe("delivered");
    expect(unchanged.provider_event_type).toBe("email.delivered");

    const page = await browser.newPage();
    try {
      await loginAs(page, "corporate.demo@terumbu.eco", `/corporate/reports?programId=${actor.program_id}`);
      const monitor = page.locator(`[data-testid="corporate-report-email-status-${reportId}"]`);
      await expect(monitor).toContainText("Delivered 1");
      await expect(monitor).toContainText("recipient mail server");

      expect((await webhook("email.bounced", newer)).status()).toBe(200);
      const [bounced] = await sql<{ status: string; delivery_error: string }[]>`
        select status, delivery_error from email_logs where id = ${logId}
      `;
      expect(bounced.status).toBe("bounced");
      expect(bounced.delivery_error).toBe("email_bounced");
      await page.reload();
      await expect(page.locator(`[data-testid="corporate-report-email-status-${reportId}"]`)).toContainText("Bounced 1");
    } finally {
      await page.close();
    }
  } finally {
    if (logId) await sql`delete from email_logs where id = ${logId}`;
    if (reportId) await sql`delete from corporate_report_exports where id = ${reportId}`;
    await sql.end();
  }
});
