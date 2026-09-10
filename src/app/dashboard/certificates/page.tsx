import { redirect } from "next/navigation";

export const metadata = {
  title: "Certificates"
};

export default function DashboardCertificatesPage() {
  redirect("/dashboard/academy#certificates");
}
