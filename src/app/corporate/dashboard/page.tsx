import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileBadge,
  FileText,
  Globe2,
  Leaf,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createCorporateReportExportAction } from "@/lib/corporate-actions";
import { getCorporateDashboardData } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Dashboard"
};

export const dynamic = "force-dynamic";

const heroImage = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=80";

type CorporateDashboardData = NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>;
type CorporateProject = CorporateDashboardData["portfolio"][number];

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function compactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  }

  return formatCurrency(value);
}

function statusClass(status: string) {
  if (status === "On Track" || status === "Complete" || status === "Completed") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "Needs Attention" || status === "Review" || status === "Requires explanation") {
    return "bg-coral-100 text-coral-700";
  }

  if (status === "At Risk") {
    return "bg-red-100 text-red-700";
  }

  if (status === "Awaiting Verification" || status === "Under Review") {
    return "bg-ocean-50 text-ocean-700";
  }

  return "bg-sand-100 text-ocean-900/70";
}

function kpiIcon(label: string) {
  if (label.includes("committed")) {
    return CircleDollarSign;
  }

  if (label.includes("disbursed")) {
    return FileBadge;
  }

  if (label.includes("utilization")) {
    return ShieldCheck;
  }

  if (label.includes("Restoration")) {
    return Leaf;
  }

  if (label.includes("Employees")) {
    return Users;
  }

  return CalendarDays;
}

function projectImage(project: CorporateProject) {
  return project.imageUrl?.startsWith("https://images.unsplash.com/") ? project.imageUrl : null;
}

function healthTone(tone: string) {
  const tones: Record<string, string> = {
    kelp: "bg-kelp-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    ocean: "bg-ocean-500",
    neutral: "bg-ocean-900/30"
  };

  return tones[tone] ?? tones.neutral;
}

