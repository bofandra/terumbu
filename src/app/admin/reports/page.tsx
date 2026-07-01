import Link from "next/link";
import { ArrowUpRight, BarChart3, FileText } from "lucide-react";

import { AdminPageHeader, AdminStatusBadge, adminPanelClassName } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Reports"
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRole(["admin"], "/admin/reports");
  const data = await getAdminOperationsData();

  const completedReports = data.reports.filter((report) => report.status === "completed").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Report exports"
        description="Review corporate report export status and available generated files."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Report summary">
        {[
          { label: "Reports", value: data.reports.length.toLocaleString("id-ID"), icon: FileText },
          { label: "Completed", value: completedReports.toLocaleString("id-ID"), icon: BarChart3 },
          { label: "In progress", value: (data.reports.length - completedReports).toLocaleString("id-ID"), icon: FileText }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Exports</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Corporate reporting artifacts</p>
          </div>
          <BarChart3 className="size-5 text-ocean-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.reports.map((report) => (
            <article key={report.exportCode} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-normal text-ocean-900">{report.exportCode}</h2>
                    <AdminStatusBadge value={report.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {report.accountName} / {report.programName}
                  </p>
                  <p className="mt-2 text-xs font-bold text-ocean-900/48">{report.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                </div>
                {report.fileUrl ? (
                  <Link href={report.fileUrl} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
                    Open file
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
          {data.reports.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No report exports found.</p> : null}
        </div>
      </section>
    </div>
  );
}
