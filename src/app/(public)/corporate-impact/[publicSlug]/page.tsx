import {
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Globe2,
  Leaf,
  ShieldCheck,
  Users,
  Waves
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { getPublicCorporateImpactReport } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const heroImage = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=80";

type PublicCorporateReport = NonNullable<Awaited<ReturnType<typeof getPublicCorporateImpactReport>>>;

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const data = await getPublicCorporateImpactReport(publicSlug);

  return {
    title: data ? `${data.report.accountName} Corporate Impact` : "Corporate Impact Report",
    description: data
      ? `${data.report.accountName}'s published Terumbu.eco corporate conservation report for ${data.report.programName}.`
      : "Published Terumbu.eco corporate impact report"
  };
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function reportTypeLabel(value: string) {
  if (value === "csr") {
    return "CSR Impact Report";
  }

  if (value === "evidence") {
    return "Evidence Bundle";
  }

  return "ESG Report";
}

function metricCards(data: PublicCorporateReport) {
  return [
    {
      label: "Committed funding",
      value: formatCurrency(data.metrics.committedFunding),
      support: "Annual conservation commitment",
      icon: Building2
    },
    {
      label: "Allocated to projects",
      value: formatCurrency(data.metrics.totalAllocated),
      support: "Contracted portfolio value",
      icon: ShieldCheck
    },
    {
      label: "Restoration units",
      value: data.metrics.restorationUnits.toLocaleString("id-ID"),
      support: "Coral, mangrove, or ecosystem units",
      icon: Waves
    },
    {
      label: "Verified evidence",
      value: data.metrics.verifiedEvidence.toLocaleString("id-ID"),
      support: "Reportable evidence records",
      icon: CheckCircle2
    },
    {
      label: "Projects supported",
      value: data.metrics.projectCount.toLocaleString("id-ID"),
      support: "Active portfolio projects",
      icon: Leaf
    },
    {
      label: "Partner network",
      value: data.metrics.partnerCount.toLocaleString("id-ID"),
      support: "Implementation partners",
      icon: Users
    }
  ];
}

export default async function PublicCorporateImpactPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const data = await getPublicCorporateImpactReport(publicSlug);

  if (!data) {
    notFound();
  }

  return (
    <main className="bg-sand-50">
      <section
        className="bg-ocean-900 text-white"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(1,31,50,0.94), rgba(1,31,50,0.70), rgba(1,31,50,0.30)), url('${heroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-kelp-200">
              <Globe2 size={18} aria-hidden="true" />
              Published Corporate Impact Report
            </p>
            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              {data.report.accountLogoUrl ? (
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white shadow-soft">
                  <Image src={data.report.accountLogoUrl} alt={`${data.report.accountName} logo`} fill className="object-cover" sizes="80px" />
                </div>
              ) : (
                <span className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-white/24 bg-white/12">
                  <Building2 size={32} aria-hidden="true" />
                </span>
              )}
              <div>
                <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">{data.report.accountName}</h1>
                <p className="mt-2 text-xl font-bold text-kelp-200">{data.report.programName}</p>
                <p className="mt-3 text-sm font-semibold text-white/68">
                  {reportTypeLabel(data.report.reportType)} · {data.report.exportCode}
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/76">
              A public, evidence-linked summary of conservation funding, portfolio progress, and verified field records published through Terumbu.eco.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {data.report.previewUrl ? (
                <ButtonLink href={data.report.previewUrl} tone="light">
                  <FileText size={17} aria-hidden="true" />
                  View Report Preview
                </ButtonLink>
              ) : null}
              {data.report.fileUrl ? (
                <ButtonLink href={data.report.fileUrl} tone="primary">
                  <Download size={17} aria-hidden="true" />
                  Download Data
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/16 bg-ocean-900/72 p-5 backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-kelp-400 text-ocean-900">
                <CheckCircle2 size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold">Published and reportable</p>
                <p className="mt-1 text-sm text-white/62">Public page approved by the corporate program workspace.</p>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 text-sm">
              <div>
                <dt className="text-white/52">Published</dt>
                <dd className="font-bold">{formatDate(data.report.publishedAt)}</dd>
              </div>
              <div>
                <dt className="text-white/52">Approved</dt>
                <dd className="font-bold">{formatDate(data.report.approvedAt)}</dd>
              </div>
              <div>
                <dt className="text-white/52">Program period</dt>
                <dd className="font-bold">
                  {formatDate(data.report.startsAt)} - {formatDate(data.report.endsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-white/52">Evidence bundle</dt>
                <dd>
                  {data.report.evidenceBundleUrl ? (
                    <Link href={data.report.evidenceBundleUrl} className="mt-1 inline-flex items-center gap-2 font-bold text-kelp-200 hover:text-white">
                      <FileArchive size={15} aria-hidden="true" />
                      Open bundle
                    </Link>
                  ) : (
                    <span className="font-bold">Pending</span>
                  )}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {metricCards(data).map((metric) => {
            const Icon = metric.icon;

            return (
              <article key={metric.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <div className="flex size-11 items-center justify-center rounded-full bg-ocean-700 text-white">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
                <h2 className="mt-1 text-sm font-bold text-ocean-900">{metric.label}</h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-ocean-900/58">{metric.support}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Project portfolio</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Funded conservation work</h2>
            </div>
            <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">
              {data.portfolio.length.toLocaleString("id-ID")} projects
            </span>
          </div>
          <div className="mt-5 grid gap-4">
            {data.portfolio.map((project) => (
              <div key={project.campaignSlug} className="grid gap-4 rounded-xl border border-ocean-900/10 bg-sand-50 p-4 sm:grid-cols-[96px_1fr]">
                <div className="relative min-h-24 overflow-hidden rounded-lg bg-ocean-900">
                  {project.imageUrl ? <Image src={project.imageUrl} alt={`${project.campaignTitle} project`} fill className="object-cover" sizes="96px" /> : null}
                </div>
                <div>
                  <Link href={`/campaigns/${project.campaignSlug}`} className="text-lg font-bold tracking-normal text-ocean-900 hover:text-coral-700">
                    {project.campaignTitle}
                  </Link>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {project.region} · {project.organizationName} · {project.organizationVerification}
                  </p>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    <span className="rounded-lg bg-white px-3 py-2 font-bold text-ocean-900">{formatCurrency(project.allocationValue)}</span>
                    <span className="rounded-lg bg-white px-3 py-2 font-bold text-ocean-900">{project.progress}% funded</span>
                    <span className="rounded-lg bg-white px-3 py-2 font-bold text-ocean-900">
                      {project.impactTarget.toLocaleString("id-ID")} {project.impactUnit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Evidence center</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Reportable source records</h2>
            </div>
            {data.report.evidenceBundleUrl ? (
              <Link href={data.report.evidenceBundleUrl} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                Bundle
                <ExternalLink size={15} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3">
            {data.evidence.map((item) => (
              <div key={item.evidenceCode} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ocean-900">{item.title}</p>
                  <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">{item.verificationStatus}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ocean-900/58">
                  {item.evidenceCode} · {item.evidenceType} · {item.campaignTitle}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Link href={item.sourceHref ?? `/campaigns/${item.campaignSlug}#evidence`} className="inline-flex items-center gap-2 font-bold text-coral-700 hover:text-coral-500">
                    Source record
                    <ExternalLink size={14} aria-hidden="true" />
                  </Link>
                  {item.verifiedAt ? <span className="font-semibold text-ocean-900/52">Verified {formatDate(item.verifiedAt)}</span> : null}
                </div>
              </div>
            ))}
            {data.evidence.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-5 text-sm font-semibold text-ocean-900/62">
                Evidence records will appear here after corporate report publication.
              </p>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
