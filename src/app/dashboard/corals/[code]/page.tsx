import { Activity, Camera, CheckCircle2, Clock3, ExternalLink, FileText, MapPin, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { requireUser } from "@/lib/auth";
import { isVisualEvidenceUrl } from "@/lib/coral-monitoring";
import { getSponsoredEcosystemDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Pending";
  }

  const date = typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value;

  return date.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function evidenceStatusClassName(status: string) {
  if (status === "verified") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "rejected") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900";
}

function EvidenceThumbnail({ fileUrl, title }: { fileUrl: string; title: string }) {
  if (isVisualEvidenceUrl(fileUrl)) {
    return (
      <Image
        src={fileUrl}
        alt={title}
        width={720}
        height={420}
        unoptimized
        className="h-full w-full object-cover"
        sizes="(min-width: 1024px) 33vw, 100vw"
      />
    );
  }

  return (
    <div className="flex h-full min-h-44 items-center justify-center bg-ocean-50 text-ocean-900/62">
      <FileText size={30} aria-hidden="true" />
    </div>
  );
}

export default async function SponsoredEcosystemDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser("/dashboard/corals");
  const { code } = await params;
  const ecosystem = await getSponsoredEcosystemDetail(user.id, code);

  if (!ecosystem) {
    notFound();
  }

  const heroImage = ecosystem.mediaGallery[0]?.fileUrl ?? ecosystem.campaignImageUrl;
  const sites = ecosystem.mapSite ? [ecosystem.mapSite] : [];
  const primaryMetric = ecosystem.fragments > 0 ? `${ecosystem.fragments.toLocaleString("id-ID")} fragments` : `${ecosystem.seedlings.toLocaleString("id-ID")} seedlings`;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/corals" className="text-sm font-bold text-coral-700 hover:text-coral-500">
        Back to corals
      </Link>

      <header className="mt-4 overflow-hidden rounded-2xl bg-ocean-900 shadow-soft">
        <div className="grid min-h-[360px] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[280px] bg-ocean-800">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={`${ecosystem.label} latest field evidence`}
                fill
                priority
                unoptimized
                className="object-cover"
                sizes="(min-width: 1024px) 48vw, 100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/50">
                <Waves size={42} aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,52,63,0.08),rgba(7,52,63,0.58))]" />
            <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">
              {ecosystem.verifiedEvidenceCount.toLocaleString("id-ID")} verified records
            </span>
          </div>
          <div className="flex flex-col justify-center p-6 text-white sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">{ecosystem.code}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">{ecosystem.label}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              {ecosystem.campaignTitle} / {ecosystem.siteName ?? ecosystem.siteRegion ?? "Site assignment pending"}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Current status", ecosystem.status],
                ["Supported units", primaryMetric],
                ["Latest survey", formatDate(ecosystem.latestSurvey)],
                ["Survival rate", ecosystem.survivalRate > 0 ? `${ecosystem.survivalRate}%` : "Pending"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
                  <p className="mt-2 text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Evidence records", ecosystem.evidenceCount.toLocaleString("id-ID"), Camera],
          ["Verified", ecosystem.verifiedEvidenceCount.toLocaleString("id-ID"), CheckCircle2],
          ["In review", ecosystem.pendingEvidenceCount.toLocaleString("id-ID"), Clock3],
          ["Milestone progress", `${ecosystem.progress}%`, Activity]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <Icon size={22} aria-hidden="true" className="text-coral-500" />
            <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{value as string}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{label as string}</p>
          </article>
        ))}
      </section>

      {sites.length > 0 ? (
        <section className="mt-6">
          <ImpactMapPreview sites={sites} />
        </section>
      ) : null}

      <section className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Monitoring history</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Field checks tied to this ecosystem</h2>
            </div>
            <Activity className="size-5 text-coral-500" aria-hidden="true" />
          </div>

          {ecosystem.monitoringHistory.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {ecosystem.monitoringHistory.map((event) => (
                <li key={event.id} className="border-l-2 border-ocean-100 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={event.evidenceHref} className="font-bold text-ocean-900 hover:text-coral-700">
                      {event.label} / {formatDate(event.date)}
                    </Link>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${evidenceStatusClassName(event.status)}`}>{event.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/62">{event.summary}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/16 bg-sand-50 p-6">
              <p className="font-bold text-ocean-900">Monitoring evidence is pending.</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">Approved field survey records will appear here once partner evidence is verified.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Media gallery</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Latest visual evidence</h2>
            </div>
            <Camera className="size-5 text-coral-500" aria-hidden="true" />
          </div>

          {ecosystem.mediaGallery.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {ecosystem.mediaGallery.slice(0, 4).map((item) => (
                <Link key={item.id} href={item.sourceHref} className="group overflow-hidden rounded-2xl border border-ocean-900/10 bg-sand-50 transition hover:border-coral-500">
                  <div className="relative h-48 bg-ocean-900">
                    <EvidenceThumbnail fileUrl={item.fileUrl} title={item.title} />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-ocean-900">{item.stageLabel}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${evidenceStatusClassName(item.verificationStatus)}`}>{item.verificationStatus}</span>
                    </div>
                    <p className="mt-3 font-bold text-ocean-900 group-hover:text-coral-700">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/58">{formatDate(item.surveyDate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/16 bg-sand-50 p-6">
              <p className="font-bold text-ocean-900">No visual evidence yet.</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">Document-only records are still listed in the evidence stream below.</p>
            </div>
          )}
        </section>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Evidence stream</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Source records and verification state</h2>
          </div>
          <Link href={`/campaigns/${ecosystem.campaignSlug}#evidence`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
            Campaign evidence
            <ExternalLink size={15} aria-hidden="true" />
          </Link>
        </div>

        {ecosystem.evidence.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {ecosystem.evidence.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-sand-50">
                <div className="relative h-44 bg-ocean-900">
                  <EvidenceThumbnail fileUrl={item.fileUrl} title={item.title} />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-ocean-900">{item.code}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${evidenceStatusClassName(item.verificationStatus)}`}>{item.verificationStatus}</span>
                  </div>
                  <h3 className="mt-3 font-bold text-ocean-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/62">{item.observation ?? `${item.evidenceType} record captured for ${ecosystem.campaignTitle}.`}</p>
                  <dl className="mt-4 grid gap-2 text-xs font-bold text-ocean-900/56">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Stage</dt>
                      <dd>{item.stageLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Survey</dt>
                      <dd>{formatDate(item.surveyDate)}</dd>
                    </div>
                    {item.metricLabel && item.metricValue ? (
                      <div className="flex items-center justify-between gap-3">
                        <dt>{item.metricLabel}</dt>
                        <dd>{item.metricValue}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <Link href={item.sourceHref} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                    Open evidence
                    <ExternalLink size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/16 bg-sand-50 p-8">
            <MapPin size={28} aria-hidden="true" className="text-coral-500" />
            <p className="mt-4 text-xl font-bold text-ocean-900">No evidence records have been linked yet.</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">When partner field records are verified for this restoration site, the complete monitoring stream will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
