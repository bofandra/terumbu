"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";

function supportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || "support@terumbu.eco";
}

export async function submitSupportQuestionAction(formData: FormData) {
  const user = await requireUser("/dashboard/support");
  const topic = String(formData.get("topic") ?? "").trim() || "General";
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (subject.length < 3 || message.length < 10) {
    redirect("/dashboard/support?error=support");
  }

  await sendTransactionalEmail({
    userId: user.id,
    recipientEmail: supportEmail(),
    subject: `[Terumbu Support] ${subject}`,
    template: "support_question",
    payload: {
      topic,
      subject,
      message,
      accountEmail: user.email,
      accountName: user.name ?? user.email
    }
  });

  redirect("/dashboard/support?saved=support");
}
