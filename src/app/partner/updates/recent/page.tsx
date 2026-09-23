import { redirect } from "next/navigation";

export const metadata = {
  title: "Partner Projects"
};

export default function PartnerRecentUpdatesRedirectPage() {
  redirect("/partner/campaigns");
}
