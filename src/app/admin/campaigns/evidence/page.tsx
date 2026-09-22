import Link from "next/link";
import { ArrowUpDown, ExternalLink, FileCheck2, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminDomainNav, adminDonationNavItems } from "@/components/admin/admin-domain-nav";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { MetricValue } from "@/components/ui/metric-value";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { evidenceStatusLabel, evidenceVerificationStatuses } from "@/lib/evidence-review-workflow";
import { getAdminEvidenceReviewPage, type AdminEvidenceReviewFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin Donation Activity" };
export const dynamic = "force-dynamic";

const pathname = "/admin/campaigns/evidence";

const statusMessages: Record<string, string> = {
  evidence: "Activity review status updated.",
  "review-note": "Add a review note for clarification or rejection.",
  "evidence-missing": "Activity record was not found."
};

type PageProps = {
  searchParams?: Promise<AdminEvidenceReviewFilters & { error?: string; saved?: string }>;
};

type EvidenceData = Awaited<ReturnType<typeof getAdminEvidenceReviewPage>>;
type EvidenceRow = EvidenceData["evidence"][number];

function evidenceHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: EvidenceData) {
  return {
    q: data.filters.q || undefined,
    status: data.filters.status === "all" ? undefined : data.filters.status,
    partner: data.filters.partner || undefined,
    campaign: data.filters.campaign || undefined,
    reviewer: data.filters.reviewer === "all" ? undefined : data.filters.reviewer,
    sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
    dir: data.filters.dir === "desc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: EvidenceData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";
  return (
    <Link href={evidenceHref({ ...listParams(data), sort, dir: nextDir, page: 1 })} className="inline-flex items-center gap-1 text-ocean-900/70 hover:text-coral-700">
      {label}<ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileCheck2 }) {
  return (
    <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <Icon className="size-5 text-coral-500" aria-hidden="true" />
      <p className="mt-3 text-sm font-bold text-ocean-900/58">{label}</p>
      <MetricValue className="mt-2 text-ocean-900">{value.toLocaleString("id-ID")}</MetricValue>
    </article>
  );
}

export default async function AdminDonationEvidencePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const user = await requireRole(["admin"], pathname);
  const data = await observeAdminDataLoader("admin.donations.evidence", () => getAdminEvidenceReviewPage(params, user.id));
  const savedMessage = params.saved ? statusMessages[String(params.saved)] ?? "Activity review saved." : null;
  const errorMessage = params.error ? statusMessages[String(params.error)] ?? "Activity review could not be saved." : null;
  const baseParams = listParams(data);
  const returnTo = evidenceHref({ ...baseParams, page: data.pagination.page });

  const columns: AdminDataTableColumn<EvidenceRow>[] = [
    {
      key: "evidence",
      header: <SortHeader label="Activity" sort="title" data={data} />,
      render: (evidence) => (
        <div className="min-w-64">
          <Link href={`/admin/campaigns/evidence/${evidence.id}?returnTo=${encodeURIComponent(returnTo)}`} className="font-bold text-ocean-900 hover:text-coral-700">
            {evidence.title}
          </Link>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{evidence.evidenceCode}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{evidence.evidenceType.replaceAll("_", " ")}</p>
        </div>
      )
    },
    {
      key: "project",
      header: <SortHeader label="Donation" sort="campaign" data={data} />,
      render: (evidence) => <span className="min-w-44 font-semibold text-ocean-900/68">{evidence.campaignTitle}</span>
    },
    {
      key: "status",
      header: <SortHeader label="Status" sort="status" data={data} />,
      render: (evidence) => (
        <div className="min-w-40 space-y-2">
          <AdminStatusBadge value={evidence.verificationStatus} />
          <p className="text-xs font-semibold text-ocean-900/52">
            {evidence.assignedReviewerUserId === user.id ? "Assigned to you" : evidence.assignedReviewerUserId ? "Reviewer assigned" : "Unassigned"}
          </p>
        </div>
      )
    },
    {
      key: "submitted",
      header: <SortHeader label="Submitted" sort="createdAt" data={data} />,
      render: (evidence) => <time className="whitespace-nowrap font-semibold text-ocean-900/68">{evidence.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</time>
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (evidence) => (
        <div className="flex min-w-28 flex-col gap-2">
          <Link href={`/admin/campaigns/evidence/${evidence.id}?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">Review</Link>
          <a href={evidence.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 text-sm font-bold text-coral-700">File <ExternalLink className="size-3.5" aria-hidden="true" /></a>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Donations"
        title="Activity review"
        description="Review partner field activity, attachments, and verification status. Donation setup and fundraising details stay in the Donations page."
      />
      <AdminDomainNav items={adminDonationNavItems} active={pathname} />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Activity review summary">
        <SummaryMetric label="Submitted" value={data.summary.submitted} icon={FileCheck2} />
        <SummaryMetric label="In review" value={data.summary.inReview} icon={UserCheck} />
        <SummaryMetric label="Needs clarification" value={data.summary.clarification} icon={MessageSquare} />
        <SummaryMetric label="Verified" value={data.summary.verified} icon={ShieldCheck} />
        <SummaryMetric label="Rejected" value={data.summary.rejected} icon={FileCheck2} />
      </section>

      <AdminListToolbar action={pathname} searchValue={data.filters.q} searchPlaceholder="Search activity or code" clearHref={pathname}>
        <select name="status" defaultValue={data.filters.status} className={cn(adminSelectClassName, "min-w-40")} aria-label="Activity status">
          <option value="all">All statuses</option>
          {evidenceVerificationStatuses.map((status) => <option key={status} value={status}>{evidenceStatusLabel(status)}</option>)}
        </select>
        <select name="reviewer" defaultValue={data.filters.reviewer} className={cn(adminSelectClassName, "min-w-40")} aria-label="Reviewer assignment">
          <option value="all">All reviewers</option><option value="me">Assigned to me</option><option value="unassigned">Unassigned</option>
        </select>
        <select name="campaign" defaultValue={data.filters.campaign} className={cn(adminSelectClassName, "min-w-48")} aria-label="Donation">
          <option value="">All donations</option>
          {data.campaignOptions.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
        </select>
      </AdminListToolbar>

      <AdminDataTable
        caption="Donation activity review queue"
        columns={columns}
        rows={data.evidence}
        getRowKey={(evidence) => evidence.id}
        emptyState={<AdminEmptyState title="No activity needs review" description="New partner submissions will appear here." />}
      />
      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
