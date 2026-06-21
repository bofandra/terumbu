import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { reconcileDonationAction, verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Portal"
};

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  await requireRole(["admin"], "/admin");
  const data = await getAdminPortalData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
          <div>
            <Link href="/" className="text-xl font-bold text-ocean-900">
              Terumbu.eco
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Admin portal</h1>
            <p className="mt-2 text-ocean-900/62">Campaign oversight, evidence verification, and donation reconciliation.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-bold text-coral-700">
            Dashboard
          </Link>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
          {[
            ["Campaigns", "/admin/campaigns"],
            ["Expeditions", "/admin/expeditions"],
            ["Partners", "/admin/partners"],
            ["Impact sites", "/admin/impact-sites"],
            ["Evidence", "/admin/evidence"],
            ["Reports", "/admin/reports"],
            ["Users", "/admin/users"],
            ["Audit", "/admin/audit"]
          ].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 shadow-sm ring-1 ring-ocean-900/10 hover:ring-coral-500">
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign management</h2>
            <div className="mt-5 grid gap-3">
              {data.campaigns.map((campaign) => (
                <div key={campaign.slug} className="rounded-xl bg-sand-50 p-4">
                  <p className="font-bold text-ocean-900">{campaign.title}</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{campaign.partner}</p>
                  <p className="mt-3 text-sm font-bold text-kelp-700">
                    {campaign.status} · {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence verification</h2>
            <div className="mt-5 grid gap-3">
              {data.evidence.map((item) => (
                <form key={item.id} action={verifyEvidenceAction} className="rounded-xl bg-sand-50 p-4">
                  <input type="hidden" name="evidenceId" value={item.id} />
                  <p className="font-bold text-ocean-900">{item.title}</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{item.campaignTitle}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <select name="status" defaultValue={item.verificationStatus} className="rounded-xl border border-ocean-900/14 px-3 py-2 text-sm font-semibold">
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <Button type="submit" tone="secondary">
                      Save
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation reconciliation</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {data.donations.map((donation) => (
              <form key={donation.id} action={reconcileDonationAction} className="rounded-xl bg-sand-50 p-4">
                <input type="hidden" name="donationId" value={donation.id} />
                <p className="font-bold text-ocean-900">{donation.campaignTitle}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{donation.donorName ?? "Anonymous donor"}</p>
                <p className="mt-3 text-sm font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <select name="status" defaultValue={donation.status} className="rounded-xl border border-ocean-900/14 px-3 py-2 text-sm font-semibold">
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                  <Button type="submit" tone="secondary">
                    Reconcile
                  </Button>
                </div>
              </form>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
