"use client";

import { ArrowRight, CheckCircle2, ClipboardCheck, FileSearch, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ProgressMeter } from "@/components/ui/progress-meter";
import { cn, formatCurrency } from "@/lib/utils";

export type CorporateProjectInspectorProject = {
  campaignSlug: string;
  campaignTitle: string;
  campaignCategory: string;
  campaignHref: string;
  region: string;
  organizationName: string;
  organizationVerification: string;
  allocationValue: number;
  utilization: number;
  impactProgress: number;
  impactTarget: number;
  impactUnit: string;
  statusLabel: string;
  statusExplanation: string;
  nextMilestone: string;
  nextMilestoneDate: string | null;
  partnerScore: number;
  invoiceStatus: string;
  disbursementStatus: string;
  evidenceSummary: {
    total: number;
    verified: number;
    pending: number;
    latestTitle: string;
    status: string;
  };
  milestones: Array<{
    label: string;
    status: string;
    dueDate: string | null;
    owner: string;
  }>;
  nextActions: string[];
};

function statusClass(status: string) {
  if (["Complete", "Completed", "On Track", "Verified", "Matched to evidence"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["Needs Attention", "Needs Review", "Needs Approval", "Needs invoice review", "Reviewer action"].includes(status)) {
    return "bg-coral-100 text-coral-700";
  }

  if (status === "At Risk") {
    return "bg-red-100 text-red-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

export function CorporateProjectInspector({
  projects,
  initialSelectedSlug
}: {
  projects: CorporateProjectInspectorProject[];
  initialSelectedSlug?: string;
}) {
  const initialSlug = projects.some((project) => project.campaignSlug === initialSelectedSlug) ? initialSelectedSlug : projects[0]?.campaignSlug;
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const selectedProject = useMemo(
    () => projects.find((project) => project.campaignSlug === selectedSlug) ?? projects[0],
    [projects, selectedSlug]
  );

  if (!selectedProject) {
    return (
      <section className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">
        No corporate projects have been funded yet.
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="grid gap-4">
        {projects.map((project) => {
          const selected = project.campaignSlug === selectedProject.campaignSlug;

          return (
            <article
              key={project.campaignSlug}
              className={cn(
                "rounded-lg border bg-white p-5 shadow-soft transition",
                selected ? "border-coral-500 ring-2 ring-coral-500/12" : "border-ocean-900/10"
              )}
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_150px_150px_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold tracking-normal text-ocean-900">{project.campaignTitle}</h2>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(project.statusLabel))}>{project.statusLabel}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/58">
                    {project.organizationName} · {project.region} · {project.campaignCategory}
                  </p>
                </div>
                <ProgressSummary label="Utilization" value={project.utilization} />
                <ProgressSummary label="Impact" value={project.impactProgress} />
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedSlug(project.campaignSlug)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700"
                  >
                    <FileSearch size={16} aria-hidden="true" />
                    Inspect
                  </button>
                  <Link href={project.campaignHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900 hover:bg-sand-50">
                    Campaign
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">Project drawer</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{selectedProject.campaignTitle}</h2>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(selectedProject.statusLabel))}>{selectedProject.statusLabel}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ocean-900/62">{selectedProject.statusExplanation}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricBlock icon={Landmark} label="Funding" value={formatCurrency(selectedProject.allocationValue)} detail={selectedProject.disbursementStatus} />
          <MetricBlock icon={ShieldCheck} label="Partner score" value={`${selectedProject.partnerScore}%`} detail={selectedProject.organizationVerification} />
          <MetricBlock icon={ClipboardCheck} label="Invoices" value={selectedProject.invoiceStatus} detail="Matched against utilization and evidence." />
          <MetricBlock icon={CheckCircle2} label="Evidence" value={`${selectedProject.evidenceSummary.verified}/${selectedProject.evidenceSummary.total} verified`} detail={selectedProject.evidenceSummary.latestTitle} />
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/48">Milestones</h3>
          <div className="mt-3 grid gap-3">
            {selectedProject.milestones.map((milestone) => (
              <div key={`${selectedProject.campaignSlug}-${milestone.label}`} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{milestone.label}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">
                      {milestone.owner} · {formatDate(milestone.dueDate)}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClass(milestone.status))}>{milestone.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/48">Next actions</h3>
          <div className="mt-3 grid gap-2">
            {selectedProject.nextActions.map((action) => (
              <p key={action} className="rounded-lg bg-ocean-50 px-4 py-3 text-sm font-bold text-ocean-900">
                {action}
              </p>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

function ProgressSummary({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-ocean-900/58">{label}</span>
        <span className="font-bold text-ocean-900">{value}%</span>
      </div>
      <ProgressMeter value={value} label={`${label} progress`} className="mt-2 h-2" trackClassName="bg-ocean-50" indicatorClassName={value < 65 ? "bg-coral-500" : "bg-kelp-500"} />
    </div>
  );
}

function MetricBlock({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof Landmark;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
        <Icon size={15} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 font-bold text-ocean-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ocean-900/54">{detail}</p>
    </div>
  );
}
