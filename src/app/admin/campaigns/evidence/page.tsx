import Link from "next/link";
import { AlertTriangle, ArrowUpDown, Columns3, ExternalLink, FileCheck2, ListFilter, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { EvidenceKanbanBoard, type EvidenceKanbanCard } from "@/components/evidence-kanban-board";
import { MetricValue } from "@/components/ui/metric-value";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { evidenceStatusLabel, evidenceVerificationStatuses } from "@/lib/evidence-review-workflow";
import { verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminEvidenceBoardData, getAdminEvidenceReviewPage, type AdminEvidenceReviewFilters } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Campaign Evidence"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/campaigns/evidence";

const statusMessages: Record<string, string> = {
  evidence: "Evidence review status updated.",
  "review-note": "Add a review note for clarification or rejection.",
  "evidence-missing": "Evidence record was not found."
};

type AdminCampaignEvidencePageProps = {
  searchParams?: Promise<
    AdminEvidenceReviewFilters & {
      error?: string;
      saved?: string;
      view?: string;
    }
  >;
};

type AdminEvidenceQueueData = Awaited<ReturnType<typeof getAdminEvidenceReviewPage>>;
type AdminEvidenceQueueRow = AdminEvidenceQueueData["evidence"][number];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function evidenceHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminEvidenceQueueData) {
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

function evidenceDetailHref(evidenceId: string, returnTo: string) {
  return `/admin/campaigns/evidence/${evidenceId}?returnTo=${encodeURIComponent(returnTo)}`;
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminEvidenceQueueData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={evidenceHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileCheck2 }) {
  return (
    <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <Icon className="size-5 text-coral-500" aria-hidden="true" />
      <p className="mt-3 text-sm font-bold text-ocean-900/58">{label}</p>
      <MetricValue className="mt-3 text-ocean-900">{value.toLocaleString("id-ID")}</MetricValue>
    </article>
  );
}

function ViewSwitcher({ active }: { active: "queue" | "board" }) {
  return (
    <nav className="inline-flex rounded-lg border border-ocean-900/10 bg-white p-1 shadow-soft" aria-label="Evidence review view">
      <Link
        href={pathname}
        aria-current={active === "queue" ? "page" : undefined}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2",
          active === "queue" ? "bg-ocean-900 text-white" : "text-ocean-900 hover:bg-sand-50"
        )}
      >
        <ListFilter className="size-4" aria-hidden="true" />
        Review queue
      </Link>
      <Link
        href={`${pathname}?view=board`}
        aria-current={active === "board" ? "page" : undefined}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2",
          active === "board" ? "bg-ocean-900 text-white" : "text-ocean-900 hover:bg-sand-50"
        )}
      >
        <Columns3 className="size-4" aria-hidden="true" />
        Kanban
      </Link>
    </nav>
  );
}

