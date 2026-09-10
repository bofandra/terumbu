import { redirect } from "next/navigation";

export const metadata = {
  title: "My Community"
};

export default function DashboardCommunityPage() {
  redirect("/dashboard/impact");
}
