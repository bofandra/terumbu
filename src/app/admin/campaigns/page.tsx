import Link from "next/link";
import { ArrowUpDown, FileCheck2, MapPinned, Pencil, ShieldCheck } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { campaignStatuses } from "@/lib/campaign-content";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { updateCampaignStatusAction, updateImpactSettingsAction } from "@/lib/portal-actions";
import { getCarbonKgPerUsd } from "@/lib/platform-settings";
import { getAdminProjectsPage, type AdminProjectFilters } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Projects"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/campaigns";

const statusMessages: Record<string, string> = {
  "campaign-created": "Campaign created.",
  "campaign-deleted": "Campaign deleted.",
  "campaign-updated": "Campaign updated.",
  "impact-settings": "Impact settings updated.",
  status: "Project status updated."
};

const errorMessages: Record<string, string> = {
  campaign: "Choose a campaign and valid status.",
  "campaign-delete": "Confirm campaign deletion by checking the delete box.",
  "campaign-has-history": "Projects with donations, sponsorships, corporate portfolio links, or related expeditions cannot be deleted.",
  "campaign-invalid": "Enter project title, slug, organization, goal, impact target, summary, category, and region.",
  "campaign-missing": "Campaign record was not found.",
  "campaign-slug": "That project slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "organization-missing": "Choose an existing partner organization."
};

type AdminProjectsPageProps = {
  searchParams?: Promise<
    AdminProjectFilters & {
      error?: string;
      saved?: string;
    }
  >;
};

type AdminProjectsData = Awaited<ReturnType<typeof getAdminProjectsPage>>;
type AdminProject = AdminProjectsData["projects"][number];

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function fundingProgress(raisedAmount: number, goalAmount: number) {
  if (!Number.isFinite(raisedAmount) || !Number.isFinite(goalAmount) || goalAmount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((raisedAmount / goalAmount) * 100));
}

function adminProjectsHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminProjectsData) {
  return {
    q: data.filters.q || undefined,
    status: data.filters.status === "all" ? undefined : data.filters.status,
    partner: data.filters.partner || undefined,
    sort: data.filters.sort === "updatedAt" ? undefined : data.filters.sort,
    dir: data.filters.dir === "desc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminProjectsData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={adminProjectsHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function StatusSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select name="status" defaultValue={defaultValue} className={cn(adminSelectClassName, "min-w-36")} aria-label="Project status">
      {campaignStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <p className="text-sm font-bold text-ocean-900/58">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
    </article>
  );
}

export default async function AdminProjectsPage({ searchParams }: AdminProjectsPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const [data, carbonKgPerUsd] = await observeAdminDataLoader("admin.projects.directory", () =>
    Promise.all([getAdminProjectsPage(params), getCarbonKgPerUsd()])
  );
  const savedMessage = params?.saved ? statusMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const baseParams = listParams(data);
  const returnTo = adminProjectsHref({ ...baseParams, page: data.pagination.page });
  const columns: AdminDataTableColumn<AdminProject>[] = [
    {
      key: "project",
      header: <SortHeader label="Project" sort="title" data={data} />,
      render: (project) => (
        <div className="min-w-64">
          <Link
            href={`/admin/campaigns/${project.id}`}
            className="font-bold text-ocean-900 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            {project.title}
          </Link>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">/{project.slug}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{project.category}</p>
        </div>
      )
    },
    {
      key: "partner",
      header: <SortHeader label="Partner" sort="partner" data={data} />,
      render: (project) => (
        <div className="min-w-48">
          <p className="font-bold text-ocean-900">{project.partner}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{project.region}</p>
        </div>
      )
    },
    {
      key: "status",
      header: <SortHeader label="Status" sort="status" data={data} />,
      render: (project) => (
        <div className="min-w-48 space-y-2">
          <AdminStatusBadge value={project.status} />
          <form action={updateCampaignStatusAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="campaignId" value={project.id} />
            <StatusSelect defaultValue={project.status} />
            <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Save
            </Button>
          </form>
        </div>
      )
    },
    {
      key: "funding",
      header: "Funding",
      render: (project) => {
        const progress = fundingProgress(project.raisedAmount, project.goalAmount);

        return (
          <div className="min-w-52">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span>{formatCurrency(project.raisedAmount, project.currency)}</span>
              <span className="text-ocean-900/58">{progress}%</span>
            </div>
            <ProgressMeter value={progress} label={`${project.title} funding progress`} className="mt-2 h-2" trackClassName="bg-sand-100" />
            <p className="mt-2 text-xs font-semibold text-ocean-900/54">
              Goal {formatCurrency(project.goalAmount, project.currency)} / {project.donorCount.toLocaleString("id-ID")} donors
            </p>
          </div>
        );
      }
    },
    {
      key: "updated",
      header: <SortHeader label="Updated" sort="updatedAt" data={data} />,
      render: (project) => (
        <time dateTime={project.updatedAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/68">
          {project.updatedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
        </time>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (project) => (
        <div className="flex min-w-36 flex-col items-stretch gap-2">
          <Link
            href={`/admin/campaigns/${project.id}`}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Manage
          </Link>
          <Link href={`/campaigns/${project.slug}`} className="text-center text-sm font-bold text-coral-700 hover:text-coral-500">
            Public page
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects"
        title="Campaign management"
        description="Search, filter, sort, and review the campaign portfolio. Open a project for detailed content, evidence, and lifecycle management."
        actionHref="/admin/campaigns/new"
        actionLabel="New campaign"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <form action={updateImpactSettingsAction} className="grid gap-4 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
        <div>
          <h2 className="text-lg font-bold tracking-normal text-ocean-900">Global carbon formula</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Used for kg CO2e calculations from USD donations across all campaigns.</p>
        </div>
        <label className="grid gap-2 text-sm font-bold text-ocean-900">
          kg CO2e per USD
          <input name="kgCo2ePerUsd" type="number" min="0" step="0.0001" defaultValue={carbonKgPerUsd ?? undefined} placeholder="Pending" className={adminInputClassName} />
        </label>
        <Button type="submit" tone="secondary" className="min-h-11 rounded-lg">Save formula</Button>
      </form>

      <section className="grid gap-3 md:grid-cols-4" aria-label="Project summary">
        <SummaryMetric label="Filtered projects" value={data.summary.projects.toLocaleString("id-ID")} />
        <SummaryMetric label="In review" value={data.summary.inReview.toLocaleString("id-ID")} />
        <SummaryMetric label="Published" value={data.summary.published.toLocaleString("id-ID")} />
        <SummaryMetric label="Donors" value={data.summary.totalDonors.toLocaleString("id-ID")} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Project workspace shortcuts">
        <Link href="/admin/campaigns/impact-sites" className="group rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-coral-500">
          <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700"><MapPinned className="size-5" aria-hidden="true" /></span>
          <h2 className="mt-4 font-bold text-ocean-900">Impact sites</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Manage field locations, verification, progress, and campaign assignment.</p>
        </Link>
        <Link href="/admin/campaigns/evidence" className="group rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-coral-500">
          <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700"><FileCheck2 className="size-5" aria-hidden="true" /></span>
          <h2 className="mt-4 font-bold text-ocean-900">Evidence review</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Review evidence submissions and verification workflow.</p>
        </Link>
      </section>

      <AdminListToolbar
        action={pathname}
        searchValue={data.filters.q}
        searchPlaceholder="Search project, partner, category, or region"
        clearHref={pathname}
        createHref="/admin/campaigns/new"
        createLabel="New campaign"
        hiddenFields={{
          sort: data.filters.sort === "updatedAt" ? undefined : data.filters.sort,
          dir: data.filters.dir === "desc" ? undefined : data.filters.dir
        }}
      >
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={data.filters.status} className={cn(adminSelectClassName, "min-w-36")}>
          <option value="all">All statuses</option>
          {campaignStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
        <label className="sr-only" htmlFor="partner">Partner</label>
        <select id="partner" name="partner" defaultValue={data.filters.partner} className={cn(adminSelectClassName, "min-w-44")}>
          <option value="">All partners</option>
          {data.partnerOptions.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
        </select>
      </AdminListToolbar>

      <AdminDataTable
        caption="Campaign directory"
        columns={columns}
        rows={data.projects}
        getRowKey={(project) => project.id}
        emptyState={
          <AdminEmptyState
            title="No campaigns match these filters"
            description="Clear the filters or create a campaign to publish fundraising pages and begin impact tracking."
            actionHref="/admin/campaigns/new"
            actionLabel="Create project"
          />
        }
      />

      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
