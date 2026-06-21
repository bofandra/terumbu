import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Campaigns"
};

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  await requireRole(["admin"], "/admin/campaigns");
  const data = await getAdminPortalData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-coral-700 hover:text-coral-500">Admin overview</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Campaign management</h1>
        <section className="mt-6 grid gap-4">
          {data.campaigns.map((campaign) => (
            <form key={campaign.id} action={updateCampaignStatusAction} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{campaign.title}</h2>
                  <p className="mt-1 text-sm text-ocean-900/58">{campaign.partner}</p>
                  <p className="mt-3 text-sm font-bold text-kelp-700">
                    {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))} · {campaign.donorCount} donors
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select name="status" defaultValue={campaign.status} className="rounded-xl border border-ocean-900/14 px-3 py-2 text-sm font-semibold">
                    {["draft", "review", "published", "funded", "completed", "archived"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <Button type="submit" tone="secondary">Save</Button>
                </div>
              </div>
            </form>
          ))}
        </section>
      </div>
    </main>
  );
}
