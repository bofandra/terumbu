import { BookOpen, CreditCard, HelpCircle, Mail, MapPinned, Settings } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export const metadata = {
  title: "Help & Support"
};

export const dynamic = "force-dynamic";

export default async function DashboardSupportPage() {
  const user = await requireUser("/dashboard/support");
  const supportHref = `mailto:support@terumbu.eco?subject=${encodeURIComponent("Help with my Terumbu account")}&body=${encodeURIComponent(
    `Account email: ${user.email}\n\nHow can we help?`
  )}`;
  const topics = [
    {
      label: "Account settings",
      description: "Profile details, password changes, notification preferences, and privacy controls.",
      href: "/dashboard/settings",
      icon: Settings
    },
    {
      label: "Payments",
      description: "Saved payment methods, monthly giving, retries, refunds, and billing operations.",
      href: "/dashboard/donations#payment-methods",
      icon: CreditCard
    },
    {
      label: "Expeditions",
      description: "Bookings, preparation checklist, departure details, and review follow-up.",
      href: "/dashboard/expeditions",
      icon: MapPinned
    },
    {
      label: "Academy",
      description: "Course progress, transcripts, certificates, and learning records.",
      href: "/dashboard/academy",
      icon: BookOpen
    }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid gap-6 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Help & Support</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">How can we help?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Reach the Terumbu support team or jump straight to the dashboard area connected to your question.
          </p>
        </div>
        <ButtonLink href={supportHref} tone="primary">
          <Mail size={17} aria-hidden="true" />
          Contact support
        </ButtonLink>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {topics.map((topic) => {
          const Icon = topic.icon;

          return (
            <Link key={topic.label} href={topic.href} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft hover:border-coral-500">
              <Icon size={24} aria-hidden="true" className="text-coral-500" />
              <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">{topic.label}</h2>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">{topic.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <HelpCircle size={26} aria-hidden="true" className="text-coral-500" />
        <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">Support details</h2>
        <p className="mt-2 text-sm leading-6 text-ocean-900/62">
          We include your account email in the support draft so the team can find the right records faster. You can edit the message before sending.
        </p>
        <Link href={supportHref} className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
          Email support@terumbu.eco
        </Link>
      </section>
    </main>
  );
}
