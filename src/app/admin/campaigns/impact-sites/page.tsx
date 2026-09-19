import Link from "next/link";
import { ArrowUpDown, FileCheck2, MapPinned, Pencil, Target } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireRole } from "@/lib/auth";
import { impactSiteVerificationStatuses } from "@/lib/campaign-content";
import { getAdminImpactSitesPage, type AdminImpactSiteFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin Campaign Impact Sites"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/campaigns/impact-sites";

const statusMessages: Record<string, string> = {
  "impact-site-created": "Impact site created.",
  "impact-site-deleted": "Impact site deleted.",
  "impact-site-updated": "Impact site updated."
};

const errorMessages: Record<string, string> = {
  "impact-site-missing": "Impact site record was not found."
};

type AdminCampaignImpactSitesPageProps = {
  searchParams?: Promise<
    AdminImpactSiteFilters & {
      error?: string;
      saved?: string;
    }
  >;
};

type AdminImpactSitesData = Awaited<ReturnType<typeof getAdminImpactSitesPage>>;
type ImpactSite = AdminImpactSitesData["impactSites"][number];

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function adminImpactSitesHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminImpactSitesData) {
  return {
    q: data.filters.q || undefined,
    verification: data.filters.verification === "all" ? undefined : data.filters.verification,
    assignment: data.filters.assignment === "all" ? undefined : data.filters.assignment,
    sort: data.filters.sort === "name" ? undefined : data.filters.sort,
    dir: data.filters.dir === "asc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminImpactSitesData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={adminImpactSitesHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof MapPinned }) {
  return (
    <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ocean-900/58">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-kelp-100 text-kelp-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

export default async function AdminCampaignImpactSitesPage({ searchParams }: AdminCampaignImpactSitesPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await getAdminImpactSitesPage(params);
  const savedMessage = params?.saved ? statusMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const baseParams = listParams(data);
  const pageParams = { ...baseParams, page: data.pagination.page };
  const returnTo = adminImpactSitesHref(pageParams);
  const newSiteHref = `/admin/campaigns/impact-sites/new?returnTo=${encodeURIComponent(returnTo)}`;
  const columns: AdminDataTableColumn<ImpactSite>[] = [
    {
      key: "site",
      header: <SortHeader label="Site" sort="name" data={data} />,
      render: (site) => (
        <div className="min-w-56">
          <Link
            href={`/admin/campaigns/impact-sites/${site.id}?returnTo=${encodeURIComponent(returnTo)}`}
            className="font-bold text-ocean-900 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            {site.name}
          </Link>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{site.ecosystemType}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
          </p>
        </div>
      )
    },
    {
      key: "campaign",
      header: <SortHeader label="Campaign" sort="campaign" data={data} />,
      render: (site) => (
        <div className="min-w-56">
          <p className="font-bold text-ocean-900">{site.campaignTitle ?? "Unassigned staging site"}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.campaignSlug ? `/${site.campaignSlug}` : "Ready to link"}</p>
        </div>
      )
    },
    {
      key: "region",
      header: <SortHeader label="Region" sort="region" data={data} />,
      render: (site) => <span className="font-semibold">{site.region}</span>
    },
    {
      key: "verification",
      header: "Verification",
      render: (site) => <AdminStatusBadge value={site.verification} />
    },
    {
      key: "progress",
      header: "Tracking",
      render: (site) => (
        <div className="min-w-44">
          <div className="flex items-center justify-between gap-3 text-sm font-bold">
            <span>{site.progress}%</span>
            <span className="text-ocean-900/58">{site.evidenceCount.toLocaleString("id-ID")} evidence</span>
          </div>
          <ProgressMeter value={site.progress} label={`${site.name} progress`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-sand-100" />
          <p className="mt-2 text-xs font-bold text-ocean-900/50">{site.latestSurvey ? `Latest survey ${site.latestSurvey}` : "Survey date pending"}</p>
        </div>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (site) => (
        <Link
          href={`/admin/campaigns/impact-sites/${site.id}?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Manage
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects / Impact sites"
        title="Impact site management"
        description="Manage conservation locations through a searchable, paginated directory. Open one site to edit its location, tracking, verification, or assignment."
        actionHref="/admin/campaigns"
        actionLabel="Projects"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-3" aria-label="Impact site summary">
        <SummaryMetric label="Filtered sites" value={data.summary.sites.toLocaleString("id-ID")} icon={MapPinned} />
        <SummaryMetric label="Average progress" value={`${data.summary.averageProgress}%`} icon={Target} />
        <SummaryMetric label="Evidence records" value={data.summary.totalEvidence.toLocaleString("id-ID")} icon={FileCheck2} />
      </section>

      <AdminListToolbar
        action={pathname}
        searchValue={data.filters.q}
        searchPlaceholder="Search site, region, ecosystem, or campaign"
        clearHref={pathname}
        createHref={newSiteHref}
        createLabel="New site"
        hiddenFields={{
          sort: data.filters.sort === "name" ? undefined : data.filters.sort,
          dir: data.filters.dir === "asc" ? undefined : data.filters.dir
        }}
      >
        <label className="sr-only" htmlFor="verification">Verification</label>
        <select id="verification" name="verification" defaultValue={data.filters.verification} className={cn(adminSelectClassName, "min-w-40")}>
          <option value="all">All verification</option>
          {impactSiteVerificationStatuses.map((status) => (
            <option key={status} value={status}>{labelize(status)}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="assignment">Assignment</label>
        <select id="assignment" name="assignment" defaultValue={data.filters.assignment} className={cn(adminSelectClassName, "min-w-40")}>
          <option value="all">All assignments</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </AdminListToolbar>

      <section className="space-y-3" aria-label="Impact sites">
        <AdminDataTable
          caption="Impact site records"
          rows={data.impactSites}
          columns={columns}
          getRowKey={(site) => site.id}
          emptyState={
            <AdminEmptyState
              title="No impact sites found"
              description="Adjust filters or create the first conservation location for campaign tracking."
              actionHref={newSiteHref}
              actionLabel="Create site"
            />
          }
        />
        <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
      </section>
    </div>
  );
}
