import { AlertTriangle, ArrowRight, ArrowUpRight, BriefcaseBusiness, CircleDollarSign, FileBadge, FileText, Globe2, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { ProgressMeter } from "@/components/ui/progress-meter";
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
  const verifiedEvidence = data.evidence.length - pendingEvidence;
  const needsAttention = data.metrics.atRiskProjects + data.metrics.needsAttentionProjects;
  const publicImpactHref = data.publicImpactPreview.href ?? "/corporate/reports";
  const publicImpactCta = data.publicImpactPreview.href ? "Open public impact page" : "Prepare public impact page";
  const topRisk = data.riskAlerts[0];
  const unallocatedBudget = Math.max(0, data.financials.committedFunding - data.financials.fundsDisbursed);
  const relationshipSteps = [
    {
      label: "Program budget",
      value: formatCurrency(data.financials.committedFunding),
      support: `${formatCurrency(unallocatedBudget)} not yet allocated`,
      icon: BriefcaseBusiness
    },
    {
      label: "Funded campaigns",
      value: data.portfolio.length.toLocaleString("id-ID"),
      support: `${formatCurrency(data.financials.fundsDisbursed)} allocated to campaigns`,
      icon: ShieldCheck
    },
    {
      label: "Contribution ledger",
      value: data.contributions.length.toLocaleString("id-ID"),
      support: `${formatCurrency(data.financials.contributionTotal)} recorded as CSR/grant/sponsorship`,
      icon: CircleDollarSign
    },
    {
      label: "Evidence and reports",
      value: `${verifiedEvidence.toLocaleString("id-ID")}/${data.evidence.length.toLocaleString("id-ID")}`,
      support: `${formatCurrency(data.financials.verifiedUtilization)} verified utilization`,
      icon: FileBadge
    }
  ];
  const relationshipProjects = data.portfolio.slice(0, 4);

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
          title: "Review funded campaigns",
          description: "Check funded campaigns, milestones, and next actions.",
          href: "/corporate/projects",
          icon: ShieldCheck,
          count: `${data.portfolio.length.toLocaleString("id-ID")} campaigns`
        };

  const tasks: CorporateTask[] = [
    {
      title: "Funded campaigns",
      description: "Inspect the funded conservation campaigns inside your program.",
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
      description: "Review the CSR/ESG container: goals, budget, period, partners, and reporting scope.",
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
              {needsAttention > 0 ? `${needsAttention.toLocaleString("id-ID")} campaign checks need attention.` : "No high-priority campaign risks are open."}
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

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5" aria-labelledby="corporate-relationship-map">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Program funding map</p>
            <h2 id="corporate-relationship-map" className="mt-2 text-xl font-bold tracking-normal text-ocean-900">
              How programs, campaigns, and funding connect
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">
              The program owns the budget. Campaign allocations choose which public campaigns receive corporate support. Contribution ledger rows record the funding type, status, and whether it counts toward public campaign progress.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/corporate/projects" className="inline-flex min-h-10 items-center justify-center rounded-full bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700">
              Fund campaign
            </Link>
            <Link href="/corporate/funding" className="inline-flex min-h-10 items-center justify-center rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900 hover:bg-sand-50">
              Review funding
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {relationshipSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Fragment key={step.label}>
                <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
                    <Icon size={15} aria-hidden="true" />
                    {step.label}
                  </div>
                  <p className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{step.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">{step.support}</p>
                </div>
                {index < relationshipSteps.length - 1 ? (
                  <div key={`${step.label}-arrow`} className="hidden items-center justify-center text-ocean-900/32 lg:flex">
                    <ArrowRight size={20} aria-hidden="true" />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-ocean-900/10 bg-ocean-50 p-4">
            <p className="text-sm font-bold text-ocean-900">Budget allocation</p>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-ocean-900/58">Allocated to campaigns</span>
              <span className="font-bold text-ocean-900">{data.financials.disbursementRate}%</span>
            </div>
            <ProgressMeter value={data.financials.disbursementRate} label="Program budget allocated to campaigns" className="mt-2 h-2" indicatorClassName="bg-ocean-700" trackClassName="bg-white" />
            <div className="mt-4 grid gap-2 text-sm">
              <p className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 font-semibold text-ocean-900/62">
                <span>Program budget</span>
                <span className="font-bold text-ocean-900">{formatCurrency(data.financials.committedFunding)}</span>
              </p>
              <p className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 font-semibold text-ocean-900/62">
                <span>Campaign allocations</span>
                <span className="font-bold text-ocean-900">{formatCurrency(data.financials.fundsDisbursed)}</span>
              </p>
              <p className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 font-semibold text-ocean-900/62">
                <span>Contribution records</span>
                <span className="font-bold text-ocean-900">{formatCurrency(data.financials.contributionTotal)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-ocean-900">Campaign funding links</p>
              <Link href="/corporate/projects" className="text-xs font-bold text-coral-700 hover:text-coral-500">
                Open all funded campaigns
              </Link>
            </div>
            <div className="mt-3 divide-y divide-ocean-900/10">
              {relationshipProjects.map((project) => (
                <div key={project.campaignSlug} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-bold text-ocean-900">{project.campaignTitle}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">
                      {project.organizationName} · {project.region} · {project.latestContributionStatus.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="grid gap-1 text-sm sm:min-w-44 sm:text-right">
                    <p className="font-bold text-ocean-900">{formatCurrency(project.allocationValue)}</p>
                    <p className="text-xs font-semibold text-ocean-900/54">
                      {formatCurrency(project.contributionTotal)} ledgered · {project.evidenceSummary.verified}/{project.evidenceSummary.total} evidence
                    </p>
                  </div>
                </div>
              ))}
              {relationshipProjects.length === 0 ? (
                <p className="py-4 text-sm font-semibold text-ocean-900/58">No campaigns have been funded in this program yet. Use Fund campaign to create the first allocation and contribution record.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2" aria-label="Corporate terminology">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h2 className="text-sm font-bold text-ocean-900">Program</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">
            The CSR/ESG container owned by the company: reporting period, budget, governance scope, and roll-up goals.
          </p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h2 className="text-sm font-bold text-ocean-900">Campaign</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">
            The public conservation campaign funded inside a program, with partner delivery, milestones, evidence, and allocation tracking.
          </p>
        </article>
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
