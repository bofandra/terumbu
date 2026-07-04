import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Impact Sites"
};

export const dynamic = "force-dynamic";

export default function AdminImpactSitesRedirectPage() {
  redirect("/admin/campaigns/impact-sites");
}