export default async function AdminCampaignEvidencePage({ searchParams }: AdminCampaignEvidencePageProps) {
  const params = await searchParams;
  const user = await requireRole(["admin"], pathname);
  const view = firstValue(params?.view) === "board" ? "board" : "queue";
  const savedMessage = params?.saved ? statusMessages[String(firstValue(params.saved))] ?? "Evidence review saved." : null;
  const errorMessage = params?.error
    ? statusMessages[String(firstValue(params.error))] ?? "Evidence status could not be saved with the current input or permission."
    : null;

  if (view === "board") {
    const data = await observeAdminDataLoader("admin.evidence.board", () => getAdminEvidenceBoardData());
    const pendingCount = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
    const clarificationCount = data.evidence.filter((item) => item.verificationStatus === "needs_clarification").length;
    const submittedCount = data.evidence.filter((item) => item.verificationStatus === "submitted").length;
    const verifiedCount = data.evidence.filter((item) => item.verificationStatus === "verified").length;
    const evidenceByCampaign = new Map<string, typeof data.evidence>();

    for (const evidence of data.evidence) {
      const rows = evidenceByCampaign.get(evidence.campaignId) ?? [];
      rows.push(evidence);
      evidenceByCampaign.set(evidence.campaignId, rows);
    }

    const campaignCards: EvidenceKanbanCard[] = data.campaigns.map((campaign) => {
      const evidence = evidenceByCampaign.get(campaign.id) ?? [];
      const verifiedEvidence = evidence.filter((item) => item.verificationStatus === "verified").length;

      return {
        id: campaign.id,
        title: campaign.title,
        subtitle: `${campaign.partner} / ${campaign.region}`,
        code: campaign.slug,
        href: `/campaigns/${campaign.slug}`,
        tag: labelize(campaign.status),
        chips: [campaign.category, `${campaign.contentCompleteness.score}% content`],
        details: [
          { label: "Raised", value: formatCurrency(Number(campaign.raisedAmount)) },
          { label: "Goal", value: formatCurrency(Number(campaign.goalAmount)) },
          { label: "Evidence", value: `${verifiedEvidence}/${evidence.length} verified` }
        ],
        evidence
      };
    });

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Projects / Evidence"
          title="Evidence review"
          description="Review individual evidence submissions in the queue, or switch to Kanban for a campaign-level workflow overview."
          actionHref="/admin/campaigns"
          actionLabel="Projects"
        />

        {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
        {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

        <ViewSwitcher active="board" />

        <section className="grid gap-3 md:grid-cols-5" aria-label="Evidence summary">
          <SummaryMetric label="Campaign cards" value={campaignCards.length} icon={Columns3} />
          <SummaryMetric label="Submitted" value={submittedCount} icon={FileCheck2} />
          <SummaryMetric label="Needs decision" value={pendingCount} icon={AlertTriangle} />
          <SummaryMetric label="Clarification" value={clarificationCount} icon={MessageSquare} />
          <SummaryMetric label="Verified" value={verifiedCount} icon={ShieldCheck} />
        </section>

        <EvidenceKanbanBoard
          cards={campaignCards}
          reviewAction={verifyEvidenceAction}
          returnTo={`${pathname}?view=board`}
          emptyMessage="No project evidence cards are available yet. Partner submissions will appear here when field teams upload photos, survey notes, or verification records."
        />
      </div>
    );
  }

  const data = await observeAdminDataLoader("admin.evidence.queue", () => getAdminEvidenceReviewPage(params, user.id));
  const baseParams = listParams(data);
  const returnTo = evidenceHref({ ...baseParams, page: data.pagination.page });
  const columns: AdminDataTableColumn<AdminEvidenceQueueRow>[] = [
    {
      key: "evidence",
      header: <SortHeader label="Evidence" sort="title" data={data} />,
      render: (evidence) => (
        <div className="min-w-64">
          <Link
            href={evidenceDetailHref(evidence.id, returnTo)}
            className="font-bold text-ocean-900 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            {evidence.title}
          </Link>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{evidence.evidenceCode}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{labelize(evidence.evidenceType)}</p>
        </div>
      )
    },
    {
      key: "project",
      header: <SortHeader label="Project" sort="campaign" data={data} />,
      render: (evidence) => (
        <div className="min-w-52">
          <p className="font-bold text-ocean-900">{evidence.campaignTitle}</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{evidence.impactSiteName ?? "No impact site"}</p>
          {evidence.impactSiteRegion ? <p className="mt-1 text-xs font-semibold text-ocean-900/48">{evidence.impactSiteRegion}</p> : null}
        </div>
      )
    },
    {
      key: "partner",
      header: <SortHeader label="Partner" sort="partner" data={data} />,
      render: (evidence) => <span className="min-w-40 font-semibold text-ocean-900/72">{evidence.partnerName}</span>
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
      render: (evidence) => (
        <div className="min-w-36">
          <time dateTime={evidence.createdAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/68">
            {evidence.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
          </time>
          {evidence.reviewedAt ? (
            <p className="mt-1 text-xs font-semibold text-ocean-900/48">Reviewed {evidence.reviewedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>
          ) : null}
        </div>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (evidence) => (
        <div className="flex min-w-32 flex-col items-stretch gap-2">
          <Link
            href={evidenceDetailHref(evidence.id, returnTo)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            Review
          </Link>
          <Link href={evidence.fileUrl} className="inline-flex items-center justify-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
            File <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects / Evidence"
        title="Evidence review"
        description="Work from individual submissions: search, filter, assign, and open one evidence record at a time for a focused verification decision."
        actionHref="/admin/campaigns"
        actionLabel="Projects"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <ViewSwitcher active="queue" />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Evidence queue summary">
        <SummaryMetric label="Evidence" value={data.summary.total} icon={FileCheck2} />
        <SummaryMetric label="Submitted" value={data.summary.submitted} icon={AlertTriangle} />
        <SummaryMetric label="In review" value={data.summary.inReview} icon={UserCheck} />
        <SummaryMetric label="Clarification" value={data.summary.clarification} icon={MessageSquare} />
        <SummaryMetric label="Verified" value={data.summary.verified} icon={ShieldCheck} />
        <SummaryMetric label="Rejected" value={data.summary.rejected} icon={AlertTriangle} />
      </section>

      <AdminListToolbar
        action={pathname}
        searchValue={data.filters.q}
        searchPlaceholder="Search evidence, code, project, partner, or impact site"
        clearHref={pathname}
      >
        <select name="status" defaultValue={data.filters.status} className={cn(adminSelectClassName, "min-w-40")} aria-label="Evidence status">
          <option value="all">All statuses</option>
          {evidenceVerificationStatuses.map((status) => (
            <option key={status} value={status}>{evidenceStatusLabel(status)}</option>
          ))}
        </select>
        <select name="reviewer" defaultValue={data.filters.reviewer} className={cn(adminSelectClassName, "min-w-40")} aria-label="Reviewer assignment">
          <option value="all">All reviewers</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select name="partner" defaultValue={data.filters.partner} className={cn(adminSelectClassName, "min-w-44")} aria-label="Partner">
          <option value="">All partners</option>
          {data.partnerOptions.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
        </select>
        <select name="campaign" defaultValue={data.filters.campaign} className={cn(adminSelectClassName, "min-w-48")} aria-label="Project">
          <option value="">All projects</option>
          {data.campaignOptions.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
        </select>
      </AdminListToolbar>

      <AdminDataTable
        caption="Evidence review queue"
        columns={columns}
        rows={data.evidence}
        getRowKey={(evidence) => evidence.id}
        emptyState={
          <AdminEmptyState
            title="No evidence matches these filters"
            description="Clear one or more filters, or wait for partner teams to submit additional field evidence."
            actionHref={pathname}
            actionLabel="Clear filters"
          />
        }
      />

      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
