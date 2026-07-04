import { redirect } from "next/navigation";

export const metadata = {
  title: "Partner Activity"
};

export default function PartnerSubmitEvidenceRedirectPage() {
  redirect("/partner/activity");
}
