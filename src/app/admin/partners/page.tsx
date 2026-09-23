import Link from "next/link";
import { ArrowUpDown, BadgeCheck, Globe2, Handshake, Pencil, UsersRound } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminPartnersPage, type AdminPartnerFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin Partners"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/partners";

const statusMessages: Record<string, string> = {
  "partner-created": "Partner created.",
  "partner-updated": "Partner updated.",
  "partner-deleted": "Partner deleted.",
  "partner-user-assigned": "User assigned to partner.",
  "partner-user-created": "Partner user created.",
  "partner-user-updated": "Partner user updated.",
  "partner-user-removed": "Partner user removed."
};

const errorMessages: Record<string, string> = {
  "partner-delete": "Confirm deletion by checking the delete box.",
  "partner-has-campaigns": "Partners with campaigns cannot be deleted.",
  "partner-invalid": "Enter a partner name, slug, and type.",
  "partner-slug": "That partner slug is already in use.",
  "partner-user-exists": "That email already belongs to a user. Use assign existing user instead.",
  "partner-user-invalid": "Enter valid user details. New passwords must be at least 8 characters.",
  "partner-user-missing": "No user exists for that email.",
  "partner-missing": "Partner record was not found."
};

type AdminPartnersPageProps = {
  searchParams?: Promise<
    AdminPartnerFilters & {
      error?: string;
      saved?: string;
    }
  >;
};

type AdminPartnersData = Awaited<ReturnType<typeof getAdminPartnersPage>>;
type AdminPartner = AdminPartnersData["partners"][number];

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function adminPartnersHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminPartnersData) {
  return {
    q: data.filters.q || undefined,
    verification: data.filters.verification === "all" ? undefined : data.filters.verification,
    type: data.filters.type || undefined,
    sort: data.filters.sort === "name" ? undefined : data.filters.sort,
    dir: data.filters.dir === "asc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminPartnersData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={adminPartnersHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Handshake }) {
  return (
    <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ocean-900/58">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sand-100 text-ocean-900">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

export default async function AdminPartnersPage({ searchParams }: AdminPartnersPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await observeAdminDataLoader("admin.partners.directory", () => getAdminPartnersPage(params));
  const savedMessage = params?.saved ? statusMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const baseParams = listParams(data);
  const columns: AdminDataTableColumn<AdminPartner>[] = [
    {
      key: "partner",
      header: <SortHeader label="Partner" sort="name" data={data} />,
      render: (partner) => (
        <div className="min-w-64">
          <Link
            href={`/admin/partners/${partner.id}`}
            className="font-bold text-ocean-900 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            {partner.name}
          </Link>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">/{partner.slug}</p>
          {partner.websiteUrl ? <p className="mt-1 max-w-64 truncate text-xs font-semibold text-ocean-900/44">{partner.websiteUrl}</p> : null}
          <Link href={`/admin/partners/${partner.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-coral-700 hover:text-coral-500">
            <Pencil className="size-3.5" aria-hidden="true" />
            Manage partner
          </Link>
        </div>
      )
    },
    {
      key: "type",
      header: <SortHeader label="Type" sort="type" data={data} />,
      render: (partner) => <AdminStatusBadge value={partner.type} />
    },
    {
      key: "verification",
      header: <SortHeader label="Verification" sort="verification" data={data} />,
      render: (partner) => <AdminStatusBadge value={partner.verification} />
    },
    {
      key: "campaigns",
      header: <SortHeader label="Projects" sort="campaigns" data={data} />,
      render: (partner) => <span className="font-bold">{partner.campaignCount.toLocaleString("id-ID")}</span>
    },
    {
      key: "users",
      header: <SortHeader label="Users" sort="users" data={data} />,
      render: (partner) => (
        <div className="min-w-28">
          <p className="font-bold">{partner.userCount.toLocaleString("id-ID")} total</p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/54">{partner.activeUserCount.toLocaleString("id-ID")} active</p>
        </div>
      )
    },
    {
      key: "created",
      header: <SortHeader label="Created" sort="createdAt" data={data} />,
      render: (partner) => (
        <time dateTime={partner.createdAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/68">
          {partner.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
        </time>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (partner) => (
        <Link
          href={`/admin/partners/${partner.id}`}
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
        eyebrow="Partners"
        title="Partner management"
        description="Search, filter, and compare partner organizations before opening a focused workspace for verification, users, projects, and settings."
        actionHref="/admin/partners/new"
        actionLabel="New partner"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Partner summary">
        <SummaryMetric label="Filtered partners" value={data.summary.partners.toLocaleString("id-ID")} icon={Handshake} />
        <SummaryMetric label="Document verified" value={data.summary.documentVerified.toLocaleString("id-ID")} icon={BadgeCheck} />
        <SummaryMetric label="Field verified" value={data.summary.fieldVerified.toLocaleString("id-ID")} icon={Globe2} />
        <SummaryMetric label="Active partner users" value={data.summary.activeUsers.toLocaleString("id-ID")} icon={UsersRound} />
      </section>

      <AdminListToolbar
        action={pathname}
        searchValue={data.filters.q}
        searchPlaceholder="Search partner name, slug, or type"
        clearHref={pathname}
        createHref="/admin/partners/new"
        createLabel="New partner"
        hiddenFields={{
          sort: data.filters.sort === "name" ? undefined : data.filters.sort,
          dir: data.filters.dir === "asc" ? undefined : data.filters.dir
        }}
      >
        <label className="sr-only" htmlFor="verification">Verification</label>
        <select id="verification" name="verification" defaultValue={data.filters.verification} className={cn(adminSelectClassName, "min-w-44")}>
          <option value="all">All verification</option>
          <option value="basic">Basic</option>
          <option value="document">Document</option>
          <option value="field">Field</option>
        </select>
        <label className="sr-only" htmlFor="type">Partner type</label>
        <select id="type" name="type" defaultValue={data.filters.type} className={cn(adminSelectClassName, "min-w-40")}>
          <option value="">All types</option>
          {data.typeOptions.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
        </select>
      </AdminListToolbar>

      <AdminDataTable
        caption="Partner directory"
        columns={columns}
        rows={data.partners}
        getRowKey={(partner) => partner.id}
        emptyState={
          <AdminEmptyState
            title="No partners match these filters"
            description="Clear the filters or create the first implementation partner before assigning users, campaigns, or activity workflows."
            actionHref="/admin/partners/new"
            actionLabel="Create partner"
          />
        }
      />

      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
