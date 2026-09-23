import { redirect } from "next/navigation";

export const metadata = {
  title: "Partner Projects"
};

export default function PartnerSubmitEvidenceRedirectPage() {
  redirect("/partner/campaigns");
}
