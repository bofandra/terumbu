import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Evidence"
};

export const dynamic = "force-dynamic";

export default function AdminEvidenceRedirectPage() {
  redirect("/admin/campaigns/evidence");
}
