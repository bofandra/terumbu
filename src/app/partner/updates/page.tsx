import { redirect } from "next/navigation";

export const metadata = {
  title: "Partner Activity"
};

export default function PartnerUpdatesRedirectPage() {
  redirect("/partner/activity");
}
