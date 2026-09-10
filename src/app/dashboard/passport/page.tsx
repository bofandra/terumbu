import { redirect } from "next/navigation";

export const metadata = {
  title: "My Impact"
};

export default function DashboardPassportPage() {
  redirect("/dashboard/impact");
}
