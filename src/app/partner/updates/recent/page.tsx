import { redirect } from "next/navigation";

export const metadata = {
  title: "Partner Activity"
};

export default function PartnerRecentUpdatesRedirectPage() {
  redirect("/partner/activity");
}
