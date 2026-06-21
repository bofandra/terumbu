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

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const [log] = await db
    .insert(emailLogs)
    .values({
      userId: input.userId ?? null,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      template: input.template,
      status: "queued",
      payload: input.payload ?? {}
    })
    .returning({ id: emailLogs.id });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { status: "queued" as const, logId: log.id };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.recipientEmail,
      subject: input.subject,
      text: renderText(input.template, input.payload ?? {})
    })
  });

  const status = response.ok ? "sent" : "failed";

  await db
    .update(emailLogs)
    .set({
      status,
      sentAt: response.ok ? new Date() : null
    })
    .where(eq(emailLogs.id, log.id));

  return { status, logId: log.id };
}
