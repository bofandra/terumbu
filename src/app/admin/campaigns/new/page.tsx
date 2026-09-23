import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

export const metadata = {
  title: "New Donation"
};

export const dynamic = "force-dynamic";

export default async function AdminNewCampaignPage() {
  await requireRole(["admin"], "/admin/campaigns");
  redirect("/admin/campaigns?error=partner-owned");
}
