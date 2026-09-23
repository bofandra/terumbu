import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

export const metadata = {
  title: "New Expedition"
};

export const dynamic = "force-dynamic";

export default async function AdminNewExpeditionPage() {
  await requireRole(["admin"], "/admin/expeditions");
  redirect("/admin/expeditions?error=partner-owned");
}
