import Link from "next/link";
import { CircleDollarSign, FileBadge, FileText, ShieldCheck } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Portal"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Not set";
}

function statusClass(status: string) {
  if (["verified", "published", "active", "committed", "disbursed"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["rejected", "cancelled", "needs_clarification"].includes(status)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900";
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(value)}`}>{value.replaceAll("_", " ")}</span>;
}

export default async function CorporateDashboardPage() {
  const user = await requireUser("/corporate");
  const data = await requireCorporateDashboardData(user.id, "/corporate");
  const contributionTotal = data.contributions.reduce((total, contribution) => total + contribution.amountValue, 0);
  const verifiedEvidenceCount = data.evidence.filter((item) => item.verificationStatus === "verified").length;
  const latestReport = data.exports[0] ?? null;
  const pendingEvidence = data.evidence.filter((item) => item.verificationStatus !== "verified").length;

  const metrics = [
    { label: "Projects", value: data.portfolio.length.toLocaleString("id-ID"), icon: ShieldCheck },
    { label: "Contributions", value: formatCurrency(contributionTotal), icon: CircleDollarSign },
    { label: "Verified evidence", value: verifiedEvidenceCount.toLocaleString("id-ID"), icon: FileText },
    { label: "Reports", value: data.exports.length.toLocaleString("id-ID"), icon: FileBadge }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Corporate</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900 sm:text-3xl">Overview</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62">
            {data.program.programName} · {formatDate(data.program.startsAt)} - {formatDate(data.program.endsAt)}
          </p>
        </div>
        <ButtonLink href="/corporate/projects">Add Project</ButtonLink>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4" aria-label="Corporate summary">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <Icon className="size-5 text-ocean-700" aria-hidden="true" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <MetricValue className="mt-2 text-ocean-900">{metric.value}</MetricValue>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Projects</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">Projects your company supports.</p>
            </div>
            <Link href="/corporate/projects" className="text-sm font-bold text-coral-700 hover:text-coral-500">View all</Link>
          </div>
          <div className="mt-4 divide-y divide-ocean-900/10">
            {data.portfolio.slice(0, 5).map((project) => (
              <div key={project.campaignSlug} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-bold text-ocean-900">{project.campaignTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/54">{project.organizationName} · {project.region}</p>
                </div>
                <p className="text-sm font-bold text-ocean-900 sm:text-right">{formatCurrency(project.allocationValue)}</p>
              </div>
            ))}
            {data.portfolio.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">No supported projects yet.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Needs attention</h2>
          <div className="mt-4 grid gap-3">
            {pendingEvidence > 0 ? (
              <Link href="/corporate/evidence" className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4 text-sm font-bold text-ocean-900 hover:border-coral-500">
                {pendingEvidence.toLocaleString("id-ID")} evidence records need review.
              </Link>
            ) : null}
            {!latestReport ? (
              <Link href="/corporate/reports" className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4 text-sm font-bold text-ocean-900 hover:border-coral-500">
                No report generated yet.
              </Link>
            ) : (
              <Link href="/corporate/reports" className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4 text-sm font-bold text-ocean-900 hover:border-coral-500">
                Latest report: <span className="capitalize">{latestReport.status.replaceAll("_", " ")}</span>.
              </Link>
            )}
            {pendingEvidence === 0 && latestReport ? (
              <p className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">No urgent tasks.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Contributions</h2>
            <Link href="/corporate/funding" className="text-sm font-bold text-coral-700 hover:text-coral-500">Open</Link>
          </div>
          <div className="mt-4 divide-y divide-ocean-900/10">
            {data.contributions.slice(0, 4).map((contribution) => (
              <div key={contribution.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-bold text-ocean-900">{contribution.campaignTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/54">{contribution.referenceCode}</p>
                </div>
                <div className="grid gap-1 sm:text-right">
                  <p className="text-sm font-bold text-ocean-900">{formatCurrency(contribution.amountValue)}</p>
                  <StatusBadge value={contribution.status} />
                </div>
              </div>
            ))}
            {data.contributions.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">No contributions yet.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence</h2>
            <Link href="/corporate/evidence" className="text-sm font-bold text-coral-700 hover:text-coral-500">Open</Link>
          </div>
          <div className="mt-4 divide-y divide-ocean-900/10">
            {data.evidence.slice(0, 4).map((evidence) => (
              <div key={evidence.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-bold text-ocean-900">{evidence.title}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/54">{evidence.campaignTitle}</p>
                </div>
                <StatusBadge value={evidence.verificationStatus} />
              </div>
            ))}
            {data.evidence.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">No verified evidence linked yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
