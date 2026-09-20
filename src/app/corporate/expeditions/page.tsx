import { CalendarDays, Download, MapPin, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { createCorporateActivityPdfReportAction } from "@/lib/corporate-actions";
import { corporateReportArtifactRoute } from "@/lib/corporate-report-artifact-links";
import { getCorporateExpeditionActivities } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Expeditions"
};

export const dynamic = "force-dynamic";

type CorporateExpeditionsPageProps = {
  searchParams?: Promise<{ error?: string; programId?: string; saved?: string }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-";
}

export default async function CorporateExpeditionsPage({ searchParams }: CorporateExpeditionsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/expeditions");
  const data = await requireCorporateDashboardData(user.id, "/corporate/expeditions", params?.programId);
  const activities = await getCorporateExpeditionActivities(user.id, data.program.programId);
  const reports = data.exports.filter((item) => item.activityScope === "expeditions");
  const participantCount = activities.reduce((total, item) => total + item.participantsCount, 0);
  const bookingValue = activities.reduce((total, item) => total + item.totalAmountValue, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Expeditions</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Corporate expedition activity</h1>
        <p className="mt-2 text-sm text-ocean-900/62">Only bookings explicitly joined under this corporate account are shown here.</p>
      </header>

      {params?.saved === "report" ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">PDF report generated.</p> : null}
      {params?.error ? <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">The requested action could not be completed.</p> : null}

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { label: "Bookings", value: activities.length.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Participants", value: participantCount.toLocaleString("id-ID"), icon: Users },
          { label: "Booking value", value: formatCurrency(bookingValue), icon: MapPin }
        ].map((metric) => {
          const Icon = metric.icon;
          return <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft"><Icon className="size-5 text-ocean-700" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-ocean-900/56">{metric.label}</p><MetricValue className="mt-2 text-ocean-900">{metric.value}</MetricValue></article>;
        })}
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Activity</h2>
        <div className="mt-4 divide-y divide-ocean-900/10">
          {activities.map((item) => (
            <div key={item.id} className="grid gap-2 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-bold text-ocean-900">{item.expeditionTitle}</p>
                <p className="mt-1 text-sm text-ocean-900/56">{formatDate(item.startsAt)} · {item.participantsCount} participant{item.participantsCount === 1 ? "" : "s"} · {item.contactName}</p>
              </div>
              <div className="md:text-right"><p className="font-bold text-ocean-900">{formatCurrency(item.totalAmountValue, item.currency)}</p><p className="mt-1 text-xs capitalize text-ocean-900/52">{item.statusLabel}</p></div>
            </div>
          ))}
          {activities.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No corporate expedition activity yet.</p> : null}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Expedition report</h2><p className="mt-1 text-sm text-ocean-900/58">Branded PDF with report scope, booking and participant summary, expedition activity detail, and traceability note.</p></div>
          <form action={createCorporateActivityPdfReportAction}>
            <input type="hidden" name="activityScope" value="expeditions" />
            <input type="hidden" name="programId" value={data.program.programId} />
            <Button type="submit" tone="secondary"><Download className="size-4" aria-hidden="true" />Generate PDF</Button>
          </form>
        </div>
        <div className="mt-4 divide-y divide-ocean-900/10">
          {reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-ocean-900">{report.exportCode}</p><p className="text-xs text-ocean-900/52">{formatDate(report.generatedAt)}</p></div>
              {report.pdfUrl ? <Link href={corporateReportArtifactRoute(report.id, "pdf")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ocean-50 px-4 text-sm font-bold text-ocean-900"><Download className="size-4" aria-hidden="true" />PDF</Link> : null}
            </div>
          ))}
          {reports.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No expedition report yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
