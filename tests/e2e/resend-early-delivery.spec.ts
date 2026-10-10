import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { completeCorporateReportAlertAcceptance } from "../../src/lib/corporate-report-alert-email";
import {
  pruneResendCorporateDeliveryEvents,
  reconcilePendingResendCorporateDeliveryEvents
} from "../../src/lib/resend-corporate-webhook";

test("signed early delivery is durably replayed on acceptance and cannot be duplicated", async ({ request }) => {
  test.skip(!process.env.RESEND_WEBHOOK_SECRET || !process.env.DATABASE_URL,
    "Resend signed webhook E2E requires a fixture secret and PostgreSQL");
  const sql = postgres(process.env.DATABASE_URL!, { max: 3 });
  const providerMessageId = randomUUID();
  const orphanMessageId = randomUUID();
  const eventId = `msg_${randomUUID()}`;
  const secret = process.env.RESEND_WEBHOOK_SECRET!;
  const key = Buffer.from(secret.slice(6), "base64");
  let jobId: string | null = null;

  async function sendWebhook(type: string, emailId: string, time: Date, id = `msg_${randomUUID()}`) {
    const body = JSON.stringify({
      type, created_at: time.toISOString(), data: { email_id: emailId }
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", key)
      .update(`${id}.${timestamp}.${body}`).digest("base64");
    return request.post("/api/webhooks/resend", {
      data: body, headers: {
        "content-type": "application/json",
        "svix-id": id, "svix-timestamp": timestamp,
        "svix-signature": `v1,${signature}`
      }
    });
  }

  try {
    const [job] = await sql<{ id: string }[]>`
      insert into email_logs (recipient_email, subject, template, status, delivery_key, attempt_count)
      values ('early-event@terumbu.invalid', 'Signed webhook E2E', 'corporate_report_failure',
        'sending', ${`e2e-early-${randomUUID()}`}, 1)
      returning id
    `;
    jobId = job.id;

    const occurredAt = new Date(Date.now() - 20_000);
    expect((await sendWebhook("email.delivered", providerMessageId, occurredAt, eventId)).status()).toBe(200);
    const [early] = await sql<{ applied_at: Date | null }[]>`
      select applied_at from resend_webhook_events where event_id = ${eventId}
    `;
    expect(early).toBeTruthy();
    expect(early.applied_at).toBeNull();
    const [before] = await sql<{ status: string; provider_message_id: string | null }[]>`
      select status, provider_message_id from email_logs where id = ${jobId}
    `;
    expect(before.status).toBe("sending");
    expect(before.provider_message_id).toBeNull();

    const completed = await completeCorporateReportAlertAcceptance({
      id: jobId, attemptCount: 1, providerMessageId, now: new Date()
    });
    expect(completed).toBe(true);
    const [after] = await sql<{ status: string; provider_event_type: string; provider_message_id: string }[]>`
      select status, provider_event_type, provider_message_id from email_logs where id = ${jobId}
    `;
    expect(after.status).toBe("delivered");
    expect(after.provider_event_type).toBe("email.delivered");
    expect(after.provider_message_id).toBe(providerMessageId);

    const [replayed] = await sql<{ applied_at: Date | null }[]>`
      select applied_at from resend_webhook_events where event_id = ${eventId}
    `;
    expect(replayed.applied_at).toBeTruthy();

    // Resending an identical Svix event ID is a no-op, even if its payload changes.
    expect((await sendWebhook("email.bounced", providerMessageId, new Date(), eventId)).status()).toBe(200);
    const [stillDelivered] = await sql<{ status: string }[]>`
      select status from email_logs where id = ${jobId}
    `;
    expect(stillDelivered.status).toBe("delivered");
    const [count] = await sql<{ total: number }[]>`
      select count(*)::int as total from resend_webhook_events where event_id = ${eventId}
    `;
    expect(count.total).toBe(1);

    // A callback for an unrelated provider message is journalled without
    // modifying this corporate email. It will be safely pruned later.
    expect((await sendWebhook("email.bounced", orphanMessageId, new Date())).status()).toBe(200);
    const [unrelated] = await sql<{ status: string }[]>`
      select status from email_logs where id = ${jobId}
    `;
    expect(unrelated.status).toBe("delivered");

    // Crash recovery: an unmatched journal row becomes applicable after a
    // provider ID is committed, even without an inline replay.
    const recoveredId = randomUUID();
    const [pendingJob] = await sql<{ id: string }[]>`
      insert into email_logs
        (recipient_email, subject, template, status, delivery_key, provider_message_id, sent_at)
      values ('recover@terumbu.invalid', 'Cron recovery E2E', 'corporate_report_failure',
        'sent', ${`e2e-recover-${randomUUID()}`}, ${recoveredId}, now())
      returning id
    `;
    expect((await sendWebhook("email.delivery_delayed", recoveredId, occurredAt)).status()).toBe(200);
    await sql`update email_logs set status = 'sent', provider_event_type = null, provider_event_at = null where id = ${pendingJob.id}`;
    const [pendingEvent] = await sql<{ event_id: string }[]>`
      select event_id from resend_webhook_events where provider_message_id = ${recoveredId} limit 1
    `;
    await sql`update resend_webhook_events set applied_at = null where event_id = ${pendingEvent.event_id}`;
    const stats = await reconcilePendingResendCorporateDeliveryEvents();
    expect(stats.applied).toBeGreaterThanOrEqual(1);
    const [recovered] = await sql<{ status: string }[]>`
      select status from email_logs where id = ${pendingJob.id}
    `;
    expect(recovered.status).toBe("delivery_delayed");

    // Prevent an older callback from overriding the recovered outcome.
    expect((await sendWebhook("email.delivered", recoveredId,
      new Date(occurredAt.getTime() - 1_000))).status()).toBe(200);
    const [afterOld] = await sql<{ status: string }[]>`
      select status from email_logs where id = ${pendingJob.id}
    `;
    expect(afterOld.status).toBe("delivery_delayed");

    await sql`delete from email_logs where id = ${pendingJob.id}`;

    // Confirm journal retention is bounded and does not depend on raw payload.
    await sql`
      update resend_webhook_events
      set received_at = now() - interval '74 hours'
      where provider_message_id = ${orphanMessageId}
    `;
    expect(await pruneResendCorporateDeliveryEvents()).toBeGreaterThanOrEqual(1);
    const [orphanCount] = await sql<{ total: number }[]>`
      select count(*)::int as total from resend_webhook_events
      where provider_message_id = ${orphanMessageId}
    `;
    expect(orphanCount.total).toBe(0);
    await sql`delete from resend_webhook_events where provider_message_id = ${recoveredId}`;
  } finally {
    if (jobId) await sql`delete from email_logs where id = ${jobId}`;
    await sql`delete from resend_webhook_events where provider_message_id in (${providerMessageId}, ${orphanMessageId})`;
    await sql.end();
  }
});
