import Link from "next/link";
import { ArrowUpDown, ArrowUpRight, CalendarDays, CalendarPlus, MessageSquareText, ShipWheel, Users } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminDomainNav, adminExpeditionNavItems } from "@/components/admin/admin-domain-nav";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminExpeditionsPage, type AdminExpeditionFilters } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Expeditions"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/expeditions";

const statusMessages: Record<string, string> = {
  "departure-created": "Departure created.",
  "departure-deleted": "Departure deleted.",
  "departure-updated": "Departure updated.",
  "expedition-created": "Expedition created.",
  "expedition-deleted": "Expedition deleted.",
  "expedition-updated": "Expedition updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign or leave the field empty.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-delete": "Confirm departure deletion before submitting.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-has-bookings": "Departures with bookings cannot be deleted.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "expedition-delete": "Confirm expedition deletion before submitting.",
  "expedition-has-bookings": "Expeditions with bookings cannot be deleted.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, and summary.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use.",
  "partner-owned": "Expeditions are partner-owned. Platform admins have read-only monitoring access."
};

type AdminExpeditionsPageProps = {
  searchParams?: Promise<
    AdminExpeditionFilters & {
      error?: string;
      saved?: string;
    }
  >;
};

type AdminExpeditionsData = Awaited<ReturnType<typeof getAdminExpeditionsPage>>;
type AdminExpedition = AdminExpeditionsData["expeditions"][number];

function adminExpeditionsHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminExpeditionsData) {
  return {
    q: data.filters.q || undefined,
    region: data.filters.region || undefined,
    campaign: data.filters.campaign === "all" ? undefined : data.filters.campaign,
    sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
    dir: data.filters.dir === "desc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminExpeditionsData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={adminExpeditionsHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShipWheel }) {
  return (
    <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ocean-900/58">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

export default async function AdminExpeditionsPage({ searchParams }: AdminExpeditionsPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await observeAdminDataLoader("admin.expeditions.directory", () => getAdminExpeditionsPage(params));
  const savedMessage = params?.saved ? statusMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const baseParams = listParams(data);
  const columns: AdminDataTableColumn<AdminExpedition>[] = [
    {
      key: "expedition",
      header: <SortHeader label="Expedition" sort="title" data={data} />,
      render: (expedition) => (
        <div className="min-w-64">
          <Link
            href={`/admin/expeditions/${expedition.id}`}
            className="font-bold text-ocean-900 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            {expedition.title}
          </Link>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">/{expedition.slug}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">{expedition.durationDays} days</p>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (expedition) => <AdminStatusBadge value={expedition.status} />
    },
    {
      key: "location",
      header: <SortHeader label="Region" sort="region" data={data} />,
      render: (expedition) => <span className="font-semibold text-ocean-900/72">{expedition.region}</span>
    },
    {
      key: "campaign",
      header: "Related project",
      render: (expedition) => (
        <div className="min-w-44">
          {expedition.relatedCampaignTitle ? (
            <>
              <AdminStatusBadge value="published" />
              <p className="mt-2 text-sm font-semibold text-ocean-900/68">{expedition.relatedCampaignTitle}</p>
            </>
          ) : (
            <>
              <AdminStatusBadge value="draft" />
              <p className="mt-2 text-sm font-semibold text-ocean-900/48">No related project</p>
            </>
          )}
        </div>
      )
    },
    {
      key: "departures",
      header: <SortHeader label="Departures" sort="departures" data={data} />,
      render: (expedition) => (
        <div className="min-w-32">
          <p className="font-bold text-ocean-900">{expedition.departureCount.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/52">{expedition.openDepartureCount.toLocaleString("id-ID")} open</p>
        </div>
      )
    },
    {
      key: "capacity",
      header: <SortHeader label="Bookings" sort="bookings" data={data} />,
      render: (expedition) => (
        <div className="min-w-36">
          <p className="font-bold text-ocean-900">{expedition.bookingCount.toLocaleString("id-ID")} bookings</p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/52">{expedition.availableSeats.toLocaleString("id-ID")} seats available</p>
        </div>
      )
    },
    {
      key: "reviews",
      header: <SortHeader label="Reviews" sort="reviews" data={data} />,
      render: (expedition) => (
        <span className={cn("font-bold", expedition.pendingReviewCount > 0 ? "text-coral-700" : "text-ocean-900/58")}>
          {expedition.pendingReviewCount.toLocaleString("id-ID")} pending
        </span>
      )
    },
    {
      key: "price",
      header: <SortHeader label="Base price" sort="price" data={data} />,
      render: (expedition) => <span className="whitespace-nowrap font-bold text-ocean-900">{formatCurrency(expedition.basePrice, expedition.currency)}</span>
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (expedition) => (
        <div className="flex min-w-28 flex-col items-stretch gap-2">
          <Link
            href={`/admin/expeditions/${expedition.id}`}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            View
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href={`/expeditions/${expedition.slug}`} className="text-center text-sm font-bold text-coral-700 hover:text-coral-500">
            Public page
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title="Expeditions"
        description="Read-only monitoring for partner-owned expeditions, departures, bookings, requests, and reviews."
      />
      <AdminDomainNav items={adminExpeditionNavItems} active={pathname} />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Expedition summary">
        <SummaryMetric label="Catalog rows" value={data.summary.expeditions.toLocaleString("id-ID")} icon={ShipWheel} />
        <SummaryMetric label="Departures" value={data.summary.departures.toLocaleString("id-ID")} icon={CalendarDays} />
        <SummaryMetric label="Open departures" value={data.summary.openDepartures.toLocaleString("id-ID")} icon={CalendarPlus} />
        <SummaryMetric label="Available seats" value={data.summary.availableSeats.toLocaleString("id-ID")} icon={Users} />
        <SummaryMetric label="Pending reviews" value={data.summary.pendingReviews.toLocaleString("id-ID")} icon={MessageSquareText} />
      </section>

      <AdminListToolbar
        action={pathname}
        searchValue={data.filters.q}
        searchPlaceholder="Search expeditions, regions, projects"
        clearHref={pathname}
        hiddenFields={{
          sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
          dir: data.filters.dir === "desc" ? undefined : data.filters.dir
        }}
      >
        <select name="region" defaultValue={data.filters.region} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter by region">
          <option value="">All regions</option>
          {data.regionOptions.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
        <select name="campaign" defaultValue={data.filters.campaign} className={cn(adminSelectClassName, "min-w-44")} aria-label="Filter by related project">
          <option value="all">All project links</option>
          <option value="linked">Linked to project</option>
          <option value="unlinked">No project link</option>
        </select>
      </AdminListToolbar>

      <AdminDataTable
        caption="Expedition management directory"
        rows={data.expeditions}
        getRowKey={(expedition) => expedition.id}
        columns={columns}
        emptyState={
          <AdminEmptyState
            title="No matching expeditions"
            description="Adjust the search or filters. Expeditions are created and maintained by partners."
          />
        }
      />

      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
