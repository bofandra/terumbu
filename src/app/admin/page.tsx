import Link from "next/link";
import { ArrowUpRight, BarChart3, Building2, FileCheck2, Handshake, Megaphone, ReceiptText, ScrollText, ShipWheel, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { getAdminOperationsData, getAdminPortalData } from "@/lib/queries";

export const metadata = {
  title: "Admin Portal"
};

export const dynamic = "force-dynamic";

type AdminPortalPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    charged?: string;
    failed?: string;
    skipped?: string;
  }>;
};

type AdminTask = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  countLabel?: string;
};

function savedMessage(params: Awaited<NonNullable<AdminPortalPageProps["searchParams"]>> | undefined) {
  if (!params?.saved) {
    return null;
  }

  if (params.saved === "billing-run") {
    return `Monthly billing run complete: ${Number(params.charged ?? 0).toLocaleString("id-ID")} charged, ${Number(params.failed ?? 0).toLocaleString("id-ID")} failed, ${Number(params.skipped ?? 0).toLocaleString("id-ID")} skipped.`;
  }

  if (params.saved === "refund-processed") {
    return "Refund was approved and processed through the payment workflow.";
  }

  if (params.saved === "operation-rejected") {
    return "Payment operation was rejected and the requester was notified.";
  }

  return "Admin operation saved.";
}

function TaskLink({ task, priority = false }: { task: AdminTask; priority?: boolean }) {
  const Icon = task.icon;

  return (
    <Link
      href={task.href}
      className="group flex min-h-28 items-start justify-between gap-4 rounded-lg border border-ocean-900/10 bg-white p-4 transition hover:border-coral-500"
    >
      <span className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-bold tracking-normal text-ocean-900">{task.title}</span>
          <span className="mt-1 block max-w-xl text-sm font-semibold leading-6 text-ocean-900/58">{task.description}</span>
          {typeof task.count === "number" && task.countLabel ? (
            <span className="mt-3 inline-flex rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900">
              {task.count.toLocaleString("id-ID")} {task.countLabel}
            </span>
          ) : null}
        </span>
      </span>
      <ArrowUpRight className={priority ? "size-5 shrink-0 text-coral-700" : "size-5 shrink-0 text-ocean-900/40 group-hover:text-coral-700"} aria-hidden="true" />
    </Link>
  );
}

export default async function AdminPortalPage({ searchParams }: AdminPortalPageProps) {
  const params = await searchParams;
  await requireRole(["admin"], "/admin");
  const [data, operations] = await Promise.all([getAdminPortalData(), getAdminOperationsData()]);

  const reviewCampaigns = data.campaigns.filter((campaign) => campaign.status === "review").length;
  const pendingEvidence = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const paymentChecks =
    data.donations.filter((donation) => donation.status !== "paid" || donation.pendingOperation).length + data.bookingPaymentOperations.length + data.dueSubscriptions.length;
  const recentUsers = operations.users.length;

  const priorityTasks: AdminTask[] = [
    {
      title: "Verify field evidence",
      description: "Review partner submissions and record the verification decision.",
      href: "/admin/campaigns/evidence",
      icon: FileCheck2,
      count: pendingEvidence,
      countLabel: "pending"
    },
    {
      title: "Reconcile payments",
      description: "Run due billing, approve refunds, and settle donation or booking payment records.",
      href: "/admin/payments",
      icon: ReceiptText,
      count: paymentChecks,
      countLabel: "checks"
    },
    {
      title: "Approve campaign status",
      description: "Move reviewed campaigns toward publishing, funding, completion, or archival.",
      href: "/admin/campaigns",
      icon: Megaphone,
      count: reviewCampaigns,
      countLabel: "in review"
    }
  ];

  const managementTasks: AdminTask[] = [
    { title: "Expeditions", description: "Manage trip content, schedules, bookings, and moderation.", href: "/admin/expeditions", icon: ShipWheel, count: operations.expeditionCatalog.length, countLabel: "records" },
    { title: "Corporate", description: "Review accounts, programs, portfolio links, and lifecycle status.", href: "/admin/corporate", icon: Building2 },
    { title: "Partners", description: "Maintain partner organizations, verification levels, and ownership.", href: "/admin/partners", icon: Handshake, count: operations.partners.length, countLabel: "partners" },
    { title: "Reports", description: "Inspect exports, report artifacts, and scheduled admin outputs.", href: "/admin/reports", icon: BarChart3, count: operations.reports.length, countLabel: "exports" },
    { title: "Users", description: "Create accounts, assign roles, and resolve access gaps.", href: "/admin/users", icon: Users, count: recentUsers, countLabel: "recent" },
    { title: "Audit", description: "Search operational events and account activity.", href: "/admin/audit", icon: ScrollText }
  ];

  const message = savedMessage(params);

  return (
    <div className="space-y-6">
      <header className="border-b border-ocean-900/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Admin portal</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900 sm:text-3xl">Choose one admin task</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62">
          Start with one workflow, finish it, then move to the next queue.
        </p>
      </header>

      {message ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{message}</p> : null}
      {params?.error ? (
        <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          Could not complete that operation. Open the relevant task and confirm the record is still eligible.
        </p>
      ) : null}

      <section aria-labelledby="priority-admin-tasks" className="grid gap-3">
        <h2 id="priority-admin-tasks" className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/46">
          Needs attention
        </h2>
        {priorityTasks.map((task) => (
          <TaskLink key={task.href} task={task} priority />
        ))}
      </section>

      <section aria-labelledby="admin-management-tasks" className="grid gap-3">
        <h2 id="admin-management-tasks" className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/46">
          Manage records
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {managementTasks.map((task) => (
            <TaskLink key={task.href} task={task} />
          ))}
        </div>
      </section>
    </div>
  );
}
