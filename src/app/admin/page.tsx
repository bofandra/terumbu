import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  FileCheck2,
  Handshake,
  MapPinned,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  ShipWheel,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { reconcileDonationAction, reconcileExpeditionBookingAction, verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminOperationsData, getAdminPortalData } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Portal"
};

export const dynamic = "force-dynamic";

const badgeClasses: Record<string, string> = {
  archived: "bg-ocean-900/8 text-ocean-900/62",
  basic: "bg-ocean-900/8 text-ocean-900/70",
  completed: "bg-kelp-100 text-kelp-700",
  draft: "bg-ocean-900/8 text-ocean-900/62",
  failed: "bg-coral-100 text-coral-700",
  field: "bg-kelp-100 text-kelp-700",
  funded: "bg-kelp-100 text-kelp-700",
  paid: "bg-kelp-100 text-kelp-700",
  pending: "bg-sand-100 text-ocean-900",
  published: "bg-ocean-50 text-ocean-700",
  refund: "bg-coral-100 text-coral-700",
  refunded: "bg-coral-100 text-coral-700",
  rejected: "bg-coral-100 text-coral-700",
  review: "bg-sand-100 text-ocean-900",
  submitted: "bg-sand-100 text-ocean-900",
  verified: "bg-kelp-100 text-kelp-700"
};

const selectClassName =
  "min-h-10 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition focus:border-coral-500";

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold capitalize", badgeClasses[value] ?? badgeClasses.basic)}>
      {labelize(value)}
    </span>
  );
}

function fundingProgress(raisedAmount: string | number, goalAmount: string | number) {
  const raised = Number(raisedAmount);
  const goal = Number(goalAmount);

  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((raised / goal) * 100));
}

type MetricCard = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "coral" | "kelp" | "ocean" | "sand";
};

const metricToneClasses: Record<MetricCard["tone"], string> = {
  coral: "bg-coral-100 text-coral-700",
  kelp: "bg-kelp-100 text-kelp-700",
  ocean: "bg-ocean-50 text-ocean-700",
  sand: "bg-sand-100 text-ocean-900"
};

