import Link from "next/link";
import { ArrowUpDown, ArrowUpRight, BarChart3, CalendarClock, FileText, Mail, RefreshCw, UsersRound } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminReportsPage, type AdminReportFilters } from "@/lib/queries";
import { runMonthlyImpactReportCycleAction } from "@/lib/retention-actions";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Reports"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/reports";

type AdminReportsPageProps = {
  searchParams?: Promise<
    AdminReportFilters & {
      emailed?: string;
      generated?: string;
      saved?: string;
      workspace?: string;
    }
  >;
};

type AdminReportsData = Awaited<ReturnType<typeof getAdminReportsPage>>;
type AdminReportRow = AdminReportsData["reports"][number];
type AdminMonthlyReportRow = AdminReportsData["monthlyImpactReports"][number];

function cleanFilter(value: string | string[] | null | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return String(first ?? "").trim();
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Never";
}

function reportsHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function exportListParams(data: AdminReportsData) {
  return {
    workspace: "exports",
    q: data.filters.exports.q || undefined,
    status: data.filters.exports.status === "all" ? undefined : data.filters.exports.status,
    account: data.filters.exports.account || undefined,
    from: data.filters.exports.from || undefined,
    to: data.filters.exports.to || undefined,
    sort: data.filters.exports.sort === "createdAt" ? undefined : data.filters.exports.sort,
    dir: data.filters.exports.dir === "desc" ? undefined : data.filters.exports.dir
  };
}

function monthlyListParams(data: AdminReportsData) {
  return {
    workspace: "monthly",
    monthlyQ: data.filters.monthly.q || undefined,
    monthlyStatus: data.filters.monthly.status === "all" ? undefined : data.filters.monthly.status,
    monthlyEmail: data.filters.monthly.email === "all" ? undefined : data.filters.monthly.email,
    monthlyMonth: data.filters.monthly.month || undefined,
    monthlySort: data.filters.monthly.sort === "generatedAt" ? undefined : data.filters.monthly.sort,
    monthlyDir: data.filters.monthly.dir === "desc" ? undefined : data.filters.monthly.dir
  };
}

