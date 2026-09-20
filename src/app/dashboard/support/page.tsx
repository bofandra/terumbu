import { HelpCircle, Mail, MessageCircle, Send } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { submitSupportQuestionAction } from "@/lib/support-actions";

export const metadata = {
  title: "Help & Support"
};

export const dynamic = "force-dynamic";

type DashboardSupportPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const faqs = [
  {
    question: "Where can I download donation receipts?",
    answer: "Open Donations, choose a paid donation, then download the receipt from the donation detail."
  },
  {
    question: "When does expedition payment become confirmed?",
    answer: "Bookings stay pending while the gateway or admin confirmation is still being processed."
  },
  {
    question: "Can I use my Academy transcript outside Terumbu?",
    answer: "Yes. Each course enrollment has a per-course transcript PDF for study, competition, or work applications."
  },
  {
    question: "Why can I only view my Impact Passport?",
    answer: "Passport visibility and privacy rules are managed by Terumbu admins. Your dashboard shows the current passport and share links."
  }
];

function whatsappSupportHref(userEmail: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return `https://wa.me/?text=${encodeURIComponent(`Hi Terumbu support, I need help with my account: ${userEmail}`)}`;
}

export default async function DashboardSupportPage({ searchParams }: DashboardSupportPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/support");
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "support@terumbu.eco";
  const supportHref = `mailto:${supportEmail}?subject=${encodeURIComponent("Help with my Terumbu account")}&body=${encodeURIComponent(
    `Account email: ${user.email}\n\nHow can we help?`
  )}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid gap-6 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Help & Support</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">How can we help?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Check the FAQ, send a support question, or message the Terumbu admin team on WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ButtonLink href={whatsappSupportHref(user.email)} tone="secondary">
            <MessageCircle size={17} aria-hidden="true" />
            WhatsApp admin
          </ButtonLink>
          <ButtonLink href={supportHref} tone="light">
            <Mail size={17} aria-hidden="true" />
            Email
          </ButtonLink>
        </div>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          Your support question was recorded. The team can follow up using your account email.
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          Add a subject and a clear message before sending.
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <HelpCircle size={26} aria-hidden="true" className="text-coral-500" />
          <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">FAQ</h2>
          <div className="mt-5 grid gap-3">
            {faqs.map((item) => (
              <details key={item.question} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <summary className="cursor-pointer font-bold text-ocean-900">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-ocean-900/62">{item.answer}</p>
              </details>
            ))}
          </div>
        </article>

        <form action={submitSupportQuestionAction} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <Mail size={26} aria-hidden="true" className="text-coral-500" />
          <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">Ask support</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/62">
            Your account email is included automatically so support can find the right records.
          </p>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              Topic
              <select name="topic" className="min-h-11 rounded-xl border border-ocean-900/14 px-4 text-sm font-semibold outline-none focus:border-coral-500">
                <option>Donation and receipt</option>
                <option>Expedition booking</option>
                <option>Academy transcript</option>
                <option>Impact Passport</option>
                <option>Account access</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              Subject
              <input name="subject" placeholder="What do you need help with?" className="min-h-11 rounded-xl border border-ocean-900/14 px-4 text-sm font-semibold outline-none placeholder:text-ocean-900/40 focus:border-coral-500" required />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              Message
              <textarea
                name="message"
                rows={6}
                placeholder="Share the details, relevant booking or donation code, and what outcome you need."
                className="rounded-xl border border-ocean-900/14 px-4 py-3 text-sm font-semibold leading-6 outline-none placeholder:text-ocean-900/40 focus:border-coral-500"
                required
              />
            </label>
          </div>
          <Button type="submit" className="mt-5">
            <Send size={17} aria-hidden="true" />
            Send question
          </Button>
        </form>
      </section>
    </main>
  );
}
