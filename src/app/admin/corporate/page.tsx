import Link from "next/link";
import { ArrowUpDown, Building2, CircleDollarSign, Pencil, UsersRound } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, adminInputClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { assignCorporatePermissionAction, createCorporateWorkspaceAction } from "@/lib/admin-corporate-actions";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminCorporatePage, type AdminCorporateFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin Corporate" };
export const dynamic = "force-dynamic";

const pathname = "/admin/corporate";

const savedMessages: Record<string, string> = {
  workspace: "Corporate workspace saved.",
  permission: "Corporate access assigned.",
  account: "Corporate account updated.",
  program: "Corporate program updated.",
  "permission-removed": "Corporate access removed."
};

const errorMessages: Record<string, string> = {
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "workspace-invalid": "Enter company name, program name, and a valid budget.",
  "permission-invalid": "Choose a corporate account and user email.",
  "permission-missing": "Corporate account, access row, or user was not found. Create the user first, then assign access.",
  "account-invalid": "Enter a valid company name and slug.",
  "account-missing": "Corporate account was not found.",
  "account-slug": "That corporate slug is already in use.",
  "program-invalid": "Enter valid program details, dates, and budget.",
  "program-missing": "Corporate program was not found.",
  "program-slug": "That program slug is already in use."
};

type AdminCorporatePageProps = {
  searchParams?: Promise<AdminCorporateFilters & { error?: string; saved?: string }>;
};

type AdminCorporateData = Awaited<ReturnType<typeof getAdminCorporatePage>>;
type AdminCorporateAccount = AdminCorporateData["accounts"][number];

function adminCorporateHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminCorporateData) {
  return {
    q: data.filters.q || undefined,
    sort: data.filters.sort === "name" ? undefined : data.filters.sort,
    dir: data.filters.dir === "asc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminCorporateData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";
  return (
    <Link href={adminCorporateHref({ ...listParams(data), sort, dir: nextDir, page: 1 })} className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2">
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Building2 }) {
  return (
    <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ocean-900/58">{label}</p>
          <MetricValue className="mt-3 text-ocean-900">{value}</MetricValue>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><Icon className="size-5" aria-hidden="true" /></span>
      </div>
    </article>
  );
}

export default async function AdminCorporatePage({ searchParams }: AdminCorporatePageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await observeAdminDataLoader("admin.corporate", () => getAdminCorporatePage(params));
  const savedMessage = params?.saved ? savedMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const baseParams = listParams(data);
  const columns: AdminDataTableColumn<AdminCorporateAccount>[] = [
    {
      key: "company",
      header: <SortHeader label="Company" sort="name" data={data} />,
      render: (account) => (
        <div className="min-w-56">
          <Link href={`/admin/corporate/${account.id}`} className="font-bold text-ocean-900 hover:text-coral-700">
            {account.name}
          </Link>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">/{account.slug}</p>
          <Link href={`/admin/corporate/${account.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-coral-700 hover:text-coral-500">
            <Pencil className="size-3.5" aria-hidden="true" />
            Manage workspace
          </Link>
        </div>
      )
    },
    {
      key: "programs",
      header: <SortHeader label="Programs" sort="programs" data={data} />,
      render: (account) => <div><p className="font-bold">{account.programCount.toLocaleString("id-ID")}</p><p className="mt-1 text-xs font-semibold text-ocean-900/54">{account.activeProgramCount.toLocaleString("id-ID")} active</p></div>
    },
    {
      key: "users",
      header: <SortHeader label="Users" sort="users" data={data} />,
      render: (account) => <span className="font-bold">{account.userCount.toLocaleString("id-ID")}</span>
    },
    {
      key: "contributions",
      header: <SortHeader label="Contributions" sort="contributions" data={data} />,
      render: (account) => <span className="font-bold">{account.contributionCount.toLocaleString("id-ID")}</span>
    },
    {
      key: "created",
      header: <SortHeader label="Created" sort="createdAt" data={data} />,
      render: (account) => <time dateTime={account.createdAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/68">{account.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</time>
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (account) => (
        <Link
          href={`/admin/corporate/${account.id}`}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Manage
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Corporate" title="Corporate workspaces" description="Create company workspaces, assign access, and manage the corporate account directory from a scalable admin view." />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Corporate summary">
        <SummaryMetric label="Filtered companies" value={data.metrics.accounts.toLocaleString("id-ID")} icon={Building2} />
        <SummaryMetric label="Active programs" value={data.metrics.activePrograms.toLocaleString("id-ID")} icon={Building2} />
        <SummaryMetric label="Corporate users" value={data.metrics.corporateUsers.toLocaleString("id-ID")} icon={UsersRound} />
        <SummaryMetric label="Contributions" value={data.metrics.contributions.toLocaleString("id-ID")} icon={CircleDollarSign} />
      </section>

      <FormTabs ariaLabel="Corporate administration actions" tabs={[{ id: "workspace", label: "Create account", description: "Company governance" }, { id: "access", label: "Assign access", description: "Corporate users" }]}>
        <form action={createCorporateWorkspaceAction} className="grid gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create corporate account</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
              Platform admin creates the company workspace only. Corporate Admin creates and manages programs after access is assigned.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Company name
              <input name="accountName" className={adminInputClassName} placeholder="Nusantara Bank" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Slug <span className="font-semibold text-ocean-900/44">(optional)</span>
              <input name="accountSlug" className={adminInputClassName} placeholder="nusantara-bank" />
            </label>
          </div>
          <Button type="submit" className="justify-self-start">Create corporate account</Button>
        </form>

        <form action={assignCorporatePermissionAction} className="grid gap-4">
          <div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Assign corporate access</h2><p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Give an existing user access to one company workspace.</p></div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">Corporate account<select name="corporateAccountId" className={adminSelectClassName} required>{data.accountOptions.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">User email<input name="email" type="email" className={adminInputClassName} placeholder="name@company.com" required /></label>
            <Button type="submit" className="min-h-10" disabled={data.accountOptions.length === 0}>Assign</Button>
          </div>
        </form>
      </FormTabs>

      <AdminListToolbar action={pathname} searchValue={data.filters.q} searchPlaceholder="Search company name or slug" clearHref={pathname} hiddenFields={{ sort: data.filters.sort === "name" ? undefined : data.filters.sort, dir: data.filters.dir === "asc" ? undefined : data.filters.dir }} />

      <AdminDataTable caption="Corporate account directory" columns={columns} rows={data.accounts} getRowKey={(account) => account.id} emptyState={<AdminEmptyState title="No corporate accounts match" description="Adjust the search or create a new workspace." />} />

      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
