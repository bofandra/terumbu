import { BookmarkX, CheckCircle2, Download, Heart, MapPin, ShieldCheck, Sprout } from "lucide-react";
import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requestDonationRefundAction } from "@/lib/billing-actions";
import { getBillingData, getCampaignCards, getDashboardData } from "@/lib/queries";
import { getPreferredLocale } from "@/lib/user-preferences";
import { removeSavedCampaignAction } from "@/lib/retention-actions";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Donations"
};

export const dynamic = "force-dynamic";

type DashboardDonationsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "paid" || status === "active") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "failed" || status === "refunded" || status === "cancelled" || status === "expired") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900/70";
}

export default async function DashboardDonationsPage({ searchParams }: DashboardDonationsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/donations");
  const [data, billing, highlightedCampaigns, locale] = await Promise.all([
    getDashboardData(user.id),
    getBillingData(user.id),
    getCampaignCards(3),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const dateLocale = numberLocale;
  const labels =
    isIndonesian
      ? {
          donations: "Donasi",
          title: "Dari kontribusi ke dampak lapangan",
          subtitle: "Pantau pembayaran, estimasi dampak, aktivitas lapangan, dan bukti terverifikasi dari kontribusimu.",
          savedMessage: "Permintaan donasi tersimpan.",
          donationError: "Aksi donasi tidak dapat diselesaikan.",
          journeyEyebrow: "Perjalanan dampakku",
          journeyTitle: "Status kontribusi sampai outcome terverifikasi",
          journeyBody: "Donasi kolektif mengikuti outcome terverifikasi kampanye tanpa mengklaim bahwa dana spesifikmu membayar satu aktivitas tertentu. Sponsorship individual dapat mengikuti catatan sponsorship yang dibuat dari kontribusimu.",
          sponsorship: "Sponsorship individual",
          pooled: "Kontribusi kampanye kolektif",
          currentStage: "Tahap saat ini",
          stepContribution: "Kontribusi",
          stepEstimate: "Estimasi dampak",
          stepField: "Aktivitas lapangan",
          stepVerified: "Outcome terverifikasi",
          paymentVerified: "Pembayaran terverifikasi",
          payment: "Pembayaran",
          estimatePending: "Estimasi dampak akan muncul ketika model kampanye mendukungnya.",
          waitingField: "Menunggu aktivitas lapangan dari mitra.",
          noVerified: "Belum ada bukti kampanye terverifikasi.",
          sponsorshipId: "ID sponsorship",
          fragments: "fragmen",
          planted: "Ditanam",
          survivalRate: "tingkat survival",
          pooledNote: "Outcome tingkat kampanye: kontribusi ini masuk ke pendanaan kolektif. Bukti lapangan terhubung ke kampanye dan tidak diklaim sebagai outcome eksklusif dari donasi ini.",
          journeyEmpty: "Perjalanan dampakmu dimulai setelah donasi pertama.",
          history: "Riwayat donasi",
          receiptPendingVerify: "Kuitansi menunggu verifikasi admin",
          receiptPending: "Kuitansi menunggu",
          refund: "Ajukan refund",
          reason: "Alasan",
          refundPlaceholder: "Jelaskan alasan kamu membutuhkan refund.",
          submitRefund: "Kirim permintaan refund",
          noDonation: "Belum ada catatan donasi.",
          noDonationBody: "Dukung proyek terverifikasi dan unggah bukti pembayaran untuk memulai catatan verifikasi pertamamu.",
          browseVerified: "Jelajahi kampanye terverifikasi",
          verification: "Verifikasi pembayaran",
          verificationTitle: "Aktivitas verifikasi terbaru",
          noVerification: "Belum ada aktivitas verifikasi pembayaran.",
          exploreEyebrow: "Lanjutkan dukungan",
          exploreTitle: "Temukan proyek lain",
          exploreBody: "Pilih kampanye terverifikasi terbaru atau jelajahi seluruh katalog.",
          browseAll: "Jelajahi semua",
          savedCampaigns: "Kampanye tersimpan",
          savedCampaign: "kampanye tersimpan",
          removeSaved: "Hapus dari tersimpan",
          savedEmpty: "Simpan kampanye dari halaman detail agar bisa dibandingkan dan dibuka kembali di sini."
        }
      : {
          donations: "Donations",
          title: "From contribution to field impact",
          subtitle: "Track payment, estimated impact, field activity, and verified evidence from your contributions.",
          savedMessage: "Donation request saved.",
          donationError: "Could not complete that donation action.",
          journeyEyebrow: "My impact journey",
          journeyTitle: "Contribution status to verified outcome",
          journeyBody: "Pooled donations follow the campaign's verified outcomes without claiming that your exact funds paid for one specific activity. Individual sponsorships can follow the sponsored record created for your contribution.",
          sponsorship: "Individual sponsorship",
          pooled: "Pooled campaign contribution",
          currentStage: "Current stage",
          stepContribution: "Contribution",
          stepEstimate: "Estimated impact",
          stepField: "Field activity",
          stepVerified: "Verified outcome",
          paymentVerified: "Payment verified",
          payment: "Payment",
          estimatePending: "Impact estimate will appear when the campaign model supports it.",
          waitingField: "Waiting for partner field activity.",
          noVerified: "No verified campaign evidence yet.",
          sponsorshipId: "Sponsorship ID",
          fragments: "fragments",
          planted: "Planted",
          survivalRate: "survival rate",
          pooledNote: "Campaign-level outcome: this contribution participates in pooled funding. Field evidence is linked to the campaign, not assigned to this donation as an exclusive outcome.",
          journeyEmpty: "Your impact journey starts after your first donation.",
          history: "Donation history",
          receiptPendingVerify: "Receipt pending admin verification",
          receiptPending: "Receipt pending",
          refund: "Request refund",
          reason: "Reason",
          refundPlaceholder: "Tell us why you need a refund.",
          submitRefund: "Submit refund request",
          noDonation: "No donation records yet.",
          noDonationBody: "Support a verified project and upload your payment proof to start your first manual verification record.",
          browseVerified: "Browse verified campaigns",
          verification: "Payment verification",
          verificationTitle: "Recent verification activity",
          noVerification: "No payment verification activity yet.",
          exploreEyebrow: "Continue supporting",
          exploreTitle: "Discover another project",
          exploreBody: "Choose one of the latest verified campaigns or browse the full catalog.",
          browseAll: "Browse all",
          savedCampaigns: "Saved campaigns",
          savedCampaign: "saved campaign",
          removeSaved: "Remove saved campaign",
          savedEmpty: "Save campaigns from a campaign detail page to compare and revisit them here."
        };
  const verificationOperations = billing.operations.filter((operation) => !operation.operationType.includes("refund")).slice(0, 6);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Contributions and manual payment verification</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Payments are made outside the website. Receipts and impact records appear after an admin verifies your uploaded payment proof.
        </p>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Donation request saved.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{donationError}</p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Donate to a project</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Choose one of the latest verified campaigns and continue to donation.</p>
          </div>
          <ButtonLink href="/campaigns" tone="secondary">
            Browse all
          </ButtonLink>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {highlightedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.slug} campaign={campaign} />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div>
          <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Saved campaigns</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            {data.savedCampaigns.length.toLocaleString("id-ID")} saved campaign{data.savedCampaigns.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {data.savedCampaigns.map((campaign) => (
            <article key={campaign.slug} className="grid gap-3">
              <CampaignCard campaign={campaign} />
              <form action={removeSavedCampaignAction}>
                <input type="hidden" name="campaignSlug" value={campaign.slug} />
                <input type="hidden" name="next" value="/dashboard/donations" />
                <Button type="submit" tone="light" className="w-full">
                  <BookmarkX size={16} aria-hidden="true" />
                  Remove saved campaign
                </Button>
              </form>
            </article>
          ))}
        </div>
        {data.savedCampaigns.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
            Save campaigns from a campaign detail page and they will appear here, even after a campaign expires.
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My impact journey</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">From contribution to field outcome</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/62">
          Pooled donations follow the campaign&apos;s verified outcomes without claiming that your exact funds paid for one specific activity. Individual sponsorships can follow the sponsored record created for your contribution.
        </p>
        <div className="mt-6 grid gap-5">
          {data.donationImpactJourneys.map((journey) => (
            <article key={journey.donationId} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-kelp-700">
                    {journey.journeyType === "individual_sponsorship" ? "Individual sponsorship" : "Pooled campaign contribution"}
                  </p>
                  <Link href={`/campaigns/${journey.campaignSlug}`} className="mt-2 block text-xl font-bold text-ocean-900 hover:text-coral-700">
                    {journey.campaignTitle}
                  </Link>
                  <p className="mt-1 text-sm text-ocean-900/56">{journey.donatedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                </div>
                <p className="font-bold text-ocean-900">{formatCurrency(journey.amount, journey.currency)}</p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <CheckCircle2 size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">Contribution</p>
                  <p className="mt-1 text-xs leading-5 text-ocean-900/58">{journey.paymentStatus === "paid" ? "Payment verified" : `Payment ${journey.paymentStatus}`}</p>
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <Sprout size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">Estimated impact</p>
                  <p className="mt-1 text-xs leading-5 text-ocean-900/58">{journey.estimatedImpact ?? "Impact estimate will appear when the campaign model supports it."}</p>
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <MapPin size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">Field activity</p>
                  {journey.latestUpdate ? (
                    <Link href={journey.latestUpdate.href} className="mt-1 block text-xs font-semibold leading-5 text-coral-700 hover:text-coral-500">{journey.latestUpdate.title}</Link>
                  ) : (
                    <p className="mt-1 text-xs leading-5 text-ocean-900/58">Waiting for partner field activity.</p>
                  )}
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <ShieldCheck size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">Verified outcome</p>
                  {journey.verifiedOutcome ? (
                    <Link href={journey.verifiedOutcome.href} className="mt-1 block text-xs font-semibold leading-5 text-coral-700 hover:text-coral-500">{journey.verifiedOutcome.title}</Link>
                  ) : (
                    <p className="mt-1 text-xs leading-5 text-ocean-900/58">No verified campaign evidence yet.</p>
                  )}
                </div>
              </div>

              {journey.sponsorship ? (
                <div className="mt-4 rounded-xl border border-kelp-500/20 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-ocean-900">{journey.sponsorship.label}</p>
                    <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{journey.sponsorship.status}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/52">Sponsorship ID: {journey.sponsorship.code}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-ocean-900/64">
                    {journey.sponsorship.fragments > 0 ? <span>{journey.sponsorship.fragments.toLocaleString("id-ID")} fragments</span> : null}
                    {journey.sponsorship.plantedAt ? <span>Planted {journey.sponsorship.plantedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</span> : null}
                    {journey.sponsorship.survivalRate > 0 ? <span>{journey.sponsorship.survivalRate}% survival rate</span> : null}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-ocean-50 p-3 text-xs leading-5 text-ocean-900/58">
                  Campaign-level outcome: this contribution participates in pooled funding. Field evidence is linked to the campaign, not assigned to this donation as an exclusive outcome.
                </p>
              )}
            </article>
          ))}
          {data.donationImpactJourneys.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">Your impact journey starts after your first donation.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Donation history</h2>
        {data.donations.map((donation) => (
          <article key={donation.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                  <Heart size={22} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{donation.campaignTitle}</h2>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {donation.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                  {donation.receiptNumber ? (
                    <Link href={`/dashboard/donations/${donation.id}/receipt`} download className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                      <Download size={14} aria-hidden="true" />
                      {donation.receiptNumber}
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-ocean-900/62">
                      {donation.status === "pending" ? "Receipt pending admin verification" : "Receipt pending"}
                    </p>
                  )}
                </div>
              </div>
              <div className="md:text-right">
                <p className="font-bold text-ocean-900">{formatCurrency(Number(donation.amount), donation.currency)}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(donation.status)}`}>{donation.status}</span>
                {donation.status === "paid" ? (
                  <details className="relative mt-3">
                    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border border-coral-500/30 px-3 text-xs font-bold text-coral-700 hover:border-coral-500">
                      Request refund
                    </summary>
                    <form action={requestDonationRefundAction} className="absolute right-0 z-20 mt-2 grid w-72 gap-2 rounded-xl border border-ocean-900/10 bg-white p-3 text-left shadow-soft">
                      <input type="hidden" name="donationId" value={donation.id} />
                      <label className="grid gap-1 text-xs font-bold text-ocean-900">
                        Reason
                        <textarea name="reason" className="min-h-20 rounded-lg border border-ocean-900/14 px-3 py-2 text-sm font-semibold" placeholder="Tell us why you need a refund." required />
                      </label>
                      <Button type="submit" tone="secondary">Submit refund request</Button>
                    </form>
                  </details>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {data.donations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
            <Heart size={30} aria-hidden="true" className="text-coral-500" />
            <p className="mt-4 text-xl font-bold text-ocean-900">No donation records yet.</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">
              Support a verified project and upload your payment proof to start your first manual verification record.
            </p>
            <Link href="/campaigns" className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
              Browse verified campaigns
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Payment verification</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Recent verification activity</h2>
        <div className="mt-5 grid gap-3">
          {verificationOperations.map((operation) => (
            <div key={operation.id} className="flex flex-col justify-between gap-2 rounded-xl border border-ocean-900/10 bg-sand-50 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold capitalize text-ocean-900">{operation.operationType.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs font-semibold text-ocean-900/56">
                  {operation.operationCode} · {operation.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(operation.status)}`}>{operation.status}</span>
            </div>
          ))}
          {verificationOperations.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">No payment verification activity yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
