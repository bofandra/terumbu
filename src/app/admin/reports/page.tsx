import Link from "next/link";
import { ArrowUpRight, BarChart3, FileText, Filter, Search } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Reports"
};

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams?: Promise<{
    account?: string;
    q?: string;
    status?: string;
  }>;
};

function cleanFilter(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requireRole(["admin"], "/admin/reports");
  const params = await searchParams;
  const data = await getAdminOperationsData();
  const query = cleanFilter(params?.q).toLowerCase();
  const statusFilter = cleanFilter(params?.status) || "all";
  const accountFilter = cleanFilter(params?.account) || "all";
  const reportStatuses = Array.from(new Set(data.reports.map((report) => report.status))).sort();
  const reportAccounts = Array.from(new Set(data.reports.map((report) => report.accountName))).sort();
  const filteredReports = data.reports.filter((report) => {
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesAccount = accountFilter === "all" || report.accountName === accountFilter;
    const searchable = [
      report.exportCode,
      report.status,
      report.accountName,
      report.programName,
      report.fileUrl
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesStatus && matchesAccount && (!query || searchable.includes(query));
  });
  const completedReports = data.reports.filter((report) => report.status === "completed").length;
  const visibleCompletedReports = filteredReports.filter((report) => report.status === "completed").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Report exports"
        description="Review and filter corporate report export status, generated files, accounts, and programs."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-4" aria-label="Report summary">
        {[
          { label: "Reports", value: data.reports.length.toLocaleString("id-ID"), icon: FileText },
          { label: "Visible", value: filteredReports.length.toLocaleString("id-ID"), icon: Filter },
          { label: "Completed", value: completedReports.toLocaleString("id-ID"), icon: BarChart3 },
          { label: "Visible completed", value: visibleCompletedReports.toLocaleString("id-ID"), icon: FileText }
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
        <div className="grid gap-4 border-b border-ocean-900/10 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Exports</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Corporate reporting artifacts with filterable status, account, and export code.</p>
          </div>
          <BarChart3 className="size-5 text-ocean-700" aria-hidden="true" />
        </div>

        <form action="/admin/reports" className="grid gap-3 border-b border-ocean-900/10 bg-sand-50 p-4 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto]">
          <label className="relative grid gap-2 text-sm font-bold text-ocean-900">
            Search
            <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-ocean-900/42" aria-hidden="true" />
            <input name="q" defaultValue={query} placeholder="export code, account, program" className={`${adminInputClassName} pl-9`} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Status
            <select name="status" defaultValue={statusFilter} className={adminSelectClassName}>
              <option value="all">All statuses</option>
              {reportStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Account
            <select name="account" defaultValue={accountFilter} className={adminSelectClassName}>
              <option value="all">All accounts</option>
              {reportAccounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" tone="secondary" className="self-end rounded-lg">
            Apply
          </Button>
        </form>

        <div className="divide-y divide-ocean-900/10">
          {filteredReports.map((report) => (
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
          {filteredReports.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title={data.reports.length === 0 ? "No report exports yet" : "No report exports match"}
              description={data.reports.length === 0 ? "Corporate exports will appear here after an admin or corporate manager generates a reporting package." : "Adjust status, account, or search filters to broaden the report list."}
              actionHref={data.reports.length === 0 ? "/corporate/reports" : undefined}
              actionLabel={data.reports.length === 0 ? "Open reports" : undefined}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
