import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { emailLogs } from "@/db/schema";

type TransactionalEmailInput = {
  userId?: string | null;
  recipientEmail: string;
  subject: string;
  template: string;
  payload?: Record<string, unknown>;
};

function renderText(template: string, payload: Record<string, unknown>) {
  const details = Object.entries(payload)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");

  return `Terumbu.eco ${template.replace(/_/g, " ")}\n\n${details}`;
}

function failurePayload(payload: Record<string, unknown>, deliveryError: string, extra: Record<string, unknown> = {}) {
  return {
    ...payload,
    deliveryError,
    ...extra
  };
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const payload = input.payload ?? {};
  const [log] = await db
    .insert(emailLogs)
    .values({
      userId: input.userId ?? null,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      template: input.template,
      status: "queued",
      payload
    })
    .returning({ id: emailLogs.id });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const missingConfig = [
    !apiKey ? "RESEND_API_KEY" : null,
    !from ? "RESEND_FROM_EMAIL" : null
  ].filter(Boolean);

  if (missingConfig.length > 0) {
    await db
      .update(emailLogs)
      .set({
        status: "failed",
        payload: failurePayload(payload, "missing_resend_config", { missingConfig })
      })
      .where(eq(emailLogs.id, log.id));

    return { status: "failed" as const, logId: log.id };
  }

  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: input.recipientEmail,
        subject: input.subject,
        text: renderText(input.template, payload)
      })
    });
  } catch (error) {
    await db
      .update(emailLogs)
      .set({
        status: "failed",
        payload: failurePayload(payload, "resend_request_failed", {
          errorMessage: error instanceof Error ? error.message : "Unknown email delivery error"
        })
      })
      .where(eq(emailLogs.id, log.id));

    return { status: "failed" as const, logId: log.id };
  }

  const status = response.ok ? "sent" : "failed";

  await db
    .update(emailLogs)
    .set({
      status,
      sentAt: response.ok ? new Date() : null,
      ...(response.ok
        ? {}
        : {
            payload: failurePayload(payload, "resend_response_failed", {
              responseStatus: response.status
            })
          })
    })
    .where(eq(emailLogs.id, log.id));

  return { status, logId: log.id };
}
