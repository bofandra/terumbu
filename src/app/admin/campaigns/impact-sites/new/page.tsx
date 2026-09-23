import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

export const metadata = {
  title: "New Impact Site"
};

export const dynamic = "force-dynamic";

export default async function AdminImpactSiteNewPage() {
  await requireRole(["admin"], "/admin/campaigns/impact-sites");
  redirect("/admin/campaigns/impact-sites?error=partner-owned");
}
