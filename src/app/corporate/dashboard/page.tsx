import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, CircleDollarSign, FileBadge, FileText, Globe2, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Portal"
};

export const dynamic = "force-dynamic";

type CorporateTask = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count?: number | string;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function TaskCard({ task }: { task: CorporateTask }) {
  const Icon = task.icon;

  return (
    <Link href={task.href} className="group flex min-h-28 items-start justify-between gap-4 rounded-lg border border-ocean-900/10 bg-white p-4 transition hover:border-coral-500">
      <span className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-bold tracking-normal text-ocean-900">{task.title}</span>
          <span className="mt-1 block max-w-xl text-sm font-semibold leading-6 text-ocean-900/58">{task.description}</span>
          {task.count !== undefined ? (
            <span className="mt-3 inline-flex rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900">
              {typeof task.count === "number" ? task.count.toLocaleString("id-ID") : task.count}
            </span>
          ) : null}
        </span>
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-ocean-900/40 group-hover:text-coral-700" aria-hidden="true" />
    </Link>
  );
}

export default async function CorporateDashboardPage() {
  const user = await requireUser("/corporate");
  const data = await requireCorporateDashboardData(user.id, "/corporate");

  const pendingEvidence = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const needsAttention = data.metrics.atRiskProjects + data.metrics.needsAttentionProjects;
  const publicImpactHref = data.publicImpactPreview.href ?? "/corporate/reports";
  const publicImpactCta = data.publicImpactPreview.href ? "Open public impact page" : "Prepare public impact page";
  const topRisk = data.riskAlerts[0];

  const recommendedTask: CorporateTask = topRisk
    ? {
        title: topRisk.title,
        description: topRisk.description,
        href: topRisk.href,
        icon: AlertTriangle,
        count: topRisk.status
      }
    : pendingEvidence > 0
      ? {
          title: "Review evidence",
          description: "Open pending field evidence before the next report is prepared.",
          href: "/corporate/evidence",
          icon: FileText,
          count: `${pendingEvidence.toLocaleString("id-ID")} pending`
        }
      : {
          title: "Review project portfolio",
          description: "Check funded projects, milestones, and next actions.",
          href: "/corporate/projects",
          icon: ShieldCheck,
          count: `${data.portfolio.length.toLocaleString("id-ID")} projects`
        };

  const tasks: CorporateTask[] = [
    {
      title: "Projects",
      description: "Inspect funded conservation projects and milestones.",
      href: "/corporate/projects",
      icon: ShieldCheck,
      count: data.portfolio.length
    },
    {
      title: "Funding",
      description: "Update allocation, utilization, and disbursement status.",
      href: "/corporate/funding",
      icon: CircleDollarSign,
      count: formatCurrency(data.financials.pendingVerification)
    },
    {
      title: "Evidence",
      description: "Review submitted documents, photos, and verification state.",
      href: "/corporate/evidence",
      icon: FileText,
      count: `${pendingEvidence.toLocaleString("id-ID")} pending`
    },
    {
      title: "Reports",
      description: "Generate, approve, publish, and download ESG report artifacts.",
      href: "/corporate/reports",
      icon: FileBadge,
      count: formatDate(data.reporting.nextReportingDeadline)
    },
    {
      title: "Employees",
      description: "Manage participation, events, attendance, and employee impact.",
      href: "/corporate/employees",
      icon: Users,
      count: data.employeeTrend.at(-1)?.employees ?? 0
    },
    {
      title: "Programs",
      description: "Review goals, program period, partners, and reporting scope.",
      href: "/corporate/programs",
      icon: BriefcaseBusiness,
      count: `${data.reporting.periodProgress}% period`
    },
    {
      title: "Public impact",
      description: publicImpactCta,
      href: publicImpactHref,
      icon: Globe2,
      count: data.publicImpactPreview.status
    }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Corporate portal</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900 sm:text-3xl">Choose one corporate task</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62">
          Keep reporting, funding, evidence, and employee work in separate workflows.
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">Program context</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">
              {needsAttention > 0 ? `${needsAttention.toLocaleString("id-ID")} project checks need attention.` : "No high-priority project risks are open."}
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-lg bg-sand-50 p-3">
              <p className="font-bold text-ocean-900">Committed</p>
              <p className="mt-1 font-semibold text-ocean-900/58">{formatCurrency(data.financials.committedFunding)}</p>
            </div>
            <div className="rounded-lg bg-sand-50 p-3">
              <p className="font-bold text-ocean-900">Disbursed</p>
              <p className="mt-1 font-semibold text-ocean-900/58">{formatCurrency(data.financials.fundsDisbursed)}</p>
            </div>
            <div className="rounded-lg bg-sand-50 p-3">
              <p className="font-bold text-ocean-900">Report due</p>
              <p className="mt-1 font-semibold text-ocean-900/58">{formatDate(data.reporting.nextReportingDeadline)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3" aria-labelledby="recommended-corporate-task">
        <h2 id="recommended-corporate-task" className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/46">
          Recommended next
        </h2>
        <TaskCard task={recommendedTask} />
      </section>

      <section className="mt-6 grid gap-3" aria-labelledby="corporate-task-list">
        <h2 id="corporate-task-list" className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/46">
          Task list
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <TaskCard key={task.href} task={task} />
          ))}
        </div>
      </section>
    </main>
  );
}
