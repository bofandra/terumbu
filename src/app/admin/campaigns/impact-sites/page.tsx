import Link from "next/link";
import { ArrowUpDown, FileCheck2, MapPinned, Pencil, Plus, Save, Target } from "lucide-react";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireRole } from "@/lib/auth";
import { impactSiteEcosystemTypes, impactSiteVerificationStatuses } from "@/lib/campaign-content";
import { createAdminImpactSiteAction, deleteAdminImpactSiteAction, updateAdminImpactSiteAction } from "@/lib/portal-actions";
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
  "campaign-missing": "Choose an existing campaign.",
  "impact-site-delete": "Delete confirmation was not submitted.",
  "impact-site-invalid": "Enter site name, ecosystem type, region, valid coordinates, progress between 0 and 100, and evidence count.",
  "impact-site-missing": "Impact site record was not found."
};

type AdminCampaignImpactSitesPageProps = {
  searchParams?: Promise<
    AdminImpactSiteFilters & {
      create?: string;
      error?: string;
      saved?: string;
    }
  >;
};

type AdminImpactSitesData = Awaited<ReturnType<typeof getAdminImpactSitesPage>>;
type CampaignOption = AdminImpactSitesData["campaignOptions"][number];
type ImpactSite = AdminImpactSitesData["impactSites"][number];

