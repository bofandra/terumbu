import Link from "next/link";
import { ArrowUpRight, Megaphone, Save } from "lucide-react";

import { AdminPageHeader, AdminStatusBadge, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Campaigns"
};

export const dynamic = "force-dynamic";

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"];

function fundingProgress(raisedAmount: string | number, goalAmount: string | number) {
  const raised = Number(raisedAmount);
  const goal = Number(goalAmount);

  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((raised / goal) * 100));
}

export default async function AdminCampaignsPage() {
  await requireRole(["admin"], "/admin/campaigns");
  const data = await getAdminPortalData();

  const totalRaised = data.campaigns.reduce((total, campaign) => total + Number(campaign.raisedAmount), 0);
  const reviewCount = data.campaigns.filter((campaign) => campaign.status === "review").length;
  const publishedCount = data.campaigns.filter((campaign) => campaign.status === "published").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns"
        title="Campaign management"
        description="Change publication status, scan funding health, and open public campaign pages when a record is live."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Campaign summary">
        {[
          { label: "Total campaigns", value: data.campaigns.length.toLocaleString("id-ID") },
          { label: "In review", value: reviewCount.toLocaleString("id-ID") },
          { label: "Published", value: publishedCount.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Portfolio queue</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{formatCurrency(totalRaised)} raised across all campaigns</p>
          </div>
          <Megaphone className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.campaigns.map((campaign) => {
            const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);

            return (
              <form key={campaign.id} action={updateCampaignStatusAction} className="p-4">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold tracking-normal text-ocean-900">{campaign.title}</h2>
                      <AdminStatusBadge value={campaign.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{campaign.partner}</p>
                    <Link href={`/campaigns/${campaign.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                      Public page
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div>
                    <div className="h-2 rounded-full bg-sand-100">
                      <div className="h-2 rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-bold text-ocean-900">
                      {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/54">{campaign.donorCount.toLocaleString("id-ID")} donors</p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <select name="status" defaultValue={campaign.status} className={adminSelectClassName}>
                      {campaignStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <Save className="size-4" aria-hidden="true" />
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            );
          })}
          {data.campaigns.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No campaigns found.</p> : null}
        </div>
      </section>
    </div>
  );
}
