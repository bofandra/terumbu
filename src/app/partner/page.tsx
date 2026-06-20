import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createCampaignUpdateAction, submitEvidenceAction } from "@/lib/portal-actions";
import { getPartnerPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Partner Portal"
};

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  await requireUser("/partner");
  const data = await getPartnerPortalData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
          <div>
            <Link href="/" className="text-xl font-bold text-ocean-900">
              Terumbu.eco
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Partner portal</h1>
            <p className="mt-2 text-ocean-900/62">Manage campaign updates, submit evidence, and monitor verification status.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-bold text-coral-700">
            Dashboard
          </Link>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaigns</h2>
            <div className="mt-5 grid gap-3">
              {data.campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-xl bg-sand-50 p-4">
                  <p className="font-bold text-ocean-900">{campaign.title}</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{campaign.region}</p>
                  <p className="mt-3 text-sm font-bold text-kelp-700">
                    {campaign.status} · {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <form action={createCampaignUpdateAction} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Publish update</h2>
              <div className="mt-5 grid gap-4">
                <select name="campaignId" className="rounded-xl border border-ocean-900/14 px-4 py-3 font-semibold outline-none focus:border-coral-500">
                  {data.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
                <input name="title" placeholder="Update title" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
                <textarea name="body" placeholder="Field update" className="min-h-28 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
                <input name="imageUrl" placeholder="Evidence image URL" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
              </div>
              <Button type="submit" className="mt-5">
                Publish
              </Button>
            </form>

            <form action={submitEvidenceAction} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Submit evidence</h2>
              <div className="mt-5 grid gap-4">
                <select name="campaignId" className="rounded-xl border border-ocean-900/14 px-4 py-3 font-semibold outline-none focus:border-coral-500">
                  {data.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
                <input name="title" placeholder="Evidence title" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
                <select name="evidenceType" defaultValue="field_photo" className="rounded-xl border border-ocean-900/14 px-4 py-3 font-semibold outline-none focus:border-coral-500">
                  <option value="field_photo">Field photo</option>
                  <option value="document">Document</option>
                  <option value="field_report">Field report</option>
                </select>
                <input name="fileUrl" placeholder="File URL or R2 object URL" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
              </div>
              <Button type="submit" className="mt-5">
                Submit Evidence
              </Button>
            </form>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence status</h2>
            <div className="mt-5 grid gap-3">
              {data.evidence.map((item) => (
                <div key={item.evidenceCode} className="rounded-xl bg-sand-50 p-4">
                  <p className="font-bold text-ocean-900">{item.title}</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{item.campaignTitle}</p>
                  <p className="mt-3 text-sm font-bold text-kelp-700">{item.verificationStatus}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent updates</h2>
            <div className="mt-5 grid gap-3">
              {data.updates.map((item) => (
                <div key={`${item.campaignTitle}-${item.title}`} className="rounded-xl bg-sand-50 p-4">
                  <p className="font-bold text-ocean-900">{item.title}</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{item.campaignTitle}</p>
                  <p className="mt-3 text-sm font-bold text-ocean-900/62">
                    {item.publishedAt?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Draft"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