function ExportSortHeader({ label, sort, data }: { label: string; sort: string; data: AdminReportsData }) {
  const active = data.filters.exports.sort === sort;
  const nextDir = active && data.filters.exports.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={reportsHref({ ...exportListParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function MonthlySortHeader({ label, sort, data }: { label: string; sort: string; data: AdminReportsData }) {
  const active = data.filters.monthly.sort === sort;
  const nextDir = active && data.filters.monthly.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={reportsHref({ ...monthlyListParams(data), monthlySort: sort, monthlyDir: nextDir, monthlyPage: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function defaultWorkspace(data: AdminReportsData, params: { saved?: string; workspace?: string } | undefined) {
  if (params?.workspace === "exports" || params?.workspace === "monthly") {
    return params.workspace;
  }

  if (params?.saved === "monthly-run") {
    return "monthly";
  }

  const monthly = data.filters.monthly;
  if (monthly.q || monthly.status !== "all" || monthly.email !== "all" || monthly.month || data.pagination.monthly.page > 1) {
    return "monthly";
  }

  const exports = data.filters.exports;
  if (exports.q || exports.status !== "all" || exports.account || exports.from || exports.to || data.pagination.exports.page > 1) {
    return "exports";
  }

  return "monthly";
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await observeAdminDataLoader("admin.reports", () => getAdminReportsPage(params));
  const savedMessage =
    params?.saved === "monthly-run"
      ? `Monthly impact run complete: ${cleanFilter(params.generated) || "0"} report(s) generated and ${cleanFilter(params.emailed) || "0"} email(s) queued.`
      : null;
  const exportBaseParams = exportListParams(data);
  const monthlyBaseParams = monthlyListParams(data);
  const exportColumns: AdminDataTableColumn<AdminReportRow>[] = [
    {
      key: "export",
      header: <ExportSortHeader label="Export" sort="exportCode" data={data} />,
      render: (report) => (
        <div className="min-w-56">
          <p className="font-bold text-ocean-900">{report.exportCode}</p>
          <div className="mt-2"><AdminStatusBadge value={report.status} /></div>
        </div>
      )
    },
    {
      key: "account",
      header: <ExportSortHeader label="Account / Program" sort="account" data={data} />,
      render: (report) => (
        <div className="min-w-52">
          <p className="font-bold text-ocean-900">{report.accountName}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{report.programName}</p>
        </div>
      )
    },
    {
      key: "format",
      header: "Artifact",
      render: (report) => (
        <div className="min-w-40 text-sm font-semibold text-ocean-900/68">
          <p className="font-bold text-ocean-900">{report.reportType}</p>
          <p className="mt-1">{report.exportFormat} / v{report.artifactVersion}</p>
        </div>
      )
    },
    {
      key: "generated",
      header: <ExportSortHeader label="Generated" sort="generatedAt" data={data} />,
      render: (report) => (
        <div className="min-w-36 text-sm font-semibold text-ocean-900/62">
          <p>{formatDate(report.generatedAt)}</p>
          {report.publishedAt ? <p className="mt-1 text-kelp-700">Published {formatDate(report.publishedAt)}</p> : null}
        </div>
      )
    },
    {
      key: "created",
      header: <ExportSortHeader label="Created" sort="createdAt" data={data} />,
      render: (report) => (
        <time dateTime={report.createdAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/62">
          {formatDate(report.createdAt)}
        </time>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (report) => {
        const href = report.previewUrl ?? report.fileUrl;
        return href ? (
          <Link
            href={href}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            Open artifact
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ) : <span className="text-sm font-semibold text-ocean-900/38">Pending artifact</span>;
      }
    }
  ];
  const monthlyColumns: AdminDataTableColumn<AdminMonthlyReportRow>[] = [
    {
      key: "report",
      header: <MonthlySortHeader label="Report" sort="reportMonth" data={data} />,
      render: (report) => (
        <div className="min-w-48">
          <p className="font-bold text-ocean-900">{report.label}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{report.reportMonth}</p>
          <div className="mt-2"><AdminStatusBadge value={report.status} /></div>
        </div>
      )
    },
    {
      key: "user",
      header: <MonthlySortHeader label="User" sort="user" data={data} />,
      render: (report) => (
        <div className="min-w-52">
          <p className="font-bold text-ocean-900">{report.displayName ?? report.userName ?? report.userEmail}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/52">{report.userEmail}</p>
        </div>
      )
    },
    {
      key: "impact",
      header: <MonthlySortHeader label="Contributions" sort="contributions" data={data} />,
      render: (report) => (
        <div className="min-w-48 text-sm font-semibold text-ocean-900/68">
          <p className="font-bold text-ocean-900">{formatCurrency(report.contributions)}</p>
          <p className="mt-1">{report.campaignUpdates.toLocaleString("id-ID")} updates / {report.newEvidence.toLocaleString("id-ID")} evidence</p>
          <p className="mt-1">{report.coralsMonitored.toLocaleString("id-ID")} monitored / {report.academyProgress.toLocaleString("id-ID")} academy</p>
        </div>
      )
    },
    {
      key: "delivery",
      header: "Delivery",
      render: (report) => report.emailedAt ? (
        <div className="min-w-36 text-sm font-semibold text-kelp-700">
          <p>Emailed</p>
          <p className="mt-1 text-xs text-ocean-900/48">{formatDate(report.emailedAt)}</p>
        </div>
      ) : <span className="text-sm font-semibold text-ocean-900/42">Not emailed</span>
    },
    {
      key: "generated",
      header: <MonthlySortHeader label="Generated" sort="generatedAt" data={data} />,
      render: (report) => (
        <time dateTime={report.generatedAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/62">
          {formatDate(report.generatedAt)}
        </time>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Report operations"
        description="Operate monthly impact reporting and inspect corporate export artifacts with scalable server-side search, filters, sorting, and pagination."
        actionHref="/admin"
        actionLabel="Overview"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Corporate report summary">
        {[
          { label: "Matching exports", value: data.summary.reports.toLocaleString("id-ID"), icon: FileText },
          { label: "Published", value: data.summary.publishedReports.toLocaleString("id-ID"), icon: BarChart3 },
          { label: "Artifacts ready", value: data.summary.withArtifacts.toLocaleString("id-ID"), icon: FileText },
          { label: "Accounts", value: data.summary.accounts.toLocaleString("id-ID"), icon: UsersRound }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <MetricValue className="mt-3 text-ocean-900">{item.value}</MetricValue>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><Icon className="size-5" aria-hidden="true" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <FormTabs
        ariaLabel="Admin report workspaces"
        defaultTabId={defaultWorkspace(data, params)}
        tabs={[
          { id: "monthly", label: "Monthly Cycle", description: "Generate and inspect user digests", badge: data.pagination.monthly.totalItems.toLocaleString("id-ID") },
          { id: "exports", label: "Exports", description: "Search corporate artifacts", badge: data.pagination.exports.totalItems.toLocaleString("id-ID") }
        ]}
      >
        <section id="monthly-impact-reports" className="grid gap-4">
          <div className="grid gap-4 rounded-lg border border-ocean-900/10 bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Monthly impact report cycle</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">Generate saved monthly reports for opted-in users and optionally queue the email digest.</p>
            </div>
            <form action={runMonthlyImpactReportCycleAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
              <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
                <input name="sendEmail" type="checkbox" className="size-4 rounded border-ocean-900/20 text-coral-500" />
                Queue emails for opted-in users
              </label>
              <Button type="submit" className="rounded-lg"><RefreshCw className="size-4" aria-hidden="true" />Run Cycle</Button>
            </form>
          </div>

          <section className="grid gap-3 md:grid-cols-5" aria-label="Monthly report summary">
            {[
              { label: "Eligible users", value: data.monthlyImpactSummary.eligibleUsers.toLocaleString("id-ID"), icon: UsersRound },
              { label: "Email enabled", value: data.monthlyImpactSummary.emailEnabledUsers.toLocaleString("id-ID"), icon: Mail },
              { label: "Matching reports", value: data.monthlyImpactSummary.filteredReports.toLocaleString("id-ID"), icon: FileText },
              { label: "Emailed", value: data.monthlyImpactSummary.emailedReports.toLocaleString("id-ID"), icon: Mail },
              { label: "Latest run", value: formatDate(data.monthlyImpactSummary.latestGeneratedAt), icon: CalendarClock }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-3 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-bold uppercase text-ocean-900/48">{item.label}</p><p className="mt-2 text-lg font-bold tracking-normal text-ocean-900">{item.value}</p></div>
                    <Icon className="size-4 text-coral-700" aria-hidden="true" />
                  </div>
                </article>
              );
            })}
          </section>

          <AdminListToolbar
            action={pathname}
            searchName="monthlyQ"
            pageName="monthlyPage"
            searchValue={data.filters.monthly.q}
            searchPlaceholder="Search monthly reports or users"
            clearHref={`${pathname}?workspace=monthly`}
            hiddenFields={{
              workspace: "monthly",
              monthlySort: data.filters.monthly.sort === "generatedAt" ? undefined : data.filters.monthly.sort,
              monthlyDir: data.filters.monthly.dir === "desc" ? undefined : data.filters.monthly.dir
            }}
          >
            <select name="monthlyStatus" defaultValue={data.filters.monthly.status} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter monthly report status">
              <option value="all">All statuses</option>
              {data.options.monthlyStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select name="monthlyEmail" defaultValue={data.filters.monthly.email} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter monthly email status">
              <option value="all">All delivery</option>
              <option value="emailed">Emailed</option>
              <option value="not_emailed">Not emailed</option>
            </select>
            <select name="monthlyMonth" defaultValue={data.filters.monthly.month} className={cn(adminSelectClassName, "min-w-36")} aria-label="Filter report month">
              <option value="">All months</option>
              {data.options.monthlyMonths.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </AdminListToolbar>

          <AdminDataTable
            caption="Monthly impact reports"
            rows={data.monthlyImpactReports}
            getRowKey={(report) => report.id}
            columns={monthlyColumns}
            emptyState={<AdminEmptyState title="No monthly impact reports match" description="Adjust the report filters or run the monthly cycle to generate impact summaries." />}
          />

          <AdminPagination pathname={pathname} params={monthlyBaseParams} pagination={data.pagination.monthly} pageParam="monthlyPage" />
        </section>

        <section className="grid gap-4">
          <AdminListToolbar
            action={pathname}
            searchValue={data.filters.exports.q}
            searchPlaceholder="Search export code, account, program, type"
            clearHref={`${pathname}?workspace=exports`}
            hiddenFields={{
              workspace: "exports",
              sort: data.filters.exports.sort === "createdAt" ? undefined : data.filters.exports.sort,
              dir: data.filters.exports.dir === "desc" ? undefined : data.filters.exports.dir
            }}
          >
            <select name="status" defaultValue={data.filters.exports.status} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter export status">
              <option value="all">All statuses</option>
              {data.options.reportStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select name="account" defaultValue={data.filters.exports.account} className={cn(adminSelectClassName, "min-w-48")} aria-label="Filter corporate account">
              <option value="">All accounts</option>
              {data.options.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <label className="grid gap-1 text-xs font-bold text-ocean-900/58">From<input type="date" name="from" defaultValue={data.filters.exports.from} className={cn(adminInputClassName, "min-w-40")} /></label>
            <label className="grid gap-1 text-xs font-bold text-ocean-900/58">To<input type="date" name="to" defaultValue={data.filters.exports.to} className={cn(adminInputClassName, "min-w-40")} /></label>
          </AdminListToolbar>

          <AdminDataTable
            caption="Corporate report exports"
            rows={data.reports}
            getRowKey={(report) => report.id}
            columns={exportColumns}
            emptyState={<AdminEmptyState title="No report exports match" description="Adjust status, account, date range, or search filters to broaden the export list." actionHref="/corporate/reports" actionLabel="Open reports" />}
          />

          <AdminPagination pathname={pathname} params={exportBaseParams} pagination={data.pagination.exports} />
        </section>
      </FormTabs>
    </div>
  );
}
