import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Activity"
};

export const dynamic = "force-dynamic";

export default function AdminEvidenceRedirectPage() {
  redirect("/admin/campaigns/evidence");
}