function Field({
  label,
  children,
  className = "",
  required = false
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      <span className="flex items-center gap-1">
        {label}
        {required ? (
          <>
            <span className="text-coral-700" aria-hidden="true">
              *
            </span>
            <span className="sr-only">required</span>
          </>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function dateValue(value: string | null | undefined) {
  return value ?? "";
}

function coordinateValue(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(6) : "";
}

function optionValuesWithCurrent(options: string[], current?: string | null) {
  return current && !options.includes(current) ? [...options, current] : options;
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

function SortHeader({
  label,
  sort,
  data
}: {
  label: string;
  sort: string;
  data: AdminImpactSitesData;
}) {
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

function CampaignSelect({ campaigns, defaultValue }: { campaigns: CampaignOption[]; defaultValue?: string | null }) {
  return (
    <select name="campaignId" defaultValue={defaultValue ?? ""} className={adminSelectClassName}>
      <option value="">Unassigned staging site</option>
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.title} / {campaign.organizationName} / {labelize(campaign.status)}
        </option>
      ))}
    </select>
  );
}

function VerificationSelect({ defaultValue = "basic" }: { defaultValue?: string | null }) {
  return (
    <select name="verification" defaultValue={defaultValue ?? "basic"} className={adminSelectClassName}>
      {impactSiteVerificationStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

function EcosystemTypeSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <select name="ecosystemType" defaultValue={defaultValue ?? "Coral"} className={adminSelectClassName} required>
      {optionValuesWithCurrent([...impactSiteEcosystemTypes], defaultValue).map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
}

function ImpactSiteFields({
  campaigns,
  site,
  advancedOpen = false
}: {
  campaigns: CampaignOption[];
  site?: ImpactSite | null;
  advancedOpen?: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field label="Linked campaign" className="lg:col-span-2">
          <CampaignSelect campaigns={campaigns} defaultValue={site?.campaignId} />
        </Field>
        <Field label="Verification">
          <VerificationSelect defaultValue={site?.verification} />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field label="Site name" required>
          <input name="name" defaultValue={site?.name} placeholder="Raja Ampat Reef Garden" className={adminInputClassName} required />
        </Field>
        <Field label="Ecosystem type" required>
          <EcosystemTypeSelect defaultValue={site?.ecosystemType} />
        </Field>
        <Field label="Region" required>
          <input name="region" defaultValue={site?.region} placeholder="Southwest Papua" className={adminInputClassName} required />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Latitude" required>
          <input
            name="latitude"
            type="number"
            min="-90"
            max="90"
            step="0.000001"
            defaultValue={coordinateValue(site?.latitude)}
            placeholder="-0.234900"
            className={adminInputClassName}
            required
          />
        </Field>
        <Field label="Longitude" required>
          <input
            name="longitude"
            type="number"
            min="-180"
            max="180"
            step="0.000001"
            defaultValue={coordinateValue(site?.longitude)}
            placeholder="130.516600"
            className={adminInputClassName}
            required
          />
        </Field>
      </div>
      <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3" open={advancedOpen}>
        <summary className="cursor-pointer text-sm font-bold text-ocean-900">Advanced tracking fields</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Field label="Progress">
            <input name="progress" type="number" min="0" max="100" step="1" defaultValue={site?.progress ?? 0} className={adminInputClassName} />
          </Field>
          <Field label="Evidence records">
            <input name="evidenceCount" type="number" min="0" step="1" defaultValue={site?.evidenceCount ?? 0} className={adminInputClassName} />
          </Field>
          <Field label="Latest survey">
            <input name="latestSurvey" type="date" defaultValue={dateValue(site?.latestSurvey)} className={adminInputClassName} />
          </Field>
        </div>
      </details>
    </>
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
  const createOpen = String(params?.create ?? "") === "1";
  const returnTo = adminImpactSitesHref(pageParams);
  const selectedReturnTo = data.selectedSite ? adminImpactSitesHref({ ...pageParams, site: data.selectedSite.id }) : returnTo;
  const columns: AdminDataTableColumn<ImpactSite>[] = [
    {
      key: "site",
      header: <SortHeader label="Site" sort="name" data={data} />,
      render: (site) => (
        <div className="min-w-56">
          <p className="font-bold text-ocean-900">{site.name}</p>
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
          href={`${adminImpactSitesHref({ ...pageParams, site: site.id })}#edit-site`}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects / Impact sites"
        title="Impact site management"
        description="Manage conservation locations through a searchable, paginated list. Create only the minimum record first, then add tracking detail when evidence is available."
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
        createHref={`${adminImpactSitesHref({ ...pageParams, create: "1" })}#create-site`}
        createLabel="New site"
        hiddenFields={{
          sort: data.filters.sort === "name" ? undefined : data.filters.sort,
          dir: data.filters.dir === "asc" ? undefined : data.filters.dir
        }}
      >
        <label className="sr-only" htmlFor="verification">
          Verification
        </label>
        <select id="verification" name="verification" defaultValue={data.filters.verification} className={cn(adminSelectClassName, "min-w-40")}>
          <option value="all">All verification</option>
          {impactSiteVerificationStatuses.map((status) => (
            <option key={status} value={status}>
              {labelize(status)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="assignment">
          Assignment
        </label>
        <select id="assignment" name="assignment" defaultValue={data.filters.assignment} className={cn(adminSelectClassName, "min-w-40")}>
          <option value="all">All assignments</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </AdminListToolbar>

      <details id="create-site" className={adminPanelClassName} open={createOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-ocean-900/10 p-4 text-left">
          <span>
            <span className="block text-xl font-bold tracking-normal text-ocean-900">Create impact site</span>
            <span className="mt-1 block text-sm font-semibold text-ocean-900/58">Start with campaign link, location, ecosystem, and coordinates.</span>
          </span>
          <Plus className="size-5 shrink-0 text-coral-700" aria-hidden="true" />
        </summary>
        <form action={createAdminImpactSiteAction} className="grid gap-4 p-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <ImpactSiteFields campaigns={data.campaignOptions} />
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Impact Site
          </Button>
        </form>
      </details>

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
              actionHref={`${pathname}#create-site`}
              actionLabel="Create site"
            />
          }
        />
        <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
      </section>

      {data.selectedSite ? (
        <section id="edit-site" className={adminPanelClassName}>
          <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Selected impact site</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{data.selectedSite.name}</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{data.selectedSite.campaignTitle ?? "Unassigned staging site"}</p>
            </div>
            <Link
              href={returnTo}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
            >
              Close editor
            </Link>
          </div>
          <div className="grid gap-6 p-4">
            <form action={updateAdminImpactSiteAction} className="grid gap-4">
              <input type="hidden" name="returnTo" value={selectedReturnTo} />
              <input type="hidden" name="impactSiteId" value={data.selectedSite.id} />
              <ImpactSiteFields campaigns={data.campaignOptions} site={data.selectedSite} advancedOpen />
              <Button type="submit" tone="secondary" className="w-fit rounded-lg">
                <Save className="size-4" aria-hidden="true" />
                Save Site
              </Button>
            </form>

            <div className="rounded-lg border border-coral-700/20 bg-coral-100 p-4">
              <h3 className="text-sm font-bold text-coral-700">Danger zone</h3>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-coral-700/80">
                Delete this site and detach linked evidence, activity, and sponsorship records from the site.
              </p>
              <form id={`delete-impact-site-${data.selectedSite.id}`} action={deleteAdminImpactSiteAction} className="mt-4">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="impactSiteId" value={data.selectedSite.id} />
              </form>
              <AdminConfirmSubmit
                formId={`delete-impact-site-${data.selectedSite.id}`}
                title="Delete impact site?"
                body="This removes the impact site record and unlinks related campaign evidence from this location."
                triggerLabel="Delete Site"
                submitLabel="Delete Site"
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
