import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpenCheck, Camera, MapPinned, ShieldCheck } from "lucide-react";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { isVisualEvidenceUrl } from "@/lib/coral-monitoring";
import { getImpactMapSites } from "@/lib/queries";
import { summarizeImpactSites } from "@/lib/impact-map-location";
import { getPreferredLocale } from "@/lib/user-preferences";
import { localizedSeoPath, publicSeoAlternates } from "@/lib/public-locale-routing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocale();
  const title = locale === "id" ? "Peta Dampak Konservasi Indonesia" : "Indonesia Conservation Impact Map";
  const description = locale === "id"
    ? "Jelajahi lokasi konservasi, status bukti terverifikasi, dan dokumentasi aktivitas mitra Terumbu."
    : "Explore conservation sites, verified evidence status, and documented field activity from Terumbu partners.";
  return { title, description, alternates: { canonical: localizedSeoPath("/impact-map", locale), languages: publicSeoAlternates("/impact-map") }, openGraph: { title, description, url: localizedSeoPath("/impact-map", locale) } };
}

export default async function ImpactMapPage() {
  const [sites, locale] = await Promise.all([getImpactMapSites(), getPreferredLocale()]);
  const id = locale === "id";
  const { withVerifiedEvidence, verifiedEvidenceCount } = summarizeImpactSites(sites);
  const evidenceUpdates = sites.filter((site) => site.latestEvidence).slice(0, 3);
  const heroEvidence = sites
    .flatMap((site) => site.evidence)
    .find((evidence) => evidence.verificationStatus === "verified" && isVisualEvidenceUrl(evidence.fileUrl));

  return (
    <div className="terumbu-editorial bg-[var(--public-paper)] text-[var(--public-ink)]">
      <section className="bg-[var(--public-cream)]">
        <div className={cn("mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24", heroEvidence && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16")}>
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--public-blue)]"><MapPinned size={17} aria-hidden="true" /> {id ? "Jejak konservasi" : "Conservation in action"}</p>
            <h1 className="public-display-title mt-5 max-w-4xl font-bold tracking-[-0.04em]">
              {id ? "Lihat lokasi. Telusuri bukti. Pahami dampaknya." : "Explore the places. Follow the evidence. Understand the impact."}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ocean-900/75">
              {id ? "Temukan lokasi yang tercatat di Terumbu, lalu periksa aktivitas lapangan dan status verifikasi dari setiap catatan." : "Discover registered Terumbu conservation sites and follow documented field activity and the verification status of each record."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#explore-map" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--public-blue)] px-6 text-sm font-bold text-white hover:bg-[var(--public-navy)]">
                {id ? "Jelajahi peta" : "Explore the map"} <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link href="/campaigns" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--public-rule)] px-6 text-sm font-bold text-[var(--public-navy)] hover:bg-[var(--public-blue-light)]">
                {id ? "Lihat kampanye" : "Browse campaigns"}
              </Link>
            </div>
          </div>
          {heroEvidence ? (
            <figure className="public-hero-photo public-dark">
              <Image src={heroEvidence.fileUrl} alt="" fill priority unoptimized className="object-cover" sizes="(min-width: 1024px) 45vw, 100vw" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-4 pt-12 text-sm text-white">
                <Link href={heroEvidence.sourceHref} className="inline-flex items-center gap-2 font-bold hover:underline">
                  {heroEvidence.title} <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
                </Link>
              </figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      {sites.length > 0 ? (
        <section aria-label={id ? "Ringkasan catatan lokasi" : "Recorded site summary"} className="bg-[var(--public-navy)] text-white">
          <div className="mx-auto grid max-w-7xl divide-y divide-white/20 px-4 py-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
            {[
              { value: sites.length, label: id ? "Lokasi tercatat" : "Recorded sites" },
              { value: withVerifiedEvidence, label: id ? "Lokasi dengan bukti terverifikasi" : "Sites with verified evidence" },
              { value: verifiedEvidenceCount, label: id ? "Catatan bukti terverifikasi" : "Verified evidence records" }
            ].map((metric) => (
              <div key={metric.label} className="flex min-w-0 items-center gap-4 px-3 py-4 sm:px-5 sm:py-5">
                <strong className="text-4xl font-bold text-[var(--public-lime)] [font-family:var(--public-display)]">{metric.value.toLocaleString(id ? "id-ID" : "en-US")}</strong>
                <span className="text-sm font-semibold text-white/85">{metric.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="explore-map" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-9 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0657d9]">{id ? "Peta interaktif" : "Interactive explorer"}</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-ocean-900 sm:text-5xl">{id ? "Jelajahi lokasi dan catatannya" : "Explore sites and field records"}</h2>
          <p className="mt-4 text-base leading-7 text-ocean-900/68">{id ? "Pilih penanda di peta atau lokasi dalam daftar. Filter berdasarkan jenis ekosistem dan bukti yang tersedia." : "Select a marker or choose a site from the list. Filter by ecosystem type and evidence availability."}</p>
        </div>
        <ImpactMapPreview sites={sites} locale={locale} layout="editorial" />
      </section>

      {evidenceUpdates.length > 0 ? (
        <section className="bg-[var(--public-blue-light)] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0657d9]">{id ? "Dari lapangan" : "From the field"}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ocean-900 sm:text-4xl">{id ? "Catatan yang bisa ditelusuri" : "Records you can trace"}</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {evidenceUpdates.map((site) => (
                <article key={site.id} className="rounded-2xl border border-[var(--public-rule)] bg-white p-6">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[#0757cc]"><Camera size={16} aria-hidden="true" /> {site.region}</span>
                  <h3 className="mt-4 text-xl font-black text-ocean-900">{site.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/65">{site.latestEvidence?.title}</p>
                  <p className="mt-3 text-xs font-semibold text-ocean-900/60">{site.latestEvidence?.stageLabel} · {site.latestEvidence?.verificationStatus}</p>
                  {site.latestEvidence ? <Link href={site.latestEvidence.sourceHref} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0757cc] hover:underline">
                    {id ? "Buka bukti sumber" : "View source record"} <ArrowRight size={15} aria-hidden="true" />
                  </Link> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-[var(--public-cream)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0757cc]">{id ? "Memahami data" : "Understanding the evidence"}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ocean-900 sm:text-4xl">{id ? "Cara membaca peta dampak" : "How to read the impact map"}</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: MapPinned, title: id ? "Lokasi" : "A mapped location", body: id ? "Titik menunjukkan lokasi konservasi yang terhubung dengan kampanye publik. Bukan seluruh wilayah kerja mitra." : "Pins represent sites linked to public campaigns, not a claim of complete partner coverage." },
              { icon: BadgeCheck, title: id ? "Bukti terverifikasi" : "Verified evidence", body: id ? "Label terverifikasi hanya berlaku untuk catatan lapangan yang telah melewati proses peninjauan." : "Verification applies to field records that passed review, not automatically to an entire project." },
              { icon: BookOpenCheck, title: id ? "Perubahan dari waktu ke waktu" : "Progress over time", body: id ? "Lihat sumber bukti dan riwayat monitoring untuk memahami apa yang diamati dan kapan." : "Follow source records and monitoring history to understand what was observed and when." }
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white p-6">
                <Icon size={26} className="text-[#0757cc]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-black text-ocean-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ocean-900/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <ShieldCheck className="text-[#0757cc]" size={30} aria-hidden="true" />
          <h2 className="mt-3 text-3xl font-black text-ocean-900">{id ? "Pertanyaan umum" : "Common questions"}</h2>
        </div>
        <div className="divide-y divide-ocean-900/15 border-y border-ocean-900/15">
          {[
            { q: id ? "Apakah semua titik sudah terverifikasi?" : "Are all sites fully verified?", a: id ? "Tidak. Jumlah dan status bukti ditampilkan terpisah; lokasi dapat memiliki catatan yang masih ditinjau." : "No. Each location can have reviewed evidence, pending evidence, or both; their counts are shown separately." },
            { q: id ? "Bagaimana cara melihat bukti asli?" : "How can I check the underlying evidence?", a: id ? "Pilih lokasi kemudian buka tautan catatan sumber, bila bukti publik tersedia." : "Select a location and open its source record when public evidence is available." },
            { q: id ? "Mengapa sebagian lokasi tidak muncul?" : "Why are some locations missing?", a: id ? "Peta hanya menampilkan lokasi yang terhubung dengan kampanye publik dan memenuhi aturan data Terumbu." : "The map only includes sites linked to public campaigns under Terumbu's publication rules." }
          ].map((row) => (
            <details key={row.q} className="group py-5">
              <summary className="cursor-pointer pr-4 font-bold text-ocean-900">{row.q}<span className="float-right text-xl text-[#0757cc] group-open:rotate-45">+</span></summary>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ocean-900/70">{row.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
