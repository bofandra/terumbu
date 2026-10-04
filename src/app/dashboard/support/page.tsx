import { HelpCircle, Mail, MessageCircle, Send } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { submitSupportQuestionAction } from "@/lib/support-actions";
import { getPreferredLocale } from "@/lib/user-preferences";

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

function whatsappSupportHref(userEmail: string, message: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return `https://wa.me/?text=${encodeURIComponent(`${message}: ${userEmail}`)}`;
}

export default async function DashboardSupportPage({ searchParams }: DashboardSupportPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/support");
  const locale = await getPreferredLocale();
  const isIndonesian = locale === "id";
  const labels =
    isIndonesian
      ? {
          eyebrow: "Bantuan & Dukungan",
          title: "Apa yang bisa kami bantu?",
          subtitle: "Cari jawaban cepat di FAQ atau kirim pertanyaan jika kamu membutuhkan bantuan khusus terkait akun atau aktivitas.",
          whatsapp: "WhatsApp admin",
          email: "Email",
          whatsappMessage: "Halo tim Terumbu, saya membutuhkan bantuan untuk akun",
          emailSubject: "Bantuan untuk akun Terumbu saya",
          emailBody: "Email akun",
          emailQuestion: "Apa yang bisa kami bantu?",
          saved: "Pertanyaan dukungan sudah tercatat. Tim dapat menindaklanjuti melalui email akunmu.",
          error: "Tambahkan subjek dan pesan yang jelas sebelum mengirim.",
          faq: "Jawaban cepat",
          askSupport: "Hubungi dukungan",
          askSupportBody: "Email akunmu disertakan otomatis agar tim dapat menemukan record yang tepat.",
          topic: "Topik",
          subject: "Subjek",
          subjectPlaceholder: "Apa yang perlu kami bantu?",
          message: "Pesan",
          messagePlaceholder: "Jelaskan detailnya, kode booking atau donasi yang relevan, dan hasil yang kamu butuhkan.",
          send: "Kirim pertanyaan",
          topics: [
            { value: "Donation and receipt", label: "Donasi dan kuitansi" },
            { value: "Expedition booking", label: "Booking ekspedisi" },
            { value: "Academy transcript", label: "Transkrip Academy" },
            { value: "Impact Passport", label: "Impact Passport" },
            { value: "Account access", label: "Akses akun" }
          ],
          faqs: [
            {
              question: "Di mana saya bisa mengunduh kuitansi donasi?",
              answer: "Buka Donasi, pilih donasi yang sudah dibayar, lalu unduh kuitansi dari detail donasi."
            },
            {
              question: "Kapan pembayaran ekspedisi dianggap terkonfirmasi?",
              answer: "Booking tetap berstatus menunggu selama proses payment gateway atau konfirmasi admin belum selesai."
            },
            {
              question: "Apakah transkrip Academy dapat digunakan di luar Terumbu?",
              answer: "Ya. Setiap enrollment kursus memiliki PDF transkrip per kursus untuk kebutuhan belajar, kompetisi, atau lamaran kerja."
            },
            {
              question: "Bagaimana cara memahami data di Impact Passport?",
              answer: "Impact Passport merangkum aktivitas dan record yang memenuhi syarat. Outcome kampanye tetap dibedakan dari atribusi personal langsung."
            }
          ]
        }
      : {
          eyebrow: "Help & Support",
          title: "How can we help?",
          subtitle: "Find a quick answer in the FAQ or send a question when you need account- or activity-specific help.",
          whatsapp: "WhatsApp admin",
          email: "Email",
          whatsappMessage: "Hi Terumbu support, I need help with my account",
          emailSubject: "Help with my Terumbu account",
          emailBody: "Account email",
          emailQuestion: "How can we help?",
          saved: "Your support question was recorded. The team can follow up using your account email.",
          error: "Add a subject and a clear message before sending.",
          faq: "Quick answers",
          askSupport: "Contact support",
          askSupportBody: "Your account email is included automatically so support can find the right records.",
          topic: "Topic",
          subject: "Subject",
          subjectPlaceholder: "What do you need help with?",
          message: "Message",
          messagePlaceholder: "Share the details, relevant booking or donation code, and what outcome you need.",
          send: "Send question",
          topics: [
            { value: "Donation and receipt", label: "Donation and receipt" },
            { value: "Expedition booking", label: "Expedition booking" },
            { value: "Academy transcript", label: "Academy transcript" },
            { value: "Impact Passport", label: "Impact Passport" },
            { value: "Account access", label: "Account access" }
          ],
          faqs: [
            {
              question: "Where can I download donation receipts?",
              answer: "Open Donations, choose a paid donation, then download the receipt from the donation detail."
            },
            {
              question: "When does expedition payment become confirmed?",
              answer: "Bookings stay pending while the payment gateway or admin confirmation is still being processed."
            },
            {
              question: "Can I use my Academy transcript outside Terumbu?",
              answer: "Yes. Each course enrollment has a per-course transcript PDF for study, competition, or work applications."
            },
            {
              question: "How should I interpret my Impact Passport?",
              answer: "Impact Passport summarizes eligible activity and records. Campaign outcomes remain distinct from direct personal attribution."
            }
          ]
        };
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "support@terumbu.eco";
  const supportHref = `mailto:${supportEmail}?subject=${encodeURIComponent(labels.emailSubject)}&body=${encodeURIComponent(
    `${labels.emailBody}: ${user.email}\n\n${labels.emailQuestion}`
  )}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid gap-6 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ButtonLink href={whatsappSupportHref(user.email, labels.whatsappMessage)} tone="secondary">
            <MessageCircle size={17} aria-hidden="true" />
            {labels.whatsapp}
          </ButtonLink>
          <ButtonLink href={supportHref} tone="light">
            <Mail size={17} aria-hidden="true" />
            {labels.email}
          </ButtonLink>
        </div>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          {labels.saved}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {labels.error}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <HelpCircle size={26} aria-hidden="true" className="text-coral-500" />
          <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">{labels.faq}</h2>
          <div className="mt-5 grid gap-3">
            {labels.faqs.map((item) => (
              <details key={item.question} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <summary className="cursor-pointer font-bold text-ocean-900">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-ocean-900/62">{item.answer}</p>
              </details>
            ))}
          </div>
        </article>

        <form action={submitSupportQuestionAction} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <Mail size={26} aria-hidden="true" className="text-coral-500" />
          <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">{labels.askSupport}</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.askSupportBody}</p>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              {labels.topic}
              <select name="topic" className="min-h-11 rounded-xl border border-ocean-900/14 px-4 text-sm font-semibold outline-none focus:border-coral-500">
                {labels.topics.map((topic) => (
                  <option key={topic.value} value={topic.value}>{topic.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              {labels.subject}
              <input name="subject" placeholder={labels.subjectPlaceholder} className="min-h-11 rounded-xl border border-ocean-900/14 px-4 text-sm font-semibold outline-none placeholder:text-ocean-900/40 focus:border-coral-500" required />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              {labels.message}
              <textarea
                name="message"
                rows={6}
                placeholder={labels.messagePlaceholder}
                className="rounded-xl border border-ocean-900/14 px-4 py-3 text-sm font-semibold leading-6 outline-none placeholder:text-ocean-900/40 focus:border-coral-500"
                required
              />
            </label>
          </div>
          <Button type="submit" className="mt-5">
            <Send size={17} aria-hidden="true" />
            {labels.send}
          </Button>
        </form>
      </section>
    </main>
  );
}
