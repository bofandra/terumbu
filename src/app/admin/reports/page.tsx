import { FileText, Mail, RefreshCw } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminReportsPage, type AdminReportFilters } from "@/lib/queries";
import { runMonthlyImpactReportCycleAction, updatePlatformDeliverySettingsAction } from "@/lib/retention-actions";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Admin Reports" };
export const dynamic = "force-dynamic";

const pathname = "/admin/reports";

type PageProps = {
  searchParams?: Promise<AdminReportFilters & { emailed?: string; generated?: string; saved?: string }>;
};

type ReportsData = Awaited<ReturnType<typeof getAdminReportsPage>>;
type MonthlyReport = ReportsData["monthlyImpactReports"][number];

export default async function AdminReportsPage({ searchParams }: PageProps) {
  await requireRole(["admin"], pathname);
  const params = (await searchParams) ?? {};
  const data = await observeAdminDataLoader("admin.reports.simple", () => getAdminReportsPage({ ...params, monthlyPageSize: "10", pageSize: "1" }));
  const generated = Array.isArray(params.generated) ? params.generated[0] : params.generated;
  const emailed = Array.isArray(params.emailed) ? params.emailed[0] : params.emailed;
  const savedMessage = params.saved === "monthly-run"
    ? `Report cycle complete: ${generated ?? "0"} report(s) generated and ${emailed ?? "0"} email(s) queued.`
    : params.saved === "delivery-settings"
      ? "Platform notification and report settings updated."
      : null;

  const columns: AdminDataTableColumn<MonthlyReport>[] = [
    {
      key: "user",
      header: "User",
      render: (report) => (
        <div className="min-w-48">
          <p className="font-bold text-ocean-900">{report.displayName ?? report.userName ?? report.userEmail}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/52">{report.userEmail}</p>
        </div>
      )
    },
    { key: "month", header: "Month", render: (report) => <span className="font-bold text-ocean-900">{report.reportMonth}</span> },
    {
      key: "summary",
      header: "Report content",
      render: (report) => (
        <div className="min-w-56 text-sm font-semibold text-ocean-900/62">
          <p>{formatCurrency(report.contributions)} contributions</p>
          <p className="mt-1">{report.campaignUpdates} project update(s) / {report.newEvidence} new evidence</p>
          <p className="mt-1">{report.coralsMonitored} monitored ecosystem item(s) / {report.academyProgress} Academy progress</p>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (report) => (
        <div className="space-y-2">
          <AdminStatusBadge value={report.status} />
          <p className="text-xs font-semibold text-ocean-900/48">{report.emailedAt ? "Email sent" : "Dashboard only"}</p>
        </div>
      )
    },
    {
      key: "generated",
      header: "Generated",
      render: (report) => <time className="whitespace-nowrap font-semibold text-ocean-900/62">{report.generatedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</time>
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Monthly impact report"
        description="Terumbu generates one simple monthly impact report for eligible users."
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><FileText className="size-5" aria-hidden="true" /></span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">What the user receives</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">A branded, multi-page PDF available from the user dashboard, with an optional email summary.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["1. Cover & scope", "Terumbu branding, reporting month, user, report ID, and reporting basis."],
              ["2. Executive summary", "Contributions, project updates, evidence records, coral monitoring, and Academy progress."],
              ["3. Project activity", "Project-by-project contribution, update, and evidence summary from recorded platform activity."],
              ["4. Traceability note", "Clear source-of-record and assurance note. Delivery is always PDF; email is an optional summary only."]
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                <p className="font-bold text-ocean-900">{title}</p>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">{detail}</p>
              </div>
            ))}
          </div>
        </article>

        <form action={updatePlatformDeliverySettingsAction} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Platform delivery</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">These settings apply to all users.</p>
          <div className="mt-4 grid gap-2">
            {[
              ["campaignUpdates", "Project updates", data.platformDeliverySettings.campaignUpdates],
              ["evidenceAlerts", "Evidence alerts", data.platformDeliverySettings.evidenceAlerts],
              ["expeditionReminders", "Expedition reminders", data.platformDeliverySettings.expeditionReminders],
              ["academyUpdates", "Academy updates", data.platformDeliverySettings.academyUpdates],
              ["monthlyImpactReport", "Generate monthly PDF reports", data.platformDeliverySettings.monthlyImpactReport],
              ["monthlyImpactEmail", "Send monthly email summary", data.platformDeliverySettings.monthlyImpactEmail]
            ].map(([name, label, enabled]) => (
              <label key={name as string} className="flex items-center justify-between gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 px-3 py-3 text-sm font-bold text-ocean-900">
                <span>{label as string}</span>
                <input name={name as string} type="checkbox" defaultChecked={Boolean(enabled)} className="size-4 accent-coral-500" />
              </label>
            ))}
          </div>
          <Button type="submit" className="mt-4 rounded-lg">Save settings</Button>
        </form>
      </section>

      <section className="grid gap-4 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Generate this month&apos;s reports</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Creates or refreshes each eligible user&apos;s report using current platform data.</p>
        </div>
        <form action={runMonthlyImpactReportCycleAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
            <input name="sendEmail" type="checkbox" className="size-4 accent-coral-500" />
            Send email summary
          </label>
          <Button type="submit" className="rounded-lg"><RefreshCw className="size-4" aria-hidden="true" />Run report cycle</Button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><Mail className="size-5 text-coral-700" aria-hidden="true" /><h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent generated reports</h2></div>
        <AdminDataTable
          caption="Recent monthly impact reports"
          rows={data.monthlyImpactReports}
          getRowKey={(report) => report.id}
          columns={columns}
          emptyState={<AdminEmptyState title="No reports generated yet" description="Run the monthly report cycle when you are ready." />}
        />
      </section>
    </div>
  );
}