export default async function AdminPortalPage() {
  await requireRole(["admin"], "/admin");
  const [data, operations] = await Promise.all([getAdminPortalData(), getAdminOperationsData()]);

  const totalRaised = data.campaigns.reduce((total, campaign) => total + Number(campaign.raisedAmount), 0);
  const totalGoal = data.campaigns.reduce((total, campaign) => total + Number(campaign.goalAmount), 0);
  const totalDonors = data.campaigns.reduce((total, campaign) => total + campaign.donorCount, 0);
  const portfolioProgress = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;
  const reviewCampaigns = data.campaigns.filter((campaign) => campaign.status === "review").length;
  const liveCampaigns = data.campaigns.filter((campaign) => campaign.status === "published" || campaign.status === "funded").length;
  const pendingEvidence = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const donationsToReconcile = data.donations.filter((donation) => donation.status !== "paid" || donation.pendingOperation).length;

  const evidencePriority: Record<string, number> = { submitted: 0, in_review: 1, rejected: 2, verified: 3 };
  const donationPriority: Record<string, number> = { created: 0, pending: 1, failed: 2, expired: 3, refunded: 4, paid: 5 };
  const evidenceQueue = [...data.evidence].sort((a, b) => (evidencePriority[a.verificationStatus] ?? 9) - (evidencePriority[b.verificationStatus] ?? 9)).slice(0, 5);
  const donationQueue = [...data.donations]
    .filter((donation) => donation.status !== "paid" || donation.pendingOperation)
    .sort((a, b) => {
      const firstPriority = a.pendingOperation?.operationType === "refund" ? -1 : donationPriority[a.status] ?? 9;
      const secondPriority = b.pendingOperation?.operationType === "refund" ? -1 : donationPriority[b.status] ?? 9;

      return firstPriority - secondPriority;
    })
    .slice(0, 5);

  const metrics: MetricCard[] = [
    {
      label: "Portfolio funding",
      value: formatCurrency(totalRaised),
      detail: `${portfolioProgress}% of ${formatCurrency(totalGoal)}`,
      icon: BarChart3,
      tone: "coral"
    },
    {
      label: "Live campaigns",
      value: String(liveCampaigns),
      detail: `${reviewCampaigns} waiting for review`,
      icon: Megaphone,
      tone: "ocean"
    },
    {
      label: "Evidence queue",
      value: String(pendingEvidence),
      detail: `${data.evidence.length} records tracked`,
      icon: FileCheck2,
      tone: "kelp"
    },
    {
      label: "Donation checks",
      value: String(donationsToReconcile),
      detail: `${totalDonors.toLocaleString("id-ID")} campaign donors`,
      icon: ReceiptText,
      tone: "sand"
    }
  ];

  const sectionCards = [
    { label: "Campaigns", value: data.campaigns.length, detail: `${reviewCampaigns} in review`, href: "/admin/campaigns", icon: Megaphone },
    { label: "Evidence", value: data.evidence.length, detail: `${pendingEvidence} pending`, href: "/admin/evidence", icon: FileCheck2 },
    { label: "Partners", value: operations.partners.length, detail: "Verification levels", href: "/admin/partners", icon: Handshake },
    { label: "Impact sites", value: operations.impactSites.length, detail: "Field locations", href: "/admin/impact-sites", icon: MapPinned },
    { label: "Expeditions", value: operations.expeditions.length, detail: "Departures and capacity", href: "/admin/expeditions", icon: ShipWheel },
    { label: "Users", value: operations.users.length, detail: "Recent accounts", href: "/admin/users", icon: Users }
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">Admin portal</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">Operations overview</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62 sm:text-base">
            Monitor campaign health, verify field evidence, and reconcile donation records from the same command surface.
          </p>
        </div>
        <Link
          href="/admin/audit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
        >
          Audit trail
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4" aria-label="Admin metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{metric.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
                </div>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", metricToneClasses[metric.tone])}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-ocean-900/62">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
          <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign portfolio</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{data.campaigns.length} campaigns across partner organizations</p>
            </div>
            <Link href="/admin/campaigns" className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
              Manage statuses
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/58">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Funding</th>
                  <th className="px-4 py-3 text-right">Donors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-900/10">
                {data.campaigns.slice(0, 6).map((campaign) => {
                  const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);

                  return (
                    <tr key={campaign.slug} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-bold text-ocean-900">{campaign.title}</p>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/54">{campaign.partner}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge value={campaign.status} />
                      </td>
                      <td className="min-w-56 px-4 py-4">
                        <div className="h-2 rounded-full bg-sand-100">
                          <div className="h-2 rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-xs font-bold text-ocean-900/62">
                          {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-ocean-900">{campaign.donorCount.toLocaleString("id-ID")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-ocean-900/10 p-4">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence review</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">Highest-priority records first</p>
            </div>
            <FileCheck2 className="size-5 text-kelp-700" aria-hidden="true" />
          </div>
          <div className="divide-y divide-ocean-900/10">
            {evidenceQueue.map((item) => (
              <form key={item.id} action={verifyEvidenceAction} className="p-4">
                <input type="hidden" name="evidenceId" value={item.id} />
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ocean-900">{item.title}</p>
                      <StatusBadge value={item.verificationStatus} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle}</p>
                    <p className="mt-2 text-xs font-bold text-ocean-900/48">{item.evidenceCode}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select name="status" defaultValue={item.verificationStatus === "rejected" ? "rejected" : "verified"} className={selectClassName}>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            ))}
            {evidenceQueue.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No evidence records found.</p> : null}
          </div>
        </section>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-ocean-900/10 p-4">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation reconciliation</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">Payment records that need an admin decision</p>
            </div>
            <ReceiptText className="size-5 text-coral-700" aria-hidden="true" />
          </div>
          <div className="divide-y divide-ocean-900/10">
            {donationQueue.map((donation) => (
              <form key={donation.id} action={reconcileDonationAction} className="p-4">
                <input type="hidden" name="donationId" value={donation.id} />
                {donation.pendingOperation ? <input type="hidden" name="operationId" value={donation.pendingOperation.id} /> : null}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ocean-900">{donation.campaignTitle}</p>
                      <StatusBadge value={donation.status} />
                      {donation.pendingOperation ? <StatusBadge value={donation.pendingOperation.operationType} /> : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{donation.donorName ?? "Anonymous donor"}</p>
                    <p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                    {donation.pendingOperation?.reason ? (
                      <p className="mt-2 text-xs font-semibold text-ocean-900/52">{donation.pendingOperation.reason}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select name="status" defaultValue={donation.pendingOperation?.operationType === "refund" ? "refunded" : donation.status === "failed" ? "failed" : "paid"} className={selectClassName}>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <ReceiptText className="size-4" aria-hidden="true" />
                      Reconcile
                    </Button>
                  </div>
                </div>
              </form>
            ))}
            {donationQueue.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No donation records found.</p> : null}
          </div>

          <div className="border-t border-ocean-900/10 p-4">
            <h3 className="font-bold text-ocean-900">Expedition billing requests</h3>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Pending booking refunds and payment decisions</p>
          </div>
          <div className="divide-y divide-ocean-900/10">
            {data.bookingPaymentOperations.slice(0, 4).map((operation) => (
              <form key={operation.id} action={reconcileExpeditionBookingAction} className="p-4">
                <input type="hidden" name="bookingId" value={operation.bookingId ?? ""} />
                <input type="hidden" name="operationId" value={operation.id} />
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ocean-900">{operation.expeditionTitle}</p>
                      <StatusBadge value={operation.paymentStatus} />
                      <StatusBadge value={operation.operationType} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{operation.contactName} / {operation.bookingCode}</p>
                    <p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(Number(operation.amount ?? 0))}</p>
                    {operation.reason ? <p className="mt-2 text-xs font-semibold text-ocean-900/52">{operation.reason}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select name="status" defaultValue={operation.operationType === "refund" ? "refunded" : "paid"} className={selectClassName}>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <ReceiptText className="size-4" aria-hidden="true" />
                      Reconcile
                    </Button>
                  </div>
                </div>
              </form>
            ))}
            {data.bookingPaymentOperations.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No expedition billing requests found.</p> : null}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {sectionCards.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-coral-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight className="size-4 text-ocean-900/40 group-hover:text-coral-700" aria-hidden="true" />
                </div>
                <p className="mt-5 text-2xl font-bold tracking-normal text-ocean-900">{item.value.toLocaleString("id-ID")}</p>
                <h3 className="mt-1 font-bold text-ocean-900">{item.label}</h3>
                <p className="mt-2 text-sm font-semibold text-ocean-900/58">{item.detail}</p>
              </Link>
            );
          })}
        </section>
      </section>
    </div>
  );
}