export default async function CorporateDashboardPage() {
  const user = await requireUser("/corporate/dashboard");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-dashed border-ocean-900/18 bg-white p-8 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Corporate workspace</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Welcome to your corporate impact workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Create your first conservation program or speak with the Terumbu partnership team to design a verified ESG portfolio.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/campaigns">Browse Verified Projects</ButtonLink>
            <ButtonLink href="mailto:partnerships@terumbu.eco" tone="light">
              Contact Partnership Team
            </ButtonLink>
          </div>
        </section>
      </main>
    );
  }

  const maxTrendEmployees = Math.max(1, ...data.employeeTrend.map((item) => item.employees));
  const maxTrendHours = Math.max(1, ...data.employeeTrend.map((item) => item.volunteerHours));

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <section
        className="overflow-hidden rounded-2xl bg-ocean-900 p-6 text-white shadow-soft"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(245,248,251,0.96) 0%, rgba(245,248,251,0.86) 38%, rgba(7,52,63,0.28) 68%, rgba(7,52,63,0.74) 100%), url('${heroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          <div className="text-ocean-900">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">{data.program.programName}</h1>
              <span className="rounded-full bg-kelp-500 px-3 py-1 text-xs font-bold text-white">
                {data.metrics.atRiskProjects > 0 ? "At Risk" : data.metrics.needsAttentionProjects > 0 ? "Needs Attention" : "On Track"}
              </span>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ocean-900/74">
              Supporting reef restoration, mangrove rehabilitation, community conservation, and employee participation across Indonesia.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <form action={createCorporateReportExportAction}>
                <Button type="submit" tone="secondary">
                  <Download size={17} aria-hidden="true" />
                  Generate ESG Report
                </Button>
              </form>
              <ButtonLink href="/corporate/projects" tone="light">
                <Plus size={17} aria-hidden="true" />
                Add New Project
              </ButtonLink>
              <ButtonLink href="#public-impact-page" tone="light">
                <Globe2 size={17} aria-hidden="true" />
                View Public Impact Page
              </ButtonLink>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/16 bg-ocean-900/82 p-5 text-white backdrop-blur">
            <p className="text-sm font-bold">Program Period Progress</p>
            <p className="mt-4 text-4xl font-bold tracking-normal">{data.reporting.periodProgress}%</p>
            <p className="mt-1 text-sm text-white/70">of annual program period completed</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/18">
              <div className="h-full rounded-full bg-kelp-400" style={{ width: `${data.reporting.periodProgress}%` }} />
            </div>
            <p className="mt-4 text-xs font-semibold text-white/64">
              {formatDate(data.program.startsAt)} - {formatDate(data.program.endsAt)}
            </p>
          </aside>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6" id="impact-metrics">
        {data.executiveMetrics.map((metric) => {
          const Icon = kpiIcon(metric.label);

          return (
            <article key={metric.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex size-12 items-center justify-center rounded-full bg-ocean-700 text-white">
                <Icon size={22} aria-hidden="true" />
              </div>
              <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
              <h2 className="mt-1 text-sm font-bold text-ocean-900">{metric.label}</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-ocean-900/58">{metric.support}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.05fr_0.8fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Annual goals</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Targets vs progress</h2>
            </div>
            <Link href="/corporate/programs" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              View all
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {data.goalProgress.map((goal) => (
              <div key={goal.goal} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-[1fr_92px_92px_1fr] sm:items-center">
                  <p className="font-bold text-ocean-900">{goal.goal}</p>
                  <p className="text-ocean-900/60">Target {goal.target.toLocaleString("id-ID")}</p>
                  <p className="font-bold text-ocean-900">{goal.current.toLocaleString("id-ID")}</p>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div className={cn("h-full rounded-full", goal.status === "Needs Attention" ? "bg-coral-500" : "bg-kelp-500")} style={{ width: `${goal.progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-ocean-900/56">Forecast: {goal.forecast.toLocaleString("id-ID")} {goal.unit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Impact by location</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Corporate portfolio map</h2>
            </div>
            <Link href="/impact-map" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              View full map
            </Link>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-ocean-900/10">
            <div className="relative min-h-[260px] bg-ocean-900">
              <iframe
                title="Corporate impact locations across Indonesia"
                className="absolute inset-0 h-full w-full border-0 opacity-70"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=94%2C-11%2C142%2C6&layer=mapnik"
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,52,63,0.58),rgba(24,143,138,0.18))]" />
              <div className="absolute left-4 top-4 rounded-xl bg-white/92 p-3 text-xs font-bold text-ocean-900 shadow-soft">
                Exact restoration coordinates are hidden.
              </div>
            </div>
            <div className="grid gap-0 border-t border-ocean-900/10 bg-white sm:grid-cols-4">
              {[
                ["Projects", data.mapSummary.projects],
                ["Provinces", data.mapSummary.provinces],
                ["NGO partners", data.mapSummary.partners],
                ["Field locations", data.mapSummary.fieldLocations]
              ].map(([label, value]) => (
                <div key={label} className="border-ocean-900/10 p-4 text-center sm:border-r">
                  <p className="text-2xl font-bold tracking-normal text-ocean-900">{Number(value).toLocaleString("id-ID")}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/56">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Project health</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Status summary</h2>
            </div>
            <Link href="/corporate/projects" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              View all
            </Link>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <div className="flex size-44 items-center justify-center rounded-full border-[22px] border-kelp-500 bg-white shadow-inner">
              <span className="text-center">
                <span className="block text-4xl font-bold tracking-normal text-ocean-900">{data.portfolio.length.toLocaleString("id-ID")}</span>
                <span className="text-xs font-bold text-ocean-900/56">Projects</span>
              </span>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            {data.projectHealth.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-semibold text-ocean-900/68">
                  <span className={cn("size-3 rounded-full", healthTone(item.tone))} />
                  {item.label}
                </span>
                <span className="font-bold text-ocean-900">{item.count.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-coral-700">Project portfolio</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Funded conservation projects</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-ocean-900/10 bg-white px-3 text-sm font-semibold text-ocean-900/54">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search projects</span>
              <input className="w-44 bg-transparent outline-none placeholder:text-ocean-900/42" placeholder="Search projects..." />
            </label>
            <ButtonLink href="/corporate/projects" tone="light">
              <Download size={16} aria-hidden="true" />
              Export
            </ButtonLink>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ocean-900/46">
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Project</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Partner</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Location</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Funding</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Utilization</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Impact</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Status</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Next milestone</th>
                <th className="border-b border-ocean-900/10 pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.portfolio.slice(0, 8).map((project) => (
                <tr key={project.campaignTitle} className="align-top">
                  <td className="border-b border-ocean-900/8 py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-ocean-900">
                        {projectImage(project) ? <Image src={projectImage(project) ?? ""} alt={`${project.campaignTitle} project`} fill className="object-cover" sizes="48px" /> : null}
                      </div>
                      <div>
                        <Link href={`/campaigns/${project.campaignSlug}`} className="font-bold text-ocean-900 hover:text-coral-700">
                          {project.campaignTitle}
                        </Link>
                        <p className="mt-1 text-xs text-ocean-900/52">{project.campaignCategory}</p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4">
                    <p className="font-semibold text-ocean-900">{project.organizationName}</p>
                    <p className="mt-1 text-xs text-ocean-900/52">{project.organizationVerification}</p>
                  </td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 text-ocean-900/68">{project.region}</td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 font-bold text-ocean-900">{compactCurrency(project.allocationValue)}</td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4">
                    <ProgressCell value={project.utilization} />
                  </td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4">
                    <ProgressCell value={project.impactProgress} />
                  </td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(project.statusLabel))}>{project.statusLabel}</span>
                    <p className="mt-2 max-w-44 text-xs leading-5 text-ocean-900/52">{project.statusExplanation}</p>
                  </td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4">
                    <p className="font-semibold text-ocean-900">{project.nextMilestone}</p>
                    <p className="mt-1 text-xs text-ocean-900/52">{formatDate(project.nextMilestoneDate)}</p>
                  </td>
                  <td className="border-b border-ocean-900/8 py-4 text-right">
                    <Link href="/corporate/projects" aria-label={`Open ${project.campaignTitle} actions`} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
                      <MoreVertical size={18} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr_0.95fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" id="events">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Employee engagement</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Participation trend</h2>
            </div>
            <Link href="/corporate/employees" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              View details
            </Link>
          </div>
          <div className="mt-6 flex h-64 items-end gap-3 border-b border-l border-ocean-900/10 px-3">
            {data.employeeTrend.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-48 w-full items-end justify-center gap-1">
                  <span className="w-4 rounded-t-full bg-ocean-700" style={{ height: `${Math.max(8, (item.employees / maxTrendEmployees) * 100)}%` }} title={`${item.employees} employees`} />
                  <span className="w-4 rounded-t-full bg-kelp-500" style={{ height: `${Math.max(8, (item.volunteerHours / maxTrendHours) * 100)}%` }} title={`${item.volunteerHours} volunteer hours`} />
                </div>
                <span className="text-xs font-bold text-ocean-900/54">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-ocean-900/62">
            Employee engagement is shown as aggregate program records. Individual donation values are excluded by default.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {data.departmentEngagement.slice(0, 3).map((department) => (
              <div key={department.department} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{department.department}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{department.active}/{department.employees} active</p>
                <p className="mt-3 text-sm font-bold text-kelp-700">{department.participationRate}% participation</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Recent evidence</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Submissions feed</h2>
            </div>
            <Link href="/corporate/evidence" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              Review
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {data.evidence.slice(0, 4).map((item) => (
              <Link key={`${item.title}-${item.addedAt.toISOString()}`} href={item.fileUrl} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 hover:border-coral-500">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{item.title}</p>
                    <p className="mt-1 text-xs text-ocean-900/56">{item.campaignTitle} · {item.organizationName}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClass(item.verificationStatus === "verified" ? "On Track" : "Under Review"))}>
                    {item.verificationStatus}
                  </span>
                </div>
              </Link>
            ))}
            {data.evidence.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">Project evidence has been submitted but is still awaiting verification.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" id="notifications">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Alerts and risks</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Attention center</h2>
            </div>
            <AlertTriangle className="text-coral-500" size={23} aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3">
            {data.riskAlerts.map((alert) => (
              <Link key={`${alert.title}-${alert.status}`} href={alert.href} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 hover:border-coral-500">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{alert.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/58">{alert.description}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClass(alert.status))}>{alert.status}</span>
                </div>
              </Link>
            ))}
            {data.riskAlerts.length === 0 ? (
              <div className="rounded-xl border border-kelp-500/20 bg-kelp-100/55 p-4">
                <p className="font-bold text-kelp-700">No high-priority risks</p>
                <p className="mt-1 text-sm text-kelp-700/72">Portfolio records are on track for this reporting period.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1fr_0.85fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">SDG alignment</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">ESG theme mapping</h2>
            </div>
            <Target className="text-coral-500" size={23} aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-4">
            {data.sdgAlignment.map((sdg) => (
              <div key={sdg.code}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-ocean-900">{sdg.code} · {sdg.label}</span>
                  <span className="font-bold text-ocean-900/62">{sdg.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ocean-50">
                  <div className="h-full rounded-full bg-ocean-700" style={{ width: `${sdg.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-ocean-900/54">Aligned with selected SDG and ESG themes. This does not imply formal United Nations certification.</p>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Reports center</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{data.latestReport.reportType}</h2>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(data.latestReport.status === "ready_for_review" ? "On Track" : data.latestReport.status))}>
              {data.latestReport.status.replaceAll("_", " ")}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-sand-50 p-4">
              <p className="text-xs font-bold text-ocean-900/52">Last updated</p>
              <p className="mt-2 font-bold text-ocean-900">{formatDate(data.latestReport.createdAt)}</p>
            </div>
            <div className="rounded-xl bg-sand-50 p-4">
              <p className="text-xs font-bold text-ocean-900/52">Verified metrics</p>
              <p className="mt-2 font-bold text-ocean-900">{data.latestReport.verifiedMetrics.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-xl bg-sand-50 p-4">
              <p className="text-xs font-bold text-ocean-900/52">Pending metrics</p>
              <p className="mt-2 font-bold text-ocean-900">{data.latestReport.pendingMetrics.toLocaleString("id-ID")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/corporate/reports" tone="light">
              <FileText size={17} aria-hidden="true" />
              Preview Report
            </ButtonLink>
            <form action={createCorporateReportExportAction}>
              <Button type="submit" tone="secondary">
                Submit for Approval
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </form>
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" id="public-impact-page">
          <p className="text-sm font-bold uppercase text-coral-700">Public impact page</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{data.publicImpactPreview.title}</h2>
          <span className="mt-4 inline-flex rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">{data.publicImpactPreview.status}</span>
          <div className="mt-5 grid gap-2">
            {data.publicImpactPreview.metrics.map((metric) => (
              <p key={metric} className="rounded-xl bg-sand-50 px-4 py-3 text-sm font-semibold text-ocean-900/68">
                {metric}
              </p>
            ))}
          </div>
          <Link href="/corporate/reports" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
            Prepare public report
            <ExternalLink size={15} aria-hidden="true" />
          </Link>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Quick actions</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.quickActions.map((action) => (
            <Link key={action.label} href={action.href} className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-4 text-sm font-bold text-ocean-900 hover:border-coral-500">
              {action.label}
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProgressCell({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-ocean-900">{value}%</span>
      </div>
      <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-ocean-50">
        <div className={cn("h-full rounded-full", value < 65 ? "bg-coral-500" : "bg-kelp-500")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
