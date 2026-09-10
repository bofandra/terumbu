import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Community"
};

export default function DashboardCommunityCreatePage() {
  redirect("/dashboard/impact");
}
